-- SafeScan Brasil
-- Persistência documental e dados estruturados do DDS.
-- Espelha o contrato validado no projeto Supabase remoto.

insert into storage.buckets (
    id, name, public, file_size_limit, allowed_mime_types
)
values (
    'dds-assinados',
    'dds-assinados',
    false,
    26214400,
    array[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
    ]::text[]
)
on conflict (id) do update
set
    name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create schema if not exists private;

create table if not exists public.dds_documentos (
    id uuid primary key default extensions.gen_random_uuid(),
    registro_id uuid not null references public.dds_registros(id) on delete cascade,
    bucket_id text not null default 'dds-assinados'
        constraint dds_documentos_bucket_check check (bucket_id = 'dds-assinados'),
    caminho_storage text not null,
    nome_original text not null,
    mime_type text not null
        constraint dds_documentos_mime_type_check
        check (mime_type in ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
    tamanho_bytes bigint not null
        constraint dds_documentos_tamanho_check
        check (tamanho_bytes > 0 and tamanho_bytes <= 26214400),
    hash_sha256 text not null
        constraint dds_documentos_hash_check
        check (hash_sha256 ~ '^[0-9a-fA-F]{64}$'),
    quantidade_paginas integer
        constraint dds_documentos_paginas_check
        check (quantidade_paginas is null or quantidade_paginas > 0),
    leitura_ocr jsonb not null default '{}'::jsonb,
    criado_por uuid default auth.uid(),
    atualizado_por uuid default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint dds_documentos_registro_hash_unique unique (registro_id, hash_sha256),
    constraint dds_documentos_storage_unique unique (bucket_id, caminho_storage)
);

create table if not exists public.dds_conferencias (
    id uuid primary key default extensions.gen_random_uuid(),
    registro_id uuid not null references public.dds_registros(id) on delete cascade,
    documento_id uuid references public.dds_documentos(id) on delete set null,
    status text not null default 'em_conferencia'
        constraint dds_conferencias_status_check
        check (status in ('em_conferencia', 'concluida', 'reaberta')),
    versao integer not null default 1
        constraint dds_conferencias_versao_check check (versao > 0),
    estatisticas jsonb not null default '{}'::jsonb,
    leitura_ocr jsonb not null default '{}'::jsonb,
    snapshot jsonb not null default '{}'::jsonb,
    concluida_em timestamptz,
    reaberta_em timestamptz,
    ultima_sincronizacao_em timestamptz not null default now(),
    criado_por uuid default auth.uid(),
    atualizado_por uuid default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint dds_conferencias_registro_unique unique (registro_id)
);

create table if not exists public.dds_frequencias (
    id uuid primary key default extensions.gen_random_uuid(),
    conferencia_id uuid not null references public.dds_conferencias(id) on delete cascade,
    registro_id uuid not null references public.dds_registros(id) on delete cascade,
    participante_chave text not null,
    participante_numero integer not null
        constraint dds_frequencias_numero_check check (participante_numero > 0),
    colaborador_id uuid,
    participante_nome text not null,
    participante_funcao text,
    participante_empresa text,
    codigo_safescan text,
    participante_origem text not null default 'cadastro',
    participante_tipo text not null default 'colaborador',
    pagina_impressa integer
        constraint dds_frequencias_pagina_check
        check (pagina_impressa is null or pagina_impressa > 0),
    linha_impressa integer
        constraint dds_frequencias_linha_check
        check (linha_impressa is null or linha_impressa > 0),
    data_referencia date not null,
    dia_chave text not null,
    dia_posicao integer not null
        constraint dds_frequencias_dia_posicao_check
        check (dia_posicao between 0 and 6),
    status text not null default 'manual'
        constraint dds_frequencias_status_check
        check (status in ('presente', 'ausente', 'manual', 'nao_analisado')),
    sugestao_ocr text not null default 'nao_analisado'
        constraint dds_frequencias_sugestao_check
        check (sugestao_ocr in ('presente', 'ausente', 'manual', 'nao_analisado')),
    confianca_ocr numeric
        constraint dds_frequencias_confianca_check
        check (confianca_ocr is null or confianca_ocr between 0 and 1),
    pagina_ocr integer,
    celula_ocr jsonb not null default '{}'::jsonb,
    confirmado_manualmente boolean not null default true,
    divergente_ocr boolean not null default false,
    criado_por uuid default auth.uid(),
    atualizado_por uuid default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint dds_frequencias_conferencia_participante_dia_unique
        unique (conferencia_id, participante_chave, data_referencia)
);

create table if not exists public.dds_temas_dias (
    id uuid primary key default extensions.gen_random_uuid(),
    conferencia_id uuid not null references public.dds_conferencias(id) on delete cascade,
    registro_id uuid not null references public.dds_registros(id) on delete cascade,
    data_referencia date not null,
    dia_chave text not null,
    dia_posicao integer not null
        constraint dds_temas_dias_posicao_check check (dia_posicao between 0 and 6),
    tema_planejado text,
    tema_confirmado text,
    responsavel_planejado text,
    responsavel_confirmado text,
    origem_tema_confirmado text,
    sem_atividade boolean not null default false,
    criado_por uuid default auth.uid(),
    atualizado_por uuid default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint dds_temas_dias_conferencia_data_unique
        unique (conferencia_id, data_referencia)
);

create table if not exists public.dds_auditoria (
    id uuid primary key default extensions.gen_random_uuid(),
    registro_id uuid not null references public.dds_registros(id) on delete cascade,
    conferencia_id uuid references public.dds_conferencias(id) on delete set null,
    documento_id uuid references public.dds_documentos(id) on delete set null,
    acao text not null,
    motivo text,
    dados jsonb not null default '{}'::jsonb,
    usuario_id uuid default auth.uid(),
    criado_por uuid default auth.uid(),
    atualizado_por uuid default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists dds_documentos_registro_id_idx
    on public.dds_documentos (registro_id);
create index if not exists dds_documentos_created_at_idx
    on public.dds_documentos (created_at desc);
create index if not exists dds_conferencias_documento_id_idx
    on public.dds_conferencias (documento_id);
create index if not exists dds_conferencias_status_idx
    on public.dds_conferencias (status);
create index if not exists dds_frequencias_conferencia_id_idx
    on public.dds_frequencias (conferencia_id);
create index if not exists dds_frequencias_registro_id_idx
    on public.dds_frequencias (registro_id);
create index if not exists dds_frequencias_colaborador_id_idx
    on public.dds_frequencias (colaborador_id);
create index if not exists dds_frequencias_codigo_safescan_idx
    on public.dds_frequencias (codigo_safescan);
create index if not exists dds_frequencias_data_idx
    on public.dds_frequencias (data_referencia);
create index if not exists dds_temas_dias_conferencia_id_idx
    on public.dds_temas_dias (conferencia_id);
create index if not exists dds_temas_dias_registro_id_idx
    on public.dds_temas_dias (registro_id);
create index if not exists dds_temas_dias_data_idx
    on public.dds_temas_dias (data_referencia);
create index if not exists dds_auditoria_registro_id_idx
    on public.dds_auditoria (registro_id);
create index if not exists dds_auditoria_conferencia_id_idx
    on public.dds_auditoria (conferencia_id);
create index if not exists dds_auditoria_documento_id_idx
    on public.dds_auditoria (documento_id);
create index if not exists dds_auditoria_created_at_idx
    on public.dds_auditoria (created_at desc);

create or replace function public.dds_atualizar_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
    new.updated_at := now();
    new.atualizado_por := auth.uid();
    return new;
end;
$function$;

drop trigger if exists trg_dds_documentos_updated_at on public.dds_documentos;
create trigger trg_dds_documentos_updated_at before update on public.dds_documentos
for each row execute function public.dds_atualizar_updated_at();
drop trigger if exists trg_dds_conferencias_updated_at on public.dds_conferencias;
create trigger trg_dds_conferencias_updated_at before update on public.dds_conferencias
for each row execute function public.dds_atualizar_updated_at();
drop trigger if exists trg_dds_frequencias_updated_at on public.dds_frequencias;
create trigger trg_dds_frequencias_updated_at before update on public.dds_frequencias
for each row execute function public.dds_atualizar_updated_at();
drop trigger if exists trg_dds_temas_dias_updated_at on public.dds_temas_dias;
create trigger trg_dds_temas_dias_updated_at before update on public.dds_temas_dias
for each row execute function public.dds_atualizar_updated_at();
drop trigger if exists trg_dds_auditoria_updated_at on public.dds_auditoria;
create trigger trg_dds_auditoria_updated_at before update on public.dds_auditoria
for each row execute function public.dds_atualizar_updated_at();

CREATE OR REPLACE FUNCTION private.dds_usuario_pode_acessar_registro(p_registro_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
    select
        (select public.usuario_ativo_sistema())
        and exists (
            select 1
            from public.dds_registros r
            where r.id = p_registro_id
              and (
                  not (
                      select
                          public.usuario_tem_escopo_empresa_atribuido()
                  )
                  or (
                      select
                          public.usuario_admin_global()
                  )
                  or (
                      select
                          public.usuario_tem_acesso_empresa(
                              r.empresa_id
                          )
                  )
              )
        );
$function$;

CREATE OR REPLACE FUNCTION private.dds_caminho_contem_registro_acessivel(p_nome text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    v_parte text;
    v_registro_id uuid;
begin
    if auth.uid() is null then
        return false;
    end if;

    foreach v_parte in array
        string_to_array(
            coalesce(p_nome, ''),
            '/'
        )
    loop
        if v_parte ~*
            '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then
            v_registro_id := v_parte::uuid;

            if private.dds_usuario_pode_acessar_registro(
                v_registro_id
            ) then
                return true;
            end if;
        end if;
    end loop;

    return false;
end;
$function$;

alter table public.dds_documentos enable row level security;
alter table public.dds_conferencias enable row level security;
alter table public.dds_frequencias enable row level security;
alter table public.dds_temas_dias enable row level security;
alter table public.dds_auditoria enable row level security;

do $policies$
declare
    v_table text;
    v_policy text;
begin
    foreach v_table in array array[
        'dds_documentos', 'dds_conferencias', 'dds_frequencias', 'dds_temas_dias'
    ] loop
        foreach v_policy in array array['select', 'insert', 'update', 'delete'] loop
            execute format(
                'drop policy if exists %I on public.%I',
                v_table || '_' || v_policy || '_usuarios_autorizados',
                v_table
            );
        end loop;

        execute format(
            'create policy %I on public.%I for select to authenticated using ((select private.dds_usuario_pode_acessar_registro(registro_id)))',
            v_table || '_select_usuarios_autorizados', v_table
        );
        execute format(
            'create policy %I on public.%I for insert to authenticated with check ((select private.dds_usuario_pode_acessar_registro(registro_id)))',
            v_table || '_insert_usuarios_autorizados', v_table
        );
        execute format(
            'create policy %I on public.%I for update to authenticated using ((select private.dds_usuario_pode_acessar_registro(registro_id))) with check ((select private.dds_usuario_pode_acessar_registro(registro_id)))',
            v_table || '_update_usuarios_autorizados', v_table
        );
        execute format(
            'create policy %I on public.%I for delete to authenticated using ((select private.dds_usuario_pode_acessar_registro(registro_id)))',
            v_table || '_delete_usuarios_autorizados', v_table
        );
    end loop;
end;
$policies$;

drop policy if exists dds_documentos_insert_usuarios_autorizados on public.dds_documentos;
create policy dds_documentos_insert_usuarios_autorizados
on public.dds_documentos for insert to authenticated
with check (
    criado_por = (select auth.uid())
    and (select private.dds_usuario_pode_acessar_registro(registro_id))
);

drop policy if exists dds_auditoria_select_usuarios_autorizados on public.dds_auditoria;
create policy dds_auditoria_select_usuarios_autorizados
on public.dds_auditoria for select to authenticated
using ((select private.dds_usuario_pode_acessar_registro(registro_id)));

drop policy if exists dds_auditoria_insert_usuarios_autorizados on public.dds_auditoria;
create policy dds_auditoria_insert_usuarios_autorizados
on public.dds_auditoria for insert to authenticated
with check (
    usuario_id = (select auth.uid())
    and (select private.dds_usuario_pode_acessar_registro(registro_id))
);

drop policy if exists dds_assinados_select_usuarios_autorizados on storage.objects;
create policy dds_assinados_select_usuarios_autorizados
on storage.objects for select to authenticated
using (
    bucket_id = 'dds-assinados'
    and (select private.dds_caminho_contem_registro_acessivel(name))
);

drop policy if exists dds_assinados_insert_usuarios_autorizados on storage.objects;
create policy dds_assinados_insert_usuarios_autorizados
on storage.objects for insert to authenticated
with check (
    bucket_id = 'dds-assinados'
    and owner_id = (select auth.uid()::text)
    and (select private.dds_caminho_contem_registro_acessivel(name))
);

drop policy if exists dds_assinados_update_usuarios_autorizados on storage.objects;
create policy dds_assinados_update_usuarios_autorizados
on storage.objects for update to authenticated
using (
    bucket_id = 'dds-assinados'
    and (select private.dds_caminho_contem_registro_acessivel(name))
)
with check (
    bucket_id = 'dds-assinados'
    and (select private.dds_caminho_contem_registro_acessivel(name))
);

drop policy if exists dds_assinados_delete_usuarios_autorizados on storage.objects;
create policy dds_assinados_delete_usuarios_autorizados
on storage.objects for delete to authenticated
using (
    bucket_id = 'dds-assinados'
    and (select private.dds_caminho_contem_registro_acessivel(name))
);

revoke all on table
    public.dds_documentos,
    public.dds_conferencias,
    public.dds_frequencias,
    public.dds_temas_dias,
    public.dds_auditoria
from anon, authenticated, service_role;

grant select, insert, update, delete on public.dds_documentos to authenticated;
grant select, insert, update, delete on public.dds_conferencias to authenticated;
grant select, insert, update, delete on public.dds_frequencias to authenticated;
grant select, insert, update, delete on public.dds_temas_dias to authenticated;
grant select, insert on public.dds_auditoria to authenticated;

grant select, insert, update, delete on table
    public.dds_documentos,
    public.dds_conferencias,
    public.dds_frequencias,
    public.dds_temas_dias,
    public.dds_auditoria
to service_role;

revoke all on function private.dds_usuario_pode_acessar_registro(uuid) from public;
revoke all on function private.dds_caminho_contem_registro_acessivel(text) from public;
grant execute on function private.dds_usuario_pode_acessar_registro(uuid) to authenticated, service_role;
grant execute on function private.dds_caminho_contem_registro_acessivel(text) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.sincronizar_conferencia_dds(p_registro_id uuid, p_documento_id uuid DEFAULT NULL::uuid, p_status text DEFAULT 'em_conferencia'::text, p_estatisticas jsonb DEFAULT '{}'::jsonb, p_leitura_ocr jsonb DEFAULT '{}'::jsonb, p_snapshot jsonb DEFAULT '{}'::jsonb, p_frequencias jsonb DEFAULT '[]'::jsonb, p_temas_dias jsonb DEFAULT '[]'::jsonb, p_acao text DEFAULT 'sincronizar_conferencia'::text, p_motivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
    v_registro public.dds_registros%rowtype;

    v_conferencia_id uuid;
    v_auditoria_id uuid;

    v_status text;
    v_frequencias jsonb;
    v_temas jsonb;

    v_item jsonb;

    v_data_text text;
    v_data date;

    v_numero_text text;
    v_numero integer;

    v_posicao_text text;
    v_posicao integer;

    v_colaborador_text text;
    v_colaborador_id uuid;

    v_participante_chave text;
    v_status_frequencia text;
    v_sugestao_ocr text;

    v_confianca_text text;
    v_confianca numeric;

    v_resultado_frequencias jsonb;
    v_resultado_temas jsonb;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    if not (
        select public.usuario_ativo_sistema()
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário inativo ou bloqueado no SafeScan.';
    end if;

    if p_registro_id is null then
        raise exception using
            errcode = '22023',
            message = 'Identificador do registro DDS não informado.';
    end if;

    if not (
        select
            private.dds_usuario_pode_acessar_registro(
                p_registro_id
            )
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso ao registro DDS informado.';
    end if;

    select r.*
    into v_registro
    from public.dds_registros r
    where r.id = p_registro_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Registro DDS não localizado.';
    end if;

    if p_documento_id is not null
       and not exists (
           select 1
           from public.dds_documentos d
           where d.id = p_documento_id
             and d.registro_id = p_registro_id
       )
    then
        raise exception using
            errcode = '22023',
            message = 'Documento DDS não pertence ao registro informado.';
    end if;

    v_status :=
        lower(
            trim(
                coalesce(
                    p_status,
                    'em_conferencia'
                )
            )
        );

    if v_status not in (
        'em_conferencia',
        'concluida',
        'reaberta'
    ) then
        v_status := 'em_conferencia';
    end if;

    v_frequencias :=
        case
            when jsonb_typeof(
                coalesce(
                    p_frequencias,
                    '[]'::jsonb
                )
            ) = 'array'
            then coalesce(
                p_frequencias,
                '[]'::jsonb
            )
            else '[]'::jsonb
        end;

    v_temas :=
        case
            when jsonb_typeof(
                coalesce(
                    p_temas_dias,
                    '[]'::jsonb
                )
            ) = 'array'
            then coalesce(
                p_temas_dias,
                '[]'::jsonb
            )
            else '[]'::jsonb
        end;

    insert into public.dds_conferencias (
        registro_id,
        documento_id,
        status,
        versao,
        estatisticas,
        leitura_ocr,
        snapshot,
        concluida_em,
        reaberta_em,
        ultima_sincronizacao_em,
        criado_por,
        atualizado_por
    )
    values (
        p_registro_id,
        p_documento_id,
        v_status,
        1,
        coalesce(
            p_estatisticas,
            '{}'::jsonb
        ),
        coalesce(
            p_leitura_ocr,
            '{}'::jsonb
        ),
        coalesce(
            p_snapshot,
            '{}'::jsonb
        ),
        case
            when v_status = 'concluida'
            then now()
            else null
        end,
        case
            when v_status = 'reaberta'
            then now()
            else null
        end,
        now(),
        auth.uid(),
        auth.uid()
    )
    on conflict (
        registro_id
    )
    do update set
        documento_id = coalesce(
            excluded.documento_id,
            public.dds_conferencias.documento_id
        ),

        status = excluded.status,

        versao =
            public.dds_conferencias.versao + 1,

        estatisticas = excluded.estatisticas,
        leitura_ocr = excluded.leitura_ocr,
        snapshot = excluded.snapshot,

        concluida_em =
            case
                when excluded.status = 'concluida'
                then now()
                else public.dds_conferencias.concluida_em
            end,

        reaberta_em =
            case
                when excluded.status = 'reaberta'
                then now()
                else public.dds_conferencias.reaberta_em
            end,

        ultima_sincronizacao_em = now(),
        atualizado_por = auth.uid(),
        updated_at = now()

    returning id
    into v_conferencia_id;

    delete from public.dds_frequencias
    where conferencia_id = v_conferencia_id;

    for v_item in
        select value
        from jsonb_array_elements(
            v_frequencias
        )
    loop
        v_data_text :=
            coalesce(
                nullif(
                    trim(
                        v_item ->> 'dataReferencia'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'data_referencia'
                    ),
                    ''
                )
            );

        if v_data_text is null
           or v_data_text !~
                '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        then
            continue;
        end if;

        begin
            v_data := v_data_text::date;
        exception
            when others then
                continue;
        end;

        v_numero_text :=
            coalesce(
                nullif(
                    trim(
                        v_item ->> 'participanteNumero'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'participante_numero'
                    ),
                    ''
                ),
                '0'
            );

        if v_numero_text ~ '^[0-9]+$' then
            v_numero := v_numero_text::integer;
        else
            v_numero := 0;
        end if;

        if v_numero <= 0 then
            continue;
        end if;

        v_posicao_text :=
            coalesce(
                nullif(
                    trim(
                        v_item ->> 'diaPosicao'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'dia_posicao'
                    ),
                    ''
                ),
                '0'
            );

        if v_posicao_text ~ '^[0-9]+$' then
            v_posicao := v_posicao_text::integer;
        else
            v_posicao := 0;
        end if;

        if v_posicao < 0
           or v_posicao > 6
        then
            continue;
        end if;

        v_participante_chave :=
            coalesce(
                nullif(
                    trim(
                        v_item ->> 'participanteChave'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'participante_chave'
                    ),
                    ''
                ),
                'numero-' || v_numero::text
            );

        v_colaborador_text :=
            coalesce(
                nullif(
                    trim(
                        v_item ->> 'colaboradorId'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'colaborador_id'
                    ),
                    ''
                )
            );

        if v_colaborador_text ~*
            '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        then
            v_colaborador_id :=
                v_colaborador_text::uuid;
        else
            v_colaborador_id := null;
        end if;

        v_status_frequencia :=
            lower(
                trim(
                    coalesce(
                        v_item ->> 'status',
                        'manual'
                    )
                )
            );

        if v_status_frequencia not in (
            'presente',
            'ausente',
            'manual',
            'nao_analisado'
        ) then
            v_status_frequencia := 'manual';
        end if;

        v_sugestao_ocr :=
            lower(
                trim(
                    coalesce(
                        v_item ->> 'sugestaoOcr',
                        v_item ->> 'sugestao_ocr',
                        'nao_analisado'
                    )
                )
            );

        if v_sugestao_ocr not in (
            'presente',
            'ausente',
            'manual',
            'nao_analisado'
        ) then
            v_sugestao_ocr :=
                'nao_analisado';
        end if;

        v_confianca_text :=
            coalesce(
                nullif(
                    trim(
                        v_item ->> 'confiancaOcr'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'confianca_ocr'
                    ),
                    ''
                )
            );

        if v_confianca_text ~
            '^[0-9]+([.][0-9]+)?$'
        then
            v_confianca :=
                least(
                    1,
                    greatest(
                        0,
                        v_confianca_text::numeric
                    )
                );
        else
            v_confianca := null;
        end if;

        insert into public.dds_frequencias (
            conferencia_id,
            registro_id,
            participante_chave,
            participante_numero,
            colaborador_id,
            participante_nome,
            participante_funcao,
            participante_empresa,
            codigo_safescan,
            participante_origem,
            participante_tipo,
            pagina_impressa,
            linha_impressa,
            data_referencia,
            dia_chave,
            dia_posicao,
            status,
            sugestao_ocr,
            confianca_ocr,
            pagina_ocr,
            celula_ocr,
            confirmado_manualmente,
            divergente_ocr,
            criado_por,
            atualizado_por
        )
        values (
            v_conferencia_id,
            p_registro_id,
            v_participante_chave,
            v_numero,
            v_colaborador_id,

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'participanteNome'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'participante_nome'
                    ),
                    ''
                ),
                'Participante ' || v_numero::text
            ),

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'participanteFuncao'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'participante_funcao'
                    ),
                    ''
                )
            ),

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'participanteEmpresa'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'participante_empresa'
                    ),
                    ''
                )
            ),

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'codigoSafescan'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'codigo_safescan'
                    ),
                    ''
                )
            ),

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'participanteOrigem'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'participante_origem'
                    ),
                    ''
                ),
                'cadastro'
            ),

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'participanteTipo'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'participante_tipo'
                    ),
                    ''
                ),
                'colaborador'
            ),

            case
                when coalesce(
                    v_item ->> 'paginaImpressa',
                    v_item ->> 'pagina_impressa'
                ) ~ '^[0-9]+$'
                then coalesce(
                    v_item ->> 'paginaImpressa',
                    v_item ->> 'pagina_impressa'
                )::integer
                else null
            end,

            case
                when coalesce(
                    v_item ->> 'linhaImpressa',
                    v_item ->> 'linha_impressa'
                ) ~ '^[0-9]+$'
                then coalesce(
                    v_item ->> 'linhaImpressa',
                    v_item ->> 'linha_impressa'
                )::integer
                else null
            end,

            v_data,

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'diaChave'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'dia_chave'
                    ),
                    ''
                ),
                v_posicao::text
            ),

            v_posicao,
            v_status_frequencia,
            v_sugestao_ocr,
            v_confianca,

            case
                when coalesce(
                    v_item ->> 'paginaOcr',
                    v_item ->> 'pagina_ocr'
                ) ~ '^[0-9]+$'
                then coalesce(
                    v_item ->> 'paginaOcr',
                    v_item ->> 'pagina_ocr'
                )::integer
                else null
            end,

            coalesce(
                v_item -> 'celulaOcr',
                v_item -> 'celula_ocr',
                '{}'::jsonb
            ),

            lower(
                coalesce(
                    v_item ->> 'confirmadoManualmente',
                    v_item ->> 'confirmado_manualmente',
                    'true'
                )
            ) in (
                'true',
                '1',
                'sim',
                'yes'
            ),

            lower(
                coalesce(
                    v_item ->> 'divergenteOcr',
                    v_item ->> 'divergente_ocr',
                    'false'
                )
            ) in (
                'true',
                '1',
                'sim',
                'yes'
            ),

            auth.uid(),
            auth.uid()
        );
    end loop;

    delete from public.dds_temas_dias
    where conferencia_id = v_conferencia_id;

    for v_item in
        select value
        from jsonb_array_elements(
            v_temas
        )
    loop
        v_data_text :=
            coalesce(
                nullif(
                    trim(
                        v_item ->> 'dataReferencia'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'data_referencia'
                    ),
                    ''
                )
            );

        if v_data_text is null
           or v_data_text !~
                '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        then
            continue;
        end if;

        begin
            v_data := v_data_text::date;
        exception
            when others then
                continue;
        end;

        v_posicao_text :=
            coalesce(
                nullif(
                    trim(
                        v_item ->> 'diaPosicao'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'dia_posicao'
                    ),
                    ''
                ),
                '0'
            );

        if v_posicao_text ~ '^[0-9]+$' then
            v_posicao := v_posicao_text::integer;
        else
            v_posicao := 0;
        end if;

        if v_posicao < 0
           or v_posicao > 6
        then
            continue;
        end if;

        insert into public.dds_temas_dias (
            conferencia_id,
            registro_id,
            data_referencia,
            dia_chave,
            dia_posicao,
            tema_planejado,
            tema_confirmado,
            responsavel_planejado,
            responsavel_confirmado,
            origem_tema_confirmado,
            sem_atividade,
            criado_por,
            atualizado_por
        )
        values (
            v_conferencia_id,
            p_registro_id,
            v_data,

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'diaChave'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'dia_chave'
                    ),
                    ''
                ),
                v_posicao::text
            ),

            v_posicao,

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'temaPlanejado'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'tema_planejado'
                    ),
                    ''
                )
            ),

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'temaConfirmado'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'tema_confirmado'
                    ),
                    ''
                )
            ),

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'responsavelPlanejado'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'responsavel_planejado'
                    ),
                    ''
                )
            ),

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'responsavelConfirmado'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'responsavel_confirmado'
                    ),
                    ''
                )
            ),

            coalesce(
                nullif(
                    trim(
                        v_item ->> 'origemTemaConfirmado'
                    ),
                    ''
                ),
                nullif(
                    trim(
                        v_item ->> 'origem_tema_confirmado'
                    ),
                    ''
                )
            ),

            lower(
                coalesce(
                    v_item ->> 'semAtividade',
                    v_item ->> 'sem_atividade',
                    'false'
                )
            ) in (
                'true',
                '1',
                'sim',
                'yes'
            ),

            auth.uid(),
            auth.uid()
        );
    end loop;

    insert into public.dds_auditoria (
        registro_id,
        conferencia_id,
        documento_id,
        acao,
        motivo,
        dados,
        usuario_id,
        criado_por,
        atualizado_por
    )
    values (
        p_registro_id,
        v_conferencia_id,
        p_documento_id,

        coalesce(
            nullif(
                trim(
                    p_acao
                ),
                ''
            ),
            'sincronizar_conferencia'
        ),

        nullif(
            trim(
                coalesce(
                    p_motivo,
                    ''
                )
            ),
            ''
        ),

        jsonb_build_object(
            'status',
            v_status,

            'estatisticas',
            coalesce(
                p_estatisticas,
                '{}'::jsonb
            ),

            'quantidadeFrequencias',
            jsonb_array_length(
                v_frequencias
            ),

            'quantidadeTemas',
            jsonb_array_length(
                v_temas
            ),

            'sincronizadoEm',
            now()
        ),

        auth.uid(),
        auth.uid(),
        auth.uid()
    )
    returning id
    into v_auditoria_id;

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id',
                    f.id,

                    'participanteChave',
                    f.participante_chave,

                    'participanteNumero',
                    f.participante_numero,

                    'dataReferencia',
                    to_char(
                        f.data_referencia,
                        'YYYY-MM-DD'
                    ),

                    'status',
                    f.status,

                    'sugestaoOcr',
                    f.sugestao_ocr,

                    'divergenteOcr',
                    f.divergente_ocr
                )
                order by
                    f.participante_numero,
                    f.data_referencia
            ),
            '[]'::jsonb
        )
    into v_resultado_frequencias
    from public.dds_frequencias f
    where f.conferencia_id =
        v_conferencia_id;

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id',
                    t.id,

                    'dataReferencia',
                    to_char(
                        t.data_referencia,
                        'YYYY-MM-DD'
                    ),

                    'diaPosicao',
                    t.dia_posicao,

                    'temaConfirmado',
                    t.tema_confirmado,

                    'responsavelConfirmado',
                    t.responsavel_confirmado,

                    'semAtividade',
                    t.sem_atividade
                )
                order by
                    t.dia_posicao,
                    t.data_referencia
            ),
            '[]'::jsonb
        )
    into v_resultado_temas
    from public.dds_temas_dias t
    where t.conferencia_id =
        v_conferencia_id;

    return jsonb_build_object(
        'ok',
        true,

        'conferenciaId',
        v_conferencia_id,

        'conferencia_id',
        v_conferencia_id,

        'auditoriaId',
        v_auditoria_id,

        'auditoria_id',
        v_auditoria_id,

        'status',
        v_status,

        'frequencias',
        v_resultado_frequencias,

        'temasDias',
        v_resultado_temas,

        'temas_dias',
        v_resultado_temas,

        'sincronizadoEm',
        now()
    );
end;
$function$;

revoke all on function public.sincronizar_conferencia_dds(
    uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb, text, text
) from public;
grant execute on function public.sincronizar_conferencia_dds(
    uuid, uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb, text, text
) to authenticated, service_role;

select pg_notify('pgrst', 'reload schema');

