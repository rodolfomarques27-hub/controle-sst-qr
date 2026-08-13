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

        const leitura =
            await extrairTextoCertidaoPdfLocal(
                arquivo,
                {
                    validacaoArquivo,
                }
            );

        const avaliacaoTecnica =
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

        const preAvaliacaoDocumental =
            avaliacaoTecnica
                .prontoParaClassificacao
                ? executarPreAvaliacaoDocumental({
                    textoExtraido:
                        leitura.textoExtraido,
                    documentoEsperado:
                        contexto?.documento ||
                        null,
                    empresaEsperada:
                        contexto?.empresa ||
                        null,
                    dataReferencia:
                        new Date(
                            `${
                                obterDataReferenciaCertidaoMensal(
                                    contexto?.competencia ||
                                    contexto?.documento
                                        ?.competenciaEsperada ||
                                    new Date()
                                )
                            }T12:00:00.000Z`
                        ),
                })
                : null;

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