-- Roteiro 15G.1.1
-- Permite somente INSERT público de solicitação de recuperação de senha criada pela tela de login.
-- Não libera SELECT público da tabela.

alter table if exists public.solicitacoes_acesso_sistema enable row level security;

grant insert on table public.solicitacoes_acesso_sistema to anon;
grant insert on table public.solicitacoes_acesso_sistema to authenticated;

-- Se a tabela usar coluna id serial/bigserial, o INSERT público precisa usar a sequence.
-- Se não houver sequence, este bloco não altera nada.
do $$
declare
    seq_reg record;
begin
    for seq_reg in
        select sequence_schema, sequence_name
        from information_schema.sequences
        where sequence_schema = 'public'
          and sequence_name ilike '%solicitacoes_acesso_sistema%'
    loop
        execute format(
            'grant usage, select on sequence %I.%I to anon, authenticated',
            seq_reg.sequence_schema,
            seq_reg.sequence_name
        );
    end loop;
end $$;

drop policy if exists "public_insert_recuperacao_senha_login" on public.solicitacoes_acesso_sistema;

create policy "public_insert_recuperacao_senha_login"
on public.solicitacoes_acesso_sistema
for insert
to anon
with check (
    coalesce(status, '') = 'pendente'
    and coalesce(tela, '') = 'login'
    and coalesce(area_solicitada, '') = 'Recuperação de senha'
    and coalesce(perfil_atual, '') = 'Não autenticado'
    and email is not null
    and length(trim(email)) >= 6
    and position('@' in email) > 1
    and nome is not null
    and length(trim(nome)) >= 1
);

notify pgrst, 'reload schema';
