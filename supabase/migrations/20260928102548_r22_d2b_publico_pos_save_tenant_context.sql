
do $$
declare
  v_base_oid oid;
  v_overload_oid oid;
  v_base_def text;
  v_overload_md5 text;
  v_old_fragment text;
  v_new_fragment text;
  v_count integer;
begin
  select to_regprocedure('public.salvar_auditoria_campo_publica(text,jsonb)')::oid
    into v_base_oid;

  select to_regprocedure('public.salvar_auditoria_campo_publica(text,text,jsonb)')::oid
    into v_overload_oid;

  if v_base_oid is null or v_overload_oid is null then
    raise exception 'SAFE STOP: overloads esperadas da RPC não foram localizadas.';
  end if;

  v_base_def := pg_get_functiondef(v_base_oid);
  v_overload_md5 := md5(pg_get_functiondef(v_overload_oid));

  if md5(v_base_def) is distinct from '034c1326f03d2495ee5a80981220c090' then
    raise exception 'SAFE STOP: definição base da RPC divergiu; md5 atual=%', md5(v_base_def);
  end if;

  if v_overload_md5 is distinct from '5bf461991c26b751e13ef9ae3645b020' then
    raise exception 'SAFE STOP: overload com senha divergiu; md5 atual=%', v_overload_md5;
  end if;

  select count(*)
    into v_count
  from public.auditorias_campo a
  where a.numero_auditoria='AUD-2026-0005'
    and a.origem='Link direto / auditoria-campo'
    and a.empresa_id='21332ffa-414c-4f9b-91a3-b091daa8e9c4'::uuid
    and a.empresa_nome='RIBEIRO AQUINO'
    and a.empresa_responsavel='RIBEIRO AQUINO'
    and (
      select count(*)
      from public.auditoria_campo_desvios d
      where d.auditoria_id=a.id
        and d.empresa_id is distinct from a.empresa_id
    ) = 0;

  if v_count <> 1 then
    raise exception 'SAFE STOP: AUD-2026-0005 não permanece GREEN.';
  end if;

  v_old_fragment :=
    E'''empresa_id'', v_empresa_id_efetiva,\n    ''token_validado_no_supabase'', true';

  v_new_fragment :=
    E'''empresa_id'', v_empresa_id_efetiva,\n    ''tenant_id'', v_token_tenant_id,\n    ''token_validado_no_supabase'', true';

  if (
    length(v_base_def) - length(replace(v_base_def, v_old_fragment, ''))
  ) / nullif(length(v_old_fragment), 0) <> 1 then
    raise exception 'SAFE STOP: fragmento de retorno esperado não aparece exatamente uma vez.';
  end if;

  v_base_def := replace(v_base_def, v_old_fragment, v_new_fragment);

  execute v_base_def;

  if md5(pg_get_functiondef(v_overload_oid)) is distinct from '5bf461991c26b751e13ef9ae3645b020' then
    raise exception 'SAFE STOP: overload com senha foi alterada inesperadamente.';
  end if;
end
$$;
