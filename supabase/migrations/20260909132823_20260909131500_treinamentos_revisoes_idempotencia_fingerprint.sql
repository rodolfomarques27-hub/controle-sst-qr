-- ============================================================================
-- SAFESCAN BRASIL
--
-- REVISÃO PÓS-REVISÃO DE TREINAMENTOS
-- I2-P2-P2B — IDEMPOTÊNCIA FORTE POR FINGERPRINT DE CONCLUSÃO
--
-- OBJETIVOS:
-- - impedir duas revisões concluídas idênticas para o mesmo colaborador;
-- - preservar revisões históricas legadas que ainda não possuam fingerprint;
-- - manter a assinatura e o corpo da RPC concluir_revisao_treinamentos intactos;
-- - reaproveitar a reconciliação pós-conflito já qualificada na P2-P2A;
-- - não alterar certificados, evidências, RLS, permissões ou Storage.
--
-- ESTRATÉGIA:
-- - trigger BEFORE INSERT exige conclusao_fingerprint SHA-256 válido somente
--   para novas revisões, sem bloquear UPDATE de eventual histórico legado;
-- - UNIQUE INDEX parcial garante uma única revisão por colaborador+fingerprint;
-- - em concorrência, a primeira transação vence; a segunda recebe 23505 e o
--   serviço existente reconcilia por resumo->>conclusao_fingerprint, sem retry.
-- ============================================================================

begin;

-- ============================================================================
-- 1. PRÉ-CONDIÇÕES E FAIL-CLOSED
-- ============================================================================

do $guard$
begin
    if to_regnamespace(
        'private'
    ) is null then
        raise exception
            'Dependência ausente: schema private.';
    end if;

    if to_regclass(
        'public.treinamentos_revisoes'
    ) is null then
        raise exception
            'Dependência ausente: public.treinamentos_revisoes.';
    end if;

    if to_regprocedure(
        'public.concluir_revisao_treinamentos(uuid,date,text,jsonb,jsonb)'
    ) is null then
        raise exception
            'Dependência ausente: concluir_revisao_treinamentos(uuid,date,text,jsonb,jsonb).';
    end if;

    if to_regprocedure(
        'private.treinamentos_revisao_validar_fingerprint_insert()'
    ) is not null then
        raise exception
            'Estrutura inesperada já existente: private.treinamentos_revisao_validar_fingerprint_insert().';
    end if;

    if to_regclass(
        'public.treinamentos_revisoes_colaborador_fingerprint_uidx'
    ) is not null then
        raise exception
            'Estrutura inesperada já existente: treinamentos_revisoes_colaborador_fingerprint_uidx.';
    end if;

    if exists (
        select 1
        from pg_trigger t
        where
            t.tgrelid =
                'public.treinamentos_revisoes'::regclass
            and t.tgname =
                'treinamentos_revisoes_validar_fingerprint_insert'
            and not t.tgisinternal
    ) then
        raise exception
            'Estrutura inesperada já existente: trigger treinamentos_revisoes_validar_fingerprint_insert.';
    end if;

    if exists (
        select 1
        from public.treinamentos_revisoes r
        where
            lower(
                btrim(
                    coalesce(
                        r.resumo ->> 'conclusao_fingerprint',
                        ''
                    )
                )
            ) ~ '^[0-9a-f]{64}$'
        group by
            r.colaborador_id,
            lower(
                btrim(
                    r.resumo ->> 'conclusao_fingerprint'
                )
            )
        having count(*) > 1
    ) then
        raise exception
            'Existem revisões duplicadas com o mesmo conclusao_fingerprint para o mesmo colaborador.';
    end if;
end;
$guard$;

-- ============================================================================
-- 2. NOVAS REVISÕES DEVEM POSSUIR FINGERPRINT VÁLIDO
--
-- Trigger restrito a INSERT:
-- - não exige backfill de eventual histórico legado;
-- - não impede registrar PDF futuramente em revisão legada sem fingerprint;
-- - protege também inserts privilegiados fora da RPC.
-- ============================================================================

create function
private.treinamentos_revisao_validar_fingerprint_insert()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
    v_fingerprint text;
begin
    v_fingerprint :=
        lower(
            btrim(
                coalesce(
                    new.resumo ->> 'conclusao_fingerprint',
                    ''
                )
            )
        );

    if v_fingerprint !~ '^[0-9a-f]{64}$' then
        raise exception using
            errcode = '22023',
            message = 'conclusao_fingerprint ausente ou inválido para nova revisão de treinamentos.';
    end if;

    return new;
end;
$function$;

revoke all
on function
private.treinamentos_revisao_validar_fingerprint_insert()
from public, anon, authenticated;

grant execute
on function
private.treinamentos_revisao_validar_fingerprint_insert()
to service_role;

create trigger
treinamentos_revisoes_validar_fingerprint_insert
before insert
on public.treinamentos_revisoes
for each row
execute function
private.treinamentos_revisao_validar_fingerprint_insert();

comment on function
private.treinamentos_revisao_validar_fingerprint_insert()
is
'Valida somente novas revisões: conclusao_fingerprint deve ser SHA-256 válido. Histórico legado continua atualizável para registro de PDF.';

-- ============================================================================
-- 3. IDEMPOTÊNCIA FORTE POR COLABORADOR + FINGERPRINT
--
-- Linhas históricas sem fingerprint válido ficam fora do índice.
-- ============================================================================

create unique index
treinamentos_revisoes_colaborador_fingerprint_uidx
on public.treinamentos_revisoes (
    colaborador_id,
    lower(
        btrim(
            resumo ->> 'conclusao_fingerprint'
        )
    )
)
where
    status = 'concluida'
    and lower(
        btrim(
            coalesce(
                resumo ->> 'conclusao_fingerprint',
                ''
            )
        )
    ) ~ '^[0-9a-f]{64}$';

comment on index
public.treinamentos_revisoes_colaborador_fingerprint_uidx
is
'Garante uma única revisão concluída por colaborador e conclusao_fingerprint; conflitos concorrentes são reconciliados pelo serviço.';

-- ============================================================================
-- 4. PÓS-CONDIÇÕES
-- ============================================================================

do $verify$
declare
    v_trigger_ok boolean := false;
    v_index_unique boolean := false;
    v_index_valid boolean := false;
begin
    select true
    into v_trigger_ok
    from pg_trigger t
    where
        t.tgrelid =
            'public.treinamentos_revisoes'::regclass
        and t.tgname =
            'treinamentos_revisoes_validar_fingerprint_insert'
        and not t.tgisinternal;

    if coalesce(v_trigger_ok, false) is not true then
        raise exception
            'Pós-condição falhou: trigger de conclusao_fingerprint não foi criado.';
    end if;

    select
        i.indisunique,
        i.indisvalid
    into
        v_index_unique,
        v_index_valid
    from pg_class idx
    join pg_namespace ns
        on ns.oid = idx.relnamespace
    join pg_index i
        on i.indexrelid = idx.oid
    where
        ns.nspname = 'public'
        and idx.relname =
            'treinamentos_revisoes_colaborador_fingerprint_uidx';

    if coalesce(v_index_unique, false) is not true
       or coalesce(v_index_valid, false) is not true
    then
        raise exception
            'Pós-condição falhou: índice único de conclusao_fingerprint não está válido.';
    end if;
end;
$verify$;

commit;
