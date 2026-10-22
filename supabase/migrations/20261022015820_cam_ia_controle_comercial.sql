begin;

do $preflight$
begin
  if to_regclass('public.modulos_sistema') is null then
    raise exception
      'CAM-IA-COMERCIAL-01: public.modulos_sistema ausente.';
  end if;

  if to_regclass('public.tenant_modulos') is null then
    raise exception
      'CAM-IA-COMERCIAL-01: public.tenant_modulos ausente.';
  end if;

  if exists (
    select 1
    from public.modulos_sistema
    where chave = 'controle_acesso_ia'
  ) then
    raise exception
      'CAM-IA-COMERCIAL-01: controle_acesso_ia ja existe.';
  end if;
end
$preflight$;

insert into public.modulos_sistema (
  chave,
  nome,
  descricao,
  categoria,
  contratavel,
  obrigatorio,
  ativo,
  ordem,
  metadados
)
values (
  'controle_acesso_ia',
  'Controle de Acesso IA',
  'Controle de acesso assistido por camera, analise visual de EPI, conferencia documental e decisao humana registrada.',
  'seguranca',
  true,
  false,
  true,
  120,
  '{
    "telas": [
      "cameraIa"
    ],
    "natureza": "produto",
    "decisao": "assistida"
  }'::jsonb
);

do $validacao$
begin
  if not exists (
    select 1
    from public.modulos_sistema
    where chave = 'controle_acesso_ia'
      and contratavel = true
      and obrigatorio = false
      and ativo = true
      and ordem = 120
      and metadados @> '{
        "telas": [
          "cameraIa"
        ]
      }'::jsonb
  ) then
    raise exception
      'CAM-IA-COMERCIAL-01: cadastro canonico divergente.';
  end if;

  if exists (
    select 1
    from public.tenant_modulos
    where modulo_chave = 'controle_acesso_ia'
  ) then
    raise exception
      'CAM-IA-COMERCIAL-01: entitlement inesperado.';
  end if;
end
$validacao$;

commit;