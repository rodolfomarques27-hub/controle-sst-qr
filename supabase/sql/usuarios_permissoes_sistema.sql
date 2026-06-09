-- Roteiro 11 — Etapa 2.6
-- Planejamento da tabela geral de permissões do sistema.
--
-- Importante:
-- 1. Este SQL NÃO substitui a tabela auditoria_usuarios_autorizados.
-- 2. auditoria_usuarios_autorizados continua responsável apenas pelo acesso à Auditoria do Sistema.
-- 3. usuarios_permissoes_sistema será a base futura para permissões gerais por usuário, perfil, módulo e ação.
-- 4. Não aplicar bloqueios reais no front-end antes de validar esta estrutura, policies e RPCs.

create extension if not exists pgcrypto;

create table if not exists public.usuarios_permissoes_sistema (
    id uuid primary key default gen_random_uuid(),
    user_id uuid null references auth.users(id) on delete set null,
    email text not null,
    nome text null,
    funcao text null,
    empresa_id uuid null,

    perfil text not null default 'tecnico_sst',
    ativo boolean not null default true,
    bloqueado boolean not null default false,
    acesso_global boolean not null default false,

    permissoes jsonb not null default '{}'::jsonb,

    observacao text null,
    criado_por uuid null references auth.users(id) on delete set null,
    atualizado_por uuid null references auth.users(id) on delete set null,
    criado_por_email text null,
    atualizado_por_email text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index if not exists usuarios_permissoes_sistema_email_key
    on public.usuarios_permissoes_sistema (lower(email));

create index if not exists usuarios_permissoes_sistema_user_id_idx
    on public.usuarios_permissoes_sistema (user_id);

create index if not exists usuarios_permissoes_sistema_perfil_idx
    on public.usuarios_permissoes_sistema (perfil);

create index if not exists usuarios_permissoes_sistema_ativo_idx
    on public.usuarios_permissoes_sistema (ativo, bloqueado);

create index if not exists usuarios_permissoes_sistema_permissoes_gin_idx
    on public.usuarios_permissoes_sistema using gin (permissoes);

create or replace function public.atualizar_updated_at_usuarios_permissoes_sistema()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_atualizar_updated_at_usuarios_permissoes_sistema on public.usuarios_permissoes_sistema;

create trigger trg_atualizar_updated_at_usuarios_permissoes_sistema
before update on public.usuarios_permissoes_sistema
for each row
execute function public.atualizar_updated_at_usuarios_permissoes_sistema();

alter table public.usuarios_permissoes_sistema enable row level security;

comment on table public.usuarios_permissoes_sistema is
'Tabela planejada para permissões gerais do sistema Controle SST QR. Não substitui auditoria_usuarios_autorizados.';

comment on column public.usuarios_permissoes_sistema.permissoes is
'JSONB planejado para permissões por módulo e ação.';
