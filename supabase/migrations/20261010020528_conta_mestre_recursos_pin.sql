-- MASTER-PIN-B1
-- Controles exclusivos da Conta Mestre para recursos de PIN por tenant.
--
-- Recursos:
--   pin_emergencia_empresa
--   pin_acesso_usuario
--
-- Compatibilidade:
--   ausencia de registro = recurso ATIVO.
--
-- Desabilitar um recurso NAO apaga PIN, hash ou historico existente.

begin;

do $preflight$
begin
    if to_regclass(
        'public.tenant_recursos_operacionais'
    ) is null
       or to_regclass(
        'public.tenants'
    ) is null
       or to_regclass(
        'public.empresas'
    ) is null
       or to_regclass(
        'public.colaboradores'
    ) is null
       or to_regclass(
        'public.auditoria_tokens_publicos'
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
        'private.emergencia_qr_usuario_elegivel(uuid,uuid)'
    ) is null
       or to_regprocedure(
        'public.definir_senha_emergencia_empresa(uuid,text,boolean)'
    ) is null
       or to_regprocedure(
        'public.definir_pin_emergencia_usuario(uuid,uuid,text,boolean)'
    ) is null
       or to_regprocedure(
        'public.consultar_estado_pin_emergencia_usuario(uuid)'
    ) is null
       or to_regprocedure(
        'public.validar_contato_emergencia_qr(text,text,text)'
    ) is null
       or to_regprocedure(
        'public.validar_contato_emergencia_qr_empresa_legado(text,text)'
    ) is null
       or to_regprocedure(
        'public.validar_acesso_auditoria_publica(text,text,text)'
    ) is null
    then
        raise exception
            'MASTER-PIN-B1: fundacao obrigatoria ausente.';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_constraint c
        where c.conrelid =
            'public.tenant_recursos_operacionais'::regclass
          and c.conname =
            'tenant_recursos_operacionais_recurso_check'
    ) then
        raise exception
            'MASTER-PIN-B1: constraint canonica de recursos ausente.';
    end if;

    if to_regprocedure(
        'private.tenant_recurso_pin_habilitado(uuid,text)'
    ) is not null
       or to_regprocedure(
        'public.consultar_recursos_pin_tenant(uuid)'
    ) is not null
       or to_regprocedure(
        'public.admin_consultar_recursos_pin_tenant(uuid)'
    ) is not null
       or to_regprocedure(
        'public.admin_salvar_recurso_pin_tenant(uuid,text,boolean)'
    ) is not null
       or to_regprocedure(
        'public.definir_senha_emergencia_empresa_pin_core(uuid,text,boolean)'
    ) is not null
       or to_regprocedure(
        'public.definir_pin_emergencia_usuario_pin_core(uuid,uuid,text,boolean)'
    ) is not null
       or to_regprocedure(
        'public.consultar_estado_pin_emergencia_usuario_pin_core(uuid)'
    ) is not null
       or to_regprocedure(
        'public.validar_acesso_auditoria_publica_pin_core(text,text,text)'
    ) is not null
    then
        raise exception
            'MASTER-PIN-B1: objetos desta etapa ja existem.';
    end if;
end;
$preflight$;


-- ============================================================
-- 1. AMPLIAR CATALOGO DE RECURSOS
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
            'pin_acesso_usuario'
        )
    );


-- ============================================================
-- 2. HELPER PRIVADO DE DISPONIBILIDADE
-- ausencia de registro = ATIVO
-- ============================================================

create function private.tenant_recurso_pin_habilitado(
    p_tenant_id uuid,
    p_recurso_chave text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
    select
        p_tenant_id is not null

        and lower(
            pg_catalog.btrim(
                coalesce(
                    p_recurso_chave,
                    ''
                )
            )
        ) in (
            'pin_emergencia_empresa',
            'pin_acesso_usuario'
        )

        and exists (
            select 1
            from public.tenants tenant
            where tenant.id = p_tenant_id
              and tenant.status = 'ativo'
        )

        and coalesce(
            (
                select recurso.ativo
                from public.tenant_recursos_operacionais recurso
                where recurso.tenant_id = p_tenant_id
                  and recurso.recurso_chave =
                    lower(
                        pg_catalog.btrim(
                            coalesce(
                                p_recurso_chave,
                                ''
                            )
                        )
                    )
            ),
            true
        );
$function$;

revoke all on function
    private.tenant_recurso_pin_habilitado(uuid,text)
from public, anon, authenticated, service_role;


-- ============================================================
-- 3. CONSULTA SEGURA PELO TENANT
-- somente estado; nenhum PIN/hash
-- ============================================================

create function public.consultar_recursos_pin_tenant(
    p_tenant_id uuid
)
returns table (
    pin_emergencia_empresa_ativo boolean,
    pin_emergencia_empresa_configurado boolean,
    pin_emergencia_empresa_atualizado_em timestamptz,
    pin_acesso_usuario_ativo boolean,
    pin_acesso_usuario_configurado boolean,
    pin_acesso_usuario_atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
    v_usuario uuid :=
        auth.uid();
begin
    if v_usuario is null then
        raise exception using
            errcode = '42501',
            message = 'Autenticacao obrigatoria.';
    end if;

    if p_tenant_id is null then
        raise exception using
            errcode = '22023',
            message = 'Tenant invalido.';
    end if;

    if not (
        coalesce(
            public.usuario_pode_gerenciar_tenant(
                p_tenant_id
            ),
            false
        )
        or
        coalesce(
            private.emergencia_qr_usuario_elegivel(
                p_tenant_id,
                v_usuario
            ),
            false
        )
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuario sem acesso aos recursos de PIN deste tenant.';
    end if;

    return query
    select
        private.tenant_recurso_pin_habilitado(
            p_tenant_id,
            'pin_emergencia_empresa'
        ),

        exists (
            select 1
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id = p_tenant_id
              and recurso.recurso_chave =
                'pin_emergencia_empresa'
        ),

        (
            select recurso.updated_at
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id = p_tenant_id
              and recurso.recurso_chave =
                'pin_emergencia_empresa'
        ),

        private.tenant_recurso_pin_habilitado(
            p_tenant_id,
            'pin_acesso_usuario'
        ),

        exists (
            select 1
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id = p_tenant_id
              and recurso.recurso_chave =
                'pin_acesso_usuario'
        ),

        (
            select recurso.updated_at
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id = p_tenant_id
              and recurso.recurso_chave =
                'pin_acesso_usuario'
        );
end;
$function$;

revoke all on function
    public.consultar_recursos_pin_tenant(uuid)
from public, anon;

grant execute on function
    public.consultar_recursos_pin_tenant(uuid)
to authenticated, service_role;


-- ============================================================
-- 4. CONSULTA EXCLUSIVA DA CONTA MESTRE
-- ============================================================

create function public.admin_consultar_recursos_pin_tenant(
    p_tenant_id uuid
)
returns table (
    pin_emergencia_empresa_ativo boolean,
    pin_emergencia_empresa_configurado boolean,
    pin_emergencia_empresa_atualizado_em timestamptz,
    pin_acesso_usuario_ativo boolean,
    pin_acesso_usuario_configurado boolean,
    pin_acesso_usuario_atualizado_em timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
begin
    if auth.uid() is null
       or not coalesce(
           public.usuario_admin_global(),
           false
       )
    then
        raise exception using
            errcode = '42501',
            message = 'Operacao restrita a Conta Mestre SafeScan.';
    end if;

    if p_tenant_id is null
       or not exists (
           select 1
           from public.tenants tenant
           where tenant.id = p_tenant_id
       )
    then
        raise exception using
            errcode = '22023',
            message = 'Tenant invalido.';
    end if;

    return query
    select
        private.tenant_recurso_pin_habilitado(
            p_tenant_id,
            'pin_emergencia_empresa'
        ),

        exists (
            select 1
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id = p_tenant_id
              and recurso.recurso_chave =
                'pin_emergencia_empresa'
        ),

        (
            select recurso.updated_at
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id = p_tenant_id
              and recurso.recurso_chave =
                'pin_emergencia_empresa'
        ),

        private.tenant_recurso_pin_habilitado(
            p_tenant_id,
            'pin_acesso_usuario'
        ),

        exists (
            select 1
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id = p_tenant_id
              and recurso.recurso_chave =
                'pin_acesso_usuario'
        ),

        (
            select recurso.updated_at
            from public.tenant_recursos_operacionais recurso
            where recurso.tenant_id = p_tenant_id
              and recurso.recurso_chave =
                'pin_acesso_usuario'
        );
end;
$function$;

revoke all on function
    public.admin_consultar_recursos_pin_tenant(uuid)
from public, anon;

grant execute on function
    public.admin_consultar_recursos_pin_tenant(uuid)
to authenticated, service_role;


-- ============================================================
-- 5. SAVE EXCLUSIVO DA CONTA MESTRE
-- ============================================================

create function public.admin_salvar_recurso_pin_tenant(
    p_tenant_id uuid,
    p_recurso_chave text,
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

    v_recurso_chave text :=
        lower(
            pg_catalog.btrim(
                coalesce(
                    p_recurso_chave,
                    ''
                )
            )
        );
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
           where tenant.id = p_tenant_id
       )
    then
        raise exception using
            errcode = '22023',
            message = 'Tenant invalido.';
    end if;

    if v_recurso_chave not in (
        'pin_emergencia_empresa',
        'pin_acesso_usuario'
    ) then
        raise exception using
            errcode = '22023',
            message = 'Recurso de PIN invalido.';
    end if;

    if p_ativo is null then
        raise exception using
            errcode = '22023',
            message = 'Estado do recurso nao informado.';
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
        v_recurso_chave,
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
        'ALTERAR_RECURSO_PIN_TENANT',
        'tenant_recursos_operacionais',
        p_tenant_id::text || ':' || v_recurso_chave,
        'Conta Mestre alterou disponibilidade de recurso de PIN do tenant',
        pg_catalog.jsonb_build_object(
            'tenant_id',
            p_tenant_id,
            'recurso_chave',
            v_recurso_chave,
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
    where recurso.tenant_id = p_tenant_id
      and recurso.recurso_chave =
        v_recurso_chave;
end;
$function$;

revoke all on function
    public.admin_salvar_recurso_pin_tenant(uuid,text,boolean)
from public, anon;

grant execute on function
    public.admin_salvar_recurso_pin_tenant(uuid,text,boolean)
to authenticated, service_role;


-- ============================================================
-- 6. PROTEGER CONFIGURACAO DO PIN DA EMPRESA
-- preserva implementacao anterior como core interno
-- ============================================================

alter function
    public.definir_senha_emergencia_empresa(
        uuid,
        text,
        boolean
    )
rename to
    definir_senha_emergencia_empresa_pin_core;

revoke all on function
    public.definir_senha_emergencia_empresa_pin_core(
        uuid,
        text,
        boolean
    )
from public, anon, authenticated, service_role;

create function public.definir_senha_emergencia_empresa(
    p_empresa_id uuid,
    p_senha text,
    p_ativo boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
    v_tenant_id uuid;
begin
    if p_empresa_id is not null then
        select empresa.tenant_id
          into v_tenant_id
          from public.empresas empresa
         where empresa.id = p_empresa_id;
    end if;

    if v_tenant_id is not null
       and not private.tenant_recurso_pin_habilitado(
           v_tenant_id,
           'pin_emergencia_empresa'
       )
    then
        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'recursoIndisponivel',
            true,
            'mensagem',
            'PIN de emergencia da empresa desabilitado pela Conta Mestre.'
        );
    end if;

    return
        public.definir_senha_emergencia_empresa_pin_core(
            p_empresa_id,
            p_senha,
            p_ativo
        );
end;
$function$;

revoke all on function
    public.definir_senha_emergencia_empresa(
        uuid,
        text,
        boolean
    )
from public, anon;

grant execute on function
    public.definir_senha_emergencia_empresa(
        uuid,
        text,
        boolean
    )
to authenticated, service_role;


-- ============================================================
-- 7. PROTEGER CONFIGURACAO DO MEU PIN
-- ============================================================

alter function
    public.definir_pin_emergencia_usuario(
        uuid,
        uuid,
        text,
        boolean
    )
rename to
    definir_pin_emergencia_usuario_pin_core;

revoke all on function
    public.definir_pin_emergencia_usuario_pin_core(
        uuid,
        uuid,
        text,
        boolean
    )
from public, anon, authenticated, service_role;

create function public.definir_pin_emergencia_usuario(
    p_tenant_id uuid,
    p_user_id uuid,
    p_pin text,
    p_ativo boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
    if p_tenant_id is not null
       and not private.tenant_recurso_pin_habilitado(
           p_tenant_id,
           'pin_acesso_usuario'
       )
    then
        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'recursoIndisponivel',
            true,
            'mensagem',
            'Meu PIN de acesso esta desabilitado pela Conta Mestre.'
        );
    end if;

    return
        public.definir_pin_emergencia_usuario_pin_core(
            p_tenant_id,
            p_user_id,
            p_pin,
            p_ativo
        );
end;
$function$;

revoke all on function
    public.definir_pin_emergencia_usuario(
        uuid,
        uuid,
        text,
        boolean
    )
from public, anon;

grant execute on function
    public.definir_pin_emergencia_usuario(
        uuid,
        uuid,
        text,
        boolean
    )
to authenticated, service_role;


-- ============================================================
-- 8. ESTADO DO MEU PIN RESPEITA CONTA MESTRE
-- ============================================================

alter function
    public.consultar_estado_pin_emergencia_usuario(uuid)
rename to
    consultar_estado_pin_emergencia_usuario_pin_core;

revoke all on function
    public.consultar_estado_pin_emergencia_usuario_pin_core(uuid)
from public, anon, authenticated, service_role;

create function public.consultar_estado_pin_emergencia_usuario(
    p_tenant_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
begin
    if p_tenant_id is not null
       and not private.tenant_recurso_pin_habilitado(
           p_tenant_id,
           'pin_acesso_usuario'
       )
    then
        return pg_catalog.jsonb_build_object(
            'ok',
            true,
            'habilitado',
            false,
            'recursoDisponivel',
            false
        );
    end if;

    return
        public.consultar_estado_pin_emergencia_usuario_pin_core(
            p_tenant_id
        );
end;
$function$;

revoke all on function
    public.consultar_estado_pin_emergencia_usuario(uuid)
from public, anon;

grant execute on function
    public.consultar_estado_pin_emergencia_usuario(uuid)
to authenticated, service_role;


-- ============================================================
-- 9. BLOQUEAR CONTATO PUBLICO DE EMERGENCIA
-- quando Conta Mestre desabilitar o recurso
-- ============================================================

create or replace function public.validar_contato_emergencia_qr(
    p_token text,
    p_senha text,
    p_email text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
    v_token text :=
        pg_catalog.btrim(
            coalesce(
                p_token,
                ''
            )
        );

    v_tenant_id uuid;
begin
    if v_token <> '' then
        select empresa.tenant_id
          into v_tenant_id
          from public.colaboradores colaborador
          join public.empresas empresa
            on empresa.id =
                colaborador.empresa_id
          join public.tenants tenant
            on tenant.id =
                empresa.tenant_id
         where pg_catalog.btrim(
             coalesce(
                 colaborador.token_qr,
                 ''
             )
         ) = v_token
           and tenant.status = 'ativo'
         limit 1;
    end if;

    if v_tenant_id is not null
       and not private.tenant_recurso_pin_habilitado(
           v_tenant_id,
           'pin_emergencia_empresa'
       )
    then
        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'autorizado',
            false,
            'recursoIndisponivel',
            true,
            'mensagem',
            'Contato de emergencia indisponivel neste ambiente.'
        );
    end if;

    return
        public.validar_contato_emergencia_qr_empresa_legado(
            p_token,
            p_senha
        );
end;
$function$;

revoke all on function
    public.validar_contato_emergencia_qr(
        text,
        text,
        text
    )
from public;

grant execute on function
    public.validar_contato_emergencia_qr(
        text,
        text,
        text
    )
to anon, authenticated, service_role;


-- ============================================================
-- 10. BLOQUEAR AUDITORIA/VISTORIA PUBLICA POR MEU PIN
-- preserva implementacao atual como core protegido
-- ============================================================

alter function
    public.validar_acesso_auditoria_publica(
        text,
        text,
        text
    )
rename to
    validar_acesso_auditoria_publica_pin_core;

revoke all on function
    public.validar_acesso_auditoria_publica_pin_core(
        text,
        text,
        text
    )
from public, anon, authenticated, service_role;

create function public.validar_acesso_auditoria_publica(
    p_token text,
    p_email text,
    p_pin text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
    v_token text :=
        pg_catalog.btrim(
            coalesce(
                p_token,
                ''
            )
        );

    v_tenant_id uuid;
begin
    if v_token <> '' then
        select empresa.tenant_id
          into v_tenant_id
          from public.auditoria_tokens_publicos token_registro
          join public.empresas empresa
            on empresa.id =
                token_registro.empresa_id
          join public.tenants tenant
            on tenant.id =
                empresa.tenant_id
         where pg_catalog.btrim(
             coalesce(
                 token_registro.token,
                 ''
             )
         ) = v_token
           and token_registro.ativo is true
           and (
               token_registro.data_expiracao is null
               or token_registro.data_expiracao >
                    pg_catalog.now()
           )
           and tenant.status = 'ativo'
         order by
            token_registro.created_at desc
         limit 1;
    end if;

    if v_tenant_id is not null
       and not private.tenant_recurso_pin_habilitado(
           v_tenant_id,
           'pin_acesso_usuario'
       )
    then
        return pg_catalog.jsonb_build_object(
            'ok',
            false,
            'autorizado',
            false,
            'recursoIndisponivel',
            true,
            'mensagem',
            'PIN de acesso indisponivel neste ambiente.'
        );
    end if;

    return
        public.validar_acesso_auditoria_publica_pin_core(
            p_token,
            p_email,
            p_pin
        );
end;
$function$;

revoke all on function
    public.validar_acesso_auditoria_publica(
        text,
        text,
        text
    )
from public;

grant execute on function
    public.validar_acesso_auditoria_publica(
        text,
        text,
        text
    )
to anon, authenticated, service_role;


comment on function
    public.admin_salvar_recurso_pin_tenant(
        uuid,
        text,
        boolean
    )
is
    'Conta Mestre SafeScan habilita/desabilita recursos de PIN por tenant sem apagar configuracoes existentes.';


commit;
