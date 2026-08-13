import {
    CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS,
} from "../domain/certidaoMensalRegraCompetencia.js";

const TOTAL_DOCUMENTOS_EXTERNOS_ESPERADOS =
    CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS.length;

export const CERTIDAO_MENSAL_RPC_MATERIALIZAR_ITENS_EXTERNOS =
    "materializar_itens_externos_certidao_mensal";

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let clienteSupabasePadraoPromise =
    null;

function textoSeguro(
    valor,
    limite = 500,
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

function numeroInteiroNaoNegativo(
    valor,
) {
    const numero =
        Number(
            valor,
        );

    return Number.isInteger(numero) &&
        numero >= 0
        ? numero
        : 0;
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
    clienteSupabase,
) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.rpc !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para materialização dos itens externos.",
        );
    }

    return clienteSupabase;
}

function obterMensagemErro(
    erro,
) {
    return textoSeguro(
        erro?.message ||
        erro?.error_description ||
        erro?.details ||
        erro?.hint,
        2000,
    ) ||
    "Não foi possível preparar os documentos externos da competência.";
}

function normalizarResultadoMaterializacao(
    valor,
    competenciaIdEsperada,
) {
    const resultado =
        objetoSeguro(
            valor,
        );

    const competenciaId =
        validarUuid(
            resultado.competenciaId ||
            resultado.competencia_id ||
            competenciaIdEsperada,
            "A materialização retornou uma competência inválida.",
        );

    if (
        competenciaId !==
        competenciaIdEsperada
    ) {
        throw new Error(
            "A materialização retornou dados de outra competência.",
        );
    }

    const totalDocumentosExternos =
        numeroInteiroNaoNegativo(
            resultado.totalDocumentosExternos ||
            resultado.total_documentos_externos,
        );

    const itensCriados =
        numeroInteiroNaoNegativo(
            resultado.itensCriados ||
            resultado.itens_criados,
        );

    const itensExistentes =
        numeroInteiroNaoNegativo(
            resultado.itensExistentes ||
            resultado.itens_existentes,
        );

    const itensDisponiveis =
        numeroInteiroNaoNegativo(
            resultado.itensDisponiveis ||
            resultado.itens_disponiveis ||
            itensCriados + itensExistentes,
        );

    if (
        totalDocumentosExternos !==
            TOTAL_DOCUMENTOS_EXTERNOS_ESPERADOS ||
        itensDisponiveis !==
            TOTAL_DOCUMENTOS_EXTERNOS_ESPERADOS ||
        itensCriados + itensExistentes !==
            TOTAL_DOCUMENTOS_EXTERNOS_ESPERADOS
    ) {
        throw new Error(
            `A competência não retornou os ${TOTAL_DOCUMENTOS_EXTERNOS_ESPERADOS} documentos externos esperados.`,
        );
    }

    return Object.freeze({
        competenciaId,
        totalDocumentosExternos,
        itensCriados,
        itensExistentes,
        itensDisponiveis,
        materializadoEm:
            textoSeguro(
                resultado.materializadoEm ||
                resultado.materializado_em,
                80,
            ),
    });
}

export function criarCertidaoMensalMaterializacaoItensService({
    clienteSupabase,
} = {}) {
    const cliente =
        validarClienteSupabase(
            clienteSupabase,
        );

    async function materializarItensExternos({
        competenciaId,
    } = {}) {
        const competenciaIdNormalizado =
            validarUuid(
                competenciaId,
                "A competência é inválida para preparar os documentos externos.",
            );

        let resposta;

        try {
            resposta =
                await cliente.rpc(
                    CERTIDAO_MENSAL_RPC_MATERIALIZAR_ITENS_EXTERNOS,
                    {
                        p_competencia_id:
                            competenciaIdNormalizado,
                    },
                );
        }
        catch (erro) {
            const falha =
                new Error(
                    obterMensagemErro(
                        erro,
                    ),
                );

            falha.name =
                "CertidaoMensalMaterializacaoItensError";

            falha.cause =
                erro;

            throw falha;
        }

        if (resposta?.error) {
            const falha =
                new Error(
                    obterMensagemErro(
                        resposta.error,
                    ),
                );

            falha.name =
                "CertidaoMensalMaterializacaoItensError";

            falha.cause =
                resposta.error;

            throw falha;
        }

        return normalizarResultadoMaterializacao(
            resposta?.data,
            competenciaIdNormalizado,
        );
    }

    return Object.freeze({
        materializarItensExternos,
    });
}

async function obterClienteSupabasePadrao() {
    if (!clienteSupabasePadraoPromise) {
        clienteSupabasePadraoPromise =
            import(
                "../../../lib/supabaseClient.js"
            )
                .then(
                    ({ supabase }) =>
                        validarClienteSupabase(
                            supabase,
                        ),
                )
                .catch(
                    (erro) => {
                        clienteSupabasePadraoPromise =
                            null;

                        throw erro;
                    },
                );
    }

    return clienteSupabasePadraoPromise;
}

export async function materializarItensExternosCertidaoMensal(
    parametros,
) {
    const clienteSupabase =
        await obterClienteSupabasePadrao();

    return criarCertidaoMensalMaterializacaoItensService({
        clienteSupabase,
    }).materializarItensExternos(
        parametros,
    );
}
