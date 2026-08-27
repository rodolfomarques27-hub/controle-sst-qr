-- SafeScan Brasil
-- Documentos empresariais / LTCAT:
-- alinha o limite do bucket com o frontend de 30 MB.
-- Não altera policies nem torna o bucket público.

begin;

do $preflight$
declare
    v_public boolean;
    v_file_size_limit bigint;
    v_allowed_mime_types text[];
begin
    select
        b.public,
        b.file_size_limit,
        b.allowed_mime_types
    into
        v_public,
        v_file_size_limit,
        v_allowed_mime_types
    from storage.buckets b
    where b.id = 'documentos-empresas';

    if not found then
        raise exception
            'Bucket storage documentos-empresas não localizado.';
    end if;

    if v_public is distinct from false then
        raise exception
            'Bucket documentos-empresas deve permanecer privado.';
    end if;

    if v_allowed_mime_types is distinct from
        array['application/pdf']::text[]
    then
        raise exception
            'Bucket documentos-empresas possui MIME divergente do contrato PDF-only.';
    end if;

    if v_file_size_limit not in (
        15728640,
        31457280
    ) then
        raise exception
            'Bucket documentos-empresas possui limite inesperado: % bytes.',
            v_file_size_limit;
    end if;
end;
$preflight$;

update storage.buckets
set
    public = false,
    file_size_limit = 31457280,
    allowed_mime_types =
        array['application/pdf']::text[]
where id = 'documentos-empresas';

do $postflight$
declare
    v_public boolean;
    v_file_size_limit bigint;
    v_allowed_mime_types text[];
begin
    select
        b.public,
        b.file_size_limit,
        b.allowed_mime_types
    into
        v_public,
        v_file_size_limit,
        v_allowed_mime_types
    from storage.buckets b
    where b.id = 'documentos-empresas';

    if not found then
        raise exception
            'Bucket documentos-empresas desapareceu durante a migration.';
    end if;

    if v_public is distinct from false then
        raise exception
            'Postflight: documentos-empresas deixou de ser privado.';
    end if;

    if v_file_size_limit is distinct from 31457280 then
        raise exception
            'Postflight: limite do bucket não ficou em 30 MB.';
    end if;

    if v_allowed_mime_types is distinct from
        array['application/pdf']::text[]
    then
        raise exception
            'Postflight: MIME permitido deixou de ser somente application/pdf.';
    end if;
end;
$postflight$;

commit;