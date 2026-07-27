begin;

-- Permite que usuários autenticados executem a função usada pelas
-- políticas do bucket privado de assinaturas dos modelos de e-mail SST.
-- A própria função continua responsável por validar o perfil e as
-- permissões administrativas do usuário atual.

revoke execute
on function public.usuario_pode_gerenciar_modelos_email_sst()
from public, anon;

grant execute
on function public.usuario_pode_gerenciar_modelos_email_sst()
to authenticated, service_role;

commit;