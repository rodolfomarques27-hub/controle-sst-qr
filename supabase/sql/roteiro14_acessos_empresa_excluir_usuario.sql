-- Roteiro 14 - Acessos do App: empresa e exclusao de acesso
-- Execute este arquivo no SQL Editor do Supabase antes de testar os novos campos no app.
-- Objetivo:
-- 1) adicionar empresa ao cadastro de acesso;
-- 2) atualizar RPCs para retornarem empresa;
-- 3) criar RPC administrativa para excluir o acesso do app sem apagar colaboradores/documentos/empresas;
-- 4) manter a exclusao protegida contra remocao do proprio usuario.

begin;

do $$
begin
    if to_regclass('public.usuarios_permissoes_sistema') is null then
        raise exception 'Tabela public.usuarios_permissoes_sistema não encontrada.';
    end if;
end $$;

alter table public.usuarios_permissoes_sistema
    add column if not exists empresa text;

alter table public.usuarios_permissoes_sistema
    add column if not exists precisa_trocar_senha boolean not null default false;

alter table public.usuarios_permissoes_sistema
    add column if not exists ultimo_login_em timestamptz;

alter table public.usuarios_permissoes_sistema
    add column if not exists login_criado_em timestamptz;

alter table public.usuarios_permissoes_sistema
    add column if not exists criado_por uuid;

alter table public.usuarios_permissoes_sistema
    add column if not exists atualizado_por uuid;

create index if not exists idx_usuarios_permissoes_sistema_empresa
    on public.usuarios_permissoes_sistema (lower(coalesce(empresa, '')));

create index if not exists idx_usuarios_permissoes_sistema_email_lower
    on public.usuarios_permissoes_sistema (lower(email));

create index if not exists idx_usuarios_permissoes_sistema_user_id
    on public.usuarios_permissoes_sistema (user_id);

-- Derrubar RPCs com retorno antigo para recriar incluindo empresa.
drop function if exists public.admin_excluir_usuario_permissao_sistema(uuid, text);
drop function if exists public.admin_salvar_usuario_permissao_sistema(text, text, text, text, boolean, boolean, boolean, text, text);
drop function if exists public.admin_marcar_login_app_criado_sistema(text, uuid, boolean);
drop function if exists public.registrar_login_usuario_sistema();
drop function if exists public.finalizar_troca_senha_temporaria_sistema();
drop function if exists public.admin_listar_usuarios_permissoes_sistema();
drop function if exists public.usuario_permissao_sistema_atual();

create or replace function public.montar_permissoes_padrao_usuario_sistema(p_perfil text)
returns jsonb
language plpgsql
immutable
as $$
declare
    v_perfil text := lower(trim(coalesce(p_perfil, 'consulta')));
begin
    if v_perfil = 'administrador' then
        return jsonb_build_object(
            'acessoTotal', true,
            'modulos', jsonb_build_object(
                'acessos_app', jsonb_build_object('visualizar', true, 'cadastrar', true, 'editar', true, 'excluir', true, 'gerenciar_permissoes', true),
                'configuracoes', jsonb_build_object('visualizar', true, 'editar', true),
                'storage', jsonb_build_object('visualizar', true, 'limpar_arquivos', true)
            ),
            'acoesCriticas', jsonb_build_object(
                'excluir', true,
                'limpar_arquivos', true,
                'gerenciar_permissoes', true,
                'configuracoes_criticas', true
            )
        );
    end if;

    return jsonb_build_object('modulos', jsonb_build_object(), 'acoesCriticas', jsonb_build_object());
end;
$$;

create function public.usuario_permissao_sistema_atual()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_uid uuid := auth.uid();
    v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
    if v_uid is null and coalesce(v_email, '') = '' then
        return;
    end if;

    return query
    select
        u.id,
        u.user_id,
        u.email,
        u.nome,
        u.funcao,
        u.empresa,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where
        (v_uid is not null and u.user_id = v_uid)
        or (
            coalesce(v_email, '') <> ''
            and lower(coalesce(u.email, '')) = v_email
        )
    order by
        case when v_uid is not null and u.user_id = v_uid then 0 else 1 end,
        u.updated_at desc nulls last,
        u.created_at desc nulls last
    limit 1;
end;
$$;

grant execute on function public.usuario_permissao_sistema_atual() to authenticated, service_role;

create function public.admin_listar_usuarios_permissoes_sistema()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_admin record;
    v_pode_gerenciar boolean := false;
begin
    select * into v_admin
    from public.usuario_permissao_sistema_atual()
    limit 1;

    v_pode_gerenciar :=
        coalesce(v_admin.ativo, false)
        and not coalesce(v_admin.bloqueado, true)
        and (
            coalesce(v_admin.acesso_global, false)
            or v_admin.perfil = 'administrador'
            or lower(coalesce(v_admin.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_admin.permissoes -> 'modulos' -> 'acessos_app' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_admin.permissoes -> 'modulos' -> 'configuracoes' ->> 'gerenciar_permissoes', 'false')) = 'true'
        );

    if not v_pode_gerenciar then
        raise exception 'Sem permissão para listar usuários e permissões do sistema.';
    end if;

    return query
    select
        u.id,
        u.user_id,
        u.email,
        u.nome,
        u.funcao,
        u.empresa,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    order by
        coalesce(u.ativo, false) desc,
        coalesce(u.bloqueado, false) asc,
        lower(coalesce(u.empresa, '')) asc,
        lower(coalesce(u.nome, u.email, '')) asc;
end;
$$;

grant execute on function public.admin_listar_usuarios_permissoes_sistema() to authenticated, service_role;

create function public.admin_salvar_usuario_permissao_sistema(
    p_email text,
    p_nome text default '',
    p_funcao text default '',
    p_perfil text default 'consulta',
    p_ativo boolean default true,
    p_bloqueado boolean default false,
    p_acesso_global boolean default false,
    p_observacao text default '',
    p_empresa text default ''
)
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_admin record;
    v_pode_gerenciar boolean := false;
    v_email text := lower(trim(coalesce(p_email, '')));
    v_perfil text := lower(trim(coalesce(p_perfil, 'consulta')));
    v_bloqueado boolean := coalesce(p_bloqueado, false);
    v_ativo boolean := coalesce(p_ativo, true);
    v_acesso_global boolean := coalesce(p_acesso_global, false);
begin
    if v_email = '' or position('@' in v_email) = 0 then
        raise exception 'E-mail inválido para salvar permissão.';
    end if;

    if v_perfil not in ('administrador', 'tecnico_sst', 'auditor', 'gestor', 'consulta', 'bloqueado') then
        v_perfil := 'consulta';
    end if;

    if v_perfil = 'bloqueado' then
        v_bloqueado := true;
        v_ativo := false;
        v_acesso_global := false;
    end if;

    if v_perfil <> 'administrador' then
        v_acesso_global := false;
    end if;

    select * into v_admin
    from public.usuario_permissao_sistema_atual()
    limit 1;

    v_pode_gerenciar :=
        coalesce(v_admin.ativo, false)
        and not coalesce(v_admin.bloqueado, true)
        and (
            coalesce(v_admin.acesso_global, false)
            or v_admin.perfil = 'administrador'
            or lower(coalesce(v_admin.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_admin.permissoes -> 'modulos' -> 'acessos_app' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_admin.permissoes -> 'modulos' -> 'configuracoes' ->> 'gerenciar_permissoes', 'false')) = 'true'
        );

    if not v_pode_gerenciar then
        raise exception 'Sem permissão para salvar usuários e permissões do app.';
    end if;

    if lower(coalesce(v_admin.email, '')) = v_email and (v_bloqueado is true or v_ativo is not true or v_perfil <> 'administrador') then
        raise exception 'Você não pode remover o próprio acesso administrativo.';
    end if;

    update public.usuarios_permissoes_sistema u
    set
        nome = trim(coalesce(p_nome, '')),
        funcao = trim(coalesce(p_funcao, '')),
        empresa = trim(coalesce(p_empresa, '')),
        perfil = v_perfil,
        ativo = v_ativo,
        bloqueado = v_bloqueado,
        acesso_global = v_acesso_global,
        permissoes = public.montar_permissoes_padrao_usuario_sistema(v_perfil),
        observacao = trim(coalesce(p_observacao, '')),
        atualizado_por = auth.uid(),
        updated_at = now()
    where lower(coalesce(u.email, '')) = v_email;

    if not found then
        insert into public.usuarios_permissoes_sistema (
            email,
            nome,
            funcao,
            empresa,
            perfil,
            ativo,
            bloqueado,
            acesso_global,
            permissoes,
            observacao,
            criado_por,
            atualizado_por
        ) values (
            v_email,
            trim(coalesce(p_nome, '')),
            trim(coalesce(p_funcao, '')),
            trim(coalesce(p_empresa, '')),
            v_perfil,
            v_ativo,
            v_bloqueado,
            v_acesso_global,
            public.montar_permissoes_padrao_usuario_sistema(v_perfil),
            trim(coalesce(p_observacao, '')),
            auth.uid(),
            auth.uid()
        );
    end if;

    return query
    select
        u.id,
        u.user_id,
        u.email,
        u.nome,
        u.funcao,
        u.empresa,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where lower(coalesce(u.email, '')) = v_email
    limit 1;
end;
$$;

grant execute on function public.admin_salvar_usuario_permissao_sistema(text, text, text, text, boolean, boolean, boolean, text, text) to authenticated, service_role;

create function public.admin_excluir_usuario_permissao_sistema(
    p_id uuid default null,
    p_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_admin record;
    v_alvo record;
    v_email text := lower(trim(coalesce(p_email, '')));
    v_pode_gerenciar boolean := false;
begin
    select * into v_admin
    from public.usuario_permissao_sistema_atual()
    limit 1;

    v_pode_gerenciar :=
        coalesce(v_admin.ativo, false)
        and not coalesce(v_admin.bloqueado, true)
        and (
            coalesce(v_admin.acesso_global, false)
            or v_admin.perfil = 'administrador'
            or lower(coalesce(v_admin.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes', 'false')) = 'true'
            or lower(coalesce(v_admin.permissoes -> 'modulos' -> 'acessos_app' ->> 'gerenciar_permissoes', 'false')) = 'true'
        );

    if not v_pode_gerenciar then
        raise exception 'Sem permissão para excluir acessos do app.';
    end if;

    select * into v_alvo
    from public.usuarios_permissoes_sistema u
    where (p_id is not null and u.id = p_id)
       or (v_email <> '' and lower(coalesce(u.email, '')) = v_email)
    order by u.updated_at desc nulls last, u.created_at desc nulls last
    limit 1;

    if v_alvo.id is null then
        raise exception 'Acesso do usuário não encontrado para exclusão.';
    end if;

    if lower(coalesce(v_admin.email, '')) = lower(coalesce(v_alvo.email, '')) or (v_admin.user_id is not null and v_admin.user_id = v_alvo.user_id) then
        raise exception 'Você não pode excluir o próprio acesso ao app.';
    end if;

    delete from public.usuarios_permissoes_sistema
    where id = v_alvo.id;

    return jsonb_build_object(
        'ok', true,
        'id', v_alvo.id,
        'email', v_alvo.email,
        'mensagem', 'Acesso removido. Colaboradores, empresas, documentos e Auth não foram apagados.'
    );
end;
$$;

grant execute on function public.admin_excluir_usuario_permissao_sistema(uuid, text) to authenticated, service_role;

create function public.admin_marcar_login_app_criado_sistema(
    p_email text,
    p_user_id uuid default null,
    p_precisa_trocar_senha boolean default true
)
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_email text := lower(trim(coalesce(p_email, '')));
begin
    if v_email = '' or position('@' in v_email) = 0 then
        raise exception 'E-mail inválido para vincular login do app.';
    end if;

    update public.usuarios_permissoes_sistema u
    set
        user_id = coalesce(p_user_id, u.user_id),
        precisa_trocar_senha = coalesce(p_precisa_trocar_senha, true),
        login_criado_em = coalesce(u.login_criado_em, now()),
        atualizado_por = auth.uid(),
        updated_at = now()
    where lower(coalesce(u.email, '')) = v_email;

    if not found then
        raise exception 'Permissão não encontrada para o e-mail %. Salve a permissão antes de vincular o login.', v_email;
    end if;

    return query
    select
        u.id,
        u.user_id,
        u.email,
        u.nome,
        u.funcao,
        u.empresa,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where lower(coalesce(u.email, '')) = v_email
    limit 1;
end;
$$;

grant execute on function public.admin_marcar_login_app_criado_sistema(text, uuid, boolean) to authenticated, service_role;

create function public.registrar_login_usuario_sistema()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_uid uuid := auth.uid();
    v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
    if v_uid is null and coalesce(v_email, '') = '' then
        raise exception 'Usuário não autenticado.';
    end if;

    update public.usuarios_permissoes_sistema u
    set
        user_id = coalesce(u.user_id, v_uid),
        ultimo_login_em = now(),
        updated_at = now()
    where
        (v_uid is not null and u.user_id = v_uid)
        or (coalesce(v_email, '') <> '' and lower(coalesce(u.email, '')) = v_email);

    return query
    select * from public.usuario_permissao_sistema_atual();
end;
$$;

grant execute on function public.registrar_login_usuario_sistema() to authenticated, service_role;

create function public.finalizar_troca_senha_temporaria_sistema()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_uid uuid := auth.uid();
    v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
    if v_uid is null and coalesce(v_email, '') = '' then
        raise exception 'Usuário não autenticado.';
    end if;

    update public.usuarios_permissoes_sistema u
    set
        user_id = coalesce(u.user_id, v_uid),
        precisa_trocar_senha = false,
        ultimo_login_em = now(),
        atualizado_por = v_uid,
        updated_at = now()
    where
        (v_uid is not null and u.user_id = v_uid)
        or (coalesce(v_email, '') <> '' and lower(coalesce(u.email, '')) = v_email);

    return query
    select * from public.usuario_permissao_sistema_atual();
end;
$$;

grant execute on function public.finalizar_troca_senha_temporaria_sistema() to authenticated, service_role;

commit;
