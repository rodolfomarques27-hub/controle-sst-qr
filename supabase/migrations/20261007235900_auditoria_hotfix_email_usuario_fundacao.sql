-- ============================================================================
-- SAFESCAN BRASIL
-- AUDITORIA HOTFIX R4 — EMAIL USUARIO FOUNDATION
--
-- Fundação segura da configuração SMTP por usuário e tenant.
--
-- ESCOPO:
-- - uma configuração SMTP pessoal por (tenant_id, user_id);
-- - segredo SMTP nunca armazenado em texto nesta tabela;
-- - somente referência opaca ao Supabase Vault;
-- - metadados e estado de teste fail-closed;
-- - acesso direto bloqueado para PUBLIC, anon e authenticated;
-- - service_role mantém somente o acesso técnico necessário ao backend;
-- - nenhum fluxo de envio existente é alterado nesta migration;
-- - nenhum backfill ou configuração inicial é criado.
-- ============================================================================

begin;

-- ============================================================================
-- 1. CONFIGURAÇÃO SMTP PESSOAL POR USUÁRIO/TENANT
-- ============================================================================

create table private.usuario_email_configuracao (
    tenant_id uuid
        not null
        references public.tenants(id)
        on delete cascade,

    user_id uuid
        not null
        references auth.users(id)
        on delete cascade,

    ativo boolean
        not null
        default false,

    provedor text
        not null,

    host text
        not null,

    porta integer
        not null,

    modo_seguranca text
        not null,

    usuario_smtp text
        not null,

    remetente_email text
        not null,

    remetente_nome_padrao text
        not null,

    responder_para_padrao text
        null,

    credencial_vault_id uuid
        null,

    ultimo_teste_status text
        not null
        default 'NAO_TESTADO',

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

    constraint usuario_email_configuracao_pkey
        primary key (
            tenant_id,
            user_id
        ),

    constraint usuario_email_configuracao_provedor_check
        check (
            provedor in (
                'GMAIL_SMTP',
                'MICROSOFT_365_SMTP',
                'SMTP_PERSONALIZADO'
            )
        ),

    constraint usuario_email_configuracao_host_check
        check (
            char_length(
                btrim(host)
            ) between 1 and 253

            and position(
                E'\n' in host
            ) = 0

            and position(
                E'\r' in host
            ) = 0
        ),

    constraint usuario_email_configuracao_porta_check
        check (
            porta between 1 and 65535
        ),

    constraint usuario_email_configuracao_seguranca_check
        check (
            modo_seguranca in (
                'TLS_IMPLICITO',
                'STARTTLS'
            )
        ),

    constraint usuario_email_configuracao_usuario_smtp_check
        check (
            char_length(
                btrim(usuario_smtp)
            ) between 1 and 320

            and position(
                E'\n' in usuario_smtp
            ) = 0

            and position(
                E'\r' in usuario_smtp
            ) = 0
        ),

    constraint usuario_email_configuracao_remetente_email_check
        check (
            char_length(
                btrim(remetente_email)
            ) between 3 and 254

            and remetente_email ~
                '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        ),

    constraint usuario_email_configuracao_remetente_nome_check
        check (
            char_length(
                btrim(remetente_nome_padrao)
            ) between 1 and 120

            and position(
                E'\n' in remetente_nome_padrao
            ) = 0

            and position(
                E'\r' in remetente_nome_padrao
            ) = 0
        ),

    constraint usuario_email_configuracao_reply_to_check
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

    constraint usuario_email_configuracao_teste_status_check
        check (
            ultimo_teste_status in (
                'NAO_TESTADO',
                'APROVADO',
                'REPROVADO'
            )
        ),

    constraint usuario_email_configuracao_teste_codigo_check
        check (
            ultimo_teste_codigo is null
            or ultimo_teste_codigo ~
                '^[A-Z0-9_]{1,80}$'
        ),

    constraint usuario_email_configuracao_teste_consistencia_check
        check (
            (
                ultimo_teste_status =
                    'NAO_TESTADO'

                and ultimo_teste_codigo
                    is null

                and ultimo_teste_em
                    is null
            )

            or (
                ultimo_teste_status =
                    'APROVADO'

                and ultimo_teste_codigo
                    is null

                and ultimo_teste_em
                    is not null

                and credencial_vault_id
                    is not null
            )

            or (
                ultimo_teste_status =
                    'REPROVADO'

                and ultimo_teste_codigo
                    is not null

                and ultimo_teste_em
                    is not null
            )
        ),

    constraint usuario_email_configuracao_ativo_check
        check (
            ativo = false

            or (
                ultimo_teste_status =
                    'APROVADO'

                and credencial_vault_id
                    is not null
            )
        ),

    constraint usuario_email_configuracao_versao_check
        check (
            versao >= 1
        )
);

-- Consulta backend futura por user_id, sem substituir a PK tenant-scoped.
create index
usuario_email_configuracao_user_id_idx
on private.usuario_email_configuracao (
    user_id
);

alter table
private.usuario_email_configuracao
enable row level security;

revoke all
on table
private.usuario_email_configuracao
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
private.usuario_email_configuracao
to
service_role;

comment on table
private.usuario_email_configuracao
is
'Configuração SMTP pessoal por usuário e tenant. A credencial permanece exclusivamente no Supabase Vault; esta tabela armazena somente referência opaca e metadados.';

comment on column
private.usuario_email_configuracao.credencial_vault_id
is
'Referência opaca ao segredo SMTP armazenado no Supabase Vault. Nunca persistir credencial descriptografada, senha normal ou senha de app em coluna desta tabela.';

comment on column
private.usuario_email_configuracao.ativo
is
'Indica se a configuração pessoal pode ser elegível para resolução de envio. Só pode ficar ativa após teste SMTP aprovado e com referência de credencial presente.';

comment on column
private.usuario_email_configuracao.ultimo_teste_status
is
'Estado do último teste SMTP pessoal: NAO_TESTADO, APROVADO ou REPROVADO.';

-- ============================================================================
-- 2. UPDATED_AT
-- ============================================================================

create trigger
usuario_email_configuracao_touch_updated_at
before update
on private.usuario_email_configuracao
for each row
execute function public.set_updated_at();

-- ============================================================================
-- 3. INVARIANTES DE SEGURANÇA DA FUNDAÇÃO
--
-- Não há nesta migration:
-- - leitura de vault.decrypted_secrets;
-- - criação/rotação de segredo;
-- - RPC pública;
-- - backfill;
-- - configuração automática de usuário;
-- - alteração de tenant_email_configuracao;
-- - alteração de email_provedor_configuracao;
-- - alteração de qualquer Edge Function ou resolver.
-- ============================================================================

commit;
