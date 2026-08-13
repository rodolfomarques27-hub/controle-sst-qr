import {
    normalizarCompetenciaCertidaoMensal,
    obterDataReferenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";

export const VERSAO_SNAPSHOT_MAO_DE_OBRA_CERTIDAO_MENSAL = 1;

const ORIGENS_SNAPSHOT = new Set([
    "cadastro_atual",
    "historico_estruturado",
    "confirmacao_manual",
]);

function texto(valor) {
    return String(valor ?? "").trim();
}

function dataIso(valor) {
    const data = texto(valor).slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return "";
    }

    const [
        ano,
        mes,
        dia,
    ] = data
        .split("-")
        .map(Number);

    if (
        ano < 1900 ||
        mes < 1 ||
        mes > 12 ||
        dia < 1 ||
        dia > 31
    ) {
        return "";
    }

    const dataUtc =
        new Date(
            Date.UTC(
                ano,
                mes - 1,
                dia
            )
        );

    const valida =
        dataUtc.getUTCFullYear() === ano &&
        dataUtc.getUTCMonth() === mes - 1 &&
        dataUtc.getUTCDate() === dia;

    return valida
        ? data
        : "";
}

function obterEmpresaId(registro) {
    return texto(
        registro?.empresaId ||
        registro?.empresa_id
    );
}

function normalizarColaborador(
    colaborador,
    empresaId
) {
    const id = texto(
        colaborador?.id ||
        colaborador?.colaboradorId ||
        colaborador?.colaborador_id
    );

    if (!id) {
        throw new Error(
            "Todo colaborador do snapshot deve possuir identificador."
        );
    }

    const empresaColaborador =
        obterEmpresaId(colaborador);

    if (
        empresaColaborador &&
        empresaColaborador !== empresaId
    ) {
        throw new Error(
            "O snapshot recebeu colaborador vinculado a outra empresa."
        );
    }

    const nome = texto(
        colaborador?.nome ||
        colaborador?.nomeCompleto ||
        colaborador?.nome_completo
    );

    if (!nome) {
        throw new Error(
            "Todo colaborador do snapshot deve possuir nome."
        );
    }

    return Object.freeze({
        id,
        nome,
        funcao: texto(
            colaborador?.funcao ||
            colaborador?.funcaoNome ||
            colaborador?.funcao_nome
        ),
        matricula: texto(
            colaborador?.matriculaEsocial ||
            colaborador?.matricula_esocial ||
            colaborador?.matricula
        ),
        dataAdmissao: dataIso(
            colaborador?.dataAdmissao ||
            colaborador?.data_admissao
        ),
        dataDesligamento: dataIso(
            colaborador?.dataDesligamento ||
            colaborador?.data_desligamento
        ),
        dataDemissao: dataIso(
            colaborador?.dataDemissao ||
            colaborador?.data_demissao
        ),
        status: texto(
            colaborador?.status
        ),
        statusMobilizacao: texto(
            colaborador?.statusMobilizacao ||
            colaborador?.status_mobilizacao
        ),
    });
}

function classificarConfianca({
    competenciaAtualSelecionada,
    origemDados,
    confirmadoPorUsuario,
}) {
    if (
        competenciaAtualSelecionada &&
        origemDados === "cadastro_atual"
    ) {
        return "atual";
    }

    if (origemDados === "historico_estruturado") {
        return "confiavel";
    }

    if (
        origemDados === "confirmacao_manual" &&
        confirmadoPorUsuario
    ) {
        return "confirmado_manualmente";
    }

    return "insuficiente";
}

export function criarSnapshotMaoDeObraCertidaoMensal({
    competencia,
    empresaId,
    colaboradoresResolvidos = [],
    origemDados = "cadastro_atual",
    confirmadoPorUsuario = false,
    usuarioConfirmacaoId = "",
    agora = new Date(),
} = {}) {
    const empresa = texto(empresaId);

    if (!empresa) {
        throw new Error(
            "A empresa é obrigatória para preparar o snapshot mensal."
        );
    }

    if (!ORIGENS_SNAPSHOT.has(origemDados)) {
        throw new Error(
            "A origem dos dados do snapshot é inválida."
        );
    }

    const competenciaNormalizada =
        normalizarCompetenciaCertidaoMensal(
            competencia
        );

    const competenciaAtual =
        normalizarCompetenciaCertidaoMensal(
            agora
        );

    if (
        competenciaNormalizada >
        competenciaAtual
    ) {
        throw new Error(
            "Não é permitido preparar snapshot de competência futura."
        );
    }

    const confirmado =
        confirmadoPorUsuario === true;

    const usuario = texto(
        usuarioConfirmacaoId
    );

    if (confirmado && !usuario) {
        throw new Error(
            "A confirmação do snapshot exige identificação do usuário."
        );
    }

    const lista = (
        Array.isArray(colaboradoresResolvidos)
            ? colaboradoresResolvidos
            : []
    )
        .map(
            (colaborador) =>
                normalizarColaborador(
                    colaborador,
                    empresa
                )
        )
        .sort(
            (primeiro, segundo) =>
                primeiro.nome.localeCompare(
                    segundo.nome,
                    "pt-BR",
                    {
                        sensitivity: "base",
                    }
                ) ||
                primeiro.id.localeCompare(
                    segundo.id
                )
        );

    const identificadores =
        new Set();

    for (const colaborador of lista) {
        if (
            identificadores.has(
                colaborador.id
            )
        ) {
            throw new Error(
                "O snapshot possui identificador de colaborador duplicado."
            );
        }

        identificadores.add(
            colaborador.id
        );
    }

    const competenciaAtualSelecionada =
        competenciaNormalizada ===
        competenciaAtual;

    const confiancaHistorica =
        classificarConfianca({
            competenciaAtualSelecionada,
            origemDados,
            confirmadoPorUsuario:
                confirmado,
        });

    const fonteInsuficiente =
        confiancaHistorica ===
        "insuficiente";

    const statusSnapshot =
        confirmado && !fonteInsuficiente
            ? "confirmado"
            : "rascunho";

    return Object.freeze({
        versao:
            VERSAO_SNAPSHOT_MAO_DE_OBRA_CERTIDAO_MENSAL,
        competencia:
            competenciaNormalizada,
        dataReferencia:
            obterDataReferenciaCertidaoMensal(
                competenciaNormalizada
            ),
        empresaId:
            empresa,
        geradoEm:
            agora.toISOString(),
        origemDados,
        confiancaHistorica,
        statusSnapshot,
        confirmadoPorUsuario:
            confirmado,
        usuarioConfirmacaoId:
            confirmado
                ? usuario
                : "",
        requerConfirmacaoHumana:
            !confirmado ||
            fonteInsuficiente,
        motivoConfirmacao:
            fonteInsuficiente
                ? "A fonte informada ainda não comprova definitivamente a mão de obra desta competência."
                : !confirmado
                    ? "O snapshot ainda não recebeu confirmação humana."
                    : "",
        totalColaboradores:
            lista.length,
        colaboradores:
            Object.freeze(lista),
    });
}
