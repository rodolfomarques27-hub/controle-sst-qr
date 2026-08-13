
drop policy if exists sst_storage_select_public_logos_empresas on storage.objects;

create policy sst_storage_select_authenticated_logos_empresas
on storage.objects
for select
to authenticated
using (
    bucket_id = 'logos-empresas'
    and (
        usuario_admin_global()
        or usuario_tem_acesso_storage_path(name)
    )
);
;
