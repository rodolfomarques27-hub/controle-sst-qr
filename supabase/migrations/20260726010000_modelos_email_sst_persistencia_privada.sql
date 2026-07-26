-- ============================================================
-- SAFESCAN BRASIL
-- MODELOS DE E-MAIL SST
-- PERSISTÊNCIA PRIVADA, RPCS ADMINISTRATIVAS E LEITURA DA EDGE
--
-- Esta migration:
-- - cria uma tabela privada específica para modelos de e-mail;
-- - não reutiliza configuracoes_publicas_sistema;
-- - impede acesso direto por anon e authenticated;
-- - permite leitura e alteração administrativa somente por RPC;
-- - disponibiliza leitura operacional somente ao service_role;
-- - não altera os envios atuais até a integração do frontend
--   e da Edge Function rapid-api.
-- ============================================================

begin;

create table if not exists public.modelos_email_sst (
    tipo text primary key,

    nome text not null,
    descricao text not null default '',

    assunto_padrao text not null,
    corpo_padrao text not null,
    remetente_nome_padrao text not null,

    assunto text not null,
    corpo text not null,
    remetente_nome text not null,

    ativo boolean not null default true,
    versao integer not null default 1,

    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),

    criado_por uuid null
        references auth.users(id)
        on delete set null,

    atualizado_por uuid null
        references auth.users(id)
        on delete set null,

    constraint modelos_email_sst_tipo_check
        check (
            tipo in (
                'alerta_documento_colaborador',
                'alerta_documento_empresa',
                'alerta_documentos_lote',
                'alerta_treinamentos',
                'alerta_auditoria'
            )
        ),

    constraint modelos_email_sst_nome_check
        check (
            char_length(btrim(nome))
            between 1 and 150
        ),

    constraint modelos_email_sst_descricao_check
        check (
            char_length(descricao) <= 500
        ),

    constraint modelos_email_sst_assunto_padrao_check
        check (
            char_length(btrim(assunto_padrao))
            between 1 and 220
            and position(E'\n' in assunto_padrao) = 0
            and position(E'\r' in assunto_padrao) = 0
        ),

    constraint modelos_email_sst_assunto_check
        check (
            char_length(btrim(assunto))
            between 1 and 220
            and position(E'\n' in assunto) = 0
            and position(E'\r' in assunto) = 0
        ),

    constraint modelos_email_sst_corpo_padrao_check
        check (
            char_length(btrim(corpo_padrao))
            between 1 and 12000
            and corpo_padrao ~* '\{\{\s*itens\s*\}\}'
        ),

    constraint modelos_email_sst_corpo_check
        check (
            char_length(btrim(corpo))
            between 1 and 12000
            and corpo ~* '\{\{\s*itens\s*\}\}'
        ),

    constraint modelos_email_sst_remetente_padrao_check
        check (
            char_length(btrim(remetente_nome_padrao))
            between 1 and 120
            and position(E'\n' in remetente_nome_padrao) = 0
            and position(E'\r' in remetente_nome_padrao) = 0
        ),

    constraint modelos_email_sst_remetente_check
        check (
            char_length(btrim(remetente_nome))
            between 1 and 120
            and position(E'\n' in remetente_nome) = 0
            and position(E'\r' in remetente_nome) = 0
        ),

    constraint modelos_email_sst_versao_check
        check (versao >= 1)
);

alter table public.modelos_email_sst
enable row level security;

revoke all
on table public.modelos_email_sst
from public, anon, authenticated;

grant select, insert, update, delete
on table public.modelos_email_sst
to service_role;

comment on table public.modelos_email_sst
is
'Modelos privados usados nos alertas SST. Acesso administrativo por RPC e leitura operacional somente pelo service_role.';

comment on column public.modelos_email_sst.tipo
is
'Identificador funcional do fluxo de e-mail SST.';

comment on column public.modelos_email_sst.assunto_padrao
is
'Assunto original utilizado na restauração administrativa.';

comment on column public.modelos_email_sst.corpo_padrao
is
'Corpo original utilizado na restauração administrativa.';

comment on column public.modelos_email_sst.assunto
is
'Assunto editável atualmente ativo para o tipo de modelo.';

comment on column public.modelos_email_sst.corpo
is
'Corpo editável atualmente ativo para o tipo de modelo.';

comment on column public.modelos_email_sst.versao
is
'Versão incremental do modelo após salvar ou restaurar.';

create or replace function public.atualizar_modelos_email_sst_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
    new.atualizado_em := now();
    return new;
end;
$function$;

revoke all
on function public.atualizar_modelos_email_sst_updated_at()
from public, anon, authenticated;

drop trigger if exists modelos_email_sst_atualizar_data
on public.modelos_email_sst;

create trigger modelos_email_sst_atualizar_data
before update
on public.modelos_email_sst
for each row
execute function public.atualizar_modelos_email_sst_updated_at();

do $seed$
declare
    v_corpo_padrao text := $corpo$
{{saudacao}}

Segue aviso automático de documentos, treinamentos ou registros SST vencidos ou com vencimento previsto para os próximos 30 dias.

Empresa: {{empresa_nome}}
Resumo: {{resumo}}
Data do envio: {{data_envio}}

{{itens}}

Solicitamos regularizar os itens vencidos e programar a renovação dos próximos vencimentos para evitar bloqueio de atividade.

Atenciosamente,
{{sistema_nome}}
{{url_sistema}}
$corpo$;

    v_remetente_padrao text :=
        'SafeScan Brasil - Controle de SST';
begin
    insert into public.modelos_email_sst (
        tipo,
        nome,
        descricao,
        assunto_padrao,
        corpo_padrao,
        remetente_nome_padrao,
        assunto,
        corpo,
        remetente_nome,
        ativo,
        versao,
        criado_por,
        atualizado_por
    )
    values (
        'alerta_documento_colaborador',
        'Documento de colaborador',
        'Alertas individuais relacionados a documentos e certificados de colaboradores.',
        'Aviso SST - {{empresa_nome}} - documento de colaborador',
        v_corpo_padrao,
        v_remetente_padrao,
        'Aviso SST - {{empresa_nome}} - documento de colaborador',
        v_corpo_padrao,
        v_remetente_padrao,
        true,
        1,
        null,
        null
    )
    on conflict (tipo) do nothing;

    insert into public.modelos_email_sst (
        tipo,
        nome,
        descricao,
        assunto_padrao,
        corpo_padrao,
        remetente_nome_padrao,
        assunto,
        corpo,
        remetente_nome,
        ativo,
        versao,
        criado_por,
        atualizado_por
    )
    values (
        'alerta_documento_empresa',
        'Documento da empresa',
        'Alertas relacionados a documentos legais e operacionais das empresas.',
        'Aviso SST - {{empresa_nome}} - documento da empresa',
        v_corpo_padrao,
        v_remetente_padrao,
        'Aviso SST - {{empresa_nome}} - documento da empresa',
        v_corpo_padrao,
        v_remetente_padrao,
        true,
        1,
        null,
        null
    )
    on conflict (tipo) do nothing;

    insert into public.modelos_email_sst (
        tipo,
        nome,
        descricao,
        assunto_padrao,
        corpo_padrao,
        remetente_nome_padrao,
        assunto,
        corpo,
        remetente_nome,
        ativo,
        versao,
        criado_por,
        atualizado_por
    )
    values (
        'alerta_documentos_lote',
        'Resumo de documentos em lote',
        'Resumo com vários documentos vencidos ou próximos do vencimento.',
        'Resumo SST - {{empresa_nome}} - {{quantidade_itens}} item(ns)',
        v_corpo_padrao,
        v_remetente_padrao,
        'Resumo SST - {{empresa_nome}} - {{quantidade_itens}} item(ns)',
        v_corpo_padrao,
        v_remetente_padrao,
        true,
        1,
        null,
        null
    )
    on conflict (tipo) do nothing;

    insert into public.modelos_email_sst (
        tipo,
        nome,
        descricao,
        assunto_padrao,
        corpo_padrao,
        remetente_nome_padrao,
        assunto,
        corpo,
        remetente_nome,
        ativo,
        versao,
        criado_por,
        atualizado_por
    )
    values (
        'alerta_treinamentos',
        'Treinamentos e certificados',
        'Alertas relacionados a treinamentos, reciclagens e certificados.',
        'Aviso SST - {{empresa_nome}} - treinamentos',
        v_corpo_padrao,
        v_remetente_padrao,
        'Aviso SST - {{empresa_nome}} - treinamentos',
        v_corpo_padrao,
        v_remetente_padrao,
        true,
        1,
        null,
        null
    )
    on conflict (tipo) do nothing;

    insert into public.modelos_email_sst (
        tipo,
        nome,
        descricao,
        assunto_padrao,
        corpo_padrao,
        remetente_nome_padrao,
        assunto,
        corpo,
        remetente_nome,
        ativo,
        versao,
        criado_por,
        atualizado_por
    )
    values (
        'alerta_auditoria',
        'Auditorias e desvios',
        'Alertas relacionados a auditorias, desvios e tratativas de campo.',
        'Aviso SST - {{empresa_nome}} - auditoria',
        v_corpo_padrao,
        v_remetente_padrao,
        'Aviso SST - {{empresa_nome}} - auditoria',
        v_corpo_padrao,
        v_remetente_padrao,
        true,
        1,
        null,
        null
    )
    on conflict (tipo) do nothing;
end;
$seed$;

create or replace function public.usuario_pode_gerenciar_modelos_email_sst()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
    select
        auth.uid() is not null
        and exists (
            select 1
            from public.usuario_permissao_sistema_atual() permissao
            where coalesce(permissao.ativo, false) = true
              and coalesce(permissao.bloqueado, false) = false
              and (
                  coalesce(permissao.acesso_global, false) = true
                  or lower(coalesce(permissao.perfil, ''))
                      in ('admin', 'administrador')
                  or lower(
                      coalesce(
                          permissao.permissoes
                              ->> 'acessoTotal',
                          'false'
                      )
                  ) = 'true'
                  or lower(
                      coalesce(
                          permissao.permissoes
                              -> 'acoesCriticas'
                              ->> 'configuracoes_criticas',
                          'false'
                      )
                  ) = 'true'
                  or lower(
                      coalesce(
                          permissao.permissoes
                              -> 'modulos'
                              -> 'configuracoes'
                              ->> 'editar',
                          'false'
                      )
                  ) = 'true'
              )
        );
$function$;

revoke all
on function public.usuario_pode_gerenciar_modelos_email_sst()
from public, anon, authenticated;

comment on function public.usuario_pode_gerenciar_modelos_email_sst()
is
'Validação interna de permissão crítica para administrar modelos de e-mail SST.';

create or replace function public.validar_modelo_email_sst(
    p_assunto text,
    p_corpo text,
    p_remetente_nome text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_variavel text;

    v_variaveis_permitidas constant text[] := array[
        'saudacao',
        'tst_responsavel',
        'empresa_nome',
        'total_vencidos',
        'total_a_vencer',
        'quantidade_itens',
        'resumo',
        'itens',
        'sistema_nome',
        'url_sistema',
        'data_envio'
    ];
begin
    if p_assunto is null
       or char_length(btrim(p_assunto)) = 0
       or char_length(btrim(p_assunto)) > 220 then
        raise exception
            'O assunto deve possuir entre 1 e 220 caracteres.'
            using errcode = '22023';
    end if;

    if position(E'\n' in p_assunto) > 0
       or position(E'\r' in p_assunto) > 0 then
        raise exception
            'O assunto não pode conter quebra de linha.'
            using errcode = '22023';
    end if;

    if p_corpo is null
       or char_length(btrim(p_corpo)) = 0
       or char_length(btrim(p_corpo)) > 12000 then
        raise exception
            'O corpo deve possuir entre 1 e 12.000 caracteres.'
            using errcode = '22023';
    end if;

    if p_corpo !~* '\{\{\s*itens\s*\}\}' then
        raise exception
            'O corpo do modelo deve conter a variável {{itens}}.'
            using errcode = '22023';
    end if;

    if p_remetente_nome is null
       or char_length(btrim(p_remetente_nome)) = 0
       or char_length(btrim(p_remetente_nome)) > 120 then
        raise exception
            'O nome do remetente deve possuir entre 1 e 120 caracteres.'
            using errcode = '22023';
    end if;

    if position(E'\n' in p_remetente_nome) > 0
       or position(E'\r' in p_remetente_nome) > 0 then
        raise exception
            'O nome do remetente não pode conter quebra de linha.'
            using errcode = '22023';
    end if;

    for v_variavel in
        select lower(correspondencia[1])
        from regexp_matches(
            coalesce(p_assunto, '')
                || E'\n'
                || coalesce(p_corpo, ''),
            '\{\{\s*([a-z0-9_]+)\s*\}\}',
            'gi'
        ) as resultado(correspondencia)
    loop
        if not (
            v_variavel = any(v_variaveis_permitidas)
        ) then
            raise exception
                'Variável não permitida no modelo: {{%}}.',
                v_variavel
                using errcode = '22023';
        end if;
    end loop;
end;
$function$;

revoke all
on function public.validar_modelo_email_sst(
    text,
    text,
    text
)
from public, anon, authenticated;

comment on function public.validar_modelo_email_sst(
    text,
    text,
    text
)
is
'Valida tamanho, cabeçalhos, variável obrigatória e variáveis permitidas dos modelos SST.';

create or replace function public.admin_listar_modelos_email_sst()
returns table (
    tipo text,
    nome text,
    descricao text,
    assunto text,
    corpo text,
    remetente_nome text,
    ativo boolean,
    versao integer,
    atualizado_em timestamptz,
    atualizado_por uuid,
    assunto_padrao text,
    corpo_padrao text,
    remetente_nome_padrao text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
    if not public.usuario_pode_gerenciar_modelos_email_sst() then
        raise exception
            'Sem permissão para administrar modelos de e-mail SST.'
            using errcode = '42501';
    end if;

    return query
    select
        modelo.tipo,
        modelo.nome,
        modelo.descricao,
        modelo.assunto,
        modelo.corpo,
        modelo.remetente_nome,
        modelo.ativo,
        modelo.versao,
        modelo.atualizado_em,
        modelo.atualizado_por,
        modelo.assunto_padrao,
        modelo.corpo_padrao,
        modelo.remetente_nome_padrao
    from public.modelos_email_sst modelo
    order by
        case modelo.tipo
            when 'alerta_documento_colaborador' then 1
            when 'alerta_documento_empresa' then 2
            when 'alerta_documentos_lote' then 3
            when 'alerta_treinamentos' then 4
            when 'alerta_auditoria' then 5
            else 99
        end,
        modelo.tipo;
end;
$function$;

revoke all
on function public.admin_listar_modelos_email_sst()
from public, anon, authenticated;

grant execute
on function public.admin_listar_modelos_email_sst()
to authenticated, service_role;

comment on function public.admin_listar_modelos_email_sst()
is
'Lista modelos de e-mail SST somente para usuário com permissão crítica de Configurações.';

create or replace function public.admin_salvar_modelo_email_sst(
    p_tipo text,
    p_assunto text,
    p_corpo text,
    p_remetente_nome text,
    p_ativo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_tipo text :=
        lower(btrim(coalesce(p_tipo, '')));

    v_modelo public.modelos_email_sst%rowtype;
begin
    if not public.usuario_pode_gerenciar_modelos_email_sst() then
        raise exception
            'Sem permissão para alterar modelos de e-mail SST.'
            using errcode = '42501';
    end if;

    perform public.validar_modelo_email_sst(
        p_assunto,
        p_corpo,
        p_remetente_nome
    );

    update public.modelos_email_sst
    set
        assunto = btrim(p_assunto),
        corpo = btrim(p_corpo),
        remetente_nome = btrim(p_remetente_nome),
        ativo = coalesce(p_ativo, true),
        versao = versao + 1,
        atualizado_por = auth.uid()
    where tipo = v_tipo
    returning *
    into v_modelo;

    if not found then
        raise exception
            'Tipo de modelo de e-mail SST inválido: %.',
            v_tipo
            using errcode = '22023';
    end if;

    return jsonb_build_object(
        'tipo', v_modelo.tipo,
        'nome', v_modelo.nome,
        'assunto', v_modelo.assunto,
        'corpo', v_modelo.corpo,
        'remetenteNome', v_modelo.remetente_nome,
        'ativo', v_modelo.ativo,
        'versao', v_modelo.versao,
        'atualizadoEm', v_modelo.atualizado_em,
        'atualizadoPor', v_modelo.atualizado_por
    );
end;
$function$;

revoke all
on function public.admin_salvar_modelo_email_sst(
    text,
    text,
    text,
    text,
    boolean
)
from public, anon, authenticated;

grant execute
on function public.admin_salvar_modelo_email_sst(
    text,
    text,
    text,
    text,
    boolean
)
to authenticated, service_role;

comment on function public.admin_salvar_modelo_email_sst(
    text,
    text,
    text,
    text,
    boolean
)
is
'Salva um modelo SST após validar permissão crítica, limites e variáveis permitidas.';

create or replace function public.admin_restaurar_modelo_email_sst(
    p_tipo text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_tipo text :=
        lower(btrim(coalesce(p_tipo, '')));

    v_modelo public.modelos_email_sst%rowtype;
begin
    if not public.usuario_pode_gerenciar_modelos_email_sst() then
        raise exception
            'Sem permissão para restaurar modelos de e-mail SST.'
            using errcode = '42501';
    end if;

    update public.modelos_email_sst
    set
        assunto = assunto_padrao,
        corpo = corpo_padrao,
        remetente_nome = remetente_nome_padrao,
        ativo = true,
        versao = versao + 1,
        atualizado_por = auth.uid()
    where tipo = v_tipo
    returning *
    into v_modelo;

    if not found then
        raise exception
            'Tipo de modelo de e-mail SST inválido: %.',
            v_tipo
            using errcode = '22023';
    end if;

    return jsonb_build_object(
        'tipo', v_modelo.tipo,
        'nome', v_modelo.nome,
        'assunto', v_modelo.assunto,
        'corpo', v_modelo.corpo,
        'remetenteNome', v_modelo.remetente_nome,
        'ativo', v_modelo.ativo,
        'versao', v_modelo.versao,
        'atualizadoEm', v_modelo.atualizado_em,
        'atualizadoPor', v_modelo.atualizado_por,
        'restaurado', true
    );
end;
$function$;

revoke all
on function public.admin_restaurar_modelo_email_sst(text)
from public, anon, authenticated;

grant execute
on function public.admin_restaurar_modelo_email_sst(text)
to authenticated, service_role;

comment on function public.admin_restaurar_modelo_email_sst(text)
is
'Restaura assunto, corpo, remetente e estado ativo do modelo padrão.';

create or replace function public.obter_modelo_email_sst_para_envio(
    p_tipo text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $function$
declare
    v_tipo text :=
        lower(btrim(coalesce(p_tipo, '')));

    v_modelo public.modelos_email_sst%rowtype;
begin
    select modelo.*
    into v_modelo
    from public.modelos_email_sst modelo
    where modelo.tipo = v_tipo
      and modelo.ativo = true
    limit 1;

    if not found then
        return null;
    end if;

    return jsonb_build_object(
        'tipo', v_modelo.tipo,
        'assunto', v_modelo.assunto,
        'corpo', v_modelo.corpo,
        'remetenteNome', v_modelo.remetente_nome,
        'versao', v_modelo.versao
    );
end;
$function$;

revoke all
on function public.obter_modelo_email_sst_para_envio(text)
from public, anon, authenticated;

grant execute
on function public.obter_modelo_email_sst_para_envio(text)
to service_role;

comment on function public.obter_modelo_email_sst_para_envio(text)
is
'Retorna ao service_role somente o modelo ativo necessário para a Edge Function de envio.';

commit;