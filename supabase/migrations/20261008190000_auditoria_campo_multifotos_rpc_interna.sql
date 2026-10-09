begin;

do $$
begin
  if to_regclass('public.auditoria_campo_fotos') is null then
    raise exception 'Tabela de fotos multiplas ausente.';
  end if;

  if to_regprocedure(
    'public.usuario_pode_acessar_auditoria_campo_empresa(uuid)'
  ) is null then
    raise exception 'Controle de acesso da auditoria ausente.';
  end if;

  if to_regclass('storage.objects') is null then
    raise exception 'Catalogo Storage indisponivel.';
  end if;
end;
$$;

create function public.salvar_auditoria_campo_interna_multifotos(
  p_dados jsonb,
  p_fotos jsonb,
  p_desvio jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path to pg_catalog, public, auth
as $function$
declare
  v_empresa_id uuid;
  v_empresa_texto text;
  v_auditoria public.auditorias_campo%rowtype;
  v_dados jsonb;
  v_desvio jsonb;
  v_fotos jsonb;
  v_foto jsonb;
  v_fase text;
  v_caminho text;
  v_mime text;
  v_nome text;
  v_antes integer := 0;
  v_depois integer := 0;
  v_ordem integer;
  v_prefixo text;
begin
  if auth.uid() is null then
    raise exception using
      errcode = '42501',
      message = 'Autenticacao obrigatoria.';
  end if;

  if jsonb_typeof(p_dados) is distinct from 'object' then
    raise exception 'Payload de auditoria invalido.';
  end if;

  v_fotos := coalesce(p_fotos, '[]'::jsonb);

  if jsonb_typeof(v_fotos) <> 'array' then
    raise exception 'Lista de fotos invalida.';
  end if;

  if jsonb_array_length(v_fotos) < 1
     or jsonb_array_length(v_fotos) > 16 then
    raise exception 'Quantidade de fotos fora do limite.';
  end if;

  v_empresa_texto := nullif(trim(p_dados ->> 'empresa_id'), '');

  if v_empresa_texto is null
     or v_empresa_texto !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    raise exception 'Empresa da auditoria invalida.';
  end if;

  v_empresa_id := v_empresa_texto::uuid;

  if public.usuario_pode_acessar_auditoria_campo_empresa(
    v_empresa_id
  ) is distinct from true then
    raise exception using
      errcode = '42501',
      message = 'Empresa nao autorizada para auditoria.';
  end if;

  v_dados := (
    p_dados - 'id' - 'created_at' - 'criado_em'
      - 'numero_auditoria' - 'ano_auditoria' - 'sequencial_anual'
  ) || jsonb_build_object(
    'id', gen_random_uuid(),
    'created_at', now(),
    'criado_em', now(),
    'checklist', coalesce(p_dados -> 'checklist', '[]'::jsonb),
    'checklist_dinamico',
      coalesce(p_dados -> 'checklist_dinamico', '[]'::jsonb),
    'pontuacao', coalesce(nullif(p_dados ->> 'pontuacao', '')::numeric, 0),
    'tem_desvio_grave',
      coalesce(nullif(p_dados ->> 'tem_desvio_grave', '')::boolean, false),
    'total_desvios',
      coalesce(nullif(p_dados ->> 'total_desvios', '')::integer, 0),
    'status_desvio',
      coalesce(nullif(p_dados ->> 'status_desvio', ''), 'Sem desvio'),
    'origem',
      coalesce(nullif(p_dados ->> 'origem', ''), 'Auditoria interna'),
    'notificacao',
      coalesce(p_dados -> 'notificacao', '{}'::jsonb),
    'status_auditoria',
      coalesce(nullif(p_dados ->> 'status_auditoria', ''), 'Aberta')
  );

  insert into public.auditorias_campo
  select (
    jsonb_populate_record(
      null::public.auditorias_campo,
      v_dados
    )
  ).*
  returning * into v_auditoria;

  if p_desvio is not null then
    if jsonb_typeof(p_desvio) <> 'object' then
      raise exception 'Payload de desvio invalido.';
    end if;

    v_desvio := (
      p_desvio - 'id' - 'auditoria_id'
               - 'empresa_id' - 'created_at'
    ) || jsonb_build_object(
      'id', gen_random_uuid(),
      'auditoria_id', v_auditoria.id,
      'empresa_id', v_empresa_id,
      'status', coalesce(nullif(trim(p_desvio ->> 'status'), ''), 'Aberto'),
      'created_at', now()
    );

    insert into public.auditoria_campo_desvios
    select (
      jsonb_populate_record(
        null::public.auditoria_campo_desvios,
        v_desvio
      )
    ).*;
  end if;

  v_prefixo :=
    v_empresa_id::text || '/auditorias-internas/';

  for v_foto in
    select value from jsonb_array_elements(v_fotos)
  loop
    if jsonb_typeof(v_foto) <> 'object' then
      raise exception 'Registro de foto invalido.';
    end if;

    v_fase := v_foto ->> 'fase';
    v_caminho := trim(coalesce(v_foto ->> 'caminho', ''));
    v_mime := lower(trim(coalesce(v_foto ->> 'mimeType', '')));
    v_nome := left(coalesce(v_foto ->> 'nome', ''), 255);

    if v_fase not in ('antes', 'depois')
       or v_fase is null then
      raise exception 'Fase fotografica invalida.';
    end if;

    if v_mime not in (
      'image/jpeg',
      'image/png',
      'image/webp'
    ) then
      raise exception 'Formato de imagem invalido.';
    end if;

    if length(v_caminho) <= length(v_prefixo)
       or length(v_caminho) > 1024
       or left(v_caminho, length(v_prefixo)) <> v_prefixo
       or position('..' in v_caminho) > 0 then
      raise exception 'Caminho da foto fora da empresa autorizada.';
    end if;

    if not exists (
      select 1
      from storage.objects o
      where o.bucket_id = 'auditorias-campo'
        and o.name = v_caminho
    ) then
      raise exception 'Arquivo fotografico interno nao localizado no Storage.';
    end if;

    if v_fase = 'antes' then
      v_antes := v_antes + 1;
      v_ordem := v_antes;
    else
      v_depois := v_depois + 1;
      v_ordem := v_depois;
    end if;

    if v_ordem > 8 then
      raise exception 'Limite de oito fotos por fase excedido.';
    end if;

    insert into public.auditoria_campo_fotos (
      auditoria_id,
      empresa_id,
      fase,
      ordem,
      bucket_id,
      caminho_storage,
      nome_original,
      mime_type
    )
    values (
      v_auditoria.id,
      v_empresa_id,
      v_fase,
      v_ordem,
      'auditorias-campo',
      v_caminho,
      v_nome,
      v_mime
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'id', v_auditoria.id,
    'numero_auditoria', v_auditoria.numero_auditoria,
    'empresa_id', v_empresa_id,
    'fotos_registradas', v_antes + v_depois
  );
end;
$function$;

revoke all
on function public.salvar_auditoria_campo_interna_multifotos(
  jsonb, jsonb, jsonb
)
from public, anon;

grant execute
on function public.salvar_auditoria_campo_interna_multifotos(
  jsonb, jsonb, jsonb
)
to authenticated;

commit;
