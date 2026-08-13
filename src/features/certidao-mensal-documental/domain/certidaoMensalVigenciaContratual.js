import {
    formatarCompetenciaCertidaoMensal,
    normalizarCompetenciaCertidaoMensal,
} from "./certidaoMensalPersistenceContract.js";

export const CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS =
    Object.freeze({
        SEM_INICIO_CONTRATO:
            "SEM_INICIO_CONTRATO",
        VIGENCIA_INVALIDA:
            "VIGENCIA_INVALIDA",
        ANTES_DO_CONTRATO:
            "ANTES_DO_CONTRATO",
        DURANTE_DO_CONTRATO:
            "DURANTE_DO_CONTRATO",
        APOS_DO_CONTRATO:
            "APOS_DO_CONTRATO",
    });

const PADRAO_DATA_ISO =
    /^(\d{4})-(\d{2})-(\d{2})$/;

function textoSeguro(
    valor,
    limite = 200,
) {
    return String(
        valor ?? "",
    )
        .trim()
        .slice(
            0,
            limite,
        );
}

function obterCampoEmpresa(
    empresa,
    campoSnakeCase,
    campoCamelCase,
) {
    if (
        !empresa ||
        typeof empresa !== "object" ||
        Array.isArray(empresa)
    ) {
        return "";
    }

    return (
        empresa[campoSnakeCase] ??
        empresa[campoCamelCase] ??
        ""
    );
}

function normalizarDataContratoOpcional(
    valor,
    rotulo,
) {
    const texto =
        textoSeguro(
            valor,
            30,
        );

    if (!texto) {
        return "";
    }

    const correspondencia =
        PADRAO_DATA_ISO.exec(
            texto,
        );

    if (!correspondencia) {
        throw new Error(
            `${rotulo} deve usar o formato AAAA-MM-DD.`,
        );
    }

    const ano =
        Number(
            correspondencia[1],
        );

    const mes =
        Number(
            correspondencia[2],
        );

    const dia =
        Number(
            correspondencia[3],
        );

    const data =
        new Date(
            Date.UTC(
                ano,
                mes - 1,
                dia,
            ),
        );

    if (
        data.getUTCFullYear() !== ano ||
        data.getUTCMonth() + 1 !== mes ||
        data.getUTCDate() !== dia
    ) {
        throw new Error(
            `${rotulo} é inválida.`,
        );
    }

    return texto;
}

function obterCompetenciaDaDataContrato(
    dataContrato,
) {
    if (!dataContrato) {
        return "";
    }

    return (
        dataContrato.slice(
            0,
            7,
        ) +
        "-01"
    );
}

function criarResultado({
    status,
    exigivel,
    bloqueado,
    rotulo,
    mensagem,
    competencia,
    dataInicioContrato,
    dataFimContrato,
    competenciaInicioContrato,
    competenciaFimContrato,
    erro = "",
}) {
    return Object.freeze({
        status,
        exigivel:
            Boolean(exigivel),
        aplicavel:
            Boolean(exigivel),
        bloqueado:
            Boolean(bloqueado),
        rotulo:
            textoSeguro(
                rotulo,
                120,
            ),
        mensagem:
            textoSeguro(
                mensagem,
                500,
            ),
        erro:
            textoSeguro(
                erro,
                500,
            ),
        competencia,
        competenciaLabel:
            formatarCompetenciaCertidaoMensal(
                competencia,
            ),
        dataInicioContrato,
        dataFimContrato,
        competenciaInicioContrato,
        competenciaInicioContratoLabel:
            competenciaInicioContrato
                ? formatarCompetenciaCertidaoMensal(
                    competenciaInicioContrato,
                )
                : "",
        competenciaFimContrato,
        competenciaFimContratoLabel:
            competenciaFimContrato
                ? formatarCompetenciaCertidaoMensal(
                    competenciaFimContrato,
                )
                : "",
    });
}

export function normalizarVigenciaContratualEmpresa(
    empresa = {},
) {
    try {
        const dataInicioContrato =
            normalizarDataContratoOpcional(
                obterCampoEmpresa(
                    empresa,
                    "data_inicio_contrato",
                    "dataInicioContrato",
                ),
                "A data de início do contrato",
            );

        const dataFimContrato =
            normalizarDataContratoOpcional(
                obterCampoEmpresa(
                    empresa,
                    "data_fim_contrato",
                    "dataFimContrato",
                ),
                "A data de término do contrato",
            );

        if (
            dataInicioContrato &&
            dataFimContrato &&
            dataFimContrato < dataInicioContrato
        ) {
            return Object.freeze({
                valida:
                    false,
                dataInicioContrato,
                dataFimContrato,
                competenciaInicioContrato:
                    obterCompetenciaDaDataContrato(
                        dataInicioContrato,
                    ),
                competenciaFimContrato:
                    obterCompetenciaDaDataContrato(
                        dataFimContrato,
                    ),
                erro:
                    "A data de término do contrato não pode ser anterior à data de início.",
            });
        }

        return Object.freeze({
            valida:
                true,
            dataInicioContrato,
            dataFimContrato,
            competenciaInicioContrato:
                obterCompetenciaDaDataContrato(
                    dataInicioContrato,
                ),
            competenciaFimContrato:
                obterCompetenciaDaDataContrato(
                    dataFimContrato,
                ),
            erro:
                "",
        });
    }
    catch (erro) {
        return Object.freeze({
            valida:
                false,
            dataInicioContrato:
                "",
            dataFimContrato:
                "",
            competenciaInicioContrato:
                "",
            competenciaFimContrato:
                "",
            erro:
                textoSeguro(
                    erro?.message,
                    500,
                ) ||
                "A vigência contratual é inválida.",
        });
    }
}

export function classificarCompetenciaVigenciaContratual({
    empresa,
    competencia,
} = {}) {
    const competenciaNormalizada =
        normalizarCompetenciaCertidaoMensal(
            competencia,
        );

    const vigencia =
        normalizarVigenciaContratualEmpresa(
            empresa,
        );

    const baseResultado = {
        competencia:
            competenciaNormalizada,
        dataInicioContrato:
            vigencia.dataInicioContrato,
        dataFimContrato:
            vigencia.dataFimContrato,
        competenciaInicioContrato:
            vigencia.competenciaInicioContrato,
        competenciaFimContrato:
            vigencia.competenciaFimContrato,
    };

    if (!vigencia.valida) {
        return criarResultado({
            ...baseResultado,
            status:
                CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS
                    .VIGENCIA_INVALIDA,
            exigivel:
                false,
            bloqueado:
                true,
            rotulo:
                "Vigência contratual inválida",
            mensagem:
                vigencia.erro ||
                "Corrija as datas do contrato no cadastro da empresa.",
            erro:
                vigencia.erro,
        });
    }

    if (!vigencia.competenciaInicioContrato) {
        return criarResultado({
            ...baseResultado,
            status:
                CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS
                    .SEM_INICIO_CONTRATO,
            exigivel:
                false,
            bloqueado:
                true,
            rotulo:
                "Início do contrato não informado",
            mensagem:
                "Informe a data de início do contrato no cadastro da empresa para liberar a cobrança documental.",
        });
    }

    if (
        competenciaNormalizada <
        vigencia.competenciaInicioContrato
    ) {
        return criarResultado({
            ...baseResultado,
            status:
                CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS
                    .ANTES_DO_CONTRATO,
            exigivel:
                false,
            bloqueado:
                false,
            rotulo:
                "Competência anterior ao contrato",
            mensagem:
                `A competência ${formatarCompetenciaCertidaoMensal(
                    competenciaNormalizada,
                )} é anterior ao início do contrato em ${formatarCompetenciaCertidaoMensal(
                    vigencia.competenciaInicioContrato,
                )}.`,
        });
    }

    if (
        vigencia.competenciaFimContrato &&
        competenciaNormalizada >
            vigencia.competenciaFimContrato
    ) {
        return criarResultado({
            ...baseResultado,
            status:
                CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS
                    .APOS_DO_CONTRATO,
            exigivel:
                false,
            bloqueado:
                false,
            rotulo:
                "Competência posterior ao contrato",
            mensagem:
                `A competência ${formatarCompetenciaCertidaoMensal(
                    competenciaNormalizada,
                )} é posterior ao término do contrato em ${formatarCompetenciaCertidaoMensal(
                    vigencia.competenciaFimContrato,
                )}.`,
        });
    }

    return criarResultado({
        ...baseResultado,
        status:
            CERTIDAO_MENSAL_VIGENCIA_CONTRATUAL_STATUS
                .DURANTE_DO_CONTRATO,
        exigivel:
            true,
        bloqueado:
            false,
        rotulo:
            "Competência exigível",
        mensagem:
            vigencia.competenciaFimContrato
                ? (
                    `A competência está dentro da vigência contratual de ${formatarCompetenciaCertidaoMensal(
                        vigencia.competenciaInicioContrato,
                    )} a ${formatarCompetenciaCertidaoMensal(
                        vigencia.competenciaFimContrato,
                    )}.`
                )
                : (
                    `A competência está dentro da vigência contratual iniciada em ${formatarCompetenciaCertidaoMensal(
                        vigencia.competenciaInicioContrato,
                    )}.`
                ),
    });
}

export function competenciaCertidaoMensalEhExigivel(
    parametros,
) {
    return classificarCompetenciaVigenciaContratual(
        parametros,
    ).exigivel;
}
