-- MASTER-EMAIL-E2
-- Gate exclusivo da Conta Mestre para o e-mail operacional do tenant.
--
-- Recurso:
--   email_operacional
--
-- Compatibilidade:
--   ausencia de registro = recurso ATIVO.
--
-- O gate NAO altera:
--   tenant_email_configuracao
--   host
--   porta
--   usuario SMTP
--   remetente
--   credencial
--   teste
--   versao
--   historico
--
-- Quando OFF, o backend de envio devolve modo_envio = DESATIVADO.
-- O resolvedor existente ja bloqueia o canal TENANT nesse estado.
--
-- Comunicacoes do canal PLATAFORMA nao sao afetadas.

begin;


-- ============================================================
-- 1. PREFLIGHT
-- ============================================================

do $preflight$
begin
    if to_regclass(
        'public.tenant_recursos_operacionais'
    ) is null
       or to_regclass(
        'public.tenants'
    ) is null
       or to_regclass(
        'public.auditoria_sistema'
    ) is null
       or to_regprocedure(
        'public.usuario_admin_global()'
    ) is null
       or to_regprocedure(
        'public.usuario_pode_gerenciar_tenant(uuid)'
    ) is null
       or to_regprocedure(
        'public.backend_obter_configuracao_email_tenant_para_envio(uuid)'
    ) is null
    then
        raise exception
            'MASTER-EMAIL-E2: fundacao obrigatoria ausente.';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_constraint constraint_registro
        where constraint_registro.conrelid =
            'public.tenant_recursos_operacionais'::regclass
          and constraint_registro.conname =
            'tenant_recursos_operacionais_recurso_check'
    ) then
        raise exception
            'MASTER-EMAIL-E2: constraint canonica de recursos ausente.';
    end if;

    if to_regprocedure(
        'private.tenant_recurso_email_operacional_habilitado(uuid)'
    ) is not null
       or to_regprocedure(
        'public.consultar_recurso_email_operacional_tenant(uuid)'
    ) is not null
       or to_regprocedure(
        'public.admin_salvar_recurso_email_operacional_tenant(uuid,boolean)'
    ) is not null
       or to_regprocedure(
        'public.backend_obter_configuracao_email_tenant_para_envio_email_gate_core(uuid)'
    ) is not null
    then
        raise exception
            'MASTER-EMAIL-E2: objetos desta etapa ja existem.';
    end if;
end;
$preflight$;


-- ============================================================
-- 2. AMPLIAR CATALOGO DE RECURSOS
-- ============================================================

alter table public.tenant_recursos_operacionais
    drop constraint
        tenant_recursos_operacionais_recurso_check;

alter table public.tenant_recursos_operacionais
    add constraint
        tenant_recursos_operacionais_recurso_check
    check (
        recurso_chave in (
            'obras',
            'aniversariantes',
            'treinamentos',
            'gestao_documental_sst',
            'pin_emergencia_empresa',
            'pin_acesso_usuario',
            'email_operacional'
        )
    );


-- ============================================================
-- 3. HELPER PRIVADO
-- ausencia de linha = ATIVO
-- ============================================================

create function private.tenant_recurso_email_operacional_habilitado(
    p_tenant_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
    select
        p_tenant_id is not null

        and exists (
            select 1
            from public.tenants tenant
            where tenant.id =
                p_tenant_id
              and tenant.status =
                'ativo'
        )

        and coalesce(
            (
                select recurso.ativo
                from public.tenant_recursos_operacionais recurso
                where recurso.tenant_id =
                    p_tenant_id
                  and recurso.recurso_chave =
                    'email_operacional'
            ),
            true
        );
$function$;

revoke all on function
    private.tenant_recurso_email_operacional_habilitado(uuid)
from public, anon, authenticated, service_role;


-- ============================================================
-- 4. CONSULTA DO ESTADO
-- Conta Mestre e administrador autorizado podem LER.
-- Somente a Conta Mestre podera ALTERAR.
-- ============================================================

create function public.consultar_recurso_email_operacional_tenant(
    p_tenant_id uuid
)
returns table (
    email_operacional_ativo boolean,
    email_operacional_configurado boolean,
    email_operacional_atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Autenticacao obrigatoria.';
    end if;

    if p_tenant_id is null
       or not exists (
           select 1
           from public.tenants tenant
           where tenant.id =
               p_tenant_id
       )
    then
        raise exception using
            errcode = '22023',
            message = 'Tenant invalido.';
    end if;

    if not (
        coalesce(
            public.usuario_admin_global(),
            false
        )
        or coalesce(
            public.usuario_pode_gerenciar_tenant(
                p_tenant_id
            ),
            false
        )
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuario sem acesso ao estado do e-mail operacional deste tenant.';
    end if;

    return query
    select
        private.tenant_recurso_email_operacional_habilitado(
            p_tenant_id
        ),

        exists (
            select 1
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id =
                p_tenant_id
              and recurso.recurso_chave =
                'email_operacional'
        ),

        (
            select recurso.updated_at
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id =
                p_tenant_id
              and recurso.recurso_chave =
                'email_operacional'
        );
end;
$function$;

revoke all on function
    public.consultar_recurso_email_operacional_tenant(uuid)
from public, anon;

grant execute on function
    public.consultar_recurso_email_operacional_tenant(uuid)
to authenticated;


-- ============================================================
-- 5. MUTACAO EXCLUSIVA DA CONTA MESTRE
-- ============================================================

create function public.admin_salvar_recurso_email_operacional_tenant(
    p_tenant_id uuid,
    p_ativo boolean
)
returns table (
    tenant_id uuid,
    recurso_chave text,
    ativo boolean,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
    v_actor uuid :=
        auth.uid();
begin
    if v_actor is null
       or not coalesce(
           public.usuario_admin_global(),
           false
       )
    then
        raise exception using
            errcode = '42501',
            message = 'Alteracao restrita a Conta Mestre SafeScan.';
    end if;

    if p_tenant_id is null
       or not exists (
           select 1
           from public.tenants tenant
           where tenant.id =
               p_tenant_id
       )
    then
        raise exception using
            errcode = '22023',
            message = 'Tenant invalido.';
    end if;

    if p_ativo is null then
        raise exception using
            errcode = '22023',
            message = 'Estado do e-mail operacional nao informado.';
    end if;

    insert into public.tenant_recursos_operacionais (
        tenant_id,
        recurso_chave,
        ativo,
        created_at,
        updated_at,
        created_by,
        updated_by
    )
    values (
        p_tenant_id,
        'email_operacional',
        p_ativo,
        pg_catalog.now(),
        pg_catalog.now(),
        v_actor,
        v_actor
    )
    on conflict (
        tenant_id,
        recurso_chave
    )
    do update
    set
        ativo =
            excluded.ativo,

        updated_at =
            pg_catalog.now(),

        updated_by =
            v_actor;

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
        v_actor,
        auth.email(),
        'ALTERAR_EMAIL_OPERACIONAL_TENANT',
        'tenant_recursos_operacionais',
        p_tenant_id::text || ':email_operacional',
        'Conta Mestre alterou disponibilidade do e-mail operacional do tenant',
        pg_catalog.jsonb_build_object(
            'tenant_id',
            p_tenant_id,
            'recurso_chave',
            'email_operacional',
            'ativo',
            p_ativo
        )
    );

    return query
    select
        recurso.tenant_id,
        recurso.recurso_chave,
        recurso.ativo,
        recurso.updated_at
    from public.tenant_recursos_operacionais recurso
    where recurso.tenant_id =
        p_tenant_id
      and recurso.recurso_chave =
        'email_operacional';
end;
$function$;

revoke all on function
    public.admin_salvar_recurso_email_operacional_tenant(
        uuid,
        boolean
    )
from public, anon;

grant execute on function
    public.admin_salvar_recurso_email_operacional_tenant(
        uuid,
        boolean
    )
to authenticated;


-- ============================================================
-- 6. PRESERVAR IMPLEMENTACAO ATUAL COMO CORE INTERNO
-- ============================================================

alter function
    public.backend_obter_configuracao_email_tenant_para_envio(uuid)
rename to
    backend_obter_configuracao_email_tenant_para_envio_email_gate_core;

revoke all on function
    public.backend_obter_configuracao_email_tenant_para_envio_email_gate_core(uuid)
from public, anon, authenticated, service_role;


-- ============================================================
-- 7. WRAPPER OPERACIONAL COM GATE MESTRE
--
-- Gate OFF:
--   devolve modo_envio = DESATIVADO.
--
-- O resolver atual ja interrompe o envio antes de tentar
-- normalizar SMTP/credencial.
-- ============================================================

create function public.backend_obter_configuracao_email_tenant_para_envio(
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
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
begin
    if not private.tenant_recurso_email_operacional_habilitado(
        p_tenant_id
    ) then
        return query
        select
            p_tenant_id,
            'DESATIVADO'::text,
            null::text,
            null::text,
            null::integer,
            null::text,
            null::text,
            null::text,
            null::text,
            null::text,
            null::text,
            'NAO_APLICAVEL'::text,
            null::integer;

        return;
    end if;

    return query
    select
        core.tenant_id,
        core.modo_envio,
        core.provedor,
        core.host,
        core.porta,
        core.modo_seguranca,
        core.usuario_smtp,
        core.remetente_email,
        core.remetente_nome_padrao,
        core.responder_para_padrao,
        core.credencial,
        core.ultimo_teste_status,
        core.versao
    from public.backend_obter_configuracao_email_tenant_para_envio_email_gate_core(
        p_tenant_id
    ) core;
end;
$function$;

revoke all on function
    public.backend_obter_configuracao_email_tenant_para_envio(uuid)
from public, anon, authenticated;

grant execute on function
    public.backend_obter_configuracao_email_tenant_para_envio(uuid)
to service_role;


comment on function
    public.admin_salvar_recurso_email_operacional_tenant(
        uuid,
        boolean
    )
is
    'Conta Mestre habilita/desabilita o e-mail operacional do tenant sem apagar configuracao SMTP, credencial ou historico.';


comment on function
    public.backend_obter_configuracao_email_tenant_para_envio(uuid)
is
    'Resolvedor backend do canal TENANT respeitando o gate master-only email_operacional.';


commit;
