/*
 * ============================================================
 * CERT2 — READER DE VIGÊNCIA CONTRATUAL PRÉ-WRITE
 *
 * Responsabilidade única:
 *
 * confirmar, imediatamente antes do primeiro write, se:
 *
 * empresa + competência
 *
 * continuam liberadas pela vigência contratual oficial do banco.
 *
 * Este módulo:
 * - usa a RPC canônica já existente;
 * - não cria competência;
 * - não cria item;
 * - não cria versão;
 * - não acessa Storage;
 * - não executa retry;
 * - não recalcula vigência no frontend.
 *
 * Qualquer estado técnico inconclusivo permanece fail-closed.
 * ============================================================
 */

const RPC_VALIDAR_VIGENCIA =
    "certidao_mensal_validar_vigencia_contratual";

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

const PADRAO_TIPO_DOCUMENTO =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SQLSTATE_VIGENCIA_BLOQUEADA =
    "55000";

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarChaveLogica(
    valor
) {
    const empresaId =
        textoSeguro(
            valor?.empresaId
        );

    const competencia =
        textoSeguro(
            valor?.competencia
        );

    const tipoDocumento =
        textoSeguro(
            valor?.tipoDocumento
        ).toLowerCase();

    if (
        !PADRAO_UUID.test(
            empresaId
        ) ||
        !PADRAO_COMPETENCIA.test(
            competencia
        ) ||
        !PADRAO_TIPO_DOCUMENTO.test(
            tipoDocumento
        )
    ) {
        return null;
    }

    return Object.freeze({
        empresaId,
        competencia,
        tipoDocumento,
    });
}

function criarErroVigenciaReader(
    mensagem,
    {
        codigo =
            "PREFLIGHT_VIGENCIA_LEITURA_REMOTA_FALHOU",

        etapa =
            "",

        causa =
            null,
    } = {}
) {
    const erro =
        new Error(
            mensagem
        );

    erro.name =
        "CertidaoMensalUploadMassaPreflightVigenciaReaderError";

    erro.codigo =
        textoSeguro(
            codigo
        );

    erro.etapa =
        textoSeguro(
            etapa
        );

    if (causa) {
        erro.cause =
            causa;
    }

    return erro;
}

function criarErroCancelamento() {
    const erro =
        criarErroVigenciaReader(
            "A validação de vigência pré-write foi cancelada.",
            {
                codigo:
                    "PREFLIGHT_VIGENCIA_CANCELADO",

                etapa:
                    "cancelamento",
            }
        );

    erro.name =
        "AbortError";

    return erro;
}

function erroLeitura(
    mensagem,
    etapa,
    causa = null
) {
    return criarErroVigenciaReader(
        mensagem,
        {
            codigo:
                "PREFLIGHT_VIGENCIA_LEITURA_REMOTA_FALHOU",

            etapa,

            causa,
        }
    );
}

function erroInconsistencia(
    mensagem,
    etapa
) {
    return criarErroVigenciaReader(
        mensagem,
        {
            codigo:
                "PREFLIGHT_VIGENCIA_ESTADO_REMOTO_INCONSISTENTE",

            etapa,
        }
    );
}

function criarResultado({
    chaveLogica,
    liberada = false,
    classificacao = "",
    codigo = "",
    mensagem = "",
}) {
    return Object.freeze({
        versao:
            1,

        leituraConcluida:
            true,

        chaveLogica,

        liberada:
            Boolean(
                liberada
            ),

        classificacao:
            textoSeguro(
                classificacao
            ).toUpperCase(),

        codigo:
            textoSeguro(
                codigo
            ),

        mensagem:
            textoSeguro(
                mensagem
            ),
    });
}

async function executarRpc({
    clienteSupabase,
    chaveLogica,
    signal,
}) {
    try {
        let requisicao =
            clienteSupabase.rpc(
                RPC_VALIDAR_VIGENCIA,
                {
                    p_empresa_id:
                        chaveLogica
                            .empresaId,

                    p_competencia:
                        chaveLogica
                            .competencia,

                    p_operacao:
                        "persistir documento CERT2",
                }
            );

        if (
            signal &&
            typeof requisicao
                ?.abortSignal ===
                "function"
        ) {
            requisicao =
                requisicao.abortSignal(
                    signal
                );
        }

        return await requisicao;
    }
    catch (error) {
        if (
            signal?.aborted ||
            error?.name ===
                "AbortError"
        ) {
            throw criarErroCancelamento();
        }

        if (
            error?.name ===
            "CertidaoMensalUploadMassaPreflightVigenciaReaderError"
        ) {
            throw error;
        }

        throw erroLeitura(
            "Não foi possível validar a vigência contratual imediatamente antes da persistência.",
            "rpc_vigencia",
            error
        );
    }
}

export function criarCertidaoMensalUploadMassaPreflightVigenciaReader({
    clienteSupabase = null,
} = {}) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.rpc !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para o reader de vigência do preflight."
        );
    }

    async function lerEstadoVigenciaPersistenciaPrincipalUploadMassa({
        chaveLogica = null,
        signal = null,
    } = {}) {
        if (signal?.aborted) {
            throw criarErroCancelamento();
        }

        const chave =
            normalizarChaveLogica(
                chaveLogica
            );

        if (!chave) {
            throw criarErroVigenciaReader(
                "A chave lógica é inválida para validar a vigência contratual.",
                {
                    codigo:
                        "PREFLIGHT_VIGENCIA_CHAVE_INVALIDA",

                    etapa:
                        "validacao_chave",
                }
            );
        }

        const resposta =
            await executarRpc({
                clienteSupabase,
                chaveLogica:
                    chave,
                signal,
            });

        if (signal?.aborted) {
            throw criarErroCancelamento();
        }

        if (
            !resposta ||
            typeof resposta !==
                "object" ||
            !Object.prototype.hasOwnProperty.call(
                resposta,
                "data"
            ) ||
            !Object.prototype.hasOwnProperty.call(
                resposta,
                "error"
            )
        ) {
            throw erroInconsistencia(
                "A RPC de vigência não retornou uma resposta canônica.",
                "validacao_resposta_rpc"
            );
        }

        if (resposta.error) {
            const sqlState =
                textoSeguro(
                    resposta
                        .error
                        ?.code
                ).toUpperCase();

            const mensagem =
                textoSeguro(
                    resposta
                        .error
                        ?.message
                ) ||
                "A vigência contratual não autorizou a persistência.";

            /*
             * A função oficial utiliza SQLSTATE 55000 quando
             * a competência não está liberada pela vigência.
             *
             * Isto é uma rejeição de negócio confirmada,
             * não um erro técnico inconclusivo.
             */
            if (
                sqlState ===
                SQLSTATE_VIGENCIA_BLOQUEADA
            ) {
                return criarResultado({
                    chaveLogica:
                        chave,

                    liberada:
                        false,

                    codigo:
                        "VIGENCIA_CONTRATUAL_BLOQUEADA",

                    mensagem,
                });
            }

            throw erroLeitura(
                "O Supabase não conseguiu confirmar a vigência contratual pré-write.",
                "rpc_vigencia",
                resposta.error
            );
        }

        const classificacao =
            textoSeguro(
                resposta.data
            ).toUpperCase();

        /*
         * A RPC oficial somente deve retornar normalmente quando
         * a competência estiver DURANTE_DO_CONTRATO.
         *
         * Qualquer outro retorno sem erro é estado inconsistente.
         */
        if (
            classificacao !==
            "DURANTE_DO_CONTRATO"
        ) {
            throw erroInconsistencia(
                "A RPC de vigência retornou um estado inesperado sem bloquear a operação.",
                "validacao_resultado_vigencia"
            );
        }

        return criarResultado({
            chaveLogica:
                chave,

            liberada:
                true,

            classificacao,

            codigo:
                "VIGENCIA_CONTRATUAL_OK",

            mensagem:
                "",
        });
    }

    return Object.freeze({
        lerEstadoVigenciaPersistenciaPrincipalUploadMassa,
    });
}
