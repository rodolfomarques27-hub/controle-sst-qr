create or replace function public.revisar_certidao_mensal_versao_existente(
    p_versao_id uuid,
    p_item_id uuid,
    p_numero_versao integer,
    p_hash_sha256 text,
    p_empresa_id uuid,
    p_competencia date,
    p_tipo_documento text,
    p_status_resultado_esperado text,
    p_diagnostico_esperado jsonb,
    p_diagnostico_novo jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'auth'
as $function$
declare
    v_empresa_id uuid;
begin
    if auth.uid() is null then
        raise exception using
            errcode = '42501',
            message = 'Usuário autenticado obrigatório para revisar documento salvo.';
    end if;

    if auth.uid() = 'c93d1ee4-102e-4e6b-8365-9262687b39e6'::uuid then
        raise exception using
            errcode = '42501',
            message = 'Revisão documental temporariamente bloqueada por contenção operacional.';
    end if;

    if p_empresa_id is null then
        raise exception using
            errcode = '22023',
            message = 'empresa_id obrigatória.';
    end if;

    select c.empresa_id
    into v_empresa_id
    from public.certidao_mensal_itens i
    join public.certidao_mensal_competencias c
      on c.id = i.competencia_id
    where i.id = p_item_id;

    if not found then
        raise exception using
            errcode = 'P0002',
            message = 'Item documental ou competência não localizado.';
    end if;

    if v_empresa_id is distinct from p_empresa_id then
        raise exception using
            errcode = '22023',
            message = 'A revisão tentou aplicar a análise de outra empresa ao documento salvo.';
    end if;

    return public.revisar_certidao_mensal_versao_existente(
        p_versao_id,
        p_item_id,
        p_numero_versao,
        p_hash_sha256,
        p_competencia,
        p_tipo_documento,
        p_status_resultado_esperado,
        p_diagnostico_esperado,
        p_diagnostico_novo
    );
end;
$function$;

comment on function public.revisar_certidao_mensal_versao_existente(uuid, uuid, integer, text, uuid, date, text, text, jsonb, jsonb)
is 'TEMP R14-POOL: bloqueio fail-closed para um usuário específico durante contenção de tempestade de chamadas. Remover após saneamento do emissor e validação controlada.';

notify pgrst, 'reload schema';