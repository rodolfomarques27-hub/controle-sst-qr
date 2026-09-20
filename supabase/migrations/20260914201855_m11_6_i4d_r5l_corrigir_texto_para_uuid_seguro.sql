create or replace function public.texto_para_uuid_seguro(p_texto text)
returns uuid
language plpgsql
immutable
set search_path to 'public', 'auth', 'extensions'
as $function$
begin
  if p_texto is null or trim(p_texto) = '' then
    return null;
  end if;

  if p_texto ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return p_texto::uuid;
  end if;

  return null;
end;
$function$;
