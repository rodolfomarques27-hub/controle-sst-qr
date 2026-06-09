-- Roteiro 11 — Etapa 2.7
-- RPCs seguras para leitura das permissões gerais do sistema.
--
-- Objetivo:
-- 1. Permitir que o usuário autenticado consulte a própria permissão geral.
-- 2. Criar função auxiliar para checar permissão por módulo e ação.
-- 3. Não aplicar bloqueio real no front-end nesta etapa.
--
-- Observação:
-- A tabela public.usuarios_permissoes_sistema permanece com RLS habilitado.
-- A leitura pelo app deve ser feita por RPC, não por select direto na tabela.

create or replace function public.usuario_permissao_sistema_atual()
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    empresa_id uuid,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    created_at timestamptz,
    updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
    select
        ups.id,
        ups.user_id,
        ups.email,
        ups.nome,
        ups.funcao,
        ups.empresa_id,
        ups.perfil,
        ups.ativo,
        ups.bloqueado,
        ups.acesso_global,
        ups.permissoes,
        ups.observacao,
        ups.created_at,
        ups.updated_at
    from public.usuarios_permissoes_sistema ups
    where
        ups.ativo = true
        and ups.bloqueado = false
        and (
            ups.user_id = auth.uid()
            or lower(ups.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    order by ups.acesso_global desc, ups.created_at asc
    limit 1;
$$;

create or replace function public.usuario_tem_permissao_sistema(
    p_modulo text,
    p_acao text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_permissao record;
    v_valor text;
begin
    select *
    into v_permissao
    from public.usuario_permissao_sistema_atual()
    limit 1;

    if v_permissao.id is null then
        return false;
    end if;

    if coalesce(v_permissao.acesso_global, false) = true then
        return true;
    end if;

    if coalesce((v_permissao.permissoes ->> 'acessoTotal')::boolean, false) = true then
        return true;
    end if;

    v_valor := v_permissao.permissoes -> 'modulos' -> p_modulo ->> p_acao;

    return coalesce(v_valor::boolean, false);
exception
    when others then
        return false;
end;
$$;

revoke all on function public.usuario_permissao_sistema_atual() from public;
revoke all on function public.usuario_tem_permissao_sistema(text, text) from public;

grant execute on function public.usuario_permissao_sistema_atual() to authenticated;
grant execute on function public.usuario_tem_permissao_sistema(text, text) to authenticated;

comment on function public.usuario_permissao_sistema_atual() is
'RPC para o usuário autenticado consultar a própria permissão geral do sistema.';

comment on function public.usuario_tem_permissao_sistema(text, text) is
'RPC auxiliar para verificar permissão planejada por módulo e ação. Ainda não aplica bloqueio real no front-end.';
