-- Roteiro 14 - Pacote 9AD
-- Corrige a leitura das fotos da aba Acessos do App após atualizar a página.
-- A foto já estava salva em usuarios_permissoes_sistema.foto_url e no Storage.
-- Este SQL garante permissão de SELECT no Storage para gerar signed URL/download no front-end.

begin;

alter table public.usuarios_permissoes_sistema
    add column if not exists foto_url text;

-- A policy abaixo permite que usuários autenticados leiam somente fotos do diretório da aba Acessos do App.
-- Necessário para supabase.storage.createSignedUrl() e supabase.storage.download().
drop policy if exists "acessos_app_ler_fotos_usuarios" on storage.objects;

create policy "acessos_app_ler_fotos_usuarios"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'fotos-colaboradores'
    and name like 'acessos-app/%'
);

-- Mantém permissão de upload nesse diretório. Se já existir outra policy mais ampla, esta não prejudica.
drop policy if exists "acessos_app_enviar_fotos_usuarios" on storage.objects;

create policy "acessos_app_enviar_fotos_usuarios"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'fotos-colaboradores'
    and name like 'acessos-app/%'
);

-- Permite substituir arquivo caso futuramente o front use caminho fixo com upsert.
drop policy if exists "acessos_app_atualizar_fotos_usuarios" on storage.objects;

create policy "acessos_app_atualizar_fotos_usuarios"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'fotos-colaboradores'
    and name like 'acessos-app/%'
)
with check (
    bucket_id = 'fotos-colaboradores'
    and name like 'acessos-app/%'
);

notify pgrst, 'reload schema';

commit;
