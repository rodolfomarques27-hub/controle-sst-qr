-- SafeScan Brasil
-- Microetapa: CEP no cadastro mestre de obras
-- Executar no Supabase SQL Editor.

alter table public.obras
add column if not exists cep text;

comment on column public.obras.cep is 'CEP da obra, usado para preencher localidade e apoiar calendário/feriados.';
