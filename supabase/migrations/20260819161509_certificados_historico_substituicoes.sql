-- ============================================================
-- EPI-CTRL-G3-B3
--
-- Histórico documental de certificados substituídos.
--
-- OBJETIVO:
-- - public.certificados continua sendo o snapshot atual;
-- - public.certificados_historico guarda versões substituídas;
-- - primeira implantação restrita ao treinamento_codigo = 14;
-- - treinamento_codigo = 14 corresponde à NR-06 Ficha de EPIs;
-- - snapshot somente quando o caminho físico do documento muda;
-- - alterações apenas de status/data não geram nova versão;
-- - authenticated possui somente SELECT no histórico;
-- - INSERT histórico ocorre exclusivamente pelo trigger;
-- - nenhuma versão histórica é criada retroativamente.
-- ============================================================

begin;

create table if not exists public.certificados_historico (
    id uuid primary key default gen_random_uuid(),

    certificado_origem_id uuid not null,

    colaborador_id uuid,

    treinamento_id uuid,
    treinamento_codigo integer,

    tipo_treinamento text,
    nome_treinamento text,

    data_realizacao date,
    data_vencimento date,

    arquivo_url text,
    url_do_arquivo text,

    arquivo_nome text,
    nome_do_arquivo text,

    observacao text,
    status_validacao text,

    certificado_created_at timestamptz,
    certificado_updated_at timestamptz,

    arquivo_substituto_url text,

    motivo text not null
        default 'substituicao_arquivo',

    arquivado_em timestamptz not null
        default now()
);

comment on table
public.certificados_historico
is
'Versões documentais substituídas de public.certificados. '
'Não representa histórico operacional do colaborador.';

comment on column
public.certificados_historico.certificado_origem_id
is
'UUID do registro corrente em public.certificados no momento do snapshot. '
'Não possui FK intencionalmente para permitir preservação histórica independente.';

comment on column
public.certificados_historico.arquivado_em
is
'Momento em que a versão deixou de ser a versão documental corrente.';

create index if not exists
certificados_historico_colaborador_codigo_arquivado_idx
on public.certificados_historico (
    colaborador_id,
    treinamento_codigo,
    arquivado_em desc
);

create index if not exists
certificados_historico_origem_arquivado_idx
on public.certificados_historico (
    certificado_origem_id,
    arquivado_em desc
);

alter table
public.certificados_historico
enable row level security;

revoke all
on table public.certificados_historico
from anon;

revoke all
on table public.certificados_historico
from authenticated;

grant select
on table public.certificados_historico
to authenticated;

grant all
on table public.certificados_historico
to service_role;

drop policy if exists
certificados_historico_select_usuarios_ativos
on public.certificados_historico;

create policy
certificados_historico_select_usuarios_ativos
on public.certificados_historico
for select
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and
    public.usuario_tem_acesso_certificado(
        colaborador_id
    )
);

create or replace function
public.arquivar_certificado_antes_substituicao()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_arquivo_url_anterior text;
    v_arquivo_url_novo text;

    v_url_legada_anterior text;
    v_url_legada_nova text;

    v_arquivo_substituto text;
begin
    /*
     * EPI-CTRL-G3-B4-R1D
     *
     * Guard defensivo:
     * somente Ficha de EPI / treinamento_codigo 14.
     */
    if
        coalesce(
            old.treinamento_codigo,
            new.treinamento_codigo,
            -1
        ) <> 14
    then
        return new;
    end if;

    v_arquivo_url_anterior :=
        nullif(
            btrim(
                coalesce(
                    old.arquivo_url,
                    ''
                )
            ),
            ''
        );

    v_arquivo_url_novo :=
        nullif(
            btrim(
                coalesce(
                    new.arquivo_url,
                    ''
                )
            ),
            ''
        );

    v_url_legada_anterior :=
        nullif(
            btrim(
                coalesce(
                    old.url_do_arquivo,
                    ''
                )
            ),
            ''
        );

    v_url_legada_nova :=
        nullif(
            btrim(
                coalesce(
                    new.url_do_arquivo,
                    ''
                )
            ),
            ''
        );

    if
        v_arquivo_url_anterior
            is not distinct from
        v_arquivo_url_novo

        and

        v_url_legada_anterior
            is not distinct from
        v_url_legada_nova
    then
        return new;
    end if;

    v_arquivo_substituto :=
        coalesce(
            v_arquivo_url_novo,
            v_url_legada_nova
        );

    insert into
    public.certificados_historico (
        certificado_origem_id,
        colaborador_id,
        treinamento_id,
        treinamento_codigo,
        tipo_treinamento,
        nome_treinamento,
        data_realizacao,
        data_vencimento,
        arquivo_url,
        url_do_arquivo,
        arquivo_nome,
        nome_do_arquivo,
        observacao,
        status_validacao,
        certificado_created_at,
        certificado_updated_at,
        arquivo_substituto_url,
        motivo,
        arquivado_em
    )
    values (
        old.id,
        old.colaborador_id,
        old.treinamento_id,
        coalesce(
            old.treinamento_codigo,
            new.treinamento_codigo
        ),
        old.tipo_treinamento,
        old.nome_treinamento,
        old.data_realizacao,
        old.data_vencimento,
        old.arquivo_url,
        old.url_do_arquivo,
        old.arquivo_nome,
        old.nome_do_arquivo,
        old.observacao,
        old.status_validacao,
        old.created_at,
        old.updated_at,
        v_arquivo_substituto,
        'substituicao_arquivo',
        now()
    );

    return new;
end;
$function$;

revoke all
on function
public.arquivar_certificado_antes_substituicao()
from public, anon;

grant execute
on function
public.arquivar_certificado_antes_substituicao()
to authenticated, service_role;

drop trigger if exists
trg_certificados_historico_antes_substituicao
on public.certificados;

create trigger
trg_certificados_historico_antes_substituicao
before update of
    arquivo_url,
    url_do_arquivo
on public.certificados
for each row
when (
    coalesce(
        old.treinamento_codigo,
        new.treinamento_codigo,
        -1
    ) = 14

    and

    (
        old.arquivo_url
            is distinct from
        new.arquivo_url

        or

        old.url_do_arquivo
            is distinct from
        new.url_do_arquivo
    )
)
execute function
public.arquivar_certificado_antes_substituicao();

notify pgrst, 'reload schema';

commit;