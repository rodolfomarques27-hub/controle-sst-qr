-- ============================================================================
-- SAFESCAN BRASIL
-- R2.2-A — EMAIL TENANT FOUNDATION
--
-- Fundação privada do canal operacional de e-mail por tenant.
--
-- ESCOPO:
-- - um registro de configuração por tenant;
-- - modos SAFESCAN_GERENCIADO / PROVEDOR_CLIENTE / DESATIVADO;
-- - segredo SMTP nunca armazenado em coluna de texto;
-- - referência opaca ao Supabase Vault;
-- - tabela sem acesso direto por anon/authenticated;
-- - leitura operacional exclusivamente por contrato backend service_role;
-- - nenhum fluxo de envio existente é alterado nesta migration.
-- ============================================================================

begin;

-- ============================================================================
-- 1. CONFIGURAÇÃO OPERACIONAL DE E-MAIL POR TENANT
-- ============================================================================

create table public.tenant_email_configuracao (
    tenant_id uuid
        primary key
        references public.tenants(id)
        on delete cascade,

    modo_envio text
        not null
        default 'DESATIVADO',

    provedor text
        null,

    host text
        null,

    porta integer
        null,

    modo_seguranca text
        null,

    usuario_smtp text
        null,

    remetente_email text
        null,

    remetente_nome_padrao text
        null,

    responder_para_padrao text
        null,

    credencial_vault_id uuid
        null,

    ultimo_teste_status text
        not null
        default 'NAO_APLICAVEL',

    ultimo_teste_codigo text
        null,

    ultimo_teste_em timestamptz
        null,

    ultimo_teste_por uuid
        null
        references auth.users(id)
        on delete set null,

    versao integer
        not null
        default 1,

    criado_por uuid
        null
        references auth.users(id)
        on delete set null,

    atualizado_por uuid
        null
        references auth.users(id)
        on delete set null,

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint tenant_email_configuracao_modo_check
        check (
            modo_envio in (
                'SAFESCAN_GERENCIADO',
                'PROVEDOR_CLIENTE',
                'DESATIVADO'
            )
        ),

    constraint tenant_email_configuracao_provedor_check
        check (
            provedor is null
            or provedor in (
                'GMAIL_SMTP',
                'MICROSOFT_365_SMTP',
                'SMTP_PERSONALIZADO'
            )
        ),

    constraint tenant_email_configuracao_host_check
        check (
            host is null
            or (
                char_length(
                    btrim(host)
                ) between 1 and 253

                and position(
                    E'\n' in host
                ) = 0

                and position(
                    E'\r' in host
                ) = 0
            )
        ),

    constraint tenant_email_configuracao_porta_check
        check (
            porta is null
            or porta between 1 and 65535
        ),

    constraint tenant_email_configuracao_seguranca_check
        check (
            modo_seguranca is null
            or modo_seguranca in (
                'TLS_IMPLICITO',
                'STARTTLS'
            )
        ),

    constraint tenant_email_configuracao_usuario_check
        check (
            usuario_smtp is null
            or (
                char_length(
                    btrim(usuario_smtp)
                ) between 1 and 320

                and position(
                    E'\n' in usuario_smtp
                ) = 0

                and position(
                    E'\r' in usuario_smtp
                ) = 0
            )
        ),

    constraint tenant_email_configuracao_remetente_email_check
        check (
            remetente_email is null
            or (
                char_length(
                    btrim(remetente_email)
                ) between 3 and 254

                and remetente_email ~
                    '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
            )
        ),

    constraint tenant_email_configuracao_remetente_nome_check
        check (
            remetente_nome_padrao is null
            or (
                char_length(
                    btrim(remetente_nome_padrao)
                ) between 1 and 120

                and position(
                    E'\n' in remetente_nome_padrao
                ) = 0

                and position(
                    E'\r' in remetente_nome_padrao
                ) = 0
            )
        ),

    constraint tenant_email_configuracao_reply_to_check
        check (
            responder_para_padrao is null
            or (
                char_length(
                    btrim(responder_para_padrao)
                ) between 3 and 254

                and responder_para_padrao ~
                    '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
            )
        ),

    constraint tenant_email_configuracao_teste_status_check
        check (
            ultimo_teste_status in (
                'NAO_TESTADO',
                'APROVADO',
                'REPROVADO',
                'NAO_APLICAVEL'
            )
        ),

    constraint tenant_email_configuracao_teste_codigo_check
        check (
            ultimo_teste_codigo is null
            or ultimo_teste_codigo ~
                '^[A-Z0-9_]{1,80}$'
        ),

    constraint tenant_email_configuracao_versao_check
        check (
            versao >= 1
        ),

    constraint tenant_email_configuracao_cliente_campos_check
        check (
            modo_envio <> 'PROVEDOR_CLIENTE'

            or (
                provedor is not null
                and host is not null
                and porta is not null
                and modo_seguranca is not null
                and usuario_smtp is not null
                and remetente_email is not null
            )
        ),

    constraint tenant_email_configuracao_teste_modo_check
        check (
            (
                modo_envio =
                    'PROVEDOR_CLIENTE'

                and ultimo_teste_status in (
                    'NAO_TESTADO',
                    'APROVADO',
                    'REPROVADO'
                )
            )

            or (
                modo_envio in (
                    'SAFESCAN_GERENCIADO',
                    'DESATIVADO'
                )

                and ultimo_teste_status =
                    'NAO_APLICAVEL'
            )
        )
);

alter table
public.tenant_email_configuracao
enable row level security;

revoke all
on table
public.tenant_email_configuracao
from
public,
anon,
authenticated;

grant
select,
insert,
update,
delete
on table
public.tenant_email_configuracao
to
service_role;

comment on table
public.tenant_email_configuracao
is
'Configuração privada do canal operacional de e-mail de cada tenant. Segredos permanecem exclusivamente no Supabase Vault.';

comment on column
public.tenant_email_configuracao.modo_envio
is
'SAFESCAN_GERENCIADO usa o canal institucional autorizado para o tenant; PROVEDOR_CLIENTE usa SMTP próprio; DESATIVADO bloqueia envio operacional automático.';

comment on column
public.tenant_email_configuracao.credencial_vault_id
is
'Referência opaca ao segredo SMTP armazenado no Supabase Vault. O segredo nunca deve ser persistido nesta tabela nem retornado ao frontend.';

-- ============================================================================
-- 2. UPDATED_AT
-- ============================================================================

create trigger
tenant_email_configuracao_touch_updated_at
before update
on public.tenant_email_configuracao
for each row
execute function public.set_updated_at();

-- ============================================================================
-- 3. CONTRATO BACKEND PARA RESOLUÇÃO DO CANAL DO TENANT
--
-- Exclusivo do service_role.
--
-- Observações:
-- - DESATIVADO retorna o modo, sem credencial;
-- - SAFESCAN_GERENCIADO retorna o modo e campos operacionais seguros;
-- - PROVEDOR_CLIENTE somente libera o segredo quando o último teste
--   estiver APROVADO e a referência existir no Vault;
-- - este contrato ainda NÃO é consumido pelo resolver compartilhado.
-- ============================================================================

create or replace function
public.backend_obter_configuracao_email_tenant_para_envio(
    p_tenant_id uuid
)
returns table (
    tenant_id uuid,
    modo_envio text,
    provedor text,
    host text,
    porta integer,
    modo_seguranca text,
    usuario_smtp text,
    remetente_email text,
    remetente_nome_padrao text,
    responder_para_padrao text,
    credencial text,
    ultimo_teste_status text,
    versao integer
)
language sql
stable
security definer
set search_path = pg_catalog, public, vault
as $function$
    select
        configuracao.tenant_id,
        configuracao.modo_envio,

        case
            when configuracao.modo_envio =
                'PROVEDOR_CLIENTE'
            then configuracao.provedor
            else null
        end as provedor,

        case
            when configuracao.modo_envio =
                'PROVEDOR_CLIENTE'
            then configuracao.host
            else null
        end as host,

        case
            when configuracao.modo_envio =
                'PROVEDOR_CLIENTE'
            then configuracao.porta
            else null
        end as porta,

        case
            when configuracao.modo_envio =
                'PROVEDOR_CLIENTE'
            then configuracao.modo_seguranca
            else null
        end as modo_seguranca,

        case
            when configuracao.modo_envio =
                'PROVEDOR_CLIENTE'
            then configuracao.usuario_smtp
            else null
        end as usuario_smtp,

        case
            when configuracao.modo_envio =
                'PROVEDOR_CLIENTE'
            then configuracao.remetente_email
            else null
        end as remetente_email,

        configuracao.remetente_nome_padrao,
        configuracao.responder_para_padrao,

        case
            when configuracao.modo_envio =
                'PROVEDOR_CLIENTE'

                and configuracao.ultimo_teste_status =
                    'APROVADO'

            then segredo.decrypted_secret
            else null
        end as credencial,

        configuracao.ultimo_teste_status,
        configuracao.versao

    from
        public.tenant_email_configuracao
            configuracao

    left join
        vault.decrypted_secrets
            segredo
        on segredo.id =
            configuracao.credencial_vault_id

    where
        configuracao.tenant_id =
            p_tenant_id

    limit 1;
$function$;

revoke all
on function
public.backend_obter_configuracao_email_tenant_para_envio(
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.backend_obter_configuracao_email_tenant_para_envio(
    uuid
)
to
service_role;

comment on function
public.backend_obter_configuracao_email_tenant_para_envio(
    uuid
)
is
'Resolve exclusivamente para o backend o modo operacional de e-mail do tenant. Credencial de provedor próprio só é liberada após teste aprovado.';

commit;
