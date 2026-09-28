
begin;

do $preflight$
begin
  if to_regclass('public.modulos_sistema') is null
     or to_regclass('public.tenant_modulos') is null
     or to_regclass('public.empresa_modulos') is null
     or to_regclass('public.tenants') is null
     or to_regclass('public.empresas') is null then
    raise exception
      'M12.7.5-B2 preflight: fundacao B1 incompleta.';
  end if;

  if to_regprocedure('public.usuario_admin_global()') is null
     or to_regprocedure('public.usuario_tem_acesso_tenant(uuid)') is null
     or to_regprocedure('public.usuario_tem_acesso_empresa(uuid)') is null
     or to_regprocedure('public.usuario_pode_gerenciar_tenant(uuid)') is null then
    raise exception
      'M12.7.5-B2 preflight: gates canonicos de acesso ausentes.';
  end if;

  if to_regprocedure('public.tenant_tem_modulo(uuid,text)') is not null
     or to_regprocedure('public.empresa_tem_modulo(uuid,text)') is not null
     or to_regprocedure('public.usuario_tem_modulo_disponivel(uuid,text)') is not null
     or to_regprocedure('public.admin_listar_modulos_tenant(uuid)') is not null
     or to_regprocedure('public.admin_salvar_modulo_tenant(uuid,text,text,text,jsonb)') is not null
     or to_regprocedure('public.admin_listar_modulos_empresa(uuid)') is not null
     or to_regprocedure('public.admin_salvar_modulo_empresa(uuid,text,text,text,jsonb)') is not null then
    raise exception
      'M12.7.5-B2 preflight: um ou mais objetos B2 ja existem.';
  end if;
end
$preflight$;

-- ============================================================
-- 1. HELPER: ENTITLEMENT DO TENANT
-- ============================================================

create function public.tenant_tem_modulo(
  p_tenant_id uuid,
  p_modulo_chave text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select coalesce(
    exists (
      select 1
      from public.tenants t
      join public.modulos_sistema m
        on m.chave = lower(btrim(coalesce(p_modulo_chave, '')))
      where t.id = p_tenant_id
        and t.status = 'ativo'
        and m.ativo = true
        and (
          m.obrigatorio = true
          or exists (
            select 1
            from public.tenant_modulos tm
            where tm.tenant_id = t.id
              and tm.modulo_chave = m.chave
              and tm.status = 'ativo'
          )
        )
    ),
    false
  );
$function$;

comment on function public.tenant_tem_modulo(uuid, text) is
  'Retorna se o modulo esta operacionalmente disponivel para um tenant ativo. Modulo core obrigatorio independe de tenant_modulos; modulo opcional exige entitlement ativo.';

revoke all
on function public.tenant_tem_modulo(uuid, text)
from public, anon;

grant execute
on function public.tenant_tem_modulo(uuid, text)
to authenticated, service_role;

-- ============================================================
-- 2. HELPER: ENTITLEMENT EFETIVO DA EMPRESA
-- ============================================================

create function public.empresa_tem_modulo(
  p_empresa_id uuid,
  p_modulo_chave text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select coalesce(
    exists (
      select 1
      from public.empresas e
      join public.modulos_sistema m
        on m.chave = lower(btrim(coalesce(p_modulo_chave, '')))
      where e.id = p_empresa_id
        and m.ativo = true
        and public.tenant_tem_modulo(
          e.tenant_id,
          m.chave
        )
        and not exists (
          select 1
          from public.empresa_modulos em
          where em.empresa_id = e.id
            and em.modulo_chave = m.chave
            and em.modo = 'desabilitado'
        )
    ),
    false
  );
$function$;

comment on function public.empresa_tem_modulo(uuid, text) is
  'Calcula modulo efetivo da empresa: tenant deve possuir o modulo e a empresa nao pode ter override desabilitado. Ausencia de override equivale a herdar.';

revoke all
on function public.empresa_tem_modulo(uuid, text)
from public, anon;

grant execute
on function public.empresa_tem_modulo(uuid, text)
to authenticated, service_role;

-- ============================================================
-- 3. HELPER: USUARIO + ESCOPO DE EMPRESA + ENTITLEMENT
-- ============================================================

create function public.usuario_tem_modulo_disponivel(
  p_empresa_id uuid,
  p_modulo_chave text
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
  select coalesce(
    auth.uid() is not null
    and public.usuario_tem_acesso_empresa(
      p_empresa_id
    )
    and public.empresa_tem_modulo(
      p_empresa_id,
      p_modulo_chave
    ),
    false
  );
$function$;

comment on function public.usuario_tem_modulo_disponivel(uuid, text) is
  'Combina escopo de acesso do usuario a empresa com entitlement efetivo do modulo. Nao substitui permissao de acao/perfil; essa continua separada em usuario_tem_permissao_sistema.';

revoke all
on function public.usuario_tem_modulo_disponivel(uuid, text)
from public, anon;

grant execute
on function public.usuario_tem_modulo_disponivel(uuid, text)
to authenticated, service_role;

-- ============================================================
-- 4. LISTAGEM ADMINISTRATIVA DOS MODULOS DO TENANT
-- ============================================================

create function public.admin_listar_modulos_tenant(
  p_tenant_id uuid
)
returns table(
  modulo_chave text,
  modulo_nome text,
  modulo_descricao text,
  categoria text,
  contratavel boolean,
  obrigatorio boolean,
  modulo_ativo boolean,
  entitlement_status text,
  contratado boolean,
  disponivel boolean,
  origem text,
  observacao text,
  configuracao jsonb,
  empresas_total bigint,
  empresas_desabilitadas bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
  if auth.uid() is null
     or not public.usuario_pode_gerenciar_tenant(
       p_tenant_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'Listagem de modulos restrita ao administrador global ou administrador ativo do tenant.';
  end if;

  if not exists (
    select 1
    from public.tenants t
    where t.id = p_tenant_id
  ) then
    raise exception
      'Tenant nao localizado para listar modulos.';
  end if;

  return query
  select
    m.chave as modulo_chave,
    m.nome as modulo_nome,
    m.descricao as modulo_descricao,
    m.categoria,
    m.contratavel,
    m.obrigatorio,
    m.ativo as modulo_ativo,

    case
      when m.obrigatorio = true then 'core'
      when tm.tenant_id is null then 'nao_contratado'
      else tm.status
    end as entitlement_status,

    (
      m.obrigatorio = true
      or tm.tenant_id is not null
    ) as contratado,

    public.tenant_tem_modulo(
      p_tenant_id,
      m.chave
    ) as disponivel,

    case
      when m.obrigatorio = true then 'core'
      else tm.origem
    end as origem,

    coalesce(
      tm.observacao,
      ''
    ) as observacao,

    coalesce(
      tm.configuracao,
      '{}'::jsonb
    ) as configuracao,

    (
      select count(*)::bigint
      from public.empresas e
      where e.tenant_id = p_tenant_id
    ) as empresas_total,

    (
      select count(*)::bigint
      from public.empresa_modulos em
      join public.empresas e
        on e.id = em.empresa_id
      where e.tenant_id = p_tenant_id
        and em.modulo_chave = m.chave
        and em.modo = 'desabilitado'
    ) as empresas_desabilitadas

  from public.modulos_sistema m
  left join public.tenant_modulos tm
    on tm.tenant_id = p_tenant_id
   and tm.modulo_chave = m.chave
  order by
    m.ordem,
    lower(m.nome),
    m.chave;
end;
$function$;

comment on function public.admin_listar_modulos_tenant(uuid) is
  'Lista catalogo e estado de entitlement do tenant. Administrador do tenant pode consultar; alteracao de contrato continua global-only.';

revoke all
on function public.admin_listar_modulos_tenant(uuid)
from public, anon, service_role;

grant execute
on function public.admin_listar_modulos_tenant(uuid)
to authenticated;

-- ============================================================
-- 5. SALVAR ENTITLEMENT DO TENANT — GLOBAL ONLY
-- ============================================================

create function public.admin_salvar_modulo_tenant(
  p_tenant_id uuid,
  p_modulo_chave text,
  p_status text,
  p_observacao text default '',
  p_configuracao jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_modulo_chave text :=
    lower(
      btrim(
        coalesce(
          p_modulo_chave,
          ''
        )
      )
    );

  v_status text :=
    lower(
      btrim(
        coalesce(
          p_status,
          ''
        )
      )
    );

  v_observacao text :=
    btrim(
      coalesce(
        p_observacao,
        ''
      )
    );

  v_contratavel boolean;
  v_obrigatorio boolean;
  v_modulo_ativo boolean;
  v_configuracao jsonb :=
    coalesce(
      p_configuracao,
      '{}'::jsonb
    );

  v_overrides_removidos bigint := 0;
begin
  if auth.uid() is null
     or not public.usuario_admin_global() then
    raise exception using
      errcode = '42501',
      message = 'Alteracao de contrato de modulos restrita ao administrador global SafeScan.';
  end if;

  if p_tenant_id is null
     or not exists (
       select 1
       from public.tenants t
       where t.id = p_tenant_id
     ) then
    raise exception
      'Tenant nao localizado para salvar modulo.';
  end if;

  if v_modulo_chave = '' then
    raise exception
      'Modulo obrigatorio para salvar entitlement.';
  end if;

  select
    m.contratavel,
    m.obrigatorio,
    m.ativo
  into
    v_contratavel,
    v_obrigatorio,
    v_modulo_ativo
  from public.modulos_sistema m
  where m.chave = v_modulo_chave;

  if not found then
    raise exception
      'Modulo % nao localizado no catalogo SafeScan.',
      v_modulo_chave;
  end if;

  if v_modulo_ativo is not true then
    raise exception
      'Modulo % esta inativo no catalogo.',
      v_modulo_chave;
  end if;

  if v_obrigatorio is true
     or v_contratavel is not true then
    raise exception
      'Modulo % e core/nao contratavel e nao pode ser alterado por entitlement.',
      v_modulo_chave;
  end if;

  if v_status not in (
    'ativo',
    'suspenso',
    'nao_contratado'
  ) then
    raise exception
      'Status invalido. Use ativo, suspenso ou nao_contratado.';
  end if;

  if jsonb_typeof(v_configuracao) <> 'object' then
    raise exception
      'Configuracao do modulo deve ser objeto JSON.';
  end if;

  if v_status = 'nao_contratado' then
    delete from public.empresa_modulos em
    using public.empresas e
    where em.empresa_id = e.id
      and e.tenant_id = p_tenant_id
      and em.modulo_chave = v_modulo_chave;

    get diagnostics
      v_overrides_removidos = row_count;

    delete from public.tenant_modulos tm
    where tm.tenant_id = p_tenant_id
      and tm.modulo_chave = v_modulo_chave;

    return jsonb_build_object(
      'ok', true,
      'tenantId', p_tenant_id,
      'moduloChave', v_modulo_chave,
      'status', 'nao_contratado',
      'contratado', false,
      'disponivel', false,
      'overridesEmpresaRemovidos', v_overrides_removidos
    );
  end if;

  insert into public.tenant_modulos (
    tenant_id,
    modulo_chave,
    status,
    origem,
    observacao,
    configuracao,
    created_by,
    updated_by
  )
  values (
    p_tenant_id,
    v_modulo_chave,
    v_status,
    'manual',
    v_observacao,
    v_configuracao,
    auth.uid(),
    auth.uid()
  )
  on conflict (
    tenant_id,
    modulo_chave
  )
  do update set
    status = excluded.status,
    origem = 'manual',
    observacao = excluded.observacao,
    configuracao = excluded.configuracao,
    updated_at = now(),
    updated_by = auth.uid();

  return jsonb_build_object(
    'ok', true,
    'tenantId', p_tenant_id,
    'moduloChave', v_modulo_chave,
    'status', v_status,
    'contratado', true,
    'disponivel',
      public.tenant_tem_modulo(
        p_tenant_id,
        v_modulo_chave
      ),
    'overridesEmpresaRemovidos', 0
  );
end;
$function$;

comment on function public.admin_salvar_modulo_tenant(uuid, text, text, text, jsonb) is
  'Gerencia entitlement comercial do tenant. Somente administrador global. nao_contratado remove o entitlement e overrides de empresas para evitar configuracao residual.';

revoke all
on function public.admin_salvar_modulo_tenant(uuid, text, text, text, jsonb)
from public, anon, service_role;

grant execute
on function public.admin_salvar_modulo_tenant(uuid, text, text, text, jsonb)
to authenticated;

-- ============================================================
-- 6. LISTAGEM ADMINISTRATIVA DOS MODULOS DA EMPRESA
-- ============================================================

create function public.admin_listar_modulos_empresa(
  p_empresa_id uuid
)
returns table(
  modulo_chave text,
  modulo_nome text,
  modulo_descricao text,
  categoria text,
  contratavel boolean,
  obrigatorio boolean,
  modulo_ativo boolean,
  tenant_status text,
  tenant_contratado boolean,
  tenant_disponivel boolean,
  empresa_modo text,
  empresa_disponivel boolean,
  motivo text,
  configuracao jsonb
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_tenant_id uuid;
begin
  select e.tenant_id
  into v_tenant_id
  from public.empresas e
  where e.id = p_empresa_id;

  if not found then
    raise exception
      'Empresa nao localizada para listar modulos.';
  end if;

  if auth.uid() is null
     or not public.usuario_pode_gerenciar_tenant(
       v_tenant_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'Listagem de modulos da empresa restrita ao administrador global ou administrador ativo do tenant.';
  end if;

  return query
  select
    m.chave as modulo_chave,
    m.nome as modulo_nome,
    m.descricao as modulo_descricao,
    m.categoria,
    m.contratavel,
    m.obrigatorio,
    m.ativo as modulo_ativo,

    case
      when m.obrigatorio = true then 'core'
      when tm.tenant_id is null then 'nao_contratado'
      else tm.status
    end as tenant_status,

    (
      m.obrigatorio = true
      or tm.tenant_id is not null
    ) as tenant_contratado,

    public.tenant_tem_modulo(
      v_tenant_id,
      m.chave
    ) as tenant_disponivel,

    coalesce(
      em.modo,
      'herdar'
    ) as empresa_modo,

    public.empresa_tem_modulo(
      p_empresa_id,
      m.chave
    ) as empresa_disponivel,

    coalesce(
      em.motivo,
      ''
    ) as motivo,

    coalesce(
      em.configuracao,
      '{}'::jsonb
    ) as configuracao

  from public.modulos_sistema m
  left join public.tenant_modulos tm
    on tm.tenant_id = v_tenant_id
   and tm.modulo_chave = m.chave
  left join public.empresa_modulos em
    on em.empresa_id = p_empresa_id
   and em.modulo_chave = m.chave
  order by
    m.ordem,
    lower(m.nome),
    m.chave;
end;
$function$;

comment on function public.admin_listar_modulos_empresa(uuid) is
  'Lista catalogo, contrato do tenant, override e disponibilidade efetiva da empresa.';

revoke all
on function public.admin_listar_modulos_empresa(uuid)
from public, anon, service_role;

grant execute
on function public.admin_listar_modulos_empresa(uuid)
to authenticated;

-- ============================================================
-- 7. SALVAR OVERRIDE DA EMPRESA — GLOBAL ONLY V1
-- ============================================================

create function public.admin_salvar_modulo_empresa(
  p_empresa_id uuid,
  p_modulo_chave text,
  p_modo text,
  p_motivo text default '',
  p_configuracao jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_tenant_id uuid;

  v_modulo_chave text :=
    lower(
      btrim(
        coalesce(
          p_modulo_chave,
          ''
        )
      )
    );

  v_modo text :=
    lower(
      btrim(
        coalesce(
          p_modo,
          ''
        )
      )
    );

  v_motivo text :=
    btrim(
      coalesce(
        p_motivo,
        ''
      )
    );

  v_obrigatorio boolean;
  v_modulo_ativo boolean;
  v_configuracao jsonb :=
    coalesce(
      p_configuracao,
      '{}'::jsonb
    );
begin
  if auth.uid() is null
     or not public.usuario_admin_global() then
    raise exception using
      errcode = '42501',
      message = 'Alteracao de modulos por empresa restrita ao administrador global SafeScan nesta versao.';
  end if;

  select e.tenant_id
  into v_tenant_id
  from public.empresas e
  where e.id = p_empresa_id;

  if not found then
    raise exception
      'Empresa nao localizada para salvar modulo.';
  end if;

  if v_modulo_chave = '' then
    raise exception
      'Modulo obrigatorio para salvar configuracao da empresa.';
  end if;

  select
    m.obrigatorio,
    m.ativo
  into
    v_obrigatorio,
    v_modulo_ativo
  from public.modulos_sistema m
  where m.chave = v_modulo_chave;

  if not found then
    raise exception
      'Modulo % nao localizado no catalogo SafeScan.',
      v_modulo_chave;
  end if;

  if v_modulo_ativo is not true then
    raise exception
      'Modulo % esta inativo no catalogo.',
      v_modulo_chave;
  end if;

  if v_modo not in (
    'herdar',
    'desabilitado'
  ) then
    raise exception
      'Modo invalido. Use herdar ou desabilitado.';
  end if;

  if jsonb_typeof(v_configuracao) <> 'object' then
    raise exception
      'Configuracao da empresa deve ser objeto JSON.';
  end if;

  if v_modo = 'herdar' then
    delete from public.empresa_modulos em
    where em.empresa_id = p_empresa_id
      and em.modulo_chave = v_modulo_chave;

    return jsonb_build_object(
      'ok', true,
      'empresaId', p_empresa_id,
      'tenantId', v_tenant_id,
      'moduloChave', v_modulo_chave,
      'modo', 'herdar',
      'disponivel',
        public.empresa_tem_modulo(
          p_empresa_id,
          v_modulo_chave
        )
    );
  end if;

  if v_obrigatorio is true then
    raise exception
      'Modulo core obrigatorio % nao pode ser desabilitado por empresa.',
      v_modulo_chave;
  end if;

  if not public.tenant_tem_modulo(
    v_tenant_id,
    v_modulo_chave
  ) then
    raise exception
      'Modulo % nao esta ativo/contratado no tenant; override de empresa nao e aplicavel.',
      v_modulo_chave;
  end if;

  insert into public.empresa_modulos (
    empresa_id,
    modulo_chave,
    modo,
    motivo,
    configuracao,
    created_by,
    updated_by
  )
  values (
    p_empresa_id,
    v_modulo_chave,
    'desabilitado',
    v_motivo,
    v_configuracao,
    auth.uid(),
    auth.uid()
  )
  on conflict (
    empresa_id,
    modulo_chave
  )
  do update set
    modo = 'desabilitado',
    motivo = excluded.motivo,
    configuracao = excluded.configuracao,
    updated_at = now(),
    updated_by = auth.uid();

  return jsonb_build_object(
    'ok', true,
    'empresaId', p_empresa_id,
    'tenantId', v_tenant_id,
    'moduloChave', v_modulo_chave,
    'modo', 'desabilitado',
    'disponivel',
      public.empresa_tem_modulo(
        p_empresa_id,
        v_modulo_chave
      )
  );
end;
$function$;

comment on function public.admin_salvar_modulo_empresa(uuid, text, text, text, jsonb) is
  'Gerencia override restritivo por empresa. V1 global-only. herdar remove a linha; desabilitado grava excecao. Nunca eleva contrato do tenant.';

revoke all
on function public.admin_salvar_modulo_empresa(uuid, text, text, text, jsonb)
from public, anon, service_role;

grant execute
on function public.admin_salvar_modulo_empresa(uuid, text, text, text, jsonb)
to authenticated;

commit;
