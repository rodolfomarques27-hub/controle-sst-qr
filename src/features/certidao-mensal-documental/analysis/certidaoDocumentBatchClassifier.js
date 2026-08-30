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


// SAFE_SCAN_ASO_PCMSO_CLASSIFIER_27H
function classificarAsoPcmsoLote(
    conteudo
) {
    const tituloAsoForte =
        Boolean(
            conteudo.includes(
                "ATESTADO DE SAUDE OCUPACIONAL"
            ) ||
            /ATESTAD[O0][\s\S]{0,24}SAUDE[\s\S]{0,24}OCUPACIONAL/
                .test(
                    conteudo
                )
        );

    const siglaAso =
        /\bAS[O0]\b/
            .test(
                conteudo
            );

    const pcmso =
        Boolean(
            conteudo.includes(
                "PROGRAMA DE CONTROLE MEDICO DE SAUDE OCUPACIONAL"
            ) ||
            /\bPCM[S5][O0]\b/
                .test(
                    conteudo
                )
        );

    const tiposExame =
        coletarMarcadoresLote(
            conteudo,
            [
                "EXAME PERIODICO",
                "PERIODICO",
                "EXAME ADMISSIONAL",
                "ADMISSIONAL",
                "EXAME DEMISSIONAL",
                "DEMISSIONAL",
                "MUDANCA DE RISCO",
                "MUDANCA DE FUNCAO",
                "RETORNO AO TRABALHO",
            ]
        );

    const aptidao =
        coletarMarcadoresLote(
            conteudo,
            [
                "APTO PARA",
                "INAPTO PARA",
                "APTO",
                "INAPTO",
            ]
        );

    const medico =
        coletarMarcadoresLote(
            conteudo,
            [
                "MEDICO EXAMINADOR",
                "MEDICO COORDENADOR",
                "RESPONSAVEL MEDICO",
                "CRM",
            ]
        );

    const riscos =
        coletarMarcadoresLote(
            conteudo,
            [
                "RISCOS OCUPACIONAIS",
                "RISCO OCUPACIONAL",
                "FATORES DE RISCO",
                "EXAMES COMPLEMENTARES",
                "EXAMES OCUPACIONAIS",
            ]
        );

    const trabalhador =
        coletarMarcadoresLote(
            conteudo,
            [
                "FUNCIONARIO",
                "COLABORADOR",
                "EMPREGADO",
                "FUNCAO",
                "SETOR",
                "MATRICULA",
            ]
        );

    const gruposApoio =
        [
            tiposExame,
            aptidao,
            medico,
            riscos,
            trabalhador,
        ]
            .filter(
                (grupo) =>
                    grupo.length >
                    0
            )
            .length;

    const estruturaAsoForte =
        Boolean(
            tiposExame.length >
                0 &&
            aptidao.length >
                0 &&
            medico.length >
                0 &&
            (
                riscos.length >
                    0 ||
                trabalhador.length >
                    0
            )
        );

    const reconhecido =
        Boolean(
            tituloAsoForte ||
            (
                siglaAso &&
                gruposApoio >=
                    2
            ) ||
            (
                pcmso &&
                gruposApoio >=
                    3 &&
                (
                    medico.length >
                        0 ||
                    riscos.length >
                        0
                )
            ) ||
            estruturaAsoForte
        );

    if (!reconhecido) {
        return null;
    }

    return criarResultadoLote({
        id:
            "aso-pcmso",

        titulo:
            "ASO / PCMSO",

        confianca:
            tituloAsoForte
                ? 97
                : siglaAso
                    ? 94
                    : pcmso
                        ? 91
                        : 89,

        evidencias: [
            ...(
                tituloAsoForte
                    ? [
                        "ATESTADO DE SAUDE OCUPACIONAL",
                    ]
                    : []
            ),
            ...(
                siglaAso
                    ? [
                        "ASO",
                    ]
                    : []
            ),
            ...(
                pcmso
                    ? [
                        "PCMSO",
                    ]
                    : []
            ),
            ...tiposExame.slice(
                0,
                2
            ),
            ...aptidao.slice(
                0,
                2
            ),
            ...medico.slice(
                0,
                2
            ),
            ...riscos.slice(
                0,
                2
            ),
            ...trabalhador.slice(
                0,
                2
            ),
        ],

        tipoClassificador:
            "aso-pcmso",

        tipoCatalogo:
            "aso-pcmso",

        origem:
            "classificador_lote_aso_pcmso",
    });
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

// SAFE_SCAN_CERT2_M4_F4_J_VAVT_FORA_ESCOPO_V1
//
// VA e VT não constituem obrigação documental mensal do CERT2.
// O detector reconhece o benefício para evitar que o documento
// seja tratado como desconhecido.
//
// Nome de arquivo e pasta não participam da decisão semântica.
//
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

    const reconhecidoExplicito =
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

    const vaEstrutural =
        Boolean(
            conteudo.includes(
                "VALOR DOS BENEFICIOS"
            ) &&
            conteudo.includes(
                "QUANTIDADE DE BENEFICIARIOS"
            ) &&
            conteudo.includes(
                "BENEFICIARIO"
            ) &&
            conteudo.includes(
                "CPF"
            ) &&
            conteudo.includes(
                "MATRICULA"
            ) &&
            (
                conteudo.includes(
                    "DATA DE CREDITO"
                ) ||
                conteudo.includes(
                    "DATA DE ENTREGA"
                )
            ) &&
            (
                conteudo.includes(
                    "VALOR DO BENEFICIO"
                ) ||
                conteudo.includes(
                    "DEPARTAMENTO"
                )
            )
        );

    const vtEstrutural =
        Boolean(
            conteudo.includes(
                "LISTAGEM DE FUNCIONARIOS"
            ) &&
            conteudo.includes(
                "PERIODO UTILIZACAO"
            ) &&
            conteudo.includes(
                "PEDIDO"
            ) &&
            (
                conteudo.includes(
                    "DETALHE DO CARTAO PROCESSADO NO PEDIDO"
                ) ||
                conteudo.includes(
                    "DETALHE DOS CARTOES PROCESSADOS NO PEDIDO"
                )
            ) &&
            conteudo.includes(
                "EMISSOR"
            ) &&
            conteudo.includes(
                "RECARGA DISPONIVEL PARA VALIDACAO"
            )
        );

    const reconhecido =
        Boolean(
            reconhecidoExplicito ||
            vaEstrutural ||
            vtEstrutural
        );

    if (!reconhecido) {
        return null;
    }

    const evidenciasEstruturais =
        vaEstrutural
            ? [
                "VALOR DOS BENEFICIOS",
                "QUANTIDADE DE BENEFICIARIOS",
                "BENEFICIARIO",
            ]
            : vtEstrutural
                ? [
                    "LISTAGEM DE FUNCIONARIOS",
                    "PERIODO UTILIZACAO",
                    "RECARGA DISPONIVEL PARA VALIDACAO",
                ]
                : [];

    return criarResultadoLote({
        id:
            "va-vt",

        titulo:
            "VA / VT",

        confianca:
            (
                vaEstrutural ||
                vtEstrutural
            )
                ? 95
                : 93,

        evidencias: [
            ...va,
            ...vt,
            ...evidenciasEstruturais,
            ...apoio.slice(
                0,
                3
            ),
        ],

        tipoClassificador:
            "va-vt",

        tipoCatalogo:
            "",

        origem:
            "classificador_lote_fora_escopo_mensal",

        complementar:
            true,
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


// ============================================================
// SAFE_SCAN_27I_CLASSIFIER_FAMILIAS_R3
//
// Cobertura comprovada pelo conteúdo dos PDFs reais da
// Falcão Bauer.
//
// Nenhuma regra abaixo usa filename/pasta como evidência.
// ============================================================

function classificarCndEstadualExpandidaLote(
    conteudo
) {
    const sefazSp =
        Boolean(
            conteudo.includes(
                "SECRETARIA DA FAZENDA E PLANEJAMENTO DO ESTADO DE SAO PAULO"
            ) ||
            conteudo.includes(
                "SECRETARIA DA FAZENDA"
            )
        );

    const debitos =
        Boolean(
            conteudo.includes(
                "DEBITOS"
            ) &&
            (
                conteudo.includes(
                    "DIVIDA ATIVA"
                ) ||
                conteudo.includes(
                    "PENDENTES DE INSCRICAO"
                )
            )
        );

    const pessoaJuridica =
        Boolean(
            conteudo.includes(
                "PESSOA JURIDICA"
            ) ||
            conteudo.includes(
                "ESTABELECIMENTO MATRIZ/FILIAL"
            )
        );

    if (
        !sefazSp ||
        !debitos ||
        !pessoaJuridica
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "cnd-estadual",

        titulo:
            "CND Estadual",

        confianca:
            94,

        evidencias: [
            "SECRETARIA DA FAZENDA",
            "DEBITOS",
            "DIVIDA ATIVA",
        ],

        tipoCatalogo:
            "cnd-estadual",

        origem:
            "classificador_lote_cnd_estadual_expandida",
    });
}

function classificarRelatorioFgtsComplementarLote(
    conteudo
) {
    const detalheGuia =
        conteudo.includes(
            "DETALHE DA GUIA EMITIDA"
        );

    const relacaoTrabalhadores =
        conteudo.includes(
            "RELACAO DE TRABALHADORES"
        );

    const identidadeFgts =
        Boolean(
            conteudo.includes(
                "TOTAL DA GUIA (FGTS)"
            ) ||
            conteudo.includes(
                "VALOR FGTS NA GUIA"
            )
        );

    const estrutura =
        Boolean(
            conteudo.includes(
                "NOME EMPREGADOR"
            ) &&
            (
                conteudo.includes(
                    "NUMERO DA GUIA"
                ) ||
                conteudo.includes(
                    "QTD. TRABALHADORES FGTS"
                )
            )
        );

    if (
        !detalheGuia ||
        !relacaoTrabalhadores ||
        !identidadeFgts ||
        !estrutura
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "relatorio-fgts-digital",

        titulo:
            "Relatório de trabalhadores do FGTS Digital",

        confianca:
            96,

        evidencias: [
            "DETALHE DA GUIA EMITIDA",
            "RELACAO DE TRABALHADORES",
            "FGTS",
        ],

        tipoClassificador:
            "relatorio-fgts-digital",

        tipoCatalogo:
            "fgts",

        origem:
            "classificador_lote_complementar_fgts",

        complementar:
            true,
    });
}

function classificarComprovantePagamentoSalarialExpandidoLote(
    conteudo
) {
    const creditoContaSalario =
        Boolean(
            conteudo.includes(
                "DETALHE DO PAGAMENTO"
            ) &&
            conteudo.includes(
                "CREDITO EM CONTA SALARIO"
            ) &&
            conteudo.includes(
                "DADOS DO FUNCIONARIO"
            ) &&
            conteudo.includes(
                "VALOR PAGAMENTO"
            )
        );

    const demonstrativoRecibo =
        Boolean(
            conteudo.includes(
                "DEMONSTRATIVO DE PAGAMENTO"
            ) &&
            conteudo.includes(
                "RECEBI O VALOR LIQUIDO DESTE RECIBO"
            ) &&
            (
                conteudo.includes(
                    "TOTAL DESCONTOS"
                ) ||
                conteudo.includes(
                    "LIQUIDO"
                )
            ) &&
            (
                conteudo.includes(
                    "SALARIO"
                ) ||
                conteudo.includes(
                    "BASE INSS"
                )
            )
        );


    // SAFE_SCAN_CERT2_M4_F3_E_RECIBO_SALARIAL_OCR_FORTE_V1
    //
    // Assinatura documental alternativa para holerite/recibo
    // escaneado quando o OCR perde o cabeçalho "Demonstrativo de
    // Pagamento" e/ou a frase completa "Recebi o valor líquido...".
    //
    // Fail-closed:
    // - não basta conter SALARIO;
    // - exige depósito em conta;
    // - exige líquido;
    // - exige evidência previdenciária;
    // - exige duas âncoras independentes de quitação.
    //
    // Dessa forma, resumo de folha, relatório contábil ou
    // transferência bancária isolada não satisfazem esta assinatura.

    const reciboSalarialOcrForte =
        Boolean(
            conteudo.includes(
                "SALARIO"
            ) &&
            conteudo.includes(
                "LIQUIDO"
            ) &&
            conteudo.includes(
                "DEPOSITADO NA CONTA"
            ) &&
            (
                conteudo.includes(
                    "INSS SOBRE A FOLHA"
                ) ||
                conteudo.includes(
                    "BASE INSS"
                )
            ) &&
            conteudo.includes(
                "CORRESPONDENTE A DISCRIMINACAO ACIMA"
            ) &&
            conteudo.includes(
                "DOU PLENA E TOTAL QUITACAO"
            )
        );
    if (
        !creditoContaSalario &&
        !demonstrativoRecibo &&
        !reciboSalarialOcrForte
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "pagamento-salarial",

        titulo:
            "Comprovante de pagamento salarial",

        confianca:
            reciboSalarialOcrForte &&
            !creditoContaSalario &&
            !demonstrativoRecibo
                ? 94
                : 96,

        evidencias:
            creditoContaSalario
                ? [
                    "CREDITO EM CONTA SALARIO",
                    "DADOS DO FUNCIONARIO",
                    "VALOR PAGAMENTO",
                ]
                : demonstrativoRecibo
                    ? [
                        "DEMONSTRATIVO DE PAGAMENTO",
                        "RECIBO DE VALOR LIQUIDO",
                        "SALARIO",
                    ]
                    : [
                        "SALARIO",
                        "LIQUIDO",
                        "DEPOSITADO NA CONTA",
                        "EVIDENCIA PREVIDENCIARIA",
                        "QUITACAO DE RECIBO SALARIAL",
                    ],

        tipoClassificador:
            "pagamento-salarial",

        tipoCatalogo:
            "",

        origem:
            "classificador_lote_complementar_folha_27i",

        complementar:
            true,
    });
}

function classificarRelacaoEmpregadosLote(
    conteudo
) {
    const titulo =
        Boolean(
            conteudo.includes(
                "RELACAO DE FUNCIONARIOS ATIVOS E AFASTADOS"
            ) ||
            conteudo.includes(
                "RELACAO DE EMPREGADOS ATIVOS E AFASTADOS"
            )
        );

    const colunas =
        Boolean(
            conteudo.includes(
                "NOME"
            ) &&
            conteudo.includes(
                "ADMISSAO"
            ) &&
            conteudo.includes(
                "CONTRATO"
            ) &&
            conteudo.includes(
                "SITUACAO"
            )
        );

    const corpo =
        Boolean(
            conteudo.includes(
                "ATIVO"
            ) &&
            conteudo.includes(
                "TOTAL DO(A)"
            )
        );

    if (
        !titulo ||
        !colunas ||
        !corpo
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "relacao-empregados",

        titulo:
            "Relação de Empregados",

        confianca:
            96,

        evidencias: [
            "RELACAO DE FUNCIONARIOS ATIVOS E AFASTADOS",
            "ADMISSAO",
            "CONTRATO",
            "SITUACAO",
        ],

        tipoCatalogo:
            "relacao-empregados",

        origem:
            "classificador_lote_relacao_empregados",

        complementar:
            true,
    });
}

function classificarPcmsoEstruturalLote(
    conteudo
) {
    const pcmso =
        /\bPCM[S5][O0]\b/
            .test(
                conteudo
            );

    const titulo =
        Boolean(
            conteudo.includes(
                "PROGRAMA DE CONTROLE MEDICO DE SAUDE OCUPACIONAL"
            ) ||
            conteudo.includes(
                "PROGRAMA DE CONTROLE MEDICO E SAUDE OCUPACIONAL"
            )
        );

    const estrutura =
        Boolean(
            conteudo.includes(
                "VIGENCIA"
            ) &&
            (
                conteudo.includes(
                    "IDENTIFICACAO DA EMPRESA"
                ) ||
                conteudo.includes(
                    "AREA RESPONSAVEL"
                )
            )
        );

    if (
        !pcmso ||
        !titulo ||
        !estrutura
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "aso-pcmso",

        titulo:
            "ASO / PCMSO",

        confianca:
            97,

        evidencias: [
            "PCMSO",
            "PROGRAMA DE CONTROLE MEDICO DE SAUDE OCUPACIONAL",
            "VIGENCIA",
        ],

        tipoCatalogo:
            "aso-pcmso",

        origem:
            "classificador_lote_pcmso_estrutural_27i",

        complementar:
            true,
    });
}

function classificarPgrForaEscopoLote(
    conteudo
) {
    const titulo =
        Boolean(
            conteudo.includes(
                "PROGRAMA DE GERENCIAMENTO DE RISCOS"
            ) &&
            /\bPGR\b/
                .test(
                    conteudo
                )
        );

    const estrutura =
        Boolean(
            conteudo.includes(
                "PLANO DE ACAO"
            ) ||
            conteudo.includes(
                "INVENTARIO DE RISCOS"
            ) ||
            conteudo.includes(
                "NR 01"
            )
        );

    if (
        !titulo ||
        !estrutura
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "pgr",

        titulo:
            "PGR — Programa de Gerenciamento de Riscos",

        confianca:
            97,

        evidencias: [
            "PGR",
            "PROGRAMA DE GERENCIAMENTO DE RISCOS",
        ],

        tipoClassificador:
            "pgr",

        tipoCatalogo:
            "",

        origem:
            "classificador_lote_fora_escopo_mensal",

        complementar:
            true,
    });
}

function classificarIssMunicipalPagamentoLote(
    conteudo
) {
    const comprovante =
        conteudo.includes(
            "COMPROVANTE DE PAGAMENTO"
        );

    const tributoMunicipal =
        conteudo.includes(
            "TRIBUTOS MUNICIPAIS"
        );

    const servicos =
        Boolean(
            conteudo.includes(
                "NOTA FISCAL ELETRONICA DE SERVICOS"
            ) ||
            conteudo.includes(
                "NOTA FISCAL ELETRONICA DE SERVICO"
            ) ||
            conteudo.includes(
                "NFE.PREFEITURA"
            )
        );

    const estruturaPagamento =
        Boolean(
            conteudo.includes(
                "VALOR DO DOCUMENTO"
            ) &&
            (
                conteudo.includes(
                    "CODIGO DE BARRAS"
                ) ||
                conteudo.includes(
                    "AUTENTICACAO"
                )
            )
        );

    if (
        !comprovante ||
        !tributoMunicipal ||
        !servicos ||
        !estruturaPagamento
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "iss",

        titulo:
            "ISSQN",

        confianca:
            94,

        evidencias: [
            "TRIBUTOS MUNICIPAIS",
            "NOTA FISCAL ELETRONICA DE SERVICOS",
            "COMPROVANTE DE PAGAMENTO",
        ],

        tipoCatalogo:
            "iss",

        origem:
            "classificador_lote_iss_pagamento_municipal_27i",
    });
}

function classificarDarfFederalGenericoLote(
    conteudo
) {
    const darf =
        /\bDARF\b/
            .test(
                conteudo
            );

    const arrecadacaoFederal =
        Boolean(
            conteudo.includes(
                "RECEITAS FEDERAIS"
            ) &&
            conteudo.includes(
                "DOCUMENTO"
            ) &&
            (
                conteudo.includes(
                    "PAGAR"
                ) ||
                conteudo.includes(
                    "PAGAMENTO"
                )
            )
        );

    const dctfOuPrevidenciario =
        Boolean(
            conteudo.includes(
                "DCTFWEB"
            ) ||
            conteudo.includes(
                "DCTF WEB"
            ) ||
            conteudo.includes(
                "CONTRIBUICOES PREVIDENCIARIAS"
            ) ||
            conteudo.includes(
                "DEBITOS PREVIDENCIARIOS"
            ) ||
            conteudo.includes(
                "CP SEGURADOS"
            ) ||
            conteudo.includes(
                "CP PATRONAL"
            )
        );

    if (
        (
            !darf &&
            !arrecadacaoFederal
        ) ||
        dctfOuPrevidenciario
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "darf-federal-generico",

        titulo:
            "DARF / comprovante federal — revisar",

        confianca:
            86,

        evidencias: [
            ...(
                darf
                    ? [
                        "DARF",
                    ]
                    : []
            ),
            ...(
                arrecadacaoFederal
                    ? [
                        "RECEITAS FEDERAIS",
                    ]
                    : []
            ),
        ],

        tipoClassificador:
            "darf-federal-generico",

        tipoCatalogo:
            "",

        origem:
            "classificador_lote_federal_generico_27i",

        complementar:
            true,
    });
}

function classificarTributoMunicipalGenericoLote(
    conteudo
) {
    const comprovante =
        conteudo.includes(
            "COMPROVANTE DE PAGAMENTO"
        );

    const municipal =
        conteudo.includes(
            "TRIBUTOS MUNICIPAIS"
        );

    if (
        !comprovante ||
        !municipal
    ) {
        return null;
    }

    return criarResultadoLote({
        id:
            "tributo-municipal-generico",

        titulo:
            "Comprovante de tributo municipal — revisar",

        confianca:
            86,

        evidencias: [
            "COMPROVANTE DE PAGAMENTO",
            "TRIBUTOS MUNICIPAIS",
        ],

        tipoClassificador:
            "tributo-municipal-generico",

        tipoCatalogo:
            "",

        origem:
            "classificador_lote_municipal_generico_27i",

        complementar:
            true,
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
     * ASO/PCMSO é identificado somente pelo conteúdo efetivamente
     * extraído do documento. Nome do arquivo não participa.
     */
    const asoPcmso =
        classificarAsoPcmsoLote(
            conteudo
        );

    if (asoPcmso) {
        return asoPcmso;
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
        classificarCndEstadualExpandidaLote,
        classificarRelatorioFgtsComplementarLote,
        classificarComprovantePagamentoSalarialExpandidoLote,
        classificarRelacaoEmpregadosLote,
        classificarPcmsoEstruturalLote,
        classificarPgrForaEscopoLote,
        classificarIssMunicipalPagamentoLote,
        classificarEsocialLote,
        classificarInssDctfwebLote,
        classificarDarfFederalGenericoLote,
        classificarSeguroVidaLote,
        classificarFolhaPontoLote,
        classificarComprovantePagamentoFolhaLote,
        classificarComprovanteBancarioSispagLote,
        classificarFolhaPagamentoLote,
        classificarVaVtLote,
        classificarIssMensalLote,
        classificarTributoMunicipalGenericoLote,
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
