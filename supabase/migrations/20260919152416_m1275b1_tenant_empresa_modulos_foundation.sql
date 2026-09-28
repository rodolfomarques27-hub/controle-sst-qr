
begin;

do $preflight$
begin
  if to_regclass('public.tenants') is null
     or to_regclass('public.empresas') is null
     or to_regprocedure('public.usuario_admin_global()') is null
     or to_regprocedure('public.usuario_tem_acesso_tenant(uuid)') is null
     or to_regprocedure('public.usuario_tem_acesso_empresa(uuid)') is null then
    raise exception
      'M12.7.5-B1 preflight: fundacao tenant/empresa ou helpers de acesso ausentes.';
  end if;

  if to_regclass('public.modulos_sistema') is not null
     or to_regclass('public.tenant_modulos') is not null
     or to_regclass('public.empresa_modulos') is not null
     or to_regprocedure('public.safescan_modulos_touch_updated_at()') is not null then
    raise exception
      'M12.7.5-B1 preflight: objetos da fundacao de modulos ja existem.';
  end if;
end
$preflight$;

-- ============================================================
-- 1. CATALOGO CANONICO DE MODULOS
-- ============================================================

create table public.modulos_sistema (
  chave text primary key,
  nome text not null,
  descricao text not null default '',
  categoria text not null default 'geral',
  contratavel boolean not null default true,
  obrigatorio boolean not null default false,
  ativo boolean not null default true,
  ordem integer not null default 0,
  metadados jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid()
    references auth.users(id)
    on delete set null,
  updated_by uuid default auth.uid()
    references auth.users(id)
    on delete set null,

  constraint modulos_sistema_chave_check
    check (
      chave ~ '^[a-z][a-z0-9_]{1,79}$'
    ),

  constraint modulos_sistema_nome_check
    check (
      char_length(btrim(nome)) between 2 and 120
    ),

  constraint modulos_sistema_categoria_check
    check (
      char_length(btrim(categoria)) between 2 and 80
    ),

  constraint modulos_sistema_ordem_check
    check (
      ordem >= 0
    ),

  constraint modulos_sistema_metadados_objeto_check
    check (
      jsonb_typeof(metadados) = 'object'
    )
);

comment on table public.modulos_sistema is
  'Catalogo canonico de modulos/produtos SafeScan. Nao representa permissao de usuario.';

comment on column public.modulos_sistema.contratavel is
  'Indica se o modulo pode fazer parte do contrato comercial de um tenant.';

comment on column public.modulos_sistema.obrigatorio is
  'Indica funcionalidade core da plataforma, nao dependente de entitlement comercial opcional.';

-- ============================================================
-- 2. ENTITLEMENT DO TENANT
-- ============================================================

create table public.tenant_modulos (
  tenant_id uuid not null
    references public.tenants(id)
    on delete cascade,

  modulo_chave text not null
    references public.modulos_sistema(chave)
    on update cascade
    on delete restrict,

  status text not null default 'ativo',
  origem text not null default 'manual',
  observacao text not null default '',
  configuracao jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid default auth.uid()
    references auth.users(id)
    on delete set null,

  updated_by uuid default auth.uid()
    references auth.users(id)
    on delete set null,

  primary key (
    tenant_id,
    modulo_chave
  ),

  constraint tenant_modulos_status_check
    check (
      status in (
        'ativo',
        'suspenso'
      )
    ),

  constraint tenant_modulos_origem_check
    check (
      origem in (
        'manual',
        'onboarding',
        'backfill_compatibilidade'
      )
    ),

  constraint tenant_modulos_configuracao_objeto_check
    check (
      jsonb_typeof(configuracao) = 'object'
    )
);

comment on table public.tenant_modulos is
  'Entitlements comerciais/funcionais do tenant. Ausencia de linha significa modulo opcional nao contratado.';

comment on column public.tenant_modulos.status is
  'ativo = contratado/disponivel no tenant; suspenso = entitlement existente temporariamente indisponivel.';

-- ============================================================
-- 3. OVERRIDE RESTRITIVO DA EMPRESA
-- ============================================================

create table public.empresa_modulos (
  empresa_id uuid not null
    references public.empresas(id)
    on delete cascade,

  modulo_chave text not null
    references public.modulos_sistema(chave)
    on update cascade
    on delete restrict,

  modo text not null default 'herdar',
  motivo text not null default '',
  configuracao jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  created_by uuid default auth.uid()
    references auth.users(id)
    on delete set null,

  updated_by uuid default auth.uid()
    references auth.users(id)
    on delete set null,

  primary key (
    empresa_id,
    modulo_chave
  ),

  constraint empresa_modulos_modo_check
    check (
      modo in (
        'herdar',
        'desabilitado'
      )
    ),

  constraint empresa_modulos_configuracao_objeto_check
    check (
      jsonb_typeof(configuracao) = 'object'
    )
);

comment on table public.empresa_modulos is
  'Override restritivo de modulo por empresa. Ausencia de linha equivale a herdar do tenant; empresa nunca eleva o contrato do tenant.';

-- ============================================================
-- 4. INDICES
-- ============================================================

create index tenant_modulos_modulo_status_idx
  on public.tenant_modulos (
    modulo_chave,
    status
  );

create index empresa_modulos_modulo_modo_idx
  on public.empresa_modulos (
    modulo_chave,
    modo
  );

-- ============================================================
-- 5. AUDITORIA BASICA DE UPDATED_AT / UPDATED_BY
-- ============================================================

create function public.safescan_modulos_touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public, auth
as $function$
begin
  new.updated_at := now();

  if auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;

  return new;
end;
$function$;

comment on function public.safescan_modulos_touch_updated_at() is
  'Atualiza timestamp e autor de alteracoes das tabelas de modulos SafeScan.';

revoke all
on function public.safescan_modulos_touch_updated_at()
from public, anon, authenticated;

grant execute
on function public.safescan_modulos_touch_updated_at()
to service_role;

create trigger modulos_sistema_touch_updated_at
before update
on public.modulos_sistema
for each row
execute function public.safescan_modulos_touch_updated_at();

create trigger tenant_modulos_touch_updated_at
before update
on public.tenant_modulos
for each row
execute function public.safescan_modulos_touch_updated_at();

create trigger empresa_modulos_touch_updated_at
before update
on public.empresa_modulos
for each row
execute function public.safescan_modulos_touch_updated_at();

-- ============================================================
-- 6. RLS / GRANTS
-- ============================================================

alter table public.modulos_sistema
  enable row level security;

alter table public.tenant_modulos
  enable row level security;

alter table public.empresa_modulos
  enable row level security;

revoke all
on table public.modulos_sistema
from public, anon, authenticated;

revoke all
on table public.tenant_modulos
from public, anon, authenticated;

revoke all
on table public.empresa_modulos
from public, anon, authenticated;

grant select
on table public.modulos_sistema
to authenticated;

grant select
on table public.tenant_modulos
to authenticated;

grant select
on table public.empresa_modulos
to authenticated;

grant select, insert, update, delete
on table public.modulos_sistema
to service_role;

grant select, insert, update, delete
on table public.tenant_modulos
to service_role;

grant select, insert, update, delete
on table public.empresa_modulos
to service_role;

create policy modulos_sistema_select_authenticated
on public.modulos_sistema
as permissive
for select
to authenticated
using (
  ativo = true
  or public.usuario_admin_global()
);

create policy tenant_modulos_select_tenant
on public.tenant_modulos
as permissive
for select
to authenticated
using (
  public.usuario_tem_acesso_tenant(
    tenant_id
  )
);

create policy empresa_modulos_select_empresa
on public.empresa_modulos
as permissive
for select
to authenticated
using (
  public.usuario_tem_acesso_empresa(
    empresa_id
  )
);

-- ============================================================
-- 7. CATALOGO INICIAL
-- ============================================================

insert into public.modulos_sistema (
  chave,
  nome,
  descricao,
  categoria,
  contratavel,
  obrigatorio,
  ativo,
  ordem,
  metadados
)
values
(
  'nucleo_safescan',
  'Núcleo SafeScan',
  'Cadastros básicos, dashboard e estruturas indispensáveis ao funcionamento do ambiente.',
  'core',
  false,
  true,
  true,
  10,
  '{
    "tipo": "core",
    "telas": [
      "dashboard",
      "empresas",
      "colaboradores",
      "aniversariantes"
    ]
  }'::jsonb
),
(
  'gestao_documental_sst',
  'Gestão Documental SST',
  'Gestão dos documentos ocupacionais e de segurança vinculados a empresas e colaboradores.',
  'documental',
  true,
  false,
  true,
  20,
  '{
    "telas": [
      "empresas",
      "colaboradores"
    ],
    "natureza": "produto"
  }'::jsonb
),
(
  'treinamentos',
  'Treinamentos',
  'Gestão de treinamentos, certificados, validades e evidências de capacitação.',
  'sst',
  true,
  false,
  true,
  30,
  '{
    "telas": [
      "treinamentos"
    ],
    "natureza": "produto"
  }'::jsonb
),
(
  'dds',
  'DDS',
  'Gestão de Diálogos Diários de Segurança, registros e assinaturas.',
  'sst',
  true,
  false,
  true,
  40,
  '{
    "telas": [
      "dds"
    ],
    "permissao_legada": "treinamentos",
    "natureza": "produto"
  }'::jsonb
),
(
  'certidao_mensal_documental',
  'Certidão Mensal Documental',
  'Fiscalização e controle mensal de documentação das empresas contratadas.',
  'documental',
  true,
  false,
  true,
  50,
  '{
    "telas": [
      "certidaoMensalDocumental"
    ],
    "gate_central_legado": "sem_chave_propria",
    "natureza": "produto"
  }'::jsonb
),
(
  'consolidacao_documental',
  'Consolidação Documental',
  'Consolidação de documentos e situação documental dos colaboradores.',
  'documental',
  true,
  false,
  true,
  60,
  '{
    "telas": [
      "consolidacaoColaborador"
    ],
    "permissao_legada": "relatorios",
    "natureza": "produto"
  }'::jsonb
),
(
  'auditoria_campo',
  'Auditoria de Campo',
  'Auditorias operacionais, evidências, registros de campo e acompanhamento.',
  'auditoria',
  true,
  false,
  true,
  70,
  '{
    "telas": [
      "auditoriaCampo",
      "novaAuditoriaCampo"
    ],
    "natureza": "produto"
  }'::jsonb
),
(
  'extintores',
  'Gestão de Extintores',
  'Cadastro, vistoria, QR e gestão operacional de extintores.',
  'prevencao',
  true,
  false,
  true,
  80,
  '{
    "telas": [
      "extintores",
      "vistoriaExtintores"
    ],
    "natureza": "produto"
  }'::jsonb
),
(
  'mapa_obra',
  'Mapa da Obra',
  'Administração e visualização de mapa/planta operacional da obra.',
  'prevencao',
  true,
  false,
  true,
  90,
  '{
    "telas": [
      "mapaObra",
      "mapaObraVisualizacao"
    ],
    "natureza": "produto"
  }'::jsonb
),
(
  'qr_code',
  'QR Code',
  'Identificação e consulta por QR Code dos recursos disponibilizados pelo SafeScan.',
  'plataforma',
  true,
  false,
  true,
  100,
  '{
    "telas": [
      "qr"
    ],
    "natureza": "produto"
  }'::jsonb
),
(
  'relatorios',
  'Relatórios',
  'Relatórios consolidados, exportações e recursos analíticos disponibilizados ao cliente.',
  'analitico',
  true,
  false,
  true,
  110,
  '{
    "transversal": true,
    "natureza": "produto"
  }'::jsonb
);

-- ============================================================
-- 8. BACKFILL DE COMPATIBILIDADE
-- ============================================================

insert into public.tenant_modulos (
  tenant_id,
  modulo_chave,
  status,
  origem,
  observacao
)
select
  t.id,
  m.chave,
  'ativo',
  'backfill_compatibilidade',
  'Habilitado automaticamente na fundação M12.7.5-B1 para preservar integralmente as funcionalidades existentes.'
from public.tenants t
cross join public.modulos_sistema m
where m.contratavel = true
  and m.ativo = true;

commit;
