export const CERTIDAO_MENSAL_AUDITORIA_STORAGE_BUCKET =
    "certidao-mensal-documentos";

export const ESTADOS_AUDITORIA_STORAGE =
    Object.freeze({
        EXISTE:
            "EXISTE",

        AUSENTE_CONFIRMADO:
            "AUSENTE_CONFIRMADO",

        INDETERMINADO:
            "INDETERMINADO",
    });

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const COMPETENCIA_PASTA_REGEX =
    /^\d{4}-(0[1-9]|1[0-2])$/;

function textoSeguro(
    valor
) {
    return String(
        valor ??
        ""
    ).trim();
}

function normalizarUuid(
    valor
) {
    const texto =
        textoSeguro(
            valor
        ).toLowerCase();

    return UUID_REGEX.test(
        texto
    )
        ? texto
        : "";
}

function normalizarInteiroNaoNegativo(
    valor
) {
    if (
        valor ===
            null ||
        valor ===
            undefined ||
        valor ===
            ""
    ) {
        return null;
    }

    const numero =
        Number(
            valor
        );

    if (
        !Number.isFinite(
            numero
        ) ||
        numero < 0
    ) {
        return null;
    }

    return Math.trunc(
        numero
    );
}

function normalizarStatusHttp(
    erro
) {
    const candidatos = [
        erro?.status,
        erro?.statusCode,
        erro?.httpStatusCode,
    ];

    for (
        const candidato of
        candidatos
    ) {
        const numero =
            Number(
                candidato
            );

        if (
            Number.isInteger(
                numero
            ) &&
            numero >= 100 &&
            numero <= 599
        ) {
            return numero;
        }
    }

    return null;
}

function normalizarErroStorage(
    erro
) {
    if (!erro) {
        return null;
    }

    return {
        statusHttp:
            normalizarStatusHttp(
                erro
            ),

        codigo:
            textoSeguro(
                erro?.code ||
                erro?.error ||
                erro?.name
            )
                .toUpperCase(),

        mensagem:
            textoSeguro(
                erro?.message
            ),
    };
}

function erroSugereAusencia(
    erroNormalizado
) {
    if (!erroNormalizado) {
        return false;
    }

    if (
        erroNormalizado
            .statusHttp ===
        404
    ) {
        return true;
    }

    return [
        "NOSUCHKEY",
        "NOT_FOUND",
        "NOTFOUND",
    ].includes(
        erroNormalizado
            .codigo
    );
}

function decomporCaminhoStorage(
    caminhoStorage
) {
    const caminho =
        textoSeguro(
            caminhoStorage
        );

    if (
        !caminho ||
        caminho.startsWith(
            "/"
        ) ||
        caminho.endsWith(
            "/"
        ) ||
        caminho.includes(
            "\\"
        ) ||
        caminho.includes(
            "//"
        ) ||
        caminho.includes(
            ".."
        )
    ) {
        return {
            valido:
                false,

            caminhoStorage:
                caminho,

            empresaId:
                "",

            competenciaPasta:
                "",
        };
    }

    const partes =
        caminho.split(
            "/"
        );

    if (
        partes.length !==
        4
    ) {
        return {
            valido:
                false,

            caminhoStorage:
                caminho,

            empresaId:
                "",

            competenciaPasta:
                "",
        };
    }

    const empresaId =
        normalizarUuid(
            partes[0]
        );

    const competenciaPasta =
        textoSeguro(
            partes[1]
        );

    if (
        !empresaId ||
        !COMPETENCIA_PASTA_REGEX.test(
            competenciaPasta
        ) ||
        partes.some(
            (parte) =>
                !textoSeguro(
                    parte
                )
        )
    ) {
        return {
            valido:
                false,

            caminhoStorage:
                caminho,

            empresaId,
            competenciaPasta,
        };
    }

    return {
        valido:
            true,

        caminhoStorage:
            caminho,

        empresaId,
        competenciaPasta,
    };
}

function normalizarProvaAcessoEmpresa({
    provaAcessoEmpresa,
    empresaIdCaminho,
} = {}) {
    const empresaIdProva =
        normalizarUuid(
            provaAcessoEmpresa
                ?.empresaId
        );

    const confirmado =
        provaAcessoEmpresa
            ?.confirmado ===
            true &&
        Boolean(
            empresaIdCaminho
        ) &&
        empresaIdProva ===
            empresaIdCaminho;

    return {
        confirmado,

        empresaId:
            empresaIdProva,

        fonte:
            textoSeguro(
                provaAcessoEmpresa
                    ?.fonte
            ),
    };
}

function criarResultadoBase({
    bucketId,
    caminho,
    provaAcesso,
} = {}) {
    return {
        estadoStorage:
            ESTADOS_AUDITORIA_STORAGE
                .INDETERMINADO,

        codigo:
            "STORAGE_AUDITORIA_INDETERMINADA",

        motivo:
            "",

        bucketId:
            textoSeguro(
                bucketId
            ),

        caminhoStorage:
            caminho
                ?.caminhoStorage ||
            "",

        empresaIdCaminho:
            caminho
                ?.empresaId ||
            "",

        competenciaPasta:
            caminho
                ?.competenciaPasta ||
            "",

        acessoEmpresaComprovado:
            provaAcesso
                ?.confirmado ===
            true,

        provaAcessoEmpresa: {
            confirmado:
                provaAcesso
                    ?.confirmado ===
                true,

            empresaId:
                provaAcesso
                    ?.empresaId ||
                "",

            fonte:
                provaAcesso
                    ?.fonte ||
                "",
        },

        infoConsultado:
            false,

        existsConsultado:
            false,

        existe:
            null,

        tamanhoBytes:
            null,

        tamanhoEsperadoBytes:
            null,

        tamanhoConfere:
            null,

        contentType:
            "",

        lastModified:
            "",

        erroInfo:
            null,

        erroExists:
            null,
    };
}

export async function consultarEstadoStorageCertidaoMensal({
    storageScope = null,

    bucketId =
        CERTIDAO_MENSAL_AUDITORIA_STORAGE_BUCKET,

    caminhoStorage = "",

    provaAcessoEmpresa = null,

    tamanhoBytesEsperado = null,
} = {}) {
    const bucket =
        textoSeguro(
            bucketId
        );

    const caminho =
        decomporCaminhoStorage(
            caminhoStorage
        );

    const provaAcesso =
        normalizarProvaAcessoEmpresa({
            provaAcessoEmpresa,
            empresaIdCaminho:
                caminho.empresaId,
        });

    const resultadoBase =
        criarResultadoBase({
            bucketId:
                bucket,

            caminho,
            provaAcesso,
        });

    resultadoBase
        .tamanhoEsperadoBytes =
        normalizarInteiroNaoNegativo(
            tamanhoBytesEsperado
        );

    if (
        bucket !==
            CERTIDAO_MENSAL_AUDITORIA_STORAGE_BUCKET ||
        !caminho.valido
    ) {
        return {
            ...resultadoBase,

            codigo:
                "STORAGE_AUDITORIA_ENTRADA_INVALIDA",

            motivo:
                "BUCKET_OU_CAMINHO_INVALIDO",
        };
    }

    if (
        !storageScope ||
        typeof storageScope
            .info !==
            "function"
    ) {
        return {
            ...resultadoBase,

            codigo:
                "STORAGE_AUDITORIA_DEPENDENCIA_INVALIDA",

            motivo:
                "INFO_INDISPONIVEL",
        };
    }

    let respostaInfo;

    try {
        respostaInfo =
            await storageScope.info(
                caminho.caminhoStorage
            );
    }
    catch (error) {
        return {
            ...resultadoBase,

            infoConsultado:
                true,

            codigo:
                "STORAGE_INFO_THROW",

            motivo:
                "FALHA_INDETERMINADA_INFO",

            erroInfo:
                normalizarErroStorage(
                    error
                ),
        };
    }

    const erroInfo =
        normalizarErroStorage(
            respostaInfo?.error
        );

    if (
        !respostaInfo?.error &&
        respostaInfo?.data
    ) {
        const tamanhoBytes =
            normalizarInteiroNaoNegativo(
                respostaInfo
                    .data
                    ?.size
            );

        const tamanhoEsperado =
            resultadoBase
                .tamanhoEsperadoBytes;

        const tamanhoConfere =
            tamanhoEsperado ===
                null ||
            tamanhoBytes ===
                null
                ? null
                : tamanhoBytes ===
                    tamanhoEsperado;

        return {
            ...resultadoBase,

            estadoStorage:
                ESTADOS_AUDITORIA_STORAGE
                    .EXISTE,

            codigo:
                tamanhoConfere ===
                    false
                    ? "STORAGE_OBJETO_EXISTE_TAMANHO_DIVERGENTE"
                    : "STORAGE_OBJETO_EXISTE",

            motivo:
                "INFO_CONFIRMOU_OBJETO",

            infoConsultado:
                true,

            existe:
                true,

            tamanhoBytes,

            tamanhoConfere,

            contentType:
                textoSeguro(
                    respostaInfo
                        .data
                        ?.contentType
                ),

            lastModified:
                textoSeguro(
                    respostaInfo
                        .data
                        ?.lastModified
                ),

            erroInfo:
                null,
        };
    }

    if (
        !erroInfo
    ) {
        return {
            ...resultadoBase,

            infoConsultado:
                true,

            codigo:
                "STORAGE_INFO_RESPOSTA_INVALIDA",

            motivo:
                "INFO_SEM_DATA_E_SEM_ERRO",
        };
    }

    if (
        !erroSugereAusencia(
            erroInfo
        )
    ) {
        return {
            ...resultadoBase,

            infoConsultado:
                true,

            codigo:
                "STORAGE_INFO_FALHA_INDETERMINADA",

            motivo:
                "INFO_NAO_PROVA_AUSENCIA",

            erroInfo,
        };
    }

    if (
        typeof storageScope
            .exists !==
            "function"
    ) {
        return {
            ...resultadoBase,

            infoConsultado:
                true,

            codigo:
                "STORAGE_EXISTS_INDISPONIVEL",

            motivo:
                "INFO_SUGERIU_AUSENCIA_SEM_CORROBORACAO",

            erroInfo,
        };
    }

    let respostaExists;

    try {
        respostaExists =
            await storageScope.exists(
                caminho.caminhoStorage
            );
    }
    catch (error) {
        return {
            ...resultadoBase,

            infoConsultado:
                true,

            existsConsultado:
                true,

            codigo:
                "STORAGE_EXISTS_THROW",

            motivo:
                "CORROBORACAO_EXISTS_INDETERMINADA",

            erroInfo,

            erroExists:
                normalizarErroStorage(
                    error
                ),
        };
    }

    const erroExists =
        normalizarErroStorage(
            respostaExists?.error
        );

    if (erroExists) {
        return {
            ...resultadoBase,

            infoConsultado:
                true,

            existsConsultado:
                true,

            codigo:
                "STORAGE_EXISTS_FALHA_INDETERMINADA",

            motivo:
                "CORROBORACAO_EXISTS_FALHOU",

            erroInfo,
            erroExists,
        };
    }

    if (
        respostaExists?.data ===
        true
    ) {
        return {
            ...resultadoBase,

            infoConsultado:
                true,

            existsConsultado:
                true,

            codigo:
                "STORAGE_INFO_EXISTS_DIVERGENTES",

            motivo:
                "INFO_SUGERIU_AUSENCIA_MAS_EXISTS_CONFIRMOU_EXISTENCIA",

            existe:
                true,

            erroInfo,
        };
    }

    if (
        respostaExists?.data !==
        false
    ) {
        return {
            ...resultadoBase,

            infoConsultado:
                true,

            existsConsultado:
                true,

            codigo:
                "STORAGE_EXISTS_RESPOSTA_INVALIDA",

            motivo:
                "EXISTS_NAO_RETORNOU_BOOLEANO",

            erroInfo,
        };
    }

    if (
        provaAcesso.confirmado !==
        true
    ) {
        return {
            ...resultadoBase,

            infoConsultado:
                true,

            existsConsultado:
                true,

            codigo:
                "STORAGE_AUSENCIA_NAO_CONFIRMADA",

            motivo:
                "SEM_PROVA_ATUAL_DE_ACESSO_A_EMPRESA",

            existe:
                false,

            erroInfo,
        };
    }

    return {
        ...resultadoBase,

        estadoStorage:
            ESTADOS_AUDITORIA_STORAGE
                .AUSENTE_CONFIRMADO,

        codigo:
            "STORAGE_OBJETO_AUSENTE_CONFIRMADO",

        motivo:
            "INFO_SUGERIU_AUSENCIA_EXISTS_FALSE_E_ACESSO_EMPRESA_CONFIRMADO",

        infoConsultado:
            true,

        existsConsultado:
            true,

        existe:
            false,

        erroInfo,
    };
}