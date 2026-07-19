export default function criarControladorScannerDds({
    arquivoScannerDds,
    carregandoLeituraArquivoScannerDds,
    carregandoScannerDds,
    carregarRegistroDdsPorCodigo,
    codigoConferenciaDds,
    dadosDds,
    executarLeituraDdsLocal,
    participantesRegistroScannerDds,
    registroScannerDds,
    setArquivoScannerDds,
    setCarregandoLeituraArquivoScannerDds,
    setCarregandoScannerDds,
    setCodigoConferenciaDds,
    setErroArquivoScannerDds,
    setErroLeituraArquivoScannerDds,
    setErroScannerDds,
    setLeituraArquivoScannerDds,
    setRegistroScannerDds,
    supabase,
}) {
    async function buscarRegistroScannerDds(evento = null) {
        evento?.preventDefault?.();

        if (carregandoScannerDds) return;

        const codigoBusca = String(codigoConferenciaDds || dadosDds.codigo || "").trim();

        if (!codigoBusca) {
            setErroScannerDds("Informe o código do DDS impresso.");
            setRegistroScannerDds(null);
            return;
        }

        if (!supabase) {
            setErroScannerDds("Supabase não disponível para carregar o registro do DDS.");
            setRegistroScannerDds(null);
            return;
        }

        setCarregandoScannerDds(true);
        setErroScannerDds("");

        try {
            const registro = await carregarRegistroDdsPorCodigo({
                supabase,
                codigo: codigoBusca,
            });

            if (!registro) {
                setRegistroScannerDds(null);
                setErroScannerDds("Nenhum registro de DDS foi localizado para este código.");
                return;
            }

            setRegistroScannerDds(registro);
            setCodigoConferenciaDds(registro.codigo || codigoBusca);
        } catch (error) {
            setRegistroScannerDds(null);
            setErroScannerDds(error?.message || "Não foi possível carregar o registro do DDS.");
        } finally {
            setCarregandoScannerDds(false);
        }
    }

    function selecionarArquivoScannerDds(evento) {
        const arquivo = evento?.target?.files?.[0] || null;

        setErroArquivoScannerDds("");
        setLeituraArquivoScannerDds(null);
        setErroLeituraArquivoScannerDds("");
        setCarregandoLeituraArquivoScannerDds(false);

        if (!arquivo) {
            setArquivoScannerDds(null);
            return;
        }

        const nomeArquivo = String(arquivo.name || "").toLowerCase();
        const tipoArquivo = String(arquivo.type || "").toLowerCase();
        const extensaoPermitida = /\.(pdf|png|jpg|jpeg|webp)$/i.test(nomeArquivo);
        const tipoPermitido = tipoArquivo === "application/pdf" || tipoArquivo.startsWith("image/");

        if (!extensaoPermitida || !tipoPermitido) {
            setArquivoScannerDds(null);
            setErroArquivoScannerDds("Anexe apenas PDF ou imagem nos formatos PNG, JPG, JPEG ou WEBP.");
            evento.target.value = "";
            return;
        }

        const limiteBytes = 25 * 1024 * 1024;

        if (arquivo.size > limiteBytes) {
            setArquivoScannerDds(null);
            setErroArquivoScannerDds("O arquivo deve ter no máximo 25 MB.");
            evento.target.value = "";
            return;
        }

        setArquivoScannerDds(arquivo);
    }

    function limparArquivoScannerDds() {
        setArquivoScannerDds(null);
        setErroArquivoScannerDds("");
        setLeituraArquivoScannerDds(null);
        setErroLeituraArquivoScannerDds("");
        setCarregandoLeituraArquivoScannerDds(false);
    }

    async function executarLeituraArquivoScannerDds() {
        if (!arquivoScannerDds) {
            setErroLeituraArquivoScannerDds("Anexe a folha DDS assinada antes de executar a leitura inicial.");
            return;
        }

        if (carregandoLeituraArquivoScannerDds) return;

        setCarregandoLeituraArquivoScannerDds(true);
        setErroLeituraArquivoScannerDds("");
        setLeituraArquivoScannerDds(null);

        try {
            const leitura = await executarLeituraDdsLocal({
                arquivo: arquivoScannerDds,
                arquivoNome: arquivoScannerDds.name || "",
                mimeType: arquivoScannerDds.type || "",
                contextoDds: {
                    codigo: registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "",
                    empresaNome: registroScannerDds?.empresaNome || registroScannerDds?.dados?.empresaNome || "",
                    obraNome: registroScannerDds?.obraNome || registroScannerDds?.dados?.obraNome || "",
                    periodoInicio: registroScannerDds?.periodoInicio || registroScannerDds?.dados?.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || registroScannerDds?.dados?.periodoFim || "",
                    participantes: participantesRegistroScannerDds,
                },
            });

            setLeituraArquivoScannerDds(leitura || null);

            if (leitura?.erro) {
                setErroLeituraArquivoScannerDds(leitura.erro);
            }
        } catch (error) {
            setLeituraArquivoScannerDds(null);
            setErroLeituraArquivoScannerDds(error?.message || "Não foi possível executar a leitura inicial da folha DDS.");
        } finally {
            setCarregandoLeituraArquivoScannerDds(false);
        }
    }

    return {
        buscarRegistroScannerDds,
        selecionarArquivoScannerDds,
        limparArquivoScannerDds,
        executarLeituraArquivoScannerDds,
    };
}
