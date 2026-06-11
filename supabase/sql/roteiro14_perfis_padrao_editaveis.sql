-- Roteiro 14 - Pacote 9P
-- Base de perfis padrão editáveis para Acessos do App.
-- Execute no SQL Editor do Supabase.

begin;

create extension if not exists pgcrypto;

create table if not exists public.perfis_permissoes_sistema (
    id uuid primary key default gen_random_uuid(),
    chave text not null unique,
    nome text not null,
    descricao text not null default '',
    nivel text not null default '',
    resumo text not null default '',
    modulos_liberados jsonb not null default '[]'::jsonb,
    acoes_liberadas jsonb not null default '[]'::jsonb,
    acoes_restritas jsonb not null default '[]'::jsonb,
    permissoes_json jsonb not null default '{}'::jsonb,
    observacao text not null default '',
    ativo boolean not null default true,
    editavel boolean not null default true,
    padrao_sistema jsonb not null default '{}'::jsonb,
    atualizado_por uuid,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.perfis_permissoes_sistema is
'Perfis padrão editáveis usados para definir permissões do app por perfil operacional.';

comment on column public.perfis_permissoes_sistema.permissoes_json is
'Permissão operacional no padrão usado pela aplicação: acessoTotal, modulos e acoesCriticas.';

create index if not exists idx_perfis_permissoes_sistema_chave
    on public.perfis_permissoes_sistema (chave);

create index if not exists idx_perfis_permissoes_sistema_ativo
    on public.perfis_permissoes_sistema (ativo);

alter table public.perfis_permissoes_sistema enable row level security;

insert into public.perfis_permissoes_sistema (
    chave,
    nome,
    descricao,
    nivel,
    resumo,
    modulos_liberados,
    acoes_liberadas,
    acoes_restritas,
    permissoes_json,
    observacao,
    ativo,
    editavel,
    padrao_sistema
)
values
(
        'administrador',
        'Administrador',
        'Acesso amplo ao sistema, configurações, auditoria, limpeza de arquivos e gestão de permissões.',
        'Acesso total planejado',
        'Perfil para gestão completa do sistema, acessos do app, permissões, configurações, Auditoria do Sistema e limpeza de Storage.',
        '["Dashboard SST","Empresas","Colaboradores","Treinamentos","QR Code","Dashboard Auditoria","Nova Auditoria","Auditoria do Sistema","Acessos do App","Configurações","Storage","Relatórios"]'::jsonb,
        '["Visualizar","Cadastrar","Editar","Excluir","Upload","Exportar","Limpar arquivos","Gerenciar permissões"]'::jsonb,
        '[]'::jsonb,
        '{"acessoTotal":true,"modulos":{"dashboard_sst":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"empresas":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"colaboradores":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"treinamentos":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"qr_code":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"dashboard_auditoria":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"nova_auditoria":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"auditoria_sistema":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"acessos_app":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"configuracoes":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"storage":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"relatorios":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true}},"acoesCriticas":{"excluir":true,"limpar_arquivos":true,"gerenciar_permissoes":true,"configuracoes_criticas":true}}'::jsonb,
        'Deve ser usado apenas para responsáveis pela administração do sistema.',
        true,
        true,
        '{"chave":"administrador","nome":"Administrador","descricao":"Acesso amplo ao sistema, configurações, auditoria, limpeza de arquivos e gestão de permissões.","nivel":"Acesso total planejado","resumo":"Perfil para gestão completa do sistema, acessos do app, permissões, configurações, Auditoria do Sistema e limpeza de Storage.","modulos_liberados":["Dashboard SST","Empresas","Colaboradores","Treinamentos","QR Code","Dashboard Auditoria","Nova Auditoria","Auditoria do Sistema","Acessos do App","Configurações","Storage","Relatórios"],"acoes_liberadas":["Visualizar","Cadastrar","Editar","Excluir","Upload","Exportar","Limpar arquivos","Gerenciar permissões"],"acoes_restritas":[],"permissoes_json":{"acessoTotal":true,"modulos":{"dashboard_sst":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"empresas":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"colaboradores":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"treinamentos":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"qr_code":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"dashboard_auditoria":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"nova_auditoria":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"auditoria_sistema":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"acessos_app":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"configuracoes":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"storage":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true},"relatorios":{"visualizar":true,"cadastrar":true,"editar":true,"excluir":true,"upload":true,"exportar":true,"limpar_arquivos":true,"gerenciar_permissoes":true}},"acoesCriticas":{"excluir":true,"limpar_arquivos":true,"gerenciar_permissoes":true,"configuracoes_criticas":true}},"observacao":"Deve ser usado apenas para responsáveis pela administração do sistema.","ativo":true,"editavel":true}'::jsonb
    ),
(
        'tecnico_sst',
        'Técnico SST',
        'Rotina operacional de empresas, colaboradores, treinamentos, documentos e QR Code.',
        'Operação SST',
        'Perfil operacional para rotina de empresas, colaboradores, treinamentos, documentos, QR Code e auditorias de campo.',
        '["Dashboard SST","Empresas","Colaboradores","Treinamentos","QR Code","Dashboard Auditoria","Nova Auditoria","Relatórios"]'::jsonb,
        '["Visualizar","Exportar","Cadastrar","Editar","Upload"]'::jsonb,
        '["Excluir","Limpar arquivos","Gerenciar permissões","Acessos do App","Configurações críticas","Auditoria do Sistema"]'::jsonb,
        '{"acessoTotal":false,"modulos":{"dashboard_sst":{"visualizar":true,"exportar":true},"empresas":{"visualizar":true,"cadastrar":true,"editar":true,"upload":true,"exportar":true},"colaboradores":{"visualizar":true,"cadastrar":true,"editar":true,"upload":true,"exportar":true},"treinamentos":{"visualizar":true,"cadastrar":true,"editar":true,"upload":true,"exportar":true},"qr_code":{"visualizar":true,"exportar":true},"dashboard_auditoria":{"visualizar":true,"exportar":true},"nova_auditoria":{"visualizar":true,"cadastrar":true,"editar":true,"upload":true,"exportar":true},"relatorios":{"visualizar":true,"exportar":true}},"acoesCriticas":{}}'::jsonb,
        'Exclusões e limpeza de arquivos devem ficar protegidas para evitar perda de dados.',
        true,
        true,
        '{"chave":"tecnico_sst","nome":"Técnico SST","descricao":"Rotina operacional de empresas, colaboradores, treinamentos, documentos e QR Code.","nivel":"Operação SST","resumo":"Perfil operacional para rotina de empresas, colaboradores, treinamentos, documentos, QR Code e auditorias de campo.","modulos_liberados":["Dashboard SST","Empresas","Colaboradores","Treinamentos","QR Code","Dashboard Auditoria","Nova Auditoria","Relatórios"],"acoes_liberadas":["Visualizar","Exportar","Cadastrar","Editar","Upload"],"acoes_restritas":["Excluir","Limpar arquivos","Gerenciar permissões","Acessos do App","Configurações críticas","Auditoria do Sistema"],"permissoes_json":{"acessoTotal":false,"modulos":{"dashboard_sst":{"visualizar":true,"exportar":true},"empresas":{"visualizar":true,"cadastrar":true,"editar":true,"upload":true,"exportar":true},"colaboradores":{"visualizar":true,"cadastrar":true,"editar":true,"upload":true,"exportar":true},"treinamentos":{"visualizar":true,"cadastrar":true,"editar":true,"upload":true,"exportar":true},"qr_code":{"visualizar":true,"exportar":true},"dashboard_auditoria":{"visualizar":true,"exportar":true},"nova_auditoria":{"visualizar":true,"cadastrar":true,"editar":true,"upload":true,"exportar":true},"relatorios":{"visualizar":true,"exportar":true}},"acoesCriticas":{}},"observacao":"Exclusões e limpeza de arquivos devem ficar protegidas para evitar perda de dados.","ativo":true,"editavel":true}'::jsonb
    ),
(
        'auditor',
        'Auditor',
        'Foco em auditorias de campo, evidências, registros, relatórios e consulta de conformidade.',
        'Auditoria operacional',
        'Perfil focado em auditorias, evidências, consulta de conformidade e relatórios, sem administração do sistema.',
        '["Dashboard Auditoria","Nova Auditoria","QR Code","Relatórios"]'::jsonb,
        '["Visualizar","Exportar","Cadastrar","Upload"]'::jsonb,
        '["Editar cadastros base","Excluir","Limpar arquivos","Gerenciar permissões","Acessos do App","Configurações"]'::jsonb,
        '{"acessoTotal":false,"modulos":{"dashboard_auditoria":{"visualizar":true,"exportar":true},"nova_auditoria":{"visualizar":true,"cadastrar":true,"upload":true,"exportar":true},"qr_code":{"visualizar":true,"exportar":true},"relatorios":{"visualizar":true,"exportar":true}},"acoesCriticas":{}}'::jsonb,
        'Pode registrar auditorias e evidências, mas não deve alterar cadastros estruturais.',
        true,
        true,
        '{"chave":"auditor","nome":"Auditor","descricao":"Foco em auditorias de campo, evidências, registros, relatórios e consulta de conformidade.","nivel":"Auditoria operacional","resumo":"Perfil focado em auditorias, evidências, consulta de conformidade e relatórios, sem administração do sistema.","modulos_liberados":["Dashboard Auditoria","Nova Auditoria","QR Code","Relatórios"],"acoes_liberadas":["Visualizar","Exportar","Cadastrar","Upload"],"acoes_restritas":["Editar cadastros base","Excluir","Limpar arquivos","Gerenciar permissões","Acessos do App","Configurações"],"permissoes_json":{"acessoTotal":false,"modulos":{"dashboard_auditoria":{"visualizar":true,"exportar":true},"nova_auditoria":{"visualizar":true,"cadastrar":true,"upload":true,"exportar":true},"qr_code":{"visualizar":true,"exportar":true},"relatorios":{"visualizar":true,"exportar":true}},"acoesCriticas":{}},"observacao":"Pode registrar auditorias e evidências, mas não deve alterar cadastros estruturais.","ativo":true,"editavel":true}'::jsonb
    ),
(
        'gestor',
        'Gestor',
        'Acompanhamento de indicadores, relatórios, pendências e status das empresas/colaboradores.',
        'Acompanhamento',
        'Perfil para acompanhamento gerencial de indicadores, status, pendências e relatórios consolidados.',
        '["Dashboard SST","Dashboard Auditoria","Empresas","Colaboradores","Treinamentos","QR Code","Relatórios"]'::jsonb,
        '["Visualizar","Exportar"]'::jsonb,
        '["Cadastrar","Editar","Excluir","Upload","Limpar arquivos","Gerenciar permissões","Acessos do App","Configurações"]'::jsonb,
        '{"acessoTotal":false,"modulos":{"dashboard_sst":{"visualizar":true,"exportar":true},"dashboard_auditoria":{"visualizar":true,"exportar":true},"empresas":{"visualizar":true,"exportar":true},"colaboradores":{"visualizar":true,"exportar":true},"treinamentos":{"visualizar":true,"exportar":true},"qr_code":{"visualizar":true},"relatorios":{"visualizar":true,"exportar":true}},"acoesCriticas":{}}'::jsonb,
        'Indicado para consulta estratégica sem alteração de dados operacionais.',
        true,
        true,
        '{"chave":"gestor","nome":"Gestor","descricao":"Acompanhamento de indicadores, relatórios, pendências e status das empresas/colaboradores.","nivel":"Acompanhamento","resumo":"Perfil para acompanhamento gerencial de indicadores, status, pendências e relatórios consolidados.","modulos_liberados":["Dashboard SST","Dashboard Auditoria","Empresas","Colaboradores","Treinamentos","QR Code","Relatórios"],"acoes_liberadas":["Visualizar","Exportar"],"acoes_restritas":["Cadastrar","Editar","Excluir","Upload","Limpar arquivos","Gerenciar permissões","Acessos do App","Configurações"],"permissoes_json":{"acessoTotal":false,"modulos":{"dashboard_sst":{"visualizar":true,"exportar":true},"dashboard_auditoria":{"visualizar":true,"exportar":true},"empresas":{"visualizar":true,"exportar":true},"colaboradores":{"visualizar":true,"exportar":true},"treinamentos":{"visualizar":true,"exportar":true},"qr_code":{"visualizar":true},"relatorios":{"visualizar":true,"exportar":true}},"acoesCriticas":{}},"observacao":"Indicado para consulta estratégica sem alteração de dados operacionais.","ativo":true,"editavel":true}'::jsonb
    ),
(
        'consulta',
        'Consulta',
        'Visualização controlada, sem permissão para editar, excluir, limpar arquivos ou alterar configurações.',
        'Somente leitura',
        'Perfil para consulta controlada de informações sem permissão para modificar dados.',
        '["Dashboard SST","Empresas","Colaboradores","Treinamentos","QR Code","Relatórios"]'::jsonb,
        '["Visualizar"]'::jsonb,
        '["Cadastrar","Editar","Excluir","Upload","Exportar","Limpar arquivos","Gerenciar permissões","Acessos do App","Configurações"]'::jsonb,
        '{"acessoTotal":false,"modulos":{"dashboard_sst":{"visualizar":true},"empresas":{"visualizar":true},"colaboradores":{"visualizar":true},"treinamentos":{"visualizar":true},"qr_code":{"visualizar":true},"relatorios":{"visualizar":true}},"acoesCriticas":{}}'::jsonb,
        'Uso recomendado para visualização simples e acompanhamento sem risco operacional.',
        true,
        true,
        '{"chave":"consulta","nome":"Consulta","descricao":"Visualização controlada, sem permissão para editar, excluir, limpar arquivos ou alterar configurações.","nivel":"Somente leitura","resumo":"Perfil para consulta controlada de informações sem permissão para modificar dados.","modulos_liberados":["Dashboard SST","Empresas","Colaboradores","Treinamentos","QR Code","Relatórios"],"acoes_liberadas":["Visualizar"],"acoes_restritas":["Cadastrar","Editar","Excluir","Upload","Exportar","Limpar arquivos","Gerenciar permissões","Acessos do App","Configurações"],"permissoes_json":{"acessoTotal":false,"modulos":{"dashboard_sst":{"visualizar":true},"empresas":{"visualizar":true},"colaboradores":{"visualizar":true},"treinamentos":{"visualizar":true},"qr_code":{"visualizar":true},"relatorios":{"visualizar":true}},"acoesCriticas":{}},"observacao":"Uso recomendado para visualização simples e acompanhamento sem risco operacional.","ativo":true,"editavel":true}'::jsonb
    ),
(
        'bloqueado',
        'Bloqueado',
        'Usuário mantido no cadastro para rastreabilidade, mas sem acesso operacional ao sistema.',
        'Sem acesso operacional',
        'Usuário mantido para rastreabilidade, mas sem acesso às rotinas do sistema.',
        '[]'::jsonb,
        '[]'::jsonb,
        '["Visualizar","Cadastrar","Editar","Excluir","Upload","Exportar","Limpar arquivos","Gerenciar permissões"]'::jsonb,
        '{"acessoTotal":false,"modulos":{},"acoesCriticas":{}}'::jsonb,
        'Deve impedir acesso operacional quando os bloqueios reais forem ativados.',
        true,
        true,
        '{"chave":"bloqueado","nome":"Bloqueado","descricao":"Usuário mantido no cadastro para rastreabilidade, mas sem acesso operacional ao sistema.","nivel":"Sem acesso operacional","resumo":"Usuário mantido para rastreabilidade, mas sem acesso às rotinas do sistema.","modulos_liberados":[],"acoes_liberadas":[],"acoes_restritas":["Visualizar","Cadastrar","Editar","Excluir","Upload","Exportar","Limpar arquivos","Gerenciar permissões"],"permissoes_json":{"acessoTotal":false,"modulos":{},"acoesCriticas":{}},"observacao":"Deve impedir acesso operacional quando os bloqueios reais forem ativados.","ativo":true,"editavel":true}'::jsonb
    )
on conflict (chave) do update
set
    padrao_sistema = excluded.padrao_sistema,
    updated_at = now();

create or replace function public.usuario_atual_pode_gerenciar_perfis_sistema()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
    v_permissao public.usuarios_permissoes_sistema;
begin
    if auth.uid() is null then
        return false;
    end if;

    v_email := lower(coalesce(auth.jwt() ->> 'email', ''));

    select ups.*
      into v_permissao
      from public.usuarios_permissoes_sistema ups
     where ups.user_id = auth.uid()
        or lower(ups.email) = v_email
     order by
        case when ups.user_id = auth.uid() then 0 else 1 end,
        ups.updated_at desc nulls last
     limit 1;

    if v_permissao.id is null then
        return false;
    end if;

    if coalesce(v_permissao.ativo, false) is not true
       or coalesce(v_permissao.bloqueado, false) is true then
        return false;
    end if;

    return (
        lower(coalesce(v_permissao.perfil, '')) = 'administrador'
        or coalesce(v_permissao.acesso_global, false) is true
        or coalesce(v_permissao.pode_gerenciar_permissoes, false) is true
        or coalesce((v_permissao.permissoes ->> 'acessoTotal')::boolean, false) is true
        or coalesce((v_permissao.permissoes -> 'acoesCriticas' ->> 'gerenciar_permissoes')::boolean, false) is true
        or coalesce((v_permissao.permissoes -> 'modulos' -> 'acessos_app' ->> 'gerenciar_permissoes')::boolean, false) is true
        or coalesce((v_permissao.permissoes -> 'modulos' -> 'acessos_app' ->> 'editar')::boolean, false) is true
    );
end;
$$;

create or replace function public.admin_listar_perfis_permissoes_sistema()
returns setof public.perfis_permissoes_sistema
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.usuario_atual_pode_gerenciar_perfis_sistema() then
        raise exception 'Usuário sem permissão para listar perfis padrão editáveis.';
    end if;

    return query
    select pps.*
      from public.perfis_permissoes_sistema pps
     order by
        case pps.chave
            when 'administrador' then 1
            when 'tecnico_sst' then 2
            when 'auditor' then 3
            when 'gestor' then 4
            when 'consulta' then 5
            when 'bloqueado' then 6
            else 99
        end,
        pps.nome;
end;
$$;

create or replace function public.admin_salvar_perfil_permissao_sistema(
    p_chave text,
    p_nome text default null,
    p_descricao text default null,
    p_nivel text default null,
    p_resumo text default null,
    p_modulos_liberados jsonb default null,
    p_acoes_liberadas jsonb default null,
    p_acoes_restritas jsonb default null,
    p_permissoes_json jsonb default null,
    p_observacao text default null,
    p_ativo boolean default true,
    p_editavel boolean default true
)
returns public.perfis_permissoes_sistema
language plpgsql
security definer
set search_path = public
as $$
declare
    v_chave text;
    v_perfil public.perfis_permissoes_sistema;
begin
    if not public.usuario_atual_pode_gerenciar_perfis_sistema() then
        raise exception 'Usuário sem permissão para alterar perfis padrão.';
    end if;

    v_chave := lower(trim(coalesce(p_chave, '')));

    if v_chave = '' then
        raise exception 'Perfil não informado.';
    end if;

    if v_chave not in ('administrador', 'tecnico_sst', 'auditor', 'gestor', 'consulta', 'bloqueado') then
        raise exception 'Perfil padrão inválido: %', v_chave;
    end if;

    update public.perfis_permissoes_sistema pps
       set nome = coalesce(nullif(trim(coalesce(p_nome, '')), ''), pps.nome),
           descricao = coalesce(p_descricao, pps.descricao),
           nivel = coalesce(p_nivel, pps.nivel),
           resumo = coalesce(p_resumo, pps.resumo),
           modulos_liberados = coalesce(p_modulos_liberados, pps.modulos_liberados),
           acoes_liberadas = coalesce(p_acoes_liberadas, pps.acoes_liberadas),
           acoes_restritas = coalesce(p_acoes_restritas, pps.acoes_restritas),
           permissoes_json = coalesce(p_permissoes_json, pps.permissoes_json),
           observacao = coalesce(p_observacao, pps.observacao),
           ativo = coalesce(p_ativo, pps.ativo),
           editavel = coalesce(p_editavel, pps.editavel),
           atualizado_por = auth.uid(),
           updated_at = now()
     where pps.chave = v_chave
     returning pps.* into v_perfil;

    if v_perfil.id is null then
        raise exception 'Perfil padrão não encontrado: %', v_chave;
    end if;

    return v_perfil;
end;
$$;

create or replace function public.admin_restaurar_perfil_permissao_sistema(
    p_chave text
)
returns public.perfis_permissoes_sistema
language plpgsql
security definer
set search_path = public
as $$
declare
    v_chave text;
    v_perfil public.perfis_permissoes_sistema;
    v_padrao jsonb;
begin
    if not public.usuario_atual_pode_gerenciar_perfis_sistema() then
        raise exception 'Usuário sem permissão para restaurar perfis padrão.';
    end if;

    v_chave := lower(trim(coalesce(p_chave, '')));

    select pps.padrao_sistema
      into v_padrao
      from public.perfis_permissoes_sistema pps
     where pps.chave = v_chave;

    if v_padrao is null or v_padrao = '{}'::jsonb then
        raise exception 'Padrão de sistema não encontrado para o perfil: %', v_chave;
    end if;

    update public.perfis_permissoes_sistema pps
       set nome = coalesce(v_padrao ->> 'nome', pps.nome),
           descricao = coalesce(v_padrao ->> 'descricao', pps.descricao),
           nivel = coalesce(v_padrao ->> 'nivel', pps.nivel),
           resumo = coalesce(v_padrao ->> 'resumo', pps.resumo),
           modulos_liberados = coalesce(v_padrao -> 'modulos_liberados', pps.modulos_liberados),
           acoes_liberadas = coalesce(v_padrao -> 'acoes_liberadas', pps.acoes_liberadas),
           acoes_restritas = coalesce(v_padrao -> 'acoes_restritas', pps.acoes_restritas),
           permissoes_json = coalesce(v_padrao -> 'permissoes_json', pps.permissoes_json),
           observacao = coalesce(v_padrao ->> 'observacao', pps.observacao),
           ativo = coalesce((v_padrao ->> 'ativo')::boolean, pps.ativo),
           editavel = coalesce((v_padrao ->> 'editavel')::boolean, pps.editavel),
           atualizado_por = auth.uid(),
           updated_at = now()
     where pps.chave = v_chave
     returning pps.* into v_perfil;

    if v_perfil.id is null then
        raise exception 'Perfil padrão não encontrado: %', v_chave;
    end if;

    return v_perfil;
end;
$$;

grant execute on function public.usuario_atual_pode_gerenciar_perfis_sistema() to authenticated, service_role;
grant execute on function public.admin_listar_perfis_permissoes_sistema() to authenticated, service_role;
grant execute on function public.admin_salvar_perfil_permissao_sistema(text, text, text, text, text, jsonb, jsonb, jsonb, jsonb, text, boolean, boolean) to authenticated, service_role;
grant execute on function public.admin_restaurar_perfil_permissao_sistema(text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
