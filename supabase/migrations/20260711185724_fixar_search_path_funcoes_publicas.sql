
alter function public.atualizar_empresas_obras_updated_at() set search_path = public, auth, extensions;
alter function public.atualizar_obras_updated_at() set search_path = public, auth, extensions;
alter function public.atualizar_updated_at_obras_empresas() set search_path = public, auth, extensions;
alter function public.atualizar_updated_at_solicitacoes_acesso_sistema() set search_path = public, auth, extensions;
alter function public.atualizar_updated_at_verificacoes_documentais() set search_path = public, auth, extensions;
alter function public.audit_usuario_email() set search_path = public, auth, extensions;
alter function public.audit_usuario_id() set search_path = public, auth, extensions;
alter function public.impedir_alteracao_codigo_funcionario() set search_path = public, auth, extensions;
alter function public.montar_permissoes_padrao_usuario_sistema(text) set search_path = public, auth, extensions;
alter function public.set_updated_at() set search_path = public, auth, extensions;
alter function public.set_updated_at_usuarios_permissoes_sistema() set search_path = public, auth, extensions;
alter function public.texto_para_uuid_seguro(text) set search_path = public, auth, extensions;
;
