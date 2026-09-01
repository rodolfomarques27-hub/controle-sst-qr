import {
    buscarTodosRegistrosSupabase,
    listarTodosArquivosStorage,
} from "./supabaseServices";
import { supabase } from "../lib/supabaseClient";
import { codigoPastaCertificado } from "./certificadosStorageService";
import {
    calcularVencimentoTreinamento,
    obterTreinamento,
} from "./colaboradorDocumentosService";
import { treinamentosBase } from "../constants/treinamentosConstants";
import { extrairCaminhoStorage } from "../utils/sstUtils";

const ATIVOS_SISTEMA_STORAGE = Object.freeze({
    "logos-empresas:configuracoes/login/fundo-login.jpg": Object.freeze({
        id: "fundo-login-global",
        tipo: "Fundo da tela de login",
        origemRegistro: "Configuração global do sistema",
        origemTipo: "Sistema / Aparência do login",
        tabelaOrigem: "configuracoes_publicas_sistema",
    }),
    "logos-empresas:configuracoes/login/logo-contratante.png": Object.freeze({
        id: "logo-contratante-login-global",
        tipo: "Logo da contratante na tela de login",
        origemRegistro: "Configuração global do sistema",
        origemTipo: "Sistema / Aparência do login",
        tabelaOrigem: "Storage global do login",
    }),
    "logos-empresas:configuracoes/qrcode/logo-qrcode.png": Object.freeze({
        id: "logo-qrcode-global",
        tipo: "Logo global dos QR Codes",
        origemRegistro: "Configuração global do sistema",
        origemTipo: "Sistema / Logo dos QR Codes",
        tabelaOrigem: "configuração global do QR Code",
    }),

    /*
     * SAFE_SCAN_STORAGE_AUDIT_NOVOS_BUCKETS_V11
     *
     * Ativos internos com caminhos determinísticos.
     * Nunca devem ser classificados como órfãos.
     */
    "assinaturas-email-sst:modelos/alerta_documento_colaborador/assinatura": Object.freeze({
        id: "assinatura-email-alerta-documento-colaborador",
        tipo: "Assinatura de e-mail SST",
        origemRegistro: "Modelo de e-mail SST",
        origemTipo: "Sistema / Assinatura de e-mail",
        tabelaOrigem: "Configuração dos modelos de e-mail SST",
    }),

    "assinaturas-email-sst:modelos/alerta_documento_empresa/assinatura": Object.freeze({
        id: "assinatura-email-alerta-documento-empresa",
        tipo: "Assinatura de e-mail SST",
        origemRegistro: "Modelo de e-mail SST",
        origemTipo: "Sistema / Assinatura de e-mail",
        tabelaOrigem: "Configuração dos modelos de e-mail SST",
    }),

    "assinaturas-email-sst:modelos/alerta_documentos_lote/assinatura": Object.freeze({
        id: "assinatura-email-alerta-documentos-lote",
        tipo: "Assinatura de e-mail SST",
        origemRegistro: "Modelo de e-mail SST",
        origemTipo: "Sistema / Assinatura de e-mail",
        tabelaOrigem: "Configuração dos modelos de e-mail SST",
    }),

    "assinaturas-email-sst:modelos/alerta_treinamentos/assinatura": Object.freeze({
        id: "assinatura-email-alerta-treinamentos",
        tipo: "Assinatura de e-mail SST",
        origemRegistro: "Modelo de e-mail SST",
        origemTipo: "Sistema / Assinatura de e-mail",
        tabelaOrigem: "Configuração dos modelos de e-mail SST",
    }),

    "assinaturas-email-sst:modelos/alerta_auditoria/assinatura": Object.freeze({
        id: "assinatura-email-alerta-auditoria",
        tipo: "Assinatura de e-mail SST",
        origemRegistro: "Modelo de e-mail SST",
        origemTipo: "Sistema / Assinatura de e-mail",
        tabelaOrigem: "Configuração dos modelos de e-mail SST",
    }),

    "assinaturas-email-sst:modelos/certidao_mensal_documental/assinatura": Object.freeze({
        id: "assinatura-email-certidao-mensal",
        tipo: "Assinatura de e-mail SST",
        origemRegistro: "Modelo de e-mail SST",
        origemTipo: "Sistema / Assinatura de e-mail",
        tabelaOrigem: "Configuração dos modelos de e-mail SST",
    }),
});

function obterAtivoSistemaStorage(bucket = "", caminho = "") {
    return ATIVOS_SISTEMA_STORAGE[`${String(bucket || "").trim()}:${String(caminho || "").trim()}`] || null;
}

export async function sincronizarCertificadosDoStorageService({
    supabase,
    colaboradores = [],
    dataReferencia = new Date(),
} = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para sincronizar certificados.");
    }

    let sincronizados = 0;
    let ignorados = 0;

    for (const colaborador of colaboradores || []) {
        for (const treinamento of treinamentosBase) {
            const pasta = `${codigoPastaCertificado(colaborador)}/${treinamento.id}`;

            const { data: arquivos, error } = await supabase.storage
                .from("certificados-treinamentos")
                .list(pasta, {
                    limit: 100,
                    sortBy: { column: "created_at", order: "desc" },
                });

            if (error) {
                ignorados += 1;
                continue;
            }

            const arquivosValidos = (arquivos || []).filter((arquivo) => arquivo.name && !arquivo.name.endsWith("/"));

            if (arquivosValidos.length === 0) continue;

            const maisRecente = arquivosValidos.sort((a, b) => {
                const dataB = new Date(b.updated_at || b.created_at || 0).getTime();
                const dataA = new Date(a.updated_at || a.created_at || 0).getTime();
                return dataB - dataA;
            })[0];

            const dataRealizacao = (maisRecente.created_at || maisRecente.updated_at || dataReferencia.toISOString()).slice(0, 10);
            const dataVencimento = calcularVencimentoTreinamento(treinamento.id, dataRealizacao);
            const caminho = `${pasta}/${maisRecente.name}`;

            const { error: upsertError } = await supabase
                .from("certificados")
                .upsert(
                    {
                        colaborador_id: colaborador.id,
                        tipo_treinamento: treinamento.nome,
                        treinamento_codigo: Number(treinamento.id),
                        nome_treinamento: treinamento.nome,
                        data_realizacao: dataRealizacao,
                        data_vencimento: dataVencimento,
                        arquivo_url: caminho,
                        arquivo_nome: maisRecente.name,
                        observacao: "Sincronizado automaticamente do Storage",
                        status_validacao: "Validado",
                    },
                    { onConflict: "colaborador_id,tipo_treinamento" }
                );

            if (upsertError) {
                throw new Error(`Erro ao sincronizar ${colaborador.nome} / ${treinamento.nome}: ${upsertError.message}`);
            }

            sincronizados += 1;
        }
    }

    return `${sincronizados} certificado(s) sincronizado(s) do Storage para a tabela certificados. ${ignorados} pasta(s) ignorada(s).`;
}

export async function listarArquivosCertificadosStorageService({
    colaboradores = [],
    empresasBanco = [],
    onProgress = null,
} = {}) {
    const informarProgresso = (dados) => {
        if (typeof onProgress === "function") onProgress(dados);
    };
    const coletados = [];
    const bucketsAuditados = [
        {
            bucket: "certificados-treinamentos",
            origemTipo: "Colaborador / Documento e certificado",
            tabelaOrigem: "certificados / certificados_historico / certificados_evidencias / verificacoes_documentais",
        },
        {
            bucket: "documentos-empresas",
            origemTipo: "Empresa / Documento empresarial",
            tabelaOrigem: "documentos_empresas / verificacoes_documentais",
        },
        {
            bucket: "contratos-empresas",
            origemTipo: "Empresa / Contrato",
            tabelaOrigem: "empresas.contrato_url",
        },
        {
            bucket: "logos-empresas",
            origemTipo: "Empresa / Logo",
            tabelaOrigem: "empresas.logo_url / ativos globais",
        },
        {
            bucket: "fotos-colaboradores",
            origemTipo: "Colaborador ou usuário do App / Foto",
            tabelaOrigem: "colaboradores.foto_url / usuarios_permissoes_sistema.foto_url",
        },
        {
            bucket: "auditorias-campo",
            origemTipo: "Auditoria de campo / Evidência fotográfica",
            tabelaOrigem: "auditorias_campo / auditoria_campo_desvios",
        },
        {
            bucket: "certidao-mensal-documentos",
            origemTipo: "Certidão Mensal / Documento versionado",
            tabelaOrigem: "certidao_mensal_versoes / certidao_mensal_evidencias / certidao_mensal_envio_itens",
        },
        {
            bucket: "dds-assinados",
            origemTipo: "DDS / Documento assinado",
            tabelaOrigem: "dds_documentos",
        },
        {
            bucket: "mapas-obras",
            origemTipo: "Mapa de obra / Planta",
            tabelaOrigem: "mapas_obras / mapas_pontos",
        },
        {
            bucket: "assinaturas-email-sst",
            origemTipo: "Sistema / Assinatura de e-mail",
            tabelaOrigem: "Configuração dos modelos de e-mail SST",
        },
    ];

    const listarNivel = async (bucketInfo, prefixo = "") => {
        let data;

        try {
            data = await listarTodosArquivosStorage(bucketInfo.bucket, prefixo);
        } catch (error) {
            console.warn(`Erro ao listar bucket ${bucketInfo.bucket}:`, error.message);
            return;
        }

        const subpastas = [];
        for (const item of data || []) {
            const caminho =
                prefixo
                    ? `${prefixo}/${item.name}`
                    : item.name;

            const tamanho =
                Number(
                    item?.metadata?.size ??
                    item?.metadata?.Size ??
                    item?.size ??
                    0
                ) || 0;

            const mime =
                String(
                    item?.metadata?.mimetype ??
                    item?.metadata?.mimeType ??
                    item?.metadata?.contentType ??
                    ""
                ).trim();

            /*
             * SAFE_SCAN_STORAGE_AUDIT_ORFAOS_V23
             *
             * .emptyFolderPlaceholder é marcador técnico de pasta.
             * Não entra no inventário operacional nem na limpeza.
             */
            if (
                item?.name ===
                ".emptyFolderPlaceholder"
            ) {
                continue;
            }

            /*
             * O Storage pode conter objetos válidos sem extensão,
             * como as imagens de assinatura dos modelos de e-mail.
             *
             * Diretórios virtuais normalmente chegam sem id,
             * metadata, datas e tamanho.
             */
            const pareceArquivo =
                Boolean(
                    item?.id ||
                    tamanho > 0 ||
                    mime ||
                    (
                        item.name &&
                        /\.[a-z0-9]{2,8}$/i.test(
                            item.name
                        )
                    )
                );

            if (pareceArquivo) {
                coletados.push({
                    bucket:
                        bucketInfo.bucket,

                    origemTipo:
                        bucketInfo.origemTipo,

                    tabelaOrigem:
                        bucketInfo.tabelaOrigem,

                    nome:
                        item.name,

                    caminho,

                    tamanho:
                        tamanho || null,

                    atualizadoEm:
                        item.updated_at ||
                        item.created_at ||
                        null,
                });
            } else {
                subpastas.push(
                    () =>
                        listarNivel(
                            bucketInfo,
                            caminho
                        )
                );
            }
        }

        for (let inicio = 0; inicio < subpastas.length; inicio += 8) {
            await Promise.all(subpastas.slice(inicio, inicio + 8).map((listarSubpasta) => listarSubpasta()));
        }
    };

    const totalEtapasProgresso = bucketsAuditados.length + 18;
    informarProgresso({ etapa: "storage", atual: 0, total: totalEtapasProgresso, mensagem: "Consultando áreas do Storage..." });
    let bucketsConcluidos = 0;
    await Promise.all(bucketsAuditados.map(async (bucketInfo) => {
        await listarNivel(bucketInfo, "");
        bucketsConcluidos += 1;
        informarProgresso({
            etapa: "storage",
            atual: bucketsConcluidos,
            total: totalEtapasProgresso,
            mensagem: `${bucketInfo.bucket}: concluído (${coletados.length} arquivo(s) localizado(s))`,
        });
    }));

    informarProgresso({ etapa: "vinculos", atual: bucketsAuditados.length, total: totalEtapasProgresso, mensagem: "Cruzando arquivos com os registros do sistema..." });
    let consultasConcluidas = 0;
    const consultarVinculo = async (consulta, rotulo, obrigatoria = false) => {
        try {
            return await consulta();
        } catch (error) {
            if (obrigatoria) throw error;
            console.warn(`Erro ao consultar ${rotulo} para vínculos do Storage:`, error.message);
            return [];
        } finally {
            consultasConcluidas += 1;
            informarProgresso({ etapa: "vinculos", atual: bucketsAuditados.length + consultasConcluidas, total: totalEtapasProgresso, mensagem: `${rotulo}: conferido` });
        }
    };

    const [
        certificados,
        certificadosHistorico,
        documentosEmpresaBanco,
        usuariosPermissoesBanco,
        auditoriasCampoBanco,
        desviosAuditoriaBanco,

        certificadosEvidenciasBanco,
        verificacoesDocumentaisBanco,

        certidaoCompetenciasBanco,
        certidaoItensBanco,
        certidaoVersoesBanco,
        certidaoEvidenciasBanco,
        certidaoEnvioItensBanco,

        ddsRegistrosBanco,
        ddsDocumentosBanco,

        mapasObrasBanco,
        mapasPontosBanco,
    ] = await Promise.all([
        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "certificados",
                    "*"
                ),
            "Certificados",
            true
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "certificados_historico",
                    "*"
                ),
            "Histórico de certificados",
            true
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "documentos_empresas",
                    "*"
                ),
            "Documentos de empresas",
            true
        ),

        /*
         * SAFE_SCAN_STORAGE_USUARIOS_RPC_V52
         *
         * usuarios_permissoes_sistema permanece protegida por RLS.
         *
         * A auditoria reutiliza a RPC administrativa oficial,
         * SECURITY DEFINER, que valida o usuário atual e devolve
         * também foto_url.
         *
         * O parâmetro true mantém esta fonte em fail-closed:
         * se a RPC falhar, não geramos uma lista de órfãos
         * potencialmente insegura.
         */
        consultarVinculo(
            async () => {
                const {
                    data,
                    error,
                } =
                    await supabase.rpc(
                        "admin_listar_usuarios_permissoes_sistema"
                    );

                if (error) {
                    throw error;
                }

                return Array.isArray(
                    data
                )
                    ? data
                    : [];
            },
            "Usuários do App",
            true
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "auditorias_campo",
                    "id, empresa_id, numero_auditoria, titulo, empresa_nome, foto_antes_url, foto_depois_url"
                ),
            "Auditorias"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "auditoria_campo_desvios",
                    "id, auditoria_id, empresa_id, categoria, descricao, foto_antes_url, foto_depois_url"
                ),
            "Desvios"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "certificados_evidencias",
                    "id, colaborador_id, treinamento_codigo, tipo_treinamento, nome_treinamento, tipo_evidencia, arquivo_url, arquivo_substituto_url, principal, historica"
                ),
            "Evidências de certificados"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "verificacoes_documentais",
                    "id, empresa_id, colaborador_id, treinamento_id, tipo_documento, nome_documento, arquivo_url, bucket, caminho_storage, origem_tabela"
                ),
            "Verificações documentais"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "certidao_mensal_competencias",
                    "id, empresa_id, competencia, status"
                ),
            "Competências da Certidão Mensal"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "certidao_mensal_itens",
                    "id, competencia_id, tipo_documento, titulo, versao_atual_id"
                ),
            "Itens da Certidão Mensal"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "certidao_mensal_versoes",
                    "id, item_id, numero_versao, bucket_id, caminho_storage, nome_original"
                ),
            "Versões da Certidão Mensal"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "certidao_mensal_evidencias",
                    "id, item_id, tipo_evidencia, bucket_id, caminho_storage, nome_original, ativo, colaborador_id"
                ),
            "Evidências da Certidão Mensal"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "certidao_mensal_envio_itens",
                    "id, competencia_id, item_id, versao_id, documento_tipo, documento_titulo, bucket, caminho_storage, nome_arquivo"
                ),
            "Itens enviados da Certidão Mensal"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "dds_registros",
                    "id, codigo, empresa_id, obra_id, empresa_nome, obra_nome, status"
                ),
            "Registros de DDS"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "dds_documentos",
                    "id, registro_id, bucket_id, caminho_storage, nome_original"
                ),
            "Documentos de DDS"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "mapas_obras",
                    "id, empresa_id, obra_id, nome, imagem_path, imagem_tipo, status"
                ),
            "Mapas de obras"
        ),

        consultarVinculo(
            () =>
                buscarTodosRegistrosSupabase(
                    "mapas_pontos",
                    "id, mapa_id, empresa_id, nome, tipo, planta_detalhada_path, status"
                ),
            "Pontos dos mapas"
        ),
    ]);

    informarProgresso({ etapa: "finalizando", atual: totalEtapasProgresso, total: totalEtapasProgresso, mensagem: `Organizando ${coletados.length} arquivo(s)...` });

    const colaboradoresPorId = (colaboradores || []).reduce((acc, colaborador) => {
        acc[colaborador.id] = colaborador;
        return acc;
    }, {});

    const colaboradoresPorPasta = (colaboradores || []).reduce((acc, colaborador) => {
        try {
            const pasta = codigoPastaCertificado(colaborador);

            if (pasta) acc[pasta] = colaborador;
        } catch {
            // Ignora colaborador sem código válido para pasta.
        }

        return acc;
    }, {});

    const empresasPorId = (empresasBanco || []).reduce((acc, empresa) => {
        acc[empresa.id] = empresa;
        return acc;
    }, {});

    const certificadosPorCaminho = (certificados || []).reduce((acc, item) => {
        const caminhoArquivo = extrairCaminhoStorage(
            "certificados-treinamentos",
            item.url_do_arquivo || item.arquivo_url
        );

        if (caminhoArquivo) {
            acc[`certificados-treinamentos:${caminhoArquivo}`] = item;
        }

        return acc;
    }, {});

    const certificadosHistoricoPorCaminho =
        (certificadosHistorico || []).reduce(
            (acc, item) => {
                const caminhoArquivo = extrairCaminhoStorage(
                    "certificados-treinamentos",
                    item.url_do_arquivo || item.arquivo_url
                );

                if (caminhoArquivo) {
                    acc[
                        `certificados-treinamentos:${caminhoArquivo}`
                    ] = item;
                }

                return acc;
            },
            {}
        );

    /*
     * Centraliza referências físicas por bucket:caminho.
     */
    const registrarReferenciaStorage = (
        acc,
        bucket,
        valor,
        registro,
        origem
    ) => {
        const bucketSeguro =
            String(
                bucket || ""
            ).trim();

        if (!bucketSeguro) {
            return acc;
        }

        const caminho =
            extrairCaminhoStorage(
                bucketSeguro,
                valor
            );

        if (caminho) {
            acc[
                `${bucketSeguro}:${caminho}`
            ] = {
                ...registro,

                origemStorageAuditoria:
                    origem,
            };
        }

        return acc;
    };


    const certificadosEvidenciasPorCaminho =
        (
            certificadosEvidenciasBanco ||
            []
        ).reduce(
            (acc, item) => {
                registrarReferenciaStorage(
                    acc,
                    "certificados-treinamentos",
                    item.arquivo_url,
                    item,
                    "Evidências de certificados"
                );

                registrarReferenciaStorage(
                    acc,
                    "certificados-treinamentos",
                    item.arquivo_substituto_url,
                    item,
                    "Evidências de certificados"
                );

                return acc;
            },
            {}
        );


    const verificacoesPorCaminho =
        (
            verificacoesDocumentaisBanco ||
            []
        ).reduce(
            (acc, item) => {
                const bucket =
                    String(
                        item.bucket || ""
                    ).trim();

                if (!bucket) {
                    return acc;
                }

                registrarReferenciaStorage(
                    acc,
                    bucket,
                    item.caminho_storage ||
                        item.arquivo_url,
                    item,
                    "Verificações documentais"
                );

                return acc;
            },
            {}
        );


    const certidaoCompetenciasPorId =
        (
            certidaoCompetenciasBanco ||
            []
        ).reduce(
            (acc, item) => {
                acc[item.id] =
                    item;

                return acc;
            },
            {}
        );


    const certidaoItensPorId =
        (
            certidaoItensBanco ||
            []
        ).reduce(
            (acc, item) => {
                acc[item.id] =
                    item;

                return acc;
            },
            {}
        );


    const enriquecerRegistroCertidao =
        (
            registro = {}
        ) => {
            const item =
                certidaoItensPorId[
                    registro.item_id
                ] ||
                null;

            const competenciaId =
                registro.competencia_id ||
                item?.competencia_id ||
                "";

            const competencia =
                certidaoCompetenciasPorId[
                    competenciaId
                ] ||
                null;

            return {
                ...registro,

                empresa_id:
                    competencia?.empresa_id ||
                    registro.empresa_id ||
                    "",

                competencia:
                    competencia?.competencia ||
                    "",

                tipo_documento:
                    registro.documento_tipo ||
                    item?.tipo_documento ||
                    registro.tipo_evidencia ||
                    "",

                titulo_documento:
                    registro.documento_titulo ||
                    item?.titulo ||
                    registro.nome_original ||
                    registro.nome_arquivo ||
                    "",
            };
        };


    const certidaoMensalPorCaminho =
        {};


    for (
        const versao of
        certidaoVersoesBanco || []
    ) {
        const registro =
            enriquecerRegistroCertidao(
                versao
            );

        registrarReferenciaStorage(
            certidaoMensalPorCaminho,
            registro.bucket_id ||
                "certidao-mensal-documentos",
            registro.caminho_storage,
            registro,
            "Versão da Certidão Mensal"
        );
    }


    for (
        const evidencia of
        certidaoEvidenciasBanco || []
    ) {
        const registro =
            enriquecerRegistroCertidao(
                evidencia
            );

        registrarReferenciaStorage(
            certidaoMensalPorCaminho,
            registro.bucket_id ||
                "certidao-mensal-documentos",
            registro.caminho_storage,
            registro,
            "Evidência da Certidão Mensal"
        );
    }


    for (
        const envio of
        certidaoEnvioItensBanco || []
    ) {
        const registro =
            enriquecerRegistroCertidao(
                envio
            );

        registrarReferenciaStorage(
            certidaoMensalPorCaminho,
            registro.bucket ||
                "certidao-mensal-documentos",
            registro.caminho_storage,
            registro,
            "Histórico de envio da Certidão Mensal"
        );
    }


    const ddsRegistrosPorId =
        (
            ddsRegistrosBanco ||
            []
        ).reduce(
            (acc, item) => {
                acc[item.id] =
                    item;

                return acc;
            },
            {}
        );


    const ddsDocumentosPorCaminho =
        (
            ddsDocumentosBanco ||
            []
        ).reduce(
            (acc, item) => {
                const registroDds =
                    ddsRegistrosPorId[
                        item.registro_id
                    ] ||
                    null;

                registrarReferenciaStorage(
                    acc,
                    item.bucket_id ||
                        "dds-assinados",
                    item.caminho_storage,
                    {
                        ...item,

                        empresa_id:
                            registroDds
                                ?.empresa_id ||
                            "",

                        empresa_nome:
                            registroDds
                                ?.empresa_nome ||
                            "",

                        codigo_dds:
                            registroDds
                                ?.codigo ||
                            "",

                        obra_nome:
                            registroDds
                                ?.obra_nome ||
                            "",
                    },
                    "Documento de DDS"
                );

                return acc;
            },
            {}
        );


    const mapasObrasPorId =
        (
            mapasObrasBanco ||
            []
        ).reduce(
            (acc, item) => {
                acc[item.id] =
                    item;

                return acc;
            },
            {}
        );


    const mapasObrasPorCaminho =
        (
            mapasObrasBanco ||
            []
        ).reduce(
            (acc, item) => {
                registrarReferenciaStorage(
                    acc,
                    "mapas-obras",
                    item.imagem_path,
                    item,
                    "Planta geral da obra"
                );

                return acc;
            },
            {}
        );


    const mapasPontosPorCaminho =
        (
            mapasPontosBanco ||
            []
        ).reduce(
            (acc, item) => {
                const mapa =
                    mapasObrasPorId[
                        item.mapa_id
                    ] ||
                    null;

                registrarReferenciaStorage(
                    acc,
                    "mapas-obras",
                    item.planta_detalhada_path,
                    {
                        ...item,

                        empresa_id:
                            item.empresa_id ||
                            mapa?.empresa_id ||
                            "",

                        mapa_nome:
                            mapa?.nome ||
                            "",
                    },
                    "Planta detalhada do ponto"
                );

                return acc;
            },
            {}
        );


    const documentosEmpresaPorCaminho = (documentosEmpresaBanco || []).reduce((acc, item) => {
        const caminhoArquivo = extrairCaminhoStorage(
            "documentos-empresas",
            item.url_do_arquivo || item.arquivo_url
        );

        if (caminhoArquivo) {
            acc[`documentos-empresas:${caminhoArquivo}`] = item;
        }

        return acc;
    }, {});

    const contratosPorCaminho = (empresasBanco || []).reduce((acc, empresa) => {
        const caminhoContrato = extrairCaminhoStorage(
            "contratos-empresas",
            empresa.contrato_url
        );

        if (caminhoContrato) {
            acc[`contratos-empresas:${caminhoContrato}`] = empresa;
        }

        return acc;
    }, {});

    const logosPorCaminho = (empresasBanco || []).reduce((acc, empresa) => {
        const caminhoLogo = extrairCaminhoStorage(
            "logos-empresas",
            empresa.logo_url
        );

        if (caminhoLogo) {
            acc[`logos-empresas:${caminhoLogo}`] = empresa;
        }

        return acc;
    }, {});

    const fotosPorCaminho = (colaboradores || []).reduce((acc, colaborador) => {
        const caminhoFoto = extrairCaminhoStorage(
            "fotos-colaboradores",
            colaborador.fotoUrl || colaborador.foto_url
        );

        if (caminhoFoto) {
            acc[`fotos-colaboradores:${caminhoFoto}`] = colaborador;
        }

        return acc;
    }, {});

    const normalizarCaminhoVinculoStorage =
        (
            valor = ""
        ) => {
            let caminho =
                String(
                    valor || ""
                )
                    .trim()
                    .replace(
                        /^\/+/,
                        ""
                    );

            try {
                caminho =
                    decodeURIComponent(
                        caminho
                    );
            } catch {
                // Valor já normalizado.
            }

            return caminho;
        };


    const fotosUsuariosAcessoPorCaminho =
        (usuariosPermissoesBanco || []).reduce(
            (acc, usuarioAcesso) => {
                const caminhoFoto =
                    normalizarCaminhoVinculoStorage(
                        extrairCaminhoStorage(
                            "fotos-colaboradores",
                            usuarioAcesso.foto_url
                        )
                    );

                if (caminhoFoto) {
                    acc[
                        `fotos-colaboradores:${caminhoFoto}`
                    ] =
                        usuarioAcesso;
                }

                return acc;
            },
            {}
        );

    const registrarCaminhoAuditoria = (acc, valor, registro, origem) => {
        const caminho = extrairCaminhoStorage("auditorias-campo", valor);
        if (caminho) {
            acc[`auditorias-campo:${caminho}`] = { ...registro, origemAuditoriaStorage: origem };
        }
        return acc;
    };

    const auditoriasCampoPorCaminho = (auditoriasCampoBanco || []).reduce((acc, auditoria) => {
        registrarCaminhoAuditoria(acc, auditoria.foto_antes_url, auditoria, "Auditoria de campo");
        registrarCaminhoAuditoria(acc, auditoria.foto_depois_url, auditoria, "Auditoria de campo");
        return acc;
    }, {});

    const desviosAuditoriaPorCaminho = (desviosAuditoriaBanco || []).reduce((acc, desvio) => {
        registrarCaminhoAuditoria(acc, desvio.foto_antes_url, desvio, "Desvio de auditoria");
        registrarCaminhoAuditoria(acc, desvio.foto_depois_url, desvio, "Desvio de auditoria");
        return acc;
    }, {});

    return coletados
        .map((arquivo) => {
            const partes = arquivo.caminho.split("/");
            const pasta = partes.length > 1 ? partes.slice(0, -1).join("/") : "";
            const primeiraPasta = partes[0] || "";
            const segundaPasta = partes[1] || "";
            const chave = `${arquivo.bucket}:${arquivo.caminho}`;
            const ativoSistemaStorage = obterAtivoSistemaStorage(
                arquivo.bucket,
                arquivo.caminho
            );
            const ativoSistema = Boolean(ativoSistemaStorage);

            let emUso = false;
            let origemRegistro = "";
            let registroId = "";
            let colaboradorNome = "";
            let colaboradorCodigo = "";
            let colaboradorEmpresa = "";
            let empresaNome = "";
            let empresaCnpj = "";
            let tipoDocumentoEmpresa = "";
            let treinamentoNome = "";
            let origemIdentificacao = "";

            if (arquivo.bucket === "certificados-treinamentos") {
                const certificadoVinculado =
                    certificadosPorCaminho[chave] ||
                    null;

                const certificadoHistoricoVinculado =
                    certificadosHistoricoPorCaminho[chave] ||
                    null;

                const certificadoEvidenciaVinculada =
                    certificadosEvidenciasPorCaminho[
                        chave
                    ] ||
                    null;

                const verificacaoVinculada =
                    verificacoesPorCaminho[
                        chave
                    ] ||
                    null;

                const certificadoReferencia =
                    certificadoVinculado ||
                    certificadoHistoricoVinculado ||
                    certificadoEvidenciaVinculada ||
                    verificacaoVinculada ||
                    null;

                const colaboradorVinculado =
                    certificadoReferencia
                        ? colaboradoresPorId[
                            certificadoReferencia.colaborador_id
                        ]
                        : null;

                const colaboradorPelaPasta =
                    colaboradoresPorPasta[primeiraPasta] ||
                    null;

                const colaboradorArquivo =
                    colaboradorVinculado ||
                    colaboradorPelaPasta ||
                    null;

                const treinamento =
                    obterTreinamento(
                        Number(segundaPasta)
                    );

                emUso =
                    Boolean(
                        certificadoReferencia
                    );

                origemRegistro =
                    certificadoVinculado
                        ? "Base de certificados"
                        : certificadoHistoricoVinculado
                            ? "Histórico de certificados"
                            : certificadoEvidenciaVinculada
                                ? "Evidências de certificados"
                                : verificacaoVinculada
                                    ? "Verificações documentais"
                                    : colaboradorPelaPasta
                                        ? "Pasta do Storage"
                                        : "";

                registroId =
                    certificadoReferencia?.id ||
                    "";

                colaboradorNome =
                    colaboradorArquivo?.nome ||
                    "";

                colaboradorCodigo =
                    colaboradorArquivo?.codigoFuncionario ||
                    "";

                colaboradorEmpresa =
                    colaboradorArquivo?.empresaExibicao ||
                    colaboradorArquivo?.empresa ||
                    "";

                treinamentoNome =
                    certificadoReferencia?.nome_treinamento ||
                    certificadoReferencia?.nome_documento ||
                    certificadoReferencia?.tipo_documento ||
                    treinamento?.nome ||
                    "";

                origemIdentificacao =
                    origemRegistro;
            }

            if (arquivo.bucket === "documentos-empresas") {
                const documentoVinculado =
                    documentosEmpresaPorCaminho[
                        chave
                    ] ||
                    null;

                const verificacaoVinculada =
                    verificacoesPorCaminho[
                        chave
                    ] ||
                    null;

                const documentoReferencia =
                    documentoVinculado ||
                    verificacaoVinculada ||
                    null;

                const empresaVinculada =
                    documentoReferencia
                        ? empresasPorId[
                            documentoReferencia
                                .empresa_id
                        ]
                        : empresasPorId[
                            primeiraPasta
                        ];

                emUso =
                    Boolean(
                        documentoReferencia
                    );

                origemRegistro =
                    documentoVinculado
                        ? "Base de documentos empresariais"
                        : verificacaoVinculada
                            ? "Verificações documentais"
                            : empresaVinculada
                                ? "Pasta do Storage"
                                : "";

                registroId =
                    documentoReferencia?.id ||
                    "";

                empresaNome =
                    empresaVinculada?.nome ||
                    "";

                empresaCnpj =
                    empresaVinculada?.cnpj ||
                    "";

                tipoDocumentoEmpresa =
                    documentoReferencia
                        ?.tipo_documento ||
                    documentoReferencia
                        ?.nome_documento ||
                    segundaPasta ||
                    "";

                origemIdentificacao =
                    origemRegistro;
            }

            if (arquivo.bucket === "contratos-empresas") {
                const empresaContrato = contratosPorCaminho[chave] || empresasPorId[primeiraPasta];

                emUso = Boolean(contratosPorCaminho[chave]);
                origemRegistro = contratosPorCaminho[chave] ? "Cadastro da empresa" : empresaContrato ? "Pasta do Storage" : "";
                registroId = empresaContrato?.id || "";
                empresaNome = empresaContrato?.nome || "";
                empresaCnpj = empresaContrato?.cnpj || "";
                tipoDocumentoEmpresa = "Contrato da empresa";
                origemIdentificacao = origemRegistro;
            }

            if (arquivo.bucket === "logos-empresas") {
                if (ativoSistemaStorage) {
                    emUso = true;
                    origemRegistro = ativoSistemaStorage.origemRegistro;
                    registroId = ativoSistemaStorage.id;
                    empresaNome = "SafeScan Brasil";
                    empresaCnpj = "";
                    tipoDocumentoEmpresa = ativoSistemaStorage.tipo;
                    origemIdentificacao = origemRegistro;
                } else {
                    const empresaLogo = logosPorCaminho[chave] || empresasPorId[primeiraPasta];

                    emUso = Boolean(logosPorCaminho[chave]);
                    origemRegistro = logosPorCaminho[chave] ? "Cadastro da empresa" : empresaLogo ? "Pasta do Storage" : "";
                    registroId = empresaLogo?.id || "";
                    empresaNome = empresaLogo?.nome || "";
                    empresaCnpj = empresaLogo?.cnpj || "";
                    tipoDocumentoEmpresa = "Logo da empresa";
                    origemIdentificacao = origemRegistro;
                }
            }

            if (arquivo.bucket === "fotos-colaboradores") {
                const colaboradorVinculado =
                    fotosPorCaminho[chave] || null;

                const caminhoFotoAuditoria =
                    normalizarCaminhoVinculoStorage(
                        arquivo.caminho
                    );

                const chaveFotoUsuario =
                    `fotos-colaboradores:${caminhoFotoAuditoria}`;

                const usuarioAcessoVinculado =
                    fotosUsuariosAcessoPorCaminho[
                        chave
                    ] ||
                    fotosUsuariosAcessoPorCaminho[
                        chaveFotoUsuario
                    ] ||
                    (
                        usuariosPermissoesBanco ||
                        []
                    ).find(
                        (
                            usuarioAcesso
                        ) =>
                            normalizarCaminhoVinculoStorage(
                                extrairCaminhoStorage(
                                    "fotos-colaboradores",
                                    usuarioAcesso
                                        ?.foto_url
                                )
                            ) ===
                            caminhoFotoAuditoria
                    ) ||
                    null;

                const colaboradorPelaPasta =
                    colaboradoresPorId[primeiraPasta] || null;

                const registroFotoVinculado =
                    usuarioAcessoVinculado ||
                    colaboradorVinculado ||
                    null;

                const colaboradorFoto =
                    colaboradorVinculado ||
                    colaboradorPelaPasta ||
                    null;

                emUso = Boolean(registroFotoVinculado);

                origemRegistro = usuarioAcessoVinculado
                    ? "Cadastro do usuário do App"
                    : colaboradorVinculado
                        ? "Cadastro do colaborador"
                        : colaboradorPelaPasta
                            ? "Pasta do Storage"
                            : "";

                registroId =
                    registroFotoVinculado?.id ||
                    registroFotoVinculado?.user_id ||
                    colaboradorFoto?.id ||
                    "";

                colaboradorNome =
                    usuarioAcessoVinculado?.nome ||
                    usuarioAcessoVinculado?.email ||
                    colaboradorFoto?.nome ||
                    "";

                colaboradorCodigo =
                    colaboradorFoto?.codigoFuncionario ||
                    "";

                colaboradorEmpresa =
                    usuarioAcessoVinculado?.empresa ||
                    colaboradorFoto?.empresaExibicao ||
                    colaboradorFoto?.empresa ||
                    "";

                tipoDocumentoEmpresa = usuarioAcessoVinculado
                    ? "Foto de usuário do App"
                    : "Foto de colaborador";

                origemIdentificacao = origemRegistro;
            }

            if (arquivo.bucket === "auditorias-campo") {
                const auditoriaVinculada = auditoriasCampoPorCaminho[chave] || null;
                const desvioVinculado = desviosAuditoriaPorCaminho[chave] || null;
                const registroAuditoria = auditoriaVinculada || desvioVinculado || null;
                const empresaAuditoria = registroAuditoria?.empresa_id ? empresasPorId[registroAuditoria.empresa_id] : null;

                emUso = Boolean(registroAuditoria);
                origemRegistro = registroAuditoria?.origemAuditoriaStorage || (primeiraPasta ? "Pasta do Storage" : "");
                registroId = registroAuditoria?.id || "";
                empresaNome = empresaAuditoria?.nome || registroAuditoria?.empresa_nome || "";
                empresaCnpj = empresaAuditoria?.cnpj || "";
                tipoDocumentoEmpresa = registroAuditoria?.numero_auditoria || registroAuditoria?.categoria || "Foto de auditoria de campo";
                origemIdentificacao = origemRegistro;
            }

            /*
             * Ativos globais fora do bucket logos.
             */
            if (
                ativoSistemaStorage &&
                arquivo.bucket !==
                    "logos-empresas"
            ) {
                emUso = true;

                origemRegistro =
                    ativoSistemaStorage
                        .origemRegistro;

                registroId =
                    ativoSistemaStorage.id;

                empresaNome =
                    "SafeScan Brasil";

                tipoDocumentoEmpresa =
                    ativoSistemaStorage.tipo;

                origemIdentificacao =
                    origemRegistro;
            }


            if (
                arquivo.bucket ===
                "certidao-mensal-documentos"
            ) {
                const registro =
                    certidaoMensalPorCaminho[
                        chave
                    ] ||
                    null;

                const empresa =
                    registro?.empresa_id
                        ? empresasPorId[
                            registro.empresa_id
                        ]
                        : null;

                emUso =
                    Boolean(
                        registro
                    );

                origemRegistro =
                    registro
                        ?.origemStorageAuditoria ||
                    "";

                registroId =
                    registro?.id ||
                    "";

                empresaNome =
                    empresa?.nome ||
                    "";

                empresaCnpj =
                    empresa?.cnpj ||
                    "";

                tipoDocumentoEmpresa =
                    registro
                        ?.titulo_documento ||
                    registro
                        ?.tipo_documento ||
                    registro
                        ?.nome_original ||
                    registro
                        ?.nome_arquivo ||
                    "Documento da Certidão Mensal";

                origemIdentificacao =
                    origemRegistro;
            }


            if (
                arquivo.bucket ===
                "dds-assinados"
            ) {
                const registro =
                    ddsDocumentosPorCaminho[
                        chave
                    ] ||
                    null;

                const empresa =
                    registro?.empresa_id
                        ? empresasPorId[
                            registro.empresa_id
                        ]
                        : null;

                emUso =
                    Boolean(
                        registro
                    );

                origemRegistro =
                    registro
                        ?.origemStorageAuditoria ||
                    "";

                registroId =
                    registro?.id ||
                    "";

                empresaNome =
                    empresa?.nome ||
                    registro
                        ?.empresa_nome ||
                    "";

                empresaCnpj =
                    empresa?.cnpj ||
                    "";

                tipoDocumentoEmpresa =
                    registro?.codigo_dds
                        ? (
                            "DDS " +
                            registro.codigo_dds
                        )
                        : "Documento assinado de DDS";

                origemIdentificacao =
                    origemRegistro;
            }


            if (
                arquivo.bucket ===
                "mapas-obras"
            ) {
                const mapaGeral =
                    mapasObrasPorCaminho[
                        chave
                    ] ||
                    null;

                const mapaPonto =
                    mapasPontosPorCaminho[
                        chave
                    ] ||
                    null;

                const registro =
                    mapaGeral ||
                    mapaPonto ||
                    null;

                const empresa =
                    registro?.empresa_id
                        ? empresasPorId[
                            registro.empresa_id
                        ]
                        : null;

                emUso =
                    Boolean(
                        registro
                    );

                origemRegistro =
                    registro
                        ?.origemStorageAuditoria ||
                    "";

                registroId =
                    registro?.id ||
                    "";

                empresaNome =
                    empresa?.nome ||
                    "";

                empresaCnpj =
                    empresa?.cnpj ||
                    "";

                tipoDocumentoEmpresa =
                    mapaGeral
                        ? (
                            "Planta geral" +
                            (
                                mapaGeral.nome
                                    ? (
                                        " — " +
                                        mapaGeral.nome
                                    )
                                    : ""
                            )
                        )
                        : mapaPonto
                            ? (
                                "Planta detalhada" +
                                (
                                    mapaPonto.nome
                                        ? (
                                            " — " +
                                            mapaPonto.nome
                                        )
                                        : ""
                                )
                            )
                            : "Planta de obra";

                origemIdentificacao =
                    origemRegistro;
            }


            /*
             * Uma verificação documental também protege
             * o arquivo físico referenciado.
             */
            if (
                !emUso &&
                !ativoSistema &&
                verificacoesPorCaminho[
                    chave
                ]
            ) {
                const verificacao =
                    verificacoesPorCaminho[
                        chave
                    ];

                const empresa =
                    verificacao?.empresa_id
                        ? empresasPorId[
                            verificacao
                                .empresa_id
                        ]
                        : null;

                const colaborador =
                    verificacao
                        ?.colaborador_id
                        ? colaboradoresPorId[
                            verificacao
                                .colaborador_id
                        ]
                        : null;

                emUso = true;

                origemRegistro =
                    "Verificações documentais";

                registroId =
                    verificacao?.id ||
                    "";

                empresaNome =
                    empresa?.nome ||
                    empresaNome;

                empresaCnpj =
                    empresa?.cnpj ||
                    empresaCnpj;

                colaboradorNome =
                    colaborador?.nome ||
                    colaboradorNome;

                colaboradorEmpresa =
                    colaborador
                        ?.empresaExibicao ||
                    colaborador?.empresa ||
                    colaboradorEmpresa;

                tipoDocumentoEmpresa =
                    verificacao
                        ?.nome_documento ||
                    verificacao
                        ?.tipo_documento ||
                    tipoDocumentoEmpresa;

                origemIdentificacao =
                    origemRegistro;
            }


            return {
                ...arquivo,
                origemTipo: ativoSistemaStorage?.origemTipo || arquivo.origemTipo,
                tabelaOrigem: ativoSistemaStorage?.tabelaOrigem || arquivo.tabelaOrigem,
                ativoSistema,
                protegidoSistema: ativoSistema,
                pasta,
                pastaColaborador: primeiraPasta,
                pastaTreinamento: segundaPasta,
                treinamentoNome,
                colaboradorNome,
                colaboradorCodigo,
                colaboradorEmpresa,
                empresaNome,
                empresaCnpj,
                tipoDocumentoEmpresa,
                origemColaborador: origemIdentificacao,
                origemRegistro,
                registroId,
                emUso,
            };
        })
        .sort((a, b) =>
            a.bucket.localeCompare(b.bucket) ||
            Number(a.emUso) - Number(b.emUso) ||
            a.caminho.localeCompare(b.caminho)
        );
}

export async function excluirArquivoStorageAuditoriaService({ supabase, arquivo } = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para excluir arquivo do Storage.");
    }

    if (!arquivo?.caminho) {
        throw new Error("Arquivo inválido para exclusão.");
    }

    const ativoSistemaStorage = obterAtivoSistemaStorage(
        arquivo.bucket,
        arquivo.caminho
    );

    if (ativoSistemaStorage) {
        throw new Error(`Exclusão bloqueada: ${ativoSistemaStorage.tipo} é um ativo global protegido do sistema.`);
    }

    if (arquivo.emUso) {
        throw new Error(`Este arquivo está em uso em: ${arquivo.origemTipo || arquivo.tabelaOrigem || "base do sistema"}. Para evitar quebrar o histórico, exclua primeiro o registro vinculado.`);
    }

    const { error } = await supabase.storage
        .from(arquivo.bucket || "certificados-treinamentos")
        .remove([arquivo.caminho]);

    if (error) {
        throw new Error(`Erro ao excluir arquivo do Storage: ${error.message}`);
    }

    return true;
}
