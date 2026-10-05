-- SafeScan Brasil
-- R2.11 P5-B3-E
-- Registro de impressão QR com suporte ao administrador do tenant.
--
-- Regras preservadas:
-- - administrador global;
-- - permissão operacional legada;
-- - administrador ativo do tenant;
-- - isolamento por empresa/tenant;
-- - histórico e atualização do estado da impressão.

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
    if auth.uid() is null then
        raise exception
            'Usuário não autenticado.';
    end if;

    if not public.usuario_ativo_sistema() then
        raise exception
            'Usuário sem acesso ativo ao sistema.';
    end if;

    if not (
        public.usuario_admin_global()
        or public.usuario_tem_permissao_sistema(
            'colaboradores',
            'editar'
        )
        or exists (
            select
                1
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
                public.usuario_pode_movimentar_colaborador(
                    c.empresa_id
                )
        )
    ) then
        raise exception
            'Usuário sem permissão para registrar impressão de QR.';
    end if;

    if v_origem not in (
        'INDIVIDUAL',
        'LOTE'
    ) then
        raise exception
            'Origem de impressão inválida.';
    end if;

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

    if v_origem = 'LOTE' then
        v_lote_id :=
            coalesce(
                p_lote_id,
                gen_random_uuid()
            );
    else
        v_lote_id := null;
    end if;

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
        public.usuario_pode_movimentar_colaborador(
            c.empresa_id
        );

    if v_total_autorizados <> v_total_ids then
        raise exception
            'Um ou mais colaboradores não existem ou estão fora do escopo autorizado.';
    end if;

    select
        u.email
    into
        v_usuario_email
    from auth.users u
    where u.id = auth.uid();

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

comment on function
    public.registrar_impressao_qr_colaboradores(
        uuid[],
        text,
        uuid
    )
is
'Registra impressão de QR preservando administrador global, permissão operacional legada e administrador ativo do tenant, com autorização individual por empresa.';