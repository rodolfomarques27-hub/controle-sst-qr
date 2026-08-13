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
end;
$preflight$;

create or replace function
    public.consolidar_relacao_empregados_certidao_mensal(
        p_competencia_id uuid,
        p_item jsonb
    )
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_status_competencia text;
    v_tipo_documento text;
    v_status_item text;
    v_snapshot jsonb;
    v_item_id uuid;
    v_origem_existente text;
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

    if p_item is null
       or jsonb_typeof(p_item) <> 'object' then
        raise exception using
            errcode = '22023',
            message = 'O item da Relação de Empregados deve ser um objeto JSON.';
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
    where competencia.id =
        p_competencia_id
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

    v_tipo_documento :=
        lower(
            btrim(
                coalesce(
                    p_item ->> 'tipoDocumento',
                    ''
                )
            )
        );

    if v_tipo_documento <> 'relacao-empregados' then
        raise exception using
            errcode = '22023',
            message = 'Esta operação aceita somente a Relação de Empregados.';
    end if;

    v_status_item :=
        upper(
            btrim(
                coalesce(
                    p_item ->> 'status',
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
            message = 'A Relação de Empregados aceita somente PENDENTE ou CONFORME.';
    end if;

    v_snapshot :=
        coalesce(
            p_item -> 'snapshot',
            '{}'::jsonb
        );

    if jsonb_typeof(v_snapshot) <> 'object' then
        raise exception using
            errcode = '22023',
            message = 'O snapshot da Relação de Empregados deve ser um objeto JSON.';
    end if;

    v_origem_existente :=
        null;

    select
        item.origem
    into
        v_origem_existente
    from public.certidao_mensal_itens item
    where item.competencia_id =
            p_competencia_id
      and item.tipo_documento =
            'relacao-empregados'
    for update;

    if found
       and v_origem_existente <> 'SISTEMA' then
        raise exception using
            errcode = '55000',
            message = 'Já existe item não automático para a Relação de Empregados.';
    end if;

    v_item_id :=
        null;

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
        'relacao-empregados',
        'Relação de Empregados',
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
            message = 'Não foi possível consolidar a Relação de Empregados.';
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
                'relacao-empregados',
            'titulo',
                'Relação de Empregados',
            'status',
                v_status_item,
            'snapshot',
                v_snapshot,
            'modoConsolidacao',
                'ITEM_ISOLADO',
            'consolidadoEm',
                clock_timestamp()
        ),
        auth.uid()
    );

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
            1,
        'tipoDocumento',
            'relacao-empregados',
        'consolidadoEm',
            clock_timestamp()
    );
end;
$function$;

revoke all on function
    public.consolidar_relacao_empregados_certidao_mensal(
        uuid,
        jsonb
    )
from public;

revoke all on function
    public.consolidar_relacao_empregados_certidao_mensal(
        uuid,
        jsonb
    )
from anon;

grant execute on function
    public.consolidar_relacao_empregados_certidao_mensal(
        uuid,
        jsonb
    )
to authenticated;

grant execute on function
    public.consolidar_relacao_empregados_certidao_mensal(
        uuid,
        jsonb
    )
to service_role;

comment on function
    public.consolidar_relacao_empregados_certidao_mensal(
        uuid,
        jsonb
    )
is
    'Persiste isoladamente a Relação de Empregados de uma competência, preservando o item automático ASO + PCMSO.';

do $validacao$
begin
    if to_regprocedure(
        'public.consolidar_relacao_empregados_certidao_mensal(uuid,jsonb)'
    ) is null then
        raise exception
            'RPC de consolidação isolada da Relação de Empregados não foi criada.';
    end if;

    if has_function_privilege(
        'anon',
        'public.consolidar_relacao_empregados_certidao_mensal(uuid,jsonb)',
        'EXECUTE'
    ) then
        raise exception
            'Anon possui acesso indevido à consolidação isolada.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.consolidar_relacao_empregados_certidao_mensal(uuid,jsonb)',
        'EXECUTE'
    ) then
        raise exception
            'Authenticated não possui acesso à consolidação isolada.';
    end if;

    if not has_function_privilege(
        'service_role',
        'public.consolidar_relacao_empregados_certidao_mensal(uuid,jsonb)',
        'EXECUTE'
    ) then
        raise exception
            'Service role não possui acesso à consolidação isolada.';
    end if;
end;
$validacao$;

notify pgrst, 'reload schema';

commit;