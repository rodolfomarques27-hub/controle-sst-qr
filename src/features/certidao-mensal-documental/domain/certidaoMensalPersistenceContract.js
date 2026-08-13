export const CERTIDAO_MENSAL_VERSAO_CONTRATO = 1;

export const CERTIDAO_MENSAL_STATUS_COMPETENCIA =
    Object.freeze({
        ABERTA: "ABERTA",
        EM_CONFERENCIA: "EM_CONFERENCIA",
        COM_PENDENCIAS: "COM_PENDENCIAS",
        CONFORME: "CONFORME",
        FECHADA: "FECHADA",
        REABERTA: "REABERTA",
    });

export const CERTIDAO_MENSAL_STATUS_ITEM =
    Object.freeze({
        PENDENTE: "PENDENTE",
        ENVIADO: "ENVIADO",
        EM_ANALISE: "EM_ANALISE",
        CONFORME: "CONFORME",
        NAO_CONFORME: "NAO_CONFORME",
        REENVIO_SOLICITADO:
            "REENVIO_SOLICITADO",
        VENCIDO: "VENCIDO",
        DISPENSADO: "DISPENSADO",
    });

export const CERTIDAO_MENSAL_ORIGEM_ITEM =
    Object.freeze({
        UPLOAD: "UPLOAD",
        SISTEMA: "SISTEMA",
    });

export const CERTIDAO_MENSAL_STATUS_CONSULTA_OFICIAL =
    Object.freeze({
        NAO_APLICAVEL: "NAO_APLICAVEL",
        PENDENTE: "PENDENTE",
        CONFIRMADA: "CONFIRMADA",
        DIVERGENTE: "DIVERGENTE",
    });

export const CERTIDAO_MENSAL_EVENTO =
    Object.freeze({
        COMPETENCIA_ABERTA:
            "COMPETENCIA_ABERTA",
        DOCUMENTO_ENVIADO:
            "DOCUMENTO_ENVIADO",
        DOCUMENTO_RECUSADO:
            "DOCUMENTO_RECUSADO",
        DOCUMENTO_SUBSTITUIDO:
            "DOCUMENTO_SUBSTITUIDO",
        PRE_AVALIACAO_CONCLUIDA:
            "PRE_AVALIACAO_CONCLUIDA",
        DOCUMENTO_CONFIRMADO:
            "DOCUMENTO_CONFIRMADO",
        REENVIO_SOLICITADO:
            "REENVIO_SOLICITADO",
        CONSULTA_OFICIAL_REGISTRADA:
            "CONSULTA_OFICIAL_REGISTRADA",
        ITEM_AUTOMATICO_CONSOLIDADO:
            "ITEM_AUTOMATICO_CONSOLIDADO",
        COMPETENCIA_FECHADA:
            "COMPETENCIA_FECHADA",
        COMPETENCIA_REABERTA:
            "COMPETENCIA_REABERTA",
    });

const PADRAO_COMPETENCIA_BR =
    /^(0[1-9]|1[0-2])\/(\d{4})$/;

const PADRAO_COMPETENCIA_ANO_MES =
    /^(\d{4})-(0[1-9]|1[0-2])$/;

const PADRAO_COMPETENCIA_ISO =
    /^(\d{4})-(0[1-9]|1[0-2])-01$/;

function criarCompetenciaIso(
    ano,
    mes
) {
    const anoNumerico =
        Number(ano);

    const mesNumerico =
        Number(mes);

    if (
        !Number.isInteger(anoNumerico) ||
        anoNumerico < 2000 ||
        anoNumerico > 9999
    ) {
        throw new Error(
            "O ano da competência é inválido."
        );
    }

    if (
        !Number.isInteger(mesNumerico) ||
        mesNumerico < 1 ||
        mesNumerico > 12
    ) {
        throw new Error(
            "O mês da competência é inválido."
        );
    }

    return (
        `${String(anoNumerico).padStart(4, "0")}-` +
        `${String(mesNumerico).padStart(2, "0")}-01`
    );
}

export function normalizarCompetenciaCertidaoMensal(
    valor
) {
    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) {
            throw new Error(
                "A data da competência é inválida."
            );
        }

        return criarCompetenciaIso(
            valor.getUTCFullYear(),
            valor.getUTCMonth() + 1
        );
    }

    const texto =
        String(valor || "").trim();

    const correspondenciaBr =
        texto.match(
            PADRAO_COMPETENCIA_BR
        );

    if (correspondenciaBr) {
        return criarCompetenciaIso(
            correspondenciaBr[2],
            correspondenciaBr[1]
        );
    }

    const correspondenciaAnoMes =
        texto.match(
            PADRAO_COMPETENCIA_ANO_MES
        );

    if (correspondenciaAnoMes) {
        return criarCompetenciaIso(
            correspondenciaAnoMes[1],
            correspondenciaAnoMes[2]
        );
    }

    const correspondenciaIso =
        texto.match(
            PADRAO_COMPETENCIA_ISO
        );

    if (correspondenciaIso) {
        return criarCompetenciaIso(
            correspondenciaIso[1],
            correspondenciaIso[2]
        );
    }

    throw new Error(
        "A competência deve usar MM/AAAA, AAAA-MM ou AAAA-MM-01."
    );
}

export function formatarCompetenciaCertidaoMensal(
    valor
) {
    const competencia =
        normalizarCompetenciaCertidaoMensal(
            valor
        );

    const [
        ano,
        mes,
    ] = competencia.split("-");

    return `${mes}/${ano}`;
}

export function obterDataReferenciaCertidaoMensal(
    valor
) {
    const competencia =
        normalizarCompetenciaCertidaoMensal(
            valor
        );

    const [
        anoTexto,
        mesTexto,
    ] = competencia.split("-");

    const ano =
        Number(anoTexto);

    const mes =
        Number(mesTexto);

    const ultimoDia =
        new Date(
            Date.UTC(
                ano,
                mes,
                0
            )
        );

    return ultimoDia
        .toISOString()
        .slice(0, 10);
}

export function normalizarCodigoTipoDocumentoCertidaoMensal(
    valor
) {
    const codigo =
        String(valor || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");

    if (!codigo) {
        throw new Error(
            "O tipo documental da Certidão Mensal é obrigatório."
        );
    }

    return codigo;
}

export function criarChaveCompetenciaEmpresaCertidaoMensal({
    empresaId,
    competencia,
}) {
    const empresaIdSeguro =
        String(empresaId || "").trim();

    if (!empresaIdSeguro) {
        throw new Error(
            "O identificador da empresa é obrigatório."
        );
    }

    return (
        `${empresaIdSeguro}:` +
        normalizarCompetenciaCertidaoMensal(
            competencia
        )
    );
}

export function criarChaveItemCertidaoMensal({
    empresaId,
    competencia,
    tipoDocumento,
}) {
    return (
        `${criarChaveCompetenciaEmpresaCertidaoMensal({
            empresaId,
            competencia,
        })}:` +
        normalizarCodigoTipoDocumentoCertidaoMensal(
            tipoDocumento
        )
    );
}

export function statusItemCertidaoMensalEhValido(
    valor
) {
    return Object
        .values(
            CERTIDAO_MENSAL_STATUS_ITEM
        )
        .includes(valor);
}

export function statusCompetenciaCertidaoMensalEhValido(
    valor
) {
    return Object
        .values(
            CERTIDAO_MENSAL_STATUS_COMPETENCIA
        )
        .includes(valor);
}
