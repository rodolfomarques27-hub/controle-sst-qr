import {
    criarPayloadDecisaoDocumentoCertidaoMensal,
} from "../domain/certidaoMensalConferenciaContract.js";

export const CERTIDAO_MENSAL_RPC_REGISTRAR_DECISAO =
    "registrar_decisao_certidao_mensal_documento";

let clienteSupabasePadraoPromise =
    null;

function validarClienteSupabase(
    clienteSupabase
) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.rpc !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para conferência documental."
        );
    }

    return clienteSupabase;
}

async function obterClienteSupabasePadrao() {
    if (!clienteSupabasePadraoPromise) {
        clienteSupabasePadraoPromise =
            import(
                "../../../lib/supabaseClient.js"
            )
                .then(
                    (modulo) =>
                        validarClienteSupabase(
                            modulo.supabase
                        )
                );
    }

    return clienteSupabasePadraoPromise;
}

function criarErroConferencia(
    error
) {
    const mensagem =
        String(
            error?.message ||
            "Não foi possível registrar a decisão documental."
        ).trim();

    const erro =
        new Error(
            mensagem
        );

    erro.code =
        error?.code || null;

    erro.details =
        error?.details || null;

    erro.hint =
        error?.hint || null;

    return erro;
}

export function criarCertidaoMensalConferenciaService({
    clienteSupabase,
} = {}) {
    const cliente =
        validarClienteSupabase(
            clienteSupabase
        );

    async function registrarDecisaoDocumento(
        parametros = {}
    ) {
        const payload =
            criarPayloadDecisaoDocumentoCertidaoMensal(
                parametros
            );

        const tempoLimiteMs =
            Math.max(
                10,
                Number(
                    parametros
                        ?.tempoLimiteMs
                ) ||
                12000
            );

        const tempoReconciliacaoMs =
            Math.max(
                10,
                Number(
                    parametros
                        ?.tempoReconciliacaoMs
                ) ||
                5000
            );

        const aguardarComLimite =
            async (
                promessa,
                limiteMs
            ) => {
                let temporizador =
                    null;

                try {
                    return await Promise.race([
                        Promise
                            .resolve(
                                promessa
                            )
                            .then(
                                (valor) => ({
                                    tipo:
                                        "resposta",
                                    valor,
                                }),
                                (error) => ({
                                    tipo:
                                        "erro",
                                    error,
                                })
                            ),

                        new Promise(
                            (resolve) => {
                                temporizador =
                                    setTimeout(
                                        () => {
                                            resolve({
                                                tipo:
                                                    "timeout",
                                            });
                                        },
                                        limiteMs
                                    );
                            }
                        ),
                    ]);
                }
                finally {
                    if (temporizador) {
                        clearTimeout(
                            temporizador
                        );
                    }
                }
            };

        const chamadaRpc =
            cliente.rpc(
                CERTIDAO_MENSAL_RPC_REGISTRAR_DECISAO,
                {
                    p_item_id:
                        payload.itemId,

                    p_versao_atual_id:
                        payload.versaoAtualId,

                    p_decisao:
                        payload.decisao,

                    p_motivo:
                        payload.motivo,

                    p_observacao:
                        payload.observacao,

                    p_decidido_em:
                        payload.decididoEm,
                }
            );

        const desfechoRpc =
            await aguardarComLimite(
                chamadaRpc,
                tempoLimiteMs
            );

        if (
            desfechoRpc.tipo ===
            "erro"
        ) {
            throw criarErroConferencia(
                desfechoRpc.error
            );
        }

        if (
            desfechoRpc.tipo ===
            "timeout"
        ) {
            let consultaPersistida =
                null;

            try {
                const consulta =
                    cliente
                        .from(
                            "certidao_mensal_itens"
                        )
                        .select(
                            "id,status,versao_atual_id,status_consulta_oficial"
                        )
                        .eq(
                            "id",
                            payload.itemId
                        )
                        .maybeSingle();

                const desfechoConsulta =
                    await aguardarComLimite(
                        consulta,
                        tempoReconciliacaoMs
                    );

                if (
                    desfechoConsulta.tipo ===
                    "resposta"
                ) {
                    consultaPersistida =
                        desfechoConsulta.valor;
                }
            }
            catch {
                consultaPersistida =
                    null;
            }

            const itemPersistido =
                consultaPersistida
                    ?.data ||
                null;

            const statusPersistido =
                String(
                    itemPersistido
                        ?.status ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const versaoPersistida =
                String(
                    itemPersistido
                        ?.versao_atual_id ||
                    ""
                ).trim();

            if (
                !consultaPersistida
                    ?.error &&
                itemPersistido &&
                statusPersistido ===
                    payload.decisao &&
                versaoPersistida ===
                    payload.versaoAtualId
            ) {
                return {
                    itemId:
                        payload.itemId,

                    versaoAtualId:
                        payload.versaoAtualId,

                    decisao:
                        payload.decisao,

                    statusAtual:
                        statusPersistido,

                    statusConsultaOficial:
                        itemPersistido
                            ?.status_consulta_oficial ||
                        "",

                    reconciliadoAposTimeout:
                        true,
                };
            }

            const erroTimeout =
                new Error(
                    "A confirmação demorou mais do que o esperado. Atualize a tela para conferir o estado salvo antes de tentar novamente."
                );

            erroTimeout.code =
                "CERTIDAO_MENSAL_TIMEOUT_CONFIRMACAO";

            throw erroTimeout;
        }

        const resposta =
            desfechoRpc.valor;

        if (resposta?.error) {
            throw criarErroConferencia(
                resposta.error
            );
        }

        if (!resposta?.data) {
            throw new Error(
                "A decisão documental não retornou confirmação do servidor."
            );
        }

        return resposta.data;
    }

    return {
        registrarDecisaoDocumento,
    };
}

export async function registrarDecisaoDocumentoCertidaoMensal(
    parametros
) {
    const cliente =
        await obterClienteSupabasePadrao();

    const servico =
        criarCertidaoMensalConferenciaService({
            clienteSupabase:
                cliente,
        });

    return servico
        .registrarDecisaoDocumento(
            parametros
        );
}
