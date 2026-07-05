-- Obras 4A - Cadastro mestre de obras e vinculo empresa/obra
-- Mantem a tabela antiga obras_empresas intacta ate a migracao final do DDS.

begin;

create table if not exists public.obras (
    id uuid primary key default extensions.gen_random_uuid(),
    nome text not null,
    cidade text,
    uf text,
    endereco text,
    fiscal_idealiza text,
    lider_encarregado text,
    status text not null default 'Ativa',
    observacoes text,
    criado_por uuid default auth.uid(),
    atualizado_por uuid default auth.uid(),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint obras_status_check check (status in ('Ativa', 'Inativa'))
);

create table if not exists public.empresas_obras (
    id uuid primary key default extensions.gen_random_uuid(),
    empresa_id uuid not null references public.empresas(id) on delete cascade,
    obra_id uuid not null references public.obras(id) on delete cascade,
    status text not null default 'Ativa',
    observacoes text,
    criado_por uuid default auth.uid(),
    atualizado_por uuid default auth.uid(),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    constraint empresas_obras_status_check check (status in ('Ativa', 'Inativa')),
    constraint empresas_obras_empresa_obra_unique unique (empresa_id, obra_id)
);

create index if not exists obras_status_idx on public.obras (status);
create index if not exists obras_nome_idx on public.obras (lower(trim(nome)));
create index if not exists empresas_obras_empresa_id_idx on public.empresas_obras (empresa_id);
create index if not exists empresas_obras_obra_id_idx on public.empresas_obras (obra_id);
create index if not exists empresas_obras_status_idx on public.empresas_obras (status);

create or replace function public.atualizar_obras_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    new.atualizado_por = auth.uid();
    return new;
end;
$$;

create or replace function public.atualizar_empresas_obras_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    new.atualizado_por = auth.uid();
    return new;
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_trigger
        where tgname = 'trg_atualizar_obras_updated_at'
    ) then
        create trigger trg_atualizar_obras_updated_at
        before update on public.obras
        for each row
        execute function public.atualizar_obras_updated_at();
    end if;
end;
$$;

do $$
begin
    if not exists (
        select 1
        from pg_trigger
        where tgname = 'trg_atualizar_empresas_obras_updated_at'
    ) then
        create trigger trg_atualizar_empresas_obras_updated_at
        before update on public.empresas_obras
        for each row
        execute function public.atualizar_empresas_obras_updated_at();
    end if;
end;
$$;

alter table public.obras enable row level security;
alter table public.empresas_obras enable row level security;

drop policy if exists obras_select_authenticated on public.obras;
drop policy if exists obras_insert_authenticated on public.obras;
drop policy if exists obras_update_authenticated on public.obras;
drop policy if exists obras_delete_authenticated on public.obras;

create policy obras_select_authenticated
on public.obras
for select
to authenticated
using (true);

create policy obras_insert_authenticated
on public.obras
for insert
to authenticated
with check (true);

create policy obras_update_authenticated
on public.obras
for update
to authenticated
using (true)
with check (true);

create policy obras_delete_authenticated
on public.obras
for delete
to authenticated
using (true);

drop policy if exists empresas_obras_select_authenticated on public.empresas_obras;
drop policy if exists empresas_obras_insert_authenticated on public.empresas_obras;
drop policy if exists empresas_obras_update_authenticated on public.empresas_obras;
drop policy if exists empresas_obras_delete_authenticated on public.empresas_obras;

create policy empresas_obras_select_authenticated
on public.empresas_obras
for select
to authenticated
using (true);

create policy empresas_obras_insert_authenticated
on public.empresas_obras
for insert
to authenticated
with check (true);

create policy empresas_obras_update_authenticated
on public.empresas_obras
for update
to authenticated
using (true)
with check (true);

create policy empresas_obras_delete_authenticated
on public.empresas_obras
for delete
to authenticated
using (true);

grant select, insert, update, delete on public.obras to authenticated;
grant select, insert, update, delete on public.empresas_obras to authenticated;

-- Migra dados já cadastrados na tabela temporária anterior, sem apagar nada.
insert into public.obras (
    nome,
    cidade,
    uf,
    endereco,
    fiscal_idealiza,
    lider_encarregado,
    status,
    observacoes
)
select
    oe.nome,
    oe.cidade,
    oe.uf,
    oe.endereco,
    oe.fiscal_idealiza,
    oe.lider_encarregado,
    coalesce(oe.status, 'Ativa'),
    oe.observacoes
from public.obras_empresas oe
where not exists (
    select 1
    from public.obras o
    where lower(trim(o.nome)) = lower(trim(oe.nome))
      and coalesce(upper(trim(o.uf)), '') = coalesce(upper(trim(oe.uf)), '')
      and coalesce(lower(trim(o.cidade)), '') = coalesce(lower(trim(oe.cidade)), '')
);

insert into public.empresas_obras (
    empresa_id,
    obra_id,
    status,
    observacoes
)
select
    oe.empresa_id,
    o.id,
    coalesce(oe.status, 'Ativa'),
    oe.observacoes
from public.obras_empresas oe
join public.obras o
  on lower(trim(o.nome)) = lower(trim(oe.nome))
 and coalesce(upper(trim(o.uf)), '') = coalesce(upper(trim(oe.uf)), '')
 and coalesce(lower(trim(o.cidade)), '') = coalesce(lower(trim(oe.cidade)), '')
where not exists (
    select 1
    from public.empresas_obras eo
    where eo.empresa_id = oe.empresa_id
      and eo.obra_id = o.id
);

notify pgrst, 'reload schema';

commit;