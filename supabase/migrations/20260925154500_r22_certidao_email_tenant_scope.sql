-- ============================================================================
-- SAFESCAN BRASIL
-- R2.2-C — CERTIDÃO MENSAL / EMAIL TENANT SCOPE
--
-- Objetivos:
-- - tenantizar a configuração operacional da Certidão Mensal;
-- - eliminar fallback GLOBAL cross-tenant;
-- - preservar GLOBAL legado sem tenant somente como inativo;
-- - criar contratos administrativos tenant-scoped;
-- - preservar a assinatura da RPC operacional usada pela Edge.
--
-- IMPORTANTE:
-- Esta migration NÃO configura provedor de e-mail para nenhum tenant.
-- SAFESCAN_GERENCIADO / PROVEDOR_CLIENTE / DESATIVADO pertencem à fundação
-- R2.2-A e não são selecionados automaticamente aqui.
-- ============================================================================

begin;

-- ============================================================================
-- 1. ADICIONAR TENANT_ID
-- ============================================================================

alter table
public.certidao_mensal_email_configuracoes
add column tenant_id uuid null;

comment on column
public.certidao_mensal_email_configuracoes.tenant_id
is
'Tenant proprietário da configuração de e-mail da Certidão Mensal. GLOBAL legado sem tenant é permitido somente inativo.';

-- ============================================================================
-- 2. BACKFILL DETERMINÍSTICO SOMENTE DE CONFIGURAÇÕES EMPRESA
-- ============================================================================

update
public.certidao_mensal_email_configuracoes config
set tenant_id =
    empresa.tenant_id
from
public.empresas empresa
where
    config.escopo =
        'EMPRESA'
    and config.empresa_id =
        empresa.id
    and config.tenant_id is distinct from
        empresa.tenant_id;

do $block$
begin
    if exists (
        select 1
        from
            public.certidao_mensal_email_configuracoes config
        where
            config.escopo =
                'EMPRESA'
            and config.tenant_id is null
    ) then
        raise exception
            'R2.2-C abortada: existe configuração EMPRESA sem tenant determinístico.'
            using errcode = '23514';
    end if;
end;
$block$;

-- ============================================================================
-- 3. GLOBAL LEGADO SEM TENANT
--
-- Nunca é atribuído por inferência.
-- Permanece somente inativo e será ignorado pelo novo resolver.
-- ============================================================================

update
public.certidao_mensal_email_configuracoes
set ativo =
    false
where
    escopo =
        'GLOBAL'
    and tenant_id is null
    and ativo =
        true;

-- ============================================================================
-- 4. INTEGRIDADE TENANT / EMPRESA
-- ============================================================================

alter table
public.certidao_mensal_email_configuracoes
add constraint
certidao_mensal_email_config_tenant_id_fkey
foreign key (
    tenant_id
)
references
public.tenants(id)
on delete restrict;

alter table
public.certidao_mensal_email_configuracoes
add constraint
certidao_mensal_email_config_tenant_empresa_fkey
foreign key (
    tenant_id,
    empresa_id
)
references
public.empresas(
    tenant_id,
    id
)
on delete cascade;

alter table
public.certidao_mensal_email_configuracoes
add constraint
certidao_mensal_email_config_tenant_scope_check
check (
    (
        escopo =
            'EMPRESA'
        and empresa_id is not null
        and tenant_id is not null
    )
    or
    (
        escopo =
            'GLOBAL'
        and empresa_id is null
        and (
            tenant_id is not null
            or ativo =
                false
        )
    )
);

-- ============================================================================
-- 5. UNICIDADE TENANT-SCOPED
-- ============================================================================

drop index if exists
public.certidao_mensal_email_config_global_uidx;

drop index if exists
public.certidao_mensal_email_config_empresa_uidx;

create unique index
certidao_mensal_email_config_tenant_global_uidx
on
public.certidao_mensal_email_configuracoes (
    tenant_id
)
where
    escopo =
        'GLOBAL'
    and tenant_id is not null;

create unique index
certidao_mensal_email_config_tenant_empresa_uidx
on
public.certidao_mensal_email_configuracoes (
    tenant_id,
    empresa_id
)
where
    escopo =
        'EMPRESA';

create index
certidao_mensal_email_config_tenant_idx
on
public.certidao_mensal_email_configuracoes (
    tenant_id,
    escopo
);

-- ============================================================================
-- 6. LISTAGEM ADMINISTRATIVA TENANT-SCOPED
-- ============================================================================

create or replace function
public.listar_configuracoes_email_certidao_mensal_tenant(
    p_tenant_id uuid
)
returns table (
    id uuid,
    tenant_id uuid,
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
set search_path =
    pg_catalog,
    public,
    auth
as $function$
begin
    if not public.usuario_pode_gerenciar_tenant(
        p_tenant_id
    ) then
        raise exception
            'Sem permissão para consultar configurações de envio da Certidão Mensal deste tenant.'
            using errcode = '42501';
    end if;

    return query
    select
        config.id,
        config.tenant_id,
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
    from
        public.certidao_mensal_email_configuracoes config
    where
        config.tenant_id =
            p_tenant_id
    order by
        case
            when config.escopo =
                'GLOBAL'
            then 1
            else 2
        end,
        config.empresa_id nulls first;
end;
$function$;

revoke all
on function
public.listar_configuracoes_email_certidao_mensal_tenant(
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.listar_configuracoes_email_certidao_mensal_tenant(
    uuid
)
to
authenticated,
service_role;

-- ============================================================================
-- 7. SALVAMENTO ADMINISTRATIVO TENANT-SCOPED
-- ============================================================================

create or replace function
public.salvar_configuracao_email_certidao_mensal_tenant(
    p_tenant_id uuid,
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
    p_anexar_pdfs boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path =
    pg_catalog,
    public,
    auth
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
    if not public.usuario_pode_gerenciar_tenant(
        p_tenant_id
    ) then
        raise exception
            'Sem permissão para alterar configurações de envio da Certidão Mensal deste tenant.'
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
           from
               public.empresas empresa
           where
               empresa.id =
                   p_empresa_id
               and empresa.tenant_id =
                   p_tenant_id
       )
    then
        raise exception
            'Empresa não localizada neste tenant para configuração de envio.'
            using errcode = 'P0002';
    end if;

    if coalesce(
        p_anexar_pdfs,
        false
    ) then
        raise exception
            'O envio automático de PDFs permanece desativado nesta configuração.'
            using errcode = '22023';
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
           char_length(
               v_responder_para
           ) > 254
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

    if char_length(
        v_nome_remetente
    ) not between 1 and 120
       or position(
           E'\n' in
           v_nome_remetente
       ) > 0
       or position(
           E'\r' in
           v_nome_remetente
       ) > 0
    then
        raise exception
            'O nome do remetente é inválido.'
            using errcode = '22023';
    end if;

    if char_length(
        v_assunto_modelo
    ) not between 1 and 180
       or position(
           E'\n' in
           v_assunto_modelo
       ) > 0
       or position(
           E'\r' in
           v_assunto_modelo
       ) > 0
    then
        raise exception
            'O assunto do e-mail é inválido.'
            using errcode = '22023';
    end if;

    if char_length(
        v_corpo_modelo
    ) not between 1 and 10000
       or v_corpo_modelo !~*
            '\{\{\s*itens\s*\}\}'
    then
        raise exception
            'O corpo do e-mail é inválido ou não contém {{itens}}.'
            using errcode = '22023';
    end if;

    if coalesce(
        p_ativo,
        false
    )
       and not coalesce(
           p_usar_email_empresa,
           true
       )
       and cardinality(
           v_destinatarios
       ) = 0
    then
        raise exception
            'A configuração ativa precisa de ao menos um destinatário.'
            using errcode = '22023';
    end if;

    select
        config.*
    into
        v_config
    from
        public.certidao_mensal_email_configuracoes config
    where
        config.tenant_id =
            p_tenant_id
        and (
            (
                v_escopo =
                    'GLOBAL'
                and config.escopo =
                    'GLOBAL'
                and config.empresa_id is null
            )
            or
            (
                v_escopo =
                    'EMPRESA'
                and config.escopo =
                    'EMPRESA'
                and config.empresa_id =
                    p_empresa_id
            )
        )
    limit 1
    for update;

    if found then
        update
            public.certidao_mensal_email_configuracoes
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
                false,

            estrategia_excedente =
                'DIVIDIR_EM_PARTES',

            limite_mensagem_bytes =
                18874368,

            versao =
                versao + 1,

            atualizado_por =
                auth.uid()

        where
            id =
                v_config.id

        returning *
        into
            v_config;
    else
        insert into
        public.certidao_mensal_email_configuracoes (
            tenant_id,
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
            p_tenant_id,
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
            false,
            'DIVIDIR_EM_PARTES',
            18874368,
            auth.uid(),
            auth.uid()
        )
        returning *
        into
            v_config;
    end if;

    return to_jsonb(
        v_config
    );
end;
$function$;

revoke all
on function
public.salvar_configuracao_email_certidao_mensal_tenant(
    uuid,
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
from
public,
anon,
authenticated;

grant execute
on function
public.salvar_configuracao_email_certidao_mensal_tenant(
    uuid,
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
to
authenticated,
service_role;

-- ============================================================================
-- 8. EXCLUSÃO TENANT-SCOPED
-- ============================================================================

create or replace function
public.excluir_configuracao_email_certidao_mensal_tenant(
    p_tenant_id uuid,
    p_empresa_id uuid
)
returns boolean
language plpgsql
security definer
set search_path =
    pg_catalog,
    public,
    auth
as $function$
declare
    v_excluida boolean;
begin
    if not public.usuario_pode_gerenciar_tenant(
        p_tenant_id
    ) then
        raise exception
            'Sem permissão para excluir configurações de envio da Certidão Mensal deste tenant.'
            using errcode = '42501';
    end if;

    if p_empresa_id is null then
        raise exception
            'A configuração GLOBAL do tenant não pode ser excluída por esta operação.'
            using errcode = '22023';
    end if;

    if not exists (
        select 1
        from
            public.empresas empresa
        where
            empresa.id =
                p_empresa_id
            and empresa.tenant_id =
                p_tenant_id
    ) then
        raise exception
            'Empresa não localizada neste tenant.'
            using errcode = 'P0002';
    end if;

    delete
    from
        public.certidao_mensal_email_configuracoes config
    where
        config.tenant_id =
            p_tenant_id
        and config.escopo =
            'EMPRESA'
        and config.empresa_id =
            p_empresa_id;

    v_excluida :=
        found;

    return
        v_excluida;
end;
$function$;

revoke all
on function
public.excluir_configuracao_email_certidao_mensal_tenant(
    uuid,
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.excluir_configuracao_email_certidao_mensal_tenant(
    uuid,
    uuid
)
to
authenticated,
service_role;

-- ============================================================================
-- 9. RESOLUÇÃO OPERACIONAL DA CERTIDÃO
--
-- Mantém a assinatura utilizada pela Edge:
-- obter_configuracao_email_certidao_mensal_para_envio(p_empresa_id uuid)
--
-- Resolução:
-- EMPRESA do mesmo tenant
-- ↓
-- GLOBAL do mesmo tenant
--
-- GLOBAL legado com tenant_id NULL nunca participa.
-- ============================================================================

create or replace function
public.obter_configuracao_email_certidao_mensal_para_envio(
    p_empresa_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path =
    pg_catalog,
    public
as $function$
declare
    v_tenant_id uuid;

    v_config
        public.certidao_mensal_email_configuracoes%rowtype;
begin
    if p_empresa_id is null then
        return null;
    end if;

    select
        empresa.tenant_id
    into
        v_tenant_id
    from
        public.empresas empresa
    where
        empresa.id =
            p_empresa_id;

    if not found
       or v_tenant_id is null
    then
        return null;
    end if;

    select
        config.*
    into
        v_config
    from
        public.certidao_mensal_email_configuracoes config
    where
        config.tenant_id =
            v_tenant_id
        and config.escopo =
            'EMPRESA'
        and config.empresa_id =
            p_empresa_id
    limit 1;

    if not found then
        select
            config.*
        into
            v_config
        from
            public.certidao_mensal_email_configuracoes config
        where
            config.tenant_id =
                v_tenant_id
            and config.escopo =
                'GLOBAL'
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
public.obter_configuracao_email_certidao_mensal_para_envio(
    uuid
)
from
public,
anon,
authenticated;

grant execute
on function
public.obter_configuracao_email_certidao_mensal_para_envio(
    uuid
)
to
service_role;

-- ============================================================================
-- 10. DESATIVAR CONTRATOS ADMINISTRATIVOS LEGADOS PARA AUTHENTICATED
--
-- Eles permanecem existentes por compatibilidade histórica/service_role,
-- mas deixam de ser uma porta administrativa cross-tenant para o frontend.
-- ============================================================================

revoke execute
on function
public.admin_listar_configuracoes_email_certidao_mensal()
from
authenticated;

revoke execute
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
from
authenticated;

revoke execute
on function
public.admin_excluir_configuracao_email_certidao_mensal(
    uuid
)
from
authenticated;

-- ============================================================================
-- 11. COMENTÁRIOS
-- ============================================================================

comment on function
public.listar_configuracoes_email_certidao_mensal_tenant(
    uuid
)
is
'Lista somente configurações de Certidão Mensal pertencentes ao tenant informado e gerenciável pelo usuário atual.';

comment on function
public.salvar_configuracao_email_certidao_mensal_tenant(
    uuid,
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
is
'Cria ou atualiza configuração GLOBAL do tenant ou configuração específica de empresa pertencente ao mesmo tenant.';

comment on function
public.excluir_configuracao_email_certidao_mensal_tenant(
    uuid,
    uuid
)
is
'Exclui somente configuração EMPRESA pertencente ao tenant autorizado.';

comment on function
public.obter_configuracao_email_certidao_mensal_para_envio(
    uuid
)
is
'Resolve configuração EMPRESA e fallback GLOBAL exclusivamente dentro do tenant da empresa. GLOBAL legado sem tenant é ignorado.';

notify pgrst, 'reload schema';

commit;
