begin;

revoke execute
on function public.salvar_auditoria_campo_publica(text, jsonb)
from public, anon, authenticated;

comment on function public.salvar_auditoria_campo_publica(text, jsonb)
is
'P2-A Fase 2: assinatura legada mantida apenas para uso interno/service_role; acesso direto de clientes publicos e autenticados removido apos publicacao do frontend com token + senha + payload.';

commit;
