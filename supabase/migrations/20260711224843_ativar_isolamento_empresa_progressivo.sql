
    create or replace function public.usuario_tem_escopo_empresa_atribuido()
    returns boolean
    language sql
    security definer
    set search_path = public
    as $function$
      select exists (
        select 1
        from public.usuarios_permissoes_sistema ups
        where coalesce(ups.ativo, false) = true
          and coalesce(ups.bloqueado, false) = false
          and ups.empresa_id is not null
          and (
            (auth.uid() is not null and ups.user_id = auth.uid())
            or (
              nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '') is not null
              and lower(coalesce(ups.email, '')) = lower(trim(auth.jwt() ->> 'email'))
            )
          )
      );
    $function$;

    create or replace function public.usuario_tem_acesso_certificado(p_colaborador_id uuid)
    returns boolean
    language sql
    security definer
    set search_path = public
    as $function$
      select
        not public.usuario_tem_escopo_empresa_atribuido()
        or public.usuario_admin_global()
        or exists (
          select 1
          from public.colaboradores c
          where c.id = p_colaborador_id
            and public.usuario_tem_acesso_empresa(c.empresa_id)
        );
    $function$;

    revoke all on function public.usuario_tem_escopo_empresa_atribuido() from public;
    revoke execute on function public.usuario_tem_escopo_empresa_atribuido() from anon;
    grant execute on function public.usuario_tem_escopo_empresa_atribuido() to authenticated, service_role;

    revoke all on function public.usuario_tem_acesso_certificado(uuid) from public;
    revoke execute on function public.usuario_tem_acesso_certificado(uuid) from anon;
    grant execute on function public.usuario_tem_acesso_certificado(uuid) to authenticated, service_role;

    drop policy if exists empresas_select_usuarios_ativos on public.empresas;
    create policy empresas_select_usuarios_ativos
    on public.empresas
    for select to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(id)
      )
    );

    drop policy if exists empresas_insert_usuarios_ativos on public.empresas;
    create policy empresas_insert_usuarios_ativos
    on public.empresas
    for insert to authenticated
    with check (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
      )
    );

    drop policy if exists empresas_update_usuarios_ativos on public.empresas;
    create policy empresas_update_usuarios_ativos
    on public.empresas
    for update to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(id)
      )
    )
    with check (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(id)
      )
    );

    drop policy if exists colaboradores_select_usuarios_ativos on public.colaboradores;
    create policy colaboradores_select_usuarios_ativos
    on public.colaboradores
    for select to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    );

    drop policy if exists colaboradores_insert_usuarios_ativos on public.colaboradores;
    create policy colaboradores_insert_usuarios_ativos
    on public.colaboradores
    for insert to authenticated
    with check (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    );

    drop policy if exists colaboradores_update_usuarios_ativos on public.colaboradores;
    create policy colaboradores_update_usuarios_ativos
    on public.colaboradores
    for update to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    )
    with check (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    );

    drop policy if exists colaboradores_delete_usuarios_ativos on public.colaboradores;
    create policy colaboradores_delete_usuarios_ativos
    on public.colaboradores
    for delete to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    );

    drop policy if exists dds_registros_select_usuarios_ativos on public.dds_registros;
    create policy dds_registros_select_usuarios_ativos
    on public.dds_registros
    for select to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    );

    drop policy if exists dds_registros_insert_usuarios_ativos on public.dds_registros;
    create policy dds_registros_insert_usuarios_ativos
    on public.dds_registros
    for insert to authenticated
    with check (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    );

    drop policy if exists dds_registros_update_usuarios_ativos on public.dds_registros;
    create policy dds_registros_update_usuarios_ativos
    on public.dds_registros
    for update to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    )
    with check (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    );

    drop policy if exists dds_registros_delete_usuarios_ativos on public.dds_registros;
    create policy dds_registros_delete_usuarios_ativos
    on public.dds_registros
    for delete to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and (
        not (select public.usuario_tem_escopo_empresa_atribuido())
        or (select public.usuario_admin_global())
        or public.usuario_tem_acesso_empresa(empresa_id)
      )
    );

    drop policy if exists certificados_select_usuarios_ativos on public.certificados;
    create policy certificados_select_usuarios_ativos
    on public.certificados
    for select to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and public.usuario_tem_acesso_certificado(colaborador_id)
    );

    drop policy if exists certificados_insert_usuarios_ativos on public.certificados;
    create policy certificados_insert_usuarios_ativos
    on public.certificados
    for insert to authenticated
    with check (
      (select public.usuario_ativo_sistema())
      and public.usuario_tem_acesso_certificado(colaborador_id)
    );

    drop policy if exists certificados_update_usuarios_ativos on public.certificados;
    create policy certificados_update_usuarios_ativos
    on public.certificados
    for update to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and public.usuario_tem_acesso_certificado(colaborador_id)
    )
    with check (
      (select public.usuario_ativo_sistema())
      and public.usuario_tem_acesso_certificado(colaborador_id)
    );

    drop policy if exists certificados_delete_usuarios_ativos on public.certificados;
    create policy certificados_delete_usuarios_ativos
    on public.certificados
    for delete to authenticated
    using (
      (select public.usuario_ativo_sistema())
      and public.usuario_tem_acesso_certificado(colaborador_id)
    );

    notify pgrst, 'reload schema';
  ;
