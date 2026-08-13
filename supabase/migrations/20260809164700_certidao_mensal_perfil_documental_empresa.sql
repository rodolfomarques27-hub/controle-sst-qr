begin;

-- ============================================================
-- CERTIDAO MENSAL DOCUMENTAL
-- PERFIL DOCUMENTAL HISTORICO POR EMPRESA
--
-- Regra:
-- sem configuracao especifica, todos os documentos permanecem
-- exigidos, preservando o comportamento anterior do sistema.
--
-- Cada registro passa a valer em competencia_inicio e permanece
-- valido ate a proxima regra do mesmo documento.
--
-- Competencias FECHADAS nao podem ter sua exigibilidade alterada
-- retroativamente. Competencias REABERTAS voltam a aceitar ajuste.
-- ============================================================

do $preflight$
begin
    if to_regclass(
        'public.empresas'
    ) is null then
        raise exception
            'Tabela obrigatoria public.empresas nao localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_competencias'
    ) is null then
        raise exception
            'Tabela obrigatoria certidao_mensal_competencias nao localizada.';
    end if;

    if to_regprocedure(
        'public.certidao_mensal_usuario_pode_acessar_empresa(uuid)'
    ) is null then
        raise exception
            'Funcao de acesso por empresa nao localizada.';
    end if;

    if to_regprocedure(
        'public.certidao_mensal_atualizar_timestamp()'
    ) is null then
        raise exception
            'Funcao de timestamp da Certidao Mensal nao localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_pode_gerenciar_modelos_email_sst()'
    ) is null then
        raise exception
            'Permissao critica de Configuracoes nao localizada.';
    end if;

    if to_regprocedure(
        'public.reabrir_competencia_certidao_mensal(uuid,text)'
    ) is null then
        raise exception
            'RPC formal de reabertura da competencia nao localizada.';
    end if;
end;
$preflight$;

-- ============================================================
-- 1. REGRAS DE EXIGIBILIDADE
-- ============================================================

create table if not exists
    public.certidao_mensal_perfil_documental_regras (
        id uuid
            primary key
            default extensions.gen_random_uuid(),

        empresa_id uuid
            not null
            references public.empresas(id),

        tipo_documento text
            not null,

        exigido boolean
            not null,

        competencia_inicio date
            not null,

        motivo text
            null,

        criado_em timestamptz
            not null
            default now(),

        criado_por uuid
            null
            default auth.uid()
            references auth.users(id)
            on delete set null,

        atualizado_em timestamptz
            not null
            default now(),

        atualizado_por uuid
            null
            default auth.uid()
            references auth.users(id)
            on delete set null,

        constraint certidao_mensal_perfil_documental_tipo_check
            check (
                tipo_documento in (
                    'cnd-federal',
                    'cnd-estadual',
                    'cnd-municipal',
                    'crf-fgts',
                    'fgts',
                    'cndt-trabalhista',
                    'falencia-concordata',
                    'cadastro-tce-ceis',
                    'relacao-empregados',
                    'aso-pcmso'
                )
            ),

        constraint certidao_mensal_perfil_documental_competencia_check
            check (
                competencia_inicio =
                    date_trunc(
                        'month',
                        competencia_inicio
                    )::date
            ),

        constraint certidao_mensal_perfil_documental_motivo_check
            check (
                char_length(
                    coalesce(
                        motivo,
                        ''
                    )
                ) <= 500
            ),

        constraint certidao_mensal_perfil_documental_empresa_tipo_competencia_key
            unique (
                empresa_id,
                tipo_documento,
                competencia_inicio
            )
    );

comment on table
    public.certidao_mensal_perfil_documental_regras
is
    'Historico de exigibilidade documental por empresa, documento e competencia inicial.';

comment on column
    public.certidao_mensal_perfil_documental_regras.exigido
is
    'TRUE exige o documento. FALSE representa documento nao exigido pelo perfil da empresa.';

comment on column
    public.certidao_mensal_perfil_documental_regras.competencia_inicio
is
    'Primeiro mes em que a regra passa a valer, ate a proxima regra do mesmo documento.';

-- ============================================================
-- 2. INDICE
-- ============================================================

create index if not exists
    certidao_mensal_perfil_documental_resolucao_idx
on
    public.certidao_mensal_perfil_documental_regras (
        empresa_id,
        tipo_documento,
        competencia_inicio desc
    );

-- ============================================================
-- 3. TIMESTAMP
-- ============================================================

drop trigger if exists
    trg_certidao_mensal_perfil_documental_timestamp
on
    public.certidao_mensal_perfil_documental_regras;

create trigger
    trg_certidao_mensal_perfil_documental_timestamp
before update
on
    public.certidao_mensal_perfil_documental_regras
for each row
execute function
    public.certidao_mensal_atualizar_timestamp();

-- ============================================================
-- 4. RLS
-- ============================================================

alter table
    public.certidao_mensal_perfil_documental_regras
enable row level security;

revoke all
on table
    public.certidao_mensal_perfil_documental_regras
from public, anon, authenticated;

grant select
on table
    public.certidao_mensal_perfil_documental_regras
to authenticated, service_role;

grant insert, update, delete
on table
    public.certidao_mensal_perfil_documental_regras
to service_role;

drop policy if exists
    certidao_mensal_perfil_documental_select
on
    public.certidao_mensal_perfil_documental_regras;

create policy
    certidao_mensal_perfil_documental_select
on
    public.certidao_mensal_perfil_documental_regras
for select
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_empresa(
        empresa_id
    )
);

-- authenticated nao possui escrita direta.
-- Alteracoes passam exclusivamente pela RPC administrativa.

-- ============================================================
-- 5. PERMISSAO ADMINISTRATIVA
-- ============================================================

create or replace function
    public.certidao_mensal_usuario_pode_gerenciar_perfil_documental()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
    select coalesce(
        public.usuario_pode_gerenciar_modelos_email_sst(),
        false
    );
$function$;

revoke all
on function
    public.certidao_mensal_usuario_pode_gerenciar_perfil_documental()
from public, anon, authenticated;

grant execute
on function
    public.certidao_mensal_usuario_pode_gerenciar_perfil_documental()
to authenticated, service_role;

comment on function
    public.certidao_mensal_usuario_pode_gerenciar_perfil_documental()
is
    'Reutiliza a permissao critica de Configuracoes para gerenciar o perfil documental.';

-- ============================================================
-- 6. LISTAGEM DAS REGRAS DA EMPRESA
-- ============================================================

create or replace function
    public.listar_regras_perfil_documental_certidao_mensal(
        p_empresa_id uuid
    )
returns table (
    id uuid,
    empresa_id uuid,
    tipo_documento text,
    exigido boolean,
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
-- 7. SALVAMENTO ADMINISTRATIVO
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
declare
    v_tipo_documento text;
    v_motivo text;

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
        'falencia-concordata',
        'cadastro-tce-ceis',
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
            'Competencia inicial obrigatoria.'
            using errcode = '22004';
    end if;

    if p_competencia_inicio <>
        date_trunc(
            'month',
            p_competencia_inicio
        )::date
    then
        raise exception
            'A competencia inicial deve utilizar o primeiro dia do mes.'
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

    -- --------------------------------------------------------
    -- Descobrir o limite superior de vigencia desta regra.
    --
    -- Exemplo:
    -- 07/2026 = nao exigido
    -- 10/2026 = exigido
    --
    -- A regra de julho afeta somente julho, agosto e setembro.
    -- --------------------------------------------------------

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
        and regra.competencia_inicio >
            p_competencia_inicio;

    -- --------------------------------------------------------
    -- Protecao historica.
    --
    -- Uma regra nao pode atingir competencia FECHADA.
    -- REABERTA nao e bloqueada, pois houve reabertura formal.
    -- --------------------------------------------------------

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
    order by
        competencia.competencia
    limit 1;

    if found then
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
            competencia_inicio,
            motivo,
            criado_por,
            atualizado_por
        )
    values (
        p_empresa_id,
        v_tipo_documento,
        p_exigido,
        p_competencia_inicio,
        v_motivo,
        auth.uid(),
        auth.uid()
    )
    on conflict (
        empresa_id,
        tipo_documento,
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

        'proximaRegraInicio',
            v_proxima_regra_inicio,

        'historicoProtegido',
            true
    );
end;
$function$;

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
        text
    )
is
    'Registra exigibilidade documental por empresa e competencia, protegendo competencias fechadas contra alteracao retroativa.';

-- Deliberadamente nao existe RPC de DELETE.
-- Mudancas futuras devem ser representadas por nova regra,
-- preservando a linha temporal da exigibilidade documental.

commit;