-- =====================================================================
-- SafeScan Brasil
-- STORAGE-AUDIT-001-A3
--
-- Atualiza o resumo administrativo do Storage de 6 para 10 buckets.
--
-- Escopo:
--   - não altera objetos;
--   - não altera políticas RLS;
--   - não altera buckets;
--   - não altera tabelas;
--   - não altera dados;
--   - preserva SECURITY DEFINER;
--   - preserva o contrato de retorno da RPC;
--   - mantém execução restrita a authenticated e service_role.
--
-- O objetivo desta RPC é medir o consumo físico real do Storage.
-- A listagem individual de arquivos continua submetida às políticas RLS.
-- =====================================================================

create or replace function public.resumo_storage_sst()
returns table (
    bucket_id text,
    total_arquivos bigint,
    tamanho_bytes numeric,
    tamanho_mb numeric,
    mime_types text[]
)
language sql
security definer
set search_path = public, storage
as $function$
    select
        o.bucket_id::text as bucket_id,

        count(*)::bigint as total_arquivos,

        coalesce(
            sum(
                (
                    o.metadata ->> 'size'
                )::numeric
            ),
            0
        )::numeric as tamanho_bytes,

        round(
            coalesce(
                sum(
                    (
                        o.metadata ->> 'size'
                    )::numeric
                ),
                0
            )
            /
            1024
            /
            1024,
            2
        )::numeric as tamanho_mb,

        array_remove(
            array_agg(
                distinct
                o.metadata ->> 'mimetype'
            ),
            null
        )::text[] as mime_types

    from storage.objects o

    where o.bucket_id in (
        'auditorias-campo',
        'certificados-treinamentos',
        'contratos-empresas',
        'documentos-empresas',
        'fotos-colaboradores',
        'logos-empresas',
        'certidao-mensal-documentos',
        'dds-assinados',
        'mapas-obras',
        'assinaturas-email-sst'
    )

    group by
        o.bucket_id

    order by
        o.bucket_id;
$function$;


-- ---------------------------------------------------------------------
-- Permissões
--
-- A função atual já é administrativa e não deve ser exposta ao anon.
-- CREATE OR REPLACE preserva grants existentes, mas os comandos abaixo
-- tornam a intenção explícita e impedem regressão futura de permissões.
-- ---------------------------------------------------------------------

revoke execute
on function public.resumo_storage_sst()
from public, anon;


grant execute
on function public.resumo_storage_sst()
to authenticated, service_role;
