import {
    CERTIDAO_MENSAL_EMAIL_FUNCTION_NAME,
    criarSolicitacaoEnvioCertidaoMensal,
} from "../domain/certidaoMensalEnvioEmailContract.js";

import {
    normalizarCompetenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";

import {
    criarCertidaoMensalMaterializacaoItensService,
} from "./certidaoMensalMaterializacaoItensService.js";

const TABELA_COMPETENCIAS =
    "certidao_mensal_competencias";

const STATUS_ENVIADO =
    "ENVIADO";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let clienteSupabasePadraoPromise =
    null;

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

function objetoSeguro(
    valor,
) {
    return (
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor)
    )
        ? valor
        : {};
}

function mensagemErro(
    valor,
    fallback,
) {
    const registro =
        objetoSeguro(valor);

    return (
        textoSeguro(
            registro.message ||
                registro.error_description ||
                registro.erro,
        ) ||
        textoSeguro(
            fallback,
        ) ||
        "Falha não identificada."
    );
}

function criarErroEnvio(
    mensagem,
    {
        causa = null,
        codigo = "",
        status = "",
        envioId = "",
        competenciaId = "",
        chaveIdempotencia = "",
        resultado = null,
    } = {},
) {
    const erro =
        new Error(
            textoSeguro(
                mensagem,
            ) ||
            "Não foi possível enviar a certidão mensal.",
        );

    erro.name =
        "CertidaoMensalEmailEnvioError";

    erro.causa =
        causa;

    erro.codigo =
        textoSeguro(
            codigo,
            100,
        );

    erro.status =
        textoSeguro(
            status,
            30,
        );

    erro.envioId =
        textoSeguro(
            envioId,
            60,
        );

    erro.competenciaId =
        textoSeguro(
            competenciaId,
            60,
        );

    erro.chaveIdempotencia =
        textoSeguro(
            chaveIdempotencia,
            120,
        );

    erro.resultado =
        resultado;

    return erro;
}

function validarUuid(
    valor,
    mensagem,
) {
    const normalizado =
        textoSeguro(
            valor,
            60,
        );

    if (
        !UUID_PATTERN.test(
            normalizado,
        )
    ) {
        throw new Error(
            mensagem,
        );
    }

    return normalizado;
}

function validarClienteSupabase(
    cliente,
) {
    if (
        !cliente ||
        typeof cliente.from !==
            "function" ||
        typeof cliente.functions?.invoke !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para envio da certidão mensal.",
        );
    }

    return cliente;
}

async function obterClienteSupabasePadrao() {
    if (!clienteSupabasePadraoPromise) {
        clienteSupabasePadraoPromise =
            import(
                "../../../lib/supabaseClient.js"
            )
                .then(
                    ({
                        supabase,
                    }) =>
                        validarClienteSupabase(
                            supabase,
                        ),
                )
                .catch(
                    (error) => {
                        clienteSupabasePadraoPromise =
                            null;

                        throw error;
                    },
                );
    }

    return clienteSupabasePadraoPromise;
}

function obterGeradorUuidPadrao() {
    const gerador =
        globalThis.crypto
            ?.randomUUID;

    if (
        typeof gerador !==
        "function"
    ) {
        throw new Error(
            "O navegador não disponibiliza geração segura de identificadores.",
        );
    }

    return gerador.call(
        globalThis.crypto,
    );
}

function criarChaveComGerador({
    competenciaId,
    gerarUuid,
}) {
    const competenciaIdSeguro =
        validarUuid(
            competenciaId,
            "A competência persistida é inválida para gerar a chave de envio.",
        );

    const uuid =
        validarUuid(
            gerarUuid(),
            "Não foi possível gerar um identificador seguro para o envio.",
        );

    const chave =
        (
            "certidao:" +
            competenciaIdSeguro +
            ":" +
            uuid
        );

    return criarSolicitacaoEnvioCertidaoMensal({
        competenciaId:
            competenciaIdSeguro,

        chaveIdempotencia:
            chave,
    }).chaveIdempotencia;
}

function normalizarResultadoEnvio(
    valor,
) {
    const resultado =
        objetoSeguro(
            valor,
        );

    const envio =
        objetoSeguro(
            resultado.envio,
        );

    const status =
        textoSeguro(
            resultado.status ||
                envio.status,
            30,
        );

    const envioId =
        textoSeguro(
            resultado.envioId ||
                envio.id,
            60,
        );

    const erro =
        textoSeguro(
            resultado.erro ||
                envio.mensagem_erro,
        );

    return {
        resultado,
        status,
        envioId,
        erro,
        reutilizado:
            resultado.reutilizado ===
            true,
    };
}

export function criarCertidaoMensalEmailEnvioService({
    clienteSupabase,
    gerarUuid = obterGeradorUuidPadrao,
} = {}) {
    const cliente =
        validarClienteSupabase(
            clienteSupabase,
        );

    const materializacaoItensService =
        criarCertidaoMensalMaterializacaoItensService({
            clienteSupabase:
                cliente,
        });

    if (
        typeof gerarUuid !==
        "function"
    ) {
        throw new Error(
            "Gerador de identificadores inválido.",
        );
    }

    async function resolverCompetenciaPersistida({
        empresaId,
        competencia,
    } = {}) {
        const empresaIdSeguro =
            validarUuid(
                empresaId,
                "A empresa selecionada é inválida para o envio.",
            );

        const competenciaNormalizada =
            normalizarCompetenciaCertidaoMensal(
                competencia,
            );

        let resposta;

        try {
            resposta =
                await cliente
                    .from(
                        TABELA_COMPETENCIAS,
                    )
                    .select(
                        [
                            "id",
                            "empresa_id",
                            "competencia",
                            "status",
                            "atualizado_em",
                        ].join(","),
                    )
                    .eq(
                        "empresa_id",
                        empresaIdSeguro,
                    )
                    .eq(
                        "competencia",
                        competenciaNormalizada,
                    )
                    .maybeSingle();
        }
        catch (error) {
            throw criarErroEnvio(
                "Não foi possível consultar a competência persistida.",
                {
                    causa:
                        error,

                    codigo:
                        "CONSULTA_COMPETENCIA",
                },
            );
        }

        if (resposta?.error) {
            throw criarErroEnvio(
                mensagemErro(
                    resposta.error,
                    "Não foi possível consultar a competência persistida.",
                ),
                {
                    causa:
                        resposta.error,

                    codigo:
                        "CONSULTA_COMPETENCIA",
                },
            );
        }

        if (!resposta?.data) {
            throw criarErroEnvio(
                "A competência selecionada ainda não possui registro persistido para envio.",
                {
                    codigo:
                        "COMPETENCIA_NAO_PERSISTIDA",
                },
            );
        }

        const registro =
            objetoSeguro(
                resposta.data,
            );

        const competenciaId =
            validarUuid(
                registro.id,
                "O registro da competência não possui um identificador válido.",
            );

        const empresaRegistro =
            validarUuid(
                registro.empresa_id,
                "O registro da competência não pertence a uma empresa válida.",
            );

        if (
            empresaRegistro !==
            empresaIdSeguro
        ) {
            throw criarErroEnvio(
                "A competência retornada não pertence à empresa selecionada.",
                {
                    codigo:
                        "COMPETENCIA_EMPRESA_DIVERGENTE",

                    competenciaId,
                },
            );
        }

        if (
            textoSeguro(
                registro.competencia,
                20,
            ) !==
            competenciaNormalizada
        ) {
            throw criarErroEnvio(
                "A competência retornada diverge do mês selecionado.",
                {
                    codigo:
                        "COMPETENCIA_DATA_DIVERGENTE",

                    competenciaId,
                },
            );
        }

        return {
            id:
                competenciaId,

            empresaId:
                empresaRegistro,

            competencia:
                competenciaNormalizada,

            status:
                textoSeguro(
                    registro.status,
                    40,
                ),

            atualizadoEm:
                textoSeguro(
                    registro.atualizado_em,
                    60,
                ),
        };
    }

    function criarChaveIdempotencia({
        competenciaId,
    } = {}) {
        return criarChaveComGerador({
            competenciaId,

            gerarUuid,
        });
    }

    async function enviarCertidaoMensalPorEmail({
        empresaId,
        competencia,
        competenciaId,
        chaveIdempotencia,
    } = {}) {
        let competenciaPersistida;

        if (
            textoSeguro(
                competenciaId,
                60,
            )
        ) {
            competenciaPersistida = {
                id:
                    validarUuid(
                        competenciaId,
                        "A competência persistida informada para envio é inválida.",
                    ),
            };
        }
        else {
            competenciaPersistida =
                await resolverCompetenciaPersistida({
                    empresaId,
                    competencia,
                });
        }

        let materializacaoItens;

        try {
            materializacaoItens =
                await materializacaoItensService
                    .materializarItensExternos({
                        competenciaId:
                            competenciaPersistida.id,
                    });
        }
        catch (error) {
            throw criarErroEnvio(
                mensagemErro(
                    error,
                    "Não foi possível preparar os documentos pendentes da competência.",
                ),
                {
                    causa:
                        error,

                    codigo:
                        "MATERIALIZACAO_ITENS_EXTERNOS",

                    competenciaId:
                        competenciaPersistida.id,
                },
            );
        }

        const chave =
            textoSeguro(
                chaveIdempotencia,
                120,
            ) ||
            criarChaveIdempotencia({
                competenciaId:
                    competenciaPersistida.id,
            });

        const solicitacao =
            criarSolicitacaoEnvioCertidaoMensal({
                competenciaId:
                    competenciaPersistida.id,

                chaveIdempotencia:
                    chave,
            });

        let resposta;

        try {
            resposta =
                await cliente
                    .functions
                    .invoke(
                        CERTIDAO_MENSAL_EMAIL_FUNCTION_NAME,
                        {
                            body:
                                solicitacao,
                        },
                    );
        }
        catch (error) {
            throw criarErroEnvio(
                "Não foi possível acessar o serviço de envio da certidão mensal.",
                {
                    causa:
                        error,

                    codigo:
                        "TRANSPORTE_EDGE_FUNCTION",

                    competenciaId:
                        solicitacao.competenciaId,

                    chaveIdempotencia:
                        solicitacao.chaveIdempotencia,
                },
            );
        }

        if (resposta?.error) {
            throw criarErroEnvio(
                mensagemErro(
                    resposta.error,
                    "A Edge Function recusou a solicitação de envio.",
                ),
                {
                    causa:
                        resposta.error,

                    codigo:
                        "EDGE_FUNCTION",

                    competenciaId:
                        solicitacao.competenciaId,

                    chaveIdempotencia:
                        solicitacao.chaveIdempotencia,
                },
            );
        }

        const resultadoNormalizado =
            normalizarResultadoEnvio(
                resposta?.data,
            );

        if (
            resultadoNormalizado
                .resultado
                .ok !==
                true ||
            resultadoNormalizado.status !==
                STATUS_ENVIADO
        ) {
            throw criarErroEnvio(
                resultadoNormalizado.erro ||
                    (
                        resultadoNormalizado.status ===
                        "PARCIAL"
                            ? "O envio foi concluído parcialmente."
                            : "O envio da certidão não foi concluído."
                    ),
                {
                    codigo:
                        "RESULTADO_OPERACIONAL",

                    status:
                        resultadoNormalizado.status,

                    envioId:
                        resultadoNormalizado.envioId,

                    competenciaId:
                        solicitacao.competenciaId,

                    chaveIdempotencia:
                        solicitacao.chaveIdempotencia,

                    resultado:
                        resultadoNormalizado.resultado,
                },
            );
        }

        return {
            ok:
                true,

            competenciaId:
                solicitacao.competenciaId,

            chaveIdempotencia:
                solicitacao.chaveIdempotencia,

            envioId:
                resultadoNormalizado.envioId,

            status:
                resultadoNormalizado.status,

            reutilizado:
                resultadoNormalizado.reutilizado,

            resultado:
                resultadoNormalizado.resultado,

            materializacaoItens,
        };
    }

    return Object.freeze({
        resolverCompetenciaPersistida,
        criarChaveIdempotencia,
        enviarCertidaoMensalPorEmail,
    });
}

async function criarServicoPadrao() {
    const clienteSupabase =
        await obterClienteSupabasePadrao();

    return criarCertidaoMensalEmailEnvioService({
        clienteSupabase,
    });
}

export function criarChaveIdempotenciaEnvioCertidaoMensal({
    competenciaId,
} = {}) {
    return criarChaveComGerador({
        competenciaId,

        gerarUuid:
            obterGeradorUuidPadrao,
    });
}

export async function resolverCompetenciaPersistidaParaEnvio(
    parametros,
) {
    const servico =
        await criarServicoPadrao();

    return servico
        .resolverCompetenciaPersistida(
            parametros,
        );
}

export async function enviarCertidaoMensalPorEmail(
    parametros,
) {
    const servico =
        await criarServicoPadrao();

    return servico
        .enviarCertidaoMensalPorEmail(
            parametros,
        );
}