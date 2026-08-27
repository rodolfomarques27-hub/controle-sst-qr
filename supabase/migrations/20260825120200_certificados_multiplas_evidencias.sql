-- ============================================================
-- CERT-EVID-E1 / E1R
-- Múltiplas evidências documentais por treinamento.
-- ============================================================

begin;

do
$schema_gate$
begin
    if
        to_regclass(
            'public.certificados_evidencias'
        ) is not null
    then
        raise exception
            'CERT-EVID-E1R: public.certificados_evidencias já existe. '
            'Migration abortada para evitar aceitar schema parcial ou divergente.';
    end if;
end;
$schema_gate$;

create table
public.certificados_evidencias (
    id uuid
        primary key
        default gen_random_uuid(),

    certificado_origem_id uuid
        not null,

    certificado_historico_origem_id uuid,

    colaborador_id uuid
        not null,

    treinamento_id uuid,

    treinamento_codigo integer
        not null,

    tipo_treinamento text,

    nome_treinamento text,

    data_realizacao date,

    data_vencimento date,

    tipo_evidencia text
        not null,

    arquivo_url text
        not null,

    arquivo_nome text,

    arquivo_substituto_url text,

    observacao text,

    status_validacao text,

    principal boolean
        not null
        default false,

    historica boolean
        not null
        default false,

    origem text
        not null
        default 'upload',

    origem_legada_tabela text,

    origem_legada_id uuid,

    created_by uuid
        default auth.uid(),

    created_at timestamptz
        not null
        default now(),

    updated_at timestamptz
        not null
        default now(),

    constraint
    certificados_evidencias_arquivo_url_nao_vazio
    check (
        btrim(arquivo_url) <> ''
    ),

    constraint
    certificados_evidencias_tipo_evidencia_nao_vazio
    check (
        btrim(tipo_evidencia) <> ''
    ),

    constraint
    certificados_evidencias_origem_nao_vazia
    check (
        btrim(origem) <> ''
    ),

    constraint
    certificados_evidencias_historica_nao_principal_chk
    check (
        not (
            historica
            and
            principal
        )
    ),

    constraint
    certificados_evidencias_origem_legada_par_chk
    check (
        (
            origem_legada_tabela is null
            and
            origem_legada_id is null
        )
        or
        (
            origem_legada_tabela is not null
            and
            origem_legada_id is not null
        )
    ),

    constraint
    certificados_evidencias_origem_legada_tabela_chk
    check (
        origem_legada_tabela is null
        or
        origem_legada_tabela in (
            'certificados',
            'certificados_historico'
        )
    )
);

comment on table
public.certificados_evidencias
is
'Arquivos/evidências documentais vinculados ao treinamento lógico corrente representado em public.certificados. Permite múltiplas evidências por treinamento sem duplicar o registro lógico.';

comment on column
public.certificados_evidencias.certificado_origem_id
is
'UUID lógico de public.certificados ao qual a evidência pertence. Sem FK intencionalmente para preservar rastreabilidade documental.';

comment on column
public.certificados_evidencias.tipo_evidencia
is
'Classificação da evidência física. Exemplos iniciais: certificado_individual, lista_presenca, evidencia_complementar, documento_principal_legado e versao_historica_legada.';

comment on column
public.certificados_evidencias.principal
is
'Indica a evidência corrente usada como documento principal/legado do treinamento. No máximo uma por certificado lógico corrente.';

comment on column
public.certificados_evidencias.historica
is
'true quando a linha representa versão documental histórica, inclusive backfill de public.certificados_historico.';

comment on column
public.certificados_evidencias.origem_legada_tabela
is
'Marcador de backfill. Não representa origem de uploads futuros.';

create index
certificados_evidencias_certificado_origem_idx
on public.certificados_evidencias (
    certificado_origem_id,
    historica,
    created_at desc
);

create index
certificados_evidencias_colaborador_treinamento_idx
on public.certificados_evidencias (
    colaborador_id,
    treinamento_codigo,
    data_realizacao desc,
    created_at desc
);

create index
certificados_evidencias_arquivo_url_idx
on public.certificados_evidencias (
    arquivo_url
);

create unique index
certificados_evidencias_origem_legada_uidx
on public.certificados_evidencias (
    origem_legada_tabela,
    origem_legada_id
)
where
    origem_legada_tabela is not null
    and
    origem_legada_id is not null;

create unique index
certificados_evidencias_principal_corrente_uidx
on public.certificados_evidencias (
    certificado_origem_id
)
where
    principal is true
    and
    historica is false;

alter table
public.certificados_evidencias
enable row level security;

revoke all
on table public.certificados_evidencias
from anon;

revoke all
on table public.certificados_evidencias
from authenticated;

grant select, insert, update, delete
on table public.certificados_evidencias
to authenticated;

grant all
on table public.certificados_evidencias
to service_role;

create policy
certificados_evidencias_select_usuarios_ativos
on public.certificados_evidencias
for select
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and
    public.usuario_tem_acesso_certificado(
        colaborador_id
    )
);

create policy
certificados_evidencias_insert_usuarios_ativos
on public.certificados_evidencias
for insert
to authenticated
with check (
    (select public.usuario_ativo_sistema())
    and
    historica is false
    and
    public.usuario_tem_acesso_certificado(
        colaborador_id
    )
    and
    exists (
        select
            1
        from (
            select
                id as certificado_id,
                colaborador_id as certificado_colaborador_id
            from
                public.certificados
        ) certificado
        where
            certificado.certificado_id =
                certificado_origem_id
            and
            certificado.certificado_colaborador_id =
                colaborador_id
    )
);

create policy
certificados_evidencias_update_usuarios_ativos
on public.certificados_evidencias
for update
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and
    historica is false
    and
    public.usuario_tem_acesso_certificado(
        colaborador_id
    )
    and
    exists (
        select
            1
        from (
            select
                id as certificado_id,
                colaborador_id as certificado_colaborador_id
            from
                public.certificados
        ) certificado
        where
            certificado.certificado_id =
                certificado_origem_id
            and
            certificado.certificado_colaborador_id =
                colaborador_id
    )
)
with check (
    (select public.usuario_ativo_sistema())
    and
    historica is false
    and
    public.usuario_tem_acesso_certificado(
        colaborador_id
    )
    and
    exists (
        select
            1
        from (
            select
                id as certificado_id,
                colaborador_id as certificado_colaborador_id
            from
                public.certificados
        ) certificado
        where
            certificado.certificado_id =
                certificado_origem_id
            and
            certificado.certificado_colaborador_id =
                colaborador_id
    )
);

create policy
certificados_evidencias_delete_usuarios_ativos
on public.certificados_evidencias
for delete
to authenticated
using (
    (select public.usuario_ativo_sistema())
    and
    historica is false
    and
    public.usuario_tem_acesso_certificado(
        colaborador_id
    )
    and
    exists (
        select
            1
        from (
            select
                id as certificado_id,
                colaborador_id as certificado_colaborador_id
            from
                public.certificados
        ) certificado
        where
            certificado.certificado_id =
                certificado_origem_id
            and
            certificado.certificado_colaborador_id =
                colaborador_id
    )
);

insert into
public.certificados_evidencias (
    certificado_origem_id,
    colaborador_id,
    treinamento_id,
    treinamento_codigo,
    tipo_treinamento,
    nome_treinamento,
    data_realizacao,
    data_vencimento,
    tipo_evidencia,
    arquivo_url,
    arquivo_nome,
    observacao,
    status_validacao,
    principal,
    historica,
    origem,
    origem_legada_tabela,
    origem_legada_id,
    created_at,
    updated_at
)
select
    c.id,
    c.colaborador_id,
    c.treinamento_id,
    c.treinamento_codigo,
    c.tipo_treinamento,
    c.nome_treinamento,
    c.data_realizacao,
    c.data_vencimento,
    'documento_principal_legado',
    coalesce(
        nullif(
            btrim(c.arquivo_url),
            ''
        ),
        nullif(
            btrim(c.url_do_arquivo),
            ''
        )
    ),
    coalesce(
        nullif(
            btrim(c.arquivo_nome),
            ''
        ),
        nullif(
            btrim(c.nome_do_arquivo),
            ''
        )
    ),
    c.observacao,
    c.status_validacao,
    true,
    false,
    'backfill_certificados',
    'certificados',
    c.id,
    coalesce(
        c.created_at,
        now()
    ),
    coalesce(
        c.updated_at,
        c.created_at,
        now()
    )
from
public.certificados c
where
    c.colaborador_id is not null
    and
    c.treinamento_codigo is not null
    and
    coalesce(
        nullif(
            btrim(c.arquivo_url),
            ''
        ),
        nullif(
            btrim(c.url_do_arquivo),
            ''
        )
    ) is not null
    and not exists (
        select
            1
        from
            public.certificados_evidencias e
        where
            e.origem_legada_tabela =
                'certificados'
            and
            e.origem_legada_id =
                c.id
    );

insert into
public.certificados_evidencias (
    certificado_origem_id,
    certificado_historico_origem_id,
    colaborador_id,
    treinamento_id,
    treinamento_codigo,
    tipo_treinamento,
    nome_treinamento,
    data_realizacao,
    data_vencimento,
    tipo_evidencia,
    arquivo_url,
    arquivo_nome,
    arquivo_substituto_url,
    observacao,
    status_validacao,
    principal,
    historica,
    origem,
    origem_legada_tabela,
    origem_legada_id,
    created_at,
    updated_at
)
select
    h.certificado_origem_id,
    h.id,
    h.colaborador_id,
    h.treinamento_id,
    h.treinamento_codigo,
    h.tipo_treinamento,
    h.nome_treinamento,
    h.data_realizacao,
    h.data_vencimento,
    'versao_historica_legada',
    coalesce(
        nullif(
            btrim(h.arquivo_url),
            ''
        ),
        nullif(
            btrim(h.url_do_arquivo),
            ''
        )
    ),
    coalesce(
        nullif(
            btrim(h.arquivo_nome),
            ''
        ),
        nullif(
            btrim(h.nome_do_arquivo),
            ''
        )
    ),
    nullif(
        btrim(
            coalesce(
                h.arquivo_substituto_url,
                ''
            )
        ),
        ''
    ),
    h.observacao,
    h.status_validacao,
    false,
    true,
    'backfill_certificados_historico',
    'certificados_historico',
    h.id,
    coalesce(
        h.certificado_created_at,
        h.arquivado_em,
        now()
    ),
    coalesce(
        h.certificado_updated_at,
        h.arquivado_em,
        h.certificado_created_at,
        now()
    )
from
public.certificados_historico h
where
    h.colaborador_id is not null
    and
    h.treinamento_codigo is not null
    and
    coalesce(
        nullif(
            btrim(h.arquivo_url),
            ''
        ),
        nullif(
            btrim(h.url_do_arquivo),
            ''
        )
    ) is not null
    and not exists (
        select
            1
        from
            public.certificados_evidencias e
        where
            e.origem_legada_tabela =
                'certificados_historico'
            and
            e.origem_legada_id =
                h.id
    );

do
$gate$
begin
    if exists (
        select
            1
        from
            public.certificados c
        where
            c.colaborador_id is not null
            and
            c.treinamento_codigo is not null
            and
            coalesce(
                nullif(
                    btrim(c.arquivo_url),
                    ''
                ),
                nullif(
                    btrim(c.url_do_arquivo),
                    ''
                )
            ) is not null
            and not exists (
                select
                    1
                from
                    public.certificados_evidencias e
                where
                    e.origem_legada_tabela =
                        'certificados'
                    and
                    e.origem_legada_id =
                        c.id
            )
    )
    then
        raise exception
            'CERT-EVID-E1: backfill de public.certificados incompleto.';
    end if;

    if exists (
        select
            1
        from
            public.certificados_historico h
        where
            h.colaborador_id is not null
            and
            h.treinamento_codigo is not null
            and
            coalesce(
                nullif(
                    btrim(h.arquivo_url),
                    ''
                ),
                nullif(
                    btrim(h.url_do_arquivo),
                    ''
                )
            ) is not null
            and not exists (
                select
                    1
                from
                    public.certificados_evidencias e
                where
                    e.origem_legada_tabela =
                        'certificados_historico'
                    and
                    e.origem_legada_id =
                        h.id
            )
    )
    then
        raise exception
            'CERT-EVID-E1: backfill de public.certificados_historico incompleto.';
    end if;

    if exists (
        select
            1
        from
            public.certificados_evidencias e
        where
            e.historica is false
            and
            not exists (
                select
                    1
                from
                    public.certificados c
                where
                    c.id =
                        e.certificado_origem_id
                    and
                    c.colaborador_id =
                        e.colaborador_id
            )
    )
    then
        raise exception
            'CERT-EVID-E1R: evidência corrente possui vínculo lógico inválido.';
    end if;

    if exists (
        select
            1
        from
            public.certificados_evidencias e
        inner join
            public.certificados c
        on
            c.id =
                e.certificado_origem_id
        where
            c.colaborador_id
                is distinct from
            e.colaborador_id
    )
    then
        raise exception
            'CERT-EVID-E1R: certificado_origem_id e colaborador_id divergentes.';
    end if;

    if exists (
        select
            1
        from
            public.certificados_evidencias
        where
            principal is true
            and
            historica is true
    )
    then
        raise exception
            'CERT-EVID-E1: evidência histórica não pode ser principal.';
    end if;
end;
$gate$;

notify pgrst, 'reload schema';

commit;