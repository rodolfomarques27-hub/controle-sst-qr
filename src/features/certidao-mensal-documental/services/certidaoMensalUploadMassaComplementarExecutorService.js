/*
 * ============================================================
 * SAFE_SCAN_EXECUTOR_COMPLEMENTAR_FAIL_CLOSED_F2
 *
 * Contrato isolado do futuro executor de evidências
 * complementares do upload em massa.
 *
 * IMPORTANTE:
 * - não importa Supabase;
 * - não importa Evidence Service;
 * - não chama Storage;
 * - não chama RPC;
 * - adapter é obrigatoriamente injetado pelo chamador;
 * - gate padrão é FECHADO;
 * - exige confirmação literal;
 * - executa no máximo UM índice por chamada.
 * ============================================================
 */

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

const LIMITE_PDF_BYTES =
    25 * 1024 * 1024;

const TIPOS_PERMITIDOS =
    new Set([
        "PAGAMENTO_SALARIAL",
        "ADIANTAMENTO_SALARIAL",
    ]);

export const CERTIDAO_UPLOAD_MASSA_CONFIRMACAO_EXECUCAO_COMPLEMENTAR =
    "EXECUTAR_1_EVIDENCIA_COMPLEMENTAR";

export const CERTIDAO_UPLOAD_MASSA_ESTADO_EXECUTOR_COMPLEMENTAR =
    Object.freeze({
        BLOQUEADO:
            "BLOQUEADO",

        PRONTO:
            "PRONTO_PARA_EXECUCAO_CONTROLADA",

        EXECUTADO:
            "EXECUTADO_ADAPTER",

        FALHA:
            "FALHA_ADAPTER",
    });

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarUuid(
    valor
) {
    const texto =
        textoSeguro(
            valor
        ).toLowerCase();

    return PADRAO_UUID.test(
        texto
    )
        ? texto
        : "";
}

function normalizarCompetencia(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    return PADRAO_COMPETENCIA.test(
        texto
    )
        ? texto
        : "";
}

function normalizarTipo(
    valor
) {
    const tipo =
        textoSeguro(
            valor
        ).toUpperCase();

    return TIPOS_PERMITIDOS.has(
        tipo
    )
        ? tipo
        : "";
}

function validarArquivo(
    arquivo
) {
    if (!arquivo) {
        return false;
    }

    const nome =
        textoSeguro(
            arquivo?.name
        );

    const mime =
        textoSeguro(
            arquivo?.type
        ).toLowerCase();

    const tamanho =
        Number(
            arquivo?.size
        );

    return (
        /\.pdf$/i.test(
            nome
        ) &&
        mime ===
            "application/pdf" &&
        Number.isFinite(
            tamanho
        ) &&
        tamanho > 0 &&
        tamanho <=
            LIMITE_PDF_BYTES &&
        typeof arquivo.arrayBuffer ===
            "function"
    );
}

function criarBloqueio(
    codigo,
    indice = null
) {
    return Object.freeze({
        permitido:
            false,

        estado:
            CERTIDAO_UPLOAD_MASSA_ESTADO_EXECUTOR_COMPLEMENTAR
                .BLOQUEADO,

        codigo,

        indice,

        payload:
            null,

        chamouAdapter:
            false,

        persistenciaExecutada:
            false,

        quantidadeExecutada:
            0,
    });
}

function planoDryRunIntegro(
    plano
) {
    return Boolean(
        plano &&
        typeof plano ===
            "object" &&
        !Array.isArray(
            plano
        ) &&
        plano?.dryRun ===
            true &&
        Array.isArray(
            plano?.itens
        ) &&
        plano?.persistenciaExecutada !==
            true &&
        plano?.executorHabilitado !==
            true &&
        plano?.autorizadoPersistir !==
            true &&
        plano?.chamouServicoPersistencia !==
            true &&
        plano?.chamouStorage !==
            true &&
        plano?.chamouRpc !==
            true
    );
}

function itemDryRunIntegro(
    item
) {
    return Boolean(
        item &&
        typeof item ===
            "object" &&
        !Array.isArray(
            item
        ) &&
        item?.estado ===
            "CANDIDATO_ESTRUTURAL" &&
        item?.codigo ===
            "DRY_RUN_CANDIDATO_ESTRUTURAL" &&
        item?.dryRun ===
            true &&
        item?.executavel ===
            false &&
        item?.autorizadoPersistir ===
            false &&
        item?.persistenciaExecutada !==
            true &&
        item?.executorHabilitado !==
            true
    );
}

function normalizarPayload(
    payload
) {
    if (
        !payload ||
        typeof payload !==
            "object" ||
        Array.isArray(
            payload
        )
    ) {
        return null;
    }

    const itemId =
        normalizarUuid(
            payload?.itemId
        );

    const empresaId =
        normalizarUuid(
            payload?.empresaId
        );

    const competencia =
        normalizarCompetencia(
            payload?.competencia
        );

    const tipoEvidencia =
        normalizarTipo(
            payload?.tipoEvidencia
        );

    const colaboradorId =
        normalizarUuid(
            payload?.colaboradorId
        );

    const arquivo =
        payload?.arquivo ||
        null;

    if (
        !itemId ||
        !empresaId ||
        !competencia ||
        !tipoEvidencia ||
        !colaboradorId ||
        !validarArquivo(
            arquivo
        )
    ) {
        return null;
    }

    return Object.freeze({
        arquivo,

        itemId,

        empresaId,

        competencia,

        tipoEvidencia,

        colaboradorId,
    });
}

export function avaliarExecucaoComplementarControlada({
    planoDryRun = null,
    indiceSelecionado = null,
    habilitarPersistenciaComplementar = false,
    confirmacaoExecucao = "",
} = {}) {
    /*
     * Fail closed #1:
     * gate explícito.
     */
    if (
        habilitarPersistenciaComplementar !==
        true
    ) {
        return criarBloqueio(
            "GATE_PERSISTENCIA_COMPLEMENTAR_FECHADO"
        );
    }

    /*
     * Fail closed #2:
     * confirmação literal independente.
     */
    if (
        confirmacaoExecucao !==
        CERTIDAO_UPLOAD_MASSA_CONFIRMACAO_EXECUCAO_COMPLEMENTAR
    ) {
        return criarBloqueio(
            "CONFIRMACAO_EXPLICITA_AUSENTE"
        );
    }

    if (
        !planoDryRunIntegro(
            planoDryRun
        )
    ) {
        return criarBloqueio(
            "PLANO_DRY_RUN_INVALIDO"
        );
    }

    if (
        !Number.isInteger(
            indiceSelecionado
        ) ||
        indiceSelecionado < 0
    ) {
        return criarBloqueio(
            "INDICE_EXECUCAO_INVALIDO"
        );
    }

    const correspondentes =
        planoDryRun.itens.filter(
            (item) =>
                item?.indice ===
                indiceSelecionado
        );

    if (
        correspondentes.length !==
        1
    ) {
        return criarBloqueio(
            "ALVO_EXECUCAO_NAO_UNICO",
            indiceSelecionado
        );
    }

    const item =
        correspondentes[0];

    if (
        !itemDryRunIntegro(
            item
        )
    ) {
        return criarBloqueio(
            "ALVO_DRY_RUN_NAO_ELEGIVEL",
            indiceSelecionado
        );
    }

    const payload =
        normalizarPayload(
            item?.payloadIntencao
        );

    if (!payload) {
        return criarBloqueio(
            "PAYLOAD_INTENCAO_INVALIDO",
            indiceSelecionado
        );
    }

    return Object.freeze({
        permitido:
            true,

        estado:
            CERTIDAO_UPLOAD_MASSA_ESTADO_EXECUTOR_COMPLEMENTAR
                .PRONTO,

        codigo:
            "EXECUCAO_COMPLEMENTAR_CONTROLADA_PRONTA",

        indice:
            indiceSelecionado,

        payload,

        chamouAdapter:
            false,

        persistenciaExecutada:
            false,

        quantidadeExecutada:
            0,
    });
}

export async function executarEvidenciaComplementarControlada({
    planoDryRun = null,
    indiceSelecionado = null,
    habilitarPersistenciaComplementar = false,
    confirmacaoExecucao = "",
    persistirEvidencia = null,
} = {}) {
    const avaliacao =
        avaliarExecucaoComplementarControlada({
            planoDryRun,
            indiceSelecionado,
            habilitarPersistenciaComplementar,
            confirmacaoExecucao,
        });

    if (!avaliacao.permitido) {
        return avaliacao;
    }

    /*
     * O adapter só é validado APÓS todos os gates.
     * Com gate fechado, nem a existência do adapter é necessária.
     */
    if (
        typeof persistirEvidencia !==
        "function"
    ) {
        return criarBloqueio(
            "ADAPTER_PERSISTENCIA_AUSENTE",
            indiceSelecionado
        );
    }

    try {
        const resultadoAdapter =
            await persistirEvidencia(
                avaliacao.payload
            );

        return Object.freeze({
            permitido:
                true,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_EXECUTOR_COMPLEMENTAR
                    .EXECUTADO,

            codigo:
                "EXECUCAO_ADAPTER_CONCLUIDA",

            indice:
                indiceSelecionado,

            payload:
                avaliacao.payload,

            chamouAdapter:
                true,

            persistenciaExecutada:
                true,

            quantidadeExecutada:
                1,

            resultadoAdapter:
                resultadoAdapter ??
                null,
        });
    }
    catch (error) {
        return Object.freeze({
            permitido:
                false,

            estado:
                CERTIDAO_UPLOAD_MASSA_ESTADO_EXECUTOR_COMPLEMENTAR
                    .FALHA,

            codigo:
                "FALHA_EXECUCAO_ADAPTER",

            indice:
                indiceSelecionado,

            payload:
                avaliacao.payload,

            chamouAdapter:
                true,

            persistenciaExecutada:
                false,

            quantidadeExecutada:
                0,

            erro:
                error ||
                null,
        });
    }
}