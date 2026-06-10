-- Roteiro 11 - Etapa 2.21A
-- Solicitações de acesso do sistema
-- Aplicar no SQL Editor do Supabase antes de aplicar o ZIP do front-end.

create extension if not exists pgcrypto;

create table if not exists public.solicitacoes_acesso_sistema (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    nome text,
    email text not null,
    area_solicitada text not null,
    tela text,
    perfil_atual text,
    status text not null default 'pendente' check (status in ('pendente', 'aprovada', 'recusada', 'cancelada')),
    observacao text,
    resposta_admin text,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

create index if not exists idx_solicitacoes_acesso_sistema_status
    on public.solicitacoes_acesso_sistema (status, criado_em desc);

create index if not exists idx_solicitacoes_acesso_sistema_email
    on public.solicitacoes_acesso_sistema (lower(email));

create index if not exists idx_solicitacoes_acesso_sistema_user_id
    on public.solicitacoes_acesso_sistema (user_id);

create or replace function public.atualizar_updated_at_solicitacoes_acesso_sistema()
returns trigger
language plpgsql
as $$
begin
    new.atualizado_em = now();
    return new;
end;
$$;

drop trigger if exists trg_atualizar_solicitacoes_acesso_sistema on public.solicitacoes_acesso_sistema;

create trigger trg_atualizar_solicitacoes_acesso_sistema
before update on public.solicitacoes_acesso_sistema
for each row
execute function public.atualizar_updated_at_solicitacoes_acesso_sistema();

alter table public.solicitacoes_acesso_sistema enable row level security;

drop policy if exists "Solicitacoes acesso - inserir propria" on public.solicitacoes_acesso_sistema;

create policy "Solicitacoes acesso - inserir propria"
on public.solicitacoes_acesso_sistema
for insert
to authenticated
with check (auth.uid() is not null and user_id = auth.uid());

drop policy if exists "Solicitacoes acesso - visualizar propria" on public.solicitacoes_acesso_sistema;

create policy "Solicitacoes acesso - visualizar propria"
on public.solicitacoes_acesso_sistema
for select
to authenticated
using (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Solicitacoes acesso - admin visualizar todas" on public.solicitacoes_acesso_sistema;

create policy "Solicitacoes acesso - admin visualizar todas"
on public.solicitacoes_acesso_sistema
for select
to authenticated
using (
    exists (
        select 1
        from public.usuarios_permissoes_sistema ups
        where
            (ups.user_id = auth.uid() or lower(ups.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
            and ups.ativo is true
            and ups.bloqueado is false
            and (
                ups.perfil = 'administrador'
                or ups.acesso_global is true
                or coalesce((ups.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes')::boolean, false) is true
            )
    )
);

drop policy if exists "Solicitacoes acesso - admin atualizar" on public.solicitacoes_acesso_sistema;

create policy "Solicitacoes acesso - admin atualizar"
on public.solicitacoes_acesso_sistema
for update
to authenticated
using (
    exists (
        select 1
        from public.usuarios_permissoes_sistema ups
        where
            (ups.user_id = auth.uid() or lower(ups.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
            and ups.ativo is true
            and ups.bloqueado is false
            and (
                ups.perfil = 'administrador'
                or ups.acesso_global is true
                or coalesce((ups.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes')::boolean, false) is true
            )
    )
)
with check (
    exists (
        select 1
        from public.usuarios_permissoes_sistema ups
        where
            (ups.user_id = auth.uid() or lower(ups.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
            and ups.ativo is true
            and ups.bloqueado is false
            and (
                ups.perfil = 'administrador'
                or ups.acesso_global is true
                or coalesce((ups.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes')::boolean, false) is true
            )
    )
);

create or replace function public.registrar_solicitacao_acesso_sistema(
    p_nome text default null,
    p_email text default null,
    p_area_solicitada text default null,
    p_tela text default null,
    p_perfil_atual text default null,
    p_observacao text default null
)
returns public.solicitacoes_acesso_sistema
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_user_id uuid := auth.uid();
    v_email text := lower(trim(coalesce(nullif(p_email, ''), auth.jwt() ->> 'email', '')));
    v_area text := trim(coalesce(p_area_solicitada, ''));
    v_tela text := trim(coalesce(p_tela, ''));
    v_existente uuid;
    v_resultado public.solicitacoes_acesso_sistema%rowtype;
begin
    if v_user_id is null then
        raise exception 'Usuário não autenticado para registrar solicitação de acesso.' using errcode = '42501';
    end if;

    if v_email = '' or position('@' in v_email) = 0 then
        raise exception 'E-mail do usuário não informado para registrar solicitação de acesso.';
    end if;

    if v_area = '' then
        raise exception 'Área solicitada não informada.';
    end if;

    select id
      into v_existente
      from public.solicitacoes_acesso_sistema
     where status = 'pendente'
       and (user_id = v_user_id or lower(email) = v_email)
       and coalesce(tela, '') = v_tela
     order by atualizado_em desc
     limit 1;

    if v_existente is not null then
        update public.solicitacoes_acesso_sistema
           set nome = nullif(trim(coalesce(p_nome, '')), ''),
               email = v_email,
               area_solicitada = v_area,
               tela = nullif(v_tela, ''),
               perfil_atual = nullif(trim(coalesce(p_perfil_atual, '')), ''),
               observacao = nullif(trim(coalesce(p_observacao, '')), '')
         where id = v_existente
         returning * into v_resultado;
    else
        insert into public.solicitacoes_acesso_sistema (
            user_id,
            nome,
            email,
            area_solicitada,
            tela,
            perfil_atual,
            status,
            observacao
        ) values (
            v_user_id,
            nullif(trim(coalesce(p_nome, '')), ''),
            v_email,
            v_area,
            nullif(v_tela, ''),
            nullif(trim(coalesce(p_perfil_atual, '')), ''),
            'pendente',
            nullif(trim(coalesce(p_observacao, '')), '')
        ) returning * into v_resultado;
    end if;

    return v_resultado;
end;
$$;

create or replace function public.admin_listar_solicitacoes_acesso_sistema()
returns setof public.solicitacoes_acesso_sistema
language plpgsql
security definer
set search_path = public, auth
as $$
begin
    if not exists (
        select 1
        from public.usuarios_permissoes_sistema ups
        where
            (ups.user_id = auth.uid() or lower(ups.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
            and ups.ativo is true
            and ups.bloqueado is false
            and (
                ups.perfil = 'administrador'
                or ups.acesso_global is true
                or coalesce((ups.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes')::boolean, false) is true
            )
    ) then
        raise exception 'Usuário sem permissão para listar solicitações de acesso.' using errcode = '42501';
    end if;

    return query
    select *
      from public.solicitacoes_acesso_sistema
     order by
        case status when 'pendente' then 0 when 'aprovada' then 1 when 'recusada' then 2 else 3 end,
        criado_em desc;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update on public.solicitacoes_acesso_sistema to authenticated;
grant execute on function public.registrar_solicitacao_acesso_sistema(text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_listar_solicitacoes_acesso_sistema() to authenticated;

-- Roteiro 11 - Etapa 2.21C
-- Responder solicitações de acesso sem alterar automaticamente o perfil do usuário.

create or replace function public.admin_responder_solicitacao_acesso_sistema(
    p_solicitacao_id uuid,
    p_status text,
    p_resposta_admin text default null
)
returns public.solicitacoes_acesso_sistema
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_status text := lower(trim(coalesce(p_status, '')));
    v_resultado public.solicitacoes_acesso_sistema%rowtype;
begin
    if p_solicitacao_id is null then
        raise exception 'Solicitação de acesso não informada.';
    end if;

    if v_status not in ('aprovada', 'recusada') then
        raise exception 'Status inválido. Use aprovada ou recusada.';
    end if;

    if not exists (
        select 1
        from public.usuarios_permissoes_sistema ups
        where
            (ups.user_id = auth.uid() or lower(ups.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
            and ups.ativo is true
            and ups.bloqueado is false
            and (
                ups.perfil = 'administrador'
                or ups.acesso_global is true
                or coalesce((ups.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes')::boolean, false) is true
            )
    ) then
        raise exception 'Usuário sem permissão para responder solicitações de acesso.' using errcode = '42501';
    end if;

    update public.solicitacoes_acesso_sistema
       set status = v_status,
           resposta_admin = nullif(trim(coalesce(p_resposta_admin, '')), ''),
           atualizado_em = now()
     where id = p_solicitacao_id
     returning * into v_resultado;

    if v_resultado.id is null then
        raise exception 'Solicitação de acesso não encontrada.';
    end if;

    return v_resultado;
end;
$$;

grant execute on function public.admin_responder_solicitacao_acesso_sistema(uuid, text, text) to authenticated;
