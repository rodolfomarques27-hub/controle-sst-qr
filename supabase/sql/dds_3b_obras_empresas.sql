-- DDS 3B - Cadastro de obras vinculadas a empresas
-- Execute no Supabase SQL Editor uma única vez.
-- Objetivo: permitir que o DDS selecione Empresa > Obra > Fiscal > Líder.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.obras_empresas (
    id uuid primary key default extensions.gen_random_uuid(),
    empresa_id uuid not null references public.empresas(id) on delete cascade,

    nome text not null,
    cidade text,
    uf text,
    endereco text,

    responsavel_obra text,
    fiscal_idealiza text,
    lider_encarregado text,

    status text not null default 'Ativa',
    observacoes text,

    criado_por uuid null default auth.uid() references auth.users(id) on delete set null,
    atualizado_por uuid null default auth.uid() references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint obras_empresas_status_check
        check (status in ('Ativa', 'Inativa'))
);

comment on table public.obras_empresas is
'Cadastro de obras/setores vinculados a empresas para emissão de DDS semanal e documentos de SST.';

comment on column public.obras_empresas.empresa_id is
'Empresa proprietária/vinculada à obra.';

comment on column public.obras_empresas.nome is
'Nome da obra ou setor, por exemplo: Parque Una - SJC.';

comment on column public.obras_empresas.fiscal_idealiza is
'Fiscal Idealiza responsável pela obra/setor para preenchimento do DDS.';

comment on column public.obras_empresas.lider_encarregado is
'Líder, encarregado, mestre ou supervisor responsável pela frente de trabalho.';

create index if not exists idx_obras_empresas_empresa_id
    on public.obras_empresas (empresa_id);

create index if not exists idx_obras_empresas_status
    on public.obras_empresas (status);

create unique index if not exists idx_obras_empresas_empresa_nome_unico
    on public.obras_empresas (empresa_id, lower(trim(nome)));

create or replace function public.atualizar_updated_at_obras_empresas()
returns trigger
language plpgsql
security invoker
as $function$
begin
    new.updated_at = now();
    new.atualizado_por = auth.uid();
    return new;
end;
$function$;

drop trigger if exists trg_obras_empresas_updated_at on public.obras_empresas;

create trigger trg_obras_empresas_updated_at
before update on public.obras_empresas
for each row
execute function public.atualizar_updated_at_obras_empresas();

alter table public.obras_empresas enable row level security;

drop policy if exists obras_empresas_select_authenticated on public.obras_empresas;
drop policy if exists obras_empresas_insert_authenticated on public.obras_empresas;
drop policy if exists obras_empresas_update_authenticated on public.obras_empresas;
drop policy if exists obras_empresas_delete_authenticated on public.obras_empresas;

create policy obras_empresas_select_authenticated
on public.obras_empresas
for select
to authenticated
using ((select auth.uid()) is not null);

create policy obras_empresas_insert_authenticated
on public.obras_empresas
for insert
to authenticated
with check ((select auth.uid()) is not null);

create policy obras_empresas_update_authenticated
on public.obras_empresas
for update
to authenticated
using ((select auth.uid()) is not null)
with check ((select auth.uid()) is not null);

create policy obras_empresas_delete_authenticated
on public.obras_empresas
for delete
to authenticated
using ((select auth.uid()) is not null);

grant select, insert, update, delete on public.obras_empresas to authenticated;

notify pgrst, 'reload schema';