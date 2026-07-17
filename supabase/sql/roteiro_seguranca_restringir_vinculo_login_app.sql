-- Restringe a vinculacao entre Supabase Auth e permissoes do aplicativo.
-- A Edge Function admin-criar-login-app valida o administrador solicitante e
-- executa esta RPC com service_role somente depois de salvar a permissao.

revoke all on function public.admin_marcar_login_app_criado_sistema(text, uuid, boolean) from public;
revoke all on function public.admin_marcar_login_app_criado_sistema(text, uuid, boolean) from anon;
revoke all on function public.admin_marcar_login_app_criado_sistema(text, uuid, boolean) from authenticated;

grant execute on function public.admin_marcar_login_app_criado_sistema(text, uuid, boolean) to service_role;
