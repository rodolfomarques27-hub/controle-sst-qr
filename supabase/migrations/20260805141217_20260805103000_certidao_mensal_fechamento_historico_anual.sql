begin;

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
        'public.certidao_mensal_usuario_pode_acessar_empresa(uuid)'
    ) is null then
        raise exception
            'Função de autorização da empresa não localizada.';
    end if;
end;
$preflight$;

alter table
    public.certidao_mensal_competencias
add column if not exists
    fechado_em timestamptz null;

alter table
    public.certidao_mensal_competencias
add column if not exists
    fechado_por uuid null
    references auth.users(id)
    on delete set null;

alter table
    public.certidao_mensal_itens
add column if not exists
    snapshot_automatico jsonb not null
    default '{}'::jsonb;

comment on column
    public.certidao_mensal_competencias.fechado_em
is
    'Data e hora do fechamento consolidado mais recente da competência.';

comment on column
    public.certidao_mensal_competencias.fechado_por
is
    'Usuário responsável pelo fechamento consolidado mais recente.';

comment on column
    public.certidao_mensal_itens.snapshot_automatico
is
    'Fotografia dos dados internos usada nos itens automáticos de origem SISTEMA.';

create index if not exists
    certidao_mensal_competencias_historico_anual_idx
on public.certidao_mensal_competencias (
    empresa_id,
    competencia
)
where status = 'FECHADA';

create or replace function
    public.consolidar_itens_automaticos_certidao_mensal(
        p_competencia_id uuid,
        p_itens jsonb
    )
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_status_competencia text;
    v_item jsonb;
    v_tipo_documento text;
    v_titulo text;
    v_status_item text;
    v_snapshot jsonb;
    v_item_id uuid;
    v_origem_existente text;
    v_processados integer := 0;
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
        competencia.status
    into
        v_status_competencia
    from public.certidao_mensal_competencias competencia
    where competencia.id = p_competencia_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competência documental não localizada.';
    end if;

    if v_status_competencia = 'FECHADA' then
        raise exception using
            errcode = '55000',
            message = 'A competência está fechada e precisa ser reaberta antes de receber alterações.';
    end if;

    if p_itens is null
       or jsonb_typeof(p_itens) <> 'array'
       or jsonb_array_length(p_itens) <> 2 then
        raise exception using
            errcode = '22023',
            message = 'Devem ser informados exatamente os dois itens automáticos da competência.';
    end if;

    if (
        select
            count(
                distinct lower(
                    btrim(
                        elemento.value ->> 'tipoDocumento'
                    )
                )
            )
        from jsonb_array_elements(p_itens) elemento
    ) <> 2 then
        raise exception using
            errcode = '22023',
            message = 'Os itens automáticos devem ser distintos: Relação de Empregados e ASO + PCMSO.';
    end if;

    for v_item in
        select
            elemento.value
        from jsonb_array_elements(p_itens) elemento
    loop
        v_tipo_documento :=
            lower(
                btrim(
                    coalesce(
                        v_item ->> 'tipoDocumento',
                        ''
                    )
                )
            );

        if v_tipo_documento not in (
            'relacao-empregados',
            'aso-pcmso'
        ) then
            raise exception using
                errcode = '22023',
                message = 'Tipo de item automático inválido.';
        end if;

        v_titulo :=
            case v_tipo_documento
                when 'relacao-empregados'
                    then 'Relação de Empregados'
                when 'aso-pcmso'
                    then 'ASO + PCMSO'
            end;

        v_status_item :=
            upper(
                btrim(
                    coalesce(
                        v_item ->> 'status',
                        ''
                    )
                )
            );

        if v_status_item not in (
            'PENDENTE',
            'CONFORME'
        ) then
            raise exception using
                errcode = '22023',
                message = 'Item automático aceita somente PENDENTE ou CONFORME.';
        end if;

        v_snapshot :=
            coalesce(
                v_item -> 'snapshot',
                '{}'::jsonb
            );

        if jsonb_typeof(v_snapshot) <> 'object' then
            raise exception using
                errcode = '22023',
                message = 'O snapshot do item automático deve ser um objeto JSON.';
        end if;

        v_origem_existente := null;

        select
            item.origem
        into
            v_origem_existente
        from public.certidao_mensal_itens item
        where item.competencia_id = p_competencia_id
          and item.tipo_documento = v_tipo_documento
        for update;

        if found
           and v_origem_existente <> 'SISTEMA' then
            raise exception using
                errcode = '55000',
                message = 'Já existe item não automático com o mesmo tipo documental.';
        end if;

        v_item_id := null;

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
        values (
            p_competencia_id,
            v_tipo_documento,
            v_titulo,
            'SISTEMA',
            v_status_item,
            false,
            'NAO_APLICAVEL',
            null,
            v_snapshot,
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
                'SISTEMA',
            status =
                excluded.status,
            requer_consulta_oficial =
                false,
            status_consulta_oficial =
                'NAO_APLICAVEL',
            versao_atual_id =
                null,
            snapshot_automatico =
                excluded.snapshot_automatico,
            atualizado_por =
                auth.uid(),
            atualizado_em =
                clock_timestamp()
        where public.certidao_mensal_itens.origem =
            'SISTEMA'
        returning
            id
        into
            v_item_id;

        if v_item_id is null then
            raise exception using
                errcode = '55000',
                message = 'Não foi possível consolidar o item automático.';
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
            p_competencia_id,
            v_item_id,
            null,
            'ITEM_AUTOMATICO_CONSOLIDADO',
            jsonb_build_object(
                'contratoVersao',
                    '1.0',
                'tipoDocumento',
                    v_tipo_documento,
                'titulo',
                    v_titulo,
                'status',
                    v_status_item,
                'snapshot',
                    v_snapshot,
                'consolidadoEm',
                    clock_timestamp()
            ),
            auth.uid()
        );

        v_processados :=
            v_processados + 1;
    end loop;

    update public.certidao_mensal_competencias
    set
        status =
            case
                when status = 'REABERTA'
                    then 'REABERTA'
                else 'EM_CONFERENCIA'
            end,
        atualizado_por =
            auth.uid(),
        atualizado_em =
            clock_timestamp()
    where id =
        p_competencia_id;

    return jsonb_build_object(
        'competenciaId',
            p_competencia_id,
        'itensProcessados',
            v_processados,
        'consolidadoEm',
            clock_timestamp()
    );
end;
$function$;

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
    v_total_automaticos integer;
    v_conformidade integer;
    v_itens_confirmados jsonb;
    v_itens_dispensados jsonb;
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
        ),
        count(*) filter (
            where item.status = 'CONFORME'
        ),
        count(*) filter (
            where item.status = 'DISPENSADO'
        )
    into
        v_total_itens,
        v_total_exigiveis,
        v_total_confirmados,
        v_total_dispensados
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
            'conformidade',
                v_conformidade,
            'itensConfirmados',
                v_itens_confirmados,
            'itensDispensados',
                v_itens_dispensados
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

create or replace function
    public.reabrir_competencia_certidao_mensal(
        p_competencia_id uuid,
        p_motivo text
    )
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_status_anterior text;
    v_resumo_anterior jsonb;
    v_motivo text;
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

    v_motivo :=
        btrim(
            coalesce(
                p_motivo,
                ''
            )
        );

    if length(v_motivo) < 5 then
        raise exception using
            errcode = '22023',
            message = 'Informe um motivo válido para reabrir a competência.';
    end if;

    select
        competencia.status,
        competencia.resumo
    into
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

    if v_status_anterior <> 'FECHADA' then
        raise exception using
            errcode = '55000',
            message = 'Somente uma competência fechada pode ser reaberta.';
    end if;

    update public.certidao_mensal_competencias
    set
        status =
            'REABERTA',
        atualizado_por =
            auth.uid(),
        atualizado_em =
            clock_timestamp()
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
        'COMPETENCIA_REABERTA',
        jsonb_build_object(
            'contratoVersao',
                '1.0',
            'statusAnterior',
                v_status_anterior,
            'statusDestino',
                'REABERTA',
            'motivo',
                v_motivo,
            'resumoAnterior',
                coalesce(
                    v_resumo_anterior,
                    '{}'::jsonb
                ),
            'reabertaEm',
                clock_timestamp()
        ),
        auth.uid()
    );

    return jsonb_build_object(
        'competenciaId',
            p_competencia_id,
        'status',
            'REABERTA',
        'motivo',
            v_motivo
    );
end;
$function$;

create or replace function
    public.listar_historico_anual_certidao_mensal(
        p_empresa_id uuid,
        p_ano integer
    )
returns table (
    competencia_id uuid,
    competencia date,
    fechado_em timestamptz,
    fechado_por uuid,
    resumo jsonb
)
language plpgsql
stable
security invoker
set search_path = pg_catalog, public, auth
as $function$
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    if p_empresa_id is null then
        raise exception using
            errcode = '22023',
            message = 'A empresa é obrigatória.';
    end if;

    if p_ano is null
       or p_ano < 2000
       or p_ano > 2100 then
        raise exception using
            errcode = '22023',
            message = 'O ano informado é inválido.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_empresa(
        p_empresa_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso à empresa informada.';
    end if;

    return query
    select
        competencia.id,
        competencia.competencia,
        competencia.fechado_em,
        competencia.fechado_por,
        competencia.resumo
    from public.certidao_mensal_competencias competencia
    where competencia.empresa_id =
            p_empresa_id
      and competencia.status =
            'FECHADA'
      and competencia.competencia >=
            make_date(
                p_ano,
                1,
                1
            )
      and competencia.competencia <
            make_date(
                p_ano + 1,
                1,
                1
            )
    order by
        competencia.competencia;
end;
$function$;

revoke all on function
    public.consolidar_itens_automaticos_certidao_mensal(
        uuid,
        jsonb
    )
from public;

revoke all on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
from public;

revoke all on function
    public.reabrir_competencia_certidao_mensal(
        uuid,
        text
    )
from public;

revoke all on function
    public.listar_historico_anual_certidao_mensal(
        uuid,
        integer
    )
from public;

grant execute on function
    public.consolidar_itens_automaticos_certidao_mensal(
        uuid,
        jsonb
    )
to authenticated;

grant execute on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
to authenticated;

grant execute on function
    public.reabrir_competencia_certidao_mensal(
        uuid,
        text
    )
to authenticated;

grant execute on function
    public.listar_historico_anual_certidao_mensal(
        uuid,
        integer
    )
to authenticated;

comment on function
    public.consolidar_itens_automaticos_certidao_mensal(
        uuid,
        jsonb
    )
is
    'Persiste os itens internos Relação de Empregados e ASO + PCMSO sem exigir arquivo PDF.';

comment on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
is
    'Fecha a competência e grava fotografia imutável dos itens confirmados, exigíveis e dispensados.';

comment on function
    public.reabrir_competencia_certidao_mensal(
        uuid,
        text
    )
is
    'Reabre uma competência fechada, preservando o fechamento anterior na auditoria.';

comment on function
    public.listar_historico_anual_certidao_mensal(
        uuid,
        integer
    )
is
    'Lista somente competências fechadas para a linha do tempo anual da empresa.';

notify pgrst, 'reload schema';

commit;
