-- SafeScan Brasil
-- Certidão Mensal Documental
-- Evidências complementares multi-arquivo
--
-- Objetivo:
-- manter certidao_mensal_versoes como documento principal/histórico
-- e permitir múltiplos PDFs complementares ativos no mesmo item.

create table if not exists
    public.certidao_mensal_evidencias (
        id uuid
            primary key
            default extensions.gen_random_uuid(),

        item_id uuid
            not null
            references public.certidao_mensal_itens(id)
            on delete cascade,

        tipo_evidencia text
            not null,

        bucket_id text
            not null
            default 'certidao-mensal-documentos',

        caminho_storage text
            not null,

        nome_original text
            not null,

        mime_type text
            not null
            default 'application/pdf',

        tamanho_bytes bigint
            not null,

        hash_algoritmo text
            not null
            default 'SHA-256',

        hash_sha256 text
            not null,

        hash_calculado_em timestamptz,

        total_paginas integer,

        diagnostico jsonb
            not null
            default '{}'::jsonb,

        payload jsonb
            not null
            default '{}'::jsonb,

        ativo boolean
            not null
            default true,

        substitui_evidencia_id uuid
            references public.certidao_mensal_evidencias(id)
            on delete set null,

        desativado_em timestamptz,

        desativado_por uuid
            references auth.users(id)
            on delete set null,

        criado_por uuid
            default auth.uid()
            references auth.users(id)
            on delete set null,

        criado_em timestamptz
            not null
            default now(),

        constraint
            certidao_mensal_evidencias_tipo_check
            check (
                tipo_evidencia ~
                '^[A-Z0-9]+(_[A-Z0-9]+)*$'
            ),

        constraint
            certidao_mensal_evidencias_bucket_check
            check (
                bucket_id =
                'certidao-mensal-documentos'
            ),

        constraint
            certidao_mensal_evidencias_caminho_key
            unique (
                caminho_storage
            ),

        constraint
            certidao_mensal_evidencias_mime_check
            check (
                mime_type =
                'application/pdf'
            ),

        constraint
            certidao_mensal_evidencias_tamanho_check
            check (
                tamanho_bytes > 0
                and
                tamanho_bytes <= 26214400
            ),

        constraint
            certidao_mensal_evidencias_hash_algoritmo_check
            check (
                hash_algoritmo =
                'SHA-256'
            ),

        constraint
            certidao_mensal_evidencias_hash_check
            check (
                hash_sha256 ~
                '^[0-9a-fA-F]{64}$'
            ),

        constraint
            certidao_mensal_evidencias_paginas_check
            check (
                total_paginas is null
                or
                total_paginas > 0
            ),

        constraint
            certidao_mensal_evidencias_desativacao_check
            check (
                (
                    ativo = true
                    and
                    desativado_em is null
                    and
                    desativado_por is null
                )
                or
                (
                    ativo = false
                    and
                    desativado_em is not null
                )
            )
    );

create index if not exists
    certidao_mensal_evidencias_item_idx
on
    public.certidao_mensal_evidencias (
        item_id
    );

create index if not exists
    certidao_mensal_evidencias_item_tipo_idx
on
    public.certidao_mensal_evidencias (
        item_id,
        tipo_evidencia
    );

create index if not exists
    certidao_mensal_evidencias_ativas_idx
on
    public.certidao_mensal_evidencias (
        item_id,
        tipo_evidencia,
        criado_em
    )
where
    ativo = true;

create index if not exists
    certidao_mensal_evidencias_hash_idx
on
    public.certidao_mensal_evidencias (
        hash_sha256
    );

alter table
    public.certidao_mensal_evidencias
enable row level security;

drop policy if exists
    certidao_mensal_evidencias_select
on
    public.certidao_mensal_evidencias;

create policy
    certidao_mensal_evidencias_select
on
    public.certidao_mensal_evidencias
for select
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_item(
        item_id
    )
);

drop policy if exists
    certidao_mensal_evidencias_insert
on
    public.certidao_mensal_evidencias;

create policy
    certidao_mensal_evidencias_insert
on
    public.certidao_mensal_evidencias
for insert
to authenticated
with check (
    criado_por = auth.uid()
    and
    public.certidao_mensal_usuario_pode_acessar_item(
        item_id
    )
);

drop policy if exists
    certidao_mensal_evidencias_update
on
    public.certidao_mensal_evidencias;

create policy
    certidao_mensal_evidencias_update
on
    public.certidao_mensal_evidencias
for update
to authenticated
using (
    public.certidao_mensal_usuario_pode_acessar_item(
        item_id
    )
)
with check (
    public.certidao_mensal_usuario_pode_acessar_item(
        item_id
    )
);

revoke all
on
    public.certidao_mensal_evidencias
from
    anon;

grant select, insert, update
on
    public.certidao_mensal_evidencias
to
    authenticated;

create or replace function
    public.salvar_certidao_mensal_evidencia (
        p_item_id uuid,
        p_tipo_evidencia text,
        p_caminho_storage text,
        p_nome_original text,
        p_mime_type text,
        p_tamanho_bytes bigint,
        p_hash_sha256 text,
        p_diagnostico jsonb default '{}'::jsonb,
        p_payload jsonb default '{}'::jsonb,
        p_total_paginas integer default null,
        p_hash_calculado_em timestamptz default null,
        p_evidencia_substituida_id uuid default null
    )
returns jsonb
language plpgsql
set search_path to
    'pg_catalog',
    'public',
    'auth'
as $function$
declare
    v_competencia_id uuid;
    v_empresa_id uuid;
    v_evidencia_id uuid;
    v_tipo_evento text;
    v_evidencia_anterior_tipo text;
    v_evidencia_anterior_ativa boolean;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message =
                'Usuário não autenticado.';
    end if;

    if p_item_id is null
       or
       not public.certidao_mensal_usuario_pode_acessar_item(
            p_item_id
       )
    then
        raise exception using
            errcode = '42501',
            message =
                'Usuário sem acesso ao item documental informado.';
    end if;

    select
        i.competencia_id,
        c.empresa_id
    into
        v_competencia_id,
        v_empresa_id
    from
        public.certidao_mensal_itens i
        inner join
        public.certidao_mensal_competencias c
            on c.id =
                i.competencia_id
    where
        i.id =
            p_item_id;

    if v_competencia_id is null
       or
       v_empresa_id is null
    then
        raise exception using
            errcode = '22023',
            message =
                'Item documental não localizado.';
    end if;

    if coalesce(
        btrim(
            p_tipo_evidencia
        ),
        ''
    ) !~
        '^[A-Z0-9]+(_[A-Z0-9]+)*$'
    then
        raise exception using
            errcode = '22023',
            message =
                'Tipo de evidência inválido.';
    end if;

    if length(
        btrim(
            coalesce(
                p_nome_original,
                ''
            )
        )
    ) = 0 then
        raise exception using
            errcode = '22023',
            message =
                'Nome original da evidência é obrigatório.';
    end if;

    if p_mime_type <>
        'application/pdf'
    then
        raise exception using
            errcode = '22023',
            message =
                'Somente evidências em PDF são permitidas.';
    end if;

    if p_tamanho_bytes <= 0
       or
       p_tamanho_bytes > 26214400
    then
        raise exception using
            errcode = '22023',
            message =
                'Tamanho do PDF de evidência inválido.';
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
            message =
                'Hash SHA-256 da evidência inválido.';
    end if;

    if p_total_paginas is not null
       and
       p_total_paginas <= 0
    then
        raise exception using
            errcode = '22023',
            message =
                'Quantidade de páginas da evidência inválida.';
    end if;

    if split_part(
        coalesce(
            p_caminho_storage,
            ''
        ),
        '/',
        1
    ) <> v_empresa_id::text
    then
        raise exception using
            errcode = '22023',
            message =
                'O caminho da evidência não corresponde à empresa.';
    end if;

    if p_evidencia_substituida_id is not null then
        select
            tipo_evidencia,
            ativo
        into
            v_evidencia_anterior_tipo,
            v_evidencia_anterior_ativa
        from
            public.certidao_mensal_evidencias
        where
            id =
                p_evidencia_substituida_id
            and
            item_id =
                p_item_id
        for update;

        if not found then
            raise exception using
                errcode = '22023',
                message =
                    'A evidência que seria substituída não pertence ao item informado.';
        end if;

        if v_evidencia_anterior_ativa is not true then
            raise exception using
                errcode = '55000',
                message =
                    'A evidência informada já está inativa.';
        end if;

        if v_evidencia_anterior_tipo <>
            p_tipo_evidencia
        then
            raise exception using
                errcode = '22023',
                message =
                    'A evidência substituta deve manter o mesmo tipo da evidência anterior.';
        end if;
    end if;

    insert into
        public.certidao_mensal_evidencias (
            item_id,
            tipo_evidencia,
            bucket_id,
            caminho_storage,
            nome_original,
            mime_type,
            tamanho_bytes,
            hash_algoritmo,
            hash_sha256,
            hash_calculado_em,
            total_paginas,
            diagnostico,
            payload,
            ativo,
            substitui_evidencia_id,
            criado_por
        )
    values (
        p_item_id,
        p_tipo_evidencia,
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
        coalesce(
            p_diagnostico,
            '{}'::jsonb
        ),
        coalesce(
            p_payload,
            '{}'::jsonb
        ),
        true,
        p_evidencia_substituida_id,
        auth.uid()
    )
    returning
        id
    into
        v_evidencia_id;

    if p_evidencia_substituida_id is not null then
        update
            public.certidao_mensal_evidencias
        set
            ativo =
                false,
            desativado_em =
                now(),
            desativado_por =
                auth.uid()
        where
            id =
                p_evidencia_substituida_id
            and
            item_id =
                p_item_id;

        v_tipo_evento :=
            'EVIDENCIA_COMPLEMENTAR_SUBSTITUIDA';
    else
        v_tipo_evento :=
            'EVIDENCIA_COMPLEMENTAR_ADICIONADA';
    end if;

    update
        public.certidao_mensal_itens
    set
        status =
            'EM_ANALISE',
        atualizado_por =
            auth.uid(),
        atualizado_em =
            now()
    where
        id =
            p_item_id;

    update
        public.certidao_mensal_competencias
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
    where
        id =
            v_competencia_id;

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
        p_item_id,
        null,
        v_tipo_evento,
        jsonb_build_object(
            'evidenciaId',
                v_evidencia_id,
            'evidenciaSubstituidaId',
                p_evidencia_substituida_id,
            'tipoEvidencia',
                p_tipo_evidencia,
            'hashSha256',
                lower(
                    p_hash_sha256
                ),
            'caminhoStorage',
                p_caminho_storage,
            'nomeOriginal',
                p_nome_original
        ),
        auth.uid()
    );

    return jsonb_build_object(
        'evidenciaId',
            v_evidencia_id,
        'itemId',
            p_item_id,
        'competenciaId',
            v_competencia_id,
        'tipoEvidencia',
            p_tipo_evidencia,
        'evidenciaSubstituidaId',
            p_evidencia_substituida_id,
        'tipoEvento',
            v_tipo_evento,
        'caminhoStorage',
            p_caminho_storage,
        'ativo',
            true
    );
end;
$function$;

revoke all
on function
    public.salvar_certidao_mensal_evidencia(
        uuid,
        text,
        text,
        text,
        text,
        bigint,
        text,
        jsonb,
        jsonb,
        integer,
        timestamptz,
        uuid
    )
from
    public,
    anon;

grant execute
on function
    public.salvar_certidao_mensal_evidencia(
        uuid,
        text,
        text,
        text,
        text,
        bigint,
        text,
        jsonb,
        jsonb,
        integer,
        timestamptz,
        uuid
    )
to
    authenticated,
    service_role;