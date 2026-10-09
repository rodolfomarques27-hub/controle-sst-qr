begin;

do $$
begin
  if to_regclass('public.auditoria_campo_fotos') is not null then
    raise exception 'Tabela de fotos ja existe. Revisar baseline.';
  end if;

  if to_regprocedure(
    'public.usuario_pode_acessar_auditoria_campo_empresa(uuid)'
  ) is null then
    raise exception 'Guard tenant-scoped de auditoria ausente.';
  end if;
end;
$$;

alter table public.auditorias_campo
  add constraint auditorias_campo_id_empresa_multifotos_uk
  unique (id, empresa_id);

create table public.auditoria_campo_fotos (
  id uuid primary key default gen_random_uuid(),

  auditoria_id uuid not null,
  empresa_id uuid not null,

  fase text not null
    check (fase in ('antes', 'depois')),

  ordem integer not null
    check (ordem between 1 and 8),

  bucket_id text not null default 'auditorias-campo'
    check (bucket_id = 'auditorias-campo'),

  caminho_storage text not null
    check (
      length(trim(caminho_storage)) between 1 and 1024
      and left(caminho_storage, 1) <> '/'
      and position('..' in caminho_storage) = 0
    ),

  nome_original text,
  mime_type text not null
    check (
      mime_type in (
        'image/jpeg',
        'image/png',
        'image/webp'
      )
    ),

  criado_em timestamptz not null default now(),

  constraint auditoria_campo_fotos_vinculo_fk
    foreign key (auditoria_id, empresa_id)
    references public.auditorias_campo (id, empresa_id)
    on delete restrict,

  constraint auditoria_campo_fotos_ordem_uk
    unique (auditoria_id, fase, ordem),

  constraint auditoria_campo_fotos_caminho_uk
    unique (bucket_id, caminho_storage)
);

create index auditoria_campo_fotos_empresa_idx
  on public.auditoria_campo_fotos
  (empresa_id, auditoria_id);

alter table public.auditoria_campo_fotos
  enable row level security;

create policy auditoria_campo_fotos_select
on public.auditoria_campo_fotos
for select
to authenticated
using (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
);

create policy auditoria_campo_fotos_insert
on public.auditoria_campo_fotos
for insert
to authenticated
with check (
  public.usuario_pode_acessar_auditoria_campo_empresa(
    empresa_id
  )
  and split_part(caminho_storage, '/', 1) = empresa_id::text
  and caminho_storage like
    empresa_id::text || '/auditorias-internas/%'
  and exists (
    select 1
    from storage.objects o
    where o.bucket_id = 'auditorias-campo'
      and o.name = caminho_storage
  )
);

revoke all on public.auditoria_campo_fotos
  from public, anon, authenticated;

grant select, insert on public.auditoria_campo_fotos
  to authenticated;

grant select, insert, update, delete
  on public.auditoria_campo_fotos
  to service_role;

comment on table public.auditoria_campo_fotos is
  'Evidencias fotograficas multiplas vinculadas a auditoria e empresa.';

commit;
