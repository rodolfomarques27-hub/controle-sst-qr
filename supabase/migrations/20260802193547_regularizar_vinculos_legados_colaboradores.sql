begin;

alter table public.colaboradores_movimentacoes
    drop constraint if exists colaboradores_movimentacoes_tipo_check;

alter table public.colaboradores_movimentacoes
    add constraint colaboradores_movimentacoes_tipo_check
    check (
        tipo_movimentacao in (
            'ADMISSAO',
            'DESLIGAMENTO_OPERACIONAL',
            'REMOBILIZACAO',
            'DEMISSAO',
            'READMISSAO',
            'CORRECAO_CADASTRAL',
            'REGULARIZACAO_DEMISSAO_LEGADA',
            'CORRECAO_INATIVACAO_LEGADA'
        )
    );

create or replace function public.regularizar_demissao_legada_colaborador(
    p_colaborador_id uuid,
    p_data_evento date,
    p_motivo text,
    p_observacao text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_anterior public.colaboradores%rowtype;
    v_novo public.colaboradores%rowtype;
    v_movimentacao_id uuid;
    v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
    v_observacao text := nullif(btrim(coalesce(p_observacao, '')), '');
    v_data_atual date := (now() at time zone 'America/Sao_Paulo')::date;
begin
    select * into v_anterior
    from public.colaboradores
    where id = p_colaborador_id
    for update;

    if not found then
        raise exception 'Colaborador não localizado.' using errcode = 'P0002';
    end if;

    if not public.usuario_pode_movimentar_colaborador(v_anterior.empresa_id) then
        raise exception 'Usuário sem permissão para movimentar este colaborador.' using errcode = '42501';
    end if;

    if lower(btrim(coalesce(v_anterior.status, ''))) <> 'inativo'
       or v_anterior.data_demissao is not null then
        raise exception 'A regularização é exclusiva para inativo legado sem data formal de demissão.' using errcode = '22023';
    end if;

    if v_motivo is null or char_length(v_motivo) < 3 then
        raise exception 'Informe um motivo com pelo menos 3 caracteres.' using errcode = '22023';
    end if;

    if p_data_evento is null or p_data_evento > v_data_atual then
        raise exception 'Informe a data efetiva da demissão, sem usar data futura.' using errcode = '22023';
    end if;

    if v_anterior.data_admissao is not null
       and p_data_evento < v_anterior.data_admissao then
        raise exception 'A demissão não pode ser anterior à admissão.' using errcode = '22023';
    end if;

    if v_anterior.data_desligamento is not null
       and p_data_evento < v_anterior.data_desligamento then
        raise exception 'A demissão não pode ser anterior à desmobilização registrada.' using errcode = '22023';
    end if;

    perform set_config('safescan.movimentacao_colaborador_autorizada', 'on', true);

    update public.colaboradores
    set
        data_demissao = p_data_evento,
        status = 'Inativo',
        status_mobilizacao = 'Desmobilizado'
    where id = p_colaborador_id
    returning * into v_novo;

    perform set_config('safescan.movimentacao_colaborador_autorizada', 'off', true);

    insert into public.colaboradores_movimentacoes (
        colaborador_id, empresa_id, tipo_movimentacao, data_evento,
        status_anterior, status_novo,
        status_mobilizacao_anterior, status_mobilizacao_novo,
        data_admissao_anterior, data_admissao_nova,
        data_desligamento_anterior, data_desligamento_nova,
        data_demissao_anterior, data_demissao_nova,
        motivo, observacao, usuario_id, usuario_email
    ) values (
        v_novo.id, v_novo.empresa_id, 'REGULARIZACAO_DEMISSAO_LEGADA', p_data_evento,
        v_anterior.status, v_novo.status,
        v_anterior.status_mobilizacao, v_novo.status_mobilizacao,
        v_anterior.data_admissao, v_novo.data_admissao,
        v_anterior.data_desligamento, v_novo.data_desligamento,
        v_anterior.data_demissao, v_novo.data_demissao,
        v_motivo, v_observacao, auth.uid(),
        nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), '')
    ) returning id into v_movimentacao_id;

    return jsonb_build_object(
        'colaborador', to_jsonb(v_novo),
        'movimentacao_id', v_movimentacao_id,
        'tipo_movimentacao', 'REGULARIZACAO_DEMISSAO_LEGADA'
    );
end;
$function$;

create or replace function public.corrigir_inativacao_legada_colaborador(
    p_colaborador_id uuid,
    p_data_evento date,
    p_motivo text,
    p_observacao text default null,
    p_status_mobilizacao_novo text default 'Em análise'
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_anterior public.colaboradores%rowtype;
    v_novo public.colaboradores%rowtype;
    v_movimentacao_id uuid;
    v_motivo text := nullif(btrim(coalesce(p_motivo, '')), '');
    v_observacao text := nullif(btrim(coalesce(p_observacao, '')), '');
    v_status_novo text := nullif(btrim(coalesce(p_status_mobilizacao_novo, '')), '');
    v_data_atual date := (now() at time zone 'America/Sao_Paulo')::date;
begin
    select * into v_anterior
    from public.colaboradores
    where id = p_colaborador_id
    for update;

    if not found then
        raise exception 'Colaborador não localizado.' using errcode = 'P0002';
    end if;

    if not public.usuario_pode_movimentar_colaborador(v_anterior.empresa_id) then
        raise exception 'Usuário sem permissão para movimentar este colaborador.' using errcode = '42501';
    end if;

    if lower(btrim(coalesce(v_anterior.status, ''))) <> 'inativo'
       or v_anterior.data_demissao is not null then
        raise exception 'A correção é exclusiva para inativo legado sem data formal de demissão.' using errcode = '22023';
    end if;

    if v_motivo is null or char_length(v_motivo) < 3 then
        raise exception 'Informe um motivo com pelo menos 3 caracteres.' using errcode = '22023';
    end if;

    if p_data_evento is null or p_data_evento > v_data_atual then
        raise exception 'Informe uma data de correção válida e não futura.' using errcode = '22023';
    end if;

    if lower(v_status_novo) not in ('liberado', 'com pendência', 'bloqueado', 'em análise') then
        raise exception 'Informe uma situação válida: Liberado, Com pendência, Bloqueado ou Em análise.' using errcode = '22023';
    end if;

    perform set_config('safescan.movimentacao_colaborador_autorizada', 'on', true);

    update public.colaboradores
    set
        data_desligamento = null,
        data_demissao = null,
        status = 'Ativo',
        status_mobilizacao = v_status_novo
    where id = p_colaborador_id
    returning * into v_novo;

    perform set_config('safescan.movimentacao_colaborador_autorizada', 'off', true);

    insert into public.colaboradores_movimentacoes (
        colaborador_id, empresa_id, tipo_movimentacao, data_evento,
        status_anterior, status_novo,
        status_mobilizacao_anterior, status_mobilizacao_novo,
        data_admissao_anterior, data_admissao_nova,
        data_desligamento_anterior, data_desligamento_nova,
        data_demissao_anterior, data_demissao_nova,
        motivo, observacao, usuario_id, usuario_email
    ) values (
        v_novo.id, v_novo.empresa_id, 'CORRECAO_INATIVACAO_LEGADA', p_data_evento,
        v_anterior.status, v_novo.status,
        v_anterior.status_mobilizacao, v_novo.status_mobilizacao,
        v_anterior.data_admissao, v_novo.data_admissao,
        v_anterior.data_desligamento, v_novo.data_desligamento,
        v_anterior.data_demissao, v_novo.data_demissao,
        v_motivo, v_observacao, auth.uid(),
        nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), '')
    ) returning id into v_movimentacao_id;

    return jsonb_build_object(
        'colaborador', to_jsonb(v_novo),
        'movimentacao_id', v_movimentacao_id,
        'tipo_movimentacao', 'CORRECAO_INATIVACAO_LEGADA'
    );
end;
$function$;

revoke all on function public.regularizar_demissao_legada_colaborador(uuid, date, text, text) from public, anon;
revoke all on function public.corrigir_inativacao_legada_colaborador(uuid, date, text, text, text) from public, anon;

grant execute on function public.regularizar_demissao_legada_colaborador(uuid, date, text, text) to authenticated, service_role;
grant execute on function public.corrigir_inativacao_legada_colaborador(uuid, date, text, text, text) to authenticated, service_role;

notify pgrst, 'reload schema';

commit;

