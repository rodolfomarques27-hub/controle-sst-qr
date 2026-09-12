-- ============================================================================
-- SafeScan Brasil
-- Ciclo Profissional — condições temporárias
--
-- Objetivo:
-- - registrar férias, afastamentos e licenças sem alterar vínculo profissional;
-- - preservar status e status_mobilizacao do colaborador;
-- - permitir no máximo uma condição sem retorno por colaborador;
-- - iniciar e encerrar condições somente por RPCs auditáveis.
--
-- Esta migration NÃO realiza backfill.
-- ============================================================================

begin;

do $preflight$
begin
    if to_regclass('public.colaboradores') is null then
        raise exception
            'Tabela obrigatória public.colaboradores não localizada.';
    end if;

    if to_regclass('public.empresas') is null then
        raise exception
            'Tabela obrigatória public.empresas não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_ativo_sistema()'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_ativo_sistema() não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_acesso_empresa(uuid)'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_tem_acesso_empresa(uuid) não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_tem_escopo_empresa_atribuido()'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_tem_escopo_empresa_atribuido() não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_admin_global()'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_admin_global() não localizada.';
    end if;

    if to_regprocedure(
        'public.usuario_pode_movimentar_colaborador(uuid)'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_pode_movimentar_colaborador(uuid) não localizada.';
    end if;
end;
$preflight$;

create table if not exists
    public.colaboradores_condicoes_temporarias (
        id uuid primary key
            default gen_random_uuid(),

        colaborador_id uuid not null
            references public.colaboradores(id)
            on delete restrict,

        empresa_id uuid null
            references public.empresas(id)
            on delete set null,

        tipo text not null,

        data_inicio date not null,

        data_fim_prevista date null,

        data_retorno date null,

        motivo text null,

        observacao text null,

        registrado_por uuid null
            references auth.users(id)
            on delete set null,

        registrado_por_email text null,

        created_at timestamptz not null
            default now(),

        retorno_registrado_por uuid null
            references auth.users(id)
            on delete set null,

        retorno_registrado_por_email text null,

        retorno_registrado_em timestamptz null,

        updated_at timestamptz not null
            default now(),

        constraint
            colaboradores_cond_temp_tipo_check
        check (
            tipo in (
                'FERIAS',
                'AFASTAMENTO_MEDICO',
                'AFASTAMENTO_INSS_PREVIDENCIARIO',
                'AFASTAMENTO_INSS_ACIDENTE_TRABALHO',
                'LICENCA_MATERNIDADE',
                'LICENCA_PATERNIDADE',
                'AFASTAMENTO_ADMINISTRATIVO',
                'OUTRO_AFASTAMENTO'
            )
        ),

        constraint
            colaboradores_cond_temp_fim_check
        check (
            data_fim_prevista is null
            or data_fim_prevista >= data_inicio
        ),

        constraint
            colaboradores_cond_temp_retorno_check
        check (
            data_retorno is null
            or data_retorno >= data_inicio
        ),

        constraint
            colaboradores_cond_temp_motivo_check
        check (
            motivo is null
            or char_length(
                btrim(motivo)
            ) between 3 and 500
        ),

        constraint
            colaboradores_cond_temp_observacao_check
        check (
            observacao is null
            or char_length(observacao) <= 2000
        )
    );

comment on table
    public.colaboradores_condicoes_temporarias
is
'Histórico auditável de férias, afastamentos e licenças temporárias dos colaboradores, independente do vínculo e da mobilização na obra.';

comment on column
    public.colaboradores_condicoes_temporarias.data_inicio
is
'Data efetiva ou programada de início da condição temporária.';

comment on column
    public.colaboradores_condicoes_temporarias.data_fim_prevista
is
'Previsão de término. Não encerra automaticamente a condição.';

comment on column
    public.colaboradores_condicoes_temporarias.data_retorno
is
'Data do retorno efetivo. Enquanto nula, a condição permanece aberta.';

create unique index if not exists
    uq_colab_cond_temp_aberta
on public.colaboradores_condicoes_temporarias (
    colaborador_id
)
where data_retorno is null;

create index if not exists
    idx_colab_cond_temp_colaborador_periodo
on public.colaboradores_condicoes_temporarias (
    colaborador_id,
    data_inicio desc,
    created_at desc
);

create index if not exists
    idx_colab_cond_temp_empresa_periodo
on public.colaboradores_condicoes_temporarias (
    empresa_id,
    data_inicio desc
);

create index if not exists
    idx_colab_cond_temp_abertas
on public.colaboradores_condicoes_temporarias (
    colaborador_id,
    data_inicio
)
where data_retorno is null;

alter table
    public.colaboradores_condicoes_temporarias
enable row level security;

revoke all
on table public.colaboradores_condicoes_temporarias
from public, anon, authenticated;

grant select
on table public.colaboradores_condicoes_temporarias
to authenticated;

grant select, insert, update, delete
on table public.colaboradores_condicoes_temporarias
to service_role;

drop policy if exists
    colaboradores_cond_temp_select_usuarios_ativos
on public.colaboradores_condicoes_temporarias;

create policy
    colaboradores_cond_temp_select_usuarios_ativos
on public.colaboradores_condicoes_temporarias
for select
to authenticated
using (
    public.usuario_ativo_sistema()
    and (
        not public.usuario_tem_escopo_empresa_atribuido()
        or public.usuario_admin_global()
        or (
            empresa_id is not null
            and public.usuario_tem_acesso_empresa(
                empresa_id
            )
        )
    )
);

create or replace function
    public.iniciar_condicao_temporaria_colaborador(
        p_colaborador_id uuid,
        p_tipo text,
        p_data_inicio date,
        p_data_fim_prevista date default null,
        p_motivo text default null,
        p_observacao text default null
    )
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_colaborador public.colaboradores%rowtype;

    v_condicao
        public.colaboradores_condicoes_temporarias%rowtype;

    v_tipo text;

    v_motivo text;

    v_observacao text;

    v_data_atual date :=
        (
            now()
            at time zone 'America/Sao_Paulo'
        )::date;
begin
    select *
    into v_colaborador
    from public.colaboradores
    where id = p_colaborador_id
    for update;

    if not found then
        raise exception
            'Colaborador não localizado.'
            using errcode = 'P0002';
    end if;

    if not public.usuario_pode_movimentar_colaborador(
        v_colaborador.empresa_id
    ) then
        raise exception
            'Usuário sem permissão para registrar condição temporária neste colaborador.'
            using errcode = '42501';
    end if;

    if (
        lower(
            btrim(
                coalesce(
                    v_colaborador.status,
                    ''
                )
            )
        ) <> 'ativo'
        or v_colaborador.data_demissao is not null
    ) then
        raise exception
            'Somente colaborador com vínculo ativo pode iniciar condição temporária.'
            using errcode = '22023';
    end if;

    v_tipo :=
        upper(
            btrim(
                coalesce(
                    p_tipo,
                    ''
                )
            )
        );

    if v_tipo not in (
        'FERIAS',
        'AFASTAMENTO_MEDICO',
        'AFASTAMENTO_INSS_PREVIDENCIARIO',
        'AFASTAMENTO_INSS_ACIDENTE_TRABALHO',
        'LICENCA_MATERNIDADE',
        'LICENCA_PATERNIDADE',
        'AFASTAMENTO_ADMINISTRATIVO',
        'OUTRO_AFASTAMENTO'
    ) then
        raise exception
            'Tipo de condição temporária inválido.'
            using errcode = '22023';
    end if;

    if p_data_inicio is null then
        raise exception
            'Informe a data de início da condição temporária.'
            using errcode = '22023';
    end if;

    if p_data_inicio > v_data_atual then
        raise exception
            'A data de início da condição temporária não pode ser futura.'
            using errcode = '22023';
    end if;

    if (
        v_colaborador.data_admissao is not null
        and p_data_inicio < v_colaborador.data_admissao
    ) then
        raise exception
            'A condição temporária não pode iniciar antes da admissão do colaborador.'
            using errcode = '22023';
    end if;

    if (
        p_data_fim_prevista is not null
        and p_data_fim_prevista < p_data_inicio
    ) then
        raise exception
            'A previsão de término não pode ser anterior ao início.'
            using errcode = '22023';
    end if;

    if exists (
        select 1
        from public.colaboradores_condicoes_temporarias
        where colaborador_id = p_colaborador_id
          and data_retorno is null
    ) then
        raise exception
            'O colaborador já possui uma condição temporária aberta.'
            using errcode = '23505';
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

    if (
        v_motivo is not null
        and char_length(v_motivo) not between 3 and 500
    ) then
        raise exception
            'O motivo deve possuir entre 3 e 500 caracteres.'
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

    insert into
        public.colaboradores_condicoes_temporarias (
            colaborador_id,
            empresa_id,
            tipo,
            data_inicio,
            data_fim_prevista,
            data_retorno,
            motivo,
            observacao,
            registrado_por,
            registrado_por_email
        )
    values (
        v_colaborador.id,
        v_colaborador.empresa_id,
        v_tipo,
        p_data_inicio,
        p_data_fim_prevista,
        null,
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
    returning *
    into v_condicao;

    return jsonb_build_object(
        'condicao',
            to_jsonb(v_condicao),

        'tipo_operacao',
            'INICIO_CONDICAO_TEMPORARIA'
    );
end;
$function$;

create or replace function
    public.registrar_retorno_condicao_temporaria_colaborador(
        p_colaborador_id uuid,
        p_data_retorno date
    )
returns jsonb
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_colaborador public.colaboradores%rowtype;

    v_condicao
        public.colaboradores_condicoes_temporarias%rowtype;

    v_data_atual date :=
        (
            now()
            at time zone 'America/Sao_Paulo'
        )::date;
begin
    select *
    into v_colaborador
    from public.colaboradores
    where id = p_colaborador_id
    for update;

    if not found then
        raise exception
            'Colaborador não localizado.'
            using errcode = 'P0002';
    end if;

    if not public.usuario_pode_movimentar_colaborador(
        v_colaborador.empresa_id
    ) then
        raise exception
            'Usuário sem permissão para registrar retorno deste colaborador.'
            using errcode = '42501';
    end if;

    select *
    into v_condicao
    from public.colaboradores_condicoes_temporarias
    where colaborador_id = p_colaborador_id
      and data_retorno is null
    order by
        data_inicio desc,
        created_at desc
    limit 1
    for update;

    if not found then
        raise exception
            'O colaborador não possui condição temporária aberta.'
            using errcode = 'P0002';
    end if;

    if (
        p_data_retorno is null
        or p_data_retorno > v_data_atual
    ) then
        raise exception
            'Informe uma data de retorno válida e não futura.'
            using errcode = '22023';
    end if;

    if p_data_retorno < v_condicao.data_inicio then
        raise exception
            'A data de retorno não pode ser anterior ao início da condição temporária.'
            using errcode = '22023';
    end if;

    update public.colaboradores_condicoes_temporarias
    set
        data_retorno = p_data_retorno,
        retorno_registrado_por = auth.uid(),
        retorno_registrado_por_email =
            nullif(
                btrim(
                    coalesce(
                        auth.jwt() ->> 'email',
                        ''
                    )
                ),
                ''
            ),
        retorno_registrado_em = now(),
        updated_at = now()
    where id = v_condicao.id
      and data_retorno is null
    returning *
    into v_condicao;

    if not found then
        raise exception
            'A condição temporária já foi encerrada por outra operação.'
            using errcode = '40001';
    end if;

    return jsonb_build_object(
        'condicao',
            to_jsonb(v_condicao),

        'tipo_operacao',
            'RETORNO_CONDICAO_TEMPORARIA'
    );
end;
$function$;

revoke all
on function
    public.iniciar_condicao_temporaria_colaborador(
        uuid,
        text,
        date,
        date,
        text,
        text
    )
from public, anon;

revoke all
on function
    public.registrar_retorno_condicao_temporaria_colaborador(
        uuid,
        date
    )
from public, anon;

grant execute
on function
    public.iniciar_condicao_temporaria_colaborador(
        uuid,
        text,
        date,
        date,
        text,
        text
    )
to authenticated, service_role;

grant execute
on function
    public.registrar_retorno_condicao_temporaria_colaborador(
        uuid,
        date
    )
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
