begin;

-- ============================================================
-- E3R — RPC ATÔMICA DE EVIDÊNCIAS CORRENTES
--
-- Objetivos:
-- - serializar alterações por certificado lógico;
-- - impedir duplicata por certificado + tipo + arquivo;
-- - promover principal de forma atômica;
-- - manter no máximo um principal corrente;
-- - permitir que o primeiro documento seja principal quando
--   ainda não houver nenhum;
-- - preservar evidências históricas;
-- - não alterar policies;
-- - não alterar Storage;
-- - não alterar certificados_historico.
-- ============================================================

do
$preflight$
declare
    v_policies integer;
begin
    if
        to_regclass(
            'public.certificados'
        ) is null
    then
        raise exception
            'CERT-EVID-E3R: public.certificados não existe.';
    end if;

    if
        to_regclass(
            'public.certificados_evidencias'
        ) is null
    then
        raise exception
            'CERT-EVID-E3R: public.certificados_evidencias não existe.';
    end if;

    if
        to_regclass(
            'public.certificados_evidencias_principal_corrente_uidx'
        ) is null
    then
        raise exception
            'CERT-EVID-E3R: índice de principal corrente não encontrado.';
    end if;

    if
        to_regclass(
            'public.certificados_evidencias_corrente_arquivo_tipo_uidx'
        ) is not null
    then
        raise exception
            'CERT-EVID-E3R: índice de idempotência já existe.';
    end if;

    if exists (
        select
            1
        from
            pg_proc p
        inner join
            pg_namespace n
        on
            n.oid = p.pronamespace
        where
            n.nspname = 'public'
            and
            p.proname =
                'registrar_certificado_evidencia_corrente'
    )
    then
        raise exception
            'CERT-EVID-E3R: RPC registrar_certificado_evidencia_corrente já existe.';
    end if;

    select
        count(*)
    into
        v_policies
    from
        pg_policies
    where
        schemaname = 'public'
        and
        tablename =
            'certificados_evidencias';

    if v_policies <> 4 then
        raise exception
            'CERT-EVID-E3R: quantidade inesperada de policies: %.',
            v_policies;
    end if;

    if exists (
        select
            1
        from
            public.certificados_evidencias e
        where
            e.historica is false
        group by
            e.certificado_origem_id,
            e.tipo_evidencia,
            e.arquivo_url
        having
            count(*) > 1
    )
    then
        raise exception
            'CERT-EVID-E3R: existem duplicatas correntes por certificado/tipo/arquivo.';
    end if;
end;
$preflight$;

-- ============================================================
-- 1. IDEMPOTÊNCIA
--
-- O mesmo arquivo_url pode continuar associado a certificados
-- de colaboradores diferentes. A unicidade vale apenas dentro
-- do mesmo certificado lógico e tipo de evidência.
-- ============================================================

create unique index
certificados_evidencias_corrente_arquivo_tipo_uidx
on
public.certificados_evidencias (
    certificado_origem_id,
    tipo_evidencia,
    arquivo_url
)
where
    historica is false;

-- ============================================================
-- 2. RPC ATÔMICA
-- ============================================================

create function
public.registrar_certificado_evidencia_corrente(
    p_certificado_origem_id uuid,
    p_colaborador_id uuid,
    p_treinamento_codigo integer,
    p_tipo_evidencia text,
    p_arquivo_url text,
    p_treinamento_id uuid default null,
    p_tipo_treinamento text default null,
    p_nome_treinamento text default null,
    p_data_realizacao date default null,
    p_data_vencimento date default null,
    p_arquivo_nome text default null,
    p_observacao text default null,
    p_status_validacao text default 'Pendente de verificação',
    p_principal boolean default false
)
returns
    public.certificados_evidencias
language
    plpgsql
security invoker
set
    search_path = public, pg_temp
as
$function$
declare
    v_certificado
        public.certificados%rowtype;

    v_existente
        public.certificados_evidencias%rowtype;

    v_resultado
        public.certificados_evidencias%rowtype;

    v_tipo
        text :=
            lower(
                btrim(
                    coalesce(
                        p_tipo_evidencia,
                        ''
                    )
                )
            );

    v_arquivo_url
        text :=
            btrim(
                coalesce(
                    p_arquivo_url,
                    ''
                )
            );

    v_deve_ser_principal
        boolean :=
            coalesce(
                p_principal,
                false
            );
begin
    if p_certificado_origem_id is null then
        raise exception
            'CERT-EVID-E3R: certificado_origem_id obrigatório.';
    end if;

    if p_colaborador_id is null then
        raise exception
            'CERT-EVID-E3R: colaborador_id obrigatório.';
    end if;

    if
        p_treinamento_codigo is null
        or
        p_treinamento_codigo <= 0
    then
        raise exception
            'CERT-EVID-E3R: treinamento_codigo inválido.';
    end if;

    if
        v_tipo not in (
            'certificado_individual',
            'lista_presenca',
            'evidencia_complementar'
        )
    then
        raise exception
            'CERT-EVID-E3R: tipo_evidencia não permitido: %.',
            v_tipo;
    end if;

    if v_arquivo_url = '' then
        raise exception
            'CERT-EVID-E3R: arquivo_url obrigatório.';
    end if;

    -- --------------------------------------------------------
    -- Lock do certificado lógico:
    -- serializa duas gravações concorrentes sobre a mesma
    -- combinação de colaborador/treinamento.
    --
    -- SECURITY INVOKER preserva RLS do usuário chamador.
    -- --------------------------------------------------------

    select
        c.*
    into
        v_certificado
    from
        public.certificados c
    where
        c.id =
            p_certificado_origem_id
        and
        c.colaborador_id =
            p_colaborador_id
    for update;

    if not found then
        raise exception
            'CERT-EVID-E3R: certificado inexistente, inacessível ou pertencente a outro colaborador.';
    end if;

    if
        v_certificado.treinamento_codigo
            is distinct from
        p_treinamento_codigo
    then
        raise exception
            'CERT-EVID-E3R: treinamento_codigo diverge do certificado lógico.';
    end if;

    -- A E3 agrupa evidências somente quando pertencem à mesma
    -- realização do treinamento.
    if
        v_certificado.data_realizacao
            is distinct from
        p_data_realizacao
    then
        raise exception
            'CERT-EVID-E3R: data_realizacao diverge do certificado lógico.';
    end if;

    -- --------------------------------------------------------
    -- Retry idempotente.
    -- --------------------------------------------------------

    select
        e.*
    into
        v_existente
    from
        public.certificados_evidencias e
    where
        e.certificado_origem_id =
            p_certificado_origem_id
        and
        e.historica is false
        and
        e.tipo_evidencia =
            v_tipo
        and
        e.arquivo_url =
            v_arquivo_url
    order by
        e.created_at desc
    limit 1;

    if found then
        if
            v_deve_ser_principal
            and
            not v_existente.principal
        then
            update
                public.certificados_evidencias
            set
                principal = false,
                updated_at = now()
            where
                certificado_origem_id =
                    p_certificado_origem_id
                and
                historica is false
                and
                principal is true
                and
                id <>
                    v_existente.id;

            update
                public.certificados_evidencias
            set
                principal = true,
                updated_at = now()
            where
                id =
                    v_existente.id
            returning
                *
            into
                v_resultado;

            return v_resultado;
        end if;

        return v_existente;
    end if;

    -- Se este for o primeiro documento vinculado ao certificado,
    -- ele se torna principal mesmo que o caller tenha informado
    -- false. Isso garante exatamente um principal inicial.
    if not v_deve_ser_principal then
        select
            not exists (
                select
                    1
                from
                    public.certificados_evidencias e
                where
                    e.certificado_origem_id =
                        p_certificado_origem_id
                    and
                    e.historica is false
                    and
                    e.principal is true
            )
        into
            v_deve_ser_principal;
    end if;

    -- Promoção atômica: a mesma transação despromove o anterior
    -- antes de materializar o novo principal.
    if v_deve_ser_principal then
        update
            public.certificados_evidencias
        set
            principal = false,
            updated_at = now()
        where
            certificado_origem_id =
                p_certificado_origem_id
            and
            historica is false
            and
            principal is true;
    end if;

    insert into
        public.certificados_evidencias (
            certificado_origem_id,
            certificado_historico_origem_id,
            colaborador_id,
            treinamento_id,
            treinamento_codigo,
            tipo_treinamento,
            nome_treinamento,
            data_realizacao,
            data_vencimento,
            tipo_evidencia,
            arquivo_url,
            arquivo_nome,
            arquivo_substituto_url,
            observacao,
            status_validacao,
            principal,
            historica,
            origem,
            origem_legada_tabela,
            origem_legada_id,
            created_by,
            created_at,
            updated_at
        )
    values (
        p_certificado_origem_id,
        null,
        p_colaborador_id,
        p_treinamento_id,
        p_treinamento_codigo,

        coalesce(
            nullif(
                btrim(
                    p_tipo_treinamento
                ),
                ''
            ),
            v_certificado.tipo_treinamento
        ),

        coalesce(
            nullif(
                btrim(
                    p_nome_treinamento
                ),
                ''
            ),
            v_certificado.nome_treinamento
        ),

        p_data_realizacao,
        p_data_vencimento,
        v_tipo,
        v_arquivo_url,

        nullif(
            btrim(
                p_arquivo_nome
            ),
            ''
        ),

        null,

        nullif(
            btrim(
                p_observacao
            ),
            ''
        ),

        coalesce(
            nullif(
                btrim(
                    p_status_validacao
                ),
                ''
            ),
            'Pendente de verificação'
        ),

        v_deve_ser_principal,
        false,
        'upload',
        null,
        null,
        auth.uid(),
        now(),
        now()
    )
    returning
        *
    into
        v_resultado;

    return v_resultado;
end;
$function$;

-- ============================================================
-- 3. ACL DA RPC
--
-- Não altera nenhuma policy existente.
-- SECURITY INVOKER mantém as policies da tabela ativas.
-- ============================================================

revoke all
on function
public.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
from public;

revoke all
on function
public.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
from anon;

grant execute
on function
public.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
to authenticated;

grant execute
on function
public.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
to service_role;

comment on function
public.registrar_certificado_evidencia_corrente(
    uuid,
    uuid,
    integer,
    text,
    text,
    uuid,
    text,
    text,
    date,
    date,
    text,
    text,
    text,
    boolean
)
is
'Registra evidência corrente com idempotência e promoção atômica de principal, preservando RLS via SECURITY INVOKER.';

-- ============================================================
-- 4. POSTFLIGHT
-- ============================================================

do
$postflight$
declare
    v_security_definer boolean;
    v_policies integer;
begin
    if
        to_regclass(
            'public.certificados_evidencias_corrente_arquivo_tipo_uidx'
        ) is null
    then
        raise exception
            'CERT-EVID-E3R: índice de idempotência não foi criado.';
    end if;

    select
        p.prosecdef
    into
        v_security_definer
    from
        pg_proc p
    where
        p.oid =
            to_regprocedure(
                'public.registrar_certificado_evidencia_corrente(uuid,uuid,integer,text,text,uuid,text,text,date,date,text,text,text,boolean)'
            );

    if not found then
        raise exception
            'CERT-EVID-E3R: RPC não foi criada.';
    end if;

    if v_security_definer then
        raise exception
            'CERT-EVID-E3R: RPC não está em modo SECURITY INVOKER.';
    end if;

    select
        count(*)
    into
        v_policies
    from
        pg_policies
    where
        schemaname = 'public'
        and
        tablename =
            'certificados_evidencias';

    if v_policies <> 4 then
        raise exception
            'CERT-EVID-E3R: policies foram alteradas inesperadamente.';
    end if;

    if exists (
        select
            1
        from
            public.certificados_evidencias
        where
            principal is true
            and
            historica is false
        group by
            certificado_origem_id
        having
            count(*) > 1
    )
    then
        raise exception
            'CERT-EVID-E3R: mais de um principal corrente localizado.';
    end if;
end;
$postflight$;

notify pgrst, 'reload schema';

commit;
