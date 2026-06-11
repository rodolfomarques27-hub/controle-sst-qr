-- Roteiro 14 — Pacote 9D
-- Adiciona empresa e exclusão lógica ao controle de acessos do app.

alter table public.usuarios_permissoes_sistema
add column if not exists empresa text not null default '';

alter table public.usuarios_permissoes_sistema
add column if not exists excluido boolean not null default false;

alter table public.usuarios_permissoes_sistema
add column if not exists excluido_em timestamptz;

alter table public.usuarios_permissoes_sistema
add column if not exists excluido_por uuid;

create index if not exists idx_usuarios_permissoes_sistema_empresa
on public.usuarios_permissoes_sistema (lower(empresa));

create index if not exists idx_usuarios_permissoes_sistema_excluido
on public.usuarios_permissoes_sistema (excluido);

create or replace function public.admin_salvar_usuario_permissao_sistema(
    p_email text,
    p_nome text,
    p_funcao text,
    p_empresa text,
    p_perfil text,
    p_ativo boolean,
    p_bloqueado boolean,
    p_acesso_global boolean,
    p_observacao text
)
returns setof public.usuarios_permissoes_sistema
language plpgsql
security definer
set search_path = public
as $$
declare
    v_salvo public.usuarios_permissoes_sistema;
begin
    select * into v_salvo
    from public.admin_salvar_usuario_permissao_sistema(
        p_email := p_email,
        p_nome := p_nome,
        p_funcao := p_funcao,
        p_perfil := p_perfil,
        p_ativo := p_ativo,
        p_bloqueado := p_bloqueado,
        p_acesso_global := p_acesso_global,
        p_observacao := p_observacao
    )
    limit 1;

    if v_salvo.id is null then
        raise exception 'Não foi possível salvar a permissão base do usuário.';
    end if;

    update public.usuarios_permissoes_sistema ups
       set empresa = trim(coalesce(p_empresa, '')),
           excluido = false,
           excluido_em = null,
           excluido_por = null,
           atualizado_por = auth.uid(),
           updated_at = now()
     where ups.id = v_salvo.id
     returning ups.* into v_salvo;

    return next v_salvo;
end;
$$;

create or replace function public.admin_excluir_usuario_permissao_sistema(
    p_id uuid default null,
    p_email text default '',
    p_observacao text default ''
)
returns setof public.usuarios_permissoes_sistema
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
    v_email_atual text;
    v_tem_acesso boolean;
    v_alvo public.usuarios_permissoes_sistema;
    v_observacao text;
begin
    v_email := lower(trim(coalesce(p_email, '')));
    v_email_atual := lower(coalesce(auth.jwt() ->> 'email', ''));

    select exists (
        select 1
        from public.usuarios_permissoes_sistema ups
        where (ups.user_id = auth.uid() or lower(ups.email) = v_email_atual)
          and ups.ativo is true
          and ups.bloqueado is not true
          and ups.excluido is not true
          and (
              ups.perfil = 'administrador'
              or ups.acesso_global is true
              or coalesce((ups.permissoes ->> 'acessoTotal')::boolean, false) is true
              or coalesce((ups.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes')::boolean, false) is true
              or coalesce((ups.permissoes -> 'modulos' -> 'acessos_app' ->> 'gerenciar_permissoes')::boolean, false) is true
          )
    ) into v_tem_acesso;

    if not v_tem_acesso then
        raise exception 'Usuário sem permissão para excluir acesso do app.';
    end if;

    select * into v_alvo
    from public.usuarios_permissoes_sistema ups
    where (p_id is not null and ups.id = p_id)
       or (v_email <> '' and lower(ups.email) = v_email)
    order by ups.updated_at desc nulls last, ups.created_at desc nulls last
    limit 1;

    if v_alvo.id is null then
        raise exception 'Acesso não encontrado para exclusão.';
    end if;

    if (v_alvo.user_id is not null and v_alvo.user_id = auth.uid()) or lower(v_alvo.email) = v_email_atual then
        raise exception 'Você não pode excluir o próprio acesso.';
    end if;

    v_observacao := trim(concat_ws(
        ' | ',
        nullif(v_alvo.observacao, ''),
        nullif(p_observacao, ''),
        'Acesso excluído logicamente em ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS')
    ));

    update public.usuarios_permissoes_sistema ups
       set ativo = false,
           bloqueado = true,
           acesso_global = false,
           excluido = true,
           excluido_em = now(),
           excluido_por = auth.uid(),
           atualizado_por = auth.uid(),
           observacao = v_observacao,
           updated_at = now()
     where ups.id = v_alvo.id
     returning ups.* into v_alvo;

    return next v_alvo;
end;
$$;

grant execute on function public.admin_salvar_usuario_permissao_sistema(text, text, text, text, text, boolean, boolean, boolean, text) to authenticated, service_role;
grant execute on function public.admin_excluir_usuario_permissao_sistema(uuid, text, text) to authenticated, service_role;
