import {
    avaliarTreinamentosColaborador,
    calcularVencimentoTreinamento,
    obterTreinamento,
    statusDocumento,
    treinamentoSemValidade,
} from "./colaboradorDocumentosService.js";

import {
    obterUltimaVerificacaoDocumental,
    verificarCertificadoTreinamento,
} from "./documentosVerificacaoService.js";

import {
    buscarEvidenciaCorrentePorSha256Service,
    calcularSha256ArquivoCertificadoService,
    listarEvidenciasCertificadosEmLoteService,
    normalizarEvidenciaCertificado,
} from "./certificadosEvidenciasService.js";

export const TREINAMENTOS_REVISAO_MOTOR_VERSAO =
    "treinamentos-revisao-motor-i2-p1-r4";

export const TREINAMENTOS_REVISAO_STATUS =
    Object.freeze({
        CONFORME:
            "CONFORME",
        ATENCAO:
            "ATENÇÃO",
        VENCIDO:
            "VENCIDO",
        DIVERGENTE:
            "DIVERGENTE",
        SEM_EVIDENCIA_SUFICIENTE:
            "SEM EVIDÊNCIA SUFICIENTE",
        REVISAO_MANUAL_NECESSARIA:
            "REVISÃO MANUAL NECESSÁRIA",
    });

export const TREINAMENTOS_REVISAO_DIVERGENCIAS =
    Object.freeze({
        IDENTIDADE_DIVERGENTE:
            "IDENTIDADE DIVERGENTE",
        POSSIVEL_OUTRO_COLABORADOR:
            "POSSÍVEL OUTRO COLABORADOR",
        DOCUMENTO_INCOMPATIVEL:
            "DOCUMENTO INCOMPATÍVEL",
        TREINAMENTO_DIVERGENTE:
            "TREINAMENTO DIVERGENTE",
        VINCULO_EVIDENCIA_SUSPEITO:
            "VÍNCULO DE EVIDÊNCIA SUSPEITO",
        DUPLICIDADE_SHA:
            "DUPLICIDADE POR SHA",
        DUPLICIDADE_LOGICA:
            "DUPLICIDADE LÓGICA",
        DIVERGENCIA_TEMPORAL:
            "DIVERGÊNCIA TEMPORAL",
        DATA_INSUFICIENTE:
            "DATA INSUFICIENTE",
        EVIDENCIA_INSUFICIENTE:
            "EVIDÊNCIA INSUFICIENTE",
        REGRA_NAO_RECONHECIDA:
            "REGRA NÃO RECONHECIDA",
    });

const CODIGOS_DOCUMENTAIS_NAO_TREINAMENTO =
    Object.freeze([
        14, // Ficha de EPI.
        15, // Ordem de Serviço.
        21, // Ficha/registro do empregado.
        22, // ASO.
    ]);

function textoSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    ).trim();
}

function textoNormalizado(
    valor = ""
) {
    return textoSeguro(
        valor
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase();
}

function inteiroPositivo(
    valor
) {
    const numero =
        Number(
            valor
        );

    return (
        Number.isInteger(
            numero
        ) &&
        numero > 0
    )
        ? numero
        : null;
}

function dataIso(
    valor
) {
    const texto =
        textoSeguro(
            valor
        )
            .slice(
                0,
                10
            );

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            texto
        )
    ) {
        return "";
    }

    const data =
        new Date(
            `${texto}T00:00:00.000Z`
        );

    if (
        Number.isNaN(
            data.getTime()
        ) ||
        data.toISOString()
            .slice(
                0,
                10
            ) !==
            texto
    ) {
        return "";
    }

    return texto;
}

function obterCertificadoId(
    certificado = {}
) {
    return (
        certificado?.id ||
        certificado?.certificado_id ||
        certificado?.certificadoId ||
        null
    );
}

function obterTreinamentoCodigoCertificado(
    certificado = {}
) {
    return inteiroPositivo(
        certificado?.treinamentoId ??
        certificado?.treinamento_codigo ??
        certificado?.treinamentoCodigo ??
        certificado?.codigo_treinamento ??
        certificado?.codigoTreinamento ??
        certificado?.treinamento?.id
    );
}

function obterDataRealizacaoCertificado(
    certificado = {}
) {
    return dataIso(
        certificado?.realizado ||
        certificado?.data_realizacao ||
        certificado?.dataRealizacao ||
        certificado?.realizacao
    );
}

function obterDataVencimentoCertificado(
    certificado = {}
) {
    return dataIso(
        certificado?.vencimento ||
        certificado?.data_vencimento ||
        certificado?.dataVencimento
    );
}

function obterArquivoUrlCertificado(
    certificado = {}
) {
    return textoSeguro(
        certificado?.arquivoUrl ||
        certificado?.arquivo_url ||
        certificado?.url_do_arquivo ||
        certificado?.urlDoArquivo
    );
}

function obterArquivoNomeCertificado(
    certificado = {}
) {
    return textoSeguro(
        certificado?.arquivo ||
        certificado?.arquivoNome ||
        certificado?.arquivo_nome ||
        certificado?.nomeArquivo ||
        certificado?.nome_arquivo
    );
}

function codigoEhDocumentoNaoTreinamento(
    codigo
) {
    return (
        CODIGOS_DOCUMENTAIS_NAO_TREINAMENTO
            .includes(
                Number(
                    codigo
                )
            )
    );
}

function treinamentoCodigoReconhecido(
    codigo,
    treinamento = null
) {
    const id =
        inteiroPositivo(
            codigo
        );

    if (!id) {
        return false;
    }

    const registro =
        treinamento ||
        obterTreinamento(
            id
        );

    return (
        textoNormalizado(
            registro?.nome
        ) !==
        "treinamento nao cadastrado"
    );
}

function chaveTreinamentoLogico(
    certificado = {}
) {
    const codigo =
        obterTreinamentoCodigoCertificado(
            certificado
        );

    if (codigo) {
        return `treinamento:${codigo}`;
    }

    const certificadoId =
        obterCertificadoId(
            certificado
        );

    return certificadoId
        ? `certificado:${certificadoId}`
        : "";
}

function ordenarCertificadosMaisRecentes(
    certificados = []
) {
    return [
        ...certificados,
    ].sort(
        (a, b) => {
            const dataA =
                obterDataRealizacaoCertificado(
                    a
                ) ||
                dataIso(
                    a?.created_at ||
                    a?.createdAt
                );

            const dataB =
                obterDataRealizacaoCertificado(
                    b
                ) ||
                dataIso(
                    b?.created_at ||
                    b?.createdAt
                );

            return dataB.localeCompare(
                dataA
            );
        }
    );
}

function normalizarEvidenciaSegura(
    evidencia = {}
) {
    try {
        return normalizarEvidenciaCertificado(
            evidencia
        );
    } catch {
        return {
            ...evidencia,

            id:
                evidencia?.id ||
                null,

            certificadoOrigemId:
                evidencia?.certificadoOrigemId ||
                evidencia?.certificado_origem_id ||
                null,

            colaboradorId:
                evidencia?.colaboradorId ||
                evidencia?.colaborador_id ||
                null,

            treinamentoCodigo:
                inteiroPositivo(
                    evidencia?.treinamentoCodigo ??
                    evidencia?.treinamento_codigo
                ),

            tipoEvidencia:
                textoSeguro(
                    evidencia?.tipoEvidencia ||
                    evidencia?.tipo_evidencia
                ),

            tipoEvidenciaReconhecido:
                false,

            arquivoUrl:
                textoSeguro(
                    evidencia?.arquivoUrl ||
                    evidencia?.arquivo_url
                ),

            arquivoNome:
                textoSeguro(
                    evidencia?.arquivoNome ||
                    evidencia?.arquivo_nome
                ),

            arquivoSha256:
                textoSeguro(
                    evidencia?.arquivoSha256 ||
                    evidencia?.arquivo_sha256
                ),

            historica:
                evidencia?.historica ===
                true,
        };
    }
}

function obterCertificadoOrigemEvidencia(
    evidencia = {}
) {
    return (
        evidencia?.certificadoOrigemId ||
        evidencia?.certificado_origem_id ||
        null
    );
}

function obterTreinamentoCodigoEvidencia(
    evidencia = {}
) {
    return inteiroPositivo(
        evidencia?.treinamentoCodigo ??
        evidencia?.treinamento_codigo
    );
}

function obterColaboradorIdEvidencia(
    evidencia = {}
) {
    return (
        evidencia?.colaboradorId ||
        evidencia?.colaborador_id ||
        null
    );
}

function tipoEvidenciaReconhecidoSeguro(
    evidencia = {}
) {
    return evidencia
        ?.tipoEvidenciaReconhecido ===
        true;
}

function obterShaEvidencia(
    evidencia = {}
) {
    return textoSeguro(
        evidencia?.arquivoSha256 ||
        evidencia?.arquivo_sha256
    )
        .toLowerCase();
}

function obterUrlEvidencia(
    evidencia = {}
) {
    return textoSeguro(
        evidencia?.arquivoUrl ||
        evidencia?.arquivo_url
    );
}

function chaveFisicaEvidencia(
    evidencia = {}
) {
    const sha =
        obterShaEvidencia(
            evidencia
        );

    if (sha) {
        return `sha256:${sha}`;
    }

    const url =
        obterUrlEvidencia(
            evidencia
        );

    if (url) {
        return `url:${url}`;
    }

    if (evidencia?.id) {
        return `id:${evidencia.id}`;
    }

    return "";
}

function criarEvidenciaFallbackCertificado(
    certificado = {}
) {
    const arquivoUrl =
        obterArquivoUrlCertificado(
            certificado
        );

    if (!arquivoUrl) {
        return null;
    }

    return {
        id:
            obterCertificadoId(
                certificado
            )
                ? `fallback-${obterCertificadoId(certificado)}`
                : null,

        certificadoOrigemId:
            obterCertificadoId(
                certificado
            ),

        treinamentoCodigo:
            obterTreinamentoCodigoCertificado(
                certificado
            ),

        tipoEvidencia:
            "documento_principal_legado",

        tipoEvidenciaReconhecido:
            true,

        principal:
            true,

        historica:
            false,

        arquivoUrl,

        arquivoNome:
            obterArquivoNomeCertificado(
                certificado
            ),

        arquivoSha256:
            "",

        origem:
            "certificado_fallback_readonly",
    };
}

function criarMapaUltimaVerificacao(
    verificacoes = []
) {
    const mapa =
        new Map();

    const itens =
        Array.isArray(
            verificacoes
        )
            ? [...verificacoes]
            : [];

    itens.sort(
        (a, b) => {
            const dataA =
                textoSeguro(
                    a?.created_at ||
                    a?.createdAt ||
                    a?.updated_at ||
                    a?.updatedAt
                );

            const dataB =
                textoSeguro(
                    b?.created_at ||
                    b?.createdAt ||
                    b?.updated_at ||
                    b?.updatedAt
                );

            return dataB.localeCompare(
                dataA
            );
        }
    );

    for (const verificacao of itens) {
        const documentoId =
            verificacao?.documentoId ||
            verificacao?.documento_id ||
            verificacao?.origemId ||
            verificacao?.origem_id ||
            verificacao?.certificadoId ||
            verificacao?.certificado_id ||
            null;

        if (
            !documentoId ||
            mapa.has(
                String(
                    documentoId
                )
            )
        ) {
            continue;
        }

        mapa.set(
            String(
                documentoId
            ),
            verificacao
        );
    }

    return mapa;
}

function textoVerificacao(
    verificacao = {}
) {
    return textoNormalizado(
        JSON.stringify({
            status:
                verificacao?.statusVerificacao ||
                verificacao?.status_verificacao ||
                verificacao?.status ||
                "",

            risco:
                verificacao?.nivelRisco ||
                verificacao?.nivel_risco ||
                "",

            resumo:
                verificacao?.resumo ||
                "",

            indicios:
                verificacao?.indicios ||
                [],

            recomendacoes:
                verificacao?.recomendacoes ||
                [],

            observacao:
                verificacao?.observacaoManual ||
                verificacao?.observacao_manual ||
                "",
        })
    );
}

function obterDivergenciasDaVerificacao(
    verificacao = {}
) {
    const texto =
        textoVerificacao(
            verificacao
        );

    const divergencias =
        new Set();

    if (
        /outro colaborador|outra pessoa|colaborador diferente/.test(
            texto
        )
    ) {
        divergencias.add(
            TREINAMENTOS_REVISAO_DIVERGENCIAS
                .POSSIVEL_OUTRO_COLABORADOR
        );
    }

    if (
        /(cpf|identidade|nome|colaborador).{0,80}(diverg|incompativ|nao corresponde)/.test(
            texto
        )
    ) {
        divergencias.add(
            TREINAMENTOS_REVISAO_DIVERGENCIAS
                .IDENTIDADE_DIVERGENTE
        );
    }

    if (
        /treinamento.{0,80}(diverg|incompativ|nao corresponde|incorreto)/.test(
            texto
        )
    ) {
        divergencias.add(
            TREINAMENTOS_REVISAO_DIVERGENCIAS
                .TREINAMENTO_DIVERGENTE
        );
    }

    if (
        /ficha de epi|atestado de saude|aso.{0,40}treinamento|documento incompativ|tipo de documento.{0,60}diverg/.test(
            texto
        )
    ) {
        divergencias.add(
            TREINAMENTOS_REVISAO_DIVERGENCIAS
                .DOCUMENTO_INCOMPATIVEL
        );
    }

    if (
        /(vinculo|vinculada|vinculado).{0,80}(suspeit|errad|diverg|incompativ)/.test(
            texto
        )
    ) {
        divergencias.add(
            TREINAMENTOS_REVISAO_DIVERGENCIAS
                .VINCULO_EVIDENCIA_SUSPEITO
        );
    }

    if (
        /data.{0,80}(diverg|incompativ|nao corresponde)|vencimento.{0,80}diverg/.test(
            texto
        )
    ) {
        divergencias.add(
            TREINAMENTOS_REVISAO_DIVERGENCIAS
                .DIVERGENCIA_TEMPORAL
        );
    }

    return Array.from(
        divergencias
    );
}

function verificacaoExigeRevisaoManual(
    verificacao = {},
    divergenciasIdentificadas = []
) {
    const status =
        textoNormalizado(
            verificacao?.statusVerificacao ||
            verificacao?.status_verificacao ||
            verificacao?.status
        );

    if (
        status.includes(
            "revisao_manual"
        ) ||
        status.includes(
            "revisao manual"
        ) ||
        status ===
            "erro" ||
        status ===
            "pendente"
    ) {
        return true;
    }

    if (
        status ===
            "bloqueado" ||
        status ===
            "suspeito"
    ) {
        return !Array.isArray(
            divergenciasIdentificadas
        ) ||
        divergenciasIdentificadas.length ===
            0;
    }

    return false;
}

function statusTemporalParaRevisao(
    status = {}
) {
    const chave =
        textoNormalizado(
            status?.chave
        );

    if (
        chave.includes(
            "vencido"
        )
    ) {
        return TREINAMENTOS_REVISAO_STATUS
            .VENCIDO;
    }

    if (
        chave.includes(
            "atenc"
        ) ||
        chave.includes(
            "vencendo"
        ) ||
        chave.includes(
            "vencer"
        ) ||
        chave.includes(
            "avencer"
        )
    ) {
        return TREINAMENTOS_REVISAO_STATUS
            .ATENCAO;
    }

    if (
        chave.includes(
            "emdia"
        ) ||
        chave.includes(
            "semvalidade"
        )
    ) {
        return TREINAMENTOS_REVISAO_STATUS
            .CONFORME;
    }

    return TREINAMENTOS_REVISAO_STATUS
        .REVISAO_MANUAL_NECESSARIA;
}

function calcularPercentual(
    parte,
    total
) {
    if (
        !Number.isFinite(
            total
        ) ||
        total <= 0
    ) {
        return 0;
    }

    return Math.round(
        (
            Number(
                parte
            ) /
            total
        ) *
        100
    );
}

function obterAvaliacaoCanonicaSegura(
    colaborador = {}
) {
    try {
        return {
            resultado:
                avaliarTreinamentosColaborador(
                    colaborador
                ),

            erro:
                null,
        };
    } catch (error) {
        return {
            resultado:
                null,

            erro:
                textoSeguro(
                    error?.message ||
                    error
                ),
        };
    }
}

export function obterDependenciasCanonicasRevisaoTreinamentos() {
    return Object.freeze({
        avaliarTreinamentosColaborador,
        treinamentoSemValidade,
        statusDocumento,
        obterTreinamento,
        calcularVencimentoTreinamento,
        verificarCertificadoTreinamento,
        obterUltimaVerificacaoDocumental,
        normalizarEvidenciaCertificado,
        listarEvidenciasCertificadosEmLoteService,
        calcularSha256ArquivoCertificadoService,
        buscarEvidenciaCorrentePorSha256Service,
    });
}

export function montarRevisaoTreinamentosReadOnly({
    colaborador = {},
    certificados = [],
    evidencias = [],
    verificacoes = [],
} = {}) {
    const certificadosEntrada =
        Array.isArray(
            certificados
        )
            ? certificados.filter(
                Boolean
            )
            : [];

    const evidenciasEntrada =
        Array.isArray(
            evidencias
        )
            ? evidencias
                .filter(
                    Boolean
                )
                .map(
                    normalizarEvidenciaSegura
                )
                .filter(
                    (item) =>
                        item?.historica !==
                        true
                )
            : [];

    const grupos =
        new Map();

    const certificadoParaGrupo =
        new Map();

    const ignoradosDocumentais =
        [];

    for (const certificado of certificadosEntrada) {
        const codigo =
            obterTreinamentoCodigoCertificado(
                certificado
            );

        if (
            codigo &&
            codigoEhDocumentoNaoTreinamento(
                codigo
            )
        ) {
            ignoradosDocumentais.push({
                certificadoId:
                    obterCertificadoId(
                        certificado
                    ),

                treinamentoCodigo:
                    codigo,

                motivo:
                    "DOCUMENTO_NAO_E_TREINAMENTO_LOGICO",
            });

            continue;
        }

        const chave =
            chaveTreinamentoLogico(
                certificado
            );

        if (!chave) {
            ignoradosDocumentais.push({
                certificadoId:
                    obterCertificadoId(
                        certificado
                    ),

                treinamentoCodigo:
                    codigo,

                motivo:
                    "TREINAMENTO_LOGICO_NAO_IDENTIFICADO",
            });

            continue;
        }

        if (
            !grupos.has(
                chave
            )
        ) {
            grupos.set(
                chave,
                {
                    chave,
                    treinamentoCodigo:
                        codigo,
                    certificados:
                        [],
                    evidencias:
                        [],
                }
            );
        }

        const grupo =
            grupos.get(
                chave
            );

        grupo.certificados.push(
            certificado
        );

        const certificadoId =
            obterCertificadoId(
                certificado
            );

        if (certificadoId) {
            certificadoParaGrupo.set(
                String(
                    certificadoId
                ),
                chave
            );
        }
    }

    for (const evidencia of evidenciasEntrada) {
        const certificadoOrigemId =
            obterCertificadoOrigemEvidencia(
                evidencia
            );

        let chave =
            certificadoOrigemId
                ? certificadoParaGrupo.get(
                    String(
                        certificadoOrigemId
                    )
                )
                : null;

        if (!chave) {
            const codigo =
                obterTreinamentoCodigoEvidencia(
                    evidencia
                );

            if (
                codigo &&
                !codigoEhDocumentoNaoTreinamento(
                    codigo
                )
            ) {
                const candidata =
                    `treinamento:${codigo}`;

                if (
                    grupos.has(
                        candidata
                    )
                ) {
                    chave =
                        candidata;
                }
            }
        }

        if (
            !chave ||
            !grupos.has(
                chave
            )
        ) {
            continue;
        }

        const grupo =
            grupos.get(
                chave
            );

        const chaveFisica =
            chaveFisicaEvidencia(
                evidencia
            );

        const duplicadaNoMesmoTreinamento =
            Boolean(
                chaveFisica
            ) &&
            grupo.evidencias.some(
                (item) =>
                    chaveFisicaEvidencia(
                        item
                    ) ===
                    chaveFisica
            );

        if (
            !duplicadaNoMesmoTreinamento
        ) {
            grupo.evidencias.push(
                evidencia
            );
        }
    }

    for (const grupo of grupos.values()) {
        if (
            grupo.evidencias.length >
            0
        ) {
            continue;
        }

        const certificadoPrincipal =
            ordenarCertificadosMaisRecentes(
                grupo.certificados
            )[0];

        const fallback =
            criarEvidenciaFallbackCertificado(
                certificadoPrincipal
            );

        if (fallback) {
            grupo.evidencias.push(
                fallback
            );
        }
    }

    const shaParaGrupos =
        new Map();

    for (const grupo of grupos.values()) {
        for (const evidencia of grupo.evidencias) {
            const sha =
                obterShaEvidencia(
                    evidencia
                );

            if (!sha) {
                continue;
            }

            const chaves =
                shaParaGrupos.get(
                    sha
                ) ||
                new Set();

            chaves.add(
                grupo.chave
            );

            shaParaGrupos.set(
                sha,
                chaves
            );
        }
    }

    const mapaVerificacoes =
        criarMapaUltimaVerificacao(
            verificacoes
        );

    const itens =
        [];

    for (const grupo of grupos.values()) {
        const certificadosOrdenados =
            ordenarCertificadosMaisRecentes(
                grupo.certificados
            );

        const certificadoPrincipal =
            certificadosOrdenados[0] ||
            {};

        const certificadoId =
            obterCertificadoId(
                certificadoPrincipal
            );

        const codigo =
            grupo.treinamentoCodigo ||
            obterTreinamentoCodigoCertificado(
                certificadoPrincipal
            );

        const treinamento =
            codigo
                ? obterTreinamento(
                    codigo
                )
                : null;

        const treinamentoReconhecido =
            treinamentoCodigoReconhecido(
                codigo,
                treinamento
            );

        const dataRealizacao =
            obterDataRealizacaoCertificado(
                certificadoPrincipal
            );

        const vencimentoPersistido =
            obterDataVencimentoCertificado(
                certificadoPrincipal
            );

        const semValidade =
            codigo
                ? treinamentoSemValidade(
                    codigo
                )
                : false;

        const vencimentoCanonico =
            (
                codigo &&
                dataRealizacao
            )
                ? dataIso(
                    calcularVencimentoTreinamento(
                        codigo,
                        dataRealizacao
                    )
                )
                : "";

        const vencimentoReferencia =
            vencimentoCanonico ||
            vencimentoPersistido;

        const divergencias =
            new Set();

        const semEvidencia =
            grupo.evidencias.length ===
            0;

        if (
            !codigo ||
            !treinamentoReconhecido
        ) {
            divergencias.add(
                TREINAMENTOS_REVISAO_DIVERGENCIAS
                    .REGRA_NAO_RECONHECIDA
            );
        }

        if (
            certificadosOrdenados.length >
            1
        ) {
            divergencias.add(
                TREINAMENTOS_REVISAO_DIVERGENCIAS
                    .DUPLICIDADE_LOGICA
            );
        }

        if (
            !semEvidencia &&
            !dataRealizacao
        ) {
            divergencias.add(
                TREINAMENTOS_REVISAO_DIVERGENCIAS
                    .DATA_INSUFICIENTE
            );
        }

        if (
            semValidade &&
            vencimentoPersistido
        ) {
            divergencias.add(
                TREINAMENTOS_REVISAO_DIVERGENCIAS
                    .DIVERGENCIA_TEMPORAL
            );
        } else if (
            !semValidade &&
            dataRealizacao &&
            vencimentoCanonico &&
            (
                !vencimentoPersistido ||
                vencimentoPersistido !==
                    vencimentoCanonico
            )
        ) {
            divergencias.add(
                TREINAMENTOS_REVISAO_DIVERGENCIAS
                    .DIVERGENCIA_TEMPORAL
            );
        }

        if (semEvidencia) {
            divergencias.add(
                TREINAMENTOS_REVISAO_DIVERGENCIAS
                    .EVIDENCIA_INSUFICIENTE
            );
        }

        const certificadosIdsGrupo =
            new Set(
                certificadosOrdenados
                    .map(
                        obterCertificadoId
                    )
                    .filter(
                        Boolean
                    )
                    .map(
                        String
                    )
            );

        for (const evidencia of grupo.evidencias) {
            const colaboradorIdEvidencia =
                obterColaboradorIdEvidencia(
                    evidencia
                );

            if (
                colaborador?.id &&
                colaboradorIdEvidencia &&
                String(
                    colaboradorIdEvidencia
                ) !==
                String(
                    colaborador.id
                )
            ) {
                divergencias.add(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .IDENTIDADE_DIVERGENTE
                );

                divergencias.add(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .VINCULO_EVIDENCIA_SUSPEITO
                );
            }

            const codigoEvidencia =
                obterTreinamentoCodigoEvidencia(
                    evidencia
                );

            if (
                codigo &&
                codigoEvidencia &&
                codigoEvidencia !==
                    codigo
            ) {
                divergencias.add(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .TREINAMENTO_DIVERGENTE
                );

                divergencias.add(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .VINCULO_EVIDENCIA_SUSPEITO
                );
            }

            const certificadoOrigemEvidencia =
                obterCertificadoOrigemEvidencia(
                    evidencia
                );

            if (
                certificadoOrigemEvidencia &&
                certificadosIdsGrupo.size >
                    0 &&
                !certificadosIdsGrupo.has(
                    String(
                        certificadoOrigemEvidencia
                    )
                )
            ) {
                divergencias.add(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .VINCULO_EVIDENCIA_SUSPEITO
                );
            }

            if (
                !tipoEvidenciaReconhecidoSeguro(
                    evidencia
                )
            ) {
                divergencias.add(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .DOCUMENTO_INCOMPATIVEL
                );
            }

            const sha =
                obterShaEvidencia(
                    evidencia
                );

            const gruposMesmoSha =
                sha
                    ? shaParaGrupos.get(
                        sha
                    )
                    : null;

            if (
                gruposMesmoSha &&
                gruposMesmoSha.size >
                    1
            ) {
                divergencias.add(
                    TREINAMENTOS_REVISAO_DIVERGENCIAS
                        .DUPLICIDADE_SHA
                );
            }
        }

        const verificacao =
            certificadoId
                ? (
                    mapaVerificacoes.get(
                        String(
                            certificadoId
                        )
                    ) ||
                    null
                )
                : null;

        const divergenciasVerificacao =
            obterDivergenciasDaVerificacao(
                verificacao ||
                {}
            );

        for (
            const divergencia
            of divergenciasVerificacao
        ) {
            divergencias.add(
                divergencia
            );
        }

        let statusTemporal = {
            chave:
                "indefinido",
            texto:
                "Indefinido",
        };

        if (
            codigo &&
            treinamentoReconhecido
        ) {
            statusTemporal =
                statusDocumento(
                    vencimentoReferencia,
                    semValidade
                );
        }

        let statusRevisao =
            statusTemporalParaRevisao(
                statusTemporal
            );

        const revisaoManual =
            (
                !codigo ||
                !treinamentoReconhecido ||
                (
                    !semEvidencia &&
                    !dataRealizacao
                ) ||
                (
                    !semEvidencia &&
                    statusRevisao ===
                        TREINAMENTOS_REVISAO_STATUS
                            .REVISAO_MANUAL_NECESSARIA
                ) ||
                verificacaoExigeRevisaoManual(
                    verificacao ||
                    {},
                    divergenciasVerificacao
                )
            );

        if (revisaoManual) {
            statusRevisao =
                TREINAMENTOS_REVISAO_STATUS
                    .REVISAO_MANUAL_NECESSARIA;
        } else if (
            grupo.evidencias.length ===
            0
        ) {
            statusRevisao =
                TREINAMENTOS_REVISAO_STATUS
                    .SEM_EVIDENCIA_SUFICIENTE;
        } else if (
            divergencias.size >
            0
        ) {
            statusRevisao =
                TREINAMENTOS_REVISAO_STATUS
                    .DIVERGENTE;
        }

        itens.push({
            chave:
                grupo.chave,

            treinamentoCodigo:
                codigo,

            treinamentoNome:
                textoSeguro(
                    treinamento?.nome ||
                    certificadoPrincipal
                        ?.nome_treinamento ||
                    certificadoPrincipal
                        ?.tipo_treinamento
                ),

            treinamentoReconhecido,

            certificadoPrincipalId:
                certificadoId,

            certificadosLogicosOrigem:
                certificadosOrdenados.map(
                    (item) =>
                        obterCertificadoId(
                            item
                        )
                )
                    .filter(
                        Boolean
                    ),

            quantidadeRegistrosCertificado:
                certificadosOrdenados.length,

            quantidadeEvidencias:
                grupo.evidencias.length,

            evidencias:
                grupo.evidencias.map(
                    (item) => ({
                        ...item,
                    })
                ),

            dataRealizacao,

            vencimentoPersistido,

            vencimentoCanonico,

            semValidade,

            statusTemporal: {
                chave:
                    textoSeguro(
                        statusTemporal?.chave
                    ),

                texto:
                    textoSeguro(
                        statusTemporal?.texto
                    ),
            },

            verificacaoDocumental:
                verificacao,

            divergencias:
                Array.from(
                    divergencias
                ),

            statusRevisao,

            requerRevisaoHumana:
                statusRevisao ===
                    TREINAMENTOS_REVISAO_STATUS
                        .DIVERGENTE ||
                statusRevisao ===
                    TREINAMENTOS_REVISAO_STATUS
                        .REVISAO_MANUAL_NECESSARIA ||
                statusRevisao ===
                    TREINAMENTOS_REVISAO_STATUS
                        .SEM_EVIDENCIA_SUFICIENTE,

            readOnly:
                true,
        });
    }

    itens.sort(
        (a, b) => {
            const codigoA =
                Number(
                    a?.treinamentoCodigo ||
                    Number.MAX_SAFE_INTEGER
                );

            const codigoB =
                Number(
                    b?.treinamentoCodigo ||
                    Number.MAX_SAFE_INTEGER
                );

            if (
                codigoA !==
                codigoB
            ) {
                return codigoA - codigoB;
            }

            return textoSeguro(
                a?.treinamentoNome
            ).localeCompare(
                textoSeguro(
                    b?.treinamentoNome
                ),
                "pt-BR"
            );
        }
    );

    const resumo =
        Object.values(
            TREINAMENTOS_REVISAO_STATUS
        )
            .reduce(
                (
                    acumulado,
                    status
                ) => {
                    acumulado[
                        status
                    ] =
                        itens.filter(
                            (item) =>
                                item
                                    .statusRevisao ===
                                status
                        ).length;

                    return acumulado;
                },
                {}
            );

    const conformes =
        resumo[
            TREINAMENTOS_REVISAO_STATUS
                .CONFORME
        ] ||
        0;

    const avaliacaoCanonica =
        obterAvaliacaoCanonicaSegura(
            colaborador
        );

    return {
        versaoMotor:
            TREINAMENTOS_REVISAO_MOTOR_VERSAO,

        readOnly:
            true,

        colaboradorId:
            colaborador?.id ||
            null,

        totalTreinamentosLogicos:
            itens.length,

        denominadorTreinamentos:
            itens.length,

        percentualConformidade:
            calcularPercentual(
                conformes,
                itens.length
            ),

        resumo,

        itens,

        ignoradosDocumentais,

        avaliacaoCanonicaAtual:
            avaliacaoCanonica
                .resultado,

        avaliacaoCanonicaErro:
            avaliacaoCanonica
                .erro,

        requerRevisaoHumana:
            itens.some(
                (item) =>
                    item
                        .requerRevisaoHumana
            ),
    };
}
