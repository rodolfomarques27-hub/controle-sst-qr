/*
 * ============================================================
 * CERT2 — REVISÃO HISTÓRICA — SINGLE-FLIGHT FAIL-CLOSED
 *
 * Responsabilidade única:
 *
 * garantir que uma instância do fluxo de revisão histórica
 * possua no máximo uma operação ativa por vez.
 *
 * Características:
 * - trava síncrona antes do executor;
 * - segunda chamada é rejeitada antes do executor;
 * - nenhuma fila implícita;
 * - nenhum retry;
 * - liberação obrigatória em finally;
 * - independente de Supabase, Storage e React.
 * ============================================================
 */

export const
    CERTIDAO_MENSAL_REVISAO_HISTORICA_SINGLE_FLIGHT_CODIGO =
        "REVISAO_HISTORICA_EM_ANDAMENTO";

function criarErroOperacaoEmAndamento() {
    const erro =
        new Error(
            "Já existe uma revisão histórica em andamento. Aguarde a operação atual terminar."
        );

    erro.name =
        "CertidaoMensalRevisaoHistoricaSingleFlightError";

    erro.codigo =
        CERTIDAO_MENSAL_REVISAO_HISTORICA_SINGLE_FLIGHT_CODIGO;

    return erro;
}

export function criarCertidaoMensalRevisaoHistoricaSingleFlight() {
    let emAndamento =
        false;

    async function executar(
        executor
    ) {
        if (
            typeof executor !==
            "function"
        ) {
            throw new TypeError(
                "Executor inválido para o single-flight da revisão histórica."
            );
        }

        /*
         * Esta checagem e a atribuição abaixo acontecem
         * sincronamente, antes do primeiro await.
         */
        if (emAndamento) {
            throw criarErroOperacaoEmAndamento();
        }

        emAndamento =
            true;

        try {
            return await executor();
        }
        finally {
            emAndamento =
                false;
        }
    }

    function estaEmAndamento() {
        return emAndamento;
    }

    return Object.freeze({
        executar,
        estaEmAndamento,
    });
}
