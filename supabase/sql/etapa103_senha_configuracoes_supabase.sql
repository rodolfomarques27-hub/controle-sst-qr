-- Roteiro 2 - Etapa 103
-- Sincronizar senha da aba Configurações no Supabase
-- Usa a tabela auditoria_sistema_configuracoes criada na Etapa 79.

create table if not exists public.auditoria_sistema_configuracoes (
    chave text primary key,
    valor jsonb not null default '{}'::jsonb,
    atualizado_em timestamptz not null default now(),
    atualizado_por uuid null references auth.users(id) on delete set null
);

alter table public.auditoria_sistema_configuracoes enable row level security;

insert into public.auditoria_sistema_configuracoes (chave, valor)
values (
    'senha_configuracoes_sistema',
    jsonb_build_object(
        'senha', '2026',
        'atualizadoEm', now(),
        'observacao', 'Senha inicial padrão da aba Configurações. Alterável pelo sistema.'
    )
)
on conflict (chave) do nothing;

notify pgrst, 'reload schema';
