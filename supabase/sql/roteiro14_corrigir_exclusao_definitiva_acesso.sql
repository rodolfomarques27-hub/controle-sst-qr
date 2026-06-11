-- Roteiro 14 - Pacote 9H
-- Correção definitiva da exclusão de acesso do app.
-- O botão "Excluir acesso" deve remover o registro da tabela usuarios_permissoes_sistema,
-- e não apenas marcar como excluido = true.

begin;

-- Mantém as colunas criadas anteriormente para compatibilidade/histórico de scripts,
-- mas a exclusão definitiva abaixo não depende delas.
alter table public.usuarios_permissoes_sistema
add column if not exists empresa text;

alter table public.usuarios_permissoes_sistema
add column if not exists excluido boolean not null default false;

alter table public.usuarios_permissoes_sistema
add column if not exists excluido_em timestamptz;

alter table public.usuarios_permissoes_sistema
add column if not exists excluido_por uuid;

-- Remove assinaturas antigas para evitar conflito no PostgREST/RPC.
drop function if exists public.admin_excluir_usuario_permissao_sistema(uuid, text);
drop function if exists public.admin_excluir_usuario_permissao_sistema(text, uuid);
drop function if exists public.admin_excluir_usuario_permissao_sistema(text, uuid, text);

create or replace function public.admin_excluir_usuario_permissao_sistema(
    p_email text default null,
    p_id uuid default null,
    p_observacao text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_admin public.usuarios_permissoes_sistema;
    v_alvo public.usuarios_permissoes_sistema;
    v_email text := lower(trim(coalesce(p_email, '')));
    v_admin_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
    v_pode_gerenciar boolean := false;
    v_total_excluido integer := 0;
begin
    if auth.uid() is null then
        raise exception 'Usuário autenticado não identificado.';
    end if;

    select * into v_admin
    from public.usuarios_permissoes_sistema u
    where u.user_id = auth.uid()
       or lower(coalesce(u.email, '')) = v_admin_email
    order by
        case when u.user_id = auth.uid() then 0 else 1 end,
        u.updated_at desc nulls last,
        u.created_at desc nulls last
    limit 1;

    if v_admin.id is null then
        raise exception 'Usuário atual não possui permissão administrativa cadastrada.';
    end if;

    v_pode_gerenciar :=
        coalesce(v_admin.ativo, false)
        and not coalesce(v_admin.bloqueado, true)
        and (
            lower(coalesce(v_admin.perfil, '')) = 'administrador'
            or coalesce(v_admin.acesso_global, false)
            or coalesce(v_admin.pode_gerenciar_permissoes, false)
            or lower(coalesce(v_admin.permissoes ->> 'acessoTotal', 'false')) = 'true'
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
    order by
        case when p_id is not null and u.id = p_id then 0 else 1 end,
        u.updated_at desc nulls last,
        u.created_at desc nulls last
    limit 1;

    if v_alvo.id is null then
        raise exception 'Acesso do usuário não encontrado para exclusão.';
    end if;

    if v_alvo.user_id = auth.uid()
       or lower(coalesce(v_alvo.email, '')) = v_admin_email then
        raise exception 'Você não pode excluir o próprio acesso ao app.';
    end if;

    -- Exclusão definitiva da tabela de permissões.
    -- Remove o registro selecionado e também duplicidades do mesmo e-mail, caso existam.
    delete from public.usuarios_permissoes_sistema u
    where u.id = v_alvo.id
       or lower(coalesce(u.email, '')) = lower(coalesce(v_alvo.email, ''));

    get diagnostics v_total_excluido = row_count;

    return jsonb_build_object(
        'ok', true,
        'id', v_alvo.id,
        'email', v_alvo.email,
        'total_excluido', v_total_excluido,
        'mensagem', 'Acesso excluído definitivamente da tabela de permissões. Colaboradores, empresas, documentos e Auth não foram apagados.'
    );
end;
$$;

grant execute on function public.admin_excluir_usuario_permissao_sistema(text, uuid, text) to authenticated, service_role;

-- Limpa registros que ficaram apenas ocultos em etapas anteriores.
do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'usuarios_permissoes_sistema'
          and column_name = 'excluido'
    ) then
        delete from public.usuarios_permissoes_sistema
        where coalesce(excluido, false) is true;
    end if;
end $$;

notify pgrst, 'reload schema';

commit;
