-- ============================================================================
-- SAFESCAN BRASIL
-- R2.2-D1 — ADMINISTRAÇÃO SEGURA DO PROVEDOR DE E-MAIL POR TENANT
--
-- Objetivos:
-- - manter credencial SMTP tenant em Vault, write-only para o frontend;
-- - permitir leitura segura sem secret/Vault ID ao administrador autorizado;
-- - restringir salvar/testar/definir modo ao administrador global SafeScan;
-- - usar tenant_id explícito em todos os contratos;
-- - manter PROVEDOR_CLIENTE fail-closed sem teste aprovado;
-- - bloquear SAFESCAN_GERENCIADO enquanto o provedor central não possuir
--   identidade institucional @safescanbrasil.com.br válida e aprovada.
--
-- Esta migration NÃO seleciona automaticamente modo de envio para tenant.
-- ============================================================================

begin;

-- ============================================================================
-- 1. EVOLUÇÃO CONTROLADA DO STATUS DE TESTE
--
-- O status de teste passa a representar o SMTP próprio armazenado.
-- Isso permite preparar/testar PROVEDOR_CLIENTE enquanto o modo operacional
-- ainda está DESATIVADO ou SAFESCAN_GERENCIADO.
--
-- O modo de envio continua independente e somente é alterado por contrato
-- administrativo explícito.
-- ============================================================================

alter table
public.tenant_email_configuracao
drop constraint if exists
tenant_email_configuracao_teste_modo_check;

alter table
public.tenant_email_configuracao
add constraint
tenant_email_configuracao_teste_modo_check
check (
    (
        provedor is null
        and ultimo_teste_status =
            'NAO_APLICAVEL'
    )
    or
    (
        provedor is not null
        and ultimo_teste_status in (
            'NAO_TESTADO',
            'APROVADO',
            'REPROVADO'
        )
    )
);

-- ============================================================================
-- 2. LEITURA SEGURA TENANT-SCOPED
--
-- Não retorna:
-- - credencial SMTP;
-- - credencial_vault_id;
-- - qualquer secret descriptografado.
-- ============================================================================

create or replace function
public.admin_obter_configuracao_email_tenant(
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
    credencial_configurada boolean,
    ultimo_teste_status text,
    ultimo_teste_codigo text,
    ultimo_teste_em timestamptz,
    ultimo_teste_por uuid,
    versao integer,
    safescan_gerenciado_disponivel boolean
)
language plpgsql
stable
security definer
set search_path =
    pg_catalog,
    public,
    auth,
    vault
as $function$
begin
    if not
        public.usuario_pode_gerenciar_tenant(
            p_tenant_id
        )
    then
        raise exception
            'Sem permissão para consultar a configuração de e-mail deste tenant.'
            using errcode = '42501';
    end if;

    return query
    select
        config.tenant_id,
        config.modo_envio,
        config.provedor,
        config.host,
        config.porta,
        config.modo_seguranca,
        config.usuario_smtp,
        config.remetente_email,
        config.remetente_nome_padrao,
        config.responder_para_padrao,

        (
            config.credencial_vault_id is not null
            and exists (
                select 1
                from vault.secrets segredo_tenant
                where
                    segredo_tenant.id =
                        config.credencial_vault_id
            )
        ) as credencial_configurada,

        config.ultimo_teste_status,
        config.ultimo_teste_codigo,
        config.ultimo_teste_em,
        config.ultimo_teste_por,
        config.versao,

        exists (
            select 1

            from
                public.email_provedor_configuracao
                    provedor_central

            where
                provedor_central.chave =
                    'principal'

                and provedor_central.ativo =
                    true

                and provedor_central.ultimo_teste_status =
                    'APROVADO'

                and provedor_central.credencial_vault_id
                    is not null

                and lower(
                    btrim(
                        coalesce(
                            provedor_central.remetente_email,
                            ''
                        )
                    )
                ) ~
                    '^[^[:space:]@]+@safescanbrasil[.]com[.]br$'

                and exists (
                    select 1

                    from
                        vault.secrets
                            segredo_central

                    where
                        segredo_central.id =
                            provedor_central.credencial_vault_id
                )
        ) as safescan_gerenciado_disponivel

    from
        public.tenant_email_configuracao
            config

    where
        config.tenant_id =
            p_tenant_id

    limit 1;
end;
$function$;

revoke all
on function
public.admin_obter_configuracao_email_tenant(
    uuid
)
from
public,
anon;

grant execute
on function
public.admin_obter_configuracao_email_tenant(
    uuid
)
to
authenticated;

comment on function
public.admin_obter_configuracao_email_tenant(
    uuid
)
is
'Leitura tenant-scoped de metadados seguros do provedor operacional, sem secret SMTP e sem Vault ID.';

-- ============================================================================
-- 3. BACKEND SERVICE_ROLE — SALVAR/ROTACIONAR SMTP PRÓPRIO
--
-- Não altera modo_envio.
-- Alterações de conexão invalidam o teste anterior.
-- ============================================================================

create or replace function
public.backend_salvar_configuracao_email_tenant(
    p_tenant_id uuid,
    p_provedor text,
    p_host text,
    p_porta integer,
    p_modo_seguranca text,
    p_usuario_smtp text,
    p_remetente_email text,
    p_remetente_nome_padrao text,
    p_responder_para_padrao text,
    p_credencial_nova text,
    p_versao_esperada integer,
    p_executor_id uuid
)
returns table (
    tenant_id uuid,
    versao integer,
    credencial_atualizada boolean
)
language plpgsql
security definer
set search_path =
    pg_catalog,
    public,
    auth,
    vault
as $function$
declare
    v_provedor text;
    v_host text;
    v_modo text;
    v_usuario text;
    v_remetente text;
    v_nome_remetente text;
    v_reply_to text;

    v_atual
        public.tenant_email_configuracao%rowtype;

    v_credencial_id uuid;
    v_credencial_informada boolean;

    v_nome_segredo text;
    v_descricao_segredo text;

    v_mudou_conexao boolean;
    v_nova_versao integer;
begin
    if p_tenant_id is null
       or not exists (
           select 1
           from public.tenants tenant
           where tenant.id = p_tenant_id
       )
    then
        raise exception
            'Tenant inválido para configuração de e-mail.';
    end if;

    if p_executor_id is null
       or not exists (
           select 1
           from auth.users usuario
           where usuario.id = p_executor_id
       )
    then
        raise exception
            'Executor administrativo inválido.';
    end if;

    v_provedor :=
        upper(
            btrim(
                coalesce(
                    p_provedor,
                    ''
                )
            )
        );

    if v_provedor not in (
        'GMAIL_SMTP',
        'MICROSOFT_365_SMTP',
        'SMTP_PERSONALIZADO'
    ) then
        raise exception
            'Provedor de e-mail inválido.';
    end if;

    v_host :=
        lower(
            btrim(
                coalesce(
                    p_host,
                    ''
                )
            )
        );

    if char_length(v_host) not between 1 and 253
       or position(E'\n' in v_host) > 0
       or position(E'\r' in v_host) > 0
    then
        raise exception
            'Host SMTP inválido.';
    end if;

    if p_porta is null
       or p_porta < 1
       or p_porta > 65535
    then
        raise exception
            'Porta SMTP inválida.';
    end if;

    v_modo :=
        upper(
            btrim(
                coalesce(
                    p_modo_seguranca,
                    ''
                )
            )
        );

    if v_modo not in (
        'TLS_IMPLICITO',
        'STARTTLS'
    ) then
        raise exception
            'Modo de segurança SMTP inválido.';
    end if;

    v_usuario :=
        btrim(
            coalesce(
                p_usuario_smtp,
                ''
            )
        );

    if char_length(v_usuario) not between 1 and 320
       or position(E'\n' in v_usuario) > 0
       or position(E'\r' in v_usuario) > 0
    then
        raise exception
            'Usuário SMTP inválido.';
    end if;

    v_remetente :=
        lower(
            btrim(
                coalesce(
                    p_remetente_email,
                    ''
                )
            )
        );

    if char_length(v_remetente) > 254
       or v_remetente !~*
            '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    then
        raise exception
            'E-mail remetente inválido.';
    end if;

    v_nome_remetente :=
        btrim(
            coalesce(
                p_remetente_nome_padrao,
                ''
            )
        );

    if char_length(v_nome_remetente) not between 1 and 120
       or position(E'\n' in v_nome_remetente) > 0
       or position(E'\r' in v_nome_remetente) > 0
    then
        raise exception
            'Nome do remetente inválido.';
    end if;

    v_reply_to :=
        nullif(
            lower(
                btrim(
                    coalesce(
                        p_responder_para_padrao,
                        ''
                    )
                )
            ),
            ''
        );

    if v_reply_to is not null
       and (
           char_length(v_reply_to) > 254
           or v_reply_to !~*
                '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
       )
    then
        raise exception
            'E-mail de resposta inválido.';
    end if;

    if p_credencial_nova is not null
       and (
           char_length(p_credencial_nova) < 1
           or char_length(p_credencial_nova) > 500
       )
    then
        raise exception
            'Credencial SMTP inválida.';
    end if;

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'safescan:tenant-email:' ||
                    p_tenant_id::text,
                0
            )
        );

    select
        config.*
    into
        v_atual
    from
        public.tenant_email_configuracao
            config
    where
        config.tenant_id =
            p_tenant_id
    for update;

    if found then
        if p_versao_esperada is null
           or p_versao_esperada <>
                v_atual.versao
        then
            raise exception
                'A configuração mudou. Atualize os dados antes de salvar.';
        end if;

        v_credencial_id :=
            v_atual.credencial_vault_id;
    else
        if p_versao_esperada is not null then
            raise exception
                'Versão informada para configuração ainda inexistente.';
        end if;

        v_credencial_id :=
            null;
    end if;

    v_credencial_informada :=
        p_credencial_nova is not null;

    v_nome_segredo :=
        'safescan_tenant_email_' ||
        replace(
            p_tenant_id::text,
            '-',
            ''
        );

    v_descricao_segredo :=
        'SafeScan SMTP tenant ' ||
        p_tenant_id::text;

    if v_credencial_informada then
        if v_credencial_id is null
           or not exists (
               select 1
               from vault.secrets segredo
               where segredo.id = v_credencial_id
           )
        then
            select
                segredo.id
            into
                v_credencial_id
            from
                vault.secrets segredo
            where
                segredo.name =
                    v_nome_segredo
            order by
                segredo.updated_at desc
            limit 1;
        end if;

        if v_credencial_id is null then
            v_credencial_id :=
                vault.create_secret(
                    p_credencial_nova,
                    v_nome_segredo,
                    v_descricao_segredo,
                    null
                );
        else
            perform
                vault.update_secret(
                    v_credencial_id,
                    p_credencial_nova,
                    v_nome_segredo,
                    v_descricao_segredo,
                    null
                );
        end if;
    end if;

    v_mudou_conexao :=
        v_atual.tenant_id is null

        or v_atual.provedor
            is distinct from
            v_provedor

        or v_atual.host
            is distinct from
            v_host

        or v_atual.porta
            is distinct from
            p_porta

        or v_atual.modo_seguranca
            is distinct from
            v_modo

        or v_atual.usuario_smtp
            is distinct from
            v_usuario

        or v_atual.remetente_email
            is distinct from
            v_remetente

        or v_credencial_informada;

    if v_atual.tenant_id is null then
        insert into
        public.tenant_email_configuracao (
            tenant_id,
            modo_envio,
            provedor,
            host,
            porta,
            modo_seguranca,
            usuario_smtp,
            remetente_email,
            remetente_nome_padrao,
            responder_para_padrao,
            credencial_vault_id,
            ultimo_teste_status,
            ultimo_teste_codigo,
            ultimo_teste_em,
            ultimo_teste_por,
            versao,
            criado_por,
            atualizado_por
        )
        values (
            p_tenant_id,
            'DESATIVADO',
            v_provedor,
            v_host,
            p_porta,
            v_modo,
            v_usuario,
            v_remetente,
            v_nome_remetente,
            v_reply_to,
            v_credencial_id,
            'NAO_TESTADO',
            null,
            null,
            null,
            1,
            p_executor_id,
            p_executor_id
        )
        returning
            public.tenant_email_configuracao.versao
        into
            v_nova_versao;
    else
        update
            public.tenant_email_configuracao

        set
            provedor =
                v_provedor,

            host =
                v_host,

            porta =
                p_porta,

            modo_seguranca =
                v_modo,

            usuario_smtp =
                v_usuario,

            remetente_email =
                v_remetente,

            remetente_nome_padrao =
                v_nome_remetente,

            responder_para_padrao =
                v_reply_to,

            credencial_vault_id =
                v_credencial_id,

            ultimo_teste_status =
                case
                    when v_mudou_conexao
                    then 'NAO_TESTADO'
                    else ultimo_teste_status
                end,

            ultimo_teste_codigo =
                case
                    when v_mudou_conexao
                    then null
                    else ultimo_teste_codigo
                end,

            ultimo_teste_em =
                case
                    when v_mudou_conexao
                    then null
                    else ultimo_teste_em
                end,

            ultimo_teste_por =
                case
                    when v_mudou_conexao
                    then null
                    else ultimo_teste_por
                end,

            atualizado_por =
                p_executor_id,

            versao =
                versao + 1

        where
            tenant_id =
                p_tenant_id

        returning
            public.tenant_email_configuracao.versao
        into
            v_nova_versao;
    end if;

    return query
    select
        p_tenant_id,
        v_nova_versao,
        v_credencial_informada;
end;
$function$;

revoke all
on function
public.backend_salvar_configuracao_email_tenant(
    uuid,
    text,
    text,
    integer,
    text,
    text,
    text,
    text,
    text,
    text,
    integer,
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.backend_salvar_configuracao_email_tenant(
    uuid,
    text,
    text,
    integer,
    text,
    text,
    text,
    text,
    text,
    text,
    integer,
    uuid
)
to
service_role;

-- ============================================================================
-- 4. BACKEND SERVICE_ROLE — CONFIGURAÇÃO PRIVADA PARA TESTE
-- ============================================================================

create or replace function
public.backend_obter_configuracao_email_tenant_para_teste(
    p_tenant_id uuid
)
returns table (
    provedor text,
    host text,
    porta integer,
    modo_seguranca text,
    usuario_smtp text,
    remetente_email text,
    remetente_nome_padrao text,
    responder_para_padrao text,
    credencial text,
    versao integer
)
language sql
stable
security definer
set search_path =
    pg_catalog,
    public,
    vault
as $function$
    select
        config.provedor,
        config.host,
        config.porta,
        config.modo_seguranca,
        config.usuario_smtp,
        config.remetente_email,
        config.remetente_nome_padrao,
        config.responder_para_padrao,

        segredo.decrypted_secret
            as credencial,

        config.versao

    from
        public.tenant_email_configuracao
            config

    join
        vault.decrypted_secrets
            segredo

        on segredo.id =
            config.credencial_vault_id

    where
        config.tenant_id =
            p_tenant_id

        and config.provedor
            is not null

        and config.host
            is not null

        and config.porta
            is not null

        and config.modo_seguranca
            is not null

        and config.usuario_smtp
            is not null

        and config.remetente_email
            is not null

    limit 1;
$function$;

revoke all
on function
public.backend_obter_configuracao_email_tenant_para_teste(
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.backend_obter_configuracao_email_tenant_para_teste(
    uuid
)
to
service_role;

-- ============================================================================
-- 5. BACKEND SERVICE_ROLE — REGISTRAR RESULTADO DO TESTE
-- ============================================================================

create or replace function
public.backend_registrar_teste_email_tenant(
    p_tenant_id uuid,
    p_status text,
    p_codigo text,
    p_versao_esperada integer,
    p_executor_id uuid
)
returns integer
language plpgsql
security definer
set search_path =
    pg_catalog,
    public,
    auth,
    vault
as $function$
declare
    v_status text;
    v_codigo text;

    v_config
        public.tenant_email_configuracao%rowtype;

    v_nova_versao integer;
begin
    if p_executor_id is null
       or not exists (
           select 1
           from auth.users usuario
           where usuario.id = p_executor_id
       )
    then
        raise exception
            'Executor administrativo inválido.';
    end if;

    if p_versao_esperada is null
       or p_versao_esperada < 1
    then
        raise exception
            'Versão testada inválida.';
    end if;

    v_status :=
        upper(
            btrim(
                coalesce(
                    p_status,
                    ''
                )
            )
        );

    if v_status not in (
        'APROVADO',
        'REPROVADO'
    ) then
        raise exception
            'Status de teste inválido.';
    end if;

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'safescan:tenant-email:' ||
                    p_tenant_id::text,
                0
            )
        );

    select
        config.*
    into
        v_config
    from
        public.tenant_email_configuracao
            config
    where
        config.tenant_id =
            p_tenant_id
    for update;

    if not found then
        raise exception
            'Configuração SMTP do tenant não localizada.';
    end if;

    if v_config.versao <>
        p_versao_esperada
    then
        raise exception
            'A configuração mudou durante o teste. Execute um novo teste.';
    end if;

    if v_config.provedor is null
       or v_config.host is null
       or v_config.porta is null
       or v_config.modo_seguranca is null
       or v_config.usuario_smtp is null
       or v_config.remetente_email is null
       or v_config.credencial_vault_id is null
       or not exists (
           select 1
           from vault.secrets segredo
           where
               segredo.id =
                   v_config.credencial_vault_id
       )
    then
        raise exception
            'Configuração SMTP própria incompleta.';
    end if;

    if v_status =
        'APROVADO'
    then
        v_codigo :=
            null;
    else
        v_codigo :=
            upper(
                btrim(
                    coalesce(
                        p_codigo,
                        ''
                    )
                )
            );

        if v_codigo = ''
           or v_codigo !~
                '^[A-Z0-9_]{1,80}$'
        then
            v_codigo :=
                'ERRO_NAO_CLASSIFICADO';
        end if;
    end if;

    update
        public.tenant_email_configuracao

    set
        ultimo_teste_status =
            v_status,

        ultimo_teste_codigo =
            v_codigo,

        ultimo_teste_em =
            now(),

        ultimo_teste_por =
            p_executor_id,

        atualizado_por =
            p_executor_id,

        versao =
            versao + 1

    where
        tenant_id =
            p_tenant_id

    returning
        versao
    into
        v_nova_versao;

    return
        v_nova_versao;
end;
$function$;

revoke all
on function
public.backend_registrar_teste_email_tenant(
    uuid,
    text,
    text,
    integer,
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.backend_registrar_teste_email_tenant(
    uuid,
    text,
    text,
    integer,
    uuid
)
to
service_role;

-- ============================================================================
-- 6. BACKEND SERVICE_ROLE — DEFINIR MODO OPERACIONAL
-- ============================================================================

create or replace function
public.backend_definir_modo_email_tenant(
    p_tenant_id uuid,
    p_modo_envio text,
    p_versao_esperada integer,
    p_executor_id uuid
)
returns integer
language plpgsql
security definer
set search_path =
    pg_catalog,
    public,
    auth,
    vault
as $function$
declare
    v_modo text;

    v_config
        public.tenant_email_configuracao%rowtype;

    v_central_disponivel boolean;
    v_nova_versao integer;
begin
    if p_tenant_id is null
       or not exists (
           select 1
           from public.tenants tenant
           where tenant.id = p_tenant_id
       )
    then
        raise exception
            'Tenant inválido para configuração de e-mail.';
    end if;

    if p_executor_id is null
       or not exists (
           select 1
           from auth.users usuario
           where usuario.id = p_executor_id
       )
    then
        raise exception
            'Executor administrativo inválido.';
    end if;

    v_modo :=
        upper(
            btrim(
                coalesce(
                    p_modo_envio,
                    ''
                )
            )
        );

    if v_modo not in (
        'SAFESCAN_GERENCIADO',
        'PROVEDOR_CLIENTE',
        'DESATIVADO'
    ) then
        raise exception
            'Modo de envio inválido.';
    end if;

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'safescan:tenant-email:' ||
                    p_tenant_id::text,
                0
            )
        );

    select
        config.*
    into
        v_config
    from
        public.tenant_email_configuracao
            config
    where
        config.tenant_id =
            p_tenant_id
    for update;

    if found then
        if p_versao_esperada is null
           or p_versao_esperada <>
                v_config.versao
        then
            raise exception
                'A configuração mudou. Atualize os dados antes de alterar o modo.';
        end if;
    else
        if p_versao_esperada is not null then
            raise exception
                'Versão informada para configuração ainda inexistente.';
        end if;

        if v_modo =
            'PROVEDOR_CLIENTE'
        then
            raise exception
                'Configure e teste o provedor próprio antes de ativá-lo.';
        end if;
    end if;

    if v_modo =
        'PROVEDOR_CLIENTE'
    then
        if v_config.tenant_id is null
           or v_config.provedor is null
           or v_config.host is null
           or v_config.porta is null
           or v_config.modo_seguranca is null
           or v_config.usuario_smtp is null
           or v_config.remetente_email is null
           or v_config.ultimo_teste_status <>
                'APROVADO'
           or v_config.credencial_vault_id is null
           or not exists (
               select 1
               from vault.secrets segredo
               where
                   segredo.id =
                       v_config.credencial_vault_id
           )
        then
            raise exception
                'PROVEDOR_CLIENTE exige configuração própria completa, credencial válida e teste aprovado.';
        end if;
    end if;

    if v_modo =
        'SAFESCAN_GERENCIADO'
    then
        select
            exists (
                select 1

                from
                    public.email_provedor_configuracao
                        provedor_central

                where
                    provedor_central.chave =
                        'principal'

                    and provedor_central.ativo =
                        true

                    and provedor_central.ultimo_teste_status =
                        'APROVADO'

                    and provedor_central.credencial_vault_id
                        is not null

                    and lower(
                        btrim(
                            coalesce(
                                provedor_central.remetente_email,
                                ''
                            )
                        )
                    ) ~
                        '^[^[:space:]@]+@safescanbrasil[.]com[.]br$'

                    and exists (
                        select 1

                        from
                            vault.secrets
                                segredo_central

                        where
                            segredo_central.id =
                                provedor_central.credencial_vault_id
                    )
            )

        into
            v_central_disponivel;

        if not coalesce(
            v_central_disponivel,
            false
        )
        then
            raise exception
                'SAFESCAN_GERENCIADO indisponível: o provedor institucional SafeScan precisa estar ativo, aprovado, com credencial válida e remetente @safescanbrasil.com.br.';
        end if;
    end if;

    if v_config.tenant_id is null then
        insert into
        public.tenant_email_configuracao (
            tenant_id,
            modo_envio,
            ultimo_teste_status,
            versao,
            criado_por,
            atualizado_por
        )
        values (
            p_tenant_id,
            v_modo,
            'NAO_APLICAVEL',
            1,
            p_executor_id,
            p_executor_id
        )
        returning
            versao
        into
            v_nova_versao;
    else
        update
            public.tenant_email_configuracao

        set
            modo_envio =
                v_modo,

            atualizado_por =
                p_executor_id,

            versao =
                versao + 1

        where
            tenant_id =
                p_tenant_id

        returning
            versao
        into
            v_nova_versao;
    end if;

    return
        v_nova_versao;
end;
$function$;

revoke all
on function
public.backend_definir_modo_email_tenant(
    uuid,
    text,
    integer,
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.backend_definir_modo_email_tenant(
    uuid,
    text,
    integer,
    uuid
)
to
service_role;

comment on function
public.backend_salvar_configuracao_email_tenant(
    uuid,
    text,
    text,
    integer,
    text,
    text,
    text,
    text,
    text,
    text,
    integer,
    uuid
)
is
'Backend service_role para salvar metadados SMTP tenant e criar/rotacionar credencial write-only no Vault sem alterar o modo operacional.';

comment on function
public.backend_obter_configuracao_email_tenant_para_teste(
    uuid
)
is
'Backend service_role que pode devolver a credencial descriptografada exclusivamente para teste administrativo SMTP.';

comment on function
public.backend_registrar_teste_email_tenant(
    uuid,
    text,
    text,
    integer,
    uuid
)
is
'Backend service_role para registrar teste SMTP tenant com controle otimista de versão.';

comment on function
public.backend_definir_modo_email_tenant(
    uuid,
    text,
    integer,
    uuid
)
is
'Backend service_role para alterar explicitamente o modo operacional de e-mail do tenant, preservando fail-closed e gates institucionais.';

notify pgrst, 'reload schema';

commit;
