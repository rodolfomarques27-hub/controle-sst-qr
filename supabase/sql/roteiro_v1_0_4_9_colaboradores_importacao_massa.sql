-- Roteiro v1.0.4.9
-- Cadastro em massa de colaboradores por planilha
-- Campos complementares de colaborador, matrícula eSocial e contato de emergência

alter table public.colaboradores
add column if not exists cpf text,
add column if not exists matricula_esocial text,
add column if not exists telefone text,
add column if not exists contato_emergencia_nome text,
add column if not exists contato_emergencia_parentesco text,
add column if not exists contato_emergencia_telefone text,
add column if not exists data_admissao date;

comment on column public.colaboradores.cpf is
'CPF do colaborador para controle interno e prevenção de duplicidade. Não exibir em consulta pública por QR Code.';

comment on column public.colaboradores.matricula_esocial is
'Matrícula do trabalhador no eSocial. Substitui a referência visual antiga de matrícula da empresa.';

comment on column public.colaboradores.telefone is
'Telefone principal do colaborador. Campo opcional.';

comment on column public.colaboradores.contato_emergencia_nome is
'Nome da pessoa de contato em caso de emergência. Campo opcional.';

comment on column public.colaboradores.contato_emergencia_parentesco is
'Parentesco ou vínculo do contato de emergência. Campo opcional.';

comment on column public.colaboradores.contato_emergencia_telefone is
'Telefone do contato de emergência. Campo opcional.';

comment on column public.colaboradores.data_admissao is
'Data de admissão do colaborador. Campo opcional para importação por planilha e conferência documental.';

create index if not exists idx_colaboradores_cpf
on public.colaboradores (cpf);

create index if not exists idx_colaboradores_matricula_esocial_empresa
on public.colaboradores (empresa_id, matricula_esocial);
