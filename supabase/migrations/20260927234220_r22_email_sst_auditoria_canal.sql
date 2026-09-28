-- R22_E3_D2B_AUDITORIA_CUTOVER
-- Canal AUDITORIA passa a usar empresa_email_canal_configuracoes.
-- Campos legados de empresas são preservados e sincronizados pela RPC.
-- Esta migration NÃO remove dados legados.

begin;

do $$
declare
    v_definicao text;
begin
    select
        pg_get_constraintdef(
            constraint_row.oid
        )
    into
        v_definicao
    from
        pg_constraint constraint_row
        inner join pg_class tabela
            on tabela.oid =
                constraint_row.conrelid
        inner join pg_namespace esquema
            on esquema.oid =
                tabela.relnamespace
    where
        esquema.nspname =
            'public'
        and tabela.relname =
            'empresa_email_canal_configuracoes'
        and constraint_row.conname =
            'empresa_email_canal_configuracoes_canal_ck';

    if
        v_definicao is null
        or
        v_definicao not like '%DOCUMENTOS%'
        or
        v_definicao not like '%TREINAMENTOS%'
        or
        v_definicao like '%AUDITORIA%'
    then
        raise exception
            'Baseline inesperado do constraint de canais SST.';
    end if;
end;
$$;

alter table
    public.empresa_email_canal_configuracoes
drop constraint
    empresa_email_canal_configuracoes_canal_ck;

alter table
    public.empresa_email_canal_configuracoes
add constraint
    empresa_email_canal_configuracoes_canal_ck
check (
    canal = any (
        array[
            'DOCUMENTOS'::text,
            'TREINAMENTOS'::text,
            'AUDITORIA'::text
        ]
    )
);

create or replace function
    public.listar_configuracoes_email_sst_empresa_tenant(
        p_tenant_id uuid
    )
returns table(
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
    criado_em timestamptz,
    atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path to
    pg_catalog,
    public,
    auth
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
            or
            (
                configuracao.canal =
                    'AUDITORIA'
                and public.tenant_tem_modulo(
                    p_tenant_id,
                    'auditoria_campo'
                )
            )
        )
    order by
        configuracao.empresa_id,
        configuracao.canal;
end;
$function$;

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
    pg_catalog,
    public,
    auth
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

            when v_canal =
                'AUDITORIA'
            then
                'auditoria_campo'

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
                '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
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

    if
        v_canal =
            'AUDITORIA'
    then
        update
            public.empresas
        set
            receber_auditoria =
                v_configuracao.ativo,
            responsavel_auditoria =
                v_configuracao.responsavel,
            email_auditoria =
                v_configuracao.email
        where
            id =
                p_empresa_id
            and tenant_id =
                p_tenant_id;
    end if;

    return to_jsonb(
        v_configuracao
    );
end;
$function$;

insert into
    public.empresa_email_canal_configuracoes (
        tenant_id,
        empresa_id,
        canal,
        ativo,
        responsavel,
        email
    )
select
    empresa.tenant_id,
    empresa.id,
    'AUDITORIA',
    coalesce(
        empresa.receber_auditoria,
        false
    ),
    nullif(
        btrim(
            coalesce(
                empresa.responsavel_auditoria,
                ''
            )
        ),
        ''
    ),
    lower(
        btrim(
            empresa.email_auditoria
        )
    )
from
    public.empresas empresa
where
    empresa.tenant_id is not null
    and public.tenant_tem_modulo(
        empresa.tenant_id,
        'auditoria_campo'
    )
    and nullif(
        btrim(
            coalesce(
                empresa.email_auditoria,
                ''
            )
        ),
        ''
    ) is not null
    and char_length(
        lower(
            btrim(
                empresa.email_auditoria
            )
        )
    ) <= 254
    and lower(
        btrim(
            empresa.email_auditoria
        )
    ) ~*
        '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
on conflict on constraint
    empresa_email_canal_configuracoes_uk
do nothing;

commit;
