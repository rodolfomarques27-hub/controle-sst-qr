
    alter table public.usuarios_permissoes_sistema
      add column if not exists empresa_id uuid
      references public.empresas(id)
      on delete set null;

    create index if not exists usuarios_permissoes_sistema_empresa_id_idx
      on public.usuarios_permissoes_sistema (empresa_id);

    create or replace function public.usuario_tem_acesso_empresa(p_empresa_id uuid)
    returns boolean
    language sql
    security definer
    set search_path = public
    as $function$
      select
        public.usuario_admin_global()
        or exists (
          select 1
          from public.auditoria_usuarios_autorizados aua
          where aua.user_id = auth.uid()
            and coalesce(aua.ativo, false) = true
            and aua.empresa_id = p_empresa_id
        )
        or exists (
          select 1
          from public.usuarios_permissoes_sistema ups
          where coalesce(ups.ativo, false) = true
            and coalesce(ups.bloqueado, false) = false
            and ups.empresa_id = p_empresa_id
            and (
              (auth.uid() is not null and ups.user_id = auth.uid())
              or (
                nullif(trim(coalesce(auth.jwt() ->> 'email', '')), '') is not null
                and lower(coalesce(ups.email, '')) = lower(trim(auth.jwt() ->> 'email'))
              )
            )
        );
    $function$;

    revoke all on function public.usuario_tem_acesso_empresa(uuid) from public;
    revoke execute on function public.usuario_tem_acesso_empresa(uuid) from anon;
    grant execute on function public.usuario_tem_acesso_empresa(uuid) to authenticated, service_role;

    notify pgrst, 'reload schema';
  ;
