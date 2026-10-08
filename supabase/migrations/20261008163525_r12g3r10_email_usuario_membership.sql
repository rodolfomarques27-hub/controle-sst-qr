-- SafeScan Brasil | R12G-3-R10
-- Elegibilidade SMTP pessoal: membership e status do tenant sao autoritativos.
-- Nao modifica credenciais, Vault, RLS, tabelas, RPCs publicas ou SMTP da empresa.

begin;

create or replace function private.usuario_email_usuario_elegivel(
    p_tenant_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
    select
        p_tenant_id is not null
        and p_user_id is not null
        and exists (
            select 1
            from public.tenant_memberships as membership
            join public.tenants as tenant
              on tenant.id = membership.tenant_id
            where membership.tenant_id = p_tenant_id
              and membership.user_id = p_user_id
              and membership.status = 'ativo'
              and tenant.status = 'ativo'
        );
$function$;

revoke all
on function private.usuario_email_usuario_elegivel(uuid, uuid)
from public, anon, authenticated, service_role;

commit;
