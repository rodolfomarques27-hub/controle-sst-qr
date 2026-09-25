create or replace function public.resumo_storage_sst_tenant(
    p_tenant_id uuid
)
returns table (
    bucket_id text,
    total_arquivos bigint,
    tamanho_bytes numeric,
    tamanho_mb numeric,
    mime_types text[]
)
language plpgsql
security definer
set search_path to pg_catalog, public, storage
as $function$
#variable_conflict use_column
begin
    if
        p_tenant_id is null
        or not coalesce(
            public.usuario_tem_acesso_tenant(
                p_tenant_id
            ),
            false
        )
    then
        raise exception
            'Acesso negado ao resumo de armazenamento deste tenant.'
            using errcode = '42501';
    end if;

    return query
    with
    empresas_tenant as (
        select
            e.id,
            e.logo_url,
            e.contrato_url
        from public.empresas as e
        where e.tenant_id =
            p_tenant_id
    ),
    colaboradores_tenant as (
        select
            c.id,
            c.empresa_id,
            c.foto_url,
            lower(
                nullif(
                    btrim(
                        c.codigo_funcionario
                    ),
                    ''
                )
            ) as codigo_funcionario
        from public.colaboradores as c
        join empresas_tenant as e
            on e.id =
                c.empresa_id
    ),
    obras_tenant as (
        select
            o.id
        from public.obras as o
        where o.tenant_id =
            p_tenant_id
    ),
    dds_tenant as (
        select
            d.id
        from public.dds_registros as d
        join empresas_tenant as e
            on e.id =
                d.empresa_id
    ),
    referencias_brutas(
        bucket_id,
        valor
    ) as (
        select 'logos-empresas', e.logo_url
        from empresas_tenant as e

        union all
        select 'contratos-empresas', e.contrato_url
        from empresas_tenant as e

        union all
        select 'documentos-empresas', d.arquivo_url
        from public.documentos_empresas as d
        join empresas_tenant as e
            on e.id = d.empresa_id

        union all
        select 'documentos-empresas', d.url_do_arquivo
        from public.documentos_empresas as d
        join empresas_tenant as e
            on e.id = d.empresa_id

        union all
        select 'fotos-colaboradores', c.foto_url
        from colaboradores_tenant as c

        union all
        select 'certificados-treinamentos', c.arquivo_url
        from public.certificados as c
        join colaboradores_tenant as ct
            on ct.id = c.colaborador_id

        union all
        select 'certificados-treinamentos', c.url_do_arquivo
        from public.certificados as c
        join colaboradores_tenant as ct
            on ct.id = c.colaborador_id

        union all
        select 'certificados-treinamentos', h.arquivo_url
        from public.certificados_historico as h
        join colaboradores_tenant as ct
            on ct.id = h.colaborador_id

        union all
        select 'certificados-treinamentos', h.url_do_arquivo
        from public.certificados_historico as h
        join colaboradores_tenant as ct
            on ct.id = h.colaborador_id

        union all
        select 'certificados-treinamentos', h.arquivo_substituto_url
        from public.certificados_historico as h
        join colaboradores_tenant as ct
            on ct.id = h.colaborador_id

        union all
        select 'certificados-treinamentos', ce.arquivo_url
        from public.certificados_evidencias as ce
        join colaboradores_tenant as ct
            on ct.id = ce.colaborador_id

        union all
        select 'certificados-treinamentos', ce.arquivo_substituto_url
        from public.certificados_evidencias as ce
        join colaboradores_tenant as ct
            on ct.id = ce.colaborador_id

        union all
        select
            coalesce(
                nullif(v.bucket, ''),
                'certificados-treinamentos'
            ),
            coalesce(
                nullif(v.caminho_storage, ''),
                v.arquivo_url
            )
        from public.verificacoes_documentais as v
        left join colaboradores_tenant as ct
            on ct.id = v.colaborador_id
        left join empresas_tenant as et
            on et.id = v.empresa_id
        where
            (
                ct.id is not null
                or et.id is not null
            )
            and coalesce(
                nullif(v.bucket, ''),
                'certificados-treinamentos'
            ) in (
                'certificados-treinamentos',
                'documentos-empresas',
                'contratos-empresas',
                'fotos-colaboradores',
                'auditorias-campo',
                'logos-empresas',
                'certidao-mensal-documentos',
                'dds-assinados',
                'mapas-obras'
            )

        union all
        select 'auditorias-campo', a.foto_antes_url
        from public.auditorias_campo as a
        join empresas_tenant as e
            on e.id = a.empresa_id

        union all
        select 'auditorias-campo', a.foto_depois_url
        from public.auditorias_campo as a
        join empresas_tenant as e
            on e.id = a.empresa_id

        union all
        select 'auditorias-campo', d.foto_antes_url
        from public.auditoria_campo_desvios as d
        join empresas_tenant as e
            on e.id = d.empresa_id

        union all
        select 'auditorias-campo', d.foto_depois_url
        from public.auditoria_campo_desvios as d
        join empresas_tenant as e
            on e.id = d.empresa_id

        union all
        select
            coalesce(
                nullif(v.bucket_id, ''),
                'certidao-mensal-documentos'
            ),
            v.caminho_storage
        from public.certidao_mensal_versoes as v
        join public.certidao_mensal_itens as i
            on i.id = v.item_id
        join public.certidao_mensal_competencias as c
            on c.id = i.competencia_id
        join empresas_tenant as e
            on e.id = c.empresa_id

        union all
        select
            coalesce(
                nullif(ev.bucket_id, ''),
                'certidao-mensal-documentos'
            ),
            ev.caminho_storage
        from public.certidao_mensal_evidencias as ev
        join public.certidao_mensal_itens as i
            on i.id = ev.item_id
        join public.certidao_mensal_competencias as c
            on c.id = i.competencia_id
        join empresas_tenant as e
            on e.id = c.empresa_id

        union all
        select
            coalesce(
                nullif(en.bucket, ''),
                'certidao-mensal-documentos'
            ),
            en.caminho_storage
        from public.certidao_mensal_envio_itens as en
        join public.certidao_mensal_competencias as c
            on c.id = en.competencia_id
        join empresas_tenant as e
            on e.id = c.empresa_id

        union all
        select
            coalesce(
                nullif(dd.bucket_id, ''),
                'dds-assinados'
            ),
            dd.caminho_storage
        from public.dds_documentos as dd
        join public.dds_registros as dr
            on dr.id = dd.registro_id
        join empresas_tenant as e
            on e.id = dr.empresa_id

        union all
        select 'mapas-obras', m.imagem_path
        from public.mapas_obras as m
        join empresas_tenant as e
            on e.id = m.empresa_id

        union all
        select 'mapas-obras', p.planta_detalhada_path
        from public.mapas_pontos as p
        join empresas_tenant as e
            on e.id = p.empresa_id

        union all
        select tr.pdf_bucket, tr.pdf_caminho
        from public.treinamentos_revisoes as tr
        join empresas_tenant as e
            on e.id = tr.empresa_id
        where tr.pdf_bucket in (
            'certificados-treinamentos',
            'documentos-empresas',
            'contratos-empresas',
            'fotos-colaboradores',
            'auditorias-campo',
            'logos-empresas',
            'certidao-mensal-documentos',
            'dds-assinados',
            'mapas-obras'
        )

        union all
        select 'certificados-treinamentos', tre.arquivo_url
        from public.treinamentos_revisao_evidencias as tre
        join public.treinamentos_revisoes as tr
            on tr.id = tre.revisao_id
        join empresas_tenant as e
            on e.id = tr.empresa_id
    ),
    referencias as (
        select distinct
            rb.bucket_id,
            trim(
                leading '/'
                from
                    case
                        when rb.valor ~* '^https?://'
                        then regexp_replace(
                            split_part(
                                split_part(
                                    rb.valor,
                                    '?',
                                    1
                                ),
                                '#',
                                1
                            ),
                            '^.*?/storage/v1/object/(public|sign|authenticated)/'
                                || rb.bucket_id
                                || '/',
                            ''
                        )
                        else split_part(
                            split_part(
                                rb.valor,
                                '?',
                                1
                            ),
                            '#',
                            1
                        )
                    end
            ) as name
        from referencias_brutas as rb
        where nullif(
            btrim(
                coalesce(
                    rb.valor,
                    ''
                )
            ),
            ''
        ) is not null
    ),
    objetos_referenciados as (
        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata
        from storage.objects as o
        join referencias as r
            on r.bucket_id = o.bucket_id
            and r.name = o.name
        where
            o.archived_at is null
            and coalesce(
                o.is_delete_marker,
                false
            ) = false
    ),
    objetos_por_estrutura as (
        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata
        from storage.objects as o
        where
            o.archived_at is null
            and coalesce(
                o.is_delete_marker,
                false
            ) = false
            and (
                (
                    o.bucket_id in (
                        'documentos-empresas',
                        'contratos-empresas',
                        'certidao-mensal-documentos'
                    )
                    and exists (
                        select 1
                        from empresas_tenant as e
                        where e.id::text =
                            split_part(
                                o.name,
                                '/',
                                1
                            )
                    )
                )
                or (
                    o.bucket_id =
                        'logos-empresas'
                    and (
                        split_part(
                            o.name,
                            '/',
                            1
                        ) =
                            p_tenant_id::text
                        or exists (
                            select 1
                            from empresas_tenant as e
                            where e.id::text =
                                split_part(
                                    o.name,
                                    '/',
                                    1
                                )
                        )
                    )
                )
                or (
                    o.bucket_id =
                        'fotos-colaboradores'
                    and exists (
                        select 1
                        from colaboradores_tenant as c
                        where c.id::text =
                            split_part(
                                o.name,
                                '/',
                                1
                            )
                    )
                )
                or (
                    o.bucket_id =
                        'certificados-treinamentos'
                    and exists (
                        select 1
                        from colaboradores_tenant as c
                        where
                            c.codigo_funcionario is not null
                            and c.codigo_funcionario =
                                lower(
                                    split_part(
                                        o.name,
                                        '/',
                                        1
                                    )
                                )
                    )
                )
                or (
                    o.bucket_id =
                        'dds-assinados'
                    and exists (
                        select 1
                        from dds_tenant as d
                        where d.id::text =
                            split_part(
                                o.name,
                                '/',
                                1
                            )
                    )
                )
                or (
                    o.bucket_id =
                        'mapas-obras'
                    and exists (
                        select 1
                        from obras_tenant as obra
                        where obra.id::text =
                            split_part(
                                o.name,
                                '/',
                                1
                            )
                    )
                )
            )
    ),
    objetos_tenant as (
        select
            id,
            bucket_id,
            name,
            metadata
        from objetos_referenciados

        union

        select
            id,
            bucket_id,
            name,
            metadata
        from objetos_por_estrutura
    ),
    buckets_sst(bucket_id) as (
        values
            ('certificados-treinamentos'),
            ('documentos-empresas'),
            ('contratos-empresas'),
            ('fotos-colaboradores'),
            ('auditorias-campo'),
            ('logos-empresas'),
            ('certidao-mensal-documentos'),
            ('dds-assinados'),
            ('mapas-obras'),
            ('assinaturas-email-sst')
    )
    select
        b.bucket_id::text,
        count(o.id)::bigint as total_arquivos,
        coalesce(
            sum(
                case
                    when coalesce(
                        o.metadata ->> 'size',
                        ''
                    ) ~ '^[0-9]+$'
                    then (
                        o.metadata ->> 'size'
                    )::numeric
                    else 0::numeric
                end
            ),
            0::numeric
        )::numeric as tamanho_bytes,
        round(
            coalesce(
                sum(
                    case
                        when coalesce(
                            o.metadata ->> 'size',
                            ''
                        ) ~ '^[0-9]+$'
                        then (
                            o.metadata ->> 'size'
                        )::numeric
                        else 0::numeric
                    end
                ),
                0::numeric
            )
            / 1024 / 1024,
            2
        )::numeric as tamanho_mb,
        array_remove(
            array_agg(
                distinct
                o.metadata ->> 'mimetype'
            ),
            null
        )::text[] as mime_types
    from buckets_sst as b
    left join objetos_tenant as o
        on o.bucket_id = b.bucket_id
    group by
        b.bucket_id
    order by
        b.bucket_id;
end;
$function$;

revoke all
on function public.resumo_storage_sst_tenant(
    uuid
)
from public;

revoke all
on function public.resumo_storage_sst_tenant(
    uuid
)
from anon;

revoke all
on function public.resumo_storage_sst_tenant(
    uuid
)
from authenticated;

grant execute
on function public.resumo_storage_sst_tenant(
    uuid
)
to authenticated;

comment on function public.resumo_storage_sst_tenant(
    uuid
)
is
    'Retorna somente o uso de Storage atribuível ao tenant autorizado por vínculos de banco ou estrutura de caminho comprovadamente tenant-scoped. Inclui arquivos físicos atribuíveis mesmo quando a referência documental foi substituída; não inclui ativos globais nem objetos sem vínculo seguro e não possui fallback para o total global da plataforma.';
