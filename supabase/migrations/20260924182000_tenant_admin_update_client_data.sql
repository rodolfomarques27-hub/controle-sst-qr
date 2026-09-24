-- SafeScan Brasil
-- R3B7 — Ajuste controlado de dados do cliente.
--
-- Atualiza somente dados cadastrais do Administrador do Cliente
-- e da empresa vinculada.
--
-- Preserva:
-- tenant_id
-- user_id
-- membership_id
-- papel
-- permissoes
-- escopo_empresas
-- acesso_global
-- senha
-- CNPJ
-- histórico de primeiro acesso

create or replace function public.admin_atualizar_dados_cliente_tenant(
    p_tenant_id uuid,
    p_user_id uuid,
    p_empresa_id uuid,
    p_admin_nome text,
    p_admin_email text,
    p_admin_funcao text,
    p_empresa_nome text,
    p_razao_social text,
    p_responsavel text,
    p_empresa_email text
)
returns table (
    ok boolean,
    email_alterado boolean,
    primeiro_acesso_reenvio_necessario boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
    v_actor uuid;
    v_actor_email text;

    v_membership_id uuid;

    v_email_anterior text;
    v_email_novo text;

    v_email_alterado boolean := false;
    v_reenvio boolean := false;

    v_target_app_metadata jsonb;

    v_rows integer;
begin
    v_actor := auth.uid();

    if v_actor is null then
        raise exception
            'Sessão autenticada obrigatória.'
            using errcode = '42501';
    end if;

    if public.usuario_admin_global() is not true then
        raise exception
            'Apenas a Conta Mestre pode ajustar dados do cliente.'
            using errcode = '42501';
    end if;

    if
        p_tenant_id is null
        or p_user_id is null
        or p_empresa_id is null
    then
        raise exception
            'Identificadores obrigatórios não informados.'
            using errcode = '22023';
    end if;

    if
        nullif(trim(coalesce(p_admin_nome, '')), '') is null
        or nullif(trim(coalesce(p_admin_email, '')), '') is null
        or position('@' in trim(p_admin_email)) <= 1
        or nullif(trim(coalesce(p_empresa_nome, '')), '') is null
    then
        raise exception
            'Dados obrigatórios do cliente estão inválidos.'
            using errcode = '22023';
    end if;

    if not exists (
        select 1
        from public.tenants t
        where t.id = p_tenant_id
    ) then
        raise exception
            'Tenant não localizado.'
            using errcode = '22023';
    end if;

    select tm.id
      into v_membership_id
      from public.tenant_memberships tm
     where tm.tenant_id = p_tenant_id
       and tm.user_id = p_user_id
       and lower(coalesce(tm.status, '')) = 'ativo'
       and lower(coalesce(tm.papel, '')) in (
           'admin',
           'administrador'
       )
     limit 1;

    if v_membership_id is null then
        raise exception
            'Administrador ativo do cliente não localizado.'
            using errcode = '42501';
    end if;

    if exists (
        select 1
        from public.usuarios_permissoes_sistema ups
        where ups.user_id = p_user_id
          and coalesce(ups.excluido, false) is false
          and coalesce(ups.acesso_global, false) is true
    ) then
        raise exception
            'Conta Mestre ou usuário global não pode ser alterado por este fluxo.'
            using errcode = '42501';
    end if;

    select
        coalesce(
            u.raw_app_meta_data,
            '{}'::jsonb
        )
      into v_target_app_metadata
      from auth.users u
     where u.id = p_user_id;

    if v_target_app_metadata is null then
        raise exception
            'Usuário Auth do cliente não localizado.'
            using errcode = '22023';
    end if;

    if
        coalesce(
            (v_target_app_metadata ->> 'acesso_global')::boolean,
            false
        )
        or coalesce(
            (v_target_app_metadata ->> 'admin_global')::boolean,
            false
        )
        or coalesce(
            (v_target_app_metadata ->> 'conta_mestre')::boolean,
            false
        )
    then
        raise exception
            'Conta Mestre ou usuário global não pode ser alterado por este fluxo.'
            using errcode = '42501';
    end if;

    if not exists (
        select 1
        from public.empresas e
        where e.id = p_empresa_id
          and e.tenant_id = p_tenant_id
    ) then
        raise exception
            'Empresa não pertence ao tenant informado.'
            using errcode = '42501';
    end if;

    select
        lower(
            trim(
                coalesce(
                    ups.email,
                    ''
                )
            )
        )
      into v_email_anterior
      from public.usuarios_permissoes_sistema ups
     where ups.user_id = p_user_id
       and coalesce(ups.excluido, false) is false
     limit 1;

    if v_email_anterior is null then
        raise exception
            'Perfil SafeScan do cliente não localizado.'
            using errcode = '22023';
    end if;

    select
        lower(
            coalesce(
                u.email,
                ''
            )
        )
      into v_actor_email
      from auth.users u
     where u.id = v_actor;

    v_email_novo :=
        lower(
            trim(
                p_admin_email
            )
        );

    v_email_alterado :=
        v_email_anterior is distinct from
        v_email_novo;

    update public.usuarios_permissoes_sistema ups
       set email =
               v_email_novo,
           nome =
               trim(p_admin_nome),
           funcao =
               nullif(
                   trim(
                       coalesce(
                           p_admin_funcao,
                           ''
                       )
                   ),
                   ''
               ),
           empresa =
               trim(p_empresa_nome),
           empresa_id =
               p_empresa_id,
           atualizado_por =
               v_actor,
           atualizado_por_email =
               nullif(
                   v_actor_email,
                   ''
               ),
           updated_at =
               now()
     where ups.user_id = p_user_id
       and coalesce(ups.excluido, false) is false;

    get diagnostics v_rows = row_count;

    if v_rows <> 1 then
        raise exception
            'Perfil SafeScan não pôde ser atualizado de forma inequívoca.'
            using errcode = 'P0001';
    end if;

    update public.empresas e
       set nome =
               trim(p_empresa_nome),
           razao_social =
               nullif(
                   trim(
                       coalesce(
                           p_razao_social,
                           ''
                       )
                   ),
                   ''
               ),
           responsavel =
               nullif(
                   trim(
                       coalesce(
                           p_responsavel,
                           ''
                       )
                   ),
                   ''
               ),
           email =
               nullif(
                   lower(
                       trim(
                           coalesce(
                               p_empresa_email,
                               ''
                           )
                       )
                   ),
                   ''
               )
     where e.id = p_empresa_id
       and e.tenant_id = p_tenant_id;

    get diagnostics v_rows = row_count;

    if v_rows <> 1 then
        raise exception
            'Empresa não pôde ser atualizada.'
            using errcode = 'P0001';
    end if;

    if exists (
        select 1
        from public.tenant_primeiro_acesso_admin pa
        where pa.tenant_id = p_tenant_id
          and pa.user_id = p_user_id
          and pa.membership_id = v_membership_id
    ) then

        if v_email_alterado then

            update public.tenant_primeiro_acesso_admin pa
               set email =
                       v_email_novo,
                   status =
                       case
                           when pa.status = 'concluido'
                               then 'concluido'
                           else 'nao_enviado'
                       end,
                   ultimo_erro_codigo =
                       case
                           when pa.status = 'concluido'
                               then pa.ultimo_erro_codigo
                           else 'EMAIL_ALTERADO_REENVIO_NECESSARIO'
                       end,
                   atualizado_por =
                       v_actor,
                   atualizado_em =
                       now()
             where pa.tenant_id = p_tenant_id
               and pa.user_id = p_user_id
               and pa.membership_id = v_membership_id;

            select exists (
                select 1
                from public.tenant_primeiro_acesso_admin pa
                where pa.tenant_id = p_tenant_id
                  and pa.user_id = p_user_id
                  and pa.membership_id = v_membership_id
                  and pa.status <> 'concluido'
            )
              into v_reenvio;

        else

            update public.tenant_primeiro_acesso_admin pa
               set email =
                       v_email_novo,
                   atualizado_por =
                       v_actor,
                   atualizado_em =
                       now()
             where pa.tenant_id = p_tenant_id
               and pa.user_id = p_user_id
               and pa.membership_id = v_membership_id;

        end if;

    end if;

    insert into public.auditoria_sistema (
        usuario_id,
        usuario_email,
        acao,
        tabela,
        registro_id,
        descricao,
        dados
    )
    values (
        v_actor,
        nullif(
            v_actor_email,
            ''
        ),
        'TENANT_CLIENT_DATA_UPDATED',
        'tenants',
        p_tenant_id::text,
        'Dados administrativos do cliente atualizados pela Conta Mestre.',
        jsonb_build_object(
            'tenantId',
                p_tenant_id,
            'targetUserId',
                p_user_id,
            'membershipId',
                v_membership_id,
            'empresaId',
                p_empresa_id,
            'emailAlterado',
                v_email_alterado,
            'primeiroAcessoReenvioNecessario',
                v_reenvio
        )
    );

    return query
    select
        true,
        v_email_alterado,
        v_reenvio;
end;
$$;

revoke all
    on function public.admin_atualizar_dados_cliente_tenant(
        uuid,
        uuid,
        uuid,
        text,
        text,
        text,
        text,
        text,
        text,
        text
    )
    from public, anon;

grant execute
    on function public.admin_atualizar_dados_cliente_tenant(
        uuid,
        uuid,
        uuid,
        text,
        text,
        text,
        text,
        text,
        text,
        text
    )
    to authenticated;
