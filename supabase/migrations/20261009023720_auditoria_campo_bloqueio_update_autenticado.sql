begin;

-- G2-C9AB: impedir sobrescrita de evidencias de auditoria.
-- INSERT e DELETE nao sao alterados.
-- Outros buckets preservam o acesso anterior.

do $preflight$
declare
    v_policy record;
    v_expected text :=
        $expected$((bucket_id = ANY (ARRAY['auditorias-campo'::text, 'documentos-empresas'::text, 'contratos-empresas'::text])) AND (usuario_admin_global() OR usuario_tem_acesso_storage_path(name)))$expected$;
begin
    select cmd, roles, qual, with_check
    into v_policy
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sst_storage_update_authenticated_private';

    if not found
       or v_policy.cmd <> 'UPDATE'
       or v_policy.roles::text <> '{authenticated}'
       or v_policy.qual is distinct from v_expected
       or v_policy.with_check is distinct from v_expected
    then
        raise exception 'G2-C9AB: UPDATE_BASELINE_DIVERGENT';
    end if;
end;
$preflight$;

alter policy sst_storage_update_authenticated_private
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
)
with check (
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
    select cmd, roles, qual, with_check
    into v_policy
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'sst_storage_update_authenticated_private';

    if not found
       or v_policy.cmd <> 'UPDATE'
       or v_policy.roles::text <> '{authenticated}'
       or v_policy.qual is distinct from v_expected
       or v_policy.with_check is distinct from v_expected
    then
        raise exception 'G2-C9AB: UPDATE_POSTCHECK_DIVERGENT';
    end if;

    -- Verificar outras policies separadamente.
    -- A policy principal ja foi validada exatamente acima.

    if exists (
        select 1
        from pg_policies p
        where p.schemaname = 'storage'
          and p.tablename = 'objects'
          and p.cmd in ('UPDATE', 'ALL')
          and p.policyname <> 'sst_storage_update_authenticated_private'
          and (
              p.cmd = 'ALL'
              or p.qual is null
              or p.with_check is null
              or position('bucket_id =' in p.qual) = 0
              or position('bucket_id =' in p.with_check) = 0
              or position('auditorias-campo' in p.qual) > 0
              or position('auditorias-campo' in p.with_check) > 0
          )
    ) then
        raise exception 'G2-C9AB: OTHER_UPDATE_POLICY_REQUIRES_REVIEW';
    end if;
end;
$postcheck$;

commit;
