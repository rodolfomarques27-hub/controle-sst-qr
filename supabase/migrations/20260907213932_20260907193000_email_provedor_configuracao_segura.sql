-- ============================================================================
-- SAFESCAN BRASIL
--
-- CENTRAL DE CONFIGURAÇÃO DE PROVEDOR DE E-MAIL
--
-- E2-M2-R2B
-- ESTRUTURA PRIVADA + SUPABASE VAULT + CONTRATOS DE BACKEND
--
-- PRINCÍPIOS:
-- - nenhuma credencial SMTP é armazenada em tabela pública;
-- - credencial é armazenada somente no Supabase Vault;
-- - navegador nunca recebe segredo descriptografado;
-- - navegador nunca grava segredo diretamente;
-- - mutações sensíveis são reservadas ao service_role;
-- - Edge administrativa futura autenticará e autorizará o executor;
-- - ativação exige teste aprovado;
-- - nenhum fluxo atual de envio é alterado nesta migration.
-- ============================================================================

begin;

-- ============================================================================
-- 1. TABELA PRIVADA DE METADADOS
-- ============================================================================

create table public.email_provedor_configuracao (
    id uuid
        primary key
        default gen_random_uuid(),

    chave text
        not null
        default 'principal',

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
        not null
        default 'SafeScan Brasil',

    responder_para_padrao text
        null,

    credencial_vault_id uuid
        null,

    ativo boolean
        not null
        default false,

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

    criado_em timestamptz
        not null
        default now(),

    atualizado_em timestamptz
        not null
        default now(),

    constraint email_provedor_configuracao_chave_unique
        unique (chave),

    constraint email_provedor_configuracao_chave_check
        check (
            chave = 'principal'
        ),

    constraint email_provedor_configuracao_provedor_check
        check (
            provedor in (
                'GMAIL_SMTP',
                'MICROSOFT_365_SMTP',
                'SMTP_PERSONALIZADO'
            )
        ),

    constraint email_provedor_configuracao_host_check
        check (
            char_length(btrim(host))
            between 1 and 253
            and position(E'\n' in host) = 0
            and position(E'\r' in host) = 0
        ),

    constraint email_provedor_configuracao_porta_check
        check (
            porta between 1 and 65535
        ),

    constraint email_provedor_configuracao_modo_seguranca_check
        check (
            modo_seguranca in (
                'TLS_IMPLICITO',
                'STARTTLS'
            )
        ),

    constraint email_provedor_configuracao_usuario_smtp_check
        check (
            char_length(btrim(usuario_smtp))
            between 1 and 320
            and position(E'\n' in usuario_smtp) = 0
            and position(E'\r' in usuario_smtp) = 0
        ),

    constraint email_provedor_configuracao_remetente_email_check
        check (
            char_length(btrim(remetente_email))
            between 3 and 254
            and remetente_email ~
                '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
        ),

    constraint email_provedor_configuracao_remetente_nome_check
        check (
            char_length(btrim(remetente_nome_padrao))
            between 1 and 120
            and position(E'\n' in remetente_nome_padrao) = 0
            and position(E'\r' in remetente_nome_padrao) = 0
        ),

    constraint email_provedor_configuracao_reply_to_check
        check (
            responder_para_padrao is null
            or (
                char_length(
                    btrim(
                        responder_para_padrao
                    )
                )
                between 3 and 254

                and responder_para_padrao ~
                    '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
            )
        ),

    constraint email_provedor_configuracao_teste_status_check
        check (
            ultimo_teste_status in (
                'NAO_TESTADO',
                'APROVADO',
                'REPROVADO'
            )
        ),

    constraint email_provedor_configuracao_teste_codigo_check
        check (
            ultimo_teste_codigo is null
            or ultimo_teste_codigo ~
                '^[A-Z0-9_]{1,80}$'
        ),

    constraint email_provedor_configuracao_versao_check
        check (
            versao >= 1
        )
);

alter table
public.email_provedor_configuracao
enable row level security;

revoke all
on table
public.email_provedor_configuracao
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
public.email_provedor_configuracao
to service_role;

comment on table
public.email_provedor_configuracao
is
'Metadados privados do provedor central de e-mail do SafeScan Brasil. A credencial SMTP permanece exclusivamente no Supabase Vault.';

comment on column
public.email_provedor_configuracao.credencial_vault_id
is
'Referência opaca ao segredo armazenado no Supabase Vault. Não deve ser retornada ao frontend.';

comment on column
public.email_provedor_configuracao.ativo
is
'Somente configuração testada e aprovada pode ser ativada pelo backend.';

-- ============================================================================
-- 2. UPDATED_AT
-- ============================================================================

create or replace function
public.atualizar_email_provedor_configuracao_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
begin
    new.atualizado_em :=
        now();

    return new;
end;
$function$;

revoke all
on function
public.atualizar_email_provedor_configuracao_updated_at()
from
public,
anon,
authenticated;

drop trigger if exists
email_provedor_configuracao_atualizar_data
on
public.email_provedor_configuracao;

create trigger
email_provedor_configuracao_atualizar_data
before update
on
public.email_provedor_configuracao
for each row
execute function
public.atualizar_email_provedor_configuracao_updated_at();

-- ============================================================================
-- 3. AUTORIZAÇÃO ADMINISTRATIVA
-- ============================================================================

create or replace function
public.usuario_pode_gerenciar_provedor_email()
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

            from
            public.usuario_permissao_sistema_atual()
                permissao

            where
                coalesce(
                    permissao.ativo,
                    false
                ) = true

                and coalesce(
                    permissao.bloqueado,
                    false
                ) = false

                and (
                    coalesce(
                        permissao.acesso_global,
                        false
                    ) = true

                    or lower(
                        coalesce(
                            permissao.perfil,
                            ''
                        )
                    ) in (
                        'admin',
                        'administrador'
                    )

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


                )
        );
$function$;

revoke all
on function
public.usuario_pode_gerenciar_provedor_email()
from
public,
anon;

grant execute
on function
public.usuario_pode_gerenciar_provedor_email()
to
authenticated,
service_role;

-- ============================================================================
-- 4. LEITURA ADMINISTRATIVA SEGURA
--
-- Retorna somente metadados não sensíveis.
-- ============================================================================

create or replace function
public.admin_obter_configuracao_provedor_email()
returns table (
    id uuid,
    chave text,
    provedor text,
    host text,
    porta integer,
    modo_seguranca text,
    usuario_smtp text,
    remetente_email text,
    remetente_nome_padrao text,
    responder_para_padrao text,
    ativo boolean,
    credencial_configurada boolean,
    ultimo_teste_status text,
    ultimo_teste_codigo text,
    ultimo_teste_em timestamptz,
    ultimo_teste_por uuid,
    versao integer,
    atualizado_em timestamptz,
    atualizado_por uuid
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth, vault
as $function$
begin
    if not
        public.usuario_pode_gerenciar_provedor_email()
    then
        raise exception
            'Sem permissão para consultar a configuração do provedor de e-mail.'
            using errcode = '42501';
    end if;

    return query
    select
        configuracao.id,
        configuracao.chave,
        configuracao.provedor,
        configuracao.host,
        configuracao.porta,
        configuracao.modo_seguranca,
        configuracao.usuario_smtp,
        configuracao.remetente_email,
        configuracao.remetente_nome_padrao,
        configuracao.responder_para_padrao,
        configuracao.ativo,

        exists (
            select 1

            from
            vault.secrets segredo

            where
                segredo.id =
                    configuracao.credencial_vault_id
        ) as credencial_configurada,

        configuracao.ultimo_teste_status,
        configuracao.ultimo_teste_codigo,
        configuracao.ultimo_teste_em,
        configuracao.ultimo_teste_por,
        configuracao.versao,
        configuracao.atualizado_em,
        configuracao.atualizado_por

    from
    public.email_provedor_configuracao
        configuracao

    where
        configuracao.chave =
            'principal'

    limit 1;
end;
$function$;

revoke all
on function
public.admin_obter_configuracao_provedor_email()
from
public,
anon;

grant execute
on function
public.admin_obter_configuracao_provedor_email()
to
authenticated,
service_role;

comment on function
public.admin_obter_configuracao_provedor_email()
is
'Retorna apenas metadados seguros do provedor central, sem referência do Vault e sem credencial.';

-- ============================================================================
-- 5. SALVAR CONFIGURAÇÃO + CRIAR/ROTACIONAR CREDENCIAL
--
-- Exclusivo do service_role.
--
-- p_versao_esperada:
-- - NULL: permitido somente na primeira criação;
-- - valor: obrigatório para alteração de configuração existente.
-- ============================================================================

create or replace function
public.backend_salvar_configuracao_provedor_email(
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
    configuracao_id uuid,
    nova_versao integer,
    credencial_substituida boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, auth, vault
as $function$
declare
    v_atual
        public.email_provedor_configuracao%rowtype;

    v_provedor text;
    v_host text;
    v_porta integer;
    v_modo text;
    v_usuario text;
    v_remetente text;
    v_nome_remetente text;
    v_reply_to text;

    v_credencial_id uuid;
    v_credencial_informada boolean;
    v_mudou_conexao boolean;

    v_nome_segredo text :=
        'safescan_email_provedor_principal_smtp_credential';

    v_descricao_segredo text :=
        'Credencial SMTP do provedor principal do SafeScan Brasil.';

    v_id uuid;
    v_nova_versao integer;
begin
    if
        p_executor_id is null
    then
        raise exception
            'Executor administrativo é obrigatório.';
    end if;

    if not exists (
        select 1

        from
        auth.users usuario

        where
            usuario.id =
                p_executor_id
    )
    then
        raise exception
            'Executor administrativo informado não existe.';
    end if;

    if
        p_versao_esperada is not null

        and p_versao_esperada < 1
    then
        raise exception
            'Versão esperada inválida.';
    end if;

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'safescan:email-provedor:principal',
                0
            )
        );

    v_provedor :=
        upper(
            btrim(
                coalesce(
                    p_provedor,
                    ''
                )
            )
        );

    v_modo :=
        upper(
            btrim(
                coalesce(
                    p_modo_seguranca,
                    ''
                )
            )
        );

    v_usuario :=
        btrim(
            coalesce(
                p_usuario_smtp,
                ''
            )
        );

    v_remetente :=
        lower(
            btrim(
                coalesce(
                    p_remetente_email,
                    ''
                )
            )
        );

    v_nome_remetente :=
        btrim(
            coalesce(
                p_remetente_nome_padrao,
                ''
            )
        );

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

    if
        v_provedor not in (
            'GMAIL_SMTP',
            'MICROSOFT_365_SMTP',
            'SMTP_PERSONALIZADO'
        )
    then
        raise exception
            'Provedor de e-mail inválido.';
    end if;

    if
        v_modo not in (
            'TLS_IMPLICITO',
            'STARTTLS'
        )
    then
        raise exception
            'Modo de segurança SMTP inválido.';
    end if;

    if
        v_provedor =
            'GMAIL_SMTP'
    then
        v_host :=
            'smtp.gmail.com';

        if
            v_modo =
                'TLS_IMPLICITO'
        then
            v_porta :=
                465;
        else
            v_porta :=
                587;
        end if;

    elsif
        v_provedor =
            'MICROSOFT_365_SMTP'
    then
        v_host :=
            'smtp.office365.com';

        v_porta :=
            587;

        v_modo :=
            'STARTTLS';

    else
        v_host :=
            lower(
                btrim(
                    coalesce(
                        p_host,
                        ''
                    )
                )
            );

        v_porta :=
            p_porta;

        if
            v_porta not in (
                465,
                587,
                2525
            )
        then
            raise exception
                'Porta SMTP personalizada não permitida.';
        end if;

        if
            char_length(v_host)
                not between 4 and 253

            or position(
                '.' in v_host
            ) = 0

            or v_host !~
                '^[a-z0-9][a-z0-9.-]*[a-z0-9]$'

            or v_host ~
                '\.\.'

            or v_host ~
                '^[0-9.]+$'

            or v_host ~
                '(^|\.)(localhost|local|internal|home|lan|test)$'
        then
            raise exception
                'Host SMTP personalizado inválido ou não permitido.';
        end if;
    end if;

    if
        char_length(v_host)
            not between 1 and 253

        or v_host ~
            '[[:space:]]'
    then
        raise exception
            'Host SMTP inválido.';
    end if;

    if
        v_porta is null

        or v_porta not between
            1 and 65535
    then
        raise exception
            'Porta SMTP inválida.';
    end if;

    if
        char_length(v_usuario)
            not between 1 and 320

        or position(
            E'\n' in v_usuario
        ) > 0

        or position(
            E'\r' in v_usuario
        ) > 0
    then
        raise exception
            'Usuário SMTP inválido.';
    end if;

    if
        v_remetente !~
            '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then
        raise exception
            'E-mail remetente inválido.';
    end if;

    if
        char_length(v_nome_remetente)
            not between 1 and 120

        or position(
            E'\n' in v_nome_remetente
        ) > 0

        or position(
            E'\r' in v_nome_remetente
        ) > 0
    then
        raise exception
            'Nome do remetente inválido.';
    end if;

    if
        v_reply_to is not null

        and v_reply_to !~
            '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    then
        raise exception
            'E-mail de resposta inválido.';
    end if;

    select
        *

    into
        v_atual

    from
        public.email_provedor_configuracao

    where
        chave =
            'principal'

    for update;

    if
        v_atual.id is null
    then
        if
            p_versao_esperada is not null
        then
            raise exception
                'A configuração ainda não existe; versão esperada deve ser nula.';
        end if;
    else
        if
            p_versao_esperada is null

            or p_versao_esperada
                <> v_atual.versao
        then
            raise exception
                'A configuração foi alterada por outra operação. Atualize a tela antes de salvar.';
        end if;
    end if;

    v_credencial_id :=
        v_atual.credencial_vault_id;

    v_credencial_informada :=
        p_credencial_nova is not null

        and char_length(
            p_credencial_nova
        ) > 0;

    if
        v_credencial_informada
    then
        if
            char_length(
                p_credencial_nova
            ) > 500
        then
            raise exception
                'Credencial SMTP excede o limite permitido.';
        end if;

        if
            v_credencial_id is null

            or not exists (
                select 1

                from
                vault.secrets segredo

                where
                    segredo.id =
                        v_credencial_id
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

        if
            v_credencial_id is null
        then
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
        v_atual.id is null

        or v_atual.provedor
            is distinct from
            v_provedor

        or v_atual.host
            is distinct from
            v_host

        or v_atual.porta
            is distinct from
            v_porta

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

    insert into
    public.email_provedor_configuracao (
        chave,
        provedor,
        host,
        porta,
        modo_seguranca,
        usuario_smtp,
        remetente_email,
        remetente_nome_padrao,
        responder_para_padrao,
        credencial_vault_id,
        ativo,
        ultimo_teste_status,
        ultimo_teste_codigo,
        ultimo_teste_em,
        ultimo_teste_por,
        versao,
        criado_por,
        atualizado_por
    )
    values (
        'principal',
        v_provedor,
        v_host,
        v_porta,
        v_modo,
        v_usuario,
        v_remetente,
        v_nome_remetente,
        v_reply_to,
        v_credencial_id,
        false,
        'NAO_TESTADO',
        null,
        null,
        null,
        1,
        p_executor_id,
        p_executor_id
    )
    on conflict (
        chave
    )
    do update
    set
        provedor =
            excluded.provedor,

        host =
            excluded.host,

        porta =
            excluded.porta,

        modo_seguranca =
            excluded.modo_seguranca,

        usuario_smtp =
            excluded.usuario_smtp,

        remetente_email =
            excluded.remetente_email,

        remetente_nome_padrao =
            excluded.remetente_nome_padrao,

        responder_para_padrao =
            excluded.responder_para_padrao,

        credencial_vault_id =
            coalesce(
                excluded.credencial_vault_id,
                public.email_provedor_configuracao
                    .credencial_vault_id
            ),

        ativo =
            case
                when v_mudou_conexao
                    then false
                else
                    public.email_provedor_configuracao
                        .ativo
            end,

        ultimo_teste_status =
            case
                when v_mudou_conexao
                    then 'NAO_TESTADO'
                else
                    public.email_provedor_configuracao
                        .ultimo_teste_status
            end,

        ultimo_teste_codigo =
            case
                when v_mudou_conexao
                    then null
                else
                    public.email_provedor_configuracao
                        .ultimo_teste_codigo
            end,

        ultimo_teste_em =
            case
                when v_mudou_conexao
                    then null
                else
                    public.email_provedor_configuracao
                        .ultimo_teste_em
            end,

        ultimo_teste_por =
            case
                when v_mudou_conexao
                    then null
                else
                    public.email_provedor_configuracao
                        .ultimo_teste_por
            end,

        atualizado_por =
            p_executor_id,

        versao =
            public.email_provedor_configuracao
                .versao + 1

    returning
        public.email_provedor_configuracao.id,
        public.email_provedor_configuracao.versao

    into
        v_id,
        v_nova_versao;

    return query
    select
        v_id,
        v_nova_versao,
        v_credencial_informada;
end;
$function$;

revoke all
on function
public.backend_salvar_configuracao_provedor_email(
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
public.backend_salvar_configuracao_provedor_email(
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
to service_role;

comment on function
public.backend_salvar_configuracao_provedor_email(
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
'Contrato service_role para salvar metadados, controlar versão e criar ou rotacionar a credencial SMTP no Vault.';

-- ============================================================================
-- 6. RESOLVEDOR PRIVADO PARA TESTE
-- ============================================================================

create or replace function
public.backend_obter_configuracao_provedor_email_para_teste()
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
set search_path = pg_catalog, public, vault
as $function$
    select
        configuracao.provedor,
        configuracao.host,
        configuracao.porta,
        configuracao.modo_seguranca,
        configuracao.usuario_smtp,
        configuracao.remetente_email,
        configuracao.remetente_nome_padrao,
        configuracao.responder_para_padrao,

        segredo.decrypted_secret
            as credencial,

        configuracao.versao

    from
    public.email_provedor_configuracao
        configuracao

    join
    vault.decrypted_secrets
        segredo
        on segredo.id =
            configuracao.credencial_vault_id

    where
        configuracao.chave =
            'principal'

    limit 1;
$function$;

revoke all
on function
public.backend_obter_configuracao_provedor_email_para_teste()
from
public,
anon,
authenticated;

grant execute
on function
public.backend_obter_configuracao_provedor_email_para_teste()
to service_role;

comment on function
public.backend_obter_configuracao_provedor_email_para_teste()
is
'Resolvedor privado de configuração SMTP para teste administrativo. Pode retornar credencial somente ao service_role.';

-- ============================================================================
-- 7. REGISTRO DE TESTE COM CONTROLE DE VERSÃO
-- ============================================================================

create or replace function
public.backend_registrar_teste_provedor_email(
    p_status text,
    p_codigo text,
    p_versao_esperada integer,
    p_executor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth, vault
as $function$
declare
    v_status text;
    v_codigo text;

    v_configuracao
        public.email_provedor_configuracao%rowtype;

    v_nova_versao integer;
begin
    if
        p_executor_id is null
    then
        raise exception
            'Executor administrativo é obrigatório.';
    end if;

    if not exists (
        select 1

        from
        auth.users usuario

        where
            usuario.id =
                p_executor_id
    )
    then
        raise exception
            'Executor administrativo informado não existe.';
    end if;

    if
        p_versao_esperada is null

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

    if
        v_status not in (
            'APROVADO',
            'REPROVADO'
        )
    then
        raise exception
            'Status de teste inválido.';
    end if;

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'safescan:email-provedor:principal',
                0
            )
        );

    select
        *

    into
        v_configuracao

    from
        public.email_provedor_configuracao

    where
        chave =
            'principal'

    for update;

    if
        v_configuracao.id is null
    then
        raise exception
            'Configuração do provedor não encontrada.';
    end if;

    if
        v_configuracao.versao
            <> p_versao_esperada
    then
        raise exception
            'A configuração mudou durante o teste. Execute um novo teste.';
    end if;

    if
        v_status =
            'APROVADO'

        and (
            v_configuracao.credencial_vault_id
                is null

            or not exists (
                select 1

                from
                vault.secrets segredo

                where
                    segredo.id =
                        v_configuracao
                            .credencial_vault_id
            )
        )
    then
        raise exception
            'Não existe credencial configurada para aprovar o teste.';
    end if;

    if
        v_status =
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

        if
            v_codigo = ''

            or v_codigo !~
                '^[A-Z0-9_]{1,80}$'
        then
            v_codigo :=
                'ERRO_NAO_CLASSIFICADO';
        end if;
    end if;

    update
    public.email_provedor_configuracao

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
        chave =
            'principal'

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
public.backend_registrar_teste_provedor_email(
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
public.backend_registrar_teste_provedor_email(
    text,
    text,
    integer,
    uuid
)
to service_role;

-- ============================================================================
-- 8. ATIVAÇÃO COM CONTROLE DE VERSÃO
-- ============================================================================

create or replace function
public.backend_ativar_provedor_email(
    p_versao_esperada integer,
    p_executor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth, vault
as $function$
declare
    v_configuracao
        public.email_provedor_configuracao%rowtype;

    v_nova_versao integer;
begin
    if
        p_executor_id is null
    then
        raise exception
            'Executor administrativo é obrigatório.';
    end if;

    if not exists (
        select 1

        from
        auth.users usuario

        where
            usuario.id =
                p_executor_id
    )
    then
        raise exception
            'Executor administrativo informado não existe.';
    end if;

    if
        p_versao_esperada is null

        or p_versao_esperada < 1
    then
        raise exception
            'Versão esperada inválida.';
    end if;

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'safescan:email-provedor:principal',
                0
            )
        );

    select
        *

    into
        v_configuracao

    from
        public.email_provedor_configuracao

    where
        chave =
            'principal'

    for update;

    if
        v_configuracao.id is null
    then
        raise exception
            'Configuração do provedor não encontrada.';
    end if;

    if
        v_configuracao.versao
            <> p_versao_esperada
    then
        raise exception
            'A configuração mudou. Atualize o estado antes de ativar.';
    end if;

    if
        v_configuracao.ultimo_teste_status
            <> 'APROVADO'
    then
        raise exception
            'O provedor precisa possuir teste aprovado antes da ativação.';
    end if;

    if
        v_configuracao.credencial_vault_id
            is null

        or not exists (
            select 1

            from
            vault.secrets segredo

            where
                segredo.id =
                    v_configuracao
                        .credencial_vault_id
        )
    then
        raise exception
            'Credencial SMTP não configurada.';
    end if;

    update
    public.email_provedor_configuracao

    set
        ativo =
            true,

        atualizado_por =
            p_executor_id,

        versao =
            versao + 1

    where
        chave =
            'principal'

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
public.backend_ativar_provedor_email(
    integer,
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.backend_ativar_provedor_email(
    integer,
    uuid
)
to service_role;

-- ============================================================================
-- 9. DESATIVAÇÃO COM CONTROLE DE VERSÃO
-- ============================================================================

create or replace function
public.backend_desativar_provedor_email(
    p_versao_esperada integer,
    p_executor_id uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_configuracao
        public.email_provedor_configuracao%rowtype;

    v_nova_versao integer;
begin
    if
        p_executor_id is null
    then
        raise exception
            'Executor administrativo é obrigatório.';
    end if;

    if not exists (
        select 1

        from
        auth.users usuario

        where
            usuario.id =
                p_executor_id
    )
    then
        raise exception
            'Executor administrativo informado não existe.';
    end if;

    if
        p_versao_esperada is null

        or p_versao_esperada < 1
    then
        raise exception
            'Versão esperada inválida.';
    end if;

    perform
        pg_catalog.pg_advisory_xact_lock(
            pg_catalog.hashtextextended(
                'safescan:email-provedor:principal',
                0
            )
        );

    select
        *

    into
        v_configuracao

    from
        public.email_provedor_configuracao

    where
        chave =
            'principal'

    for update;

    if
        v_configuracao.id is null
    then
        raise exception
            'Configuração do provedor não encontrada.';
    end if;

    if
        v_configuracao.versao
            <> p_versao_esperada
    then
        raise exception
            'A configuração mudou. Atualize o estado antes de desativar.';
    end if;

    update
    public.email_provedor_configuracao

    set
        ativo =
            false,

        atualizado_por =
            p_executor_id,

        versao =
            versao + 1

    where
        chave =
            'principal'

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
public.backend_desativar_provedor_email(
    integer,
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.backend_desativar_provedor_email(
    integer,
    uuid
)
to service_role;
-- ============================================================================
-- 10. RESOLVEDOR OPERACIONAL PRIVADO
--
-- Único contrato que pode entregar a credencial descriptografada.
-- EXECUTE reservado ao service_role.
--
-- Se não houver configuração ativa e aprovada, retorna zero linhas.
-- Durante a futura migração dos transportadores, isso permitirá manter
-- fallback temporário para os secrets legados de produção.
-- ============================================================================

create or replace function
public.obter_configuracao_provedor_email_para_envio()
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
set search_path = pg_catalog, public, vault
as $function$
    select
        configuracao.provedor,
        configuracao.host,
        configuracao.porta,
        configuracao.modo_seguranca,
        configuracao.usuario_smtp,
        configuracao.remetente_email,
        configuracao.remetente_nome_padrao,
        configuracao.responder_para_padrao,

        segredo.decrypted_secret
            as credencial,

        configuracao.versao

    from
    public.email_provedor_configuracao
        configuracao

    join
    vault.decrypted_secrets
        segredo
        on segredo.id =
            configuracao.credencial_vault_id

    where
        configuracao.chave =
            'principal'

        and configuracao.ativo =
            true

        and configuracao.ultimo_teste_status =
            'APROVADO'

    limit 1;
$function$;

revoke all
on function
public.obter_configuracao_provedor_email_para_envio()
from
public,
anon,
authenticated;

grant execute
on function
public.obter_configuracao_provedor_email_para_envio()
to service_role;

comment on function
public.obter_configuracao_provedor_email_para_envio()
is
'Resolvedor operacional privado de configuração SMTP. EXECUTE exclusivo do service_role.';

-- ============================================================================
-- 11. REFORÇO FINAL DE PRIVILÉGIOS
-- ============================================================================

revoke all
on table
public.email_provedor_configuracao
from
public,
anon,
authenticated;

commit;
