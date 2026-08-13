
alter table public.mapas_obras
    alter column empresa_id drop not null;

alter table public.mapas_obras
    drop constraint if exists mapas_obras_empresa_obra_nome_unique;

alter table public.mapas_obras
    add constraint mapas_obras_obra_nome_unique unique (obra_id, nome);

alter table public.mapas_pontos
    add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists mapas_obras_obra_idx on public.mapas_obras (obra_id);
create index if not exists mapas_pontos_empresa_idx on public.mapas_pontos (empresa_id);

drop policy if exists mapas_obras_select_escopo on public.mapas_obras;
drop policy if exists mapas_obras_insert_escopo on public.mapas_obras;
drop policy if exists mapas_obras_update_escopo on public.mapas_obras;
drop policy if exists mapas_obras_delete_escopo on public.mapas_obras;
drop policy if exists mapas_pontos_select_escopo on public.mapas_pontos;
drop policy if exists mapas_pontos_insert_escopo on public.mapas_pontos;
drop policy if exists mapas_pontos_update_escopo on public.mapas_pontos;
drop policy if exists mapas_pontos_delete_escopo on public.mapas_pontos;
drop policy if exists mapas_itens_select_escopo on public.mapas_itens;
drop policy if exists mapas_itens_insert_escopo on public.mapas_itens;
drop policy if exists mapas_itens_update_escopo on public.mapas_itens;
drop policy if exists mapas_itens_delete_escopo on public.mapas_itens;
drop policy if exists mapas_obras_storage_select_escopo on storage.objects;
drop policy if exists mapas_obras_storage_insert_escopo on storage.objects;
drop policy if exists mapas_obras_storage_update_escopo on storage.objects;
drop policy if exists mapas_obras_storage_delete_escopo on storage.objects;

create policy mapas_obras_select_escopo on public.mapas_obras
for select to authenticated
using (
    usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = mapas_obras.obra_id
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
);

create policy mapas_obras_insert_escopo on public.mapas_obras
for insert to authenticated
with check (
    usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = mapas_obras.obra_id
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
);

create policy mapas_obras_update_escopo on public.mapas_obras
for update to authenticated
using (
    usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = mapas_obras.obra_id
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
)
with check (
    usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = mapas_obras.obra_id
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
);

create policy mapas_obras_delete_escopo on public.mapas_obras
for delete to authenticated
using (
    usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = mapas_obras.obra_id
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
);

create policy mapas_pontos_select_escopo on public.mapas_pontos
for select to authenticated
using (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and (
            (mapas_pontos.empresa_id is not null and usuario_tem_acesso_empresa(mapas_pontos.empresa_id))
            or exists (
                select 1 from public.empresas_obras eo
                where eo.obra_id = m.obra_id
                  and usuario_tem_acesso_empresa(eo.empresa_id)
            )
          )
    )
);

create policy mapas_pontos_insert_escopo on public.mapas_pontos
for insert to authenticated
with check (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and exists (
              select 1 from public.empresas_obras eo
              where eo.obra_id = m.obra_id
                and usuario_tem_acesso_empresa(eo.empresa_id)
          )
          and (
            mapas_pontos.empresa_id is null
            or usuario_tem_acesso_empresa(mapas_pontos.empresa_id)
          )
    )
);

create policy mapas_pontos_update_escopo on public.mapas_pontos
for update to authenticated
using (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and (
            (mapas_pontos.empresa_id is not null and usuario_tem_acesso_empresa(mapas_pontos.empresa_id))
            or exists (
                select 1 from public.empresas_obras eo
                where eo.obra_id = m.obra_id
                  and usuario_tem_acesso_empresa(eo.empresa_id)
            )
          )
    )
)
with check (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and exists (
              select 1 from public.empresas_obras eo
              where eo.obra_id = m.obra_id
                and usuario_tem_acesso_empresa(eo.empresa_id)
          )
          and (
            mapas_pontos.empresa_id is null
            or usuario_tem_acesso_empresa(mapas_pontos.empresa_id)
          )
    )
);

create policy mapas_pontos_delete_escopo on public.mapas_pontos
for delete to authenticated
using (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and (
            (mapas_pontos.empresa_id is not null and usuario_tem_acesso_empresa(mapas_pontos.empresa_id))
            or exists (
                select 1 from public.empresas_obras eo
                where eo.obra_id = m.obra_id
                  and usuario_tem_acesso_empresa(eo.empresa_id)
            )
          )
    )
);

create policy mapas_itens_select_escopo on public.mapas_itens
for select to authenticated
using (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and (
            (p.empresa_id is not null and usuario_tem_acesso_empresa(p.empresa_id))
            or exists (
                select 1 from public.empresas_obras eo
                where eo.obra_id = m.obra_id
                  and usuario_tem_acesso_empresa(eo.empresa_id)
            )
          )
    )
);

create policy mapas_itens_insert_escopo on public.mapas_itens
for insert to authenticated
with check (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and exists (
              select 1 from public.empresas_obras eo
              where eo.obra_id = m.obra_id
                and usuario_tem_acesso_empresa(eo.empresa_id)
          )
    )
);

create policy mapas_itens_update_escopo on public.mapas_itens
for update to authenticated
using (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and (
            (p.empresa_id is not null and usuario_tem_acesso_empresa(p.empresa_id))
            or exists (
                select 1 from public.empresas_obras eo
                where eo.obra_id = m.obra_id
                  and usuario_tem_acesso_empresa(eo.empresa_id)
            )
          )
    )
)
with check (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and exists (
              select 1 from public.empresas_obras eo
              where eo.obra_id = m.obra_id
                and usuario_tem_acesso_empresa(eo.empresa_id)
          )
    )
);

create policy mapas_itens_delete_escopo on public.mapas_itens
for delete to authenticated
using (
    usuario_ativo_sistema()
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and (
            (p.empresa_id is not null and usuario_tem_acesso_empresa(p.empresa_id))
            or exists (
                select 1 from public.empresas_obras eo
                where eo.obra_id = m.obra_id
                  and usuario_tem_acesso_empresa(eo.empresa_id)
            )
          )
    )
);

create policy mapas_obras_storage_select_escopo on storage.objects
for select to authenticated
using (
    bucket_id = 'mapas-obras'
    and usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = nullif((storage.foldername(name))[1], '')::uuid
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
);

create policy mapas_obras_storage_insert_escopo on storage.objects
for insert to authenticated
with check (
    bucket_id = 'mapas-obras'
    and usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = nullif((storage.foldername(name))[1], '')::uuid
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
);

create policy mapas_obras_storage_update_escopo on storage.objects
for update to authenticated
using (
    bucket_id = 'mapas-obras'
    and usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = nullif((storage.foldername(name))[1], '')::uuid
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
)
with check (
    bucket_id = 'mapas-obras'
    and usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = nullif((storage.foldername(name))[1], '')::uuid
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
);

create policy mapas_obras_storage_delete_escopo on storage.objects
for delete to authenticated
using (
    bucket_id = 'mapas-obras'
    and usuario_ativo_sistema()
    and exists (
        select 1 from public.empresas_obras eo
        where eo.obra_id = nullif((storage.foldername(name))[1], '')::uuid
          and usuario_tem_acesso_empresa(eo.empresa_id)
    )
);
;
