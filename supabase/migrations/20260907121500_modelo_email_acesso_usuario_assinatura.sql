begin;

-- ============================================================
-- SAFESCAN BRASIL
--
-- MODELO DE E-MAIL:
-- acesso_usuario_criado
--
-- ASSINATURA PRIVADA
--
-- Caminho exclusivo:
--
-- modelos/acesso_usuario_criado/assinatura
--
-- Esta migration adiciona policies próprias para o novo
-- modelo e NÃO altera as policies históricas dos alertas SST
-- nem as policies da Certidão Mensal Documental.
-- ============================================================

-- ============================================================
-- SELECT
-- ============================================================

drop policy if exists
    assinaturas_email_sst_select_acesso_usuario_administradores
on storage.objects;

create policy
    assinaturas_email_sst_select_acesso_usuario_administradores
on storage.objects
for select
to authenticated
using (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/acesso_usuario_criado/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

-- ============================================================
-- INSERT
-- ============================================================

drop policy if exists
    assinaturas_email_sst_insert_acesso_usuario_administradores
on storage.objects;

create policy
    assinaturas_email_sst_insert_acesso_usuario_administradores
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/acesso_usuario_criado/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

-- ============================================================
-- UPDATE
-- ============================================================

drop policy if exists
    assinaturas_email_sst_update_acesso_usuario_administradores
on storage.objects;

create policy
    assinaturas_email_sst_update_acesso_usuario_administradores
on storage.objects
for update
to authenticated
using (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/acesso_usuario_criado/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
)
with check (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/acesso_usuario_criado/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

-- ============================================================
-- DELETE
-- ============================================================

drop policy if exists
    assinaturas_email_sst_delete_acesso_usuario_administradores
on storage.objects;

create policy
    assinaturas_email_sst_delete_acesso_usuario_administradores
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/acesso_usuario_criado/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

-- ============================================================
-- DOCUMENTAÇÃO DAS POLICIES
-- ============================================================

comment on policy
    assinaturas_email_sst_select_acesso_usuario_administradores
on storage.objects
is
    'Permite leitura administrativa da assinatura privada do modelo de e-mail de acesso de usuário.';

comment on policy
    assinaturas_email_sst_insert_acesso_usuario_administradores
on storage.objects
is
    'Permite envio administrativo da assinatura privada do modelo de e-mail de acesso de usuário.';

comment on policy
    assinaturas_email_sst_update_acesso_usuario_administradores
on storage.objects
is
    'Permite substituição administrativa da assinatura privada do modelo de e-mail de acesso de usuário.';

comment on policy
    assinaturas_email_sst_delete_acesso_usuario_administradores
on storage.objects
is
    'Permite remoção administrativa da assinatura privada do modelo de e-mail de acesso de usuário.';

commit;
