-- SafeScan Brasil | R10K-3C4E.2 | PROPOSTA LOCAL, NAO APLICADA
-- Inventario operacional de dispositivos e replay atomico por dispositivo.
-- DEPENDE da migration R10K-3C4C (camera_ia_cameras).
-- NENHUM segredo HMAC, imagem, embedding ou dado biometrico e armazenado.
-- key_id e somente um identificador opaco para um segredo mantido fora do DB.
-- O receptor deve validar o HMAC antes de chamar a funcao de claim.
-- Sem backfill, sem ativacao automatica, sem endpoint publico.

begin;

do $preflight$
begin
    if to_regnamespace('private') is null
       or to_regclass('public.tenants') is null
       or to_regclass('public.camera_ia_cameras') is null then
        raise exception 'R10K-3C4E.2: dependencias private/tenant/camera ausentes';
    end if;

    if to_regrole('service_role') is null
       or to_regrole('anon') is null
       or to_regrole('authenticated') is null then
        raise exception 'R10K-3C4E.2: roles Supabase ausentes';
    end if;

    if not exists (
        select 1
        from pg_catalog.pg_constraint c
        where c.conrelid = 'public.camera_ia_cameras'::regclass
          and c.conname = 'camera_ia_cameras_scope_unique'
          and c.contype = 'u'
    ) then
        raise exception 'R10K-3C4E.2: chave composta de camera ausente';
    end if;

    if to_regclass('private.camera_ia_operational_devices') is not null
       or to_regclass('private.camera_ia_operational_event_claims') is not null
       or to_regprocedure('private.camera_ia_claim_operational_event(text,text,uuid,uuid,uuid,uuid,uuid,text,bigint)') is not null
       or to_regprocedure('private.camera_ia_operational_device_guard()') is not null then
        raise exception 'R10K-3C4E.2: objeto ja existente, interromper';
    end if;
end;
$preflight$;

-- 1. Dispositivo registrado, sempre pendente ate provisionamento aprovado.
-- key_id e um UUID opaco; a chave HMAC permanece em cofre externo.
create table private.camera_ia_operational_devices (
    device_id text primary key,
    camera_id text not null,
    tenant_id uuid not null,
    empresa_id uuid not null,
    status text not null default 'pendente',
    key_id uuid,
    registered_at timestamptz not null default transaction_timestamp(),
    updated_at timestamptz not null default transaction_timestamp(),
    revoked_at timestamptz,
    constraint cam_ia_op_device_id_format
        check (device_id ~ '^[A-Za-z0-9_.:-]{1,160}$'),
    constraint cam_ia_op_device_status_check
        check (status in ('pendente', 'ativo', 'suspenso', 'revogado')),
    constraint cam_ia_op_device_active_key_required
        check (status <> 'ativo' or key_id is not null),
    constraint cam_ia_op_device_revoked_at_check
        check ((status = 'revogado') = (revoked_at is not null)),
    constraint cam_ia_op_device_camera_scope_fk
        foreign key (camera_id, tenant_id, empresa_id)
        references public.camera_ia_cameras(camera_id, tenant_id, empresa_id)
        on delete restrict
);

create index cam_ia_op_devices_scope_status_idx
    on private.camera_ia_operational_devices
        (tenant_id, empresa_id, camera_id, status);

-- 2. Recibos minimos para deduplicacao e auditoria operacional curta.
-- Exclusividade simultanea de (device_id, event_id) E (device_id, nonce).
-- A exclusao por retencao deve ocorrer somente apos expires_at.
create table private.camera_ia_operational_event_claims (
    device_id text not null
        references private.camera_ia_operational_devices(device_id)
        on delete restrict,
    event_id uuid not null,
    nonce uuid not null,
    camera_id text not null,
    tenant_id uuid not null,
    empresa_id uuid not null,
    status text not null,
    accepted boolean not null default false,
    event_epoch_seconds bigint not null,
    received_at timestamptz not null default transaction_timestamp(),
    expires_at timestamptz not null,
    constraint cam_ia_op_claims_pk
        primary key (device_id, event_id),
    constraint cam_ia_op_claims_nonce_unique
        unique (device_id, nonce),
    constraint cam_ia_op_claims_status_check
        check (status in ('NO_FACE', 'MULTIPLE_FACES')),
    constraint cam_ia_op_claims_never_access
        check (accepted = false),
    constraint cam_ia_op_claims_expiry_check
        check (expires_at > received_at)
);

create index cam_ia_op_claims_expiry_idx
    on private.camera_ia_operational_event_claims (expires_at);

-- 3. Imutabilidade do vinculo. Revogacao e terminal.
-- Rotacao de key_id exige operacao privilegiada e nao altera o dispositivo.
create function private.camera_ia_operational_device_guard()
returns trigger
language plpgsql
set search_path = pg_catalog
as $guard$
begin
    if old.device_id is distinct from new.device_id
       or old.camera_id is distinct from new.camera_id
       or old.tenant_id is distinct from new.tenant_id
       or old.empresa_id is distinct from new.empresa_id then
        raise exception using errcode = '42501',
            message = 'cam_ia_device_scope_immutable';
    end if;

    if old.status = 'revogado' then
        raise exception using errcode = '42501',
            message = 'cam_ia_device_revocation_terminal';
    end if;

    if new.status = 'revogado' then
        new.revoked_at := transaction_timestamp();
    else
        new.revoked_at := null;
    end if;

    new.updated_at := transaction_timestamp();
    return new;
end;
$guard$;

create trigger cam_ia_op_device_guard_update
before update on private.camera_ia_operational_devices
for each row execute function private.camera_ia_operational_device_guard();

-- 4. Claim atomico: somente apos HMAC verificado pelo receptor confiavel.
-- key_id impede aceitar assinaturas de uma chave ja rotacionada.
-- Timestamp verificado novamente contra o horario do banco.
-- ON CONFLICT DO NOTHING cobre AMBAS as chaves de replay.
create function private.camera_ia_claim_operational_event(
    p_device_id text,
    p_camera_id text,
    p_tenant_id uuid,
    p_empresa_id uuid,
    p_key_id uuid,
    p_event_id uuid,
    p_nonce uuid,
    p_status text,
    p_event_epoch_seconds bigint
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $claim$
declare
    v_now timestamptz := transaction_timestamp();
    v_now_epoch bigint := floor(extract(epoch from v_now))::bigint;
    v_authorized boolean;
    v_inserted integer;
begin
    if p_device_id is null
       or p_camera_id is null
       or p_tenant_id is null
       or p_empresa_id is null
       or p_key_id is null
       or p_event_id is null
       or p_nonce is null
       or p_status not in ('NO_FACE', 'MULTIPLE_FACES')
       or p_status is null
       or p_event_epoch_seconds is null
       or p_event_epoch_seconds < v_now_epoch - 120
       or p_event_epoch_seconds > v_now_epoch + 120 then
        return false;
    end if;

    -- FOR SHARE sincroniza a verificacao com revogacoes e rotacoes.
    select true into v_authorized
    from private.camera_ia_operational_devices d
    join public.camera_ia_cameras c
      on c.camera_id = d.camera_id
     and c.tenant_id = d.tenant_id
     and c.empresa_id = d.empresa_id
    join public.tenants t on t.id = d.tenant_id
    where d.device_id = p_device_id
      and d.camera_id = p_camera_id
      and d.tenant_id = p_tenant_id
      and d.empresa_id = p_empresa_id
      and d.key_id = p_key_id
      and d.status = 'ativo'
      and c.habilitada = true
      and t.status = 'ativo'
    limit 1
    for share of d, c, t;

    if coalesce(v_authorized, false) is not true then
        return false;
    end if;

    insert into private.camera_ia_operational_event_claims (
        device_id, event_id, nonce, camera_id, tenant_id, empresa_id,
        status, accepted, event_epoch_seconds, received_at, expires_at
    ) values (
        p_device_id, p_event_id, p_nonce, p_camera_id,
        p_tenant_id, p_empresa_id,
        p_status, false, p_event_epoch_seconds,
        v_now, v_now + interval '24 hours'
    )
    on conflict do nothing
    returning 1 into v_inserted;

    return coalesce(v_inserted, 0) = 1;
end;
$claim$;

-- 5. Bloqueio por padrao; sem policies para anon/authenticated.
alter table private.camera_ia_operational_devices enable row level security;
alter table private.camera_ia_operational_event_claims enable row level security;

revoke all on table
    private.camera_ia_operational_devices,
    private.camera_ia_operational_event_claims
from public, anon, authenticated;

revoke all on function private.camera_ia_operational_device_guard()
from public, anon, authenticated;

revoke all on function private.camera_ia_claim_operational_event(
    text, text, uuid, uuid, uuid, uuid, uuid, text, bigint
) from public, anon, authenticated;

grant usage on schema private to service_role;
grant select, insert, update on table
    private.camera_ia_operational_devices to service_role;
grant select, delete on table
    private.camera_ia_operational_event_claims to service_role;
grant execute on function private.camera_ia_claim_operational_event(
    text, text, uuid, uuid, uuid, uuid, uuid, text, bigint
) to service_role;

comment on table private.camera_ia_operational_devices is
    'R10K-3C4E.2: dispositivo com escopo imutavel e identificador de chave externa; sem segredo HMAC.';
comment on column private.camera_ia_operational_devices.key_id is
    'UUID opaco da versao de chave armazenada em gerenciador externo; nao e segredo.';
comment on table private.camera_ia_operational_event_claims is
    'R10K-3C4E.2: recibos atomicos anti-replay, somente metadados operacionais minimizados.';
comment on function private.camera_ia_claim_operational_event(
    text, text, uuid, uuid, uuid, uuid, uuid, text, bigint
) is
    'Uso exclusivo por backend confiavel apos verificacao HMAC. Nao expositor publico.';

commit;
