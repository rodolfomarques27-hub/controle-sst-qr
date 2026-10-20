-- CAM-IA-03G2L
-- Identification candidate discovery 1:N.
-- Returns ACTIVE encrypted centroids only.
-- No plaintext biometric material leaves the database.

create index if not exists
  biometric_reference_sets_identification_active_idx
on private.biometric_reference_sets (
  tenant_id,
  empresa_id,
  profile_id,
  colaborador_id,
  id
)
where status = 'ACTIVE';

create or replace function private.biometric_backend_list_active_centroids_impl(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_profile_id text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_result jsonb;
begin
  if not exists (
    select 1
    from public.empresas e
    where e.id = p_empresa_id
      and e.tenant_id = p_tenant_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'biometric identification boundary rejected';
  end if;

  if nullif(btrim(p_profile_id), '') is null then
    raise exception using
      errcode = '22023',
      message = 'biometric profile id is required';
  end if;

  select jsonb_build_object(
    'requestId',
    p_request_id,
    'tenantId',
    p_tenant_id,
    'empresaId',
    p_empresa_id,
    'profileId',
    p_profile_id,
    'candidates',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'referenceSetId',
          s.id,
          'colaboradorId',
          s.colaborador_id,
          'qualityProfileId',
          s.quality_profile_id,
          'centroidId',
          c.id,
          'ciphertextBase64',
          encode(c.centroid_ciphertext, 'base64'),
          'ivBase64',
          encode(c.centroid_iv, 'base64'),
          'keyVersion',
          c.centroid_key_version,
          'cipherVersion',
          c.centroid_cipher_version,
          'cipherSha256',
          c.centroid_cipher_sha256
        )
        order by
          s.colaborador_id,
          s.id
      )
      filter (
        where s.id is not null
      ),
      '[]'::jsonb
    )
  )
  into v_result
  from private.biometric_reference_sets s
  join private.biometric_centroids c
    on c.id = s.current_centroid_id
   and c.reference_set_id = s.id
   and c.tenant_id = s.tenant_id
   and c.empresa_id = s.empresa_id
   and c.colaborador_id = s.colaborador_id
   and c.profile_id = s.profile_id
   and c.quality_profile_id = s.quality_profile_id
  where s.tenant_id = p_tenant_id
    and s.empresa_id = p_empresa_id
    and s.profile_id = p_profile_id
    and s.status = 'ACTIVE'
    and c.material_deleted_at is null
    and c.centroid_ciphertext is not null
    and c.centroid_iv is not null
    and c.centroid_key_version is not null
    and c.centroid_cipher_version is not null
    and c.centroid_cipher_sha256 is not null;

  return v_result;
end;
$$;

create or replace function public.backend_biometric_list_active_centroids(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_profile_id text,
  p_request_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_list_active_centroids_impl(
    p_tenant_id,
    p_empresa_id,
    p_profile_id,
    p_request_id
  );
$$;

revoke all on function private.biometric_backend_list_active_centroids_impl(
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

grant usage on schema private to service_role;

grant execute on function private.biometric_backend_list_active_centroids_impl(
  uuid,
  uuid,
  text,
  uuid
) to service_role;

revoke all on function public.backend_biometric_list_active_centroids(
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

grant execute on function public.backend_biometric_list_active_centroids(
  uuid,
  uuid,
  text,
  uuid
) to service_role;
