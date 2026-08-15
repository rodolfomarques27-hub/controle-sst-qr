-- ============================================================================
-- SafeScan Brasil
-- Ciclo profissional dos colaboradores
--
-- Blindagem do desligamento operacional / desmobilização da obra.
--
-- Objetivo:
-- - impedir nova desmobilização de colaborador que já está Desmobilizado;
-- - exigir vínculo Ativo;
-- - permitir origem apenas em estados operacionais válidos;
-- - preservar as validações de data, permissão e histórico já existentes.
-- ============================================================================

begin;

do $preflight$
declare
    v_definicao text;
begin
    if to_regprocedure(
        'public.desligar_colaborador_operacao(uuid,date,text,text)'
    ) is null then
        raise exception
            'RPC obrigatória public.desligar_colaborador_operacao não localizada.';
    end if;

    select pg_get_functiondef(
        'public.desligar_colaborador_operacao(uuid,date,text,text)'::regprocedure
    )
    into v_definicao;

    if position(
        'O colaborador já possui desligamento operacional registrado.'
        in v_definicao
    ) = 0 then
        raise exception
            'A versão atual da RPC desligar_colaborador_operacao divergiu da base esperada.';
    end if;

    if position(
        'O colaborador já está desmobilizado da obra.'
        in v_definicao
    ) > 0 then
        raise exception
            'A blindagem desta migration aparentemente já está instalada.';
    end if;
end;
$preflight$;

create or replace function
    public.desligar_colaborador_operacao(
        p_colaborador_id uuid,
        p_data_evento date,
        p_motivo text,
        p_observacao text default null
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

    v_status_atual text;
    v_status_mobilizacao_atual text;

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

    v_status_atual :=
        lower(
            btrim(
                coalesce(
                    v_anterior.status,
                    ''
                )
            )
        );

    v_status_mobilizacao_atual :=
        lower(
            btrim(
                coalesce(
                    v_anterior.status_mobilizacao,
                    ''
                )
            )
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
            'Informe uma data de desligamento válida e não futura.'
            using errcode = '22023';
    end if;

    if (
        v_anterior.data_admissao is not null
        and p_data_evento < v_anterior.data_admissao
    ) then
        raise exception
            'A data de desligamento não pode ser anterior à admissão.'
            using errcode = '22023';
    end if;

    if v_anterior.data_demissao is not null then
        raise exception
            'O colaborador já possui demissão registrada.'
            using errcode = '22023';
    end if;

    if v_status_atual <> 'ativo' then
        raise exception
            'Somente colaborador com vínculo ativo pode ser desmobilizado da obra.'
            using errcode = '22023';
    end if;

    if v_status_mobilizacao_atual = 'desmobilizado' then
        raise exception
            'O colaborador já está desmobilizado da obra.'
            using errcode = '22023';
    end if;

    if v_status_mobilizacao_atual not in (
        'liberado',
        'com pendência',
        'bloqueado',
        'em análise'
    ) then
        raise exception
            'A situação operacional atual não permite desmobilização.'
            using errcode = '22023';
    end if;

    if v_anterior.data_desligamento is not null then
        raise exception
            'O colaborador já possui desligamento operacional registrado.'
            using errcode = '22023';
    end if;

    perform set_config(
        'safescan.movimentacao_colaborador_autorizada',
        'on',
        true
    );

    update public.colaboradores
    set
        data_desligamento = p_data_evento,
        data_demissao = null,
        status = 'Ativo',
        status_mobilizacao = 'Desmobilizado'
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
        'DESLIGAMENTO_OPERACIONAL',
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
            'DESLIGAMENTO_OPERACIONAL'
    );
end;
$function$;

comment on function
    public.desligar_colaborador_operacao(
        uuid,
        date,
        text,
        text
    )
is
'Desmobiliza da obra somente colaborador com vínculo Ativo e situação operacional válida ainda não Desmobilizada, preservando o vínculo empregatício e registrando histórico da movimentação.';

do $postflight$
declare
    v_definicao text;
    v_security_definer boolean;
    v_config text[];
begin
    select
        pg_get_functiondef(p.oid),
        p.prosecdef,
        p.proconfig
    into
        v_definicao,
        v_security_definer,
        v_config
    from pg_proc p
    join pg_namespace n
        on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.oid =
        'public.desligar_colaborador_operacao(uuid,date,text,text)'::regprocedure;

    if position(
        'Somente colaborador com vínculo ativo pode ser desmobilizado da obra.'
        in v_definicao
    ) = 0 then
        raise exception
            'Postflight falhou: validação de vínculo Ativo não localizada.';
    end if;

    if position(
        'O colaborador já está desmobilizado da obra.'
        in v_definicao
    ) = 0 then
        raise exception
            'Postflight falhou: bloqueio de dupla desmobilização não localizado.';
    end if;

    if position(
        'A situação operacional atual não permite desmobilização.'
        in v_definicao
    ) = 0 then
        raise exception
            'Postflight falhou: validação do estado operacional não localizada.';
    end if;

    if not v_security_definer then
        raise exception
            'Postflight falhou: SECURITY DEFINER não preservado.';
    end if;

    if not (
        'search_path=pg_catalog, public, auth'
        = any(
            coalesce(
                v_config,
                array[]::text[]
            )
        )
    ) then
        raise exception
            'Postflight falhou: search_path esperado não localizado.';
    end if;

    if not has_function_privilege(
        'authenticated',
        'public.desligar_colaborador_operacao(uuid,date,text,text)',
        'EXECUTE'
    ) then
        raise exception
            'Postflight falhou: authenticated perdeu EXECUTE.';
    end if;

    if not has_function_privilege(
        'service_role',
        'public.desligar_colaborador_operacao(uuid,date,text,text)',
        'EXECUTE'
    ) then
        raise exception
            'Postflight falhou: service_role perdeu EXECUTE.';
    end if;
end;
$postflight$;

commit;