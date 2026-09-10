-- ============================================================================
-- SAFESCAN BRASIL
--
-- REVISÃO PÓS-REVISÃO DE TREINAMENTOS
-- PERSISTÊNCIA HISTÓRICA, INTEGRIDADE DOCUMENTAL E PDF IMUTÁVEL
--
-- OBJETIVOS:
-- - persistir somente revisões CONCLUÍDAS;
-- - não persistir rascunho da revisão automática;
-- - separar treinamento lógico de evidências físicas;
-- - preservar snapshot histórico independente dos dados vivos;
-- - detectar SHA-256 reutilizado em outros colaboradores;
-- - permitir sinalização de vínculo fora do escopo sem expor PII;
-- - armazenar PDF emitido em bucket privado;
-- - impedir edição direta das revisões por authenticated;
-- - usar RPCs SECURITY DEFINER para as mutações autorizadas.
--
-- IMPORTANTE:
-- - esta migration é aditiva;
-- - não altera certificados existentes;
-- - não altera certificados_evidencias existentes;
-- - não move arquivos existentes;
-- - não executa backfill.
-- ============================================================================

begin;

create schema if not exists private;

-- ============================================================================
-- 1. BUCKET PRIVADO DO PDF HISTÓRICO
-- ============================================================================

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'revisoes-treinamentos',
    'revisoes-treinamentos',
    false,
    20971520,
    array[
        'application/pdf'
    ]::text[]
)
on conflict (id) do update
set
    name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================================
-- 2. CABEÇALHO DA REVISÃO CONCLUÍDA
-- ============================================================================

create table if not exists public.treinamentos_revisoes (
    id uuid primary key
        default gen_random_uuid(),

    colaborador_id uuid not null,
    empresa_id uuid not null,

    numero_revisao integer not null
        constraint treinamentos_revisoes_numero_check
        check (
            numero_revisao > 0
        ),

    data_referencia date not null
        default current_date,

    status text not null
        default 'concluida'
        constraint treinamentos_revisoes_status_check
        check (
            status = 'concluida'
        ),

    motor_versao text not null
        default '1',

    schema_versao integer not null
        default 1
        constraint treinamentos_revisoes_schema_versao_check
        check (
            schema_versao > 0
        ),

    executado_por uuid
        references auth.users(id)
        on delete set null,

    executado_por_email text,

    colaborador_snapshot jsonb not null
        constraint treinamentos_revisoes_colaborador_snapshot_check
        check (
            jsonb_typeof(
                colaborador_snapshot
            ) = 'object'
        ),

    empresa_snapshot jsonb not null
        constraint treinamentos_revisoes_empresa_snapshot_check
        check (
            jsonb_typeof(
                empresa_snapshot
            ) = 'object'
        ),

    resumo jsonb not null
        default '{}'::jsonb
        constraint treinamentos_revisoes_resumo_check
        check (
            jsonb_typeof(
                resumo
            ) = 'object'
        ),

    total_treinamentos integer not null
        default 0
        constraint treinamentos_revisoes_total_check
        check (
            total_treinamentos >= 0
        ),

    total_conformes integer not null
        default 0
        constraint treinamentos_revisoes_conformes_check
        check (
            total_conformes >= 0
        ),

    total_atencao integer not null
        default 0
        constraint treinamentos_revisoes_atencao_check
        check (
            total_atencao >= 0
        ),

    total_vencidos integer not null
        default 0
        constraint treinamentos_revisoes_vencidos_check
        check (
            total_vencidos >= 0
        ),

    total_divergentes integer not null
        default 0
        constraint treinamentos_revisoes_divergentes_check
        check (
            total_divergentes >= 0
        ),

    total_sem_evidencia integer not null
        default 0
        constraint treinamentos_revisoes_sem_evidencia_check
        check (
            total_sem_evidencia >= 0
        ),

    total_revisao_manual integer not null
        default 0
        constraint treinamentos_revisoes_manual_check
        check (
            total_revisao_manual >= 0
        ),

    percentual_conformidade numeric(5, 2) not null
        default 0
        constraint treinamentos_revisoes_percentual_check
        check (
            percentual_conformidade
            between 0 and 100
        ),

    snapshot jsonb not null
        default '{}'::jsonb
        constraint treinamentos_revisoes_snapshot_check
        check (
            jsonb_typeof(
                snapshot
            ) = 'object'
        ),

    pdf_bucket text,
    pdf_caminho text,
    pdf_nome text,
    pdf_sha256 text,
    pdf_tamanho_bytes bigint,
    pdf_gerado_em timestamptz,

    created_at timestamptz not null
        default now(),

    constraint treinamentos_revisoes_colaborador_numero_unique
        unique (
            colaborador_id,
            numero_revisao
        ),

    constraint treinamentos_revisoes_pdf_bucket_check
        check (
            pdf_bucket is null
            or pdf_bucket = 'revisoes-treinamentos'
        ),

    constraint treinamentos_revisoes_pdf_sha_check
        check (
            pdf_sha256 is null
            or pdf_sha256 ~ '^[0-9a-fA-F]{64}$'
        ),

    constraint treinamentos_revisoes_pdf_size_check
        check (
            pdf_tamanho_bytes is null
            or (
                pdf_tamanho_bytes > 0
                and pdf_tamanho_bytes <= 20971520
            )
        ),

    constraint treinamentos_revisoes_pdf_integridade_check
        check (
            (
                pdf_bucket is null
                and pdf_caminho is null
                and pdf_nome is null
                and pdf_sha256 is null
                and pdf_tamanho_bytes is null
                and pdf_gerado_em is null
            )
            or
            (
                pdf_bucket = 'revisoes-treinamentos'
                and nullif(
                    btrim(
                        pdf_caminho
                    ),
                    ''
                ) is not null
                and nullif(
                    btrim(
                        pdf_nome
                    ),
                    ''
                ) is not null
                and pdf_sha256 ~ '^[0-9a-fA-F]{64}$'
                and pdf_tamanho_bytes > 0
                and pdf_gerado_em is not null
            )
        )
);

comment on table
public.treinamentos_revisoes
is
'Cabeçalho imutável de uma revisão concluída dos treinamentos de um colaborador. '
'Rascunhos não são persistidos.';

comment on column
public.treinamentos_revisoes.colaborador_id
is
'Identificador histórico do colaborador. Sem FK intencional para preservar a revisão após mudanças futuras no cadastro.';

comment on column
public.treinamentos_revisoes.empresa_id
is
'Identificador histórico da empresa usado para escopo/RLS. Sem FK intencional para preservação histórica.';

-- ============================================================================
-- 3. ITEM = UM TREINAMENTO LÓGICO
-- ============================================================================

create table if not exists public.treinamentos_revisao_itens (
    id uuid primary key
        default gen_random_uuid(),

    revisao_id uuid not null
        references public.treinamentos_revisoes(id)
        on delete cascade,

    ordem integer not null
        constraint treinamentos_revisao_itens_ordem_check
        check (
            ordem > 0
        ),

    certificado_origem_id uuid,
    treinamento_id uuid,
    treinamento_codigo integer,

    nome_treinamento text not null,

    data_realizacao_salva date,
    data_vencimento_salva date,

    data_realizacao_revisada date,
    data_vencimento_revisada date,

    status_temporal_anterior text,

    status_temporal_revisado text not null
        constraint treinamentos_revisao_itens_temporal_check
        check (
            status_temporal_revisado
            in (
                'conforme',
                'atencao',
                'vencido',
                'sem_data_suficiente',
                'nao_aplicavel'
            )
        ),

    status_integridade text not null
        constraint treinamentos_revisao_itens_integridade_check
        check (
            status_integridade
            in (
                'conforme',
                'identidade_divergente',
                'possivel_outro_colaborador',
                'documento_incompativel',
                'treinamento_divergente',
                'vinculo_evidencia_suspeito',
                'revisao_manual_necessaria',
                'sem_evidencia_suficiente'
            )
        ),

    resultado_geral text not null
        constraint treinamentos_revisao_itens_resultado_check
        check (
            resultado_geral
            in (
                'conforme',
                'atencao',
                'vencido',
                'divergente',
                'sem_evidencia_suficiente',
                'revisao_manual_necessaria'
            )
        ),

    evidencias_total integer not null
        default 0
        constraint treinamentos_revisao_itens_evidencias_total_check
        check (
            evidencias_total >= 0
        ),

    divergencias jsonb not null
        default '[]'::jsonb
        constraint treinamentos_revisao_itens_divergencias_check
        check (
            jsonb_typeof(
                divergencias
            ) = 'array'
        ),

    decisao_humana text,
    observacao_manual text,

    snapshot jsonb not null
        default '{}'::jsonb
        constraint treinamentos_revisao_itens_snapshot_check
        check (
            jsonb_typeof(
                snapshot
            ) = 'object'
        ),

    created_at timestamptz not null
        default now(),

    constraint treinamentos_revisao_itens_revisao_ordem_unique
        unique (
            revisao_id,
            ordem
        ),

    constraint treinamentos_revisao_itens_id_revisao_unique
        unique (
            id,
            revisao_id
        )
);

comment on table
public.treinamentos_revisao_itens
is
'Snapshot de um treinamento lógico dentro de uma revisão concluída. '
'Múltiplas evidências não criam itens adicionais.';

-- ============================================================================
-- 4. EVIDÊNCIAS FÍSICAS ANALISADAS
-- ============================================================================

create table if not exists public.treinamentos_revisao_evidencias (
    id uuid primary key
        default gen_random_uuid(),

    revisao_id uuid not null,

    revisao_item_id uuid not null,

    ordem integer not null
        constraint treinamentos_revisao_evidencias_ordem_check
        check (
            ordem > 0
        ),

    certificado_evidencia_id uuid,
    certificado_origem_id uuid,

    tipo_evidencia text not null
        default 'evidencia_complementar',

    arquivo_nome text,
    arquivo_url text,

    arquivo_sha256 text
        constraint treinamentos_revisao_evidencias_sha_check
        check (
            arquivo_sha256 is null
            or arquivo_sha256 ~ '^[0-9a-fA-F]{64}$'
        ),

    identidade_esperada jsonb not null
        default '{}'::jsonb
        constraint treinamentos_revisao_evidencias_identidade_esperada_check
        check (
            jsonb_typeof(
                identidade_esperada
            ) = 'object'
        ),

    identidade_encontrada jsonb not null
        default '{}'::jsonb
        constraint treinamentos_revisao_evidencias_identidade_encontrada_check
        check (
            jsonb_typeof(
                identidade_encontrada
            ) = 'object'
        ),

    tipo_documento_esperado text,
    tipo_documento_identificado text,

    treinamento_esperado text,
    treinamento_identificado text,

    confianca_identidade numeric(5, 4)
        constraint treinamentos_revisao_evidencias_conf_identidade_check
        check (
            confianca_identidade is null
            or confianca_identidade
                between 0 and 1
        ),

    confianca_documento numeric(5, 4)
        constraint treinamentos_revisao_evidencias_conf_documento_check
        check (
            confianca_documento is null
            or confianca_documento
                between 0 and 1
        ),

    confianca_treinamento numeric(5, 4)
        constraint treinamentos_revisao_evidencias_conf_treinamento_check
        check (
            confianca_treinamento is null
            or confianca_treinamento
                between 0 and 1
        ),

    status_integridade text not null
        constraint treinamentos_revisao_evidencias_integridade_check
        check (
            status_integridade
            in (
                'conforme',
                'identidade_divergente',
                'possivel_outro_colaborador',
                'documento_incompativel',
                'treinamento_divergente',
                'vinculo_evidencia_suspeito',
                'revisao_manual_necessaria',
                'sem_evidencia_suficiente'
            )
        ),

    duplicidade_mesmo_colaborador boolean not null
        default false,

    duplicidade_outro_colaborador boolean not null
        default false,

    vinculo_fora_escopo boolean not null
        default false,

    vinculos_sha256 jsonb not null
        default '{}'::jsonb
        constraint treinamentos_revisao_evidencias_vinculos_sha_check
        check (
            jsonb_typeof(
                vinculos_sha256
            ) = 'object'
        ),

    divergencias jsonb not null
        default '[]'::jsonb
        constraint treinamentos_revisao_evidencias_divergencias_check
        check (
            jsonb_typeof(
                divergencias
            ) = 'array'
        ),

    snapshot jsonb not null
        default '{}'::jsonb
        constraint treinamentos_revisao_evidencias_snapshot_check
        check (
            jsonb_typeof(
                snapshot
            ) = 'object'
        ),

    created_at timestamptz not null
        default now(),

    constraint treinamentos_revisao_evidencias_item_fk
        foreign key (
            revisao_item_id,
            revisao_id
        )
        references public.treinamentos_revisao_itens (
            id,
            revisao_id
        )
        on delete cascade,

    constraint treinamentos_revisao_evidencias_item_ordem_unique
        unique (
            revisao_item_id,
            ordem
        )
);

comment on table
public.treinamentos_revisao_evidencias
is
'Snapshot das evidências físicas efetivamente analisadas em uma revisão concluída.';

create unique index if not exists
treinamentos_revisao_evidencias_origem_unique
on public.treinamentos_revisao_evidencias (
    revisao_id,
    certificado_evidencia_id
)
where certificado_evidencia_id is not null;

-- ============================================================================
-- 5. ÍNDICES
-- ============================================================================

create index if not exists
treinamentos_revisoes_colaborador_created_idx
on public.treinamentos_revisoes (
    colaborador_id,
    created_at desc
);

create index if not exists
treinamentos_revisoes_empresa_created_idx
on public.treinamentos_revisoes (
    empresa_id,
    created_at desc
);

create index if not exists
treinamentos_revisao_itens_revisao_idx
on public.treinamentos_revisao_itens (
    revisao_id
);

create index if not exists
treinamentos_revisao_itens_codigo_idx
on public.treinamentos_revisao_itens (
    treinamento_codigo
);

create index if not exists
treinamentos_revisao_evidencias_revisao_idx
on public.treinamentos_revisao_evidencias (
    revisao_id
);

create index if not exists
treinamentos_revisao_evidencias_item_idx
on public.treinamentos_revisao_evidencias (
    revisao_item_id
);

create index if not exists
treinamentos_revisao_evidencias_sha_idx
on public.treinamentos_revisao_evidencias (
    lower(
        arquivo_sha256
    )
)
where arquivo_sha256 is not null;

-- ============================================================================
-- 6. PERMISSÃO CENTRAL PARA A REVISÃO
-- ============================================================================

create or replace function
private.treinamentos_revisao_usuario_pode_acao(
    p_empresa_id uuid,
    p_acao text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
    v_permissao record;
    v_acao text;
    v_chave text;
begin
    if auth.uid() is null then
        return false;
    end if;

    if not (
        select
            public.usuario_ativo_sistema()
    ) then
        return false;
    end if;

    if p_empresa_id is null then
        return false;
    end if;

    if
        (
            select
                public.usuario_tem_escopo_empresa_atribuido()
        )
        and not (
            select
                public.usuario_admin_global()
        )
        and not (
            select
                public.usuario_tem_acesso_empresa(
                    p_empresa_id
                )
        )
    then
        return false;
    end if;

    select *
    into v_permissao
    from public.usuario_permissao_sistema_atual()
    limit 1;

    if not found then
        return false;
    end if;

    if
        coalesce(
            v_permissao.acesso_global,
            false
        )
        or lower(
            coalesce(
                v_permissao.perfil,
                ''
            )
        ) in (
            'admin',
            'administrador'
        )
    then
        return true;
    end if;

    v_acao :=
        lower(
            btrim(
                coalesce(
                    p_acao,
                    ''
                )
            )
        );

    v_chave :=
        case
            when v_acao = 'visualizar'
                then 'visualizar'
            when v_acao = 'concluir'
                then 'editar'
            when v_acao = 'exportar'
                then 'exportar'
            else null
        end;

    if v_chave is null then
        return false;
    end if;

    return
        lower(
            coalesce(
                v_permissao.permissoes
                    -> 'modulos'
                    -> 'treinamentos'
                    ->> v_chave,
                'false'
            )
        ) = 'true';
end;
$function$;

revoke all
on function
private.treinamentos_revisao_usuario_pode_acao(
    uuid,
    text
)
from public, anon;

grant execute
on function
private.treinamentos_revisao_usuario_pode_acao(
    uuid,
    text
)
to authenticated, service_role;

-- ============================================================================
-- 7. RLS — SOMENTE LEITURA DIRETA
-- ============================================================================

alter table
public.treinamentos_revisoes
enable row level security;

alter table
public.treinamentos_revisao_itens
enable row level security;

alter table
public.treinamentos_revisao_evidencias
enable row level security;

revoke all
on table
public.treinamentos_revisoes,
public.treinamentos_revisao_itens,
public.treinamentos_revisao_evidencias
from public, anon, authenticated;

grant select
on table
public.treinamentos_revisoes,
public.treinamentos_revisao_itens,
public.treinamentos_revisao_evidencias
to authenticated;

grant all
on table
public.treinamentos_revisoes,
public.treinamentos_revisao_itens,
public.treinamentos_revisao_evidencias
to service_role;

drop policy if exists
treinamentos_revisoes_select_usuarios_autorizados
on public.treinamentos_revisoes;

create policy
treinamentos_revisoes_select_usuarios_autorizados
on public.treinamentos_revisoes
for select
to authenticated
using (
    (
        select
            private.treinamentos_revisao_usuario_pode_acao(
                empresa_id,
                'visualizar'
            )
    )
);

drop policy if exists
treinamentos_revisao_itens_select_usuarios_autorizados
on public.treinamentos_revisao_itens;

create policy
treinamentos_revisao_itens_select_usuarios_autorizados
on public.treinamentos_revisao_itens
for select
to authenticated
using (
    exists (
        select 1
        from public.treinamentos_revisoes r
        where r.id =
            treinamentos_revisao_itens.revisao_id
          and (
              select
                  private.treinamentos_revisao_usuario_pode_acao(
                      r.empresa_id,
                      'visualizar'
                  )
          )
    )
);

drop policy if exists
treinamentos_revisao_evidencias_select_usuarios_autorizados
on public.treinamentos_revisao_evidencias;

create policy
treinamentos_revisao_evidencias_select_usuarios_autorizados
on public.treinamentos_revisao_evidencias
for select
to authenticated
using (
    exists (
        select 1
        from public.treinamentos_revisoes r
        where r.id =
            treinamentos_revisao_evidencias.revisao_id
          and (
              select
                  private.treinamentos_revisao_usuario_pode_acao(
                      r.empresa_id,
                      'visualizar'
                  )
          )
    )
);

-- ============================================================================
-- 8. CONCLUIR REVISÃO
--
-- Apenas esta RPC insere cabeçalho, itens e evidências.
-- ============================================================================

create or replace function
public.concluir_revisao_treinamentos(
    p_colaborador_id uuid,
    p_data_referencia date,
    p_motor_versao text,
    p_resumo jsonb,
    p_itens jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_colaborador public.colaboradores%rowtype;
    v_empresa public.empresas%rowtype;

    v_revisao_id uuid;
    v_item_id uuid;

    v_numero_revisao integer;

    v_item jsonb;
    v_evidencia jsonb;
    v_evidencias jsonb;

    v_item_ordem integer := 0;
    v_evidencia_ordem integer := 0;

    v_total integer := 0;
    v_conformes integer := 0;
    v_atencao integer := 0;
    v_vencidos integer := 0;
    v_divergentes integer := 0;
    v_sem_evidencia integer := 0;
    v_manual integer := 0;

    v_percentual numeric(5, 2) := 0;

    v_colaborador_snapshot jsonb;
    v_empresa_snapshot jsonb;
    v_resumo_final jsonb;
    v_snapshot jsonb;

    v_email text;

    v_certificado_origem_id uuid;
    v_treinamento_id uuid;
    v_certificado_evidencia_id uuid;

    v_treinamento_codigo integer;

    v_data_realizacao_salva date;
    v_data_vencimento_salva date;
    v_data_realizacao_revisada date;
    v_data_vencimento_revisada date;

    v_conf_identidade numeric;
    v_conf_documento numeric;
    v_conf_treinamento numeric;

    v_sha text;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    if p_colaborador_id is null then
        raise exception using
            errcode = '22023',
            message = 'Colaborador não informado.';
    end if;

    if
        p_itens is null
        or jsonb_typeof(
            p_itens
        ) <> 'array'
        or jsonb_array_length(
            p_itens
        ) = 0
    then
        raise exception using
            errcode = '22023',
            message = 'A revisão deve possuir ao menos um treinamento.';
    end if;

    if
        p_resumo is not null
        and jsonb_typeof(
            p_resumo
        ) <> 'object'
    then
        raise exception using
            errcode = '22023',
            message = 'Resumo da revisão inválido.';
    end if;

    select c.*
    into v_colaborador
    from public.colaboradores c
    where c.id = p_colaborador_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Colaborador não localizado.';
    end if;

    if v_colaborador.empresa_id is null then
        raise exception using
            errcode = '22023',
            message = 'Colaborador sem empresa vinculada.';
    end if;

    if not (
        select
            private.treinamentos_revisao_usuario_pode_acao(
                v_colaborador.empresa_id,
                'concluir'
            )
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem permissão para concluir revisão de treinamentos.';
    end if;

    select e.*
    into v_empresa
    from public.empresas e
    where e.id = v_colaborador.empresa_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Empresa do colaborador não localizada.';
    end if;

    select
        coalesce(
            max(
                r.numero_revisao
            ),
            0
        ) + 1
    into v_numero_revisao
    from public.treinamentos_revisoes r
    where r.colaborador_id =
        p_colaborador_id;

    v_total :=
        jsonb_array_length(
            p_itens
        );

    select
        count(*) filter (
            where
                lower(
                    coalesce(
                        item ->> 'resultado_geral',
                        ''
                    )
                ) = 'conforme'
        )::integer,

        count(*) filter (
            where
                lower(
                    coalesce(
                        item ->> 'resultado_geral',
                        ''
                    )
                ) = 'atencao'
        )::integer,

        count(*) filter (
            where
                lower(
                    coalesce(
                        item ->> 'resultado_geral',
                        ''
                    )
                ) = 'vencido'
        )::integer,

        count(*) filter (
            where
                lower(
                    coalesce(
                        item ->> 'resultado_geral',
                        ''
                    )
                ) = 'divergente'
        )::integer,

        count(*) filter (
            where
                lower(
                    coalesce(
                        item ->> 'resultado_geral',
                        ''
                    )
                ) = 'sem_evidencia_suficiente'
        )::integer,

        count(*) filter (
            where
                lower(
                    coalesce(
                        item ->> 'resultado_geral',
                        ''
                    )
                ) = 'revisao_manual_necessaria'
        )::integer
    into
        v_conformes,
        v_atencao,
        v_vencidos,
        v_divergentes,
        v_sem_evidencia,
        v_manual
    from jsonb_array_elements(
        p_itens
    ) as dados(item);

    if v_total > 0 then
        v_percentual :=
            round(
                (
                    v_conformes::numeric
                    * 100
                    / v_total::numeric
                ),
                2
            );
    end if;

    v_email :=
        nullif(
            lower(
                btrim(
                    coalesce(
                        auth.jwt() ->> 'email',
                        ''
                    )
                )
            ),
            ''
        );

    v_colaborador_snapshot :=
        jsonb_build_object(
            'id',
            v_colaborador.id,

            'nome',
            v_colaborador.nome,

            'cpf',
            v_colaborador.cpf,

            'matricula',
            v_colaborador.matricula,

            'matricula_esocial',
            v_colaborador.matricula_esocial,

            'funcao',
            v_colaborador.funcao,

            'empresa_id',
            v_colaborador.empresa_id,

            'status',
            v_colaborador.status,

            'status_mobilizacao',
            v_colaborador.status_mobilizacao
        );

    v_empresa_snapshot :=
        jsonb_build_object(
            'id',
            v_empresa.id,

            'nome',
            v_empresa.nome,

            'cnpj',
            v_empresa.cnpj,

            'numero_contrato',
            v_empresa.numero_contrato
        );

    v_resumo_final :=
        coalesce(
            p_resumo,
            '{}'::jsonb
        )
        ||
        jsonb_build_object(
            'total_treinamentos',
            v_total,

            'conformes',
            v_conformes,

            'atencao',
            v_atencao,

            'vencidos',
            v_vencidos,

            'divergentes',
            v_divergentes,

            'sem_evidencia_suficiente',
            v_sem_evidencia,

            'revisao_manual_necessaria',
            v_manual,

            'percentual_conformidade',
            v_percentual
        );

    v_snapshot :=
        jsonb_build_object(
            'schema_versao',
            1,

            'motor_versao',
            coalesce(
                nullif(
                    btrim(
                        p_motor_versao
                    ),
                    ''
                ),
                '1'
            ),

            'data_referencia',
            coalesce(
                p_data_referencia,
                current_date
            ),

            'colaborador',
            v_colaborador_snapshot,

            'empresa',
            v_empresa_snapshot,

            'resumo',
            v_resumo_final
        );

    insert into public.treinamentos_revisoes (
        colaborador_id,
        empresa_id,
        numero_revisao,
        data_referencia,
        status,
        motor_versao,
        schema_versao,
        executado_por,
        executado_por_email,
        colaborador_snapshot,
        empresa_snapshot,
        resumo,
        total_treinamentos,
        total_conformes,
        total_atencao,
        total_vencidos,
        total_divergentes,
        total_sem_evidencia,
        total_revisao_manual,
        percentual_conformidade,
        snapshot
    )
    values (
        p_colaborador_id,
        v_colaborador.empresa_id,
        v_numero_revisao,
        coalesce(
            p_data_referencia,
            current_date
        ),
        'concluida',
        coalesce(
            nullif(
                btrim(
                    p_motor_versao
                ),
                ''
            ),
            '1'
        ),
        1,
        auth.uid(),
        v_email,
        v_colaborador_snapshot,
        v_empresa_snapshot,
        v_resumo_final,
        v_total,
        v_conformes,
        v_atencao,
        v_vencidos,
        v_divergentes,
        v_sem_evidencia,
        v_manual,
        v_percentual,
        v_snapshot
    )
    returning id
    into v_revisao_id;

    for v_item in
        select item
        from jsonb_array_elements(
            p_itens
        ) as dados(item)
    loop
        if jsonb_typeof(
            v_item
        ) <> 'object'
        then
            raise exception using
                errcode = '22023',
                message = 'Item da revisão inválido.';
        end if;

        v_item_ordem :=
            v_item_ordem + 1;

        v_certificado_origem_id :=
            case
                when
                    coalesce(
                        v_item ->> 'certificado_origem_id',
                        ''
                    )
                    ~*
                    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                then
                    (
                        v_item ->> 'certificado_origem_id'
                    )::uuid
                else null
            end;

        v_treinamento_id :=
            case
                when
                    coalesce(
                        v_item ->> 'treinamento_id',
                        ''
                    )
                    ~*
                    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                then
                    (
                        v_item ->> 'treinamento_id'
                    )::uuid
                else null
            end;

        v_treinamento_codigo :=
            case
                when
                    coalesce(
                        v_item ->> 'treinamento_codigo',
                        ''
                    )
                    ~
                    '^[0-9]+$'
                then
                    (
                        v_item ->> 'treinamento_codigo'
                    )::integer
                else null
            end;

        v_data_realizacao_salva :=
            case
                when
                    coalesce(
                        v_item ->> 'data_realizacao_salva',
                        ''
                    )
                    ~
                    '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                then
                    (
                        v_item ->> 'data_realizacao_salva'
                    )::date
                else null
            end;

        v_data_vencimento_salva :=
            case
                when
                    coalesce(
                        v_item ->> 'data_vencimento_salva',
                        ''
                    )
                    ~
                    '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                then
                    (
                        v_item ->> 'data_vencimento_salva'
                    )::date
                else null
            end;

        v_data_realizacao_revisada :=
            case
                when
                    coalesce(
                        v_item ->> 'data_realizacao_revisada',
                        ''
                    )
                    ~
                    '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                then
                    (
                        v_item ->> 'data_realizacao_revisada'
                    )::date
                else null
            end;

        v_data_vencimento_revisada :=
            case
                when
                    coalesce(
                        v_item ->> 'data_vencimento_revisada',
                        ''
                    )
                    ~
                    '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                then
                    (
                        v_item ->> 'data_vencimento_revisada'
                    )::date
                else null
            end;

        v_evidencias :=
            coalesce(
                v_item -> 'evidencias',
                '[]'::jsonb
            );

        if jsonb_typeof(
            v_evidencias
        ) <> 'array'
        then
            raise exception using
                errcode = '22023',
                message = 'Evidências do item devem ser um array.';
        end if;

        insert into public.treinamentos_revisao_itens (
            revisao_id,
            ordem,
            certificado_origem_id,
            treinamento_id,
            treinamento_codigo,
            nome_treinamento,
            data_realizacao_salva,
            data_vencimento_salva,
            data_realizacao_revisada,
            data_vencimento_revisada,
            status_temporal_anterior,
            status_temporal_revisado,
            status_integridade,
            resultado_geral,
            evidencias_total,
            divergencias,
            decisao_humana,
            observacao_manual,
            snapshot
        )
        values (
            v_revisao_id,
            v_item_ordem,
            v_certificado_origem_id,
            v_treinamento_id,
            v_treinamento_codigo,
            coalesce(
                nullif(
                    btrim(
                        v_item ->> 'nome_treinamento'
                    ),
                    ''
                ),
                'Treinamento não identificado'
            ),
            v_data_realizacao_salva,
            v_data_vencimento_salva,
            v_data_realizacao_revisada,
            v_data_vencimento_revisada,
            nullif(
                lower(
                    btrim(
                        coalesce(
                            v_item ->> 'status_temporal_anterior',
                            ''
                        )
                    )
                ),
                ''
            ),
            lower(
                btrim(
                    coalesce(
                        v_item ->> 'status_temporal_revisado',
                        ''
                    )
                )
            ),
            lower(
                btrim(
                    coalesce(
                        v_item ->> 'status_integridade',
                        ''
                    )
                )
            ),
            lower(
                btrim(
                    coalesce(
                        v_item ->> 'resultado_geral',
                        ''
                    )
                )
            ),
            jsonb_array_length(
                v_evidencias
            ),
            case
                when jsonb_typeof(
                    coalesce(
                        v_item -> 'divergencias',
                        '[]'::jsonb
                    )
                ) = 'array'
                then coalesce(
                    v_item -> 'divergencias',
                    '[]'::jsonb
                )
                else '[]'::jsonb
            end,
            nullif(
                btrim(
                    coalesce(
                        v_item ->> 'decisao_humana',
                        ''
                    )
                ),
                ''
            ),
            nullif(
                btrim(
                    coalesce(
                        v_item ->> 'observacao_manual',
                        ''
                    )
                ),
                ''
            ),
            v_item - 'evidencias'
        )
        returning id
        into v_item_id;

        v_evidencia_ordem :=
            0;

        for v_evidencia in
            select evidencia
            from jsonb_array_elements(
                v_evidencias
            ) as dados(evidencia)
        loop
            if jsonb_typeof(
                v_evidencia
            ) <> 'object'
            then
                raise exception using
                    errcode = '22023',
                    message = 'Evidência da revisão inválida.';
            end if;

            v_evidencia_ordem :=
                v_evidencia_ordem + 1;

            v_certificado_evidencia_id :=
                case
                    when
                        coalesce(
                            v_evidencia ->> 'certificado_evidencia_id',
                            ''
                        )
                        ~*
                        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                    then
                        (
                            v_evidencia ->> 'certificado_evidencia_id'
                        )::uuid
                    else null
                end;

            v_certificado_origem_id :=
                case
                    when
                        coalesce(
                            v_evidencia ->> 'certificado_origem_id',
                            ''
                        )
                        ~*
                        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
                    then
                        (
                            v_evidencia ->> 'certificado_origem_id'
                        )::uuid
                    else null
                end;

            v_sha :=
                case
                    when
                        coalesce(
                            v_evidencia ->> 'arquivo_sha256',
                            ''
                        )
                        ~*
                        '^[0-9a-f]{64}$'
                    then
                        lower(
                            v_evidencia ->> 'arquivo_sha256'
                        )
                    else null
                end;

            v_conf_identidade :=
                case
                    when
                        coalesce(
                            v_evidencia ->> 'confianca_identidade',
                            ''
                        )
                        ~
                        '^(0([.][0-9]+)?|1([.]0+)?)$'
                    then
                        (
                            v_evidencia ->> 'confianca_identidade'
                        )::numeric
                    else null
                end;

            v_conf_documento :=
                case
                    when
                        coalesce(
                            v_evidencia ->> 'confianca_documento',
                            ''
                        )
                        ~
                        '^(0([.][0-9]+)?|1([.]0+)?)$'
                    then
                        (
                            v_evidencia ->> 'confianca_documento'
                        )::numeric
                    else null
                end;

            v_conf_treinamento :=
                case
                    when
                        coalesce(
                            v_evidencia ->> 'confianca_treinamento',
                            ''
                        )
                        ~
                        '^(0([.][0-9]+)?|1([.]0+)?)$'
                    then
                        (
                            v_evidencia ->> 'confianca_treinamento'
                        )::numeric
                    else null
                end;

            insert into public.treinamentos_revisao_evidencias (
                revisao_id,
                revisao_item_id,
                ordem,
                certificado_evidencia_id,
                certificado_origem_id,
                tipo_evidencia,
                arquivo_nome,
                arquivo_url,
                arquivo_sha256,
                identidade_esperada,
                identidade_encontrada,
                tipo_documento_esperado,
                tipo_documento_identificado,
                treinamento_esperado,
                treinamento_identificado,
                confianca_identidade,
                confianca_documento,
                confianca_treinamento,
                status_integridade,
                duplicidade_mesmo_colaborador,
                duplicidade_outro_colaborador,
                vinculo_fora_escopo,
                vinculos_sha256,
                divergencias,
                snapshot
            )
            values (
                v_revisao_id,
                v_item_id,
                v_evidencia_ordem,
                v_certificado_evidencia_id,
                v_certificado_origem_id,
                coalesce(
                    nullif(
                        lower(
                            btrim(
                                v_evidencia ->> 'tipo_evidencia'
                            )
                        ),
                        ''
                    ),
                    'evidencia_complementar'
                ),
                nullif(
                    btrim(
                        coalesce(
                            v_evidencia ->> 'arquivo_nome',
                            ''
                        )
                    ),
                    ''
                ),
                nullif(
                    btrim(
                        coalesce(
                            v_evidencia ->> 'arquivo_url',
                            ''
                        )
                    ),
                    ''
                ),
                v_sha,
                case
                    when jsonb_typeof(
                        coalesce(
                            v_evidencia -> 'identidade_esperada',
                            '{}'::jsonb
                        )
                    ) = 'object'
                    then coalesce(
                        v_evidencia -> 'identidade_esperada',
                        '{}'::jsonb
                    )
                    else '{}'::jsonb
                end,
                case
                    when jsonb_typeof(
                        coalesce(
                            v_evidencia -> 'identidade_encontrada',
                            '{}'::jsonb
                        )
                    ) = 'object'
                    then coalesce(
                        v_evidencia -> 'identidade_encontrada',
                        '{}'::jsonb
                    )
                    else '{}'::jsonb
                end,
                nullif(
                    btrim(
                        coalesce(
                            v_evidencia ->> 'tipo_documento_esperado',
                            ''
                        )
                    ),
                    ''
                ),
                nullif(
                    btrim(
                        coalesce(
                            v_evidencia ->> 'tipo_documento_identificado',
                            ''
                        )
                    ),
                    ''
                ),
                nullif(
                    btrim(
                        coalesce(
                            v_evidencia ->> 'treinamento_esperado',
                            ''
                        )
                    ),
                    ''
                ),
                nullif(
                    btrim(
                        coalesce(
                            v_evidencia ->> 'treinamento_identificado',
                            ''
                        )
                    ),
                    ''
                ),
                v_conf_identidade,
                v_conf_documento,
                v_conf_treinamento,
                lower(
                    btrim(
                        coalesce(
                            v_evidencia ->> 'status_integridade',
                            ''
                        )
                    )
                ),
                lower(
                    coalesce(
                        v_evidencia ->> 'duplicidade_mesmo_colaborador',
                        'false'
                    )
                ) = 'true',
                lower(
                    coalesce(
                        v_evidencia ->> 'duplicidade_outro_colaborador',
                        'false'
                    )
                ) = 'true',
                lower(
                    coalesce(
                        v_evidencia ->> 'vinculo_fora_escopo',
                        'false'
                    )
                ) = 'true',
                case
                    when jsonb_typeof(
                        coalesce(
                            v_evidencia -> 'vinculos_sha256',
                            '{}'::jsonb
                        )
                    ) = 'object'
                    then coalesce(
                        v_evidencia -> 'vinculos_sha256',
                        '{}'::jsonb
                    )
                    else '{}'::jsonb
                end,
                case
                    when jsonb_typeof(
                        coalesce(
                            v_evidencia -> 'divergencias',
                            '[]'::jsonb
                        )
                    ) = 'array'
                    then coalesce(
                        v_evidencia -> 'divergencias',
                        '[]'::jsonb
                    )
                    else '[]'::jsonb
                end,
                v_evidencia
            );
        end loop;
    end loop;

    return
        jsonb_build_object(
            'ok',
            true,

            'revisao_id',
            v_revisao_id,

            'numero_revisao',
            v_numero_revisao,

            'total_treinamentos',
            v_total,

            'percentual_conformidade',
            v_percentual,

            'pdf_bucket',
            'revisoes-treinamentos',

            'pdf_caminho_esperado',
            (
                p_colaborador_id::text
                || '/'
                || v_revisao_id::text
                || '/revisao-'
                || v_numero_revisao::text
                || '.pdf'
            )
        );
end;
$function$;

revoke all
on function
public.concluir_revisao_treinamentos(
    uuid,
    date,
    text,
    jsonb,
    jsonb
)
from public, anon;

grant execute
on function
public.concluir_revisao_treinamentos(
    uuid,
    date,
    text,
    jsonb,
    jsonb
)
to authenticated, service_role;

-- ============================================================================
-- 9. CONSULTA TRANSVERSAL POR SHA-256
--
-- Retorna detalhes somente dos outros colaboradores que o usuário pode ver.
-- Fora do escopo retorna apenas booleano de existência.
-- ============================================================================

create or replace function
public.consultar_vinculos_sha256_revisao_treinamentos(
    p_colaborador_id uuid,
    p_sha256 text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
    v_colaborador public.colaboradores%rowtype;
    v_sha text;

    v_total integer := 0;
    v_mesmo_colaborador integer := 0;
    v_outros_acessiveis integer := 0;
    v_possui_restrito boolean := false;

    v_detalhes jsonb := '[]'::jsonb;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    select c.*
    into v_colaborador
    from public.colaboradores c
    where c.id = p_colaborador_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Colaborador não localizado.';
    end if;

    if not (
        select
            private.treinamentos_revisao_usuario_pode_acao(
                v_colaborador.empresa_id,
                'visualizar'
            )
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso ao colaborador informado.';
    end if;

    v_sha :=
        lower(
            btrim(
                coalesce(
                    p_sha256,
                    ''
                )
            )
        );

    if v_sha !~ '^[0-9a-f]{64}$' then
        raise exception using
            errcode = '22023',
            message = 'SHA-256 inválido.';
    end if;

    with vinculos as (
        select
            ce.id,
            ce.colaborador_id,
            ce.treinamento_codigo,
            ce.nome_treinamento,
            ce.tipo_evidencia,
            c.nome as colaborador_nome,

            case
                when ce.colaborador_id =
                    p_colaborador_id
                then true
                else (
                    select
                        public.usuario_tem_acesso_certificado(
                            ce.colaborador_id
                        )
                )
            end as acessivel
        from public.certificados_evidencias ce
        left join public.colaboradores c
            on c.id = ce.colaborador_id
        where
            ce.arquivo_sha256 is not null
            and lower(
                ce.arquivo_sha256
            ) = v_sha
            and coalesce(
                ce.historica,
                false
            ) is false
    )
    select
        count(*)::integer,

        count(*) filter (
            where colaborador_id =
                p_colaborador_id
        )::integer,

        count(*) filter (
            where
                colaborador_id <>
                    p_colaborador_id
                and acessivel
        )::integer,

        coalesce(
            bool_or(
                colaborador_id <>
                    p_colaborador_id
                and not acessivel
            ),
            false
        )
    into
        v_total,
        v_mesmo_colaborador,
        v_outros_acessiveis,
        v_possui_restrito
    from vinculos;

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'evidencia_id',
                    dados.id,

                    'colaborador_id',
                    dados.colaborador_id,

                    'colaborador_nome',
                    dados.colaborador_nome,

                    'treinamento_codigo',
                    dados.treinamento_codigo,

                    'nome_treinamento',
                    dados.nome_treinamento,

                    'tipo_evidencia',
                    dados.tipo_evidencia
                )
            ),
            '[]'::jsonb
        )
    into v_detalhes
    from (
        select
            ce.id,
            ce.colaborador_id,
            ce.treinamento_codigo,
            ce.nome_treinamento,
            ce.tipo_evidencia,
            c.nome as colaborador_nome
        from public.certificados_evidencias ce
        left join public.colaboradores c
            on c.id = ce.colaborador_id
        where
            ce.arquivo_sha256 is not null
            and lower(
                ce.arquivo_sha256
            ) = v_sha
            and ce.colaborador_id <>
                p_colaborador_id
            and coalesce(
                ce.historica,
                false
            ) is false
            and (
                select
                    public.usuario_tem_acesso_certificado(
                        ce.colaborador_id
                    )
            )
        order by
            ce.created_at desc
        limit 25
    ) dados;

    return
        jsonb_build_object(
            'sha256',
            v_sha,

            'total_vinculos',
            v_total,

            'mesmo_colaborador_total',
            v_mesmo_colaborador,

            'outros_colaboradores_acessiveis_total',
            v_outros_acessiveis,

            'possui_vinculo_fora_escopo',
            v_possui_restrito,

            'outros_colaboradores_acessiveis',
            v_detalhes
        );
end;
$function$;

revoke all
on function
public.consultar_vinculos_sha256_revisao_treinamentos(
    uuid,
    text
)
from public, anon;

grant execute
on function
public.consultar_vinculos_sha256_revisao_treinamentos(
    uuid,
    text
)
to authenticated, service_role;

-- ============================================================================
-- 10. AUTORIZAÇÃO DO STORAGE
-- ============================================================================

create or replace function
private.treinamentos_revisao_storage_pode_acessar(
    p_nome text,
    p_acao text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
    v_partes text[];

    v_colaborador_id uuid;
    v_revisao_id uuid;

    v_revisao record;

    v_nome_esperado text;
begin
    if auth.uid() is null then
        return false;
    end if;

    v_partes :=
        string_to_array(
            coalesce(
                p_nome,
                ''
            ),
            '/'
        );

    if
        array_length(
            v_partes,
            1
        ) <> 3
    then
        return false;
    end if;

    if
        v_partes[1]
        !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or
        v_partes[2]
        !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    then
        return false;
    end if;

    v_colaborador_id :=
        v_partes[1]::uuid;

    v_revisao_id :=
        v_partes[2]::uuid;

    select
        r.id,
        r.colaborador_id,
        r.empresa_id,
        r.numero_revisao
    into v_revisao
    from public.treinamentos_revisoes r
    where r.id =
        v_revisao_id;

    if not found then
        return false;
    end if;

    if
        v_revisao.colaborador_id <>
        v_colaborador_id
    then
        return false;
    end if;

    v_nome_esperado :=
        'revisao-'
        || v_revisao.numero_revisao::text
        || '.pdf';

    if
        v_partes[3] <>
        v_nome_esperado
    then
        return false;
    end if;

    if
        lower(
            btrim(
                coalesce(
                    p_acao,
                    ''
                )
            )
        )
        not in (
            'select',
            'insert'
        )
    then
        return false;
    end if;

    return (
        select
            private.treinamentos_revisao_usuario_pode_acao(
                v_revisao.empresa_id,
                'exportar'
            )
    );
end;
$function$;

revoke all
on function
private.treinamentos_revisao_storage_pode_acessar(
    text,
    text
)
from public, anon;

grant execute
on function
private.treinamentos_revisao_storage_pode_acessar(
    text,
    text
)
to authenticated, service_role;

drop policy if exists
revisoes_treinamentos_select_usuarios_autorizados
on storage.objects;

create policy
revisoes_treinamentos_select_usuarios_autorizados
on storage.objects
for select
to authenticated
using (
    bucket_id =
        'revisoes-treinamentos'
    and (
        select
            private.treinamentos_revisao_storage_pode_acessar(
                name,
                'select'
            )
    )
);

drop policy if exists
revisoes_treinamentos_insert_usuarios_autorizados
on storage.objects;

create policy
revisoes_treinamentos_insert_usuarios_autorizados
on storage.objects
for insert
to authenticated
with check (
    bucket_id =
        'revisoes-treinamentos'
    and owner_id =
        (
            select
                auth.uid()::text
        )
    and (
        select
            private.treinamentos_revisao_storage_pode_acessar(
                name,
                'insert'
            )
    )
);

-- INTENCIONALMENTE NÃO EXISTEM policies UPDATE ou DELETE
-- para o bucket revisoes-treinamentos.
-- O PDF histórico não pode ser sobrescrito/excluído pelo frontend.

-- ============================================================================
-- 11. REGISTRAR PDF EMITIDO
--
-- Permite vínculo inicial uma única vez.
-- Repetição idêntica é idempotente.
-- Metadados diferentes são recusados.
-- ============================================================================

create or replace function
public.registrar_pdf_revisao_treinamentos(
    p_revisao_id uuid,
    p_caminho text,
    p_nome text,
    p_sha256 text,
    p_tamanho_bytes bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_revisao public.treinamentos_revisoes%rowtype;

    v_caminho text;
    v_nome text;
    v_sha text;

    v_caminho_esperado text;
    v_nome_esperado text;

    v_storage_id uuid;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    select r.*
    into v_revisao
    from public.treinamentos_revisoes r
    where r.id = p_revisao_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Revisão não localizada.';
    end if;

    if not (
        select
            private.treinamentos_revisao_usuario_pode_acao(
                v_revisao.empresa_id,
                'exportar'
            )
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem permissão para registrar o PDF da revisão.';
    end if;

    v_caminho :=
        btrim(
            coalesce(
                p_caminho,
                ''
            )
        );

    v_nome :=
        btrim(
            coalesce(
                p_nome,
                ''
            )
        );

    v_sha :=
        lower(
            btrim(
                coalesce(
                    p_sha256,
                    ''
                )
            )
        );

    v_nome_esperado :=
        'revisao-'
        || v_revisao.numero_revisao::text
        || '.pdf';

    v_caminho_esperado :=
        v_revisao.colaborador_id::text
        || '/'
        || v_revisao.id::text
        || '/'
        || v_nome_esperado;

    if
        v_nome <>
        v_nome_esperado
        or
        v_caminho <>
        v_caminho_esperado
    then
        raise exception using
            errcode = '22023',
            message = 'Caminho do PDF não corresponde à revisão.';
    end if;

    if v_sha !~ '^[0-9a-f]{64}$' then
        raise exception using
            errcode = '22023',
            message = 'SHA-256 do PDF inválido.';
    end if;

    if
        p_tamanho_bytes is null
        or p_tamanho_bytes <= 0
        or p_tamanho_bytes > 20971520
    then
        raise exception using
            errcode = '22023',
            message = 'Tamanho do PDF inválido.';
    end if;

    select o.id
    into v_storage_id
    from storage.objects o
    where
        o.bucket_id =
            'revisoes-treinamentos'
        and o.name =
            v_caminho
    limit 1;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'PDF ainda não localizado no Storage privado.';
    end if;

    if v_revisao.pdf_caminho is not null then
        if
            v_revisao.pdf_bucket =
                'revisoes-treinamentos'
            and v_revisao.pdf_caminho =
                v_caminho
            and v_revisao.pdf_nome =
                v_nome
            and lower(
                v_revisao.pdf_sha256
            ) = v_sha
            and v_revisao.pdf_tamanho_bytes =
                p_tamanho_bytes
        then
            return
                jsonb_build_object(
                    'ok',
                    true,

                    'idempotente',
                    true,

                    'revisao_id',
                    v_revisao.id,

                    'bucket',
                    v_revisao.pdf_bucket,

                    'caminho',
                    v_revisao.pdf_caminho,

                    'sha256',
                    lower(
                        v_revisao.pdf_sha256
                    )
                );
        end if;

        raise exception using
            errcode = '23505',
            message = 'A revisão já possui PDF histórico registrado e imutável.';
    end if;

    update public.treinamentos_revisoes
    set
        pdf_bucket =
            'revisoes-treinamentos',

        pdf_caminho =
            v_caminho,

        pdf_nome =
            v_nome,

        pdf_sha256 =
            v_sha,

        pdf_tamanho_bytes =
            p_tamanho_bytes,

        pdf_gerado_em =
            now()
    where id =
        v_revisao.id;

    return
        jsonb_build_object(
            'ok',
            true,

            'idempotente',
            false,

            'revisao_id',
            v_revisao.id,

            'bucket',
            'revisoes-treinamentos',

            'caminho',
            v_caminho,

            'sha256',
            v_sha,

            'tamanho_bytes',
            p_tamanho_bytes
        );
end;
$function$;

revoke all
on function
public.registrar_pdf_revisao_treinamentos(
    uuid,
    text,
    text,
    text,
    bigint
)
from public, anon;

grant execute
on function
public.registrar_pdf_revisao_treinamentos(
    uuid,
    text,
    text,
    text,
    bigint
)
to authenticated, service_role;

-- ============================================================================
-- 12. PROTEÇÃO FINAL DAS FUNÇÕES INTERNAS
-- ============================================================================

revoke all
on function
private.treinamentos_revisao_usuario_pode_acao(
    uuid,
    text
)
from public, anon;

revoke all
on function
private.treinamentos_revisao_storage_pode_acessar(
    text,
    text
)
from public, anon;

commit;