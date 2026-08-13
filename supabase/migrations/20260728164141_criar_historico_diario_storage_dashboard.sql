create table if not exists public.storage_uso_historico (
    data date primary key default current_date,
    total_bytes bigint not null check (total_bytes >= 0),
    arquivos integer not null default 0 check (arquivos >= 0),
    buckets integer not null default 0 check (buckets >= 0),
    capturado_por uuid default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.storage_uso_historico is
'Snapshots diarios do uso real do Supabase Storage para o grafico do Dashboard SST.';

alter table public.storage_uso_historico enable row level security;

drop policy if exists storage_uso_historico_select_usuarios_ativos
on public.storage_uso_historico;
create policy storage_uso_historico_select_usuarios_ativos
on public.storage_uso_historico
for select
to authenticated
using ((select usuario_ativo_sistema()));

drop policy if exists storage_uso_historico_insert_admin
on public.storage_uso_historico;
create policy storage_uso_historico_insert_admin
on public.storage_uso_historico
for insert
to authenticated
with check ((select usuario_admin_global()));

drop policy if exists storage_uso_historico_update_admin
on public.storage_uso_historico;
create policy storage_uso_historico_update_admin
on public.storage_uso_historico
for update
to authenticated
using ((select usuario_admin_global()))
with check ((select usuario_admin_global()));

grant select on public.storage_uso_historico to authenticated;
grant insert, update on public.storage_uso_historico to authenticated;
grant all on public.storage_uso_historico to service_role;;
