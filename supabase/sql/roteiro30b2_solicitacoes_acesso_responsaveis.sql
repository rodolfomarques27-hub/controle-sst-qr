-- Roteiro 30B.2
-- Auditoria de permissoes: registrar quem aprovou, recusou ou concluiu solicitacoes de acesso.
-- ATENCAO: arquivo preparado para revisao. NAO APLICAR NO SUPABASE AINDA.
-- Antes de executar futuramente, manter backup dos dados, estrutura e funcoes atuais.

begin;

alter table public.solicitacoes_acesso_sistema
    add column if not exists aprovado_por_user_id uuid references auth.users(id) on delete set null,
    add column if not exists aprovado_por_email text,
    add column if not exists aprovado_por_nome text,
    add column if not exists aprovado_em timestamptz,
    add column if not exists recusado_por_user_id uuid references auth.users(id) on delete set null,
    add column if not exists recusado_por_email text,
    add column if not exists recusado_por_nome text,
    add column if not exists recusado_em timestamptz,
    add column if not exists concluido_por_user_id uuid references auth.users(id) on delete set null,
    add column if not exists concluido_por_email text,
    add column if not exists concluido_por_nome text,
    add column if not exists concluido_em timestamptz;

create index if not exists idx_solicitacoes_acesso_sistema_aprovado_em
    on public.solicitacoes_acesso_sistema (aprovado_em desc)
    where aprovado_em is not null;

create index if not exists idx_solicitacoes_acesso_sistema_recusado_em
    on public.solicitacoes_acesso_sistema (recusado_em desc)
    where recusado_em is not null;

create index if not exists idx_solicitacoes_acesso_sistema_concluido_em
    on public.solicitacoes_acesso_sistema (concluido_em desc)
    where concluido_em is not null;

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
    v_agora timestamptz := now();
    v_admin_user_id uuid := auth.uid();
    v_admin_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
    v_admin_nome text := nullif(trim(coalesce(
        auth.jwt() -> 'user_metadata' ->> 'nome',
        auth.jwt() -> 'user_metadata' ->> 'name',
        auth.jwt() -> 'user_metadata' ->> 'full_name',
        auth.jwt() ->> 'email',
        ''
    )), '');
begin
    if p_solicitacao_id is null then
        raise exception 'Solicitação de acesso não informada.';
    end if;

    if v_status not in ('aprovada', 'recusada', 'concluida') then
        raise exception 'Status inválido. Use aprovada, recusada ou concluida.';
    end if;

    if v_admin_user_id is null then
        raise exception 'Usuário não autenticado para responder solicitações de acesso.' using errcode = '42501';
    end if;

    if not exists (
        select 1
        from public.usuarios_permissoes_sistema ups
        where
            (ups.user_id = v_admin_user_id or lower(ups.email) = v_admin_email)
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
           aprovado_por_user_id = case when v_status = 'aprovada' then v_admin_user_id else aprovado_por_user_id end,
           aprovado_por_email = case when v_status = 'aprovada' then nullif(v_admin_email, '') else aprovado_por_email end,
           aprovado_por_nome = case when v_status = 'aprovada' then v_admin_nome else aprovado_por_nome end,
           aprovado_em = case when v_status = 'aprovada' then v_agora else aprovado_em end,
           recusado_por_user_id = case when v_status = 'recusada' then v_admin_user_id else recusado_por_user_id end,
           recusado_por_email = case when v_status = 'recusada' then nullif(v_admin_email, '') else recusado_por_email end,
           recusado_por_nome = case when v_status = 'recusada' then v_admin_nome else recusado_por_nome end,
           recusado_em = case when v_status = 'recusada' then v_agora else recusado_em end,
           concluido_por_user_id = case when v_status = 'concluida' then v_admin_user_id else concluido_por_user_id end,
           concluido_por_email = case when v_status = 'concluida' then nullif(v_admin_email, '') else concluido_por_email end,
           concluido_por_nome = case when v_status = 'concluida' then v_admin_nome else concluido_por_nome end,
           concluido_em = case when v_status = 'concluida' then v_agora else concluido_em end,
           atualizado_em = v_agora
     where id = p_solicitacao_id
     returning * into v_resultado;

    if v_resultado.id is null then
        raise exception 'Solicitação de acesso não encontrada.';
    end if;

    return v_resultado;
end;
$$;

grant execute on function public.admin_responder_solicitacao_acesso_sistema(uuid, text, text) to authenticated;

select pg_notify('pgrst', 'reload schema');

commit;
