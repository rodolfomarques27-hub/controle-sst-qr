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


function normalizarRazaoSocialDocumental(
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
            /&/g,
            " E "
        )
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

function extrairInscricoesMunicipaisDocumento(
    texto
) {
    const conteudo =
        normalizarRazaoSocialDocumental(
            texto
        );

    const encontrados =
        new Set();

    const padrao =
        /INSCRICAO MUNICIPAL(?: N| NO| NUMERO)?\s*([0-9][0-9 ]{2,24})/g;

    for (
        const correspondencia of
        conteudo.matchAll(
            padrao
        )
    ) {
        const numero =
            somenteDigitos(
                correspondencia?.[1]
            );

        if (
            numero.length >= 3 &&
            numero.length <= 20
        ) {
            encontrados.add(
                numero
            );
        }
    }

    return [
        ...encontrados,
    ];
}

function obterAliasesRazaoSocialEmpresa(
    empresa
) {
    const vinculos =
        empresa
            ?.cnpjsVinculados ||
        empresa
            ?.cnpjs_vinculados ||
        [];

    const brutos = [
        empresa?.nome,
        empresa?.razaoSocial,
        empresa?.razao_social,
    ];

    for (
        const vinculo of
        Array.isArray(
            vinculos
        )
            ? vinculos
            : []
    ) {
        brutos.push(
            vinculo
                ?.razaoSocialDocumental,
            vinculo
                ?.razao_social_documental
        );
    }

    const mapa =
        new Map();

    for (
        const bruto of
        brutos
    ) {
        const original =
            textoSeguro(
                bruto
            );

        const normalizado =
            normalizarRazaoSocialDocumental(
                original
            );

        const quantidadeTermos =
            normalizado
                .split(
                    " "
                )
                .filter(
                    Boolean
                )
                .length;

        /*
         * Evita aliases curtos/genéricos.
         * A correspondência continua sendo EXATA por frase.
         */
        if (
            normalizado.length < 7 ||
            quantidadeTermos < 2
        ) {
            continue;
        }

        if (
            !mapa.has(
                normalizado
            )
        ) {
            mapa.set(
                normalizado,
                {
                    original,
                    normalizado,
                }
            );
        }
    }

    return [
        ...mapa.values(),
    ];
}

function encontrarRazoesSociaisNoDocumento({
    textoExtraido,
    empresa,
}) {
    const documento =
        normalizarRazaoSocialDocumental(
            textoExtraido
        );

    if (!documento) {
        return [];
    }

    const documentoComLimites =
        " " +
        documento +
        " ";

    return obterAliasesRazaoSocialEmpresa(
        empresa
    ).filter(
        (alias) =>
            documentoComLimites
                .includes(
                    " " +
                    alias.normalizado +
                    " "
                )
    );
}

function criarCandidatoEmpresaDocumental({
    empresa,
    correspondentes = [],
    aliasesCorrespondentes = [],
}) {
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

    return {
        chave:
            textoSeguro(
                empresa?.id
            ) ||
            normalizarRazaoSocialDocumental(
                empresa?.nome
            ),

        empresa,

        correspondentes,

        aliasesCorrespondentes,

        cnpjsAceitos:
            aceitos,
    };
}


// SAFE_SCAN_ASO_EMPREGADOR_CONTEXTUAL_27H
function ultimaPosicaoMarcadoresAso(
    texto,
    marcadores = []
) {
    return (
        Array.isArray(
            marcadores
        )
            ? marcadores.reduce(
                (
                    maior,
                    marcador
                ) =>
                    Math.max(
                        maior,
                        texto.lastIndexOf(
                            marcador
                        )
                    ),
                -1
            )
            : -1
    );
}

function classificarCnpjsContextuaisAso({
    textoExtraido,
    cnpjsDocumento = [],
}) {
    const texto =
        String(
            textoExtraido ||
            ""
        );

    const alvos =
        new Set(
            (
                Array.isArray(
                    cnpjsDocumento
                )
                    ? cnpjsDocumento
                    : []
            )
                .map(
                    somenteDigitos
                )
                .filter(
                    (cnpj) =>
                        cnpj.length ===
                        14
                )
        );

    const empregador =
        new Set();

    const prestador =
        new Set();

    const incerto =
        new Set();

    if (
        !texto ||
        !alvos.size
    ) {
        return {
            cnpjsEmpregador: [],
            cnpjsPrestador: [],
            cnpjsIncertos: [],
        };
    }

    const marcadoresEmpregador = [
        "EMPRESA EMPREGADORA",
        "EMPREGADOR",
        "RAZAO SOCIAL",
        "CONTRATANTE",
        "CONTRATADA",
    ];

    const marcadoresPrestador = [
        "MEDICINA DO TRABALHO",
        "MEDICINA OCUPACIONAL",
        "CLINICA",
        "PRESTADOR",
        "LABORATORIO",
        "MEDICO EXAMINADOR",
        "MEDICO COORDENADOR",
        "RESPONSAVEL TECNICO",
    ];

    const padraoCnpj =
        /(?<!\d)(?:\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})(?!\d)/g;

    for (
        const correspondencia of
        texto.matchAll(
            padraoCnpj
        )
    ) {
        const cnpj =
            somenteDigitos(
                correspondencia?.[0]
            );

        if (
            !alvos.has(
                cnpj
            )
        ) {
            continue;
        }

        const indice =
            Number(
                correspondencia
                    ?.index ||
                0
            );

        /*
         * O papel do CNPJ é definido prioritariamente pelos rótulos
         * imediatamente ANTERIORES ao número. Isso impede que campos
         * de médico/CRM localizados depois do CNPJ do empregador
         * contaminem a classificação.
         */
        const antes =
            normalizarRazaoSocialDocumental(
                texto.slice(
                    Math.max(
                        0,
                        indice -
                            240
                    ),
                    indice
                )
            );

        const depois =
            normalizarRazaoSocialDocumental(
                texto.slice(
                    indice,
                    Math.min(
                        texto.length,
                        indice +
                            100
                    )
                )
            );

        const posEmpregador =
            ultimaPosicaoMarcadoresAso(
                antes,
                marcadoresEmpregador
            );

        const posPrestador =
            ultimaPosicaoMarcadoresAso(
                antes,
                marcadoresPrestador
            );

        if (
            posEmpregador >=
                0 ||
            posPrestador >=
                0
        ) {
            if (
                posEmpregador >
                posPrestador
            ) {
                empregador.add(
                    cnpj
                );
            }
            else {
                prestador.add(
                    cnpj
                );
            }

            continue;
        }

        const contextoCurto =
            (
                antes.slice(
                    -120
                ) +
                " " +
                depois.slice(
                    0,
                    100
                )
            );

        const prestadorProximo =
            marcadoresPrestador.some(
                (marcador) =>
                    contextoCurto.includes(
                        marcador
                    )
            );

        if (prestadorProximo) {
            prestador.add(
                cnpj
            );

            continue;
        }

        incerto.add(
            cnpj
        );
    }

    return {
        cnpjsEmpregador:
            [
                ...empregador,
            ],

        cnpjsPrestador:
            [
                ...prestador,
            ],

        cnpjsIncertos:
            [
                ...incerto,
            ],
    };
}


// ============================================================
// SAFE_SCAN_CERT2_CNPJ_BASE_RESOLVER_M4_C4_R3
//
// Reconhecimento de CNPJ Base/Raiz explicitamente declarado
// somente na camada Resolver do CERT2.
//
// Fail-closed:
// - somente CND Estadual / CND Municipal;
// - CNPJ completo continua soberano;
// - RAIZ/BASE precisa estar escrita no próprio documento;
// SAFE_SCAN_CERT2_CNPJ_BASE_UNICO_M4_C6_R1
// - razão social documental, quando encontrada, é evidência auxiliar;
// - empresa candidata deve ser única para a raiz;
// - todos os CNPJs aceitos devem pertencer à raiz;
// - nenhuma filial é fabricada.
// ============================================================

const TIPOS_CERTIDAO_LOCAL_CNPJ_BASE =
    new Set([
        "cnd-estadual",
        "cnd-municipal",
    ]);

function extrairCnpjBaseDocumentalCertidaoLocal({
    textoExtraido = "",
    tipoDocumento = "",
} = {}) {
    const tipo =
        textoSeguro(
            tipoDocumento
        )
            .toLowerCase()
            .trim();

    if (
        !TIPOS_CERTIDAO_LOCAL_CNPJ_BASE
            .has(
                tipo
            )
    ) {
        return "";
    }

    const conteudo =
        String(
            textoExtraido ||
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

    const padroes = [
        /(?:CPF\s*\/\s*)?CNPJ\s+(?:RAIZ|BASE)\s*[:\-]?\s*(\d{2}\s*[.]?\s*\d{3}\s*[.]?\s*\d{3})(?!\s*\/?\s*\d{4})/,
        /(?:CPF\s*\/\s*)?CNPJ\s*[:\-]?\s*(?:RAIZ|BASE)\s*[:\-]?\s*(\d{2}\s*[.]?\s*\d{3}\s*[.]?\s*\d{3})(?!\s*\/?\s*\d{4})/,
    ];

    for (
        const padrao of
        padroes
    ) {
        const correspondencia =
            conteudo.match(
                padrao
            );

        const base =
            somenteDigitos(
                correspondencia?.[1] ||
                ""
            );

        if (
            base.length ===
            8
        ) {
            return base;
        }
    }

    return "";
}

function identificarEmpresaDocumento({
    textoExtraido,
    empresas = [],
    tipoDocumento = "",
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

    const tipoDocumentoNormalizado =
        textoSeguro(
            tipoDocumento
        );

    const tipoAsoPcmso =
        tipoDocumentoNormalizado ===
        "aso-pcmso";

    const contextoCnpjAso =
        tipoAsoPcmso
            ? classificarCnpjsContextuaisAso({
                textoExtraido,
                cnpjsDocumento,
            })
            : {
                cnpjsEmpregador:
                    cnpjsDocumento,

                cnpjsPrestador: [],

                cnpjsIncertos: [],
            };

    /*
     * Para documentos comuns, a regra 27G permanece intacta:
     * CNPJ documental possui prioridade absoluta.
     *
     * Para ASO/PCMSO, somente CNPJ contextualizado como
     * EMPREGADOR pode assumir a empresa.
     */
    const cnpjsDocumentoParaEmpresa =
        tipoAsoPcmso
            ? contextoCnpjAso
                .cnpjsEmpregador
            : cnpjsDocumento;

    /*
     * ========================================================
     * CAMINHO 1 — CNPJ TEM PRIORIDADE ABSOLUTA
     * ========================================================
     *
     * Se existe CNPJ no PDF, NÃO usamos razão social para
     * substituir uma divergência ou ausência de correspondência.
     */
    if (
        cnpjsDocumentoParaEmpresa.length >
        0
    ) {
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
                empresas[indice] ||
                {};

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
                            cnpjsDocumentoParaEmpresa.includes(
                                vinculo.cnpj
                            )
                    );

            if (
                !correspondentes.length
            ) {
                continue;
            }

            candidatos.push(
                criarCandidatoEmpresaDocumental({
                    empresa,
                    correspondentes,
                })
            );
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

        if (
            empresasUnicas.length ===
            0
        ) {
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

                metodoIdentificacao:
                    "CNPJ_NAO_CORRESPONDENTE",

                razaoSocialCorrespondente:
                    "",

                inscricoesMunicipaisDocumento:
                    extrairInscricoesMunicipaisDocumento(
                        textoExtraido
                    ),

                evidencias: [
                    "CNPJ_DOCUMENTAL_PRESENTE",
                ],
            };
        }

        if (
            empresasUnicas.length >
            1
        ) {
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

                metodoIdentificacao:
                    "CNPJ_AMBIGUO",

                razaoSocialCorrespondente:
                    "",

                inscricoesMunicipaisDocumento:
                    extrairInscricoesMunicipaisDocumento(
                        textoExtraido
                    ),

                evidencias: [
                    "CNPJ_DOCUMENTAL_PRESENTE",
                    "CNPJ_AMBIGUO",
                ],
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

            metodoIdentificacao:
                "CNPJ_EXATO",

            razaoSocialCorrespondente:
                "",

            inscricoesMunicipaisDocumento:
                extrairInscricoesMunicipaisDocumento(
                    textoExtraido
                ),

            evidencias: [
                "CNPJ_EXATO",
            ],
        };
    }

    /*
     * ========================================================
     * CAMINHO 1B — CNPJ BASE/RAIZ + RAZÃO SOCIAL EXATA
     * ========================================================
     *
     * Este caminho somente existe entre:
     *
     * CNPJ completo
     *       ↓
     * CNPJ Base/Raiz explícito
     *       ↓
     * razão social sem CNPJ
     *
     * A raiz sozinha NÃO autoriza associação.
     */
    const cnpjBaseDocumento =
        cnpjsDocumentoParaEmpresa.length ===
            0
            ? extrairCnpjBaseDocumentalCertidaoLocal({
                textoExtraido,

                tipoDocumento:
                    tipoDocumentoNormalizado,
            })
            : "";

    if (
        cnpjBaseDocumento
    ) {
        const candidatosBase =
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
                empresas[indice] ||
                {};

            const vinculos =
                empresa
                    ?.cnpjsVinculados ||
                empresa
                    ?.cnpjs_vinculados ||
                [];

            const cnpjsAceitosEmpresa =
                obterCnpjsAceitosEmpresa({
                    empresa,
                    vinculos,
                })
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
                            vinculo.cnpj.length ===
                            14
                    );

            if (
                cnpjsAceitosEmpresa.length ===
                0
            ) {
                continue;
            }

            const todosAceitosCompartilhamBase =
                cnpjsAceitosEmpresa.every(
                    (vinculo) =>
                        vinculo.cnpj.slice(
                            0,
                            8
                        ) ===
                        cnpjBaseDocumento
                );

            if (
                !todosAceitosCompartilhamBase
            ) {
                continue;
            }

            /*
             * A raiz documental explícita passa a ser a
             * evidência empresarial primária.
             *
             * A razão social continua sendo coletada somente
             * como evidência auxiliar, quando estiver presente.
             */
            const aliasesCorrespondentes =
                encontrarRazoesSociaisNoDocumento({
                    textoExtraido,
                    empresa,
                });

            /*
             * correspondentes permanece vazio.
             *
             * Os CNPJs cadastrados foram usados apenas para
             * validar a raiz empresarial.
             *
             * Não serão declarados como CNPJ encontrado no PDF.
             */
            candidatosBase.push(
                criarCandidatoEmpresaDocumental({
                    empresa,
                    aliasesCorrespondentes,
                })
            );
        }

        const mapaBase =
            new Map();

        for (
            const candidato of
            candidatosBase
        ) {
            if (
                !mapaBase.has(
                    candidato.chave
                )
            ) {
                mapaBase.set(
                    candidato.chave,
                    candidato
                );
            }
        }

        const empresasPorBase =
            Array.from(
                mapaBase.values()
            );

        const inscricoesMunicipaisDocumento =
            extrairInscricoesMunicipaisDocumento(
                textoExtraido
            );

        if (
            empresasPorBase.length ===
            0
        ) {
            return {
                status:
                    "NAO_ENCONTRADA",

                empresa:
                    null,

                cnpjCorrespondente:
                    "",

                cnpjsDocumento:
                    [],

                candidatos:
                    [],

                metodoIdentificacao:
                    "CNPJ_BASE_NAO_CONFIRMADA",

                razaoSocialCorrespondente:
                    "",

                inscricoesMunicipaisDocumento,

                evidencias: [
                    "CNPJ_BASE_DOCUMENTAL_PRESENTE",
                    "CNPJ_BASE_SEM_CORRESPONDENCIA_SEGURA",
                ],
            };
        }

        if (
            empresasPorBase.length >
            1
        ) {
            return {
                status:
                    "AMBIGUA",

                empresa:
                    null,

                cnpjCorrespondente:
                    "",

                cnpjsDocumento:
                    [],

                candidatos:
                    empresasPorBase.map(
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

                            /*
                             * Não apresentar filiais cadastradas
                             * como se constassem do PDF.
                             */
                            cnpjs: [],

                            razoesSociais:
                                item
                                    .aliasesCorrespondentes
                                    .map(
                                        (alias) =>
                                            alias.original
                                    ),
                        })
                    ),

                metodoIdentificacao:
                    "CNPJ_BASE_AMBIGUA",

                razaoSocialCorrespondente:
                    "",

                inscricoesMunicipaisDocumento,

                evidencias: [
                    "CNPJ_BASE_DOCUMENTAL_PRESENTE",
                    "CNPJ_BASE_AMBIGUA",
                ],
            };
        }

        const unicoBase =
            empresasPorBase[0];

        const melhorAlias =
            unicoBase
                .aliasesCorrespondentes[0] ||
            null;

        return {
            status:
                "IDENTIFICADA",

            empresa:
                unicoBase.empresa,

            /*
             * PDF apresentou somente a raiz.
             *
             * Nunca preencher com /0001, /0007 etc.
             */
            cnpjCorrespondente:
                "",

            cnpjsDocumento:
                [],

            candidatos: [
                {
                    empresaId:
                        textoSeguro(
                            unicoBase
                                ?.empresa
                                ?.id
                        ),

                    empresaNome:
                        textoSeguro(
                            unicoBase
                                ?.empresa
                                ?.nome
                        ),

                    cnpjs:
                        [],

                    razoesSociais:
                        unicoBase
                            .aliasesCorrespondentes
                            .map(
                                (alias) =>
                                    alias.original
                            ),
                },
            ],

            metodoIdentificacao:
                "CNPJ_BASE_EMPRESA_UNICA",

            razaoSocialCorrespondente:
                melhorAlias
                    ?.original ||
                "",

            inscricoesMunicipaisDocumento,

            evidencias: [
                "CNPJ_BASE_DOCUMENTAL_PRESENTE",
                "CNPJ_BASE_EXATA",

                ...(
                    melhorAlias
                        ? ["RAZAO_SOCIAL_EXATA"]
                        : []
                ),
            ],
        };
    }

    /*
     * ========================================================
     * CAMINHO 2 — PDF NÃO POSSUI CNPJ
     * ========================================================
     *
     * Fallback somente por razão social normalizada,
     * como frase documental completa.
     *
     * Não existe fuzzy matching.
     * Não existe nome de arquivo.
     * Não existe escolha por "empresa selecionada".
     */
    const candidatosRazaoSocial =
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
            empresas[indice] ||
            {};

        const aliasesCorrespondentes =
            encontrarRazoesSociaisNoDocumento({
                textoExtraido,
                empresa,
            });

        if (
            !aliasesCorrespondentes.length
        ) {
            continue;
        }

        candidatosRazaoSocial.push(
            criarCandidatoEmpresaDocumental({
                empresa,
                aliasesCorrespondentes,
            })
        );
    }

    const mapaRazaoSocial =
        new Map();

    for (
        const candidato of
        candidatosRazaoSocial
    ) {
        if (
            !mapaRazaoSocial.has(
                candidato.chave
            )
        ) {
            mapaRazaoSocial.set(
                candidato.chave,
                candidato
            );
        }
    }

    const empresasPorRazaoSocial =
        Array.from(
            mapaRazaoSocial.values()
        );

    const inscricoesMunicipaisDocumento =
        extrairInscricoesMunicipaisDocumento(
            textoExtraido
        );

    if (
        empresasPorRazaoSocial.length ===
        0
    ) {
        return {
            status:
                "SEM_CNPJ",

            empresa:
                null,

            cnpjCorrespondente:
                "",

            cnpjsDocumento: [],

            candidatos: [],

            metodoIdentificacao:
                "SEM_CNPJ_SEM_RAZAO_SOCIAL_UNICA",

            razaoSocialCorrespondente:
                "",

            inscricoesMunicipaisDocumento,

            evidencias: [
                "SEM_CNPJ_DOCUMENTAL",
                ...(
                    inscricoesMunicipaisDocumento
                        .length
                        ? [
                            "INSCRICAO_MUNICIPAL_PRESENTE",
                        ]
                        : []
                ),
            ],
        };
    }

    if (
        empresasPorRazaoSocial.length >
        1
    ) {
        return {
            status:
                "AMBIGUA",

            empresa:
                null,

            cnpjCorrespondente:
                "",

            cnpjsDocumento: [],

            candidatos:
                empresasPorRazaoSocial
                    .map(
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
                                    .cnpjsAceitos
                                    .map(
                                        (vinculo) =>
                                            vinculo
                                                ?.cnpjFormatado ||
                                            formatarCnpj(
                                                vinculo?.cnpj
                                            )
                                    ),

                            razoesSociais:
                                item
                                    .aliasesCorrespondentes
                                    .map(
                                        (alias) =>
                                            alias.original
                                    ),
                        })
                    ),

            metodoIdentificacao:
                "RAZAO_SOCIAL_AMBIGUA",

            razaoSocialCorrespondente:
                "",

            inscricoesMunicipaisDocumento,

            evidencias: [
                "SEM_CNPJ_DOCUMENTAL",
                "RAZAO_SOCIAL_AMBIGUA",
                ...(
                    inscricoesMunicipaisDocumento
                        .length
                        ? [
                            "INSCRICAO_MUNICIPAL_PRESENTE",
                        ]
                        : []
                ),
            ],
        };
    }

    const unico =
        empresasPorRazaoSocial[0];

    const melhorAlias =
        [
            ...unico
                .aliasesCorrespondentes,
        ]
            .sort(
                (a, b) =>
                    b
                        .normalizado
                        .length -
                    a
                        .normalizado
                        .length
            )[0] ||
        null;

    return {
        status:
            "IDENTIFICADA",

        empresa:
            unico.empresa,

        /*
         * Intencionalmente vazio.
         *
         * O CNPJ cadastral da empresa NÃO é apresentado como
         * se tivesse sido encontrado dentro do PDF.
         */
        cnpjCorrespondente:
            "",

        cnpjsDocumento: [],

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
                        .cnpjsAceitos
                        .map(
                            (vinculo) =>
                                vinculo
                                    ?.cnpjFormatado ||
                                formatarCnpj(
                                    vinculo?.cnpj
                                )
                        ),

                razoesSociais:
                    unico
                        .aliasesCorrespondentes
                        .map(
                            (alias) =>
                                alias.original
                        ),
            },
        ],

        metodoIdentificacao:
            (
                tipoAsoPcmso &&
                cnpjsDocumento.length >
                    0 &&
                cnpjsDocumentoParaEmpresa.length ===
                    0
            )
                ? "RAZAO_SOCIAL_EXATA_ASO_CNPJ_NAO_EMPREGADOR_IGNORADO"
                : "RAZAO_SOCIAL_EXATA",

        razaoSocialCorrespondente:
            melhorAlias
                ?.original ||
            "",

        inscricoesMunicipaisDocumento,

        evidencias: [
            "SEM_CNPJ_DOCUMENTAL",
            "RAZAO_SOCIAL_EXATA",
            ...(
                inscricoesMunicipaisDocumento
                    .length
                    ? [
                        "INSCRICAO_MUNICIPAL_PRESENTE",
                    ]
                    : []
            ),
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


// SAFE_SCAN_CERT2_M4_F7_D_CONTRATO_SEMANTICO_UNIVERSAL_V1
//
// Contrato semântico universal V1.
//
// Esta camada é exclusivamente informativa nesta etapa.
// Nenhum campo abaixo participa de status, política, destino,
// persistência ou redução de revisão/bloqueio.
//
// Fail-closed:
// - somente classifica sujeito quando há evidência forte;
// - nome de arquivo nunca participa;
// - ausência de evidência => INDETERMINADO;
// - menção isolada a termos imobiliários não supera CNPJ
//   empresarial documental.
const TIPOS_EMPRESARIAIS_SEMANTICA_V1 =
    new Set([
        "cnd-federal",
        "cnd-estadual",
        "cnd-municipal",
        "crf-fgts",
        "fgts",
        "fgts-digital-gfd",
        "cndt",
        "inss",
        "inss-dctfweb",
        "dctfweb",
        "iss",
        "issqn",
        "tributo-municipal-generico",
        "darf-federal-generico",
    ]);

function normalizarTextoSemanticoUniversal(
    valor = ""
) {
    return String(
        valor || ""
    )
        .normalize("NFD")
        .replace(
            /[̀-ͯ]/g,
            ""
        )
        .toUpperCase()
        .replace(
            /s+/g,
            " "
        )
        .trim();
}

function classificarSujeitoSemanticoUniversal({
    classificacao,
    identificacaoEmpresa,
    textoExtraido,
}) {
    const tipoDocumento =
        textoSeguro(
            classificacao
                ?.tipoCatalogo ||
            classificacao
                ?.id ||
            ""
        );

    const tipoClassificador =
        textoSeguro(
            classificacao
                ?.tipoClassificador ||
            classificacao
                ?.id ||
            ""
        );

    const tipos =
        [
            tipoDocumento,
            tipoClassificador,
        ]
            .map(
                (item) =>
                    String(
                        item || ""
                    )
                        .trim()
                        .toLowerCase()
            )
            .filter(
                Boolean
            );

    const cnpjsDocumento =
        Array.isArray(
            identificacaoEmpresa
                ?.cnpjsDocumento
        )
            ? identificacaoEmpresa
                .cnpjsDocumento
                .map(
                    (item) =>
                        textoSeguro(
                            item
                        )
                )
                .filter(
                    Boolean
                )
            : [];

    const conteudo =
        normalizarTextoSemanticoUniversal(
            textoExtraido
        );

    const assinaturaImovelForte =
        (
            conteudo.includes(
                "CERTIDAO CONJUNTA DE DEBITOS DE TRIBUTOS IMOBILIARIOS"
            )
        ) ||
        (
            conteudo.includes(
                "TRIBUTOS IMOBILIARIOS"
            ) &&
            conteudo.includes(
                "NUMERO DO CONTRIBUINTE"
            ) &&
            (
                conteudo.includes(
                    "ENDERECO DO IMOVEL"
                ) ||
                conteudo.includes(
                    "IMOVEL"
                )
            )
        );

    const familiaEmpresarial =
        tipos.some(
            (tipo) =>
                TIPOS_EMPRESARIAIS_SEMANTICA_V1
                    .has(
                        tipo
                    )
        );

    /*
     * IMÓVEL somente quando:
     * - não existe CNPJ documental; e
     * - existe assinatura imobiliária forte.
     *
     * Uma certidão empresarial que também menciona tributos
     * imobiliários continua empresarial quando há CNPJ.
     */
    if (
        cnpjsDocumento.length ===
            0 &&
        assinaturaImovelForte
    ) {
        return {
            tipo:
                "IMOVEL",

            evidenciaForte:
                true,

            evidencias: [
                "ASSINATURA_IMOBILIARIA_FORTE",
                "SEM_CNPJ_DOCUMENTAL",
            ],
        };
    }

    /*
     * EMPRESA somente em família empresarial reconhecida e
     * com identidade empresarial documental objetiva.
     */
    if (
        familiaEmpresarial &&
        (
            cnpjsDocumento.length >
                0 ||
            identificacaoEmpresa
                ?.status ===
                "IDENTIFICADA"
        )
    ) {
        return {
            tipo:
                "EMPRESA",

            evidenciaForte:
                true,

            evidencias:
                cnpjsDocumento.length >
                    0
                    ? [
                        "CNPJ_DOCUMENTAL_PRESENTE",
                    ]
                    : [
                        "EMPRESA_DOCUMENTAL_IDENTIFICADA",
                    ],
        };
    }

    return {
        tipo:
            "INDETERMINADO",

        evidenciaForte:
            false,

        evidencias: [],
    };
}

function montarAnaliseSemanticaUniversal({
    classificacao,
    identificacaoEmpresa,
    textoExtraido,
}) {
    const sujeito =
        classificarSujeitoSemanticoUniversal({
            classificacao,
            identificacaoEmpresa,
            textoExtraido,
        });

    return {
        versao:
            "CERT2_SEMANTICA_V1",

        documento: {
            familia:
                textoSeguro(
                    classificacao
                        ?.tipoCatalogo ||
                    classificacao
                        ?.id
                ),

            subtipo:
                textoSeguro(
                    classificacao
                        ?.tipoClassificador ||
                    classificacao
                        ?.id
                ),

            titulo:
                textoSeguro(
                    classificacao
                        ?.titulo
                ),

            complementar:
                classificacao
                    ?.complementar ===
                true,

            papelMatriz:
                classificacao
                    ?.complementar ===
                true
                    ? "COMPLEMENTAR"
                    : "INDETERMINADO",
        },

        sujeito: {
            tipo:
                sujeito.tipo,

            evidenciaForte:
                sujeito
                    .evidenciaForte ===
                true,

            evidencias:
                [...sujeito.evidencias],
        },

        identidadeEmpresarial: {
            status:
                textoSeguro(
                    identificacaoEmpresa
                        ?.status
                ),

            empresaId:
                textoSeguro(
                    identificacaoEmpresa
                        ?.empresa
                        ?.id
                ),

            empresaNome:
                textoSeguro(
                    identificacaoEmpresa
                        ?.empresa
                        ?.nome
                ),

            cnpjCorrespondente:
                textoSeguro(
                    identificacaoEmpresa
                        ?.cnpjCorrespondente
                ),

            cnpjsDocumento:
                Array.isArray(
                    identificacaoEmpresa
                        ?.cnpjsDocumento
                )
                    ? [
                        ...identificacaoEmpresa
                            .cnpjsDocumento,
                    ]
                    : [],

            razaoSocialCorrespondente:
                textoSeguro(
                    identificacaoEmpresa
                        ?.razaoSocialCorrespondente
                ),

            inscricoesMunicipaisDocumento:
                Array.isArray(
                    identificacaoEmpresa
                        ?.inscricoesMunicipaisDocumento
                )
                    ? [
                        ...identificacaoEmpresa
                            .inscricoesMunicipaisDocumento,
                    ]
                    : [],

            metodoIdentificacao:
                textoSeguro(
                    identificacaoEmpresa
                        ?.metodoIdentificacao
                ),
        },

        /*
         * Temporalidade continuará informativa nesta V1.
         * Será enriquecida em microetapa própria.
         */
        temporalidade: {
            tipo:
                "SEM_REFERENCIA",

            competenciaDocumental:
                "",

            dataEmissao:
                "",

            validadeInicio:
                "",

            validadeFim:
                "",

            periodoInicio:
                "",

            periodoFim:
                "",

            competenciaArmazenamento:
                "",
        },

        leitura: {
            origemClassificacao:
                textoSeguro(
                    classificacao
                        ?.origem
                ),
        },

        evidencias: {
            classificacao:
                Array.isArray(
                    classificacao
                        ?.evidencias
                )
                    ? [
                        ...classificacao
                            .evidencias,
                    ]
                    : [],

            empresa:
                Array.isArray(
                    identificacaoEmpresa
                        ?.evidencias
                )
                    ? [
                        ...identificacaoEmpresa
                            .evidencias,
                    ]
                    : [],

            sujeito:
                [...sujeito.evidencias],
        },

        confianca:
            Number(
                classificacao
                    ?.confianca ||
                0
            ),
    };
}

// SAFE_SCAN_CERT2_M4_F7_E1_TEMPORALIDADE_UNIVERSAL_V1
//
// Temporalidade semântica universal V1.
//
// Esta camada somente organiza evidências temporais que já foram
// aceitas pelo pipeline existente.
//
// Não extrai datas novas.
// Não consulta nome de arquivo.
// Não usa competência da interface.
// Não altera destino, status, motivo, política ou persistência.
//
// Distinções obrigatórias:
// - competência documental;
// - emissão;
// - validade/vigência;
// - período;
// - competência técnica de armazenamento.
//
// Fail-closed:
// campos sem fonte documental validada permanecem vazios.
function primeiroTextoTemporalSemantico(
    ...valores
) {
    for (
        const valor of valores
    ) {
        const normalizado =
            textoSeguro(
                valor
            );

        if (normalizado) {
            return normalizado;
        }
    }

    return "";
}

function enriquecerTemporalidadeSemanticaUniversal({
    analiseSemantica,
    politica,
    destino,
    avaliacao,
    tipoDocumento,
}) {
    const semantica =
        analiseSemantica &&
        typeof analiseSemantica ===
            "object"
            ? analiseSemantica
            : {};

    const temporalidadeAtual =
        semantica.temporalidade &&
        typeof semantica.temporalidade ===
            "object"
            ? semantica.temporalidade
            : {};

    const competenciaArmazenamento =
        textoSeguro(
            destino
                ?.competenciaIso
        );

    if (
        politica ===
        CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
            .COMPETENCIA_MENSAL
    ) {
        return {
            ...semantica,

            temporalidade: {
                ...temporalidadeAtual,

                tipo:
                    "COMPETENCIA",

                competenciaDocumental:
                    textoSeguro(
                        destino
                            ?.competenciaDocumento
                    ),

                dataEmissao:
                    "",

                validadeInicio:
                    "",

                validadeFim:
                    "",

                periodoInicio:
                    "",

                periodoFim:
                    "",

                competenciaArmazenamento,
            },
        };
    }

    if (
        politica ===
        CERTIDAO_MENSAL_POLITICA_DOCUMENTAL
            .VALIDADE
    ) {
        const dadosTemporais =
            avaliacao
                ?.dadosTemporais &&
            typeof avaliacao
                .dadosTemporais ===
                "object"
                ? avaliacao
                    .dadosTemporais
                : {};

        const dadosSeguroVida =
            avaliacao
                ?.dadosSeguroVida &&
            typeof avaliacao
                .dadosSeguroVida ===
                "object"
                ? avaliacao
                    .dadosSeguroVida
                : {};

        const dadosCrf =
            avaliacao
                ?.dadosCrf &&
            typeof avaliacao
                .dadosCrf ===
                "object"
                ? avaliacao
                    .dadosCrf
                : {};

        const dadosCndt =
            avaliacao
                ?.dadosCndt &&
            typeof avaliacao
                .dadosCndt ===
                "object"
                ? avaliacao
                    .dadosCndt
                : {};

        /*
         * Emissão não é automaticamente validade inicial.
         *
         * Somente preservamos como validadeInicio uma data que
         * já possua semântica explícita de início de validade
         * ou vigência.
         */
        const dataEmissao =
            primeiroTextoTemporalSemantico(
                dadosTemporais
                    .dataEmissaoIso,

                dadosCrf
                    .dataEmissaoIso,

                dadosCndt
                    .dataEmissaoIso
            );

        const validadeInicio =
            primeiroTextoTemporalSemantico(
                destino
                    ?.cobertura
                    ?.inicioIso,

                dadosSeguroVida
                    .vigenciaInicioIso,

                dadosCrf
                    .dataInicioIso
            );

        const validadeFim =
            primeiroTextoTemporalSemantico(
                destino
                    ?.cobertura
                    ?.fimIso,

                dadosTemporais
                    .dataValidadeIso,

                dadosSeguroVida
                    .vigenciaFimIso,

                dadosCrf
                    .dataFimIso,

                dadosCrf
                    .dataValidadeIso,

                dadosCndt
                    .dataValidadeIso
            );

        return {
            ...semantica,

            temporalidade: {
                ...temporalidadeAtual,

                tipo:
                    "VALIDADE",

                competenciaDocumental:
                    "",

                dataEmissao,

                validadeInicio,

                validadeFim,

                /*
                 * Nenhuma família atual fornece um contrato
                 * transversal seguro de período.
                 */
                periodoInicio:
                    "",

                periodoFim:
                    "",

                competenciaArmazenamento,
            },
        };
    }

    return {
        ...semantica,

        temporalidade: {
            ...temporalidadeAtual,

            tipo:
                "SEM_REFERENCIA",

            competenciaDocumental:
                "",

            dataEmissao:
                "",

            validadeInicio:
                "",

            validadeFim:
                "",

            periodoInicio:
                "",

            periodoFim:
                "",

            competenciaArmazenamento:
                "",
        },
    };
}

function montarResultadoBase({
    classificacao,
    identificacaoEmpresa,
    textoExtraido = "",
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

            metodoIdentificacao:
                identificacaoEmpresa
                    ?.metodoIdentificacao ||
                "",

            razaoSocialCorrespondente:
                identificacaoEmpresa
                    ?.razaoSocialCorrespondente ||
                "",

            inscricoesMunicipaisDocumento:
                identificacaoEmpresa
                    ?.inscricoesMunicipaisDocumento ||
                [],

            evidencias:
                identificacaoEmpresa
                    ?.evidencias ||
                [],
        },

        analiseSemantica:
            montarAnaliseSemanticaUniversal({
                classificacao,
                identificacaoEmpresa,
                textoExtraido,
            }),

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

            tipoDocumento:
                classificacao
                    ?.tipoCatalogo ||
                classificacao
                    ?.id ||
                "",
        });

    const base =
        montarResultadoBase({
            classificacao,
            identificacaoEmpresa,
            textoExtraido,
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
                "O PDF não apresentou CNPJ confirmável e nenhuma razão social documental única correspondeu às empresas cadastradas."
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
                identificacaoEmpresa
                    ?.metodoIdentificacao ===
                    "RAZAO_SOCIAL_AMBIGUA"
                    ? "A razão social localizada no PDF corresponde a mais de uma empresa candidata; é necessária revisão humana."
                    : "O documento possui CNPJ associado a mais de uma empresa candidata."
            );
        }
        else {
            adicionarMotivo(
                motivos,
                "EMPRESA_NAO_IDENTIFICADA",
                "O identificador empresarial localizado no documento não corresponde às empresas candidatas."
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

    base.analiseSemantica =
        enriquecerTemporalidadeSemanticaUniversal({
            analiseSemantica:
                base.analiseSemantica,

            politica,

            destino,

            avaliacao,

            tipoDocumento,
        });

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