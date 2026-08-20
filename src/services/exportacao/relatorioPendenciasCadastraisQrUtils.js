import {
    consolidarPendenciasCadastrais,
} from "./relatorioPendenciasCadastraisUtils.js";

export const ESTADOS_QR_RELATORIO =
    Object.freeze([
        "impresso",
        "sem_impressao",
    ]);

export function possuiImpressaoQrConfirmada(
    colaborador = {}
) {
    return Boolean(
        String(
            colaborador?.qrUltimaImpressaoEm ||
            colaborador?.qr_ultima_impressao_em ||
            ""
        ).trim()
    );
}

export function obterEstadoQrRelatorio(
    colaborador = {}
) {
    return possuiImpressaoQrConfirmada(
        colaborador
    )
        ? "impresso"
        : "sem_impressao";
}

export function normalizarEstadosQrRelatorio(
    estados = []
) {
    if (!Array.isArray(estados)) {
        return [];
    }

    return [
        ...new Set(
            estados.filter(
                (estado) =>
                    ESTADOS_QR_RELATORIO.includes(
                        estado
                    )
            )
        ),
    ];
}

export function resumirEstadosQrColaboradores(
    colaboradores = []
) {
    const lista =
        Array.isArray(colaboradores)
            ? colaboradores
            : [];

    const impressos =
        lista.filter(
            (colaborador) =>
                possuiImpressaoQrConfirmada(
                    colaborador
                )
        ).length;

    return {
        total:
            lista.length,

        impressos,

        semImpressao:
            Math.max(
                0,
                lista.length -
                impressos
            ),
    };
}

export function construirResumoCadastralComFiltroQr({
    colaboradores = [],
    camposSelecionados = [],
    estadosQrSelecionados = [],
} = {}) {
    const lista =
        Array.isArray(colaboradores)
            ? colaboradores
            : [];

    const campos =
        Array.isArray(
            camposSelecionados
        )
            ? camposSelecionados
            : [];

    const estados =
        normalizarEstadosQrRelatorio(
            estadosQrSelecionados
        );

    const temCampos =
        campos.length >
        0;

    const temFiltroQr =
        estados.length >
        0;

    /*
     * Sem qualquer critério:
     * preserva comportamento histórico.
     * Nenhum falso positivo.
     */
    if (
        !temCampos &&
        !temFiltroQr
    ) {
        return {
            colaboradoresAnalisados:
                lista.length,

            cadastrosComPendencia:
                0,

            totalPendencias:
                0,

            camposSelecionados:
                [],

            totaisPorCampo:
                {},

            avaliacoes:
                [],
        };
    }

    /*
     * Com campo cadastral:
     * mantém integralmente a semântica OU
     * da matriz já aprovada.
     *
     * QR-only:
     * cria avaliações operacionais com
     * zero pendências cadastrais.
     */
    const resumoBase =
        temCampos
            ? consolidarPendenciasCadastrais(
                lista,
                campos
            )
            : {
                colaboradoresAnalisados:
                    lista.length,

                cadastrosComPendencia:
                    0,

                totalPendencias:
                    0,

                camposSelecionados:
                    [],

                totaisPorCampo:
                    {},

                avaliacoes:
                    lista.map(
                        (colaborador) => ({
                            colaborador,
                            pendencias:
                                [],
                            quantidade:
                                0,
                        })
                    ),
            };

    /*
     * Nenhum estado QR:
     * não restringe.
     *
     * Ambos os estados:
     * também não restringem,
     * porque representam o universo inteiro.
     *
     * Um único estado:
     * aplica AND sobre o resultado cadastral.
     */
    const deveRestringirPorQr =
        estados.length ===
        1;

    const avaliacoes =
        deveRestringirPorQr
            ? resumoBase.avaliacoes.filter(
                (avaliacao) =>
                    estados.includes(
                        obterEstadoQrRelatorio(
                            avaliacao?.colaborador ||
                            {}
                        )
                    )
            )
            : [
                ...resumoBase.avaliacoes,
            ];

    /*
     * Recalcula somente indicadores cadastrais
     * do subconjunto final.
     *
     * QR nunca aumenta quantidade,
     * totalPendencias ou cadastrosComPendencia.
     */
    const totalPendencias =
        avaliacoes.reduce(
            (
                total,
                avaliacao
            ) =>
                total +
                Number(
                    avaliacao?.quantidade ||
                    0
                ),
            0
        );

    const cadastrosComPendencia =
        avaliacoes.filter(
            (avaliacao) =>
                Number(
                    avaliacao?.quantidade ||
                    0
                ) >
                0
        ).length;

    const camposNormalizados =
        Array.isArray(
            resumoBase.camposSelecionados
        )
            ? resumoBase.camposSelecionados
            : [];

    const totaisPorCampo =
        Object.fromEntries(
            camposNormalizados.map(
                (chave) => [
                    chave,
                    avaliacoes.filter(
                        (avaliacao) =>
                            Array.isArray(
                                avaliacao?.pendencias
                            ) &&
                            avaliacao.pendencias.some(
                                (pendencia) =>
                                    pendencia?.chave ===
                                    chave
                            )
                    ).length,
                ]
            )
        );

    return {
        colaboradoresAnalisados:
            lista.length,

        cadastrosComPendencia,

        totalPendencias,

        camposSelecionados:
            camposNormalizados,

        totaisPorCampo,

        avaliacoes,
    };
}