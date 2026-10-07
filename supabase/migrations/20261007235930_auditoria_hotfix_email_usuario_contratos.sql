-- ============================================================================
-- SAFESCAN BRASIL
-- AUDITORIA HOTFIX R5 — CONTRATOS SMTP PESSOAIS
--
-- Contratos seguros para configuração SMTP individual por usuário e tenant.
-- Nenhuma configuração SMTP do tenant/plataforma é alterada nesta migration.
-- ============================================================================

begin;

-- ============================================================================
-- 1. ELEGIBILIDADE PRIVADA — SEM BYPASS ADMINISTRATIVO
-- ============================================================================

create or replace function private.usuario_email_usuario_elegivel(
    p_tenant_id uuid,
    p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog'
as $function$
    select
        p_tenant_id is not null
        and p_user_id is not null
        and exists (
            select 1
            from public.usuarios_permissoes_sistema as usuario
            where usuario.user_id = p_user_id
              and coalesce(usuario.ativo, false) = true
              and coalesce(usuario.bloqueado, false) = false
              and coalesce(usuario.excluido, false) = false
              and lower(
                    pg_catalog.btrim(
                        coalesce(usuario.perfil, '')
                    )
                  ) <> 'bloqueado'
        )
        and exists (
            select 1
            from public.tenant_memberships as membership
            join public.tenants as tenant
              on tenant.id = membership.tenant_id
            where membership.tenant_id = p_tenant_id
              and membership.user_id = p_user_id
              and membership.status = 'ativo'
              and tenant.status = 'ativo'
        );
$function$;

revoke all
on function private.usuario_email_usuario_elegivel(uuid, uuid)
from public, anon, authenticated, service_role;

-- ============================================================================
-- 2. LEITURA SEGURA — SOMENTE O PRÓPRIO USUÁRIO
-- ============================================================================

create or replace function public.usuario_obter_configuracao_email(
    p_tenant_id uuid
)
returns table (
    tenant_id uuid,
    user_id uuid,
    ativo boolean,
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
    versao integer
)
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth', 'vault'
as $function$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'Sessão autenticada obrigatória.'
            using errcode = '42501';
    end if;

    if not private.usuario_email_usuario_elegivel(
        p_tenant_id,
        v_user_id
    ) then
        raise exception
            'Sem permissão para consultar a configuração pessoal de e-mail neste tenant.'
            using errcode = '42501';
    end if;

    return query
    select
        config.tenant_id,
        config.user_id,
        config.ativo,
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
                from vault.secrets as segredo
                where segredo.id = config.credencial_vault_id
            )
        ) as credencial_configurada,
        config.ultimo_teste_status,
        config.ultimo_teste_codigo,
        config.ultimo_teste_em,
        config.ultimo_teste_por,
        config.versao
    from private.usuario_email_configuracao as config
    where config.tenant_id = p_tenant_id
      and config.user_id = v_user_id
    limit 1;
end;
$function$;

revoke all
on function public.usuario_obter_configuracao_email(uuid)
from public, anon, authenticated, service_role;

grant execute
on function public.usuario_obter_configuracao_email(uuid)
to authenticated;

-- ============================================================================
-- 3. SALVAMENTO — SOMENTE O PRÓPRIO USUÁRIO
-- ============================================================================

create or replace function public.usuario_salvar_configuracao_email(
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
    p_versao_esperada integer
)
returns table (
    tenant_id uuid,
    user_id uuid,
    versao integer,
    credencial_atualizada boolean
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth', 'vault'
as $function$
declare
    v_user_id uuid;
    v_user_email text;
    v_provedor text;
    v_host text;
    v_modo text;
    v_usuario text;
    v_remetente text;
    v_nome_remetente text;
    v_reply_to text;
    v_atual private.usuario_email_configuracao%rowtype;
    v_credencial_id uuid;
    v_credencial_informada boolean;
    v_nome_segredo text;
    v_descricao_segredo text;
    v_mudou_conexao boolean;
    v_nova_versao integer;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'Sessão autenticada obrigatória.'
            using errcode = '42501';
    end if;

    if not private.usuario_email_usuario_elegivel(
        p_tenant_id,
        v_user_id
    ) then
        raise exception
            'Sem permissão para configurar e-mail neste tenant.'
            using errcode = '42501';
    end if;

    if p_versao_esperada is not null
       and p_versao_esperada < 1
    then
        raise exception
            'Versão da configuração inválida.'
            using errcode = '22023';
    end if;

    select lower(btrim(coalesce(usuario.email, '')))
      into v_user_email
      from auth.users as usuario
     where usuario.id = v_user_id;

    v_provedor := upper(btrim(coalesce(p_provedor, '')));

    if v_provedor not in (
        'GMAIL_SMTP',
        'MICROSOFT_365_SMTP',
        'SMTP_PERSONALIZADO'
    ) then
        raise exception
            'Provedor de e-mail inválido.'
            using errcode = '22023';
    end if;

    v_host := lower(btrim(coalesce(p_host, '')));

    if char_length(v_host) not between 1 and 253
       or position(E'\n' in v_host) > 0
       or position(E'\r' in v_host) > 0
    then
        raise exception
            'Host SMTP inválido.'
            using errcode = '22023';
    end if;

    if p_porta is null
       or p_porta < 1
       or p_porta > 65535
    then
        raise exception
            'Porta SMTP inválida.'
            using errcode = '22023';
    end if;

    v_modo := upper(btrim(coalesce(p_modo_seguranca, '')));

    if v_modo not in (
        'TLS_IMPLICITO',
        'STARTTLS'
    ) then
        raise exception
            'Modo de segurança SMTP inválido.'
            using errcode = '22023';
    end if;

    v_usuario := btrim(coalesce(p_usuario_smtp, ''));

    if char_length(v_usuario) not between 1 and 320
       or position(E'\n' in v_usuario) > 0
       or position(E'\r' in v_usuario) > 0
    then
        raise exception
            'Usuário SMTP inválido.'
            using errcode = '22023';
    end if;

    v_remetente := lower(btrim(coalesce(p_remetente_email, '')));

    if char_length(v_remetente) not between 3 and 254
       or v_remetente !~*
            '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    then
        raise exception
            'E-mail remetente inválido.'
            using errcode = '22023';
    end if;

    v_nome_remetente :=
        btrim(coalesce(p_remetente_nome_padrao, ''));

    if char_length(v_nome_remetente) not between 1 and 120
       or position(E'\n' in v_nome_remetente) > 0
       or position(E'\r' in v_nome_remetente) > 0
    then
        raise exception
            'Nome do remetente inválido.'
            using errcode = '22023';
    end if;

    v_reply_to :=
        nullif(
            lower(
                btrim(
                    coalesce(p_responder_para_padrao, '')
                )
            ),
            ''
        );

    if v_reply_to is not null
       and (
            char_length(v_reply_to) not between 3 and 254
            or v_reply_to !~*
                '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
       )
    then
        raise exception
            'E-mail de resposta inválido.'
            using errcode = '22023';
    end if;

    if p_credencial_nova is not null
       and char_length(p_credencial_nova) not between 1 and 500
    then
        raise exception
            'Credencial SMTP inválida.'
            using errcode = '22023';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
            'safescan:usuario-email:' ||
                p_tenant_id::text ||
                ':' ||
                v_user_id::text,
            0
        )
    );

    select config.*
      into v_atual
      from private.usuario_email_configuracao as config
     where config.tenant_id = p_tenant_id
       and config.user_id = v_user_id
     for update;

    if found then
        if p_versao_esperada is null
           or p_versao_esperada <> v_atual.versao
        then
            raise exception
                'A configuração mudou. Atualize os dados antes de salvar.';
        end if;

        v_credencial_id := v_atual.credencial_vault_id;
    else
        if p_versao_esperada is not null then
            raise exception
                'Versão informada para configuração ainda inexistente.';
        end if;

        v_credencial_id := null;
    end if;

    v_credencial_informada :=
        p_credencial_nova is not null;

    v_nome_segredo :=
        'safescan_usuario_email_' ||
        replace(p_tenant_id::text, '-', '') ||
        '_' ||
        replace(v_user_id::text, '-', '');

    v_descricao_segredo :=
        'SafeScan SMTP usuario ' ||
        v_user_id::text ||
        ' tenant ' ||
        p_tenant_id::text;

    if v_credencial_informada then
        if v_credencial_id is null
           or not exists (
               select 1
               from vault.secrets as segredo
               where segredo.id = v_credencial_id
           )
        then
            select segredo.id
              into v_credencial_id
              from vault.secrets as segredo
             where segredo.name = v_nome_segredo
             order by segredo.updated_at desc
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
            perform vault.update_secret(
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
        or v_atual.provedor is distinct from v_provedor
        or v_atual.host is distinct from v_host
        or v_atual.porta is distinct from p_porta
        or v_atual.modo_seguranca is distinct from v_modo
        or v_atual.usuario_smtp is distinct from v_usuario
        or v_atual.remetente_email is distinct from v_remetente
        or v_credencial_informada;

    if v_atual.tenant_id is null then
        insert into private.usuario_email_configuracao (
            tenant_id,
            user_id,
            ativo,
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
            v_user_id,
            false,
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
            v_user_id,
            v_user_id
        )
        returning private.usuario_email_configuracao.versao
        into v_nova_versao;
    else
        update private.usuario_email_configuracao as destino
           set provedor = v_provedor,
               host = v_host,
               porta = p_porta,
               modo_seguranca = v_modo,
               usuario_smtp = v_usuario,
               remetente_email = v_remetente,
               remetente_nome_padrao = v_nome_remetente,
               responder_para_padrao = v_reply_to,
               credencial_vault_id = v_credencial_id,
               ativo =
                   case
                       when v_mudou_conexao then false
                       else destino.ativo
                   end,
               ultimo_teste_status =
                   case
                       when v_mudou_conexao then 'NAO_TESTADO'
                       else destino.ultimo_teste_status
                   end,
               ultimo_teste_codigo =
                   case
                       when v_mudou_conexao then null
                       else destino.ultimo_teste_codigo
                   end,
               ultimo_teste_em =
                   case
                       when v_mudou_conexao then null
                       else destino.ultimo_teste_em
                   end,
               ultimo_teste_por =
                   case
                       when v_mudou_conexao then null
                       else destino.ultimo_teste_por
                   end,
               atualizado_por = v_user_id,
               versao = destino.versao + 1
         where destino.tenant_id = p_tenant_id
           and destino.user_id = v_user_id
        returning destino.versao
        into v_nova_versao;
    end if;

    insert into public.auditoria_sistema (
        usuario_id,
        usuario_email,
        acao,
        tabela,
        registro_id,
        descricao,
        dados
    )
    values (
        v_user_id,
        nullif(v_user_email, ''),
        'EMAIL_USUARIO_CONFIGURACAO_SALVA',
        'usuario_email_configuracao',
        p_tenant_id::text || ':' || v_user_id::text,
        'Configuração SMTP pessoal salva.',
        jsonb_build_object(
            'tenantId', p_tenant_id,
            'userId', v_user_id,
            'provedor', v_provedor,
            'host', v_host,
            'porta', p_porta,
            'modoSeguranca', v_modo,
            'remetenteEmail', v_remetente,
            'credencialAtualizada', v_credencial_informada,
            'conexaoAlterada', v_mudou_conexao,
            'versao', v_nova_versao
        )
    );

    return query
    select
        p_tenant_id,
        v_user_id,
        v_nova_versao,
        v_credencial_informada;
end;
$function$;

revoke all
on function public.usuario_salvar_configuracao_email(
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
    integer
)
from public, anon, authenticated, service_role;

grant execute
on function public.usuario_salvar_configuracao_email(
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
    integer
)
to authenticated;

-- ============================================================================
-- 4. DESATIVAÇÃO — PRESERVA O SEGREDO
-- ============================================================================

create or replace function public.usuario_desativar_configuracao_email(
    p_tenant_id uuid,
    p_versao_esperada integer
)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth'
as $function$
declare
    v_user_id uuid;
    v_user_email text;
    v_config private.usuario_email_configuracao%rowtype;
    v_nova_versao integer;
begin
    v_user_id := auth.uid();

    if v_user_id is null then
        raise exception
            'Sessão autenticada obrigatória.'
            using errcode = '42501';
    end if;

    if not private.usuario_email_usuario_elegivel(
        p_tenant_id,
        v_user_id
    ) then
        raise exception
            'Sem permissão para desativar a configuração pessoal de e-mail neste tenant.'
            using errcode = '42501';
    end if;

    if p_versao_esperada is null
       or p_versao_esperada < 1
    then
        raise exception
            'Versão da configuração inválida.'
            using errcode = '22023';
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
            'safescan:usuario-email:' ||
                p_tenant_id::text ||
                ':' ||
                v_user_id::text,
            0
        )
    );

    select config.*
      into v_config
      from private.usuario_email_configuracao as config
     where config.tenant_id = p_tenant_id
       and config.user_id = v_user_id
     for update;

    if not found then
        raise exception
            'Configuração SMTP pessoal não localizada.';
    end if;

    if v_config.versao <> p_versao_esperada then
        raise exception
            'A configuração mudou. Atualize os dados antes de desativar.';
    end if;

    select lower(btrim(coalesce(usuario.email, '')))
      into v_user_email
      from auth.users as usuario
     where usuario.id = v_user_id;

    update private.usuario_email_configuracao as destino
       set ativo = false,
           atualizado_por = v_user_id,
           versao = destino.versao + 1
     where destino.tenant_id = p_tenant_id
       and destino.user_id = v_user_id
    returning destino.versao
    into v_nova_versao;

    insert into public.auditoria_sistema (
        usuario_id,
        usuario_email,
        acao,
        tabela,
        registro_id,
        descricao,
        dados
    )
    values (
        v_user_id,
        nullif(v_user_email, ''),
        'EMAIL_USUARIO_CONFIGURACAO_DESATIVADA',
        'usuario_email_configuracao',
        p_tenant_id::text || ':' || v_user_id::text,
        'Configuração SMTP pessoal desativada.',
        jsonb_build_object(
            'tenantId', p_tenant_id,
            'userId', v_user_id,
            'versao', v_nova_versao
        )
    );

    return v_nova_versao;
end;
$function$;

revoke all
on function public.usuario_desativar_configuracao_email(uuid, integer)
from public, anon, authenticated, service_role;

grant execute
on function public.usuario_desativar_configuracao_email(uuid, integer)
to authenticated;

-- ============================================================================
-- 5. BACKEND — SEGREDO PARA TESTE SMTP
-- ============================================================================

create or replace function public.backend_obter_configuracao_email_usuario_para_teste(
    p_tenant_id uuid,
    p_user_id uuid
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
set search_path to 'pg_catalog', 'public', 'private', 'vault'
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
        segredo.decrypted_secret as credencial,
        config.versao
    from private.usuario_email_configuracao as config
    join vault.decrypted_secrets as segredo
      on segredo.id = config.credencial_vault_id
    where private.usuario_email_usuario_elegivel(
              p_tenant_id,
              p_user_id
          )
      and config.tenant_id = p_tenant_id
      and config.user_id = p_user_id
    limit 1;
$function$;

revoke all
on function public.backend_obter_configuracao_email_usuario_para_teste(
    uuid,
    uuid
)
from public, anon, authenticated, service_role;

grant execute
on function public.backend_obter_configuracao_email_usuario_para_teste(
    uuid,
    uuid
)
to service_role;

-- ============================================================================
-- 6. BACKEND — REGISTRO DO TESTE SMTP
-- ============================================================================

create or replace function public.backend_registrar_teste_email_usuario(
    p_tenant_id uuid,
    p_user_id uuid,
    p_status text,
    p_codigo text,
    p_versao_esperada integer,
    p_executor_id uuid
)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private', 'auth', 'vault'
as $function$
declare
    v_status text;
    v_codigo text;
    v_user_email text;
    v_config private.usuario_email_configuracao%rowtype;
    v_nova_versao integer;
begin
    if p_tenant_id is null
       or p_user_id is null
       or p_executor_id is null
    then
        raise exception
            'Identificadores obrigatórios não informados.'
            using errcode = '22023';
    end if;

    if p_executor_id <> p_user_id then
        raise exception
            'O teste SMTP pessoal deve ser executado pelo próprio usuário.'
            using errcode = '42501';
    end if;

    if not private.usuario_email_usuario_elegivel(
        p_tenant_id,
        p_user_id
    ) then
        raise exception
            'Usuário não elegível para testar SMTP pessoal neste tenant.'
            using errcode = '42501';
    end if;

    if p_versao_esperada is null
       or p_versao_esperada < 1
    then
        raise exception
            'Versão testada inválida.'
            using errcode = '22023';
    end if;

    v_status := upper(btrim(coalesce(p_status, '')));

    if v_status not in (
        'APROVADO',
        'REPROVADO'
    ) then
        raise exception
            'Status de teste inválido.'
            using errcode = '22023';
    end if;

    if v_status = 'APROVADO' then
        v_codigo := null;
    else
        v_codigo := upper(btrim(coalesce(p_codigo, '')));

        if v_codigo = ''
           or v_codigo !~ '^[A-Z0-9_]{1,80}$'
        then
            v_codigo := 'SMTP_TESTE_FALHOU';
        end if;
    end if;

    perform pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended(
            'safescan:usuario-email:' ||
                p_tenant_id::text ||
                ':' ||
                p_user_id::text,
            0
        )
    );

    select config.*
      into v_config
      from private.usuario_email_configuracao as config
     where config.tenant_id = p_tenant_id
       and config.user_id = p_user_id
     for update;

    if not found then
        raise exception
            'Configuração SMTP pessoal não localizada.';
    end if;

    if v_config.versao <> p_versao_esperada then
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
           from vault.secrets as segredo
           where segredo.id = v_config.credencial_vault_id
       )
    then
        raise exception
            'Configuração SMTP pessoal incompleta.';
    end if;

    select lower(btrim(coalesce(usuario.email, '')))
      into v_user_email
      from auth.users as usuario
     where usuario.id = p_user_id;

    update private.usuario_email_configuracao as destino
       set ativo = (v_status = 'APROVADO'),
           ultimo_teste_status = v_status,
           ultimo_teste_codigo = v_codigo,
           ultimo_teste_em = now(),
           ultimo_teste_por = p_executor_id,
           atualizado_por = p_executor_id,
           versao = destino.versao + 1
     where destino.tenant_id = p_tenant_id
       and destino.user_id = p_user_id
    returning destino.versao
    into v_nova_versao;

    insert into public.auditoria_sistema (
        usuario_id,
        usuario_email,
        acao,
        tabela,
        registro_id,
        descricao,
        dados
    )
    values (
        p_user_id,
        nullif(v_user_email, ''),
        'EMAIL_USUARIO_SMTP_TESTADO',
        'usuario_email_configuracao',
        p_tenant_id::text || ':' || p_user_id::text,
        'Teste da configuração SMTP pessoal registrado.',
        jsonb_build_object(
            'tenantId', p_tenant_id,
            'userId', p_user_id,
            'status', v_status,
            'codigo', v_codigo,
            'ativo', (v_status = 'APROVADO'),
            'versao', v_nova_versao
        )
    );

    return v_nova_versao;
end;
$function$;

revoke all
on function public.backend_registrar_teste_email_usuario(
    uuid,
    uuid,
    text,
    text,
    integer,
    uuid
)
from public, anon, authenticated, service_role;

grant execute
on function public.backend_registrar_teste_email_usuario(
    uuid,
    uuid,
    text,
    text,
    integer,
    uuid
)
to service_role;

-- ============================================================================
-- 7. BACKEND — SEGREDO SOMENTE QUANDO ELEGÍVEL PARA ENVIO
-- ============================================================================

create or replace function public.backend_obter_configuracao_email_usuario_para_envio(
    p_tenant_id uuid,
    p_user_id uuid
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
set search_path to 'pg_catalog', 'public', 'private', 'vault'
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
        segredo.decrypted_secret as credencial,
        config.versao
    from private.usuario_email_configuracao as config
    join vault.decrypted_secrets as segredo
      on segredo.id = config.credencial_vault_id
    where private.usuario_email_usuario_elegivel(
              p_tenant_id,
              p_user_id
          )
      and config.tenant_id = p_tenant_id
      and config.user_id = p_user_id
      and config.ativo = true
      and config.ultimo_teste_status = 'APROVADO'
      and config.credencial_vault_id is not null
    limit 1;
$function$;

revoke all
on function public.backend_obter_configuracao_email_usuario_para_envio(
    uuid,
    uuid
)
from public, anon, authenticated, service_role;

grant execute
on function public.backend_obter_configuracao_email_usuario_para_envio(
    uuid,
    uuid
)
to service_role;

-- ============================================================================
-- 8. INVARIANTES
--
-- RPCs authenticated:
-- - derivam user_id exclusivamente de auth.uid();
-- - não aceitam usuário alvo;
-- - nunca retornam credencial ou credencial_vault_id.
--
-- RPCs backend:
-- - são service_role only;
-- - decrypted_secret aparece somente nos contratos de teste/envio.
--
-- Nenhum DDL/DML desta migration altera tenant_email_configuracao,
-- email_provedor_configuracao, Edge Functions, resolver ou interface.
-- ============================================================================

commit;
