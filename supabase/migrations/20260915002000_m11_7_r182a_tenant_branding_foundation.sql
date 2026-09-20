-- SafeScan Brasil
-- M11.7-R182A
-- Fundacao tenant-aware para branding.
--
-- Escopo:
-- 1. tabela tenant_branding 1:1 com tenants;
-- 2. RLS tenant-aware;
-- 3. caminhos fixos de branding prefixados pelo tenant_id;
-- 4. policies adicionais no bucket logos-empresas;
-- 5. resolver publico de branding por hostname.
--
-- Esta migration:
-- - nao altera os ativos globais configuracoes/login e configuracoes/qrcode;
-- - nao altera o atributo public do bucket logos-empresas;
-- - nao executa seed/backfill;
-- - nao altera resolver_contexto_tenant_por_hostname existente.

create table public.tenant_branding (
    tenant_id uuid primary key
        references public.tenants(id)
        on delete cascade,

    fundo_login_ajuste jsonb not null
        default '{
            "size": "cover",
            "position": "center center",
            "overlay": 0.62
        }'::jsonb,

    created_at timestamptz not null
        default now(),

    updated_at timestamptz not null
        default now(),

    created_by uuid
        default auth.uid()
        references auth.users(id)
        on delete set null,

    updated_by uuid
        default auth.uid()
        references auth.users(id)
        on delete set null,

    constraint tenant_branding_fundo_login_ajuste_objeto_check
        check (
            jsonb_typeof(fundo_login_ajuste) = 'object'
        )
);

comment on table public.tenant_branding is
    'Configuracao de identidade visual 1:1 por tenant. Os arquivos ficam no bucket logos-empresas em caminhos prefixados pelo tenant_id.';

comment on column public.tenant_branding.fundo_login_ajuste is
    'Ajustes visuais do fundo de login do tenant. O arquivo de imagem permanece no Storage.';

alter table public.tenant_branding
    enable row level security;

revoke all
on table public.tenant_branding
from public, anon, authenticated;

grant
    select,
    insert,
    update,
    delete
on table public.tenant_branding
to authenticated;

grant
    select,
    insert,
    update,
    delete
on table public.tenant_branding
to service_role;

create policy tenant_branding_select_tenant
on public.tenant_branding
as permissive
for select
to authenticated
using (
    public.usuario_tem_acesso_tenant(
        tenant_id
    )
);

create policy tenant_branding_insert_gestor
on public.tenant_branding
as permissive
for insert
to authenticated
with check (
    public.usuario_pode_gerenciar_tenant(
        tenant_id
    )
);

create policy tenant_branding_update_gestor
on public.tenant_branding
as permissive
for update
to authenticated
using (
    public.usuario_pode_gerenciar_tenant(
        tenant_id
    )
)
with check (
    public.usuario_pode_gerenciar_tenant(
        tenant_id
    )
);

create policy tenant_branding_delete_gestor
on public.tenant_branding
as permissive
for delete
to authenticated
using (
    public.usuario_pode_gerenciar_tenant(
        tenant_id
    )
);

create or replace function public.tenant_branding_touch_updated_at()
returns trigger
language plpgsql
set search_path to
    'pg_catalog',
    'public',
    'auth'
as $function$
begin
    new.updated_at := now();

    if auth.uid() is not null then
        new.updated_by := auth.uid();
    end if;

    return new;
end;
$function$;

revoke all
on function public.tenant_branding_touch_updated_at()
from public, anon, authenticated;

grant execute
on function public.tenant_branding_touch_updated_at()
to service_role;

create trigger tenant_branding_touch_updated_at
before update
on public.tenant_branding
for each row
execute function public.tenant_branding_touch_updated_at();

create or replace function public.tenant_id_branding_storage_path(
    p_name text
)
returns uuid
language plpgsql
stable
security definer
set search_path to
    'pg_catalog',
    'public',
    'storage'
as $function$
declare
    v_tenant_id uuid;
begin
    if p_name is null
       or btrim(p_name) = '' then
        return null;
    end if;

    v_tenant_id :=
        public.texto_para_uuid_seguro(
            (storage.foldername(p_name))[1]
        );

    if v_tenant_id is null then
        return null;
    end if;

    if p_name not in (
        v_tenant_id::text
            || '/branding/login/fundo-login.jpg',

        v_tenant_id::text
            || '/branding/login/logo-contratante.png',

        v_tenant_id::text
            || '/branding/qrcode/logo-qrcode.png'
    ) then
        return null;
    end if;

    return v_tenant_id;
end;
$function$;

revoke all
on function public.tenant_id_branding_storage_path(text)
from public, anon, authenticated;

grant execute
on function public.tenant_id_branding_storage_path(text)
to service_role;

create or replace function public.usuario_tem_acesso_tenant_branding_path(
    p_name text
)
returns boolean
language sql
stable
security definer
set search_path to
    'pg_catalog',
    'public'
as $function$
    select coalesce(
        public.usuario_tem_acesso_tenant(
            public.tenant_id_branding_storage_path(
                p_name
            )
        ),
        false
    );
$function$;

revoke all
on function public.usuario_tem_acesso_tenant_branding_path(text)
from public, anon;

grant execute
on function public.usuario_tem_acesso_tenant_branding_path(text)
to authenticated, service_role;

create or replace function public.usuario_pode_gerenciar_tenant_branding_path(
    p_name text
)
returns boolean
language sql
stable
security definer
set search_path to
    'pg_catalog',
    'public'
as $function$
    select coalesce(
        public.usuario_pode_gerenciar_tenant(
            public.tenant_id_branding_storage_path(
                p_name
            )
        ),
        false
    );
$function$;

revoke all
on function public.usuario_pode_gerenciar_tenant_branding_path(text)
from public, anon;

grant execute
on function public.usuario_pode_gerenciar_tenant_branding_path(text)
to authenticated, service_role;

create policy sst_storage_select_authenticated_tenant_branding
on storage.objects
as permissive
for select
to authenticated
using (
    bucket_id = 'logos-empresas'
    and public.usuario_tem_acesso_tenant_branding_path(
        name
    )
);

create policy sst_storage_insert_authenticated_tenant_branding
on storage.objects
as permissive
for insert
to authenticated
with check (
    bucket_id = 'logos-empresas'
    and public.usuario_pode_gerenciar_tenant_branding_path(
        name
    )
);

create policy sst_storage_update_authenticated_tenant_branding
on storage.objects
as permissive
for update
to authenticated
using (
    bucket_id = 'logos-empresas'
    and public.usuario_pode_gerenciar_tenant_branding_path(
        name
    )
)
with check (
    bucket_id = 'logos-empresas'
    and public.usuario_pode_gerenciar_tenant_branding_path(
        name
    )
);

create policy sst_storage_delete_authenticated_tenant_branding
on storage.objects
as permissive
for delete
to authenticated
using (
    bucket_id = 'logos-empresas'
    and public.usuario_pode_gerenciar_tenant_branding_path(
        name
    )
);

create or replace function public.resolver_branding_tenant_por_hostname(
    p_hostname text
)
returns jsonb
language plpgsql
stable
security definer
set search_path to
    'pg_catalog',
    'public',
    'storage'
as $function$
declare
    v_contexto jsonb;
    v_tenant_id uuid;
    v_configurado boolean := false;

    v_ajuste jsonb :=
        '{
            "size": "cover",
            "position": "center center",
            "overlay": 0.62
        }'::jsonb;

    v_branding_updated_at timestamptz;
    v_storage_updated_at timestamptz;
    v_ultima_atualizacao timestamptz;

    v_fundo_login_path text;
    v_logo_login_path text;
    v_logo_qrcode_path text;

    v_fundo_login_existe boolean := false;
    v_logo_login_existe boolean := false;
    v_logo_qrcode_existe boolean := false;
begin
    v_contexto :=
        public.resolver_contexto_tenant_por_hostname(
            p_hostname
        );

    if coalesce(
        v_contexto ->> 'estado',
        ''
    ) <> 'resolved' then
        return
            v_contexto
            || jsonb_build_object(
                'branding',
                null
            );
    end if;

    v_tenant_id :=
        nullif(
            v_contexto #>> '{tenant,id}',
            ''
        )::uuid;

    if v_tenant_id is null then
        return
            v_contexto
            || jsonb_build_object(
                'branding',
                null
            );
    end if;

    select
        tb.fundo_login_ajuste,
        tb.updated_at
    into
        v_ajuste,
        v_branding_updated_at
    from public.tenant_branding tb
    where tb.tenant_id = v_tenant_id;

    if found then
        v_configurado := true;
    else
        v_ajuste :=
            '{
                "size": "cover",
                "position": "center center",
                "overlay": 0.62
            }'::jsonb;

        v_branding_updated_at := null;
    end if;

    v_fundo_login_path :=
        v_tenant_id::text
        || '/branding/login/fundo-login.jpg';

    v_logo_login_path :=
        v_tenant_id::text
        || '/branding/login/logo-contratante.png';

    v_logo_qrcode_path :=
        v_tenant_id::text
        || '/branding/qrcode/logo-qrcode.png';

    select
        coalesce(
            bool_or(
                o.name = v_fundo_login_path
            ),
            false
        ),

        coalesce(
            bool_or(
                o.name = v_logo_login_path
            ),
            false
        ),

        coalesce(
            bool_or(
                o.name = v_logo_qrcode_path
            ),
            false
        ),

        max(
            o.updated_at
        )
    into
        v_fundo_login_existe,
        v_logo_login_existe,
        v_logo_qrcode_existe,
        v_storage_updated_at
    from storage.objects o
    where o.bucket_id = 'logos-empresas'
      and o.name = any(
          array[
              v_fundo_login_path,
              v_logo_login_path,
              v_logo_qrcode_path
          ]
      );

    v_ultima_atualizacao :=
        greatest(
            v_branding_updated_at,
            v_storage_updated_at
        );

    return
        v_contexto
        || jsonb_build_object(
            'branding',
            jsonb_build_object(
                'configurado',
                    v_configurado,

                'bucket',
                    'logos-empresas',

                'fundoLoginPath',
                    case
                        when v_fundo_login_existe
                        then v_fundo_login_path
                        else null
                    end,

                'logoLoginPath',
                    case
                        when v_logo_login_existe
                        then v_logo_login_path
                        else null
                    end,

                'logoQrCodePath',
                    case
                        when v_logo_qrcode_existe
                        then v_logo_qrcode_path
                        else null
                    end,

                'ajusteFundoLogin',
                    v_ajuste,

                'versao',
                    case
                        when v_ultima_atualizacao is null
                        then ''
                        else (
                            extract(
                                epoch
                                from v_ultima_atualizacao
                            ) * 1000
                        )::bigint::text
                    end
            )
        );
end;
$function$;

revoke all
on function public.resolver_branding_tenant_por_hostname(text)
from public;

grant execute
on function public.resolver_branding_tenant_por_hostname(text)
to anon, authenticated, service_role;
