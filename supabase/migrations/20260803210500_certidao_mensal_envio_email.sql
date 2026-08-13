-- SafeScan Brasil
-- Certidão Mensal Documental
-- Configurações privadas, envio consolidado, partes e documentos anexados.
-- Esta migration deve ser aplicada somente após revisão e autorização explícita.

begin;

-- ============================================================
-- 0. CHAVES COMPOSTAS DE INTEGRIDADE
-- ============================================================

alter table public.certidao_mensal_competencias
add constraint certidao_mensal_competencias_id_empresa_key
unique (
    id,
    empresa_id
);

alter table public.certidao_mensal_itens
add constraint certidao_mensal_itens_id_competencia_key
unique (
    id,
    competencia_id
);

-- ============================================================
-- 1. CONFIGURAÇÃO GLOBAL E SUBSTITUIÇÃO POR EMPRESA
-- ============================================================

create table if not exists public.certidao_mensal_email_configuracoes (
    id uuid primary key default extensions.gen_random_uuid(),

    escopo text not null,
    empresa_id uuid null
        references public.empresas(id)
        on delete cascade,

    ativo boolean not null default false,
    usar_email_empresa boolean not null default true,

    destinatarios text[] not null default array[]::text[],
    copias text[] not null default array[]::text[],
    responder_para text null,

    nome_remetente text not null
        default 'SafeScan Brasil',

    assunto_modelo text not null
        default 'Documentação mensal — {{empresa_nome}} — {{competencia}}',

    corpo_modelo text not null
        default E'{{saudacao}},\n\nSegue a documentação mensal da empresa {{empresa_nome}}, referente à competência {{competencia}}.\n\n{{resumo}}\n\n{{itens}}',

    anexar_pdfs boolean not null default true,

    estrategia_excedente text not null
        default 'DIVIDIR_EM_PARTES',

    limite_mensagem_bytes bigint not null
        default 18874368,

    versao integer not null default 1,

    criado_por uuid null
        references auth.users(id)
        on delete set null,

    atualizado_por uuid null
        references auth.users(id)
        on delete set null,

    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),

    constraint certidao_mensal_email_config_escopo_check
        check (
            escopo in (
                'GLOBAL',
                'EMPRESA'
            )
        ),

    constraint certidao_mensal_email_config_empresa_check
        check (
            (
                escopo = 'GLOBAL'
                and empresa_id is null
            )
            or
            (
                escopo = 'EMPRESA'
                and empresa_id is not null
            )
        ),

    constraint certidao_mensal_email_config_destinatarios_check
        check (
            cardinality(destinatarios) <= 10
        ),

    constraint certidao_mensal_email_config_copias_check
        check (
            cardinality(copias) <= 10
        ),

    constraint certidao_mensal_email_config_responder_check
        check (
            responder_para is null
            or char_length(btrim(responder_para))
                between 3 and 254
        ),

    constraint certidao_mensal_email_config_remetente_check
        check (
            char_length(btrim(nome_remetente))
                between 1 and 120
            and position(E'\n' in nome_remetente) = 0
            and position(E'\r' in nome_remetente) = 0
        ),

    constraint certidao_mensal_email_config_assunto_check
        check (
            char_length(btrim(assunto_modelo))
                between 1 and 180
            and position(E'\n' in assunto_modelo) = 0
            and position(E'\r' in assunto_modelo) = 0
        ),

    constraint certidao_mensal_email_config_corpo_check
        check (
            char_length(btrim(corpo_modelo))
                between 1 and 10000
            and corpo_modelo ~*
                '\{\{\s*itens\s*\}\}'
        ),

    constraint certidao_mensal_email_config_estrategia_check
        check (
            estrategia_excedente =
                'DIVIDIR_EM_PARTES'
        ),

    constraint certidao_mensal_email_config_limite_check
        check (
            limite_mensagem_bytes =
                18874368
        ),

    constraint certidao_mensal_email_config_versao_check
        check (
            versao >= 1
        )
);

create unique index if not exists
    certidao_mensal_email_config_global_uidx
on public.certidao_mensal_email_configuracoes ((1))
where escopo = 'GLOBAL';

create unique index if not exists
    certidao_mensal_email_config_empresa_uidx
on public.certidao_mensal_email_configuracoes (empresa_id)
where escopo = 'EMPRESA';

create index if not exists
    certidao_mensal_email_config_empresa_idx
on public.certidao_mensal_email_configuracoes (empresa_id);

alter table public.certidao_mensal_email_configuracoes
enable row level security;

revoke all
on table public.certidao_mensal_email_configuracoes
from public, anon, authenticated;

grant select, insert, update, delete
on table public.certidao_mensal_email_configuracoes
to service_role;

-- ============================================================
-- 2. TENTATIVAS CONSOLIDADAS DE ENVIO
-- ============================================================

create table if not exists public.certidao_mensal_envios (
    id uuid primary key default extensions.gen_random_uuid(),

    competencia_id uuid not null
        references public.certidao_mensal_competencias(id)
        on delete restrict,

    empresa_id uuid not null
        references public.empresas(id)
        on delete restrict,

    configuracao_id uuid null
        references public.certidao_mensal_email_configuracoes(id)
        on delete set null,

    chave_idempotencia text not null unique,

    status text not null default 'PREPARANDO',

    destinatarios text[] not null,
    copias text[] not null default array[]::text[],
    responder_para text null,

    remetente_nome text not null,
    assunto_base text not null,
    corpo_base text not null,

    configuracao_escopo text not null,
    configuracao_versao integer null,

    total_documentos integer not null default 0,
    total_partes integer not null default 0,
    partes_enviadas integer not null default 0,
    tamanho_total_bytes bigint not null default 0,

    mensagem_erro text null,

    solicitado_por uuid null
        references auth.users(id)
        on delete set null,

    solicitado_por_email text null,

    iniciado_em timestamptz not null default now(),
    concluido_em timestamptz null,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),

    constraint certidao_mensal_envios_id_competencia_key
        unique (
            id,
            competencia_id
        ),

    constraint certidao_mensal_envios_competencia_empresa_fkey
        foreign key (
            competencia_id,
            empresa_id
        )
        references public.certidao_mensal_competencias (
            id,
            empresa_id
        )
        on delete restrict,

    constraint certidao_mensal_envios_solicitante_email_check
        check (
            solicitado_por_email is null
            or (
                char_length(btrim(solicitado_por_email))
                    between 3 and 254
                and solicitado_por_email ~*
                    '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
            )
        ),

    constraint certidao_mensal_envios_chave_check
        check (
            chave_idempotencia ~
                '^[A-Za-z0-9:_-]{16,120}$'
        ),

    constraint certidao_mensal_envios_status_check
        check (
            status in (
                'PREPARANDO',
                'ENVIANDO',
                'ENVIADO',
                'PARCIAL',
                'ERRO'
            )
        ),

    constraint certidao_mensal_envios_destinatarios_check
        check (
            cardinality(destinatarios)
                between 1 and 10
        ),

    constraint certidao_mensal_envios_copias_check
        check (
            cardinality(copias) <= 10
        ),

    constraint certidao_mensal_envios_escopo_check
        check (
            configuracao_escopo in (
                'GLOBAL',
                'EMPRESA'
            )
        ),

    constraint certidao_mensal_envios_totais_check
        check (
            total_documentos >= 0
            and total_documentos <= 50
            and total_partes >= 0
            and partes_enviadas >= 0
            and partes_enviadas <= total_partes
            and tamanho_total_bytes >= 0
        )
);

create index if not exists
    certidao_mensal_envios_competencia_idx
on public.certidao_mensal_envios (
    competencia_id,
    criado_em desc
);

create index if not exists
    certidao_mensal_envios_empresa_idx
on public.certidao_mensal_envios (
    empresa_id,
    criado_em desc
);

create index if not exists
    certidao_mensal_envios_status_idx
on public.certidao_mensal_envios (
    status,
    criado_em desc
);

alter table public.certidao_mensal_envios
enable row level security;

revoke all
on table public.certidao_mensal_envios
from public, anon, authenticated;

grant select
on table public.certidao_mensal_envios
to authenticated;

grant select, insert, update
on table public.certidao_mensal_envios
to service_role;

create policy
    certidao_mensal_envios_select_escopo_empresa
on public.certidao_mensal_envios
for select
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and
    (
        select public.usuario_tem_acesso_empresa(
            empresa_id
        )
    )
);

-- ============================================================
-- 3. PARTES DE CADA E-MAIL
-- ============================================================

create table if not exists public.certidao_mensal_envio_partes (
    id uuid primary key default extensions.gen_random_uuid(),

    envio_id uuid not null
        references public.certidao_mensal_envios(id)
        on delete cascade,

    numero_parte integer not null,
    total_partes integer not null,

    status text not null default 'PREPARANDO',

    assunto text not null,

    quantidade_documentos integer not null default 0,
    tamanho_anexos_bytes bigint not null default 0,

    provedor_mensagem_id text null,
    mensagem_erro text null,

    iniciado_em timestamptz null,
    enviado_em timestamptz null,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now(),

    constraint certidao_mensal_envio_partes_numero_check
        check (
            numero_parte >= 1
            and total_partes >= 1
            and numero_parte <= total_partes
        ),

    constraint certidao_mensal_envio_partes_status_check
        check (
            status in (
                'PREPARANDO',
                'ENVIANDO',
                'ENVIADO',
                'ERRO'
            )
        ),

    constraint certidao_mensal_envio_partes_documentos_check
        check (
            quantidade_documentos >= 0
            and quantidade_documentos <= 50
            and tamanho_anexos_bytes >= 0
            and tamanho_anexos_bytes <= 18874368
        ),

    constraint certidao_mensal_envio_partes_id_envio_key
        unique (
            id,
            envio_id
        ),

    constraint certidao_mensal_envio_partes_envio_numero_key
        unique (
            envio_id,
            numero_parte
        )
);

create index if not exists
    certidao_mensal_envio_partes_envio_idx
on public.certidao_mensal_envio_partes (
    envio_id,
    numero_parte
);

alter table public.certidao_mensal_envio_partes
enable row level security;

revoke all
on table public.certidao_mensal_envio_partes
from public, anon, authenticated;

grant select
on table public.certidao_mensal_envio_partes
to authenticated;

grant select, insert, update
on table public.certidao_mensal_envio_partes
to service_role;

create policy
    certidao_mensal_envio_partes_select_escopo_empresa
on public.certidao_mensal_envio_partes
for select
to authenticated
using (
    exists (
        select 1
        from public.certidao_mensal_envios envio
        where envio.id =
            certidao_mensal_envio_partes.envio_id
          and (
              select public.usuario_ativo_sistema()
          )
          and (
              select public.usuario_tem_acesso_empresa(
                  envio.empresa_id
              )
          )
    )
);

-- ============================================================
-- 4. DOCUMENTOS E VERSÕES INCLUÍDOS
-- ============================================================

create table if not exists public.certidao_mensal_envio_itens (
    id uuid primary key default extensions.gen_random_uuid(),

    envio_id uuid not null
        references public.certidao_mensal_envios(id)
        on delete cascade,

    competencia_id uuid not null,

    parte_id uuid null,

    item_id uuid not null
        references public.certidao_mensal_itens(id)
        on delete restrict,

    versao_id uuid not null
        references public.certidao_mensal_versoes(id)
        on delete restrict,

    ordem_documento integer not null,

    documento_tipo text not null,
    status_item text not null,
    numero_versao integer not null,

    bucket text not null,
    caminho_storage text not null,
    nome_arquivo text not null,
    tipo_mime text not null,

    tamanho_bytes bigint not null,
    hash_sha256 text null,
    total_paginas integer null,

    criado_em timestamptz not null default now(),

    constraint certidao_mensal_envio_itens_envio_competencia_fkey
        foreign key (
            envio_id,
            competencia_id
        )
        references public.certidao_mensal_envios (
            id,
            competencia_id
        )
        on delete cascade,

    constraint certidao_mensal_envio_itens_item_competencia_fkey
        foreign key (
            item_id,
            competencia_id
        )
        references public.certidao_mensal_itens (
            id,
            competencia_id
        )
        on delete restrict,

    constraint certidao_mensal_envio_itens_versao_item_fkey
        foreign key (
            versao_id,
            item_id
        )
        references public.certidao_mensal_versoes (
            id,
            item_id
        )
        on delete restrict,

    constraint certidao_mensal_envio_itens_parte_envio_fkey
        foreign key (
            parte_id,
            envio_id
        )
        references public.certidao_mensal_envio_partes (
            id,
            envio_id
        )
        on delete restrict,

    constraint certidao_mensal_envio_itens_ordem_check
        check (
            ordem_documento >= 1
            and ordem_documento <= 50
        ),

    constraint certidao_mensal_envio_itens_versao_check
        check (
            numero_versao >= 1
        ),

    constraint certidao_mensal_envio_itens_bucket_check
        check (
            bucket =
                'certidao-mensal-documentos'
        ),

    constraint certidao_mensal_envio_itens_mime_check
        check (
            tipo_mime =
                'application/pdf'
        ),

    constraint certidao_mensal_envio_itens_tamanho_check
        check (
            tamanho_bytes > 0
        ),

    constraint certidao_mensal_envio_itens_paginas_check
        check (
            total_paginas is null
            or total_paginas >= 1
        ),

    constraint certidao_mensal_envio_itens_envio_item_key
        unique (
            envio_id,
            item_id
        ),

    constraint certidao_mensal_envio_itens_envio_versao_key
        unique (
            envio_id,
            versao_id
        )
);

create index if not exists
    certidao_mensal_envio_itens_envio_idx
on public.certidao_mensal_envio_itens (
    envio_id,
    ordem_documento
);

create index if not exists
    certidao_mensal_envio_itens_parte_idx
on public.certidao_mensal_envio_itens (
    parte_id,
    ordem_documento
);

alter table public.certidao_mensal_envio_itens
enable row level security;

revoke all
on table public.certidao_mensal_envio_itens
from public, anon, authenticated;

grant select
on table public.certidao_mensal_envio_itens
to authenticated;

grant select, insert
on table public.certidao_mensal_envio_itens
to service_role;

create policy
    certidao_mensal_envio_itens_select_escopo_empresa
on public.certidao_mensal_envio_itens
for select
to authenticated
using (
    exists (
        select 1
        from public.certidao_mensal_envios envio
        where envio.id =
            certidao_mensal_envio_itens.envio_id
          and (
              select public.usuario_ativo_sistema()
          )
          and (
              select public.usuario_tem_acesso_empresa(
                  envio.empresa_id
              )
          )
    )
);

-- ============================================================
-- 5. ATUALIZAÇÃO AUTOMÁTICA DE TIMESTAMPS
-- ============================================================

create or replace function
public.atualizar_certidao_mensal_email_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
begin
    new.atualizado_em := now();
    return new;
end;
$function$;

revoke all
on function
public.atualizar_certidao_mensal_email_updated_at()
from public, anon, authenticated;

drop trigger if exists
    certidao_mensal_email_config_atualizar_data
on public.certidao_mensal_email_configuracoes;

create trigger
    certidao_mensal_email_config_atualizar_data
before update
on public.certidao_mensal_email_configuracoes
for each row
execute function
public.atualizar_certidao_mensal_email_updated_at();

drop trigger if exists
    certidao_mensal_envios_atualizar_data
on public.certidao_mensal_envios;

create trigger
    certidao_mensal_envios_atualizar_data
before update
on public.certidao_mensal_envios
for each row
execute function
public.atualizar_certidao_mensal_email_updated_at();

drop trigger if exists
    certidao_mensal_envio_partes_atualizar_data
on public.certidao_mensal_envio_partes;

create trigger
    certidao_mensal_envio_partes_atualizar_data
before update
on public.certidao_mensal_envio_partes
for each row
execute function
public.atualizar_certidao_mensal_email_updated_at();

-- ============================================================
-- 6. NORMALIZAÇÃO PRIVADA DE ENDEREÇOS
-- ============================================================

create or replace function
public.normalizar_lista_email_certidao_mensal(
    p_emails text[],
    p_limite integer
)
returns text[]
language plpgsql
immutable
set search_path = pg_catalog
as $function$
declare
    v_emails text[];
    v_email text;
begin
    select coalesce(
        array_agg(
            distinct lower(btrim(valor))
            order by lower(btrim(valor))
        ),
        array[]::text[]
    )
    into v_emails
    from unnest(
        coalesce(
            p_emails,
            array[]::text[]
        )
    ) as entrada(valor)
    where nullif(
        btrim(
            coalesce(
                valor,
                ''
            )
        ),
        ''
    ) is not null;

    if cardinality(v_emails) > p_limite then
        raise exception
            'Quantidade máxima de endereços excedida: %.',
            p_limite
            using errcode = '22023';
    end if;

    foreach v_email in array v_emails
    loop
        if char_length(v_email) > 254
           or v_email !~*
                '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        then
            raise exception
                'Endereço de e-mail inválido: %.',
                v_email
                using errcode = '22023';
        end if;
    end loop;

    return v_emails;
end;
$function$;

revoke all
on function
public.normalizar_lista_email_certidao_mensal(
    text[],
    integer
)
from public, anon, authenticated;

grant execute
on function
public.normalizar_lista_email_certidao_mensal(
    text[],
    integer
)
to service_role;

-- ============================================================
-- 7. LISTAGEM ADMINISTRATIVA
-- ============================================================

create or replace function
public.admin_listar_configuracoes_email_certidao_mensal()
returns table (
    id uuid,
    escopo text,
    empresa_id uuid,
    ativo boolean,
    usar_email_empresa boolean,
    destinatarios text[],
    copias text[],
    responder_para text,
    nome_remetente text,
    assunto_modelo text,
    corpo_modelo text,
    anexar_pdfs boolean,
    estrategia_excedente text,
    limite_mensagem_bytes bigint,
    versao integer,
    atualizado_em timestamptz,
    atualizado_por uuid
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
    if not public.usuario_pode_gerenciar_modelos_email_sst() then
        raise exception
            'Sem permissão para consultar configurações de envio da Certidão Mensal.'
            using errcode = '42501';
    end if;

    return query
    select
        config.id,
        config.escopo,
        config.empresa_id,
        config.ativo,
        config.usar_email_empresa,
        config.destinatarios,
        config.copias,
        config.responder_para,
        config.nome_remetente,
        config.assunto_modelo,
        config.corpo_modelo,
        config.anexar_pdfs,
        config.estrategia_excedente,
        config.limite_mensagem_bytes,
        config.versao,
        config.atualizado_em,
        config.atualizado_por
    from public.certidao_mensal_email_configuracoes config
    order by
        case
            when config.escopo = 'GLOBAL'
                then 1
            else 2
        end,
        config.empresa_id nulls first;
end;
$function$;

revoke all
on function
public.admin_listar_configuracoes_email_certidao_mensal()
from public, anon, authenticated;

grant execute
on function
public.admin_listar_configuracoes_email_certidao_mensal()
to authenticated, service_role;

-- ============================================================
-- 8. SALVAMENTO ADMINISTRATIVO
-- ============================================================

create or replace function
public.admin_salvar_configuracao_email_certidao_mensal(
    p_empresa_id uuid default null,
    p_ativo boolean default false,
    p_usar_email_empresa boolean default true,
    p_destinatarios text[] default array[]::text[],
    p_copias text[] default array[]::text[],
    p_responder_para text default null,
    p_nome_remetente text default 'SafeScan Brasil',
    p_assunto_modelo text default
        'Documentação mensal — {{empresa_nome}} — {{competencia}}',
    p_corpo_modelo text default
        E'{{saudacao}},\n\nSegue a documentação mensal da empresa {{empresa_nome}}, referente à competência {{competencia}}.\n\n{{resumo}}\n\n{{itens}}',
    p_anexar_pdfs boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_escopo text;
    v_destinatarios text[];
    v_copias text[];
    v_responder_para text;
    v_nome_remetente text;
    v_assunto_modelo text;
    v_corpo_modelo text;

    v_config
        public.certidao_mensal_email_configuracoes%rowtype;
begin
    if not public.usuario_pode_gerenciar_modelos_email_sst() then
        raise exception
            'Sem permissão para alterar configurações de envio da Certidão Mensal.'
            using errcode = '42501';
    end if;

    v_escopo :=
        case
            when p_empresa_id is null
                then 'GLOBAL'
            else 'EMPRESA'
        end;

    if p_empresa_id is not null
       and not exists (
           select 1
           from public.empresas empresa
           where empresa.id = p_empresa_id
       )
    then
        raise exception
            'Empresa não localizada para configuração de envio.'
            using errcode = 'P0002';
    end if;

    v_destinatarios :=
        public.normalizar_lista_email_certidao_mensal(
            p_destinatarios,
            10
        );

    v_copias :=
        public.normalizar_lista_email_certidao_mensal(
            p_copias,
            10
        );

    v_responder_para :=
        nullif(
            lower(
                btrim(
                    coalesce(
                        p_responder_para,
                        ''
                    )
                )
            ),
            ''
        );

    if v_responder_para is not null
       and (
           char_length(v_responder_para) > 254
           or v_responder_para !~*
                '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       )
    then
        raise exception
            'O endereço de resposta é inválido.'
            using errcode = '22023';
    end if;

    v_nome_remetente :=
        btrim(
            coalesce(
                p_nome_remetente,
                ''
            )
        );

    v_assunto_modelo :=
        btrim(
            coalesce(
                p_assunto_modelo,
                ''
            )
        );

    v_corpo_modelo :=
        btrim(
            coalesce(
                p_corpo_modelo,
                ''
            )
        );

    if char_length(v_nome_remetente)
        not between 1 and 120
       or position(E'\n' in v_nome_remetente) > 0
       or position(E'\r' in v_nome_remetente) > 0
    then
        raise exception
            'O nome do remetente é inválido.'
            using errcode = '22023';
    end if;

    if char_length(v_assunto_modelo)
        not between 1 and 180
       or position(E'\n' in v_assunto_modelo) > 0
       or position(E'\r' in v_assunto_modelo) > 0
    then
        raise exception
            'O assunto do e-mail é inválido.'
            using errcode = '22023';
    end if;

    if char_length(v_corpo_modelo)
        not between 1 and 10000
       or v_corpo_modelo !~*
            '\{\{\s*itens\s*\}\}'
    then
        raise exception
            'O corpo do e-mail é inválido ou não contém {{itens}}.'
            using errcode = '22023';
    end if;

    if coalesce(p_ativo, false)
       and not coalesce(p_usar_email_empresa, true)
       and cardinality(v_destinatarios) = 0
    then
        raise exception
            'A configuração ativa precisa de ao menos um destinatário.'
            using errcode = '22023';
    end if;

    select config.*
    into v_config
    from public.certidao_mensal_email_configuracoes config
    where (
        v_escopo = 'GLOBAL'
        and config.escopo = 'GLOBAL'
        and config.empresa_id is null
    )
    or (
        v_escopo = 'EMPRESA'
        and config.escopo = 'EMPRESA'
        and config.empresa_id = p_empresa_id
    )
    limit 1
    for update;

    if found then
        update public.certidao_mensal_email_configuracoes
        set
            ativo =
                coalesce(
                    p_ativo,
                    false
                ),
            usar_email_empresa =
                coalesce(
                    p_usar_email_empresa,
                    true
                ),
            destinatarios =
                v_destinatarios,
            copias =
                v_copias,
            responder_para =
                v_responder_para,
            nome_remetente =
                v_nome_remetente,
            assunto_modelo =
                v_assunto_modelo,
            corpo_modelo =
                v_corpo_modelo,
            anexar_pdfs =
                coalesce(
                    p_anexar_pdfs,
                    true
                ),
            estrategia_excedente =
                'DIVIDIR_EM_PARTES',
            limite_mensagem_bytes =
                18874368,
            versao =
                versao + 1,
            atualizado_por =
                auth.uid()
        where id = v_config.id
        returning *
        into v_config;
    else
        insert into public.certidao_mensal_email_configuracoes (
            escopo,
            empresa_id,
            ativo,
            usar_email_empresa,
            destinatarios,
            copias,
            responder_para,
            nome_remetente,
            assunto_modelo,
            corpo_modelo,
            anexar_pdfs,
            estrategia_excedente,
            limite_mensagem_bytes,
            criado_por,
            atualizado_por
        )
        values (
            v_escopo,
            p_empresa_id,
            coalesce(
                p_ativo,
                false
            ),
            coalesce(
                p_usar_email_empresa,
                true
            ),
            v_destinatarios,
            v_copias,
            v_responder_para,
            v_nome_remetente,
            v_assunto_modelo,
            v_corpo_modelo,
            coalesce(
                p_anexar_pdfs,
                true
            ),
            'DIVIDIR_EM_PARTES',
            18874368,
            auth.uid(),
            auth.uid()
        )
        returning *
        into v_config;
    end if;

    return to_jsonb(v_config);
end;
$function$;

revoke all
on function
public.admin_salvar_configuracao_email_certidao_mensal(
    uuid,
    boolean,
    boolean,
    text[],
    text[],
    text,
    text,
    text,
    text,
    boolean
)
from public, anon, authenticated;

grant execute
on function
public.admin_salvar_configuracao_email_certidao_mensal(
    uuid,
    boolean,
    boolean,
    text[],
    text[],
    text,
    text,
    text,
    text,
    boolean
)
to authenticated, service_role;

-- ============================================================
-- 9. EXCLUSÃO DE SUBSTITUIÇÃO ESPECÍFICA
-- ============================================================

create or replace function
public.admin_excluir_configuracao_email_certidao_mensal(
    p_empresa_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_excluida boolean;
begin
    if not public.usuario_pode_gerenciar_modelos_email_sst() then
        raise exception
            'Sem permissão para excluir configurações de envio da Certidão Mensal.'
            using errcode = '42501';
    end if;

    if p_empresa_id is null then
        raise exception
            'A configuração global não pode ser excluída.'
            using errcode = '22023';
    end if;

    delete
    from public.certidao_mensal_email_configuracoes config
    where config.escopo = 'EMPRESA'
      and config.empresa_id = p_empresa_id;

    v_excluida := found;

    return v_excluida;
end;
$function$;

revoke all
on function
public.admin_excluir_configuracao_email_certidao_mensal(uuid)
from public, anon, authenticated;

grant execute
on function
public.admin_excluir_configuracao_email_certidao_mensal(uuid)
to authenticated, service_role;

-- ============================================================
-- 10. RESOLUÇÃO OPERACIONAL PARA A EDGE FUNCTION
-- ============================================================

create or replace function
public.obter_configuracao_email_certidao_mensal_para_envio(
    p_empresa_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
    v_config
        public.certidao_mensal_email_configuracoes%rowtype;
begin
    if p_empresa_id is null then
        return null;
    end if;

    select config.*
    into v_config
    from public.certidao_mensal_email_configuracoes config
    where config.escopo = 'EMPRESA'
      and config.empresa_id = p_empresa_id
    limit 1;

    if not found then
        select config.*
        into v_config
        from public.certidao_mensal_email_configuracoes config
        where config.escopo = 'GLOBAL'
          and config.empresa_id is null
        limit 1;
    end if;

    if not found then
        return null;
    end if;

    return jsonb_build_object(
        'id',
            v_config.id,
        'escopo',
            v_config.escopo,
        'empresaId',
            v_config.empresa_id,
        'ativo',
            v_config.ativo,
        'usarEmailEmpresa',
            v_config.usar_email_empresa,
        'destinatarios',
            v_config.destinatarios,
        'copias',
            v_config.copias,
        'responderPara',
            v_config.responder_para,
        'nomeRemetente',
            v_config.nome_remetente,
        'assuntoModelo',
            v_config.assunto_modelo,
        'corpoModelo',
            v_config.corpo_modelo,
        'anexarPdfs',
            v_config.anexar_pdfs,
        'estrategiaExcedente',
            v_config.estrategia_excedente,
        'limiteMensagemBytes',
            v_config.limite_mensagem_bytes,
        'versao',
            v_config.versao
    );
end;
$function$;

revoke all
on function
public.obter_configuracao_email_certidao_mensal_para_envio(uuid)
from public, anon, authenticated;

grant execute
on function
public.obter_configuracao_email_certidao_mensal_para_envio(uuid)
to service_role;

-- ============================================================
-- 11. CONFIGURAÇÃO GLOBAL INICIAL, INATIVA
-- ============================================================

insert into public.certidao_mensal_email_configuracoes (
    escopo,
    empresa_id,
    ativo,
    usar_email_empresa,
    destinatarios,
    copias,
    responder_para,
    nome_remetente,
    assunto_modelo,
    corpo_modelo,
    anexar_pdfs,
    estrategia_excedente,
    limite_mensagem_bytes
)
select
    'GLOBAL',
    null,
    false,
    true,
    array[]::text[],
    array[]::text[],
    null,
    'SafeScan Brasil',
    'Documentação mensal — {{empresa_nome}} — {{competencia}}',
    E'{{saudacao}},\n\nSegue a documentação mensal da empresa {{empresa_nome}}, referente à competência {{competencia}}.\n\n{{resumo}}\n\n{{itens}}',
    true,
    'DIVIDIR_EM_PARTES',
    18874368
where not exists (
    select 1
    from public.certidao_mensal_email_configuracoes config
    where config.escopo = 'GLOBAL'
      and config.empresa_id is null
);

comment on table
public.certidao_mensal_email_configuracoes
is
'Configuração privada do envio consolidado da Certidão Mensal, global ou específica por empresa.';

comment on table
public.certidao_mensal_envios
is
'Uma tentativa consolidada de envio documental por empresa e competência.';

comment on table
public.certidao_mensal_envio_partes
is
'Partes SMTP produzidas quando o conjunto documental ultrapassa o limite por mensagem.';

comment on table
public.certidao_mensal_envio_itens
is
'Fotografia imutável dos documentos e versões incluídos em cada tentativa de envio.';

notify pgrst, 'reload schema';

commit;
