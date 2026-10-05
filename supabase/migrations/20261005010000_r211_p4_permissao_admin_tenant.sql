-- SafeScan Brasil
-- R2.11 / P4 - Situacao na obra
-- Permite movimentacao por administrador ativo do tenant
-- sem remover as barreiras de autenticacao, usuario ativo e acesso a empresa.

create or replace function public.usuario_pode_movimentar_colaborador(
    p_empresa_id uuid
)
returns boolean
language sql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
    select
        auth.uid() is not null

        and public.usuario_ativo_sistema()

        and (
            public.usuario_admin_global()

            or public.usuario_tem_permissao_sistema(
                'colaboradores',
                'editar'
            )

            or exists (
                select
                    1
                from
                    public.empresas
                        as empresa

                    join public.tenant_memberships
                        as membership
                      on membership.tenant_id =
                            empresa.tenant_id

                    join public.tenants
                        as tenant
                      on tenant.id =
                            membership.tenant_id

                where
                    p_empresa_id is not null

                    and empresa.id =
                        p_empresa_id

                    and membership.user_id =
                        auth.uid()

                    and membership.status =
                        'ativo'

                    and membership.papel =
                        'administrador'

                    and tenant.status =
                        'ativo'
            )
        )

        and (
            not public.usuario_tem_escopo_empresa_atribuido()

            or public.usuario_admin_global()

            or (
                p_empresa_id is not null

                and public.usuario_tem_acesso_empresa(
                    p_empresa_id
                )
            )
        );
$function$;
