-- SafeScan Brasil | R10K-3C4F-C3D | PROPOSTA LOCAL / NAO APLICADA
-- Depende de R10K-3C4C, R10K-3C4E.2 e R10K-3C4F-C3B.
-- Vincula atomicamente um recibo HMAC ja confirmado a um registro de outbox.
-- Nunca recebe imagem, embedding, segredo, CPF, nome, ou autorizacao de acesso fisico.
-- Entrega at-least-once: consumidores devem deduplicar por (device_id, event_id).
-- 'dispatched' significa HANDOFF CONFIRMADO pelo consumidor, NAO visualizacao no navegador.
-- Sem login, senha, endpoints, cameras, rotas, backfill ou migracoes aplicadas.

begin;

do $preflight$
begin
    if to_regnamespace('private') is null
       or to_regclass('private.camera_ia_operational_event_claims') is null
       or to_regclass('private.camera_ia_operational_devices') is null
       or to_regclass('public.camera_ia_cameras') is null
       or to_regclass('public.tenants') is null
       or to_regrole('cam_ia_operational_ingest_executor') is null
       or to_regrole('service_role') is null
       or to_regrole('anon') is null
       or to_regrole('authenticated') is null
       or to_regprocedure('private.camera_ia_claim_operational_event(text,text,uuid,uuid,uuid,uuid,uuid,text,bigint)') is null
       or to_regprocedure('private.camera_ia_get_active_operational_device(text)') is null then
        raise exception 'R10K-3C4F-C3D: C3B ou dependencias ausentes';
    end if;

    if to_regclass('private.camera_ia_operational_outbox') is not null
       or to_regrole('cam_ia_operational_outbox_dispatcher') is not null
       or to_regrole('cam_ia_operational_outbox_maintainer') is not null
       or to_regprocedure('private.camera_ia_outbox_after_claim()') is not null
       or to_regprocedure('private.camera_ia_lease_operational_outbox(uuid,integer,integer)') is not null
       or to_regprocedure('private.camera_ia_ack_operational_outbox(uuid,text,uuid,uuid)') is not null
       or to_regprocedure('private.camera_ia_prune_operational_outbox(integer)') is not null then
        raise exception 'R10K-3C4F-C3D: objeto ja existente; sem sobrescrita';
    end if;

    if not has_function_privilege(
         'cam_ia_operational_ingest_executor',
         'private.camera_ia_claim_operational_event(text,text,uuid,uuid,uuid,uuid,uuid,text,bigint)',
         'EXECUTE'
       ) or has_function_privilege(
         'service_role',
         'private.camera_ia_claim_operational_event(text,text,uuid,uuid,uuid,uuid,uuid,text,bigint)',
         'EXECUTE'
       ) then
        raise exception 'R10K-3C4F-C3D: privilegios C3B inesperados';
    end if;
end;
$preflight$;

-- Duas identidades de permissao separadas, sem credenciais nem membros.
create role cam_ia_operational_outbox_dispatcher
    nologin noinherit nosuperuser nocreatedb nocreaterole
    noreplication nobypassrls;
create role cam_ia_operational_outbox_maintainer
    nologin noinherit nosuperuser nocreatedb nocreaterole
    noreplication nobypassrls;

-- A outbox referencia o recibo; ele nao pode ser purgado prematuramente.
-- O payload operacional minimo permanece em claims e e lido apenas no lease.
create table private.camera_ia_operational_outbox (
    device_id text not null,
    event_id uuid not null,
    state text not null default 'pending',
    created_at timestamptz not null default transaction_timestamp(),
    attempt_count integer not null default 0,
    lease_owner uuid,
    lease_token uuid,
    lease_expires_at timestamptz,
    dispatched_at timestamptz,
    retain_until timestamptz,
    constraint cam_ia_outbox_pk primary key (device_id, event_id),
    constraint cam_ia_outbox_claim_fk foreign key (device_id, event_id)
        references private.camera_ia_operational_event_claims(device_id, event_id)
        on delete restrict,
    constraint cam_ia_outbox_state_check
        check (state in ('pending', 'leased', 'dispatched')),
    constraint cam_ia_outbox_attempt_check check (attempt_count >= 0),
    constraint cam_ia_outbox_state_fields_check check (
        (state = 'pending' and lease_owner is null and lease_token is null
             and lease_expires_at is null and dispatched_at is null and retain_until is null)
        or
        (state = 'leased' and lease_owner is not null and lease_token is not null
             and lease_expires_at is not null and dispatched_at is null and retain_until is null)
        or
        (state = 'dispatched' and lease_owner is null and lease_token is null
             and lease_expires_at is null and dispatched_at is not null
             and retain_until >= dispatched_at)
    )
);

create index cam_ia_outbox_pending_lease_idx
    on private.camera_ia_operational_outbox (state, lease_expires_at, created_at)
    where state in ('pending', 'leased');
create index cam_ia_outbox_retention_idx
    on private.camera_ia_operational_outbox (retain_until)
    where state = 'dispatched';

alter table private.camera_ia_operational_outbox enable row level security;
revoke all on private.camera_ia_operational_outbox
    from public, anon, authenticated, service_role, cam_ia_operational_ingest_executor;

-- O trigger executa na mesma transacao do INSERT autorizado pela funcao C3E.2.
-- Qualquer erro no INSERT da outbox aborta o INSERT do claim inteiro.
create function private.camera_ia_outbox_after_claim()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $trigger$
begin
    if new.accepted is distinct from false
       or new.status not in ('NO_FACE', 'MULTIPLE_FACES') then
        raise exception 'R10K-3C4F-C3D: recibo operacional invalido';
    end if;

    insert into private.camera_ia_operational_outbox (device_id, event_id)
    values (new.device_id, new.event_id);
    return new;
end;
$trigger$;

create trigger cam_ia_outbox_insert_after_claim
    after insert on private.camera_ia_operational_event_claims
    for each row execute function private.camera_ia_outbox_after_claim();

-- Leases com fencing token: somente um worker recebe cada evento por vez.
-- Nao envia dados para SSE; o ACK so deve ocorrer apos handoff duravel.
-- Eventos de cameras/tenants/dispositivos revogados deixam de ser alugados.
create function private.camera_ia_lease_operational_outbox(
    p_worker_id uuid,
    p_batch_size integer,
    p_lease_seconds integer
)
returns table (
    "deviceId" text,
    "eventId" uuid,
    "cameraId" text,
    "tenantId" uuid,
    "empresaId" uuid,
    status text,
    accepted boolean,
    "leaseToken" uuid,
    "leaseUntil" timestamptz
)
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $lease$
declare
    v_now timestamptz := clock_timestamp();
begin
    if p_worker_id is null
       or p_batch_size is null or p_batch_size not between 1 and 100
       or p_lease_seconds is null or p_lease_seconds not between 10 and 300 then
        return;
    end if;

    return query
    with picked as (
        select o.device_id, o.event_id
          from private.camera_ia_operational_outbox o
          join private.camera_ia_operational_event_claims e
            on e.device_id = o.device_id and e.event_id = o.event_id
          join private.camera_ia_operational_devices d
            on d.device_id = e.device_id and d.camera_id = e.camera_id
           and d.tenant_id = e.tenant_id and d.empresa_id = e.empresa_id
          join public.camera_ia_cameras c
            on c.camera_id = d.camera_id and c.tenant_id = d.tenant_id
           and c.empresa_id = d.empresa_id
          join public.tenants t on t.id = d.tenant_id
         where (o.state = 'pending'
                or (o.state = 'leased' and o.lease_expires_at <= v_now))
           and d.status = 'ativo'
           and c.habilitada is true
           and t.status = 'ativo'
           and e.accepted is false
         order by o.created_at, o.device_id, o.event_id
         limit p_batch_size
         for update of o skip locked
    ), leased as (
        update private.camera_ia_operational_outbox o
           set state = 'leased',
               lease_owner = p_worker_id,
               lease_token = pg_catalog.gen_random_uuid(),
               lease_expires_at = v_now + make_interval(secs => p_lease_seconds),
               attempt_count = o.attempt_count + 1
          from picked p
         where o.device_id = p.device_id and o.event_id = p.event_id
         returning o.device_id, o.event_id, o.lease_token, o.lease_expires_at
    )
    select e.device_id, e.event_id, e.camera_id, e.tenant_id,
           e.empresa_id, e.status, e.accepted,
           l.lease_token, l.lease_expires_at
      from leased l
      join private.camera_ia_operational_event_claims e
        on e.device_id = l.device_id and e.event_id = l.event_id;
end;
$lease$;

-- Fencing impede ACK de worker antigo apos expiracao/reaquisicao.
-- O ACK significa entrega confirmada a um canal duravel downstream.
create function private.camera_ia_ack_operational_outbox(
    p_worker_id uuid,
    p_device_id text,
    p_event_id uuid,
    p_lease_token uuid
)
returns boolean
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $ack$
declare
    v_count integer;
    v_now timestamptz := clock_timestamp();
begin
    if p_worker_id is null or p_device_id is null
       or p_event_id is null or p_lease_token is null then
        return false;
    end if;

    update private.camera_ia_operational_outbox o
       set state = 'dispatched',
           lease_owner = null,
           lease_token = null,
           lease_expires_at = null,
           dispatched_at = v_now,
           retain_until = v_now + interval '7 days'
     where o.device_id = p_device_id
       and o.event_id = p_event_id
       and o.state = 'leased'
       and o.lease_owner = p_worker_id
       and o.lease_token = p_lease_token
       and o.lease_expires_at > v_now;

    get diagnostics v_count = row_count;
    return v_count = 1;
end;
$ack$;

-- Manutencao so remove outbox CONFIRMADA apos 7 dias.
-- CLAIM sem outbox so pode ser removido apos seu expires_at original.
-- CLAIM com outbox pendente/leased e conservado (FK + NOT EXISTS).
create function private.camera_ia_prune_operational_outbox(
    p_batch_size integer
)
returns table (outbox_removed integer, claims_removed integer)
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $prune$
declare
    v_now timestamptz := clock_timestamp();
    v_out integer := 0;
    v_claim integer := 0;
begin
    if p_batch_size is null or p_batch_size not between 1 and 1000 then
        return query select 0, 0;
        return;
    end if;

    with picked as (
        select o.device_id, o.event_id
          from private.camera_ia_operational_outbox o
         where o.state = 'dispatched' and o.retain_until <= v_now
         order by o.retain_until, o.device_id, o.event_id
         limit p_batch_size
         for update of o skip locked
    )
    delete from private.camera_ia_operational_outbox o using picked p
     where o.device_id = p.device_id and o.event_id = p.event_id;
    get diagnostics v_out = row_count;

    with expired as (
        select c.device_id, c.event_id
          from private.camera_ia_operational_event_claims c
         where c.expires_at <= v_now
           and not exists (
               select 1 from private.camera_ia_operational_outbox o
                where o.device_id = c.device_id and o.event_id = c.event_id
           )
         order by c.expires_at, c.device_id, c.event_id
         limit p_batch_size
         for update of c skip locked
    )
    delete from private.camera_ia_operational_event_claims c using expired x
     where c.device_id = x.device_id and c.event_id = x.event_id
       and not exists (
           select 1 from private.camera_ia_operational_outbox o
            where o.device_id = c.device_id and o.event_id = c.event_id
       );
    get diagnostics v_claim = row_count;
    return query select v_out, v_claim;
end;
$prune$;

revoke all on function private.camera_ia_outbox_after_claim()
    from public, anon, authenticated, service_role,
         cam_ia_operational_ingest_executor;
revoke all on function private.camera_ia_lease_operational_outbox(uuid,integer,integer)
    from public, anon, authenticated, service_role,
         cam_ia_operational_ingest_executor;
revoke all on function private.camera_ia_ack_operational_outbox(uuid,text,uuid,uuid)
    from public, anon, authenticated, service_role,
         cam_ia_operational_ingest_executor;
revoke all on function private.camera_ia_prune_operational_outbox(integer)
    from public, anon, authenticated, service_role,
         cam_ia_operational_ingest_executor;

grant usage on schema private to
    cam_ia_operational_outbox_dispatcher,
    cam_ia_operational_outbox_maintainer;
grant execute on function private.camera_ia_lease_operational_outbox(uuid,integer,integer)
    to cam_ia_operational_outbox_dispatcher;
grant execute on function private.camera_ia_ack_operational_outbox(uuid,text,uuid,uuid)
    to cam_ia_operational_outbox_dispatcher;
grant execute on function private.camera_ia_prune_operational_outbox(integer)
    to cam_ia_operational_outbox_maintainer;

comment on table private.camera_ia_operational_outbox is
    'R10K-3C4F-C3D: intencao de entrega duravel, vinculada ao recibo; somente metadados operacionais.';
comment on function private.camera_ia_ack_operational_outbox(uuid,text,uuid,uuid) is
    'ACK apos handoff DURAVEL downstream; nao confirma leitura por cliente SSE. Entrega at-least-once.';

commit;
