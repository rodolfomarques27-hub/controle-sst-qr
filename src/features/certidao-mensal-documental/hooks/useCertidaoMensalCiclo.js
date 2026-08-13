import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    normalizarCompetenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";

import {
    criarChaveContextoCicloCertidaoMensal,
    criarControladorCicloCertidaoMensal,
} from "../services/certidaoMensalCicloController.js";

import {
    criarServicoCicloCertidaoMensal,
} from "../services/certidaoMensalCicloService.js";

export const CERTIDAO_MENSAL_CICLO_HOOK_STATUS =
    Object.freeze({
        OCIOSO:
            "ocioso",
        CARREGANDO:
            "carregando",
        PRONTO:
            "pronto",
        ERRO:
            "erro",
    });

let controladorPadraoPromise =
    null;

function criarEstadoInicial() {
    return {
        status:
            CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                .OCIOSO,
        chave:
            "",
        ano:
            null,
        competenciaAtual:
            null,
        itensAutomaticos:
            [],
        historicoAnual:
            [],
        vigenciaContratual:
            null,
        erro:
            "",
        revisao:
            -1,
    };
}

function obterMensagemErro(
    erro,
    fallback,
) {
    return (
        String(
            erro?.message ||
            erro?.details ||
            erro?.hint ||
            "",
        ).trim() ||
        fallback
    );
}

async function obterControladorPadrao() {
    if (!controladorPadraoPromise) {
        controladorPadraoPromise =
            import(
                "../../../lib/supabaseClient.js"
            )
                .then(
                    ({
                        supabase,
                    }) => {
                        const servicoCiclo =
                            criarServicoCicloCertidaoMensal({
                                clienteSupabase:
                                    supabase,
                            });

                        return criarControladorCicloCertidaoMensal({
                            servicoCiclo,
                        });
                    },
                )
                .catch(
                    (erro) => {
                        controladorPadraoPromise =
                            null;

                        throw erro;
                    },
                );
    }

    return controladorPadraoPromise;
}

export function normalizarContextoCicloCertidaoMensalHook({
    empresaId,
    competencia,
    empresa = {},
} = {}) {
    const empresaIdNormalizado =
        String(
            empresaId ||
            "",
        ).trim();

    if (!empresaIdNormalizado) {
        return null;
    }

    const competenciaNormalizada =
        normalizarCompetenciaCertidaoMensal(
            competencia,
        );

    const chave =
        criarChaveContextoCicloCertidaoMensal({
            empresaId:
                empresaIdNormalizado,
            competencia:
                competenciaNormalizada,
        });

    return {
        empresaId:
            empresaIdNormalizado,
        competencia:
            competenciaNormalizada,
        chave,
        ano:
            Number(
                competenciaNormalizada.slice(
                    0,
                    4,
                ),
            ),
        empresa,
    };
}

export async function carregarContextoCicloCertidaoMensal({
    empresaId,
    competencia,
    empresa = {},
    obterControlador =
        obterControladorPadrao,
} = {}) {
    const contexto =
        normalizarContextoCicloCertidaoMensalHook({
            empresaId,
            competencia,
            empresa,
        });

    if (!contexto) {
        return null;
    }

    if (
        typeof obterControlador !==
        "function"
    ) {
        throw new Error(
            "O carregador do controlador anual é inválido.",
        );
    }

    const controlador =
        await obterControlador();

    if (
        !controlador ||
        typeof controlador.prepararContexto !==
            "function"
    ) {
        throw new Error(
            "O controlador anual não está disponível.",
        );
    }

    const resultado =
        await controlador.prepararContexto({
            empresaId:
                contexto.empresaId,
            competencia:
                contexto.competencia,
            empresa:
                contexto.empresa,
        });

    if (
        !resultado ||
        typeof resultado !==
            "object" ||
        Array.isArray(
            resultado,
        )
    ) {
        throw new Error(
            "O contexto anual retornado é inválido.",
        );
    }

    if (
        String(
            resultado.chave ||
            "",
        ).trim() !==
        contexto.chave
    ) {
        throw new Error(
            "O contexto anual retornado pertence a outra empresa ou competência.",
        );
    }

    if (
        Number(
            resultado.ano,
        ) !==
        contexto.ano
    ) {
        throw new Error(
            "O ano retornado pelo histórico anual é divergente.",
        );
    }

    if (
        !resultado.vigenciaContratual ||
        typeof resultado.vigenciaContratual !==
            "object" ||
        Array.isArray(
            resultado.vigenciaContratual,
        )
    ) {
        throw new Error(
            "A vigência contratual não foi retornada pelo controlador.",
        );
    }

    if (
        resultado.vigenciaContratual.exigivel &&
        (
            !resultado.competenciaAtual ||
            typeof resultado.competenciaAtual !==
                "object" ||
            Array.isArray(
                resultado.competenciaAtual,
            )
        )
    ) {
        throw new Error(
            "A competência atual não foi retornada pelo controlador.",
        );
    }

    if (
        !Array.isArray(
            resultado.itensAutomaticos,
        )
    ) {
        throw new Error(
            "Os itens automáticos retornados são inválidos.",
        );
    }
    if (
        !Array.isArray(
            resultado.historicoAnual,
        )
    ) {
        throw new Error(
            "O histórico anual retornado é inválido.",
        );
    }

    return {
        chave:
            contexto.chave,
        ano:
            contexto.ano,
        competenciaAtual:
            resultado.competenciaAtual,
        itensAutomaticos:
            resultado.itensAutomaticos,
        historicoAnual:
            resultado.historicoAnual,
        vigenciaContratual:
            resultado.vigenciaContratual,
    };
}

export function useCertidaoMensalCiclo({
    empresaId,
    competencia,
    empresa = {},
    habilitado = true,
} = {}) {
    const [
        estado,
        setEstado,
    ] =
        useState(
            criarEstadoInicial,
        );

    const [
        revisao,
        setRevisao,
    ] =
        useState(
            0,
        );

    const contextoPreparado =
        useMemo(
            () => {
                if (!habilitado) {
                    return {
                        contexto:
                            null,
                        erro:
                            "",
                    };
                }

                try {
                    return {
                        contexto:
                            normalizarContextoCicloCertidaoMensalHook({
                                empresaId,
                                competencia,
                                empresa,
                            }),
                        erro:
                            "",
                    };
                }
                catch (erro) {
                    return {
                        contexto:
                            null,
                        erro:
                            obterMensagemErro(
                                erro,
                                "Não foi possível interpretar a competência selecionada.",
                            ),
                    };
                }
            },
            [
                competencia,
                empresa,
                empresaId,
                habilitado,
            ],
        );

    const recarregar =
        useCallback(
            () => {
                setRevisao(
                    (valorAtual) =>
                        valorAtual + 1,
                );
            },
            [],
        );

    const contexto =
        contextoPreparado.contexto;

    const erroContexto =
        contextoPreparado.erro;

    useEffect(
        () => {
            let efeitoAtivo =
                true;

            if (
                !habilitado ||
                erroContexto ||
                !contexto
            ) {
                return () => {
                    efeitoAtivo =
                        false;
                };
            }

            carregarContextoCicloCertidaoMensal({
                empresaId:
                    contexto.empresaId,
                competencia:
                    contexto.competencia,
                empresa:
                    contexto.empresa,
            })
                .then(
                    (resultado) => {
                        if (
                            !efeitoAtivo ||
                            !resultado
                        ) {
                            return;
                        }

                        setEstado({
                            status:
                                CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                                    .PRONTO,
                            chave:
                                resultado.chave,
                            ano:
                                resultado.ano,
                            competenciaAtual:
                                resultado.competenciaAtual,
                            itensAutomaticos:
                                resultado.itensAutomaticos,
                            historicoAnual:
                                resultado.historicoAnual,
                            vigenciaContratual:
                                resultado.vigenciaContratual,
                            erro:
                                "",
                            revisao,
                        });
                    },
                )
                .catch(
                    (erro) => {
                        if (!efeitoAtivo) {
                            return;
                        }

                        setEstado({
                            status:
                                CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                                    .ERRO,
                            chave:
                                contexto.chave,
                            ano:
                                contexto.ano,
                            competenciaAtual:
                                null,
                            itensAutomaticos:
                                [],
                            historicoAnual:
                                [],
                            vigenciaContratual:
                                contexto.empresa
                                    ?.vigenciaContratual ||
                                null,
                            erro:
                                obterMensagemErro(
                                    erro,
                                    "Não foi possível carregar o ciclo anual da competência.",
                                ),
                            revisao,
                        });
                    },
                );

            return () => {
                efeitoAtivo =
                    false;
            };
        },
        [
            contexto,
            erroContexto,
            habilitado,
            revisao,
        ],
    );

    const estadoExposto =
        useMemo(
            () => {
                if (!habilitado) {
                    return criarEstadoInicial();
                }

                if (erroContexto) {
                    return {
                        ...criarEstadoInicial(),
                        status:
                            CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                                .ERRO,
                        erro:
                            erroContexto,
                    };
                }

                if (!contexto) {
                    return criarEstadoInicial();
                }

                if (
                    estado.chave !==
                        contexto.chave ||
                    estado.revisao !==
                        revisao
                ) {
                    return {
                        status:
                            CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                                .CARREGANDO,
                        chave:
                            contexto.chave,
                        ano:
                            contexto.ano,
                        competenciaAtual:
                            null,
                        itensAutomaticos:
                            [],
                        historicoAnual:
                            [],
                        vigenciaContratual:
                            contexto.empresa
                                ?.vigenciaContratual ||
                            null,
                        erro:
                            "",
                        revisao,
                    };
                }

                return estado;
            },
            [
                contexto,
                erroContexto,
                estado,
                habilitado,
                revisao,
            ],
        );

    const consolidarRelacaoEmpregados =
        useCallback(
            async (
                item = null,
            ) => {
                if (
                    !habilitado ||
                    !contexto ||
                    estadoExposto.chave !==
                        contexto.chave ||
                    estadoExposto.status !==
                        CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                            .PRONTO
                ) {
                    throw new Error(
                        "O ciclo mensal precisa estar pronto para consolidar a Relação de Empregados.",
                    );
                }

                const competenciaId =
                    String(
                        estadoExposto
                            .competenciaAtual
                            ?.competenciaId ||
                        "",
                    ).trim();

                if (!competenciaId) {
                    throw new Error(
                        "A competência atual não possui identificador para consolidar a Relação de Empregados.",
                    );
                }

                const statusCompetencia =
                    String(
                        estadoExposto
                            .competenciaAtual
                            ?.status ||
                        "",
                    )
                        .trim()
                        .toUpperCase();

                if (
                    statusCompetencia ===
                    "FECHADA"
                ) {
                    throw new Error(
                        "A competência está fechada e não permite nova consolidação da Relação de Empregados.",
                    );
                }

                const controlador =
                    await obterControladorPadrao();

                if (
                    !controlador ||
                    typeof controlador
                        .consolidarRelacaoEmpregados !==
                        "function"
                ) {
                    throw new Error(
                        "O controlador mensal não disponibiliza a consolidação isolada da Relação de Empregados.",
                    );
                }

                const resultado =
                    await controlador
                        .consolidarRelacaoEmpregados({
                            competenciaId,
                            item,
                        });

                recarregar();

                return resultado;
            },
            [
                contexto,
                estadoExposto.chave,
                estadoExposto.competenciaAtual,
                estadoExposto.status,
                habilitado,
                recarregar,
            ],
        );
    const consolidarItensAutomaticos =
        useCallback(
            async (
                itens = [],
            ) => {
                if (
                    !habilitado ||
                    !contexto ||
                    estadoExposto.chave !==
                        contexto.chave ||
                    estadoExposto.status !==
                        CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                            .PRONTO
                ) {
                    throw new Error(
                        "O ciclo mensal precisa estar pronto para consolidar os itens automáticos.",
                    );
                }

                const competenciaId =
                    String(
                        estadoExposto
                            .competenciaAtual
                            ?.competenciaId ||
                        "",
                    ).trim();

                if (!competenciaId) {
                    throw new Error(
                        "A competência atual não possui identificador para consolidar os itens automáticos.",
                    );
                }

                const statusCompetencia =
                    String(
                        estadoExposto
                            .competenciaAtual
                            ?.status ||
                        "",
                    )
                        .trim()
                        .toUpperCase();

                if (
                    statusCompetencia ===
                    "FECHADA"
                ) {
                    throw new Error(
                        "A competência está fechada e não permite nova consolidação dos itens automáticos.",
                    );
                }

                const controlador =
                    await obterControladorPadrao();

                if (
                    !controlador ||
                    typeof controlador
                        .consolidarItensAutomaticos !==
                        "function"
                ) {
                    throw new Error(
                        "O controlador mensal não disponibiliza a consolidação dos itens automáticos.",
                    );
                }

                const resultado =
                    await controlador
                        .consolidarItensAutomaticos({
                            competenciaId,
                            itens,
                        });

                recarregar();

                return resultado;
            },
            [
                contexto,
                estadoExposto.chave,
                estadoExposto.competenciaAtual,
                estadoExposto.status,
                habilitado,
                recarregar,
            ],
        );

    return {
        status:
            estadoExposto.status,
        chave:
            estadoExposto.chave,
        ano:
            estadoExposto.ano,
        competenciaAtual:
            estadoExposto.competenciaAtual,
        itensAutomaticos:
            estadoExposto.itensAutomaticos,
        historicoAnual:
            estadoExposto.historicoAnual,
        vigenciaContratual:
            estadoExposto.vigenciaContratual,
        erro:
            estadoExposto.erro,
        carregando:
            estadoExposto.status ===
            CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                .CARREGANDO,
        pronto:
            estadoExposto.status ===
            CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                .PRONTO,
        possuiErro:
            estadoExposto.status ===
            CERTIDAO_MENSAL_CICLO_HOOK_STATUS
                .ERRO,
        consolidarRelacaoEmpregados,
        consolidarItensAutomaticos,
        recarregar,
    };
}

export default useCertidaoMensalCiclo;
