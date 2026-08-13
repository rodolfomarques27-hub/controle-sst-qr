begin;

-- ============================================================
-- ASSINATURA PRIVADA DA CERTIDÃO MENSAL DOCUMENTAL
-- Caminho exclusivo:
-- modelos/certidao_mensal_documental/assinatura
-- ============================================================

drop policy if exists
    assinaturas_email_sst_select_certidao_mensal_administradores
on storage.objects;

create policy
    assinaturas_email_sst_select_certidao_mensal_administradores
on storage.objects
for select
to authenticated
using (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/certidao_mensal_documental/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

drop policy if exists
    assinaturas_email_sst_insert_certidao_mensal_administradores
on storage.objects;

create policy
    assinaturas_email_sst_insert_certidao_mensal_administradores
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/certidao_mensal_documental/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

drop policy if exists
    assinaturas_email_sst_update_certidao_mensal_administradores
on storage.objects;

create policy
    assinaturas_email_sst_update_certidao_mensal_administradores
on storage.objects
for update
to authenticated
using (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/certidao_mensal_documental/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
)
with check (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/certidao_mensal_documental/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

drop policy if exists
    assinaturas_email_sst_delete_certidao_mensal_administradores
on storage.objects;

create policy
    assinaturas_email_sst_delete_certidao_mensal_administradores
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'assinaturas-email-sst'
    and name =
        'modelos/certidao_mensal_documental/assinatura'
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

comment on policy
    assinaturas_email_sst_select_certidao_mensal_administradores
on storage.objects
is
    'Permite a leitura administrativa da assinatura privada usada exclusivamente na Certidão Mensal Documental.';

comment on policy
    assinaturas_email_sst_insert_certidao_mensal_administradores
on storage.objects
is
    'Permite o envio administrativo da assinatura privada usada exclusivamente na Certidão Mensal Documental.';

comment on policy
    assinaturas_email_sst_update_certidao_mensal_administradores
on storage.objects
is
    'Permite a substituição administrativa da assinatura privada usada exclusivamente na Certidão Mensal Documental.';

comment on policy
    assinaturas_email_sst_delete_certidao_mensal_administradores
on storage.objects
is
    'Permite a remoção administrativa da assinatura privada usada exclusivamente na Certidão Mensal Documental.';

commit;