do $preflight$
begin
    if to_regclass('public.certidao_mensal_perfil_documental_regras') is null then
        raise exception 'Tabela certidao_mensal_perfil_documental_regras não localizada.';
    end if;

    if to_regclass('public.certidao_mensal_itens') is null then
        raise exception 'Tabela certidao_mensal_itens não localizada.';
    end if;

    if to_regprocedure('public.materializar_itens_externos_certidao_mensal(uuid)') is null then
        raise exception 'RPC de materialização não localizada.';
    end if;

    if to_regprocedure('public.admin_salvar_regra_perfil_documental_certidao_mensal(uuid,text,boolean,date,text)') is null then
        raise exception 'RPC administrativa do perfil documental não localizada.';
    end if;
end;
$preflight$;

alter table public.certidao_mensal_perfil_documental_regras
drop constraint if exists certidao_mensal_perfil_documental_tipo_check;

alter table public.certidao_mensal_perfil_documental_regras
add constraint certidao_mensal_perfil_documental_tipo_check
check (
    tipo_documento in (
        'cnd-federal',
        'cnd-estadual',
        'cnd-municipal',
        'crf-fgts',
        'fgts',
        'cndt-trabalhista',
        'ceat-trt',
        'falencia-concordata',
        'cadastro-tce-ceis',
        'folha-pagamento',
        'folha-ponto',
        'va-vt',
        'seguro-vida',
        'inss-dctfweb',
        'iss',
        'esocial',
        'relacao-empregados',
        'aso-pcmso'
    )
);

comment on constraint certidao_mensal_perfil_documental_tipo_check
on public.certidao_mensal_perfil_documental_regras
is 'Catálogo oficial CERT2: 18 grupos documentais, 16 externos e 2 automáticos. CEAT/TRT é independente da CNDT.';

create or replace function public.admin_salvar_regra_perfil_documental_certidao_mensal(
    p_empresa_id uuid,
    p_tipo_documento text,
    p_exigido boolean,
    p_competencia_inicio date,
    p_motivo text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
    v_tipo_documento text;
    v_motivo text;

    v_proxima_regra_inicio date;
    v_competencia_fechada date;

    v_regra
        public.certidao_mensal_perfil_documental_regras%rowtype;
begin
    if not public.certidao_mensal_usuario_pode_gerenciar_perfil_documental() then
        raise exception
            'Sem permissao para alterar exigencias documentais da Certidao Mensal.'
            using errcode = '42501';
    end if;

    if p_empresa_id is null then
        raise exception
            'Empresa obrigatoria para configuracao documental.'
            using errcode = '22004';
    end if;

    if not exists (
        select 1
        from public.empresas empresa
        where empresa.id = p_empresa_id
    ) then
        raise exception
            'Empresa nao localizada para configuracao documental.'
            using errcode = 'P0002';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_empresa(
        p_empresa_id
    ) then
        raise exception
            'Sem permissao para alterar o perfil documental desta empresa.'
            using errcode = '42501';
    end if;

    v_tipo_documento :=
        lower(
            btrim(
                coalesce(
                    p_tipo_documento,
                    ''
                )
            )
        );

    if v_tipo_documento not in (
        'cnd-federal',
        'cnd-estadual',
        'cnd-municipal',
        'crf-fgts',
        'fgts',
        'cndt-trabalhista',
        'ceat-trt',
        'falencia-concordata',
        'cadastro-tce-ceis',
        'folha-pagamento',
        'folha-ponto',
        'va-vt',
        'seguro-vida',
        'inss-dctfweb',
        'iss',
        'esocial',
        'relacao-empregados',
        'aso-pcmso'
    ) then
        raise exception
            'Tipo documental nao pertence ao catalogo oficial da Certidao Mensal.'
            using errcode = '22023';
    end if;

    if p_exigido is null then
        raise exception
            'O estado de exigibilidade deve ser informado.'
            using errcode = '22004';
    end if;

    if p_competencia_inicio is null then
        raise exception
            'Competencia inicial obrigatoria.'
            using errcode = '22004';
    end if;

    if p_competencia_inicio <>
        date_trunc(
            'month',
            p_competencia_inicio
        )::date
    then
        raise exception
            'A competencia inicial deve utilizar o primeiro dia do mes.'
            using errcode = '22023';
    end if;

    v_motivo :=
        nullif(
            btrim(
                coalesce(
                    p_motivo,
                    ''
                )
            ),
            ''
        );

    if char_length(
        coalesce(
            v_motivo,
            ''
        )
    ) > 500 then
        raise exception
            'O motivo deve ter no maximo 500 caracteres.'
            using errcode = '22001';
    end if;

    select
        min(
            regra.competencia_inicio
        )
    into
        v_proxima_regra_inicio
    from
        public.certidao_mensal_perfil_documental_regras regra
    where
        regra.empresa_id = p_empresa_id
        and regra.tipo_documento = v_tipo_documento
        and regra.competencia_inicio > p_competencia_inicio;

    select
        competencia.competencia
    into
        v_competencia_fechada
    from
        public.certidao_mensal_competencias competencia
    where
        competencia.empresa_id = p_empresa_id
        and competencia.status = 'FECHADA'
        and competencia.competencia >= p_competencia_inicio
        and (
            v_proxima_regra_inicio is null
            or competencia.competencia < v_proxima_regra_inicio
        )
    order by
        competencia.competencia
    limit 1;

    if found then
        raise exception
            'A regra atingiria a competencia fechada %. Reabra formalmente a competencia antes de alterar sua exigibilidade.',
            to_char(
                v_competencia_fechada,
                'MM/YYYY'
            )
            using errcode = '55000';
    end if;

    insert into
        public.certidao_mensal_perfil_documental_regras (
            empresa_id,
            tipo_documento,
            exigido,
            competencia_inicio,
            motivo,
            criado_por,
            atualizado_por
        )
    values (
        p_empresa_id,
        v_tipo_documento,
        p_exigido,
        p_competencia_inicio,
        v_motivo,
        auth.uid(),
        auth.uid()
    )
    on conflict (
        empresa_id,
        tipo_documento,
        competencia_inicio
    )
    do update
    set
        exigido = excluded.exigido,
        motivo = excluded.motivo,
        atualizado_em = clock_timestamp(),
        atualizado_por = auth.uid()
    returning *
    into
        v_regra;

    return jsonb_build_object(
        'ok', true,
        'regra', to_jsonb(v_regra),
        'proximaRegraInicio', v_proxima_regra_inicio,
        'historicoProtegido', true
    );
end;
$function$;

comment on function public.admin_salvar_regra_perfil_documental_certidao_mensal(uuid,text,boolean,date,text)
is 'Registra exigibilidade dos 18 grupos documentais por empresa e competência, protegendo competências fechadas.';

create or replace function public.materializar_itens_externos_certidao_mensal(
    p_competencia_id uuid
)
returns jsonb
language plpgsql
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
    v_competencia
        public.certidao_mensal_competencias%rowtype;

    v_itens_criados integer := 0;
    v_itens_disponiveis integer := 0;
    v_itens_existentes integer := 0;
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
    where competencia.id = p_competencia_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competência documental não localizada.';
    end if;

    if v_competencia.status = 'FECHADA' then
        raise exception using
            errcode = '55000',
            message = 'A competência fechada não pode receber novos itens.';
    end if;

    perform public.certidao_mensal_validar_vigencia_contratual(
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
    where item.competencia_id = p_competencia_id
      and item.tipo_documento in (
            'cnd-federal',
            'cnd-estadual',
            'cnd-municipal',
            'crf-fgts',
            'fgts',
            'cndt-trabalhista',
            'ceat-trt',
            'falencia-concordata',
            'cadastro-tce-ceis',
            'folha-pagamento',
            'folha-ponto',
            'va-vt',
            'seguro-vida',
            'inss-dctfweb',
            'iss',
            'esocial'
        )
      and item.origem <> 'UPLOAD';

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
            aplicabilidade,
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
        case
            when documento.tipo_documento = 'esocial'
                then 'PENDENTE_DEFINICAO'
            else 'APLICAVEL'
        end,
        auth.uid(),
        auth.uid()
    from (
        values
            ('cnd-federal', 'CND Federal'),
            ('cnd-estadual', 'CND Estadual'),
            ('cnd-municipal', 'CND Municipal'),
            ('crf-fgts', 'CRF FGTS'),
            ('fgts', 'FGTS'),
            ('cndt-trabalhista', 'CNDT (Trabalhista)'),
            ('ceat-trt', 'CEAT (Ações Trabalhistas - TRT)'),
            ('falencia-concordata', 'Falência e Concordata'),
            ('cadastro-tce-ceis', 'Cadastro TCE / CEIS'),
            ('folha-pagamento', 'Folha de Pagamento + Holerites'),
            ('folha-ponto', 'Folha / Espelho de Ponto'),
            ('va-vt', 'VA / VT'),
            ('seguro-vida', 'Seguro de Vida'),
            ('inss-dctfweb', 'INSS / DCTFWeb'),
            ('iss', 'ISS'),
            ('esocial', 'eSocial SST')
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
    where item.competencia_id = p_competencia_id
      and item.origem = 'UPLOAD'
      and item.tipo_documento in (
            'cnd-federal',
            'cnd-estadual',
            'cnd-municipal',
            'crf-fgts',
            'fgts',
            'cndt-trabalhista',
            'ceat-trt',
            'falencia-concordata',
            'cadastro-tce-ceis',
            'folha-pagamento',
            'folha-ponto',
            'va-vt',
            'seguro-vida',
            'inss-dctfweb',
            'iss',
            'esocial'
        );

    if v_itens_disponiveis <> 16 then
        raise exception using
            errcode = '55000',
            message =
                'A competência não possui os dezesseis documentos externos esperados.';
    end if;

    v_itens_existentes :=
        v_itens_disponiveis - v_itens_criados;

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
                'contratoVersao', '1.0',
                'totalDocumentosExternos', 16,
                'itensCriados', v_itens_criados,
                'itensExistentes', v_itens_existentes,
                'tiposDocumento',
                    jsonb_build_array(
                        'cnd-federal',
                        'cnd-estadual',
                        'cnd-municipal',
                        'crf-fgts',
                        'fgts',
                        'cndt-trabalhista',
                        'ceat-trt',
                        'falencia-concordata',
                        'cadastro-tce-ceis',
                        'folha-pagamento',
                        'folha-ponto',
                        'va-vt',
                        'seguro-vida',
                        'inss-dctfweb',
                        'iss',
                        'esocial'
                    ),
                'materializadoEm', clock_timestamp()
            ),
            auth.uid()
        );
    end if;

    return jsonb_build_object(
        'competenciaId', p_competencia_id,
        'totalDocumentosExternos', 16,
        'itensCriados', v_itens_criados,
        'itensExistentes', v_itens_existentes,
        'itensDisponiveis', v_itens_disponiveis,
        'materializadoEm', clock_timestamp()
    );
end;
$function$;

comment on function public.materializar_itens_externos_certidao_mensal(uuid)
is 'Cria de forma idempotente os dezesseis itens externos do catálogo CERT2, incluindo CEAT/TRT separada da CNDT, preservando itens existentes e bloqueando competências fechadas.';

notify pgrst, 'reload schema';