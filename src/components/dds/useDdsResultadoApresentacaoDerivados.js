import { useMemo } from "react";

export default function useDdsResultadoApresentacaoDerivados({
    conferenciaAssistidaDds,
    dadosDds,
    diasAtivosConferenciaAssistidaDds,
    estatisticasConferenciaAssistidaDds,
    fechamentoConferenciaAssistidaDds,
    participantesConferenciaAssistidaDds,
    registroScannerDds,
    resultadoFinalScannerDds,
}) {
    const resultadoFinalApresentacaoDds = useMemo(() => {
        const valoresConferencia = Object.values(conferenciaAssistidaDds || {});
        const temAlgumaConfirmacaoAssistida = valoresConferencia.some((status) =>
            status === "presente" || status === "ausente" || status === "manual"
        );

        const temBaseAssistida = Boolean(
            temAlgumaConfirmacaoAssistida &&
            diasAtivosConferenciaAssistidaDds.length > 0 &&
            estatisticasConferenciaAssistidaDds.participantes > 0
        );

        if (!temBaseAssistida) {
            return resultadoFinalScannerDds;
        }

        const participantes = Number(estatisticasConferenciaAssistidaDds.participantes || 0);
        const presencas = Number(estatisticasConferenciaAssistidaDds.presencas || 0);
        const ausencias = Number(estatisticasConferenciaAssistidaDds.ausencias || 0);
        const manuais = Number(estatisticasConferenciaAssistidaDds.manuais || 0);
        const homemDia = Number(estatisticasConferenciaAssistidaDds.homemDia || 0);
        const diasAtivos = Number(diasAtivosConferenciaAssistidaDds.length || 0);
        const funcionariosSemanaCompleta = Number(estatisticasConferenciaAssistidaDds.funcionariosSemanaCompleta || 0);
        const totalCampos = participantes * diasAtivos;
        const conferenciaConcluidaOficialmente = fechamentoConferenciaAssistidaDds?.status === "concluida";

        const conferenciaFechada = totalCampos > 0 && manuais === 0;
        const statusVisual = conferenciaFechada ? "ok" : "parcial";
        const statusFinal = conferenciaConcluidaOficialmente ? "Conferência concluída oficialmente" : conferenciaFechada ? "Conferido oficialmente" : "Conferência assistida parcial";
        const titulo = conferenciaConcluidaOficialmente
            ? "Conferência DDS concluída oficialmente"
            : conferenciaFechada
                ? "Frequência oficial conferida"
                : "Frequência oficial com campos pendentes";
        const descricao = conferenciaConcluidaOficialmente
            ? "A Conferência Assistida foi concluída oficialmente e salva no registro DDS. O OCR visual permanece apenas como apoio técnico."
            : conferenciaFechada
                ? "A frequência oficial do DDS foi confirmada pela Conferência Assistida. O OCR visual permanece apenas como apoio técnico."
                : "A Conferência Assistida já possui dados oficiais, mas ainda existem campos marcados como manual/vazio para revisar.";

        const itens = [
            {
                titulo: "Conferência Assistida",
                ok: conferenciaFechada,
                manual: !conferenciaFechada,
                detalhe: `${presencas} presença(s), ${ausencias} ausência(s), ${manuais} manual/vazio e ${homemDia} homem-dia confirmado(s).`,
            },
            {
                titulo: "Dias ativos",
                ok: diasAtivos > 0,
                detalhe: `${diasAtivos} dia(s) com atividade usado(s) no cálculo oficial.`,
            },
            {
                titulo: "OCR visual auxiliar",
                ok: false,
                manual: true,
                detalhe: "Leitura automática usada apenas como apoio; a estatística oficial vem da Conferência Assistida.",
            },
        ];

        const recomendacoes = [];

        if (manuais > 0) {
            recomendacoes.push("Revisar os campos marcados como ? para fechar a frequência oficial sem pendências.");
        } else {
            recomendacoes.push("Manter a Conferência Assistida salva como base oficial da estatística DDS.");
        }

        recomendacoes.push("Usar o OCR visual apenas como apoio técnico, sem substituir a confirmação P / X / ?.");
        recomendacoes.push("Não usar o resultado como validação grafológica; manter conferência visual/documental.");

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
                ...(resultadoFinalScannerDds?.resumo || {}),
                participantesTotal: participantes,
                participantesLocalizados: participantes,
                participantesManuais: manuais,
                participantesNaoLocalizados: ausencias,
                participantesPaginasNaoAnalisadas: 0,
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

    const resumoControleMaoDeObraDds = useMemo(() => {
        const funcoes = new Set();

        participantesConferenciaAssistidaDds.forEach((participante) => {
            const funcao = String(participante?.funcao || "Sem função").trim() || "Sem função";
            funcoes.add(funcao.toUpperCase());
        });

        const datasLancadas = diasAtivosConferenciaAssistidaDds
            .map((dia) => String(dia?.data || dia?.dataDds || dia?.dia || "").trim())
            .filter(Boolean);

        const primeiraData = datasLancadas[0] || dadosDds.periodoInicio || registroScannerDds?.periodoInicio || "";
        let mesReferencia = "-";

        if (primeiraData) {
            const data = new Date(primeiraData.includes("/") ? primeiraData.split("/").reverse().join("-") : primeiraData);
            if (!Number.isNaN(data.getTime())) {
                mesReferencia = data.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
            }
        }

        return {
            funcoes: funcoes.size,
            diasLancados: datasLancadas.length,
            homemDia: Number(estatisticasConferenciaAssistidaDds?.homemDia || 0),
            mesReferencia,
        };
    }, [
        dadosDds.periodoInicio,
        diasAtivosConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        participantesConferenciaAssistidaDds,
        registroScannerDds,
    ]);

    return {
        resultadoFinalApresentacaoDds,
        resumoControleMaoDeObraDds,
    };
}
