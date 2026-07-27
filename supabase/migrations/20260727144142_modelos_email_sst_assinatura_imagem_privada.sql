begin;

-- ============================================================
-- BUCKET PRIVADO DAS ASSINATURAS DOS MODELOS DE E-MAIL SST
-- ============================================================

insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'assinaturas-email-sst',
    'assinaturas-email-sst',
    false,
    2097152,
    array[
        'image/png',
        'image/jpeg'
    ]::text[]
)
on conflict (id)
do update
set
    name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- LEITURA ADMINISTRATIVA
-- ============================================================

drop policy if exists
    assinaturas_email_sst_select_administradores
on storage.objects;

create policy
    assinaturas_email_sst_select_administradores
on storage.objects
for select
to authenticated
using (
    bucket_id = 'assinaturas-email-sst'
    and name = any (
        array[
            'modelos/alerta_documento_colaborador/assinatura',
            'modelos/alerta_documento_empresa/assinatura',
            'modelos/alerta_documentos_lote/assinatura',
            'modelos/alerta_treinamentos/assinatura',
            'modelos/alerta_auditoria/assinatura'
        ]::text[]
    )
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

-- ============================================================
-- ENVIO ADMINISTRATIVO
-- ============================================================

drop policy if exists
    assinaturas_email_sst_insert_administradores
on storage.objects;

create policy
    assinaturas_email_sst_insert_administradores
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'assinaturas-email-sst'
    and name = any (
        array[
            'modelos/alerta_documento_colaborador/assinatura',
            'modelos/alerta_documento_empresa/assinatura',
            'modelos/alerta_documentos_lote/assinatura',
            'modelos/alerta_treinamentos/assinatura',
            'modelos/alerta_auditoria/assinatura'
        ]::text[]
    )
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

-- ============================================================
-- SUBSTITUIÇÃO ADMINISTRATIVA
-- ============================================================

drop policy if exists
    assinaturas_email_sst_update_administradores
on storage.objects;

create policy
    assinaturas_email_sst_update_administradores
on storage.objects
for update
to authenticated
using (
    bucket_id = 'assinaturas-email-sst'
    and name = any (
        array[
            'modelos/alerta_documento_colaborador/assinatura',
            'modelos/alerta_documento_empresa/assinatura',
            'modelos/alerta_documentos_lote/assinatura',
            'modelos/alerta_treinamentos/assinatura',
            'modelos/alerta_auditoria/assinatura'
        ]::text[]
    )
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
)
with check (
    bucket_id = 'assinaturas-email-sst'
    and name = any (
        array[
            'modelos/alerta_documento_colaborador/assinatura',
            'modelos/alerta_documento_empresa/assinatura',
            'modelos/alerta_documentos_lote/assinatura',
            'modelos/alerta_treinamentos/assinatura',
            'modelos/alerta_auditoria/assinatura'
        ]::text[]
    )
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

-- ============================================================
-- REMOÇÃO ADMINISTRATIVA
-- ============================================================

drop policy if exists
    assinaturas_email_sst_delete_administradores
on storage.objects;

create policy
    assinaturas_email_sst_delete_administradores
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'assinaturas-email-sst'
    and name = any (
        array[
            'modelos/alerta_documento_colaborador/assinatura',
            'modelos/alerta_documento_empresa/assinatura',
            'modelos/alerta_documentos_lote/assinatura',
            'modelos/alerta_treinamentos/assinatura',
            'modelos/alerta_auditoria/assinatura'
        ]::text[]
    )
    and (
        select
            public.usuario_pode_gerenciar_modelos_email_sst()
    )
);

commit;
