-- SafeScan Brasil
-- CAM-IA-PROD-VISION-GATEWAY-01
-- Telemetria operacional sanitizada de camera e EPI.
-- Sem video, RTSP, credenciais, biometria ou decisao fisica.

begin;

do $preflight$
begin
    if to_regclass('public.tenants') is null
       or to_regclass('public.empresas') is null
       or to_regprocedure('public.usuario_ativo_sistema()') is null
       or to_regprocedure('public.usuario_tem_acesso_empresa(uuid)') is null
       or to_regprocedure('public.tenant_tem_modulo(uuid,text)') is null then
        raise exception
            'CAM_IA_OPERATIONAL_TELEMETRY_DEPENDENCIAS_AUSENTES';
    end if;

    if to_regclass('public.camera_ia_telemetria_operacional') is not null
       or to_regclass('private.camera_ia_operational_devices') is not null
       or to_regclass('private.camera_ia_operational_replay') is not null
       or to_regprocedure('public.camera_ia_ingest_resolver_dispositivo(text)') is not null then
        raise exception
            'CAM_IA_OPERATIONAL_TELEMETRY_OBJETOS_JA_EXISTEM';
    end if;
end;
$preflight$;

create schema if not exists private;

create table private.camera_ia_operational_devices (
    device_id text primary key,

    camera_id text not null,

    camera_nome text not null
        default 'Portaria 01',

    tenant_id uuid not null
        references public.tenants(id)
        on delete cascade,

    empresa_id uuid not null
        references public.empresas(id)
        on delete cascade,

    key_id uuid not null,

    status text not null
        default 'inativo',

    created_at timestamptz not null
        default clock_timestamp(),

    updated_at timestamptz not null
        default clock_timestamp(),

    constraint camera_ia_operational_devices_device_chk
        check (
            device_id ~
            '^[A-Za-z0-9_.:-]{1,160}$'
        ),

    constraint camera_ia_operational_devices_camera_chk
        check (
            camera_id ~
            '^[A-Za-z0-9_.:-]{1,160}$'
        ),

    constraint camera_ia_operational_devices_name_chk
        check (
            length(
                btrim(
                    camera_nome
                )
            )
            between 1 and 120
        ),

    constraint camera_ia_operational_devices_status_chk
        check (
            status in (
                'ativo',
                'inativo'
            )
        ),

    constraint camera_ia_operational_devices_camera_uniq
        unique (
            tenant_id,
            camera_id
        )
);

create index camera_ia_operational_devices_empresa_idx
    on private.camera_ia_operational_devices (
        tenant_id,
        empresa_id,
        status
    );

alter table private.camera_ia_operational_devices
    enable row level security;

revoke all
on table private.camera_ia_operational_devices
from public, anon, authenticated;

create table private.camera_ia_operational_replay (
    device_id text not null,

    event_id uuid not null,

    nonce uuid not null,

    expires_at timestamptz not null,

    created_at timestamptz not null
        default clock_timestamp(),

    constraint camera_ia_operational_replay_pk
        primary key (
            device_id,
            event_id
        ),

    constraint camera_ia_operational_replay_nonce_uniq
        unique (
            device_id,
            nonce
        ),

    constraint camera_ia_operational_replay_device_chk
        check (
            device_id ~
            '^[A-Za-z0-9_.:-]{1,160}$'
        ),

    constraint camera_ia_operational_replay_expiry_chk
        check (
            expires_at >
            created_at
        )
);

create index camera_ia_operational_replay_expiry_idx
    on private.camera_ia_operational_replay (
        expires_at
    );

alter table private.camera_ia_operational_replay
    enable row level security;

revoke all
on table private.camera_ia_operational_replay
from public, anon, authenticated;

create table public.camera_ia_telemetria_operacional (
    tenant_id uuid not null
        references public.tenants(id)
        on delete cascade,

    empresa_id uuid not null
        references public.empresas(id)
        on delete cascade,

    camera_id text not null,

    camera_nome text not null,

    device_id text not null,

    event_id uuid not null,

    camera_status text not null,

    frames_recent boolean not null,

    frame_count bigint not null,

    ppe_status text not null,

    person_count integer not null,

    hardhat_count integer not null,

    no_hardhat_count integer not null,

    vest_count integer not null,

    no_vest_count integer not null,

    person_confidence double precision not null,

    hardhat_confidence double precision not null,

    no_hardhat_confidence double precision not null,

    vest_confidence double precision not null,

    no_vest_confidence double precision not null,

    observed_at timestamptz not null,

    received_at timestamptz not null
        default clock_timestamp(),

    constraint camera_ia_telemetria_operacional_pk
        primary key (
            tenant_id,
            camera_id
        ),

    constraint camera_ia_telemetria_operacional_event_uniq
        unique (
            event_id
        ),

    constraint camera_ia_telemetria_operacional_camera_chk
        check (
            camera_id ~
            '^[A-Za-z0-9_.:-]{1,160}$'
        ),

    constraint camera_ia_telemetria_operacional_device_chk
        check (
            device_id ~
            '^[A-Za-z0-9_.:-]{1,160}$'
        ),

    constraint camera_ia_telemetria_operacional_name_chk
        check (
            length(
                btrim(
                    camera_nome
                )
            )
            between 1 and 120
        ),

    constraint camera_ia_telemetria_operacional_camera_status_chk
        check (
            camera_status in (
                'NO_CAMERA_CONFIGURED',
                'NO_ACTIVE_SESSION',
                'SESSION_NO_RECENT_FRAMES',
                'FRAMES_RECENT'
            )
        ),

    constraint camera_ia_telemetria_operacional_frames_chk
        check (
            frames_recent =
            (
                camera_status =
                'FRAMES_RECENT'
            )
        ),

    constraint camera_ia_telemetria_operacional_frame_count_chk
        check (
            frame_count >= 0
        ),

    constraint camera_ia_telemetria_operacional_ppe_status_chk
        check (
            ppe_status in (
                'INITIALIZING',
                'WAITING_FOR_FRAMES',
                'PPE_DETECTED',
                'NO_PERSON',
                'STALE',
                'ERROR',
                'UNAVAILABLE'
            )
        ),

    constraint camera_ia_telemetria_operacional_counts_chk
        check (
            person_count between 0 and 50
            and hardhat_count between 0 and 50
            and no_hardhat_count between 0 and 50
            and vest_count between 0 and 50
            and no_vest_count between 0 and 50
        ),

    constraint camera_ia_telemetria_operacional_confidence_chk
        check (
            person_confidence between 0 and 1
            and hardhat_confidence between 0 and 1
            and no_hardhat_confidence between 0 and 1
            and vest_confidence between 0 and 1
            and no_vest_confidence between 0 and 1
        ),

    constraint camera_ia_telemetria_operacional_unmeasured_chk
        check (
            ppe_status = 'PPE_DETECTED'
            or (
                person_count = 0
                and hardhat_count = 0
                and no_hardhat_count = 0
                and vest_count = 0
                and no_vest_count = 0
                and person_confidence = 0
                and hardhat_confidence = 0
                and no_hardhat_confidence = 0
                and vest_confidence = 0
                and no_vest_confidence = 0
            )
        )
);

create index camera_ia_telemetria_operacional_empresa_idx
    on public.camera_ia_telemetria_operacional (
        empresa_id,
        received_at desc
    );

alter table public.camera_ia_telemetria_operacional
    enable row level security;

revoke all
on table public.camera_ia_telemetria_operacional
from public, anon, authenticated;

grant select
on table public.camera_ia_telemetria_operacional
to authenticated;

create policy camera_ia_telemetria_operacional_select
on public.camera_ia_telemetria_operacional
for select
to authenticated
using (
    auth.uid() is not null
    and public.usuario_ativo_sistema()
    and public.usuario_tem_acesso_empresa(
        empresa_id
    )
    and public.tenant_tem_modulo(
        tenant_id,
        'controle_acesso_ia'
    )
    and exists (
        select 1
        from public.empresas e
        where e.id =
              camera_ia_telemetria_operacional.empresa_id
          and e.tenant_id =
              camera_ia_telemetria_operacional.tenant_id
    )
);

create function public.camera_ia_ingest_resolver_dispositivo(
    p_device_id text
)
returns table (
    device_id text,
    camera_id text,
    camera_nome text,
    tenant_id uuid,
    empresa_id uuid,
    key_id uuid,
    status text
)
language sql
stable
security definer
set search_path = pg_catalog
as $resolver$
    select
        d.device_id,
        d.camera_id,
        d.camera_nome,
        d.tenant_id,
        d.empresa_id,
        d.key_id,
        d.status
    from private.camera_ia_operational_devices d
    join public.tenants t
      on t.id =
         d.tenant_id
    join public.empresas e
      on e.id =
         d.empresa_id
     and e.tenant_id =
         d.tenant_id
    where p_device_id is not null
      and p_device_id ~
          '^[A-Za-z0-9_.:-]{1,160}$'
      and d.device_id =
          p_device_id
      and d.status =
          'ativo'
      and t.status =
          'ativo'
      and public.tenant_tem_modulo(
          d.tenant_id,
          'controle_acesso_ia'
      )
    limit 1;
$resolver$;

revoke all
on function public.camera_ia_ingest_resolver_dispositivo(text)
from public, anon, authenticated;

grant execute
on function public.camera_ia_ingest_resolver_dispositivo(text)
to service_role;

create function public.camera_ia_ingest_confirmar_telemetria(
    p_device_id text,
    p_camera_id text,
    p_tenant_id uuid,
    p_empresa_id uuid,
    p_key_id uuid,
    p_event_id uuid,
    p_nonce uuid,
    p_observed_at timestamptz,
    p_camera_status text,
    p_frames_recent boolean,
    p_frame_count bigint,
    p_ppe_status text,
    p_person_count integer,
    p_hardhat_count integer,
    p_no_hardhat_count integer,
    p_vest_count integer,
    p_no_vest_count integer,
    p_person_confidence double precision,
    p_hardhat_confidence double precision,
    p_no_hardhat_confidence double precision,
    p_vest_confidence double precision,
    p_no_vest_confidence double precision,
    p_event_epoch_seconds bigint
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $commit$
declare
    v_now timestamptz :=
        clock_timestamp();

    v_now_epoch bigint :=
        floor(
            extract(
                epoch
                from v_now
            )
        )::bigint;

    v_claimed integer :=
        0;

    v_camera_nome text;
begin
    if p_device_id is null
       or p_device_id !~
          '^[A-Za-z0-9_.:-]{1,160}$'
       or p_camera_id is null
       or p_camera_id !~
          '^[A-Za-z0-9_.:-]{1,160}$'
       or p_tenant_id is null
       or p_empresa_id is null
       or p_key_id is null
       or p_event_id is null
       or p_nonce is null
       or p_observed_at is null
       or p_event_epoch_seconds is null
       or abs(
            v_now_epoch -
            p_event_epoch_seconds
          ) > 120
       or p_observed_at >
          v_now + interval '30 seconds'
       or p_observed_at <
          v_now - interval '120 seconds'
       or p_camera_status not in (
            'NO_CAMERA_CONFIGURED',
            'NO_ACTIVE_SESSION',
            'SESSION_NO_RECENT_FRAMES',
            'FRAMES_RECENT'
          )
       or p_frames_recent is null
       or p_frames_recent is distinct from
          (
              p_camera_status =
              'FRAMES_RECENT'
          )
       or p_frame_count is null
       or p_frame_count < 0
       or p_ppe_status not in (
            'INITIALIZING',
            'WAITING_FOR_FRAMES',
            'PPE_DETECTED',
            'NO_PERSON',
            'STALE',
            'ERROR',
            'UNAVAILABLE'
          )
       or p_person_count not between 0 and 50
       or p_hardhat_count not between 0 and 50
       or p_no_hardhat_count not between 0 and 50
       or p_vest_count not between 0 and 50
       or p_no_vest_count not between 0 and 50
       or p_person_confidence not between 0 and 1
       or p_hardhat_confidence not between 0 and 1
       or p_no_hardhat_confidence not between 0 and 1
       or p_vest_confidence not between 0 and 1
       or p_no_vest_confidence not between 0 and 1 then
        return false;
    end if;

    if p_ppe_status <>
       'PPE_DETECTED'
       and (
            p_person_count <> 0
            or p_hardhat_count <> 0
            or p_no_hardhat_count <> 0
            or p_vest_count <> 0
            or p_no_vest_count <> 0
            or p_person_confidence <> 0
            or p_hardhat_confidence <> 0
            or p_no_hardhat_confidence <> 0
            or p_vest_confidence <> 0
            or p_no_vest_confidence <> 0
       ) then
        return false;
    end if;

    select
        d.camera_nome
    into
        v_camera_nome
    from private.camera_ia_operational_devices d
    join public.tenants t
      on t.id =
         d.tenant_id
    join public.empresas e
      on e.id =
         d.empresa_id
     and e.tenant_id =
         d.tenant_id
    where d.device_id =
          p_device_id
      and d.camera_id =
          p_camera_id
      and d.tenant_id =
          p_tenant_id
      and d.empresa_id =
          p_empresa_id
      and d.key_id =
          p_key_id
      and d.status =
          'ativo'
      and t.status =
          'ativo'
      and public.tenant_tem_modulo(
          d.tenant_id,
          'controle_acesso_ia'
      )
    limit 1;

    if v_camera_nome is null then
        return false;
    end if;

    delete
    from private.camera_ia_operational_replay
    where expires_at <=
          v_now;

    insert into private.camera_ia_operational_replay (
        device_id,
        event_id,
        nonce,
        expires_at
    )
    values (
        p_device_id,
        p_event_id,
        p_nonce,
        v_now +
        interval '1 day'
    )
    on conflict do nothing;

    get diagnostics
        v_claimed =
        row_count;

    if v_claimed <> 1 then
        return false;
    end if;

    insert into public.camera_ia_telemetria_operacional (
        tenant_id,
        empresa_id,
        camera_id,
        camera_nome,
        device_id,
        event_id,
        camera_status,
        frames_recent,
        frame_count,
        ppe_status,
        person_count,
        hardhat_count,
        no_hardhat_count,
        vest_count,
        no_vest_count,
        person_confidence,
        hardhat_confidence,
        no_hardhat_confidence,
        vest_confidence,
        no_vest_confidence,
        observed_at,
        received_at
    )
    values (
        p_tenant_id,
        p_empresa_id,
        p_camera_id,
        v_camera_nome,
        p_device_id,
        p_event_id,
        p_camera_status,
        p_frames_recent,
        p_frame_count,
        p_ppe_status,
        p_person_count,
        p_hardhat_count,
        p_no_hardhat_count,
        p_vest_count,
        p_no_vest_count,
        p_person_confidence,
        p_hardhat_confidence,
        p_no_hardhat_confidence,
        p_vest_confidence,
        p_no_vest_confidence,
        p_observed_at,
        v_now
    )
    on conflict (
        tenant_id,
        camera_id
    )
    do update set
        empresa_id =
            excluded.empresa_id,
        camera_nome =
            excluded.camera_nome,
        device_id =
            excluded.device_id,
        event_id =
            excluded.event_id,
        camera_status =
            excluded.camera_status,
        frames_recent =
            excluded.frames_recent,
        frame_count =
            excluded.frame_count,
        ppe_status =
            excluded.ppe_status,
        person_count =
            excluded.person_count,
        hardhat_count =
            excluded.hardhat_count,
        no_hardhat_count =
            excluded.no_hardhat_count,
        vest_count =
            excluded.vest_count,
        no_vest_count =
            excluded.no_vest_count,
        person_confidence =
            excluded.person_confidence,
        hardhat_confidence =
            excluded.hardhat_confidence,
        no_hardhat_confidence =
            excluded.no_hardhat_confidence,
        vest_confidence =
            excluded.vest_confidence,
        no_vest_confidence =
            excluded.no_vest_confidence,
        observed_at =
            excluded.observed_at,
        received_at =
            excluded.received_at
    where
        excluded.observed_at >=
        public.camera_ia_telemetria_operacional.observed_at;

    return true;
end;
$commit$;

revoke all
on function public.camera_ia_ingest_confirmar_telemetria(
    text,
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    timestamptz,
    text,
    boolean,
    bigint,
    text,
    integer,
    integer,
    integer,
    integer,
    integer,
    double precision,
    double precision,
    double precision,
    double precision,
    double precision,
    bigint
)
from public, anon, authenticated;

grant execute
on function public.camera_ia_ingest_confirmar_telemetria(
    text,
    text,
    uuid,
    uuid,
    uuid,
    uuid,
    uuid,
    timestamptz,
    text,
    boolean,
    bigint,
    text,
    integer,
    integer,
    integer,
    integer,
    integer,
    double precision,
    double precision,
    double precision,
    double precision,
    double precision,
    bigint
)
to service_role;

comment on table public.camera_ia_telemetria_operacional is
'Telemetria operacional sanitizada da Camera IA. Sem video, RTSP, biometria, credenciais ou decisao fisica.';

commit;