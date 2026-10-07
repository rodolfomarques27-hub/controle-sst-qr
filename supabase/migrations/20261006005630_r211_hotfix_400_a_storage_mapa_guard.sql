/*
 * R2.11 HOTFIX-400-A
 *
 * Protecao do inventario mapas-obras por obra/tenant.
 *
 * Migration remota ja aplicada:
 * 20261006005630_r211_hotfix_400_a_storage_mapa_guard
 */
/*
 * R2.11-A3.3 — Inventário individual tenant-safe do Storage.
 *
 * Objetivo:
 * - complementar public.resumo_storage_sst_tenant(uuid);
 * - nunca utilizar o inventário administrativo global;
 * - retornar somente objetos comprovadamente atribuíveis ao tenant;
 * - expor metadados suficientes para gerenciamento visual posterior;
 * - não executar qualquer exclusão ou mutation em storage.objects.
 */

create or replace function public.inventario_storage_sst_tenant(
    p_tenant_id uuid,
    p_limite integer default 500,
    p_offset integer default 0,
    p_bucket_id text default null,
    p_caminho text default null
)
returns table (
    tenant_id uuid,
    id uuid,
    bucket_id text,
    caminho text,
    nome text,
    pasta text,
    tamanho_bytes bigint,
    mime_type text,
    criado_em timestamptz,
    atualizado_em timestamptz,
    origem_tipo text,
    tabela_origem text,
    registro_id text,
    empresa_id uuid,
    empresa_nome text,
    colaborador_id uuid,
    colaborador_nome text,
    em_uso boolean,
    sem_vinculo boolean,
    fora_de_pasta boolean,
    atribuicao text,
    candidato_limpeza_fora_pasta boolean,
    total_resultados bigint
)
language plpgsql
security definer
set search_path to pg_catalog, public, storage
as $function$
declare
    v_limite integer :=
        least(
            greatest(
                coalesce(
                    p_limite,
                    500
                ),
                1
            ),
            1000
        );

    v_offset integer :=
        greatest(
            coalesce(
                p_offset,
                0
            ),
            0
        );
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
            'Acesso negado ao inventário de armazenamento deste tenant.'
            using errcode = '42501';
    end if;

    return query
    with

    empresas_tenant as (
        select
            e.id,
            e.nome,
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
            c.nome,
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
            d.id,
            d.empresa_id
        from public.dds_registros as d
        join empresas_tenant as e
            on e.id =
                d.empresa_id
    ),

    /*
     * Ativos globais conhecidos e protegidos.
     *
     * Mesmo que algum caminho seja referenciado acidentalmente
     * por um registro operacional, nunca deve ser devolvido
     * pelo inventário de um tenant.
     */
    ativos_globais(
        bucket_id,
        name
    ) as (
        values
            (
                'logos-empresas',
                'configuracoes/login/fundo-login.jpg'
            ),
            (
                'logos-empresas',
                'configuracoes/login/logo-contratante.png'
            ),
            (
                'logos-empresas',
                'configuracoes/qrcode/logo-qrcode.png'
            ),
            (
                'assinaturas-email-sst',
                'modelos/alerta_documento_colaborador/assinatura'
            ),
            (
                'assinaturas-email-sst',
                'modelos/alerta_documento_empresa/assinatura'
            ),
            (
                'assinaturas-email-sst',
                'modelos/alerta_documentos_lote/assinatura'
            ),
            (
                'assinaturas-email-sst',
                'modelos/alerta_treinamentos/assinatura'
            ),
            (
                'assinaturas-email-sst',
                'modelos/alerta_auditoria/assinatura'
            ),
            (
                'assinaturas-email-sst',
                'modelos/acesso_usuario_criado/assinatura'
            ),
            (
                'assinaturas-email-sst',
                'modelos/certidao_mensal_documental/assinatura'
            )
    ),

    /*
     * Referências documentais pertencentes ao tenant.
     *
     * Qualquer objeto encontrado por este caminho está em uso
     * por um registro do banco do próprio tenant.
     */
    referencias_brutas(
        bucket_id,
        valor,
        origem_tipo,
        tabela_origem,
        registro_id,
        empresa_id,
        colaborador_id
    ) as (
        select
            'logos-empresas',
            e.logo_url,
            'Empresa / Logo',
            'empresas.logo_url',
            e.id::text,
            e.id,
            null::uuid
        from empresas_tenant as e

        union all

        select
            'contratos-empresas',
            e.contrato_url,
            'Empresa / Contrato',
            'empresas.contrato_url',
            e.id::text,
            e.id,
            null::uuid
        from empresas_tenant as e

        union all

        select
            'documentos-empresas',
            d.arquivo_url,
            'Empresa / Documento empresarial',
            'documentos_empresas.arquivo_url',
            d.id::text,
            e.id,
            null::uuid
        from public.documentos_empresas as d
        join empresas_tenant as e
            on e.id =
                d.empresa_id

        union all

        select
            'documentos-empresas',
            d.url_do_arquivo,
            'Empresa / Documento empresarial',
            'documentos_empresas.url_do_arquivo',
            d.id::text,
            e.id,
            null::uuid
        from public.documentos_empresas as d
        join empresas_tenant as e
            on e.id =
                d.empresa_id

        union all

        select
            'fotos-colaboradores',
            c.foto_url,
            'Colaborador / Foto',
            'colaboradores.foto_url',
            c.id::text,
            c.empresa_id,
            c.id
        from colaboradores_tenant as c

        union all

        select
            'certificados-treinamentos',
            c.arquivo_url,
            'Colaborador / Documento e certificado',
            'certificados.arquivo_url',
            c.id::text,
            ct.empresa_id,
            ct.id
        from public.certificados as c
        join colaboradores_tenant as ct
            on ct.id =
                c.colaborador_id

        union all

        select
            'certificados-treinamentos',
            c.url_do_arquivo,
            'Colaborador / Documento e certificado',
            'certificados.url_do_arquivo',
            c.id::text,
            ct.empresa_id,
            ct.id
        from public.certificados as c
        join colaboradores_tenant as ct
            on ct.id =
                c.colaborador_id

        union all

        select
            'certificados-treinamentos',
            h.arquivo_url,
            'Colaborador / Histórico documental',
            'certificados_historico.arquivo_url',
            h.id::text,
            ct.empresa_id,
            ct.id
        from public.certificados_historico as h
        join colaboradores_tenant as ct
            on ct.id =
                h.colaborador_id

        union all

        select
            'certificados-treinamentos',
            h.url_do_arquivo,
            'Colaborador / Histórico documental',
            'certificados_historico.url_do_arquivo',
            h.id::text,
            ct.empresa_id,
            ct.id
        from public.certificados_historico as h
        join colaboradores_tenant as ct
            on ct.id =
                h.colaborador_id

        union all

        select
            'certificados-treinamentos',
            h.arquivo_substituto_url,
            'Colaborador / Histórico documental',
            'certificados_historico.arquivo_substituto_url',
            h.id::text,
            ct.empresa_id,
            ct.id
        from public.certificados_historico as h
        join colaboradores_tenant as ct
            on ct.id =
                h.colaborador_id

        union all

        select
            'certificados-treinamentos',
            ce.arquivo_url,
            'Colaborador / Evidência documental',
            'certificados_evidencias.arquivo_url',
            ce.id::text,
            ct.empresa_id,
            ct.id
        from public.certificados_evidencias as ce
        join colaboradores_tenant as ct
            on ct.id =
                ce.colaborador_id

        union all

        select
            'certificados-treinamentos',
            ce.arquivo_substituto_url,
            'Colaborador / Evidência documental',
            'certificados_evidencias.arquivo_substituto_url',
            ce.id::text,
            ct.empresa_id,
            ct.id
        from public.certificados_evidencias as ce
        join colaboradores_tenant as ct
            on ct.id =
                ce.colaborador_id

        union all

        select
            coalesce(
                nullif(
                    v.bucket,
                    ''
                ),
                'certificados-treinamentos'
            ),
            coalesce(
                nullif(
                    v.caminho_storage,
                    ''
                ),
                v.arquivo_url
            ),
            'Verificação documental',
            'verificacoes_documentais',
            v.id::text,
            coalesce(
                et.id,
                ct.empresa_id
            ),
            ct.id
        from public.verificacoes_documentais as v
        left join colaboradores_tenant as ct
            on ct.id =
                v.colaborador_id
        left join empresas_tenant as et
            on et.id =
                v.empresa_id
        where
            (
                ct.id is not null
                or et.id is not null
            )
            and coalesce(
                nullif(
                    v.bucket,
                    ''
                ),
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

        select
            'auditorias-campo',
            a.foto_antes_url,
            'Auditoria de campo / Evidência',
            'auditorias_campo.foto_antes_url',
            a.id::text,
            e.id,
            null::uuid
        from public.auditorias_campo as a
        join empresas_tenant as e
            on e.id =
                a.empresa_id

        union all

        select
            'auditorias-campo',
            a.foto_depois_url,
            'Auditoria de campo / Evidência',
            'auditorias_campo.foto_depois_url',
            a.id::text,
            e.id,
            null::uuid
        from public.auditorias_campo as a
        join empresas_tenant as e
            on e.id =
                a.empresa_id

        union all

        select
            'auditorias-campo',
            d.foto_antes_url,
            'Auditoria de campo / Desvio',
            'auditoria_campo_desvios.foto_antes_url',
            d.id::text,
            e.id,
            null::uuid
        from public.auditoria_campo_desvios as d
        join empresas_tenant as e
            on e.id =
                d.empresa_id

        union all

        select
            'auditorias-campo',
            d.foto_depois_url,
            'Auditoria de campo / Desvio',
            'auditoria_campo_desvios.foto_depois_url',
            d.id::text,
            e.id,
            null::uuid
        from public.auditoria_campo_desvios as d
        join empresas_tenant as e
            on e.id =
                d.empresa_id

        union all

        select
            coalesce(
                nullif(
                    v.bucket_id,
                    ''
                ),
                'certidao-mensal-documentos'
            ),
            v.caminho_storage,
            'Certidão Mensal / Documento versionado',
            'certidao_mensal_versoes',
            v.id::text,
            e.id,
            null::uuid
        from public.certidao_mensal_versoes as v
        join public.certidao_mensal_itens as i
            on i.id =
                v.item_id
        join public.certidao_mensal_competencias as c
            on c.id =
                i.competencia_id
        join empresas_tenant as e
            on e.id =
                c.empresa_id

        union all

        select
            coalesce(
                nullif(
                    ev.bucket_id,
                    ''
                ),
                'certidao-mensal-documentos'
            ),
            ev.caminho_storage,
            'Certidão Mensal / Evidência',
            'certidao_mensal_evidencias',
            ev.id::text,
            e.id,
            null::uuid
        from public.certidao_mensal_evidencias as ev
        join public.certidao_mensal_itens as i
            on i.id =
                ev.item_id
        join public.certidao_mensal_competencias as c
            on c.id =
                i.competencia_id
        join empresas_tenant as e
            on e.id =
                c.empresa_id

        union all

        select
            coalesce(
                nullif(
                    en.bucket,
                    ''
                ),
                'certidao-mensal-documentos'
            ),
            en.caminho_storage,
            'Certidão Mensal / Item de envio',
            'certidao_mensal_envio_itens',
            en.id::text,
            e.id,
            null::uuid
        from public.certidao_mensal_envio_itens as en
        join public.certidao_mensal_competencias as c
            on c.id =
                en.competencia_id
        join empresas_tenant as e
            on e.id =
                c.empresa_id

        union all

        select
            coalesce(
                nullif(
                    dd.bucket_id,
                    ''
                ),
                'dds-assinados'
            ),
            dd.caminho_storage,
            'DDS / Documento assinado',
            'dds_documentos',
            dd.id::text,
            e.id,
            null::uuid
        from public.dds_documentos as dd
        join public.dds_registros as dr
            on dr.id =
                dd.registro_id
        join empresas_tenant as e
            on e.id =
                dr.empresa_id

        union all

        /*
         * Mapas de obra pertencem ao tenant pela obra.
         * empresa_id nao e requisito para proteger o arquivo.
         */
        select
            'mapas-obras',
            m.imagem_path,
            'Mapa de obra / Planta',
            'mapas_obras.imagem_path',
            m.id::text,
            e.id,
            null::uuid
        from public.mapas_obras as m
        join obras_tenant as obra
            on obra.id =
                m.obra_id
        left join empresas_tenant as e
            on e.id =
                m.empresa_id

        union all

        select
            'mapas-obras',
            m.snapshot #>> '{planta,path}',
            'Mapa de obra / Planta',
            'mapas_obras.snapshot.planta.path',
            m.id::text,
            e.id,
            null::uuid
        from public.mapas_obras as m
        join obras_tenant as obra
            on obra.id =
                m.obra_id
        left join empresas_tenant as e
            on e.id =
                m.empresa_id
        where nullif(
            btrim(
                coalesce(
                    m.snapshot #>> '{planta,path}',
                    ''
                )
            ),
            ''
        ) is not null

        union all

        select
            'mapas-obras',
            ponto_snapshot.item #>> '{plantaDetalhada,path}',
            'Mapa de obra / Planta detalhada',
            'mapas_obras.snapshot.pontos.plantaDetalhada.path',
            coalesce(
                nullif(
                    ponto_snapshot.item ->> 'id',
                    ''
                ),
                m.id::text
            ),
            e.id,
            null::uuid
        from public.mapas_obras as m
        join obras_tenant as obra
            on obra.id =
                m.obra_id
        left join empresas_tenant as e
            on e.id =
                m.empresa_id
        cross join lateral jsonb_array_elements(
            coalesce(
                m.snapshot -> 'pontos',
                '[]'::jsonb
            )
        ) as ponto_snapshot(item)
        where nullif(
            btrim(
                coalesce(
                    ponto_snapshot.item #>> '{plantaDetalhada,path}',
                    ''
                )
            ),
            ''
        ) is not null

        union all

        select
            'mapas-obras',
            p.planta_detalhada_path,
            'Mapa de obra / Planta detalhada',
            'mapas_pontos.planta_detalhada_path',
            p.id::text,
            e.id,
            null::uuid
        from public.mapas_pontos as p
        join public.mapas_obras as m
            on m.id =
                p.mapa_id
        join obras_tenant as obra
            on obra.id =
                m.obra_id
        left join empresas_tenant as e
            on e.id =
                coalesce(
                    p.empresa_id,
                    m.empresa_id
                )

        union all

        select
            tr.pdf_bucket,
            tr.pdf_caminho,
            'Treinamento / Revisão',
            'treinamentos_revisoes',
            tr.id::text,
            e.id,
            null::uuid
        from public.treinamentos_revisoes as tr
        join empresas_tenant as e
            on e.id =
                tr.empresa_id
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

        select
            'certificados-treinamentos',
            tre.arquivo_url,
            'Treinamento / Evidência de revisão',
            'treinamentos_revisao_evidencias',
            tre.id::text,
            e.id,
            null::uuid
        from public.treinamentos_revisao_evidencias as tre
        join public.treinamentos_revisoes as tr
            on tr.id =
                tre.revisao_id
        join empresas_tenant as e
            on e.id =
                tr.empresa_id
    ),

    referencias_normalizadas as (
        select
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
            ) as name,
            rb.origem_tipo,
            rb.tabela_origem,
            rb.registro_id,
            rb.empresa_id,
            rb.colaborador_id
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

    /*
     * Uma única representação de cada referência física.
     * Se o mesmo objeto estiver ligado a vários registros,
     * basta comprovar pelo menos um vínculo legítimo no tenant.
     */
    referencias as (
        select distinct on (
            rn.bucket_id,
            rn.name
        )
            rn.bucket_id,
            rn.name,
            rn.origem_tipo,
            rn.tabela_origem,
            rn.registro_id,
            rn.empresa_id,
            rn.colaborador_id
        from referencias_normalizadas as rn
        where nullif(
            btrim(
                rn.name
            ),
            ''
        ) is not null
        order by
            rn.bucket_id,
            rn.name,
            rn.empresa_id nulls last,
            rn.colaborador_id nulls last,
            rn.origem_tipo
    ),

    /*
     * Objeto físico válido e não global.
     */
    objetos_storage_validos as (
        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata,
            o.created_at,
            o.updated_at
        from storage.objects as o
        where
            o.archived_at is null
            and coalesce(
                o.is_delete_marker,
                false
            ) = false
            and regexp_replace(
                o.name,
                '^.*/',
                ''
            ) <>
                '.emptyFolderPlaceholder'
            and not exists (
                select 1
                from ativos_globais as ag
                where ag.bucket_id =
                    o.bucket_id
                  and ag.name =
                    o.name
            )
    ),

    objetos_referenciados as (
        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata,
            o.created_at,
            o.updated_at,
            r.origem_tipo,
            r.tabela_origem,
            r.registro_id,
            r.empresa_id,
            r.colaborador_id,
            true as em_uso,
            'referencia'::text as atribuicao,
            1 as prioridade
        from objetos_storage_validos as o
        join referencias as r
            on r.bucket_id =
                o.bucket_id
           and r.name =
                o.name
    ),

    /*
     * Objetos sem referência documental atual também podem
     * pertencer de forma inequívoca ao tenant quando o caminho
     * físico contém uma chave estrutural já validada.
     *
     * Estes são candidatos a "sem vínculo".
     */
    objetos_por_estrutura as (

        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata,
            o.created_at,
            o.updated_at,
            case
                when o.bucket_id =
                    'contratos-empresas'
                then 'Empresa / Contrato'
                when o.bucket_id =
                    'certidao-mensal-documentos'
                then 'Certidão Mensal / Documento'
                else 'Empresa / Documento empresarial'
            end as origem_tipo,
            'Estrutura de caminho por empresa'::text
                as tabela_origem,
            null::text as registro_id,
            e.id as empresa_id,
            null::uuid as colaborador_id,
            false as em_uso,
            'estrutura'::text as atribuicao,
            2 as prioridade
        from objetos_storage_validos as o
        join empresas_tenant as e
            on e.id::text =
                split_part(
                    o.name,
                    '/',
                    1
                )
        where o.bucket_id in (
            'documentos-empresas',
            'contratos-empresas',
            'certidao-mensal-documentos'
        )

        union all

        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata,
            o.created_at,
            o.updated_at,
            'Empresa / Branding'::text,
            'Estrutura tenant/empresa do bucket logos-empresas'::text,
            null::text,
            e.id,
            null::uuid,
            false,
            'estrutura'::text,
            2
        from objetos_storage_validos as o
        left join empresas_tenant as e
            on e.id::text =
                split_part(
                    o.name,
                    '/',
                    1
                )
        where
            o.bucket_id =
                'logos-empresas'
            and (
                split_part(
                    o.name,
                    '/',
                    1
                ) =
                    p_tenant_id::text
                or e.id is not null
            )

        union all

        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata,
            o.created_at,
            o.updated_at,
            'Colaborador / Foto'::text,
            'Estrutura de caminho por colaborador'::text,
            null::text,
            c.empresa_id,
            c.id,
            false,
            'estrutura'::text,
            2
        from objetos_storage_validos as o
        join colaboradores_tenant as c
            on c.id::text =
                split_part(
                    o.name,
                    '/',
                    1
                )
        where o.bucket_id =
            'fotos-colaboradores'

        union all

        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata,
            o.created_at,
            o.updated_at,
            'Colaborador / Documento e certificado'::text,
            'Estrutura de caminho por código do colaborador'::text,
            null::text,
            c.empresa_id,
            c.id,
            false,
            'estrutura'::text,
            2
        from objetos_storage_validos as o
        join colaboradores_tenant as c
            on c.codigo_funcionario is not null
           and c.codigo_funcionario =
                lower(
                    split_part(
                        o.name,
                        '/',
                        1
                    )
                )
        where o.bucket_id =
            'certificados-treinamentos'

        union all

        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata,
            o.created_at,
            o.updated_at,
            'DDS / Documento assinado'::text,
            'Estrutura de caminho por registro DDS'::text,
            null::text,
            d.empresa_id,
            null::uuid,
            false,
            'estrutura'::text,
            2
        from objetos_storage_validos as o
        join dds_tenant as d
            on d.id::text =
                split_part(
                    o.name,
                    '/',
                    1
                )
        where o.bucket_id =
            'dds-assinados'

        union all

        select
            o.id,
            o.bucket_id,
            o.name,
            o.metadata,
            o.created_at,
            o.updated_at,
            'Mapa de obra / Planta'::text,
            'Estrutura de caminho por obra'::text,
            null::text,
            null::uuid,
            null::uuid,
            false,
            'estrutura'::text,
            2
        from objetos_storage_validos as o
        join obras_tenant as obra
            on obra.id::text =
                split_part(
                    o.name,
                    '/',
                    1
                )
        where o.bucket_id =
            'mapas-obras'
    ),

    objetos_candidatos as (
        select *
        from objetos_referenciados

        union all

        select *
        from objetos_por_estrutura
    ),

    objetos_rankeados as (
        select
            oc.*,
            row_number() over (
                partition by oc.id
                order by
                    oc.prioridade,
                    oc.atribuicao
            ) as ordem_atribuicao
        from objetos_candidatos as oc
    ),

    objetos_tenant as (
        select
            objeto.*
        from objetos_rankeados as objeto
        where objeto.ordem_atribuicao =
            1
    )

    select
        p_tenant_id as tenant_id,
        ot.id,
        ot.bucket_id::text,
        ot.name::text as caminho,
        regexp_replace(
            ot.name,
            '^.*/',
            ''
        )::text as nome,
        case
            when position(
                '/' in ot.name
            ) > 0
            then regexp_replace(
                ot.name,
                '/[^/]+$',
                ''
            )
            else null
        end::text as pasta,
        case
            when coalesce(
                ot.metadata ->> 'size',
                ''
            ) ~ '^[0-9]+$'
            then (
                ot.metadata ->> 'size'
            )::bigint
            else 0::bigint
        end as tamanho_bytes,
        nullif(
            coalesce(
                ot.metadata ->> 'mimetype',
                ot.metadata ->> 'mimeType',
                ot.metadata ->> 'contentType',
                ''
            ),
            ''
        )::text as mime_type,
        ot.created_at as criado_em,
        ot.updated_at as atualizado_em,
        ot.origem_tipo::text,
        ot.tabela_origem::text,
        ot.registro_id::text,
        coalesce(
            ot.empresa_id,
            ct.empresa_id
        ) as empresa_id,
        e.nome::text as empresa_nome,
        ot.colaborador_id,
        ct.nome::text as colaborador_nome,
        ot.em_uso,
        not ot.em_uso as sem_vinculo,
        position(
            '/' in ot.name
        ) = 0 as fora_de_pasta,
        ot.atribuicao::text,
        (
            not ot.em_uso
            and position(
                '/' in ot.name
            ) = 0
        ) as candidato_limpeza_fora_pasta,
        count(*) over()::bigint
            as total_resultados
    from objetos_tenant as ot
    left join colaboradores_tenant as ct
        on ct.id =
            ot.colaborador_id
    left join empresas_tenant as e
        on e.id =
            coalesce(
                ot.empresa_id,
                ct.empresa_id
            )
    where
        (
            nullif(
                btrim(
                    p_bucket_id
                ),
                ''
            ) is null
            or ot.bucket_id =
                btrim(
                    p_bucket_id
                )
        )
        and
        (
            nullif(
                btrim(
                    p_caminho,
                    '/'
                ),
                ''
            ) is null
            or ot.name =
                btrim(
                    p_caminho,
                    '/'
                )
        )
    order by
        ot.bucket_id,
        ot.name,
        ot.id
    limit v_limite
    offset v_offset;
end;
$function$;

revoke all
on function public.inventario_storage_sst_tenant(
    uuid,
    integer,
    integer,
    text,
    text
)
from public;

revoke all
on function public.inventario_storage_sst_tenant(
    uuid,
    integer,
    integer,
    text,
    text
)
from anon;

revoke all
on function public.inventario_storage_sst_tenant(
    uuid,
    integer,
    integer,
    text,
    text
)
from authenticated;

grant execute
on function public.inventario_storage_sst_tenant(
    uuid,
    integer,
    integer,
    text,
    text
)
to authenticated;

comment on function public.inventario_storage_sst_tenant(
    uuid,
    integer,
    integer,
    text,
    text
)
is
    'Inventário individual e paginado de objetos do Storage comprovadamente atribuíveis ao tenant autorizado. Exclui ativos globais e objetos sem atribuição segura. A classificação de limpeza é somente informativa; qualquer futura exclusão deverá revalidar tenant e vínculo no backend.';
