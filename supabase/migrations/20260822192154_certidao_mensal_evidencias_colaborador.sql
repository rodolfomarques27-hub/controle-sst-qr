begin;

do $preflight$
begin
    if to_regclass(
        'public.certidao_mensal_evidencias'
    ) is null then
        raise exception
            'Tabela certidao_mensal_evidencias não localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_itens'
    ) is null then
        raise exception
            'Tabela certidao_mensal_itens não localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_competencias'
    ) is null then
        raise exception
            'Tabela certidao_mensal_competencias não localizada.';
    end if;

    if to_regclass(
        'public.colaboradores'
    ) is null then
        raise exception
            'Tabela colaboradores não localizada.';
    end if;

    if to_regclass(
        'public.colaboradores_movimentacoes'
    ) is null then
        raise exception
            'Tabela colaboradores_movimentacoes não localizada.';
    end if;

    if to_regprocedure(
        'public.salvar_certidao_mensal_evidencia(uuid,text,text,text,text,bigint,text,jsonb,jsonb,integer,timestamptz,uuid)'
    ) is null then
        raise exception
            'Assinatura atual do RPC salvar_certidao_mensal_evidencia não localizada.';
    end if;
end;
$preflight$;

alter table
    public.certidao_mensal_evidencias
add column if not exists
    colaborador_id uuid null;

do $constraint$
begin
    if not exists (
        select
            1
        from
            pg_constraint
        where
            conrelid =
                'public.certidao_mensal_evidencias'::regclass
            and
            conname =
                'certidao_mensal_evidencias_colaborador_fk'
    ) then
        alter table
            public.certidao_mensal_evidencias
        add constraint
            certidao_mensal_evidencias_colaborador_fk
        foreign key (
            colaborador_id
        )
        references
            public.colaboradores(id)
        on delete restrict;
    end if;
end;
$constraint$;

comment on column
    public.certidao_mensal_evidencias.colaborador_id
is
    'Colaborador cadastrado associado à evidência individual. NULL para evidências empresariais ou legadas sem vínculo individual.';

create index if not exists
    idx_certidao_mensal_evidencias_colaborador_ativo
on
    public.certidao_mensal_evidencias (
        colaborador_id,
        criado_em desc
    )
where
    colaborador_id is not null
    and ativo = true;

create or replace function
    public.validar_colaborador_evidencia_certidao_mensal()
returns trigger
language plpgsql
security definer
set search_path =
    pg_catalog,
    public
as $function$
declare
    v_empresa_id uuid;
begin
    if new.colaborador_id is null then
        return new;
    end if;

    select
        c.empresa_id
    into
        v_empresa_id
    from
        public.certidao_mensal_itens i
        inner join
        public.certidao_mensal_competencias c
            on c.id =
                i.competencia_id
    where
        i.id =
            new.item_id;

    if v_empresa_id is null then
        raise exception using
            errcode = '22023',
            message =
                'Não foi possível determinar a empresa do item documental.';
    end if;

    if not (
        exists (
            select
                1
            from
                public.colaboradores c
            where
                c.id =
                    new.colaborador_id
                and
                c.empresa_id =
                    v_empresa_id
        )
        or
        exists (
            select
                1
            from
                public.colaboradores_movimentacoes m
            where
                m.colaborador_id =
                    new.colaborador_id
                and
                m.empresa_id =
                    v_empresa_id
        )
    ) then
        raise exception using
            errcode = '22023',
            message =
                'Colaborador não localizado ou sem vínculo atual/histórico conhecido com a empresa do item documental.';
    end if;

    return new;
end;
$function$;

revoke all
on function
    public.validar_colaborador_evidencia_certidao_mensal()
from
    public,
    anon;

grant execute
on function
    public.validar_colaborador_evidencia_certidao_mensal()
to
    authenticated,
    service_role;

drop trigger if exists
    trg_validar_colaborador_evidencia_certidao_mensal
on
    public.certidao_mensal_evidencias;

create trigger
    trg_validar_colaborador_evidencia_certidao_mensal
before insert or update
on
    public.certidao_mensal_evidencias
for each row
execute function
    public.validar_colaborador_evidencia_certidao_mensal();

drop function if exists
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
);

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
        p_evidencia_substituida_id uuid default null,
        p_colaborador_id uuid default null
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
    v_evidencia_anterior_colaborador_id uuid;
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

    if p_colaborador_id is not null
       and not (
            exists (
                select
                    1
                from
                    public.colaboradores c
                where
                    c.id =
                        p_colaborador_id
                    and
                    c.empresa_id =
                        v_empresa_id
            )
            or
            exists (
                select
                    1
                from
                    public.colaboradores_movimentacoes m
                where
                    m.colaborador_id =
                        p_colaborador_id
                    and
                    m.empresa_id =
                        v_empresa_id
            )
       )
    then
        raise exception using
            errcode = '22023',
            message =
                'Colaborador não localizado ou sem vínculo atual/histórico conhecido com a empresa do item.';
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
            ativo,
            colaborador_id
        into
            v_evidencia_anterior_tipo,
            v_evidencia_anterior_ativa,
            v_evidencia_anterior_colaborador_id
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

        if v_evidencia_anterior_colaborador_id is not null
           and
           v_evidencia_anterior_colaborador_id
                is distinct from
                p_colaborador_id
        then
            raise exception using
                errcode = '22023',
                message =
                    'A substituição deve preservar o colaborador já vinculado à evidência.';
        end if;
    end if;

    insert into
        public.certidao_mensal_evidencias (
            item_id,
            colaborador_id,
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
        p_colaborador_id,
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
            'colaboradorId',
                p_colaborador_id,
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
        'colaboradorId',
            p_colaborador_id,
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
    uuid,
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
    uuid,
    uuid
)
to
    authenticated,
    service_role;

commit;