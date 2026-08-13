
revoke execute on function public.admin_aplicar_perfil_permissao_usuarios_sistema(text, text) from public;
revoke execute on function public.admin_excluir_usuario_permissao_sistema(text, uuid, text) from public;
revoke execute on function public.admin_listar_perfis_permissoes_sistema() from public;
revoke execute on function public.admin_listar_solicitacoes_acesso_sistema() from public;
revoke execute on function public.admin_listar_usuarios_permissoes_sistema() from public;
revoke execute on function public.admin_marcar_login_app_criado_sistema(text, uuid, boolean) from public;
revoke execute on function public.admin_responder_solicitacao_acesso_sistema(uuid, text, text) from public;
revoke execute on function public.admin_restaurar_perfil_permissao_sistema(text) from public;
revoke execute on function public.admin_salvar_perfil_permissao_sistema(text, text, text, text, text, jsonb, jsonb, jsonb, jsonb, text, boolean, boolean) from public;
revoke execute on function public.admin_salvar_usuario_permissao_sistema(text, text, text, text, boolean, boolean, boolean, text, text, text) from public;

grant execute on function public.admin_aplicar_perfil_permissao_usuarios_sistema(text, text) to authenticated, service_role;
grant execute on function public.admin_excluir_usuario_permissao_sistema(text, uuid, text) to authenticated, service_role;
grant execute on function public.admin_listar_perfis_permissoes_sistema() to authenticated, service_role;
grant execute on function public.admin_listar_solicitacoes_acesso_sistema() to authenticated, service_role;
grant execute on function public.admin_listar_usuarios_permissoes_sistema() to authenticated, service_role;
grant execute on function public.admin_marcar_login_app_criado_sistema(text, uuid, boolean) to authenticated, service_role;
grant execute on function public.admin_responder_solicitacao_acesso_sistema(uuid, text, text) to authenticated, service_role;
grant execute on function public.admin_restaurar_perfil_permissao_sistema(text) to authenticated, service_role;
grant execute on function public.admin_salvar_perfil_permissao_sistema(text, text, text, text, text, jsonb, jsonb, jsonb, jsonb, text, boolean, boolean) to authenticated, service_role;
grant execute on function public.admin_salvar_usuario_permissao_sistema(text, text, text, text, boolean, boolean, boolean, text, text, text) to authenticated, service_role;
;
