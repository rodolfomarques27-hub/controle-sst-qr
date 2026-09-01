import {
    salvarPdfCertidaoMensal,
} from "./certidaoMensalDocumentPersistenceService.js";

import {
    criarCertidaoMensalUploadMassaPreflightVigenciaReader,
} from "./certidaoMensalUploadMassaPreflightVigenciaReaderService.js";

function textoSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    ).trim();
}

function criarErroCancelamento() {
    const erro =
        new Error(
            "Operação cancelada antes da persistência documental."
        );

    erro.name =
        "AbortError";

    erro.codigo =
        "ABORT_ERR";

    return erro;
}

function criarErroPreflightIndividual(
    mensagem,
    {
        codigo,
        etapa,
        causa = null,
        resultadoVigencia = null,
    } = {}
) {
    const erro =
        new Error(
            mensagem
        );

    erro.name =
        "CertidaoMensalIndividualPreflightError";

    erro.codigo =
        textoSeguro(
            codigo
        ) ||
        "PREFLIGHT_VIGENCIA_INDIVIDUAL_BLOQUEADA";

    erro.etapa =
        textoSeguro(
            etapa
        ) ||
        "vigencia_contratual";

    erro.cause =
        causa ||
        null;

    erro.resultadoVigencia =
        resultadoVigencia ||
        null;

    return erro;
}

function criarChaveLogicaIndividual(
    payload
) {
    const empresaId =
        textoSeguro(
            payload
                ?.empresa
                ?.id
        );

    const competencia =
        textoSeguro(
            payload
                ?.competencia
        );

    const tipoDocumento =
        textoSeguro(
            payload
                ?.item
                ?.tipoDocumento
        );

    if (
        !empresaId ||
        !competencia ||
        !tipoDocumento
    ) {
        throw criarErroPreflightIndividual(
            "O payload individual não possui empresa, competência e tipo documental suficientes para validar a vigência.",
            {
                codigo:
                    "PREFLIGHT_VIGENCIA_INDIVIDUAL_CHAVE_INVALIDA",

                etapa:
                    "validacao_chave",
            }
        );
    }

    return {
        empresaId,
        competencia,
        tipoDocumento,
    };
}

/*
 * ============================================================
 * SAFE_SCAN_CERT2_M3_A5_PREFLIGHT_VIGENCIA_INDIVIDUAL
 *
 * Ordem obrigatória:
 * 1. validar vigência via reader M1;
 * 2. somente se liberada, delegar UMA vez ao save normal.
 *
 * Não existe retry de escrita.
 * O lote não usa este serviço.
 * ============================================================
 */
export function criarCertidaoMensalIndividualPersistenceService({
    vigenciaReader,
    salvarDocumento =
        salvarPdfCertidaoMensal,
} = {}) {
    const lerVigencia =
        vigenciaReader
            ?.lerEstadoVigenciaPersistenciaPrincipalUploadMassa;

    if (
        typeof lerVigencia !==
        "function"
    ) {
        throw new Error(
            "Reader de vigência inválido para a persistência individual."
        );
    }

    if (
        typeof salvarDocumento !==
        "function"
    ) {
        throw new Error(
            "Executor de persistência individual inválido."
        );
    }

    async function salvarPdfCertidaoMensalIndividual({
        arquivo,
        payload,
        signal = null,
    } = {}) {
        if (
            signal
                ?.aborted
        ) {
            throw criarErroCancelamento();
        }

        const chaveLogica =
            criarChaveLogicaIndividual(
                payload
            );

        let estadoVigencia;

        try {
            estadoVigencia =
                await lerVigencia.call(
                    vigenciaReader,
                    {
                        chaveLogica,
                        signal,
                    }
                );
        }
        catch (error) {
            if (
                signal
                    ?.aborted ||
                error
                    ?.name ===
                    "AbortError"
            ) {
                throw criarErroCancelamento();
            }

            throw criarErroPreflightIndividual(
                "Não foi possível confirmar a vigência contratual antes da persistência individual.",
                {
                    codigo:
                        "PREFLIGHT_VIGENCIA_INDIVIDUAL_READER_FALHOU",

                    etapa:
                        "vigencia_reader",

                    causa:
                        error,
                }
            );
        }

        if (
            signal
                ?.aborted
        ) {
            throw criarErroCancelamento();
        }

        if (
            !estadoVigencia ||
            typeof estadoVigencia !==
                "object" ||
            estadoVigencia
                ?.leituraConcluida !==
                true
        ) {
            throw criarErroPreflightIndividual(
                "O reader de vigência retornou um estado inconclusivo. Persistência individual bloqueada.",
                {
                    codigo:
                        "PREFLIGHT_VIGENCIA_INDIVIDUAL_ESTADO_INVALIDO",

                    etapa:
                        "vigencia_validacao",

                    resultadoVigencia:
                        estadoVigencia ||
                        null,
                }
            );
        }

        if (
            estadoVigencia
                ?.liberada !==
                true
        ) {
            throw criarErroPreflightIndividual(
                textoSeguro(
                    estadoVigencia
                        ?.mensagem
                ) ||
                "A competência está fora da vigência contratual e não pode ser persistida.",
                {
                    codigo:
                        textoSeguro(
                            estadoVigencia
                                ?.codigo
                        ) ||
                        "PREFLIGHT_VIGENCIA_INDIVIDUAL_BLOQUEADA",

                    etapa:
                        "vigencia_contratual",

                    resultadoVigencia:
                        estadoVigencia,
                }
            );
        }

        /*
         * ÚNICA fronteira de escrita.
         *
         * Nenhuma repetição automática é permitida caso o save
         * tenha resultado remoto ambíguo.
         */
        return await salvarDocumento({
            arquivo,
            payload,
        });
    }

    return Object.freeze({
        salvarPdfCertidaoMensalIndividual,
    });
}

async function obterClienteSupabaseIndividual() {
    const modulo =
        await import(
            "../../../lib/supabaseClient.js"
        );

    const cliente =
        modulo
            ?.supabase;

    if (
        !cliente ||
        typeof cliente
            ?.rpc !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para o preflight individual."
        );
    }

    return cliente;
}

export async function salvarPdfCertidaoMensalIndividual(
    parametros = {}
) {
    const clienteSupabase =
        await obterClienteSupabaseIndividual();

    const vigenciaReader =
        criarCertidaoMensalUploadMassaPreflightVigenciaReader({
            clienteSupabase,
        });

    const servico =
        criarCertidaoMensalIndividualPersistenceService({
            vigenciaReader,

            salvarDocumento:
                salvarPdfCertidaoMensal,
        });

    return servico
        .salvarPdfCertidaoMensalIndividual(
            parametros
        );
}

export default salvarPdfCertidaoMensalIndividual;
