-- Roteiro 2 - Etapa 79
-- Configuração central da Auditoria de sistema
-- Execute no Supabase SQL Editor somente uma vez.

create table if not exists public.auditoria_sistema_configuracoes (
    chave text primary key,
    valor jsonb not null default '{}'::jsonb,
    atualizado_em timestamptz not null default now(),
    atualizado_por uuid null references auth.users(id) on delete set null
);

alter table public.auditoria_sistema_configuracoes enable row level security;

do $$
begin
    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'auditoria_sistema_configuracoes'
          and policyname = 'auditoria_sistema_configuracoes_select_authenticated'
    ) then
        create policy auditoria_sistema_configuracoes_select_authenticated
        on public.auditoria_sistema_configuracoes
        for select
        to authenticated
        using (true);
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'auditoria_sistema_configuracoes'
          and policyname = 'auditoria_sistema_configuracoes_insert_authenticated'
    ) then
        create policy auditoria_sistema_configuracoes_insert_authenticated
        on public.auditoria_sistema_configuracoes
        for insert
        to authenticated
        with check (true);
    end if;

    if not exists (
        select 1
        from pg_policies
        where schemaname = 'public'
          and tablename = 'auditoria_sistema_configuracoes'
          and policyname = 'auditoria_sistema_configuracoes_update_authenticated'
    ) then
        create policy auditoria_sistema_configuracoes_update_authenticated
        on public.auditoria_sistema_configuracoes
        for update
        to authenticated
        using (true)
        with check (true);
    end if;
end $$;

insert into public.auditoria_sistema_configuracoes (chave, valor)
values (
    'eventos_verificados',
    '{
        "ACESSO": true,
        "ACESSO_TELA": true,
        "ACESSO_QR_INTERNO": true,
        "ACESSO_AUDITORIA": true,
        "BLOQUEIO_AUDITORIA": true,
        "ATUALIZAR_DASHBOARD_SST": true,
        "INSERT": true,
        "UPDATE": true,
        "DELETE": true,
        "DELETE_STORAGE": true
    }'::jsonb
)
on conflict (chave) do nothing;
