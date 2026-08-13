
    drop index if exists public.idx_auditoria_campo_desvios_auditoria;
    drop index if exists public.idx_auditoria_campo_qrcodes_criado_em;
    drop index if exists public.idx_auditoria_campo_qrcodes_tipo;
    drop index if exists public.auditoria_campo_qrcodes_codigo_idx;
    drop index if exists public.usuarios_permissoes_sistema_user_id_idx;

    create or replace function public.usuario_email_atual()
    returns text
    language sql
    stable
    set search_path = public, auth
    as $function$
      select lower(coalesce(auth.jwt() ->> 'email', ''));
    $function$;

    revoke all on function public.usuario_email_atual() from public;
    grant execute on function public.usuario_email_atual() to authenticated, service_role;

    drop policy if exists "Solicitacoes acesso - visualizar" on public.solicitacoes_acesso_sistema;

    create policy "Solicitacoes acesso - visualizar"
    on public.solicitacoes_acesso_sistema
    for select to authenticated
    using (
      (select public.usuario_atual_pode_gerenciar_perfis_sistema())
      or user_id = (select auth.uid())
      or lower(email) = (select public.usuario_email_atual())
    );

    notify pgrst, 'reload schema';
  ;
