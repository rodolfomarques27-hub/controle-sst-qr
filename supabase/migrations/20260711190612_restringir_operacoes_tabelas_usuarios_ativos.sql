
    drop policy if exists "usuarios logados podem atualizar documentos empresas" on public.documentos_empresas;
    create policy "usuarios ativos podem atualizar documentos empresas"
    on public.documentos_empresas
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem cadastrar documentos empresas" on public.documentos_empresas;
    create policy "usuarios ativos podem cadastrar documentos empresas"
    on public.documentos_empresas
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem excluir documentos empresas" on public.documentos_empresas;
    create policy "usuarios ativos podem excluir documentos empresas"
    on public.documentos_empresas
    for delete to authenticated
    using ((select public.usuario_ativo_sistema()));

    drop policy if exists emails_enviados_insert_authenticated on public.emails_enviados;
    create policy emails_enviados_insert_usuarios_ativos
    on public.emails_enviados
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists emails_enviados_update_authenticated on public.emails_enviados;
    create policy emails_enviados_update_usuarios_ativos
    on public.emails_enviados
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists empresas_obras_delete_authenticated on public.empresas_obras;
    create policy empresas_obras_delete_usuarios_ativos
    on public.empresas_obras
    for delete to authenticated
    using ((select public.usuario_ativo_sistema()));

    drop policy if exists empresas_obras_insert_authenticated on public.empresas_obras;
    create policy empresas_obras_insert_usuarios_ativos
    on public.empresas_obras
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists empresas_obras_update_authenticated on public.empresas_obras;
    create policy empresas_obras_update_usuarios_ativos
    on public.empresas_obras
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists obras_delete_authenticated on public.obras;
    create policy obras_delete_usuarios_ativos
    on public.obras
    for delete to authenticated
    using ((select public.usuario_ativo_sistema()));

    drop policy if exists obras_insert_authenticated on public.obras;
    create policy obras_insert_usuarios_ativos
    on public.obras
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists obras_update_authenticated on public.obras;
    create policy obras_update_usuarios_ativos
    on public.obras
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem cadastrar treinamentos" on public.treinamentos;
    create policy "usuarios ativos podem cadastrar treinamentos"
    on public.treinamentos
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem atualizar verificacoes documentais" on public.verificacoes_documentais;
    create policy "usuarios ativos podem atualizar verificacoes documentais"
    on public.verificacoes_documentais
    for update to authenticated
    using ((select public.usuario_ativo_sistema()))
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem cadastrar verificacoes documentais" on public.verificacoes_documentais;
    create policy "usuarios ativos podem cadastrar verificacoes documentais"
    on public.verificacoes_documentais
    for insert to authenticated
    with check ((select public.usuario_ativo_sistema()));

    drop policy if exists "usuarios logados podem excluir verificacoes documentais" on public.verificacoes_documentais;
    create policy "usuarios ativos podem excluir verificacoes documentais"
    on public.verificacoes_documentais
    for delete to authenticated
    using ((select public.usuario_ativo_sistema()));

    notify pgrst, 'reload schema';
  ;
