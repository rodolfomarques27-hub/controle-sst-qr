-- M11.7-R186C-3B
-- QR especifico: resolve a empresa pelo QR ativo no servidor e valida token/tenant.
-- Link publico geral sem codigo de QR: preserva o fallback historico da empresa do token.

create or replace function public.salvar_auditoria_campo_publica(
  p_token text,
  p_dados jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_token text;
  v_token_registro public.auditoria_tokens_publicos%rowtype;
  v_auditoria_id uuid := gen_random_uuid();
  v_ano integer := extract(year from now())::integer;
  v_sequencial integer;
  v_numero_auditoria text;
  v_total_desvios integer := 0;
  v_prazo date;
  v_pontuacao numeric := 0;
  v_tem_desvio_grave boolean := false;
  v_codigo_qr text;
  v_empresa_id_efetiva uuid;
  v_empresa_nome_efetiva text;
  v_token_tenant_id uuid;
  v_qr_tenant_id uuid;
  v_notificacao jsonb;
begin
  v_token := nullif(trim(coalesce(p_token, '')), '');

  if v_token is null then
    raise exception 'Token da auditoria não informado.';
  end if;

  if p_dados is null or jsonb_typeof(p_dados) <> 'object' then
    raise exception 'Dados da auditoria inválidos.';
  end if;

  select *
    into v_token_registro
  from public.auditoria_tokens_publicos
  where token = v_token
    and ativo = true
    and (data_expiracao is null or data_expiracao > now())
  limit 1;

  if not found then
    raise exception 'Token da auditoria inválido, inativo ou expirado.';
  end if;

  v_empresa_id_efetiva := v_token_registro.empresa_id;
  v_codigo_qr := nullif(
    trim(coalesce(p_dados #>> '{notificacao,qrCodeCampo,codigo}', '')),
    ''
  );
  v_notificacao := coalesce(p_dados -> 'notificacao', '{}'::jsonb);

  if v_codigo_qr is not null then
    select
      q.empresa_id,
      empresa_qr.nome,
      empresa_token.tenant_id,
      empresa_qr.tenant_id
    into
      v_empresa_id_efetiva,
      v_empresa_nome_efetiva,
      v_token_tenant_id,
      v_qr_tenant_id
    from public.auditoria_campo_qrcodes q
    join public.empresas empresa_qr
      on empresa_qr.id = q.empresa_id
    join public.empresas empresa_token
      on empresa_token.id = v_token_registro.empresa_id
    where q.codigo = v_codigo_qr
      and q.ativo = true
      and q.token_publico = v_token
    limit 1;

    if not found then
      raise exception
        using
          errcode = '42501',
          message = 'QR Code de campo inválido, inativo ou incompatível com o token público.';
    end if;

    if v_token_tenant_id is null
       or v_qr_tenant_id is null
       or v_qr_tenant_id is distinct from v_token_tenant_id then
      raise exception
        using
          errcode = '42501',
          message = 'QR Code de campo não pertence ao tenant autorizado pelo token público.';
    end if;

    v_notificacao := jsonb_set(
      v_notificacao,
      '{qrCodeCampo,codigo}',
      to_jsonb(v_codigo_qr),
      true
    );

    v_notificacao := jsonb_set(
      v_notificacao,
      '{qrCodeCampo,empresaResponsavel}',
      to_jsonb(v_empresa_nome_efetiva),
      true
    );
  end if;

  perform pg_advisory_xact_lock(hashtext('auditorias_campo_' || v_ano::text));

  select coalesce(max(sequencial_anual), 0) + 1
    into v_sequencial
  from public.auditorias_campo
  where ano_auditoria = v_ano;

  v_numero_auditoria :=
    'AUD-' || v_ano || '-' || lpad(v_sequencial::text, 4, '0');

  if coalesce(p_dados ->> 'total_desvios', '') ~ '^[0-9]+$' then
    v_total_desvios := (p_dados ->> 'total_desvios')::integer;
  else
    v_total_desvios := 0;
  end if;

  if coalesce(p_dados ->> 'pontuacao', '') ~ '^-?[0-9]+(\.[0-9]+)?$' then
    v_pontuacao := (p_dados ->> 'pontuacao')::numeric;
  else
    v_pontuacao := 0;
  end if;

  if lower(coalesce(p_dados ->> 'tem_desvio_grave', 'false'))
     in ('true', '1', 'sim', 'yes') then
    v_tem_desvio_grave := true;
  else
    v_tem_desvio_grave := false;
  end if;

  if nullif(p_dados ->> 'prazo_adequacao', '') is not null then
    begin
      v_prazo := (p_dados ->> 'prazo_adequacao')::date;
    exception when others then
      v_prazo := null;
    end;
  end if;

  insert into public.auditorias_campo (
    id,
    empresa_id,
    token_qr,
    tipo_auditoria,
    titulo,
    area,
    subarea,
    local,
    maquina_equipamento,
    empresa_responsavel,
    empresa_nome,
    auditor_nome,
    grau_risco,
    situacao_encontrada,
    acao_recomendada,
    responsavel_tratativa,
    prazo_adequacao,
    status_auditoria,
    status_desvio,
    foto_antes_url,
    foto_depois_url,
    observacoes_gerais,
    observacao,
    checklist,
    checklist_dinamico,
    pontuacao,
    classificacao,
    tem_desvio_grave,
    categoria_desvio_principal,
    total_desvios,
    origem,
    notificacao,
    numero_auditoria,
    ano_auditoria,
    sequencial_anual,
    created_at
  )
  values (
    v_auditoria_id,
    v_empresa_id_efetiva,
    v_token,
    nullif(p_dados ->> 'tipo_auditoria', ''),
    coalesce(nullif(p_dados ->> 'titulo', ''), 'Auditoria de campo'),
    nullif(p_dados ->> 'area', ''),
    nullif(p_dados ->> 'subarea', ''),
    nullif(p_dados ->> 'local', ''),
    nullif(p_dados ->> 'maquina_equipamento', ''),
    case
      when v_codigo_qr is not null then v_empresa_nome_efetiva
      else nullif(p_dados ->> 'empresa_responsavel', '')
    end,
    case
      when v_codigo_qr is not null then v_empresa_nome_efetiva
      else coalesce(
        nullif(p_dados ->> 'empresa_nome', ''),
        nullif(p_dados ->> 'empresa_responsavel', '')
      )
    end,
    coalesce(nullif(p_dados ->> 'auditor_nome', ''), 'Auditor de campo'),
    nullif(p_dados ->> 'grau_risco', ''),
    coalesce(
      nullif(p_dados ->> 'situacao_encontrada', ''),
      'Situação não informada'
    ),
    nullif(p_dados ->> 'acao_recomendada', ''),
    nullif(p_dados ->> 'responsavel_tratativa', ''),
    v_prazo,
    coalesce(nullif(p_dados ->> 'status_auditoria', ''), 'Aberta'),
    coalesce(nullif(p_dados ->> 'status_desvio', ''), 'Aberto'),
    nullif(p_dados ->> 'foto_antes_url', ''),
    nullif(p_dados ->> 'foto_depois_url', ''),
    nullif(p_dados ->> 'observacoes_gerais', ''),
    nullif(p_dados ->> 'observacao', ''),
    coalesce(p_dados -> 'checklist', '[]'::jsonb),
    coalesce(p_dados -> 'checklist_dinamico', '[]'::jsonb),
    v_pontuacao,
    coalesce(nullif(p_dados ->> 'classificacao', ''), 'Sem avaliação'),
    v_tem_desvio_grave,
    nullif(p_dados ->> 'categoria_desvio_principal', ''),
    v_total_desvios,
    coalesce(
      nullif(p_dados ->> 'origem', ''),
      'Link direto / auditoria-campo'
    ),
    v_notificacao,
    v_numero_auditoria,
    v_ano,
    v_sequencial,
    now()
  );

  if v_total_desvios > 0 then
    insert into public.auditoria_campo_desvios (
      auditoria_id,
      empresa_id,
      categoria,
      descricao,
      gravidade,
      acao_imediata,
      responsavel,
      prazo,
      status,
      foto_antes_url,
      foto_depois_url,
      observacao,
      notificacao,
      observacao_aberto,
      created_at
    )
    values (
      v_auditoria_id,
      v_empresa_id_efetiva,
      coalesce(
        nullif(p_dados ->> 'categoria_desvio_principal', ''),
        'Auditoria de campo'
      ),
      coalesce(
        nullif(p_dados ->> 'situacao_encontrada', ''),
        'Desvio registrado na auditoria de campo'
      ),
      coalesce(nullif(p_dados ->> 'grau_risco', ''), 'Moderada'),
      nullif(p_dados ->> 'acao_recomendada', ''),
      nullif(p_dados ->> 'responsavel_tratativa', ''),
      v_prazo,
      coalesce(nullif(p_dados ->> 'status_desvio', ''), 'Aberto'),
      nullif(p_dados ->> 'foto_antes_url', ''),
      nullif(p_dados ->> 'foto_depois_url', ''),
      nullif(p_dados ->> 'observacao', ''),
      v_notificacao,
      nullif(p_dados ->> 'observacoes_gerais', ''),
      now()
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'id', v_auditoria_id,
    'numero_auditoria', v_numero_auditoria,
    'empresa_id', v_empresa_id_efetiva,
    'token_validado_no_supabase', true
  );
end;
$function$;

comment on function public.salvar_auditoria_campo_publica(text, jsonb) is
'Core privilegiado de auditoria pública. Em QR específico, resolve empresa pelo QR ativo e valida compatibilidade de token/tenant no servidor; em link geral, preserva a empresa do token.';
