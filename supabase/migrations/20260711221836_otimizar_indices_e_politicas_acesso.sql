
    create index if not exists auditoria_sistema_configuracoes_atualizado_por_idx
      on public.auditoria_sistema_configuracoes (atualizado_por);

    create index if not exists auditoria_tokens_publicos_criado_por_idx
      on public.auditoria_tokens_publicos (criado_por);

    create index if not exists certificados_treinamento_id_idx
      on public.certificados (treinamento_id);

    create index if not exists empresas_empresa_pai_id_idx
      on public.empresas (empresa_pai_id);

    create index if not exists obras_empresas_atualizado_por_idx
      on public.obras_empresas (atualizado_por);

    create index if not exists obras_empresas_criado_por_idx
      on public.obras_empresas (criado_por);

    create index if not exists solicitacoes_acesso_sistema_aprovado_por_user_id_idx
      on public.solicitacoes_acesso_sistema (aprovado_por_user_id);

    create index if not exists solicitacoes_acesso_sistema_concluido_por_user_id_idx
      on public.solicitacoes_acesso_sistema (concluido_por_user_id);

    create index if not exists solicitacoes_acesso_sistema_recusado_por_user_id_idx
      on public.solicitacoes_acesso_sistema (recusado_por_user_id);

    create index if not exists usuarios_permissoes_sistema_atualizado_por_idx
      on public.usuarios_permissoes_sistema (atualizado_por);

    create index if not exists usuarios_permissoes_sistema_criado_por_idx
      on public.usuarios_permissoes_sistema (criado_por);

    create index if not exists verificacoes_documentais_verificado_por_idx
      on public.verificacoes_documentais (verificado_por);

    drop policy if exists "Solicitacoes acesso - admin visualizar todas" on public.solicitacoes_acesso_sistema;
    drop policy if exists "Solicitacoes acesso - visualizar propria" on public.solicitacoes_acesso_sistema;

    create policy "Solicitacoes acesso - visualizar"
    on public.solicitacoes_acesso_sistema
    for select to authenticated
    using (
      (select public.usuario_atual_pode_gerenciar_perfis_sistema())
      or user_id = (select auth.uid())
      or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    );

    drop policy if exists "Solicitacoes acesso - admin atualizar" on public.solicitacoes_acesso_sistema;
    create policy "Solicitacoes acesso - admin atualizar"
    on public.solicitacoes_acesso_sistema
    for update to authenticated
    using ((select public.usuario_atual_pode_gerenciar_perfis_sistema()))
    with check ((select public.usuario_atual_pode_gerenciar_perfis_sistema()));

    drop policy if exists "Solicitacoes acesso - inserir propria" on public.solicitacoes_acesso_sistema;
    create policy "Solicitacoes acesso - inserir propria"
    on public.solicitacoes_acesso_sistema
    for insert to authenticated
    with check (
      (select auth.uid()) is not null
      and user_id = (select auth.uid())
    );

    notify pgrst, 'reload schema';
  ;
