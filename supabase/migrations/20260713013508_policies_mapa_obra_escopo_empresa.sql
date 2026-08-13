
drop policy if exists mapas_obras_select_escopo on public.mapas_obras;
drop policy if exists mapas_obras_insert_escopo on public.mapas_obras;
drop policy if exists mapas_obras_update_escopo on public.mapas_obras;
drop policy if exists mapas_obras_delete_escopo on public.mapas_obras;

create policy mapas_obras_select_escopo on public.mapas_obras
for select to authenticated
using ((select usuario_ativo_sistema()) and (select usuario_tem_acesso_empresa(empresa_id)));

create policy mapas_obras_insert_escopo on public.mapas_obras
for insert to authenticated
with check ((select usuario_ativo_sistema()) and (select usuario_tem_acesso_empresa(empresa_id)));

create policy mapas_obras_update_escopo on public.mapas_obras
for update to authenticated
using ((select usuario_ativo_sistema()) and (select usuario_tem_acesso_empresa(empresa_id)))
with check ((select usuario_ativo_sistema()) and (select usuario_tem_acesso_empresa(empresa_id)));

create policy mapas_obras_delete_escopo on public.mapas_obras
for delete to authenticated
using ((select usuario_ativo_sistema()) and (select usuario_tem_acesso_empresa(empresa_id)));

drop policy if exists mapas_pontos_select_escopo on public.mapas_pontos;
drop policy if exists mapas_pontos_insert_escopo on public.mapas_pontos;
drop policy if exists mapas_pontos_update_escopo on public.mapas_pontos;
drop policy if exists mapas_pontos_delete_escopo on public.mapas_pontos;

create policy mapas_pontos_select_escopo on public.mapas_pontos
for select to authenticated
using (
    (select usuario_ativo_sistema())
    and exists (
        select 1 from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
);

create policy mapas_pontos_insert_escopo on public.mapas_pontos
for insert to authenticated
with check (
    (select usuario_ativo_sistema())
    and exists (
        select 1 from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
);

create policy mapas_pontos_update_escopo on public.mapas_pontos
for update to authenticated
using (
    (select usuario_ativo_sistema())
    and exists (
        select 1 from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
)
with check (
    (select usuario_ativo_sistema())
    and exists (
        select 1 from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
);

create policy mapas_pontos_delete_escopo on public.mapas_pontos
for delete to authenticated
using (
    (select usuario_ativo_sistema())
    and exists (
        select 1 from public.mapas_obras m
        where m.id = mapas_pontos.mapa_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
);

drop policy if exists mapas_itens_select_escopo on public.mapas_itens;
drop policy if exists mapas_itens_insert_escopo on public.mapas_itens;
drop policy if exists mapas_itens_update_escopo on public.mapas_itens;
drop policy if exists mapas_itens_delete_escopo on public.mapas_itens;

create policy mapas_itens_select_escopo on public.mapas_itens
for select to authenticated
using (
    (select usuario_ativo_sistema())
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
);

create policy mapas_itens_insert_escopo on public.mapas_itens
for insert to authenticated
with check (
    (select usuario_ativo_sistema())
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
);

create policy mapas_itens_update_escopo on public.mapas_itens
for update to authenticated
using (
    (select usuario_ativo_sistema())
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
)
with check (
    (select usuario_ativo_sistema())
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
);

create policy mapas_itens_delete_escopo on public.mapas_itens
for delete to authenticated
using (
    (select usuario_ativo_sistema())
    and exists (
        select 1
        from public.mapas_pontos p
        join public.mapas_obras m on m.id = p.mapa_id
        where p.id = mapas_itens.ponto_id
          and (select usuario_tem_acesso_empresa(m.empresa_id))
    )
);

drop policy if exists mapas_obras_storage_insert_escopo on storage.objects;
drop policy if exists mapas_obras_storage_select_escopo on storage.objects;
drop policy if exists mapas_obras_storage_update_escopo on storage.objects;
drop policy if exists mapas_obras_storage_delete_escopo on storage.objects;

create policy mapas_obras_storage_insert_escopo on storage.objects
for insert to authenticated
with check (
    bucket_id = 'mapas-obras'
    and (select usuario_ativo_sistema())
    and (select usuario_tem_acesso_empresa(nullif((storage.foldername(name))[1], '')::uuid))
);

create policy mapas_obras_storage_select_escopo on storage.objects
for select to authenticated
using (
    bucket_id = 'mapas-obras'
    and (select usuario_ativo_sistema())
    and (select usuario_tem_acesso_empresa(nullif((storage.foldername(name))[1], '')::uuid))
);

create policy mapas_obras_storage_update_escopo on storage.objects
for update to authenticated
using (
    bucket_id = 'mapas-obras'
    and (select usuario_ativo_sistema())
    and (select usuario_tem_acesso_empresa(nullif((storage.foldername(name))[1], '')::uuid))
)
with check (
    bucket_id = 'mapas-obras'
    and (select usuario_ativo_sistema())
    and (select usuario_tem_acesso_empresa(nullif((storage.foldername(name))[1], '')::uuid))
);

create policy mapas_obras_storage_delete_escopo on storage.objects
for delete to authenticated
using (
    bucket_id = 'mapas-obras'
    and (select usuario_ativo_sistema())
    and (select usuario_tem_acesso_empresa(nullif((storage.foldername(name))[1], '')::uuid))
);
;
