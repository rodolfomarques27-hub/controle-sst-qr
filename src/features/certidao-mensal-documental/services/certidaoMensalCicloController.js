import {
    classificarCompetenciaVigenciaContratual,
} from "../domain/certidaoMensalVigenciaContratual.js";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const METODOS_OBRIGATORIOS =
    Object.freeze([
        "obterCompetenciaExistente",
        "obterOuCriarCompetencia",
        "listarItensAutomaticos",
        "consolidarRelacaoEmpregados",
        "consolidarItensAutomaticos",
        "fecharCompetencia",
        "reabrirCompetencia",
        "listarHistoricoAnual",
    ]);

function textoSeguro(
    valor,
    limite = 2000,
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

function normalizarEmpresaId(
    valor,
) {
    const empresaId =
        textoSeguro(
            valor,
            60,
        );

    if (!UUID_PATTERN.test(empresaId)) {
        throw new Error(
            "Identificador da empresa inválido.",
        );
    }

    return empresaId;
}

export function normalizarCompetenciaCicloControlador(
    valor,
) {
    const competencia =
        textoSeguro(
            valor,
            30,
        );

    if (
        !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(
            competencia,
        )
    ) {
        throw new Error(
            "A competência deve representar o primeiro dia do mês.",
        );
    }

    return competencia;
}

export function obterAnoCompetenciaCiclo(
    valor,
) {
    const competencia =
        normalizarCompetenciaCicloControlador(
            valor,
        );

    return Number(
        competencia.slice(
            0,
            4,
        ),
    );
}

export function criarChaveContextoCicloCertidaoMensal({
    empresaId,
    competencia,
} = {}) {
    return [
        normalizarEmpresaId(
            empresaId,
        ),
        normalizarCompetenciaCicloControlador(
            competencia,
        ),
    ].join("|");
}

function validarServicoCiclo(
    servicoCiclo,
) {
    if (
        !servicoCiclo ||
        typeof servicoCiclo !==
            "object"
    ) {
        throw new Error(
            "Serviço do ciclo anual inválido.",
        );
    }

    for (
        const metodo of
        METODOS_OBRIGATORIOS
    ) {
        if (
            typeof servicoCiclo[metodo] !==
            "function"
        ) {
            throw new Error(
                `Serviço do ciclo anual sem o método ${metodo}.`,
            );
        }
    }

    return servicoCiclo;
}

function normalizarHistorico(
    valor,
) {
    if (!Array.isArray(valor)) {
        return [];
    }

    return valor;
}

export function criarControladorCicloCertidaoMensal({
    servicoCiclo,
} = {}) {
    const servico =
        validarServicoCiclo(
            servicoCiclo,
        );

    async function iniciarCompetencia({
        empresaId,
        competencia,
    } = {}) {
        const empresaIdNormalizado =
            normalizarEmpresaId(
                empresaId,
            );

        const competenciaNormalizada =
            normalizarCompetenciaCicloControlador(
                competencia,
            );

        return servico
            .obterOuCriarCompetencia({
                empresaId:
                    empresaIdNormalizado,
                competencia:
                    competenciaNormalizada,
            });
    }

    async function carregarHistorico({
        empresaId,
        competencia,
    } = {}) {
        const empresaIdNormalizado =
            normalizarEmpresaId(
                empresaId,
            );

        const competenciaNormalizada =
            normalizarCompetenciaCicloControlador(
                competencia,
            );

        const ano =
            obterAnoCompetenciaCiclo(
                competenciaNormalizada,
            );

        const historico =
            await servico
                .listarHistoricoAnual({
                    empresaId:
                        empresaIdNormalizado,
                    ano,
                });

        return {
            chave:
                criarChaveContextoCicloCertidaoMensal({
                    empresaId:
                        empresaIdNormalizado,
                    competencia:
                        competenciaNormalizada,
                }),

            ano,

            itens:
                normalizarHistorico(
                    historico,
                ),
        };
    }

    async function prepararContexto({
        empresaId,
        competencia,
        empresa = {},
    } = {}) {
        const empresaIdNormalizado =
            normalizarEmpresaId(
                empresaId,
            );

        const competenciaNormalizada =
            normalizarCompetenciaCicloControlador(
                competencia,
            );

        const vigenciaContratual =
            classificarCompetenciaVigenciaContratual({
                empresa,
                competencia:
                    competenciaNormalizada,
            });

        const competenciaAtual =
            vigenciaContratual.exigivel
                ? await servico
                    .obterCompetenciaExistente({
                        empresaId:
                            empresaIdNormalizado,
                        competencia:
                            competenciaNormalizada,
                    })
                : null;

        const itensAutomaticos =
            competenciaAtual
                ? await servico
                    .listarItensAutomaticos({
                        competenciaId:
                            competenciaAtual.competenciaId,
                    })
                : [];
        const historico =
            await carregarHistorico({
                empresaId:
                    empresaIdNormalizado,
                competencia:
                    competenciaNormalizada,
            });

        return {
            chave:
                historico.chave,

            ano:
                historico.ano,

            competenciaAtual,

            itensAutomaticos,

            historicoAnual:
                historico.itens,

            vigenciaContratual,
        };
    }

    async function consolidarRelacaoEmpregados(
        parametros = {},
    ) {
        return servico
            .consolidarRelacaoEmpregados(
                parametros,
            );
    }
    async function consolidarItensAutomaticos(
        parametros = {},
    ) {
        return servico
            .consolidarItensAutomaticos(
                parametros,
            );
    }

    async function fecharCompetencia(
        parametros = {},
    ) {
        return servico
            .fecharCompetencia(
                parametros,
            );
    }

    async function reabrirCompetencia(
        parametros = {},
    ) {
        return servico
            .reabrirCompetencia(
                parametros,
            );
    }

    return Object.freeze({
        iniciarCompetencia,
        carregarHistorico,
        prepararContexto,
        consolidarRelacaoEmpregados,
        consolidarItensAutomaticos,
        fecharCompetencia,
        reabrirCompetencia,
    });
}