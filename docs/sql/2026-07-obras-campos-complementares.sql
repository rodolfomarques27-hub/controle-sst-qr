-- SafeScan Brasil
-- Microetapa: campos complementares no cadastro mestre de obras
-- Executar no Supabase SQL Editor.

alter table public.obras
add column if not exists cep text;

alter table public.obras
add column if not exists numero_obra text;

alter table public.obras
add column if not exists numero_endereco text;

alter table public.obras
add column if not exists tecnico_seguranca_idealiza text;

comment on column public.obras.cep is 'CEP da obra, usado para preencher localidade e apoiar calendário/feriados.';
comment on column public.obras.numero_obra is 'Número/código interno da obra.';
comment on column public.obras.numero_endereco is 'Número do endereço da obra.';
comment on column public.obras.tecnico_seguranca_idealiza is 'Técnico de Segurança do Trabalho Idealiza responsável pela obra.';
