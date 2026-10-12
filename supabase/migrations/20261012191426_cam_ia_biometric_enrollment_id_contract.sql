begin;

create or replace function private.biometric_backend_register_reference_v2_impl(
  p_reference_id uuid,
  p_reference_set_id uuid,
  p_boundary jsonb,
  p_quality_metadata jsonb,
  p_encrypted_embedding jsonb,
  p_source_metadata jsonb,
  p_request_id uuid,
  p_executor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_set private.biometric_reference_sets%rowtype;
  v_reference_id uuid := p_reference_id;
  v_reason_codes text[];
  v_source_ref uuid;
  v_retention_mode text;
begin
  if v_reference_id is null then
    raise exception using
      errcode = '23502',
      message = 'reference id is required';
  end if;

  if exists (
    select 1
    from private.biometric_references
    where id = v_reference_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'biometric reference id already exists';
  end if;

  select *
    into v_set
  from private.biometric_reference_sets
  where id = p_reference_set_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'biometric reference set not found';
  end if;

  if v_set.status in ('ACTIVE', 'SUPERSEDED', 'REVOKED') then
    raise exception using
      errcode = '23514',
      message = 'reference cannot be added to finalized reference set';
  end if;

  if coalesce(
       (p_boundary ->> 'tenantId')::uuid,
       '00000000-0000-0000-0000-000000000000'::uuid
     ) <> v_set.tenant_id
     or coalesce(
       (p_boundary ->> 'empresaId')::uuid,
       '00000000-0000-0000-0000-000000000000'::uuid
     ) <> v_set.empresa_id
     or coalesce(
       (p_boundary ->> 'colaboradorId')::uuid,
       '00000000-0000-0000-0000-000000000000'::uuid
     ) <> v_set.colaborador_id
     or coalesce(p_boundary ->> 'profileId', '') <> v_set.profile_id
     or coalesce(
       p_boundary ->> 'qualityProfileId',
       ''
     ) <> v_set.quality_profile_id
  then
    raise exception using
      errcode = '42501',
      message = 'biometric reference boundary mismatch';
  end if;

  if coalesce(
       (p_quality_metadata ->> 'approved')::boolean,
       false
     ) is not true
  then
    raise exception using
      errcode = '23514',
      message = 'reference quality is not approved';
  end if;

  v_source_ref :=
    nullif(p_source_metadata ->> 'sourceRef', '')::uuid;

  if v_source_ref is null then
    raise exception using
      errcode = '23502',
      message = 'sourceRef is required';
  end if;

  v_retention_mode :=
    coalesce(
      nullif(p_source_metadata ->> 'retentionMode', ''),
      'NONE'
    );

  select coalesce(
    array_agg(value order by ordinality),
    '{}'::text[]
  )
  into v_reason_codes
  from jsonb_array_elements_text(
    coalesce(
      p_quality_metadata -> 'reasonCodes',
      '[]'::jsonb
    )
  ) with ordinality as reason(value, ordinality);

  insert into private.biometric_references (
    id,
    reference_set_id,
    tenant_id,
    empresa_id,
    colaborador_id,
    profile_id,
    quality_profile_id,
    status,
    source_ref,
    source_retention_mode,
    source_bucket,
    source_path,
    source_object_version,
    source_cipher_iv,
    source_key_version,
    source_cipher_version,
    source_cipher_sha256,
    face_count,
    face_score,
    face_size_px,
    visible_area_ratio,
    alignment_rms,
    embedding_l2_norm,
    quality_approved,
    quality_reason_codes
  )
  values (
    v_reference_id,
    v_set.id,
    v_set.tenant_id,
    v_set.empresa_id,
    v_set.colaborador_id,
    v_set.profile_id,
    v_set.quality_profile_id,
    'SOURCE_CAPTURED',
    v_source_ref,
    v_retention_mode,
    nullif(p_source_metadata ->> 'bucket', ''),
    nullif(p_source_metadata ->> 'path', ''),
    nullif(p_source_metadata ->> 'objectVersion', ''),
    case
      when nullif(
        p_source_metadata ->> 'ivBase64',
        ''
      ) is null then null
      else decode(
        p_source_metadata ->> 'ivBase64',
        'base64'
      )
    end,
    nullif(p_source_metadata ->> 'keyVersion', ''),
    nullif(p_source_metadata ->> 'cipherVersion', ''),
    nullif(p_source_metadata ->> 'cipherSha256', ''),
    (p_quality_metadata ->> 'faceCount')::smallint,
    (p_quality_metadata ->> 'faceScore')::double precision,
    (p_quality_metadata ->> 'faceSizePx')::integer,
    (p_quality_metadata ->> 'visibleAreaRatio')::double precision,
    (p_quality_metadata ->> 'alignmentRms')::double precision,
    null,
    false,
    v_reason_codes
  );

  update private.biometric_references
  set status = 'QUALITY_PENDING',
      updated_at = now()
  where id = v_reference_id;

  update private.biometric_references
  set status = 'QUALITY_APPROVED',
      quality_approved = true,
      updated_at = now()
  where id = v_reference_id;

  update private.biometric_references
  set status = 'EMBEDDING_READY',
      embedding_l2_norm =
        (p_quality_metadata ->> 'embeddingL2Norm')::double precision,
      embedding_ciphertext =
        decode(
          p_encrypted_embedding ->> 'ciphertextBase64',
          'base64'
        ),
      embedding_iv =
        decode(
          p_encrypted_embedding ->> 'ivBase64',
          'base64'
        ),
      embedding_key_version =
        nullif(p_encrypted_embedding ->> 'keyVersion', ''),
      embedding_cipher_version =
        nullif(p_encrypted_embedding ->> 'cipherVersion', ''),
      embedding_cipher_sha256 =
        nullif(p_encrypted_embedding ->> 'cipherSha256', ''),
      updated_at = now()
  where id = v_reference_id;

  insert into private.biometric_audit_events (
    tenant_id,
    empresa_id,
    colaborador_id,
    event_code,
    object_kind,
    object_id,
    profile_id,
    quality_profile_id,
    reference_set_id,
    reference_id,
    actor_kind,
    actor_user_id,
    request_id
  )
  values
  (
    v_set.tenant_id,
    v_set.empresa_id,
    v_set.colaborador_id,
    'REFERENCE_QUALITY_APPROVED',
    'REFERENCE',
    v_reference_id,
    v_set.profile_id,
    v_set.quality_profile_id,
    v_set.id,
    v_reference_id,
    case when p_executor_id is null then 'BROKER' else 'USER' end,
    p_executor_id,
    p_request_id
  ),
  (
    v_set.tenant_id,
    v_set.empresa_id,
    v_set.colaborador_id,
    'REFERENCE_EMBEDDING_STORED',
    'REFERENCE',
    v_reference_id,
    v_set.profile_id,
    v_set.quality_profile_id,
    v_set.id,
    v_reference_id,
    case when p_executor_id is null then 'BROKER' else 'USER' end,
    p_executor_id,
    p_request_id
  );

  return v_reference_id;
end;
$$;

create or replace function private.biometric_backend_store_centroid_v2_impl(
  p_centroid_id uuid,
  p_reference_set_id uuid,
  p_boundary jsonb,
  p_contributing_reference_ids uuid[],
  p_encrypted_centroid jsonb,
  p_request_id uuid,
  p_executor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_set private.biometric_reference_sets%rowtype;
  v_active_ids uuid[];
  v_requested_ids uuid[];
  v_centroid_id uuid := p_centroid_id;
  v_centroid_version integer;
begin
  if v_centroid_id is null then
    raise exception using
      errcode = '23502',
      message = 'centroid id is required';
  end if;

  if exists (
    select 1
    from private.biometric_centroids
    where id = v_centroid_id
  ) then
    raise exception using
      errcode = '23505',
      message = 'biometric centroid id already exists';
  end if;

  select *
    into v_set
  from private.biometric_reference_sets
  where id = p_reference_set_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'biometric reference set not found';
  end if;

  if coalesce(
       (p_boundary ->> 'tenantId')::uuid,
       '00000000-0000-0000-0000-000000000000'::uuid
     ) <> v_set.tenant_id
     or coalesce(
       (p_boundary ->> 'empresaId')::uuid,
       '00000000-0000-0000-0000-000000000000'::uuid
     ) <> v_set.empresa_id
     or coalesce(
       (p_boundary ->> 'colaboradorId')::uuid,
       '00000000-0000-0000-0000-000000000000'::uuid
     ) <> v_set.colaborador_id
     or coalesce(p_boundary ->> 'profileId', '') <> v_set.profile_id
     or coalesce(
       p_boundary ->> 'qualityProfileId',
       ''
     ) <> v_set.quality_profile_id
  then
    raise exception using
      errcode = '42501',
      message = 'biometric centroid boundary mismatch';
  end if;

  if v_set.status <> 'READY' then
    raise exception using
      errcode = '23514',
      message = 'centroid requires READY reference set';
  end if;

  select array_agg(id order by id)
    into v_active_ids
  from private.biometric_references
  where reference_set_id = v_set.id
    and status = 'ACTIVE';

  select array_agg(value order by value)
    into v_requested_ids
  from unnest(p_contributing_reference_ids) as u(value);

  if cardinality(v_active_ids) not between 3 and 5 then
    raise exception using
      errcode = '23514',
      message = 'centroid requires 3 to 5 ACTIVE references';
  end if;

  if v_requested_ids is distinct from v_active_ids then
    raise exception using
      errcode = '23514',
      message =
        'centroid reference ids do not match current ACTIVE references';
  end if;

  select coalesce(max(centroid_version), 0) + 1
    into v_centroid_version
  from private.biometric_centroids
  where reference_set_id = v_set.id;

  insert into private.biometric_centroids (
    id,
    reference_set_id,
    tenant_id,
    empresa_id,
    colaborador_id,
    profile_id,
    quality_profile_id,
    centroid_version,
    contributing_reference_ids,
    centroid_ciphertext,
    centroid_iv,
    centroid_key_version,
    centroid_cipher_version,
    centroid_cipher_sha256
  )
  values (
    v_centroid_id,
    v_set.id,
    v_set.tenant_id,
    v_set.empresa_id,
    v_set.colaborador_id,
    v_set.profile_id,
    v_set.quality_profile_id,
    v_centroid_version,
    v_active_ids,
    decode(
      p_encrypted_centroid ->> 'ciphertextBase64',
      'base64'
    ),
    decode(
      p_encrypted_centroid ->> 'ivBase64',
      'base64'
    ),
    nullif(p_encrypted_centroid ->> 'keyVersion', ''),
    nullif(p_encrypted_centroid ->> 'cipherVersion', ''),
    nullif(p_encrypted_centroid ->> 'cipherSha256', '')
  );

  update private.biometric_reference_sets
  set current_centroid_id = v_centroid_id,
      updated_at = now()
  where id = v_set.id;

  insert into private.biometric_audit_events (
    tenant_id,
    empresa_id,
    colaborador_id,
    event_code,
    object_kind,
    object_id,
    profile_id,
    quality_profile_id,
    reference_set_id,
    centroid_id,
    actor_kind,
    actor_user_id,
    request_id
  )
  values (
    v_set.tenant_id,
    v_set.empresa_id,
    v_set.colaborador_id,
    'CENTROID_STORED',
    'CENTROID',
    v_centroid_id,
    v_set.profile_id,
    v_set.quality_profile_id,
    v_set.id,
    v_centroid_id,
    case when p_executor_id is null then 'BROKER' else 'USER' end,
    p_executor_id,
    p_request_id
  );

  return v_centroid_id;
end;
$$;

create or replace function public.backend_biometric_register_reference_v2(
  p_reference_id uuid,
  p_reference_set_id uuid,
  p_boundary jsonb,
  p_quality_metadata jsonb,
  p_encrypted_embedding jsonb,
  p_source_metadata jsonb,
  p_request_id uuid,
  p_executor_id uuid
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_register_reference_v2_impl(
    p_reference_id,
    p_reference_set_id,
    p_boundary,
    p_quality_metadata,
    p_encrypted_embedding,
    p_source_metadata,
    p_request_id,
    p_executor_id
  );
$$;

create or replace function public.backend_biometric_store_centroid_v2(
  p_centroid_id uuid,
  p_reference_set_id uuid,
  p_boundary jsonb,
  p_contributing_reference_ids uuid[],
  p_encrypted_centroid jsonb,
  p_request_id uuid,
  p_executor_id uuid
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_store_centroid_v2_impl(
    p_centroid_id,
    p_reference_set_id,
    p_boundary,
    p_contributing_reference_ids,
    p_encrypted_centroid,
    p_request_id,
    p_executor_id
  );
$$;

revoke all on function private.biometric_backend_register_reference_v2_impl(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_store_centroid_v2_impl(
  uuid,
  uuid,
  jsonb,
  uuid[],
  jsonb,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

grant usage on schema private to service_role;

grant execute on function private.biometric_backend_register_reference_v2_impl(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_store_centroid_v2_impl(
  uuid,
  uuid,
  jsonb,
  uuid[],
  jsonb,
  uuid,
  uuid
) to service_role;

revoke all on function public.backend_biometric_register_reference_v2(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_store_centroid_v2(
  uuid,
  uuid,
  jsonb,
  uuid[],
  jsonb,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

grant execute on function public.backend_biometric_register_reference_v2(
  uuid,
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_store_centroid_v2(
  uuid,
  uuid,
  jsonb,
  uuid[],
  jsonb,
  uuid,
  uuid
) to service_role;

commit;