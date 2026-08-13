
    revoke execute on function public.definir_senha_emergencia_empresa(uuid, text, boolean) from anon;
    revoke execute on function public.finalizar_troca_senha_temporaria_sistema() from anon;
    revoke execute on function public.registrar_login_usuario_sistema() from anon;
    revoke execute on function public.registrar_solicitacao_acesso_sistema(text, text, text, text, text, text) from anon;
    revoke execute on function public.usuario_atual_pode_gerenciar_perfis_sistema() from anon;
    revoke execute on function public.usuario_permissao_sistema_atual() from anon;
    revoke execute on function public.usuario_tem_permissao_sistema(text, text) from anon;
  ;
