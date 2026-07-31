import { useMemo } from "react";

function normalizarTextoIndicadorDds(valor = "") {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function numeroSeguroIndicadorDds(valor, fallback = 0) {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : fallback;
}

function percentualIndicadorDds(parte, total) {
    const parteSegura =
        Math.max(
            0,
            numeroSeguroIndicadorDds(parte)
        );

    const totalSeguro =
        Math.max(
            0,
            numeroSeguroIndicadorDds(total)
        );

    if (totalSeguro <= 0) {
        return null;
    }

    return Number(
        (
            parteSegura /
            totalSeguro *
            100
        ).toFixed(2)
    );
}

function formatarPercentualIndicadorDds(valor) {
    if (
        valor === null ||
        valor === undefined ||
        !Number.isFinite(Number(valor))
    ) {
        return "Indicador não calculável — dado ausente";
    }

    return `${Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}%`;
}

function parseDataIndicadorDds(valor) {
    const texto = String(valor || "").trim();

    if (!texto) {
        return null;
    }

    let textoNormalizado = texto;

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
        const [dia, mes, ano] =
            texto.split("/");

        textoNormalizado =
            `${ano}-${mes}-${dia}T12:00:00`;
    }

    const data =
        new Date(textoNormalizado);

    return Number.isNaN(data.getTime())
        ? null
        : data;
}

function obterChaveDiaIndicadorDds(dia = {}) {
    return String(
        dia?.chaveAssistida ??
        dia?.indiceAssistido ??
        dia?.indice ??
        dia?.data ??
        dia?.dataDds ??
        dia?.dia ??
        dia?.nome ??
        dia?.curto ??
        ""
    ).trim();
}

function obterNomeDiaIndicadorDds(dia = {}) {
    return String(
        dia?.nome ||
        dia?.curto ||
        dia?.data ||
        dia?.dataDds ||
        dia?.dia ||
        "Dia não identificado"
    ).trim();
}

function diaElegivelAssiduidadeDds(dia = {}) {
    const jornadaTipo = normalizarTextoIndicadorDds(
        dia?.jornadaTipo || dia?.jornada_tipo || ""
    );

    if (
        jornadaTipo.includes("sabado") ||
        jornadaTipo.includes("domingo") ||
        jornadaTipo.includes("extra_integral")
    ) {
        return false;
    }

    const data = parseDataIndicadorDds(
        dia?.data || dia?.dataDds || dia?.dia
    );

    if (data && (data.getDay() === 0 || data.getDay() === 6)) {
        return false;
    }

    return true;
}

function classificarAbsenteismoIndicadorDds(valor) {
    if (valor === null) {
        return "nao_calculavel";
    }

    if (valor > 20) {
        return "critico";
    }

    if (valor > 10) {
        return "atencao";
    }

    return "normal";
}

function classificarAssiduidadeIndicadorDds(valor) {
    if (valor === null) {
        return "nao_calculavel";
    }

    if (valor < 80) {
        return "critico";
    }

    if (valor < 90) {
        return "atencao";
    }

    return "normal";
}

function classificarCoberturaIndicadorDds(valor) {
    if (valor === null) {
        return "nao_calculavel";
    }

    if (valor < 80) {
        return "critico";
    }

    if (valor < 95) {
        return "atencao";
    }

    return "normal";
}

function classificarPreenchimentoIndicadorDds(valor) {
    if (valor === null) {
        return "nao_calculavel";
    }

    if (valor < 90) {
        return "critico";
    }

    if (valor < 98) {
        return "atencao";
    }

    return "normal";
}

function classificarOcorrenciaPercentualIndicadorDds(valor) {
    if (valor === null) {
        return "nao_calculavel";
    }

    if (valor > 5) {
        return "critico";
    }

    if (valor > 2) {
        return "atencao";
    }

    return "normal";
}

function classificarRecadosIndicadorDds(valor) {
    if (valor === null) {
        return "nao_calculavel";
    }

    if (valor < 50) {
        return "critico";
    }

    if (valor < 80) {
        return "atencao";
    }

    return "normal";
}

function maiorNivelIndicadorDds(niveis = []) {
    const pesos = {
        normal: 0,
        nao_calculavel: 1,
        atencao: 2,
        critico: 3,
    };

    return niveis.reduce(
        (maior, atual) =>
            (pesos[atual] || 0) >
            (pesos[maior] || 0)
                ? atual
                : maior,
        "normal"
    );
}

function criarIndicadorDds({
    nome,
    valor,
    interpretacao,
    nivel,
    detalhes = [],
}) {
    return {
        nome,
        valor,
        interpretacao,
        nivel,
        detalhes:
            Array.isArray(detalhes)
                ? detalhes.filter(Boolean)
                : [],
    };
}

function criarIndicadorNaoCalculavelDds(
    nome,
    interpretacao
) {
    return criarIndicadorDds({
        nome,
        valor:
            "Indicador não calculável — dado ausente",
        interpretacao,
        nivel: "nao_calculavel",
    });
}

export default function useDdsResultadoApresentacaoDerivados({
    conferenciaAssistidaDds,
    dadosDds,
    diasAtivosConferenciaAssistidaDds,
    diasConferenciaAssistidaDds,
    estatisticasConferenciaAssistidaDds,
    estatisticasTemasConferenciaAssistidaDds,
    fechamentoConferenciaAssistidaDds,
    historicoMensalMaoDeObraDds,
    participantesConferenciaAssistidaDds,
    registroScannerDds,
    resultadoFinalScannerDds,
}) {
    const resultadoFinalApresentacaoDds = useMemo(() => {
        const valoresConferencia =
            Object.values(
                conferenciaAssistidaDds || {}
            );

        const temAlgumaConfirmacaoAssistida =
            valoresConferencia.some(
                (status) =>
                    status === "presente" ||
                    status === "ausente" ||
                    status === "manual"
            );

        const conferenciaConcluidaOficialmente =
            fechamentoConferenciaAssistidaDds?.status ===
            "concluida";

        const resumoFechamentoOficial =
            conferenciaConcluidaOficialmente &&
            fechamentoConferenciaAssistidaDds?.resumo &&
            typeof fechamentoConferenciaAssistidaDds
                .resumo === "object"
                ? fechamentoConferenciaAssistidaDds
                    .resumo
                : null;

        const participantesBase =
            Number(
                resumoFechamentoOficial
                    ?.participantes ??
                estatisticasConferenciaAssistidaDds
                    .participantes ??
                0
            );

        const diasAtivosBase =
            Number(
                resumoFechamentoOficial
                    ?.diasAtivos ??
                diasAtivosConferenciaAssistidaDds
                    .length ??
                0
            );

        const temBaseAssistida =
            Boolean(
                (
                    temAlgumaConfirmacaoAssistida ||
                    conferenciaConcluidaOficialmente
                ) &&
                diasAtivosBase > 0 &&
                participantesBase > 0
            );

        if (!temBaseAssistida) {
            return resultadoFinalScannerDds;
        }

        const participantes =
            participantesBase;

        const presencas =
            Number(
                resumoFechamentoOficial
                    ?.presencas ??
                estatisticasConferenciaAssistidaDds
                    .presencas ??
                0
            );

        const ausencias =
            Number(
                resumoFechamentoOficial
                    ?.ausencias ??
                estatisticasConferenciaAssistidaDds
                    .ausencias ??
                0
            );

        const manuais =
            Number(
                resumoFechamentoOficial
                    ?.manuais ??
                estatisticasConferenciaAssistidaDds
                    .manuais ??
                0
            );

        const homemDia =
            Number(
                resumoFechamentoOficial
                    ?.homemDia ??
                estatisticasConferenciaAssistidaDds
                    .homemDia ??
                0
            );

        const diasAtivos =
            diasAtivosBase;

        const funcionariosSemanaCompleta =
            Number(
                resumoFechamentoOficial
                    ?.funcionariosSemanaCompleta ??
                estatisticasConferenciaAssistidaDds
                    .funcionariosSemanaCompleta ??
                0
            );

        const totalCampos =
            participantes *
            diasAtivos;

        const conferenciaFechada =
            totalCampos > 0 &&
            manuais === 0;

        const statusVisual =
            conferenciaFechada
                ? "ok"
                : "parcial";

        const statusFinal =
            conferenciaConcluidaOficialmente
                ? "Conferência concluída oficialmente"
                : conferenciaFechada
                    ? "Conferido oficialmente"
                    : "Conferência assistida parcial";

        const titulo =
            conferenciaConcluidaOficialmente
                ? "Conferência DDS concluída oficialmente"
                : conferenciaFechada
                    ? "Frequência oficial conferida"
                    : "Frequência oficial com campos pendentes";

        const descricao =
            conferenciaConcluidaOficialmente
                ? "A Conferência Assistida foi concluída oficialmente e salva no registro DDS. O OCR visual permanece apenas como apoio técnico."
                : conferenciaFechada
                    ? "A frequência oficial do DDS foi confirmada pela Conferência Assistida. O OCR visual permanece apenas como apoio técnico."
                    : "A Conferência Assistida já possui dados oficiais, mas ainda existem campos marcados como manual/vazio para revisar.";

        const itens = [
            {
                titulo:
                    "Conferência Assistida",
                ok: conferenciaFechada,
                manual:
                    !conferenciaFechada,
                detalhe:
                    `${presencas} presença(s), ${ausencias} ausência(s), ${manuais} manual/vazio e ${homemDia} homem-dia confirmado(s).`,
            },
            {
                titulo: "Dias ativos",
                ok: diasAtivos > 0,
                detalhe:
                    `${diasAtivos} dia(s) com atividade usado(s) no cálculo oficial.`,
            },
            {
                titulo:
                    "OCR visual auxiliar",
                ok: false,
                manual: true,
                detalhe:
                    "Leitura automática usada apenas como apoio; a estatística oficial vem da Conferência Assistida.",
            },
        ];

        const recomendacoes = [];

        if (manuais > 0) {
            recomendacoes.push(
                "Revisar os campos marcados como ? para fechar a frequência oficial sem pendências."
            );
        }
        else {
            recomendacoes.push(
                "Manter a Conferência Assistida salva como base oficial da estatística DDS."
            );
        }

        recomendacoes.push(
            "Usar o OCR visual apenas como apoio técnico, sem substituir a confirmação P / X / ?."
        );

        recomendacoes.push(
            "Não usar o resultado como validação grafológica; manter conferência visual/documental."
        );

        return {
            ...resultadoFinalScannerDds,
            modoAssistido: true,
            statusFinal,
            statusVisual,
            titulo,
            descricao,
            itens,
            recomendacoes,
            resumo: {
                ...(
                    resultadoFinalScannerDds
                        ?.resumo ||
                    {}
                ),
                participantesTotal:
                    participantes,
                participantesLocalizados:
                    participantes,
                participantesManuais:
                    manuais,
                participantesNaoLocalizados:
                    ausencias,
                participantesPaginasNaoAnalisadas:
                    0,
                presencas,
                ausencias,
                manuais,
                homemDia,
                diasAtivos,
                totalCampos,
                funcionariosSemanaCompleta,
            },
        };
    }, [
        conferenciaAssistidaDds,
        diasAtivosConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        fechamentoConferenciaAssistidaDds,
        resultadoFinalScannerDds,
    ]);

    const resumoControleMaoDeObraDds =
        useMemo(() => {
            const funcoes =
                new Set();

            participantesConferenciaAssistidaDds
                .forEach(
                    (participante) => {
                        const funcao =
                            String(
                                participante
                                    ?.funcao ||
                                "Sem função"
                            ).trim() ||
                            "Sem função";

                        funcoes.add(
                            funcao.toUpperCase()
                        );
                    }
                );

            const datasLancadas =
                diasAtivosConferenciaAssistidaDds
                    .map(
                        (dia) =>
                            String(
                                dia?.data ||
                                dia?.dataDds ||
                                dia?.dia ||
                                ""
                            ).trim()
                    )
                    .filter(Boolean);

            const primeiraData =
                datasLancadas[0] ||
                dadosDds.periodoInicio ||
                registroScannerDds
                    ?.periodoInicio ||
                "";

            let mesReferencia = "-";

            if (primeiraData) {
                const data =
                    new Date(
                        primeiraData.includes("/")
                            ? primeiraData
                                .split("/")
                                .reverse()
                                .join("-")
                            : primeiraData
                    );

                if (
                    !Number.isNaN(
                        data.getTime()
                    )
                ) {
                    mesReferencia =
                        data.toLocaleDateString(
                            "pt-BR",
                            {
                                month: "2-digit",
                                year: "numeric",
                            }
                        );
                }
            }

            return {
                funcoes: funcoes.size,
                diasLancados:
                    datasLancadas.length,
                homemDia:
                    Number(
                        estatisticasConferenciaAssistidaDds
                            ?.homemDia ||
                        0
                    ),
                mesReferencia,
            };
        }, [
            dadosDds.periodoInicio,
            diasAtivosConferenciaAssistidaDds,
            estatisticasConferenciaAssistidaDds,
            participantesConferenciaAssistidaDds,
            registroScannerDds,
        ]);

    const relatorioIndicadoresSstDds =
        useMemo(() => {
            const diasAtivos =
                Array.isArray(
                    diasAtivosConferenciaAssistidaDds
                )
                    ? diasAtivosConferenciaAssistidaDds
                    : [];

            const diasTodos =
                Array.isArray(
                    diasConferenciaAssistidaDds
                )
                    ? diasConferenciaAssistidaDds
                    : diasAtivos;

            // Sábado, domingo e jornadas exclusivamente extras permanecem no
            // DDS e nos indicadores de aplicação, mas não criam obrigação de
            // presença nem alteram assiduidade/absenteísmo.
            const diasFrequencia =
                diasAtivos.filter(diaElegivelAssiduidadeDds);

            const participantes =
                Array.isArray(
                    participantesConferenciaAssistidaDds
                )
                    ? participantesConferenciaAssistidaDds
                    : [];

            // dds_composicao_base_participantes_v1
            const participantesGabaritoDeclarados =
                Math.max(
                    0,
                    Number(
                        estatisticasConferenciaAssistidaDds
                            ?.participantesCadastrados ??
                        participantes.length
                    )
                );

            const participantesComplementaresDeclarados =
                Math.max(
                    0,
                    Number(
                        estatisticasConferenciaAssistidaDds
                            ?.participantesAdicionais ??
                        0
                    )
                );

            const composicaoBaseParticipantesConsistente =
                participantesGabaritoDeclarados +
                    participantesComplementaresDeclarados ===
                participantes.length;

            const participantesGabarito =
                composicaoBaseParticipantesConsistente
                    ? participantesGabaritoDeclarados
                    : Math.max(
                        0,
                        participantes.length -
                            participantesComplementaresDeclarados
                    );

            const participantesComplementares =
                composicaoBaseParticipantesConsistente
                    ? participantesComplementaresDeclarados
                    : Math.max(
                        0,
                        participantes.length -
                            participantesGabarito
                    );

            const detalheComposicaoBaseParticipantes =
                composicaoBaseParticipantesConsistente
                    ? `Composição da base: ${participantes.length} = ${participantesGabarito} participante(s) do gabarito + ${participantesComplementares} participante(s) complementar(es) incluído(s) na conferência assistida.`
                    : `Composição da base não reconciliada: ${participantes.length} participante(s) analisado(s), ${participantesGabaritoDeclarados} informado(s) no gabarito e ${participantesComplementaresDeclarados} complementar(es).`;

            const obterStatusParticipanteDia =
                (participante, dia) => {
                    const numero =
                        Number(
                            participante?.numero ||
                            0
                        );

                    const chaveDia =
                        obterChaveDiaIndicadorDds(
                            dia
                        );

                    if (
                        !numero ||
                        !chaveDia
                    ) {
                        return "manual";
                    }

                    return (
                        conferenciaAssistidaDds?.[
                            `${numero}-${chaveDia}`
                        ] ||
                        "manual"
                    );
                };

            /*
             * dds_integridade_analitica_sst_v2
             * dds_normalizacao_funcoes_similaridade_v1
             *
             * Agrupamento lexical sem lista fixa de sinônimos.
             * Usa normalização de tokens, abreviações por prefixo,
             * contenção controlada e Sørensen–Dice.
             */
            const prepararFuncaoAnaliticaDds =
                (valorFuncao) => {
                    const original =
                        String(
                            valorFuncao ||
                            "Sem função"
                        ).trim() ||
                        "Sem função";

                    const tokens =
                        normalizarTextoIndicadorDds(
                            original
                        )
                            .replace(
                                /[^a-z0-9]+/g,
                                " "
                            )
                            .split(/\s+/)
                            .filter(Boolean)
                            .filter(
                                (token) =>
                                    ![
                                        "de",
                                        "da",
                                        "do",
                                        "das",
                                        "dos",
                                        "e",
                                    ].includes(
                                        token
                                    )
                            )
                            .map(
                                (token) =>
                                    token.length > 4 &&
                                    token.endsWith("s")
                                        ? token.slice(
                                            0,
                                            -1
                                        )
                                        : token
                            );

                    return {
                        original,
                        tokens,
                        chave:
                            tokens.join(" ") ||
                            "sem funcao",
                    };
                };

            const tokensFuncaoEquivalentesDds =
                (
                    tokenA,
                    tokenB
                ) => {
                    if (tokenA === tokenB) {
                        return true;
                    }

                    const menor =
                        tokenA.length <= tokenB.length
                            ? tokenA
                            : tokenB;

                    const maior =
                        tokenA.length > tokenB.length
                            ? tokenA
                            : tokenB;

                    if (
                        menor.length < 2 ||
                        !maior.startsWith(
                            menor
                        )
                    ) {
                        return false;
                    }

                    const proporcao =
                        menor.length /
                        maior.length;

                    return menor.length >= 3
                        ? proporcao >= 0.35
                        : maior.length >= 6 &&
                            proporcao >= 0.25;
                };

            const calcularDiceCaracteresFuncaoDds =
                (
                    chaveA,
                    chaveB
                ) => {
                    const textoA =
                        chaveA.replace(
                            /\s+/g,
                            ""
                        );

                    const textoB =
                        chaveB.replace(
                            /\s+/g,
                            ""
                        );

                    if (textoA === textoB) {
                        return 1;
                    }

                    if (
                        textoA.length < 2 ||
                        textoB.length < 2
                    ) {
                        return 0;
                    }

                    const bigramasA =
                        new Map();

                    for (
                        let indice = 0;
                        indice < textoA.length - 1;
                        indice++
                    ) {
                        const bigrama =
                            textoA.slice(
                                indice,
                                indice + 2
                            );

                        bigramasA.set(
                            bigrama,
                            (
                                bigramasA.get(
                                    bigrama
                                ) ||
                                0
                            ) + 1
                        );
                    }

                    let intersecoes = 0;

                    for (
                        let indice = 0;
                        indice < textoB.length - 1;
                        indice++
                    ) {
                        const bigrama =
                            textoB.slice(
                                indice,
                                indice + 2
                            );

                        const quantidade =
                            bigramasA.get(
                                bigrama
                            ) ||
                            0;

                        if (quantidade > 0) {
                            intersecoes++;

                            bigramasA.set(
                                bigrama,
                                quantidade - 1
                            );
                        }
                    }

                    return (
                        2 *
                        intersecoes
                    ) /
                    (
                        textoA.length -
                        1 +
                        textoB.length -
                        1
                    );
                };

            const calcularSimilaridadeFuncaoAnaliticaDds =
                (
                    funcaoA,
                    funcaoB
                ) => {
                    if (
                        funcaoA.chave ===
                        funcaoB.chave
                    ) {
                        return 1;
                    }

                    const tokensUsados =
                        new Set();

                    let tokensCorrespondentes =
                        0;

                    funcaoA.tokens.forEach(
                        (tokenA) => {
                            const indiceCorrespondente =
                                funcaoB.tokens
                                    .findIndex(
                                        (
                                            tokenB,
                                            indiceB
                                        ) =>
                                            !tokensUsados.has(
                                                indiceB
                                            ) &&
                                            tokensFuncaoEquivalentesDds(
                                                tokenA,
                                                tokenB
                                            )
                                    );

                            if (
                                indiceCorrespondente >=
                                0
                            ) {
                                tokensUsados.add(
                                    indiceCorrespondente
                                );

                                tokensCorrespondentes++;
                            }
                        }
                    );

                    const diceTokens =
                        (
                            funcaoA.tokens.length +
                            funcaoB.tokens.length
                        ) > 0
                            ? (
                                2 *
                                tokensCorrespondentes
                            ) /
                            (
                                funcaoA.tokens.length +
                                funcaoB.tokens.length
                            )
                            : 0;

                    const menor =
                        funcaoA.tokens.length <=
                        funcaoB.tokens.length
                            ? funcaoA
                            : funcaoB;

                    const maior =
                        menor === funcaoA
                            ? funcaoB
                            : funcaoA;

                    const todosTokensContidos =
                        menor.tokens.every(
                            (tokenMenor) =>
                                maior.tokens.some(
                                    (tokenMaior) =>
                                        tokensFuncaoEquivalentesDds(
                                            tokenMenor,
                                            tokenMaior
                                        )
                                )
                        );

                    const tamanhoMenor =
                        menor.chave
                            .replace(
                                /\s+/g,
                                ""
                            )
                            .length;

                    const tamanhoMaior =
                        maior.chave
                            .replace(
                                /\s+/g,
                                ""
                            )
                            .length;

                    const proporcaoConteudo =
                        tamanhoMaior > 0
                            ? tamanhoMenor /
                                tamanhoMaior
                            : 0;

                    const similaridadeContencao =
                        todosTokensContidos &&
                        maior.tokens.length -
                            menor.tokens.length <=
                            1 &&
                        proporcaoConteudo >= 0.6
                            ? 0.82
                            : 0;

                    return Math.max(
                        diceTokens,
                        similaridadeContencao,
                        calcularDiceCaracteresFuncaoDds(
                            funcaoA.chave,
                            funcaoB.chave
                        )
                    );
                };

            const mapaFuncoesUnicas =
                new Map();

            participantes.forEach(
                (participante) => {
                    const preparada =
                        prepararFuncaoAnaliticaDds(
                            participante?.funcao ||
                            participante?.cargo ||
                            "Sem função"
                        );

                    if (
                        !mapaFuncoesUnicas.has(
                            preparada.chave
                        )
                    ) {
                        mapaFuncoesUnicas.set(
                            preparada.chave,
                            {
                                ...preparada,
                                quantidade: 0,
                                grafias:
                                    new Map(),
                            }
                        );
                    }

                    const item =
                        mapaFuncoesUnicas.get(
                            preparada.chave
                        );

                    item.quantidade++;

                    item.grafias.set(
                        preparada.original,
                        (
                            item.grafias.get(
                                preparada.original
                            ) ||
                            0
                        ) + 1
                    );
                }
            );

            const funcoesUnicas =
                Array.from(
                    mapaFuncoesUnicas.values()
                ).sort(
                    (
                        funcaoA,
                        funcaoB
                    ) =>
                        funcaoB.tokens.length -
                            funcaoA.tokens.length ||
                        funcaoB.chave.length -
                            funcaoA.chave.length ||
                        funcaoB.quantidade -
                            funcaoA.quantidade ||
                        funcaoA.original.localeCompare(
                            funcaoB.original,
                            "pt-BR",
                            {
                                sensitivity:
                                    "base",
                            }
                        )
                );

            const gruposFuncoes =
                [];

            funcoesUnicas.forEach(
                (funcao) => {
                    let melhorGrupo =
                        null;

                    let melhorPontuacao =
                        0;

                    gruposFuncoes.forEach(
                        (grupo) => {
                            const pontuacoes =
                                grupo.itens.map(
                                    (item) =>
                                        calcularSimilaridadeFuncaoAnaliticaDds(
                                            funcao,
                                            item
                                        )
                                );

                            if (
                                !pontuacoes.every(
                                    (pontuacao) =>
                                        pontuacao >=
                                        0.8
                                )
                            ) {
                                return;
                            }

                            const media =
                                pontuacoes.reduce(
                                    (
                                        total,
                                        pontuacao
                                    ) =>
                                        total +
                                        pontuacao,
                                    0
                                ) /
                                pontuacoes.length;

                            if (
                                media >
                                melhorPontuacao
                            ) {
                                melhorPontuacao =
                                    media;

                                melhorGrupo =
                                    grupo;
                            }
                        }
                    );

                    if (melhorGrupo) {
                        melhorGrupo.itens.push(
                            funcao
                        );
                    }
                    else {
                        gruposFuncoes.push({
                            itens: [
                                funcao,
                            ],
                        });
                    }
                }
            );

            const mapaFuncaoNormalizadaPorChave =
                new Map();

            gruposFuncoes.forEach(
                (grupo) => {
                    const candidatos =
                        grupo.itens
                            .flatMap(
                                (item) =>
                                    Array.from(
                                        item.grafias
                                            .entries()
                                    ).map(
                                        ([
                                            rotulo,
                                            quantidade,
                                        ]) => ({
                                            rotulo,
                                            quantidade,
                                            preparada:
                                                prepararFuncaoAnaliticaDds(
                                                    rotulo
                                                ),
                                        })
                                    )
                            )
                            .sort(
                                (
                                    candidatoA,
                                    candidatoB
                                ) =>
                                    candidatoB
                                        .preparada
                                        .tokens
                                        .length -
                                        candidatoA
                                            .preparada
                                            .tokens
                                            .length ||
                                    candidatoB
                                        .rotulo
                                        .length -
                                        candidatoA
                                            .rotulo
                                            .length ||
                                    candidatoB
                                        .quantidade -
                                        candidatoA
                                            .quantidade ||
                                    candidatoA
                                        .rotulo
                                        .localeCompare(
                                            candidatoB
                                                .rotulo,
                                            "pt-BR",
                                            {
                                                sensitivity:
                                                    "base",
                                            }
                                        )
                            );

                    const rotulo =
                        String(
                            candidatos[0]
                                ?.rotulo ||
                            "Sem função"
                        )
                            .trim()
                            .toLocaleUpperCase(
                                "pt-BR"
                            );

                    const chave =
                        normalizarTextoIndicadorDds(
                            rotulo
                        ) ||
                        "sem funcao";

                    grupo.itens.forEach(
                        (item) => {
                            mapaFuncaoNormalizadaPorChave
                                .set(
                                    item.chave,
                                    {
                                        rotulo,
                                        chave,
                                    }
                                );
                        }
                    );
                }
            );
            const participantesDetalhados =
                participantes.map(
                    (participante) => {
                        const funcaoOriginal =
                            String(
                                participante
                                    ?.funcao ||
                                participante
                                    ?.cargo ||
                                "Sem função"
                            ).trim() ||
                            "Sem função";

                        const funcaoPreparada =
                            prepararFuncaoAnaliticaDds(
                                funcaoOriginal
                            );

                        const funcaoNormalizada =
                            mapaFuncaoNormalizadaPorChave
                                .get(
                                    funcaoPreparada
                                        .chave
                                ) || {
                                    rotulo:
                                        funcaoOriginal
                                            .toLocaleUpperCase(
                                                "pt-BR"
                                            ),
                                    chave:
                                        normalizarTextoIndicadorDds(
                                            funcaoOriginal
                                        ) ||
                                        "sem funcao",
                                };

                        let presencas = 0;
                        let ausencias = 0;
                        let manuais = 0;

                        diasFrequencia.forEach(
                            (dia) => {
                                const status =
                                    obterStatusParticipanteDia(
                                        participante,
                                        dia
                                    );

                                if (
                                    status ===
                                    "presente"
                                ) {
                                    presencas++;
                                }
                                else if (
                                    status ===
                                    "ausente"
                                ) {
                                    ausencias++;
                                }
                                else {
                                    manuais++;
                                }
                            }
                        );

                        const totalDias =
                            diasFrequencia.length;

                        return {
                            ...participante,
                            nome:
                                String(
                                    participante
                                        ?.nome ||
                                    "Participante sem nome"
                                ).trim(),
                            funcaoOriginal,
                            funcao:
                                funcaoNormalizada
                                    .rotulo,
                            chaveFuncaoNormalizada:
                                funcaoNormalizada
                                    .chave,
                            empresa:
                                String(
                                    participante
                                        ?.empresa ||
                                    participante
                                        ?.empresaNome ||
                                    "Empresa não informada"
                                ).trim() ||
                                "Empresa não informada",
                            presencas,
                            ausencias,
                            manuais,
                            totalDias,
                            taxaAssiduidade:
                                percentualIndicadorDds(
                                    presencas,
                                    totalDias
                                ),
                            taxaAbsenteismo:
                                percentualIndicadorDds(
                                    ausencias,
                                    totalDias
                                ),
                        };
                    }
                );

            const mapaGrafiasFuncoes =
                new Map();

            participantesDetalhados.forEach(
                (participante) => {
                    const chave =
                        participante
                            .chaveFuncaoNormalizada ||
                        "sem funcao";

                    if (
                        !mapaGrafiasFuncoes.has(
                            chave
                        )
                    ) {
                        mapaGrafiasFuncoes.set(
                            chave,
                            {
                                chave,
                                funcao:
                                    participante
                                        .funcao,
                                grafias:
                                    new Set(),
                            }
                        );
                    }

                    mapaGrafiasFuncoes
                        .get(
                            chave
                        )
                        .grafias
                        .add(
                            participante
                                .funcaoOriginal ||
                            participante
                                .funcao
                        );
                }
            );

            const normalizacoesFuncoes =
                Array.from(
                    mapaGrafiasFuncoes.values()
                )
                    .map(
                        (grupo) => {
                            const grafias =
                                Array.from(
                                    grupo.grafias
                                )
                                    .filter(
                                        Boolean
                                    )
                                    .sort(
                                        (
                                            grafiaA,
                                            grafiaB
                                        ) =>
                                            grafiaA.localeCompare(
                                                grafiaB,
                                                "pt-BR",
                                                {
                                                    sensitivity:
                                                        "base",
                                                }
                                            )
                                    );

                            const houveUnificacao =
                                grafias.length >
                                    1 ||
                                grafias.some(
                                    (grafia) =>
                                        normalizarTextoIndicadorDds(
                                            grafia
                                        ) !==
                                        grupo.chave
                                );

                            return {
                                funcao:
                                    grupo.funcao,
                                grafias,
                                houveUnificacao,
                            };
                        }
                    )
                    .filter(
                        (item) =>
                            item.houveUnificacao
                    );

            const totalPossibilidades =
                participantes.length *
                diasFrequencia.length;

            const presencasGerais =
                participantesDetalhados.reduce(
                    (total, participante) =>
                        total +
                        participante.presencas,
                    0
                );

            const ausenciasGerais =
                participantesDetalhados.reduce(
                    (total, participante) =>
                        total +
                        participante.ausencias,
                    0
                );

            const manuaisGerais =
                participantesDetalhados.reduce(
                    (total, participante) =>
                        total +
                        participante.manuais,
                    0
                );

            const totalClassificacoesFechadas =
                presencasGerais +
                ausenciasGerais;

            const totalComPendencias =
                totalClassificacoesFechadas +
                manuaisGerais;

            const baseTemDimensao =
                participantes.length >
                    0 &&
                diasFrequencia.length >
                    0;

            const baseFrequenciaConsistente =
                baseTemDimensao &&
                manuaisGerais ===
                    0 &&
                totalClassificacoesFechadas ===
                    totalPossibilidades &&
                totalComPendencias ===
                    totalPossibilidades;

            const mensagemInconsistenciaBase =
                !baseTemDimensao
                    ? "Indicador não calculável — dado ausente"
                    : `Indicador não calculável — inconsistência na base de dados (esperado ${totalPossibilidades}, obtido ${totalClassificacoesFechadas})`;

            const detalhesBaseFrequencia = [
                `N funcionários: ${participantes.length}`,
                detalheComposicaoBaseParticipantes,
                `D dias apurados (sem sábado/domingo/hora extra integral): ${diasFrequencia.length}`,
                `N×D possibilidades totais: ${totalPossibilidades}`,
                `Presenças + ausências: ${totalClassificacoesFechadas}`,
                `Pendências manuais: ${manuaisGerais}`,
            ];

            const criarIndicadorFrequenciaValidadaDds =
                ({
                    nome,
                    valor,
                    interpretacao,
                    nivel,
                    detalhes = [],
                }) => {
                    if (
                        baseFrequenciaConsistente
                    ) {
                        return criarIndicadorDds({
                            nome,
                            valor,
                            interpretacao,
                            nivel,
                            detalhes: [
                                ...detalhesBaseFrequencia,
                                ...detalhes,
                            ],
                        });
                    }

                    return criarIndicadorDds({
                        nome,
                        valor:
                            mensagemInconsistenciaBase,
                        interpretacao:
                            baseTemDimensao
                                ? "A soma de presenças e ausências não fecha com N×D. O indicador foi bloqueado até a resolução das pendências."
                                : "Não existem funcionários e dias apurados suficientes para calcular.",
                        nivel:
                            baseTemDimensao
                                ? "critico"
                                : "nao_calculavel",
                        detalhes:
                            detalhesBaseFrequencia,
                    });
                };

            const taxaAbsenteismoGeral =
                baseFrequenciaConsistente
                    ? percentualIndicadorDds(
                        ausenciasGerais,
                        totalPossibilidades
                    )
                    : null;

            const taxaAssiduidadeGeral =
                baseFrequenciaConsistente
                    ? percentualIndicadorDds(
                        presencasGerais,
                        totalPossibilidades
                    )
                    : null;

            const mapaFuncoes =
                new Map();

            participantesDetalhados.forEach(
                (participante) => {
                    const chave =
                        participante
                            .chaveFuncaoNormalizada ||
                        normalizarTextoIndicadorDds(
                            participante.funcao
                        ) ||
                        "sem funcao";

                    if (
                        !mapaFuncoes.has(chave)
                    ) {
                        mapaFuncoes.set(
                            chave,
                            {
                                funcao:
                                    participante.funcao,
                                funcionarios: 0,
                                presencas: 0,
                                ausencias: 0,
                                manuais: 0,
                                totalEsperado: 0,
                            }
                        );
                    }

                    const grupo =
                        mapaFuncoes.get(chave);

                    grupo.funcionarios++;
                    grupo.presencas +=
                        participante.presencas;
                    grupo.ausencias +=
                        participante.ausencias;
                    grupo.manuais +=
                        participante.manuais;
                    grupo.totalEsperado +=
                        participante.totalDias;
                }
            );

            const indicadoresPorFuncao =
                Array.from(
                    mapaFuncoes.values()
                )
                    .map(
                        (grupo) => {
                            const baseConsistente =
                                grupo.manuais ===
                                    0 &&
                                (
                                    grupo.presencas +
                                    grupo.ausencias
                                ) ===
                                    grupo.totalEsperado;

                            return {
                                ...grupo,
                                baseConsistente,
                                taxaAssiduidade:
                                    baseConsistente
                                        ? percentualIndicadorDds(
                                            grupo.presencas,
                                            grupo.totalEsperado
                                        )
                                        : null,
                                taxaAbsenteismo:
                                    baseConsistente
                                        ? percentualIndicadorDds(
                                            grupo.ausencias,
                                            grupo.totalEsperado
                                        )
                                        : null,
                            };
                        }
                    )
                    .sort(
                        (a, b) =>
                            numeroSeguroIndicadorDds(
                                b.taxaAssiduidade
                            ) -
                            numeroSeguroIndicadorDds(
                                a.taxaAssiduidade
                            )
                    );

            const baseFuncoesConsistente =
                baseFrequenciaConsistente &&
                indicadoresPorFuncao.every(
                    (item) =>
                        item.baseConsistente
                );

            const niveisFuncoes =
                baseFuncoesConsistente
                    ? indicadoresPorFuncao.map(
                        (item) =>
                            classificarAbsenteismoIndicadorDds(
                                item.taxaAbsenteismo
                            )
                    )
                    : [];

            const funcoesCriticas =
                baseFuncoesConsistente
                    ? indicadoresPorFuncao.filter(
                        (item) =>
                            classificarAbsenteismoIndicadorDds(
                                item.taxaAbsenteismo
                            ) ===
                            "critico"
                    ).length
                    : 0;

            const funcoesAtencao =
                baseFuncoesConsistente
                    ? indicadoresPorFuncao.filter(
                        (item) =>
                            classificarAbsenteismoIndicadorDds(
                                item.taxaAbsenteismo
                            ) ===
                            "atencao"
                    ).length
                    : 0;

            const ausenciasParciais =
                baseFrequenciaConsistente
                    ? participantesDetalhados
                        .filter(
                            (participante) =>
                                participante.ausencias >=
                                    2 &&
                                participante.presencas >=
                                    1 &&
                                (
                                    participante.presencas +
                                    participante.ausencias
                                ) ===
                                    participante.totalDias
                        )
                        .sort(
                            (a, b) =>
                                b.ausencias -
                                a.ausencias
                        )
                    : [];

            const ausenciasTotais =
                baseFrequenciaConsistente
                    ? participantesDetalhados
                        .filter(
                            (participante) =>
                                participante.totalDias >
                                    0 &&
                                participante.presencas ===
                                    0 &&
                                participante.ausencias ===
                                    participante.totalDias
                        )
                        .sort(
                            (a, b) =>
                                a.nome.localeCompare(
                                    b.nome,
                                    "pt-BR",
                                    {
                                        sensitivity:
                                            "base",
                                    }
                                )
                        )
                    : [];

            const rotatividadeCalculavel =
                baseFrequenciaConsistente &&
                diasFrequencia.length >
                    2;

            const rotatividadeAparente =
                rotatividadeCalculavel
                    ? participantesDetalhados.filter(
                        (participante) =>
                            participante.presencas >=
                                1 &&
                            participante.presencas <=
                                2
                    )
                    : [];

            const taxaRotatividadeAparente =
                rotatividadeCalculavel
                    ? percentualIndicadorDds(
                        rotatividadeAparente.length,
                        participantes.length
                    )
                    : null;

            /*
             * dds_detalhamento_nominal_xlsx_v1
             *
             * Estrutura exclusiva de apresentação e exportação.
             * Reutiliza os mesmos dias, participantes, status e
             * classificações usados pelos indicadores analíticos.
             */
            const diasDetalhamentoNominal =
                diasFrequencia.map(
                    (
                        dia,
                        indiceDia
                    ) => ({
                        indice:
                            indiceDia + 1,
                        chave:
                            obterChaveDiaIndicadorDds(
                                dia
                            ),
                        rotulo:
                            obterNomeDiaIndicadorDds(
                                dia
                            ),
                        data:
                            String(
                                dia?.data ||
                                dia?.dataDds ||
                                dia?.dia ||
                                ""
                            ).trim(),
                        curto:
                            String(
                                dia?.curto ||
                                ""
                            ).trim(),
                        tema:
                            String(
                                dia?.temaConfirmado ||
                                dia?.temaPlanejado ||
                                ""
                            ).trim(),
                        responsavel:
                            String(
                                dia
                                    ?.responsavelConfirmado ||
                                dia
                                    ?.responsavelPlanejado ||
                                ""
                            ).trim(),
                    })
                );

            const detalhamentoNominal = {
                baseConsistente:
                    baseFrequenciaConsistente,
                rotatividadeCalculavel,
                dias:
                    diasDetalhamentoNominal,
                participantes:
                    participantesDetalhados.map(
                        (participante) => ({
                            numero:
                                Number(
                                    participante
                                        ?.numero ||
                                    0
                                ),
                            nome:
                                participante.nome,
                            empresa:
                                participante.empresa,
                            funcaoOriginal:
                                participante
                                    .funcaoOriginal,
                            funcaoNormalizada:
                                participante.funcao,
                            codigoSafescan:
                                String(
                                    participante
                                        ?.codigoSafescan ||
                                    ""
                                ).trim(),
                            origem:
                                String(
                                    participante
                                        ?.origem ||
                                    ""
                                ).trim(),
                            tipo:
                                String(
                                    participante
                                        ?.tipo ||
                                    ""
                                ).trim(),
                            presencas:
                                participante.presencas,
                            ausencias:
                                participante.ausencias,
                            manuais:
                                participante.manuais,
                            totalDias:
                                participante.totalDias,
                            taxaAssiduidade:
                                participante
                                    .taxaAssiduidade,
                            taxaAbsenteismo:
                                participante
                                    .taxaAbsenteismo,
                            ausenciaParcial:
                                ausenciasParciais
                                    .includes(
                                        participante
                                    ),
                            ausenciaTotal:
                                ausenciasTotais
                                    .includes(
                                        participante
                                    ),
                            rotatividadeAparente:
                                rotatividadeAparente
                                    .includes(
                                        participante
                                    ),
                            statusPorDia:
                                diasFrequencia.map(
                                    (dia) => ({
                                        chave:
                                            obterChaveDiaIndicadorDds(
                                                dia
                                            ),
                                        status:
                                            obterStatusParticipanteDia(
                                                participante,
                                                dia
                                            ),
                                    })
                                ),
                        })
                    ),
            };
            const diasProgramadosInformados =
                numeroSeguroIndicadorDds(
                    dadosDds
                        ?.diasUteisProgramados ??
                    dadosDds
                        ?.dias_uteis_programados,
                    0
                );

            const diasProgramados =
                diasProgramadosInformados > 0
                    ? diasProgramadosInformados
                    : diasAtivos.length;

            const diasAplicados =
                diasAtivos.filter(
                    (dia) =>
                        String(
                            dia
                                ?.temaConfirmado ||
                            ""
                        ).trim() &&
                        String(
                            dia
                                ?.responsavelConfirmado ||
                            ""
                        ).trim()
                );

            const diasNaoAplicados =
                diasAtivos.filter(
                    (dia) =>
                        !String(
                            dia
                                ?.temaConfirmado ||
                            ""
                        ).trim() ||
                        !String(
                            dia
                                ?.responsavelConfirmado ||
                            ""
                        ).trim()
                );

            const diasSemAtividade =
                diasTodos.filter(
                    (dia) =>
                        dia
                            ?.semAtividadeConfirmada ===
                        true
                );

            /*
             * dds_relatorio_analitico_correcoes_aplicadas_v1
             *
             * Mantém cada ocorrência diária do tema, sua procedência
             * documental e o alerta aplicável sem consolidar ocorrências
             * repetidas em uma única linha.
             */
            const ocorrenciasTemasDocumentadas =
                diasAplicados.map(
                    (dia) => {
                        const tema =
                            String(
                                dia
                                    ?.temaConfirmado ||
                                ""
                            ).trim();

                        const origemDocumental =
                            String(
                                dia
                                    ?.origemDocumentalTemaConfirmado ||
                                ""
                            )
                                .trim()
                                .toLowerCase();

                        const rotuloOrigem =
                            origemDocumental ===
                            "pdf_assinado"
                                ? "extraído do PDF assinado"
                                : origemDocumental ===
                                    "sistema_manual"
                                    ? "preenchido/editado manualmente no sistema"
                                    : "origem documental não classificada";

                        const aviso =
                            origemDocumental ===
                            "sistema_manual"
                                ? "tema confirmado no sistema, mas não localizado na folha assinada"
                                : "";

                        const identificacaoDia =
                            obterNomeDiaIndicadorDds(
                                dia
                            );

                        return {
                            dia:
                                identificacaoDia,
                            tema,
                            origemDocumental,
                            rotuloOrigem,
                            aviso,
                            detalhe:
                                `${identificacaoDia}: ${tema} (${rotuloOrigem})${
                                    aviso
                                        ? ` — ${aviso}`
                                        : ""
                                }`,
                        };
                    }
                );

            const ocorrenciasTemasComOrigemClassificada =
                ocorrenciasTemasDocumentadas.filter(
                    (ocorrencia) =>
                        [
                            "pdf_assinado",
                            "sistema_manual",
                        ].includes(
                            ocorrencia
                                .origemDocumental
                        )
                ).length;

            const todasOcorrenciasTemasClassificadas =
                ocorrenciasTemasDocumentadas.length >
                    0 &&
                ocorrenciasTemasComOrigemClassificada ===
                    ocorrenciasTemasDocumentadas.length;

            const taxaCobertura =
                percentualIndicadorDds(
                    diasAplicados.length,
                    diasProgramados
                );

            const temasDistintos =
                new Set(
                    diasAplicados
                        .map(
                            (dia) =>
                                normalizarTextoIndicadorDds(
                                    dia
                                        ?.temaConfirmado
                                )
                        )
                        .filter(Boolean)
                );

            let nivelDiversidade =
                "normal";

            if (
                diasAplicados.length > 0 &&
                temasDistintos.size < 2
            ) {
                nivelDiversidade =
                    "critico";
            }
            else if (
                diasAplicados.length >= 4 &&
                temasDistintos.size < 4
            ) {
                nivelDiversidade =
                    "atencao";
            }

            const camposCabecalho = [
                dadosDds?.codigo ||
                    registroScannerDds?.codigo,
                dadosDds?.periodoInicio ||
                    registroScannerDds
                        ?.periodoInicio,
                dadosDds?.periodoFim ||
                    registroScannerDds
                        ?.periodoFim,
                dadosDds?.obraNome ||
                    dadosDds?.obra ||
                    registroScannerDds
                        ?.obraNome,
            ];

            const totalCamposCabecalho =
                camposCabecalho.length;

            const camposCabecalhoPreenchidos =
                camposCabecalho.filter(
                    (valor) =>
                        String(
                            valor ||
                            ""
                        ).trim()
                ).length;

            const totalCamposDias =
                diasAtivos.length *
                3;

            const camposDiasPreenchidos =
                diasAtivos.reduce(
                    (total, dia) =>
                        total +
                        (
                            String(
                                dia
                                    ?.temaConfirmado ||
                                ""
                            ).trim()
                                ? 1
                                : 0
                        ) +
                        (
                            String(
                                dia
                                    ?.responsavelConfirmado ||
                                ""
                            ).trim()
                                ? 1
                                : 0
                        ) +
                        (
                            dia
                                ?.jornadaValida ===
                            true
                                ? 1
                                : 0
                        ),
                    0
                );

            const totalCamposObrigatorios =
                totalCamposCabecalho +
                totalCamposDias +
                totalPossibilidades;

            const camposObrigatoriosPreenchidos =
                camposCabecalhoPreenchidos +
                camposDiasPreenchidos +
                (
                    totalPossibilidades -
                    manuaisGerais
                );

            const taxaPreenchimentoCompleto =
                percentualIndicadorDds(
                    camposObrigatoriosPreenchidos,
                    totalCamposObrigatorios
                );


            const camposIntegracao = [
                "ddsIntegracaoConcluido",
                "dds_integracao_concluido",
                "integracaoRealizada",
                "integracao_realizada",
            ];

            const possuiDadosIntegracao =
                participantes.some(
                    (participante) =>
                        camposIntegracao.some(
                            (campo) =>
                                Object.prototype
                                    .hasOwnProperty
                                    .call(
                                        participante,
                                        campo
                                    )
                        )
                );

            const dataReferenciaIntegracao =
                parseDataIndicadorDds(
                    dadosDds?.periodoFim ||
                    registroScannerDds
                        ?.periodoFim ||
                    dadosDds?.periodoInicio ||
                    registroScannerDds
                        ?.periodoInicio
                );

            let novosSemIntegracao = [];

            if (
                possuiDadosIntegracao &&
                dataReferenciaIntegracao
            ) {
                novosSemIntegracao =
                    participantes.filter(
                        (participante) => {
                            const dataAdmissao =
                                parseDataIndicadorDds(
                                    participante
                                        ?.dataAdmissao ||
                                    participante
                                        ?.data_admissao
                                );

                            if (!dataAdmissao) {
                                return false;
                            }

                            const diasDesdeAdmissao =
                                Math.floor(
                                    (
                                        dataReferenciaIntegracao
                                            .getTime() -
                                        dataAdmissao
                                            .getTime()
                                    ) /
                                    86400000
                                );

                            if (
                                diasDesdeAdmissao <
                                    0 ||
                                diasDesdeAdmissao >
                                    30
                            ) {
                                return false;
                            }

                            let valorIntegracao;

                            for (
                                const campo of
                                camposIntegracao
                            ) {
                                if (
                                    Object.prototype
                                        .hasOwnProperty
                                        .call(
                                            participante,
                                            campo
                                        )
                                ) {
                                    valorIntegracao =
                                        participante[
                                            campo
                                        ];
                                    break;
                                }
                            }

                            const textoIntegracao =
                                normalizarTextoIndicadorDds(
                                    valorIntegracao
                                );

                            const integrado =
                                valorIntegracao ===
                                    true ||
                                [
                                    "sim",
                                    "concluido",
                                    "realizado",
                                    "ok",
                                ].includes(
                                    textoIntegracao
                                );

                            return !integrado;
                        }
                    );
            }

            const participantesComSetor =
                participantesDetalhados.filter(
                    (participante) =>
                        String(
                            participante
                                ?.setor ||
                            participante
                                ?.frenteTrabalho ||
                            participante
                                ?.frente_trabalho ||
                            ""
                        ).trim()
                );

            const mapaSetores =
                new Map();

            participantesComSetor.forEach(
                (participante) => {
                    const setor =
                        String(
                            participante
                                ?.setor ||
                            participante
                                ?.frenteTrabalho ||
                            participante
                                ?.frente_trabalho
                        ).trim();

                    const chave =
                        normalizarTextoIndicadorDds(
                            setor
                        );

                    if (
                        !mapaSetores.has(chave)
                    ) {
                        mapaSetores.set(
                            chave,
                            {
                                setor,
                                presencas: 0,
                                totalEsperado: 0,
                            }
                        );
                    }

                    const grupo =
                        mapaSetores.get(chave);

                    grupo.presencas +=
                        participante.presencas;

                    grupo.totalEsperado +=
                        participante.totalDias;
                }
            );

            const coberturaSetores =
                Array.from(
                    mapaSetores.values()
                ).map(
                    (grupo) => ({
                        ...grupo,
                        taxa:
                            percentualIndicadorDds(
                                grupo.presencas,
                                grupo.totalEsperado
                            ),
                    })
                );

            const camposRecados = [
                "recadosPreenchidos",
                "recados_preenchidos",
                "recados",
                "pontosReforcados",
                "pontos_reforcados",
            ];

            let campoRecadosLocalizado =
                null;

            for (
                const campo of
                camposRecados
            ) {
                if (
                    Object.prototype
                        .hasOwnProperty
                        .call(
                            dadosDds || {},
                            campo
                        )
                ) {
                    campoRecadosLocalizado =
                        dadosDds[campo];

                    break;
                }
            }

            let taxaRecados = null;

            if (
                campoRecadosLocalizado !==
                null
            ) {
                const preenchido =
                    typeof campoRecadosLocalizado ===
                    "boolean"
                        ? campoRecadosLocalizado
                        : Array.isArray(
                            campoRecadosLocalizado
                        )
                            ? campoRecadosLocalizado
                                .some(
                                    (item) =>
                                        String(
                                            item ||
                                            ""
                                        ).trim()
                                )
                            : Boolean(
                                String(
                                    campoRecadosLocalizado ||
                                    ""
                                ).trim()
                            );

                taxaRecados =
                    preenchido
                        ? 100
                        : 0;
            }

            const camposAssinaturaSuspeita = [
                "assinaturaSuspeita",
                "assinatura_suspeita",
            ];

            const possuiCampoAssinaturaSuspeita =
                participantes.some(
                    (participante) =>
                        camposAssinaturaSuspeita
                            .some(
                                (campo) =>
                                    Object.prototype
                                        .hasOwnProperty
                                        .call(
                                            participante,
                                            campo
                                        )
                            ) ||
                        Object.prototype
                            .hasOwnProperty
                            .call(
                                participante,
                                "statusAssinatura"
                            )
                );

            const assinaturasSuspeitas =
                participantes.filter(
                    (participante) => {
                        const suspeitaDireta =
                            participante
                                ?.assinaturaSuspeita ===
                                true ||
                            participante
                                ?.assinatura_suspeita ===
                                true;

                        const statusSuspeito =
                            normalizarTextoIndicadorDds(
                                participante
                                    ?.statusAssinatura
                            ) ===
                            "suspeita";

                        return (
                            suspeitaDireta ||
                            statusSuspeito
                        );
                    }
                );

            const taxaAssinaturasSuspeitas =
                possuiCampoAssinaturaSuspeita
                    ? percentualIndicadorDds(
                        assinaturasSuspeitas
                            .length,
                        participantes.length
                    )
                    : null;

            const blocoPresenca = {
                titulo:
                    "1. Presença e absenteísmo",
                indicadores: [
                    criarIndicadorDds({
                        nome:
                            "Base única de participantes",
                        valor:
                            baseTemDimensao
                                ? `${participantes.length} funcionário(s) × ${diasFrequencia.length} dia(s) útil(eis) = ${totalPossibilidades} possibilidades (sábado/domingo/hora extra integral fora da taxa)`
                                : "Indicador não calculável — dado ausente",
                        interpretacao:
                            baseTemDimensao
                                ? "Esta é a base única obrigatória utilizada nos indicadores de presença, ausência e rotatividade."
                                : "Não existem funcionários e dias apurados suficientes para declarar N, D e N×D.",
                        nivel:
                            baseTemDimensao
                                ? "normal"
                                : "nao_calculavel",
                        detalhes:
                            detalhesBaseFrequencia,
                    }),
                    criarIndicadorDds({
                        nome:
                            "Validação cruzada da frequência",
                        valor:
                            baseFrequenciaConsistente
                                ? `${totalClassificacoesFechadas} de ${totalPossibilidades} classificações fechadas`
                                : mensagemInconsistenciaBase,
                        interpretacao:
                            baseFrequenciaConsistente
                                ? "A soma de presenças e ausências fecha exatamente com N×D."
                                : baseTemDimensao
                                    ? "Existem campos manuais ou diferença entre presenças + ausências e N×D; as taxas dependentes foram bloqueadas."
                                    : "A validação não pode ser executada sem participantes e dias apurados.",
                        nivel:
                            baseFrequenciaConsistente
                                ? "normal"
                                : baseTemDimensao
                                    ? "critico"
                                    : "nao_calculavel",
                        detalhes:
                            detalhesBaseFrequencia,
                    }),
                    criarIndicadorDds({
                        nome:
                            "Normalização de funções",
                        valor:
                            normalizacoesFuncoes
                                .length > 0
                                ? `${normalizacoesFuncoes.length} categoria(s) com grafias unificadas`
                                : "Nenhuma unificação adicional necessária",
                        interpretacao:
                            "As funções foram normalizadas antes dos agrupamentos de assiduidade e absenteísmo.",
                        nivel:
                            "normal",
                        detalhes:
                            normalizacoesFuncoes
                                .length > 0
                                ? normalizacoesFuncoes.map(
                                    (item) =>
                                        `${item.funcao} ← ${item.grafias.join(" | ")}`
                                )
                                : [
                                    "As grafias encontradas já pertencem a categorias únicas.",
                                ],
                    }),
                    criarIndicadorFrequenciaValidadaDds({
                        nome:
                            "Taxa de absenteísmo geral",
                        valor:
                            formatarPercentualIndicadorDds(
                                taxaAbsenteismoGeral
                            ),
                        interpretacao:
                            `${ausenciasGerais} ausência(s) em ${totalPossibilidades} possibilidade(s) de presença.`,
                        nivel:
                            classificarAbsenteismoIndicadorDds(
                                taxaAbsenteismoGeral
                            ),
                    }),
                    criarIndicadorFrequenciaValidadaDds({
                        nome:
                            "Taxa de assiduidade geral",
                        valor:
                            formatarPercentualIndicadorDds(
                                taxaAssiduidadeGeral
                            ),
                        interpretacao:
                            `${presencasGerais} presença(s) em ${totalPossibilidades} possibilidade(s) de presença.`,
                        nivel:
                            classificarAssiduidadeIndicadorDds(
                                taxaAssiduidadeGeral
                            ),
                    }),
                    baseFuncoesConsistente
                        ? criarIndicadorDds({
                            nome:
                                "Absenteísmo por função normalizada",
                            valor:
                                `${funcoesCriticas} crítica(s) e ${funcoesAtencao} em atenção`,
                            interpretacao:
                                "As funções foram agrupadas após a normalização das grafias.",
                            nivel:
                                maiorNivelIndicadorDds(
                                    niveisFuncoes
                                ),
                            detalhes: [
                                ...detalhesBaseFrequencia,
                                ...indicadoresPorFuncao.map(
                                    (item) =>
                                        `${item.funcao}: ${formatarPercentualIndicadorDds(item.taxaAbsenteismo)} — ${item.ausencias} ausência(s) de ${item.totalEsperado}`
                                ),
                            ],
                        })
                        : criarIndicadorDds({
                            nome:
                                "Absenteísmo por função normalizada",
                            valor:
                                mensagemInconsistenciaBase,
                            interpretacao:
                                "O agrupamento por função foi bloqueado porque a frequência não fecha com a base declarada.",
                            nivel:
                                baseTemDimensao
                                    ? "critico"
                                    : "nao_calculavel",
                            detalhes:
                                detalhesBaseFrequencia,
                        }),
                    baseFuncoesConsistente
                        ? criarIndicadorDds({
                            nome:
                                "Índice de assiduidade por função normalizada",
                            valor:
                                indicadoresPorFuncao
                                    .length > 0
                                    ? `${indicadoresPorFuncao[0].funcao}: ${formatarPercentualIndicadorDds(indicadoresPorFuncao[0].taxaAssiduidade)}`
                                    : "Indicador não calculável — dado ausente",
                            interpretacao:
                                "Ranking ordenado da maior para a menor taxa de comparecimento.",
                            nivel:
                                classificarAssiduidadeIndicadorDds(
                                    taxaAssiduidadeGeral
                                ),
                            detalhes: [
                                ...detalhesBaseFrequencia,
                                ...indicadoresPorFuncao.map(
                                    (
                                        item,
                                        indice
                                    ) =>
                                        `${indice + 1}º ${item.funcao}: ${formatarPercentualIndicadorDds(item.taxaAssiduidade)}`
                                ),
                            ],
                        })
                        : criarIndicadorDds({
                            nome:
                                "Índice de assiduidade por função normalizada",
                            valor:
                                mensagemInconsistenciaBase,
                            interpretacao:
                                "O ranking por função foi bloqueado porque a frequência não fecha com a base declarada.",
                            nivel:
                                baseTemDimensao
                                    ? "critico"
                                    : "nao_calculavel",
                            detalhes:
                                detalhesBaseFrequencia,
                        }),
                    criarIndicadorFrequenciaValidadaDds({
                        nome:
                            "Ausência parcial — 2 ou mais faltas",
                        valor:
                            `${ausenciasParciais.length}`,
                        interpretacao:
                            ausenciasParciais
                                .length > 0
                                ? "Funcionários que faltaram em dois ou mais dias, mas tiveram ao menos uma presença confirmada."
                                : "Nenhuma ausência parcial recorrente foi localizada.",
                        nivel:
                            ausenciasParciais
                                .length >= 3
                                ? "critico"
                                : ausenciasParciais
                                    .length > 0
                                    ? "atencao"
                                    : "normal",
                        detalhes:
                            ausenciasParciais.map(
                                (participante) =>
                                    `${participante.nome}: ${participante.ausencias} ausência(s) e ${participante.presencas} presença(s)`
                            ),
                    }),
                    criarIndicadorFrequenciaValidadaDds({
                        nome:
                            "Ausência total — nenhuma presença na semana",
                        valor:
                            `${ausenciasTotais.length}`,
                        interpretacao:
                            ausenciasTotais
                                .length > 0
                                ? "Alerta crítico: funcionários cadastrados na lista sem nenhuma presença confirmada; exige validação cadastral e documental."
                                : "Nenhum funcionário permaneceu ausente durante todos os dias apurados.",
                        nivel:
                            ausenciasTotais
                                .length > 0
                                ? "critico"
                                : "normal",
                        detalhes:
                            ausenciasTotais.map(
                                (participante) =>
                                    `${participante.nome}: ausência nos ${participante.totalDias} dia(s) apurados`
                            ),
                    }),
                    rotatividadeCalculavel
                        ? criarIndicadorDds({
                            nome:
                                "Rotatividade aparente",
                            valor:
                                formatarPercentualIndicadorDds(
                                    taxaRotatividadeAparente
                                ),
                            interpretacao:
                                `${rotatividadeAparente.length} de ${participantes.length} funcionário(s) compareceram em somente um ou dois dias.`,
                            nivel:
                                classificarOcorrenciaPercentualIndicadorDds(
                                    taxaRotatividadeAparente
                                ),
                            detalhes: [
                                ...detalhesBaseFrequencia,
                                ...rotatividadeAparente.map(
                                    (participante) =>
                                        `${participante.nome}: ${participante.presencas} dia(s)`
                                ),
                            ],
                        })
                        : baseFrequenciaConsistente
                            ? criarIndicadorDds({
                                nome:
                                    "Rotatividade aparente",
                                valor:
                                    "Indicador não calculável — dado ausente",
                                interpretacao:
                                    "São necessários pelo menos três dias apurados para identificar presença em somente um ou dois dias.",
                                nivel:
                                    "nao_calculavel",
                                detalhes:
                                    detalhesBaseFrequencia,
                            })
                            : criarIndicadorFrequenciaValidadaDds({
                                nome:
                                    "Rotatividade aparente",
                                valor:
                                    null,
                                interpretacao:
                                    "",
                                nivel:
                                    "nao_calculavel",
                            }),
                ],
            };

            const blocoCobertura = {
                titulo:
                    "2. Cobertura e aplicação do DDS",
                indicadores: [
                    criarIndicadorDds({
                        nome:
                            "Taxa de cobertura de DDS",
                        valor:
                            formatarPercentualIndicadorDds(
                                taxaCobertura
                            ),
                        interpretacao:
                            `${diasAplicados.length} de ${diasProgramados} dia(s) programado(s) possuem tema e responsável confirmados.`,
                        nivel:
                            classificarCoberturaIndicadorDds(
                                taxaCobertura
                            ),
                    }),
                    criarIndicadorDds({
                        nome:
                            "Dias sem DDS",
                        valor:
                            `${diasSemAtividade.length} sem atividade | ${diasNaoAplicados.length} não aplicado(s)`,
                        interpretacao:
                            "Dias sem atividade são separados de dias em que havia atividade, mas o DDS não foi confirmado.",
                        nivel:
                            diasNaoAplicados
                                .length > 1
                                ? "critico"
                                : diasNaoAplicados
                                    .length === 1
                                    ? "atencao"
                                    : "normal",
                        detalhes: [
                            ...diasSemAtividade.map(
                                (dia) =>
                                    `${obterNomeDiaIndicadorDds(dia)}: sem atividade`
                            ),
                            ...diasNaoAplicados.map(
                                (dia) =>
                                    `${obterNomeDiaIndicadorDds(dia)}: não aplicado`
                            ),
                        ],
                    }),
                    criarIndicadorDds({
                        nome:
                            "Diversidade temática",
                        valor:
                            `${temasDistintos.size} tema(s) distinto(s)`,
                        interpretacao:
                            "Quantidade de temas únicos entre os dias com DDS aplicado.",
                        nivel:
                            nivelDiversidade,
                        detalhes:
                            ocorrenciasTemasDocumentadas.map(
                                (ocorrencia) =>
                                    ocorrencia.detalhe
                            ),
                    }),
                ],
            };

            /*
             * dds_discrepancia_assinatura_ausencias_totais_v1
             *
             * Reutiliza exatamente a lista única ausenciasTotais.
             * Não cria nova classificação nem recalcula frequência.
             */
            const blocoConformidade = {
                titulo:
                    "3. Conformidade documental",
                indicadores: [
                    criarIndicadorDds({
                        nome:
                            "Taxa de preenchimento completo",
                        valor:
                            formatarPercentualIndicadorDds(
                                taxaPreenchimentoCompleto
                            ),
                        interpretacao:
                            `${camposObrigatoriosPreenchidos} de ${totalCamposObrigatorios} campos obrigatórios estão preenchidos.`,
                        nivel:
                            classificarPreenchimentoIndicadorDds(
                                taxaPreenchimentoCompleto
                            ),
                    }),
                    /*
                     * dds_discrepancia_assinatura_percentual_v1
                     *
                     * Reutiliza a lista única ausenciasTotais sem
                     * criar nova classificação de frequência.
                     */
                    criarIndicadorFrequenciaValidadaDds({
                        nome:
                            "Discrepância assinatura x presença esperada",
                        valor:
                            participantes.length > 0
                                ? `${ausenciasTotais.length}/${participantes.length} (${formatarPercentualIndicadorDds(
                                    percentualIndicadorDds(
                                        ausenciasTotais.length,
                                        participantes.length
                                    )
                                )})`
                                : `${ausenciasTotais.length}`,
                        interpretacao:
                            ausenciasTotais.length > 0
                                ? "Participantes sem nenhuma presença confirmada foram direcionados à conferência de assinatura no documento físico."
                                : "Nenhum participante exige conferência de assinatura por ausência total.",
                        nivel:
                            ausenciasTotais.length > 0
                                ? "critico"
                                : "normal",
                        detalhes:
                            ausenciasTotais.map(
                                (participante) =>
                                    `${participante.nome}: ausência total nos ${participante.totalDias} dia(s); conferir assinatura no documento físico`
                            ),
                    }),
                ],
            };

            const indicadorIntegracao =
                possuiDadosIntegracao &&
                dataReferenciaIntegracao
                    ? criarIndicadorDds({
                        nome:
                            "Funcionários novos sem DDS de integração",
                        valor:
                            `${novosSemIntegracao.length}`,
                        interpretacao:
                            "Admitidos nos 30 dias anteriores ao período sem integração confirmada.",
                        nivel:
                            novosSemIntegracao
                                .length >= 3
                                ? "critico"
                                : novosSemIntegracao
                                    .length > 0
                                    ? "atencao"
                                    : "normal",
                        detalhes:
                            novosSemIntegracao.map(
                                (participante) =>
                                    String(
                                        participante
                                            ?.nome ||
                                        "Funcionário sem nome"
                                    )
                            ),
                    })
                    : criarIndicadorNaoCalculavelDds(
                        "Funcionários novos sem DDS de integração",
                        "O cadastro atual não fornece um campo estruturado confirmando a realização do DDS de integração."
                    );

            const indicadorSetores =
                coberturaSetores.length > 0
                    ? criarIndicadorDds({
                        nome:
                            "Cobertura por frente de trabalho/setor",
                        valor:
                            `${coberturaSetores.length} setor(es) identificado(s)`,
                        interpretacao:
                            "A cobertura foi calculada pela presença registrada em cada frente ou setor.",
                        nivel:
                            maiorNivelIndicadorDds(
                                coberturaSetores.map(
                                    (item) =>
                                        classificarAssiduidadeIndicadorDds(
                                            item.taxa
                                        )
                                )
                            ),
                        detalhes:
                            coberturaSetores.map(
                                (item) =>
                                    `${item.setor}: ${formatarPercentualIndicadorDds(item.taxa)}`
                            ),
                    })
                    : criarIndicadorNaoCalculavelDds(
                        "Cobertura por frente de trabalho/setor",
                        "Os participantes não possuem frente de trabalho ou setor estruturado no DDS."
                    );

            const blocoRisco = {
                titulo:
                    "4. Risco e priorização",
                indicadores: [
                    indicadorIntegracao,
                    indicadorSetores,
                ],
            };

            const comparativosHistoricos = (Array.isArray(historicoMensalMaoDeObraDds)
                ? historicoMensalMaoDeObraDds
                : [])
                .map((registro) => {
                    const conferencia = registro?.dados?.conferenciaAssistida || {};
                    const fechamento = conferencia?.fechamento || registro?.dados?.fechamento || {};
                    const status = String(
                        fechamento?.status || registro?.statusConferencia || ""
                    ).trim().toLowerCase();
                    const estatisticas = fechamento?.estatisticas || conferencia?.estatisticas || {};
                    const presencas = Number(
                        estatisticas?.presencas ?? fechamento?.resumo?.presencas ?? 0
                    );
                    const ausencias = Number(
                        estatisticas?.ausencias ?? fechamento?.resumo?.ausencias ?? 0
                    );
                    const total = presencas + ausencias;

                    if (status !== "concluida" || total <= 0) return null;

                    return {
                        codigo: String(registro?.codigo || registro?.dados?.codigo || "DDS").trim(),
                        presencas,
                        total,
                        taxa: (presencas / total) * 100,
                    };
                })
                .filter(Boolean);

            const indicadorEvolucaoPresenca = comparativosHistoricos.length >= 2
                ? (() => {
                    const primeiro = comparativosHistoricos[0];
                    const ultimo = comparativosHistoricos[comparativosHistoricos.length - 1];
                    const variacao = ultimo.taxa - primeiro.taxa;
                    return criarIndicadorDds({
                        nome: "Evolução da taxa de presença semana a semana",
                        valor: `${formatarPercentualIndicadorDds(primeiro.taxa)} → ${formatarPercentualIndicadorDds(ultimo.taxa)}`,
                        interpretacao: `Comparação de ${comparativosHistoricos.length} DDS concluídos no histórico mensal. Variação de ${variacao >= 0 ? "+" : ""}${variacao.toFixed(2).replace(".", ",")} p.p.`,
                        nivel: variacao >= 0 ? "normal" : variacao > -10 ? "atencao" : "critico",
                        detalhes: comparativosHistoricos.map(
                            (item) => `${item.codigo}: ${formatarPercentualIndicadorDds(item.taxa)} (${item.presencas}/${item.total})`
                        ),
                    });
                })()
                : criarIndicadorNaoCalculavelDds(
                    "Evolução da taxa de presença semana a semana",
                    "São necessários dois ou mais DDS concluídos, com presença e ausência salvas, para calcular a evolução."
                );

            const blocoComparativo = {
                titulo: "5. Comparativo",
                indicadores: [
                    indicadorEvolucaoPresenca,
                    criarIndicadorNaoCalculavelDds(
                        "Comparação entre encarregados/líderes",
                        "O DDS ainda não possui um encarregado ou líder estruturado para cada grupo de participantes."
                    ),
                ],
            };

            const indicadorRecados =
                taxaRecados === null
                    ? criarIndicadorNaoCalculavelDds(
                        "Taxa de recados/pontos reforçados preenchidos",
                        "O registro consultado não possui um campo estruturado informando o preenchimento dos recados."
                    )
                    : criarIndicadorDds({
                        nome:
                            "Taxa de recados/pontos reforçados preenchidos",
                        valor:
                            formatarPercentualIndicadorDds(
                                taxaRecados
                            ),
                        interpretacao:
                            taxaRecados === 100
                                ? "O campo de recados ou pontos reforçados foi preenchido."
                                : "O campo de recados ou pontos reforçados está em branco.",
                        nivel:
                            classificarRecadosIndicadorDds(
                                taxaRecados
                            ),
                    });

            const indicadorAssinaturasSuspeitas =
                possuiCampoAssinaturaSuspeita
                    ? criarIndicadorDds({
                        nome:
                            "Percentual de assinaturas suspeitas",
                        valor:
                            formatarPercentualIndicadorDds(
                                taxaAssinaturasSuspeitas
                            ),
                        interpretacao:
                            `${assinaturasSuspeitas.length} participante(s) possuem marcação estruturada de assinatura suspeita.`,
                        nivel:
                            classificarOcorrenciaPercentualIndicadorDds(
                                taxaAssinaturasSuspeitas
                            ),
                        detalhes:
                            assinaturasSuspeitas.map(
                                (participante) =>
                                    String(
                                        participante
                                            ?.nome ||
                                        "Participante sem nome"
                                    )
                            ),
                    })
                    : criarIndicadorNaoCalculavelDds(
                        "Percentual de assinaturas suspeitas",
                        "O registro não possui o campo oficial assinatura_suspeita."
                    );

            const blocoEngajamento = {
                titulo: "6. Engajamento",
                indicadores: [
                    indicadorRecados,
                    indicadorAssinaturasSuspeitas,
                ],
            };

            const blocos = [
                blocoPresenca,
                blocoCobertura,
                blocoConformidade,
                blocoRisco,
                blocoComparativo,
                blocoEngajamento,
            ];

            const pesoNivel = {
                critico: 3,
                atencao: 2,
                nao_calculavel: 1,
                normal: 0,
            };

            const todosIndicadores =
                blocos.flatMap(
                    (bloco) =>
                        bloco.indicadores.map(
                            (indicador) => ({
                                ...indicador,
                                bloco:
                                    bloco.titulo,
                            })
                        )
                );

            /*
             * dds_top_pontos_atencao_fallback_v1
             *
             * Seleciona inicialmente um alerta por bloco.
             * Quando houver menos de três alertas, completa a seleção
             * com ocorrências distintas do bloco de presença.
             */
            const ordenarPontosAtencaoDds =
                (
                    indicadorA,
                    indicadorB
                ) =>
                    (
                        pesoNivel[
                            indicadorB.nivel
                        ] ||
                        0
                    ) -
                    (
                        pesoNivel[
                            indicadorA.nivel
                        ] ||
                        0
                    );

            const obterChavePontoAtencaoDds =
                (indicador) => {
                    const nome =
                        normalizarTextoIndicadorDds(
                            indicador?.nome
                        );

                    if (
                        nome ===
                            "taxa de absenteismo geral" ||
                        nome ===
                            "taxa de assiduidade geral"
                    ) {
                        return "frequencia-geral";
                    }

                    if (
                        nome.includes(
                            "por funcao normalizada"
                        )
                    ) {
                        return "frequencia-por-funcao";
                    }

                    return nome;
                };

            const obterPrioridadeOperacionalDds =
                (indicador) => {
                    const nome =
                        normalizarTextoIndicadorDds(
                            indicador?.nome
                        );

                    if (
                        nome.includes(
                            "ausencia total"
                        )
                    ) {
                        return 5;
                    }

                    if (
                        nome.includes(
                            "ausencia parcial"
                        )
                    ) {
                        return 4;
                    }

                    if (
                        nome.includes(
                            "absenteismo por funcao"
                        )
                    ) {
                        return 3;
                    }

                    if (
                        nome.includes(
                            "rotatividade"
                        )
                    ) {
                        return 2;
                    }

                    return 1;
                };

            const pontosAtencao =
                [];

            const chavesPontosAtencao =
                new Set();

            const adicionarPontoAtencaoDds =
                (indicador) => {
                    if (
                        !indicador ||
                        pontosAtencao.length >= 3
                    ) {
                        return;
                    }

                    const chave =
                        obterChavePontoAtencaoDds(
                            indicador
                        );

                    if (
                        !chave ||
                        chavesPontosAtencao.has(
                            chave
                        )
                    ) {
                        return;
                    }

                    chavesPontosAtencao.add(
                        chave
                    );

                    pontosAtencao.push(
                        indicador
                    );
                };

            blocos
                .map(
                    (bloco) =>
                        todosIndicadores
                            .filter(
                                (indicador) =>
                                    indicador.bloco ===
                                        bloco.titulo &&
                                    [
                                        "critico",
                                        "atencao",
                                    ].includes(
                                        indicador.nivel
                                    )
                            )
                            .sort(
                                ordenarPontosAtencaoDds
                            )[0] ||
                        null
                )
                .filter(Boolean)
                .sort(
                    ordenarPontosAtencaoDds
                )
                .forEach(
                    adicionarPontoAtencaoDds
                );

            if (
                pontosAtencao.length < 3
            ) {
                todosIndicadores
                    .filter(
                        (indicador) =>
                            indicador.bloco ===
                                blocoPresenca.titulo &&
                            [
                                "critico",
                                "atencao",
                            ].includes(
                                indicador.nivel
                            )
                    )
                    .sort(
                        (
                            indicadorA,
                            indicadorB
                        ) =>
                            ordenarPontosAtencaoDds(
                                indicadorA,
                                indicadorB
                            ) ||
                            obterPrioridadeOperacionalDds(
                                indicadorB
                            ) -
                            obterPrioridadeOperacionalDds(
                                indicadorA
                            )
                    )
                    .forEach(
                        adicionarPontoAtencaoDds
                    );
            }

            const top3 =
                pontosAtencao.slice(
                    0,
                    3
                );

            const tituloPontosAtencao =
                top3.length === 3
                    ? "Top 3 pontos de atenção para o engenheiro"
                    : "Pontos de atenção";
            const indicadoresCalculados =
                todosIndicadores.filter(
                    (indicador) =>
                        indicador.nivel !==
                        "nao_calculavel"
                ).length;

            const correcoesAplicadasNestaVersao = [
                `Contador analítico atualizado: ${indicadoresCalculados}/${todosIndicadores.length} indicadores calculados.`,
                todasOcorrenciasTemasClassificadas
                    ? `Todos os ${temasDistintos.size} tema(s) distinto(s) tiveram suas ${ocorrenciasTemasDocumentadas.length} ocorrência(s) apresentadas individualmente com procedência documental.`
                    : `Procedência documental classificada em ${ocorrenciasTemasComOrigemClassificada}/${ocorrenciasTemasDocumentadas.length} ocorrência(s), abrangendo ${temasDistintos.size} tema(s) distinto(s).`,
            ];

            return {
                progressoImplantacao: 100,
                blocos,
                top3,
                tituloPontosAtencao,
                ocorrenciasTemasDocumentadas,
                correcoesAplicadasNestaVersao,
                composicaoBaseParticipantes: {
                    totalAnalisado:
                        participantes.length,
                    participantesGabarito,
                    participantesComplementares,
                    consistente:
                        composicaoBaseParticipantesConsistente,
                    descricao:
                        detalheComposicaoBaseParticipantes,
                    origemGabarito:
                        "Gabarito original do DDS",
                    origemComplementares:
                        "Participantes complementares incluídos na conferência assistida",
                },
                baseDeclarada: {
                    funcionarios:
                        participantes.length,
                    participantesGabarito,
                    participantesComplementares,
                    composicaoParticipantesConsistente:
                        composicaoBaseParticipantesConsistente,
                    diasApurados:
                        diasFrequencia.length,
                    possibilidadesTotais:
                        totalPossibilidades,
                    presencas:
                        presencasGerais,
                    ausencias:
                        ausenciasGerais,
                    pendenciasManuais:
                        manuaisGerais,
                    classificacoesFechadas:
                        totalClassificacoesFechadas,
                    consistente:
                        baseFrequenciaConsistente,
                },
                detalhamentoNominal,
                normalizacoesFuncoes,
                resumo: {
                    indicadoresCalculados,
                    indicadoresTotal:
                        todosIndicadores.length,
                    participantes:
                        participantes.length,
                    participantesGabarito,
                    participantesComplementares,
                    diasAtivos:
                        diasFrequencia.length,
                    possibilidadesTotais:
                        totalPossibilidades,
                    presencas:
                        presencasGerais,
                    ausencias:
                        ausenciasGerais,
                    manuais:
                        manuaisGerais,
                    baseConsistente:
                        baseFrequenciaConsistente,
                },
            };
        }, [
            conferenciaAssistidaDds,
            dadosDds,
            diasAtivosConferenciaAssistidaDds,
            diasConferenciaAssistidaDds,
            estatisticasConferenciaAssistidaDds,
            estatisticasTemasConferenciaAssistidaDds,
            participantesConferenciaAssistidaDds,
            historicoMensalMaoDeObraDds,
            registroScannerDds,
        ]);

    return {
        resultadoFinalApresentacaoDds,
        resumoControleMaoDeObraDds,
        relatorioIndicadoresSstDds,
    };
}
