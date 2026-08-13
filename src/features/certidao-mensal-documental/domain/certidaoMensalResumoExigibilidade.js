import {
    CERTIDAO_MENSAL_STATUS_EFETIVO,
    normalizarStatusRegraCompetencia,
} from "./certidaoMensalRegraCompetencia.js";

export const CERTIDAO_MENSAL_RESUMO_EXIGIBILIDADE_VERSAO =
    1;

const STATUS_FORA_CONTAGEM =
    new Set([
        CERTIDAO_MENSAL_STATUS_EFETIVO
            .DISPENSADO,

        CERTIDAO_MENSAL_STATUS_EFETIVO
            .NAO_APLICAVEL,
    ]);

const ALIASES_STATUS_INTERFACE =
    Object.freeze({
        CONFIRMADO:
            "CONFORME",

        APROVADO:
            "CONFORME",

        EMANALISE:
            "EM_ANALISE",

        REENVIOSOLICITADO:
            "REENVIO_SOLICITADO",

        NAOCONFORME:
            "NAO_CONFORME",

        NAOAPLICAVEL:
            "NAO_APLICAVEL",
    });

function textoSeguro(
    valor,
) {
    return String(
        valor ?? "",
    ).trim();
}

function chaveStatusInterface(
    valor,
) {
    return textoSeguro(
        valor,
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            "",
        )
        .replace(
            /[^a-zA-Z0-9]+/g,
            "",
        )
        .toUpperCase();
}

export function normalizarStatusDocumentoResumoExigibilidade(
    valor,
) {
    const chave =
        chaveStatusInterface(
            valor,
        );

    const alias =
        ALIASES_STATUS_INTERFACE[
            chave
        ];

    return normalizarStatusRegraCompetencia(
        alias ||
        valor,
    );
}

export function normalizarAplicabilidadeDocumentoResumo(
    documento = {},
) {
    const valor =
        String(
            documento?.aplicabilidade ||
            "APLICAVEL"
        )
            .trim()
            .toUpperCase();

    if (
        valor === "APLICAVEL" ||
        valor === "NAO_APLICAVEL" ||
        valor === "PENDENTE_DEFINICAO"
    ) {
        return valor;
    }

    return "APLICAVEL";
}

export function documentoEhNaoAplicavelNoResumo(
    documento = {},
) {
    return (
        normalizarAplicabilidadeDocumentoResumo(
            documento
        ) ===
        "NAO_APLICAVEL"
    );
}

export function documentoTemAplicabilidadePendenteNoResumo(
    documento = {},
) {
    return (
        normalizarAplicabilidadeDocumentoResumo(
            documento
        ) ===
        "PENDENTE_DEFINICAO"
    );
}

export function documentoEhExigivelNoResumo(
    documento = {},
) {
    if (
        documento?.exigido ===
        false
    ) {
        return false;
    }

    if (
        documentoEhNaoAplicavelNoResumo(
            documento
        )
    ) {
        return false;
    }

    const status =
        normalizarStatusDocumentoResumoExigibilidade(
            documento?.status,
        );

    return !STATUS_FORA_CONTAGEM.has(
        status,
    );
}

export function montarResumoExigibilidadeDocumental(
    documentos = [],
) {
    const catalogo =
        (
            Array.isArray(
                documentos,
            )
                ? documentos
                : []
        ).map(
            (documento) => ({
                documento:
                    documento &&
                    typeof documento ===
                        "object" &&
                    !Array.isArray(
                        documento,
                    )
                        ? documento
                        : {},

                status:
                    normalizarStatusDocumentoResumoExigibilidade(
                        documento?.status,
                    ),
            }),
        );

    const exigiveis =
        catalogo.filter(
            ({
                documento,
                status,
            }) =>
                documento?.exigido !==
                    false &&
                !documentoEhNaoAplicavelNoResumo(
                    documento
                ) &&
                !STATUS_FORA_CONTAGEM.has(
                    status,
                ),
        );

    const naoExigiveis =
        catalogo.filter(
            ({
                documento,
                status,
            }) =>
                documento?.exigido ===
                    false ||
                documentoEhNaoAplicavelNoResumo(
                    documento
                ) ||
                STATUS_FORA_CONTAGEM.has(
                    status,
                ),
        );

    const totalNaoAplicaveis =
        catalogo.filter(
            ({ documento }) =>
                documentoEhNaoAplicavelNoResumo(
                    documento
                )
        ).length;

    const totalAplicabilidadePendente =
        catalogo.filter(
            ({ documento }) =>
                documentoTemAplicabilidadePendenteNoResumo(
                    documento
                )
        ).length;

    const contarStatus =
        (statusEsperado) =>
            exigiveis.filter(
                (item) =>
                    item.status ===
                    statusEsperado,
            ).length;

    const totalCatalogo =
        catalogo.length;

    const totalExigiveis =
        exigiveis.length;

    const totalNaoExigiveis =
        naoExigiveis.length;

    const totalConformes =
        contarStatus(
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .CONFORME,
        );

    const totalPendentes =
        Math.max(
            0,
            totalExigiveis -
                totalConformes,
        );

    const totalPendentesDiretos =
        contarStatus(
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .PENDENTE,
        );

    const totalEmAnalise =
        contarStatus(
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .EM_ANALISE,
        ) +
        contarStatus(
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .ENVIADO,
        );

    const totalVencidos =
        contarStatus(
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .VENCIDO,
        );

    const totalReenvioSolicitado =
        contarStatus(
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .REENVIO_SOLICITADO,
        );

    const totalNaoConformes =
        contarStatus(
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .NAO_CONFORME,
        );

    const totalAutomaticosPendentes =
        contarStatus(
            CERTIDAO_MENSAL_STATUS_EFETIVO
                .AUTOMATICO,
        );

    const conformidade =
        totalExigiveis > 0
            ? Math.round(
                (
                    totalConformes /
                    totalExigiveis
                ) *
                100,
            )
            : 0;

    return {
        contratoVersao:
            CERTIDAO_MENSAL_RESUMO_EXIGIBILIDADE_VERSAO,

        totalCatalogo,

        totalExigiveis,

        totalNaoExigiveis,

        totalNaoAplicaveis,

        totalAplicabilidadePendente,

        totalConformes,

        totalConfirmados:
            totalConformes,

        totalPendentes,

        totalPendentesDiretos,

        totalEmAnalise,

        totalVencidos,

        totalReenvioSolicitado,

        totalNaoConformes,

        totalAutomaticosPendentes,

        conformidade,

        idsExigiveis:
            exigiveis
                .map(
                    (item) =>
                        textoSeguro(
                            item.documento?.id,
                        ),
                )
                .filter(Boolean),

        idsNaoExigiveis:
            naoExigiveis
                .map(
                    (item) =>
                        textoSeguro(
                            item.documento?.id,
                        ),
                )
                .filter(Boolean),
    };
}