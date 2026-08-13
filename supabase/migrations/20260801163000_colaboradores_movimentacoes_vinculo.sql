-- ============================================================================
-- SafeScan Brasil
-- Ciclo histórico de vínculo dos colaboradores
--
-- Esta migration cria:
-- - data_desligamento e data_demissao em public.colaboradores;
-- - tabela public.colaboradores_movimentacoes;
-- - validações de consistência;
-- - RLS para consulta do histórico;
-- - RPCs transacionais para desligamento, demissão, remobilização e readmissão.
--
-- Não realiza backfill nem altera os colaboradores existentes.
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
        'public.usuario_tem_permissao_sistema(text,text)'
    ) is null then
        raise exception
            'Função obrigatória public.usuario_tem_permissao_sistema(text,text) não localizada.';
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
end;
$preflight$;

alter table public.colaboradores
    add column if not exists data_desligamento date,
    add column if not exists data_demissao date;

comment on column public.colaboradores.data_desligamento
is
'Data em que o colaborador saiu da operação controlada pelo SafeScan, sem necessariamente encerrar o vínculo empregatício.';

comment on column public.colaboradores.data_demissao
is
'Data de encerramento do vínculo empregatício do colaborador.';

do $constraints$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.colaboradores'::regclass
          and conname = 'colaboradores_datas_vinculo_ordem_check'
    ) then
        alter table public.colaboradores
            add constraint colaboradores_datas_vinculo_ordem_check
            check (
                (
                    data_admissao is null
                    or data_desligamento is null
                    or data_desligamento >= data_admissao
                )
                and
                (
                    data_admissao is null
                    or data_demissao is null
                    or data_demissao >= data_admissao
                )
                and
                (
                    data_desligamento is null
                    or data_demissao is null
                    or data_desligamento <= data_demissao
                )
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.colaboradores'::regclass
          and conname = 'colaboradores_demissao_status_check'
    ) then
        alter table public.colaboradores
            add constraint colaboradores_demissao_status_check
            check (
                data_demissao is null
                or (
                    lower(
                        btrim(
                            coalesce(status, '')
                        )
                    ) = 'inativo'
                    and lower(
                        btrim(
                            coalesce(status_mobilizacao, '')
                        )
                    ) = 'desmobilizado'
                )
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.colaboradores'::regclass
          and conname = 'colaboradores_desligamento_status_check'
    ) then
        alter table public.colaboradores
            add constraint colaboradores_desligamento_status_check
            check (
                data_desligamento is null
                or data_demissao is not null
                or (
                    lower(
                        btrim(
                            coalesce(status, '')
                        )
                    ) = 'ativo'
                    and lower(
                        btrim(
                            coalesce(status_mobilizacao, '')
                        )
                    ) = 'desmobilizado'
                )
            );
    end if;
end;
$constraints$;

create index if not exists
    idx_colaboradores_data_desligamento
on public.colaboradores (
    data_desligamento
)
where data_desligamento is not null;

create index if not exists
    idx_colaboradores_data_demissao
on public.colaboradores (
    data_demissao
)
where data_demissao is not null;

create index if not exists
    idx_colaboradores_empresa_datas_vinculo
on public.colaboradores (
    empresa_id,
    data_admissao,
    data_desligamento,
    data_demissao
);

create table if not exists
    public.colaboradores_movimentacoes (
        id uuid primary key default gen_random_uuid(),

        colaborador_id uuid not null
            references public.colaboradores(id)
            on delete restrict,

        empresa_id uuid null
            references public.empresas(id)
            on delete set null,

        tipo_movimentacao text not null,

        data_evento date not null,

        status_anterior text null,
        status_novo text null,

        status_mobilizacao_anterior text null,
        status_mobilizacao_novo text null,

        data_admissao_anterior date null,
        data_admissao_nova date null,

        data_desligamento_anterior date null,
        data_desligamento_nova date null,

        data_demissao_anterior date null,
        data_demissao_nova date null,

        motivo text null,
        observacao text null,

        usuario_id uuid null
            references auth.users(id)
            on delete set null,

        usuario_email text null,

        created_at timestamptz not null
            default now(),

        constraint
            colaboradores_movimentacoes_tipo_check
        check (
            tipo_movimentacao in (
                'ADMISSAO',
                'DESLIGAMENTO_OPERACIONAL',
                'REMOBILIZACAO',
                'DEMISSAO',
                'READMISSAO',
                'CORRECAO_CADASTRAL'
            )
        ),

        constraint
            colaboradores_movimentacoes_motivo_tamanho_check
        check (
            motivo is null
            or char_length(
                btrim(motivo)
            ) between 3 and 500
        ),

        constraint
            colaboradores_movimentacoes_observacao_tamanho_check
        check (
            observacao is null
            or char_length(observacao) <= 2000
        )
    );

comment on table public.colaboradores_movimentacoes
is
'Histórico imutável de admissão, desligamento operacional, remobilização, demissão, readmissão e correções cadastrais dos colaboradores.';

comment on column
    public.colaboradores_movimentacoes.tipo_movimentacao
is
'Evento funcional que modificou o ciclo de vínculo do colaborador.';

comment on column
    public.colaboradores_movimentacoes.data_evento
is
'Data efetiva da movimentação, independente do timestamp de registro no sistema.';

create index if not exists
    idx_colaboradores_movimentacoes_colaborador_data
on public.colaboradores_movimentacoes (
    colaborador_id,
    data_evento desc,
    created_at desc
);

create index if not exists
    idx_colaboradores_movimentacoes_empresa_data
on public.colaboradores_movimentacoes (
    empresa_id,
    data_evento desc
);

create index if not exists
    idx_colaboradores_movimentacoes_tipo_data
on public.colaboradores_movimentacoes (
    tipo_movimentacao,
    data_evento desc
);

alter table
    public.colaboradores_movimentacoes
enable row level security;

revoke all
on table public.colaboradores_movimentacoes
from public, anon, authenticated;

grant select
on table public.colaboradores_movimentacoes
to authenticated;

grant select, insert, update, delete
on table public.colaboradores_movimentacoes
to service_role;

drop policy if exists
    colaboradores_movimentacoes_select_usuarios_ativos
on public.colaboradores_movimentacoes;

create policy
    colaboradores_movimentacoes_select_usuarios_ativos
on public.colaboradores_movimentacoes
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
    public.usuario_pode_movimentar_colaborador(
        p_empresa_id uuid
    )
returns boolean
language sql
volatile
security definer
set search_path = pg_catalog, public, auth
as $function$
    select
        auth.uid() is not null
        and public.usuario_ativo_sistema()
        and public.usuario_tem_permissao_sistema(
            'colaboradores',
            'editar'
        )
        and (
            not public.usuario_tem_escopo_empresa_atribuido()
            or public.usuario_admin_global()
            or (
                p_empresa_id is not null
                and public.usuario_tem_acesso_empresa(
                    p_empresa_id
                )
            )
        );
$function$;

revoke all
on function
    public.usuario_pode_movimentar_colaborador(uuid)
from public, anon;

grant execute
on function
    public.usuario_pode_movimentar_colaborador(uuid)
to authenticated, service_role;

create or replace function
    public.validar_consistencia_vinculo_colaborador()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
    v_movimentacao_autorizada boolean :=
        coalesce(
            current_setting(
                'safescan.movimentacao_colaborador_autorizada',
                true
            ),
            ''
        ) = 'on';

    v_data_atual date :=
        (
            now()
            at time zone 'America/Sao_Paulo'
        )::date;
begin
    if (
        tg_op = 'INSERT'
        and not v_movimentacao_autorizada
    ) then
        if (
            new.data_desligamento is not null
            or new.data_demissao is not null
        ) then
            raise exception
                'Datas de desligamento ou demissão devem ser registradas pelas funções de movimentação do colaborador.'
                using errcode = '42501';
        end if;

        if (
            lower(
                btrim(
                    coalesce(new.status, '')
                )
            ) = 'inativo'
            or lower(
                btrim(
                    coalesce(
                        new.status_mobilizacao,
                        ''
                    )
                )
            ) = 'inativo'
        ) then
            raise exception
                'Um novo colaborador não pode iniciar como inativo. Use as funções de movimentação após o cadastro.'
                using errcode = '42501';
        end if;
    end if;

    if (
        tg_op = 'UPDATE'
        and not v_movimentacao_autorizada
    ) then
        if (
            new.data_desligamento
                is distinct from old.data_desligamento
            or new.data_demissao
                is distinct from old.data_demissao
        ) then
            raise exception
                'Datas de desligamento ou demissão devem ser alteradas pelas funções de movimentação do colaborador.'
                using errcode = '42501';
        end if;

        if (
            (
                new.status
                    is distinct from old.status
                and (
                    lower(
                        btrim(
                            coalesce(new.status, '')
                        )
                    ) = 'inativo'
                    or lower(
                        btrim(
                            coalesce(old.status, '')
                        )
                    ) = 'inativo'
                )
            )
            or (
                new.status_mobilizacao
                    is distinct from old.status_mobilizacao
                and (
                    lower(
                        btrim(
                            coalesce(
                                new.status_mobilizacao,
                                ''
                            )
                        )
                    ) = 'inativo'
                    or lower(
                        btrim(
                            coalesce(
                                old.status_mobilizacao,
                                ''
                            )
                        )
                    ) = 'inativo'
                )
            )
        ) then
            raise exception
                'Transições para ou a partir do estado inativo devem ser realizadas pelas funções de movimentação do colaborador.'
                using errcode = '42501';
        end if;
    end if;

    if (
        new.data_desligamento is not null
        and new.data_desligamento > v_data_atual
    ) then
        raise exception
            'A data de desligamento não pode ser futura.'
            using errcode = '22023';
    end if;

    if (
        new.data_demissao is not null
        and new.data_demissao > v_data_atual
    ) then
        raise exception
            'A data de demissão não pode ser futura.'
            using errcode = '22023';
    end if;

    if (
        new.data_admissao is not null
        and new.data_desligamento is not null
        and new.data_desligamento < new.data_admissao
    ) then
        raise exception
            'A data de desligamento não pode ser anterior à admissão.'
            using errcode = '22023';
    end if;

    if (
        new.data_admissao is not null
        and new.data_demissao is not null
        and new.data_demissao < new.data_admissao
    ) then
        raise exception
            'A data de demissão não pode ser anterior à admissão.'
            using errcode = '22023';
    end if;

    if (
        new.data_desligamento is not null
        and new.data_demissao is not null
        and new.data_desligamento > new.data_demissao
    ) then
        raise exception
            'O desligamento operacional não pode ocorrer depois da demissão.'
            using errcode = '22023';
    end if;

    return new;
end;
$function$;

revoke all
on function
    public.validar_consistencia_vinculo_colaborador()
from public, anon, authenticated;

drop trigger if exists
    trg_validar_consistencia_vinculo_colaborador
on public.colaboradores;

create trigger
    trg_validar_consistencia_vinculo_colaborador
before insert or update
on public.colaboradores
for each row
execute function
    public.validar_consistencia_vinculo_colaborador();

create or replace function
    public.registrar_admissao_inicial_colaborador()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
begin
    if new.data_admissao is null then
        return new;
    end if;

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
        new.id,
        new.empresa_id,
        'ADMISSAO',
        new.data_admissao,
        null,
        new.status,
        null,
        new.status_mobilizacao,
        null,
        new.data_admissao,
        null,
        new.data_desligamento,
        null,
        new.data_demissao,
        'Cadastro inicial',
        null,
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
    );

    return new;
end;
$function$;

revoke all
on function
    public.registrar_admissao_inicial_colaborador()
from public, anon, authenticated;

drop trigger if exists
    trg_registrar_admissao_inicial_colaborador
on public.colaboradores;

create trigger
    trg_registrar_admissao_inicial_colaborador
after insert
on public.colaboradores
for each row
execute function
    public.registrar_admissao_inicial_colaborador();

create or replace function
    public.proteger_exclusao_colaborador_com_vinculo()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
    if (
        old.data_admissao is not null
        or old.data_desligamento is not null
        or old.data_demissao is not null
        or exists (
            select 1
            from public.colaboradores_movimentacoes
            where colaborador_id = old.id
        )
    ) then
        raise exception
            'Colaborador com admissão ou histórico de vínculo não pode ser excluído. Utilize desligamento operacional ou demissão.'
            using errcode = '23503';
    end if;

    return old;
end;
$function$;

revoke all
on function
    public.proteger_exclusao_colaborador_com_vinculo()
from public, anon, authenticated;

drop trigger if exists
    trg_proteger_exclusao_colaborador_com_vinculo
on public.colaboradores;

create trigger
    trg_proteger_exclusao_colaborador_com_vinculo
before delete
on public.colaboradores
for each row
execute function
    public.proteger_exclusao_colaborador_com_vinculo();

create or replace function
    public.desligar_colaborador_operacao(
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
    v_motivo text;
    v_observacao text;
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
                coalesce(p_motivo, '')
            ),
            ''
        );

    v_observacao :=
        nullif(
            btrim(
                coalesce(p_observacao, '')
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

create or replace function
    public.demitir_colaborador(
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
    v_motivo text;
    v_observacao text;
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
                coalesce(p_motivo, '')
            ),
            ''
        );

    v_observacao :=
        nullif(
            btrim(
                coalesce(p_observacao, '')
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
            'Informe uma data de demissão válida e não futura.'
            using errcode = '22023';
    end if;

    if (
        v_anterior.data_admissao is not null
        and p_data_evento < v_anterior.data_admissao
    ) then
        raise exception
            'A data de demissão não pode ser anterior à admissão.'
            using errcode = '22023';
    end if;

    if (
        v_anterior.data_desligamento is not null
        and p_data_evento < v_anterior.data_desligamento
    ) then
        raise exception
            'A demissão não pode ser anterior ao desligamento operacional já registrado.'
            using errcode = '22023';
    end if;

    if v_anterior.data_demissao is not null then
        raise exception
            'O colaborador já possui demissão registrada.'
            using errcode = '22023';
    end if;

    perform set_config(
        'safescan.movimentacao_colaborador_autorizada',
        'on',
        true
    );

    update public.colaboradores
    set
        data_demissao = p_data_evento,
        status = 'Inativo',
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
        'DEMISSAO',
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
            'DEMISSAO'
    );
end;
$function$;

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
                coalesce(p_motivo, '')
            ),
            ''
        );

    v_observacao :=
        nullif(
            btrim(
                coalesce(p_observacao, '')
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

    if v_anterior.data_desligamento is null then
        raise exception
            'O colaborador não possui desligamento operacional para remobilização.'
            using errcode = '22023';
    end if;

    if p_data_evento < v_anterior.data_desligamento then
        raise exception
            'A remobilização não pode ser anterior ao desligamento operacional.'
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

create or replace function
    public.readmitir_colaborador(
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
                coalesce(p_motivo, '')
            ),
            ''
        );

    v_observacao :=
        nullif(
            btrim(
                coalesce(p_observacao, '')
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
            'Informe uma data de readmissão válida e não futura.'
            using errcode = '22023';
    end if;

    if v_anterior.data_demissao is null then
        raise exception
            'O colaborador não possui demissão registrada para readmissão.'
            using errcode = '22023';
    end if;

    if p_data_evento <= v_anterior.data_demissao then
        raise exception
            'A readmissão deve ocorrer depois da demissão anterior.'
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
        data_admissao = p_data_evento,
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
        'READMISSAO',
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
            'READMISSAO'
    );
end;
$function$;

revoke all
on function
    public.desligar_colaborador_operacao(
        uuid,
        date,
        text,
        text
    )
from public, anon;

revoke all
on function
    public.demitir_colaborador(
        uuid,
        date,
        text,
        text
    )
from public, anon;

revoke all
on function
    public.remobilizar_colaborador(
        uuid,
        date,
        text,
        text,
        text
    )
from public, anon;

revoke all
on function
    public.readmitir_colaborador(
        uuid,
        date,
        text,
        text,
        text
    )
from public, anon;

grant execute
on function
    public.desligar_colaborador_operacao(
        uuid,
        date,
        text,
        text
    )
to authenticated, service_role;

grant execute
on function
    public.demitir_colaborador(
        uuid,
        date,
        text,
        text
    )
to authenticated, service_role;

grant execute
on function
    public.remobilizar_colaborador(
        uuid,
        date,
        text,
        text,
        text
    )
to authenticated, service_role;

grant execute
on function
    public.readmitir_colaborador(
        uuid,
        date,
        text,
        text,
        text
    )
to authenticated, service_role;

notify pgrst, 'reload schema';

commit;
