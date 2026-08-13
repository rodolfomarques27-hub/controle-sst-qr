begin;

-- ============================================================
-- CERTIDAO MENSAL DOCUMENTAL
-- P15-G — EXIGIBILIDADE HISTORICA NO BACKEND
--
-- Regra principal:
-- exigido=false NÃO altera status documental para DISPENSADO.
-- O perfil e o status permanecem dimensões independentes.
-- ============================================================

do $preflight$
begin
    if to_regclass(
        'public.certidao_mensal_perfil_documental_regras'
    ) is null then
        raise exception
            'Tabela de perfil documental não localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_itens'
    ) is null then
        raise exception
            'Tabela de itens da Certidão Mensal não localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_competencias'
    ) is null then
        raise exception
            'Tabela de competências da Certidão Mensal não localizada.';
    end if;

    if to_regprocedure(
        'public.fechar_competencia_certidao_mensal(uuid)'
    ) is null then
        raise exception
            'RPC de fechamento da Certidão Mensal não localizada.';
    end if;
end;
$preflight$;

-- ============================================================
-- 1. RESOLVER EXIGIBILIDADE HISTORICA
-- ============================================================

create or replace function
    public.certidao_mensal_documento_exigido_na_competencia(
        p_empresa_id uuid,
        p_tipo_documento text,
        p_competencia date
    )
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public
as $function$
    select
        coalesce(
            (
                select
                    regra.exigido
                from
                    public.certidao_mensal_perfil_documental_regras regra
                where
                    regra.empresa_id =
                        p_empresa_id
                    and regra.tipo_documento =
                        lower(
                            btrim(
                                coalesce(
                                    p_tipo_documento,
                                    ''
                                )
                            )
                        )
                    and regra.competencia_inicio <=
                        date_trunc(
                            'month',
                            p_competencia
                        )::date
                order by
                    regra.competencia_inicio desc
                limit 1
            ),
            true
        );
$function$;

revoke all
on function
    public.certidao_mensal_documento_exigido_na_competencia(
        uuid,
        text,
        date
    )
from public, anon, authenticated;

grant execute
on function
    public.certidao_mensal_documento_exigido_na_competencia(
        uuid,
        text,
        date
    )
to authenticated, service_role;

comment on function
    public.certidao_mensal_documento_exigido_na_competencia(
        uuid,
        text,
        date
    )
is
    'Resolve a exigibilidade histórica do documento para empresa e competência. Sem regra específica, retorna TRUE.';

-- ============================================================
-- 2. FECHAMENTO COM DENOMINADOR EXIGIVEL
-- ============================================================

create or replace function
    public.fechar_competencia_certidao_mensal(
        p_competencia_id uuid
    )
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_empresa_id uuid;
    v_competencia date;
    v_status_anterior text;
    v_resumo_anterior jsonb;
    v_total_itens integer;
    v_total_exigiveis integer;
    v_total_confirmados integer;
    v_total_dispensados integer;
    v_total_nao_exigiveis integer;
    v_total_automaticos integer;
    v_conformidade integer;
    v_itens_confirmados jsonb;
    v_itens_dispensados jsonb;
    v_itens_nao_exigiveis jsonb;
    v_fechado_em timestamptz;
    v_resumo jsonb;
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
        competencia.empresa_id,
        competencia.competencia,
        competencia.status,
        competencia.resumo
    into
        v_empresa_id,
        v_competencia,
        v_status_anterior,
        v_resumo_anterior
    from public.certidao_mensal_competencias competencia
    where competencia.id = p_competencia_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competência documental não localizada.';
    end if;

    if v_status_anterior = 'FECHADA' then
        return
            coalesce(
                v_resumo_anterior,
                '{}'::jsonb
            ) ||
            jsonb_build_object(
                'reutilizado',
                    true
            );
    end if;

    select
        count(*)
    into
        v_total_automaticos
    from public.certidao_mensal_itens item
    where item.competencia_id = p_competencia_id
      and item.origem = 'SISTEMA'
      and item.tipo_documento in (
            'relacao-empregados',
            'aso-pcmso'
      );

    if v_total_automaticos <> 2 then
        raise exception using
            errcode = '55000',
            message = 'Os dois itens automáticos precisam ser consolidados antes do fechamento.';
    end if;

    select
        count(*),
        count(*) filter (
            where item.status <> 'DISPENSADO'
              and public.certidao_mensal_documento_exigido_na_competencia(
                    v_empresa_id,
                    item.tipo_documento,
                    v_competencia
                  )
        ),
        count(*) filter (
            where item.status = 'CONFORME'
              and public.certidao_mensal_documento_exigido_na_competencia(
                    v_empresa_id,
                    item.tipo_documento,
                    v_competencia
                  )
        ),
        count(*) filter (
            where item.status = 'DISPENSADO'
        ),
        count(*) filter (
            where not public.certidao_mensal_documento_exigido_na_competencia(
                v_empresa_id,
                item.tipo_documento,
                v_competencia
            )
        )
    into
        v_total_itens,
        v_total_exigiveis,
        v_total_confirmados,
        v_total_dispensados,
        v_total_nao_exigiveis
    from public.certidao_mensal_itens item
    where item.competencia_id =
        p_competencia_id;

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'itemId',
                        item.id,
                    'tipoDocumento',
                        item.tipo_documento,
                    'titulo',
                        item.titulo,
                    'origem',
                        item.origem,
                    'snapshotAutomatico',
                        item.snapshot_automatico
                )
                order by
                    item.tipo_documento
            ) filter (
                where item.status = 'CONFORME'
                  and public.certidao_mensal_documento_exigido_na_competencia(
                        v_empresa_id,
                        item.tipo_documento,
                        v_competencia
                      )
            ),
            '[]'::jsonb
        ),
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'itemId',
                        item.id,
                    'tipoDocumento',
                        item.tipo_documento,
                    'titulo',
                        item.titulo,
                    'origem',
                        item.origem
                )
                order by
                    item.tipo_documento
            ) filter (
                where item.status = 'DISPENSADO'
            ),
            '[]'::jsonb
        )
    into
        v_itens_confirmados,
        v_itens_dispensados
    from public.certidao_mensal_itens item
    where item.competencia_id =
        p_competencia_id;

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'itemId',
                        item.id,
                    'tipoDocumento',
                        item.tipo_documento,
                    'titulo',
                        item.titulo,
                    'origem',
                        item.origem,
                    'statusAtual',
                        item.status
                )
                order by
                    item.tipo_documento
            ),
            '[]'::jsonb
        )
    into
        v_itens_nao_exigiveis
    from public.certidao_mensal_itens item
    where item.competencia_id =
            p_competencia_id
      and not public.certidao_mensal_documento_exigido_na_competencia(
            v_empresa_id,
            item.tipo_documento,
            v_competencia
      );

    v_conformidade :=
        case
            when v_total_exigiveis = 0
                then 0
            else
                round(
                    (
                        v_total_confirmados::numeric /
                        v_total_exigiveis::numeric
                    ) * 100
                )::integer
        end;

    v_fechado_em :=
        clock_timestamp();

    v_resumo :=
        jsonb_build_object(
            'contratoVersao',
                '1.0',
            'empresaId',
                v_empresa_id,
            'competencia',
                to_char(
                    v_competencia,
                    'MM/YYYY'
                ),
            'competenciaIso',
                to_char(
                    v_competencia,
                    'YYYY-MM-DD'
                ),
            'fechadoEm',
                v_fechado_em,
            'fechadoPor',
                auth.uid(),
            'totalItens',
                v_total_itens,
            'totalExigiveis',
                v_total_exigiveis,
            'totalConfirmados',
                v_total_confirmados,
            'totalDispensados',
                v_total_dispensados,
            'totalNaoExigiveis',
                v_total_nao_exigiveis,
            'conformidade',
                v_conformidade,
            'itensConfirmados',
                v_itens_confirmados,
            'itensDispensados',
                v_itens_dispensados,
            'itensNaoExigiveis',
                v_itens_nao_exigiveis,
            'perfilDocumentalAplicado',
                true,
            'criterioExigibilidade',
                'PERFIL_DOCUMENTAL_V1'
        );

    update public.certidao_mensal_competencias
    set
        status =
            'FECHADA',
        resumo =
            v_resumo,
        fechado_em =
            v_fechado_em,
        fechado_por =
            auth.uid(),
        atualizado_por =
            auth.uid(),
        atualizado_em =
            v_fechado_em
    where id =
        p_competencia_id;

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
        'COMPETENCIA_FECHADA',
        jsonb_build_object(
            'contratoVersao',
                '1.0',
            'statusAnterior',
                v_status_anterior,
            'statusDestino',
                'FECHADA',
            'resumoConsolidado',
                v_resumo
        ),
        auth.uid()
    );

    return v_resumo;
end;
$function$;

revoke all
on function
    public.fechar_competencia_certidao_mensal(uuid)
from public, anon;

grant execute
on function
    public.fechar_competencia_certidao_mensal(uuid)
to authenticated, service_role;

commit;
