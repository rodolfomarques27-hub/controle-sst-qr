export default function criarControladorCalendarioMaoDeObraDds({
    calendariosMaoDeObraDds,
    dadosDds,
    obraSelecionadaIdDds,
    obrasEmpresasDds,
    reciboConferenciaFinalDds,
    registroScannerDds,
}) {
    function normalizarChaveCalendarioMaoDeObraDds(valor = "") {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function obterObrasDisponiveisCalendarioMaoDeObraDds() {
        return obrasEmpresasDds.filter(Boolean);
    }

    function obterIdObraCalendarioMaoDeObraDds() {
        return String(
            reciboConferenciaFinalDds?.obraId ||
            reciboConferenciaFinalDds?.obra_id ||
            registroScannerDds?.obraId ||
            registroScannerDds?.obra_id ||
            registroScannerDds?.dados?.obraId ||
            registroScannerDds?.dados?.obra_id ||
            dadosDds?.obraId ||
            dadosDds?.obra_id ||
            obraSelecionadaIdDds ||
            ""
        ).trim();
    }

    function obterNomeObraCalendarioMaoDeObraDds() {
        return String(
            reciboConferenciaFinalDds?.obra ||
            reciboConferenciaFinalDds?.obraNome ||
            registroScannerDds?.obraNome ||
            registroScannerDds?.dados?.obraNome ||
            dadosDds?.obraNome ||
            dadosDds?.obraSetor ||
            dadosDds?.obra ||
            ""
        ).trim();
    }

    function obterObraReferenciaCalendarioMaoDeObraDds() {
        const obraId = obterIdObraCalendarioMaoDeObraDds();
        const obraNome = obterNomeObraCalendarioMaoDeObraDds();
        const obraIdBusca = normalizarChaveCalendarioMaoDeObraDds(obraId);
        const obraNomeBusca = normalizarChaveCalendarioMaoDeObraDds(obraNome);
        const obrasDisponiveis = obterObrasDisponiveisCalendarioMaoDeObraDds();

        const obraEncontrada = obrasDisponiveis.find((obra) => {
            const id = normalizarChaveCalendarioMaoDeObraDds(obra?.id || obra?.obraId || obra?.obra_id);
            const nome = normalizarChaveCalendarioMaoDeObraDds(obra?.nome || obra?.obraNome || obra?.obra_nome || obra?.obra || obra?.descricao);

            return (obraIdBusca && id && id === obraIdBusca) || (obraNomeBusca && nome && nome === obraNomeBusca);
        });

        if (obraEncontrada) return obraEncontrada;

        return {
            id: obraId,
            nome: obraNome,
            cidade:
                reciboConferenciaFinalDds?.cidade ||
                reciboConferenciaFinalDds?.obraCidade ||
                registroScannerDds?.cidade ||
                registroScannerDds?.obraCidade ||
                registroScannerDds?.dados?.cidade ||
                registroScannerDds?.dados?.obraCidade ||
                dadosDds?.cidade ||
                dadosDds?.obraCidade ||
                "",
            uf:
                reciboConferenciaFinalDds?.uf ||
                reciboConferenciaFinalDds?.obraUf ||
                registroScannerDds?.uf ||
                registroScannerDds?.obraUf ||
                registroScannerDds?.dados?.uf ||
                registroScannerDds?.dados?.obraUf ||
                dadosDds?.uf ||
                dadosDds?.obraUf ||
                "",
        };
    }

    function resolverCalendarioMaoDeObraDds(obraReferencia = null) {
        const cidade = String(
            obraReferencia?.cidade ||
            obraReferencia?.municipio ||
            obraReferencia?.município ||
            obraReferencia?.cidade_nome ||
            obraReferencia?.obraCidade ||
            ""
        ).trim();

        const uf = String(
            obraReferencia?.uf ||
            obraReferencia?.estado ||
            obraReferencia?.obraUf ||
            obraReferencia?.obraEstado ||
            ""
        ).trim().toUpperCase().slice(0, 2);

        const cidadeBusca = normalizarChaveCalendarioMaoDeObraDds(cidade);
        const ufBusca = normalizarChaveCalendarioMaoDeObraDds(uf);

        if (!cidadeBusca && !ufBusca) {
            return {
                ...calendariosMaoDeObraDds[0],
                origem: "fallback padrão",
            };
        }

        const preset = calendariosMaoDeObraDds.find((calendario) =>
            normalizarChaveCalendarioMaoDeObraDds(calendario.cidade) === cidadeBusca &&
            normalizarChaveCalendarioMaoDeObraDds(calendario.uf) === ufBusca
        );

        if (preset) {
            return {
                ...preset,
                origem: "cadastro da obra",
            };
        }

        const feriadosEstaduaisFixos =
            uf === "SP"
                ? [{ mes: 7, dia: 9, nome: "Revolução Constitucionalista" }]
                : [];

        const cidadeRotulo = cidade || "Município não informado";
        const ufRotulo = uf || "UF não informada";

        return {
            id: "obra-" + normalizarChaveCalendarioMaoDeObraDds(cidadeRotulo + "-" + ufRotulo).replace(/\s+/g, "-"),
            cidade: cidadeRotulo,
            uf: ufRotulo,
            rotulo: cidadeRotulo + " / " + ufRotulo,
            feriadosMunicipaisFixos: [],
            feriadosEstaduaisFixos,
            origem: "cadastro da obra",
        };
    }

    return {
        obterObraReferenciaCalendarioMaoDeObraDds,
        resolverCalendarioMaoDeObraDds,
    };
}
