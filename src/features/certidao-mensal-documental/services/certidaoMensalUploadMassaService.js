import {
    validarArquivoCertidaoPdf,
} from "../pdf/certidaoPdfFileValidator.js";

import {
    calcularHashSha256CertidaoPdf,
} from "../pdf/certidaoPdfHashService.js";

import {
    resolverDocumentoCertidaoEmLote,
} from "../analysis/certidaoDocumentBatchResolver.js";

import {
    CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS,
} from "../domain/certidaoMensalRegraCompetencia.js";

// ============================================================
// SAFE_SCAN_UPLOAD_MASSA_PROCESSADOR_V1
//
// Processamento local e sequencial do lote.
//
// O leitor documental real é carregado somente quando necessário.
// Isso mantém o serviço desacoplado do harness Node e evita
// carregar antecipadamente a cadeia browser/Vite do OCR.
//
// Nome e caminho são somente proveniência.
// Nenhum arquivo é persistido nesta camada.
// ============================================================

export const CERTIDAO_UPLOAD_MASSA_PROGRESSO =
    Object.freeze({
        INICIANDO_LOTE:
            "INICIANDO_LOTE",

        VALIDANDO_ARQUIVO:
            "VALIDANDO_ARQUIVO",

        CALCULANDO_HASH:
            "CALCULANDO_HASH",

        EXTRAINDO_TEXTO:
            "EXTRAINDO_TEXTO",

        RESOLVENDO_DOCUMENTO:
            "RESOLVENDO_DOCUMENTO",

        CONCLUIDO_ARQUIVO:
            "CONCLUIDO_ARQUIVO",

        FALHA_ARQUIVO:
            "FALHA_ARQUIVO",

        CONCLUIDO_LOTE:
            "CONCLUIDO_LOTE",
    });

async function extrairTextoPadrao(
    arquivo,
    opcoes
) {
    const modulo =
        await import(
            "../pdf/certidaoPdfTextExtractor.js"
        );

    if (
        typeof modulo
            ?.extrairTextoCertidaoPdfLocal !==
        "function"
    ) {
        throw new Error(
            "O leitor documental local da Certidão Mensal não está disponível."
        );
    }

    return modulo
        .extrairTextoCertidaoPdfLocal(
            arquivo,
            opcoes
        );
}

// ============================================================
// SAFE_SCAN_OCR_ADAPTATIVO_LOADER_CERT2_V1
//
// Carregamento tardio para manter o harness Node desacoplado
// da cadeia browser/Tesseract.
// ============================================================

async function enriquecerTextoOcrAdaptativoPadrao({
    arquivo,
    textoExtraido = "",
    resolucao = null,
} = {}) {
    const base = {
        aplicada:
            false,

        texto:
            textoSeguro(
                textoExtraido
            ),

        textoOcr:
            "",

        paginasOcr:
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
                "../pdf/certidaoPdfMixedPageOcr.js"
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
                resolucao,
            });
    }
    catch (error) {
        return {
            ...base,

            avisos: [
                (
                    "OCR adaptativo CERT2 indisponível: " +
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

const DEPENDENCIAS_PADRAO =
    Object.freeze({
        validarArquivo:
            validarArquivoCertidaoPdf,

        calcularHash:
            calcularHashSha256CertidaoPdf,

        extrairTexto:
            extrairTextoPadrao,

        resolverDocumento:
            resolverDocumentoCertidaoEmLote,
    });

function textoSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    ).trim();
}

// ============================================================
// SAFE_SCAN_OCR_ADAPTATIVO_RESOLUCAO_CERT2_V1
//
// A primeira resolução é diagnóstica.
// O OCR somente pode ser aceito se reduzir déficit documental,
// preservar um tipo já reconhecido, não trocar empresa já
// identificada e não piorar o status da resolução.
//
// Nenhuma decisão usa nome do arquivo ou caminho.
// ============================================================

const PESOS_PENDENCIA_OCR_ADAPTATIVO_CERT2 =
    new Map([
        [
            "TIPO_NAO_IDENTIFICADO",
            8,
        ],
        [
            "EMPRESA_SEM_CNPJ_DOCUMENTAL",
            4,
        ],
        [
            "COMPETENCIA_NAO_IDENTIFICADA",
            3,
        ],
        [
            "COMPETENCIA_DOCUMENTAL_NAO_IDENTIFICADA",
            3,
        ],
        [
            "ORIGEM_VALIDADE_NAO_IDENTIFICADA",
            3,
        ],
    ]);

const TIPOS_NAO_IDENTIFICADOS_OCR_ADAPTATIVO_CERT2 =
    new Set([
        "",
        "nao-identificado",
        "documento-nao-identificado",
        "nao_identificado",
    ]);

function calcularDeficitOcrAdaptativoCert2(
    resolucao
) {
    const motivos =
        Array.isArray(
            resolucao?.motivos
        )
            ? resolucao.motivos
            : [];

    return motivos.reduce(
        (
            total,
            motivo
        ) => {
            const codigo =
                textoSeguro(
                    motivo?.codigo
                );

            return (
                total +
                (
                    PESOS_PENDENCIA_OCR_ADAPTATIVO_CERT2
                        .get(
                            codigo
                        ) ||
                    0
                )
            );
        },
        0
    );
}

function obterTipoOcrAdaptativoCert2(
    resolucao
) {
    return textoSeguro(
        resolucao?.tipoDocumento ||
        resolucao?.tipoClassificador
    )
        .toLowerCase();
}

function tipoEhIdentificadoOcrAdaptativoCert2(
    tipo
) {
    return !TIPOS_NAO_IDENTIFICADOS_OCR_ADAPTATIVO_CERT2
        .has(
            textoSeguro(
                tipo
            )
                .toLowerCase()
        );
}

function tiposCompativeisOcrAdaptativoCert2({
    inicial,
    candidata,
}) {
    const tipoInicial =
        obterTipoOcrAdaptativoCert2(
            inicial
        );

    const tipoCandidato =
        obterTipoOcrAdaptativoCert2(
            candidata
        );

    if (
        !tipoEhIdentificadoOcrAdaptativoCert2(
            tipoInicial
        )
    ) {
        return true;
    }

    return (
        tipoInicial ===
        tipoCandidato
    );
}

function empresasCompativeisOcrAdaptativoCert2({
    inicial,
    candidata,
}) {
    const statusInicial =
        textoSeguro(
            inicial?.empresa?.status
        )
            .toUpperCase();

    const statusCandidato =
        textoSeguro(
            candidata?.empresa?.status
        )
            .toUpperCase();

    const empresaInicialId =
        textoSeguro(
            inicial?.empresa?.id
        );

    const empresaCandidataId =
        textoSeguro(
            candidata?.empresa?.id
        );

    if (
        statusInicial ===
        "IDENTIFICADA"
    ) {
        if (
            statusCandidato !==
            "IDENTIFICADA"
        ) {
            return false;
        }

        if (
            empresaInicialId &&
            empresaCandidataId &&
            empresaInicialId !==
            empresaCandidataId
        ) {
            return false;
        }

        return true;
    }

    if (
        statusCandidato ===
        "IDENTIFICADA"
    ) {
        return true;
    }

    return (
        statusInicial ===
        statusCandidato
    );
}

function pontuarStatusOcrAdaptativoCert2(
    status
) {
    switch (
        textoSeguro(
            status
        )
            .toUpperCase()
    ) {
        case "PRONTO":
            return 3;

        case "REVISAR":
            return 2;

        case "BLOQUEADO":
            return 1;

        default:
            return 0;
    }
}

function deveTentarOcrAdaptativoCert2({
    leitura,
    resolucao,
}) {
    const ehPdf =
        textoSeguro(
            leitura?.extensao
        )
            .toLowerCase() ===
            "pdf" ||
        textoSeguro(
            leitura?.mimeType
        )
            .toLowerCase() ===
            "application/pdf";

    if (!ehPdf) {
        return false;
    }

    if (
        leitura?.qualidadeTexto
            ?.correcaoOcrAplicada ===
        true
    ) {
        return false;
    }

    const tipoLeitura =
        textoSeguro(
            leitura?.tipoLeitura
        )
            .toLowerCase();

    if (
        tipoLeitura !==
            "pdf_texto_local" &&
        tipoLeitura !==
            "ocr_imagem_local"
    ) {
        return false;
    }

    return (
        calcularDeficitOcrAdaptativoCert2(
            resolucao
        ) >
        0
    );
}

function aceitarResolucaoOcrAdaptativoCert2({
    inicial,
    candidata,
}) {
    const deficitInicial =
        calcularDeficitOcrAdaptativoCert2(
            inicial
        );

    const deficitCandidato =
        calcularDeficitOcrAdaptativoCert2(
            candidata
        );

    if (
        deficitInicial <= 0 ||
        deficitCandidato >=
            deficitInicial
    ) {
        return false;
    }

    if (
        !tiposCompativeisOcrAdaptativoCert2({
            inicial,
            candidata,
        })
    ) {
        return false;
    }

    if (
        !empresasCompativeisOcrAdaptativoCert2({
            inicial,
            candidata,
        })
    ) {
        return false;
    }

    const statusInicial =
        pontuarStatusOcrAdaptativoCert2(
            inicial?.status
        );

    const statusCandidato =
        pontuarStatusOcrAdaptativoCert2(
            candidata?.status
        );

    if (
        statusCandidato <
        statusInicial
    ) {
        return false;
    }

    return true;
}

function normalizarArquivos(
    arquivos
) {
    if (!arquivos) {
        return [];
    }

    try {
        return Array.from(
            arquivos
        ).filter(Boolean);
    }
    catch {
        return [];
    }
}

function verificarCancelamento(
    signal
) {
    if (!signal?.aborted) {
        return;
    }

    const erro =
        new Error(
            "Processamento do lote cancelado."
        );

    erro.name =
        "AbortError";

    erro.codigo =
        "CERTIDAO_UPLOAD_MASSA_CANCELADO";

    throw erro;
}

function emitirProgresso(
    onProgress,
    dados
) {
    if (
        typeof onProgress !==
        "function"
    ) {
        return;
    }

    try {
        onProgress({
            ...dados,

            atualizadoEm:
                new Date()
                    .toISOString(),
        });
    }
    catch {
        // Callback visual não interfere no motor documental.
    }
}

function percentual({
    indice,
    total,
    fracao,
}) {
    if (!total) {
        return 100;
    }

    return Math.max(
        0,
        Math.min(
            100,
            Math.round(
                (
                    (
                        indice +
                        fracao
                    ) /
                    total
                ) *
                100
            )
        )
    );
}

function criarResolucaoFalha(
    erro
) {
    const mensagem =
        textoSeguro(
            erro?.message
        ) ||
        "Falha técnica durante o processamento.";

    return {
        tipoDocumento:
            "",

        titulo:
            "Documento não processado",

        confianca:
            0,

        complementar:
            false,

        empresa: {
            status:
                "NAO_AVALIADA",

            id:
                "",

            nome:
                "",

            cnpjCorrespondente:
                "",

            cnpjsDocumento:
                [],

            candidatos:
                [],
        },

        status:
            "BLOQUEADO",

        politica:
            "",

        destino: {
            competenciaIso:
                "",

            fonte:
                "",
        },

        avaliacao:
            null,

        motivos: [
            {
                codigo:
                    "FALHA_PROCESSAMENTO_ARQUIVO",

                mensagem,
            },
        ],

        persistenciaAutomatica:
            false,

        persistido:
            false,
    };
}

function criarResumo(
    itens
) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    const contar =
        (status) =>
            lista.filter(
                (item) =>
                    item
                        ?.resolucao
                        ?.status ===
                    status
            ).length;

    return {
        total:
            lista.length,

        prontos:
            contar(
                "PRONTO"
            ),

        revisar:
            contar(
                "REVISAR"
            ),

        bloqueados:
            contar(
                "BLOQUEADO"
            ),

        ignorados:
            contar(
                "IGNORADO"
            ),


        falhasTecnicas:
            lista.filter(
                (item) =>
                    Boolean(
                        item?.erro
                    )
            ).length,
    };
}

// ============================================================
// ============================================================
// ============================================================
// ============================================================
// SAFE_SCAN_FORA_MATRIZ_FISCAL_F10B_R3A
//
// Decisão exclusivamente pelo conteúdo documental.
// Metadados externos ao conteúdo não participam da prova.
// ============================================================

const CODIGO_FORA_MATRIZ_CERT2 =
    "FORA_MATRIZ_CERT2";

function normalizarConteudoForaMatrizCert2(
    valor = ""
) {
    return String(
        valor ??
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase()
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function ehRelatorioApoioFiscalForaMatrizCert2(
    item
) {
    const leitura =
        item?.leitura ||
        {};

    const texto =
        normalizarConteudoForaMatrizCert2(
            leitura?.textoExtraido ||
            leitura?.texto ||
            ""
        );

    if (!texto) {
        return false;
    }

    return Boolean(
        texto.includes(
            "INFORMACOES DE APOIO PARA EMISSAO DE CERTIDAO"
        ) &&
        texto.includes(
            "DIAGNOSTICO FISCAL"
        )
    );
}

export function aplicarGuardForaMatrizFiscalCert2(
    itens = []
) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    return lista.map(
        (item) => {
            if (
                !ehRelatorioApoioFiscalForaMatrizCert2(
                    item
                )
            ) {
                return item;
            }

            const resolucao =
                item?.resolucao ||
                {};

            const motivos =
                Array.isArray(
                    resolucao?.motivos
                )
                    ? resolucao.motivos
                    : [];

            return {
                ...item,

                foraMatrizCert2: {
                    codigo:
                        CODIGO_FORA_MATRIZ_CERT2,

                    bloqueado:
                        true,

                    persistenciaPermitida:
                        false,

                    origem:
                        "CONTEUDO_DOCUMENTAL",
                },

                resolucao: {
                    ...resolucao,

                    status:
                        "BLOQUEADO",

                    politica:
                        "FORA_MATRIZ",

                    titulo:
                        "Documento fora da matriz CERT2",

                    persistenciaAutomatica:
                        false,

                    persistido:
                        false,

                    motivos: [
                        {
                            codigo:
                                CODIGO_FORA_MATRIZ_CERT2,

                            mensagem:
                                "Relatório de apoio ou diagnóstico fiscal identificado pelo conteúdo. " +
                                "O documento não substitui a certidão exigida pela matriz CERT2.",
                        },

                        ...motivos.filter(
                            (motivo) =>
                                String(
                                    motivo?.codigo ||
                                    ""
                                ) !==
                                CODIGO_FORA_MATRIZ_CERT2
                        ),
                    ],
                },

                persistido:
                    false,
            };
        }
    );
}

// SAFE_SCAN_ESCOPO_EXTERNO_CERT2_27K
//
// Regra item-level:
// - tipo reconhecido dentro do catálogo externo: segue;
// - tipo reconhecido fora do catálogo externo: IGNORADO;
// - tipo não identificado: continua fail-closed somente no item.
//
// Nome de arquivo e pasta não participam da prova.
// ============================================================

const CODIGO_FORA_ESCOPO_CERT2 =
    "FORA_ESCOPO_CERT2";

const TIPOS_EXTERNOS_CERT2 =
    new Set(
        CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS
            .map(
                (documento) =>
                    textoSeguro(
                        documento?.tipoDocumento
                    )
                        .toLowerCase()
                        .trim()
            )
            .filter(Boolean)
    );

const MAPA_SUBTIPOS_EXTERNOS_CERT2 =
    new Map([
        [
            "fgts-digital-gfd",
            "fgts",
        ],
        [
            "guia-fgts-digital",
            "fgts",
        ],
        [
            "relatorio-fgts-digital",
            "fgts",
        ],
        [
            "fgts-relatorio",
            "fgts",
        ],
        [
            "pagamento-salarial",
            "folha-pagamento",
        ],
        [
            "adiantamento-salarial",
            "folha-pagamento",
        ],
        [
            "comprovante-pagamento-folha",
            "folha-pagamento",
        ],
        [
            "comprovante-bancario-sispag",
            "folha-pagamento",
        ],
    ]);

// ============================================================
// SAFE_SCAN_27K_ESCOPO_AMBIGUO_R3F
// ============================================================

const TIPOS_ESCOPO_AMBIGUO_CERT2 =
    new Set([
        "tributo-municipal-generico",
        "darf-federal-generico",
    ]);

const TIPOS_NAO_IDENTIFICADOS_CERT2 =
    new Set([
        "",
        "nao-identificado",
        "documento-nao-identificado",
        "nao_identificado",
    ]);

function normalizarTipoEscopoCert2(
    valor
) {
    return textoSeguro(
        valor
    )
        .toLowerCase()
        .trim();
}

function obterTipoReconhecidoEscopoCert2(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    const candidatos =
        [
            resolucao?.tipoDocumento,
            resolucao?.tipoCatalogo,
            resolucao?.tipoClassificador,
            resolucao?.classificacao?.tipoCatalogo,
            resolucao?.classificacao?.id,
        ]
            .map(
                normalizarTipoEscopoCert2
            )
            .filter(
                (tipo) =>
                    !TIPOS_NAO_IDENTIFICADOS_CERT2
                        .has(
                            tipo
                        )
            );

    return (
        candidatos[0] ||
        ""
    );
}

function resolverTipoExternoEscopoCert2(
    tipoReconhecido
) {
    const tipo =
        normalizarTipoEscopoCert2(
            tipoReconhecido
        );

    return (
        MAPA_SUBTIPOS_EXTERNOS_CERT2
            .get(
                tipo
            ) ||
        tipo
    );
}

export function aplicarGuardEscopoExternoCert2(
    itens = []
) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    return lista.map(
        (item) => {
            const resolucao =
                item?.resolucao ||
                {};

            const tipoReconhecido =
                obterTipoReconhecidoEscopoCert2(
                    item
                );

            if (!tipoReconhecido) {
                return item;
            }

            if (
                TIPOS_ESCOPO_AMBIGUO_CERT2
                    .has(
                        tipoReconhecido
                    )
            ) {
                return item;
            }

            const tipoExterno =
                resolverTipoExternoEscopoCert2(
                    tipoReconhecido
                );

            if (
                TIPOS_EXTERNOS_CERT2
                    .has(
                        tipoExterno
                    )
            ) {
                return item;
            }

            const motivosAtuais =
                Array.isArray(
                    resolucao?.motivos
                )
                    ? resolucao.motivos
                    : [];

            const motivo = {
                codigo:
                    CODIGO_FORA_ESCOPO_CERT2,

                mensagem:
                    (
                        "Tipo documental reconhecido fora do catálogo externo CERT2. " +
                        "Este item foi ignorado e não interfere no processamento nem no salvamento dos demais documentos."
                    ),
            };

            return {
                ...item,

                foraEscopoCert2: {
                    codigo:
                        CODIGO_FORA_ESCOPO_CERT2,

                    ignorado:
                        true,

                    tipoReconhecido,

                    tipoExterno,

                    persistenciaPermitida:
                        false,
                },

                resolucao: {
                    ...resolucao,

                    status:
                        "IGNORADO",

                    politica:
                        "FORA_ESCOPO",

                    motivos: [
                        motivo,

                        ...motivosAtuais.filter(
                            (motivoAtual) =>
                                textoSeguro(
                                    motivoAtual?.codigo
                                ) !==
                                CODIGO_FORA_ESCOPO_CERT2
                        ),
                    ],

                    persistenciaAutomatica:
                        false,

                    persistido:
                        false,
                },

                persistido:
                    false,
            };
        }
    );
}

// SAFE_SCAN_DUPLICIDADE_EXATA_INTRALOTE_V1
//
// Guard binário SOMENTE em memória.
//
// A primeira ocorrência de um SHA-256 válido permanece
// como documento canônico do lote.
//
// Ocorrências posteriores do MESMO SHA-256 são bloqueadas
// e NÃO devem participar das associações documentais.
//
// Filename/path são somente proveniência.
// A igualdade é provada exclusivamente pelo SHA-256.
// ============================================================

const CODIGO_DUPLICIDADE_EXATA_LOTE =
    "DUPLICADO_EXATO_LOTE";

function normalizarHashSha256Lote(
    valor
) {
    const hash =
        textoSeguro(
            valor
        ).toLowerCase();

    return /^[a-f0-9]{64}$/.test(
        hash
    )
        ? hash
        : "";
}

function itemEhDuplicadoExatoLote(
    item
) {
    return (
        item
            ?.duplicidade
            ?.codigo ===
        CODIGO_DUPLICIDADE_EXATA_LOTE
    );
}

export function aplicarGuardDuplicidadeExataIntralote(
    itens = []
) {
    const lista =
        Array.isArray(
            itens
        )
            ? aplicarGuardForaMatrizFiscalCert2(
                aplicarGuardEscopoExternoCert2(
                    itens
                )
            )
            : [];

    const primeirasOcorrencias =
        new Map();

    return lista.map(
        (item, posicao) => {
            if (
                item?.resolucao?.status ===
                    "IGNORADO"
            ) {
                return item;
            }

            const hashSha256 =
                normalizarHashSha256Lote(
                    item
                        ?.hash
                        ?.sha256
                );

            if (!hashSha256) {
                return item;
            }

            const primeira =
                primeirasOcorrencias.get(
                    hashSha256
                );

            if (!primeira) {
                primeirasOcorrencias.set(
                    hashSha256,
                    {
                        indice:
                            Number.isInteger(
                                item?.indice
                            )
                                ? item.indice
                                : posicao,

                        nomeOriginal:
                            textoSeguro(
                                item
                                    ?.proveniencia
                                    ?.nomeOriginal
                            ),
                    }
                );

                return item;
            }

            const resolucaoAtual =
                item?.resolucao || {};

            const motivosAtuais =
                Array.isArray(
                    resolucaoAtual
                        ?.motivos
                )
                    ? resolucaoAtual.motivos
                    : [];

            const motivoDuplicidade = {
                codigo:
                    CODIGO_DUPLICIDADE_EXATA_LOTE,

                mensagem:
                    "Arquivo duplicado identificado. Este PDF possui o mesmo conteúdo de outro arquivo já incluído neste lote. A duplicidade foi confirmada pelo SHA-256, por isso esta cópia foi ignorada para evitar análise duplicada e criação de uma nova versão.",
            };

            return {
                ...item,

                duplicidade: {
                    codigo:
                        CODIGO_DUPLICIDADE_EXATA_LOTE,

                    escopo:
                        "LOTE",

                    exata:
                        true,

                    hashSha256,

                    indiceOriginal:
                        primeira.indice,

                    nomeOriginal:
                        primeira.nomeOriginal,

                    persistenciaPermitida:
                        false,
                },

                resolucao: {
                    ...resolucaoAtual,

                    status:
                        "IGNORADO",

                    motivos: [
                        motivoDuplicidade,

                        ...motivosAtuais.filter(
                            (motivo) =>
                                textoSeguro(
                                    motivo?.codigo
                                ) !==
                                CODIGO_DUPLICIDADE_EXATA_LOTE
                        ),
                    ],

                    persistenciaAutomatica:
                        false,

                    persistido:
                        false,
                },

                persistido:
                    false,
            };
        }
    );
}

// ============================================================
// SAFE_SCAN_DUPLICIDADE_EXATA_HISTORICO_V1
//
// Recebe SOMENTE:
// - preview já analisado;
// - versões encontradas por consulta read-only.
//
// Não acessa banco.
// Não persiste.
// Não muda empresa ou competência.
//
// SHA-256 é a única prova da igualdade binária.
// ============================================================

const CODIGO_DUPLICIDADE_EXATA_HISTORICO =
    "DUPLICADO_EXATO_HISTORICO";

function compararVersoesHistoricoDuplicidade(
    atual,
    candidata
) {
    if (!atual) {
        return candidata;
    }

    const dataAtual =
        Date.parse(
            textoSeguro(
                atual?.criado_em
            )
        ) || 0;

    const dataCandidata =
        Date.parse(
            textoSeguro(
                candidata?.criado_em
            )
        ) || 0;

    if (
        dataCandidata >
        dataAtual
    ) {
        return candidata;
    }

    if (
        dataCandidata <
        dataAtual
    ) {
        return atual;
    }

    const numeroAtual =
        Number(
            atual?.numero_versao
        ) || 0;

    const numeroCandidata =
        Number(
            candidata?.numero_versao
        ) || 0;

    return numeroCandidata >
        numeroAtual
        ? candidata
        : atual;
}

export function aplicarGuardDuplicidadeExataHistorico({
    itens = [],
    versoes = [],
} = {}) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    const historico =
        Array.isArray(
            versoes
        )
            ? versoes
            : [];

    const historicoPorHash =
        new Map();

    for (
        const versao of
        historico
    ) {
        const hashSha256 =
            normalizarHashSha256Lote(
                versao?.hash_sha256
            );

        if (!hashSha256) {
            continue;
        }

        historicoPorHash.set(
            hashSha256,
            compararVersoesHistoricoDuplicidade(
                historicoPorHash.get(
                    hashSha256
                ),
                versao
            )
        );
    }

    let duplicadosHistorico =
        0;

    const itensAtualizados =
        lista.map(
            (item) => {
                /*
                 * Duplicidade do próprio lote tem precedência.
                 *
                 * A segunda cópia do lote continua apontando para
                 * a primeira ocorrência, mesmo que ambas já existam
                 * no histórico.
                 */
                if (
                    item?.resolucao?.status ===
                        "IGNORADO" ||
                    itemEhDuplicadoExatoLote(
                        item
                    )
                ) {
                    return item;
                }

                const hashSha256 =
                    normalizarHashSha256Lote(
                        item
                            ?.hash
                            ?.sha256
                    );

                if (!hashSha256) {
                    return item;
                }

                const versaoExistente =
                    historicoPorHash.get(
                        hashSha256
                    );

                if (!versaoExistente) {
                    return item;
                }

                duplicadosHistorico +=
                    1;

                const resolucaoAtual =
                    item?.resolucao ||
                    {};

                const motivosAtuais =
                    Array.isArray(
                        resolucaoAtual
                            ?.motivos
                    )
                        ? resolucaoAtual.motivos
                        : [];

                const motivoDuplicidade = {
                    codigo:
                        CODIGO_DUPLICIDADE_EXATA_HISTORICO,

                    mensagem:
                        "Arquivo já registrado no histórico. Este PDF possui o mesmo conteúdo de uma versão documental salva anteriormente. A duplicidade foi confirmada pelo SHA-256, por isso o arquivo foi ignorado para evitar uma nova versão idêntica.",
                };

                return {
                    ...item,

                    duplicidade: {
                        codigo:
                            CODIGO_DUPLICIDADE_EXATA_HISTORICO,

                        escopo:
                            "HISTORICO",

                        exata:
                            true,

                        hashSha256,

                        persistenciaPermitida:
                            false,

                        historico: {
                            versaoId:
                                textoSeguro(
                                    versaoExistente
                                        ?.id
                                ),

                            itemId:
                                textoSeguro(
                                    versaoExistente
                                        ?.item_id
                                ),

                            numeroVersao:
                                Number(
                                    versaoExistente
                                        ?.numero_versao
                                ) || null,

                            nomeOriginal:
                                textoSeguro(
                                    versaoExistente
                                        ?.nome_original
                                ),

                            criadoEm:
                                textoSeguro(
                                    versaoExistente
                                        ?.criado_em
                                ),

                            statusResultado:
                                textoSeguro(
                                    versaoExistente
                                        ?.status_resultado
                                ),

                            diagnostico:
                                (
                                    versaoExistente
                                        ?.diagnostico &&
                                    typeof versaoExistente
                                        .diagnostico ===
                                        "object" &&
                                    !Array.isArray(
                                        versaoExistente
                                            .diagnostico
                                    )
                                )
                                    ? versaoExistente
                                        .diagnostico
                                    : null,

                            payload:
                                (
                                    versaoExistente
                                        ?.payload &&
                                    typeof versaoExistente
                                        .payload ===
                                        "object" &&
                                    !Array.isArray(
                                        versaoExistente
                                            .payload
                                    )
                                )
                                    ? versaoExistente
                                        .payload
                                    : null,

                            bucketId:
                                textoSeguro(
                                    versaoExistente
                                        ?.bucket_id
                                ),

                            caminhoStorage:
                                textoSeguro(
                                    versaoExistente
                                        ?.caminho_storage
                                ),
                        },
                    },

                    resolucao: {
                        ...resolucaoAtual,

                        status:
                            "IGNORADO",

                        motivos: [
                            motivoDuplicidade,

                            ...motivosAtuais.filter(
                                (motivo) =>
                                    textoSeguro(
                                        motivo?.codigo
                                    ) !==
                                    CODIGO_DUPLICIDADE_EXATA_HISTORICO
                            ),
                        ],

                        persistenciaAutomatica:
                            false,

                        persistido:
                            false,
                    },

                    persistido:
                        false,
                };
            }
        );

    return {
        itens:
            itensAtualizados,

        resumo:
            criarResumo(
                itensAtualizados
            ),

        persistenciaExecutada:
            false,

        duplicidadeHistorico: {
            verificada:
                true,

            encontrados:
                duplicadosHistorico,
        },
    };
}

// SAFE_SCAN_ASSOCIACAO_FOLHA_INTRALOTE_V1
//
// Associação SOMENTE em memória:
//
// Folha de Pagamento principal
//      ↓
// pagamento-salarial / adiantamento-salarial
//
// Nenhuma informação de filename/pasta/data bancária
// define empresa ou competência.
//
// A associação permanece sujeita à revisão humana.
// ============================================================

function somenteDigitosLote(
    valor = ""
) {
    return textoSeguro(
        valor
    ).replace(
        /\D+/g,
        ""
    );
}

function obterTipoResolucaoLote(
    item
) {
    return textoSeguro(
        item
            ?.resolucao
            ?.tipoClassificador ||
        item
            ?.resolucao
            ?.tipoDocumento
    );
}

function ehFolhaPrincipalAssociavel(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    if (
        item?.erro ||
        obterTipoResolucaoLote(
            item
        ) !==
            "folha-pagamento" ||
        resolucao.status !==
            "PRONTO" ||
        resolucao
            ?.empresa
            ?.status !==
            "IDENTIFICADA"
    ) {
        return false;
    }

    const empresaId =
        textoSeguro(
            resolucao
                ?.empresa
                ?.id
        );

    const empresaCnpj =
        somenteDigitosLote(
            resolucao
                ?.empresa
                ?.cnpjCorrespondente
        );

    const competenciaIso =
        textoSeguro(
            resolucao
                ?.destino
                ?.competenciaIso
        );

    return Boolean(
        (
            empresaId ||
            empresaCnpj
        ) &&
        /^\d{4}-\d{2}-\d{2}$/.test(
            competenciaIso
        )
    );
}

function ehComplementarFinanceiroFolha(
    item
) {
    const tipo =
        obterTipoResolucaoLote(
            item
        );

    return Boolean(
        !item?.erro &&
        (
            tipo ===
                "pagamento-salarial" ||
            tipo ===
                "adiantamento-salarial" ||
            tipo ===
                "comprovante-bancario-sispag"
        ) &&
        item
            ?.resolucao
            ?.complementar ===
            true
    );
}

function mesmaEmpresaResolucao(
    complementar,
    folha
) {
    const empresaComplementar =
        complementar
            ?.resolucao
            ?.empresa ||
        {};

    const empresaFolha =
        folha
            ?.resolucao
            ?.empresa ||
        {};

    if (
        empresaComplementar
            .status !==
        "IDENTIFICADA"
    ) {
        return false;
    }

    const idComplementar =
        textoSeguro(
            empresaComplementar.id
        );

    const idFolha =
        textoSeguro(
            empresaFolha.id
        );

    if (
        idComplementar &&
        idFolha
    ) {
        return (
            idComplementar ===
            idFolha
        );
    }

    const cnpjComplementar =
        somenteDigitosLote(
            empresaComplementar
                .cnpjCorrespondente
        );

    const cnpjFolha =
        somenteDigitosLote(
            empresaFolha
                .cnpjCorrespondente
        );

    return Boolean(
        cnpjComplementar &&
        cnpjFolha &&
        cnpjComplementar ===
            cnpjFolha
    );
}

function selecionarFolhaParaComplementar({
    complementar,
    folhas,
}) {
    const empresa =
        complementar
            ?.resolucao
            ?.empresa ||
        {};

    if (
        empresa.status ===
        "IDENTIFICADA"
    ) {
        const candidatas =
            folhas.filter(
                (folha) =>
                    mesmaEmpresaResolucao(
                        complementar,
                        folha
                    )
            );

        if (
            candidatas.length !==
            1
        ) {
            return null;
        }

        return {
            folha:
                candidatas[0],

            fonte:
                "EMPRESA_DOCUMENTAL_UNICA",
        };
    }

    /*
     * SEM_CNPJ significa ausência de prova empresarial
     * dentro do comprovante.
     *
     * Só podemos propor vínculo quando existe UMA única
     * Folha principal apta em todo o lote.
     *
     * NAO_ENCONTRADA e AMBIGUA não entram aqui porque
     * representam evidência conflitante, não ausência
     * de evidência.
     */
    if (
        empresa.status !==
        "SEM_CNPJ" &&
        empresa.status !==
        "NAO_AVALIADA"
    ) {
        return null;
    }

    if (
        folhas.length !==
        1
    ) {
        return null;
    }

    return {
        folha:
            folhas[0],

        fonte:
            "FOLHA_PRINCIPAL_UNICA_LOTE",
    };
}

function removerMotivosEmpresaAusente(
    motivos
) {
    const removiveis =
        new Set([
            "EMPRESA_SEM_CNPJ_DOCUMENTAL",
        ]);

    return (
        Array.isArray(
            motivos
        )
            ? motivos
            : []
    ).filter(
        (motivo) =>
            !removiveis.has(
                textoSeguro(
                    motivo?.codigo
                )
            )
    );
}

function associarComplementaresFolhaIntralote(
    itens
) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    const folhas =
        lista.filter(
            ehFolhaPrincipalAssociavel
        );

    if (
        !folhas.length
    ) {
        return lista;
    }

    return lista.map(
        (item) => {
            if (
                !ehComplementarFinanceiroFolha(
                    item
                )
            ) {
                return item;
            }

            const vinculo =
                selecionarFolhaParaComplementar({
                    complementar:
                        item,

                    folhas,
                });

            if (
                !vinculo
                    ?.folha
            ) {
                return item;
            }

            const folha =
                vinculo.folha;

            const resolucaoFolha =
                folha.resolucao ||
                {};

            const resolucaoAtual =
                item.resolucao ||
                {};

            const competenciaIso =
                textoSeguro(
                    resolucaoFolha
                        ?.destino
                        ?.competenciaIso
                );

            const empresaFolha =
                resolucaoFolha
                    ?.empresa ||
                {};

            if (
                !competenciaIso ||
                empresaFolha
                    ?.status !==
                    "IDENTIFICADA"
            ) {
                return item;
            }

            const tipo =
                obterTipoResolucaoLote(
                    item
                );

            const tipoEvidencia =
                tipo ===
                "adiantamento-salarial"
                    ? "ADIANTAMENTO_SALARIAL"
                    : tipo ===
                        "pagamento-salarial"
                        ? "PAGAMENTO_SALARIAL"
                        : "";

            const motivosAtuais =
                removerMotivosEmpresaAusente(
                    resolucaoAtual
                        ?.motivos
                );

            const motivoVinculo = {
                codigo:
                    "VINCULO_FOLHA_LOTE",

                mensagem:
                    (
                        "Empresa e competência propostas a partir " +
                        "da Folha de Pagamento principal identificada " +
                        "de forma inequívoca no mesmo lote. " +
                        "A conferência humana continua obrigatória."
                    ),
            };

            const empresaAtual =
                resolucaoAtual
                    ?.empresa ||
                {};

            return {
                ...item,

                resolucao: {
                    ...resolucaoAtual,

                    status:
                        "REVISAR",

                    politica:
                        "COMPLEMENTAR",

                    empresa: {
                        ...empresaAtual,

                        status:
                            "IDENTIFICADA",

                        id:
                            textoSeguro(
                                empresaFolha.id
                            ),

                        nome:
                            textoSeguro(
                                empresaFolha.nome
                            ),

                        cnpjCorrespondente:
                            textoSeguro(
                                empresaFolha
                                    .cnpjCorrespondente
                            ),

                        /*
                         * Preservamos o que realmente existia
                         * dentro do comprovante.
                         */
                        cnpjsDocumento:
                            Array.isArray(
                                empresaAtual
                                    ?.cnpjsDocumento
                            )
                                ? empresaAtual
                                    .cnpjsDocumento
                                : [],

                        origemIdentificacao:
                            "VINCULO_FOLHA_LOTE",
                    },

                    destino: {
                        competenciaIso,

                        fonte:
                            "VINCULO_FOLHA_LOTE",
                    },

                    motivos: [
                        motivoVinculo,
                        ...motivosAtuais.filter(
                            (motivo) =>
                                textoSeguro(
                                    motivo?.codigo
                                ) !==
                                "VINCULO_FOLHA_LOTE"
                        ),
                    ],

                    vinculoFolha: {
                        associado:
                            true,

                        /*
                         * SAFE_SCAN_VINCULO_FOLHA_FONTE_SEMANTICA_D2_R1T_R3E
                         *
                         * "fonte" descreve a natureza deste vínculo:
                         * o complementar foi associado à Folha do mesmo lote.
                         *
                         * A estratégia usada para selecionar a Folha
                         * permanece preservada separadamente.
                         */
                        fonte:
                            "VINCULO_FOLHA_LOTE",

                        origemSelecaoFolha:
                            textoSeguro(
                                vinculo.fonte
                            ),

                        revisaoObrigatoria:
                            true,

                        folhaIndice:
                            Number(
                                folha?.indice ??
                                -1
                            ),

                        folhaHash:
                            textoSeguro(
                                folha
                                    ?.hash
                                    ?.sha256
                            ),

                        empresaId:
                            textoSeguro(
                                empresaFolha.id
                            ),

                        empresaNome:
                            textoSeguro(
                                empresaFolha.nome
                            ),

                        competenciaIso,

                        tipoEvidencia,

                        classificacaoFinanceiraPendente:
                            !tipoEvidencia,
                    },

                    ...(
                        tipoEvidencia
                            ? {
                                evidenciaComplementar: {
                                    tipo:
                                        tipoEvidencia,

                                    persistenciaExecutada:
                                        false,
                                },
                            }
                            : {}
                    ),

                    prontoParaRevisao:
                        true,

                    persistenciaAutomatica:
                        false,

                    persistido:
                        false,
                },
            };
        }
    );
}

// ============================================================
// SAFE_SCAN_FALLBACK_COLABORADOR_CERTIDAO_V2
//
// Executado SOMENTE após a associação intralote por Folha.
//
// Ordem de evidência:
// 1. CPF válido e exato;
// 2. matrícula/eSocial rotulada e exata;
// 3. nome completo exato e único.
//
// Nome de arquivo e caminho NÃO participam.
// ============================================================

function normalizarTextoIdentidadeLote(
    valor = ""
) {
    return textoSeguro(
        valor
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase()
        .replace(
            /[^A-Z0-9]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function somenteDigitosIdentidadeLote(
    valor = ""
) {
    return String(
        valor ?? ""
    ).replace(
        /\D+/g,
        ""
    );
}

function calcularDigitoCpfIdentidadeLote(
    cpf,
    quantidadeBase
) {
    let soma =
        0;

    for (
        let indice = 0;
        indice < quantidadeBase;
        indice += 1
    ) {
        soma +=
            Number(
                cpf[indice]
            ) *
            (
                quantidadeBase +
                1 -
                indice
            );
    }

    const digito =
        (
            soma *
            10
        ) %
        11;

    return digito === 10
        ? 0
        : digito;
}

function cpfValidoIdentidadeLote(
    valor
) {
    const cpf =
        somenteDigitosIdentidadeLote(
            valor
        );

    if (
        cpf.length !== 11 ||
        /^(\d)\1{10}$/.test(
            cpf
        )
    ) {
        return false;
    }

    const primeiro =
        calcularDigitoCpfIdentidadeLote(
            cpf,
            9
        );

    const segundo =
        calcularDigitoCpfIdentidadeLote(
            cpf,
            10
        );

    return (
        primeiro ===
            Number(
                cpf[9]
            ) &&
        segundo ===
            Number(
                cpf[10]
            )
    );
}

function extrairCpfsIdentidadeLote(
    textoExtraido
) {
    const texto =
        String(
            textoExtraido ?? ""
        );

    const encontrados =
        new Set();

    const tokens =
        [
            ...(
                texto.match(
                    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g
                ) ||
                []
            ),

            ...(
                texto.match(
                    /\b000\d{11}\b/g
                ) ||
                []
            ),
        ];

    for (
        const token
        of tokens
    ) {
        const digitos =
            somenteDigitosIdentidadeLote(
                token
            );

        const cpf =
            digitos.length === 14 &&
            digitos.startsWith(
                "000"
            )
                ? digitos.slice(
                    3
                )
                : digitos;

        if (
            cpfValidoIdentidadeLote(
                cpf
            )
        ) {
            encontrados.add(
                cpf
            );
        }
    }

    return Array.from(
        encontrados
    );
}

function obterCpfColaboradorIdentidadeLote(
    colaborador
) {
    const cpf =
        somenteDigitosIdentidadeLote(
            colaborador?.cpf
        );

    return cpfValidoIdentidadeLote(
        cpf
    )
        ? cpf
        : "";
}

function obterMatriculasColaboradorIdentidadeLote(
    colaborador
) {
    return Array.from(
        new Set(
            [
                colaborador
                    ?.matricula_esocial,

                colaborador
                    ?.matriculaEsocial,

                colaborador
                    ?.matricula_eSocial,

                colaborador
                    ?.matricula,
            ]
                .map(
                    normalizarTextoIdentidadeLote
                )
                .filter(
                    (valor) =>
                        valor.length >= 3
                )
        )
    );
}

function obterNomeColaboradorIdentidadeLote(
    colaborador
) {
    return normalizarTextoIdentidadeLote(
        colaborador?.nome ||
        colaborador?.nomeCompleto ||
        colaborador?.nome_completo
    );
}

function obterIdColaboradorIdentidadeLote(
    colaborador
) {
    return textoSeguro(
        colaborador?.id ||
        colaborador?.colaboradorId ||
        colaborador?.colaborador_id
    );
}

function obterEmpresaIdColaboradorIdentidadeLote(
    colaborador
) {
    return textoSeguro(
        colaborador?.empresaId ||
        colaborador?.empresa_id ||
        colaborador?.empresas?.id ||
        colaborador?.empresa?.id
    );
}

function textoPossuiMatriculaIdentidadeLote({
    textoNormalizado,
    matricula,
}) {
    const alvo =
        normalizarTextoIdentidadeLote(
            matricula
        );

    if (
        !textoNormalizado ||
        alvo.length < 3
    ) {
        return false;
    }

    const documento =
        " " +
        textoNormalizado +
        " ";

    const marcadores =
        [
            "MATRICULA ESOCIAL " +
                alvo,

            "MATRICULA E SOCIAL " +
                alvo,

            "ESOCIAL " +
                alvo,

            "MATRICULA " +
                alvo,
        ];

    return marcadores.some(
        (marcador) =>
            documento.includes(
                " " +
                marcador +
                " "
            )
    );
}

function nomeApareceComoFraseIdentidadeLote({
    textoNormalizado,
    nome,
}) {
    const alvo =
        normalizarTextoIdentidadeLote(
            nome
        );

    if (
        !alvo ||
        alvo.split(
            " "
        ).length < 2
    ) {
        return false;
    }

    return (
        (
            " " +
            textoNormalizado +
            " "
        ).includes(
            " " +
            alvo +
            " "
        )
    );
}

// ============================================================
// SAFE_SCAN_CERT2_M4_D8_EMPREGADO_DOCUMENTAL
//
// Identidade individual explícita em Espelho/Folha de Ponto:
//
// EMPREGADO <numero> <nome>
//
// Este parser NÃO localiza cadastro.
// Ele somente preserva identidade documental forte para que,
// após falharem CPF > matrícula/eSocial > nome cadastrado,
// seja possível distinguir:
//
// - identidade insuficiente;
// - trabalhador explicitamente identificado no PDF,
//   porém não cadastrado no SafeScan.
//
// Fail-closed:
// - uso posterior restrito a folha-ponto;
// - empresa documental deve estar IDENTIFICADA;
// - marcador EMPREGADO obrigatório;
// - número entre 4 e 15 dígitos;
// - nome com pelo menos 3 partes;
// - delimitador estrutural posterior obrigatório;
// - múltiplas identidades diferentes => nenhuma decisão.
// ============================================================

// ============================================================
// SAFE_SCAN_CERT2_M4_E2_B_MULTIEMPREGADO_DOCUMENTAL
//
// Evolução estritamente documental do D8.
//
// O Espelho de Ponto pode conter mais de um empregado.
// O parser plural preserva todas as identidades explícitas.
// O wrapper singular continua retornando somente quando existe
// exatamente uma identidade, preservando o contrato legado.
// ============================================================

function extrairIdentidadesEmpregadoFolhaPontoLote(
    textoExtraido
) {
    const texto =
        normalizarTextoIdentidadeLote(
            textoExtraido
        );

    if (!texto) {
        return [];
    }

    const padrao =
        /\bEMPREGADO\s+(\d{4,15})\s+([A-Z][A-Z ]{5,}?)(?=\s+(?:DATA\s+ADMISSAO|CARGO|FUNCAO|CPF|PIS|MATRICULA|CENTRO\s+DE\s+CUSTO)\b)/g;

    const unicos =
        new Map();

    for (
        const correspondencia of
        texto.matchAll(
            padrao
        )
    ) {
        const numero =
            String(
                correspondencia?.[1] ||
                ""
            )
                .trim();

        const nome =
            String(
                correspondencia?.[2] ||
                ""
            )
                .replace(
                    /\s+/g,
                    " "
                )
                .trim();

        const partesNome =
            nome
                .split(
                    " "
                )
                .filter(
                    Boolean
                );

        if (
            !/^\d{4,15}$/.test(
                numero
            ) ||
            partesNome.length <
                3
        ) {
            continue;
        }

        const chave =
            numero +
            "|" +
            nome;

        if (
            !unicos.has(
                chave
            )
        ) {
            unicos.set(
                chave,
                {
                    numero,
                    nome,

                    origem:
                        "EMPREGADO_DOCUMENTAL",
                }
            );
        }
    }

    return Array.from(
        unicos.values()
    );
}

function extrairIdentidadeEmpregadoFolhaPontoLote(
    textoExtraido
) {
    const identidades =
        extrairIdentidadesEmpregadoFolhaPontoLote(
            textoExtraido
        );

    if (
        identidades.length !==
        1
    ) {
        return null;
    }

    return identidades[0];
}

function criarResultadoMultiempregadoFolhaPontoLote({
    status,
    detalhe = "",
    identidadesDocumentais = [],
}) {
    return {
        status,

        criterio:
            "MULTIEMPREGADO_DOCUMENTAL",

        colaborador:
            null,

        candidatos:
            [],

        detalhe,

        identidadeDocumental:
            null,

        identidadesDocumentais:
            Array.isArray(
                identidadesDocumentais
            )
                ? identidadesDocumentais
                : [],

        multiempregadoDocumental:
            true,
    };
}

function resolverIdentidadeEmpregadoDocumentalEmpresaLote({
    identidade,
    colaboradores = [],
    empresaId = "",
}) {
    const numero =
        somenteDigitosIdentidadeLote(
            identidade?.numero
        );

    const nome =
        normalizarTextoIdentidadeLote(
            identidade?.nome
        );

    const lista =
        Array.isArray(
            colaboradores
        )
            ? colaboradores
            : [];

    const mesmaEmpresa =
        lista.filter(
            (colaborador) =>
                textoSeguro(
                    obterEmpresaIdColaboradorIdentidadeLote(
                        colaborador
                    )
                ) ===
                empresaId
        );

    if (
        mesmaEmpresa.length ===
        0
    ) {
        return {
            status:
                "NAO_CADASTRADO_CONFIRMADO",

            criterio:
                "EMPRESA_SEM_COLABORADORES",

            numero,
            nome,

            colaborador:
                null,
        };
    }

    const candidatosNumero =
        numero
            ? mesmaEmpresa.filter(
                (colaborador) =>
                    obterMatriculasColaboradorIdentidadeLote(
                        colaborador
                    )
                        .map(
                            somenteDigitosIdentidadeLote
                        )
                        .includes(
                            numero
                        )
            )
            : [];

    const candidatosNome =
        nome
            ? mesmaEmpresa.filter(
                (colaborador) =>
                    normalizarTextoIdentidadeLote(
                        obterNomeColaboradorIdentidadeLote(
                            colaborador
                        )
                    ) ===
                    nome
            )
            : [];

    if (
        candidatosNumero.length ===
            1 &&
        candidatosNome.length ===
            1 &&
        obterIdColaboradorIdentidadeLote(
            candidatosNumero[0]
        ) ===
        obterIdColaboradorIdentidadeLote(
            candidatosNome[0]
        )
    ) {
        return {
            status:
                "LOCALIZADO",

            criterio:
                "EMPREGADO_NUMERO_NOME",

            numero,
            nome,

            colaborador:
                candidatosNome[0],
        };
    }

    if (
        candidatosNumero.length >
            1 ||
        candidatosNome.length >
            1
    ) {
        return {
            status:
                "AMBIGUO",

            criterio:
                "EMPREGADO_DOCUMENTAL",

            numero,
            nome,

            colaborador:
                null,
        };
    }

    if (
        candidatosNumero.length ===
            1 &&
        candidatosNome.length ===
            0
    ) {
        return {
            status:
                "CONFLITO_IDENTIDADE",

            criterio:
                "EMPREGADO_NUMERO_NOME",

            numero,
            nome,

            colaborador:
                null,
        };
    }

    if (
        candidatosNome.length ===
        1
    ) {
        return {
            status:
                "LOCALIZADO",

            criterio:
                "NOME_EXATO_EMPRESA",

            numero,
            nome,

            colaborador:
                candidatosNome[0],
        };
    }

    return {
        status:
            "IDENTIDADE_DOCUMENTAL_INSUFICIENTE",

        criterio:
            "EMPREGADO_DOCUMENTAL",

        numero,
        nome,

        colaborador:
            null,
    };
}

function resolverMultiempregadoFolhaPontoLote({
    textoExtraido,
    colaboradores = [],
    empresaDocumento = null,

    estadoConsultaColaboradores =
        "BASE_CONFIRMADA",

    detalheConsultaColaboradores =
        "",
}) {
    const identidades =
        extrairIdentidadesEmpregadoFolhaPontoLote(
            textoExtraido
        );

    /*
     * Documento singular continua integralmente no motor legado.
     */
    if (
        identidades.length <
        2
    ) {
        return null;
    }

    if (
        estadoConsultaColaboradores !==
        "BASE_CONFIRMADA"
    ) {
        return criarResultadoMultiempregadoFolhaPontoLote({
            status:
                "CONSULTA_INCONCLUSIVA",

            detalhe:
                detalheConsultaColaboradores ||
                "A consulta de colaboradores do SafeScan não foi confirmada para o Espelho multiempregado.",

            identidadesDocumentais:
                identidades,
        });
    }

    if (
        textoSeguro(
            empresaDocumento?.status
        )
            .toUpperCase() !==
        "IDENTIFICADA"
    ) {
        return null;
    }

    const empresaId =
        textoSeguro(
            empresaDocumento?.id
        );

    if (!empresaId) {
        return criarResultadoMultiempregadoFolhaPontoLote({
            status:
                "CONSULTA_INCONCLUSIVA",

            detalhe:
                "A empresa do Espelho foi identificada, mas não possui ID cadastral disponível para o cruzamento multiempregado.",

            identidadesDocumentais:
                identidades,
        });
    }

    const resultados =
        identidades.map(
            (identidade) =>
                resolverIdentidadeEmpregadoDocumentalEmpresaLote({
                    identidade,
                    colaboradores,
                    empresaId,
                })
        );

    if (
        resultados.some(
            (resultado) =>
                resultado.status ===
                "NAO_CADASTRADO_CONFIRMADO"
        )
    ) {
        return criarResultadoMultiempregadoFolhaPontoLote({
            status:
                "NAO_CADASTRADO_CONFIRMADO",

            detalhe:
                (
                    "O Espelho de Ponto identifica " +
                    resultados.length +
                    " trabalhadores, mas a empresa não possui colaboradores cadastrados correspondentes no snapshot confirmado do SafeScan."
                ),

            identidadesDocumentais:
                resultados,
        });
    }

    if (
        resultados.every(
            (resultado) =>
                resultado.status ===
                "LOCALIZADO"
        )
    ) {
        return criarResultadoMultiempregadoFolhaPontoLote({
            status:
                "LOCALIZADO",

            detalhe:
                (
                    resultados.length +
                    " trabalhadores do Espelho de Ponto foram confirmados individualmente dentro da empresa identificada."
                ),

            identidadesDocumentais:
                resultados,
        });
    }

    if (
        resultados.some(
            (resultado) =>
                resultado.status ===
                "AMBIGUO"
        )
    ) {
        return criarResultadoMultiempregadoFolhaPontoLote({
            status:
                "AMBIGUO",

            detalhe:
                "O Espelho possui múltiplos trabalhadores e pelo menos uma identidade cadastral permaneceu ambígua.",

            identidadesDocumentais:
                resultados,
        });
    }

    return criarResultadoMultiempregadoFolhaPontoLote({
        status:
            "IDENTIDADE_DOCUMENTAL_INSUFICIENTE",

        detalhe:
            (
                "O Espelho possui " +
                resultados.length +
                " trabalhadores identificados documentalmente, mas nem todos puderam ser confirmados com segurança no cadastro da empresa."
            ),

        identidadesDocumentais:
            resultados,
    });
}

function criarResultadoColaboradorIdentidadeLote({
    status,
    criterio = "",
    colaborador = null,
    candidatos = [],
    detalhe = "",

    identidadeDocumental = null,
}) {
    return {
        status,

        criterio,

        colaborador,

        candidatos,

        detalhe,

        identidadeDocumental,
    };
}

function resolverEstadoInicialIdentidadeColaboradorLote({
    estadoConsultaColaboradores =
        "BASE_CONFIRMADA",

    detalheConsultaColaboradores =
        "",

    quantidadeColaboradores =
        0,

    cpfsDocumento = [],

    identidadeDocumental = null,
}) {
    const estadoConsulta =
        String(
            estadoConsultaColaboradores ||
            ""
        )
            .trim()
            .toUpperCase();

    if (
        estadoConsulta !==
        "BASE_CONFIRMADA"
    ) {
        return {
            status:
                "CONSULTA_INCONCLUSIVA",

            criterio:
                "BASE_SAFESCAN",

            detalhe:
                String(
                    detalheConsultaColaboradores ||
                    "A base de colaboradores não pôde ser confirmada nesta operação."
                ),
        };
    }

    if (
        Number(
            quantidadeColaboradores
        ) ===
        0
    ) {
        if (
            Array.isArray(
                cpfsDocumento
            ) &&
            cpfsDocumento.length > 0
        ) {
            return {
                status:
                    "NAO_CADASTRADO_CONFIRMADO",

                criterio:
                    "CPF",

                detalhe:
                    "A base do SafeScan foi consultada com sucesso, mas o CPF válido do PDF não corresponde a colaborador cadastrado.",
            };
        }

        if (
            identidadeDocumental
                ?.numero &&
            identidadeDocumental
                ?.nome
        ) {
            return {
                status:
                    "NAO_CADASTRADO_CONFIRMADO",

                criterio:
                    "EMPREGADO_DOCUMENTAL",

                detalhe:
                    (
                        "A base do SafeScan foi consultada com sucesso. " +
                        "O Espelho de Ponto identifica o trabalhador " +
                        identidadeDocumental.nome +
                        " (empregado " +
                        identidadeDocumental.numero +
                        "), mas não existe colaborador cadastrado correspondente."
                    ),

                identidadeDocumental,
            };
        }

        return {
            status:
                "IDENTIDADE_DOCUMENTAL_INSUFICIENTE",

            criterio:
                "CONTEUDO_DOCUMENTAL",

            detalhe:
                "A base do SafeScan foi consultada com sucesso, porém o PDF não forneceu identidade individual suficiente para confirmar o trabalhador com segurança.",
        };
    }

    return null;
}

function decidirAcaoIdentidadeColaboradorLote(
    status
) {
    const normalizado =
        String(
            status ||
            ""
        )
            .trim()
            .toUpperCase();

    if (
        normalizado ===
        "LOCALIZADO"
    ) {
        return "CONTINUAR";
    }

    if (
        normalizado ===
        "NAO_CADASTRADO_CONFIRMADO"
    ) {
        return "BLOQUEAR";
    }

    return "REVISAR";
}

function resolverColaboradorPorConteudoLote({
    textoExtraido,
    colaboradores = [],

    tipoDocumento = "",

    empresaDocumentoIdentificada =
        false,

    estadoConsultaColaboradores =
        "BASE_CONFIRMADA",

    detalheConsultaColaboradores =
        "",
}) {
    const lista =
        Array.isArray(
            colaboradores
        )
            ? colaboradores.filter(
                Boolean
            )
            : [];

    const textoNormalizado =
        normalizarTextoIdentidadeLote(
            textoExtraido
        );

    const cpfsDocumento =
        extrairCpfsIdentidadeLote(
            textoExtraido
        );

    const identidadeDocumental =
        (
            textoSeguro(
                tipoDocumento
            )
                .toLowerCase() ===
                "folha-ponto" &&
            empresaDocumentoIdentificada ===
                true
        )
            ? extrairIdentidadeEmpregadoFolhaPontoLote(
                textoExtraido
            )
            : null;

    const estadoInicial =
        resolverEstadoInicialIdentidadeColaboradorLote({
            estadoConsultaColaboradores,
            detalheConsultaColaboradores,

            quantidadeColaboradores:
                lista.length,

            cpfsDocumento,

            identidadeDocumental,
        });

    if (estadoInicial) {
        return criarResultadoColaboradorIdentidadeLote(
            estadoInicial
        );
    }

    if (
        cpfsDocumento.length > 0
    ) {
        const candidatosCpf =
            lista.filter(
                (colaborador) => {
                    const cpf =
                        obterCpfColaboradorIdentidadeLote(
                            colaborador
                        );

                    return (
                        cpf &&
                        cpfsDocumento.includes(
                            cpf
                        )
                    );
                }
            );

        if (
            candidatosCpf.length ===
            1
        ) {
            return criarResultadoColaboradorIdentidadeLote({
                status:
                    "LOCALIZADO",

                criterio:
                    "CPF",

                colaborador:
                    candidatosCpf[0],
            });
        }

        if (
            candidatosCpf.length >
            1
        ) {
            return criarResultadoColaboradorIdentidadeLote({
                status:
                    "AMBIGUO",

                criterio:
                    "CPF",

                candidatos:
                    candidatosCpf,

                detalhe:
                    "O CPF do documento corresponde a mais de um cadastro.",
            });
        }
    }

    const candidatosMatricula =
        lista.filter(
            (colaborador) =>
                obterMatriculasColaboradorIdentidadeLote(
                    colaborador
                ).some(
                    (matricula) =>
                        textoPossuiMatriculaIdentidadeLote({
                            textoNormalizado,
                            matricula,
                        })
                )
        );

    if (
        candidatosMatricula.length ===
        1
    ) {
        const colaborador =
            candidatosMatricula[0];

        const cpfCadastro =
            obterCpfColaboradorIdentidadeLote(
                colaborador
            );

        if (
            cpfsDocumento.length > 0 &&
            cpfCadastro &&
            !cpfsDocumento.includes(
                cpfCadastro
            )
        ) {
            return criarResultadoColaboradorIdentidadeLote({
                status:
                    "CONFLITO_CPF",

                criterio:
                    "MATRICULA_ESOCIAL",

                colaborador,

                detalhe:
                    "O colaborador foi localizado por matrícula/eSocial, porém o CPF válido encontrado no documento diverge do CPF cadastrado. Revisão humana obrigatória.",
            });
        }

        return criarResultadoColaboradorIdentidadeLote({
            status:
                "LOCALIZADO",

            criterio:
                "MATRICULA_ESOCIAL",

            colaborador,
        });
    }

    if (
        candidatosMatricula.length >
        1
    ) {
        return criarResultadoColaboradorIdentidadeLote({
            status:
                "AMBIGUO",

            criterio:
                "MATRICULA_ESOCIAL",

            candidatos:
                candidatosMatricula,

            detalhe:
                "A matrícula/eSocial do documento corresponde a mais de um cadastro.",
        });
    }

    const candidatosNome =
        lista.filter(
            (colaborador) =>
                nomeApareceComoFraseIdentidadeLote({
                    textoNormalizado,

                    nome:
                        obterNomeColaboradorIdentidadeLote(
                            colaborador
                        ),
                })
        );

    if (
        candidatosNome.length ===
        1
    ) {
        const colaborador =
            candidatosNome[0];

        const cpfCadastro =
            obterCpfColaboradorIdentidadeLote(
                colaborador
            );

        if (
            cpfsDocumento.length > 0 &&
            cpfCadastro &&
            !cpfsDocumento.includes(
                cpfCadastro
            )
        ) {
            return criarResultadoColaboradorIdentidadeLote({
                status:
                    "CONFLITO_CPF",

                criterio:
                    "NOME_COMPLETO_UNICO",

                colaborador,

                detalhe:
                    "O colaborador foi localizado por nome completo único, porém o CPF válido encontrado no documento diverge do CPF cadastrado. Revisão humana obrigatória.",
            });
        }

        return criarResultadoColaboradorIdentidadeLote({
            status:
                "LOCALIZADO",

            criterio:
                "NOME_COMPLETO_UNICO",

            colaborador,
        });
    }

    if (
        candidatosNome.length >
        1
    ) {
        return criarResultadoColaboradorIdentidadeLote({
            status:
                "AMBIGUO",

            criterio:
                "NOME_COMPLETO_UNICO",

            candidatos:
                candidatosNome,

            detalhe:
                "O nome encontrado no PDF não identifica um único colaborador.",
        });
    }

    if (
        cpfsDocumento.length > 0
    ) {
        return criarResultadoColaboradorIdentidadeLote({
            status:
                "NAO_CADASTRADO_CONFIRMADO",

            criterio:
                "CPF",

            detalhe:
                "A base do SafeScan foi consultada com sucesso. Foi encontrado CPF válido no PDF, mas ele não corresponde a colaborador cadastrado e nenhum colaborador pôde ser confirmado por matrícula/eSocial ou nome completo único.",
        });
    }

    if (
        identidadeDocumental
            ?.numero &&
        identidadeDocumental
            ?.nome
    ) {
        return criarResultadoColaboradorIdentidadeLote({
            status:
                "NAO_CADASTRADO_CONFIRMADO",

            criterio:
                "EMPREGADO_DOCUMENTAL",

            detalhe:
                (
                    "A base do SafeScan foi consultada com sucesso. " +
                    "O Espelho de Ponto identifica o trabalhador " +
                    identidadeDocumental.nome +
                    " (empregado " +
                    identidadeDocumental.numero +
                    "), mas nenhum colaborador cadastrado pôde ser confirmado por CPF, matrícula/eSocial ou nome completo."
                ),

            identidadeDocumental,
        });
    }

    return criarResultadoColaboradorIdentidadeLote({
        status:
            "IDENTIDADE_DOCUMENTAL_INSUFICIENTE",

        criterio:
            "CONTEUDO_DOCUMENTAL",

        detalhe:
            "A base do SafeScan foi consultada com sucesso, mas o conteúdo do PDF não permitiu confirmar um único colaborador por CPF, matrícula/eSocial ou nome completo.",
    });
}

// ============================================================
// SAFE_SCAN_CERT2_R11_IDENTIDADE_UNICA
// Uma resolução de identidade por documento canônico e operação.
// ============================================================

function itemElegivelIdentidadeColaboradorLote(
    item
) {
    const tipoDocumento =
        obterTipoResolucaoLote(
            item
        );

    return (
        tipoDocumento ===
            "folha-ponto" ||
        ehComplementarFinanceiroFolha(
            item
        ) ||
        itemElegivelFallbackColaboradorLote(
            item
        )
    );
}

function obterChaveIdentidadeColaboradorLote(
    item,
    posicao
) {
    return Number.isInteger(
        item?.indice
    )
        ? item.indice
        : "POSICAO:" +
            String(
                posicao
            );
}

function criarMapaIdentidadesColaboradorLote({
    itens = [],
    colaboradores = [],

    estadoConsultaColaboradores =
        "BASE_CONFIRMADA",

    detalheConsultaColaboradores =
        "",
}) {
    const mapa =
        new Map();

    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    lista.forEach(
        (item, posicao) => {
            if (
                item?.erro ||
                !itemElegivelIdentidadeColaboradorLote(
                    item
                )
            ) {
                return;
            }

            const textoExtraido =
                item
                    ?.leitura
                    ?.textoExtraido ||
                "";

            const tipoDocumento =
                obterTipoResolucaoLote(
                    item
                );

            const empresaDocumento =
                item
                    ?.resolucao
                    ?.empresa ||
                {};

            const multiempregado =
                tipoDocumento ===
                    "folha-ponto" &&
                textoSeguro(
                    empresaDocumento?.status
                )
                    .toUpperCase() ===
                    "IDENTIFICADA"
                    ? resolverMultiempregadoFolhaPontoLote({
                        textoExtraido,
                        colaboradores,
                        empresaDocumento,
                        estadoConsultaColaboradores,
                        detalheConsultaColaboradores,
                    })
                    : null;

            const identidade =
                multiempregado ||
                resolverColaboradorPorConteudoLote({
                    textoExtraido,

                    tipoDocumento,

                    empresaDocumentoIdentificada:
                        textoSeguro(
                            empresaDocumento?.status
                        )
                            .toUpperCase() ===
                        "IDENTIFICADA",

                    colaboradores,
                    estadoConsultaColaboradores,
                    detalheConsultaColaboradores,
                });

            mapa.set(
                obterChaveIdentidadeColaboradorLote(
                    item,
                    posicao
                ),

                identidade
            );
        }
    );

    return mapa;
}

function obterIdentidadeColaboradorResolvidaLote({
    item,
    posicao,
    identidadesPorIndice,
}) {
    if (
        !identidadesPorIndice ||
        typeof identidadesPorIndice.get !==
            "function"
    ) {
        return null;
    }

    return (
        identidadesPorIndice.get(
            obterChaveIdentidadeColaboradorLote(
                item,
                posicao
            )
        ) ||
        null
    );
}

function encontrarEmpresaColaboradorIdentidadeLote({
    colaborador,
    empresas = [],
}) {
    const empresaId =
        obterEmpresaIdColaboradorIdentidadeLote(
            colaborador
        );

    if (!empresaId) {
        return {
            status:
                "COLABORADOR_SEM_EMPRESA",

            empresa:
                null,

            empresaId:
                "",
        };
    }

    const candidatas =
        (
            Array.isArray(
                empresas
            )
                ? empresas
                : []
        ).filter(
            (empresa) =>
                textoSeguro(
                    empresa?.id
                ) ===
                empresaId
        );

    if (
        candidatas.length !== 1
    ) {
        return {
            status:
                "EMPRESA_FORA_CANDIDATAS",

            empresa:
                null,

            empresaId,
        };
    }

    return {
        status:
            "EMPRESA_LOCALIZADA",

        empresa:
            candidatas[0],

        empresaId,
    };
}

function obterCnpjPropostoEmpresaIdentidadeLote(
    empresa
) {
    const vinculados =
        empresa?.cnpjsVinculados ||
        empresa?.cnpjs_vinculados ||
        [];

    const candidatos =
        [
            empresa?.cnpj,

            ...(
                Array.isArray(
                    vinculados
                )
                    ? vinculados.map(
                        (vinculo) =>
                            vinculo?.cnpj
                    )
                    : []
            ),
        ];

    for (
        const candidato
        of candidatos
    ) {
        const cnpj =
            somenteDigitosIdentidadeLote(
                candidato
            );

        if (
            cnpj.length === 14
        ) {
            return (
                cnpj.slice(
                    0,
                    2
                ) +
                "." +
                cnpj.slice(
                    2,
                    5
                ) +
                "." +
                cnpj.slice(
                    5,
                    8
                ) +
                "/" +
                cnpj.slice(
                    8,
                    12
                ) +
                "-" +
                cnpj.slice(
                    12
                )
            );
        }
    }

    return "";
}

function resumirCandidatosColaboradorIdentidadeLote(
    candidatos
) {
    return (
        Array.isArray(
            candidatos
        )
            ? candidatos
            : []
    ).map(
        (colaborador) => ({
            id:
                obterIdColaboradorIdentidadeLote(
                    colaborador
                ),

            nome:
                textoSeguro(
                    colaborador?.nome ||
                    colaborador?.nomeCompleto ||
                    colaborador?.nome_completo
                ),

            empresaId:
                obterEmpresaIdColaboradorIdentidadeLote(
                    colaborador
                ),
        })
    );
}

// ============================================================
// SAFE_SCAN_EMPRESA_COLABORADOR_GUARD_D2_R1E_R2
// ============================================================

const TIPOS_DOCUMENTAIS_FALLBACK_COLABORADOR_PRINCIPAL =
    new Set([
        "folha-ponto",
    ]);

// ============================================================
// SAFE_SCAN_CERT2_M4_B2_ESCOPO_INDIVIDUAL_V1
//
// Ser complementar não prova que o sujeito documental seja
// um colaborador.
//
// A elegibilidade individual permanece restrita aos tipos
// explicitamente individuais.
//
// Os complementares financeiros de Folha continuam tratados
// separadamente por ehComplementarFinanceiroFolha(item).
// ============================================================

// ============================================================
// SAFE_SCAN_CERT2_M4_B8_FINANCEIRO_INDIVIDUAL_V1
//
// Fallback por colaborador continua restrito a documentos
// explicitamente individualizados.
//
// Ser "complementar" por si só NÃO é suficiente.
// ============================================================

function itemElegivelFallbackColaboradorLote(
    item
) {
    return (
        TIPOS_DOCUMENTAIS_FALLBACK_COLABORADOR_PRINCIPAL
            .has(
                obterTipoResolucaoLote(
                    item
                )
            ) ||
        ehComplementarFinanceiroFolha(
            item
        )
    );
}

function itemIgnoradoFinanceiroElegivelRaciocinioLote(
    item
) {
    return Boolean(
        item?.resolucao?.status ===
            "IGNORADO" &&
        ehComplementarFinanceiroFolha(
            item
        )
    );
}

function aplicarGuardEmpresaNaoCadastradaLote(
    itens = []
) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    return lista.map(
        (item) => {
            if (
                item?.erro ||
                obterTipoResolucaoLote(
                    item
                ) !==
                    "folha-ponto"
            ) {
                return item;
            }

            const resolucao =
                item?.resolucao ||
                {};

            const empresa =
                resolucao?.empresa ||
                {};

            const statusEmpresa =
                textoSeguro(
                    empresa?.status
                ).toUpperCase();

            if (
                statusEmpresa !==
                    "NAO_ENCONTRADA" &&
                statusEmpresa !==
                    "AMBIGUA"
            ) {
                return item;
            }

            const codigo =
                statusEmpresa ===
                    "NAO_ENCONTRADA"
                    ? "EMPRESA_NAO_CADASTRADA_REQUER_REVISAO"
                    : "EMPRESA_AMBIGUA_REQUER_REVISAO";

            const mensagem =
                statusEmpresa ===
                    "NAO_ENCONTRADA"
                    ? (
                        "O PDF contém CNPJ que não corresponde a empresa cadastrada no SafeScan. " +
                        "O documento deve permanecer em revisão e não pode receber associação automática de empresa."
                    )
                    : (
                        "A empresa do PDF não pôde ser determinada de forma inequívoca. " +
                        "O documento deve permanecer em revisão e não pode receber associação automática."
                    );

            const motivosAtuais =
                Array.isArray(
                    resolucao?.motivos
                )
                    ? resolucao.motivos
                    : [];

            return {
                ...item,

                resolucao: {
                    ...resolucao,

                    status:
                        "REVISAR",

                    motivos: [
                        {
                            codigo,
                            mensagem,
                        },

                        ...motivosAtuais.filter(
                            (motivo) =>
                                textoSeguro(
                                    motivo?.codigo
                                ) !==
                                codigo
                        ),
                    ],

                    prontoParaRevisao:
                        true,

                    persistenciaAutomatica:
                        false,

                    persistido:
                        false,
                },

                persistido:
                    false,
            };
        }
    );
}

function criarIdentificacaoColaboradorParaGuardLote(
    identidade
) {
    const identidadesDocumentais =
        Array.isArray(
            identidade?.identidadesDocumentais
        )
            ? identidade
                .identidadesDocumentais
                .map(
                    (item) => ({
                        numero:
                            somenteDigitosIdentidadeLote(
                                item?.numero
                            ),

                        nome:
                            textoSeguro(
                                item?.nome
                            ),

                        status:
                            textoSeguro(
                                item?.status
                            ),

                        criterio:
                            textoSeguro(
                                item?.criterio
                            ),

                        id:
                            obterIdColaboradorIdentidadeLote(
                                item?.colaborador
                            ),

                        empresaId:
                            obterEmpresaIdColaboradorIdentidadeLote(
                                item?.colaborador
                            ),
                    })
                )
            : [];

    return {
        status:
            identidade?.status ||
            "",

        criterio:
            identidade?.criterio ||
            "",

        id:
            obterIdColaboradorIdentidadeLote(
                identidade?.colaborador
            ),

        nome:
            textoSeguro(
                identidade
                    ?.colaborador
                    ?.nome ||
                identidade
                    ?.colaborador
                    ?.nomeCompleto ||
                identidade
                    ?.colaborador
                    ?.nome_completo ||
                identidade
                    ?.identidadeDocumental
                    ?.nome
            ),

        empresaId:
            obterEmpresaIdColaboradorIdentidadeLote(
                identidade?.colaborador
            ),

        detalhe:
            identidade?.detalhe ||
            "",

        candidatos:
            resumirCandidatosColaboradorIdentidadeLote(
                identidade?.candidatos
            ),

        identidadesDocumentais,

        quantidadeIdentidadesDocumentais:
            identidadesDocumentais.length,

        multiempregadoDocumental:
            identidade
                ?.multiempregadoDocumental ===
            true,

        origem:
            "CONTEUDO_DOCUMENTAL",
    };
}

// ============================================================
// SAFE_SCAN_BLOQUEIO_COLABORADOR_NAO_CADASTRADO_D2_R1K_R2
// Restaurado em M4-E2-B-R1 após regressão de escopo do replacement E2-B.
// ============================================================

const CODIGO_COLABORADOR_NAO_CADASTRADO_SAFE_SCAN =
    "COLABORADOR_NAO_CADASTRADO_SAFE_SCAN";

function bloquearDocumentoColaboradorNaoCadastradoLote({
    item,
    resolucao,
    identificacaoColaborador,
}) {
    const motivosAtuais =
        Array.isArray(
            resolucao?.motivos
        )
            ? resolucao.motivos
            : [];

    const mensagem =
        (
            "Documento individual de trabalhador bloqueado: " +
            "nenhum colaborador correspondente foi localizado " +
            "no cadastro do SafeScan. Este arquivo não poderá " +
            "ser incluído no envio enquanto o colaborador não " +
            "estiver cadastrado."
        );

    return {
        ...item,

        resolucao: {
            ...resolucao,

            status:
                "BLOQUEADO",

            identificacaoColaborador,

            motivos: [
                {
                    codigo:
                        CODIGO_COLABORADOR_NAO_CADASTRADO_SAFE_SCAN,

                    mensagem,
                },

                ...motivosAtuais.filter(
                    (motivo) =>
                        textoSeguro(
                            motivo?.codigo
                        ) !==
                        CODIGO_COLABORADOR_NAO_CADASTRADO_SAFE_SCAN
                ),
            ],

            prontoParaRevisao:
                false,

            persistenciaAutomatica:
                false,

            persistido:
                false,
        },

        persistido:
            false,
    };
}

// ============================================================
// SAFE_SCAN_CERT2_R11_ESTADOS_IDENTIDADE
// Estados inconclusivos nunca viram falsa ausência cadastral.
// ============================================================

function obterCodigoRevisaoIdentidadeColaboradorLote(
    status
) {
    const normalizado =
        String(
            status ||
            ""
        )
            .trim()
            .toUpperCase();

    if (
        normalizado ===
        "AMBIGUO"
    ) {
        return "COLABORADOR_AMBIGUO";
    }

    if (
        normalizado ===
        "CONFLITO_CPF"
    ) {
        return "CONFLITO_CPF_DOCUMENTO_CADASTRO";
    }

    if (
        normalizado ===
        "CONSULTA_INCONCLUSIVA"
    ) {
        return "CONSULTA_COLABORADOR_INCONCLUSIVA";
    }

    if (
        normalizado ===
        "IDENTIDADE_DOCUMENTAL_INSUFICIENTE"
    ) {
        return "IDENTIDADE_COLABORADOR_INSUFICIENTE";
    }

    return "IDENTIDADE_COLABORADOR_REQUER_REVISAO";
}

function marcarDocumentoIdentidadeColaboradorRevisaoLote({
    item,
    resolucao,
    identidade,
    identificacaoColaborador,
}) {
    const codigo =
        obterCodigoRevisaoIdentidadeColaboradorLote(
            identidade?.status
        );

    const mensagem =
        identidade?.detalhe ||
        "A identidade do colaborador não pôde ser confirmada automaticamente. Revisão humana obrigatória.";

    const motivosAtuais =
        Array.isArray(
            resolucao?.motivos
        )
            ? resolucao.motivos
            : [];

    const codigosIdentidade =
        new Set([
            "COLABORADOR_AMBIGUO",
            "CONFLITO_CPF_DOCUMENTO_CADASTRO",
            "CONSULTA_COLABORADOR_INCONCLUSIVA",
            "IDENTIDADE_COLABORADOR_INSUFICIENTE",
            "IDENTIDADE_COLABORADOR_REQUER_REVISAO",
        ]);

    return {
        ...item,

        resolucao: {
            ...resolucao,

            status:
                "REVISAR",

            identificacaoColaborador,

            motivos: [
                {
                    codigo,
                    mensagem,
                },

                ...motivosAtuais.filter(
                    (motivo) =>
                        !codigosIdentidade.has(
                            textoSeguro(
                                motivo?.codigo
                            )
                        )
                ),
            ],

            prontoParaRevisao:
                true,

            persistenciaAutomatica:
                false,

            persistido:
                false,
        },

        persistido:
            false,
    };
}

function aplicarGuardDivergenciaEmpresaColaboradorLote({
    itens = [],

    identidadesPorIndice =
        new Map(),

    empresas = [],
}) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    return lista.map(
        (item, posicao) => {
            // ====================================================
            // SAFE_SCAN_IDENTIFICACAO_COLABORADOR_EMPRESA_JA_IDENTIFICADA_D2_R1J
            //
            // Somente documentos individualizados.
            // CEAT/TRT e documentos empresariais permanecem fora.
            // ====================================================
            const tipoDocumento =
                obterTipoResolucaoLote(
                    item
                );

            const elegivelIdentificacaoColaborador =
                (
                    tipoDocumento ===
                        "folha-ponto" ||
                    ehComplementarFinanceiroFolha(
                        item
                    )
                );

            if (
                item?.erro ||
                !elegivelIdentificacaoColaborador
            ) {
                return item;
            }

            const resolucao =
                item?.resolucao ||
                {};

            const empresaDocumento =
                resolucao?.empresa ||
                {};

            if (
                textoSeguro(
                    empresaDocumento?.status
                ).toUpperCase() !==
                    "IDENTIFICADA"
            ) {
                return item;
            }

            const identidade =
                obterIdentidadeColaboradorResolvidaLote({
                    item,
                    posicao,
                    identidadesPorIndice,
                }) ||
                criarResultadoColaboradorIdentidadeLote({
                    status:
                        "CONSULTA_INCONCLUSIVA",

                    criterio:
                        "BASE_SAFESCAN",

                    detalhe:
                        "A identidade centralizada do colaborador não ficou disponível para este documento.",
                });

            // SAFE_SCAN_BLOQUEIO_IDENTIFICADA_D2_R1K_R2
            if (
                decidirAcaoIdentidadeColaboradorLote(
                    identidade.status
                ) ===
                    "BLOQUEAR"
            ) {
                const identificacaoColaborador =
                    criarIdentificacaoColaboradorParaGuardLote(
                        identidade
                    );

                return bloquearDocumentoColaboradorNaoCadastradoLote({
                    item,
                    resolucao,
                    identificacaoColaborador,
                });
            }

            if (
                decidirAcaoIdentidadeColaboradorLote(
                    identidade.status
                ) ===
                    "REVISAR"
            ) {
                const identificacaoColaborador =
                    criarIdentificacaoColaboradorParaGuardLote(
                        identidade
                    );

                return marcarDocumentoIdentidadeColaboradorRevisaoLote({
                    item,
                    resolucao,
                    identidade,
                    identificacaoColaborador,
                });
            }

            const identificacaoColaborador =
                criarIdentificacaoColaboradorParaGuardLote(
                    identidade
                );

            /*
             * A identificação do trabalhador é informativa e
             * documental. Ela pode ser preservada sem alterar
             * empresa, competência, origem ou status da resolução.
             */
            const itemComIdentificacaoColaborador = {
                ...item,

                resolucao: {
                    ...resolucao,

                    identificacaoColaborador,
                },
            };

            if (
                identidade
                    ?.multiempregadoDocumental ===
                    true &&
                Array.isArray(
                    identidade
                        ?.identidadesDocumentais
                ) &&
                identidade
                    .identidadesDocumentais
                    .length >=
                    2
            ) {
                /*
                 * Todos os empregados já foram avaliados individualmente
                 * contra a empresa documental no resolver multi.
                 *
                 * Não escolher um colaborador arbitrário apenas para
                 * satisfazer o contrato singular legado.
                 */
                return {
                    ...item,

                    resolucao: {
                        ...resolucao,

                        identificacaoColaborador,
                    },
                };
            }

            const vinculoEmpresa =
                encontrarEmpresaColaboradorIdentidadeLote({
                    colaborador:
                        identidade.colaborador,

                    empresas,
                });

            if (
                vinculoEmpresa.status !==
                    "EMPRESA_LOCALIZADA"
            ) {
                return itemComIdentificacaoColaborador;
            }

            const empresaColaborador =
                vinculoEmpresa.empresa ||
                {};

            const empresaDocumentoId =
                textoSeguro(
                    empresaDocumento?.id
                );

            const empresaColaboradorId =
                textoSeguro(
                    empresaColaborador?.id
                );

            if (
                !empresaDocumentoId ||
                !empresaColaboradorId
            ) {
                return itemComIdentificacaoColaborador;
            }

            if (
                empresaDocumentoId ===
                    empresaColaboradorId
            ) {
                return itemComIdentificacaoColaborador;
            }

            const cnpjEmpresaColaborador =
                obterCnpjPropostoEmpresaIdentidadeLote(
                    empresaColaborador
                );

            const motivo = {
                codigo:
                    "DIVERGENCIA_EMPRESA_DOCUMENTAL_COLABORADOR",

                mensagem:
                    (
                        "O documento individual identifica o colaborador " +
                        (
                            identificacaoColaborador.nome ||
                            identificacaoColaborador.id ||
                            "localizado"
                        ) +
                        ", cadastrado em " +
                        (
                            textoSeguro(
                                empresaColaborador?.nome
                            ) ||
                            empresaColaboradorId
                        ) +
                        (
                            cnpjEmpresaColaborador
                                ? (
                                    " (" +
                                    cnpjEmpresaColaborador +
                                    ")"
                                )
                                : ""
                        ) +
                        ", porém o CNPJ empresarial do PDF foi associado a " +
                        (
                            textoSeguro(
                                empresaDocumento?.nome
                            ) ||
                            empresaDocumentoId
                        ) +
                        ". Revisão humana obrigatória; nenhuma empresa foi substituída automaticamente."
                    ),
            };

            const motivosAtuais =
                Array.isArray(
                    resolucao?.motivos
                )
                    ? resolucao.motivos
                    : [];

            return {
                ...item,

                resolucao: {
                    ...resolucao,

                    status:
                        "REVISAR",

                    identificacaoColaborador,

                    divergenciaEmpresaColaborador: {
                        detectada:
                            true,

                        empresaDocumento: {
                            id:
                                empresaDocumentoId,

                            nome:
                                textoSeguro(
                                    empresaDocumento?.nome
                                ),

                            cnpj:
                                textoSeguro(
                                    empresaDocumento
                                        ?.cnpjCorrespondente
                                ),
                        },

                        empresaCadastroColaborador: {
                            id:
                                empresaColaboradorId,

                            nome:
                                textoSeguro(
                                    empresaColaborador?.nome
                                ),

                            cnpj:
                                cnpjEmpresaColaborador,
                        },
                    },

                    motivos: [
                        motivo,

                        ...motivosAtuais.filter(
                            (motivoAtual) =>
                                textoSeguro(
                                    motivoAtual?.codigo
                                ) !==
                                motivo.codigo
                        ),
                    ],

                    prontoParaRevisao:
                        true,

                    persistenciaAutomatica:
                        false,

                    persistido:
                        false,
                },

                persistido:
                    false,
            };
        }
    );
}

function aplicarFallbackColaboradorLote({
    itens = [],

    identidadesPorIndice =
        new Map(),

    empresas = [],
}) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    return lista.map(
        (item, posicao) => {
            const resolucao =
                item?.resolucao ||
                {};

            const empresaAtual =
                resolucao?.empresa ||
                {};

            /*
             * REGRA DE SEGURANÇA:
             *
             * - documentos complementares permanecem elegíveis;
             * - Espelho de Ponto principal também pode usar o cadastro;
             * - somente SEM_CNPJ recebe proposta via colaborador;
             * - NAO_ENCONTRADA e AMBIGUA jamais são substituídas;
             * - identidade ou vínculo inconclusivo permanece em REVISAR;
             * - somente conteúdo extraído do PDF participa da identidade.
             */

            if (
                item?.erro ||
                !itemElegivelFallbackColaboradorLote(
                    item
                ) ||
                textoSeguro(
                    empresaAtual?.status
                ).toUpperCase() !==
                    "SEM_CNPJ"
            ) {
                return item;
            }

            const identidade =
                obterIdentidadeColaboradorResolvidaLote({
                    item,
                    posicao,
                    identidadesPorIndice,
                }) ||
                criarResultadoColaboradorIdentidadeLote({
                    status:
                        "CONSULTA_INCONCLUSIVA",

                    criterio:
                        "BASE_SAFESCAN",

                    detalhe:
                        "A identidade centralizada do colaborador não ficou disponível para este documento.",
                });

            const identificacaoColaborador = {
                status:
                    identidade.status,

                criterio:
                    identidade.criterio ||
                    "",

                id:
                    obterIdColaboradorIdentidadeLote(
                        identidade
                            .colaborador
                    ),

                nome:
                    textoSeguro(
                        identidade
                            ?.colaborador
                            ?.nome ||
                        identidade
                            ?.colaborador
                            ?.nomeCompleto ||
                        identidade
                            ?.colaborador
                            ?.nome_completo
                    ),

                empresaId:
                    obterEmpresaIdColaboradorIdentidadeLote(
                        identidade
                            .colaborador
                    ),

                detalhe:
                    identidade.detalhe ||
                    "",

                candidatos:
                    resumirCandidatosColaboradorIdentidadeLote(
                        identidade
                            .candidatos
                    ),

                origem:
                    "CONTEUDO_DOCUMENTAL",
            };

            const motivosAtuais =
                Array.isArray(
                    resolucao?.motivos
                )
                    ? resolucao.motivos
                    : [];

            if (
                decidirAcaoIdentidadeColaboradorLote(
                    identidade.status
                ) !==
                    "CONTINUAR"
            ) {
                const tipoDocumentoIdentidade =
                    obterTipoResolucaoLote(
                        item
                    );

                const elegivelBloqueioColaborador =
                    (
                        tipoDocumentoIdentidade ===
                            "folha-ponto" ||
                        ehComplementarFinanceiroFolha(
                            item
                        )
                    );

                if (
                    decidirAcaoIdentidadeColaboradorLote(
                        identidade.status
                    ) ===
                        "BLOQUEAR" &&
                    elegivelBloqueioColaborador
                ) {
                    return bloquearDocumentoColaboradorNaoCadastradoLote({
                        item,
                        resolucao,
                        identificacaoColaborador,
                    });
                }

                return marcarDocumentoIdentidadeColaboradorRevisaoLote({
                    item,
                    resolucao,
                    identidade,
                    identificacaoColaborador,
                });
            }

            if (
                identidade
                    ?.multiempregadoDocumental ===
                    true &&
                Array.isArray(
                    identidade
                        ?.identidadesDocumentais
                ) &&
                identidade
                    .identidadesDocumentais
                    .length >=
                    2
            ) {
                /*
                 * Todos os empregados já foram avaliados individualmente
                 * contra a empresa documental no resolver multi.
                 *
                 * Não escolher um colaborador arbitrário apenas para
                 * satisfazer o contrato singular legado.
                 */
                return {
                    ...item,

                    resolucao: {
                        ...resolucao,

                        identificacaoColaborador,
                    },
                };
            }

            const vinculoEmpresa =
                encontrarEmpresaColaboradorIdentidadeLote({
                    colaborador:
                        identidade.colaborador,

                    empresas,
                });

            if (
                vinculoEmpresa.status !==
                "EMPRESA_LOCALIZADA"
            ) {
                const codigo =
                    vinculoEmpresa.status ===
                        "COLABORADOR_SEM_EMPRESA"
                        ? "COLABORADOR_SEM_EMPRESA"
                        : "EMPRESA_COLABORADOR_NAO_CANDIDATA";

                const mensagem =
                    vinculoEmpresa.status ===
                        "COLABORADOR_SEM_EMPRESA"
                        ? "O colaborador foi localizado, mas não possui empresa vinculada no cadastro atual."
                        : "O colaborador foi localizado, mas sua empresa atual não está disponível entre as empresas candidatas da Certidão.";

                return {
                    ...item,

                    resolucao: {
                        ...resolucao,

                        status:
                            "REVISAR",

                        identificacaoColaborador,

                        motivos: [
                            {
                                codigo,
                                mensagem,
                            },

                            ...motivosAtuais.filter(
                                (motivo) =>
                                    textoSeguro(
                                        motivo?.codigo
                                    ) !==
                                    codigo
                            ),
                        ],

                        prontoParaRevisao:
                            true,

                        persistenciaAutomatica:
                            false,

                        persistido:
                            false,
                    },
                };
            }

            const empresa =
                vinculoEmpresa.empresa;

            const cnpjProposto =
                obterCnpjPropostoEmpresaIdentidadeLote(
                    empresa
                );

            const motivoVinculo = {
                codigo:
                    "VINCULO_COLABORADOR_CADASTRO_ATUAL",

                mensagem:
                    (
                        "Empresa proposta a partir do colaborador " +
                        "localizado no cadastro atual do SafeScan por " +
                        identidade.criterio +
                        ". Esta associação não comprova sozinha o " +
                        "vínculo empresarial em competência histórica; " +
                        "a revisão humana permanece obrigatória."
                    ),
            };

            return {
                ...item,

                resolucao: {
                    ...resolucao,

                    status:
                        "REVISAR",

                    empresa: {
                        ...empresaAtual,

                        status:
                            "PROPOSTA_COLABORADOR",

                        id:
                            textoSeguro(
                                empresa?.id
                            ),

                        nome:
                            textoSeguro(
                                empresa?.nome
                            ),

                        /*
                         * Não reutilizamos cnpjCorrespondente,
                         * porque o CNPJ NÃO veio do PDF.
                         */
                        cnpjCorrespondente:
                            "",

                        cnpjProposto,

                        cnpjsDocumento:
                            Array.isArray(
                                empresaAtual
                                    ?.cnpjsDocumento
                            )
                                ? empresaAtual
                                    .cnpjsDocumento
                                : [],

                        origemIdentificacao:
                            "VINCULO_COLABORADOR_CADASTRO_ATUAL",
                    },

                    identificacaoColaborador,

                    motivos: [
                        motivoVinculo,

                        ...motivosAtuais.filter(
                            (motivo) =>
                                ![
                                    "EMPRESA_SEM_CNPJ_DOCUMENTAL",
                                    "VINCULO_COLABORADOR_CADASTRO_ATUAL",
                                ].includes(
                                    textoSeguro(
                                        motivo?.codigo
                                    )
                                )
                        ),
                    ],

                    prontoParaRevisao:
                        true,

                    persistenciaAutomatica:
                        false,

                    persistido:
                        false,
                },
            };
        }
    );
}


// ============================================================
// SAFE_SCAN_CONFLITO_LOGICO_HISTORICO_V1
//
// Aplicável SOMENTE a documento principal.
//
// Chave:
// empresa + competência + tipo documental.
//
// Já existe versão atual + SHA diferente:
// -> REVISAR;
// -> CONFLITO_LOGICO_VERSAO;
// -> nenhuma decisão automática;
// -> nenhuma persistência.
//
// Complementares ficam fora deste guard.
// ============================================================

const CODIGO_CONFLITO_LOGICO_HISTORICO =
    "CONFLITO_LOGICO_VERSAO";

function normalizarTipoDocumentoConflitoLogico(
    valor
) {
    const tipo =
        textoSeguro(
            valor
        ).toLowerCase();

    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
        tipo
    )
        ? tipo
        : "";
}

function criarChaveConflitoLogico({
    empresaId,
    competenciaIso,
    tipoDocumento,
} = {}) {
    const empresa =
        textoSeguro(
            empresaId
        );

    const competencia =
        textoSeguro(
            competenciaIso
        );

    const tipo =
        normalizarTipoDocumentoConflitoLogico(
            tipoDocumento
        );

    if (
        !empresa ||
        !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(
            competencia
        ) ||
        !tipo
    ) {
        return "";
    }

    return [
        empresa,
        competencia,
        tipo,
    ].join("|");
}

function obterIdentidadeItemConflitoLogico(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    if (
        item?.erro ||
        resolucao?.complementar ===
            true ||
        resolucao?.politica ===
            "COMPLEMENTAR"
    ) {
        return null;
    }

    const duplicidade =
        textoSeguro(
            item
                ?.duplicidade
                ?.codigo
        );

    if (
        duplicidade ===
            "DUPLICADO_EXATO_LOTE" ||
        duplicidade ===
            "DUPLICADO_EXATO_HISTORICO"
    ) {
        return null;
    }

    if (
        (
            resolucao?.status ===
                "BLOQUEADO" ||
            resolucao?.status ===
                "IGNORADO"
        ) ||
        resolucao
            ?.empresa
            ?.status !==
            "IDENTIFICADA"
    ) {
        return null;
    }

    const empresaId =
        textoSeguro(
            resolucao
                ?.empresa
                ?.id
        );

    const competenciaIso =
        textoSeguro(
            resolucao
                ?.destino
                ?.competenciaIso
        );

    const tipoDocumento =
        normalizarTipoDocumentoConflitoLogico(
            resolucao
                ?.tipoDocumento ||
            resolucao
                ?.tipoClassificador
        );

    const chave =
        criarChaveConflitoLogico({
            empresaId,
            competenciaIso,
            tipoDocumento,
        });

    if (!chave) {
        return null;
    }

    return {
        chave,
        empresaId,
        competenciaIso,
        tipoDocumento,
    };
}

function escolherDocumentoAtualConflito(
    anterior,
    candidato
) {
    if (!anterior) {
        return candidato;
    }

    const numeroAnterior =
        Number(
            anterior?.numeroVersao ||
            anterior?.numero_versao
        ) || 0;

    const numeroCandidato =
        Number(
            candidato?.numeroVersao ||
            candidato?.numero_versao
        ) || 0;

    return numeroCandidato >=
        numeroAnterior
        ? candidato
        : anterior;
}

export function aplicarGuardConflitoLogicoHistorico({
    itens = [],
    documentosAtuais = [],
} = {}) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    const historico =
        Array.isArray(
            documentosAtuais
        )
            ? documentosAtuais
            : [];

    const atuaisPorChave =
        new Map();

    for (
        const documento of
        historico
    ) {
        const chave =
            criarChaveConflitoLogico({
                empresaId:
                    documento?.empresaId,

                competenciaIso:
                    documento?.competenciaIso ||
                    documento?.competencia,

                tipoDocumento:
                    documento?.tipoDocumento,
            });

        if (!chave) {
            continue;
        }

        atuaisPorChave.set(
            chave,
            escolherDocumentoAtualConflito(
                atuaisPorChave.get(
                    chave
                ),
                documento
            )
        );
    }

    let encontrados =
        0;

    const itensAtualizados =
        lista.map(
            (item) => {
                const identidade =
                    obterIdentidadeItemConflitoLogico(
                        item
                    );

                if (!identidade) {
                    return item;
                }

                const documentoAtual =
                    atuaisPorChave.get(
                        identidade.chave
                    );

                if (!documentoAtual) {
                    return item;
                }

                const hashNovo =
                    normalizarHashSha256Lote(
                        item
                            ?.hash
                            ?.sha256
                    );

                const hashAtual =
                    normalizarHashSha256Lote(
                        documentoAtual
                            ?.hashSha256 ||
                        documentoAtual
                            ?.hash_sha256
                    );

                /*
                 * Hash igual pertence aos guards 1D/1E.
                 */
                if (
                    hashNovo &&
                    hashAtual &&
                    hashNovo ===
                        hashAtual
                ) {
                    return item;
                }

                encontrados +=
                    1;

                const resolucaoAtual =
                    item?.resolucao ||
                    {};

                const motivosAtuais =
                    Array.isArray(
                        resolucaoAtual?.motivos
                    )
                        ? resolucaoAtual.motivos
                        : [];

                const numeroVersao =
                    Number(
                        documentoAtual
                            ?.numeroVersao ||
                        documentoAtual
                            ?.numero_versao
                    ) || null;

                const atualNormalizado = {
                    itemId:
                        textoSeguro(
                            documentoAtual
                                ?.itemId ||
                            documentoAtual
                                ?.item_id
                        ),

                    versaoId:
                        textoSeguro(
                            documentoAtual
                                ?.versaoId ||
                            documentoAtual
                                ?.id
                        ),

                    numeroVersao,

                    hashSha256:
                        hashAtual,

                    nomeOriginal:
                        textoSeguro(
                            documentoAtual
                                ?.nomeOriginal ||
                            documentoAtual
                                ?.nome_original
                        ),

                    criadoEm:
                        textoSeguro(
                            documentoAtual
                                ?.criadoEm ||
                            documentoAtual
                                ?.criado_em
                        ),
                };

                const conflitoLogico = {
                    codigo:
                        CODIGO_CONFLITO_LOGICO_HISTORICO,

                    escopo:
                        "HISTORICO",

                    empresaId:
                        identidade.empresaId,

                    competenciaIso:
                        identidade.competenciaIso,

                    tipoDocumento:
                        identidade.tipoDocumento,

                    hashNovo,

                    documentoAtual:
                        atualNormalizado,

                    decisoesPermitidas: [
                        "MANTER_ATUAL",
                        "USAR_NOVO_COMO_NOVA_VERSAO",
                    ],

                    decisao:
                        null,

                    persistenciaPermitida:
                        false,
                };

                const detalheVersao =
                    numeroVersao
                        ? (
                            " A versão atualmente salva é a versão " +
                            numeroVersao +
                            "."
                        )
                        : "";

                const motivo = {
                    codigo:
                        CODIGO_CONFLITO_LOGICO_HISTORICO,

                    mensagem:
                        (
                            "Já existe outro documento salvo para esta empresa, competência e tipo." +
                            detalheVersao +
                            " O documento atual será preservado. Antes de salvar este novo PDF, será necessário escolher entre manter o documento atual ou usar o novo arquivo como uma nova versão."
                        ),
                };

                return {
                    ...item,

                    conflitoLogico,

                    resolucao: {
                        ...resolucaoAtual,

                        status:
                            "REVISAR",

                        motivos: [
                            motivo,

                            ...motivosAtuais.filter(
                                (motivoAtual) =>
                                    textoSeguro(
                                        motivoAtual?.codigo
                                    ) !==
                                    CODIGO_CONFLITO_LOGICO_HISTORICO
                            ),
                        ],

                        conflitoLogico,

                        persistenciaAutomatica:
                            false,

                        persistido:
                            false,
                    },

                    persistido:
                        false,
                };
            }
        );

    return {
        itens:
            itensAtualizados,

        resumo:
            criarResumo(
                itensAtualizados
            ),

        persistenciaExecutada:
            false,

        conflitoLogicoHistorico: {
            verificado:
                true,

            encontrados,
        },
    };
}

// ============================================================
// SAFE_SCAN_CERT2_M3_A7_RESOLVER_SNAPSHOT_SINGULAR
//
// Seleciona a verdade analítica produzida antes das políticas
// coletivas do lote.
//
// Pareamento obrigatório:
// - índice do item;
// - SHA-256 já calculado pelo núcleo singular.
//
// Não:
// - recalcula SHA;
// - executa OCR;
// - classifica;
// - resolve documento;
// - persiste;
// - executa RPC.
//
// Qualquer ausência, inconsistência ou ambiguidade bloqueia
// a revisão antes da fronteira de escrita.
// ============================================================

export function resolverItemSingularRevisaoHistorica({
    itensSingulares = [],
    itemAlvo = null,
} = {}) {
    const indiceAlvo =
        Number.isInteger(
            itemAlvo?.indice
        )
            ? itemAlvo.indice
            : null;

    const hashAlvo =
        textoSeguro(
            itemAlvo
                ?.duplicidade
                ?.hashSha256 ||
            itemAlvo
                ?.hash
                ?.sha256
        ).toLowerCase();

    if (
        !Number.isInteger(
            indiceAlvo
        ) ||
        indiceAlvo < 0 ||
        !/^[a-f0-9]{64}$/.test(
            hashAlvo
        )
    ) {
        throw new Error(
            "A identidade índice + SHA-256 do item histórico está incompleta. A revisão foi bloqueada."
        );
    }

    const lista =
        Array.isArray(
            itensSingulares
        )
            ? itensSingulares
            : [];

    const correspondencias =
        lista.filter(
            (item) => {
                const indiceItem =
                    Number.isInteger(
                        item?.indice
                    )
                        ? item.indice
                        : null;

                const hashItem =
                    textoSeguro(
                        item
                            ?.hash
                            ?.sha256
                    ).toLowerCase();

                return (
                    indiceItem ===
                        indiceAlvo &&
                    hashItem ===
                        hashAlvo
                );
            }
        );

    if (
        correspondencias.length !==
        1
    ) {
        throw new Error(
            "Não foi possível localizar de forma única o snapshot singular correspondente ao documento histórico. A revisão foi bloqueada."
        );
    }

    return correspondencias[0];
}

// ============================================================
// SAFE_SCAN_CERT2_M3_A4_NUCLEO_SINGULAR
//
// Unidade documental de UM PDF.
//
// Responsabilidades:
// - validar;
// - calcular SHA-256;
// - extrair texto;
// - resolver o documento;
// - enriquecer por OCR adaptativo quando necessário;
// - produzir um item analítico.
//
// Não executa:
// - duplicidade intralote;
// - associação entre documentos;
// - identidade/fallback de colaboradores;
// - guards coletivos;
// - persistência.
// ============================================================

export async function processarArquivoCertidaoSingular({
    arquivo: arquivoEntrada,
    indice: indiceEntrada = 0,
    total: totalEntrada = 1,
    empresas = [],
    dataReferencia = new Date(),
    onProgress = null,
    signal = null,
    dependencias = {},
} = {}) {
    if (!arquivoEntrada) {
        throw new Error(
            "Nenhum arquivo foi informado para a análise documental singular."
        );
    }

    const total =
        (
            Number.isInteger(
                totalEntrada
            ) &&
            totalEntrada > 0
        )
            ? totalEntrada
            : 1;

    const indice =
        (
            Number.isInteger(
                indiceEntrada
            ) &&
            indiceEntrada >= 0 &&
            indiceEntrada < total
        )
            ? indiceEntrada
            : 0;

    /*
     * Mantém as mesmas variáveis usadas pelo núcleo original.
     *
     * A lista é local e contém somente o arquivo da posição
     * corrente. Seu length preserva a semântica de progresso
     * quando a função é usada pelo orquestrador de lote.
     */
    const lista =
        new Array(
            total
        );

    lista[indice] =
        arquivoEntrada;

    const itens =
        [];

    const deps = {
        ...DEPENDENCIAS_PADRAO,
        ...(
            dependencias ||
            {}
        ),
    };

    for (
        const nome of
        [
            "validarArquivo",
            "calcularHash",
            "extrairTexto",
            "resolverDocumento",
        ]
    ) {
        if (
            typeof deps[nome] !==
            "function"
        ) {
            throw new Error(
                `Dependência inválida da análise singular: ${nome}.`
            );
        }
    }

    verificarCancelamento(
        signal
    );

    const arquivo =
        lista[indice];

    const nomeArquivo =
        textoSeguro(
            arquivo?.name
        ) ||
        `documento-${indice + 1}.pdf`;

    const caminhoRelativo =
        textoSeguro(
            arquivo
                ?.webkitRelativePath
        );

    const baseProgresso = {
        indice,

        total:
            lista.length,

        processados:
            indice,

        nomeArquivo,
    };

    let validacao =
        null;

    let hash =
        null;

    let leitura =
        null;

    try {
        emitirProgresso(
            onProgress,
            {
                ...baseProgresso,

                status:
                    CERTIDAO_UPLOAD_MASSA_PROGRESSO
                        .VALIDANDO_ARQUIVO,

                percentual:
                    percentual({
                        indice,
                        total:
                            lista.length,
                        fracao:
                            0.10,
                    }),

                mensagem:
                    `Validando ${nomeArquivo}.`,
            }
        );

        validacao =
            await deps.validarArquivo(
                arquivo
            );

        verificarCancelamento(
            signal
        );

        emitirProgresso(
            onProgress,
            {
                ...baseProgresso,

                status:
                    CERTIDAO_UPLOAD_MASSA_PROGRESSO
                        .CALCULANDO_HASH,

                percentual:
                    percentual({
                        indice,
                        total:
                            lista.length,
                        fracao:
                            0.25,
                    }),

                mensagem:
                    `Calculando SHA-256 de ${nomeArquivo}.`,
            }
        );

        hash =
            await deps.calcularHash(
                arquivo
            );

        verificarCancelamento(
            signal
        );

        emitirProgresso(
            onProgress,
            {
                ...baseProgresso,

                status:
                    CERTIDAO_UPLOAD_MASSA_PROGRESSO
                        .EXTRAINDO_TEXTO,

                percentual:
                    percentual({
                        indice,
                        total:
                            lista.length,
                        fracao:
                            0.45,
                    }),

                mensagem:
                    `Lendo conteúdo documental de ${nomeArquivo}.`,
            }
        );

        leitura =
            await deps.extrairTexto(
                arquivo,
                {
                    validacaoArquivo:
                        validacao,
                }
            );

        verificarCancelamento(
            signal
        );

        if (
            !textoSeguro(
                leitura?.textoExtraido
            )
        ) {
            throw new Error(
                "O PDF não produziu texto documental suficiente para classificação."
            );
        }

        emitirProgresso(
            onProgress,
            {
                ...baseProgresso,

                status:
                    CERTIDAO_UPLOAD_MASSA_PROGRESSO
                        .RESOLVENDO_DOCUMENTO,

                percentual:
                    percentual({
                        indice,
                        total:
                            lista.length,
                        fracao:
                            0.75,
                    }),

                mensagem:
                    `Identificando empresa, tipo e competência de ${nomeArquivo}.`,
            }
        );

        /*
         * Somente o conteúdo extraído participa da decisão.
         *
         * Nome e webkitRelativePath ficam exclusivamente
         * em proveniência.
         */
        let resolucao =
            await Promise.resolve(
                deps.resolverDocumento({
                    textoExtraido:
                        leitura.textoExtraido,

                    empresas,

                    dataReferencia,
                })
            );

        if (
            deveTentarOcrAdaptativoCert2({
                leitura,
                resolucao,
            })
        ) {
            const executarOcrAdaptativo =
                typeof deps
                    ?.enriquecerTextoOcrAdaptativo ===
                "function"
                    ? deps
                        .enriquecerTextoOcrAdaptativo
                    : enriquecerTextoOcrAdaptativoPadrao;

            const enriquecimentoOcr =
                await executarOcrAdaptativo({
                    arquivo,

                    textoExtraido:
                        leitura.textoExtraido,

                    resolucao,
                });

            verificarCancelamento(
                signal
            );

            const textoCandidato =
                textoSeguro(
                    enriquecimentoOcr
                        ?.texto
                );

            if (
                enriquecimentoOcr
                    ?.aplicada ===
                    true &&
                textoCandidato &&
                textoCandidato !==
                    textoSeguro(
                        leitura
                            ?.textoExtraido
                    )
            ) {
                const resolucaoCandidata =
                    await Promise.resolve(
                        deps.resolverDocumento({
                            textoExtraido:
                                textoCandidato,

                            empresas,

                            dataReferencia,
                        })
                    );

                verificarCancelamento(
                    signal
                );

                if (
                    aceitarResolucaoOcrAdaptativoCert2({
                        inicial:
                            resolucao,

                        candidata:
                            resolucaoCandidata,
                    })
                ) {
                    const deficitInicial =
                        calcularDeficitOcrAdaptativoCert2(
                            resolucao
                        );

                    const deficitFinal =
                        calcularDeficitOcrAdaptativoCert2(
                            resolucaoCandidata
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

                            ocrAdaptativoCert2: {
                                aplicado:
                                    true,

                                // SAFE_SCAN_PDFJS_COMPETENCIA_ADAPTATIVA_AUDIT_F10D_R2
                                fonte:
                                    textoSeguro(
                                        enriquecimentoOcr
                                            ?.fonteEnriquecimento ||
                                        "OCR_VISUAL_ADAPTATIVO"
                                    ),

                                competenciaPdfJs:
                                    textoSeguro(
                                        enriquecimentoOcr
                                            ?.competenciaPdfJs
                                    ),

                                paginasPdfJs:
                                    Array.isArray(
                                        enriquecimentoOcr
                                            ?.paginasPdfJs
                                    )
                                        ? [
                                            ...enriquecimentoOcr
                                                .paginasPdfJs,
                                        ]
                                        : [],

                                paginasOcr:
                                    Array.isArray(
                                        enriquecimentoOcr
                                            ?.paginasOcr
                                    )
                                        ? [
                                            ...enriquecimentoOcr
                                                .paginasOcr,
                                        ]
                                        : [],

                                totalPaginas:
                                    Number(
                                        enriquecimentoOcr
                                            ?.totalPaginas ||
                                        0
                                    ),

                                confiancaOcr:
                                    Number.isFinite(
                                        Number(
                                            enriquecimentoOcr
                                                ?.confiancaOcr
                                        )
                                    )
                                        ? Number(
                                            enriquecimentoOcr
                                                .confiancaOcr
                                        )
                                        : null,

                                deficitInicial,

                                deficitFinal,
                            },
                        },
                    };

                    resolucao =
                        resolucaoCandidata;
                }
            }
        }

        const item = {
            indice,

            arquivo,

            proveniencia: {
                nomeOriginal:
                    nomeArquivo,

                caminhoRelativo,

                tamanhoBytes:
                    Number(
                        arquivo?.size ||
                        validacao
                            ?.tamanhoBytes ||
                        0
                    ),

                mimeType:
                    textoSeguro(
                        arquivo?.type ||
                        validacao?.mimeType
                    ),
            },

            hash: {
                algoritmo:
                    hash?.algoritmo ||
                    "SHA-256",

                sha256:
                    hash?.hashSha256 ||
                    hash?.valor ||
                    "",
            },

            validacao,

            leitura,

            resolucao,

            erro:
                "",

            persistido:
                false,
        };

        itens.push(
            item
        );

        emitirProgresso(
            onProgress,
            {
                ...baseProgresso,

                status:
                    CERTIDAO_UPLOAD_MASSA_PROGRESSO
                        .CONCLUIDO_ARQUIVO,

                percentual:
                    percentual({
                        indice,
                        total:
                            lista.length,
                        fracao:
                            1,
                    }),

                processados:
                    indice + 1,

                mensagem:
                    `${nomeArquivo} analisado: ${resolucao?.status || "SEM_STATUS"}.`,
            }
        );
    }
    catch (erro) {
        if (
            erro?.name ===
                "AbortError" ||
            erro?.codigo ===
                "CERTIDAO_UPLOAD_MASSA_CANCELADO"
        ) {
            throw erro;
        }

        const mensagemErro =
            textoSeguro(
                erro?.message
            ) ||
            "Falha ao processar o documento.";

        itens.push({
            indice,

            arquivo,

            proveniencia: {
                nomeOriginal:
                    nomeArquivo,

                caminhoRelativo,

                tamanhoBytes:
                    Number(
                        arquivo?.size ||
                        validacao
                            ?.tamanhoBytes ||
                        0
                    ),

                mimeType:
                    textoSeguro(
                        arquivo?.type ||
                        validacao?.mimeType
                    ),
            },

            hash: {
                algoritmo:
                    hash?.algoritmo ||
                    "",

                sha256:
                    hash?.hashSha256 ||
                    hash?.valor ||
                    "",
            },

            validacao,

            leitura,

            resolucao:
                criarResolucaoFalha(
                    erro
                ),

            erro:
                mensagemErro,

            persistido:
                false,
        });

        emitirProgresso(
            onProgress,
            {
                ...baseProgresso,

                status:
                    CERTIDAO_UPLOAD_MASSA_PROGRESSO
                        .FALHA_ARQUIVO,

                percentual:
                    percentual({
                        indice,
                        total:
                            lista.length,
                        fracao:
                            1,
                    }),

                processados:
                    indice + 1,

                mensagem:
                    `${nomeArquivo}: ${mensagemErro}`,
            }
        );
    }

    const resultado =
        itens[0] ||
        null;

    if (!resultado) {
        throw new Error(
            "A análise documental singular não produziu um item."
        );
    }

    return resultado;
}

export async function processarArquivosCertidaoEmLote({
    arquivos = [],
    empresas = [],
    colaboradores = [],

    estadoConsultaColaboradores =
        "BASE_CONFIRMADA",

    detalheConsultaColaboradores =
        "",

    dataReferencia = new Date(),
    onProgress = null,
    signal = null,
    dependencias = {},
} = {}) {
    const lista =
        normalizarArquivos(
            arquivos
        );

    const deps = {
        ...DEPENDENCIAS_PADRAO,
        ...(
            dependencias ||
            {}
        ),
    };

    for (
        const nome of
        [
            "validarArquivo",
            "calcularHash",
            "extrairTexto",
            "resolverDocumento",
        ]
    ) {
        if (
            typeof deps[nome] !==
            "function"
        ) {
            throw new Error(
                `Dependência inválida do lote: ${nome}.`
            );
        }
    }

    verificarCancelamento(
        signal
    );

    emitirProgresso(
        onProgress,
        {
            status:
                CERTIDAO_UPLOAD_MASSA_PROGRESSO
                    .INICIANDO_LOTE,

            percentual:
                0,

            indice:
                -1,

            total:
                lista.length,

            processados:
                0,

            nomeArquivo:
                "",

            mensagem:
                lista.length
                    ? `Preparando ${lista.length} documento(s) para análise.`
                    : "Nenhum documento selecionado.",
        }
    );

    if (!lista.length) {
        const resultadoVazio = {
            itens: [],

            resumo:
                criarResumo(
                    []
                ),

            persistenciaExecutada:
                false,
        };

        emitirProgresso(
            onProgress,
            {
                status:
                    CERTIDAO_UPLOAD_MASSA_PROGRESSO
                        .CONCLUIDO_LOTE,

                percentual:
                    100,

                indice:
                    -1,

                total:
                    0,

                processados:
                    0,

                nomeArquivo:
                    "",

                mensagem:
                    "Nenhum documento para processar.",
            }
        );

        return resultadoVazio;
    }

    const itens =
        [];

    for (
        let indice = 0;
        indice < lista.length;
        indice += 1
    ) {
        const item =
            await processarArquivoCertidaoSingular({
                arquivo:
                    lista[indice],

                indice,

                total:
                    lista.length,

                empresas,
                dataReferencia,
                onProgress,
                signal,

                dependencias:
                    deps,
            });

        itens.push(
            item
        );
    }

    /*
     * ============================================================
     * SAFE_SCAN_CERT2_M3_A7_SNAPSHOT_SINGULAR
     *
     * Snapshot posicional da saída do motor singular ANTES de:
     * - duplicidade intralote;
     * - associação entre documentos;
     * - guards de empresa;
     * - identidade/fallback de colaborador;
     * - demais políticas coletivas.
     *
     * Não existe nova análise aqui.
     * O array é congelado para impedir alteração de sua composição.
     * ============================================================
     */
    const itensSingulares =
        Object.freeze(
            itens.slice()
        );

    const itensComGuardDuplicidade =
        aplicarGuardDuplicidadeExataIntralote(
            itens
        );

    /*
     * Cópias binariamente idênticas ficam fora do
     * raciocínio documental do lote.
     *
     * Isso impede, por exemplo, que duas cópias da
     * mesma Folha sejam interpretadas como duas Folhas
     * candidatas e quebrem uma associação inequívoca.
     */
    // SAFE_SCAN_27K_IGNORADOS_FORA_RACIOCINIO_LOTE
    /*
     * SAFE_SCAN_CERT2_M4_B8_CANONICO_FINANCEIRO_V1
     *
     * IGNORADOS continuam fora do raciocínio documental,
     * exceto complementares financeiros explicitamente
     * individualizados.
     *
     * Mesmo esses financeiros só poderão substituir o item
     * original se algum passo posterior produzir uma decisão
     * semântica diferente de IGNORADO.
     */
    const itensCanonicos =
        itensComGuardDuplicidade.filter(
            (item) =>
                (
                    item?.resolucao?.status !==
                        "IGNORADO" ||
                    itemIgnoradoFinanceiroElegivelRaciocinioLote(
                        item
                    )
                ) &&
                !itemEhDuplicadoExatoLote(
                    item
                )
        );

    const itensAssociados =
        associarComplementaresFolhaIntralote(
            itensCanonicos
        );

    const identidadesColaboradorPorIndice =
        criarMapaIdentidadesColaboradorLote({
            itens:
                itensAssociados,

            colaboradores,
            estadoConsultaColaboradores,
            detalheConsultaColaboradores,
        });

    const itensComGuardEmpresaNaoCadastrada =
        aplicarGuardEmpresaNaoCadastradaLote(
            itensAssociados
        );

    const itensComGuardDivergenciaEmpresaColaborador =
        aplicarGuardDivergenciaEmpresaColaboradorLote({
            itens:
                itensComGuardEmpresaNaoCadastrada,

            identidadesPorIndice:
                identidadesColaboradorPorIndice,

            empresas,
        });

    /*
     * Fallback de colaborador acontece DEPOIS da Folha.
     *
     * Assim, uma associação intralote documental segura
     * sempre possui prioridade sobre o cadastro atual.
     *
     * Duplicados exatos já foram removidos do conjunto
     * de raciocínio acima.
     */
    const itensCanonicosComFallback =
        aplicarFallbackColaboradorLote({
            itens:
                itensComGuardDivergenciaEmpresaColaborador,

            identidadesPorIndice:
                identidadesColaboradorPorIndice,

            empresas,
        });

    const canonicosPorIndice =
        new Map(
            itensCanonicosComFallback.map(
                (item, posicao) => [
                    Number.isInteger(
                        item?.indice
                    )
                        ? item.indice
                        : posicao,
                    item,
                ]
            )
        );

    /*
     * Reconstituímos a ordem original do lote.
     *
     * Canônicos recebem as associações calculadas;
     * duplicados permanecem bloqueados exatamente
     * na posição em que foram selecionados.
     */
    let itensComFallbackColaborador =
        itensComGuardDuplicidade.map(
            (item, posicao) => {
                if (
                    itemEhDuplicadoExatoLote(
                        item
                    )
                ) {
                    return item;
                }

                const indice =
                    Number.isInteger(
                        item?.indice
                    )
                        ? item.indice
                        : posicao;

                const canonico =
                    canonicosPorIndice.get(
                        indice
                    );

                /*
                 * SAFE_SCAN_CERT2_M4_B8_RECONSTRUCAO_FINANCEIRO_V1
                 *
                 * Um IGNORADO empresarial permanece intocado.
                 *
                 * Um financeiro individual originalmente IGNORADO
                 * também permanece intocado quando o raciocínio
                 * não conseguiu produzir decisão melhor.
                 *
                 * Só aceitamos o canônico quando houve mudança
                 * semântica explícita para outro status.
                 */
                if (
                    item?.resolucao?.status ===
                        "IGNORADO"
                ) {
                    if (
                        !itemIgnoradoFinanceiroElegivelRaciocinioLote(
                            item
                        ) ||
                        !canonico ||
                        canonico
                            ?.resolucao
                            ?.status ===
                            "IGNORADO"
                    ) {
                        return item;
                    }
                }

                return (
                    canonico ||
                    item
                );
            }
        );

    /*
     * ============================================================
     * SAFE_SCAN_CERT2_M4_E2_C_R2_STATUS_FINAL_IDENTIDADE
     *
     * Reconciliação final de consistência semântica.
     *
     * Se o próprio motor já concluiu:
     *
     *   identificacaoColaborador.status =
     *       NAO_CADASTRADO_CONFIRMADO
     *
     * um Espelho de Ponto não pode terminar o lote como REVISAR.
     *
     * Reutilizamos o blocker existente.
     *
     * Não altera:
     * - outros tipos documentais;
     * - ignorados;
     * - duplicados exatos;
     * - itens já bloqueados;
     * - OCR/classificação/empresa/competência;
     * - persistência.
     * ============================================================
     */
    itensComFallbackColaborador =
        itensComFallbackColaborador.map(
            (item) => {
                if (
                    item?.erro ||
                    itemEhDuplicadoExatoLote(
                        item
                    ) ||
                    textoSeguro(
                        item
                            ?.resolucao
                            ?.status
                    )
                        .toUpperCase() ===
                        "IGNORADO" ||
                    obterTipoResolucaoLote(
                        item
                    ) !==
                        "folha-ponto"
                ) {
                    return item;
                }

                const resolucao =
                    item?.resolucao ||
                    {};

                const identificacaoColaborador =
                    resolucao
                        ?.identificacaoColaborador ||
                    null;

                const statusIdentidade =
                    textoSeguro(
                        identificacaoColaborador
                            ?.status
                    )
                        .toUpperCase();

                const statusDocumento =
                    textoSeguro(
                        resolucao
                            ?.status
                    )
                        .toUpperCase();

                if (
                    statusIdentidade !==
                        "NAO_CADASTRADO_CONFIRMADO" ||
                    statusDocumento ===
                        "BLOQUEADO"
                ) {
                    return item;
                }

                return bloquearDocumentoColaboradorNaoCadastradoLote({
                    item,
                    resolucao,
                    identificacaoColaborador,
                });
            }
        );

    const resumo =
        criarResumo(
            itensComFallbackColaborador
        );

    emitirProgresso(
        onProgress,
        {
            status:
                CERTIDAO_UPLOAD_MASSA_PROGRESSO
                    .CONCLUIDO_LOTE,

            percentual:
                100,

            indice:
                lista.length - 1,

            total:
                lista.length,

            processados:
                lista.length,

            nomeArquivo:
                "",

            mensagem:
                (
                    `Análise concluída: ` +
                    `${resumo.prontos} pronto(s), ` +
                    `${resumo.revisar} para revisar e ` +
                    `${resumo.bloqueados} bloqueado(s).`
                ),
        }
    );

    return {
        /*
         * SAFE_SCAN_CERT2_M3_A7_RESULTADO_SNAPSHOT_SINGULAR
         *
         * Uso restrito a consumidores que precisam da verdade
         * analítica anterior à política coletiva, especialmente
         * a revisão histórica.
         */
        itensSingulares,

        /*
         * O contrato operacional do lote permanece pós-coletivo.
         */
        itens:
            itensComFallbackColaborador,

        resumo,

        persistenciaExecutada:
            false,
    };
}
