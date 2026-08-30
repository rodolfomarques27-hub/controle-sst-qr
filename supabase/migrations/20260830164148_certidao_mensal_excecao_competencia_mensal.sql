-- ============================================================
-- CERT2 — EXCECAO POR COMPETENCIA ESTRITAMENTE MENSAL
-- M4-F11-V8
--
-- IMPORTANTE:
-- esta migration deve ser aplicada somente mediante gate
-- explícito posterior.
--
-- PRECEDENCIA:
-- 1. COMPETENCIA exatamente do mês consultado;
-- 2. última ANUAL aplicável;
-- 3. padrão global TRUE.
-- ============================================================

begin;

-- ============================================================
-- GUARD PRE-APPLY — COMPETENCIAS FECHADAS
--
-- Compara a resolução cumulativa legada com a semântica V8
-- que será produzida pelo backfill:
--
-- janeiro     => ANUAL
-- outros meses => COMPETENCIA
--
-- Se qualquer competência já FECHADA mudar de exigibilidade,
-- a migration aborta antes de qualquer DDL ou UPDATE.
-- ============================================================

do $guard$
begin
    if exists (
        with competencias_fechadas as (
            select
                competencia.empresa_id,
                competencia.competencia
            from
                public.certidao_mensal_competencias competencia
            where
                competencia.status = 'FECHADA'
        ),

        tipos_empresa as (
            select distinct
                regra.empresa_id,
                regra.tipo_documento
            from
                public.certidao_mensal_perfil_documental_regras regra
        ),

        grade as (
            select
                fechada.empresa_id,
                tipo.tipo_documento,
                fechada.competencia
            from
                competencias_fechadas fechada
            inner join
                tipos_empresa tipo
                    on tipo.empresa_id =
                        fechada.empresa_id
        ),

        comparacao as (
            select
                grade.empresa_id,
                grade.tipo_documento,
                grade.competencia,

                coalesce(
                    (
                        select
                            regra.exigido
                        from
                            public.certidao_mensal_perfil_documental_regras regra
                        where
                            regra.empresa_id =
                                grade.empresa_id
                            and regra.tipo_documento =
                                grade.tipo_documento
                            and regra.competencia_inicio <=
                                grade.competencia
                        order by
                            regra.competencia_inicio desc
                        limit 1
                    ),
                    true
                ) as exigido_legado,

                coalesce(
                    (
                        select
                            regra.exigido
                        from
                            public.certidao_mensal_perfil_documental_regras regra
                        where
                            regra.empresa_id =
                                grade.empresa_id
                            and regra.tipo_documento =
                                grade.tipo_documento
                            and (
                                (
                                    extract(
                                        month
                                        from regra.competencia_inicio
                                    ) <> 1
                                    and regra.competencia_inicio =
                                        grade.competencia
                                )
                                or
                                (
                                    extract(
                                        month
                                        from regra.competencia_inicio
                                    ) = 1
                                    and regra.competencia_inicio <=
                                        grade.competencia
                                )
                            )
                        order by
                            case
                                when
                                    extract(
                                        month
                                        from regra.competencia_inicio
                                    ) <> 1
                                    and regra.competencia_inicio =
                                        grade.competencia
                                    then 0
                                else 1
                            end,
                            regra.competencia_inicio desc
                        limit 1
                    ),
                    true
                ) as exigido_v8
            from
                grade
        )

        select
            1
        from
            comparacao
        where
            exigido_legado is distinct from
                exigido_v8
    ) then
        raise exception
            'Migration V8 abortada: existem competencias FECHADAS cuja exigibilidade seria alterada pela conversao para excecao mensal.'
            using
                errcode = '55000',
                hint = 'Reabra ou trate formalmente as competencias afetadas antes de aplicar a migration.';
    end if;
end;
$guard$;

-- ============================================================
-- COLUNA DE ESCOPO + BACKFILL LEGADO
-- ============================================================

alter table
    public.certidao_mensal_perfil_documental_regras
add column if not exists
    escopo text;

-- ------------------------------------------------------------
-- Backfill do legado.
--
-- A UI histórica utilizava janeiro como início da Regra Anual.
-- Alterações iniciadas fora de janeiro eram exceções por
-- competência, embora o resolver antigo as propagasse.
--
-- Nenhum registro futuro/sentinel é removido nesta migration.
-- ------------------------------------------------------------

update
    public.certidao_mensal_perfil_documental_regras
set
    escopo =
        case
            when extract(
                month
                from competencia_inicio
            ) = 1
                then 'ANUAL'
            else 'COMPETENCIA'
        end
where
    escopo is null;

alter table
    public.certidao_mensal_perfil_documental_regras
alter column
    escopo
set not null;

-- ============================================================
-- INTEGRIDADE ESTRUTURAL DO ESCOPO
--
-- ANUAL:
-- - obrigatoriamente janeiro;
-- - o CHECK já existente de competencia_inicio garante
--   primeiro dia do mês.
--
-- COMPETENCIA:
-- - qualquer mês, inclusive janeiro.
-- ============================================================

alter table
    public.certidao_mensal_perfil_documental_regras
drop constraint if exists
    certidao_mensal_perfil_documental_escopo_check;

alter table
    public.certidao_mensal_perfil_documental_regras
drop constraint if exists
    cert2_perfil_escopo_check;

alter table
    public.certidao_mensal_perfil_documental_regras
add constraint
    cert2_perfil_escopo_check
check (
    (
        escopo = 'ANUAL'
        and extract(
            month
            from competencia_inicio
        ) = 1
    )
    or
    escopo = 'COMPETENCIA'
);

comment on column
    public.certidao_mensal_perfil_documental_regras.escopo
is
    'ANUAL = regra base contínua iniciada em janeiro. COMPETENCIA = exceção válida somente no mês exato.';

comment on column
    public.certidao_mensal_perfil_documental_regras.competencia_inicio
is
    'Competência inicial da Regra Anual ou competência exata da exceção mensal, conforme escopo.';

-- ============================================================
-- UNICIDADE
--
-- Regra Anual e Exceção Mensal podem coexistir no mesmo mês,
-- inclusive janeiro.
--
-- Nome deliberadamente curto para respeitar o limite
-- PostgreSQL de 63 bytes para identificadores.
-- ============================================================

alter table
    public.certidao_mensal_perfil_documental_regras
drop constraint if exists
    certidao_mensal_perfil_documental_empresa_tipo_competencia_key;

alter table
    public.certidao_mensal_perfil_documental_regras
drop constraint if exists
    cert2_perfil_empresa_tipo_escopo_comp_key;

alter table
    public.certidao_mensal_perfil_documental_regras
add constraint
    cert2_perfil_empresa_tipo_escopo_comp_key
unique (
    empresa_id,
    tipo_documento,
    escopo,
    competencia_inicio
);

drop index if exists
    public.certidao_mensal_perfil_documental_resolucao_idx;

create index
    certidao_mensal_perfil_documental_resolucao_idx
on
    public.certidao_mensal_perfil_documental_regras (
        empresa_id,
        tipo_documento,
        escopo,
        competencia_inicio desc
    );

-- ============================================================
-- LISTAGEM COM ESCOPO
-- ============================================================

drop function if exists
    public.listar_regras_perfil_documental_certidao_mensal(
        uuid
    );

create function
    public.listar_regras_perfil_documental_certidao_mensal(
        p_empresa_id uuid
    )
returns table (
    id uuid,
    empresa_id uuid,
    tipo_documento text,
    exigido boolean,
    escopo text,
    competencia_inicio date,
    motivo text,
    criado_em timestamptz,
    criado_por uuid,
    atualizado_em timestamptz,
    atualizado_por uuid
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
    if p_empresa_id is null then
        raise exception
            'Empresa obrigatoria para consultar o perfil documental.'
            using errcode = '22004';
    end if;

    if not exists (
        select 1
        from public.empresas empresa
        where empresa.id = p_empresa_id
    ) then
        raise exception
            'Empresa nao localizada para o perfil documental.'
            using errcode = 'P0002';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_empresa(
        p_empresa_id
    ) then
        raise exception
            'Sem permissao para consultar o perfil documental desta empresa.'
            using errcode = '42501';
    end if;

    return query
    select
        regra.id,
        regra.empresa_id,
        regra.tipo_documento,
        regra.exigido,
        regra.escopo,
        regra.competencia_inicio,
        regra.motivo,
        regra.criado_em,
        regra.criado_por,
        regra.atualizado_em,
        regra.atualizado_por
    from
        public.certidao_mensal_perfil_documental_regras regra
    where
        regra.empresa_id = p_empresa_id
    order by
        regra.tipo_documento,
        regra.competencia_inicio,
        regra.escopo,
        regra.criado_em;
end;
$function$;

revoke all
on function
    public.listar_regras_perfil_documental_certidao_mensal(
        uuid
    )
from public, anon, authenticated;

grant execute
on function
    public.listar_regras_perfil_documental_certidao_mensal(
        uuid
    )
to authenticated, service_role;

-- ============================================================
-- RESOLVER
--
-- 1. Exceção COMPETENCIA exatamente do mês;
-- 2. Última regra ANUAL aplicável;
-- 3. Padrão global TRUE.
-- ============================================================

create or replace function
    public.certidao_mensal_documento_exigido_na_competencia(
        p_empresa_id uuid,
        p_tipo_documento text,
        p_competencia date
    )
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $function$
    select
        coalesce(
            (
                select
                    regra.exigido
                from
                    public.certidao_mensal_perfil_documental_regras regra
                where
                    regra.empresa_id =
                        p_empresa_id
                    and regra.tipo_documento =
                        lower(
                            btrim(
                                coalesce(
                                    p_tipo_documento,
                                    ''
                                )
                            )
                        )
                    and (
                        (
                            regra.escopo =
                                'COMPETENCIA'
                            and regra.competencia_inicio =
                                date_trunc(
                                    'month',
                                    p_competencia
                                )::date
                        )
                        or
                        (
                            regra.escopo =
                                'ANUAL'
                            and regra.competencia_inicio <=
                                date_trunc(
                                    'month',
                                    p_competencia
                                )::date
                        )
                    )
                order by
                    case
                        when
                            regra.escopo =
                                'COMPETENCIA'
                            and regra.competencia_inicio =
                                date_trunc(
                                    'month',
                                    p_competencia
                                )::date
                            then 0
                        else 1
                    end,
                    regra.competencia_inicio desc
                limit 1
            ),
            true
        );
$function$;

revoke all
on function
    public.certidao_mensal_documento_exigido_na_competencia(
        uuid,
        text,
        date
    )
from public, anon, authenticated;

grant execute
on function
    public.certidao_mensal_documento_exigido_na_competencia(
        uuid,
        text,
        date
    )
to authenticated, service_role;

-- ============================================================
-- SALVAMENTO NOVO COM ESCOPO EXPLICITO
-- ============================================================

create or replace function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        p_empresa_id uuid,
        p_tipo_documento text,
        p_exigido boolean,
        p_competencia_inicio date,
        p_escopo text,
        p_motivo text
    )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_tipo_documento text;
    v_motivo text;
    v_escopo text;

    v_proxima_regra_inicio date;
    v_competencia_fechada date;

    v_regra
        public.certidao_mensal_perfil_documental_regras%rowtype;
begin
    if not public.certidao_mensal_usuario_pode_gerenciar_perfil_documental() then
        raise exception
            'Sem permissao para alterar exigencias documentais da Certidao Mensal.'
            using errcode = '42501';
    end if;

    if p_empresa_id is null then
        raise exception
            'Empresa obrigatoria para configuracao documental.'
            using errcode = '22004';
    end if;

    if not exists (
        select 1
        from public.empresas empresa
        where empresa.id = p_empresa_id
    ) then
        raise exception
            'Empresa nao localizada para configuracao documental.'
            using errcode = 'P0002';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_empresa(
        p_empresa_id
    ) then
        raise exception
            'Sem permissao para alterar o perfil documental desta empresa.'
            using errcode = '42501';
    end if;

    v_tipo_documento :=
        lower(
            btrim(
                coalesce(
                    p_tipo_documento,
                    ''
                )
            )
        );

    if v_tipo_documento not in (
        'cnd-federal',
        'cnd-estadual',
        'cnd-municipal',
        'crf-fgts',
        'fgts',
        'cndt-trabalhista',
        'ceat-trt',
        'falencia-concordata',
        'cadastro-tce-ceis',
        'folha-pagamento',
        'folha-ponto',
        'va-vt',
        'seguro-vida',
        'inss-dctfweb',
        'iss',
        'esocial',
        'relacao-empregados',
        'aso-pcmso'
    ) then
        raise exception
            'Tipo documental nao pertence ao catalogo oficial da Certidao Mensal.'
            using errcode = '22023';
    end if;

    if p_exigido is null then
        raise exception
            'O estado de exigibilidade deve ser informado.'
            using errcode = '22004';
    end if;

    if p_competencia_inicio is null then
        raise exception
            'Competencia obrigatoria.'
            using errcode = '22004';
    end if;

    if p_competencia_inicio <>
        date_trunc(
            'month',
            p_competencia_inicio
        )::date
    then
        raise exception
            'A competencia deve utilizar o primeiro dia do mes.'
            using errcode = '22023';
    end if;

    v_escopo :=
        upper(
            btrim(
                coalesce(
                    p_escopo,
                    ''
                )
            )
        );

    if v_escopo not in (
        'ANUAL',
        'COMPETENCIA'
    ) then
        raise exception
            'O escopo deve ser ANUAL ou COMPETENCIA.'
            using errcode = '22023';
    end if;

    if (
        v_escopo = 'ANUAL'
        and extract(
            month
            from p_competencia_inicio
        ) <> 1
    ) then
        raise exception
            'A Regra Anual deve iniciar em janeiro.'
            using errcode = '22023';
    end if;

    v_motivo :=
        nullif(
            btrim(
                coalesce(
                    p_motivo,
                    ''
                )
            ),
            ''
        );

    if char_length(
        coalesce(
            v_motivo,
            ''
        )
    ) > 500 then
        raise exception
            'O motivo deve ter no maximo 500 caracteres.'
            using errcode = '22001';
    end if;

    if v_escopo = 'COMPETENCIA' then
        select
            competencia.competencia
        into
            v_competencia_fechada
        from
            public.certidao_mensal_competencias competencia
        where
            competencia.empresa_id =
                p_empresa_id
            and competencia.status =
                'FECHADA'
            and competencia.competencia =
                p_competencia_inicio
        limit 1;
    else
        select
            min(
                regra.competencia_inicio
            )
        into
            v_proxima_regra_inicio
        from
            public.certidao_mensal_perfil_documental_regras regra
        where
            regra.empresa_id =
                p_empresa_id
            and regra.tipo_documento =
                v_tipo_documento
            and regra.escopo =
                'ANUAL'
            and regra.competencia_inicio >
                p_competencia_inicio;

        select
            competencia.competencia
        into
            v_competencia_fechada
        from
            public.certidao_mensal_competencias competencia
        where
            competencia.empresa_id =
                p_empresa_id
            and competencia.status =
                'FECHADA'
            and competencia.competencia >=
                p_competencia_inicio
            and (
                v_proxima_regra_inicio is null
                or competencia.competencia <
                    v_proxima_regra_inicio
            )
            and not exists (
                select 1
                from
                    public.certidao_mensal_perfil_documental_regras excecao
                where
                    excecao.empresa_id =
                        p_empresa_id
                    and excecao.tipo_documento =
                        v_tipo_documento
                    and excecao.escopo =
                        'COMPETENCIA'
                    and excecao.competencia_inicio =
                        competencia.competencia
            )
        order by
            competencia.competencia
        limit 1;
    end if;

    if v_competencia_fechada is not null then
        raise exception
            'A regra atingiria a competencia fechada %. Reabra formalmente a competencia antes de alterar sua exigibilidade.',
            to_char(
                v_competencia_fechada,
                'MM/YYYY'
            )
            using errcode = '55000';
    end if;

    insert into
        public.certidao_mensal_perfil_documental_regras (
            empresa_id,
            tipo_documento,
            exigido,
            escopo,
            competencia_inicio,
            motivo,
            criado_por,
            atualizado_por
        )
    values (
        p_empresa_id,
        v_tipo_documento,
        p_exigido,
        v_escopo,
        p_competencia_inicio,
        v_motivo,
        auth.uid(),
        auth.uid()
    )
    on conflict (
        empresa_id,
        tipo_documento,
        escopo,
        competencia_inicio
    )
    do update
    set
        exigido =
            excluded.exigido,
        motivo =
            excluded.motivo,
        atualizado_em =
            clock_timestamp(),
        atualizado_por =
            auth.uid()
    returning *
    into
        v_regra;

    return jsonb_build_object(
        'ok',
            true,
        'regra',
            to_jsonb(
                v_regra
            ),
        'escopo',
            v_escopo,
        'proximaRegraInicio',
            v_proxima_regra_inicio,
        'historicoProtegido',
            true
    );
end;
$function$;

-- ============================================================
-- COMPATIBILIDADE FAIL-CLOSED
--
-- O cliente antigo não conhece p_escopo e exibe semântica
-- cumulativa "a partir da competência".
--
-- Permitir que ele continue gravando converteria silenciosamente
-- uma ação cumulativa em exceção mensal. Portanto a assinatura
-- antiga permanece apenas para retornar erro explícito.
-- ============================================================

create or replace function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        p_empresa_id uuid,
        p_tipo_documento text,
        p_exigido boolean,
        p_competencia_inicio date,
        p_motivo text default null
    )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
    raise exception
        'Cliente desatualizado para configurar exigibilidade documental.'
        using
            errcode = '55000',
            hint = 'Atualize a aplicação antes de salvar Regra Anual ou Exceção Mensal.';
end;
$function$;

revoke all
on function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        uuid,
        text,
        boolean,
        date,
        text,
        text
    )
from public, anon, authenticated;

grant execute
on function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        uuid,
        text,
        boolean,
        date,
        text,
        text
    )
to authenticated, service_role;

revoke all
on function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        uuid,
        text,
        boolean,
        date,
        text
    )
from public, anon, authenticated;

grant execute
on function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        uuid,
        text,
        boolean,
        date,
        text
    )
to authenticated, service_role;

comment on function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        uuid,
        text,
        boolean,
        date,
        text,
        text
    )
is
    'Registra Regra Anual ou Exceção Mensal explícita, preservando competências fechadas.';

comment on function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        uuid,
        text,
        boolean,
        date,
        text
    )
is
    'Assinatura legada bloqueada em fail-closed. O cliente deve informar escopo explicitamente.';

comment on function
    public.certidao_mensal_documento_exigido_na_competencia(
        uuid,
        text,
        date
    )
is
    'Resolve exigibilidade com precedência: exceção mensal exata, Regra Anual aplicável e padrão global.';

commit;
