-- SafeScan Brasil | CAM-IA-03G2C
-- BIOMETRIC PERSISTENCE MIGRATION CANDIDATE - ISOLATED VALIDATION ONLY
--
-- IMPORTANT:
--   * This candidate is intentionally NOT under supabase/migrations/.
--   * It MUST NOT be applied to the real Supabase project in CAM-IA-03G2D.
--   * It contains no real biometric data and no production matching thresholds.
--   * Frontend roles must never receive direct table privileges on biometric material.
--   * The Vision Gateway must never receive a Supabase service-role/secret credential.
--
-- Future application of this proposal requires a separate migration authorization,
-- isolated validation and a fresh review of the live schema/advisors.

begin;

-- -----------------------------------------------------------------------------
-- 0. Preconditions / relational tenant boundary
-- -----------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_namespace
    where nspname = 'private'
  ) then
    raise exception 'private schema is required before biometric persistence';
  end if;
end
$$;

-- Needed so biometric rows can prove that a collaborator belongs to the same
-- empresa without relying only on application code.
alter table public.colaboradores
  add constraint colaboradores_empresa_id_id_biometric_key
  unique (empresa_id, id);

-- -----------------------------------------------------------------------------
-- 1. Immutable biometric model/profile contract
-- -----------------------------------------------------------------------------

create table private.biometric_profiles (
  profile_id text primary key,
  model_id text not null,
  model_sha256 text not null,
  embedding_dim smallint not null,
  alignment_version text not null,
  preprocess_version text not null,
  normalization_version text not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  retired_at timestamptz,

  constraint biometric_profiles_profile_id_nonempty
    check (btrim(profile_id) <> ''),
  constraint biometric_profiles_model_id_nonempty
    check (btrim(model_id) <> ''),
  constraint biometric_profiles_model_sha256_format
    check (model_sha256 ~ '^[0-9A-Fa-f]{64}$'),
  constraint biometric_profiles_embedding_dim_128
    check (embedding_dim = 128),
  constraint biometric_profiles_alignment_version_nonempty
    check (btrim(alignment_version) <> ''),
  constraint biometric_profiles_preprocess_version_nonempty
    check (btrim(preprocess_version) <> ''),
  constraint biometric_profiles_normalization_version_nonempty
    check (btrim(normalization_version) <> ''),
  constraint biometric_profiles_status_check
    check (status in ('ACTIVE', 'RETIRED')),
  constraint biometric_profiles_retired_at_check
    check (
      (status = 'ACTIVE' and retired_at is null)
      or (status = 'RETIRED' and retired_at is not null)
    ),
  constraint biometric_profiles_exact_contract_unique
    unique (
      model_id,
      model_sha256,
      embedding_dim,
      alignment_version,
      preprocess_version,
      normalization_version
    )
);

-- -----------------------------------------------------------------------------
-- 2. Versioned quality profile; all thresholds are injected, never defaulted
-- -----------------------------------------------------------------------------

create table private.biometric_quality_profiles (
  quality_profile_id text primary key,
  profile_id text not null,
  version text not null,
  min_face_score double precision not null,
  min_face_size_px integer not null,
  min_visible_area_ratio double precision not null,
  max_alignment_rms double precision not null,
  embedding_l2_tolerance double precision not null,
  status text not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  retired_at timestamptz,

  constraint biometric_quality_profiles_profile_fk
    foreign key (profile_id)
    references private.biometric_profiles(profile_id)
    on delete restrict,
  constraint biometric_quality_profiles_profile_pair_unique
    unique (profile_id, quality_profile_id),
  constraint biometric_quality_profiles_id_nonempty
    check (btrim(quality_profile_id) <> ''),
  constraint biometric_quality_profiles_version_nonempty
    check (btrim(version) <> ''),
  constraint biometric_quality_profiles_face_score_range
    check (min_face_score >= 0 and min_face_score <= 1),
  constraint biometric_quality_profiles_face_size_positive
    check (min_face_size_px > 0),
  constraint biometric_quality_profiles_visible_area_range
    check (min_visible_area_ratio >= 0 and min_visible_area_ratio <= 1),
  constraint biometric_quality_profiles_alignment_rms_nonnegative
    check (max_alignment_rms >= 0),
  constraint biometric_quality_profiles_l2_tolerance_positive
    check (embedding_l2_tolerance > 0),
  constraint biometric_quality_profiles_status_check
    check (status in ('ACTIVE', 'RETIRED')),
  constraint biometric_quality_profiles_retired_at_check
    check (
      (status = 'ACTIVE' and retired_at is null)
      or (status = 'RETIRED' and retired_at is not null)
    )
);

-- -----------------------------------------------------------------------------
-- 3. ReferenceSet root. tenant_id + empresa_id + colaborador_id are repeated
--    intentionally so cross-tenant/cross-company corruption is rejected by FKs.
-- -----------------------------------------------------------------------------

create table private.biometric_reference_sets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  empresa_id uuid not null,
  colaborador_id uuid not null,
  profile_id text not null,
  quality_profile_id text not null,
  status text not null default 'BUILDING',
  set_version integer not null default 1,
  current_centroid_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  superseded_at timestamptz,
  revoked_at timestamptz,
  lifecycle_reason_code text,

  constraint biometric_reference_sets_empresa_tenant_fk
    foreign key (tenant_id, empresa_id)
    references public.empresas(tenant_id, id)
    on delete restrict,
  constraint biometric_reference_sets_colaborador_empresa_fk
    foreign key (empresa_id, colaborador_id)
    references public.colaboradores(empresa_id, id)
    on delete restrict,
  constraint biometric_reference_sets_quality_profile_fk
    foreign key (profile_id, quality_profile_id)
    references private.biometric_quality_profiles(profile_id, quality_profile_id)
    on delete restrict,
  constraint biometric_reference_sets_boundary_unique
    unique (
      id,
      tenant_id,
      empresa_id,
      colaborador_id,
      profile_id,
      quality_profile_id
    ),
  constraint biometric_reference_sets_status_check
    check (
      status in (
        'BUILDING',
        'INSUFFICIENT',
        'READY',
        'ACTIVE',
        'SUPERSEDED',
        'REVOKED'
      )
    ),
  constraint biometric_reference_sets_version_positive
    check (set_version > 0),
  constraint biometric_reference_sets_activation_time_check
    check (status <> 'ACTIVE' or activated_at is not null),
  constraint biometric_reference_sets_superseded_time_check
    check (status <> 'SUPERSEDED' or superseded_at is not null),
  constraint biometric_reference_sets_revoked_time_check
    check (status <> 'REVOKED' or revoked_at is not null)
);

create unique index biometric_reference_sets_one_active_per_profile_idx
  on private.biometric_reference_sets (
    tenant_id,
    empresa_id,
    colaborador_id,
    profile_id
  )
  where status = 'ACTIVE';

create index biometric_reference_sets_lookup_idx
  on private.biometric_reference_sets (
    tenant_id,
    empresa_id,
    colaborador_id,
    profile_id,
    status
  );

-- -----------------------------------------------------------------------------
-- 4. Individual biometric references.
--    embedding_ciphertext contains AES-GCM ciphertext + 128-bit auth tag.
--    IV and key version are persisted; the encryption key is NOT stored here.
-- -----------------------------------------------------------------------------

create table private.biometric_references (
  id uuid primary key default gen_random_uuid(),
  reference_set_id uuid not null,
  tenant_id uuid not null,
  empresa_id uuid not null,
  colaborador_id uuid not null,
  profile_id text not null,
  quality_profile_id text not null,
  status text not null default 'SOURCE_CAPTURED',

  source_ref uuid not null,
  source_retention_mode text not null default 'NONE',
  source_bucket text,
  source_path text,
  source_object_version text,
  source_cipher_iv bytea,
  source_key_version text,
  source_cipher_version text,
  source_cipher_sha256 text,
  source_deleted_at timestamptz,

  face_count smallint,
  face_score double precision,
  face_size_px integer,
  visible_area_ratio double precision,
  alignment_rms double precision,
  embedding_l2_norm double precision,
  quality_approved boolean,
  quality_reason_codes text[] not null default '{}'::text[],

  embedding_ciphertext bytea,
  embedding_iv bytea,
  embedding_key_version text,
  embedding_cipher_version text,
  embedding_cipher_sha256 text,
  material_deleted_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  activated_at timestamptz,
  quarantined_at timestamptz,
  revoked_at timestamptz,
  lifecycle_reason_code text,

  constraint biometric_references_set_boundary_fk
    foreign key (
      reference_set_id,
      tenant_id,
      empresa_id,
      colaborador_id,
      profile_id,
      quality_profile_id
    )
    references private.biometric_reference_sets (
      id,
      tenant_id,
      empresa_id,
      colaborador_id,
      profile_id,
      quality_profile_id
    )
    on delete restrict,
  constraint biometric_references_set_reference_unique
    unique (reference_set_id, id),
  constraint biometric_references_status_check
    check (
      status in (
        'SOURCE_CAPTURED',
        'QUALITY_PENDING',
        'QUALITY_APPROVED',
        'EMBEDDING_READY',
        'ACTIVE',
        'QUARANTINED',
        'REVOKED'
      )
    ),
  constraint biometric_references_source_ref_unique
    unique (source_ref),
  constraint biometric_references_source_retention_check
    check (source_retention_mode in ('NONE', 'PRIVATE_STORAGE')),
  constraint biometric_references_source_fields_check
    check (
      (
        source_retention_mode = 'NONE'
        and source_bucket is null
        and source_path is null
        and source_object_version is null
        and source_cipher_iv is null
        and source_key_version is null
        and source_cipher_version is null
        and source_cipher_sha256 is null
      )
      or
      (
        source_retention_mode = 'PRIVATE_STORAGE'
        and source_bucket = 'biometrics-enrollment'
        and nullif(btrim(source_path), '') is not null
        and source_cipher_iv is not null
        and octet_length(source_cipher_iv) = 12
        and nullif(btrim(source_key_version), '') is not null
        and nullif(btrim(source_cipher_version), '') is not null
        and source_cipher_sha256 is not null
        and source_cipher_sha256 ~ '^[0-9A-Fa-f]{64}$'
      )
    ),
  constraint biometric_references_quality_face_count_check
    check (face_count is null or face_count >= 0),
  constraint biometric_references_quality_face_score_check
    check (face_score is null or (face_score >= 0 and face_score <= 1)),
  constraint biometric_references_quality_face_size_check
    check (face_size_px is null or face_size_px > 0),
  constraint biometric_references_quality_visible_area_check
    check (
      visible_area_ratio is null
      or (visible_area_ratio >= 0 and visible_area_ratio <= 1)
    ),
  constraint biometric_references_quality_alignment_rms_check
    check (alignment_rms is null or alignment_rms >= 0),
  constraint biometric_references_embedding_norm_check
    check (embedding_l2_norm is null or embedding_l2_norm > 0),
  constraint biometric_references_embedding_material_all_or_none
    check (
      (
        embedding_ciphertext is null
        and embedding_iv is null
        and embedding_key_version is null
        and embedding_cipher_version is null
        and embedding_cipher_sha256 is null
      )
      or
      (
        embedding_ciphertext is not null
        and embedding_iv is not null
        and octet_length(embedding_iv) = 12
        and nullif(btrim(embedding_key_version), '') is not null
        and nullif(btrim(embedding_cipher_version), '') is not null
        and embedding_cipher_sha256 is not null
        and embedding_cipher_sha256 ~ '^[0-9A-Fa-f]{64}$'
      )
    ),
  constraint biometric_references_ready_requires_encrypted_embedding
    check (
      status not in ('EMBEDDING_READY', 'ACTIVE')
      or (
        embedding_ciphertext is not null
        and embedding_iv is not null
        and octet_length(embedding_iv) = 12
        and embedding_key_version is not null
        and embedding_cipher_version is not null
        and embedding_l2_norm is not null
        and material_deleted_at is null
      )
    ),
  constraint biometric_references_quality_approved_check
    check (
      status not in ('QUALITY_APPROVED', 'EMBEDDING_READY', 'ACTIVE')
      or (
        quality_approved is true
        and face_count = 1
        and face_score is not null
        and face_size_px is not null
        and visible_area_ratio is not null
        and alignment_rms is not null
      )
    ),
  constraint biometric_references_deleted_material_is_cleared
    check (
      material_deleted_at is null
      or (
        embedding_ciphertext is null
        and embedding_iv is null
        and embedding_key_version is null
        and embedding_cipher_version is null
        and embedding_cipher_sha256 is null
      )
    ),
  constraint biometric_references_active_time_check
    check (status <> 'ACTIVE' or activated_at is not null),
  constraint biometric_references_quarantine_time_check
    check (status <> 'QUARANTINED' or quarantined_at is not null),
  constraint biometric_references_revoked_time_check
    check (status <> 'REVOKED' or revoked_at is not null)
);

create index biometric_references_set_status_idx
  on private.biometric_references (reference_set_id, status, id);

create index biometric_references_lookup_idx
  on private.biometric_references (
    tenant_id,
    empresa_id,
    colaborador_id,
    profile_id,
    status
  );

-- -----------------------------------------------------------------------------
-- 5. Versioned centroid material.
--    The broker computes the centroid from ACTIVE references and encrypts it.
--    PostgreSQL never needs plaintext embeddings to rebuild a centroid.
-- -----------------------------------------------------------------------------

create or replace function private.biometric_uuid_array_is_unique(
  p_values uuid[]
)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select cardinality(p_values) = (
    select count(distinct u.value)
    from unnest(p_values) as u(value)
  );
$$;

create table private.biometric_centroids (
  id uuid primary key default gen_random_uuid(),
  reference_set_id uuid not null,
  tenant_id uuid not null,
  empresa_id uuid not null,
  colaborador_id uuid not null,
  profile_id text not null,
  quality_profile_id text not null,
  centroid_version integer not null,
  contributing_reference_ids uuid[] not null,

  centroid_ciphertext bytea,
  centroid_iv bytea,
  centroid_key_version text,
  centroid_cipher_version text,
  centroid_cipher_sha256 text,
  material_deleted_at timestamptz,

  created_at timestamptz not null default now(),

  constraint biometric_centroids_set_boundary_fk
    foreign key (
      reference_set_id,
      tenant_id,
      empresa_id,
      colaborador_id,
      profile_id,
      quality_profile_id
    )
    references private.biometric_reference_sets (
      id,
      tenant_id,
      empresa_id,
      colaborador_id,
      profile_id,
      quality_profile_id
    )
    on delete restrict,
  constraint biometric_centroids_boundary_unique
    unique (
      id,
      reference_set_id,
      tenant_id,
      empresa_id,
      colaborador_id,
      profile_id,
      quality_profile_id
    ),
  constraint biometric_centroids_version_unique
    unique (reference_set_id, centroid_version),
  constraint biometric_centroids_version_positive
    check (centroid_version > 0),
  constraint biometric_centroids_reference_count
    check (cardinality(contributing_reference_ids) between 3 and 5),
  constraint biometric_centroids_reference_ids_unique
    check (private.biometric_uuid_array_is_unique(contributing_reference_ids)),
  constraint biometric_centroids_material_all_or_none
    check (
      (
        centroid_ciphertext is null
        and centroid_iv is null
        and centroid_key_version is null
        and centroid_cipher_version is null
        and centroid_cipher_sha256 is null
      )
      or
      (
        centroid_ciphertext is not null
        and centroid_iv is not null
        and octet_length(centroid_iv) = 12
        and nullif(btrim(centroid_key_version), '') is not null
        and nullif(btrim(centroid_cipher_version), '') is not null
        and centroid_cipher_sha256 is not null
        and centroid_cipher_sha256 ~ '^[0-9A-Fa-f]{64}$'
      )
    ),
  constraint biometric_centroids_deleted_material_is_cleared
    check (
      material_deleted_at is null
      or (
        centroid_ciphertext is null
        and centroid_iv is null
        and centroid_key_version is null
        and centroid_cipher_version is null
        and centroid_cipher_sha256 is null
      )
    )
);

alter table private.biometric_reference_sets
  add constraint biometric_reference_sets_current_centroid_fk
  foreign key (
    current_centroid_id,
    id,
    tenant_id,
    empresa_id,
    colaborador_id,
    profile_id,
    quality_profile_id
  )
  references private.biometric_centroids (
    id,
    reference_set_id,
    tenant_id,
    empresa_id,
    colaborador_id,
    profile_id,
    quality_profile_id
  )
  deferrable initially deferred;

-- -----------------------------------------------------------------------------
-- 6. Metadata-only audit trail. No generic JSON snapshot exists by design.
-- -----------------------------------------------------------------------------

create table private.biometric_audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  empresa_id uuid not null,
  colaborador_id uuid not null,
  event_code text not null,
  object_kind text not null,
  object_id uuid not null,
  profile_id text,
  quality_profile_id text,
  reference_set_id uuid,
  reference_id uuid,
  centroid_id uuid,
  reason_code text,
  actor_kind text not null,
  actor_user_id uuid,
  request_id uuid,
  created_at timestamptz not null default now(),

  constraint biometric_audit_events_empresa_tenant_fk
    foreign key (tenant_id, empresa_id)
    references public.empresas(tenant_id, id)
    on delete restrict,
  constraint biometric_audit_events_colaborador_empresa_fk
    foreign key (empresa_id, colaborador_id)
    references public.colaboradores(empresa_id, id)
    on delete restrict,
  constraint biometric_audit_events_actor_user_fk
    foreign key (actor_user_id)
    references auth.users(id)
    on delete set null,
  constraint biometric_audit_events_event_code_check
    check (
      event_code in (
        'REFERENCE_SET_CREATED',
        'REFERENCE_QUALITY_APPROVED',
        'REFERENCE_EMBEDDING_STORED',
        'REFERENCE_ACTIVATED',
        'REFERENCE_QUARANTINED',
        'REFERENCE_REVOKED',
        'CENTROID_STORED',
        'REFERENCE_SET_ACTIVATED',
        'REFERENCE_SET_SUPERSEDED',
        'REFERENCE_SET_REVOKED',
        'SOURCE_RETAINED',
        'SOURCE_DELETED',
        'REFERENCE_MATERIAL_DELETED',
        'CENTROID_MATERIAL_DELETED',
        'PROFILE_MIGRATION_STARTED',
        'PROFILE_MIGRATION_COMPLETED'
      )
    ),
  constraint biometric_audit_events_object_kind_check
    check (object_kind in ('REFERENCE_SET', 'REFERENCE', 'CENTROID', 'PROFILE')),
  constraint biometric_audit_events_actor_kind_check
    check (actor_kind in ('BROKER', 'SYSTEM', 'USER')),
  constraint biometric_audit_events_user_actor_check
    check (
      (actor_kind = 'USER' and actor_user_id is not null)
      or (actor_kind <> 'USER')
    )
);

create index biometric_audit_events_subject_created_idx
  on private.biometric_audit_events (
    tenant_id,
    empresa_id,
    colaborador_id,
    created_at desc
  );

-- -----------------------------------------------------------------------------
-- 7. Lifecycle transition guards
-- -----------------------------------------------------------------------------

create or replace function private.biometric_reference_transition_allowed(
  p_old text,
  p_new text
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case p_old
    when 'SOURCE_CAPTURED' then p_new in ('QUALITY_PENDING', 'QUARANTINED', 'REVOKED')
    when 'QUALITY_PENDING' then p_new in ('QUALITY_APPROVED', 'QUARANTINED', 'REVOKED')
    when 'QUALITY_APPROVED' then p_new in ('EMBEDDING_READY', 'QUARANTINED', 'REVOKED')
    when 'EMBEDDING_READY' then p_new in ('ACTIVE', 'QUARANTINED', 'REVOKED')
    when 'ACTIVE' then p_new in ('QUARANTINED', 'REVOKED')
    when 'QUARANTINED' then p_new = 'REVOKED'
    else false
  end;
$$;

create or replace function private.biometric_reference_set_transition_allowed(
  p_old text,
  p_new text
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case p_old
    when 'BUILDING' then p_new in ('INSUFFICIENT', 'READY', 'REVOKED')
    when 'INSUFFICIENT' then p_new in ('READY', 'REVOKED')
    when 'READY' then p_new in ('INSUFFICIENT', 'ACTIVE', 'REVOKED')
    when 'ACTIVE' then p_new in ('SUPERSEDED', 'REVOKED')
    when 'SUPERSEDED' then p_new = 'REVOKED'
    else false
  end;
$$;

create or replace function private.biometric_guard_reference_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, private
as $$
begin
  if old.status is distinct from new.status
     and not private.biometric_reference_transition_allowed(old.status, new.status)
  then
    raise exception using
      errcode = '23514',
      message = format(
        'invalid biometric reference transition: %s -> %s',
        old.status,
        new.status
      );
  end if;

  return new;
end;
$$;

create trigger biometric_references_transition_guard
before update of status
on private.biometric_references
for each row
execute function private.biometric_guard_reference_transition();

create or replace function private.biometric_guard_reference_set_transition()
returns trigger
language plpgsql
set search_path = pg_catalog, private
as $$
begin
  if old.status is distinct from new.status
     and not private.biometric_reference_set_transition_allowed(old.status, new.status)
  then
    raise exception using
      errcode = '23514',
      message = format(
        'invalid biometric reference-set transition: %s -> %s',
        old.status,
        new.status
      );
  end if;

  return new;
end;
$$;

create trigger biometric_reference_sets_transition_guard
before update of status
on private.biometric_reference_sets
for each row
execute function private.biometric_guard_reference_set_transition();

-- Concurrent attempts to exceed five ACTIVE references serialize through the
-- parent ReferenceSet row. This is a safety invariant, not a matching threshold.
create or replace function private.biometric_guard_active_reference_limit()
returns trigger
language plpgsql
set search_path = pg_catalog, private
as $$
declare
  v_active_count integer;
begin
  if new.status <> 'ACTIVE' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.status = 'ACTIVE' then
    return new;
  end if;

  perform 1
  from private.biometric_reference_sets s
  where s.id = new.reference_set_id
  for update;

  select count(*)
    into v_active_count
  from private.biometric_references r
  where r.reference_set_id = new.reference_set_id
    and r.status = 'ACTIVE'
    and r.id <> new.id;

  if v_active_count >= 5 then
    raise exception using
      errcode = '23514',
      message = 'maximum of 5 ACTIVE biometric references exceeded';
  end if;

  return new;
end;
$$;

create trigger biometric_references_active_limit_guard
before insert or update of status
on private.biometric_references
for each row
execute function private.biometric_guard_active_reference_limit();

-- -----------------------------------------------------------------------------
-- 8. Defense in depth: RLS enabled, no client policies, no direct grants.
--    Current project-level schema USAGE is not modified here because private is
--    shared by existing SafeScan components. Object privileges remain closed.
-- -----------------------------------------------------------------------------

alter table private.biometric_profiles enable row level security;
alter table private.biometric_quality_profiles enable row level security;
alter table private.biometric_reference_sets enable row level security;
alter table private.biometric_references enable row level security;
alter table private.biometric_centroids enable row level security;
alter table private.biometric_audit_events enable row level security;

revoke all privileges on table private.biometric_profiles
  from public, anon, authenticated, service_role;
revoke all privileges on table private.biometric_quality_profiles
  from public, anon, authenticated, service_role;
revoke all privileges on table private.biometric_reference_sets
  from public, anon, authenticated, service_role;
revoke all privileges on table private.biometric_references
  from public, anon, authenticated, service_role;
revoke all privileges on table private.biometric_centroids
  from public, anon, authenticated, service_role;
revoke all privileges on table private.biometric_audit_events
  from public, anon, authenticated, service_role;

revoke all on function private.biometric_uuid_array_is_unique(uuid[])
  from public, anon, authenticated, service_role;
revoke all on function private.biometric_reference_transition_allowed(text, text)
  from public, anon, authenticated, service_role;
revoke all on function private.biometric_reference_set_transition_allowed(text, text)
  from public, anon, authenticated, service_role;
revoke all on function private.biometric_guard_reference_transition()
  from public, anon, authenticated, service_role;
revoke all on function private.biometric_guard_reference_set_transition()
  from public, anon, authenticated, service_role;
revoke all on function private.biometric_guard_active_reference_limit()
  from public, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 9. FUTURE RPC CONTRACT - NOT CREATED BY THIS PROPOSAL
-- -----------------------------------------------------------------------------
-- Public RPCs are necessary only as a narrow Data API bridge for the broker.
-- Exposed public wrappers must remain SECURITY INVOKER and service_role-only.
-- Privileged logic belongs in private SECURITY DEFINER helpers with a pinned
-- search_path. The future migration must explicitly review/grant only the
-- minimum private schema/function privileges required for the server role.
--
-- Every future backend_biometric_* public wrapper must:
--   * be SECURITY INVOKER, never SECURITY DEFINER in an exposed schema;
--   * REVOKE EXECUTE FROM PUBLIC, anon, authenticated;
--   * GRANT EXECUTE TO service_role only;
--   * delegate privileged work to a narrowly scoped private helper;
--   * accept explicit tenant_id, empresa_id and colaborador_id boundaries;
--   * validate those boundaries against public.empresas/public.colaboradores;
--   * write allow-listed audit metadata in the same transaction;
--   * never emit plaintext embeddings/images to logs or audit tables.
--
-- Every privileged private helper must:
--   * be SECURITY DEFINER with a pinned search_path;
--   * be inaccessible to anon/authenticated;
--   * expose only the minimum operation needed by its wrapper;
--   * never return plaintext biometric material outside the broker boundary.
--
-- Minimum proposed signatures:
--
-- public.backend_biometric_create_reference_set(
--   p_tenant_id uuid,
--   p_empresa_id uuid,
--   p_colaborador_id uuid,
--   p_profile_id text,
--   p_quality_profile_id text,
--   p_request_id uuid,
--   p_executor_id uuid
-- ) returns uuid
--
-- public.backend_biometric_register_reference(
--   p_reference_set_id uuid,
--   p_boundary jsonb,
--   p_quality_metadata jsonb,
--   p_encrypted_embedding jsonb,
--   p_source_metadata jsonb,
--   p_request_id uuid,
--   p_executor_id uuid
-- ) returns uuid
--
-- public.backend_biometric_store_centroid(
--   p_reference_set_id uuid,
--   p_contributing_reference_ids uuid[],
--   p_encrypted_centroid jsonb,
--   p_request_id uuid,
--   p_executor_id uuid
-- ) returns uuid
--
-- public.backend_biometric_activate_reference_set(
--   p_reference_set_id uuid,
--   p_centroid_id uuid,
--   p_request_id uuid,
--   p_executor_id uuid
-- ) returns jsonb
--
-- public.backend_biometric_change_reference_status(
--   p_reference_id uuid,
--   p_next_status text,
--   p_reason_code text,
--   p_request_id uuid,
--   p_executor_id uuid
-- ) returns jsonb
--
-- public.backend_biometric_get_active_bundle(
--   p_tenant_id uuid,
--   p_empresa_id uuid,
--   p_colaborador_id uuid,
--   p_profile_id text,
--   p_request_id uuid
-- ) returns jsonb
--
-- IMPORTANT: because encryption/decryption occurs in the broker, the database
-- stores/returns ciphertext envelopes only. Centroid rebuild occurs in trusted
-- broker/Vision-Gateway memory from decrypted ACTIVE references, never in SQL.

-- -----------------------------------------------------------------------------
-- 9A. Privileged private helpers + minimal public RPC wrappers
--     Materialized only in the isolated migration candidate.
-- -----------------------------------------------------------------------------

create or replace function private.biometric_assert_boundary(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not exists (
    select 1
    from public.empresas e
    join public.colaboradores c
      on c.empresa_id = e.id
    where e.id = p_empresa_id
      and e.tenant_id = p_tenant_id
      and c.id = p_colaborador_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'biometric boundary rejected';
  end if;
end;
$$;

create or replace function private.biometric_backend_create_reference_set_impl(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_profile_id text,
  p_quality_profile_id text,
  p_request_id uuid,
  p_executor_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_reference_set_id uuid;
begin
  perform private.biometric_assert_boundary(
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id
  );

  if not exists (
    select 1
    from private.biometric_quality_profiles q
    join private.biometric_profiles p
      on p.profile_id = q.profile_id
    where q.profile_id = p_profile_id
      and q.quality_profile_id = p_quality_profile_id
      and q.status = 'ACTIVE'
      and p.status = 'ACTIVE'
  ) then
    raise exception using
      errcode = '23514',
      message = 'active biometric profile/quality profile not found';
  end if;

  insert into private.biometric_reference_sets (
    tenant_id,
    empresa_id,
    colaborador_id,
    profile_id,
    quality_profile_id,
    status
  )
  values (
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id,
    p_profile_id,
    p_quality_profile_id,
    'BUILDING'
  )
  returning id into v_reference_set_id;

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
    actor_kind,
    actor_user_id,
    request_id
  )
  values (
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id,
    'REFERENCE_SET_CREATED',
    'REFERENCE_SET',
    v_reference_set_id,
    p_profile_id,
    p_quality_profile_id,
    v_reference_set_id,
    case when p_executor_id is null then 'BROKER' else 'USER' end,
    p_executor_id,
    p_request_id
  );

  return v_reference_set_id;
end;
$$;

create or replace function private.biometric_backend_register_reference_impl(
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
  v_reference_id uuid;
  v_reason_codes text[];
  v_source_ref uuid;
  v_retention_mode text;
begin
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
  )
  returning id into v_reference_id;

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

create or replace function private.biometric_backend_change_reference_status_impl(
  p_reference_id uuid,
  p_next_status text,
  p_reason_code text,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_reference private.biometric_references%rowtype;
  v_set private.biometric_reference_sets%rowtype;
  v_active_count integer;
  v_next_set_status text;
begin
  select *
    into v_reference
  from private.biometric_references
  where id = p_reference_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'biometric reference not found';
  end if;

  select *
    into v_set
  from private.biometric_reference_sets
  where id = v_reference.reference_set_id
  for update;

  if v_reference.status = 'ACTIVE'
     and v_set.status = 'ACTIVE'
     and p_next_status in ('QUARANTINED', 'REVOKED')
  then
    raise exception using
      errcode = '23514',
      message =
        'active-set reference removal requires set replacement/revocation workflow';
  end if;

  update private.biometric_references
  set status = p_next_status,
      lifecycle_reason_code = p_reason_code,
      activated_at =
        case
          when p_next_status = 'ACTIVE'
            then coalesce(activated_at, now())
          else activated_at
        end,
      quarantined_at =
        case
          when p_next_status = 'QUARANTINED'
            then now()
          else quarantined_at
        end,
      revoked_at =
        case
          when p_next_status = 'REVOKED'
            then now()
          else revoked_at
        end,
      updated_at = now()
  where id = p_reference_id;

  if p_next_status = 'ACTIVE' then
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
      reason_code,
      actor_kind,
      actor_user_id,
      request_id
    )
    values (
      v_reference.tenant_id,
      v_reference.empresa_id,
      v_reference.colaborador_id,
      'REFERENCE_ACTIVATED',
      'REFERENCE',
      p_reference_id,
      v_reference.profile_id,
      v_reference.quality_profile_id,
      v_reference.reference_set_id,
      p_reference_id,
      p_reason_code,
      case when p_executor_id is null then 'BROKER' else 'USER' end,
      p_executor_id,
      p_request_id
    );
  elsif p_next_status = 'QUARANTINED' then
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
      reason_code,
      actor_kind,
      actor_user_id,
      request_id
    )
    values (
      v_reference.tenant_id,
      v_reference.empresa_id,
      v_reference.colaborador_id,
      'REFERENCE_QUARANTINED',
      'REFERENCE',
      p_reference_id,
      v_reference.profile_id,
      v_reference.quality_profile_id,
      v_reference.reference_set_id,
      p_reference_id,
      p_reason_code,
      case when p_executor_id is null then 'BROKER' else 'USER' end,
      p_executor_id,
      p_request_id
    );
  elsif p_next_status = 'REVOKED' then
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
      reason_code,
      actor_kind,
      actor_user_id,
      request_id
    )
    values (
      v_reference.tenant_id,
      v_reference.empresa_id,
      v_reference.colaborador_id,
      'REFERENCE_REVOKED',
      'REFERENCE',
      p_reference_id,
      v_reference.profile_id,
      v_reference.quality_profile_id,
      v_reference.reference_set_id,
      p_reference_id,
      p_reason_code,
      case when p_executor_id is null then 'BROKER' else 'USER' end,
      p_executor_id,
      p_request_id
    );
  end if;

  if v_set.status not in ('ACTIVE', 'SUPERSEDED', 'REVOKED') then
    select count(*)
      into v_active_count
    from private.biometric_references
    where reference_set_id = v_set.id
      and status = 'ACTIVE';

    v_next_set_status :=
      case
        when v_active_count >= 3 then 'READY'
        when v_active_count >= 1 then 'INSUFFICIENT'
        else v_set.status
      end;

    if v_next_set_status is distinct from v_set.status then
      update private.biometric_reference_sets
      set status = v_next_set_status,
          updated_at = now()
      where id = v_set.id;
    end if;
  end if;

  return jsonb_build_object(
    'referenceId',
    p_reference_id,
    'nextStatus',
    p_next_status,
    'referenceSetId',
    v_reference.reference_set_id
  );
end;
$$;

create or replace function private.biometric_backend_store_centroid_impl(
  p_reference_set_id uuid,
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
  v_centroid_id uuid;
  v_centroid_version integer;
begin
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
  )
  returning id into v_centroid_id;

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

create or replace function private.biometric_backend_activate_reference_set_impl(
  p_reference_set_id uuid,
  p_centroid_id uuid,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_set private.biometric_reference_sets%rowtype;
  v_old_active_id uuid;
  v_active_count integer;
begin
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

  if v_set.status <> 'READY'
     or v_set.current_centroid_id is distinct from p_centroid_id
  then
    raise exception using
      errcode = '23514',
      message =
        'reference set is not READY with requested centroid';
  end if;

  if not exists (
    select 1
    from private.biometric_centroids c
    where c.id = p_centroid_id
      and c.reference_set_id = v_set.id
      and c.material_deleted_at is null
      and c.centroid_ciphertext is not null
  ) then
    raise exception using
      errcode = '23514',
      message = 'valid centroid not found for reference set';
  end if;

  select count(*)
    into v_active_count
  from private.biometric_references
  where reference_set_id = v_set.id
    and status = 'ACTIVE';

  if v_active_count not between 3 and 5 then
    raise exception using
      errcode = '23514',
      message = 'activation requires 3 to 5 ACTIVE references';
  end if;

  select id
    into v_old_active_id
  from private.biometric_reference_sets
  where tenant_id = v_set.tenant_id
    and empresa_id = v_set.empresa_id
    and colaborador_id = v_set.colaborador_id
    and profile_id = v_set.profile_id
    and status = 'ACTIVE'
    and id <> v_set.id
  for update;

  if v_old_active_id is not null then
    update private.biometric_reference_sets
    set status = 'SUPERSEDED',
        superseded_at = now(),
        lifecycle_reason_code = 'PROFILE_SET_REPLACED',
        updated_at = now()
    where id = v_old_active_id;

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
      reason_code,
      actor_kind,
      actor_user_id,
      request_id
    )
    select
      tenant_id,
      empresa_id,
      colaborador_id,
      'REFERENCE_SET_SUPERSEDED',
      'REFERENCE_SET',
      id,
      profile_id,
      quality_profile_id,
      id,
      'PROFILE_SET_REPLACED',
      case when p_executor_id is null then 'BROKER' else 'USER' end,
      p_executor_id,
      p_request_id
    from private.biometric_reference_sets
    where id = v_old_active_id;
  end if;

  update private.biometric_reference_sets
  set status = 'ACTIVE',
      activated_at = now(),
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
    'REFERENCE_SET_ACTIVATED',
    'REFERENCE_SET',
    v_set.id,
    v_set.profile_id,
    v_set.quality_profile_id,
    v_set.id,
    p_centroid_id,
    case when p_executor_id is null then 'BROKER' else 'USER' end,
    p_executor_id,
    p_request_id
  );

  return jsonb_build_object(
    'referenceSetId',
    v_set.id,
    'status',
    'ACTIVE',
    'supersededReferenceSetId',
    v_old_active_id
  );
end;
$$;

create or replace function private.biometric_backend_get_active_bundle_impl(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
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
  perform private.biometric_assert_boundary(
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id
  );

  select jsonb_build_object(
    'requestId',
    p_request_id,
    'referenceSetId',
    s.id,
    'tenantId',
    s.tenant_id,
    'empresaId',
    s.empresa_id,
    'colaboradorId',
    s.colaborador_id,
    'profileId',
    s.profile_id,
    'qualityProfileId',
    s.quality_profile_id,
    'centroid',
    jsonb_build_object(
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
    ),
    'references',
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'referenceId',
            r.id,
            'sourceRef',
            r.source_ref,
            'ciphertextBase64',
            encode(r.embedding_ciphertext, 'base64'),
            'ivBase64',
            encode(r.embedding_iv, 'base64'),
            'keyVersion',
            r.embedding_key_version,
            'cipherVersion',
            r.embedding_cipher_version,
            'cipherSha256',
            r.embedding_cipher_sha256
          )
          order by r.id
        ),
        '[]'::jsonb
      )
      from private.biometric_references r
      where r.reference_set_id = s.id
        and r.status = 'ACTIVE'
        and r.material_deleted_at is null
    )
  )
  into v_result
  from private.biometric_reference_sets s
  join private.biometric_centroids c
    on c.id = s.current_centroid_id
   and c.reference_set_id = s.id
  where s.tenant_id = p_tenant_id
    and s.empresa_id = p_empresa_id
    and s.colaborador_id = p_colaborador_id
    and s.profile_id = p_profile_id
    and s.status = 'ACTIVE'
    and c.material_deleted_at is null;

  if v_result is null then
    raise exception using
      errcode = 'P0002',
      message = 'active biometric bundle not found';
  end if;

  return v_result;
end;
$$;

create or replace function public.backend_biometric_create_reference_set(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_profile_id text,
  p_quality_profile_id text,
  p_request_id uuid,
  p_executor_id uuid
)
returns uuid
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_create_reference_set_impl(
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id,
    p_profile_id,
    p_quality_profile_id,
    p_request_id,
    p_executor_id
  );
$$;

create or replace function public.backend_biometric_register_reference(
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
  select private.biometric_backend_register_reference_impl(
    p_reference_set_id,
    p_boundary,
    p_quality_metadata,
    p_encrypted_embedding,
    p_source_metadata,
    p_request_id,
    p_executor_id
  );
$$;

create or replace function public.backend_biometric_store_centroid(
  p_reference_set_id uuid,
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
  select private.biometric_backend_store_centroid_impl(
    p_reference_set_id,
    p_contributing_reference_ids,
    p_encrypted_centroid,
    p_request_id,
    p_executor_id
  );
$$;

create or replace function public.backend_biometric_activate_reference_set(
  p_reference_set_id uuid,
  p_centroid_id uuid,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_activate_reference_set_impl(
    p_reference_set_id,
    p_centroid_id,
    p_request_id,
    p_executor_id
  );
$$;

create or replace function public.backend_biometric_change_reference_status(
  p_reference_id uuid,
  p_next_status text,
  p_reason_code text,
  p_request_id uuid,
  p_executor_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_change_reference_status_impl(
    p_reference_id,
    p_next_status,
    p_reason_code,
    p_request_id,
    p_executor_id
  );
$$;

create or replace function public.backend_biometric_get_active_bundle(
  p_tenant_id uuid,
  p_empresa_id uuid,
  p_colaborador_id uuid,
  p_profile_id text,
  p_request_id uuid
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private
as $$
  select private.biometric_backend_get_active_bundle_impl(
    p_tenant_id,
    p_empresa_id,
    p_colaborador_id,
    p_profile_id,
    p_request_id
  );
$$;

revoke all on function private.biometric_assert_boundary(
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_create_reference_set_impl(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_register_reference_impl(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_store_centroid_impl(
  uuid,
  uuid[],
  jsonb,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_activate_reference_set_impl(
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_change_reference_status_impl(
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function private.biometric_backend_get_active_bundle_impl(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

grant usage on schema private to service_role;

grant execute on function private.biometric_assert_boundary(
  uuid,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_create_reference_set_impl(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_register_reference_impl(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_store_centroid_impl(
  uuid,
  uuid[],
  jsonb,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_activate_reference_set_impl(
  uuid,
  uuid,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_change_reference_status_impl(
  uuid,
  text,
  text,
  uuid,
  uuid
) to service_role;

grant execute on function private.biometric_backend_get_active_bundle_impl(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) to service_role;

revoke all on function public.backend_biometric_create_reference_set(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_register_reference(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_store_centroid(
  uuid,
  uuid[],
  jsonb,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_activate_reference_set(
  uuid,
  uuid,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_change_reference_status(
  uuid,
  text,
  text,
  uuid,
  uuid
) from public, anon, authenticated, service_role;

revoke all on function public.backend_biometric_get_active_bundle(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) from public, anon, authenticated, service_role;

grant execute on function public.backend_biometric_create_reference_set(
  uuid,
  uuid,
  uuid,
  text,
  text,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_register_reference(
  uuid,
  jsonb,
  jsonb,
  jsonb,
  jsonb,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_store_centroid(
  uuid,
  uuid[],
  jsonb,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_activate_reference_set(
  uuid,
  uuid,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_change_reference_status(
  uuid,
  text,
  text,
  uuid,
  uuid
) to service_role;

grant execute on function public.backend_biometric_get_active_bundle(
  uuid,
  uuid,
  uuid,
  text,
  uuid
) to service_role;

-- -----------------------------------------------------------------------------
-- 10. OPTIONAL enrollment source bucket - DESIGN ONLY, NOT SQL-APPLIED HERE
-- -----------------------------------------------------------------------------
-- Bucket name: biometrics-enrollment
-- public: false
-- direct anon/authenticated policies: NONE
-- normal object path:
--   <tenant_id>/<empresa_id>/<colaborador_id>/<reference_set_id>/<reference_id>
-- source object: application-layer AES-GCM ciphertext, never raw image.
-- Broker accesses Storage with a server-side Supabase secret credential only.
-- Create/delete objects through the Storage API, not by DML on storage.objects.
-- Default retention mode remains NONE; PRIVATE_STORAGE requires an explicit
-- future retention/reprocessing decision.

commit;
-- Candidate-only transaction boundary. This file remains outside
-- supabase/migrations/ until a separate production-migration authorization.
