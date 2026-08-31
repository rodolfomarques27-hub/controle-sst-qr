-- CERT2 R14-CANONICAL-A4-FIX-1
--
-- Permite corrigir somente os dados analiticos da versao exata
-- selecionada, mesmo quando ela ja nao e a versao atual do item.
--
-- Invariantes preservadas:
-- - PDF, SHA-256, numero da versao, Storage e status nao mudam;
-- - item, empresa, competencia e tipo documental nao mudam;
-- - versao_atual_id nunca e atualizado por esta RPC;
-- - o diagnostico esperado continua sendo optimistic guard;
-- - Seguro de Vida conserva a regra anterior e permanece fora
--   da liberacao de revisao historica.

do $preflight$
begin
    if to_regclass('public.certidao_mensal_competencias') is null then
        raise exception 'Tabela certidao_mensal_competencias nao localizada.';
    end if;

    if to_regclass('public.certidao_mensal_itens') is null then
        raise exception 'Tabela certidao_mensal_itens nao localizada.';
    end if;

    if to_regclass('public.certidao_mensal_versoes') is null then
        raise exception 'Tabela certidao_mensal_versoes nao localizada.';
    end if;

    if to_regclass('public.certidao_mensal_auditoria') is null then
        raise exception 'Tabela certidao_mensal_auditoria nao localizada.';
    end if;

    if to_regprocedure('public.certidao_mensal_usuario_pode_acessar_item(uuid)') is null then
        raise exception 'Funcao de acesso ao item documental nao localizada.';
    end if;

    if to_regprocedure(
        'public.revisar_certidao_mensal_versao_existente(uuid,uuid,integer,text,date,text,text,jsonb,jsonb)'
    ) is null then
        raise exception 'RPC-base de revisao documental nao localizada.';
    end if;

    if to_regprocedure(
        'public.revisar_certidao_mensal_versao_existente(uuid,uuid,integer,text,uuid,date,text,text,jsonb,jsonb)'
    ) is null then
        raise exception 'RPC publica de revisao com guard de empresa nao localizada.';
    end if;
end;
$preflight$;

create or replace function public.revisar_certidao_mensal_versao_existente(
    p_versao_id uuid,
    p_item_id uuid,
    p_numero_versao integer,
    p_hash_sha256 text,
    p_competencia date,
    p_tipo_documento text,
    p_status_resultado_esperado text,
    p_diagnostico_esperado jsonb,
    p_diagnostico_novo jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
    v_item public.certidao_mensal_itens%rowtype;
    v_versao public.certidao_mensal_versoes%rowtype;
    v_competencia public.certidao_mensal_competencias%rowtype;
    v_hash_esperado text;
    v_tipo_esperado text;
    v_tipo_diagnostico_novo text;
    v_diagnostico_payload_anterior jsonb;
    v_payload_novo jsonb;
    v_auditoria_id uuid;
    v_versao_era_atual boolean;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuario autenticado obrigatorio para revisar documento salvo.';
    end if;

    if p_versao_id is null then
        raise exception using errcode = '22023', message = 'versao_id obrigatorio.';
    end if;

    if p_item_id is null then
        raise exception using errcode = '22023', message = 'item_id obrigatorio.';
    end if;

    if p_numero_versao is null or p_numero_versao <= 0 then
        raise exception using errcode = '22023', message = 'numero_versao invalido.';
    end if;

    if p_competencia is null then
        raise exception using errcode = '22023', message = 'competencia obrigatoria.';
    end if;

    v_hash_esperado := lower(btrim(coalesce(p_hash_sha256, '')));

    if v_hash_esperado !~ '^[0-9a-f]{64}$' then
        raise exception using errcode = '22023', message = 'SHA-256 esperado invalido.';
    end if;

    v_tipo_esperado := lower(btrim(coalesce(p_tipo_documento, '')));

    if v_tipo_esperado = '' then
        raise exception using errcode = '22023', message = 'tipo_documento obrigatorio.';
    end if;

    if nullif(btrim(coalesce(p_status_resultado_esperado, '')), '') is null then
        raise exception using errcode = '22023', message = 'status_resultado esperado obrigatorio.';
    end if;

    if p_diagnostico_esperado is null or jsonb_typeof(p_diagnostico_esperado) <> 'object' then
        raise exception using errcode = '22023', message = 'diagnostico esperado deve ser objeto JSON.';
    end if;

    if p_diagnostico_novo is null or jsonb_typeof(p_diagnostico_novo) <> 'object' then
        raise exception using errcode = '22023', message = 'diagnostico novo deve ser objeto JSON.';
    end if;

    select i.*
    into v_item
    from public.certidao_mensal_itens i
    where i.id = p_item_id
    for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'Item documental nao localizado.';
    end if;

    if not public.certidao_mensal_usuario_pode_acessar_item(p_item_id) then
        raise exception using errcode = '42501', message = 'Sem permissao para revisar este documento.';
    end if;

    v_versao_era_atual :=
        v_item.versao_atual_id is not distinct from p_versao_id;

    -- Seguro de Vida foi expressamente mantido fora do A4.
    -- Para esse tipo, a regra anterior continua integralmente ativa.
    if lower(v_item.tipo_documento) = 'seguro-vida'
       and not v_versao_era_atual
    then
        raise exception using
            errcode = '40001',
            message = 'Seguro de Vida permanece fora da revisao historica. Reabra a versao atual antes de salvar.';
    end if;

    select v.*
    into v_versao
    from public.certidao_mensal_versoes v
    where v.id = p_versao_id
      and v.item_id = p_item_id
    for update;

    if not found then
        raise exception using errcode = 'P0002', message = 'Versao documental nao localizada para o item informado.';
    end if;

    if v_versao.numero_versao <> p_numero_versao then
        raise exception using errcode = '40001', message = 'Numero da versao mudou desde a abertura da revisao.';
    end if;

    if lower(v_versao.hash_sha256) <> v_hash_esperado then
        raise exception using errcode = '40001', message = 'SHA-256 da versao mudou desde a abertura da revisao.';
    end if;

    if v_versao.status_resultado <> btrim(p_status_resultado_esperado) then
        raise exception using errcode = '40001', message = 'Status da versao mudou desde a abertura da revisao.';
    end if;

    if v_versao.diagnostico is distinct from p_diagnostico_esperado then
        raise exception using errcode = '40001', message = 'A analise salva foi alterada depois da abertura da revisao. Reabra a comparacao antes de salvar.';
    end if;

    if jsonb_typeof(v_versao.payload) <> 'object' then
        raise exception using errcode = '22023', message = 'O payload historico da versao nao possui estrutura valida para revisao.';
    end if;

    v_diagnostico_payload_anterior := v_versao.payload -> 'diagnostico';

    if v_versao.payload ? 'diagnostico'
       and v_diagnostico_payload_anterior is distinct from p_diagnostico_esperado
    then
        raise exception using
            errcode = '40001',
            message = 'O diagnostico do payload mudou depois da abertura da revisao. Reabra a comparacao antes de salvar.';
    end if;

    select c.*
    into v_competencia
    from public.certidao_mensal_competencias c
    where c.id = v_item.competencia_id;

    if not found then
        raise exception using errcode = 'P0002', message = 'Competencia do item documental nao localizada.';
    end if;

    if v_competencia.competencia <> p_competencia then
        raise exception using errcode = '22023', message = 'A revisao tentou alterar a competencia do documento.';
    end if;

    if lower(v_item.tipo_documento) <> v_tipo_esperado then
        raise exception using errcode = '22023', message = 'A revisao tentou alterar o tipo documental.';
    end if;

    v_tipo_diagnostico_novo := lower(btrim(coalesce(p_diagnostico_novo #>> '{classificacao,tipoDocumento}', '')));

    if v_tipo_diagnostico_novo = '' then
        raise exception using errcode = '22023', message = 'O diagnostico novo nao possui tipo documental canonico.';
    end if;

    if v_tipo_diagnostico_novo <> lower(v_item.tipo_documento) then
        raise exception using errcode = '22023', message = 'O diagnostico novo aponta para outro tipo documental.';
    end if;

    v_payload_novo := jsonb_set(
        v_versao.payload,
        '{diagnostico}',
        p_diagnostico_novo,
        true
    );

    if v_versao.diagnostico = p_diagnostico_novo
       and v_diagnostico_payload_anterior is not distinct from p_diagnostico_novo
    then
        return jsonb_build_object(
            'alterado', false,
            'versaoId', v_versao.id,
            'itemId', v_item.id,
            'numeroVersao', v_versao.numero_versao,
            'hashSha256', lower(v_versao.hash_sha256),
            'statusResultado', v_versao.status_resultado,
            'versaoEraAtual', v_versao_era_atual,
            'motivo', 'ANALISE_JA_ATUALIZADA'
        );
    end if;

    update public.certidao_mensal_versoes
    set
        diagnostico = p_diagnostico_novo,
        payload = v_payload_novo
    where id = v_versao.id
      and item_id = v_item.id;

    if not found then
        raise exception using errcode = '40001', message = 'A versao nao pode ser atualizada com seguranca.';
    end if;

    insert into public.certidao_mensal_auditoria (
        competencia_id,
        item_id,
        versao_id,
        tipo_evento,
        dados,
        usuario_id
    )
    values (
        v_item.competencia_id,
        v_item.id,
        v_versao.id,
        'VERSAO_ANALISE_REVISADA',
        jsonb_build_object(
            'numeroVersao', v_versao.numero_versao,
            'hashSha256', lower(v_versao.hash_sha256),
            'competencia', v_competencia.competencia,
            'tipoDocumento', v_item.tipo_documento,
            'statusResultadoPreservado', v_versao.status_resultado,
            'diagnosticoAnterior', v_versao.diagnostico,
            'diagnosticoPayloadAnterior', v_diagnostico_payload_anterior,
            'diagnosticoNovo', p_diagnostico_novo,
            'payloadIdentidadePreservada', true,
            'versaoEraAtual', v_versao_era_atual,
            'versaoAtualIdPreservada', v_item.versao_atual_id,
            'origem', 'REVISAO_ANALITICA_DOCUMENTO_SALVO'
        ),
        auth.uid()
    )
    returning id into v_auditoria_id;

    return jsonb_build_object(
        'alterado', true,
        'versaoId', v_versao.id,
        'itemId', v_item.id,
        'numeroVersao', v_versao.numero_versao,
        'hashSha256', lower(v_versao.hash_sha256),
        'statusResultado', v_versao.status_resultado,
        'competencia', v_competencia.competencia,
        'tipoDocumento', v_item.tipo_documento,
        'versaoEraAtual', v_versao_era_atual,
        'versaoAtualIdPreservada', v_item.versao_atual_id,
        'auditoriaId', v_auditoria_id
    );
end;
$function$;

-- A sobrecarga-base permanece interna. A chamada publica continua
-- passando obrigatoriamente pela sobrecarga com p_empresa_id.
revoke all
on function public.revisar_certidao_mensal_versao_existente(
    uuid,
    uuid,
    integer,
    text,
    date,
    text,
    text,
    jsonb,
    jsonb
)
from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
