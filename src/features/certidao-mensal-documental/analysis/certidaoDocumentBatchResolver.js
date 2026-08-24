import {
    classificarDocumentoCertidaoEmLote,
} from "./certidaoDocumentBatchClassifier.js";

import {
    executarPreAvaliacaoDocumental,
} from "./certidaoDocumentPreAssessment.js";

import {
    extrairCnpjsDocumento,
    formatarCnpj,
    somenteDigitos,
} from "./certidaoDocumentTextUtils.js";

import {
    CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS,
    CERTIDAO_MENSAL_POLITICA_DOCUMENTAL,
} from "../domain/certidaoMensalRegraCompetencia.js";

import {
    obterCnpjsAceitosEmpresa,
} from "../../../services/empresaCnpjsService.js";

// ============================================================
// SAFE_SCAN_RESOLVEDOR_UPLOAD_MASSA_V1
//
// Dry-run documental do upload em massa.
//
// Este módulo:
// - NÃO persiste;
// - NÃO usa competência da tela como fallback;
// - NÃO altera a empresa selecionada;
// - NÃO altera a competência visível;
// - retorna somente uma proposta auditável para revisão.
// ============================================================

export const CERTIDAO_BATCH_STATUS =
    Object.freeze({
        PRONTO:
            "PRONTO",

        REVISAR:
            "REVISAR",

        BLOQUEADO:
            "BLOQUEADO",
    });

function textoSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    ).trim();
}

function calcularDigitoCpf(
    cpf,
    quantidadeBase
) {
    let soma =
        0;

    for (
        let indice = 0;
        indice < quantidadeBase;
        indice++
    ) {
        soma += (
            Number(
                cpf[indice]
            ) *
            (
                quantidadeBase +
                1 -
                indice
            )
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

function cpfNumericoValido(
    valor
) {
    const cpf =
        somenteDigitos(
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
        calcularDigitoCpf(
            cpf,
            9
        );

    const segundo =
        calcularDigitoCpf(
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

function calcularDigitoCnpj(
    cnpj,
    pesos
) {
    let soma =
        0;

    for (
        let indice = 0;
        indice < pesos.length;
        indice++
    ) {
        soma += (
            Number(
                cnpj[indice]
            ) *
            pesos[indice]
        );
    }

    const resto =
        soma %
        11;

    return resto < 2
        ? 0
        : 11 - resto;
}

function cnpjNumericoValido(
    valor
) {
    const cnpj =
        somenteDigitos(
            valor
        );

    if (
        cnpj.length !== 14 ||
        /^(\d)\1{13}$/.test(
            cnpj
        )
    ) {
        return false;
    }

    const pesosPrimeiro = [
        5,
        4,
        3,
        2,
        9,
        8,
        7,
        6,
        5,
        4,
        3,
        2,
    ];

    const primeiro =
        calcularDigitoCnpj(
            cnpj,
            pesosPrimeiro
        );

    if (
        primeiro !==
        Number(
            cnpj[12]
        )
    ) {
        return false;
    }

    const pesosSegundo = [
        6,
        5,
        4,
        3,
        2,
        9,
        8,
        7,
        6,
        5,
        4,
        3,
        2,
    ];

    const segundo =
        calcularDigitoCnpj(
            cnpj,
            pesosSegundo
        );

    return (
        segundo ===
        Number(
            cnpj[13]
        )
    );
}

function ehCpfBancarioPreenchido14(
    valor
) {
    const identificador =
        somenteDigitos(
            valor
        );

    if (
        identificador.length !==
            14 ||
        !identificador.startsWith(
            "000"
        )
    ) {
        return false;
    }

    const cpf =
        identificador.slice(
            3
        );

    /*
     * Alguns comprovantes bancários apresentam
     * CPF/CNPJ em campo de 14 posições.
     *
     * Um CPF recebe "000" à esquerda:
     *
     * 00032800476842
     *    ↓
     * 32800476842
     *
     * Só descartamos o identificador da lista de
     * CNPJs quando:
     *
     * - os 11 dígitos restantes formam CPF válido;
     * - os 14 dígitos completos NÃO formam CNPJ válido.
     *
     * Assim preservamos eventual CNPJ numérico válido
     * e não relaxamos NAO_ENCONTRADA / AMBIGUA.
     */
    return (
        cpfNumericoValido(
            cpf
        ) &&
        !cnpjNumericoValido(
            identificador
        )
    );
}

function obterDocumentoCatalogo(
    tipoDocumento
) {
    const tipo =
        textoSeguro(
            tipoDocumento
        );

    return (
        CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS
            .find(
                (documento) =>
                    documento
                        ?.tipoDocumento ===
                    tipo
            ) ||
        null
    );
}

function competenciaMensalParaIso(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    let correspondencia =
        /^(0[1-9]|1[0-2])\/(\d{4})$/
            .exec(
                texto
            );

    if (correspondencia) {
        return (
            correspondencia[2] +
            "-" +
            correspondencia[1] +
            "-01"
        );
    }

    correspondencia =
        /^(\d{4})-(0[1-9]|1[0-2])(?:-01)?$/
            .exec(
                texto
            );

    if (correspondencia) {
        return (
            correspondencia[1] +
            "-" +
            correspondencia[2] +
            "-01"
        );
    }

    return "";
}

function dataIsoParaCompetencia(
    valor
) {
    const correspondencia =
        /^(\d{4})-(0[1-9]|1[0-2])-\d{2}$/
            .exec(
                textoSeguro(
                    valor
                )
            );

    if (!correspondencia) {
        return "";
    }

    return (
        correspondencia[1] +
        "-" +
        correspondencia[2] +
        "-01"
    );
}

function identificarEmpresaDocumento({
    textoExtraido,
    empresas = [],
}) {
    const cnpjsDocumento =
        [
            ...new Set(
                extrairCnpjsDocumento(
                    textoExtraido
                )
                    .map(
                        somenteDigitos
                    )
                    .filter(
                        (cnpj) =>
                            cnpj.length ===
                                14 &&
                            !ehCpfBancarioPreenchido14(
                                cnpj
                            )
                    )
            ),
        ];

    if (!cnpjsDocumento.length) {
        return {
            status:
                "SEM_CNPJ",

            empresa:
                null,

            cnpjCorrespondente:
                "",

            cnpjsDocumento: [],
            candidatos: [],
        };
    }

    const candidatos =
        [];

    for (
        let indice = 0;
        indice < (
            Array.isArray(
                empresas
            )
                ? empresas.length
                : 0
        );
        indice++
    ) {
        const empresa =
            empresas[indice] || {};

        const vinculos =
            empresa
                ?.cnpjsVinculados ||
            empresa
                ?.cnpjs_vinculados ||
            [];

        const aceitos =
            obterCnpjsAceitosEmpresa({
                empresa,
                vinculos,
            });

        const correspondentes =
            aceitos
                .map(
                    (vinculo) => ({
                        ...vinculo,

                        cnpj:
                            somenteDigitos(
                                vinculo?.cnpj
                            ),
                    })
                )
                .filter(
                    (vinculo) =>
                        cnpjsDocumento.includes(
                            vinculo.cnpj
                        )
                );

        if (!correspondentes.length) {
            continue;
        }

        candidatos.push({
            chave:
                textoSeguro(
                    empresa?.id
                ) ||
                `indice-${indice}`,

            empresa,

            correspondentes,
        });
    }

    const mapa =
        new Map();

    for (
        const candidato of
        candidatos
    ) {
        if (
            !mapa.has(
                candidato.chave
            )
        ) {
            mapa.set(
                candidato.chave,
                candidato
            );
        }
    }

    const empresasUnicas =
        Array.from(
            mapa.values()
        );

    if (empresasUnicas.length === 0) {
        return {
            status:
                "NAO_ENCONTRADA",

            empresa:
                null,

            cnpjCorrespondente:
                "",

            cnpjsDocumento:
                cnpjsDocumento.map(
                    formatarCnpj
                ),

            candidatos: [],
        };
    }

    if (empresasUnicas.length > 1) {
        return {
            status:
                "AMBIGUA",

            empresa:
                null,

            cnpjCorrespondente:
                "",

            cnpjsDocumento:
                cnpjsDocumento.map(
                    formatarCnpj
                ),

            candidatos:
                empresasUnicas.map(
                    (item) => ({
                        empresaId:
                            textoSeguro(
                                item
                                    ?.empresa
                                    ?.id
                            ),

                        empresaNome:
                            textoSeguro(
                                item
                                    ?.empresa
                                    ?.nome
                            ),

                        cnpjs:
                            item
                                .correspondentes
                                .map(
                                    (vinculo) =>
                                        vinculo
                                            ?.cnpjFormatado ||
                                        formatarCnpj(
                                            vinculo?.cnpj
                                        )
                                ),
                    })
                ),
        };
    }

    const unico =
        empresasUnicas[0];

    const vinculo =
        unico
            .correspondentes[0] ||
        null;

    return {
        status:
            "IDENTIFICADA",

        empresa:
            unico.empresa,

        cnpjCorrespondente:
            vinculo
                ?.cnpjFormatado ||
            formatarCnpj(
                vinculo?.cnpj
            ),

        cnpjsDocumento:
            cnpjsDocumento.map(
                formatarCnpj
            ),

        candidatos: [
            {
                empresaId:
                    textoSeguro(
                        unico
                            ?.empresa
                            ?.id
                    ),

                empresaNome:
                    textoSeguro(
                        unico
                            ?.empresa
                            ?.nome
                    ),

                cnpjs:
                    unico
                        .correspondentes
                        .map(
                            (item) =>
                                item
                                    ?.cnpjFormatado ||
                                formatarCnpj(
                                    item?.cnpj
                                )
                        ),
            },
        ],
    };
}

function criarEmpresaParaAvaliacao(
    identificacaoEmpresa
) {
    const empresa =
        identificacaoEmpresa
            ?.empresa;

    if (!empresa) {
        return null;
    }

    const cnpjCorrespondente =
        somenteDigitos(
            identificacaoEmpresa
                ?.cnpjCorrespondente
        );

    return {
        ...empresa,

        /*
         * O avaliador recebe o CNPJ que efetivamente casou
         * com o PDF.
         *
         * Isso evita falsa divergência em avaliadores mais
         * antigos que consultam apenas empresa.cnpj e não
         * os CNPJs vinculados.
         */
        cnpj:
            cnpjCorrespondente ||
            empresa?.cnpj ||
            "",

        cnpjsVinculados:
            empresa
                ?.cnpjsVinculados ||
            empresa
                ?.cnpjs_vinculados ||
            [],
    };
}

function obterCompetenciaMensalAvaliacao({
    tipoDocumento,
    avaliacao,
}) {
    let valor =
        "";

    if (
        tipoDocumento ===
        "fgts"
    ) {
        valor =
            avaliacao
                ?.dadosFgts
                ?.competencia;
    }
    else if (
        tipoDocumento ===
        "folha-pagamento"
    ) {
        valor =
            avaliacao
                ?.dadosFolhaPagamento
                ?.competencia;
    }
    else if (
        tipoDocumento ===
        "folha-ponto"
    ) {
        valor =
            avaliacao
                ?.dadosFolhaPonto
                ?.competencia;
    }
    else if (
        tipoDocumento ===
        "va-vt"
    ) {
        valor =
            avaliacao
                ?.dadosVaVt
                ?.competencia;
    }
    else if (
        tipoDocumento ===
        "inss-dctfweb"
    ) {
        valor =
            avaliacao
                ?.dadosInssDctfweb
                ?.competencia;
    }
    else if (
        tipoDocumento ===
        "iss"
    ) {
        valor =
            avaliacao
                ?.dadosIss
                ?.competencia;
    }
    else if (
        tipoDocumento ===
        "esocial"
    ) {
        valor =
            avaliacao
                ?.dadosEsocial
                ?.competencia;
    }

    return {
        valor:
            textoSeguro(
                valor
            ),

        competenciaIso:
            competenciaMensalParaIso(
                valor
            ),
    };
}

function resolverPoliticaEfetiva({
    tipoDocumento,
    documentoCatalogo,
    avaliacao,
}) {
    /*
     * ISS possui duas naturezas dentro do item atual:
     *
     * - Certidão ISSQN / Taxa de Licença => VALIDADE
     * - Guia/recolhimento mensal          => COMPETENCIA_MENSAL
     */
    if (
        tipoDocumento ===
        "iss"
    ) {
        return avaliacao
            ?.dadosIss
            ?.certidaoIssqn ===
            true
            ? CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .VALIDADE
            : CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
                .COMPETENCIA_MENSAL;
    }

    return (
        documentoCatalogo
            ?.politica ||
        ""
    );
}

function resolverOrigemValidade({
    tipoDocumento,
    avaliacao,
}) {
    if (
        tipoDocumento ===
        "seguro-vida"
    ) {
        const vigenciaInicioIso =
            textoSeguro(
                avaliacao
                    ?.dadosSeguroVida
                    ?.vigenciaInicioIso
            );

        return {
            competenciaIso:
                dataIsoParaCompetencia(
                    vigenciaInicioIso
                ),

            fonte:
                vigenciaInicioIso
                    ? "VIGENCIA_INICIO"
                    : "",

            dataFonteIso:
                vigenciaInicioIso,
        };
    }

    const dataEmissaoIso =
        textoSeguro(
            avaliacao
                ?.dadosTemporais
                ?.dataEmissaoIso
        );

    return {
        competenciaIso:
            dataIsoParaCompetencia(
                dataEmissaoIso
            ),

        fonte:
            dataEmissaoIso
                ? "DATA_EMISSAO"
                : "",

        dataFonteIso:
            dataEmissaoIso,
    };
}

function montarCoberturaValidade({
    tipoDocumento,
    avaliacao,
}) {
    const seguro =
        tipoDocumento ===
        "seguro-vida";

    const inicioIso =
        seguro
            ? textoSeguro(
                avaliacao
                    ?.dadosSeguroVida
                    ?.vigenciaInicioIso
            )
            : "";

    const fimIso =
        seguro
            ? textoSeguro(
                avaliacao
                    ?.dadosSeguroVida
                    ?.vigenciaFimIso
            )
            : textoSeguro(
                avaliacao
                    ?.dadosTemporais
                    ?.dataValidadeIso
            );

    return {
        inicioIso,
        fimIso,
    };
}

function adicionarMotivo(
    motivos,
    codigo,
    mensagem
) {
    if (
        motivos.some(
            (motivo) =>
                motivo.codigo ===
                codigo
        )
    ) {
        return;
    }

    motivos.push({
        codigo,
        mensagem,
    });
}

function montarResultadoBase({
    classificacao,
    identificacaoEmpresa,
}) {
    return {
        tipoDocumento:
            classificacao
                ?.tipoCatalogo ||
            classificacao
                ?.id ||
            "",

        tipoClassificador:
            classificacao
                ?.tipoClassificador ||
            classificacao
                ?.id ||
            "",

        titulo:
            classificacao
                ?.titulo ||
            "Documento não identificado",

        confianca:
            Number(
                classificacao
                    ?.confianca ||
                0
            ),

        complementar:
            classificacao
                ?.complementar ===
            true,

        empresa: {
            status:
                identificacaoEmpresa
                    ?.status ||
                "NAO_AVALIADA",

            id:
                textoSeguro(
                    identificacaoEmpresa
                        ?.empresa
                        ?.id
                ),

            nome:
                textoSeguro(
                    identificacaoEmpresa
                        ?.empresa
                        ?.nome
                ),

            cnpjCorrespondente:
                identificacaoEmpresa
                    ?.cnpjCorrespondente ||
                "",

            cnpjsDocumento:
                identificacaoEmpresa
                    ?.cnpjsDocumento ||
                [],

            candidatos:
                identificacaoEmpresa
                    ?.candidatos ||
                [],
        },

        persistenciaAutomatica:
            false,

        persistido:
            false,
    };
}

export function resolverDocumentoCertidaoEmLote({
    textoExtraido = "",
    empresas = [],
    dataReferencia = new Date(),
} = {}) {
    const classificacao =
        classificarDocumentoCertidaoEmLote(
            textoExtraido
        );

    const identificacaoEmpresa =
        identificarEmpresaDocumento({
            textoExtraido,
            empresas,
        });

    const base =
        montarResultadoBase({
            classificacao,
            identificacaoEmpresa,
        });

    const motivos =
        [];

    if (
        !classificacao
            ?.identificado
    ) {
        adicionarMotivo(
            motivos,
            "TIPO_NAO_IDENTIFICADO",
            "O tipo documental não foi identificado com segurança."
        );

        return {
            ...base,

            status:
                CERTIDAO_BATCH_STATUS
                    .BLOQUEADO,

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

            motivos,
        };
    }

    if (
        identificacaoEmpresa
            .status !==
        "IDENTIFICADA"
    ) {
        if (
            identificacaoEmpresa
                .status ===
            "SEM_CNPJ"
        ) {
            adicionarMotivo(
                motivos,
                "EMPRESA_SEM_CNPJ_DOCUMENTAL",
                "Nenhum CNPJ confirmável foi localizado no conteúdo do PDF."
            );
        }
        else if (
            identificacaoEmpresa
                .status ===
            "AMBIGUA"
        ) {
            adicionarMotivo(
                motivos,
                "EMPRESA_AMBIGUA",
                "O documento possui CNPJ associado a mais de uma empresa candidata."
            );
        }
        else {
            adicionarMotivo(
                motivos,
                "EMPRESA_NAO_IDENTIFICADA",
                "Os CNPJs encontrados não correspondem às empresas candidatas."
            );
        }
    }

    /*
     * CEAT/TRT já é reconhecido, porém permanece propositalmente
     * fora do catálogo mensal padrão.
     *
     * Ele não poderá receber destino mensal automático nesta fase.
     */
    if (
        classificacao
            ?.complementar ===
        true
    ) {
        adicionarMotivo(
            motivos,
            "DOCUMENTO_COMPLEMENTAR",
            "Documento complementar reconhecido; o destino de persistência será tratado em fluxo próprio sem gerar pendência mensal."
        );

        return {
            ...base,

            status:
                CERTIDAO_BATCH_STATUS
                    .REVISAR,

            politica:
                "COMPLEMENTAR",

            destino: {
                competenciaIso:
                    "",

                fonte:
                    "",
            },

            avaliacao:
                null,

            motivos,
        };
    }

    const tipoDocumento =
        classificacao
            ?.tipoCatalogo ||
        classificacao
            ?.id ||
        "";

    const documentoCatalogo =
        obterDocumentoCatalogo(
            tipoDocumento
        );

    if (!documentoCatalogo) {
        adicionarMotivo(
            motivos,
            "TIPO_SEM_DESTINO_CATALOGO",
            "O documento foi reconhecido, mas ainda não possui destino no catálogo documental."
        );

        return {
            ...base,

            status:
                CERTIDAO_BATCH_STATUS
                    .REVISAR,

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

            motivos,
        };
    }

    const documentoEsperado = {
        ...documentoCatalogo,

        id:
            documentoCatalogo
                .tipoDocumento,

        /*
         * INTENCIONAL:
         *
         * nenhuma competência da interface é enviada ao avaliador.
         * O PDF deve provar sua própria competência.
         */
    };

    const empresaAvaliacao =
        criarEmpresaParaAvaliacao(
            identificacaoEmpresa
        );

    const preAvaliacao =
        executarPreAvaliacaoDocumental({
            textoExtraido,

            documentoEsperado,

            empresaEsperada:
                empresaAvaliacao,

            dataReferencia,
        });

    const avaliacao =
        preAvaliacao
            ?.avaliacao ||
        null;

    if (!avaliacao) {
        adicionarMotivo(
            motivos,
            "AVALIACAO_NAO_GERADA",
            "Não foi possível executar a pré-avaliação documental."
        );
    }

    if (
        avaliacao
            ?.documentoIncompativel ===
        true
    ) {
        adicionarMotivo(
            motivos,
            "ARQUIVO_INCOMPATIVEL",
            "O avaliador específico considerou o arquivo incompatível com o tipo identificado."
        );

        return {
            ...base,

            status:
                CERTIDAO_BATCH_STATUS
                    .BLOQUEADO,

            politica:
                documentoCatalogo
                    .politica,

            destino: {
                competenciaIso:
                    "",

                fonte:
                    "",
            },

            avaliacao,

            motivos,
        };
    }

    if (
        avaliacao
            ?.codigo ===
        "AVALIADOR_ESPECIFICO_PENDENTE"
    ) {
        adicionarMotivo(
            motivos,
            "AVALIADOR_ESPECIFICO_PENDENTE",
            "O tipo foi identificado, mas ainda não possui avaliador específico para automatizar o destino."
        );
    }

    const politica =
        resolverPoliticaEfetiva({
            tipoDocumento,
            documentoCatalogo,
            avaliacao,
        });

    let destino = {
        competenciaIso:
            "",

        fonte:
            "",
    };

    if (
        politica ===
        CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
            .COMPETENCIA_MENSAL
    ) {
        const competencia =
            obterCompetenciaMensalAvaliacao({
                tipoDocumento,
                avaliacao,
            });

        destino = {
            competenciaIso:
                competencia
                    .competenciaIso,

            competenciaDocumento:
                competencia
                    .valor,

            fonte:
                competencia
                    .competenciaIso
                    ? "CONTEUDO_DOCUMENTAL"
                    : "",
        };

        if (
            !competencia
                .competenciaIso
        ) {
            adicionarMotivo(
                motivos,
                "COMPETENCIA_NAO_IDENTIFICADA",
                "O documento mensal não comprovou uma competência segura; o mês aberto na interface não será utilizado como fallback."
            );
        }
    }
    else if (
        politica ===
        CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
            .VALIDADE
    ) {
        const origem =
            resolverOrigemValidade({
                tipoDocumento,
                avaliacao,
            });

        destino = {
            competenciaIso:
                origem
                    .competenciaIso,

            fonte:
                origem
                    .fonte,

            dataFonteIso:
                origem
                    .dataFonteIso,

            cobertura:
                montarCoberturaValidade({
                    tipoDocumento,
                    avaliacao,
                }),
        };

        if (
            !origem
                .competenciaIso
        ) {
            adicionarMotivo(
                motivos,
                "ORIGEM_VALIDADE_NAO_IDENTIFICADA",
                "O documento controlado por validade não possui origem documental segura para definir sua competência de armazenamento."
            );
        }
    }
    else {
        adicionarMotivo(
            motivos,
            "POLITICA_NAO_RESOLVIDA",
            "A política documental não pôde ser determinada."
        );
    }

    if (
        avaliacao
            ?.bloqueiaSubstituicao ===
        true
    ) {
        adicionarMotivo(
            motivos,
            "AVALIACAO_REQUER_REVISAO",
            textoSeguro(
                avaliacao
                    ?.mensagem
            ) ||
            "O avaliador encontrou uma condição que exige revisão humana."
        );
    }

    let status =
        CERTIDAO_BATCH_STATUS
            .PRONTO;

    if (
        identificacaoEmpresa
            .status !==
        "IDENTIFICADA" ||
        motivos.length > 0
    ) {
        status =
            CERTIDAO_BATCH_STATUS
                .REVISAR;
    }

    return {
        ...base,

        status,

        politica,

        destino,

        avaliacao,

        motivos,

        prontoParaRevisao:
            true,

        /*
         * Mesmo status PRONTO ainda significa:
         * "pronto para aparecer na revisão do lote".
         *
         * Persistência continua proibida nesta fase.
         */
        persistenciaAutomatica:
            false,

        persistido:
            false,
    };
}