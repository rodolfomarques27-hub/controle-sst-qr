
do $$
declare
  v_base_md5 text;
  v_overload_md5 text;
  v_count integer;
  v_updated integer;
begin
  select md5(pg_get_functiondef(to_regprocedure('public.salvar_auditoria_campo_publica(text,jsonb)')))
    into v_base_md5;

  select md5(pg_get_functiondef(to_regprocedure('public.salvar_auditoria_campo_publica(text,text,jsonb)')))
    into v_overload_md5;

  if v_base_md5 is distinct from '4b5856d6e004b02133232ccc87ec718f' then
    raise exception 'SAFE STOP: definição base da RPC divergiu; md5 atual=%', v_base_md5;
  end if;

  if v_overload_md5 is distinct from '5bf461991c26b751e13ef9ae3645b020' then
    raise exception 'SAFE STOP: overload com senha divergiu; md5 atual=%', v_overload_md5;
  end if;

  select count(*)
    into v_count
  from public.auditorias_campo a
  join public.auditoria_campo_desvios d
    on d.auditoria_id = a.id
  where a.numero_auditoria = 'AUD-2026-0001'
    and d.empresa_id = 'cde8d158-26ae-4d57-a39e-68c839e8382b'::uuid
    and md5(((to_jsonb(d) - 'empresa_id')::text)) = '9c78b6be4ae3635e0f9dcbf189bd2900';

  if v_count <> 1 then
    raise exception 'SAFE STOP: desvio de AUD-2026-0001 divergente; esperado=1 atual=%', v_count;
  end if;

  select count(*)
    into v_count
  from public.auditorias_campo a
  join public.auditoria_campo_desvios d
    on d.auditoria_id = a.id
  where a.numero_auditoria = 'AUD-2026-0002'
    and d.empresa_id = 'cde8d158-26ae-4d57-a39e-68c839e8382b'::uuid
    and md5(((to_jsonb(d) - 'empresa_id')::text)) = '52d4d4ddfcc689fbed30804c88401c8b';

  if v_count <> 1 then
    raise exception 'SAFE STOP: desvio de AUD-2026-0002 divergente; esperado=1 atual=%', v_count;
  end if;

  if not exists (
    select 1
    from public.empresas e
    where e.id = '21332ffa-414c-4f9b-91a3-b091daa8e9c4'::uuid
      and e.nome = 'RIBEIRO AQUINO'
      and e.tenant_id = '78e03188-cb88-40ee-95df-82cfbc2022ef'::uuid
  ) then
    raise exception 'SAFE STOP: empresa RIBEIRO AQUINO alvo divergente.';
  end if;

  update public.auditoria_campo_desvios d
     set empresa_id = '21332ffa-414c-4f9b-91a3-b091daa8e9c4'::uuid
    from public.auditorias_campo a
   where d.auditoria_id = a.id
     and (
       (
         a.numero_auditoria = 'AUD-2026-0001'
         and d.empresa_id = 'cde8d158-26ae-4d57-a39e-68c839e8382b'::uuid
         and md5(((to_jsonb(d) - 'empresa_id')::text)) = '9c78b6be4ae3635e0f9dcbf189bd2900'
       )
       or
       (
         a.numero_auditoria = 'AUD-2026-0002'
         and d.empresa_id = 'cde8d158-26ae-4d57-a39e-68c839e8382b'::uuid
         and md5(((to_jsonb(d) - 'empresa_id')::text)) = '52d4d4ddfcc689fbed30804c88401c8b'
       )
     );

  get diagnostics v_updated = row_count;

  if v_updated <> 2 then
    raise exception 'SAFE STOP: correção dos desvios divergente; esperado=2 atual=%', v_updated;
  end if;
end
$$;

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
  v_empresa_id_solicitada_text text;
  v_empresa_id_solicitada uuid;
  v_empresa_nome_solicitada text;
  v_empresa_nome_token text;
  v_token_tenant_id uuid;
  v_qr_tenant_id uuid;
  v_empresa_solicitada_tenant_id uuid;
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

  select e.nome, e.tenant_id
    into v_empresa_nome_token, v_token_tenant_id
  from public.empresas e
  where e.id = v_token_registro.empresa_id
  limit 1;

  if not found or v_token_tenant_id is null then
    raise exception
      using
        errcode = '42501',
        message = 'Empresa proprietária do token público não está vinculada a um tenant válido.';
  end if;

  v_empresa_id_efetiva := v_token_registro.empresa_id;
  v_empresa_nome_efetiva := v_empresa_nome_token;

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
  else
    v_empresa_id_solicitada_text := nullif(
      trim(coalesce(p_dados ->> 'empresa_id', '')),
      ''
    );

    v_empresa_nome_solicitada := coalesce(
      nullif(trim(coalesce(p_dados ->> 'empresa_nome', '')), ''),
      nullif(trim(coalesce(p_dados ->> 'empresa_responsavel', '')), '')
    );

    if v_empresa_id_solicitada_text is not null then
      if v_empresa_id_solicitada_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception
          using
            errcode = '42501',
            message = 'Empresa selecionada inválida para o token público.';
      end if;

      v_empresa_id_solicitada := v_empresa_id_solicitada_text::uuid;

      select e.id, e.nome, e.tenant_id
        into
          v_empresa_id_efetiva,
          v_empresa_nome_efetiva,
          v_empresa_solicitada_tenant_id
      from public.empresas e
      where e.id = v_empresa_id_solicitada
      limit 1;

      if not found then
        raise exception
          using
            errcode = '42501',
            message = 'Empresa selecionada não cadastrada para a auditoria pública.';
      end if;

      if v_empresa_solicitada_tenant_id is null
         or v_empresa_solicitada_tenant_id is distinct from v_token_tenant_id then
        raise exception
          using
            errcode = '42501',
            message = 'Empresa selecionada não pertence ao tenant autorizado pelo token público.';
      end if;
    else
      v_empresa_id_efetiva := v_token_registro.empresa_id;
      v_empresa_nome_efetiva := v_empresa_nome_token;

      if v_empresa_nome_solicitada is not null
         and lower(trim(v_empresa_nome_solicitada)) is distinct from lower(trim(v_empresa_nome_token)) then
        raise exception
          using
            errcode = '42501',
            message = 'Selecione uma empresa cadastrada pertencente ao tenant autorizado antes de salvar a auditoria.';
      end if;
    end if;
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
    v_empresa_nome_efetiva,
    v_empresa_nome_efetiva,
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
