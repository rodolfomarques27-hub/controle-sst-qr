begin;

-- ============================================================
-- J.52 / P15 / I3-B
-- Certidao Mensal Documental
--
-- Expansao oficial do catalogo:
-- 17 grupos totais
-- 15 documentos externos
-- 2 documentos automaticos
--
-- Esta migration:
-- - NAO executa materializacao;
-- - NAO faz backfill;
-- - NAO altera competencias fechadas;
-- - NAO envia e-mail;
-- - NAO altera snapshots historicos.
-- ============================================================

do $preflight$
begin
    if to_regclass(
        'public.certidao_mensal_perfil_documental_regras'
    ) is null then
        raise exception
            'Tabela certidao_mensal_perfil_documental_regras nao localizada.';
    end if;

    if to_regclass(
        'public.certidao_mensal_itens'
    ) is null then
        raise exception
            'Tabela certidao_mensal_itens nao localizada.';
    end if;

    if to_regprocedure(
        'public.materializar_itens_externos_certidao_mensal(uuid)'
    ) is null then
        raise exception
            'RPC materializar_itens_externos_certidao_mensal(uuid) nao localizada.';
    end if;

    if to_regprocedure(
        'public.admin_salvar_regra_perfil_documental_certidao_mensal(uuid,text,boolean,date,text)'
    ) is null then
        raise exception
            'RPC administrativa de perfil documental nao localizada.';
    end if;

    if to_regprocedure(
        'public.certidao_mensal_documento_exigido_na_competencia(uuid,text,date)'
    ) is null then
        raise exception
            'Resolver de exigibilidade historica nao localizado.';
    end if;
end;
$preflight$;

-- ============================================================
-- 1. CATALOGO OFICIAL DO PERFIL DOCUMENTAL
-- ============================================================

alter table
    public.certidao_mensal_perfil_documental_regras
drop constraint if exists
    certidao_mensal_perfil_documental_tipo_check;

alter table
    public.certidao_mensal_perfil_documental_regras
add constraint
    certidao_mensal_perfil_documental_tipo_check
check (
    tipo_documento in (
        'cnd-federal',
        'cnd-estadual',
        'cnd-municipal',
        'crf-fgts',
        'fgts',
        'cndt-trabalhista',
        'falencia-concordata',
        'cadastro-tce-ceis',
        'folha-pagamento',
        'folha-ponto',
        'va-vt',
        'seguro-vida',
        'inss-dctfweb',
        'iss',
        'esocial',
        'relacao-empregados',
        'aso-pcmso'
    )
);

comment on constraint
    certidao_mensal_perfil_documental_tipo_check
on
    public.certidao_mensal_perfil_documental_regras
is
    'Catalogo oficial J.52: 17 grupos documentais, sendo 15 externos e 2 automaticos.';

-- ============================================================
-- 1.1. APLICABILIDADE POR COMPETENCIA
-- ============================================================

alter table
    public.certidao_mensal_itens
add column if not exists
    aplicabilidade text not null
    default 'APLICAVEL';

alter table
    public.certidao_mensal_itens
add column if not exists
    aplicabilidade_motivo text null;

alter table
    public.certidao_mensal_itens
add column if not exists
    aplicabilidade_definida_em timestamptz null;

alter table
    public.certidao_mensal_itens
add column if not exists
    aplicabilidade_definida_por uuid null
    references auth.users(id)
    on delete set null;

alter table
    public.certidao_mensal_itens
drop constraint if exists
    certidao_mensal_itens_aplicabilidade_check;

alter table
    public.certidao_mensal_itens
add constraint
    certidao_mensal_itens_aplicabilidade_check
check (
    (
        tipo_documento =
            'esocial'
        and aplicabilidade in (
            'PENDENTE_DEFINICAO',
            'APLICAVEL',
            'NAO_APLICAVEL'
        )
    )
    or (
        tipo_documento <>
            'esocial'
        and aplicabilidade =
            'APLICAVEL'
    )
);

alter table
    public.certidao_mensal_itens
drop constraint if exists
    certidao_mensal_itens_aplicabilidade_metadata_check;

alter table
    public.certidao_mensal_itens
add constraint
    certidao_mensal_itens_aplicabilidade_metadata_check
check (
    (
        aplicabilidade <>
            'NAO_APLICAVEL'
        or (
            nullif(
                btrim(
                    coalesce(
                        aplicabilidade_motivo,
                        ''
                    )
                ),
                ''
            ) is not null
            and aplicabilidade_definida_em is not null
            and aplicabilidade_definida_por is not null
        )
    )
    and (
        aplicabilidade <>
            'PENDENTE_DEFINICAO'
        or (
            aplicabilidade_motivo is null
            and aplicabilidade_definida_em is null
            and aplicabilidade_definida_por is null
        )
    )
    and char_length(
        coalesce(
            aplicabilidade_motivo,
            ''
        )
    ) <= 500
);

comment on column
    public.certidao_mensal_itens.aplicabilidade
is
    'Aplicabilidade do item na competencia. PENDENTE_DEFINICAO exige decisao humana; APLICAVEL exige tratamento documental; NAO_APLICAVEL registra ausencia da condicao geradora.';

comment on column
    public.certidao_mensal_itens.aplicabilidade_motivo
is
    'Justificativa auditavel da definicao de aplicabilidade quando pertinente.';

comment on column
    public.certidao_mensal_itens.aplicabilidade_definida_em
is
    'Data e hora da ultima definicao humana de aplicabilidade.';

comment on column
    public.certidao_mensal_itens.aplicabilidade_definida_por
is
    'Usuario que realizou a ultima definicao humana de aplicabilidade.';

-- ============================================================
-- 1.2. INTEGRIDADE DA APLICABILIDADE NA INSERCAO
-- ============================================================

do $preflight_esocial$
begin
    if exists (
        select 1
        from
            public.certidao_mensal_itens item
        where
            item.tipo_documento =
                'esocial'
    ) then
        raise exception
            'Foram encontrados itens eSocial anteriores a migration 17/15/2. A aplicabilidade desses registros precisa ser revisada antes da expansao.'
            using errcode = '55000';
    end if;
end;
$preflight_esocial$;

create or replace function
    public.certidao_mensal_inicializar_aplicabilidade_item()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
begin
    if new.tipo_documento =
        'esocial'
    then
        new.aplicabilidade :=
            'PENDENTE_DEFINICAO';

        new.aplicabilidade_motivo :=
            null;

        new.aplicabilidade_definida_em :=
            null;

        new.aplicabilidade_definida_por :=
            null;
    else
        new.aplicabilidade :=
            'APLICAVEL';

        new.aplicabilidade_motivo :=
            null;

        new.aplicabilidade_definida_em :=
            null;

        new.aplicabilidade_definida_por :=
            null;
    end if;

    return new;
end;
$function$;

drop trigger if exists
    trg_certidao_mensal_inicializar_aplicabilidade_item
on
    public.certidao_mensal_itens;

create trigger
    trg_certidao_mensal_inicializar_aplicabilidade_item
before insert
on
    public.certidao_mensal_itens
for each row
execute function
    public.certidao_mensal_inicializar_aplicabilidade_item();

revoke all
on function
    public.certidao_mensal_inicializar_aplicabilidade_item()
from public, anon;

grant execute
on function
    public.certidao_mensal_inicializar_aplicabilidade_item()
to authenticated, service_role;

comment on function
    public.certidao_mensal_inicializar_aplicabilidade_item()
is
    'Garante que todo novo eSocial nasca aguardando definicao humana de aplicabilidade e que os demais itens sejam aplicaveis.';

-- ============================================================
-- 1.3. PROTECAO DE UPDATE DA APLICABILIDADE
-- ============================================================

create or replace function
    public.certidao_mensal_proteger_atualizacao_aplicabilidade_item()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_status_competencia text;
    v_motivo text;
begin
    if new.competencia_id is distinct from
        old.competencia_id
    then
        raise exception using
            errcode = '55000',
            message = 'A competencia do item documental e imutavel.';
    end if;

    if new.tipo_documento is distinct from
        old.tipo_documento
    then
        raise exception using
            errcode = '55000',
            message = 'O tipo documental do item e imutavel.';
    end if;

    if (
        new.aplicabilidade is not distinct from
            old.aplicabilidade
        and new.aplicabilidade_motivo is not distinct from
            old.aplicabilidade_motivo
        and new.aplicabilidade_definida_em is not distinct from
            old.aplicabilidade_definida_em
        and new.aplicabilidade_definida_por is not distinct from
            old.aplicabilidade_definida_por
    ) then
        return new;
    end if;

    if old.tipo_documento <>
        'esocial'
    then
        raise exception using
            errcode = '55000',
            message = 'A aplicabilidade condicional e exclusiva do eSocial SST.';
    end if;

    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuario autenticado obrigatorio para definir aplicabilidade.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_competencia(
        old.competencia_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuario sem acesso a competencia deste item.';
    end if;

    select
        competencia.status
    into
        v_status_competencia
    from
        public.certidao_mensal_competencias competencia
    where
        competencia.id =
            old.competencia_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competencia documental nao localizada.';
    end if;

    if v_status_competencia =
        'FECHADA'
    then
        raise exception using
            errcode = '55000',
            message = 'A competencia fechada nao permite alterar a aplicabilidade do eSocial.';
    end if;

    if new.aplicabilidade not in (
        'PENDENTE_DEFINICAO',
        'APLICAVEL',
        'NAO_APLICAVEL'
    ) then
        raise exception using
            errcode = '22023',
            message = 'Aplicabilidade invalida.';
    end if;

    v_motivo :=
        nullif(
            btrim(
                coalesce(
                    new.aplicabilidade_motivo,
                    ''
                )
            ),
            ''
        );

    if char_length(
        coalesce(
            v_motivo,
            ''
        )
    ) > 500 then
        raise exception using
            errcode = '22001',
            message = 'O motivo deve ter no maximo 500 caracteres.';
    end if;

    if (
        new.aplicabilidade =
            'NAO_APLICAVEL'
        and v_motivo is null
    ) then
        raise exception using
            errcode = '22023',
            message = 'Informe o motivo para registrar eSocial como nao aplicavel.';
    end if;

    if new.aplicabilidade =
        'PENDENTE_DEFINICAO'
    then
        new.aplicabilidade_motivo :=
            null;

        new.aplicabilidade_definida_em :=
            null;

        new.aplicabilidade_definida_por :=
            null;
    else
        new.aplicabilidade_motivo :=
            v_motivo;

        new.aplicabilidade_definida_em :=
            clock_timestamp();

        new.aplicabilidade_definida_por :=
            auth.uid();
    end if;

    new.atualizado_em :=
        clock_timestamp();

    new.atualizado_por :=
        auth.uid();

    insert into
        public.certidao_mensal_auditoria (
            competencia_id,
            item_id,
            versao_id,
            tipo_evento,
            dados,
            usuario_id
        )
    values (
        old.competencia_id,
        old.id,
        null,
        'APLICABILIDADE_ESOCIAL_ATUALIZADA',
        jsonb_build_object(
            'contratoVersao',
                '1.0',
            'tipoDocumento',
                old.tipo_documento,
            'aplicabilidadeAnterior',
                old.aplicabilidade,
            'aplicabilidadeAtual',
                new.aplicabilidade,
            'motivo',
                new.aplicabilidade_motivo,
            'definidoEm',
                new.aplicabilidade_definida_em
        ),
        auth.uid()
    );

    return new;
end;
$function$;

drop trigger if exists
    trg_certidao_mensal_proteger_atualizacao_aplicabilidade
on
    public.certidao_mensal_itens;

create trigger
    trg_certidao_mensal_proteger_atualizacao_aplicabilidade
before update of
    competencia_id,
    tipo_documento,
    aplicabilidade,
    aplicabilidade_motivo,
    aplicabilidade_definida_em,
    aplicabilidade_definida_por
on
    public.certidao_mensal_itens
for each row
execute function
    public.certidao_mensal_proteger_atualizacao_aplicabilidade_item();

revoke all
on function
    public.certidao_mensal_proteger_atualizacao_aplicabilidade_item()
from public, anon, authenticated;

grant execute
on function
    public.certidao_mensal_proteger_atualizacao_aplicabilidade_item()
to service_role;

comment on function
    public.certidao_mensal_proteger_atualizacao_aplicabilidade_item()
is
    'Centraliza no banco a validacao, identidade, bloqueio de competencia fechada e auditoria de qualquer alteracao da aplicabilidade do eSocial SST.';

-- ============================================================
-- 2. RPC ADMINISTRATIVA DE PERFIL DOCUMENTAL
-- ============================================================

create or replace function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        p_empresa_id uuid,
        p_tipo_documento text,
        p_exigido boolean,
        p_competencia_inicio date,
        p_motivo text default null
    )
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_tipo_documento text;
    v_motivo text;

    v_proxima_regra_inicio date;
    v_competencia_fechada date;

    v_regra
        public.certidao_mensal_perfil_documental_regras%rowtype;
begin
    if not public.certidao_mensal_usuario_pode_gerenciar_perfil_documental() then
        raise exception
            'Sem permissao para alterar exigencias documentais da Certidao Mensal.'
            using errcode = '42501';
    end if;

    if p_empresa_id is null then
        raise exception
            'Empresa obrigatoria para configuracao documental.'
            using errcode = '22004';
    end if;

    if not exists (
        select 1
        from public.empresas empresa
        where empresa.id = p_empresa_id
    ) then
        raise exception
            'Empresa nao localizada para configuracao documental.'
            using errcode = 'P0002';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_empresa(
        p_empresa_id
    ) then
        raise exception
            'Sem permissao para alterar o perfil documental desta empresa.'
            using errcode = '42501';
    end if;

    v_tipo_documento :=
        lower(
            btrim(
                coalesce(
                    p_tipo_documento,
                    ''
                )
            )
        );

    if v_tipo_documento not in (
        'cnd-federal',
        'cnd-estadual',
        'cnd-municipal',
        'crf-fgts',
        'fgts',
        'cndt-trabalhista',
        'falencia-concordata',
        'cadastro-tce-ceis',
        'folha-pagamento',
        'folha-ponto',
        'va-vt',
        'seguro-vida',
        'inss-dctfweb',
        'iss',
        'esocial',
        'relacao-empregados',
        'aso-pcmso'
    ) then
        raise exception
            'Tipo documental nao pertence ao catalogo oficial da Certidao Mensal.'
            using errcode = '22023';
    end if;

    if p_exigido is null then
        raise exception
            'O estado de exigibilidade deve ser informado.'
            using errcode = '22004';
    end if;

    if p_competencia_inicio is null then
        raise exception
            'Competencia inicial obrigatoria.'
            using errcode = '22004';
    end if;

    if p_competencia_inicio <>
        date_trunc(
            'month',
            p_competencia_inicio
        )::date
    then
        raise exception
            'A competencia inicial deve utilizar o primeiro dia do mes.'
            using errcode = '22023';
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

    if char_length(
        coalesce(
            v_motivo,
            ''
        )
    ) > 500 then
        raise exception
            'O motivo deve ter no maximo 500 caracteres.'
            using errcode = '22001';
    end if;

    select
        min(
            regra.competencia_inicio
        )
    into
        v_proxima_regra_inicio
    from
        public.certidao_mensal_perfil_documental_regras regra
    where
        regra.empresa_id =
            p_empresa_id
        and regra.tipo_documento =
            v_tipo_documento
        and regra.competencia_inicio >
            p_competencia_inicio;

    select
        competencia.competencia
    into
        v_competencia_fechada
    from
        public.certidao_mensal_competencias competencia
    where
        competencia.empresa_id =
            p_empresa_id
        and competencia.status =
            'FECHADA'
        and competencia.competencia >=
            p_competencia_inicio
        and (
            v_proxima_regra_inicio is null
            or competencia.competencia <
                v_proxima_regra_inicio
        )
    order by
        competencia.competencia
    limit 1;

    if found then
        raise exception
            'A regra atingiria a competencia fechada %. Reabra formalmente a competencia antes de alterar sua exigibilidade.',
            to_char(
                v_competencia_fechada,
                'MM/YYYY'
            )
            using errcode = '55000';
    end if;

    insert into
        public.certidao_mensal_perfil_documental_regras (
            empresa_id,
            tipo_documento,
            exigido,
            competencia_inicio,
            motivo,
            criado_por,
            atualizado_por
        )
    values (
        p_empresa_id,
        v_tipo_documento,
        p_exigido,
        p_competencia_inicio,
        v_motivo,
        auth.uid(),
        auth.uid()
    )
    on conflict (
        empresa_id,
        tipo_documento,
        competencia_inicio
    )
    do update
    set
        exigido =
            excluded.exigido,

        motivo =
            excluded.motivo,

        atualizado_em =
            clock_timestamp(),

        atualizado_por =
            auth.uid()
    returning *
    into
        v_regra;

    return jsonb_build_object(
        'ok',
            true,

        'regra',
            to_jsonb(
                v_regra
            ),

        'proximaRegraInicio',
            v_proxima_regra_inicio,

        'historicoProtegido',
            true
    );
end;
$function$;

revoke all
on function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        uuid,
        text,
        boolean,
        date,
        text
    )
from public, anon, authenticated;

grant execute
on function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        uuid,
        text,
        boolean,
        date,
        text
    )
to authenticated, service_role;

comment on function
    public.admin_salvar_regra_perfil_documental_certidao_mensal(
        uuid,
        text,
        boolean,
        date,
        text
    )
is
    'Registra exigibilidade dos 17 grupos documentais por empresa e competencia, protegendo competencias fechadas contra alteracao retroativa.';

-- ============================================================
-- 3. MATERIALIZACAO DOS 15 DOCUMENTOS EXTERNOS
-- ============================================================

create or replace function
    public.materializar_itens_externos_certidao_mensal(
        p_competencia_id uuid
    )
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_competencia
        public.certidao_mensal_competencias%rowtype;

    v_itens_criados integer :=
        0;

    v_itens_disponiveis integer :=
        0;

    v_itens_existentes integer :=
        0;

    v_tipos_invalidos text;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    if p_competencia_id is null then
        raise exception using
            errcode = '22023',
            message = 'A competência é obrigatória.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_competencia(
        p_competencia_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso à competência informada.';
    end if;

    select
        competencia.*
    into
        v_competencia
    from public.certidao_mensal_competencias competencia
    where competencia.id =
        p_competencia_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competência documental não localizada.';
    end if;

    if v_competencia.status =
        'FECHADA'
    then
        raise exception using
            errcode = '55000',
            message = 'A competência fechada não pode receber novos itens.';
    end if;

    perform
        public.certidao_mensal_validar_vigencia_contratual(
            v_competencia.empresa_id,
            v_competencia.competencia,
            'materializar itens externos da competência'
        );

    select
        string_agg(
            item.tipo_documento,
            ', '
            order by item.tipo_documento
        )
    into
        v_tipos_invalidos
    from public.certidao_mensal_itens item
    where item.competencia_id =
            p_competencia_id
      and item.tipo_documento in (
            'cnd-federal',
            'cnd-estadual',
            'cnd-municipal',
            'crf-fgts',
            'fgts',
            'cndt-trabalhista',
            'falencia-concordata',
            'cadastro-tce-ceis',
            'folha-pagamento',
            'folha-ponto',
            'va-vt',
            'seguro-vida',
            'inss-dctfweb',
            'iss',
            'esocial'
        )
      and item.origem <>
            'UPLOAD';

    if v_tipos_invalidos is not null then
        raise exception using
            errcode = '55000',
            message =
                'Existem tipos externos gravados com origem incompatível: ' ||
                v_tipos_invalidos ||
                '.';
    end if;

    insert into
        public.certidao_mensal_itens (
            competencia_id,
            tipo_documento,
            titulo,
            origem,
            status,
            requer_consulta_oficial,
            status_consulta_oficial,
            versao_atual_id,
            snapshot_automatico,
            aplicabilidade,
            criado_por,
            atualizado_por
        )
    select
        p_competencia_id,
        documento.tipo_documento,
        documento.titulo,
        'UPLOAD',
        'PENDENTE',
        false,
        'NAO_APLICAVEL',
        null,
        '{}'::jsonb,
        case
            when documento.tipo_documento =
                'esocial'
                then 'PENDENTE_DEFINICAO'
            else 'APLICAVEL'
        end,
        auth.uid(),
        auth.uid()
    from (
        values
            ('cnd-federal', 'CND Federal'),
            ('cnd-estadual', 'CND Estadual'),
            ('cnd-municipal', 'CND Municipal'),
            ('crf-fgts', 'CRF FGTS'),
            ('fgts', 'FGTS'),
            ('cndt-trabalhista', 'CNDT (Trabalhista)'),
            ('falencia-concordata', 'Falência e Concordata'),
            ('cadastro-tce-ceis', 'Cadastro TCE / CEIS'),
            ('folha-pagamento', 'Folha de Pagamento + Holerites'),
            ('folha-ponto', 'Folha / Espelho de Ponto'),
            ('va-vt', 'VA / VT'),
            ('seguro-vida', 'Seguro de Vida'),
            ('inss-dctfweb', 'INSS / DCTFWeb'),
            ('iss', 'ISS'),
            ('esocial', 'eSocial SST')
    ) as documento(
        tipo_documento,
        titulo
    )
    on conflict (
        competencia_id,
        tipo_documento
    )
    do nothing;

    get diagnostics
        v_itens_criados = row_count;

    select
        count(*)
    into
        v_itens_disponiveis
    from public.certidao_mensal_itens item
    where item.competencia_id =
            p_competencia_id
      and item.origem =
            'UPLOAD'
      and item.tipo_documento in (
            'cnd-federal',
            'cnd-estadual',
            'cnd-municipal',
            'crf-fgts',
            'fgts',
            'cndt-trabalhista',
            'falencia-concordata',
            'cadastro-tce-ceis',
            'folha-pagamento',
            'folha-ponto',
            'va-vt',
            'seguro-vida',
            'inss-dctfweb',
            'iss',
            'esocial'
        );

    if v_itens_disponiveis <>
        15
    then
        raise exception using
            errcode = '55000',
            message =
                'A competência não possui os quinze documentos externos esperados.';
    end if;

    v_itens_existentes :=
        v_itens_disponiveis -
        v_itens_criados;

    if v_itens_criados > 0 then
        insert into
            public.certidao_mensal_auditoria (
                competencia_id,
                item_id,
                versao_id,
                tipo_evento,
                dados,
                usuario_id
            )
        values (
            p_competencia_id,
            null,
            null,
            'ITENS_EXTERNOS_MATERIALIZADOS',
            jsonb_build_object(
                'contratoVersao',
                    '1.0',
                'totalDocumentosExternos',
                    15,
                'itensCriados',
                    v_itens_criados,
                'itensExistentes',
                    v_itens_existentes,
                'tiposDocumento',
                    jsonb_build_array(
                        'cnd-federal',
                        'cnd-estadual',
                        'cnd-municipal',
                        'crf-fgts',
                        'fgts',
                        'cndt-trabalhista',
                        'falencia-concordata',
                        'cadastro-tce-ceis',
                        'folha-pagamento',
                        'folha-ponto',
                        'va-vt',
                        'seguro-vida',
                        'inss-dctfweb',
                        'iss',
                        'esocial'
                    ),
                'materializadoEm',
                    clock_timestamp()
            ),
            auth.uid()
        );
    end if;

    return jsonb_build_object(
        'competenciaId',
            p_competencia_id,
        'totalDocumentosExternos',
            15,
        'itensCriados',
            v_itens_criados,
        'itensExistentes',
            v_itens_existentes,
        'itensDisponiveis',
            v_itens_disponiveis,
        'materializadoEm',
            clock_timestamp()
    );
end;
$function$;

revoke all on function
    public.materializar_itens_externos_certidao_mensal(
        uuid
    )
from public, anon;

grant execute on function
    public.materializar_itens_externos_certidao_mensal(
        uuid
    )
to authenticated;

grant execute on function
    public.materializar_itens_externos_certidao_mensal(
        uuid
    )
to service_role;

comment on function
    public.materializar_itens_externos_certidao_mensal(
        uuid
    )
is
    'Cria de forma idempotente os quinze itens externos do catalogo J.52, preservando itens existentes e bloqueando competencias fechadas.';

-- ============================================================
-- 3.1. FECHAMENTO COM PERFIL + APLICABILIDADE
-- ============================================================

create or replace function
    public.fechar_competencia_certidao_mensal(
        p_competencia_id uuid
    )
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_empresa_id uuid;
    v_competencia date;
    v_status_anterior text;
    v_resumo_anterior jsonb;
    v_total_itens integer;
    v_total_exigiveis integer;
    v_total_confirmados integer;
    v_total_dispensados integer;
    v_total_nao_exigiveis integer;
    v_total_nao_aplicaveis integer;
    v_total_aplicabilidade_pendente integer;
    v_total_automaticos integer;
    v_conformidade integer;
    v_itens_confirmados jsonb;
    v_itens_dispensados jsonb;
    v_itens_nao_exigiveis jsonb;
    v_itens_nao_aplicaveis jsonb;
    v_fechado_em timestamptz;
    v_resumo jsonb;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário não autenticado.';
    end if;

    if p_competencia_id is null then
        raise exception using
            errcode = '22023',
            message = 'A competência é obrigatória.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_competencia(
        p_competencia_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuário sem acesso à competência informada.';
    end if;

    select
        competencia.empresa_id,
        competencia.competencia,
        competencia.status,
        competencia.resumo
    into
        v_empresa_id,
        v_competencia,
        v_status_anterior,
        v_resumo_anterior
    from public.certidao_mensal_competencias competencia
    where competencia.id = p_competencia_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competência documental não localizada.';
    end if;

    if v_status_anterior = 'FECHADA' then
        return
            coalesce(
                v_resumo_anterior,
                '{}'::jsonb
            ) ||
            jsonb_build_object(
                'reutilizado',
                    true
            );
    end if;

    select
        count(*)
    into
        v_total_automaticos
    from public.certidao_mensal_itens item
    where item.competencia_id = p_competencia_id
      and item.origem = 'SISTEMA'
      and item.tipo_documento in (
            'relacao-empregados',
            'aso-pcmso'
      );

    if v_total_automaticos <> 2 then
        raise exception using
            errcode = '55000',
            message = 'Os dois itens automáticos precisam ser consolidados antes do fechamento.';
    end if;

    select
        count(*)
    into
        v_total_aplicabilidade_pendente
    from
        public.certidao_mensal_itens item
    where
        item.competencia_id =
            p_competencia_id
        and item.tipo_documento =
            'esocial'
        and item.aplicabilidade =
            'PENDENTE_DEFINICAO'
        and public.certidao_mensal_documento_exigido_na_competencia(
            v_empresa_id,
            item.tipo_documento,
            v_competencia
        );

    if v_total_aplicabilidade_pendente > 0 then
        raise exception using
            errcode = '55000',
            message = 'Defina se houve evento eSocial SST aplicavel nesta competencia antes do fechamento.';
    end if;

    select
        count(*),
        count(*) filter (
            where item.status <> 'DISPENSADO'
              and item.aplicabilidade <> 'NAO_APLICAVEL'
              and public.certidao_mensal_documento_exigido_na_competencia(
                    v_empresa_id,
                    item.tipo_documento,
                    v_competencia
                  )
        ),
        count(*) filter (
            where item.status = 'CONFORME'
              and item.aplicabilidade <> 'NAO_APLICAVEL'
              and public.certidao_mensal_documento_exigido_na_competencia(
                    v_empresa_id,
                    item.tipo_documento,
                    v_competencia
                  )
        ),
        count(*) filter (
            where item.status = 'DISPENSADO'
        ),
        count(*) filter (
            where not public.certidao_mensal_documento_exigido_na_competencia(
                v_empresa_id,
                item.tipo_documento,
                v_competencia
            )
        ),
        count(*) filter (
            where item.aplicabilidade = 'NAO_APLICAVEL'
              and public.certidao_mensal_documento_exigido_na_competencia(
                    v_empresa_id,
                    item.tipo_documento,
                    v_competencia
                  )
        )
    into
        v_total_itens,
        v_total_exigiveis,
        v_total_confirmados,
        v_total_dispensados,
        v_total_nao_exigiveis,
        v_total_nao_aplicaveis
    from public.certidao_mensal_itens item
    where item.competencia_id =
        p_competencia_id;

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'itemId',
                        item.id,
                    'tipoDocumento',
                        item.tipo_documento,
                    'titulo',
                        item.titulo,
                    'origem',
                        item.origem,
                    'snapshotAutomatico',
                        item.snapshot_automatico
                )
                order by
                    item.tipo_documento
            ) filter (
                where item.status = 'CONFORME'
                  and public.certidao_mensal_documento_exigido_na_competencia(
                        v_empresa_id,
                        item.tipo_documento,
                        v_competencia
                      )
            ),
            '[]'::jsonb
        ),
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'itemId',
                        item.id,
                    'tipoDocumento',
                        item.tipo_documento,
                    'titulo',
                        item.titulo,
                    'origem',
                        item.origem
                )
                order by
                    item.tipo_documento
            ) filter (
                where item.status = 'DISPENSADO'
            ),
            '[]'::jsonb
        )
    into
        v_itens_confirmados,
        v_itens_dispensados
    from public.certidao_mensal_itens item
    where item.competencia_id =
        p_competencia_id;

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'itemId',
                        item.id,
                    'tipoDocumento',
                        item.tipo_documento,
                    'titulo',
                        item.titulo,
                    'origem',
                        item.origem,
                    'statusAtual',
                        item.status
                )
                order by
                    item.tipo_documento
            ),
            '[]'::jsonb
        )
    into
        v_itens_nao_exigiveis
    from public.certidao_mensal_itens item
    where item.competencia_id =
            p_competencia_id
      and not public.certidao_mensal_documento_exigido_na_competencia(
            v_empresa_id,
            item.tipo_documento,
            v_competencia
      );

    select
        coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'itemId',
                        item.id,
                    'tipoDocumento',
                        item.tipo_documento,
                    'titulo',
                        item.titulo,
                    'origem',
                        item.origem,
                    'statusAtual',
                        item.status,
                    'aplicabilidade',
                        item.aplicabilidade,
                    'motivo',
                        item.aplicabilidade_motivo,
                    'definidaEm',
                        item.aplicabilidade_definida_em,
                    'definidaPor',
                        item.aplicabilidade_definida_por
                )
                order by
                    item.tipo_documento
            ),
            '[]'::jsonb
        )
    into
        v_itens_nao_aplicaveis
    from
        public.certidao_mensal_itens item
    where
        item.competencia_id =
            p_competencia_id
        and item.aplicabilidade =
            'NAO_APLICAVEL'
        and public.certidao_mensal_documento_exigido_na_competencia(
            v_empresa_id,
            item.tipo_documento,
            v_competencia
        );

    v_conformidade :=
        case
            when v_total_exigiveis = 0
                then 0
            else
                round(
                    (
                        v_total_confirmados::numeric /
                        v_total_exigiveis::numeric
                    ) * 100
                )::integer
        end;

    v_fechado_em :=
        clock_timestamp();

    v_resumo :=
        jsonb_build_object(
            'contratoVersao',
                '1.0',
            'empresaId',
                v_empresa_id,
            'competencia',
                to_char(
                    v_competencia,
                    'MM/YYYY'
                ),
            'competenciaIso',
                to_char(
                    v_competencia,
                    'YYYY-MM-DD'
                ),
            'fechadoEm',
                v_fechado_em,
            'fechadoPor',
                auth.uid(),
            'totalItens',
                v_total_itens,
            'totalExigiveis',
                v_total_exigiveis,
            'totalConfirmados',
                v_total_confirmados,
            'totalDispensados',
                v_total_dispensados,
            'totalNaoExigiveis',
                v_total_nao_exigiveis,
            'totalNaoAplicaveis',
                v_total_nao_aplicaveis,
            'conformidade',
                v_conformidade,
            'itensConfirmados',
                v_itens_confirmados,
            'itensDispensados',
                v_itens_dispensados,
            'itensNaoExigiveis',
                v_itens_nao_exigiveis,
            'itensNaoAplicaveis',
                v_itens_nao_aplicaveis,
            'perfilDocumentalAplicado',
                true,
            'criterioExigibilidade',
                'PERFIL_DOCUMENTAL_V1',
            'aplicabilidadeCompetenciaAplicada',
                true,
            'criterioAplicabilidade',
                'APLICABILIDADE_COMPETENCIA_V1'
        );

    update public.certidao_mensal_competencias
    set
        status =
            'FECHADA',
        resumo =
            v_resumo,
        fechado_em =
            v_fechado_em,
        fechado_por =
            auth.uid(),
        atualizado_por =
            auth.uid(),
        atualizado_em =
            v_fechado_em
    where id =
        p_competencia_id;

    insert into
        public.certidao_mensal_auditoria (
            competencia_id,
            item_id,
            versao_id,
            tipo_evento,
            dados,
            usuario_id
        )
    values (
        p_competencia_id,
        null,
        null,
        'COMPETENCIA_FECHADA',
        jsonb_build_object(
            'contratoVersao',
                '1.0',
            'statusAnterior',
                v_status_anterior,
            'statusDestino',
                'FECHADA',
            'resumoConsolidado',
                v_resumo
        ),
        auth.uid()
    );

    return v_resumo;
end;
$function$;

revoke all
on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
from public, anon;

grant execute
on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
to authenticated, service_role;

comment on function
    public.fechar_competencia_certidao_mensal(
        uuid
    )
is
    'Fecha a competencia com denominador historico formado por perfil documental e aplicabilidade da competencia; eSocial pendente de definicao bloqueia o fechamento.';

-- ============================================================
-- 4. APLICABILIDADE HUMANA DO eSOCIAL SST
-- ============================================================

create or replace function
    public.definir_aplicabilidade_esocial_certidao_mensal(
        p_item_id uuid,
        p_aplicabilidade text,
        p_motivo text default null
    )
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public, auth
as $function$
declare
    v_item
        public.certidao_mensal_itens%rowtype;

    v_competencia
        public.certidao_mensal_competencias%rowtype;

    v_aplicabilidade text;
    v_motivo text;
    v_aplicabilidade_anterior text;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuario nao autenticado.';
    end if;

    if p_item_id is null then
        raise exception using
            errcode = '22023',
            message = 'O item documental e obrigatorio.';
    end if;

    v_aplicabilidade :=
        upper(
            btrim(
                coalesce(
                    p_aplicabilidade,
                    ''
                )
            )
        );

    if v_aplicabilidade not in (
        'PENDENTE_DEFINICAO',
        'APLICAVEL',
        'NAO_APLICAVEL'
    ) then
        raise exception using
            errcode = '22023',
            message = 'Aplicabilidade invalida.';
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

    if char_length(
        coalesce(
            v_motivo,
            ''
        )
    ) > 500 then
        raise exception using
            errcode = '22001',
            message = 'O motivo deve ter no maximo 500 caracteres.';
    end if;

    if (
        v_aplicabilidade =
            'NAO_APLICAVEL'
        and v_motivo is null
    ) then
        raise exception using
            errcode = '22023',
            message = 'Informe o motivo para registrar eSocial como nao aplicavel.';
    end if;

    select
        item.*
    into
        v_item
    from
        public.certidao_mensal_itens item
    where
        item.id =
            p_item_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Item documental nao localizado.';
    end if;

    if v_item.tipo_documento <>
        'esocial'
    then
        raise exception using
            errcode = '22023',
            message = 'A RPC de aplicabilidade e exclusiva do eSocial SST.';
    end if;

    if v_item.origem <>
        'UPLOAD'
    then
        raise exception using
            errcode = '55000',
            message = 'O item eSocial possui origem incompatível.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_competencia(
        v_item.competencia_id
    ) then
        raise exception using
            errcode = '42501',
            message = 'Usuario sem acesso a competencia deste item.';
    end if;

    select
        competencia.*
    into
        v_competencia
    from
        public.certidao_mensal_competencias competencia
    where
        competencia.id =
            v_item.competencia_id
    for update;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Competencia documental nao localizada.';
    end if;

    if v_competencia.status =
        'FECHADA'
    then
        raise exception using
            errcode = '55000',
            message = 'A competencia fechada nao permite alterar a aplicabilidade do eSocial.';
    end if;

    v_aplicabilidade_anterior :=
        v_item.aplicabilidade;

    update
        public.certidao_mensal_itens
    set
        aplicabilidade =
            v_aplicabilidade,

        aplicabilidade_motivo =
            case
                when v_aplicabilidade =
                    'PENDENTE_DEFINICAO'
                    then null
                else v_motivo
            end,

        aplicabilidade_definida_em =
            case
                when v_aplicabilidade =
                    'PENDENTE_DEFINICAO'
                    then null
                else clock_timestamp()
            end,

        aplicabilidade_definida_por =
            case
                when v_aplicabilidade =
                    'PENDENTE_DEFINICAO'
                    then null
                else auth.uid()
            end,

        atualizado_em =
            clock_timestamp(),

        atualizado_por =
            auth.uid()
    where
        id =
            p_item_id
    returning *
    into
        v_item;

    -- A auditoria e produzida pelo trigger de protecao do UPDATE.

    return jsonb_build_object(
        'ok',
            true,
        'itemId',
            v_item.id,
        'competenciaId',
            v_item.competencia_id,
        'tipoDocumento',
            v_item.tipo_documento,
        'aplicabilidade',
            v_item.aplicabilidade,
        'motivo',
            v_item.aplicabilidade_motivo,
        'definidaEm',
            v_item.aplicabilidade_definida_em,
        'definidaPor',
            v_item.aplicabilidade_definida_por
    );
end;
$function$;

revoke all
on function
    public.definir_aplicabilidade_esocial_certidao_mensal(
        uuid,
        text,
        text
    )
from public, anon;

grant execute
on function
    public.definir_aplicabilidade_esocial_certidao_mensal(
        uuid,
        text,
        text
    )
to authenticated, service_role;

comment on function
    public.definir_aplicabilidade_esocial_certidao_mensal(
        uuid,
        text,
        text
    )
is
    'Registra de forma auditavel a aplicabilidade do eSocial SST por competencia sem confundir ausencia de evento com dispensa contratual.';

notify pgrst, 'reload schema';

commit;