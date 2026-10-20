-- SafeScan Brasil | R10K-3C4F-C3F-B2 | MIGRATION LOCAL NAO APLICADA
-- Journal operacional privado; handoff + ACK C3D atomicamente na mesma transacao.
-- Pre-requisitos imutaveis: C3C4C, C3C4E2, C3B e C3D.
-- Contrato NO_FACE/MULTIPLE_FACES accepted=false; sem imagens, embeddings,
-- segredos, identificacao facial, reconhecimento ou decisao de acesso.
-- Fonte duravel para recuperacao; SSE/ACL real sera homologado em B4/D.
-- Acesso via papeis NOLOGIN de backend; NAO publicar no PostgREST.
-- Retencao limitada a 7 dias desde handoff, mesmo sem leitura SSE.
-- Nenhuma chave de ordenacao e tratada como cursor de commit neste modulo.

begin;

do $preflight$
begin
    if to_regnamespace('private') is null
       or to_regclass('private.camera_ia_operational_outbox') is null
       or to_regclass('private.camera_ia_operational_event_claims') is null
       or to_regclass('private.camera_ia_operational_devices') is null
       or to_regclass('public.camera_ia_cameras') is null
       or to_regclass('public.tenants') is null
       or to_regrole('cam_ia_operational_outbox_dispatcher') is null
       or to_regrole('cam_ia_operational_outbox_maintainer') is null
       or to_regrole('cam_ia_operational_ingest_executor') is null
       or to_regrole('service_role') is null
       or to_regrole('anon') is null
       or to_regrole('authenticated') is null
       or to_regprocedure('private.camera_ia_ack_operational_outbox(uuid,text,uuid,uuid)') is null
       or to_regprocedure('private.camera_ia_lease_operational_outbox(uuid,integer,integer)') is null then
        raise exception 'R10K-C3F-B2: dependencias C3D ausentes';
    end if;

    if to_regclass('private.camera_ia_operational_delivery_journal') is not null
       or to_regrole('cam_ia_operational_journal_reader') is not null
       or to_regprocedure('private.camera_ia_handoff_operational_journal(uuid,text,uuid,uuid)') is not null
       or to_regprocedure('private.camera_ia_read_operational_journal(uuid,uuid,text,integer)') is not null
       or to_regprocedure('private.camera_ia_prune_operational_journal(integer)') is not null then
        raise exception 'R10K-C3F-B2: objeto ja existente; nao sobrescrever';
    end if;

    if not has_function_privilege('cam_ia_operational_outbox_dispatcher',
          'private.camera_ia_ack_operational_outbox(uuid,text,uuid,uuid)','EXECUTE')
       or not has_function_privilege('cam_ia_operational_outbox_dispatcher',
          'private.camera_ia_lease_operational_outbox(uuid,integer,integer)','EXECUTE')
       or has_function_privilege('service_role',
          'private.camera_ia_ack_operational_outbox(uuid,text,uuid,uuid)','EXECUTE') then
        raise exception 'R10K-C3F-B2: privilegios C3D inesperados';
    end if;
end;
$preflight$;

create role cam_ia_operational_journal_reader
    nologin noinherit nosuperuser nocreatedb nocreaterole
    noreplication nobypassrls;

-- O journal permanece mesmo apos a limpeza da outbox/claims da C3D.
-- Sem FK para a outbox, pois seu prazo de retencao e independente.
-- O UNICO caminho de insercao autorizado sera a funcao de handoff.
create table private.camera_ia_operational_delivery_journal (
    device_id text not null,
    event_id uuid not null,
    tenant_id uuid not null,
    empresa_id uuid not null,
    camera_id text not null,
    status text not null,
    accepted boolean not null default false,
    recorded_at timestamptz not null default clock_timestamp(),
    retain_until timestamptz not null default (clock_timestamp() + interval '7 days'),
    constraint cam_ia_delivery_journal_pk primary key (device_id,event_id),
    constraint cam_ia_delivery_journal_device_format
        check (device_id ~ '^[A-Za-z0-9_.:-]{1,160}$'),
    constraint cam_ia_delivery_journal_camera_format
        check (camera_id ~ '^[A-Za-z0-9_.:-]{1,160}$'),
    constraint cam_ia_delivery_journal_status
        check (status in ('NO_FACE','MULTIPLE_FACES')),
    constraint cam_ia_delivery_journal_no_access check (accepted is false),
    constraint cam_ia_delivery_journal_retention
        check (retain_until = recorded_at + interval '7 days')
);

create index cam_ia_delivery_journal_scope_idx
    on private.camera_ia_operational_delivery_journal
       (tenant_id,empresa_id,camera_id,recorded_at,device_id,event_id);
create index cam_ia_delivery_journal_prune_idx
    on private.camera_ia_operational_delivery_journal (retain_until);

alter table private.camera_ia_operational_delivery_journal enable row level security;
revoke all on private.camera_ia_operational_delivery_journal
    from public, anon, authenticated, service_role,
         cam_ia_operational_ingest_executor,
         cam_ia_operational_outbox_dispatcher,
         cam_ia_operational_outbox_maintainer,
         cam_ia_operational_journal_reader;

-- FENCING + escrow transacional: a mesma transacao grava no journal
-- e marca a outbox como dispatched. Se qualquer etapa falhar, nada e confirmado.
-- Travas SHARE de dispositivo/camera/tenant fecham corrida de revogacao com o ACK.
create function private.camera_ia_handoff_operational_journal(
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
as $handoff$
declare
    v_record record;
    v_journal record;
    v_ack boolean;
    v_now timestamptz;
begin
    if p_worker_id is null or p_device_id is null
       or p_event_id is null or p_lease_token is null
       or p_device_id !~ '^[A-Za-z0-9_.:-]{1,160}$' then
        return false;
    end if;

    -- O FOR UPDATE sobre a outbox serializa duas tentativas sobre o mesmo lease.
    -- Os FOR SHARE impedem UPDATE de revogacao ate a conclusao desta transacao.
    select e.device_id, e.event_id, e.camera_id, e.tenant_id,
           e.empresa_id, e.status, e.accepted
      into v_record
      from private.camera_ia_operational_outbox o
      join private.camera_ia_operational_event_claims e
        on e.device_id = o.device_id and e.event_id = o.event_id
      join private.camera_ia_operational_devices d
        on d.device_id = e.device_id and d.camera_id = e.camera_id
       and d.tenant_id = e.tenant_id and d.empresa_id = e.empresa_id
      join public.camera_ia_cameras c
        on c.camera_id = e.camera_id and c.tenant_id = e.tenant_id
       and c.empresa_id = e.empresa_id
      join public.tenants t on t.id = e.tenant_id
     where o.device_id = p_device_id and o.event_id = p_event_id
       and o.state = 'leased'
       and o.lease_owner = p_worker_id
       and o.lease_token = p_lease_token
       and o.lease_expires_at > clock_timestamp()
       and d.status = 'ativo'
       and c.habilitada is true
       and t.status = 'ativo'
       and e.accepted is false
       and e.status in ('NO_FACE','MULTIPLE_FACES')
     for update of o
     for share of d,c,t;

    if not found then
        return false;
    end if;

    -- O tempo de gravacao e retencao e deterministico dentro desta operacao.
    v_now := clock_timestamp();
    insert into private.camera_ia_operational_delivery_journal (
        device_id,event_id,camera_id,tenant_id,empresa_id,
        status,accepted,recorded_at,retain_until
    ) values (
        v_record.device_id,v_record.event_id,v_record.camera_id,
        v_record.tenant_id,v_record.empresa_id,
        v_record.status,false,v_now,v_now + interval '7 days'
    ) on conflict (device_id,event_id) do nothing;

    -- Se ja existe um registro, ele TEM de representar exatamente o mesmo evento.
    select * into v_journal
      from private.camera_ia_operational_delivery_journal j
     where j.device_id = p_device_id and j.event_id = p_event_id
     for update;

    if not found or v_journal.tenant_id is distinct from v_record.tenant_id
       or v_journal.empresa_id is distinct from v_record.empresa_id
       or v_journal.camera_id is distinct from v_record.camera_id
       or v_journal.status is distinct from v_record.status
       or v_journal.accepted is distinct from false then
        raise exception using errcode='42501',
            message='R10K-C3F-B2: journal idempotente com escopo divergente';
    end if;

    select private.camera_ia_ack_operational_outbox(
        p_worker_id,p_device_id,p_event_id,p_lease_token
    ) into v_ack;

    if v_ack is distinct from true then
        -- Excecao, NAO return false: garante rollback do INSERT do journal.
        raise exception using errcode='40001',
            message='R10K-C3F-B2: handoff sem ACK atomico';
    end if;

    return true;
end;
$handoff$;

-- Consulta backend de recuperacao: valida escopo e estado ATUAL da camera,
-- tenant e dispositivo. ACL do usuario SSE NAO substituida por esta funcao.
-- Sem cursor de sequencia: ORDER BY recorded_at nao e ordem de commit garantida.
create function private.camera_ia_read_operational_journal(
    p_tenant_id uuid,
    p_empresa_id uuid,
    p_camera_id text,
    p_limit integer
)
returns table (
    "deviceId" text,
    "eventId" uuid,
    "cameraId" text,
    "tenantId" uuid,
    "empresaId" uuid,
    status text,
    accepted boolean,
    "recordedAt" timestamptz
)
language sql
volatile
security definer
set search_path = pg_catalog
as $reader$
    select j.device_id, j.event_id, j.camera_id, j.tenant_id,
           j.empresa_id, j.status, j.accepted, j.recorded_at
      from private.camera_ia_operational_delivery_journal j
      join private.camera_ia_operational_devices d
        on d.device_id = j.device_id and d.camera_id = j.camera_id
       and d.tenant_id = j.tenant_id and d.empresa_id = j.empresa_id
      join public.camera_ia_cameras c
        on c.camera_id = j.camera_id and c.tenant_id = j.tenant_id
       and c.empresa_id = j.empresa_id
      join public.tenants t on t.id = j.tenant_id
     where p_tenant_id is not null and p_empresa_id is not null
       and p_camera_id is not null
       and p_limit between 1 and 100
       and j.tenant_id = p_tenant_id and j.empresa_id = p_empresa_id
       and j.camera_id = p_camera_id
       and j.retain_until > clock_timestamp()
       and d.status = 'ativo' and c.habilitada is true and t.status = 'ativo'
     order by j.recorded_at,j.device_id,j.event_id
     limit least(greatest(coalesce(p_limit,0),0),100)
$reader$;

-- Manutencao privada: somente journal vencido (nenhuma outra tabela).
create function private.camera_ia_prune_operational_journal(p_batch_size integer)
returns integer
language plpgsql
volatile
security definer
set search_path = pg_catalog
as $prune$
declare
    v_count integer := 0;
begin
    if p_batch_size is null or p_batch_size not between 1 and 1000 then
        return 0;
    end if;

    with picked as (
        select j.device_id,j.event_id
          from private.camera_ia_operational_delivery_journal j
         where j.retain_until <= clock_timestamp()
         order by j.retain_until,j.device_id,j.event_id
         limit p_batch_size
         for update of j skip locked
    )
    delete from private.camera_ia_operational_delivery_journal j using picked p
     where j.device_id = p.device_id and j.event_id = p.event_id;

    get diagnostics v_count = row_count;
    return v_count;
end;
$prune$;

revoke all on function private.camera_ia_handoff_operational_journal(uuid,text,uuid,uuid)
    from public,anon,authenticated,service_role,cam_ia_operational_ingest_executor,
         cam_ia_operational_outbox_maintainer,cam_ia_operational_journal_reader;
revoke all on function private.camera_ia_read_operational_journal(uuid,uuid,text,integer)
    from public,anon,authenticated,service_role,cam_ia_operational_ingest_executor,
         cam_ia_operational_outbox_dispatcher,cam_ia_operational_outbox_maintainer;
revoke all on function private.camera_ia_prune_operational_journal(integer)
    from public,anon,authenticated,service_role,cam_ia_operational_ingest_executor,
         cam_ia_operational_outbox_dispatcher,cam_ia_operational_journal_reader;

-- Revogacao CRITICA: a C3D concedia ACK direto ao dispatcher; agora o
-- unico ACK permitido ao papel e por meio do handoff transacional.
revoke execute on function private.camera_ia_ack_operational_outbox(uuid,text,uuid,uuid)
    from cam_ia_operational_outbox_dispatcher;

grant usage on schema private to cam_ia_operational_journal_reader;
grant execute on function private.camera_ia_handoff_operational_journal(uuid,text,uuid,uuid)
    to cam_ia_operational_outbox_dispatcher;
grant execute on function private.camera_ia_read_operational_journal(uuid,uuid,text,integer)
    to cam_ia_operational_journal_reader;
grant execute on function private.camera_ia_prune_operational_journal(integer)
    to cam_ia_operational_outbox_maintainer;

comment on table private.camera_ia_operational_delivery_journal is
    'R10K-C3F-B2: journal privado minimalista; handoff+ACK atomico; 7 dias de retencao; nao comprova navegador/SSE.';
comment on function private.camera_ia_handoff_operational_journal(uuid,text,uuid,uuid) is
    'Revoga ACK direto C3D para dispatcher; grava journal antes do ACK, mesma transacao PostgreSQL; exige lease valido e escopo ativo.';

commit;
