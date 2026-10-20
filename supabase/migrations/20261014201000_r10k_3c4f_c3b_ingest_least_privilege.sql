-- SafeScan Brasil | R10K-3C4F-C3B | SOMENTE PREPARACAO LOCAL
-- Depende de R10K-3C4C e R10K-3C4E.2; NAO aplicar sem autorizacao especifica.
-- Papel tecnico SEM LOGIN, SEM SENHA, SEM membership atribuida.
-- A consulta retorna SOMENTE dispositivos ativos de cameras/tenants ativos.
-- A consulta NAO retorna segredo HMAC; keyId e identificador opaco.
-- Nenhum JWT, camera RTSP, dado facial ou autorizacao de acesso fisico.
-- A funcao de claim permanece exclusivamente apos verificacao HMAC no backend.
-- ATENCAO: revoga privilegios anteriores da service_role apenas nos dois
-- objetos operacionais privados e na funcao de claim. Provisionamento de
-- dispositivos exigira papel/fluxo administrativo separado e autorizado.

begin;

do $r10k_preflight$
begin
    if to_regnamespace('private') is null
       or to_regclass('public.tenants') is null
       or to_regclass('public.camera_ia_cameras') is null
       or to_regclass('private.camera_ia_operational_devices') is null
       or to_regclass('private.camera_ia_operational_event_claims') is null
       or to_regprocedure('private.camera_ia_claim_operational_event(text,text,uuid,uuid,uuid,uuid,uuid,text,bigint)') is null then
        raise exception 'R10K-3C4F-C3B: migrations 3C4C/3C4E.2 ausentes';
    end if;

    if to_regrole('service_role') is null
       or to_regrole('anon') is null
       or to_regrole('authenticated') is null then
        raise exception 'R10K-3C4F-C3B: roles Supabase ausentes';
    end if;

    if to_regrole('cam_ia_operational_ingest_executor') is not null
       or to_regprocedure('private.camera_ia_get_active_operational_device(text)') is not null then
        raise exception 'R10K-3C4F-C3B: objetos ja existentes';
    end if;

    if not has_function_privilege(
        'service_role',
        'private.camera_ia_claim_operational_event(text,text,uuid,uuid,uuid,uuid,uuid,text,bigint)',
        'EXECUTE'
    ) or not has_table_privilege(
        'service_role', 'private.camera_ia_operational_devices', 'SELECT'
    ) then
        raise exception 'R10K-3C4F-C3B: grants base divergentes da migration 3C4E.2';
    end if;
end;
$r10k_preflight$;

-- 1. Identidade de permissao, sem credencial e sem capacidade de login.
-- A futura vinculacao a uma identidade de conexao e OUTRA microetapa.
create role cam_ia_operational_ingest_executor
    nologin noinherit nosuperuser nocreatedb nocreaterole
    noreplication nobypassrls;

-- 2. Consulta protegida: nenhuma leitura direta de tabela pelo papel tecnico.
-- Os nomes de saida refletem o contrato getDeviceRegistryRecord({deviceId}).
create function private.camera_ia_get_active_operational_device(
    p_device_id text
)
returns table (
    "deviceId" text,
    "cameraId" text,
    "tenantId" uuid,
    "empresaId" uuid,
    "keyId" uuid,
    status text,
    "cameraEnabled" boolean,
    "tenantActive" boolean
)
language sql
stable
security definer
set search_path = pg_catalog
as $lookup$
    select
        d.device_id,
        d.camera_id,
        d.tenant_id,
        d.empresa_id,
        d.key_id,
        d.status,
        c.habilitada,
        (t.status = 'ativo')
    from private.camera_ia_operational_devices d
    join public.camera_ia_cameras c
      on c.camera_id = d.camera_id
     and c.tenant_id = d.tenant_id
     and c.empresa_id = d.empresa_id
    join public.tenants t
      on t.id = d.tenant_id
    where p_device_id is not null
      and p_device_id ~ '^[A-Za-z0-9_.:-]{1,160}$'
      and d.device_id = p_device_id
      and d.status = 'ativo'
      and d.key_id is not null
      and c.habilitada is true
      and t.status = 'ativo'
    limit 1;
$lookup$;

-- 3. Nao permitir entrada por PUBLIC, usuario, cliente ou service_role.
-- As concessoes anteriores da service_role sao REMOVIDAS para os objetos
-- da ingestao somente; nada e revogado em tabelas de outros modulos.
revoke all on table
    private.camera_ia_operational_devices,
    private.camera_ia_operational_event_claims
from service_role, anon, authenticated, public;

revoke all on function private.camera_ia_claim_operational_event(
    text, text, uuid, uuid, uuid, uuid, uuid, text, bigint
) from service_role, anon, authenticated, public;

revoke all on function private.camera_ia_get_active_operational_device(text)
from service_role, anon, authenticated, public;

-- Somente as duas operacoes de backend estritamente necessarias.
-- SEM SELECT/INSERT/UPDATE/DELETE nos objetos privados.
grant usage on schema private to cam_ia_operational_ingest_executor;

grant execute on function private.camera_ia_get_active_operational_device(text)
to cam_ia_operational_ingest_executor;

grant execute on function private.camera_ia_claim_operational_event(
    text, text, uuid, uuid, uuid, uuid, uuid, text, bigint
) to cam_ia_operational_ingest_executor;

comment on function private.camera_ia_get_active_operational_device(text) is
    'R10K-3C4F-C3B: retorna somente metadados de dispositivo/camera/tenant ativos e keyId; NUNCA segredo HMAC.';

comment on role cam_ia_operational_ingest_executor is
    'R10K-3C4F-C3B: papel NOLOGIN sem credencial; exclusivamente EXECUTE na consulta e claim privados. Nenhuma membership atribuida.';

commit;
