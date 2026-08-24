import {
    validarArquivoCertidaoPdf,
} from "../pdf/certidaoPdfFileValidator.js";

import {
    calcularHashSha256CertidaoPdf,
} from "../pdf/certidaoPdfHashService.js";

import {
    resolverDocumentoCertidaoEmLote,
} from "../analysis/certidaoDocumentBatchResolver.js";

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
            ? itens
            : [];

    const primeirasOcorrencias =
        new Map();

    return lista.map(
        (item, posicao) => {
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
                    "Arquivo duplicado identificado. Este PDF possui o mesmo conteúdo de outro arquivo já incluído neste lote. A duplicidade foi confirmada pelo SHA-256, por isso esta cópia foi bloqueada para evitar análise duplicada e criação de uma nova versão.",
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
                        "BLOQUEADO",

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
                        "Arquivo já registrado no histórico. Este PDF possui o mesmo conteúdo de uma versão documental salva anteriormente. A duplicidade foi confirmada pelo SHA-256, por isso o arquivo foi bloqueado para evitar uma nova versão idêntica.",
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
                        },
                    },

                    resolucao: {
                        ...resolucaoAtual,

                        status:
                            "BLOQUEADO",

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

function criarResultadoColaboradorIdentidadeLote({
    status,
    criterio = "",
    colaborador = null,
    candidatos = [],
    detalhe = "",
}) {
    return {
        status,

        criterio,

        colaborador,

        candidatos,

        detalhe,
    };
}

function resolverColaboradorPorConteudoLote({
    textoExtraido,
    colaboradores = [],
}) {
    const lista =
        Array.isArray(
            colaboradores
        )
            ? colaboradores.filter(
                Boolean
            )
            : [];

    if (!lista.length) {
        return criarResultadoColaboradorIdentidadeLote({
            status:
                "NAO_LOCALIZADO",

            detalhe:
                "Não há colaboradores disponíveis no contexto atual do SafeScan.",
        });
    }

    const textoNormalizado =
        normalizarTextoIdentidadeLote(
            textoExtraido
        );

    const cpfsDocumento =
        extrairCpfsIdentidadeLote(
            textoExtraido
        );

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
            candidatosCpf.length === 1
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
            candidatosCpf.length > 1
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

        /*
         * SAFE_SCAN_IDENTIDADE_HIERARQUICA_D2_R1H
         *
         * Existe CPF válido no documento, porém nenhum cadastro
         * correspondeu exatamente.
         *
         * Não encerramos a resolução aqui.
         * Ainda tentaremos matrícula/eSocial e nome completo.
         *
         * Se estes critérios localizarem um colaborador que possui
         * OUTRO CPF válido cadastrado, o resultado será conflito,
         * nunca associação automática.
         */

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
        candidatosMatricula.length === 1
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
        candidatosMatricula.length > 1
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
        candidatosNome.length === 1
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
        candidatosNome.length > 1
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
                "NAO_LOCALIZADO",

            criterio:
                "CPF",

            detalhe:
                "Foi encontrado CPF válido no PDF, mas ele não corresponde a colaborador cadastrado e nenhum colaborador pôde ser identificado com segurança por matrícula/eSocial ou nome completo único.",
        });
    }

    return criarResultadoColaboradorIdentidadeLote({
        status:
            "NAO_LOCALIZADO",

        detalhe:
            "Nenhum colaborador foi localizado por CPF, matrícula/eSocial ou nome completo único no conteúdo do PDF.",
    });
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

function itemElegivelFallbackColaboradorLote(
    item
) {
    const resolucao =
        item?.resolucao ||
        {};

    if (
        resolucao?.complementar ===
        true
    ) {
        return true;
    }

    return (
        TIPOS_DOCUMENTAIS_FALLBACK_COLABORADOR_PRINCIPAL
            .has(
                obterTipoResolucaoLote(
                    item
                )
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
                    ?.nome_completo
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

        origem:
            "CONTEUDO_DOCUMENTAL",
    };
}

// ============================================================
// SAFE_SCAN_BLOQUEIO_COLABORADOR_NAO_CADASTRADO_D2_R1K_R2
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

function aplicarGuardDivergenciaEmpresaColaboradorLote({
    itens = [],
    colaboradores = [],
    empresas = [],
}) {
    const lista =
        Array.isArray(
            itens
        )
            ? itens
            : [];

    return lista.map(
        (item) => {
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
                resolverColaboradorPorConteudoLote({
                    textoExtraido:
                        item
                            ?.leitura
                            ?.textoExtraido ||
                        "",

                    colaboradores,
                });

            // SAFE_SCAN_BLOQUEIO_IDENTIFICADA_D2_R1K_R2
            if (
                identidade.status ===
                    "NAO_LOCALIZADO"
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
                identidade.status !==
                    "LOCALIZADO"
            ) {
                return item;
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
    colaboradores = [],
    empresas = [],
}) {
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
                resolverColaboradorPorConteudoLote({
                    textoExtraido:
                        item
                            ?.leitura
                            ?.textoExtraido ||
                        "",

                    colaboradores,
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
                identidade.status !==
                    "LOCALIZADO"
            ) {
                // SAFE_SCAN_BLOQUEIO_FALLBACK_INDIVIDUAL_D2_R1K_R2
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
                    identidade.status ===
                        "NAO_LOCALIZADO" &&
                    elegivelBloqueioColaborador
                ) {
                    return bloquearDocumentoColaboradorNaoCadastradoLote({
                        item,
                        resolucao,
                        identificacaoColaborador,
                    });
                }

                const codigo =
                identidade.status ===
                    "AMBIGUO"
                    ? "COLABORADOR_AMBIGUO"
                    : identidade.status ===
                        "CONFLITO_CPF"
                        ? "CONFLITO_CPF_DOCUMENTO_CADASTRO"
                        : "COLABORADOR_NAO_LOCALIZADO";

                const mensagem =
                    identidade.detalhe ||
                    (
                        identidade.status ===
                            "AMBIGUO"
                            ? "O conteúdo do PDF corresponde a mais de um colaborador. Revise manualmente."
                            : "O colaborador não foi localizado no cadastro do SafeScan."
                    );

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
        resolucao?.status ===
            "BLOQUEADO" ||
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

export async function processarArquivosCertidaoEmLote({
    arquivos = [],
    empresas = [],
    colaboradores = [],
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
            const resolucao =
                await Promise.resolve(
                    deps.resolverDocumento({
                        textoExtraido:
                            leitura.textoExtraido,

                        empresas,

                        dataReferencia,
                    })
                );

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
    }

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
    const itensCanonicos =
        itensComGuardDuplicidade.filter(
            (item) =>
                !itemEhDuplicadoExatoLote(
                    item
                )
        );

    const itensAssociados =
        associarComplementaresFolhaIntralote(
            itensCanonicos
        );

    const itensComGuardEmpresaNaoCadastrada =
        aplicarGuardEmpresaNaoCadastradaLote(
            itensAssociados
        );

    const itensComGuardDivergenciaEmpresaColaborador =
        aplicarGuardDivergenciaEmpresaColaboradorLote({
            itens:
                itensComGuardEmpresaNaoCadastrada,

            colaboradores,

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

            colaboradores,

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
    const itensComFallbackColaborador =
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

                return (
                    canonicosPorIndice.get(
                        indice
                    ) ||
                    item
                );
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
        itens:
            itensComFallbackColaborador,

        resumo,

        persistenciaExecutada:
            false,
    };
}
