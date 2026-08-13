import {
    normalizarCompetenciaCertidaoMensal,
    obterDataReferenciaCertidaoMensal,
} from "../domain/certidaoMensalPersistenceContract.js";

const STATUS_NAO_ATIVOS =
    /\b(inativo|inativado|desmobilizado|demitido|desligado|rescindido|encerrado)\b/;

const STATUS_DOCUMENTO_BLOQUEADO =
    /bloqueado|reprovado|inv[aá]lido/i;

const STATUS_DOCUMENTO_VALIDADO =
    /\b(validado|validada|aprovado|aprovada)\b/i;

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarTexto(
    valor
) {
    return textoSeguro(valor)
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase();
}

function dataIsoSegura(
    valor
) {
    const texto =
        textoSeguro(valor)
            .slice(0, 10);

    return /^\d{4}-\d{2}-\d{2}$/.test(texto)
        ? texto
        : "";
}

function obterCompetenciaDaData(
    valor
) {
    const data =
        valor instanceof Date
            ? valor
            : new Date(valor);

    if (Number.isNaN(data.getTime())) {
        throw new Error(
            "A data usada para determinar a competência atual é inválida."
        );
    }

    return normalizarCompetenciaCertidaoMensal(
        new Date(
            Date.UTC(
                data.getUTCFullYear(),
                data.getUTCMonth(),
                1
            )
        )
    );
}

function obterEmpresaId(
    registro
) {
    return textoSeguro(
        registro?.empresaId ||
        registro?.empresa_id
    );
}

function colaboradorPertenceEmpresa(
    colaborador,
    empresaId
) {
    return (
        obterEmpresaId(colaborador) ===
        textoSeguro(empresaId)
    );
}

function obterStatusCompostoColaborador(
    colaborador
) {
    return normalizarTexto([
        colaborador?.status,
        colaborador?.situacao,
        colaborador?.situacao_operacional,
        colaborador?.statusMobilizacao,
        colaborador?.status_mobilizacao,
        colaborador?.statusVinculo,
        colaborador?.status_vinculo,
    ].filter(Boolean).join(" "));
}

function obterDataEncerramentoColaborador(
    colaborador
) {
    return dataIsoSegura(
        colaborador?.dataDemissao ||
        colaborador?.data_demissao ||
        colaborador?.dataDesligamento ||
        colaborador?.data_desligamento
    );
}

function colaboradorEstaAtivoNaBaseAtual(
    colaborador,
    hojeIso
) {
    const status =
        obterStatusCompostoColaborador(
            colaborador
        );

    if (
        status &&
        STATUS_NAO_ATIVOS.test(status)
    ) {
        return false;
    }

    const dataEncerramento =
        obterDataEncerramentoColaborador(
            colaborador
        );

    if (
        dataEncerramento &&
        dataEncerramento <= hojeIso
    ) {
        return false;
    }

    return true;
}

const COMPETENCIA_INICIO_HISTORICO_VINCULO_ESTRUTURADO =
    "2026-08-01";

const LIMITE_CONSULTA_HISTORICO_VINCULO =
    5000;

function obterIdColaborador(
    colaborador
) {
    return textoSeguro(
        colaborador?.id ||
        colaborador?.colaboradorId ||
        colaborador?.colaborador_id
    );
}

function obterDataAdmissaoColaborador(
    colaborador
) {
    return dataIsoSegura(
        colaborador?.dataAdmissao ||
        colaborador?.data_admissao
    );
}

function obterDataEventoMovimentacao(
    movimentacao
) {
    return dataIsoSegura(
        movimentacao?.dataEvento ||
        movimentacao?.data_evento
    );
}

function colaboradorEstaAtivoNaDataReferencia(
    colaborador,
    dataReferencia
) {
    const admissao =
        obterDataAdmissaoColaborador(
            colaborador
        );

    if (
        !admissao ||
        admissao > dataReferencia
    ) {
        return false;
    }

    const status =
        obterStatusCompostoColaborador(
            colaborador
        );

    if (
        status &&
        STATUS_NAO_ATIVOS.test(
            status
        )
    ) {
        return false;
    }

    const dataEncerramento =
        obterDataEncerramentoColaborador(
            colaborador
        );

    if (
        dataEncerramento &&
        dataEncerramento <=
            dataReferencia
    ) {
        return false;
    }

    return true;
}

function aplicarEstadoAnteriorMovimentacao(
    colaborador,
    movimentacao
) {
    const statusAnterior =
        textoSeguro(
            movimentacao?.statusAnterior ??
            movimentacao?.status_anterior
        );

    const statusMobilizacaoAnterior =
        textoSeguro(
            movimentacao
                ?.statusMobilizacaoAnterior ??
            movimentacao
                ?.status_mobilizacao_anterior
        );

    const dataAdmissaoAnterior =
        dataIsoSegura(
            movimentacao?.dataAdmissaoAnterior ??
            movimentacao?.data_admissao_anterior
        );

    const dataDesligamentoAnterior =
        dataIsoSegura(
            movimentacao
                ?.dataDesligamentoAnterior ??
            movimentacao
                ?.data_desligamento_anterior
        );

    const dataDemissaoAnterior =
        dataIsoSegura(
            movimentacao?.dataDemissaoAnterior ??
            movimentacao?.data_demissao_anterior
        );

    return {
        ...colaborador,

        status:
            statusAnterior,

        situacao:
            statusAnterior,

        statusVinculo:
            statusAnterior,

        status_vinculo:
            statusAnterior,

        statusMobilizacao:
            statusMobilizacaoAnterior,

        status_mobilizacao:
            statusMobilizacaoAnterior,

        situacao_operacional:
            statusMobilizacaoAnterior,

        dataAdmissao:
            dataAdmissaoAnterior,

        data_admissao:
            dataAdmissaoAnterior,

        dataDesligamento:
            dataDesligamentoAnterior,

        data_desligamento:
            dataDesligamentoAnterior,

        dataDemissao:
            dataDemissaoAnterior,

        data_demissao:
            dataDemissaoAnterior,
    };
}

function reconstruirRelacaoEmpregadosNaData({
    colaboradoresEmpresa,
    movimentacoesVinculo,
    dataReferencia,
}) {
    const movimentacoesRecebidas =
        Array.isArray(
            movimentacoesVinculo
        )
            ? movimentacoesVinculo
            : [];

    const movimentacoesValidas =
        movimentacoesRecebidas
            .filter(
                (movimentacao) =>
                    Boolean(
                        textoSeguro(
                            movimentacao?.colaboradorId ||
                            movimentacao?.colaborador_id
                        )
                    ) &&
                    Boolean(
                        obterDataEventoMovimentacao(
                            movimentacao
                        )
                    )
            );

    const movimentacoesPorColaborador =
        new Map();

    for (
        const movimentacao
        of movimentacoesValidas
    ) {
        const colaboradorId =
            textoSeguro(
                movimentacao?.colaboradorId ||
                movimentacao?.colaborador_id
            );

        const lista =
            movimentacoesPorColaborador
                .get(
                    colaboradorId
                ) ||
            [];

        lista.push(
            movimentacao
        );

        movimentacoesPorColaborador
            .set(
                colaboradorId,
                lista
            );
    }

    const colaboradoresReconstruidos =
        [];

    for (
        const colaborador
        of colaboradoresEmpresa
    ) {
        const colaboradorId =
            obterIdColaborador(
                colaborador
            );

        const historico =
            colaboradorId
                ? (
                    movimentacoesPorColaborador
                        .get(
                            colaboradorId
                        ) ||
                    []
                )
                : [];

        let estadoNaReferencia = {
            ...colaborador,
        };

        const movimentacoesPosteriores =
            historico
                .filter(
                    (movimentacao) =>
                        obterDataEventoMovimentacao(
                            movimentacao
                        ) >
                        dataReferencia
                )
                .slice()
                .reverse();

        for (
            const movimentacao
            of movimentacoesPosteriores
        ) {
            estadoNaReferencia =
                aplicarEstadoAnteriorMovimentacao(
                    estadoNaReferencia,
                    movimentacao
                );
        }

        if (
            colaboradorEstaAtivoNaDataReferencia(
                estadoNaReferencia,
                dataReferencia
            )
        ) {
            colaboradoresReconstruidos
                .push(
                    estadoNaReferencia
                );
        }
    }

    return {
        colaboradores:
            colaboradoresReconstruidos,

        totalMovimentacoesRecebidas:
            movimentacoesRecebidas.length,

        totalMovimentacoesIgnoradas:
            (
                movimentacoesRecebidas.length -
                movimentacoesValidas.length
            ),
    };
}

function treinamentoEhAso(
    treinamento
) {
    return (
        Number(
            treinamento?.treinamentoId ||
            treinamento?.treinamento_id
        ) === 22 ||
        /\baso\b/i.test(
            textoSeguro(
                treinamento?.tipoTreinamento ||
                treinamento?.nomeTreinamento ||
                treinamento?.tipo_treinamento ||
                treinamento?.nome_treinamento
            )
        )
    );
}

function asoEstaValidoNaData(
    treinamento,
    dataReferencia
) {
    if (!treinamentoEhAso(treinamento)) {
        return false;
    }

    const realizacao =
        dataIsoSegura(
            treinamento?.realizado ||
            treinamento?.dataRealizacao ||
            treinamento?.data_realizacao
        );

    const vencimento =
        dataIsoSegura(
            treinamento?.vencimento ||
            treinamento?.dataVencimento ||
            treinamento?.data_vencimento
        );

    const statusValidacao =
        textoSeguro(
            treinamento?.statusValidacao ||
            treinamento?.status_validacao
        );

    return Boolean(
        realizacao &&
        realizacao <= dataReferencia &&
        vencimento &&
        vencimento >= dataReferencia &&
        STATUS_DOCUMENTO_VALIDADO.test(
            statusValidacao
        ) &&
        !STATUS_DOCUMENTO_BLOQUEADO.test(
            statusValidacao
        )
    );
}

function colaboradorPossuiAsoValido(
    colaborador,
    dataReferencia
) {
    const treinamentos =
        Array.isArray(
            colaborador?.treinamentos
        )
            ? colaborador.treinamentos
            : [];

    return treinamentos.some(
        (treinamento) =>
            asoEstaValidoNaData(
                treinamento,
                dataReferencia
            )
    );
}

function documentoEhPcmso(
    documento
) {
    return (
        normalizarTexto(
            documento?.tipoDocumento ||
            documento?.tipo_documento
        ) === "pcmso"
    );
}

function documentoPertenceEmpresa(
    documento,
    empresaId
) {
    return (
        obterEmpresaId(documento) ===
        textoSeguro(empresaId)
    );
}

function obterValidadeDocumento(
    documento
) {
    return dataIsoSegura(
        documento?.dataVencimento ||
        documento?.data_vencimento
    );
}

function obterEmissaoDocumento(
    documento
) {
    return dataIsoSegura(
        documento?.dataEmissao ||
        documento?.data_emissao
    );
}

function localizarPcmsoAplicavelNaData(
    documentosEmpresas,
    empresaId,
    dataReferencia
) {
    return (
        documentosEmpresas
            .filter(
                (documento) => {
                    if (
                        !documentoPertenceEmpresa(
                            documento,
                            empresaId
                        ) ||
                        !documentoEhPcmso(
                            documento
                        )
                    ) {
                        return false;
                    }

                    const emissao =
                        obterEmissaoDocumento(
                            documento
                        );

                    return Boolean(
                        emissao &&
                        emissao <= dataReferencia
                    );
                }
            )
            .sort(
                (primeiro, segundo) => {
                    const porEmissao =
                        obterEmissaoDocumento(
                            segundo
                        ).localeCompare(
                            obterEmissaoDocumento(
                                primeiro
                            )
                        );

                    if (porEmissao !== 0) {
                        return porEmissao;
                    }

                    return obterValidadeDocumento(
                        segundo
                    ).localeCompare(
                        obterValidadeDocumento(
                            primeiro
                        )
                    );
                }
            )[0] ||
        null
    );
}

function pcmsoEstaVigenteNaData(
    documento,
    dataReferencia
) {
    if (!documento) {
        return false;
    }

    const emissao =
        obterEmissaoDocumento(
            documento
        );

    const validade =
        obterValidadeDocumento(
            documento
        );

    const statusValidacao =
        textoSeguro(
            documento?.statusValidacao ||
            documento?.status_validacao
        );

    return Boolean(
        emissao &&
        emissao <= dataReferencia &&
        validade &&
        validade >= dataReferencia &&
        STATUS_DOCUMENTO_VALIDADO.test(
            statusValidacao
        ) &&
        !STATUS_DOCUMENTO_BLOQUEADO.test(
            statusValidacao
        )
    );
}

/*
 * Quando a Relação de Empregados da competência já possui snapshot
 * confirmado, esse snapshot passa a definir o universo ocupacional do
 * Item 15.
 *
 * A confirmação da mão de obra NÃO confirma automaticamente ASO/PCMSO.
 * Ela apenas fixa quais colaboradores pertencem àquela competência.
 */
export function recalcularEvidenciaOcupacionalComSnapshotMaoDeObra({
    evidenciaInterna,
    snapshotMaoDeObra,
    colaboradores = [],
} = {}) {
    if (
        !evidenciaInterna ||
        typeof evidenciaInterna !== "object"
    ) {
        return evidenciaInterna || null;
    }

    if (
        !snapshotMaoDeObra ||
        snapshotMaoDeObra.statusSnapshot !==
            "confirmado" ||
        !Array.isArray(
            snapshotMaoDeObra.colaboradores
        )
    ) {
        return evidenciaInterna;
    }

    const colaboradoresDisponiveis =
        Array.isArray(colaboradores)
            ? colaboradores
            : [];

    const mapaColaboradores =
        new Map(
            colaboradoresDisponiveis
                .map(
                    (colaborador) => [
                        textoSeguro(
                            colaborador?.id ||
                            colaborador?.colaboradorId ||
                            colaborador?.colaborador_id
                        ),
                        colaborador,
                    ]
                )
                .filter(
                    ([id]) =>
                        Boolean(id)
                )
        );

    const colaboradoresOcupacionais =
        snapshotMaoDeObra.colaboradores
            .map(
                (colaboradorSnapshot) => {
                    const id =
                        textoSeguro(
                            colaboradorSnapshot?.id ||
                            colaboradorSnapshot
                                ?.colaboradorId ||
                            colaboradorSnapshot
                                ?.colaborador_id
                        );

                    if (!id) {
                        return null;
                    }

                    /*
                     * Priorizar o cadastro completo porque nele estão
                     * certificados/ASOs. Se o colaborador já não existir
                     * na base atual, manter o snapshot como fallback.
                     * Nesse caso, a ausência do ASO será tratada de forma
                     * conservadora como pendência.
                     */
                    return (
                        mapaColaboradores.get(
                            id
                        ) ||
                        colaboradorSnapshot
                    );
                }
            )
            .filter(Boolean);

    const dataReferencia =
        textoSeguro(
            evidenciaInterna.dataReferencia
        );

    const asosValidos =
        colaboradoresOcupacionais.filter(
            (colaborador) =>
                colaboradorPossuiAsoValido(
                    colaborador,
                    dataReferencia
                )
        ).length;

    const totalAtivos =
        colaboradoresOcupacionais.length;

    return {
        ...evidenciaInterna,

        totalAtivos,

        asosValidos,

        asosPendentes:
            Math.max(
                totalAtivos -
                asosValidos,
                0
            ),

        /*
         * Mantém a política conservadora do Item 15.
         * Snapshot de mão de obra confirmado não equivale a
         * confirmação documental histórica de ASO/PCMSO.
         */
        historicoConfiavel:
            evidenciaInterna
                .historicoConfiavel === true,

        colaboradoresOcupacionaisCompetencia:
            colaboradoresOcupacionais,

        origemUniversoOcupacional:
            "snapshot_mao_de_obra_confirmado",
    };
}

export function montarEvidenciasInternasCertidaoMensal({
    competencia,
    empresaId,
    colaboradores = [],
    documentosEmpresas = [],
    movimentacoesVinculo = [],
    historicoVinculoCarregado = false,
    agora = new Date(),
} = {}) {
    const empresaIdSeguro =
        textoSeguro(
            empresaId
        );

    if (!empresaIdSeguro) {
        throw new Error(
            "A empresa é obrigatória para consolidar as evidências internas."
        );
    }

    const competenciaNormalizada =
        normalizarCompetenciaCertidaoMensal(
            competencia
        );

    const competenciaAtual =
        obterCompetenciaDaData(
            agora
        );

    const dataReferencia =
        obterDataReferenciaCertidaoMensal(
            competenciaNormalizada
        );

    const hojeIso =
        agora
            .toISOString()
            .slice(0, 10);

    const ehCompetenciaAtual =
        competenciaNormalizada ===
        competenciaAtual;

    /*
     * ASO + PCMSO mantém política conservadora para competências
     * históricas ainda não consolidadas. O vínculo pode ser
     * reconstruído temporalmente, porém documentos ocupacionais
     * antigos podem ter sido substituídos no cadastro operacional.
     * O snapshot persistido da competência é a evidência imutável.
     */
    const historicoConfiavel =
        ehCompetenciaAtual;

    const colaboradoresEmpresa =
        (
            Array.isArray(colaboradores)
                ? colaboradores
                : []
        ).filter(
            (colaborador) =>
                colaboradorPertenceEmpresa(
                    colaborador,
                    empresaIdSeguro
                )
        );

    const colaboradoresAtivosBaseAtual =
        colaboradoresEmpresa.filter(
            (colaborador) =>
                colaboradorEstaAtivoNaBaseAtual(
                    colaborador,
                    hojeIso
                )
        );

    const reconstrucaoRelacaoEmpregados =
        ehCompetenciaAtual
            ? {
                colaboradores:
                    colaboradoresAtivosBaseAtual,

                totalMovimentacoesRecebidas:
                    Array.isArray(
                        movimentacoesVinculo
                    )
                        ? movimentacoesVinculo.length
                        : 0,

                totalMovimentacoesIgnoradas:
                    0,
            }
            : reconstruirRelacaoEmpregadosNaData({
                colaboradoresEmpresa,
                movimentacoesVinculo,
                dataReferencia,
            });

    const competenciaCobertaPeloHistoricoEstruturado =
        competenciaNormalizada >=
        COMPETENCIA_INICIO_HISTORICO_VINCULO_ESTRUTURADO;

    const historicoVinculoCompleto =
        historicoVinculoCarregado ===
            true &&
        reconstrucaoRelacaoEmpregados
            .totalMovimentacoesRecebidas <
            LIMITE_CONSULTA_HISTORICO_VINCULO &&
        reconstrucaoRelacaoEmpregados
            .totalMovimentacoesIgnoradas ===
            0;

    const historicoRelacaoConfiavel =
        ehCompetenciaAtual ||
        (
            competenciaCobertaPeloHistoricoEstruturado &&
            historicoVinculoCompleto
        );

    let motivoHistoricoRelacao =
        "";

    if (
        !ehCompetenciaAtual &&
        !historicoRelacaoConfiavel
    ) {
        if (
            competenciaNormalizada <
            COMPETENCIA_INICIO_HISTORICO_VINCULO_ESTRUTURADO
        ) {
            motivoHistoricoRelacao =
                "A competência é anterior ao início do histórico estruturado de vínculo. A composição sugerida pelo sistema exige confirmação humana.";
        }
        else if (
            !historicoVinculoCarregado
        ) {
            motivoHistoricoRelacao =
                "O histórico estruturado de movimentações ainda não foi carregado para esta competência.";
        }
        else if (
            reconstrucaoRelacaoEmpregados
                .totalMovimentacoesRecebidas >=
            LIMITE_CONSULTA_HISTORICO_VINCULO
        ) {
            motivoHistoricoRelacao =
                "A consulta de movimentações atingiu o limite de segurança e não pode ser tratada como histórico completo.";
        }
        else {
            motivoHistoricoRelacao =
                "O histórico de movimentações contém registros incompletos e a composição exige confirmação humana.";
        }
    }

    const colaboradoresRelacaoCompetencia =
        ehCompetenciaAtual
            ? colaboradoresAtivosBaseAtual
            : reconstrucaoRelacaoEmpregados
                .colaboradores;

    const totalRelacaoCompetencia =
        colaboradoresRelacaoCompetencia
            .length;

    const asosValidos =
        colaboradoresRelacaoCompetencia.filter(
            (colaborador) =>
                colaboradorPossuiAsoValido(
                    colaborador,
                    dataReferencia
                )
        ).length;

    const totalAtivos =
        colaboradoresRelacaoCompetencia.length;

    const pcmso =
        localizarPcmsoAplicavelNaData(
            Array.isArray(documentosEmpresas)
                ? documentosEmpresas
                : [],
            empresaIdSeguro,
            dataReferencia
        );

    const validadePcmso =
        obterValidadeDocumento(
            pcmso
        );

    const pcmsoVigente =
        pcmsoEstaVigenteNaData(
            pcmso,
            dataReferencia
        );

    return {
        competencia:
            competenciaNormalizada,
        competenciaAtual,
        dataReferencia,
        ehCompetenciaAtual,
        historicoConfiavel,
        motivoHistorico:
            historicoConfiavel
                ? ""
                : (
                    competenciaNormalizada <
                    competenciaAtual
                        ? "ASO + PCMSO históricos exigem confirmação quando a competência ainda não possui snapshot ocupacional consolidado."
                        : "A competência futura ainda não possui base documental consolidada."
                ),
        historicoRelacaoConfiavel,
        motivoHistoricoRelacao,
        colaboradoresRelacaoCompetencia,
        totalRelacaoCompetencia,
        totalColaboradoresEmpresa:
            colaboradoresEmpresa.length,
        colaboradoresAtivosBaseAtual,
        totalAtivos,
        asosValidos,
        asosPendentes:
            Math.max(
                totalAtivos -
                asosValidos,
                0
            ),
        pcmso,
        validadePcmso,
        pcmsoVigente,
    };
}
