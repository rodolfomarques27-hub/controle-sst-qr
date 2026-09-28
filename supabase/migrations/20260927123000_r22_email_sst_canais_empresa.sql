-- R2.2-E3-A1
-- Fundação tenant-scoped dos canais de e-mail SST independentes.
-- Escopo desta migration: DOCUMENTOS e TREINAMENTOS.
-- Auditoria e Certidão Mensal permanecem em suas estruturas atuais.

create table public.empresa_email_canal_configuracoes (
    id uuid
        primary key
        default gen_random_uuid(),

    tenant_id uuid
        not null
        references public.tenants(id)
        on delete cascade,

    empresa_id uuid
        not null
        references public.empresas(id)
        on delete cascade,

    canal text
        not null,

    ativo boolean
        not null
        default false,

    responsavel text,

    email text,

    versao integer
        not null
        default 1,

    criado_por uuid,

    atualizado_por uuid,

    criado_em timestamp with time zone
        not null
        default now(),

    atualizado_em timestamp with time zone
        not null
        default now(),

    constraint empresa_email_canal_configuracoes_canal_ck
        check (
            canal in (
                'DOCUMENTOS',
                'TREINAMENTOS'
            )
        ),

    constraint empresa_email_canal_configuracoes_versao_ck
        check (
            versao >= 1
        ),

    constraint empresa_email_canal_configuracoes_uk
        unique (
            tenant_id,
            empresa_id,
            canal
        )
);

create index empresa_email_canal_configuracoes_tenant_idx
    on public.empresa_email_canal_configuracoes (
        tenant_id
    );

create index empresa_email_canal_configuracoes_empresa_idx
    on public.empresa_email_canal_configuracoes (
        tenant_id,
        empresa_id
    );

alter table public.empresa_email_canal_configuracoes
    enable row level security;

revoke all
    on table public.empresa_email_canal_configuracoes
    from anon, authenticated;

comment on table public.empresa_email_canal_configuracoes is
    'Configuração independente por tenant, empresa e canal para notificações SST de Documentos e Treinamentos.';

comment on column public.empresa_email_canal_configuracoes.canal is
    'Canal funcional independente: DOCUMENTOS ou TREINAMENTOS.';

-- ============================================================
-- BACKFILL LEGADO
--
-- Os contatos TST existentes são copiados para os dois canais.
-- Nenhum campo legado é removido ou alterado.
--
-- O canal nasce ativo quando existe e-mail TST atualmente
-- informado. A configuração continuará protegida pelo gate
-- comercial antes de ser utilizada futuramente.
-- ============================================================

insert into public.empresa_email_canal_configuracoes (
    tenant_id,
    empresa_id,
    canal,
    ativo,
    responsavel,
    email,
    criado_por,
    atualizado_por
)
select
    empresa.tenant_id,

    empresa.id,

    canais.canal,

    nullif(
        btrim(
            coalesce(
                empresa.tst_email,
                ''
            )
        ),
        ''
    ) is not null,

    nullif(
        btrim(
            coalesce(
                empresa.tst_responsavel,
                ''
            )
        ),
        ''
    ),

    nullif(
        lower(
            btrim(
                coalesce(
                    empresa.tst_email,
                    ''
                )
            )
        ),
        ''
    ),

    null,

    null
from
    public.empresas empresa
cross join (
    values
        ('DOCUMENTOS'::text),
        ('TREINAMENTOS'::text)
) as canais(canal)
where
    empresa.tenant_id is not null
on conflict on constraint
    empresa_email_canal_configuracoes_uk
do nothing;

-- ============================================================
-- RPC — LISTAR
--
-- Retorna somente canais cujo módulo comercial está atualmente
-- contratado pelo tenant.
-- ============================================================

create or replace function
    public.listar_configuracoes_email_sst_empresa_tenant(
        p_tenant_id uuid
    )
returns table (
    id uuid,
    tenant_id uuid,
    empresa_id uuid,
    canal text,
    ativo boolean,
    responsavel text,
    email text,
    versao integer,
    criado_por uuid,
    atualizado_por uuid,
    criado_em timestamp with time zone,
    atualizado_em timestamp with time zone
)
language plpgsql
stable
security definer
set search_path to
    'pg_catalog',
    'public',
    'auth'
as $function$
begin
    if not public.usuario_pode_gerenciar_tenant(
        p_tenant_id
    ) then
        raise exception
            'Sem permissão para consultar configurações de e-mail SST deste tenant.'
            using errcode = '42501';
    end if;

    return query
    select
        configuracao.id,
        configuracao.tenant_id,
        configuracao.empresa_id,
        configuracao.canal,
        configuracao.ativo,
        configuracao.responsavel,
        configuracao.email,
        configuracao.versao,
        configuracao.criado_por,
        configuracao.atualizado_por,
        configuracao.criado_em,
        configuracao.atualizado_em
    from
        public.empresa_email_canal_configuracoes configuracao
    where
        configuracao.tenant_id =
            p_tenant_id

        and (
            (
                configuracao.canal =
                    'DOCUMENTOS'

                and public.tenant_tem_modulo(
                    p_tenant_id,
                    'gestao_documental_sst'
                )
            )

            or

            (
                configuracao.canal =
                    'TREINAMENTOS'

                and public.tenant_tem_modulo(
                    p_tenant_id,
                    'treinamentos'
                )
            )
        )
    order by
        configuracao.empresa_id,
        configuracao.canal;
end;
$function$;

-- ============================================================
-- RPC — SALVAR
--
-- Valida:
-- 1. usuário administrador do tenant;
-- 2. empresa pertencente ao tenant;
-- 3. canal permitido;
-- 4. módulo comercial contratado;
-- 5. e-mail válido quando informado;
-- 6. configuração ativa possui destinatário.
-- ============================================================

create or replace function
    public.salvar_configuracao_email_sst_empresa_tenant(
        p_tenant_id uuid,
        p_empresa_id uuid,
        p_canal text,
        p_ativo boolean,
        p_responsavel text default null,
        p_email text default null
    )
returns jsonb
language plpgsql
security definer
set search_path to
    'pg_catalog',
    'public',
    'auth'
as $function$
declare
    v_canal text;

    v_modulo_chave text;

    v_responsavel text;

    v_email text;

    v_configuracao
        public.empresa_email_canal_configuracoes%rowtype;
begin
    if not public.usuario_pode_gerenciar_tenant(
        p_tenant_id
    ) then
        raise exception
            'Sem permissão para alterar configurações de e-mail SST deste tenant.'
            using errcode = '42501';
    end if;

    if not exists (
        select
            1
        from
            public.empresas empresa
        where
            empresa.id =
                p_empresa_id

            and empresa.tenant_id =
                p_tenant_id
    ) then
        raise exception
            'Empresa não localizada neste tenant para configuração de e-mail SST.'
            using errcode = 'P0002';
    end if;

    v_canal :=
        upper(
            btrim(
                coalesce(
                    p_canal,
                    ''
                )
            )
        );

    v_modulo_chave :=
        case
            when v_canal =
                'DOCUMENTOS'
            then
                'gestao_documental_sst'

            when v_canal =
                'TREINAMENTOS'
            then
                'treinamentos'

            else
                null
        end;

    if v_modulo_chave is null then
        raise exception
            'Canal de e-mail SST inválido.'
            using errcode = '22023';
    end if;

    if not public.tenant_tem_modulo(
        p_tenant_id,
        v_modulo_chave
    ) then
        raise exception
            'O módulo correspondente a este canal não está contratado para o tenant.'
            using errcode = '42501';
    end if;

    v_responsavel :=
        nullif(
            btrim(
                coalesce(
                    p_responsavel,
                    ''
                )
            ),
            ''
        );

    v_email :=
        nullif(
            lower(
                btrim(
                    coalesce(
                        p_email,
                        ''
                    )
                )
            ),
            ''
        );

    if (
        v_email is not null

        and (
            char_length(
                v_email
            ) > 254

            or v_email !~*
                '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        )
    ) then
        raise exception
            'O endereço de e-mail informado para o canal SST é inválido.'
            using errcode = '22023';
    end if;

    if (
        coalesce(
            p_ativo,
            false
        )

        and v_email is null
    ) then
        raise exception
            'Uma configuração ativa precisa possuir e-mail destinatário.'
            using errcode = '22023';
    end if;

    insert into
        public.empresa_email_canal_configuracoes (
            tenant_id,
            empresa_id,
            canal,
            ativo,
            responsavel,
            email,
            versao,
            criado_por,
            atualizado_por,
            criado_em,
            atualizado_em
        )
    values (
        p_tenant_id,
        p_empresa_id,
        v_canal,

        coalesce(
            p_ativo,
            false
        ),

        v_responsavel,
        v_email,
        1,
        auth.uid(),
        auth.uid(),
        now(),
        now()
    )
    on conflict on constraint
        empresa_email_canal_configuracoes_uk
    do update
    set
        ativo =
            excluded.ativo,

        responsavel =
            excluded.responsavel,

        email =
            excluded.email,

        versao =
            empresa_email_canal_configuracoes.versao +
            1,

        atualizado_por =
            auth.uid(),

        atualizado_em =
            now()
    returning
        *
    into
        v_configuracao;

    return to_jsonb(
        v_configuracao
    );
end;
$function$;

revoke all
    on function
        public.listar_configuracoes_email_sst_empresa_tenant(
            uuid
        )
    from public, anon;

revoke all
    on function
        public.salvar_configuracao_email_sst_empresa_tenant(
            uuid,
            uuid,
            text,
            boolean,
            text,
            text
        )
    from public, anon;

grant execute
    on function
        public.listar_configuracoes_email_sst_empresa_tenant(
            uuid
        )
    to authenticated, service_role;

grant execute
    on function
        public.salvar_configuracao_email_sst_empresa_tenant(
            uuid,
            uuid,
            text,
            boolean,
            text,
            text
        )
    to authenticated, service_role;