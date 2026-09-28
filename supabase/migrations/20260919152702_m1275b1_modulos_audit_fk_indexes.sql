
create index modulos_sistema_created_by_idx
  on public.modulos_sistema (created_by);

create index modulos_sistema_updated_by_idx
  on public.modulos_sistema (updated_by);

create index tenant_modulos_created_by_idx
  on public.tenant_modulos (created_by);

create index tenant_modulos_updated_by_idx
  on public.tenant_modulos (updated_by);

create index empresa_modulos_created_by_idx
  on public.empresa_modulos (created_by);

create index empresa_modulos_updated_by_idx
  on public.empresa_modulos (updated_by);
