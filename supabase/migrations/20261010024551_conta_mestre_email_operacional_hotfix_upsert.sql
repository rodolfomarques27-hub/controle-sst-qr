-- MASTER-EMAIL-E6A
-- Hotfix aditivo para eliminar ambiguidade PL/pgSQL no UPSERT
-- de admin_salvar_recurso_email_operacional_tenant.
--
-- Nao altera regra de negocio.
-- Nao altera assinatura.
-- Nao altera SMTP.
-- Nao altera PINs.
-- Nao altera dados existentes.
--
-- Correcao:
--   ON CONFLICT (tenant_id, recurso_chave)
-- passa a usar:
--   ON CONFLICT ON CONSTRAINT tenant_recursos_operacionais_pkey

begin;


do $preflight$
begin
    if to_regprocedure(
        'public.admin_salvar_recurso_email_operacional_tenant(uuid,boolean)'
    ) is null
    then
        raise exception
            'MASTER-EMAIL-E6A: RPC alvo ausente.';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_constraint constraint_registro
        where constraint_registro.conrelid =
            'public.tenant_recursos_operacionais'::regclass
          and constraint_registro.conname =
            'tenant_recursos_operacionais_pkey'
          and constraint_registro.contype =
            'p'
    )
    then
        raise exception
            'MASTER-EMAIL-E6A: primary key esperada ausente.';
    end if;
end;
$preflight$;


create or replace function public.admin_salvar_recurso_email_operacional_tenant(
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
    on conflict on constraint
        tenant_recursos_operacionais_pkey
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


comment on function
    public.admin_salvar_recurso_email_operacional_tenant(
        uuid,
        boolean
    )
is
    'Conta Mestre habilita/desabilita e-mail operacional por tenant. Hotfix E6A usa conflito pela PK para evitar ambiguidade PL/pgSQL.';


commit;
