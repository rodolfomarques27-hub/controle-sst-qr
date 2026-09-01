import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import {
    diagnosticarCertidaoPdfCanonicoParaLaboratorio,
} from "../analysis/certidaoDocumentCanonicalLaboratorioAdapter.js";
import {
    criarPayloadDocumentoCertidaoMensal,
    criarPayloadTentativaRecusadaCertidaoMensal,
    resultadoLaboratorioCertidaoPodeSerPersistido,
} from "../services/certidaoMensalPersistencePayloadService.js";
import {
    buscarDocumentoAtualCertidaoMensal,
    criarUrlAssinadaPdfCertidaoMensal,
} from "../services/certidaoMensalDocumentPersistenceService.js";

import {
    salvarPdfCertidaoMensalIndividual,
} from "../services/certidaoMensalIndividualPersistenceService.js";

const PROGRESSO_INICIAL = Object.freeze({
    status: "aguardando_arquivo",
    percentual: 0,
    mensagem:
        "Selecione um PDF para iniciar o diagnóstico local.",
});

function criarEstadoInicial() {
    return {
        aberto: false,
        documento: null,
        arquivo: null,
        urlArquivo: "",
        processando: false,
        salvando: false,
        erroPersistencia: null,
        resultadoPersistencia: null,
        progresso: {
            ...PROGRESSO_INICIAL,
        },
        resultadoAnterior: null,
        resultado: null,
    };
}

function removerTentativaRecusada(
    resultado
) {
    if (!resultado) {
        return null;
    }

    const {
        tentativaRecusada,
        ...resultadoLimpo
    } = resultado;

    return resultadoLimpo;
}

function obterAvaliacao(
    resultado
) {
    return resultado
        ?.preAvaliacaoDocumental
        ?.avaliacao || null;
}

const CODIGOS_BLOQUEIO_DOCUMENTAL =
    new Set([
        "ARQUIVO_INCOMPATIVEL",
        "DIVERGENCIA_CNPJ",
        "FONTE_ESTADUAL_INCOMPATIVEL",
        "TIPO_DOCUMENTAL_DIVERGENTE",
    ]);

function arquivoFoiRecusado(
    resultado
) {
    const avaliacao =
        obterAvaliacao(
            resultado
        );

    return Boolean(
        avaliacao?.documentoIncompativel ||
        avaliacao?.bloqueiaSubstituicao ||
        CODIGOS_BLOQUEIO_DOCUMENTAL
            .has(
                avaliacao?.codigo
            )
    );
}

function criarTentativaRecusada({
    arquivo,
    resultado,
}) {
    const preAvaliacao =
        resultado
            ?.preAvaliacaoDocumental;

    const avaliacao =
        preAvaliacao?.avaliacao;

    return {
        codigo:
            avaliacao?.codigo ||
            "ARQUIVO_INCOMPATIVEL",
        nomeArquivo:
            arquivo?.name ||
            resultado
                ?.arquivo
                ?.nomeOriginal ||
            "Arquivo selecionado",
        tamanhoBytes:
            Number(
                arquivo?.size ||
                resultado
                    ?.arquivo
                    ?.tamanhoBytes ||
                0
            ),
        hashSha256:
            resultado
                ?.arquivo
                ?.hashSha256 ||
            "",
        documentoEsperado:
            avaliacao
                ?.documentoEsperado ||
            "",
        documentoIdentificado:
            avaliacao
                ?.documentoIdentificado ||
            preAvaliacao
                ?.classificacao
                ?.titulo ||
            "Documento não identificado",
        classificacaoId:
            preAvaliacao
                ?.classificacao
                ?.id ||
            "nao-identificado",
        mensagem:
            avaliacao?.mensagem ||
            "O arquivo não corresponde ao documento selecionado.",
        recusadoEm:
            new Date().toISOString(),
    };
}

export function useCertidaoPdfLaboratorio() {
    const [estado, setEstado] =
        useState(criarEstadoInicial);

    const urlAtualRef =
        useRef("");

    const operacaoAtualRef =
        useRef(0);

    const resultadoAtualRef =
        useRef(null);

    const salvamentoPersistenciaRef =
        useRef(false);

    const revogarUrl =
        useCallback((url) => {
            if (
                url &&
                typeof URL !== "undefined"
            ) {
                URL.revokeObjectURL(url);
            }
        }, []);

    const revogarUrlAtual =
        useCallback(() => {
            revogarUrl(
                urlAtualRef.current
            );

            urlAtualRef.current = "";
        }, [revogarUrl]);

    useEffect(() => {
        return () => {
            operacaoAtualRef.current += 1;
            resultadoAtualRef.current = null;
            revogarUrlAtual();
        };
    }, [revogarUrlAtual]);

    const abrirLaboratorio =
        useCallback(async (documento) => {
            const operacao =
                operacaoAtualRef.current + 1;

            operacaoAtualRef.current =
                operacao;

            resultadoAtualRef.current =
                null;

            revogarUrlAtual();

            const documentoAtual =
                documento || null;

            const empresaId =
                String(
                    documentoAtual?.empresaId ||
                    ""
                ).trim();

            const competenciaAtual =
                String(
                    documentoAtual
                        ?.competenciaEsperada ||
                    ""
                ).trim();

            const tipoDocumento =
                String(
                    documentoAtual?.id ||
                    ""
                ).trim();

            const podeConsultar =
                Boolean(
                    empresaId &&
                    competenciaAtual &&
                    tipoDocumento
                );

            setEstado({
                ...criarEstadoInicial(),
                aberto: true,
                documento:
                    documentoAtual,
                progresso:
                    podeConsultar
                        ? {
                            status:
                                "consultando_documento_persistido",
                            percentual:
                                15,
                            mensagem:
                                "Consultando o PDF salvo no sistema.",
                        }
                        : {
                            ...PROGRESSO_INICIAL,
                        },
            });

            if (!podeConsultar) {
                return null;
            }

            try {
                const documentoPersistido =
                    await buscarDocumentoAtualCertidaoMensal({
                        empresaId,
                        competencia:
                            competenciaAtual,
                        tipoDocumento,
                    });

                if (
                    operacaoAtualRef.current !==
                    operacao
                ) {
                    return null;
                }

                if (!documentoPersistido) {
                    setEstado(
                        (estadoAtual) => ({
                            ...estadoAtual,
                            progresso: {
                                ...PROGRESSO_INICIAL,
                            },
                        })
                    );

                    return null;
                }

                const urlAssinada =
                    await criarUrlAssinadaPdfCertidaoMensal({
                        caminhoStorage:
                            documentoPersistido
                                .caminhoStorage,
                        duracaoSegundos:
                            900,
                    });

                if (
                    operacaoAtualRef.current !==
                    operacao
                ) {
                    return null;
                }

                const versao =
                    documentoPersistido
                        .versao || {};

                const arquivoPersistido = {
                    name:
                        String(
                            versao.nome_original ||
                            "documento-salvo.pdf"
                        ),
                    size:
                        Number(
                            versao.tamanho_bytes ||
                            0
                        ),
                    type:
                        String(
                            versao.mime_type ||
                            "application/pdf"
                        ),
                    persistido:
                        true,
                };

                const diagnosticoPersistido =
                    (
                        versao.diagnostico &&
                        typeof versao.diagnostico ===
                            "object"
                    )
                        ? versao.diagnostico
                        : {};

                const leituraPersistidaBase =
                    (
                        diagnosticoPersistido.leitura &&
                        typeof diagnosticoPersistido.leitura ===
                            "object"
                    )
                        ? diagnosticoPersistido.leitura
                        : null;

                const leituraPersistida =
                    leituraPersistidaBase
                        ? {
                            ...leituraPersistidaBase,
                            textoPrevia:
                                String(
                                    leituraPersistidaBase
                                        .textoPrevia ||
                                    leituraPersistidaBase
                                        .textoExtraido ||
                                    ""
                                ),
                        }
                        : null;

                const totalPaginasPersistido =
                    Math.max(
                        Number(
                            leituraPersistida
                                ?.totalPaginas ||
                            versao.total_paginas ||
                            1
                        ),
                        1
                    );

                const resultadoPersistido = {
                    sucesso:
                        true,
                    status:
                        "concluido",
                    arquivo: {
                        nomeOriginal:
                            arquivoPersistido.name,
                        tamanhoBytes:
                            arquivoPersistido.size,
                        mimeType:
                            arquivoPersistido.type,
                        hashSha256:
                            String(
                                versao.hash_sha256 ||
                                ""
                            ),
                        calculadoEm:
                            String(
                                versao.hash_calculado_em ||
                                ""
                            ),
                        totalPaginas:
                            totalPaginasPersistido,
                    },
                    leitura:
                        leituraPersistida,
                    avaliacaoTecnica:
                        (
                            diagnosticoPersistido
                                .avaliacaoTecnica &&
                            typeof diagnosticoPersistido
                                .avaliacaoTecnica ===
                                "object"
                        )
                            ? diagnosticoPersistido
                                .avaliacaoTecnica
                            : {},
                    preAvaliacaoDocumental: {
                        classificacao:
                            (
                                diagnosticoPersistido
                                    .classificacao &&
                                typeof diagnosticoPersistido
                                    .classificacao ===
                                    "object"
                            )
                                ? diagnosticoPersistido
                                    .classificacao
                                : {},
                        avaliacao:
                            (
                                diagnosticoPersistido
                                    .avaliacao &&
                                typeof diagnosticoPersistido
                                    .avaliacao ===
                                    "object"
                            )
                                ? diagnosticoPersistido
                                    .avaliacao
                                : {},
                    },
                    processamento: {
                        origem:
                            "persistencia_remota",
                        persistido:
                            true,
                        enviadoAoServidor:
                            true,
                        concluidoEm:
                            String(
                                versao.criado_em ||
                                ""
                            ),
                    },
                    avisos:
                        Array.isArray(
                            diagnosticoPersistido
                                .avisos
                        )
                            ? diagnosticoPersistido
                                .avisos
                            : [],
                    erro:
                        "",
                };

                resultadoAtualRef.current =
                    resultadoPersistido;

                setEstado(
                    (estadoAtual) => ({
                        ...estadoAtual,
                        arquivo:
                            arquivoPersistido,
                        urlArquivo:
                            urlAssinada,
                        processando:
                            false,
                        salvando:
                            false,
                        resultado:
                            resultadoPersistido,
                        erroPersistencia:
                            null,
                        resultadoPersistencia: {
                            ...documentoPersistido,
                            reidratado:
                                true,
                            urlAssinada,
                        },
                        progresso: {
                            status:
                                "documento_persistido",
                            percentual:
                                100,
                            mensagem:
                                "PDF salvo localizado no sistema.",
                        },
                    })
                );

                return documentoPersistido;
            }
            catch (error) {
                if (
                    operacaoAtualRef.current !==
                    operacao
                ) {
                    return null;
                }

                setEstado(
                    (estadoAtual) => ({
                        ...estadoAtual,
                        erroPersistencia: {
                            mensagem:
                                String(
                                    error?.message ||
                                    "Não foi possível carregar o PDF salvo."
                                ),
                        },
                        resultadoPersistencia:
                            null,
                        progresso: {
                            status:
                                "falha_carregamento_persistencia",
                            percentual:
                                100,
                            mensagem:
                                "Não foi possível carregar o PDF salvo.",
                        },
                    })
                );

                return null;
            }
        }, [revogarUrlAtual]);

    const fecharLaboratorio =
        useCallback(() => {
            operacaoAtualRef.current += 1;
            resultadoAtualRef.current = null;
            revogarUrlAtual();

            setEstado(
                criarEstadoInicial()
            );
        }, [revogarUrlAtual]);

    const processarArquivo =
        useCallback(async (
            arquivo,
            contexto = {}
        ) => {
            if (!arquivo) {
                return;
            }

            const operacao =
                operacaoAtualRef.current + 1;

            operacaoAtualRef.current =
                operacao;

            const resultadoAceitoAtual =
                resultadoAtualRef.current
                    ?.sucesso
                    ? resultadoAtualRef.current
                    : null;

            const possuiResultadoAceito =
                Boolean(
                    resultadoAceitoAtual
                );

            if (!possuiResultadoAceito) {
                revogarUrlAtual();
            }

            let urlCandidato = "";

            if (
                typeof URL !== "undefined" &&
                typeof URL.createObjectURL ===
                    "function"
            ) {
                urlCandidato =
                    URL.createObjectURL(
                        arquivo
                    );
            }

            if (!possuiResultadoAceito) {
                urlAtualRef.current =
                    urlCandidato;
            }

            setEstado((estadoAtual) => {
                const resultadoExibido =
                    resultadoAceitoAtual
                        ? removerTentativaRecusada(
                            resultadoAceitoAtual
                        )
                        : null;

                return {
                    ...estadoAtual,
                    arquivo:
                        possuiResultadoAceito
                            ? estadoAtual.arquivo
                            : arquivo,
                    urlArquivo:
                        possuiResultadoAceito
                            ? estadoAtual.urlArquivo
                            : urlCandidato,
                    processando: true,
                    salvando: false,
                    erroPersistencia: null,
                    resultadoPersistencia: null,
                    resultado:
                        resultadoExibido,
                    progresso: {
                        status:
                            "validando_arquivo",
                        percentual: 5,
                        mensagem:
                            "Validando o PDF candidato antes de substituir o documento atual.",
                    },
                };
            });

            const resultadoCandidato =
                await diagnosticarCertidaoPdfCanonicoParaLaboratorio(
                    arquivo,
                    {
                        contexto,
                        onProgress:
                            (progresso) => {
                                if (
                                    operacaoAtualRef.current !==
                                    operacao
                                ) {
                                    return;
                                }

                                setEstado(
                                    (estadoAtual) => ({
                                        ...estadoAtual,
                                        progresso,
                                    })
                                );
                            },
                    }
                );

            if (
                operacaoAtualRef.current !==
                operacao
            ) {
                revogarUrl(
                    urlCandidato
                );

                return;
            }

            if (
                arquivoFoiRecusado(
                    resultadoCandidato
                )
            ) {
                const tentativaRecusada =
                    criarTentativaRecusada({
                        arquivo,
                        resultado:
                            resultadoCandidato,
                    });

                if (possuiResultadoAceito) {
                    revogarUrl(
                        urlCandidato
                    );

                    setEstado(
                        (estadoAtual) => ({
                            ...estadoAtual,
                            processando: false,
                            resultado: {
                                ...removerTentativaRecusada(
                                    resultadoAceitoAtual
                                ),
                                tentativaRecusada,
                            },
                            progresso: {
                                status:
                                    "arquivo_incompativel",
                                percentual: 100,
                                mensagem:
                                    "Arquivo incompatível recusado. O último documento aceito foi preservado.",
                            },
                        })
                    );

                    return;
                }

                setEstado(
                    (estadoAtual) => ({
                        ...estadoAtual,
                        arquivo,
                        urlArquivo:
                            urlCandidato,
                        processando: false,
                        resultado: {
                            ...resultadoCandidato,
                            tentativaRecusada,
                        },
                        progresso: {
                            status:
                                "arquivo_incompativel",
                            percentual: 100,
                            mensagem:
                                "Arquivo incompatível. Selecione outro PDF.",
                        },
                    })
                );

                return;
            }

            const resultadoAnteriorCandidato =
                resultadoAceitoAtual;

            if (possuiResultadoAceito) {
                revogarUrlAtual();

                urlAtualRef.current =
                    urlCandidato;
            }

            resultadoAtualRef.current =
                resultadoCandidato;

            setEstado((estadoAtual) => ({
                ...estadoAtual,
                arquivo,
                urlArquivo:
                    urlCandidato,
                processando: false,
                salvando: false,
                erroPersistencia: null,
                resultadoPersistencia: null,
                resultadoAnterior:
                    resultadoAnteriorCandidato ||
                    estadoAtual.resultadoAnterior,
                resultado:
                    resultadoCandidato,
                progresso: {
                    status:
                        resultadoCandidato.sucesso
                            ? "concluido"
                            : "falha",
                    percentual: 100,
                    mensagem:
                        resultadoCandidato.sucesso
                            ? "Diagnóstico local concluído."
                            : (
                                resultadoCandidato.erro ||
                                "O diagnóstico não foi concluído."
                            ),
                },
            }));
        }, [
            revogarUrl,
            revogarUrlAtual,
        ]);

    const podePrepararPersistenciaAtual =
        resultadoLaboratorioCertidaoPodeSerPersistido(
            estado.resultado
        );

    const podeSalvarPersistenciaAtual =
        Boolean(
            podePrepararPersistenciaAtual &&
            estado.arquivo &&
            !estado.processando &&
            !estado.salvando &&
            !estado.resultadoPersistencia
        );

    const possuiTentativaRecusadaAtual =
        Boolean(
            estado.resultado
                ?.tentativaRecusada
        );

    const prepararPersistenciaAtual =
        useCallback(({
            empresa,
            competencia,
            usuarioId = null,
            geradoEm =
                new Date().toISOString(),
        } = {}) => {
            return criarPayloadDocumentoCertidaoMensal({
                arquivo:
                    estado.arquivo,
                resultado:
                    estado.resultado,
                empresa,
                documento:
                    estado.documento,
                competencia,
                usuarioId,
                geradoEm,
            });
        }, [
            estado.arquivo,
            estado.documento,
            estado.resultado,
        ]);

    const salvarPdfAtual =
        useCallback(async ({
            empresa,
            competencia,
            usuarioId = null,
            geradoEm =
                new Date().toISOString(),
        } = {}) => {
            if (
                salvamentoPersistenciaRef.current
            ) {
                return null;
            }

            if (
                !podeSalvarPersistenciaAtual
            ) {
                setEstado((estadoAtual) => ({
                    ...estadoAtual,
                    erroPersistencia: {
                        mensagem:
                            "O PDF precisa concluir a análise antes de ser salvo.",
                        etapa:
                            "validacao",
                        rollbackExecutado:
                            false,
                    },
                }));

                return null;
            }

            salvamentoPersistenciaRef.current =
                true;

            setEstado((estadoAtual) => ({
                ...estadoAtual,
                salvando: true,
                erroPersistencia: null,
            }));

            try {
                const payload =
                    prepararPersistenciaAtual({
                        empresa,
                        competencia,
                        usuarioId,
                        geradoEm,
                    });

                const resultadoPersistencia =
                    await salvarPdfCertidaoMensalIndividual({
                        arquivo:
                            estado.arquivo,
                        payload,
                    });

                setEstado((estadoAtual) => ({
                    ...estadoAtual,
                    salvando: false,
                    erroPersistencia: null,
                    resultadoPersistencia,
                }));

                return resultadoPersistencia;
            }
            catch (error) {
                setEstado((estadoAtual) => ({
                    ...estadoAtual,
                    salvando: false,
                    resultadoPersistencia: null,
                    erroPersistencia: {
                        mensagem:
                            String(
                                error?.message ||
                                "Não foi possível salvar o PDF no sistema."
                            ).trim(),
                        etapa:
                            String(
                                error?.etapa ||
                                "persistencia"
                            ).trim(),
                        rollbackExecutado:
                            error?.rollbackExecutado ===
                            true,
                        caminhoStorage:
                            String(
                                error?.caminhoStorage ||
                                ""
                            ).trim(),
                    },
                }));

                return null;
            }
            finally {
                salvamentoPersistenciaRef.current =
                    false;
            }
        }, [
            estado.arquivo,
            podeSalvarPersistenciaAtual,
            prepararPersistenciaAtual,
        ]);

    const prepararTentativaRecusadaAtual =
        useCallback(({
            empresa,
            competencia,
            usuarioId = null,
            geradoEm =
                new Date().toISOString(),
        } = {}) => {
            return criarPayloadTentativaRecusadaCertidaoMensal({
                resultado:
                    estado.resultado,
                empresa,
                documento:
                    estado.documento,
                competencia,
                usuarioId,
                geradoEm,
            });
        }, [
            estado.documento,
            estado.resultado,
        ]);

    return {
        ...estado,
        podePrepararPersistenciaAtual,
        podeSalvarPersistenciaAtual,
        possuiTentativaRecusadaAtual,
        abrirLaboratorio,
        fecharLaboratorio,
        processarArquivo,
        prepararPersistenciaAtual,
        salvarPdfAtual,
        prepararTentativaRecusadaAtual,
    };
}
