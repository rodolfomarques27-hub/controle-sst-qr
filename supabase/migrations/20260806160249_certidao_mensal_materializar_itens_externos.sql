begin;

do $verificacoes$
begin
    if to_regclass(
        'public.certidao_mensal_competencias'
    ) is null then
        raise exception
            'Tabela public.certidao_mensal_competencias não localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_itens'
    ) is null then
        raise exception
            'Tabela public.certidao_mensal_itens não localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_auditoria'
    ) is null then
        raise exception
            'Tabela public.certidao_mensal_auditoria não localizada.';
    end if;

    if to_regprocedure(
        'public.certidao_mensal_usuario_pode_acessar_competencia(uuid)'
    ) is null then
        raise exception
            'Função de autorização da competência não localizada.';
    end if;

    if to_regprocedure(
        'public.certidao_mensal_validar_vigencia_contratual(uuid,date,text)'
    ) is null then
        raise exception
            'Função central de vigência contratual não localizada.';
    end if;
end;
$verificacoes$;

create or replace function
    public.materializar_itens_externos_certidao_mensal(
        p_competencia_id uuid
    )
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_competencia
        public.certidao_mensal_competencias%rowtype;

    v_itens_criados integer :=
        0;

    v_itens_disponiveis integer :=
        0;

    v_itens_existentes integer :=
        0;

    v_tipos_invalidos text;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    if p_competencia_id is null then
        raise exception using
            errcode = '22023',
            message = 'A competência é obrigatória.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_competencia(
        p_competencia_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso à competência informada.';
    end if;

    select
        competencia.*
    into
        v_competencia
    from public.certidao_mensal_competencias competencia
    where competencia.id =
        p_competencia_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competência documental não localizada.';
    end if;

    if v_competencia.status =
        'FECHADA'
    then
        raise exception using
            errcode = '55000',
            message = 'A competência fechada não pode receber novos itens.';
    end if;

    perform
        public.certidao_mensal_validar_vigencia_contratual(
            v_competencia.empresa_id,
            v_competencia.competencia,
            'materializar itens externos da competência'
        );

    select
        string_agg(
            item.tipo_documento,
            ', '
            order by item.tipo_documento
        )
    into
        v_tipos_invalidos
    from public.certidao_mensal_itens item
    where item.competencia_id =
            p_competencia_id
      and item.tipo_documento in (
            'cnd-federal',
            'crf-fgts',
            'fgts',
            'cndt-trabalhista',
            'cnd-estadual',
            'cnd-municipal',
            'falencia-concordata',
            'cadastro-tce-ceis'
        )
      and item.origem <>
            'UPLOAD';

    if v_tipos_invalidos is not null then
        raise exception using
            errcode = '55000',
            message =
                'Existem tipos externos gravados com origem incompatível: ' ||
                v_tipos_invalidos ||
                '.';
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
            versao_atual_id,
            snapshot_automatico,
            criado_por,
            atualizado_por
        )
    select
        p_competencia_id,
        documento.tipo_documento,
        documento.titulo,
        'UPLOAD',
        'PENDENTE',
        false,
        'NAO_APLICAVEL',
        null,
        '{}'::jsonb,
        auth.uid(),
        auth.uid()
    from (
        values
            ('cnd-federal', 'CND Federal'),
            ('crf-fgts', 'CRF FGTS'),
            ('fgts', 'FGTS'),
            ('cndt-trabalhista', 'CNDT (Trabalhista)'),
            ('cnd-estadual', 'CND Estadual'),
            ('cnd-municipal', 'CND Municipal'),
            ('falencia-concordata', 'Falência e Concordata'),
            ('cadastro-tce-ceis', 'Cadastro TCE / CEIS')
    ) as documento(
        tipo_documento,
        titulo
    )
    on conflict (
        competencia_id,
        tipo_documento
    )
    do nothing;

    get diagnostics
        v_itens_criados = row_count;

    select
        count(*)
    into
        v_itens_disponiveis
    from public.certidao_mensal_itens item
    where item.competencia_id =
            p_competencia_id
      and item.origem =
            'UPLOAD'
      and item.tipo_documento in (
            'cnd-federal',
            'crf-fgts',
            'fgts',
            'cndt-trabalhista',
            'cnd-estadual',
            'cnd-municipal',
            'falencia-concordata',
            'cadastro-tce-ceis'
        );

    if v_itens_disponiveis <>
        8
    then
        raise exception using
            errcode = '55000',
            message = 'A competência não possui os oito documentos externos esperados.';
    end if;

    v_itens_existentes :=
        v_itens_disponiveis -
        v_itens_criados;

    if v_itens_criados > 0 then
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
            p_competencia_id,
            null,
            null,
            'ITENS_EXTERNOS_MATERIALIZADOS',
            jsonb_build_object(
                'contratoVersao',
                    '1.0',
                'totalDocumentosExternos',
                    8,
                'itensCriados',
                    v_itens_criados,
                'itensExistentes',
                    v_itens_existentes,
                'tiposDocumento',
                    jsonb_build_array(
                        'cnd-federal',
                        'crf-fgts',
                        'fgts',
                        'cndt-trabalhista',
                        'cnd-estadual',
                        'cnd-municipal',
                        'falencia-concordata',
                        'cadastro-tce-ceis'
                    ),
                'materializadoEm',
                    clock_timestamp()
            ),
            auth.uid()
        );
    end if;

    return jsonb_build_object(
        'competenciaId',
            p_competencia_id,
        'totalDocumentosExternos',
            8,
        'itensCriados',
            v_itens_criados,
        'itensExistentes',
            v_itens_existentes,
        'itensDisponiveis',
            v_itens_disponiveis,
        'materializadoEm',
            clock_timestamp()
    );
end;
$function$;

revoke all on function
    public.materializar_itens_externos_certidao_mensal(
        uuid
    )
from public;

grant execute on function
    public.materializar_itens_externos_certidao_mensal(
        uuid
    )
to authenticated;

grant execute on function
    public.materializar_itens_externos_certidao_mensal(
        uuid
    )
to service_role;

comment on function
    public.materializar_itens_externos_certidao_mensal(
        uuid
    )
is
    'Cria de forma idempotente os oito itens externos da competência, pendentes e sem PDF, preservando itens já existentes.';

notify pgrst, 'reload schema';

commit;