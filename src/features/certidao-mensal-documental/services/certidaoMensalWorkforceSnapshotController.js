import {
    normalizarCompetenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";
import {
    criarSnapshotMaoDeObraCertidaoMensal,
} from "./certidaoMensalWorkforceSnapshotService.js";

function texto(valor) {
    return String(valor ?? "").trim();
}

function numeroInteiroNaoNegativo(
    valor,
    campo
) {
    const numero =
        Number(valor);

    if (
        !Number.isInteger(numero) ||
        numero < 0
    ) {
        throw new Error(
            `${campo} deve ser um número inteiro não negativo.`
        );
    }

    return numero;
}

function validarEvidenciaInterna(
    evidenciaInterna,
    competencia
) {
    if (
        !evidenciaInterna ||
        typeof evidenciaInterna !== "object"
    ) {
        throw new Error(
            "A evidência interna é obrigatória para preparar o snapshot."
        );
    }

    const competenciaSolicitada =
        normalizarCompetenciaCertidaoMensal(
            competencia
        );

    const competenciaEvidencia =
        normalizarCompetenciaCertidaoMensal(
            evidenciaInterna.competencia
        );

    if (
        competenciaSolicitada !==
        competenciaEvidencia
    ) {
        throw new Error(
            "A competência da evidência interna não corresponde à competência solicitada."
        );
    }

    const colaboradoresResolvidos =
        Array.isArray(
            evidenciaInterna
                .colaboradoresRelacaoCompetencia
        )
            ? evidenciaInterna
                .colaboradoresRelacaoCompetencia
            : evidenciaInterna
                .colaboradoresAtivosBaseAtual;

    if (
        !Array.isArray(
            colaboradoresResolvidos
        )
    ) {
        throw new Error(
            "A evidência interna não possui a lista de colaboradores resolvidos."
        );
    }

    const totalAtivos =
        numeroInteiroNaoNegativo(
            evidenciaInterna
                .totalRelacaoCompetencia ??
            evidenciaInterna
                .totalAtivos,
            "O total de colaboradores ativos"
        );

    if (
        totalAtivos !==
        colaboradoresResolvidos.length
    ) {
        throw new Error(
            "O total de colaboradores ativos diverge da lista resolvida."
        );
    }

    return {
        competencia:
            competenciaSolicitada,
        colaboradoresResolvidos,
        historicoConfiavel:
            evidenciaInterna
                .historicoRelacaoConfiavel === true ||
            (
                evidenciaInterna
                    .historicoRelacaoConfiavel === undefined &&
                evidenciaInterna
                    .historicoConfiavel === true
            ),
    };
}

function determinarOrigemDados({
    competencia,
    historicoConfiavel,
    confirmar,
    agora,
}) {
    const competenciaAtual =
        normalizarCompetenciaCertidaoMensal(
            agora
        );

    if (competencia === competenciaAtual) {
        return "cadastro_atual";
    }

    if (historicoConfiavel) {
        return "historico_estruturado";
    }

    return confirmar
        ? "confirmacao_manual"
        : "cadastro_atual";
}

export function criarSnapshotMaoDeObraAPartirDaEvidenciaInterna({
    competencia,
    empresaId,
    evidenciaInterna,
    confirmar = false,
    usuarioId = "",
    agora = new Date(),
} = {}) {
    const empresa =
        texto(empresaId);

    if (!empresa) {
        throw new Error(
            "A empresa é obrigatória para preparar o snapshot."
        );
    }

    const evidencia =
        validarEvidenciaInterna(
            evidenciaInterna,
            competencia
        );

    const confirmado =
        confirmar === true;

    const origemDados =
        determinarOrigemDados({
            competencia:
                evidencia.competencia,
            historicoConfiavel:
                evidencia.historicoConfiavel,
            confirmar:
                confirmado,
            agora,
        });

    return criarSnapshotMaoDeObraCertidaoMensal({
        competencia:
            evidencia.competencia,
        empresaId:
            empresa,
        colaboradoresResolvidos:
            evidencia.colaboradoresResolvidos,
        origemDados,
        confirmadoPorUsuario:
            confirmado,
        usuarioConfirmacaoId:
            texto(usuarioId),
        agora,
    });
}
