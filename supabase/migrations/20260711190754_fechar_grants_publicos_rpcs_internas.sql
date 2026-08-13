
    revoke execute on function public.finalizar_troca_senha_temporaria_sistema() from public;
    grant execute on function public.finalizar_troca_senha_temporaria_sistema() to authenticated, service_role;

    revoke execute on function public.registrar_login_usuario_sistema() from public;
    grant execute on function public.registrar_login_usuario_sistema() to authenticated, service_role;

    revoke execute on function public.registrar_solicitacao_acesso_sistema(text, text, text, text, text, text) from public;
    grant execute on function public.registrar_solicitacao_acesso_sistema(text, text, text, text, text, text) to authenticated, service_role;

    revoke execute on function public.usuario_atual_pode_gerenciar_perfis_sistema() from public;
    grant execute on function public.usuario_atual_pode_gerenciar_perfis_sistema() to authenticated, service_role;

    revoke execute on function public.usuario_permissao_sistema_atual() from public;
    grant execute on function public.usuario_permissao_sistema_atual() to authenticated, service_role;

    revoke execute on function public.usuario_tem_permissao_sistema(text, text) from public;
    grant execute on function public.usuario_tem_permissao_sistema(text, text) to authenticated, service_role;
  ;
