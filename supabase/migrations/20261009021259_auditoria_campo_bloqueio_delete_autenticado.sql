begin;

-- SafeScan Brasil | G2-C9Y-R1
-- Bloquear DELETE autenticado de auditorias-campo.
-- Preservar DELETE dos buckets documentos-empresas
-- e contratos-empresas.
-- Nenhuma politica SELECT, INSERT ou UPDATE e alterada.

do $preflight$
declare
    v_policy record;
    v_expected text :=
        $expected$((bucket_id = ANY (ARRAY['auditorias-campo'::text, 'documentos-empresas'::text, 'contratos-empresas'::text])) AND (usuario_admin_global() OR usuario_tem_acesso_storage_path(name)))$expected$;
begin
    if to_regclass('storage.objects') is null then
        raise exception 'G2-C9Y: STORAGE_OBJECTS_MISSING';
    end if;

    select cmd, roles, qual
    into v_policy
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sst_storage_delete_authenticated_private';

    if not found then
        raise exception 'G2-C9Y: TARGET_POLICY_MISSING';
    end if;

    if v_policy.cmd <> 'DELETE'
       or v_policy.roles::text <> '{authenticated}'
       or v_policy.qual is distinct from v_expected
    then
        raise exception 'G2-C9Y: TARGET_POLICY_DIVERGENT';
    end if;

    -- Falhar fechado se houver outra politica
    -- que possa permitir excluir evidencias de auditoria.

    if exists (
        select 1
        from pg_policies p
        where p.schemaname = 'storage'
          and p.tablename = 'objects'
          and p.cmd in ('DELETE', 'ALL')
          and p.policyname <> 'sst_storage_delete_authenticated_private'
          and (
              p.cmd = 'ALL'
              or p.qual is null
              or position('bucket_id =' in p.qual) = 0
              or position('auditorias-campo' in p.qual) > 0
              or position('bucket_id = ANY' in p.qual) > 0
          )
    ) then
        raise exception 'G2-C9Y: OTHER_DELETE_POLICY_REQUIRES_REVIEW';
    end if;
end;
$preflight$;

alter policy sst_storage_delete_authenticated_private
on storage.objects
using (
    bucket_id = any (
        array[
            'documentos-empresas'::text,
            'contratos-empresas'::text
        ]
    )
    and (
        public.usuario_admin_global()
        or public.usuario_tem_acesso_storage_path(name)
    )
);

do $postcheck$
declare
    v_policy record;
    v_expected text :=
        $expected$((bucket_id = ANY (ARRAY['documentos-empresas'::text, 'contratos-empresas'::text])) AND (usuario_admin_global() OR usuario_tem_acesso_storage_path(name)))$expected$;
begin
    select cmd, roles, qual
    into v_policy
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sst_storage_delete_authenticated_private';

    if not found then
        raise exception 'G2-C9Y: POSTCHECK_POLICY_MISSING';
    end if;

    if v_policy.cmd <> 'DELETE'
       or v_policy.roles::text <> '{authenticated}'
       or v_policy.qual is distinct from v_expected
    then
        raise exception 'G2-C9Y: POSTCHECK_POLICY_DIVERGENT';
    end if;

    if exists (
        select 1
        from pg_policies p
        where p.schemaname = 'storage'
          and p.tablename = 'objects'
          and p.cmd in ('DELETE', 'ALL')
          and p.policyname <> 'sst_storage_delete_authenticated_private'
          and (
              p.cmd = 'ALL'
              or p.qual is null
              or position('bucket_id =' in p.qual) = 0
              or position('auditorias-campo' in p.qual) > 0
              or position('bucket_id = ANY' in p.qual) > 0
          )
    ) then
        raise exception 'G2-C9Y: DELETE_POLICY_NOT_SECURE';
    end if;
end;
$postcheck$;

commit;
