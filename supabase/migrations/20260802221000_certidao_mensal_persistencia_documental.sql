-- SafeScan Brasil
-- Persistência documental versionada da Certidão Mensal.
-- Esta migration apenas define a estrutura.
-- Sua presença no repositório não significa que foi aplicada ao Supabase.

do $preflight$
begin
    if to_regclass('public.empresas') is null then
        raise exception
            'Tabela obrigatória public.empresas não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_ativo_sistema()'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_ativo_sistema() não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_empresa(uuid)'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_tem_acesso_empresa(uuid) não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_escopo_empresa_atribuido()'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_tem_escopo_empresa_atribuido() não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_admin_global()'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_admin_global() não localizada.';
    end if;
end;
$preflight$;

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'certidao-mensal-documentos',
    'certidao-mensal-documentos',
    false,
    26214400,
    array[
        'application/pdf'
    ]::text[]
)
on conflict (id) do update
set
    name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists
    public.certidao_mensal_competencias (
        id uuid primary key
            default extensions.gen_random_uuid(),

        empresa_id uuid not null
            references public.empresas(id)
            on delete cascade,

        competencia date not null,

        status text not null
            default 'ABERTA'
            constraint certidao_mensal_competencias_status_check
            check (
                status in (
                    'ABERTA',
                    'EM_CONFERENCIA',
                    'COM_PENDENCIAS',
                    'CONFORME',
                    'FECHADA',
                    'REABERTA'
                )
            ),

        contrato_versao integer not null
            default 1
            constraint certidao_mensal_competencias_contrato_check
            check (contrato_versao > 0),

        resumo jsonb not null
            default '{}'::jsonb,

        criado_por uuid null
            default auth.uid()
            references auth.users(id)
            on delete set null,

        atualizado_por uuid null
            default auth.uid()
            references auth.users(id)
            on delete set null,

        criado_em timestamptz not null
            default now(),

        atualizado_em timestamptz not null
            default now(),

        constraint certidao_mensal_competencias_mes_check
            check (
                competencia =
                    date_trunc(
                        'month',
                        competencia
                    )::date
            ),

        constraint certidao_mensal_competencias_empresa_mes_key
            unique (
                empresa_id,
                competencia
            )
    );

create table if not exists
    public.certidao_mensal_itens (
        id uuid primary key
            default extensions.gen_random_uuid(),

        competencia_id uuid not null
            references public.certidao_mensal_competencias(id)
            on delete cascade,

        tipo_documento text not null,

        titulo text not null,

        origem text not null
            default 'UPLOAD'
            constraint certidao_mensal_itens_origem_check
            check (
                origem in (
                    'UPLOAD',
                    'SISTEMA'
                )
            ),

        status text not null
            default 'PENDENTE'
            constraint certidao_mensal_itens_status_check
            check (
                status in (
                    'PENDENTE',
                    'ENVIADO',
                    'EM_ANALISE',
                    'CONFORME',
                    'NAO_CONFORME',
                    'REENVIO_SOLICITADO',
                    'VENCIDO',
                    'DISPENSADO'
                )
            ),

        requer_consulta_oficial boolean not null
            default false,

        status_consulta_oficial text not null
            default 'NAO_APLICAVEL'
            constraint certidao_mensal_itens_consulta_check
            check (
                status_consulta_oficial in (
                    'NAO_APLICAVEL',
                    'PENDENTE',
                    'CONFIRMADA',
                    'DIVERGENTE'
                )
            ),

        versao_atual_id uuid null,

        criado_por uuid null
            default auth.uid()
            references auth.users(id)
            on delete set null,

        atualizado_por uuid null
            default auth.uid()
            references auth.users(id)
            on delete set null,

        criado_em timestamptz not null
            default now(),

        atualizado_em timestamptz not null
            default now(),

        constraint certidao_mensal_itens_tipo_check
            check (
                tipo_documento ~
                    '^[a-z0-9]+(-[a-z0-9]+)*$'
            ),

        constraint certidao_mensal_itens_competencia_tipo_key
            unique (
                competencia_id,
                tipo_documento
            )
    );

create table if not exists
    public.certidao_mensal_versoes (
        id uuid primary key
            default extensions.gen_random_uuid(),

        item_id uuid not null
            references public.certidao_mensal_itens(id)
            on delete cascade,

        numero_versao integer not null
            constraint certidao_mensal_versoes_numero_check
            check (numero_versao > 0),

        bucket_id text not null
            default 'certidao-mensal-documentos'
            constraint certidao_mensal_versoes_bucket_check
            check (
                bucket_id =
                    'certidao-mensal-documentos'
            ),

        caminho_storage text not null,

        nome_original text not null,

        mime_type text not null
            default 'application/pdf'
            constraint certidao_mensal_versoes_mime_check
            check (
                mime_type =
                    'application/pdf'
            ),

        tamanho_bytes bigint not null
            constraint certidao_mensal_versoes_tamanho_check
            check (
                tamanho_bytes > 0
                and tamanho_bytes <= 26214400
            ),

        hash_algoritmo text not null
            default 'SHA-256'
            constraint certidao_mensal_versoes_hash_algoritmo_check
            check (
                hash_algoritmo =
                    'SHA-256'
            ),

        hash_sha256 text not null
            constraint certidao_mensal_versoes_hash_check
            check (
                hash_sha256 ~
                    '^[0-9a-fA-F]{64}$'
            ),

        hash_calculado_em timestamptz null,

        total_paginas integer null
            constraint certidao_mensal_versoes_paginas_check
            check (
                total_paginas is null
                or total_paginas > 0
            ),

        status_resultado text not null
            default 'EM_ANALISE'
            constraint certidao_mensal_versoes_status_check
            check (
                status_resultado in (
                    'PENDENTE',
                    'ENVIADO',
                    'EM_ANALISE',
                    'CONFORME',
                    'NAO_CONFORME',
                    'REENVIO_SOLICITADO',
                    'VENCIDO',
                    'DISPENSADO'
                )
            ),

        diagnostico jsonb not null
            default '{}'::jsonb,

        payload jsonb not null
            default '{}'::jsonb,

        criado_por uuid null
            default auth.uid()
            references auth.users(id)
            on delete set null,

        criado_em timestamptz not null
            default now(),

        constraint certidao_mensal_versoes_item_numero_key
            unique (
                item_id,
                numero_versao
            ),

        constraint certidao_mensal_versoes_caminho_key
            unique (
                caminho_storage
            ),

        constraint certidao_mensal_versoes_id_item_key
            unique (
                id,
                item_id
            )
    );

alter table public.certidao_mensal_itens
    drop constraint if exists
        certidao_mensal_itens_versao_atual_fk;

alter table public.certidao_mensal_itens
    add constraint
        certidao_mensal_itens_versao_atual_fk
    foreign key (
        versao_atual_id,
        id
    )
    references public.certidao_mensal_versoes (
        id,
        item_id
    )
    on delete set null (versao_atual_id);

create table if not exists
    public.certidao_mensal_auditoria (
        id uuid primary key
            default extensions.gen_random_uuid(),

        competencia_id uuid not null
            references public.certidao_mensal_competencias(id)
            on delete cascade,

        item_id uuid null
            references public.certidao_mensal_itens(id)
            on delete set null,

        versao_id uuid null
            references public.certidao_mensal_versoes(id)
            on delete set null,

        tipo_evento text not null,

        dados jsonb not null
            default '{}'::jsonb,

        usuario_id uuid null
            default auth.uid()
            references auth.users(id)
            on delete set null,

        criado_em timestamptz not null
            default now(),

        constraint certidao_mensal_auditoria_evento_check
            check (
                length(
                    btrim(
                        tipo_evento
                    )
                ) > 0
            )
    );

create index if not exists
    certidao_mensal_competencias_empresa_idx
on public.certidao_mensal_competencias (
    empresa_id,
    competencia desc
);

create index if not exists
    certidao_mensal_itens_competencia_idx
on public.certidao_mensal_itens (
    competencia_id,
    tipo_documento
);

create index if not exists
    certidao_mensal_versoes_item_idx
on public.certidao_mensal_versoes (
    item_id,
    numero_versao desc
);

create index if not exists
    certidao_mensal_versoes_hash_idx
on public.certidao_mensal_versoes (
    hash_sha256
);

create index if not exists
    certidao_mensal_auditoria_competencia_idx
on public.certidao_mensal_auditoria (
    competencia_id,
    criado_em desc
);

create or replace function
    public.certidao_mensal_atualizar_timestamp()
returns trigger
language plpgsql
set search_path = pg_catalog, public, auth
as $function$
begin
    new.atualizado_em := now();

    new.atualizado_por := coalesce(
        auth.uid(),
        new.atualizado_por,
        old.atualizado_por
    );

    return new;
end;
$function$;

drop trigger if exists
    trg_certidao_mensal_competencias_timestamp
on public.certidao_mensal_competencias;

create trigger
    trg_certidao_mensal_competencias_timestamp
before update
on public.certidao_mensal_competencias
for each row
execute function
    public.certidao_mensal_atualizar_timestamp();

drop trigger if exists
    trg_certidao_mensal_itens_timestamp
on public.certidao_mensal_itens;

create trigger
    trg_certidao_mensal_itens_timestamp
before update
on public.certidao_mensal_itens
for each row
execute function
    public.certidao_mensal_atualizar_timestamp();

create or replace function
    public.certidao_mensal_usuario_pode_acessar_empresa(
        p_empresa_id uuid
    )
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
    select
        auth.uid() is not null
        and public.usuario_ativo_sistema()
        and (
            not public.usuario_tem_escopo_empresa_atribuido()
            or public.usuario_admin_global()
            or (
                p_empresa_id is not null
                and public.usuario_tem_acesso_empresa(
                    p_empresa_id
                )
            )
        );
$function$;

create or replace function
    public.certidao_mensal_usuario_pode_acessar_competencia(
        p_competencia_id uuid
    )
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
    select exists (
        select 1
        from public.certidao_mensal_competencias c
        where c.id = p_competencia_id
          and public.certidao_mensal_usuario_pode_acessar_empresa(
                c.empresa_id
          )
    );
$function$;

create or replace function
    public.certidao_mensal_usuario_pode_acessar_item(
        p_item_id uuid
    )
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
    select exists (
        select 1
        from public.certidao_mensal_itens i
        where i.id = p_item_id
          and public.certidao_mensal_usuario_pode_acessar_competencia(
                i.competencia_id
          )
    );
$function$;

create or replace function
    public.certidao_mensal_caminho_acessivel(
        p_nome text
    )
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
    v_empresa_texto text;
    v_empresa_id uuid;
begin
    if auth.uid() is null then
        return false;
    end if;

    v_empresa_texto :=
        split_part(
            coalesce(
                p_nome,
                ''
            ),
            '/',
            1
        );

    if v_empresa_texto !~
        '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then
        return false;
    end if;

    v_empresa_id :=
        v_empresa_texto::uuid;

    return
        public.certidao_mensal_usuario_pode_acessar_empresa(
            v_empresa_id
        );
exception
    when others then
        return false;
end;
$function$;

alter table
    public.certidao_mensal_competencias
enable row level security;

alter table
    public.certidao_mensal_itens
enable row level security;

alter table
    public.certidao_mensal_versoes
enable row level security;

alter table
    public.certidao_mensal_auditoria
enable row level security;

drop policy if exists
    certidao_mensal_competencias_select
on public.certidao_mensal_competencias;

create policy
    certidao_mensal_competencias_select
on public.certidao_mensal_competencias
for select
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_empresa(
        empresa_id
    )
);

drop policy if exists
    certidao_mensal_competencias_insert
on public.certidao_mensal_competencias;

create policy
    certidao_mensal_competencias_insert
on public.certidao_mensal_competencias
for insert
to authenticated
with check (
    criado_por = auth.uid()
    and public.certidao_mensal_usuario_pode_acessar_empresa(
        empresa_id
    )
);

drop policy if exists
    certidao_mensal_competencias_update
on public.certidao_mensal_competencias;

create policy
    certidao_mensal_competencias_update
on public.certidao_mensal_competencias
for update
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_empresa(
        empresa_id
    )
)
with check (
    public.certidao_mensal_usuario_pode_acessar_empresa(
        empresa_id
    )
);

drop policy if exists
    certidao_mensal_competencias_delete
on public.certidao_mensal_competencias;

create policy
    certidao_mensal_competencias_delete
on public.certidao_mensal_competencias
for delete
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_empresa(
        empresa_id
    )
);

drop policy if exists
    certidao_mensal_itens_select
on public.certidao_mensal_itens;

create policy
    certidao_mensal_itens_select
on public.certidao_mensal_itens
for select
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_competencia(
        competencia_id
    )
);

drop policy if exists
    certidao_mensal_itens_insert
on public.certidao_mensal_itens;

create policy
    certidao_mensal_itens_insert
on public.certidao_mensal_itens
for insert
to authenticated
with check (
    criado_por = auth.uid()
    and public.certidao_mensal_usuario_pode_acessar_competencia(
        competencia_id
    )
);

drop policy if exists
    certidao_mensal_itens_update
on public.certidao_mensal_itens;

create policy
    certidao_mensal_itens_update
on public.certidao_mensal_itens
for update
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_competencia(
        competencia_id
    )
)
with check (
    public.certidao_mensal_usuario_pode_acessar_competencia(
        competencia_id
    )
);

drop policy if exists
    certidao_mensal_itens_delete
on public.certidao_mensal_itens;

create policy
    certidao_mensal_itens_delete
on public.certidao_mensal_itens
for delete
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_competencia(
        competencia_id
    )
);

drop policy if exists
    certidao_mensal_versoes_select
on public.certidao_mensal_versoes;

create policy
    certidao_mensal_versoes_select
on public.certidao_mensal_versoes
for select
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_item(
        item_id
    )
);

drop policy if exists
    certidao_mensal_versoes_insert
on public.certidao_mensal_versoes;

create policy
    certidao_mensal_versoes_insert
on public.certidao_mensal_versoes
for insert
to authenticated
with check (
    criado_por = auth.uid()
    and public.certidao_mensal_usuario_pode_acessar_item(
        item_id
    )
);

drop policy if exists
    certidao_mensal_auditoria_select
on public.certidao_mensal_auditoria;

create policy
    certidao_mensal_auditoria_select
on public.certidao_mensal_auditoria
for select
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_competencia(
        competencia_id
    )
);

drop policy if exists
    certidao_mensal_auditoria_insert
on public.certidao_mensal_auditoria;

create policy
    certidao_mensal_auditoria_insert
on public.certidao_mensal_auditoria
for insert
to authenticated
with check (
    usuario_id = auth.uid()
    and public.certidao_mensal_usuario_pode_acessar_competencia(
        competencia_id
    )
);

drop policy if exists
    certidao_mensal_storage_select
on storage.objects;

create policy
    certidao_mensal_storage_select
on storage.objects
for select
to authenticated
using (
    bucket_id =
        'certidao-mensal-documentos'
    and public.certidao_mensal_caminho_acessivel(
        name
    )
);

drop policy if exists
    certidao_mensal_storage_insert
on storage.objects;

create policy
    certidao_mensal_storage_insert
on storage.objects
for insert
to authenticated
with check (
    bucket_id =
        'certidao-mensal-documentos'
    and owner_id =
        auth.uid()::text
    and public.certidao_mensal_caminho_acessivel(
        name
    )
);

drop policy if exists
    certidao_mensal_storage_delete
on storage.objects;

create policy
    certidao_mensal_storage_delete
on storage.objects
for delete
to authenticated
using (
    bucket_id =
        'certidao-mensal-documentos'
    and public.certidao_mensal_caminho_acessivel(
        name
    )
);

create or replace function
    public.salvar_certidao_mensal_documento(
        p_empresa_id uuid,
        p_competencia date,
        p_tipo_documento text,
        p_titulo text,
        p_caminho_storage text,
        p_nome_original text,
        p_mime_type text,
        p_tamanho_bytes bigint,
        p_hash_sha256 text,
        p_diagnostico jsonb default '{}'::jsonb,
        p_payload jsonb default '{}'::jsonb,
        p_requer_consulta_oficial boolean default false,
        p_status_consulta_oficial text default 'NAO_APLICAVEL',
        p_status_item text default 'EM_ANALISE',
        p_total_paginas integer default null,
        p_hash_calculado_em timestamptz default null,
        p_contrato_versao integer default 1
    )
returns jsonb
language plpgsql
set search_path = pg_catalog, public, auth
as $function$
declare
    v_competencia_id uuid;
    v_status_competencia text;
    v_item_id uuid;
    v_versao_anterior_id uuid;
    v_versao_id uuid;
    v_numero_versao integer;
    v_tipo_evento text;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_empresa(
        p_empresa_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso à empresa informada.';
    end if;

    if p_competencia is null
       or p_competencia <>
            date_trunc(
                'month',
                p_competencia
            )::date
    then
        raise exception using
            errcode = '22023',
            message = 'A competência deve representar o primeiro dia do mês.';
    end if;

    if coalesce(
        btrim(
            p_tipo_documento
        ),
        ''
    ) !~
        '^[a-z0-9]+(-[a-z0-9]+)*$'
    then
        raise exception using
            errcode = '22023',
            message = 'Tipo documental inválido.';
    end if;

    if length(
        btrim(
            coalesce(
                p_titulo,
                ''
            )
        )
    ) = 0 then
        raise exception using
            errcode = '22023',
            message = 'Título documental obrigatório.';
    end if;

    if p_mime_type <>
        'application/pdf'
    then
        raise exception using
            errcode = '22023',
            message = 'Somente arquivos PDF são permitidos.';
    end if;

    if p_tamanho_bytes <= 0
       or p_tamanho_bytes > 26214400
    then
        raise exception using
            errcode = '22023',
            message = 'Tamanho do PDF inválido.';
    end if;

    if lower(
        coalesce(
            p_hash_sha256,
            ''
        )
    ) !~
        '^[0-9a-f]{64}$'
    then
        raise exception using
            errcode = '22023',
            message = 'Hash SHA-256 inválido.';
    end if;

    if split_part(
        coalesce(
            p_caminho_storage,
            ''
        ),
        '/',
        1
    ) <> p_empresa_id::text
    then
        raise exception using
            errcode = '22023',
            message = 'O caminho do arquivo não corresponde à empresa.';
    end if;

    if p_status_item not in (
        'PENDENTE',
        'ENVIADO',
        'EM_ANALISE',
        'CONFORME',
        'NAO_CONFORME',
        'REENVIO_SOLICITADO',
        'VENCIDO',
        'DISPENSADO'
    ) then
        raise exception using
            errcode = '22023',
            message = 'Status documental inválido.';
    end if;

    if p_status_consulta_oficial not in (
        'NAO_APLICAVEL',
        'PENDENTE',
        'CONFIRMADA',
        'DIVERGENTE'
    ) then
        raise exception using
            errcode = '22023',
            message = 'Status da consulta oficial inválido.';
    end if;

    insert into
        public.certidao_mensal_competencias (
            empresa_id,
            competencia,
            status,
            contrato_versao,
            criado_por,
            atualizado_por
        )
    values (
        p_empresa_id,
        p_competencia,
        'ABERTA',
        greatest(
            coalesce(
                p_contrato_versao,
                1
            ),
            1
        ),
        auth.uid(),
        auth.uid()
    )
    on conflict (
        empresa_id,
        competencia
    )
    do update
    set
        contrato_versao =
            greatest(
                public.certidao_mensal_competencias
                    .contrato_versao,
                excluded.contrato_versao
            ),
        atualizado_por =
            auth.uid(),
        atualizado_em =
            now()
    returning
        id,
        status
    into
        v_competencia_id,
        v_status_competencia;

    if v_status_competencia =
        'FECHADA'
    then
        raise exception using
            errcode = '55000',
            message = 'A competência está fechada e precisa ser reaberta antes de receber documentos.';
    end if;

    insert into
        public.certidao_mensal_itens (
            competencia_id,
            tipo_documento,
            titulo,
            origem,
            status,
            requer_consulta_oficial,
            status_consulta_oficial,
            criado_por,
            atualizado_por
        )
    values (
        v_competencia_id,
        p_tipo_documento,
        p_titulo,
        'UPLOAD',
        p_status_item,
        coalesce(
            p_requer_consulta_oficial,
            false
        ),
        p_status_consulta_oficial,
        auth.uid(),
        auth.uid()
    )
    on conflict (
        competencia_id,
        tipo_documento
    )
    do update
    set
        titulo =
            excluded.titulo,
        origem =
            'UPLOAD',
        status =
            excluded.status,
        requer_consulta_oficial =
            excluded.requer_consulta_oficial,
        status_consulta_oficial =
            excluded.status_consulta_oficial,
        atualizado_por =
            auth.uid(),
        atualizado_em =
            now()
    returning
        id
    into
        v_item_id;

    select
        versao_atual_id
    into
        v_versao_anterior_id
    from public.certidao_mensal_itens
    where id = v_item_id
    for update;

    select
        coalesce(
            max(
                numero_versao
            ),
            0
        ) + 1
    into
        v_numero_versao
    from public.certidao_mensal_versoes
    where item_id = v_item_id;

    insert into
        public.certidao_mensal_versoes (
            item_id,
            numero_versao,
            bucket_id,
            caminho_storage,
            nome_original,
            mime_type,
            tamanho_bytes,
            hash_algoritmo,
            hash_sha256,
            hash_calculado_em,
            total_paginas,
            status_resultado,
            diagnostico,
            payload,
            criado_por
        )
    values (
        v_item_id,
        v_numero_versao,
        'certidao-mensal-documentos',
        p_caminho_storage,
        p_nome_original,
        p_mime_type,
        p_tamanho_bytes,
        'SHA-256',
        lower(
            p_hash_sha256
        ),
        p_hash_calculado_em,
        p_total_paginas,
        p_status_item,
        coalesce(
            p_diagnostico,
            '{}'::jsonb
        ),
        coalesce(
            p_payload,
            '{}'::jsonb
        ),
        auth.uid()
    )
    returning
        id
    into
        v_versao_id;

    update public.certidao_mensal_itens
    set
        versao_atual_id =
            v_versao_id,
        status =
            p_status_item,
        requer_consulta_oficial =
            coalesce(
                p_requer_consulta_oficial,
                false
            ),
        status_consulta_oficial =
            p_status_consulta_oficial,
        atualizado_por =
            auth.uid(),
        atualizado_em =
            now()
    where id =
        v_item_id;

    update public.certidao_mensal_competencias
    set
        status =
            case
                when status =
                    'REABERTA'
                then 'REABERTA'
                else 'EM_CONFERENCIA'
            end,
        atualizado_por =
            auth.uid(),
        atualizado_em =
            now()
    where id =
        v_competencia_id;

    v_tipo_evento :=
        case
            when v_versao_anterior_id is null
            then 'DOCUMENTO_ENVIADO'
            else 'DOCUMENTO_SUBSTITUIDO'
        end;

    insert into
        public.certidao_mensal_auditoria (
            competencia_id,
            item_id,
            versao_id,
            tipo_evento,
            dados,
            usuario_id
        )
    values (
        v_competencia_id,
        v_item_id,
        v_versao_id,
        v_tipo_evento,
        jsonb_build_object(
            'empresaId',
                p_empresa_id,
            'competencia',
                p_competencia,
            'tipoDocumento',
                p_tipo_documento,
            'numeroVersao',
                v_numero_versao,
            'versaoAnteriorId',
                v_versao_anterior_id,
            'hashSha256',
                lower(
                    p_hash_sha256
                ),
            'caminhoStorage',
                p_caminho_storage
        ),
        auth.uid()
    );

    return jsonb_build_object(
        'competenciaId',
            v_competencia_id,
        'itemId',
            v_item_id,
        'versaoId',
            v_versao_id,
        'numeroVersao',
            v_numero_versao,
        'versaoAnteriorId',
            v_versao_anterior_id,
        'tipoEvento',
            v_tipo_evento,
        'caminhoStorage',
            p_caminho_storage
    );
end;
$function$;

revoke all
on table
    public.certidao_mensal_competencias,
    public.certidao_mensal_itens,
    public.certidao_mensal_versoes,
    public.certidao_mensal_auditoria
from public, anon, authenticated;

grant
    select,
    insert,
    update,
    delete
on table
    public.certidao_mensal_competencias,
    public.certidao_mensal_itens
to authenticated;

grant
    select,
    insert
on table
    public.certidao_mensal_versoes,
    public.certidao_mensal_auditoria
to authenticated;

grant all
on table
    public.certidao_mensal_competencias,
    public.certidao_mensal_itens,
    public.certidao_mensal_versoes,
    public.certidao_mensal_auditoria
to service_role;

revoke all
on function
    public.certidao_mensal_atualizar_timestamp(),
    public.certidao_mensal_usuario_pode_acessar_empresa(uuid),
    public.certidao_mensal_usuario_pode_acessar_competencia(uuid),
    public.certidao_mensal_usuario_pode_acessar_item(uuid),
    public.certidao_mensal_caminho_acessivel(text),
    public.salvar_certidao_mensal_documento(
        uuid,
        date,
        text,
        text,
        text,
        text,
        text,
        bigint,
        text,
        jsonb,
        jsonb,
        boolean,
        text,
        text,
        integer,
        timestamptz,
        integer
    )
from public, anon;

grant execute
on function
    public.certidao_mensal_usuario_pode_acessar_empresa(uuid),
    public.certidao_mensal_usuario_pode_acessar_competencia(uuid),
    public.certidao_mensal_usuario_pode_acessar_item(uuid),
    public.certidao_mensal_caminho_acessivel(text),
    public.salvar_certidao_mensal_documento(
        uuid,
        date,
        text,
        text,
        text,
        text,
        text,
        bigint,
        text,
        jsonb,
        jsonb,
        boolean,
        text,
        text,
        integer,
        timestamptz,
        integer
    )
to authenticated, service_role;

grant execute
on function
    public.certidao_mensal_atualizar_timestamp()
to service_role;

comment on table
    public.certidao_mensal_competencias
is
    'Competências mensais documentais segregadas por empresa.';

comment on table
    public.certidao_mensal_itens
is
    'Itens documentais exigidos em cada competência mensal.';

comment on table
    public.certidao_mensal_versoes
is
    'Histórico permanente e imutável dos PDFs enviados.';

comment on table
    public.certidao_mensal_auditoria
is
    'Eventos de auditoria da Certidão Mensal Documental.';

comment on function
    public.salvar_certidao_mensal_documento(
        uuid,
        date,
        text,
        text,
        text,
        text,
        text,
        bigint,
        text,
        jsonb,
        jsonb,
        boolean,
        text,
        text,
        integer,
        timestamptz,
        integer
    )
is
    'Registra atomicamente a competência, o item, a nova versão documental e a auditoria.';
