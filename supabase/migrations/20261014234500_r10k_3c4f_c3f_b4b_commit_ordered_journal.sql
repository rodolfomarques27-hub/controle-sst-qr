-- SafeScan Brasil | R10K-3C4F-C3F-B4-B | NOVA MIGRATION LOCAL, NAO APLICADA
-- Pre-requisitos: C3C4C, C3C4E2, C3B, C3D, C3F-B2 (todos imutaveis).
-- Sequencia de stream POR (tenant,empresa,camera), via lock de linha transacional.
-- Atribuir sequence e confirmar handoff/ACK na MESMA transacao; ordem de commit
-- por stream serializada por lock retido ate COMMIT/ROLLBACK.
-- B2 historico permanece SEM stream_sequence: nao inferir ordem de commit do timestamp.
-- Retencao B2 de 7 dias continua; cursor expirado => ERRO, nunca skip silencioso.
-- NO_FACE/MULTIPLE_FACES; accepted=false; sem dados biometricos, segredos, cameras,
-- endpoints, senhas, acesso fisico ou identificacao. Sem backfill nem rede.

begin;

do $preflight$
begin
 if to_regnamespace('private') is null
    or to_regclass('private.camera_ia_operational_delivery_journal') is null
    or to_regclass('private.camera_ia_operational_outbox') is null
    or to_regclass('private.camera_ia_operational_event_claims') is null
    or to_regclass('private.camera_ia_operational_devices') is null
    or to_regclass('public.camera_ia_cameras') is null
    or to_regclass('public.tenants') is null
    or to_regrole('cam_ia_operational_outbox_dispatcher') is null
    or to_regrole('cam_ia_operational_journal_reader') is null
    or to_regrole('cam_ia_operational_outbox_maintainer') is null
    or to_regrole('cam_ia_operational_ingest_executor') is null
    or to_regrole('anon') is null or to_regrole('authenticated') is null
    or to_regrole('service_role') is null
    or to_regprocedure('private.camera_ia_handoff_operational_journal(uuid,text,uuid,uuid)') is null
    or to_regprocedure('private.camera_ia_read_operational_journal(uuid,uuid,text,integer)') is null then
    raise exception 'B4B_PRECONDITION_MISSING';
 end if;
 if to_regclass('private.camera_ia_operational_stream_heads') is not null
    or exists(select 1 from pg_catalog.pg_attribute
       where attrelid='private.camera_ia_operational_delivery_journal'::regclass
         and attname='stream_sequence' and not attisdropped)
    or to_regprocedure('private.camera_ia_handoff_operational_journal_v2(uuid,text,uuid,uuid)') is not null
    or to_regprocedure('private.camera_ia_read_operational_journal_page_v2(uuid,uuid,text,bigint,integer,boolean)') is not null
    or to_regprocedure('private.camera_ia_inspect_operational_journal_cursor_v2(uuid,uuid,text,bigint)') is not null then
    raise exception 'B4B_PREEXISTING_OBJECT_SAFE_STOP';
 end if;
 if not has_function_privilege('cam_ia_operational_outbox_dispatcher',
     'private.camera_ia_handoff_operational_journal(uuid,text,uuid,uuid)','EXECUTE')
    or not has_function_privilege('cam_ia_operational_journal_reader',
     'private.camera_ia_read_operational_journal(uuid,uuid,text,integer)','EXECUTE') then
    raise exception 'B4B_PREEXISTING_GRANTS_DIFFER';
 end if;
end;
$preflight$;

create table private.camera_ia_operational_stream_heads (
 tenant_id uuid not null,
 empresa_id uuid not null,
 camera_id text not null,
 last_sequence bigint not null default 0,
 constraint cam_ia_stream_head_pk primary key(tenant_id,empresa_id,camera_id),
 constraint cam_ia_stream_head_nonnegative check(last_sequence >= 0 and last_sequence < 9223372036854775807),
 constraint cam_ia_stream_head_camera_format check(camera_id ~ '^[A-Za-z0-9_.:-]{1,160}$')
);
alter table private.camera_ia_operational_stream_heads enable row level security;
revoke all on private.camera_ia_operational_stream_heads from public,anon,authenticated,service_role,
 cam_ia_operational_ingest_executor,cam_ia_operational_outbox_dispatcher,
 cam_ia_operational_outbox_maintainer,cam_ia_operational_journal_reader;

-- NULL = evento LEGADO B2, sem ordem de commit verificavel (preservado inalterado).
alter table private.camera_ia_operational_delivery_journal add column stream_sequence bigint;
alter table private.camera_ia_operational_delivery_journal
 add constraint cam_ia_delivery_journal_stream_positive
 check (stream_sequence is null or stream_sequence > 0);
create unique index cam_ia_delivery_journal_stream_seq_uniq
 on private.camera_ia_operational_delivery_journal(tenant_id,empresa_id,camera_id,stream_sequence)
 where stream_sequence is not null;
create index cam_ia_delivery_journal_stream_page_idx
 on private.camera_ia_operational_delivery_journal(tenant_id,empresa_id,camera_id,stream_sequence)
 where stream_sequence is not null;

-- Nova funcao de handoff, nao substitui fisicamente a B2. O caller so pode
-- chamar a versao V2. O owner SECURITY DEFINER pode invocar a B2 revogada.
create function private.camera_ia_handoff_operational_journal_v2(
 p_worker_id uuid, p_device_id text, p_event_id uuid, p_lease_token uuid
) returns boolean
language plpgsql volatile security definer set search_path=pg_catalog
as $v2$
declare
 v_scope record;
 v_last bigint;
 v_new bigint;
 v_ok boolean;
 v_updated integer;
begin
 if p_worker_id is null or p_device_id is null or p_event_id is null
    or p_lease_token is null or p_device_id !~ '^[A-Za-z0-9_.:-]{1,160}$' then
    return false;
 end if;

 -- Leitura preparatoria sem lock: a funcao B2 revalida lease/escopo sob lock.
 select e.tenant_id,e.empresa_id,e.camera_id
 into v_scope
 from private.camera_ia_operational_outbox o
 join private.camera_ia_operational_event_claims e
   on e.device_id=o.device_id and e.event_id=o.event_id
 where o.device_id=p_device_id and o.event_id=p_event_id
   and o.state='leased' and o.lease_owner=p_worker_id
   and o.lease_token=p_lease_token and o.lease_expires_at>clock_timestamp()
   and e.accepted is false and e.status in ('NO_FACE','MULTIPLE_FACES');
 if not found then return false; end if;

 -- Insercao UNIQUE concorrente e SELECT FOR UPDATE implementam mutex por camera.
 -- A transacao concorrente nao pode atribuir a sequencia seguinte antes
 -- do COMMIT ou ROLLBACK da primeira transacao na mesma camera.
 insert into private.camera_ia_operational_stream_heads(tenant_id,empresa_id,camera_id)
 values(v_scope.tenant_id,v_scope.empresa_id,v_scope.camera_id)
 on conflict(tenant_id,empresa_id,camera_id) do nothing;
 select h.last_sequence into v_last
 from private.camera_ia_operational_stream_heads h
 where h.tenant_id=v_scope.tenant_id and h.empresa_id=v_scope.empresa_id
   and h.camera_id=v_scope.camera_id
 for update;
 if not found or v_last >= 9223372036854775806 then
   raise exception 'B4B_STREAM_SEQUENCE_OVERFLOW';
 end if;

 select private.camera_ia_handoff_operational_journal(
    p_worker_id,p_device_id,p_event_id,p_lease_token) into v_ok;
 if v_ok is distinct from true then
   return false;
 end if;

 update private.camera_ia_operational_stream_heads h
 set last_sequence=v_last+1
 where h.tenant_id=v_scope.tenant_id and h.empresa_id=v_scope.empresa_id
   and h.camera_id=v_scope.camera_id
 returning h.last_sequence into v_new;

 update private.camera_ia_operational_delivery_journal j
 set stream_sequence=v_new
 where j.device_id=p_device_id and j.event_id=p_event_id
   and j.tenant_id=v_scope.tenant_id and j.empresa_id=v_scope.empresa_id
   and j.camera_id=v_scope.camera_id and j.stream_sequence is null;
 get diagnostics v_updated=row_count;
 if v_updated <> 1 then
   -- NUNCA retornar false: excecao propaga e desfaz ACK/insert B2.
   raise exception 'B4B_JOURNAL_SEQUENCE_NOT_ASSIGNED';
 end if;
 return true;
end;
$v2$;

-- Inspecao explicita do marco legado e da retencao. Destinada somente a backend
-- que JA autenticou e autorizou o usuario SSE por RPC/ACL (nao substitui ACL).
create function private.camera_ia_inspect_operational_journal_cursor_v2(
 p_tenant_id uuid, p_empresa_id uuid, p_camera_id text, p_after_sequence bigint
) returns table (
 "lastSequence" bigint,
 "earliestAvailableSequence" bigint,
 "legacyUnorderedCount" bigint,
 "resyncRequired" boolean
)
language plpgsql volatile security definer set search_path=pg_catalog
as $inspect$
declare
 v_head bigint;
 v_earliest bigint;
 v_legacy bigint;
begin
 if p_tenant_id is null or p_empresa_id is null or p_camera_id is null
    or p_camera_id !~ '^[A-Za-z0-9_.:-]{1,160}$'
    or p_after_sequence is null or p_after_sequence < 0 then
    return;
 end if;
 if not exists(select 1 from public.camera_ia_cameras c
    join public.tenants t on t.id=c.tenant_id
    where c.camera_id=p_camera_id and c.tenant_id=p_tenant_id
     and c.empresa_id=p_empresa_id and c.habilitada is true and t.status='ativo') then
    return;
 end if;
 select h.last_sequence into v_head
 from private.camera_ia_operational_stream_heads h
 where h.tenant_id=p_tenant_id and h.empresa_id=p_empresa_id and h.camera_id=p_camera_id;
 v_head:=coalesce(v_head,0);
 select min(j.stream_sequence),count(*) filter(where j.stream_sequence is null)
 into v_earliest,v_legacy
 from private.camera_ia_operational_delivery_journal j
 where j.tenant_id=p_tenant_id and j.empresa_id=p_empresa_id
  and j.camera_id=p_camera_id and j.retain_until>clock_timestamp()
  and (j.stream_sequence is null or exists(
   select 1 from private.camera_ia_operational_devices d
   where d.device_id=j.device_id and d.camera_id=j.camera_id
     and d.tenant_id=j.tenant_id and d.empresa_id=j.empresa_id and d.status='ativo'
  ));
 return query select v_head,v_earliest,coalesce(v_legacy,0),
     (p_after_sequence>v_head or
       (p_after_sequence<v_head and not exists (
          select 1 from private.camera_ia_operational_delivery_journal j
          join private.camera_ia_operational_devices d
            on d.device_id=j.device_id and d.tenant_id=j.tenant_id
           and d.empresa_id=j.empresa_id and d.camera_id=j.camera_id
         where j.tenant_id=p_tenant_id and j.empresa_id=p_empresa_id
           and j.camera_id=p_camera_id and j.stream_sequence=p_after_sequence+1
           and j.retain_until>clock_timestamp() and d.status='ativo'
       )));
end;
$inspect$;

-- Leitura paginada pelo cursor confirmado. Nao devolve silenciosamente pagina
-- vazia em lacuna: exige ressincronizacao. B2 legados requerem opt-in explicito
-- para INICIAR NOVO stream sem afirmar ter feito replay dos eventos antigos.
create function private.camera_ia_read_operational_journal_page_v2(
 p_tenant_id uuid, p_empresa_id uuid, p_camera_id text,
 p_after_sequence bigint, p_limit integer, p_acknowledge_legacy boolean
) returns table (
 "deviceId" text,
 "eventId" uuid,
 "cameraId" text,
 "tenantId" uuid,
 "empresaId" uuid,
 status text,
 accepted boolean,
 "streamSequence" bigint,
 "recordedAt" timestamptz
)
language plpgsql volatile security definer set search_path=pg_catalog
as $page$
declare
 v_head bigint;
 v_legacy bigint;
 v_active boolean;
 v_end bigint;
 v_observed bigint;
 v_returned bigint;
 v_now timestamptz := clock_timestamp();
begin
 if p_tenant_id is null or p_empresa_id is null or p_camera_id is null
    or p_camera_id !~ '^[A-Za-z0-9_.:-]{1,160}$'
    or p_after_sequence is null or p_after_sequence<0
    or p_limit is null or p_limit not between 1 and 100
    or p_acknowledge_legacy is null then
    return;
 end if;

 select true into v_active from public.camera_ia_cameras c
 join public.tenants t on t.id=c.tenant_id
 where c.tenant_id=p_tenant_id and c.empresa_id=p_empresa_id
   and c.camera_id=p_camera_id and c.habilitada is true and t.status='ativo'
 for share of c,t;
 if not found then return; end if;

 -- FOR SHARE espera o commit de handoff V2 em andamento na mesma camera.
 select h.last_sequence into v_head
 from private.camera_ia_operational_stream_heads h
 where h.tenant_id=p_tenant_id and h.empresa_id=p_empresa_id and h.camera_id=p_camera_id
 for share;
 v_head:=coalesce(v_head,0);
 if p_after_sequence>v_head then
   raise exception 'B4B_CURSOR_AHEAD_RESYNC_REQUIRED';
 end if;

 select count(*) into v_legacy
 from private.camera_ia_operational_delivery_journal j
 where j.tenant_id=p_tenant_id and j.empresa_id=p_empresa_id
   and j.camera_id=p_camera_id and j.stream_sequence is null
   and j.retain_until>v_now;
 if v_legacy>0 and p_acknowledge_legacy is not true then
    raise exception 'B4B_LEGACY_UNORDERED_EXPLICIT_CUTOVER_REQUIRED';
 end if;

 -- Verificar TODO o intervalo da pagina, nao so o primeiro registro.
 -- Assim um consumidor nao consegue saltar uma lacuna interna ao lote.
 if p_after_sequence < v_head then
   v_end:=p_after_sequence + least(p_limit::bigint,v_head-p_after_sequence);
   select count(*) into v_observed
   from private.camera_ia_operational_delivery_journal j
   join private.camera_ia_operational_devices d
     on d.device_id=j.device_id and d.camera_id=j.camera_id
    and d.tenant_id=j.tenant_id and d.empresa_id=j.empresa_id
   where j.tenant_id=p_tenant_id and j.empresa_id=p_empresa_id
    and j.camera_id=p_camera_id
    and j.stream_sequence>p_after_sequence and j.stream_sequence<=v_end
    and j.retain_until>v_now and d.status='ativo';
   if v_observed <> v_end-p_after_sequence then
      raise exception 'B4B_CURSOR_GAP_RESYNC_REQUIRED';
   end if;
 end if;

 return query
 select j.device_id,j.event_id,j.camera_id,j.tenant_id,j.empresa_id,
        j.status,j.accepted,j.stream_sequence,j.recorded_at
 from private.camera_ia_operational_delivery_journal j
 join private.camera_ia_operational_devices d
   on d.device_id=j.device_id and d.camera_id=j.camera_id
  and d.tenant_id=j.tenant_id and d.empresa_id=j.empresa_id
 where j.tenant_id=p_tenant_id and j.empresa_id=p_empresa_id
   and j.camera_id=p_camera_id and j.stream_sequence>p_after_sequence
   and j.stream_sequence<=v_head and j.retain_until>v_now
   and d.status='ativo'
 order by j.stream_sequence
 limit p_limit;
 get diagnostics v_returned = row_count;
 if p_after_sequence<v_head and v_returned <> v_end-p_after_sequence then
   raise exception 'B4B_CURSOR_CHANGED_DURING_READ_RESYNC_REQUIRED';
 end if;
end;
$page$;

-- Revogar os atalhos B2: nova rota sequenciada e a UNICA disponivel
-- para os papeis NOLOGIN; owner/admin do banco continuam privilegiados.
revoke execute on function private.camera_ia_handoff_operational_journal(uuid,text,uuid,uuid)
 from cam_ia_operational_outbox_dispatcher;
revoke execute on function private.camera_ia_read_operational_journal(uuid,uuid,text,integer)
 from cam_ia_operational_journal_reader;

revoke all on function private.camera_ia_handoff_operational_journal_v2(uuid,text,uuid,uuid)
 from public,anon,authenticated,service_role,cam_ia_operational_ingest_executor,
 cam_ia_operational_outbox_maintainer,cam_ia_operational_journal_reader;
revoke all on function private.camera_ia_inspect_operational_journal_cursor_v2(uuid,uuid,text,bigint)
 from public,anon,authenticated,service_role,cam_ia_operational_ingest_executor,
 cam_ia_operational_outbox_dispatcher,cam_ia_operational_outbox_maintainer;
revoke all on function private.camera_ia_read_operational_journal_page_v2(uuid,uuid,text,bigint,integer,boolean)
 from public,anon,authenticated,service_role,cam_ia_operational_ingest_executor,
 cam_ia_operational_outbox_dispatcher,cam_ia_operational_outbox_maintainer;

grant execute on function private.camera_ia_handoff_operational_journal_v2(uuid,text,uuid,uuid)
 to cam_ia_operational_outbox_dispatcher;
grant execute on function private.camera_ia_inspect_operational_journal_cursor_v2(uuid,uuid,text,bigint)
 to cam_ia_operational_journal_reader;
grant execute on function private.camera_ia_read_operational_journal_page_v2(uuid,uuid,text,bigint,integer,boolean)
 to cam_ia_operational_journal_reader;

comment on table private.camera_ia_operational_stream_heads is
 'B4B: mutex PostgreSQL por tenant,empresa,camera; seq cresce somente com handoff confirmado na mesma transacao.';
comment on column private.camera_ia_operational_delivery_journal.stream_sequence is
 'B4B: NULL em legados B2; nunca fingir que timestamp ou sequence reflete commits historicos.';
comment on function private.camera_ia_read_operational_journal_page_v2(uuid,uuid,text,bigint,integer,boolean) is
 'Backend privado; caller SSE deve revalidar RPC/ACL em cada entrega. Cursor com gap/legado exige ressincronizacao explicita.';

commit;
