begin;

-- ============================================================================
-- SAFESCAN BRASIL
-- EMPRESAS — MÚLTIPLOS CNPJS
--
-- Mantém public.empresas.cnpj intacto para compatibilidade com o sistema atual.
--
-- A nova tabela registra todos os CNPJs documentalmente aceitos para a mesma
-- empresa, incluindo matriz, filial e vínculos históricos.
-- ============================================================================

create table public.empresas_cnpjs (
    id uuid
        primary key
        default gen_random_uuid(),

    empresa_id uuid
        not null
        references public.empresas(id)
        on delete cascade,

    /*
     * Persistido somente com os 14 dígitos.
     *
     * A formatação visual 00.000.000/0000-00
     * pertence à camada de aplicação.
     */
    cnpj text
        not null,

    /*
     * "principal" identifica qual CNPJ representa atualmente
     * a empresa no cadastro principal.
     *
     * Não confundir com "MATRIZ".
     *
     * Uma filial pode, tecnicamente, ser o CNPJ principal
     * utilizado pelo cadastro daquela empresa.
     */
    principal boolean
        not null
        default false,

    tipo text
        not null
        default 'OUTRO',

    situacao text
        not null
        default 'ATIVO',

    /*
     * Vigência documental opcional.
     *
     * Permite futuramente validar documentos históricos:
     *
     * documento de 2025
     *       ↓
     * CNPJ filial válido naquele período
     *       ↓
     * empresa reconhecida corretamente
     */
    vigencia_inicio date
        null,

    vigencia_fim date
        null,

    /*
     * Nome que eventualmente aparecia nos documentos
     * daquele estabelecimento/CNPJ.
     */
    razao_social_documental text
        null,

    observacao text
        null,

    criado_em timestamptz
        not null
        default now(),

    atualizado_em timestamptz
        not null
        default now(),

    constraint empresas_cnpjs_cnpj_formato_chk
        check (
            cnpj ~ '^[0-9]{14}$'
        ),

    constraint empresas_cnpjs_tipo_chk
        check (
            tipo in (
                'MATRIZ',
                'FILIAL',
                'OUTRO'
            )
        ),

    constraint empresas_cnpjs_situacao_chk
        check (
            situacao in (
                'ATIVO',
                'HISTORICO'
            )
        ),

    constraint empresas_cnpjs_vigencia_chk
        check (
            vigencia_inicio is null
            or vigencia_fim is null
            or vigencia_fim >= vigencia_inicio
        )
);

-- ============================================================================
-- UM CNPJ NÃO PODE PERTENCER A DUAS EMPRESAS
-- ============================================================================

create unique index empresas_cnpjs_cnpj_uidx
    on public.empresas_cnpjs (cnpj);

-- ============================================================================
-- UMA EMPRESA PODE TER NO MÁXIMO UM CNPJ PRINCIPAL
-- ============================================================================

create unique index empresas_cnpjs_principal_empresa_uidx
    on public.empresas_cnpjs (empresa_id)
    where principal = true;

-- ============================================================================
-- ÍNDICES OPERACIONAIS
-- ============================================================================

create index empresas_cnpjs_empresa_id_idx
    on public.empresas_cnpjs (empresa_id);

create index empresas_cnpjs_empresa_situacao_idx
    on public.empresas_cnpjs (
        empresa_id,
        situacao
    );

create index empresas_cnpjs_empresa_vigencia_idx
    on public.empresas_cnpjs (
        empresa_id,
        vigencia_inicio,
        vigencia_fim
    );

-- ============================================================================
-- PROTEÇÃO CONTRA DUPLICIDADE LEGADA
--
-- Antes do backfill, impedimos silenciosamente que o mesmo CNPJ atualmente
-- cadastrado em public.empresas seja associado a duas empresas diferentes.
-- ============================================================================

do $$
declare
    v_cnpj_duplicado text;
begin
    select
        dados.cnpj_normalizado
    into
        v_cnpj_duplicado
    from (
        select
            regexp_replace(
                coalesce(e.cnpj, ''),
                '\D',
                '',
                'g'
            ) as cnpj_normalizado,

            count(*) as quantidade
        from public.empresas e
        where length(
            regexp_replace(
                coalesce(e.cnpj, ''),
                '\D',
                '',
                'g'
            )
        ) = 14
        group by
            regexp_replace(
                coalesce(e.cnpj, ''),
                '\D',
                '',
                'g'
            )
        having count(*) > 1
    ) dados
    limit 1;

    if v_cnpj_duplicado is not null then
        raise exception
            'Backfill multi-CNPJ bloqueado: o CNPJ % está associado a mais de uma empresa.',
            v_cnpj_duplicado;
    end if;
end
$$;

-- ============================================================================
-- BACKFILL
--
-- Cada CNPJ atual de public.empresas passa a existir também na nova tabela.
--
-- Não classificamos automaticamente como MATRIZ/FILIAL porque essa informação
-- não pode ser inferida apenas pelo número atualmente cadastrado.
-- ============================================================================

insert into public.empresas_cnpjs (
    empresa_id,
    cnpj,
    principal,
    tipo,
    situacao,
    razao_social_documental
)
select
    e.id,

    regexp_replace(
        e.cnpj,
        '\D',
        '',
        'g'
    ),

    true,

    'OUTRO',

    'ATIVO',

    nullif(
        trim(
            coalesce(
                e.nome,
                ''
            )
        ),
        ''
    )
from public.empresas e
where
    e.cnpj is not null
    and length(
        regexp_replace(
            e.cnpj,
            '\D',
            '',
            'g'
        )
    ) = 14;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table public.empresas_cnpjs
    enable row level security;

-- --------------------------------------------------------------------------
-- SELECT
-- --------------------------------------------------------------------------

create policy empresas_cnpjs_select_usuarios_ativos
on public.empresas_cnpjs
for select
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and (
        not (
            select
                public.usuario_tem_escopo_empresa_atribuido()
        )
        or (
            select
                public.usuario_admin_global()
        )
        or public.usuario_tem_acesso_empresa(
            empresa_id
        )
    )
);

-- --------------------------------------------------------------------------
-- INSERT
-- --------------------------------------------------------------------------

create policy empresas_cnpjs_insert_usuarios_ativos
on public.empresas_cnpjs
for insert
to authenticated
with check (
    (select public.usuario_ativo_sistema())
    and (
        not (
            select
                public.usuario_tem_escopo_empresa_atribuido()
        )
        or (
            select
                public.usuario_admin_global()
        )
        or public.usuario_tem_acesso_empresa(
            empresa_id
        )
    )
);

-- --------------------------------------------------------------------------
-- UPDATE
-- --------------------------------------------------------------------------

create policy empresas_cnpjs_update_usuarios_ativos
on public.empresas_cnpjs
for update
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and (
        not (
            select
                public.usuario_tem_escopo_empresa_atribuido()
        )
        or (
            select
                public.usuario_admin_global()
        )
        or public.usuario_tem_acesso_empresa(
            empresa_id
        )
    )
)
with check (
    (select public.usuario_ativo_sistema())
    and (
        not (
            select
                public.usuario_tem_escopo_empresa_atribuido()
        )
        or (
            select
                public.usuario_admin_global()
        )
        or public.usuario_tem_acesso_empresa(
            empresa_id
        )
    )
);

-- --------------------------------------------------------------------------
-- DELETE
-- --------------------------------------------------------------------------

create policy empresas_cnpjs_delete_usuarios_ativos
on public.empresas_cnpjs
for delete
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and (
        not (
            select
                public.usuario_tem_escopo_empresa_atribuido()
        )
        or (
            select
                public.usuario_admin_global()
        )
        or public.usuario_tem_acesso_empresa(
            empresa_id
        )
    )
);

-- ============================================================================
-- GRANTS
-- ============================================================================

revoke all
on table public.empresas_cnpjs
from anon;

grant
    select,
    insert,
    update,
    delete
on table public.empresas_cnpjs
to authenticated;

grant all
on table public.empresas_cnpjs
to service_role;

comment on table public.empresas_cnpjs is
    'CNPJs principal, matriz, filiais e históricos vinculados ao mesmo cadastro de empresa.';

comment on column public.empresas_cnpjs.principal is
    'Indica o CNPJ principal do cadastro; não significa obrigatoriamente matriz.';

comment on column public.empresas_cnpjs.tipo is
    'Classificação documental do estabelecimento: MATRIZ, FILIAL ou OUTRO.';

comment on column public.empresas_cnpjs.situacao is
    'Situação do vínculo documental: ATIVO ou HISTORICO.';

comment on column public.empresas_cnpjs.vigencia_inicio is
    'Primeira data conhecida de validade documental do vínculo deste CNPJ com a empresa.';

comment on column public.empresas_cnpjs.vigencia_fim is
    'Última data conhecida de validade documental do vínculo deste CNPJ com a empresa.';

notify pgrst, 'reload schema';

commit;