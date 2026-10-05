begin;

do $preflight$
begin
    if to_regclass(
        'public.colaboradores'
    ) is null then
        raise exception
            'Tabela obrigatória public.colaboradores não localizada.';
    end if;

    if to_regclass(
        'public.colaboradores_movimentacoes'
    ) is null then
        raise exception
            'Tabela obrigatória public.colaboradores_movimentacoes não localizada.';
    end if;

    if to_regclass(
        'public.colaboradores_condicoes_temporarias'
    ) is null then
        raise exception
            'Tabela obrigatória public.colaboradores_condicoes_temporarias não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_pode_movimentar_colaborador(uuid)'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_pode_movimentar_colaborador(uuid) não localizada.';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid =
            'public.colaboradores_movimentacoes'::regclass
          and conname =
            'colaboradores_movimentacoes_tipo_check'
    ) then
        raise exception
            'Constraint colaboradores_movimentacoes_tipo_check não localizada.';
    end if;
end;
$preflight$;

alter table
    public.colaboradores_movimentacoes
drop constraint
    colaboradores_movimentacoes_tipo_check;

alter table
    public.colaboradores_movimentacoes
add constraint
    colaboradores_movimentacoes_tipo_check
check (
    tipo_movimentacao in (
        'ADMISSAO',
        'DESLIGAMENTO_OPERACIONAL',
        'REMOBILIZACAO',
        'DEMISSAO',
        'READMISSAO',
        'CORRECAO_CADASTRAL',
        'REGULARIZACAO_DEMISSAO_LEGADA',
        'CORRECAO_INATIVACAO_LEGADA',
        'ALTERACAO_SITUACAO_OBRA'
    )
);

create or replace function
    public.alterar_situacao_obra_colaborador(
        p_colaborador_id uuid,
        p_data_evento date,
        p_motivo text,
        p_observacao text default null,
        p_status_mobilizacao_novo text default null
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

    v_motivo text;
    v_observacao text;

    v_status_vinculo_atual text;
    v_status_mobilizacao_atual text;
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
            'Usuário sem permissão para alterar a situação deste colaborador.'
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

    v_status_vinculo_atual :=
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

    v_status_mobilizacao_novo :=
        case lower(
            btrim(
                coalesce(
                    p_status_mobilizacao_novo,
                    ''
                )
            )
        )
            when 'em análise'
                then 'Em análise'
            when 'liberado'
                then 'Liberado'
            when 'com pendência'
                then 'Com pendência'
            when 'bloqueado'
                then 'Bloqueado'
            else null
        end;

    if (
        v_motivo is null
        or char_length(v_motivo) < 3
        or char_length(v_motivo) > 500
    ) then
        raise exception
            'Informe um motivo entre 3 e 500 caracteres.'
            using errcode = '22023';
    end if;

    if (
        v_observacao is not null
        and char_length(v_observacao) > 2000
    ) then
        raise exception
            'A observação deve possuir no máximo 2.000 caracteres.'
            using errcode = '22023';
    end if;

    if (
        p_data_evento is null
        or p_data_evento > v_data_atual
    ) then
        raise exception
            'Informe uma data de alteração válida e não futura.'
            using errcode = '22023';
    end if;

    if (
        v_anterior.data_admissao is not null
        and p_data_evento < v_anterior.data_admissao
    ) then
        raise exception
            'A data da alteração não pode ser anterior à admissão.'
            using errcode = '22023';
    end if;

    if v_status_vinculo_atual <> 'ativo' then
        raise exception
            'Somente colaborador com vínculo ativo pode ter a situação na obra alterada.'
            using errcode = '22023';
    end if;

    if v_anterior.data_demissao is not null then
        raise exception
            'Colaborador demitido deve ser readmitido antes de alterar a situação na obra.'
            using errcode = '22023';
    end if;

    if (
        v_anterior.data_desligamento is not null
        or v_status_mobilizacao_atual = 'desmobilizado'
    ) then
        raise exception
            'Colaborador desmobilizado deve ser remobilizado antes de alterar a situação na obra.'
            using errcode = '22023';
    end if;

    if v_status_mobilizacao_atual not in (
        'em análise',
        'liberado',
        'com pendência',
        'bloqueado'
    ) then
        raise exception
            'A situação atual não permite alteração direta.'
            using errcode = '22023';
    end if;

    if v_status_mobilizacao_novo is null then
        raise exception
            'Informe uma nova situação válida: Em análise, Liberado, Com pendência ou Bloqueado.'
            using errcode = '22023';
    end if;

    if (
        lower(v_status_mobilizacao_novo) =
        v_status_mobilizacao_atual
    ) then
        raise exception
            'A nova situação deve ser diferente da situação atual.'
            using errcode = '22023';
    end if;

    if exists (
        select 1
        from public.colaboradores_condicoes_temporarias
        where colaborador_id =
            v_anterior.id
          and data_retorno is null
    ) then
        raise exception
            'Registre o retorno da condição temporária antes de alterar a situação na obra.'
            using errcode = '22023';
    end if;

    perform set_config(
        'safescan.movimentacao_colaborador_autorizada',
        'on',
        true
    );

    update public.colaboradores
    set
        status_mobilizacao =
            v_status_mobilizacao_novo
    where id =
        p_colaborador_id
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
        'ALTERACAO_SITUACAO_OBRA',
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
            'ALTERACAO_SITUACAO_OBRA'
    );

exception
    when others then
        perform set_config(
            'safescan.movimentacao_colaborador_autorizada',
            'off',
            true
        );

        raise;
end;
$function$;

comment on function
    public.alterar_situacao_obra_colaborador(
        uuid,
        date,
        text,
        text,
        text
    )
is
'Alteração controlada da situação operacional do colaborador na obra, com histórico auditável e preservação do vínculo profissional.';

revoke all
on function
    public.alterar_situacao_obra_colaborador(
        uuid,
        date,
        text,
        text,
        text
    )
from public, anon;

grant execute
on function
    public.alterar_situacao_obra_colaborador(
        uuid,
        date,
        text,
        text,
        text
    )
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;