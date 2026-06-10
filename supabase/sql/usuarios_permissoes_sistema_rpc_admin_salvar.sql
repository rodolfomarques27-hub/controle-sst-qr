-- Roteiro 11 — Etapa 2.12
-- RPC administrativa para cadastrar ou atualizar usuário/permissão geral do sistema.
--
-- Importante:
-- 1. Esta RPC NÃO aplica bloqueio real no front-end.
-- 2. Ela apenas prepara o cadastro seguro de permissões gerais.
-- 3. Somente usuário autenticado com perfil administrador ou acesso_global pode executar cadastro/atualização.
-- 4. A tabela auditoria_usuarios_autorizados continua separada para Auditoria do Sistema.

create or replace function public.admin_salvar_usuario_permissao_sistema(
    p_email text,
    p_nome text default '',
    p_funcao text default '',
    p_perfil text default 'consulta',
    p_ativo boolean default true,
    p_bloqueado boolean default false,
    p_acesso_global boolean default false,
    p_observacao text default null
)
returns table (
    id uuid,
    user_id uuid,
    email text,
    nome text,
    funcao text,
    perfil text,
    ativo boolean,
    bloqueado boolean,
    acesso_global boolean,
    permissoes jsonb,
    observacao text,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    usuario_admin record;
    email_normalizado text;
    perfil_normalizado text;
    usuario_auth_id uuid;
    usuario_existente_id uuid;
    permissoes_calculadas jsonb;
    email_operador text;
begin
    email_normalizado := lower(trim(coalesce(p_email, '')));
    email_operador := lower(coalesce(auth.jwt() ->> 'email', ''));

    if email_normalizado = '' or position('@' in email_normalizado) = 0 then
        raise exception 'E-mail obrigatório ou inválido para cadastro de permissão.';
    end if;

    select
        ups.id,
        ups.email,
        ups.perfil,
        ups.ativo,
        ups.bloqueado,
        ups.acesso_global
    into usuario_admin
    from public.usuarios_permissoes_sistema ups
    where ups.ativo = true
      and ups.bloqueado = false
      and (
          ups.user_id = auth.uid()
          or lower(ups.email) = email_operador
      )
    limit 1;

    if usuario_admin.id is null then
        raise exception 'Acesso negado. Usuário sem permissão administrativa.';
    end if;

    if usuario_admin.acesso_global is not true and usuario_admin.perfil <> 'administrador' then
        raise exception 'Acesso negado. Somente administrador pode cadastrar permissões.';
    end if;

    perfil_normalizado := case lower(trim(coalesce(p_perfil, 'consulta')))
        when 'administrador' then 'administrador'
        when 'admin' then 'administrador'
        when 'tecnico_sst' then 'tecnico_sst'
        when 'técnico sst' then 'tecnico_sst'
        when 'tecnico sst' then 'tecnico_sst'
        when 'técnico de segurança' then 'tecnico_sst'
        when 'tecnico de seguranca' then 'tecnico_sst'
        when 'auditor' then 'auditor'
        when 'gestor' then 'gestor'
        when 'consulta' then 'consulta'
        when 'bloqueado' then 'bloqueado'
        else 'consulta'
    end;

    if perfil_normalizado = 'bloqueado' then
        p_ativo := false;
        p_bloqueado := true;
        p_acesso_global := false;
    end if;

    if perfil_normalizado <> 'administrador' then
        p_acesso_global := false;
    end if;

    select au.id
    into usuario_auth_id
    from auth.users au
    where lower(au.email) = email_normalizado
    limit 1;

    permissoes_calculadas := case perfil_normalizado
        when 'administrador' then
            jsonb_build_object(
                'acessoTotal', true,
                'modulos', jsonb_build_object(
                    'dashboard_sst', jsonb_build_object('visualizar', true),
                    'empresas', jsonb_build_object('visualizar', true, 'cadastrar', true, 'editar', true, 'excluir', true),
                    'colaboradores', jsonb_build_object('visualizar', true, 'cadastrar', true, 'editar', true, 'excluir', true),
                    'treinamentos', jsonb_build_object('visualizar', true, 'cadastrar', true, 'editar', true, 'excluir', true, 'upload', true),
                    'qr_code', jsonb_build_object('visualizar', true, 'exportar', true),
                    'dashboard_auditoria', jsonb_build_object('visualizar', true),
                    'nova_auditoria', jsonb_build_object('visualizar', true, 'cadastrar', true, 'upload', true),
                    'auditoria_sistema', jsonb_build_object('visualizar', true, 'exportar', true),
                    'configuracoes', jsonb_build_object('visualizar', true, 'editar', true),
                    'storage', jsonb_build_object('visualizar', true, 'limpar_arquivos', true),
                    'relatorios', jsonb_build_object('visualizar', true, 'exportar', true)
                ),
                'acoesCriticas', jsonb_build_object(
                    'excluir', true,
                    'limpar_arquivos', true,
                    'gerenciar_permissoes', true,
                    'configuracoes', true,
                    'auditoria_sistema', true
                )
            )
        when 'tecnico_sst' then
            jsonb_build_object(
                'acessoTotal', false,
                'modulos', jsonb_build_object(
                    'dashboard_sst', jsonb_build_object('visualizar', true),
                    'empresas', jsonb_build_object('visualizar', true, 'cadastrar', true, 'editar', true),
                    'colaboradores', jsonb_build_object('visualizar', true, 'cadastrar', true, 'editar', true),
                    'treinamentos', jsonb_build_object('visualizar', true, 'cadastrar', true, 'editar', true, 'upload', true),
                    'qr_code', jsonb_build_object('visualizar', true, 'exportar', true),
                    'dashboard_auditoria', jsonb_build_object('visualizar', true),
                    'nova_auditoria', jsonb_build_object('visualizar', true, 'cadastrar', true, 'upload', true),
                    'relatorios', jsonb_build_object('visualizar', true, 'exportar', true)
                ),
                'acoesCriticas', jsonb_build_object(
                    'excluir', false,
                    'limpar_arquivos', false,
                    'gerenciar_permissoes', false,
                    'configuracoes', false,
                    'auditoria_sistema', false
                )
            )
        when 'auditor' then
            jsonb_build_object(
                'acessoTotal', false,
                'modulos', jsonb_build_object(
                    'dashboard_auditoria', jsonb_build_object('visualizar', true),
                    'nova_auditoria', jsonb_build_object('visualizar', true, 'cadastrar', true, 'upload', true),
                    'qr_code', jsonb_build_object('visualizar', true),
                    'relatorios', jsonb_build_object('visualizar', true, 'exportar', true)
                ),
                'acoesCriticas', jsonb_build_object(
                    'excluir', false,
                    'limpar_arquivos', false,
                    'gerenciar_permissoes', false,
                    'configuracoes', false,
                    'auditoria_sistema', false
                )
            )
        when 'gestor' then
            jsonb_build_object(
                'acessoTotal', false,
                'modulos', jsonb_build_object(
                    'dashboard_sst', jsonb_build_object('visualizar', true),
                    'dashboard_auditoria', jsonb_build_object('visualizar', true),
                    'empresas', jsonb_build_object('visualizar', true),
                    'colaboradores', jsonb_build_object('visualizar', true),
                    'treinamentos', jsonb_build_object('visualizar', true),
                    'qr_code', jsonb_build_object('visualizar', true),
                    'relatorios', jsonb_build_object('visualizar', true, 'exportar', true)
                ),
                'acoesCriticas', jsonb_build_object(
                    'excluir', false,
                    'limpar_arquivos', false,
                    'gerenciar_permissoes', false,
                    'configuracoes', false,
                    'auditoria_sistema', false
                )
            )
        when 'consulta' then
            jsonb_build_object(
                'acessoTotal', false,
                'modulos', jsonb_build_object(
                    'dashboard_sst', jsonb_build_object('visualizar', true),
                    'empresas', jsonb_build_object('visualizar', true),
                    'colaboradores', jsonb_build_object('visualizar', true),
                    'treinamentos', jsonb_build_object('visualizar', true),
                    'qr_code', jsonb_build_object('visualizar', true),
                    'relatorios', jsonb_build_object('visualizar', true)
                ),
                'acoesCriticas', jsonb_build_object(
                    'excluir', false,
                    'limpar_arquivos', false,
                    'gerenciar_permissoes', false,
                    'configuracoes', false,
                    'auditoria_sistema', false
                )
            )
        else
            jsonb_build_object(
                'acessoTotal', false,
                'modulos', '{}'::jsonb,
                'acoesCriticas', jsonb_build_object(
                    'excluir', false,
                    'limpar_arquivos', false,
                    'gerenciar_permissoes', false,
                    'configuracoes', false,
                    'auditoria_sistema', false
                )
            )
    end;

    select ups.id
    into usuario_existente_id
    from public.usuarios_permissoes_sistema ups
    where lower(ups.email) = email_normalizado
    limit 1;

    if usuario_existente_id is null then
        insert into public.usuarios_permissoes_sistema (
            user_id,
            email,
            nome,
            funcao,
            perfil,
            ativo,
            bloqueado,
            acesso_global,
            permissoes,
            observacao,
            criado_por,
            atualizado_por,
            criado_por_email,
            atualizado_por_email
        )
        values (
            usuario_auth_id,
            email_normalizado,
            nullif(trim(coalesce(p_nome, '')), ''),
            nullif(trim(coalesce(p_funcao, '')), ''),
            perfil_normalizado,
            coalesce(p_ativo, true),
            coalesce(p_bloqueado, false),
            coalesce(p_acesso_global, false),
            permissoes_calculadas,
            nullif(trim(coalesce(p_observacao, '')), ''),
            auth.uid(),
            auth.uid(),
            email_operador,
            email_operador
        )
        returning usuarios_permissoes_sistema.id into usuario_existente_id;
    else
        update public.usuarios_permissoes_sistema ups
        set
            user_id = coalesce(usuario_auth_id, ups.user_id),
            nome = nullif(trim(coalesce(p_nome, '')), ''),
            funcao = nullif(trim(coalesce(p_funcao, '')), ''),
            perfil = perfil_normalizado,
            ativo = coalesce(p_ativo, true),
            bloqueado = coalesce(p_bloqueado, false),
            acesso_global = coalesce(p_acesso_global, false),
            permissoes = permissoes_calculadas,
            observacao = nullif(trim(coalesce(p_observacao, '')), ''),
            atualizado_por = auth.uid(),
            atualizado_por_email = email_operador,
            updated_at = now()
        where ups.id = usuario_existente_id;
    end if;

    return query
    select
        ups.id,
        ups.user_id,
        ups.email,
        ups.nome,
        ups.funcao,
        ups.perfil,
        ups.ativo,
        ups.bloqueado,
        ups.acesso_global,
        ups.permissoes,
        ups.observacao,
        ups.created_at,
        ups.updated_at
    from public.usuarios_permissoes_sistema ups
    where ups.id = usuario_existente_id;
end;
$$;

grant execute on function public.admin_salvar_usuario_permissao_sistema(
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    boolean,
    text
) to authenticated;

comment on function public.admin_salvar_usuario_permissao_sistema(
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    boolean,
    text
) is
'Cadastra ou atualiza permissões gerais do sistema. Uso previsto no painel Configurações > Usuários e Permissões.';
