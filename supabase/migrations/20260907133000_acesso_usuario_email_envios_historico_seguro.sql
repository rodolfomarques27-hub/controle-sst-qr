begin;

-- ============================================================
-- SAFESCAN BRASIL
--
-- ACESSOS E USUÁRIOS
--
-- HISTÓRICO SEGURO DE COMUNICAÇÃO DE ACESSOS
--
-- V1:
--   ACESSO_CRIADO
--
-- PRINCÍPIO DE SEGURANÇA:
--
-- Esta tabela NÃO armazena:
--
-- - senha;
-- - senha temporária;
-- - password;
-- - token;
-- - credencial;
-- - corpo renderizado do e-mail;
-- - assunto final renderizado;
-- - payload genérico;
-- - metadados genéricos.
--
-- A credencial inicial existe somente transitoriamente no fluxo
-- futuro de criação/envio.
-- ============================================================

-- ============================================================
-- 0. DEPENDÊNCIAS
-- ============================================================

do $guard$
begin
    if to_regclass(
        'public.usuarios_permissoes_sistema'
    ) is null then
        raise exception
            'Dependência ausente: usuarios_permissoes_sistema.';
    end if;

    if to_regclass(
        'public.modelos_email_sst'
    ) is null then
        raise exception
            'Dependência ausente: modelos_email_sst.';
    end if;

    if to_regclass(
        'public.empresas'
    ) is null then
        raise exception
            'Dependência ausente: empresas.';
    end if;

    if to_regclass(
        'auth.users'
    ) is null then
        raise exception
            'Dependência ausente: auth.users.';
    end if;

    if to_regprocedure(
        'extensions.gen_random_uuid()'
    ) is null then
        raise exception
            'Dependência ausente: extensions.gen_random_uuid().';
    end if;

    if to_regclass(
        'public.acesso_usuario_email_envios'
    ) is not null then
        raise exception
            'Estrutura inesperada já existente: acesso_usuario_email_envios.';
    end if;

    if to_regprocedure(
        'public.acesso_usuario_email_snapshot_tem_chave_sensivel(jsonb)'
    ) is not null then
        raise exception
            'Função inesperada já existente: acesso_usuario_email_snapshot_tem_chave_sensivel(jsonb).';
    end if;

    if to_regprocedure(
        'public.atualizar_acesso_usuario_email_envios_updated_at()'
    ) is not null then
        raise exception
            'Função inesperada já existente: atualizar_acesso_usuario_email_envios_updated_at().';
    end if;

    if to_regprocedure(
        'public.admin_listar_acesso_usuario_email_envios(uuid,text,integer)'
    ) is not null then
        raise exception
            'Função inesperada já existente: admin_listar_acesso_usuario_email_envios(uuid,text,integer).';
    end if;

    if to_regprocedure(
        'public.usuario_pode_gerenciar_modelos_email_sst()'
    ) is null then
        raise exception
            'Dependência ausente: usuario_pode_gerenciar_modelos_email_sst().';
    end if;
end;
$guard$;

-- ============================================================
-- 1. PROTEÇÃO DE CHAVES SENSÍVEIS NO SNAPSHOT JSON
-- ============================================================

create or replace function
public.acesso_usuario_email_snapshot_tem_chave_sensivel(
    p_valor jsonb
)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog, public
as $function$
declare
    v_chave text;
    v_valor jsonb;
begin
    if p_valor is null then
        return false;
    end if;

    if jsonb_typeof(p_valor) = 'object' then

        for
            v_chave,
            v_valor
        in
            select
                entrada.key,
                entrada.value
            from pg_catalog.jsonb_each(
                p_valor
            ) as entrada
        loop
            if lower(v_chave) ~
                '(senha|password|passcode|token|credential|credencial|secret|segredo)'
            then
                return true;
            end if;

            if public.acesso_usuario_email_snapshot_tem_chave_sensivel(
                v_valor
            ) then
                return true;
            end if;
        end loop;

        return false;
    end if;

    if jsonb_typeof(p_valor) = 'array' then

        for v_valor in
            select
                entrada.value
            from pg_catalog.jsonb_array_elements(
                p_valor
            ) as entrada
        loop
            if public.acesso_usuario_email_snapshot_tem_chave_sensivel(
                v_valor
            ) then
                return true;
            end if;
        end loop;

        return false;
    end if;

    return false;
end;
$function$;

revoke all
on function
public.acesso_usuario_email_snapshot_tem_chave_sensivel(
    jsonb
)
from public, anon, authenticated;

grant execute
on function
public.acesso_usuario_email_snapshot_tem_chave_sensivel(
    jsonb
)
to service_role;

comment on function
public.acesso_usuario_email_snapshot_tem_chave_sensivel(
    jsonb
)
is
    'Bloqueia chaves de credenciais dentro do snapshot JSON do histórico de comunicação de acessos.';

-- ============================================================
-- 2. HISTÓRICO DE COMUNICAÇÃO DE ACESSO
-- ============================================================

create table
public.acesso_usuario_email_envios (
    id uuid primary key
        default extensions.gen_random_uuid(),

    usuario_permissao_id uuid null
        references public.usuarios_permissoes_sistema(id)
        on delete set null,

    usuario_id uuid null
        references auth.users(id)
        on delete set null,

    usuario_email text not null,
    usuario_nome text null,

    empresa_id uuid null
        references public.empresas(id)
        on delete set null,

    empresa_nome text null,

    tipo_comunicacao text not null
        default 'ACESSO_CRIADO',

    perfil_snapshot text not null,

    permissoes_snapshot jsonb not null
        default '{}'::jsonb,

    modulos_liberados text[] not null
        default array[]::text[],

    acoes_liberadas text[] not null
        default array[]::text[],

    restricoes text[] not null
        default array[]::text[],

    modelo_tipo text not null
        default 'acesso_usuario_criado',

    modelo_versao integer not null,

    destinatario_email text not null,

    remetente_nome text not null,

    status text not null
        default 'PREPARANDO',

    chave_idempotencia uuid not null
        unique,

    tentativa_numero integer not null
        default 1,

    reenvio_de_id uuid null
        references public.acesso_usuario_email_envios(id)
        on delete set null,

    provedor_mensagem_id text null,

    erro_codigo text null,

    solicitado_por uuid null
        references auth.users(id)
        on delete set null,

    solicitado_por_email text null,

    iniciado_em timestamptz not null
        default now(),

    enviado_em timestamptz null,

    criado_em timestamptz not null
        default now(),

    atualizado_em timestamptz not null
        default now(),

    constraint acesso_usuario_email_envios_usuario_email_check
        check (
            char_length(
                btrim(
                    usuario_email
                )
            ) between 3 and 254
            and usuario_email ~*
                '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        ),

    constraint acesso_usuario_email_envios_destinatario_check
        check (
            char_length(
                btrim(
                    destinatario_email
                )
            ) between 3 and 254
            and destinatario_email ~*
                '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        ),

    constraint acesso_usuario_email_envios_executor_email_check
        check (
            solicitado_por_email is null
            or (
                char_length(
                    btrim(
                        solicitado_por_email
                    )
                ) between 3 and 254
                and solicitado_por_email ~*
                    '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
            )
        ),

    constraint acesso_usuario_email_envios_tipo_check
        check (
            tipo_comunicacao =
                'ACESSO_CRIADO'
        ),

    constraint acesso_usuario_email_envios_modelo_check
        check (
            modelo_tipo =
                'acesso_usuario_criado'
        ),

    constraint acesso_usuario_email_envios_modelo_versao_check
        check (
            modelo_versao >= 1
        ),

    constraint acesso_usuario_email_envios_perfil_check
        check (
            perfil_snapshot in (
                'administrador',
                'tecnico_sst',
                'auditor',
                'gestor',
                'consulta',
                'bloqueado'
            )
        ),

    constraint acesso_usuario_email_envios_permissoes_objeto_check
        check (
            jsonb_typeof(
                permissoes_snapshot
            ) = 'object'
        ),

    constraint acesso_usuario_email_envios_permissoes_sem_segredo_check
        check (
            not public.acesso_usuario_email_snapshot_tem_chave_sensivel(
                permissoes_snapshot
            )
        ),

    constraint acesso_usuario_email_envios_status_check
        check (
            status in (
                'PREPARANDO',
                'ENVIANDO',
                'ENVIADO',
                'ERRO'
            )
        ),


    constraint acesso_usuario_email_envios_tentativa_check
        check (
            tentativa_numero
                between 1 and 100
        ),

    constraint acesso_usuario_email_envios_reenvio_check
        check (
            reenvio_de_id is null
            or reenvio_de_id <> id
        ),

    constraint acesso_usuario_email_envios_erro_codigo_check
        check (
            erro_codigo is null
            or erro_codigo in (
                'PERMISSAO_NEGADA',
                'CONFIGURACAO_INVALIDA',
                'MODELO_NAO_ENCONTRADO',
                'MODELO_INATIVO',
                'DESTINATARIO_INVALIDO',
                'SMTP_NAO_CONFIGURADO',
                'ENVIO_RECUSADO',
                'ENVIO_TIMEOUT',
                'PROVEDOR_INDISPONIVEL',
                'ERRO_INTERNO'
            )
        ),

    constraint acesso_usuario_email_envios_status_erro_check
        check (
            (
                status = 'ERRO'
                and erro_codigo is not null
            )
            or
            (
                status <> 'ERRO'
                and erro_codigo is null
            )
        ),

    constraint acesso_usuario_email_envios_status_enviado_check
        check (
            (
                status = 'ENVIADO'
                and enviado_em is not null
            )
            or
            (
                status <> 'ENVIADO'
                and enviado_em is null
            )
        )
);

comment on table
public.acesso_usuario_email_envios
is
    'Histórico seguro das comunicações de acesso do SafeScan. Não armazena senha temporária, token, credencial, corpo ou payload do e-mail.';

-- ============================================================
-- 3. ÍNDICES
-- ============================================================

create index if not exists
    acesso_usuario_email_envios_usuario_idx
on public.acesso_usuario_email_envios (
    usuario_id,
    criado_em desc
);

create index if not exists
    acesso_usuario_email_envios_usuario_email_idx
on public.acesso_usuario_email_envios (
    usuario_email,
    criado_em desc
);

create index if not exists
    acesso_usuario_email_envios_empresa_idx
on public.acesso_usuario_email_envios (
    empresa_id,
    criado_em desc
);

create index if not exists
    acesso_usuario_email_envios_status_idx
on public.acesso_usuario_email_envios (
    status,
    criado_em desc
);

create index if not exists
    acesso_usuario_email_envios_reenvio_idx
on public.acesso_usuario_email_envios (
    reenvio_de_id,
    criado_em desc
);

-- ============================================================
-- 4. RLS E PRIVILÉGIOS
-- ============================================================

alter table
public.acesso_usuario_email_envios
enable row level security;

revoke all
on table
public.acesso_usuario_email_envios
from public, anon, authenticated;

revoke all
on table
public.acesso_usuario_email_envios
from service_role;

grant
    select,
    insert,
    update
on table
public.acesso_usuario_email_envios
to service_role;

-- Histórico deliberadamente sem DELETE para o fluxo normal.

-- ============================================================
-- 5. TIMESTAMP AUTOMÁTICO
-- ============================================================

create or replace function
public.atualizar_acesso_usuario_email_envios_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
    new.atualizado_em :=
        now();

    return new;
end;
$function$;

revoke all
on function
public.atualizar_acesso_usuario_email_envios_updated_at()
from public, anon, authenticated;

drop trigger if exists
    acesso_usuario_email_envios_atualizar_data
on public.acesso_usuario_email_envios;

create trigger
    acesso_usuario_email_envios_atualizar_data
before update
on public.acesso_usuario_email_envios
for each row
execute function
public.atualizar_acesso_usuario_email_envios_updated_at();

-- ============================================================
-- 6. LISTAGEM ADMINISTRATIVA SEGURA
-- ============================================================

create or replace function
public.admin_listar_acesso_usuario_email_envios(
    p_usuario_id uuid default null,
    p_usuario_email text default null,
    p_limite integer default 50
)
returns table (
    id uuid,
    usuario_permissao_id uuid,
    usuario_id uuid,
    usuario_email text,
    usuario_nome text,
    empresa_id uuid,
    empresa_nome text,
    tipo_comunicacao text,
    perfil_snapshot text,
    permissoes_snapshot jsonb,
    modulos_liberados text[],
    acoes_liberadas text[],
    restricoes text[],
    modelo_tipo text,
    modelo_versao integer,
    destinatario_email text,
    remetente_nome text,
    status text,
    chave_idempotencia uuid,
    tentativa_numero integer,
    reenvio_de_id uuid,
    provedor_mensagem_id text,
    erro_codigo text,
    solicitado_por uuid,
    solicitado_por_email text,
    iniciado_em timestamptz,
    enviado_em timestamptz,
    criado_em timestamptz,
    atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_email text;
begin
    if not public.usuario_pode_gerenciar_modelos_email_sst() then
        raise exception
            'Sem permissão para consultar o histórico de comunicações de acesso.'
            using errcode = '42501';
    end if;

    if p_limite is null
       or p_limite < 1
       or p_limite > 200
    then
        raise exception
            'Limite inválido. Informe um valor entre 1 e 200.'
            using errcode = '22023';
    end if;

    v_email :=
        nullif(
            lower(
                btrim(
                    coalesce(
                        p_usuario_email,
                        ''
                    )
                )
            ),
            ''
        );

    return query
    select
        envio.id,
        envio.usuario_permissao_id,
        envio.usuario_id,
        envio.usuario_email,
        envio.usuario_nome,
        envio.empresa_id,
        envio.empresa_nome,
        envio.tipo_comunicacao,
        envio.perfil_snapshot,
        envio.permissoes_snapshot,
        envio.modulos_liberados,
        envio.acoes_liberadas,
        envio.restricoes,
        envio.modelo_tipo,
        envio.modelo_versao,
        envio.destinatario_email,
        envio.remetente_nome,
        envio.status,
        envio.chave_idempotencia,
        envio.tentativa_numero,
        envio.reenvio_de_id,
        envio.provedor_mensagem_id,
        envio.erro_codigo,
        envio.solicitado_por,
        envio.solicitado_por_email,
        envio.iniciado_em,
        envio.enviado_em,
        envio.criado_em,
        envio.atualizado_em
    from public.acesso_usuario_email_envios envio
    where (
        p_usuario_id is null
        or envio.usuario_id =
            p_usuario_id
    )
    and (
        v_email is null
        or lower(
            envio.usuario_email
        ) = v_email
    )
    order by
        envio.criado_em desc,
        envio.id desc
    limit p_limite;
end;
$function$;

revoke all
on function
public.admin_listar_acesso_usuario_email_envios(
    uuid,
    text,
    integer
)
from public, anon, authenticated;

grant execute
on function
public.admin_listar_acesso_usuario_email_envios(
    uuid,
    text,
    integer
)
to authenticated, service_role;

comment on function
public.admin_listar_acesso_usuario_email_envios(
    uuid,
    text,
    integer
)
is
    'Lista administrativamente o histórico seguro das comunicações de acesso sem expor credenciais, corpo ou payload de e-mail.';

commit;
