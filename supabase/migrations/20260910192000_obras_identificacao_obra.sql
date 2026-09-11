alter table public.obras
add column if not exists identificacao_obra text;

comment on column public.obras.identificacao_obra is
'Identificação curta ou local operacional da obra para uso em interfaces e relatórios, por exemplo Parte 1 ou Pelotas.';
