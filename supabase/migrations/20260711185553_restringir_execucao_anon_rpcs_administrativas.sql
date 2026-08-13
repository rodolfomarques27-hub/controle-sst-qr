
revoke execute on function public.admin_aplicar_perfil_permissao_usuarios_sistema(text, text) from anon;
revoke execute on function public.admin_excluir_usuario_permissao_sistema(text, uuid, text) from anon;
revoke execute on function public.admin_listar_perfis_permissoes_sistema() from anon;
revoke execute on function public.admin_listar_solicitacoes_acesso_sistema() from anon;
revoke execute on function public.admin_listar_usuarios_permissoes_sistema() from anon;
revoke execute on function public.admin_marcar_login_app_criado_sistema(text, uuid, boolean) from anon;
revoke execute on function public.admin_responder_solicitacao_acesso_sistema(uuid, text, text) from anon;
revoke execute on function public.admin_restaurar_perfil_permissao_sistema(text) from anon;
revoke execute on function public.admin_salvar_perfil_permissao_sistema(text, text, text, text, text, jsonb, jsonb, jsonb, jsonb, text, boolean, boolean) from anon;
revoke execute on function public.admin_salvar_usuario_permissao_sistema(text, text, text, text, boolean, boolean, boolean, text, text, text) from anon;
;
