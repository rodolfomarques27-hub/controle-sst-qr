-- SafeScan Brasil
-- Conferência Assistida da Certidão Mensal Documental.
-- Esta migration cria apenas a RPC transacional de decisão humana.
-- Sua presença local não significa aplicação no Supabase.

do $preflight$
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
        'public.certidao_mensal_versoes'
    ) is null then
        raise exception
            'Tabela public.certidao_mensal_versoes não localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_auditoria'
    ) is null then
        raise exception
            'Tabela public.certidao_mensal_auditoria não localizada.';
    end if;

    if to_regprocedure(
        'public.certidao_mensal_usuario_pode_acessar_item(uuid)'
    ) is null then
        raise exception
            'Função de acesso ao item documental não localizada.';
    end if;
end;
$preflight$;

create or replace function
    public.registrar_decisao_certidao_mensal_documento(
        p_item_id uuid,
        p_versao_atual_id uuid,
        p_decisao text,
        p_motivo text default null,
        p_observacao text default null,
        p_decidido_em timestamptz default now()
    )
returns jsonb
language plpgsql
set search_path = pg_catalog, public, auth
as $function$
declare
    v_competencia_id uuid;
    v_competencia_status_anterior text;
    v_competencia_status_destino text;

    v_versao_atual_id uuid;
    v_status_anterior text;
    v_status_resultado_versao text;
    v_status_consulta_oficial text;
    v_diagnostico_versao jsonb;

    v_decisao text;
    v_motivo text;
    v_observacao text;
    v_tipo_evento text;
    v_decidido_em timestamptz;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    if p_item_id is null then
        raise exception using
            errcode = '22023',
            message = 'O item documental é obrigatório.';
    end if;

    if p_versao_atual_id is null then
        raise exception using
            errcode = '22023',
            message = 'A versão documental atual é obrigatória.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_item(
        p_item_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso ao item documental informado.';
    end if;

    v_decisao :=
        upper(
            btrim(
                coalesce(
                    p_decisao,
                    ''
                )
            )
        );

    if v_decisao not in (
        'CONFORME',
        'NAO_CONFORME',
        'REENVIO_SOLICITADO'
    ) then
        raise exception using
            errcode = '22023',
            message = 'Decisão documental inválida.';
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

    v_observacao :=
        nullif(
            btrim(
                coalesce(
                    p_observacao,
                    ''
                )
            ),
            ''
        );

    if length(
        coalesce(
            v_motivo,
            ''
        )
    ) > 500 then
        raise exception using
            errcode = '22023',
            message = 'O motivo excede o limite de 500 caracteres.';
    end if;

    if length(
        coalesce(
            v_observacao,
            ''
        )
    ) > 2000 then
        raise exception using
            errcode = '22023',
            message = 'A observação excede o limite de 2000 caracteres.';
    end if;

    if v_decisao in (
        'NAO_CONFORME',
        'REENVIO_SOLICITADO'
    )
       and v_motivo is null
    then
        raise exception using
            errcode = '22023',
            message = 'O motivo é obrigatório para não conformidade ou solicitação de reenvio.';
    end if;

    v_decidido_em :=
        coalesce(
            p_decidido_em,
            clock_timestamp()
        );

    select
        i.competencia_id,
        i.versao_atual_id,
        i.status,
        i.status_consulta_oficial
    into
        v_competencia_id,
        v_versao_atual_id,
        v_status_anterior,
        v_status_consulta_oficial
    from public.certidao_mensal_itens i
    where i.id = p_item_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Item documental não localizado.';
    end if;

    if v_versao_atual_id is null then
        raise exception using
            errcode = '55000',
            message = 'O item não possui uma versão documental atual.';
    end if;

    if v_versao_atual_id <> p_versao_atual_id then
        raise exception using
            errcode = '40001',
            message = 'O documento foi substituído por uma versão mais recente. Atualize a tela antes de decidir.';
    end if;

    select
        c.status
    into
        v_competencia_status_anterior
    from public.certidao_mensal_competencias c
    where c.id = v_competencia_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competência documental não localizada.';
    end if;

    if v_competencia_status_anterior = 'FECHADA' then
        raise exception using
            errcode = '55000',
            message = 'A competência está fechada e precisa ser reaberta antes de receber decisões.';
    end if;

    select
        v.status_resultado,
        v.diagnostico
    into
        v_status_resultado_versao,
        v_diagnostico_versao
    from public.certidao_mensal_versoes v
    where v.id = v_versao_atual_id
      and v.item_id = p_item_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'A versão atual do documento não foi localizada.';
    end if;

    if v_decisao = 'CONFORME'
       and (
            v_status_anterior = 'VENCIDO'
            or v_status_resultado_versao = 'VENCIDO'
            or upper(
                coalesce(
                    v_diagnostico_versao
                        #>> '{avaliacao,codigo}',
                    ''
                )
            ) = 'DOCUMENTO_VENCIDO'
            or lower(
                coalesce(
                    v_diagnostico_versao
                        #>> '{avaliacao,dadosTemporais,situacaoValidade,vencida}',
                    'false'
                )
            ) = 'true'
            or (
                coalesce(
                    v_diagnostico_versao
                        #>> '{avaliacao,dadosTemporais,dataValidade}',
                    ''
                ) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                and (
                    v_diagnostico_versao
                        #>> '{avaliacao,dadosTemporais,dataValidade}'
                ) < to_char(
                    current_date,
                    'YYYY-MM-DD'
                )
            )
       )
    then
        raise exception using
            errcode = '22023',
            message = 'Documento vencido não pode ser confirmado como conforme.';
    end if;

    if v_decisao = 'CONFORME'
       and v_status_consulta_oficial = 'DIVERGENTE'
    then
        raise exception using
            errcode = '22023',
            message = 'Documento com consulta oficial divergente não pode ser confirmado como conforme.';
    end if;

    v_tipo_evento :=
        case v_decisao
            when 'CONFORME'
                then 'DOCUMENTO_CONFIRMADO_CONFORME'

            when 'NAO_CONFORME'
                then 'DOCUMENTO_MARCADO_NAO_CONFORME'

            when 'REENVIO_SOLICITADO'
                then 'DOCUMENTO_REENVIO_SOLICITADO'
        end;

    update public.certidao_mensal_itens
    set
        status =
            v_decisao,

        atualizado_por =
            auth.uid(),

        atualizado_em =
            clock_timestamp()
    where id = p_item_id;

    select
        case
            when exists (
                select 1
                from public.certidao_mensal_itens i
                where i.competencia_id =
                    v_competencia_id
                  and i.status in (
                        'PENDENTE',
                        'NAO_CONFORME',
                        'REENVIO_SOLICITADO',
                        'VENCIDO'
                  )
            )
                then 'COM_PENDENCIAS'

            else 'EM_CONFERENCIA'
        end
    into
        v_competencia_status_destino;

    update public.certidao_mensal_competencias
    set
        status =
            case
                when status = 'REABERTA'
                    then 'REABERTA'

                else v_competencia_status_destino
            end,

        atualizado_por =
            auth.uid(),

        atualizado_em =
            clock_timestamp()
    where id = v_competencia_id
    returning
        status
    into
        v_competencia_status_destino;

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
        v_versao_atual_id,
        v_tipo_evento,
        jsonb_build_object(
            'contratoVersao',
                '1.0',

            'decisao',
                v_decisao,

            'statusAnterior',
                v_status_anterior,

            'statusDestino',
                v_decisao,

            'motivo',
                v_motivo,

            'observacao',
                v_observacao,

            'decididoEm',
                v_decidido_em,

            'registradoEm',
                clock_timestamp(),

            'versaoAtualId',
                v_versao_atual_id,

            'statusResultadoVersao',
                v_status_resultado_versao,

            'statusConsultaOficial',
                v_status_consulta_oficial,

            'competenciaStatusAnterior',
                v_competencia_status_anterior,

            'competenciaStatusDestino',
                v_competencia_status_destino
        ),
        auth.uid()
    );

    return jsonb_build_object(
        'itemId',
            p_item_id,

        'competenciaId',
            v_competencia_id,

        'versaoAtualId',
            v_versao_atual_id,

        'decisao',
            v_decisao,

        'statusAnterior',
            v_status_anterior,

        'statusAtual',
            v_decisao,

        'tipoEvento',
            v_tipo_evento,

        'motivo',
            v_motivo,

        'observacao',
            v_observacao,

        'decididoEm',
            v_decidido_em,

        'competenciaStatus',
            v_competencia_status_destino
    );
end;
$function$;

revoke all
on function
    public.registrar_decisao_certidao_mensal_documento(
        uuid,
        uuid,
        text,
        text,
        text,
        timestamptz
    )
from public, anon, authenticated;

grant execute
on function
    public.registrar_decisao_certidao_mensal_documento(
        uuid,
        uuid,
        text,
        text,
        text,
        timestamptz
    )
to authenticated;

comment on function
    public.registrar_decisao_certidao_mensal_documento(
        uuid,
        uuid,
        text,
        text,
        text,
        timestamptz
    )
is
    'Registra decisão humana transacional sobre a versão atual de um documento da Certidão Mensal.';
