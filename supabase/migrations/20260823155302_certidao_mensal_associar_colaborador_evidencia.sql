create or replace function
    public.associar_certidao_mensal_evidencia_colaborador(
        p_evidencia_id uuid,
        p_colaborador_id uuid
    )
returns jsonb
language plpgsql
set search_path to
    'pg_catalog',
    'public',
    'auth'
as $function$
declare
    v_item_id uuid;
    v_competencia_id uuid;
    v_empresa_id uuid;
    v_colaborador_atual_id uuid;
    v_tipo_evidencia text;
    v_nome_original text;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message =
                'Usuário não autenticado.';
    end if;

    if p_evidencia_id is null then
        raise exception using
            errcode = '22023',
            message =
                'Evidência é obrigatória.';
    end if;

    if p_colaborador_id is null then
        raise exception using
            errcode = '22023',
            message =
                'Colaborador é obrigatório.';
    end if;

    select
        e.item_id,
        i.competencia_id,
        c.empresa_id,
        e.colaborador_id,
        e.tipo_evidencia,
        e.nome_original
    into
        v_item_id,
        v_competencia_id,
        v_empresa_id,
        v_colaborador_atual_id,
        v_tipo_evidencia,
        v_nome_original
    from
        public.certidao_mensal_evidencias e
        inner join
        public.certidao_mensal_itens i
            on i.id =
                e.item_id
        inner join
        public.certidao_mensal_competencias c
            on c.id =
                i.competencia_id
    where
        e.id =
            p_evidencia_id
        and
        e.ativo is true
    for update of e;

    if not found then
        raise exception using
            errcode = '22023',
            message =
                'Evidência ativa não localizada.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_item(
        v_item_id
    ) then
        raise exception using
            errcode = '42501',
            message =
                'Usuário sem acesso ao item documental da evidência.';
    end if;

    if v_colaborador_atual_id is not null then
        raise exception using
            errcode = '55000',
            message =
                'A evidência já possui colaborador vinculado.';
    end if;

    if not (
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
    ) then
        raise exception using
            errcode = '22023',
            message =
                'Colaborador não localizado ou sem vínculo atual/histórico conhecido com a empresa da evidência.';
    end if;

    update
        public.certidao_mensal_evidencias
    set
        colaborador_id =
            p_colaborador_id
    where
        id =
            p_evidencia_id
        and
        ativo is true
        and
        colaborador_id is null;

    if not found then
        raise exception using
            errcode = '55000',
            message =
                'A evidência deixou de estar disponível para associação.';
    end if;

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
        null,
        'EVIDENCIA_COMPLEMENTAR_COLABORADOR_ASSOCIADO',
        jsonb_build_object(
            'evidenciaId',
                p_evidencia_id,
            'colaboradorId',
                p_colaborador_id,
            'empresaId',
                v_empresa_id,
            'tipoEvidencia',
                v_tipo_evidencia,
            'nomeOriginal',
                v_nome_original,
            'origem',
                'BACKFILL_UPLOAD_MASSA'
        ),
        auth.uid()
    );

    return jsonb_build_object(
        'evidenciaId',
            p_evidencia_id,
        'itemId',
            v_item_id,
        'competenciaId',
            v_competencia_id,
        'empresaId',
            v_empresa_id,
        'colaboradorId',
            p_colaborador_id,
        'tipoEvidencia',
            v_tipo_evidencia,
        'nomeOriginal',
            v_nome_original,
        'tipoEvento',
            'EVIDENCIA_COMPLEMENTAR_COLABORADOR_ASSOCIADO',
        'alterado',
            true
    );
end;
$function$;

revoke all on function
    public.associar_certidao_mensal_evidencia_colaborador(
        uuid,
        uuid
    )
from public;

grant execute on function
    public.associar_certidao_mensal_evidencia_colaborador(
        uuid,
        uuid
    )
to authenticated;

grant execute on function
    public.associar_certidao_mensal_evidencia_colaborador(
        uuid,
        uuid
    )
to service_role;