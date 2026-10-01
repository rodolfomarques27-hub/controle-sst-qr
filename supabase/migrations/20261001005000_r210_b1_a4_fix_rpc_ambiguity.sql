begin;

-- ============================================================
-- SafeScan Brasil
-- R2.10-B1-A4-R6
--
-- Correção exclusiva da ambiguidade PL/pgSQL no alvo
-- ON CONFLICT da RPC salvar_recurso_operacional_tenant.
--
-- Nenhuma regra de autorização, recurso permitido, tabela,
-- grant, policy ou contrato funcional é alterado.
-- ============================================================

create or replace function public.salvar_recurso_operacional_tenant(
    p_tenant_id uuid,
    p_recurso_chave text,
    p_ativo boolean
)
returns table(
    tenant_id uuid,
    recurso_chave text,
    ativo boolean,
    updated_at timestamptz
)
language plpgsql
security definer
set search_path to
    'pg_catalog',
    'public',
    'auth'
as $function$
declare
    v_actor uuid;
    v_recurso_chave text;
begin
    v_actor :=
        auth.uid();

    if v_actor is null then
        raise exception
            'Sessão autenticada obrigatória.'
            using errcode = '42501';
    end if;

    if p_tenant_id is null then
        raise exception
            'Tenant não informado.'
            using errcode = '22023';
    end if;

    if p_ativo is null then
        raise exception
            'Estado do recurso operacional não informado.'
            using errcode = '22023';
    end if;

    v_recurso_chave :=
        lower(
            btrim(
                coalesce(
                    p_recurso_chave,
                    ''
                )
            )
        );

    if v_recurso_chave not in (
        'obras',
        'aniversariantes',
        'treinamentos',
        'gestao_documental_sst'
    ) then
        raise exception
            'Recurso operacional não permitido.'
            using errcode = '22023';
    end if;

    if not exists (
        select 1
        from public.tenant_memberships tm
        join public.tenants t
          on t.id = tm.tenant_id
        where tm.tenant_id = p_tenant_id
          and tm.user_id = v_actor
          and tm.status = 'ativo'
          and tm.papel = 'administrador'
          and t.status = 'ativo'
    ) then
        raise exception
            'Somente o Administrador ativo deste ambiente pode alterar recursos operacionais.'
            using errcode = '42501';
    end if;

    return query
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
        now(),
        now(),
        v_actor,
        v_actor
    )
    on conflict on constraint
        tenant_recursos_operacionais_pkey
    do update
    set
        ativo = excluded.ativo,
        updated_at = now(),
        updated_by = v_actor
    returning
        tenant_recursos_operacionais.tenant_id,
        tenant_recursos_operacionais.recurso_chave,
        tenant_recursos_operacionais.ativo,
        tenant_recursos_operacionais.updated_at;
end;
$function$;

commit;