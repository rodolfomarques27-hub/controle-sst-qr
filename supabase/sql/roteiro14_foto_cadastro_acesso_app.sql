-- Roteiro 14 - Pacote 9Y
-- Compactar cadastro de acesso e adicionar foto do usuário.
-- Execute este arquivo no SQL Editor do Supabase antes de testar o upload/salvamento de foto.

begin;

alter table public.usuarios_permissoes_sistema
    add column if not exists empresa text;

alter table public.usuarios_permissoes_sistema
    add column if not exists foto_url text;

alter table public.usuarios_permissoes_sistema
    add column if not exists atualizado_por uuid;

alter table public.usuarios_permissoes_sistema
    add column if not exists criado_por uuid;

drop function if exists public.admin_listar_usuarios_permissoes_sistema();

create function public.admin_listar_usuarios_permissoes_sistema()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    foto_url text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    criado_por uuid,
    atualizado_por uuid,
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
        u.foto_url,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.criado_por,
        u.atualizado_por,
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

do $$
declare
    f record;
begin
    for f in
        select p.oid::regprocedure as assinatura
          from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.proname = 'admin_salvar_usuario_permissao_sistema'
    loop
        execute 'drop function if exists ' || f.assinatura || ' cascade';
    end loop;
end $$;

create function public.admin_salvar_usuario_permissao_sistema(
    p_email text,
    p_nome text default '',
    p_funcao text default '',
    p_perfil text default 'consulta',
    p_ativo boolean default true,
    p_bloqueado boolean default false,
    p_acesso_global boolean default false,
    p_observacao text default '',
    p_empresa text default '',
    p_foto_url text default ''
)
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa text,
    foto_url text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    precisa_trocar_senha boolean,
    ultimo_login_em timestamptz,
    login_criado_em timestamptz,
    criado_por uuid,
    atualizado_por uuid,
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
    v_permissoes jsonb;
begin
    if v_email = '' or position('@' in v_email) = 0 then
        raise exception 'E-mail inválido para salvar permissão.';
    end if;

    if v_perfil in ('admin') then
        v_perfil := 'administrador';
    elsif v_perfil in ('tecnico sst', 'técnico sst', 'tecnico_de_seguranca', 'tecnico seguranca') then
        v_perfil := 'tecnico_sst';
    elsif v_perfil not in ('administrador', 'tecnico_sst', 'auditor', 'gestor', 'consulta', 'bloqueado') then
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

    if lower(coalesce(v_admin.email, '')) = v_email
       and (v_bloqueado is true or v_ativo is not true or v_perfil <> 'administrador') then
        raise exception 'Você não pode remover o próprio acesso administrativo.';
    end if;

    v_permissoes := public.montar_permissoes_padrao_usuario_sistema(v_perfil);

    update public.usuarios_permissoes_sistema u
    set
        nome = trim(coalesce(p_nome, '')),
        funcao = trim(coalesce(p_funcao, '')),
        empresa = trim(coalesce(p_empresa, '')),
        foto_url = nullif(trim(coalesce(p_foto_url, '')), ''),
        perfil = v_perfil,
        ativo = v_ativo,
        bloqueado = v_bloqueado,
        acesso_global = v_acesso_global,
        permissoes = v_permissoes,
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
            foto_url,
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
            nullif(trim(coalesce(p_foto_url, '')), ''),
            v_perfil,
            v_ativo,
            v_bloqueado,
            v_acesso_global,
            v_permissoes,
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
        u.foto_url,
        u.perfil,
        coalesce(u.ativo, false),
        coalesce(u.bloqueado, true),
        coalesce(u.acesso_global, false),
        coalesce(u.permissoes, '{}'::jsonb),
        u.observacao,
        coalesce(u.precisa_trocar_senha, false),
        u.ultimo_login_em,
        u.login_criado_em,
        u.criado_por,
        u.atualizado_por,
        u.created_at,
        u.updated_at
    from public.usuarios_permissoes_sistema u
    where lower(coalesce(u.email, '')) = v_email
    limit 1;
end;
$$;

grant execute on function public.admin_salvar_usuario_permissao_sistema(text, text, text, text, boolean, boolean, boolean, text, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
