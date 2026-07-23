const limitar = (valor, minimo, maximo) => Math.min(maximo, Math.max(minimo, valor));

const obterNumeroLinhaDds = (participante) => {
    const pagina = Number(participante?.paginaEsperada || 0);
    const numero = Number(participante?.numero || 0);

    if (!pagina || !numero) return 0;
    return pagina <= 1 ? numero : numero - 10 - ((pagina - 2) * 20);
};

const obterConfiancaAssinatura = (marcacao, origemSemana = false) => {
    const densidade = Number(marcacao?.assinatura_densidade || 0);
    const densidadeAzul = Number(marcacao?.assinatura_densidade_azul || 0);
    const base = origemSemana ? 0.62 : 0.68;
    const bonus = limitar((densidade * 2.2) + (densidadeAzul * 1.8), 0, origemSemana ? 0.2 : 0.25);
    return limitar(base + bonus, 0, origemSemana ? 0.82 : 0.93);
};

const obterConfiancaX = (marcacao) => {
    const densidade = Number(marcacao?.x_densidade || 0);
    const densidadeEscura = Number(marcacao?.x_densidade_escura || 0);
    const densidadeAzul = Number(marcacao?.x_densidade_azul || 0);
    const diagonais = Math.min(
        Number(marcacao?.x_proporcao_diagonal_principal || 0),
        Number(marcacao?.x_proporcao_diagonal_secundaria || 0)
    );
    const bonus = limitar((densidade * 1.5) + (densidadeEscura * 1.2) + densidadeAzul + (diagonais * 0.2), 0, 0.3);
    return limitar(0.64 + bonus, 0, 0.94);
};

export const obterChaveSugestaoFrequenciaDds = (numero, diaRef) => {
    const chaveDia = typeof diaRef === "object" && diaRef !== null
        ? (diaRef.chaveAssistida || diaRef.indiceAssistido || diaRef.indice || diaRef.data || diaRef.nome || diaRef.curto)
        : diaRef;

    return `${numero}-${chaveDia}`;
};

export function montarSugestoesFrequenciaDds({ participantes = [], dias = [], marcacoes = [] } = {}) {
    const sugestoes = {};

    for (const participante of participantes) {
        const numero = Number(participante?.numero || 0);
        const pagina = Number(participante?.paginaEsperada || 0);
        const numeroLinha = obterNumeroLinhaDds(participante);
        const statusParticipante = String(
            participante?.status || ""
        ).trim();

        const identificacaoNaoConfirmada =
            statusParticipante === "nao_localizado" ||
            statusParticipante === "manual" ||
            statusParticipante === "pendente";

        const linhaNaoAnalisada =
            statusParticipante === "pagina_nao_analisada" ||
            !pagina ||
            numeroLinha <= 0;
        const marcacaoSemana = marcacoes.find((item) => (
            Number(item?.pagina || 0) === pagina &&
            Number(item?.numeroLinha || 0) === numeroLinha &&
            (item?.tipoMarcacao === "semana_completa" || Number(item?.diaIndice || 0) === 7)
        ));
        const semanaCompleta = Boolean(marcacaoSemana?.assinatura_visual);

        for (const dia of dias) {
            const chave = obterChaveSugestaoFrequenciaDds(numero, dia);

            if (identificacaoNaoConfirmada) {
                const naoLocalizado =
                    statusParticipante === "nao_localizado";

                sugestoes[chave] = {
                    sugestao: "manual",
                    confianca: 0,
                    origem: naoLocalizado
                        ? "participante_nao_localizado"
                        : "identificacao_nao_confirmada",
                    requerConferenciaManual: true,
                    prioridade: "normal",
                    motivo: naoLocalizado
                        ? "Nome ou código SafeScan não localizado na página esperada; confira esta linha manualmente."
                        : "A identificação textual do participante não foi confirmada; confira esta linha manualmente.",
                };

                continue;
            }

            if (linhaNaoAnalisada) {
                sugestoes[chave] = {
                    sugestao: "nao_analisado",
                    confianca: 0,
                    origem: "pagina_nao_analisada",
                    requerConferenciaManual: true,
                    motivo: "Página ou linha não analisada pelo sistema.",
                };
                continue;
            }

            const indiceDia = Number(dia?.indice ?? dia?.indiceAssistido ?? 0);
            const marcacaoDia = marcacoes.find((item) => (
                Number(item?.pagina || 0) === pagina &&
                Number(item?.numeroLinha || 0) === numeroLinha &&
                Number(item?.diaIndice || 0) === indiceDia
            ));
            const temX = Boolean(marcacaoDia?.x_visual);
            const temAssinatura = Boolean(marcacaoDia?.assinatura_visual);
            const conflitoSemana = temX && semanaCompleta;

            if (temX) {
                sugestoes[chave] = {
                    sugestao: "ausente",
                    confianca: obterConfiancaX(marcacaoDia),
                    origem: "x",
                    requerConferenciaManual: conflitoSemana,
                    prioridade: conflitoSemana ? "alta" : "normal",
                    motivo: conflitoSemana
                        ? "Foi detectado X no dia e marca de semana completa na mesma linha."
                        : "O sistema detectou um X nesta célula.",
                };
            } else if (temAssinatura) {
                sugestoes[chave] = {
                    sugestao: "presente",
                    confianca: obterConfiancaAssinatura(marcacaoDia),
                    origem: "dia",
                    requerConferenciaManual: false,
                    prioridade: "normal",
                    motivo: "O sistema detectou traços de assinatura nesta célula.",
                };
            } else if (semanaCompleta) {
                sugestoes[chave] = {
                    sugestao: "presente",
                    confianca: obterConfiancaAssinatura(marcacaoSemana, true),
                    origem: "semana_completa",
                    requerConferenciaManual: true,
                    prioridade: "alta",
                    motivo: "Sugestão herdada da marca de semana completa; confirme os dias individualmente.",
                };
            } else {
                sugestoes[chave] = {
                    sugestao: "manual",
                    confianca: 0,
                    origem: "sem_marcacao",
                    requerConferenciaManual: true,
                    prioridade: "normal",
                    motivo: "Nenhuma marca segura foi detectada; faça a conferência visual.",
                };
            }
        }
    }

    return sugestoes;
}
