begin;

do $preflight$
begin
    if to_regclass('public.tenants') is null then
        raise exception 'B2A preflight: public.tenants ausente.';
    end if;

    if to_regclass('public.empresas') is null then
        raise exception 'B2A preflight: public.empresas ausente.';
    end if;

    if to_regclass('public.tenant_branding') is null then
        raise exception 'B2A preflight: public.tenant_branding ausente.';
    end if;

    if to_regclass('public.tenant_domains') is null then
        raise exception 'B2A preflight: public.tenant_domains ausente.';
    end if;

    if to_regprocedure('public.usuario_admin_global()') is null then
        raise exception 'B2A preflight: public.usuario_admin_global() ausente.';
    end if;

    if to_regclass('public.tenant_billing_config') is not null then
        raise exception 'B2A preflight: tenant_billing_config ja existe.';
    end if;

    if to_regclass('public.tenant_billing_usage_monthly') is not null then
        raise exception 'B2A preflight: tenant_billing_usage_monthly ja existe.';
    end if;

    if exists (
        select 1
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname = 'admin_provisionar_tenant_onboarding_completo'
    ) then
        raise exception 'B2A preflight: admin_provisionar_tenant_onboarding_completo ja existe.';
    end if;

    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'empresas'
          and column_name in (
              'razao_social',
              'cep',
              'logradouro',
              'numero_endereco',
              'complemento',
              'bairro',
              'cidade',
              'uf',
              'cnpj_situacao_cadastral',
              'cnpj_validado_em',
              'cnpj_validacao_fonte',
              'cnpj_validacao_snapshot'
          )
    ) then
        raise exception 'B2A preflight: uma ou mais colunas novas de empresas ja existem.';
    end if;
end;
$preflight$;

alter table public.empresas
    add column razao_social text,
    add column cep text,
    add column logradouro text,
    add column numero_endereco text,
    add column complemento text,
    add column bairro text,
    add column cidade text,
    add column uf text,
    add column cnpj_situacao_cadastral text,
    add column cnpj_validado_em timestamptz,
    add column cnpj_validacao_fonte text,
    add column cnpj_validacao_snapshot jsonb;

alter table public.empresas
    add constraint empresas_cep_formato_check
        check (
            cep is null
            or cep ~ '^[0-9]{8}$'
        ),
    add constraint empresas_uf_formato_check
        check (
            uf is null
            or uf ~ '^[A-Z]{2}$'
        ),
    add constraint empresas_cnpj_validacao_coerente_check
        check (
            (
                cnpj_validado_em is null
                and cnpj_situacao_cadastral is null
                and cnpj_validacao_fonte is null
                and cnpj_validacao_snapshot is null
            )
            or
            (
                cnpj_validado_em is not null
                and nullif(btrim(cnpj_situacao_cadastral), '') is not null
                and nullif(btrim(cnpj_validacao_fonte), '') is not null
                and cnpj_validacao_snapshot is not null
                and jsonb_typeof(cnpj_validacao_snapshot) = 'object'
            )
        );

comment on column public.empresas.razao_social is
    'Razao social confirmada no onboarding administrativo do tenant.';

comment on column public.empresas.cep is
    'CEP cadastral da empresa com 8 digitos.';

comment on column public.empresas.logradouro is
    'Logradouro cadastral da empresa.';

comment on column public.empresas.numero_endereco is
    'Numero do endereco empresarial ou S/N.';

comment on column public.empresas.complemento is
    'Complemento opcional do endereco empresarial.';

comment on column public.empresas.bairro is
    'Bairro do endereco empresarial.';

comment on column public.empresas.cidade is
    'Cidade do endereco empresarial.';

comment on column public.empresas.uf is
    'UF do endereco empresarial com duas letras maiusculas.';

comment on column public.empresas.cnpj_situacao_cadastral is
    'Situacao cadastral observada na consulta publica usada no onboarding.';

comment on column public.empresas.cnpj_validado_em is
    'Momento em que o SafeScan aceitou a evidencia cadastral do CNPJ no onboarding.';

comment on column public.empresas.cnpj_validacao_fonte is
    'Fonte declarada da consulta cadastral do CNPJ.';

comment on column public.empresas.cnpj_validacao_snapshot is
    'Snapshot JSON da evidencia de consulta cadastral recebida no onboarding.';

create table public.tenant_billing_config (
    tenant_id uuid primary key
        references public.tenants(id)
        on delete cascade,

    modelo_cobranca text not null
        default 'base_mais_colaborador',

    valor_base_centavos bigint not null
        default 0,

    valor_colaborador_centavos bigint not null
        default 0,

    colaboradores_incluidos integer not null
        default 0,

    armazenamento_incluido_gb numeric(12,3) not null
        default 0,

    valor_gb_excedente_centavos bigint not null
        default 0,

    dia_fechamento integer not null
        default 25,

    dia_vencimento integer not null
        default 10,

    inicio_vigencia date not null,

    fim_vigencia date,

    contato_financeiro_nome text not null,

    contato_financeiro_email text not null,

    contato_financeiro_telefone text,

    status text not null
        default 'ativo',

    versao_preco integer not null
        default 1,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    created_by uuid
        references auth.users(id)
        on delete set null,

    updated_by uuid
        references auth.users(id)
        on delete set null,

    constraint tenant_billing_config_modelo_check
        check (
            modelo_cobranca in (
                'mensalidade_fixa',
                'por_colaborador',
                'base_mais_colaborador'
            )
        ),

    constraint tenant_billing_config_valores_check
        check (
            valor_base_centavos >= 0
            and valor_colaborador_centavos >= 0
            and colaboradores_incluidos >= 0
            and armazenamento_incluido_gb >= 0
            and valor_gb_excedente_centavos >= 0
        ),

    constraint tenant_billing_config_dia_fechamento_check
        check (
            dia_fechamento between 1 and 28
        ),

    constraint tenant_billing_config_dia_vencimento_check
        check (
            dia_vencimento between 1 and 28
        ),

    constraint tenant_billing_config_status_check
        check (
            status in (
                'ativo',
                'inativo'
            )
        ),

    constraint tenant_billing_config_vigencia_check
        check (
            fim_vigencia is null
            or fim_vigencia >= inicio_vigencia
        ),

    constraint tenant_billing_config_versao_check
        check (
            versao_preco >= 1
        )
);

comment on table public.tenant_billing_config is
    'Configuracao comercial 1:1 do tenant. Nao representa fatura nem recebimento.';

comment on column public.tenant_billing_config.valor_colaborador_centavos is
    'Valor unitario por colaborador faturavel.';

comment on column public.tenant_billing_config.colaboradores_incluidos is
    'Quantidade de colaboradores incluida no valor base antes da parcela variavel.';

comment on column public.tenant_billing_config.armazenamento_incluido_gb is
    'Franquia contratada de armazenamento em GB.';

create table public.tenant_billing_usage_monthly (
    tenant_id uuid not null
        references public.tenants(id)
        on delete cascade,

    competencia date not null,

    colaboradores_faturaveis integer not null,

    colaboradores_incluidos integer not null,

    colaboradores_cobrados integer not null,

    valor_base_centavos bigint not null,

    valor_colaborador_centavos bigint not null,

    valor_variavel_centavos bigint not null,

    armazenamento_utilizado_bytes bigint not null
        default 0,

    armazenamento_incluido_gb numeric(12,3) not null
        default 0,

    valor_gb_excedente_centavos bigint not null
        default 0,

    valor_armazenamento_excedente_centavos bigint not null
        default 0,

    valor_total_centavos bigint not null,

    versao_preco integer not null,

    origem text not null
        default 'fechamento_mensal',

    fechado_em timestamptz not null
        default now(),

    fechado_por uuid
        references auth.users(id)
        on delete set null,

    created_at timestamptz not null
        default now(),

    primary key (
        tenant_id,
        competencia
    ),

    constraint tenant_billing_usage_competencia_check
        check (
            extract(day from competencia) = 1
        ),

    constraint tenant_billing_usage_quantidades_check
        check (
            colaboradores_faturaveis >= 0
            and colaboradores_incluidos >= 0
            and colaboradores_cobrados >= 0
            and colaboradores_cobrados <= colaboradores_faturaveis
        ),

    constraint tenant_billing_usage_valores_check
        check (
            valor_base_centavos >= 0
            and valor_colaborador_centavos >= 0
            and valor_variavel_centavos >= 0
            and armazenamento_utilizado_bytes >= 0
            and armazenamento_incluido_gb >= 0
            and valor_gb_excedente_centavos >= 0
            and valor_armazenamento_excedente_centavos >= 0
            and valor_total_centavos >= 0
        ),

    constraint tenant_billing_usage_versao_check
        check (
            versao_preco >= 1
        )
);

comment on table public.tenant_billing_usage_monthly is
    'Snapshot mensal imutavel da metrica faturavel do tenant. Nao representa pagamento.';

alter table public.tenant_billing_config
    enable row level security;

alter table public.tenant_billing_usage_monthly
    enable row level security;

create policy tenant_billing_config_select_admin_global
on public.tenant_billing_config
for select
to authenticated
using (
    (select auth.uid()) is not null
    and (select public.usuario_admin_global())
);

create policy tenant_billing_config_insert_admin_global
on public.tenant_billing_config
for insert
to authenticated
with check (
    (select auth.uid()) is not null
    and (select public.usuario_admin_global())
);

create policy tenant_billing_config_update_admin_global
on public.tenant_billing_config
for update
to authenticated
using (
    (select auth.uid()) is not null
    and (select public.usuario_admin_global())
)
with check (
    (select auth.uid()) is not null
    and (select public.usuario_admin_global())
);

create policy tenant_billing_usage_select_admin_global
on public.tenant_billing_usage_monthly
for select
to authenticated
using (
    (select auth.uid()) is not null
    and (select public.usuario_admin_global())
);

create policy tenant_billing_usage_insert_admin_global
on public.tenant_billing_usage_monthly
for insert
to authenticated
with check (
    (select auth.uid()) is not null
    and (select public.usuario_admin_global())
);

create function public.tenant_billing_config_touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
begin
    new.updated_at := clock_timestamp();

    if auth.uid() is not null then
        new.updated_by := auth.uid();
    end if;

    return new;
end;
$function$;

create trigger tenant_billing_config_touch_updated_at
before update
on public.tenant_billing_config
for each row
execute function public.tenant_billing_config_touch_updated_at();

create function public.admin_provisionar_tenant_onboarding_completo(
    p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_nome_tenant text;
    v_slug text;
    v_hostname text;

    v_empresa_nome text;
    v_razao_social text;
    v_cnpj text;
    v_responsavel text;
    v_email text;
    v_telefone text;
    v_empresa_tipo text;
    v_cep text;
    v_logradouro text;
    v_numero_endereco text;
    v_complemento text;
    v_bairro text;
    v_cidade text;
    v_uf text;

    v_cnpj_validacao jsonb;
    v_cnpj_validacao_cnpj text;
    v_cnpj_situacao text;
    v_cnpj_fonte text;
    v_cnpj_consultado_em timestamptz;

    v_modelo_cobranca text;
    v_valor_base_centavos bigint;
    v_valor_colaborador_centavos bigint;
    v_colaboradores_incluidos integer;
    v_armazenamento_incluido_gb numeric(12,3);
    v_valor_gb_excedente_centavos bigint;
    v_dia_fechamento integer;
    v_dia_vencimento integer;
    v_inicio_vigencia date;
    v_contato_financeiro_nome text;
    v_contato_financeiro_email text;
    v_contato_financeiro_telefone text;

    v_tenant_id uuid;
    v_empresa_id uuid;
    v_dominio_id uuid;

    v_base12 text;
    v_base13 text;
    v_soma integer;
    v_resto integer;
    v_digito1 integer;
    v_digito2 integer;
    v_i integer;

    v_pesos1 integer[] :=
        array[
            5,4,3,2,9,8,7,6,5,4,3,2
        ];

    v_pesos2 integer[] :=
        array[
            6,5,4,3,2,9,8,7,6,5,4,3,2
        ];
begin
    if auth.uid() is null
       or not public.usuario_admin_global() then
        raise exception using
            errcode = '42501',
            message =
                'Onboarding completo restrito ao administrador global SafeScan.';
    end if;

    if p_payload is null
       or jsonb_typeof(p_payload) <> 'object' then
        raise exception
            'Payload do onboarding deve ser um objeto JSON.';
    end if;

    if jsonb_typeof(
        coalesce(
            p_payload -> 'empresa',
            '{}'::jsonb
        )
    ) <> 'object' then
        raise exception
            'Bloco empresa do onboarding invalido.';
    end if;

    if jsonb_typeof(
        coalesce(
            p_payload -> 'cnpjValidacao',
            '{}'::jsonb
        )
    ) <> 'object' then
        raise exception
            'Bloco cnpjValidacao do onboarding invalido.';
    end if;

    if jsonb_typeof(
        coalesce(
            p_payload -> 'comercial',
            '{}'::jsonb
        )
    ) <> 'object' then
        raise exception
            'Bloco comercial do onboarding invalido.';
    end if;

    v_nome_tenant :=
        btrim(
            coalesce(
                p_payload ->> 'nomeTenant',
                ''
            )
        );

    v_slug :=
        lower(
            btrim(
                coalesce(
                    p_payload ->> 'slug',
                    ''
                )
            )
        );

    if char_length(v_nome_tenant)
       not between 2 and 160 then
        raise exception
            'Nome do cliente deve possuir entre 2 e 160 caracteres.';
    end if;

    if char_length(v_slug)
       not between 2 and 63
       or v_slug
       !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' then
        raise exception
            'Slug do cliente invalido.';
    end if;

    if v_slug = any(
        array[
            'www',
            'app',
            'admin',
            'api',
            'qr',
            'status',
            'assets',
            'static',
            'auth'
        ]::text[]
    ) then
        raise exception
            'Slug reservado pela plataforma SafeScan: %.',
            v_slug;
    end if;

    v_hostname :=
        v_slug ||
        '.safescanbrasil.com.br';

    if nullif(
        btrim(
            coalesce(
                p_payload ->> 'hostname',
                ''
            )
        ),
        ''
    ) is not null
    and lower(
        btrim(
            p_payload ->> 'hostname'
        )
    ) <> v_hostname then
        raise exception
            'Hostname divergente. Esperado: %.',
            v_hostname;
    end if;

    if exists (
        select 1
        from public.tenants t
        where t.slug =
            v_slug
    ) then
        raise exception using
            errcode = '23505',
            message =
                format(
                    'Ja existe tenant com o slug %s.',
                    v_slug
                );
    end if;

    if exists (
        select 1
        from public.tenant_domains d
        where d.hostname =
            v_hostname
    ) then
        raise exception using
            errcode = '23505',
            message =
                format(
                    'Hostname %s ja esta associado a um tenant.',
                    v_hostname
                );
    end if;

    v_empresa_nome :=
        btrim(
            coalesce(
                p_payload #>>
                    '{empresa,nome}',
                ''
            )
        );

    v_razao_social :=
        btrim(
            coalesce(
                p_payload #>>
                    '{empresa,razaoSocial}',
                ''
            )
        );

    v_cnpj :=
        regexp_replace(
            coalesce(
                p_payload #>>
                    '{empresa,cnpj}',
                ''
            ),
            '[^0-9]',
            '',
            'g'
        );

    v_responsavel :=
        btrim(
            coalesce(
                p_payload #>>
                    '{empresa,responsavel}',
                ''
            )
        );

    v_email :=
        lower(
            btrim(
                coalesce(
                    p_payload #>>
                        '{empresa,email}',
                    ''
                )
            )
        );

    v_telefone :=
        regexp_replace(
            coalesce(
                p_payload #>>
                    '{empresa,telefone}',
                ''
            ),
            '[^0-9]',
            '',
            'g'
        );

    v_empresa_tipo :=
        case lower(
            btrim(
                coalesce(
                    p_payload #>>
                        '{empresa,tipo}',
                    ''
                )
            )
        )
            when 'contratante'
                then 'Contratante'

            when 'terceirizada'
                then 'Terceirizada'

            when 'subcontratada'
                then 'Subcontratada'

            else null
        end;

    v_cep :=
        regexp_replace(
            coalesce(
                p_payload #>>
                    '{empresa,cep}',
                ''
            ),
            '[^0-9]',
            '',
            'g'
        );

    v_logradouro :=
        btrim(
            coalesce(
                p_payload #>>
                    '{empresa,logradouro}',
                ''
            )
        );

    v_numero_endereco :=
        btrim(
            coalesce(
                p_payload #>>
                    '{empresa,numeroEndereco}',
                ''
            )
        );

    v_complemento :=
        nullif(
            btrim(
                coalesce(
                    p_payload #>>
                        '{empresa,complemento}',
                    ''
                )
            ),
            ''
        );

    v_bairro :=
        btrim(
            coalesce(
                p_payload #>>
                    '{empresa,bairro}',
                ''
            )
        );

    v_cidade :=
        btrim(
            coalesce(
                p_payload #>>
                    '{empresa,cidade}',
                ''
            )
        );

    v_uf :=
        upper(
            btrim(
                coalesce(
                    p_payload #>>
                        '{empresa,uf}',
                    ''
                )
            )
        );

    if char_length(v_empresa_nome)
       not between 2 and 160 then
        raise exception
            'Nome fantasia deve possuir entre 2 e 160 caracteres.';
    end if;

    if char_length(v_razao_social)
       not between 2 and 200 then
        raise exception
            'Razao social deve possuir entre 2 e 200 caracteres.';
    end if;

    if v_empresa_tipo is null then
        raise exception
            'Tipo da empresa invalido.';
    end if;

    if char_length(v_cnpj) <> 14
       or v_cnpj !~ '^[0-9]{14}$'
       or v_cnpj =
            repeat(
                substr(
                    v_cnpj,
                    1,
                    1
                ),
                14
            ) then
        raise exception
            'CNPJ invalido.';
    end if;

    v_base12 :=
        substr(
            v_cnpj,
            1,
            12
        );

    v_soma :=
        0;

    for v_i in 1..12 loop
        v_soma :=
            v_soma
            + (
                substr(
                    v_base12,
                    v_i,
                    1
                )::integer
                *
                v_pesos1[v_i]
            );
    end loop;

    v_resto :=
        v_soma % 11;

    v_digito1 :=
        case
            when v_resto < 2
                then 0
            else
                11 - v_resto
        end;

    v_base13 :=
        v_base12 ||
        v_digito1::text;

    v_soma :=
        0;

    for v_i in 1..13 loop
        v_soma :=
            v_soma
            + (
                substr(
                    v_base13,
                    v_i,
                    1
                )::integer
                *
                v_pesos2[v_i]
            );
    end loop;

    v_resto :=
        v_soma % 11;

    v_digito2 :=
        case
            when v_resto < 2
                then 0
            else
                11 - v_resto
        end;

    if substr(
        v_cnpj,
        13,
        2
    ) <> (
        v_digito1::text ||
        v_digito2::text
    ) then
        raise exception
            'CNPJ invalido pelos digitos verificadores.';
    end if;

    if char_length(v_responsavel) < 2 then
        raise exception
            'Responsavel pela empresa obrigatorio.';
    end if;

    if v_email
       !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
        raise exception
            'E-mail empresarial invalido.';
    end if;

    if char_length(v_telefone)
       not between 10 and 11
       or v_telefone =
            repeat(
                substr(
                    v_telefone,
                    1,
                    1
                ),
                char_length(
                    v_telefone
                )
            ) then
        raise exception
            'Telefone empresarial invalido.';
    end if;

    if char_length(v_cep) <> 8 then
        raise exception
            'CEP deve possuir 8 digitos.';
    end if;

    if char_length(v_logradouro) < 2 then
        raise exception
            'Logradouro obrigatorio.';
    end if;

    if char_length(v_numero_endereco) < 1 then
        raise exception
            'Numero do endereco obrigatorio.';
    end if;

    if char_length(v_bairro) < 2 then
        raise exception
            'Bairro obrigatorio.';
    end if;

    if char_length(v_cidade) < 2 then
        raise exception
            'Cidade obrigatoria.';
    end if;

    if v_uf
       !~ '^[A-Z]{2}$' then
        raise exception
            'UF invalida.';
    end if;

    v_cnpj_validacao :=
        p_payload ->
        'cnpjValidacao';

    v_cnpj_validacao_cnpj :=
        regexp_replace(
            coalesce(
                v_cnpj_validacao ->
                    'cnpj' ->> 0,
                v_cnpj_validacao ->>
                    'cnpj',
                ''
            ),
            '[^0-9]',
            '',
            'g'
        );

    v_cnpj_validacao_cnpj :=
        regexp_replace(
            coalesce(
                v_cnpj_validacao ->>
                    'cnpj',
                ''
            ),
            '[^0-9]',
            '',
            'g'
        );

    v_cnpj_situacao :=
        upper(
            btrim(
                coalesce(
                    v_cnpj_validacao ->>
                        'situacaoCadastral',
                    ''
                )
            )
        );

    v_cnpj_fonte :=
        btrim(
            coalesce(
                v_cnpj_validacao ->>
                    'fonte',
                ''
            )
        );

    if v_cnpj_validacao_cnpj
       <> v_cnpj then
        raise exception
            'Evidencia cadastral pertence a CNPJ diferente do informado.';
    end if;

    if v_cnpj_situacao
       <> 'ATIVA' then
        raise exception
            'Onboarding exige CNPJ com situacao cadastral ATIVA. Situacao recebida: %.',
            coalesce(
                nullif(
                    v_cnpj_situacao,
                    ''
                ),
                'NAO INFORMADA'
            );
    end if;

    if char_length(v_cnpj_fonte)
       not between 2 and 160 then
        raise exception
            'Fonte de validacao do CNPJ invalida.';
    end if;

    begin
        v_cnpj_consultado_em :=
            (
                v_cnpj_validacao ->>
                'consultadoEm'
            )::timestamptz;
    exception
        when others then
            raise exception
                'Data da consulta cadastral do CNPJ invalida.';
    end;

    if v_cnpj_consultado_em
       < clock_timestamp()
            - interval '24 hours'
       or v_cnpj_consultado_em
       > clock_timestamp()
            + interval '5 minutes' then
        raise exception
            'Consulta cadastral do CNPJ precisa ter sido realizada nas ultimas 24 horas.';
    end if;

    v_modelo_cobranca :=
        lower(
            btrim(
                coalesce(
                    p_payload #>>
                        '{comercial,modeloCobranca}',
                    ''
                )
            )
        );

    if v_modelo_cobranca
       not in (
            'mensalidade_fixa',
            'por_colaborador',
            'base_mais_colaborador'
       ) then
        raise exception
            'Modelo de cobranca invalido.';
    end if;

    begin
        v_valor_base_centavos :=
            coalesce(
                nullif(
                    p_payload #>>
                        '{comercial,valorBaseCentavos}',
                    ''
                ),
                '0'
            )::bigint;

        v_valor_colaborador_centavos :=
            coalesce(
                nullif(
                    p_payload #>>
                        '{comercial,valorColaboradorCentavos}',
                    ''
                ),
                '0'
            )::bigint;

        v_colaboradores_incluidos :=
            coalesce(
                nullif(
                    p_payload #>>
                        '{comercial,colaboradoresIncluidos}',
                    ''
                ),
                '0'
            )::integer;

        v_armazenamento_incluido_gb :=
            coalesce(
                nullif(
                    p_payload #>>
                        '{comercial,armazenamentoIncluidoGb}',
                    ''
                ),
                '0'
            )::numeric(12,3);

        v_valor_gb_excedente_centavos :=
            coalesce(
                nullif(
                    p_payload #>>
                        '{comercial,valorGbExcedenteCentavos}',
                    ''
                ),
                '0'
            )::bigint;

        v_dia_fechamento :=
            coalesce(
                nullif(
                    p_payload #>>
                        '{comercial,diaFechamento}',
                    ''
                ),
                '25'
            )::integer;

        v_dia_vencimento :=
            coalesce(
                nullif(
                    p_payload #>>
                        '{comercial,diaVencimento}',
                    ''
                ),
                '10'
            )::integer;

        v_inicio_vigencia :=
            (
                p_payload #>>
                    '{comercial,inicioVigencia}'
            )::date;
    exception
        when others then
            raise exception
                'Configuracao numerica/data do plano comercial invalida.';
    end;

    v_contato_financeiro_nome :=
        btrim(
            coalesce(
                p_payload #>>
                    '{comercial,financeiroNome}',
                ''
            )
        );

    v_contato_financeiro_email :=
        lower(
            btrim(
                coalesce(
                    p_payload #>>
                        '{comercial,financeiroEmail}',
                    ''
                )
            )
        );

    v_contato_financeiro_telefone :=
        regexp_replace(
            coalesce(
                p_payload #>>
                    '{comercial,financeiroTelefone}',
                ''
            ),
            '[^0-9]',
            '',
            'g'
        );

    if v_valor_base_centavos < 0
       or v_valor_colaborador_centavos < 0
       or v_colaboradores_incluidos < 0
       or v_armazenamento_incluido_gb < 0
       or v_valor_gb_excedente_centavos < 0 then
        raise exception
            'Valores comerciais nao podem ser negativos.';
    end if;

    if v_modelo_cobranca =
       'mensalidade_fixa' then

        if v_valor_base_centavos <= 0 then
            raise exception
                'Mensalidade fixa exige valor base maior que zero.';
        end if;

        v_valor_colaborador_centavos :=
            0;

        v_colaboradores_incluidos :=
            0;

    elsif v_modelo_cobranca =
          'por_colaborador' then

        if v_valor_colaborador_centavos <= 0 then
            raise exception
                'Cobranca por colaborador exige valor unitario maior que zero.';
        end if;

        v_valor_base_centavos :=
            0;

    else
        if v_valor_base_centavos <= 0
           or v_valor_colaborador_centavos <= 0 then
            raise exception
                'Modelo base + colaborador exige ambos os valores maiores que zero.';
        end if;
    end if;

    if v_dia_fechamento
       not between 1 and 28 then
        raise exception
            'Dia de fechamento deve ficar entre 1 e 28.';
    end if;

    if v_dia_vencimento
       not between 1 and 28 then
        raise exception
            'Dia de vencimento deve ficar entre 1 e 28.';
    end if;

    if char_length(
        v_contato_financeiro_nome
    ) < 2 then
        raise exception
            'Contato financeiro obrigatorio.';
    end if;

    if v_contato_financeiro_email
       !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
        raise exception
            'E-mail financeiro invalido.';
    end if;

    if char_length(
        v_contato_financeiro_telefone
    ) not between 10 and 11
    or v_contato_financeiro_telefone =
        repeat(
            substr(
                v_contato_financeiro_telefone,
                1,
                1
            ),
            char_length(
                v_contato_financeiro_telefone
            )
        ) then
        raise exception
            'Telefone financeiro invalido.';
    end if;

    insert into public.tenants (
        nome,
        slug,
        status
    )
    values (
        v_nome_tenant,
        v_slug,
        'rascunho'
    )
    returning id
    into v_tenant_id;

    insert into public.empresas (
        nome,
        razao_social,
        cnpj,
        responsavel,
        email,
        telefone,
        status,
        tipo_empresa,
        tenant_id,
        cep,
        logradouro,
        numero_endereco,
        complemento,
        bairro,
        cidade,
        uf,
        cnpj_situacao_cadastral,
        cnpj_validado_em,
        cnpj_validacao_fonte,
        cnpj_validacao_snapshot
    )
    values (
        v_empresa_nome,
        v_razao_social,
        v_cnpj,
        v_responsavel,
        v_email,
        v_telefone,
        'Ativa',
        v_empresa_tipo,
        v_tenant_id,
        v_cep,
        v_logradouro,
        v_numero_endereco,
        v_complemento,
        v_bairro,
        v_cidade,
        v_uf,
        v_cnpj_situacao,
        clock_timestamp(),
        v_cnpj_fonte,
        v_cnpj_validacao
    )
    returning id
    into v_empresa_id;

    insert into public.tenant_branding (
        tenant_id,
        created_by,
        updated_by
    )
    values (
        v_tenant_id,
        auth.uid(),
        auth.uid()
    );

    insert into public.tenant_domains (
        tenant_id,
        hostname,
        tipo,
        principal,
        status,
        verificado_em
    )
    values (
        v_tenant_id,
        v_hostname,
        'subdominio',
        true,
        'pendente',
        null
    )
    returning id
    into v_dominio_id;

    insert into public.tenant_billing_config (
        tenant_id,
        modelo_cobranca,
        valor_base_centavos,
        valor_colaborador_centavos,
        colaboradores_incluidos,
        armazenamento_incluido_gb,
        valor_gb_excedente_centavos,
        dia_fechamento,
        dia_vencimento,
        inicio_vigencia,
        contato_financeiro_nome,
        contato_financeiro_email,
        contato_financeiro_telefone,
        status,
        versao_preco,
        created_by,
        updated_by
    )
    values (
        v_tenant_id,
        v_modelo_cobranca,
        v_valor_base_centavos,
        v_valor_colaborador_centavos,
        v_colaboradores_incluidos,
        v_armazenamento_incluido_gb,
        v_valor_gb_excedente_centavos,
        v_dia_fechamento,
        v_dia_vencimento,
        v_inicio_vigencia,
        v_contato_financeiro_nome,
        v_contato_financeiro_email,
        v_contato_financeiro_telefone,
        'ativo',
        1,
        auth.uid(),
        auth.uid()
    );

    return jsonb_build_object(
        'ok',
        true,

        'tenant',
        jsonb_build_object(
            'id',
            v_tenant_id,

            'nome',
            v_nome_tenant,

            'slug',
            v_slug,

            'status',
            'rascunho'
        ),

        'empresaInicial',
        jsonb_build_object(
            'id',
            v_empresa_id,

            'nome',
            v_empresa_nome,

            'razaoSocial',
            v_razao_social,

            'cnpj',
            v_cnpj,

            'tipo',
            v_empresa_tipo,

            'cnpjSituacaoCadastral',
            v_cnpj_situacao
        ),

        'branding',
        jsonb_build_object(
            'criado',
            true,

            'tenantId',
            v_tenant_id,

            'logoEnviado',
            false
        ),

        'dominio',
        jsonb_build_object(
            'id',
            v_dominio_id,

            'hostname',
            v_hostname,

            'tipo',
            'subdominio',

            'principal',
            true,

            'status',
            'pendente',

            'verificado',
            false
        ),

        'comercial',
        jsonb_build_object(
            'modeloCobranca',
            v_modelo_cobranca,

            'valorBaseCentavos',
            v_valor_base_centavos,

            'valorColaboradorCentavos',
            v_valor_colaborador_centavos,

            'colaboradoresIncluidos',
            v_colaboradores_incluidos,

            'armazenamentoIncluidoGb',
            v_armazenamento_incluido_gb,

            'valorGbExcedenteCentavos',
            v_valor_gb_excedente_centavos,

            'diaFechamento',
            v_dia_fechamento,

            'diaVencimento',
            v_dia_vencimento,

            'inicioVigencia',
            v_inicio_vigencia,

            'versaoPreco',
            1
        )
    );
end;
$function$;

revoke all
on table public.tenant_billing_config
from public, anon;

revoke all
on table public.tenant_billing_usage_monthly
from public, anon;

revoke all
on table public.tenant_billing_config
from authenticated;

revoke all
on table public.tenant_billing_usage_monthly
from authenticated;

grant
    select,
    insert,
    update
on table public.tenant_billing_config
to authenticated;

grant
    select,
    insert
on table public.tenant_billing_usage_monthly
to authenticated;

grant all
on table public.tenant_billing_config
to service_role;

grant all
on table public.tenant_billing_usage_monthly
to service_role;

revoke all
on function public.tenant_billing_config_touch_updated_at()
from public, anon, authenticated;

revoke all
on function public.admin_provisionar_tenant_onboarding_completo(jsonb)
from public, anon;

grant execute
on function public.admin_provisionar_tenant_onboarding_completo(jsonb)
to authenticated;

do $postflight$
declare
    v_rls_config boolean;
    v_rls_usage boolean;
    v_rpc_security_definer boolean;
begin
    if to_regclass(
        'public.tenant_billing_config'
    ) is null then
        raise exception
            'B2A postflight: tenant_billing_config ausente.';
    end if;

    if to_regclass(
        'public.tenant_billing_usage_monthly'
    ) is null then
        raise exception
            'B2A postflight: tenant_billing_usage_monthly ausente.';
    end if;

    if to_regprocedure(
        'public.admin_provisionar_tenant_onboarding_completo(jsonb)'
    ) is null then
        raise exception
            'B2A postflight: RPC onboarding completo ausente.';
    end if;

    if not exists (
        select 1
        from information_schema.columns
        where table_schema =
            'public'
          and table_name =
            'empresas'
          and column_name =
            'cnpj_validacao_snapshot'
    ) then
        raise exception
            'B2A postflight: empresas.cnpj_validacao_snapshot ausente.';
    end if;

    select
        c.relrowsecurity
    into
        v_rls_config
    from pg_class c
    join pg_namespace n
      on n.oid =
        c.relnamespace
    where n.nspname =
        'public'
      and c.relname =
        'tenant_billing_config';

    select
        c.relrowsecurity
    into
        v_rls_usage
    from pg_class c
    join pg_namespace n
      on n.oid =
        c.relnamespace
    where n.nspname =
        'public'
      and c.relname =
        'tenant_billing_usage_monthly';

    if not coalesce(
        v_rls_config,
        false
    ) then
        raise exception
            'B2A postflight: RLS billing config desabilitada.';
    end if;

    if not coalesce(
        v_rls_usage,
        false
    ) then
        raise exception
            'B2A postflight: RLS billing usage desabilitada.';
    end if;

    select
        p.prosecdef
    into
        v_rpc_security_definer
    from pg_proc p
    join pg_namespace n
      on n.oid =
        p.pronamespace
    where n.nspname =
        'public'
      and p.proname =
        'admin_provisionar_tenant_onboarding_completo'
      and pg_get_function_identity_arguments(
            p.oid
          ) =
        'p_payload jsonb';

    if not coalesce(
        v_rpc_security_definer,
        false
    ) then
        raise exception
            'B2A postflight: RPC onboarding completo nao e SECURITY DEFINER.';
    end if;
end;
$postflight$;

notify pgrst, 'reload schema';

commit;