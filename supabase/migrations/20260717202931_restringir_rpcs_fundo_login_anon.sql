-- Roteiro 2 - Etapa 104B
-- Remove de forma explicita a execucao anonima das RPCs de escrita do fundo do login.
-- A RPC publica de leitura permanece disponivel para a tela de login.

revoke all on function public.salvar_ajuste_fundo_login_sistema(text, text, numeric)
from public;

revoke all on function public.restaurar_ajuste_fundo_login_sistema()
from public;

revoke execute on function public.salvar_ajuste_fundo_login_sistema(text, text, numeric)
from anon;

revoke execute on function public.restaurar_ajuste_fundo_login_sistema()
from anon;

grant execute on function public.obter_estado_fundo_login_publico()
to anon, authenticated, service_role;

grant execute on function public.salvar_ajuste_fundo_login_sistema(text, text, numeric)
to authenticated, service_role;

grant execute on function public.restaurar_ajuste_fundo_login_sistema()
to authenticated, service_role;