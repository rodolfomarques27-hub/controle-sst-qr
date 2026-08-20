-- ============================================================
-- SafeScan Brasil
-- QR Code do colaborador — rastreabilidade de impressão
--
-- Objetivos:
-- - armazenar a última impressão confirmada no colaborador;
-- - preservar histórico completo das confirmações;
-- - suportar impressão individual e em lote;
-- - preservar snapshots de colaborador/empresa;
-- - manter segregação por empresa;
-- - impedir gravação direta pelo cliente;
-- - disponibilizar RPC atômica para confirmação.
--
-- IMPORTANTE:
-- abrir window.print() não significa impressão confirmada.
-- Este estado só deve ser gravado após confirmação explícita
-- do usuário na interface.
-- ============================================================


-- ============================================================
-- 1. ESTADO RÁPIDO NO COLABORADOR
-- ============================================================

alter table public.colaboradores
    add column if not exists
        qr_ultima_impressao_em timestamptz null;

comment on column
    public.colaboradores.qr_ultima_impressao_em
is
'Data/hora da última impressão de QR/crachá explicitamente confirmada pelo usuário. NULL significa que não existe impressão confirmada registrada.';


-- ============================================================
-- 2. HISTÓRICO IMUTÁVEL DE IMPRESSÕES CONFIRMADAS
-- ============================================================

create table if not exists
    public.colaboradores_qr_impressoes (
        id uuid primary key
            default gen_random_uuid(),

        colaborador_id uuid null
            references public.colaboradores(id)
            on delete set null,

        colaborador_nome text not null,

        empresa_id uuid null
            references public.empresas(id)
            on delete set null,

        empresa_nome text null,

        impresso_em timestamptz not null
            default now(),

        usuario_id uuid null
            references auth.users(id)
            on delete set null,

        usuario_email text null,

        origem text not null,

        lote_id uuid null,

        created_at timestamptz not null
            default now(),

        constraint
            colaboradores_qr_impressoes_origem_check
        check (
            origem in (
                'INDIVIDUAL',
                'LOTE'
            )
        ),

        constraint
            colaboradores_qr_impressoes_lote_check
        check (
            (
                origem = 'INDIVIDUAL'
                and lote_id is null
            )
            or
            (
                origem = 'LOTE'
                and lote_id is not null
            )
        ),

        constraint
            colaboradores_qr_impressoes_nome_check
        check (
            char_length(
                btrim(colaborador_nome)
            ) between 1 and 300
        ),

        constraint
            colaboradores_qr_impressoes_usuario_email_check
        check (
            usuario_email is null
            or char_length(
                btrim(usuario_email)
            ) <= 320
        )
    );

comment on table
    public.colaboradores_qr_impressoes
is
'Histórico das impressões de QR/crachá dos colaboradores explicitamente confirmadas pelo usuário.';

comment on column
    public.colaboradores_qr_impressoes.colaborador_nome
is
'Snapshot do nome do colaborador no momento da confirmação da impressão.';

comment on column
    public.colaboradores_qr_impressoes.empresa_nome
is
'Snapshot do nome da empresa do colaborador no momento da confirmação da impressão.';

comment on column
    public.colaboradores_qr_impressoes.origem
is
'Origem da confirmação: INDIVIDUAL ou LOTE.';

comment on column
    public.colaboradores_qr_impressoes.lote_id
is
'Identificador comum das confirmações pertencentes à mesma impressão em lote.';


-- ============================================================
-- 3. ÍNDICES
-- ============================================================

create index if not exists
    idx_colaboradores_qr_impressoes_colaborador_data
on public.colaboradores_qr_impressoes (
    colaborador_id,
    impresso_em desc
);

create index if not exists
    idx_colaboradores_qr_impressoes_empresa_data
on public.colaboradores_qr_impressoes (
    empresa_id,
    impresso_em desc
);

create index if not exists
    idx_colaboradores_qr_impressoes_lote
on public.colaboradores_qr_impressoes (
    lote_id
)
where lote_id is not null;

create index if not exists
    idx_colaboradores_qr_ultima_impressao
on public.colaboradores (
    qr_ultima_impressao_em
)
where qr_ultima_impressao_em is not null;


-- ============================================================
-- 4. RLS
-- ============================================================

alter table
    public.colaboradores_qr_impressoes
enable row level security;

revoke all
on table public.colaboradores_qr_impressoes
from public, anon, authenticated;

grant select
on table public.colaboradores_qr_impressoes
to authenticated;

grant select, insert, update, delete
on table public.colaboradores_qr_impressoes
to service_role;

drop policy if exists
    colaboradores_qr_impressoes_select_usuarios_ativos
on public.colaboradores_qr_impressoes;

create policy
    colaboradores_qr_impressoes_select_usuarios_ativos
on public.colaboradores_qr_impressoes
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


-- ============================================================
-- 5. RPC ATÔMICA
-- ============================================================

create or replace function
    public.registrar_impressao_qr_colaboradores(
        p_colaborador_ids uuid[],
        p_origem text,
        p_lote_id uuid default null
    )
returns table (
    colaborador_id uuid,
    qr_ultima_impressao_em timestamptz,
    origem text,
    lote_id uuid
)
language plpgsql
volatile
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_origem text :=
        upper(
            btrim(
                coalesce(
                    p_origem,
                    ''
                )
            )
        );

    v_agora timestamptz :=
        clock_timestamp();

    v_lote_id uuid := null;

    v_total_ids integer := 0;

    v_total_autorizados integer := 0;

    v_usuario_email text := null;
begin

    -- --------------------------------------------------------
    -- Sessão autenticada
    -- --------------------------------------------------------

    if auth.uid() is null then
        raise exception
            'Usuário não autenticado.';
    end if;

    if not public.usuario_ativo_sistema() then
        raise exception
            'Usuário sem acesso ativo ao sistema.';
    end if;

    if not public.usuario_tem_permissao_sistema(
        'colaboradores',
        'editar'
    ) then
        raise exception
            'Usuário sem permissão para registrar impressão de QR.';
    end if;


    -- --------------------------------------------------------
    -- Origem
    -- --------------------------------------------------------

    if v_origem not in (
        'INDIVIDUAL',
        'LOTE'
    ) then
        raise exception
            'Origem de impressão inválida.';
    end if;


    -- --------------------------------------------------------
    -- Quantidade real de colaboradores
    -- --------------------------------------------------------

    select
        count(*)
    into
        v_total_ids
    from (
        select distinct
            item_id
        from unnest(
            coalesce(
                p_colaborador_ids,
                array[]::uuid[]
            )
        ) as item_id
        where item_id is not null
    ) ids;

    if v_total_ids = 0 then
        raise exception
            'Nenhum colaborador informado para confirmação.';
    end if;

    if (
        v_origem = 'INDIVIDUAL'
        and v_total_ids <> 1
    ) then
        raise exception
            'Impressão individual deve conter exatamente um colaborador.';
    end if;


    -- --------------------------------------------------------
    -- Lote
    -- --------------------------------------------------------

    if v_origem = 'LOTE' then
        v_lote_id :=
            coalesce(
                p_lote_id,
                gen_random_uuid()
            );
    else
        v_lote_id := null;
    end if;


    -- --------------------------------------------------------
    -- Autorização por empresa
    --
    -- A mesma regra funcional do módulo Colaboradores é usada:
    -- usuário ativo + permissão editar + escopo empresarial.
    --
    -- IDs inexistentes também fazem a contagem divergir.
    -- --------------------------------------------------------

    select
        count(*)
    into
        v_total_autorizados
    from public.colaboradores c
    join (
        select distinct
            item_id
        from unnest(
            coalesce(
                p_colaborador_ids,
                array[]::uuid[]
            )
        ) as item_id
        where item_id is not null
    ) ids
        on ids.item_id = c.id
    where
        (
            not public.usuario_tem_escopo_empresa_atribuido()
            or public.usuario_admin_global()
            or (
                c.empresa_id is not null
                and public.usuario_tem_acesso_empresa(
                    c.empresa_id
                )
            )
        );

    if v_total_autorizados <> v_total_ids then
        raise exception
            'Um ou mais colaboradores não existem ou estão fora do escopo autorizado.';
    end if;


    -- --------------------------------------------------------
    -- Usuário responsável
    -- --------------------------------------------------------

    select
        u.email
    into
        v_usuario_email
    from auth.users u
    where u.id = auth.uid();


    -- --------------------------------------------------------
    -- Histórico
    -- --------------------------------------------------------

    insert into
        public.colaboradores_qr_impressoes (
            colaborador_id,
            colaborador_nome,
            empresa_id,
            empresa_nome,
            impresso_em,
            usuario_id,
            usuario_email,
            origem,
            lote_id,
            created_at
        )
    select
        c.id,
        c.nome,
        c.empresa_id,
        e.nome,
        v_agora,
        auth.uid(),
        v_usuario_email,
        v_origem,
        v_lote_id,
        v_agora
    from public.colaboradores c
    join (
        select distinct
            item_id
        from unnest(
            coalesce(
                p_colaborador_ids,
                array[]::uuid[]
            )
        ) as item_id
        where item_id is not null
    ) ids
        on ids.item_id = c.id
    left join public.empresas e
        on e.id = c.empresa_id;


    -- --------------------------------------------------------
    -- Estado rápido
    -- --------------------------------------------------------

    update public.colaboradores c
    set
        qr_ultima_impressao_em =
            v_agora
    where c.id in (
        select distinct
            item_id
        from unnest(
            coalesce(
                p_colaborador_ids,
                array[]::uuid[]
            )
        ) as item_id
        where item_id is not null
    );


    -- --------------------------------------------------------
    -- Resultado
    -- --------------------------------------------------------

    return query
    select
        c.id,
        c.qr_ultima_impressao_em,
        v_origem,
        v_lote_id
    from public.colaboradores c
    join (
        select distinct
            item_id
        from unnest(
            coalesce(
                p_colaborador_ids,
                array[]::uuid[]
            )
        ) as item_id
        where item_id is not null
    ) ids
        on ids.item_id = c.id
    order by
        c.nome;
end;
$function$;


-- ============================================================
-- 6. PERMISSÕES DA RPC
-- ============================================================

revoke all
on function
    public.registrar_impressao_qr_colaboradores(
        uuid[],
        text,
        uuid
    )
from public, anon, authenticated;

grant execute
on function
    public.registrar_impressao_qr_colaboradores(
        uuid[],
        text,
        uuid
    )
to authenticated, service_role;


comment on function
    public.registrar_impressao_qr_colaboradores(
        uuid[],
        text,
        uuid
    )
is
'Confirma atomicamente a impressão do QR/crachá de um ou mais colaboradores, grava histórico e atualiza a última impressão confirmada.';