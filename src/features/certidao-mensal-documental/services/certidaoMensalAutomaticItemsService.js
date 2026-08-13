import {
    normalizarCompetenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";

export const VERSAO_SNAPSHOT_ASO_PCMSO_CERTIDAO_MENSAL =
    "1.0";

const TIPO_RELACAO_EMPREGADOS =
    "relacao-empregados";

const TIPO_ASO_PCMSO =
    "aso-pcmso";

function texto(
    valor,
) {
    return String(
        valor ?? "",
    ).trim();
}

function numeroInteiroNaoNegativo(
    valor,
    campo,
) {
    const numero =
        Number(
            valor,
        );

    if (
        !Number.isInteger(
            numero,
        ) ||
        numero < 0
    ) {
        throw new Error(
            `${campo} deve ser um número inteiro não negativo.`,
        );
    }

    return numero;
}

function objetoSeguro(
    valor,
) {
    return (
        valor &&
        typeof valor === "object" &&
        !Array.isArray(
            valor,
        )
    )
        ? valor
        : {};
}

function validarData(
    agora,
) {
    if (
        !(agora instanceof Date) ||
        Number.isNaN(
            agora.getTime(),
        )
    ) {
        throw new Error(
            "A data de geração do snapshot é inválida.",
        );
    }

    return agora;
}

function validarEvidenciaOcupacional({
    competencia,
    evidenciaInterna,
} = {}) {
    const evidencia =
        objetoSeguro(
            evidenciaInterna,
        );

    if (
        Object.keys(
            evidencia,
        ).length === 0
    ) {
        throw new Error(
            "A evidência interna é obrigatória para preparar o snapshot de ASO + PCMSO.",
        );
    }

    const competenciaNormalizada =
        normalizarCompetenciaCertidaoMensal(
            competencia,
        );

    const competenciaEvidencia =
        normalizarCompetenciaCertidaoMensal(
            evidencia.competencia,
        );

    if (
        competenciaNormalizada !==
        competenciaEvidencia
    ) {
        throw new Error(
            "A competência da evidência de ASO + PCMSO não corresponde à competência solicitada.",
        );
    }

    const totalAtivos =
        numeroInteiroNaoNegativo(
            evidencia.totalAtivos,
            "O total de colaboradores ativos",
        );

    const asosValidos =
        numeroInteiroNaoNegativo(
            evidencia.asosValidos,
            "O total de ASOs válidos",
        );

    const asosPendentes =
        numeroInteiroNaoNegativo(
            evidencia.asosPendentes,
            "O total de ASOs pendentes",
        );

    if (
        asosValidos +
        asosPendentes !==
        totalAtivos
    ) {
        throw new Error(
            "A soma de ASOs válidos e pendentes diverge do total de colaboradores ativos.",
        );
    }

    return {
        competencia:
            competenciaNormalizada,

        dataReferencia:
            texto(
                evidencia.dataReferencia,
            ),

        historicoConfiavel:
            evidencia.historicoConfiavel ===
            true,

        motivoHistorico:
            texto(
                evidencia.motivoHistorico,
            ),

        totalAtivos,

        asosValidos,

        asosPendentes,

        pcmsoLocalizado:
            Boolean(
                evidencia.pcmso,
            ),

        pcmsoVigente:
            evidencia.pcmsoVigente ===
            true,

        validadePcmso:
            texto(
                evidencia.validadePcmso,
            ),
    };
}

function determinarStatusAsoPcmso(
    evidencia,
) {
    return (
        evidencia.historicoConfiavel &&
        evidencia.totalAtivos > 0 &&
        evidencia.asosValidos ===
            evidencia.totalAtivos &&
        evidencia.asosPendentes === 0 &&
        evidencia.pcmsoLocalizado &&
        evidencia.pcmsoVigente
    )
        ? "CONFORME"
        : "PENDENTE";
}

function determinarStatusRelacaoEmpregados(
    snapshotMaoDeObra,
) {
    const snapshot =
        objetoSeguro(
            snapshotMaoDeObra,
        );

    return (
        snapshot.statusSnapshot ===
            "confirmado" &&
        snapshot.confirmadoPorUsuario ===
            true &&
        snapshot.requerConfirmacaoHumana ===
            false
    )
        ? "CONFORME"
        : "PENDENTE";
}

export function criarSnapshotAsoPcmsoAPartirDaEvidenciaInterna({
    competencia,
    empresaId,
    evidenciaInterna,
    agora = new Date(),
} = {}) {
    const empresa =
        texto(
            empresaId,
        );

    if (!empresa) {
        throw new Error(
            "A empresa é obrigatória para preparar o snapshot de ASO + PCMSO.",
        );
    }

    const dataGeracao =
        validarData(
            agora,
        );

    const evidencia =
        validarEvidenciaOcupacional({
            competencia,
            evidenciaInterna,
        });

    const competenciaAtual =
        normalizarCompetenciaCertidaoMensal(
            dataGeracao,
        );

    if (
        evidencia.competencia >
        competenciaAtual
    ) {
        throw new Error(
            "Não é permitido preparar snapshot de ASO + PCMSO para competência futura.",
        );
    }

    const statusConsolidacao =
        determinarStatusAsoPcmso(
            evidencia,
        );

    return Object.freeze({
        versao:
            VERSAO_SNAPSHOT_ASO_PCMSO_CERTIDAO_MENSAL,

        tipoDocumento:
            TIPO_ASO_PCMSO,

        competencia:
            evidencia.competencia,

        dataReferencia:
            evidencia.dataReferencia,

        empresaId:
            empresa,

        geradoEm:
            dataGeracao.toISOString(),

        historicoConfiavel:
            evidencia.historicoConfiavel,

        motivoHistorico:
            evidencia.motivoHistorico,

        totalAtivos:
            evidencia.totalAtivos,

        asosValidos:
            evidencia.asosValidos,

        asosPendentes:
            evidencia.asosPendentes,

        pcmsoLocalizado:
            evidencia.pcmsoLocalizado,

        pcmsoVigente:
            evidencia.pcmsoVigente,

        validadePcmso:
            evidencia.validadePcmso,

        statusConsolidacao,
    });
}

export function montarItensAutomaticosCertidaoMensal({
    snapshotMaoDeObra,
    snapshotAsoPcmso,
} = {}) {
    const snapshotMaoDeObraSeguro =
        objetoSeguro(
            snapshotMaoDeObra,
        );

    const snapshotAsoPcmsoSeguro =
        objetoSeguro(
            snapshotAsoPcmso,
        );

    const statusRelacaoEmpregados =
        determinarStatusRelacaoEmpregados(
            snapshotMaoDeObraSeguro,
        );

    const statusAsoPcmso =
        snapshotAsoPcmsoSeguro
            .statusConsolidacao ===
        "CONFORME"
            ? "CONFORME"
            : "PENDENTE";

    return Object.freeze([
        Object.freeze({
            tipoDocumento:
                TIPO_RELACAO_EMPREGADOS,

            titulo:
                "Relação de Empregados",

            status:
                statusRelacaoEmpregados,

            snapshot:
                snapshotMaoDeObraSeguro,
        }),

        Object.freeze({
            tipoDocumento:
                TIPO_ASO_PCMSO,

            titulo:
                "ASO + PCMSO",

            status:
                statusAsoPcmso,

            snapshot:
                snapshotAsoPcmsoSeguro,
        }),
    ]);
}