
    create or replace function public.usuario_ativo_sistema()
    returns boolean
    language sql
    security definer
    set search_path = public, auth
    as $function$
      select exists (
        select 1
        from public.usuarios_permissoes_sistema u
        where coalesce(u.ativo, false) = true
          and coalesce(u.bloqueado, false) = false
          and (
            (auth.uid() is not null and u.user_id = auth.uid())
            or (
              nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '') is not null
              and lower(coalesce(u.email, '')) = lower(trim(auth.jwt() ->> 'email'))
            )
          )
      );
    $function$;

    revoke all on function public.usuario_ativo_sistema() from public;
    grant execute on function public.usuario_ativo_sistema() to authenticated, service_role;

    drop policy if exists auditoria_campo_qrcodes_insert_authenticated on public.auditoria_campo_qrcodes;
    drop policy if exists auditoria_campo_qrcodes_select_authenticated on public.auditoria_campo_qrcodes;
    drop policy if exists auditoria_campo_qrcodes_update_authenticated on public.auditoria_campo_qrcodes;

    create policy auditoria_campo_qrcodes_insert_authenticated
    on public.auditoria_campo_qrcodes
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    create policy auditoria_campo_qrcodes_select_authenticated
    on public.auditoria_campo_qrcodes
    for select to authenticated
    using ((select public.usuario_ativo_sistema()));

    create policy auditoria_campo_qrcodes_update_authenticated
    on public.auditoria_campo_qrcodes
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem inserir auditoria" on public.auditoria_sistema;

    create policy "usuarios ativos podem inserir auditoria"
    on public.auditoria_sistema
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem atualizar certificados" on public.certificados;
    drop policy if exists "usuarios logados podem cadastrar certificados" on public.certificados;
    drop policy if exists "usuarios logados podem consultar certificados" on public.certificados;
    drop policy if exists "usuarios logados podem excluir certificados" on public.certificados;
    drop policy if exists "usuarios logados podem inserir certificados" on public.certificados;

    create policy certificados_select_usuarios_ativos
    on public.certificados
    for select to authenticated
    using ((select public.usuario_ativo_sistema()));

    create policy certificados_insert_usuarios_ativos
    on public.certificados
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    create policy certificados_update_usuarios_ativos
    on public.certificados
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    create policy certificados_delete_usuarios_ativos
    on public.certificados
    for delete to authenticated
    using ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem atualizar colaboradores" on public.colaboradores;
    drop policy if exists "usuarios logados podem cadastrar colaboradores" on public.colaboradores;
    drop policy if exists "usuarios logados podem consultar colaboradores" on public.colaboradores;
    drop policy if exists "usuarios logados podem excluir colaboradores" on public.colaboradores;

    create policy colaboradores_select_usuarios_ativos
    on public.colaboradores
    for select to authenticated
    using ((select public.usuario_ativo_sistema()));

    create policy colaboradores_insert_usuarios_ativos
    on public.colaboradores
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    create policy colaboradores_update_usuarios_ativos
    on public.colaboradores
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    create policy colaboradores_delete_usuarios_ativos
    on public.colaboradores
    for delete to authenticated
    using ((select public.usuario_ativo_sistema()));

    drop policy if exists dds_registros_delete_authenticated on public.dds_registros;
    drop policy if exists dds_registros_insert_authenticated on public.dds_registros;
    drop policy if exists dds_registros_select_authenticated on public.dds_registros;
    drop policy if exists dds_registros_update_authenticated on public.dds_registros;

    create policy dds_registros_select_usuarios_ativos
    on public.dds_registros
    for select to authenticated
    using ((select public.usuario_ativo_sistema()));

    create policy dds_registros_insert_usuarios_ativos
    on public.dds_registros
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    create policy dds_registros_update_usuarios_ativos
    on public.dds_registros
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    create policy dds_registros_delete_usuarios_ativos
    on public.dds_registros
    for delete to authenticated
    using ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem atualizar empresas" on public.empresas;
    drop policy if exists "usuarios logados podem cadastrar empresas" on public.empresas;
    drop policy if exists "usuarios logados podem consultar empresas" on public.empresas;

    create policy empresas_select_usuarios_ativos
    on public.empresas
    for select to authenticated
    using ((select public.usuario_ativo_sistema()));

    create policy empresas_insert_usuarios_ativos
    on public.empresas
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    create policy empresas_update_usuarios_ativos
    on public.empresas
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    notify pgrst, 'reload schema';
  ;
