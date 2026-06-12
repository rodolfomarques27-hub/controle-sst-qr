-- Roteiro 14 - Pacote 9AF
-- Aplica o perfil editável salvo em perfis_permissoes_sistema aos usuários existentes do mesmo perfil.

create or replace function public.admin_aplicar_perfil_permissao_usuarios_sistema(
    p_chave text,
    p_confirmacao text default ''
)
returns table (
    perfil text,
    usuarios_atualizados integer,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    v_admin record;
    v_pode_gerenciar boolean := false;
    v_chave text := lower(trim(coalesce(p_chave, '')));
    v_confirmacao text := upper(trim(coalesce(p_confirmacao, '')));
    v_confirmacao_nome text;
    v_confirmacao_chave text;
    v_perfil record;
    v_permissoes jsonb;
    v_total integer := 0;
begin
    if v_chave in ('admin') then
        v_chave := 'administrador';
    elsif v_chave in ('técnico sst', 'tecnico sst', 'técnico de segurança', 'tecnico de seguranca', 'tecnico_de_seguranca') then
        v_chave := 'tecnico_sst';
    end if;

    if v_chave not in ('administrador', 'tecnico_sst', 'auditor', 'gestor', 'consulta', 'bloqueado') then
        raise exception 'Perfil inválido para aplicação em massa.';
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
        raise exception 'Sem permissão para aplicar perfil aos usuários existentes.';
    end if;

    select * into v_perfil
    from public.perfis_permissoes_sistema p
    where p.chave = v_chave
      and coalesce(p.ativo, true) = true
    limit 1;

    if v_perfil.id is null then
        raise exception 'Perfil editável não encontrado para aplicação.';
    end if;

    v_confirmacao_nome := upper('APLICAR ' || coalesce(v_perfil.nome, v_chave));
    v_confirmacao_chave := upper('APLICAR ' || v_chave);

    if v_confirmacao not in (v_confirmacao_nome, v_confirmacao_chave) then
        raise exception 'Confirmação inválida. Digite % para aplicar este perfil.', v_confirmacao_nome;
    end if;

    v_permissoes := coalesce(v_perfil.permissoes_json, '{}'::jsonb);

    if v_permissoes = '{}'::jsonb then
        v_permissoes := public.montar_permissoes_padrao_usuario_sistema(v_chave);
    end if;

    update public.usuarios_permissoes_sistema u
    set
        permissoes = v_permissoes,
        permissoes_padrao = jsonb_build_object(
            'origem', 'perfil_editavel',
            'perfil', v_chave,
            'perfil_nome', coalesce(v_perfil.nome, v_chave),
            'aplicado_em', now(),
            'aplicado_por', auth.uid()
        ),
        acesso_global = case
            when v_chave = 'administrador' then true
            else false
        end,
        ativo = case
            when v_chave = 'bloqueado' then false
            else coalesce(u.ativo, true)
        end,
        bloqueado = case
            when v_chave = 'bloqueado' then true
            else coalesce(u.bloqueado, false)
        end,
        atualizado_por = auth.uid(),
        updated_at = now()
    where lower(coalesce(u.perfil, '')) = v_chave
      and coalesce(u.excluido, false) = false;

    get diagnostics v_total = row_count;

    return query
    select
        v_chave::text as perfil,
        v_total::integer as usuarios_atualizados,
        now()::timestamptz as updated_at;
end;
$$;

grant execute on function public.admin_aplicar_perfil_permissao_usuarios_sistema(text, text)
to authenticated, service_role;

notify pgrst, 'reload schema';
