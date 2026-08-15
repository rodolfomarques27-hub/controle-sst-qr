-- ============================================================================
-- SafeScan Brasil
-- Ciclo profissional dos colaboradores
--
-- Compatibilidade de remobilização para colaboradores desmobilizados cujo
-- histórico anterior não possui data_desligamento.
--
-- Regra:
-- - colaborador demitido continua exigindo readmissão;
-- - somente Ativo + Desmobilizado pode ser remobilizado;
-- - se data_desligamento existir, remobilização >= data_desligamento;
-- - se data_desligamento não existir, remobilização >= data_admissao;
-- - nenhuma data histórica de desligamento é inventada.
-- ============================================================================

begin;

do $preflight$
declare
    v_definicao text;
begin
    if to_regprocedure(
        'public.remobilizar_colaborador(uuid,date,text,text,text)'
    ) is null then
        raise exception
            'RPC obrigatória public.remobilizar_colaborador não localizada.';
    end if;

    select pg_get_functiondef(
        'public.remobilizar_colaborador(uuid,date,text,text,text)'::regprocedure
    )
    into v_definicao;

    if position(
        'O colaborador não possui desligamento operacional para remobilização.'
        in v_definicao
    ) = 0 then
        raise exception
            'A versão atual da RPC remobilizar_colaborador divergiu da base esperada.';
    end if;
end;
$preflight$;

create or replace function
    public.remobilizar_colaborador(
        p_colaborador_id uuid,
        p_data_evento date,
        p_motivo text,
        p_observacao text default null,
        p_status_mobilizacao_novo text default 'Em análise'
    )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_anterior public.colaboradores%rowtype;
    v_novo public.colaboradores%rowtype;

    v_movimentacao_id uuid;

    v_motivo text;
    v_observacao text;
    v_status_mobilizacao_novo text;

    v_data_atual date :=
        (
            now()
            at time zone 'America/Sao_Paulo'
        )::date;
begin
    select *
    into v_anterior
    from public.colaboradores
    where id = p_colaborador_id
    for update;

    if not found then
        raise exception
            'Colaborador não localizado.'
            using errcode = 'P0002';
    end if;

    if not public.usuario_pode_movimentar_colaborador(
        v_anterior.empresa_id
    ) then
        raise exception
            'Usuário sem permissão para movimentar este colaborador.'
            using errcode = '42501';
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

    v_status_mobilizacao_novo :=
        nullif(
            btrim(
                coalesce(
                    p_status_mobilizacao_novo,
                    ''
                )
            ),
            ''
        );

    if (
        v_motivo is null
        or char_length(v_motivo) < 3
    ) then
        raise exception
            'Informe um motivo com pelo menos 3 caracteres.'
            using errcode = '22023';
    end if;

    if (
        p_data_evento is null
        or p_data_evento > v_data_atual
    ) then
        raise exception
            'Informe uma data de remobilização válida e não futura.'
            using errcode = '22023';
    end if;

    if v_anterior.data_demissao is not null then
        raise exception
            'Colaborador demitido deve ser readmitido, não remobilizado.'
            using errcode = '22023';
    end if;

    if (
        lower(
            btrim(
                coalesce(
                    v_anterior.status,
                    ''
                )
            )
        ) <> 'ativo'
        or lower(
            btrim(
                coalesce(
                    v_anterior.status_mobilizacao,
                    ''
                )
            )
        ) <> 'desmobilizado'
    ) then
        raise exception
            'Somente colaborador ativo e desmobilizado pode ser remobilizado.'
            using errcode = '22023';
    end if;

    if (
        v_anterior.data_desligamento is not null
        and p_data_evento < v_anterior.data_desligamento
    ) then
        raise exception
            'A remobilização não pode ser anterior ao desligamento operacional.'
            using errcode = '22023';
    end if;

    if (
        v_anterior.data_desligamento is null
        and v_anterior.data_admissao is not null
        and p_data_evento < v_anterior.data_admissao
    ) then
        raise exception
            'A remobilização não pode ser anterior à admissão.'
            using errcode = '22023';
    end if;

    if (
        v_status_mobilizacao_novo is null
        or lower(v_status_mobilizacao_novo) not in (
            'liberado',
            'com pendência',
            'bloqueado',
            'em análise'
        )
    ) then
        raise exception
            'Informe uma nova situação válida: Liberado, Com pendência, Bloqueado ou Em análise.'
            using errcode = '22023';
    end if;

    perform set_config(
        'safescan.movimentacao_colaborador_autorizada',
        'on',
        true
    );

    update public.colaboradores
    set
        data_desligamento = null,
        data_demissao = null,
        status = 'Ativo',
        status_mobilizacao = v_status_mobilizacao_novo
    where id = p_colaborador_id
    returning *
    into v_novo;

    perform set_config(
        'safescan.movimentacao_colaborador_autorizada',
        'off',
        true
    );

    insert into public.colaboradores_movimentacoes (
        colaborador_id,
        empresa_id,
        tipo_movimentacao,
        data_evento,

        status_anterior,
        status_novo,

        status_mobilizacao_anterior,
        status_mobilizacao_novo,

        data_admissao_anterior,
        data_admissao_nova,

        data_desligamento_anterior,
        data_desligamento_nova,

        data_demissao_anterior,
        data_demissao_nova,

        motivo,
        observacao,

        usuario_id,
        usuario_email
    )
    values (
        v_novo.id,
        v_novo.empresa_id,
        'REMOBILIZACAO',
        p_data_evento,

        v_anterior.status,
        v_novo.status,

        v_anterior.status_mobilizacao,
        v_novo.status_mobilizacao,

        v_anterior.data_admissao,
        v_novo.data_admissao,

        v_anterior.data_desligamento,
        v_novo.data_desligamento,

        v_anterior.data_demissao,
        v_novo.data_demissao,

        v_motivo,
        v_observacao,

        auth.uid(),

        nullif(
            btrim(
                coalesce(
                    auth.jwt() ->> 'email',
                    ''
                )
            ),
            ''
        )
    )
    returning id
    into v_movimentacao_id;

    return jsonb_build_object(
        'colaborador',
            to_jsonb(v_novo),

        'movimentacao_id',
            v_movimentacao_id,

        'tipo_movimentacao',
            'REMOBILIZACAO'
    );
end;
$function$;

comment on function
    public.remobilizar_colaborador(
        uuid,
        date,
        text,
        text,
        text
    )
is
'Remobiliza colaborador Ativo + Desmobilizado. Para históricos legados sem data_desligamento, valida a data da remobilização contra a admissão sem inventar uma data de desligamento.';

do $postflight$
declare
    v_definicao text;
begin
    select pg_get_functiondef(
        'public.remobilizar_colaborador(uuid,date,text,text,text)'::regprocedure
    )
    into v_definicao;

    if position(
        'Somente colaborador ativo e desmobilizado pode ser remobilizado.'
        in v_definicao
    ) = 0 then
        raise exception
            'Postflight falhou: nova validação de estado não localizada.';
    end if;

    if position(
        'A remobilização não pode ser anterior à admissão.'
        in v_definicao
    ) = 0 then
        raise exception
            'Postflight falhou: compatibilidade sem data_desligamento não localizada.';
    end if;
end;
$postflight$;

commit;