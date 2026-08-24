import {
    classificarDocumentoCertidao,
} from "./certidaoDocumentClassifier.js";

import {
    normalizarTextoDocumental,
} from "./certidaoDocumentTextUtils.js";
// ============================================================
// SAFE_SCAN_CLASSIFICADOR_UPLOAD_MASSA_V1
//
// Classificação autônoma destinada ao upload documental em lote.
//
// IMPORTANTE:
// - não altera o contrato de classificarDocumentoCertidao();
// - não presume documentoEsperado;
// - não determina competência por conta própria;
// - somente identifica o tipo documental provável;
// - competência e empresa são validadas em etapa posterior.
// ============================================================

const MAPA_TIPO_CLASSIFICADOR_PARA_CATALOGO_LOTE =
    Object.freeze({
        "fgts-digital-gfd":
            "fgts",
    });

function coletarMarcadoresLote(
    conteudo,
    marcadores
) {
    return (
        Array.isArray(
            marcadores
        )
            ? marcadores.filter(
                (marcador) =>
                    conteudo.includes(
                        marcador
                    )
            )
            : []
    );
}

function criarResultadoLote({
    id,
    titulo,
    confianca,
    evidencias = [],
    tipoClassificador = "",
    tipoCatalogo = "",
    origem = "classificador_lote",
    complementar = false,
}) {
    const idNormalizado =
        String(
            id || ""
        ).trim();

    const tipoClassificadorNormalizado =
        String(
            tipoClassificador ||
            idNormalizado
        ).trim();

    const tipoCatalogoNormalizado =
        String(
            tipoCatalogo ||
            (
                complementar
                    ? ""
                    : idNormalizado
            )
        ).trim();

    return {
        identificado:
            Boolean(
                idNormalizado &&
                idNormalizado !==
                    "nao-identificado"
            ),

        id:
            idNormalizado ||
            "nao-identificado",

        titulo:
            String(
                titulo ||
                "Documento não identificado"
            ).trim(),

        confianca:
            Math.max(
                0,
                Math.min(
                    100,
                    Number(
                        confianca || 0
                    )
                )
            ),

        evidencias:
            [
                ...new Set(
                    (
                        Array.isArray(
                            evidencias
                        )
                            ? evidencias
                            : []
                    )
                        .map(
                            (item) =>
                                String(
                                    item || ""
                                ).trim()
                        )
                        .filter(
                            Boolean
                        )
                ),
            ],

        tipoClassificador:
            tipoClassificadorNormalizado,

        tipoCatalogo:
            tipoCatalogoNormalizado,

        origem,

        complementar:
            complementar === true,
    };
}

function classificarIssLote(
    conteudo
) {
    const possuiIssqn =
        Boolean(
            /\bISSQN\b/.test(
                conteudo
            ) ||
            conteudo.includes(
                "IMPOSTO SOBRE SERVICOS DE QUALQUER NATUREZA"
            )
        );

    const identidadeCertidaoIssqn =
        Boolean(
            conteudo.includes(
                "CERTIDAO DE ISSQN"
            ) ||
            conteudo.includes(
                "ISSQN/TAXA DE LICENCA"
            ) ||
            (
                conteudo.includes(
                    "CERTIDAO"
                ) &&
                possuiIssqn &&
                conteudo.includes(
                    "TAXA DE LICENCA"
                )
            )
        );

    if (
        identidadeCertidaoIssqn
    ) {
        return criarResultadoLote({
            id:
                "iss",

            titulo:
                "ISSQN",

            confianca:
                96,

            evidencias: [
                "CERTIDAO",
                "ISSQN",
                "TAXA DE LICENCA",
            ],

            tipoCatalogo:
                "iss",

            origem:
                "classificador_lote_certidao_issqn",
        });
    }

    return null;
}

function classificarEsocialLote(
    conteudo
) {
    const eventos = [];

    if (
        /\bS[\s-]*2210\b/.test(
            conteudo
        ) ||
        conteudo.includes(
            "EVTCAT"
        ) ||
        conteudo.includes(
            "COMUNICACAO DE ACIDENTE DE TRABALHO"
        )
    ) {
        eventos.push(
            "S-2210"
        );
    }

    if (
        /\bS[\s-]*2220\b/.test(
            conteudo
        ) ||
        conteudo.includes(
            "EVTMONIT"
        ) ||
        conteudo.includes(
            "MONITORAMENTO DA SAUDE DO TRABALHADOR"
        )
    ) {
        eventos.push(
            "S-2220"
        );
    }

    if (
        /\bS[\s-]*2240\b/.test(
            conteudo
        ) ||
        conteudo.includes(
            "EVTEXPRISCO"
        ) ||
        conteudo.includes(
            "CONDICOES AMBIENTAIS DO TRABALHO"
        )
    ) {
        eventos.push(
            "S-2240"
        );
    }

    if (!eventos.length) {
        return null;
    }

    return criarResultadoLote({
        id:
            "esocial",

        titulo:
            "eSocial SST",

        confianca:
            96,

        evidencias:
            eventos,

        tipoCatalogo:
            "esocial",
    });
}

function classificarInssDctfwebLote(
    conteudo
) {
    const nomeDctfweb =
        Boolean(
            conteudo.includes(
                "DCTFWEB"
            ) ||
            conteudo.includes(
                "DCTF WEB"
            ) ||
            conteudo.includes(
                "DECLARACAO DE DEBITOS E CREDITOS TRIBUTARIOS FEDERAIS"
            )
        );

    const reciboEntrega =
        conteudo.includes(
            "RECIBO DE ENTREGA"
        );

    const possuiDarf =
        Boolean(
            conteudo.includes(
                "DOCUMENTO DE ARRECADACAO DE RECEITAS FEDERAIS"
            ) ||
            /\bDARF\b/.test(
                conteudo
            )
        );

    const previdenciario =
        [
            "CONTRIBUICOES PREVIDENCIARIAS",
            "CONTRIBUICAO PREVIDENCIARIA",
            "DEBITOS PREVIDENCIARIOS",
            "DEBITO PREVIDENCIARIO",
            "PREVIDENCIARIO",
            "CP SEGURADOS",
            "CP PATRONAL",
        ]
            .some(
                (marcador) =>
                    conteudo.includes(
                        marcador
                    )
            );

    const declaracao =
        Boolean(
            nomeDctfweb &&
            (
                reciboEntrega ||
                conteudo.includes(
                    "DECLARACAO"
                ) ||
                conteudo.includes(
                    "PERIODO DE APURACAO"
                ) ||
                conteudo.includes(
                    "NUMERO DO RECIBO"
                )
            )
        );

    const darfDctfweb =
        Boolean(
            possuiDarf &&
            (
                nomeDctfweb ||
                previdenciario
            )
        );

    if (
        !declaracao &&
        !darfDctfweb
    ) {
        return null;
    }

    const evidencias = [];

    if (nomeDctfweb) {
        evidencias.push(
            "DCTFWEB"
        );
    }

    if (reciboEntrega) {
        evidencias.push(
            "RECIBO DE ENTREGA"
        );
    }

    if (possuiDarf) {
        evidencias.push(
            "DARF"
        );
    }

    if (previdenciario) {
        evidencias.push(
            "PREVIDENCIARIO"
        );
    }

    return criarResultadoLote({
        id:
            "inss-dctfweb",

        titulo:
            "INSS / DCTFWeb",

        confianca:
            95,

        evidencias,

        tipoCatalogo:
            "inss-dctfweb",
    });
}

function classificarSeguroVidaLote(
    conteudo
) {
    const fortes =
        coletarMarcadoresLote(
            conteudo,
            [
                "SEGURO DE VIDA",
                "SEGURO VIDA",
                "VIDA EM GRUPO",
                "SEGURO DE VIDA EM GRUPO",
                "SEGURO COLETIVO DE PESSOAS",
                "SEGURO DE PESSOAS COLETIVO",
                "CERTIFICADO INDIVIDUAL DE SEGURO",
            ]
        );

    const apoio =
        coletarMarcadoresLote(
            conteudo,
            [
                "APOLICE",
                "SEGURADORA",
                "ESTIPULANTE",
                "SUBESTIPULANTE",
                "VIGENCIA",
                "CAPITAL SEGURADO",
                "COBERTURA",
                "COBERTURAS",
                "CERTIFICADO",
                "PREMIO",
                "SEGURADO",
            ]
        );

    if (
        !fortes.length ||
        !apoio.length
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "seguro-vida",

        titulo:
            "Seguro de Vida",

        confianca:
            94,

        evidencias: [
            ...fortes,
            ...apoio.slice(
                0,
                3
            ),
        ],

        tipoCatalogo:
            "seguro-vida",
    });
}

function classificarFolhaPontoLote(
    conteudo
) {
    const fortes =
        coletarMarcadoresLote(
            conteudo,
            [
                "ESPELHO DE PONTO",
                "ESPELHO DO PONTO",
                "FOLHA DE PONTO",
                "CARTAO DE PONTO",
                "REGISTRO DE PONTO",
                "CONTROLE DE PONTO",
                "PONTO ELETRONICO",
            ]
        );

    const jornada =
        coletarMarcadoresLote(
            conteudo,
            [
                "ENTRADA",
                "SAIDA",
                "INTERVALO",
                "JORNADA",
                "HORAS TRABALHADAS",
                "HORAS NORMAIS",
                "HORAS EXTRAS",
            ]
        );

    if (
        !fortes.length &&
        jornada.length < 3
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "folha-ponto",

        titulo:
            "Espelho de Ponto",

        confianca:
            fortes.length
                ? 95
                : 89,

        evidencias:
            fortes.length
                ? [
                    ...fortes,
                    ...jornada.slice(
                        0,
                        3
                    ),
                ]
                : jornada.slice(
                    0,
                    5
                ),

        tipoCatalogo:
            "folha-ponto",
    });
}

// ============================================================
 // SAFE_SCAN_COMPLEMENTAR_FOLHA_SISPAG_V1
 //
 // Evidências financeiras complementares da Folha.
 //
 // REGRAS:
 // - não substituem a Folha de Pagamento;
 // - não criam obrigação mensal própria;
 // - não inferem competência por data bancária;
 // - não usam nome de arquivo ou caminho como prova;
 // - documentos ambíguos permanecem não identificados.
 // ============================================================

function classificarComprovantePagamentoFolhaLote(
    conteudo
) {
    /*
     * Proteção contra colisão:
     *
     * se houver uma Folha principal real, este detector
     * obrigatoriamente devolve null e permite que
     * classificarFolhaPagamentoLote() assuma o documento.
     */
    const folhaDireta =
        coletarMarcadoresLote(
            conteudo,
            [
                "FOLHA DE PAGAMENTO",
                "FOLHA MENSAL",
                "RESUMO DA FOLHA",
                "RESUMO DE FOLHA",
                "TOTAL DA FOLHA",
                "RELATORIO DE FOLHA",
            ]
        );

    const conteudoFolha =
        coletarMarcadoresLote(
            conteudo,
            [
                "PROVENTOS",
                "DESCONTOS",
                "BASE INSS",
                "BASE FGTS",
                "VALOR FGTS",
                "SALARIO",
                "LIQUIDO",
            ]
        );

    const possuiFolhaPrincipal =
        Boolean(
            folhaDireta.length > 0 ||
            (
                conteudo.includes(
                    "EXTRATO MENSAL"
                ) &&
                conteudoFolha.length >=
                    2
            )
        );

    if (
        possuiFolhaPrincipal
    ) {
        return null;
    }

    const pagamentoDireto =
        coletarMarcadoresLote(
            conteudo,
            [
                "COMPROVANTE DE PAGAMENTO DE SALARIO",
                "PAGAMENTO DE SALARIOS",
                "PAGAMENTO DE SALARIO",
            ]
        );

    const marcadoresSispag =
        coletarMarcadoresLote(
            conteudo,
            [
                "SISPAG",
            ]
        );

    const marcadoresSalario =
        coletarMarcadoresLote(
            conteudo,
            [
                "SALARIO",
                "SALARIOS",
                "SALARIAL",
            ]
        );

    const marcadoresTransferencia =
        coletarMarcadoresLote(
            conteudo,
            [
                "COMPROVANTE DE TRANSFERENCIA",
                "TRANSFERENCIA",
                "ORDEM DE CREDITO",
                "CREDITO EM CONTA",
            ]
        );

    const marcadoresBeneficiario =
        coletarMarcadoresLote(
            conteudo,
            [
                "BENEFICIARIO",
                "FAVORECIDO",
            ]
        );

    const marcadoresAdiantamento =
        coletarMarcadoresLote(
            conteudo,
            [
                "ADIANTAMENTO SALARIAL",
                "ADIANTAMENTO DE SALARIO",
                "ADIANTAMENTO DE SALARIOS",
            ]
        );

    const adiantamentoComContexto =
        Boolean(
            marcadoresAdiantamento.length >
                0 ||
            (
                conteudo.includes(
                    "ADIANTAMENTO"
                ) &&
                (
                    marcadoresSispag.length >
                        0 ||
                    marcadoresTransferencia.length >
                        0
                ) &&
                marcadoresBeneficiario.length >
                    0
            )
        );

    if (
        adiantamentoComContexto
    ) {
        return criarResultadoLote({
            id:
                "adiantamento-salarial",

            titulo:
                "Adiantamento salarial",

            confianca:
                marcadoresAdiantamento.length >
                    0
                    ? 96
                    : 91,

            evidencias: [
                ...marcadoresAdiantamento,
                ...marcadoresSispag,
                ...marcadoresTransferencia.slice(
                    0,
                    2
                ),
                ...marcadoresBeneficiario.slice(
                    0,
                    1
                ),
            ],

            tipoClassificador:
                "adiantamento-salarial",

            tipoCatalogo:
                "",

            origem:
                "classificador_lote_complementar_folha",

            complementar:
                true,
        });
    }

    const sispagSalarial =
        Boolean(
            marcadoresSispag.length >
                0 &&
            marcadoresSalario.length >
                0
        );

    const transferenciaSalarial =
        Boolean(
            marcadoresTransferencia.length >
                0 &&
            marcadoresSalario.length >
                0 &&
            marcadoresBeneficiario.length >
                0
        );

    const pagamentoSalarial =
        Boolean(
            pagamentoDireto.length >
                0 ||
            sispagSalarial ||
            transferenciaSalarial
        );

    if (
        !pagamentoSalarial
    ) {
        return null;
    }

    const confianca =
        pagamentoDireto.length >
            0
            ? 96
            : sispagSalarial
                ? 94
                : 91;

    return criarResultadoLote({
        id:
            "pagamento-salarial",

        titulo:
            "Comprovante de pagamento salarial",

        confianca,

        evidencias: [
            ...pagamentoDireto,
            ...marcadoresSispag,
            ...marcadoresSalario.slice(
                0,
                2
            ),
            ...marcadoresTransferencia.slice(
                0,
                2
            ),
            ...marcadoresBeneficiario.slice(
                0,
                1
            ),
        ],

        tipoClassificador:
            "pagamento-salarial",

        tipoCatalogo:
            "",

        origem:
            "classificador_lote_complementar_folha",

        complementar:
            true,
    });
}

// ============================================================
// SAFE_SCAN_COMPROVANTE_BANCARIO_SISPAG_TED_V1
//
// Evidência bancária complementar cuja finalidade financeira
// ainda NÃO está comprovada como salário ou adiantamento.
//
// Nunca satisfaz Folha de Pagamento.
// Nunca cria obrigação mensal.
// Exige revisão humana.
// ============================================================

function classificarComprovanteBancarioSispagLote(
    conteudo
) {
    const marcadoresSispag =
        coletarMarcadoresLote(
            conteudo,
            [
                "SISPAG",
            ]
        );

    const marcadoresTed =
        coletarMarcadoresLote(
            conteudo,
            [
                "COMPROVANTE DE PAGAMENTO TED",
                "PAGAMENTO TED",
                "TED",
                "CREDITO EM CONTA",
            ]
        );

    const marcadoresPix =
        coletarMarcadoresLote(
            conteudo,
            [
                "PIX",
            ]
        );

    const marcadoresComprovanteTransferencia =
        coletarMarcadoresLote(
            conteudo,
            [
                "COMPROVANTE DE TRANSFERENCIA",
            ]
        );

    const marcadoresPagamento =
        coletarMarcadoresLote(
            conteudo,
            [
                "COMPROVANTE DE PAGAMENTO",
                "PAGAMENTO",
            ]
        );

    const marcadoresFavorecido =
        coletarMarcadoresLote(
            conteudo,
            [
                "NOME DO FAVORECIDO",
                "FAVORECIDO",
            ]
        );

    const marcadoresFinalidadeEspecifica =
        coletarMarcadoresLote(
            conteudo,
            [
                "SISPAG SALARIOS",
                "SALARIO",
                "SALARIOS",
                "SALARIAL",
                "ADIANTAMENTO SALARIAL",
                "ADIANTAMENTO DE SALARIO",
                "ADIANTAMENTO DE SALARIOS",
            ]
        );

    /*
     * Se existe finalidade salarial/adiantamento explícita,
     * o detector específico anterior é a autoridade.
     */
    if (
        marcadoresFinalidadeEspecifica.length >
        0
    ) {
        return null;
    }

    const evidenciaTedForte =
        Boolean(
            marcadoresSispag.length >
                0 &&
            marcadoresTed.length >
                0 &&
            marcadoresPagamento.length >
                0 &&
            marcadoresFavorecido.length >
                0
        );

    /*
     * PIX é aceito somente com um conjunto bancário forte.
     *
     * Não basta existir "PIX".
     * Não basta existir "SISPAG".
     *
     * É obrigatório comprovar, no próprio conteúdo:
     *
     * - SISPAG;
     * - PIX;
     * - contexto de pagamento;
     * - comprovante explícito de transferência.
     *
     * A finalidade financeira continua indefinida.
     */
    const evidenciaPixForte =
        Boolean(
            marcadoresSispag.length >
                0 &&
            marcadoresPix.length >
                0 &&
            marcadoresPagamento.length >
                0 &&
            marcadoresComprovanteTransferencia.length >
                0
        );

    const evidenciaBancariaForte =
        Boolean(
            evidenciaTedForte ||
            evidenciaPixForte
        );

    if (
        !evidenciaBancariaForte
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "comprovante-bancario-sispag",

        titulo:
            evidenciaPixForte &&
            !evidenciaTedForte
                ? "Comprovante bancário SISPAG/PIX"
                : "Comprovante bancário SISPAG/TED",

        confianca:
            88,

        evidencias: [
            ...marcadoresSispag,
            ...marcadoresTed.slice(
                0,
                2
            ),
            ...marcadoresPix.slice(
                0,
                2
            ),
            ...marcadoresPagamento.slice(
                0,
                2
            ),
            ...marcadoresFavorecido.slice(
                0,
                2
            ),
            ...marcadoresComprovanteTransferencia.slice(
                0,
                2
            ),
        ],

        tipoClassificador:
            "comprovante-bancario-sispag",

        tipoCatalogo:
            "",

        origem:
            "classificador_lote_complementar_bancario",

        complementar:
            true,
    });
}

function classificarFolhaPagamentoLote(
    conteudo
) {
    const diretos =
        coletarMarcadoresLote(
            conteudo,
            [
                "FOLHA DE PAGAMENTO",
                "FOLHA MENSAL",
                "RESUMO DA FOLHA",
                "RESUMO DE FOLHA",
                "TOTAL DA FOLHA",
                "RELATORIO DE FOLHA",
            ]
        );

    const conteudoFolha =
        coletarMarcadoresLote(
            conteudo,
            [
                "PROVENTOS",
                "DESCONTOS",
                "BASE INSS",
                "BASE FGTS",
                "VALOR FGTS",
                "SALARIO",
                "LIQUIDO",
            ]
        );

    const extratoMensal =
        conteudo.includes(
            "EXTRATO MENSAL"
        );

    const reconhecido =
        Boolean(
            diretos.length > 0 ||
            (
                extratoMensal &&
                conteudoFolha.length >= 2
            )
        );

    if (!reconhecido) {
        return null;
    }

    const evidencias = [
        ...diretos,
        ...(
            extratoMensal
                ? [
                    "EXTRATO MENSAL",
                ]
                : []
        ),
        ...conteudoFolha.slice(
            0,
            4
        ),
    ];

    return criarResultadoLote({
        id:
            "folha-pagamento",

        titulo:
            "Folha de Pagamento e Comprovantes",

        confianca:
            diretos.length
                ? 95
                : 90,

        evidencias,

        tipoCatalogo:
            "folha-pagamento",
    });
}

function classificarVaVtLote(
    conteudo
) {
    const va =
        coletarMarcadoresLote(
            conteudo,
            [
                "VALE ALIMENTACAO",
                "AUXILIO ALIMENTACAO",
                "VALE REFEICAO",
                "AUXILIO REFEICAO",
                "BENEFICIO ALIMENTACAO",
                "BENEFICIO REFEICAO",
            ]
        );

    const vt =
        coletarMarcadoresLote(
            conteudo,
            [
                "VALE TRANSPORTE",
                "AUXILIO TRANSPORTE",
                "BENEFICIO TRANSPORTE",
                "RECARGA DE TRANSPORTE",
                "CREDITO DE TRANSPORTE",
            ]
        );

    const apoio =
        coletarMarcadoresLote(
            conteudo,
            [
                "BENEFICIARIO",
                "BENEFICIARIOS",
                "PEDIDO",
                "RECARGA",
                "CREDITO",
                "CARTAO",
                "RELATORIO",
                "RELACAO",
                "LISTAGEM",
                "COMPROVANTE",
                "COLABORADOR",
                "FUNCIONARIO",
                "MATRICULA",
                "CPF",
                "VALOR TOTAL",
                "QUANTIDADE",
            ]
        );

    const folha =
        coletarMarcadoresLote(
            conteudo,
            [
                "FOLHA DE PAGAMENTO",
                "FOLHA MENSAL",
                "PROVENTOS",
                "DESCONTOS",
                "BASE INSS",
                "BASE FGTS",
            ]
        );

    const apoioForte =
        apoio.some(
            (marcador) =>
                [
                    "BENEFICIARIO",
                    "BENEFICIARIOS",
                    "PEDIDO",
                    "RECARGA",
                    "CARTAO",
                    "COMPROVANTE",
                ].includes(
                    marcador
                )
        );

    const reconhecido =
        Boolean(
            (
                va.length > 0 ||
                vt.length > 0
            ) &&
            apoio.length > 0 &&
            (
                folha.length < 2 ||
                apoioForte
            )
        );

    if (!reconhecido) {
        return null;
    }

    return criarResultadoLote({
        id:
            "va-vt",

        titulo:
            "VA / VT",

        confianca:
            93,

        evidencias: [
            ...va,
            ...vt,
            ...apoio.slice(
                0,
                3
            ),
        ],

        tipoCatalogo:
            "va-vt",
    });
}

function classificarIssMensalLote(
    conteudo
) {
    const possuiIss =
        Boolean(
            /\bISSQN\b/.test(
                conteudo
            ) ||
            /\bISS\b/.test(
                conteudo
            ) ||
            conteudo.includes(
                "IMPOSTO SOBRE SERVICOS"
            )
        );

    if (!possuiIss) {
        return null;
    }

    const notaFiscal =
        Boolean(
            conteudo.includes(
                "NOTA FISCAL DE SERVICOS"
            ) ||
            conteudo.includes(
                "NOTA FISCAL DE SERVICO"
            ) ||
            conteudo.includes(
                "NFS-E"
            ) ||
            /\bNFSE\b/.test(
                conteudo
            )
        );

    const guia =
        Boolean(
            conteudo.includes(
                "GUIA DE RECOLHIMENTO"
            ) ||
            conteudo.includes(
                "GUIA DE ARRECADACAO"
            ) ||
            conteudo.includes(
                "DOCUMENTO DE ARRECADACAO MUNICIPAL"
            ) ||
            conteudo.includes(
                "GUIA ISS"
            ) ||
            conteudo.includes(
                "GUIA DE ISS"
            )
        );

    const pagamento =
        Boolean(
            conteudo.includes(
                "COMPROVANTE DE PAGAMENTO"
            ) ||
            conteudo.includes(
                "COMPROVANTE DE ARRECADACAO"
            ) ||
            conteudo.includes(
                "COMPROVANTE DE RECOLHIMENTO"
            ) ||
            conteudo.includes(
                "PAGAMENTO EFETUADO"
            )
        );

    const recolhimento =
        Boolean(
            conteudo.includes(
                "RECOLHIMENTO DO ISS"
            ) ||
            conteudo.includes(
                "RECOLHIMENTO DE ISS"
            ) ||
            conteudo.includes(
                "ARRECADACAO DO ISS"
            ) ||
            conteudo.includes(
                "ARRECADACAO DE ISS"
            )
        );

    const possuiReferencia =
        Boolean(
            conteudo.includes(
                "PERIODO DE APURACAO"
            ) ||
            conteudo.includes(
                "COMPETENCIA"
            ) ||
            conteudo.includes(
                "MES DE REFERENCIA"
            )
        );

    const possuiValor =
        Boolean(
            conteudo.includes(
                "VALOR"
            ) ||
            conteudo.includes(
                "VENCIMENTO"
            ) ||
            conteudo.includes(
                "ARRECADACAO"
            ) ||
            conteudo.includes(
                "RECOLHIMENTO"
            )
        );

    const estruturaFiscal =
        Boolean(
            possuiReferencia &&
            possuiValor
        );

    const notaFiscalIsolada =
        Boolean(
            notaFiscal &&
            !guia &&
            !pagamento &&
            !recolhimento
        );

    if (
        notaFiscalIsolada ||
        (
            !guia &&
            !pagamento &&
            !recolhimento &&
            !estruturaFiscal
        )
    ) {
        return null;
    }

    const evidencias = [
        "ISS/ISSQN",
    ];

    if (guia) {
        evidencias.push(
            "GUIA"
        );
    }

    if (pagamento) {
        evidencias.push(
            "COMPROVANTE"
        );
    }

    if (recolhimento) {
        evidencias.push(
            "RECOLHIMENTO"
        );
    }

    if (estruturaFiscal) {
        evidencias.push(
            "COMPETENCIA/APURACAO"
        );
    }

    return criarResultadoLote({
        id:
            "iss",

        titulo:
            "ISSQN",

        confianca:
            92,

        evidencias,

        tipoCatalogo:
            "iss",
    });
}

function classificarFalenciaLote(
    conteudo
) {
    const evidencias =
        coletarMarcadoresLote(
            conteudo,
            [
                "CERTIDAO DE FALENCIA E CONCORDATA",
                "CERTIDAO DE FALENCIA",
                "FALENCIAS E RECUPERACOES JUDICIAIS",
                "FALENCIA E CONCORDATA",
            ]
        );

    if (!evidencias.length) {
        return null;
    }

    return criarResultadoLote({
        id:
            "falencia-concordata",

        titulo:
            "Falência e Concordata",

        confianca:
            92,

        evidencias,

        tipoCatalogo:
            "falencia-concordata",
    });
}

function classificarTceCeisLote(
    conteudo
) {
    const ceis =
        Boolean(
            conteudo.includes(
                "CADASTRO NACIONAL DE EMPRESAS INIDONEAS E SUSPENSAS"
            ) ||
            (
                /\bCEIS\b/.test(
                    conteudo
                ) &&
                (
                    conteudo.includes(
                        "CADASTRO"
                    ) ||
                    conteudo.includes(
                        "CONSULTA"
                    )
                )
            )
        );

    const tce =
        Boolean(
            conteudo.includes(
                "TRIBUNAL DE CONTAS"
            ) &&
            (
                conteudo.includes(
                    "IMPEDIMENTO"
                ) ||
                conteudo.includes(
                    "INIDONE"
                ) ||
                conteudo.includes(
                    "SANCION"
                )
            )
        );

    if (
        !ceis &&
        !tce
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "cadastro-tce-ceis",

        titulo:
            "Cadastro TCE / CEIS",

        confianca:
            90,

        evidencias: [
            ...(
                ceis
                    ? [
                        "CEIS",
                    ]
                    : []
            ),
            ...(
                tce
                    ? [
                        "TRIBUNAL DE CONTAS",
                    ]
                    : []
            ),
        ],

        tipoCatalogo:
            "cadastro-tce-ceis",
    });
}

export function classificarDocumentoCertidaoEmLote(
    texto = ""
) {
    const conteudo =
        normalizarTextoDocumental(
            texto
        );

    if (!conteudo) {
        return criarResultadoLote({
            id:
                "nao-identificado",

            titulo:
                "Documento não identificado",

            confianca:
                0,

            origem:
                "classificador_lote_vazio",
        });
    }

    /*
     * A Certidão ISSQN possui identidade própria e pode conter
     * termos municipais que também aparecem em certidões locais.
     * Por isso sua assinatura forte é verificada antes do
     * classificador genérico legado.
     */
    const issCertidao =
        classificarIssLote(
            conteudo
        );

    if (issCertidao) {
        return issCertidao;
    }

    /*
     * Primeiro preservamos tudo que o classificador legado já
     * reconhece com alta confiança.
     */
    const classificacaoBase =
        classificarDocumentoCertidao(
            texto
        );

    if (
        classificacaoBase
            ?.identificado
    ) {
        const tipoClassificador =
            String(
                classificacaoBase.id ||
                ""
            ).trim();

        const complementar =
            tipoClassificador ===
            "ceat-trt";

        const tipoCatalogo =
            complementar
                ? ""
                : (
                    MAPA_TIPO_CLASSIFICADOR_PARA_CATALOGO_LOTE[
                        tipoClassificador
                    ] ||
                    tipoClassificador
                );

        const id =
            complementar
                ? tipoClassificador
                : tipoCatalogo;

        return criarResultadoLote({
            id,

            titulo:
                classificacaoBase
                    .titulo,

            confianca:
                classificacaoBase
                    .confianca,

            evidencias:
                classificacaoBase
                    .evidencias,

            tipoClassificador,

            tipoCatalogo,

            origem:
                "classificador_legado",

            complementar,
        });
    }

    /*
     * Os detectores abaixo reproduzem somente os critérios
     * estruturais já usados pelos avaliadores específicos.
     * Eles NÃO avaliam conformidade.
     */
    const detectores = [
        classificarEsocialLote,
        classificarInssDctfwebLote,
        classificarSeguroVidaLote,
        classificarFolhaPontoLote,
        classificarComprovantePagamentoFolhaLote,
        classificarComprovanteBancarioSispagLote,
        classificarFolhaPagamentoLote,
        classificarVaVtLote,
        classificarIssMensalLote,
        classificarFalenciaLote,
        classificarTceCeisLote,
    ];

    for (
        const detectar of
        detectores
    ) {
        const resultado =
            detectar(
                conteudo
            );

        if (resultado) {
            return resultado;
        }
    }

    return criarResultadoLote({
        id:
            "nao-identificado",

        titulo:
            "Documento não identificado",

        confianca:
            0,

        evidencias: [],

        origem:
            "classificador_lote_sem_correspondencia",
    });
}
