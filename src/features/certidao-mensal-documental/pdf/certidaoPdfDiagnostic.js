import {
    obterDataReferenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";

import {
    validarArquivoCertidaoPdf,
} from "./certidaoPdfFileValidator.js";
import {
    calcularHashSha256CertidaoPdf,
} from "./certidaoPdfHashService.js";
import {
    extrairTextoCertidaoPdfLocal,
} from "./certidaoPdfTextExtractor.js";
import {
    executarPreAvaliacaoDocumental,
} from "../analysis/certidaoDocumentPreAssessment.js";

export const CERTIDAO_PDF_DIAGNOSTICO_STATUS =
    Object.freeze({
        VALIDANDO_ARQUIVO:
            "validando_arquivo",
        CALCULANDO_HASH:
            "calculando_hash",
        EXTRAINDO_TEXTO:
            "extraindo_texto",
        CLASSIFICANDO_DOCUMENTO:
            "classificando_documento",
        CONCLUIDO:
            "concluido",
        FALHA:
            "falha",
    });

function agoraEmMilissegundos() {
    if (
        typeof performance !== "undefined" &&
        typeof performance.now === "function"
    ) {
        return performance.now();
    }

    return Date.now();
}

function emitirProgresso(
    onProgress,
    status,
    percentual,
    mensagem
) {
    if (typeof onProgress !== "function") {
        return;
    }

    try {
        onProgress({
            status,
            percentual,
            mensagem,
            atualizadoEm:
                new Date().toISOString(),
        });
    }
    catch {
        // O callback visual não interfere
        // no processamento documental.
    }
}

function montarAvaliacaoTecnica(leitura = {}) {
    const quantidadeCaracteres =
        Number(
            leitura.quantidadeCaracteres || 0
        );

    const possuiTextoUtil =
        quantidadeCaracteres >= 80;

    const metodo =
        String(
            leitura.metodo || ""
        );

    const veioDeOcr =
        metodo ===
        "ocr_local_tesseract";

    const semTextoConfiavel =
        metodo ===
        "pdf_sem_texto_confiavel" ||
        !possuiTextoUtil;

    return {
        possuiTextoUtil,
        veioDeOcr,
        semTextoConfiavel,
        requerConferenciaHumana:
            Boolean(
                semTextoConfiavel ||
                veioDeOcr ||
                Number(
                    leitura.confianca || 0
                ) < 70
            ),
        prontoParaClassificacao:
            Boolean(
                possuiTextoUtil &&
                !leitura.erro
            ),
        observacao:
            semTextoConfiavel
                ? "O arquivo exige conferência humana porque não foi localizado texto documental suficiente."
                : veioDeOcr
                    ? "O texto foi obtido por OCR local e deve ser conferido visualmente."
                    : "A camada textual do PDF foi localizada. Isso confirma a leitura técnica, não a conformidade documental.",
    };
}

// ============================================================
// SAFE_SCAN_INDIVIDUAL_OCR_ADAPTATIVO_D6
//
// OCR adaptativo somente quando a avaliação estruturada
// indicar déficit de emissão e/ou validade.
//
// CONSULTA_OFICIAL inconclusiva não dispara OCR.
//
// O candidato somente substitui o resultado inicial se reduzir
// o déficit e preservar tipo, CNPJ e regras já aprovadas.
// ============================================================

const REGRAS_TEMPORAIS_ENRIQUECIVEIS_INDIVIDUAL =
    new Set([
        "DATA_EMISSAO",
        "VALIDADE_DOCUMENTO",
    ]);

function textoSeguroIndividual(
    valor = ""
) {
    return String(
        valor ??
        ""
    ).trim();
}

function obterAvaliacaoPreIndividual(
    preAvaliacao
) {
    const avaliacao =
        preAvaliacao?.avaliacao;

    return (
        avaliacao &&
        typeof avaliacao === "object"
    )
        ? avaliacao
        : null;
}

function obterRegrasPreIndividual(
    preAvaliacao
) {
    const avaliacao =
        obterAvaliacaoPreIndividual(
            preAvaliacao
        );

    return Array.isArray(
        avaliacao?.regras
    )
        ? avaliacao.regras
        : [];
}

function contarDeficitsTemporaisIndividual(
    preAvaliacao
) {
    return obterRegrasPreIndividual(
        preAvaliacao
    )
        .filter(
            (regra) =>
                REGRAS_TEMPORAIS_ENRIQUECIVEIS_INDIVIDUAL
                    .has(
                        textoSeguroIndividual(
                            regra?.codigo
                        ).toUpperCase()
                    ) &&
                textoSeguroIndividual(
                    regra?.status
                ).toUpperCase() ===
                    "INCONCLUSIVA"
        )
        .length;
}

export function preAvaliacaoDocumentalRequerEnriquecimentoTemporalIndividual(
    preAvaliacao
) {
    return (
        contarDeficitsTemporaisIndividual(
            preAvaliacao
        ) >
        0
    );
}

function normalizarCnpjIndividual(
    valor
) {
    return textoSeguroIndividual(
        valor
    ).replace(
        /\D/g,
        ""
    );
}

function candidataPreservaRegrasAprovadasIndividual({
    inicial,
    candidata,
}) {
    const regrasIniciais =
        obterRegrasPreIndividual(
            inicial
        );

    const regrasCandidatas =
        obterRegrasPreIndividual(
            candidata
        );

    if (!regrasCandidatas.length) {
        return false;
    }

    const statusCandidatoPorCodigo =
        new Map(
            regrasCandidatas.map(
                (regra) => [
                    textoSeguroIndividual(
                        regra?.codigo
                    ).toUpperCase(),

                    textoSeguroIndividual(
                        regra?.status
                    ).toUpperCase(),
                ]
            )
        );

    for (
        const regra of
        regrasIniciais
    ) {
        const codigo =
            textoSeguroIndividual(
                regra?.codigo
            ).toUpperCase();

        const status =
            textoSeguroIndividual(
                regra?.status
            ).toUpperCase();

        if (
            status !==
            "APROVADA"
        ) {
            continue;
        }

        if (
            statusCandidatoPorCodigo
                .get(
                    codigo
                ) !==
            "APROVADA"
        ) {
            return false;
        }
    }

    return true;
}

export function resultadoEnriquecimentoTemporalIndividualPodeSerAceito({
    inicial,
    candidata,
}) {
    const avaliacaoInicial =
        obterAvaliacaoPreIndividual(
            inicial
        );

    const avaliacaoCandidata =
        obterAvaliacaoPreIndividual(
            candidata
        );

    if (
        !avaliacaoInicial ||
        !avaliacaoCandidata
    ) {
        return false;
    }

    const deficitInicial =
        contarDeficitsTemporaisIndividual(
            inicial
        );

    const deficitCandidato =
        contarDeficitsTemporaisIndividual(
            candidata
        );

    if (
        deficitInicial <= 0 ||
        deficitCandidato >=
            deficitInicial
    ) {
        return false;
    }

    const tipoInicial =
        textoSeguroIndividual(
            inicial
                ?.classificacao
                ?.id
        ).toLowerCase();

    const tipoCandidato =
        textoSeguroIndividual(
            candidata
                ?.classificacao
                ?.id
        ).toLowerCase();

    if (
        tipoInicial &&
        tipoCandidato !==
            tipoInicial
    ) {
        return false;
    }

    const cnpjInicial =
        normalizarCnpjIndividual(
            avaliacaoInicial
                ?.cnpjDocumento
        );

    const cnpjCandidato =
        normalizarCnpjIndividual(
            avaliacaoCandidata
                ?.cnpjDocumento
        );

    if (
        cnpjInicial &&
        cnpjCandidato !==
            cnpjInicial
    ) {
        return false;
    }

    if (
        textoSeguroIndividual(
            avaliacaoCandidata
                ?.nivel
        ).toUpperCase() ===
            "REPROVADA" ||
        avaliacaoCandidata
            ?.documentoIncompativel ===
            true ||
        avaliacaoCandidata
            ?.bloqueiaSubstituicao ===
            true
    ) {
        return false;
    }

    const possuiRegraReprovada =
        obterRegrasPreIndividual(
            candidata
        )
            .some(
                (regra) =>
                    textoSeguroIndividual(
                        regra?.status
                    ).toUpperCase() ===
                        "REPROVADA"
            );

    if (possuiRegraReprovada) {
        return false;
    }

    return candidataPreservaRegrasAprovadasIndividual({
        inicial,
        candidata,
    });
}

function anexarAvisosLeituraIndividual(
    leitura,
    avisos = []
) {
    return {
        ...leitura,

        avisos: [
            ...new Set([
                ...(
                    Array.isArray(
                        leitura?.avisos
                    )
                        ? leitura.avisos
                        : []
                ),

                ...(
                    Array.isArray(
                        avisos
                    )
                        ? avisos
                        : []
                ),
            ].filter(Boolean)),
        ],
    };
}

async function enriquecerTextoTemporalIndividual({
    arquivo,
    textoExtraido,
}) {
    const base = {
        aplicada:
            false,

        texto:
            textoSeguroIndividual(
                textoExtraido
            ),

        textoOcr:
            "",

        paginasOcr:
            [],

        paginasPdfJs:
            [],

        totalPaginas:
            0,

        confiancaOcr:
            null,

        avisos:
            [],
    };

    try {
        const modulo =
            await import(
                "./certidaoPdfMixedPageOcr.js"
            );

        if (
            typeof modulo
                ?.enriquecerTextoCertidaoPorOcrAdaptativo !==
            "function"
        ) {
            return base;
        }

        return await modulo
            .enriquecerTextoCertidaoPorOcrAdaptativo({
                arquivo,

                textoExtraido,

                resolucao:
                    null,
            });
    }
    catch (error) {
        return {
            ...base,

            avisos: [
                (
                    "OCR adaptativo individual indisponível: " +
                    String(
                        error?.message ||
                        "erro desconhecido"
                    ) +
                    "."
                ),
            ],
        };
    }
}

export async function diagnosticarCertidaoPdfLocal(
    arquivo,
    {
        contexto = {},
        onProgress = null,
    } = {}
) {
    const iniciadoEm =
        new Date().toISOString();

    const inicioMs =
        agoraEmMilissegundos();

    let validacaoArquivo = null;

    try {
        emitirProgresso(
            onProgress,
            CERTIDAO_PDF_DIAGNOSTICO_STATUS
                .VALIDANDO_ARQUIVO,
            15,
            "Validando o arquivo PDF."
        );

        validacaoArquivo =
            await validarArquivoCertidaoPdf(
                arquivo
            );

        emitirProgresso(
            onProgress,
            CERTIDAO_PDF_DIAGNOSTICO_STATUS
                .CALCULANDO_HASH,
            35,
            "Calculando a assinatura SHA-256."
        );

        const hash =
            await calcularHashSha256CertidaoPdf(
                arquivo
            );

        emitirProgresso(
            onProgress,
            CERTIDAO_PDF_DIAGNOSTICO_STATUS
                .EXTRAINDO_TEXTO,
            60,
            "Lendo a camada textual e preparando OCR local quando necessário."
        );

        let leitura =
            await extrairTextoCertidaoPdfLocal(
                arquivo,
                {
                    validacaoArquivo,
                }
            );

        let avaliacaoTecnica =
            montarAvaliacaoTecnica(
                leitura
            );

        emitirProgresso(
            onProgress,
            CERTIDAO_PDF_DIAGNOSTICO_STATUS
                .CLASSIFICANDO_DOCUMENTO,
            85,
            "Classificando o documento e comparando os dados da empresa."
        );

        const dataReferenciaDocumental =
            new Date(
                `${
                    obterDataReferenciaCertidaoMensal(
                        contexto?.competencia ||
                        contexto?.documento
                            ?.competenciaEsperada ||
                        new Date()
                    )
                }T12:00:00.000Z`
            );

        const executarPreAvaliacaoAtual =
            (textoExtraido) =>
                executarPreAvaliacaoDocumental({
                    textoExtraido,

                    documentoEsperado:
                        contexto?.documento ||
                        null,

                    empresaEsperada:
                        contexto?.empresa ||
                        null,

                    dataReferencia:
                        dataReferenciaDocumental,
                });

        let preAvaliacaoDocumental =
            avaliacaoTecnica
                .prontoParaClassificacao
                ? executarPreAvaliacaoAtual(
                    leitura.textoExtraido
                )
                : null;

        if (
            preAvaliacaoDocumental &&
            preAvaliacaoDocumentalRequerEnriquecimentoTemporalIndividual(
                preAvaliacaoDocumental
            )
        ) {
            emitirProgresso(
                onProgress,
                CERTIDAO_PDF_DIAGNOSTICO_STATUS
                    .CLASSIFICANDO_DOCUMENTO,
                92,
                "Complementando emissão e validade por OCR adaptativo local quando necessário."
            );

            const enriquecimentoTemporal =
                await enriquecerTextoTemporalIndividual({
                    arquivo,

                    textoExtraido:
                        leitura.textoExtraido,
                });

            const textoCandidato =
                textoSeguroIndividual(
                    enriquecimentoTemporal
                        ?.texto
                );

            const avisosEnriquecimento =
                Array.isArray(
                    enriquecimentoTemporal
                        ?.avisos
                )
                    ? enriquecimentoTemporal
                        .avisos
                    : [];

            if (
                enriquecimentoTemporal
                    ?.aplicada ===
                    true &&
                textoCandidato &&
                textoCandidato !==
                    textoSeguroIndividual(
                        leitura?.textoExtraido
                    )
            ) {
                const preAvaliacaoCandidata =
                    executarPreAvaliacaoAtual(
                        textoCandidato
                    );

                if (
                    resultadoEnriquecimentoTemporalIndividualPodeSerAceito({
                        inicial:
                            preAvaliacaoDocumental,

                        candidata:
                            preAvaliacaoCandidata,
                    })
                ) {
                    const deficitInicial =
                        contarDeficitsTemporaisIndividual(
                            preAvaliacaoDocumental
                        );

                    const deficitFinal =
                        contarDeficitsTemporaisIndividual(
                            preAvaliacaoCandidata
                        );

                    leitura = {
                        ...leitura,

                        textoExtraido:
                            textoCandidato,

                        quantidadeCaracteres:
                            textoCandidato.length,

                        qualidadeTexto: {
                            ...(
                                leitura
                                    ?.qualidadeTexto ||
                                {}
                            ),

                            ocrAdaptativoIndividualCert2: {
                                aplicado:
                                    true,

                                fonte:
                                    textoSeguroIndividual(
                                        enriquecimentoTemporal
                                            ?.fonteEnriquecimento ||
                                        "OCR_VISUAL_ADAPTATIVO"
                                    ),

                                paginasOcr:
                                    Array.isArray(
                                        enriquecimentoTemporal
                                            ?.paginasOcr
                                    )
                                        ? [
                                            ...enriquecimentoTemporal
                                                .paginasOcr,
                                        ]
                                        : [],

                                paginasPdfJs:
                                    Array.isArray(
                                        enriquecimentoTemporal
                                            ?.paginasPdfJs
                                    )
                                        ? [
                                            ...enriquecimentoTemporal
                                                .paginasPdfJs,
                                        ]
                                        : [],

                                totalPaginas:
                                    Number(
                                        enriquecimentoTemporal
                                            ?.totalPaginas ||
                                        0
                                    ),

                                confiancaOcr:
                                    Number.isFinite(
                                        Number(
                                            enriquecimentoTemporal
                                                ?.confiancaOcr
                                        )
                                    )
                                        ? Number(
                                            enriquecimentoTemporal
                                                .confiancaOcr
                                        )
                                        : null,

                                deficitTemporalInicial:
                                    deficitInicial,

                                deficitTemporalFinal:
                                    deficitFinal,
                            },
                        },
                    };

                    leitura =
                        anexarAvisosLeituraIndividual(
                            leitura,
                            avisosEnriquecimento
                        );

                    preAvaliacaoDocumental =
                        preAvaliacaoCandidata;

                    avaliacaoTecnica = {
                        ...montarAvaliacaoTecnica(
                            leitura
                        ),

                        requerConferenciaHumana:
                            true,

                        observacao:
                            "A camada textual do PDF foi complementada por OCR adaptativo local e deve ser conferida visualmente.",
                    };
                }
                else {
                    leitura =
                        anexarAvisosLeituraIndividual(
                            leitura,
                            [
                                ...avisosEnriquecimento,

                                "O texto adicional do OCR adaptativo foi descartado porque a pré-avaliação candidata não apresentou melhora documental segura.",
                            ]
                        );
                }
            }
            else if (
                avisosEnriquecimento
                    .length
            ) {
                leitura =
                    anexarAvisosLeituraIndividual(
                        leitura,
                        avisosEnriquecimento
                    );
            }
        }

        const concluidoEm =
            new Date().toISOString();

        const duracaoMs =
            Math.max(
                0,
                Math.round(
                    agoraEmMilissegundos() -
                    inicioMs
                )
            );

        emitirProgresso(
            onProgress,
            CERTIDAO_PDF_DIAGNOSTICO_STATUS
                .CONCLUIDO,
            100,
            "Leitura técnica e pré-avaliação concluídas."
        );

        return {
            sucesso: true,
            status:
                CERTIDAO_PDF_DIAGNOSTICO_STATUS
                    .CONCLUIDO,
            arquivo: {
                ...validacaoArquivo,
                hashSha256:
                    hash.hashSha256,
                algoritmoHash:
                    hash.algoritmo,
            },
            leitura,
            avaliacaoTecnica,
            preAvaliacaoDocumental,
            processamento: {
                iniciadoEm,
                concluidoEm,
                duracaoMs,
                origem:
                    "navegador_local",
                custoExterno: false,
                persistido: false,
                enviadoAoServidor: false,
            },
            avisos: [
                ...new Set([
                    ...(validacaoArquivo
                        ?.avisos || []),
                    ...(leitura?.avisos || []),
                ]),
            ],
            erro: "",
        };
    }
    catch (erro) {
        const concluidoEm =
            new Date().toISOString();

        const duracaoMs =
            Math.max(
                0,
                Math.round(
                    agoraEmMilissegundos() -
                    inicioMs
                )
            );

        emitirProgresso(
            onProgress,
            CERTIDAO_PDF_DIAGNOSTICO_STATUS
                .FALHA,
            100,
            erro?.message ||
            "Falha no diagnóstico local do PDF."
        );

        return {
            sucesso: false,
            status:
                CERTIDAO_PDF_DIAGNOSTICO_STATUS
                    .FALHA,
            arquivo:
                erro?.detalhes ||
                validacaoArquivo,
            leitura: null,
            avaliacaoTecnica: {
                possuiTextoUtil: false,
                veioDeOcr: false,
                semTextoConfiavel: true,
                requerConferenciaHumana: true,
                prontoParaClassificacao: false,
                observacao:
                    "O diagnóstico não foi concluído.",
            },
            preAvaliacaoDocumental: null,
            processamento: {
                iniciadoEm,
                concluidoEm,
                duracaoMs,
                origem:
                    "navegador_local",
                custoExterno: false,
                persistido: false,
                enviadoAoServidor: false,
            },
            avisos: [],
            erro:
                erro?.message ||
                "Falha no diagnóstico local do PDF.",
        };
    }
}