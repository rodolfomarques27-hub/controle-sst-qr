begin;

-- ============================================================
-- SafeScan Brasil
-- HOTFIX-CERT-STORAGE-RLS
--
-- Corrige a autorização do bucket certificados-treinamentos
-- após o endurecimento multiempresa.
--
-- Formato legado preservado:
--   {codigo_funcionario}/{treinamento_id}/{arquivo}
--
-- Formato futuro também suportado:
--   {empresa_uuid}/...
--
-- Não move, renomeia ou exclui objetos existentes.
-- ============================================================

do $preflight$
declare
    v_qtd bigint;
    v_public boolean;
begin
    if to_regclass(
        'storage.objects'
    ) is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: storage.objects ausente.';
    end if;

    if to_regclass(
        'storage.buckets'
    ) is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: storage.buckets ausente.';
    end if;

    if to_regclass(
        'public.colaboradores'
    ) is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: colaboradores ausente.';
    end if;

    if to_regclass(
        'public.empresas'
    ) is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: empresas ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_ativo_sistema()'
    ) is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: usuario_ativo_sistema ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_admin_global()'
    ) is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: usuario_admin_global ausente.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_empresa(uuid)'
    ) is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: usuario_tem_acesso_empresa ausente.';
    end if;

    if to_regprocedure(
        'public.texto_para_uuid_seguro(text)'
    ) is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: texto_para_uuid_seguro ausente.';
    end if;

    select b.public
    into v_public
    from storage.buckets b
    where b.id =
        'certificados-treinamentos';

    if v_public is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: bucket certificados-treinamentos ausente.';
    end if;

    if v_public is distinct from false then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: bucket deixou de ser privado.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_certificado_storage_path(text)'
    ) is not null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: helper dedicado já existe.';
    end if;

    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'certificados_storage_select_authenticated_scoped',
          'certificados_storage_insert_authenticated_scoped',
          'certificados_storage_update_authenticated_scoped',
          'certificados_storage_delete_authenticated_scoped'
      );

    if v_qtd <> 0 then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: policies dedicadas já existem.';
    end if;

    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'sst_storage_select_authenticated_private',
          'sst_storage_insert_authenticated_private',
          'sst_storage_update_authenticated_private',
          'sst_storage_delete_authenticated_private'
      )
      and (
          coalesce(qual, '') ||
          coalesce(with_check, '')
      ) like '%certificados-treinamentos%';

    if v_qtd <> 4 then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: esperado certificados-treinamentos nas 4 policies genéricas; encontrado %.',
            v_qtd;
    end if;
end;
$preflight$;

-- ============================================================
-- HELPER DEDICADO
-- ============================================================

create or replace function
    public.usuario_tem_acesso_certificado_storage_path(
        p_name text
    )
returns boolean
language plpgsql
stable
security definer
set search_path =
    pg_catalog,
    public,
    storage
as $function$
declare
    v_primeiro_segmento text;
    v_empresa_id uuid;
    v_empresa_uuid uuid;
begin
    if nullif(
        btrim(
            p_name
        ),
        ''
    ) is null then
        return false;
    end if;

    -- Conta Mestre mantém seu acesso administrativo global.
    if public.usuario_admin_global() then
        return true;
    end if;

    -- Usuário comum precisa continuar ativo no sistema.
    if not public.usuario_ativo_sistema() then
        return false;
    end if;

    v_primeiro_segmento :=
        (
            storage.foldername(
                p_name
            )
        )[1];

    if nullif(
        btrim(
            v_primeiro_segmento
        ),
        ''
    ) is null then
        return false;
    end if;

    -- --------------------------------------------------------
    -- FORMATO FUTURO
    -- primeira pasta = empresa UUID.
    -- --------------------------------------------------------

    v_empresa_uuid :=
        public.texto_para_uuid_seguro(
            v_primeiro_segmento
        );

    if
        v_empresa_uuid is not null
        and exists (
            select 1
            from public.empresas e
            where e.id =
                v_empresa_uuid
              and public.usuario_tem_acesso_empresa(
                  e.id
              )
        )
    then
        return true;
    end if;

    -- --------------------------------------------------------
    -- FORMATO LEGADO ATUAL
    -- primeira pasta = codigo_funcionario.
    -- --------------------------------------------------------

    select
        c.empresa_id
    into
        v_empresa_id
    from public.colaboradores c
    where
        c.empresa_id is not null
        and nullif(
            btrim(
                c.codigo_funcionario
            ),
            ''
        ) is not null
        and lower(
            btrim(
                c.codigo_funcionario
            )
        ) =
            lower(
                btrim(
                    v_primeiro_segmento
                )
            )
    limit 1;

    if v_empresa_id is null then
        return false;
    end if;

    return
        public.usuario_tem_acesso_empresa(
            v_empresa_id
        );
end;
$function$;

revoke all
on function
    public.usuario_tem_acesso_certificado_storage_path(text)
from public;

revoke all
on function
    public.usuario_tem_acesso_certificado_storage_path(text)
from anon;

revoke all
on function
    public.usuario_tem_acesso_certificado_storage_path(text)
from authenticated;

grant execute
on function
    public.usuario_tem_acesso_certificado_storage_path(text)
to authenticated;

grant execute
on function
    public.usuario_tem_acesso_certificado_storage_path(text)
to service_role;

comment on function
    public.usuario_tem_acesso_certificado_storage_path(text)
is
    'Resolve certificados-treinamentos por codigo_funcionario legado ou empresa UUID e aplica o gate tenant-aware de empresa.';

-- ============================================================
-- RETIRA certificados-treinamentos DAS POLICIES GENÉRICAS
-- ============================================================

alter policy
    sst_storage_select_authenticated_private
on storage.objects
using (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(
            name
        )
    )
);

alter policy
    sst_storage_insert_authenticated_private
on storage.objects
with check (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(
            name
        )
    )
);

alter policy
    sst_storage_update_authenticated_private
on storage.objects
using (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(
            name
        )
    )
)
with check (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(
            name
        )
    )
);

alter policy
    sst_storage_delete_authenticated_private
on storage.objects
using (
    (
        bucket_id = any (
            array[
                'auditorias-campo'::text,
                'documentos-empresas'::text,
                'contratos-empresas'::text
            ]
        )
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(
            name
        )
    )
);

-- ============================================================
-- POLICIES DEDICADAS DO BUCKET
-- ============================================================

create policy
    certificados_storage_select_authenticated_scoped
on storage.objects
for select
to authenticated
using (
    bucket_id =
        'certificados-treinamentos'
    and public.usuario_tem_acesso_certificado_storage_path(
        name
    )
);

create policy
    certificados_storage_insert_authenticated_scoped
on storage.objects
for insert
to authenticated
with check (
    bucket_id =
        'certificados-treinamentos'
    and public.usuario_tem_acesso_certificado_storage_path(
        name
    )
);

create policy
    certificados_storage_update_authenticated_scoped
on storage.objects
for update
to authenticated
using (
    bucket_id =
        'certificados-treinamentos'
    and public.usuario_tem_acesso_certificado_storage_path(
        name
    )
)
with check (
    bucket_id =
        'certificados-treinamentos'
    and public.usuario_tem_acesso_certificado_storage_path(
        name
    )
);

create policy
    certificados_storage_delete_authenticated_scoped
on storage.objects
for delete
to authenticated
using (
    bucket_id =
        'certificados-treinamentos'
    and public.usuario_tem_acesso_certificado_storage_path(
        name
    )
);

-- ============================================================
-- POSTCHECK
-- ============================================================

do $postcheck$
declare
    v_qtd bigint;
    v_public boolean;
begin
    select b.public
    into v_public
    from storage.buckets b
    where b.id =
        'certificados-treinamentos';

    if v_public is distinct from false then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: bucket deixou de ser privado.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_certificado_storage_path(text)'
    ) is null then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: helper dedicado não foi criado.';
    end if;

    if has_function_privilege(
        'anon',
        'public.usuario_tem_acesso_certificado_storage_path(text)',
        'EXECUTE'
    ) then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: anon recebeu EXECUTE indevido.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.usuario_tem_acesso_certificado_storage_path(text)',
        'EXECUTE'
    ) then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: authenticated sem EXECUTE.';
    end if;

    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'certificados_storage_select_authenticated_scoped',
          'certificados_storage_insert_authenticated_scoped',
          'certificados_storage_update_authenticated_scoped',
          'certificados_storage_delete_authenticated_scoped'
      );

    if v_qtd <> 4 then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: esperado 4 policies dedicadas; encontrado %.',
            v_qtd;
    end if;

    select count(*)
    into v_qtd
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
          'certificados_storage_select_authenticated_scoped',
          'certificados_storage_insert_authenticated_scoped',
          'certificados_storage_update_authenticated_scoped',
          'certificados_storage_delete_authenticated_scoped'
      )
      and (
          coalesce(qual, '') ||
          coalesce(with_check, '')
      ) like
          '%usuario_tem_acesso_certificado_storage_path%';

    if v_qtd <> 4 then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: alguma policy dedicada não usa o helper.';
    end if;

    if exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname in (
              'sst_storage_select_authenticated_private',
              'sst_storage_insert_authenticated_private',
              'sst_storage_update_authenticated_private',
              'sst_storage_delete_authenticated_private'
          )
          and (
              coalesce(qual, '') ||
              coalesce(with_check, '')
          ) like
              '%certificados-treinamentos%'
    ) then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: bucket permaneceu nas policies genéricas.';
    end if;

    if exists (
        select 1
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and 'anon' = any(
              roles
          )
          and (
              coalesce(qual, '') ||
              coalesce(with_check, '')
          ) like
              '%certificados-treinamentos%'
    ) then
        raise exception
            'HOTFIX-CERT-STORAGE-RLS: acesso anon localizado.';
    end if;
end;
$postcheck$;

notify pgrst, 'reload schema';

commit;