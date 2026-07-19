// Fluxo geral de leitura documental local.

export function criarFluxoLeituraDocumental({
    normalizarTextoVerificacao,
    filtrarDatasPorCategoria,
    limparTextoPossivelDocumento,
    carregarPdfJsDocumental,
    LIMITE_BYTES_LEITURA_LOCAL,
    LIMITE_TEXTO_PDFJS,
    PAGINAS_MAXIMAS_PDFJS,
    PAGINAS_FINAIS_BUSCA_PDFJS,
    PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS,
    CONFIANCA_MINIMA_COMPARACAO_DATAS,
    COMPARACAO_AUTOMATICA_DATAS_OCR_ATIVA,
    arquivoPossuiArrayBuffer,
    obterNomeArquivo,
    obterMimeArquivo,
    obterExtensaoArquivo,
    limitarTextoParaSalvar,
    dataEhAntigaSemContextoForte,
    extrairDatasTextoDocumental,
    contextoIndicaReferenciaLegal,
    contextoIndicaCodigoOuCadastroNaoData,
    extrairVigenciaPrincipalTexto,
    extrairAssinaturaDigitalTexto,
    extrairDatasEncerramentoTexto,
    classificarDatasOcrDocumental,
    obterDatasRelevantesClassificadas,
    textoPossuiConteudoDocumentoConfiavel,
    montarCamposExtraidosDocumento,
    montarResumoTextualDocumento,
    montarPreviaTextoDocumento,
    calcularConfiancaLeitura,
    extrairTextoLegivelPdf,
    lerTextoPaginaPdfJs,
    extrairTextoImagemComOcr,
    extrairTextoPrimeiraPaginaPdfComOcr,
} = {}) {
    function contextoIndicaDataDocumentalPrincipal(contexto = "") {
        const texto = normalizarTextoVerificacao(contexto);

        if (!texto) return false;
        if (contextoIndicaReferenciaLegal(contexto)) return false;
        if (contextoIndicaCodigoOuCadastroNaoData(contexto)) return false;

        const padraoPrincipalForte = /vigencia|vigência|periodo de vigencia|período de vigência|data de emissao|data de emissão|emissao do documento|emissão do documento|emitido em|elaborado em|elaboracao|elaboração|assinado em|assinatura digital|icp-brasil|encerramento|ultima datada|última datada|datada e assinada|responsavel tecnico|responsável técnico/;

        if (padraoPrincipalForte.test(texto)) return true;

        return /validade do documento|vencimento do documento|data de validade|data de vencimento|proxima revisao|próxima revisão|revisao do documento|revisão do documento/.test(texto);
    }

    function textoPossuiDataDocumentalPrincipal(textoPagina = "") {
        const texto = limparTextoPossivelDocumento(textoPagina);

        if (!textoPossuiConteudoDocumentoConfiavel(texto)) return false;

        const vigencia = extrairVigenciaPrincipalTexto(texto);
        if (vigencia?.inicio && vigencia?.fim) return true;

        if (extrairAssinaturaDigitalTexto(texto).length > 0) return true;
        if (extrairDatasEncerramentoTexto(texto).length > 0) return true;

        const datasTexto = extrairDatasTextoDocumental(texto, "pdf_texto_local");
        if (!datasTexto.length) return false;

        return datasTexto.some((data) => {
            if (!data?.iso) return false;
            if (dataEhAntigaSemContextoForte(data, texto)) return false;
            return contextoIndicaDataDocumentalPrincipal(`${data.contexto || ""} ${texto}`);
        });
    }

    function textoPaginaPossuiDataDocumentalPrincipal(textoPagina = "") {
        return textoPossuiDataDocumentalPrincipal(textoPagina);
    }

    function montarSequenciaBuscaPaginas(totalPaginas = 0, paginasIniciais = 0) {
        const total = Number(totalPaginas || 0);
        const inicio = Number(paginasIniciais || 0);

        if (!total || total <= inicio) return [];

        const paginas = [];
        const jaIncluidas = new Set();

        function adicionar(numero) {
            const valor = Number(numero || 0);
            if (!Number.isInteger(valor) || valor < 1 || valor > total || valor <= inicio) return;
            if (jaIncluidas.has(valor)) return;
            jaIncluidas.add(valor);
            paginas.push(valor);
        }

        const inicioFinais = Math.max(inicio + 1, total - PAGINAS_FINAIS_BUSCA_PDFJS + 1);
        for (let pagina = inicioFinais; pagina <= total; pagina += 1) {
            adicionar(pagina);
        }

        const limiteProfundo = Math.min(total, PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS);
        for (let pagina = inicio + 1; pagina <= limiteProfundo; pagina += 1) {
            adicionar(pagina);
        }

        return paginas;
    }

    function montarTextoPdfOrdenado(registrosPaginas = []) {
        const registrosValidos = (registrosPaginas || []).filter((registro) => registro?.texto);
        const mapa = new Map();

        const relevantes = registrosValidos.filter((registro) => registro.relevante);
        const iniciais = registrosValidos.filter((registro) => registro.numero <= PAGINAS_MAXIMAS_PDFJS && !registro.relevante);
        const demais = registrosValidos.filter((registro) => registro.numero > PAGINAS_MAXIMAS_PDFJS && !registro.relevante);

        [...relevantes, ...iniciais, ...demais]
            .sort((a, b) => {
                if (a.relevante && !b.relevante) return -1;
                if (!a.relevante && b.relevante) return 1;
                return a.numero - b.numero;
            })
            .forEach((registro) => {
                if (!mapa.has(registro.numero)) {
                    mapa.set(registro.numero, registro);
                }
            });

        return limparTextoPossivelDocumento(
            Array.from(mapa.values())
                .map((registro) => `Página ${registro.numero}: ${registro.texto}`)
                .join(" ")
        ).slice(0, LIMITE_TEXTO_PDFJS);
    }

    async function extrairTextoPdfComPdfJs(buffer) {
        if (!buffer || !buffer.byteLength) {
            return {
                texto: "",
                paginasLidas: 0,
                totalPaginas: 0,
                avisos: [],
                buscaAmpliada: null,
            };
        }

        const avisos = [];

        try {
            const pdfjsLib = await carregarPdfJsDocumental();
            const tarefa = pdfjsLib.getDocument({
                data: new Uint8Array(buffer.slice(0)),
                disableFontFace: true,
                useSystemFonts: true,
                verbosity: 0,
            });

            const pdf = await tarefa.promise;
            const totalPaginas = Number(pdf?.numPages || 0);
            const paginasIniciais = Math.min(totalPaginas || 0, PAGINAS_MAXIMAS_PDFJS);
            const registrosPaginas = [];
            const paginasLidasSet = new Set();
            let encontrouDataPrincipal = false;
            let paginaDataPrincipal = 0;
            let buscaAmpliadaExecutada = false;
            let buscaAmpliadaInterrompida = false;

            async function lerPagina(numeroPagina, origem = "inicial") {
                if (!numeroPagina || paginasLidasSet.has(numeroPagina)) return null;

                const textoPagina = await lerTextoPaginaPdfJs(pdf, numeroPagina);
                paginasLidasSet.add(numeroPagina);

                if (!textoPagina) return null;

                const relevante = textoPaginaPossuiDataDocumentalPrincipal(textoPagina);

                registrosPaginas.push({
                    numero: numeroPagina,
                    texto: textoPagina,
                    relevante,
                    origem,
                });

                if (relevante && !encontrouDataPrincipal) {
                    encontrouDataPrincipal = true;
                    paginaDataPrincipal = numeroPagina;
                }

                return registrosPaginas[registrosPaginas.length - 1];
            }

            for (let numeroPagina = 1; numeroPagina <= paginasIniciais; numeroPagina += 1) {
                await lerPagina(numeroPagina, "inicial");
            }

            let textoInicial = montarTextoPdfOrdenado(registrosPaginas);
            let precisaBuscaAmpliada = Boolean(
                totalPaginas > paginasIniciais &&
                !textoPossuiDataDocumentalPrincipal(textoInicial)
            );

            if (!textoInicial && totalPaginas > paginasIniciais) {
                precisaBuscaAmpliada = true;
            }

            if (precisaBuscaAmpliada) {
                buscaAmpliadaExecutada = true;
                const sequenciaBusca = montarSequenciaBuscaPaginas(totalPaginas, paginasIniciais);

                for (const numeroPagina of sequenciaBusca) {
                    await lerPagina(numeroPagina, numeroPagina > totalPaginas - PAGINAS_FINAIS_BUSCA_PDFJS ? "final" : "ampliada");

                    if (encontrouDataPrincipal) {
                        buscaAmpliadaInterrompida = true;
                        break;
                    }
                }
            }

            try {
                await pdf.destroy();
            } catch {
                // Liberação de memória sem bloquear o fluxo.
            }

            const texto = montarTextoPdfOrdenado(registrosPaginas);
            const paginasLidas = paginasLidasSet.size;
            const buscaAmpliada = buscaAmpliadaExecutada
                ? {
                    executada: true,
                    paginasLidas,
                    totalPaginas,
                    paginaDataPrincipal,
                    encontrouDataPrincipal,
                    interrompidaAoEncontrar: buscaAmpliadaInterrompida,
                    limitePaginas: PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS,
                }
                : null;

            if (texto && texto.length >= LIMITE_TEXTO_PDFJS) {
                avisos.push("Leitura textual limitada para preservar performance no navegador.");
            }

            if (buscaAmpliadaExecutada) {
                avisos.push(
                    encontrouDataPrincipal
                        ? `Busca ampliada realizada: data documental provável localizada na página ${paginaDataPrincipal} após analisar ${paginasLidas} página(s) de ${totalPaginas}.`
                        : `Busca ampliada realizada em ${paginasLidas} página(s) de ${totalPaginas}, sem localizar vigência, emissão, revisão ou assinatura confiável.`
                );
            } else if (totalPaginas > paginasIniciais) {
                avisos.push(`Leitura textual feita nas ${paginasIniciais} primeiras página(s) de ${totalPaginas}.`);
            }

            if (totalPaginas > PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS && buscaAmpliadaExecutada && !encontrouDataPrincipal) {
                avisos.push(`Para preservar performance, a busca profunda automática foi limitada a ${PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS} páginas mais as páginas finais.`);
            }

            if (textoPossuiConteudoDocumentoConfiavel(texto)) {
                return {
                    texto,
                    paginasLidas,
                    totalPaginas,
                    avisos,
                    buscaAmpliada,
                };
            }

            return {
                texto: "",
                paginasLidas,
                totalPaginas,
                avisos: [
                    ...avisos,
                    "PDF.js não encontrou texto documental confiável nas páginas analisadas.",
                ],
                buscaAmpliada,
            };
        } catch (error) {
            return {
                texto: "",
                paginasLidas: 0,
                totalPaginas: 0,
                avisos: [
                    `Leitura PDF.js indisponível: ${error?.message || "erro desconhecido"}.`,
                ],
                buscaAmpliada: null,
            };
        }
    }

    function montarRetornoLeituraBase({
        executado = false,
        tipoLeitura = "nao_executado",
        arquivoNome = "",
        mimeType = "",
        extensao = "",
        textoExtraido = "",
        textoLimitado = false,
        paginasLidas = 0,
        totalPaginas = 0,
        buscaAmpliada = null,
        linhasOcr = [],
        assinaturasTabela = [],
        assinaturasDocumento = [],
        confiancaOcr = null,
        avisos = [],
        erro = "",
    } = {}) {
        const textoSeguro = limitarTextoParaSalvar(textoExtraido);
        const datasTexto = textoSeguro ? extrairDatasTextoDocumental(textoSeguro, tipoLeitura) : [];
        const datasNomeArquivo = arquivoNome ? extrairDatasTextoDocumental(arquivoNome, "nome_arquivo") : [];
        const datasEncontradas = [...datasTexto, ...datasNomeArquivo];
        const datasComparaveis = datasTexto;
        const datasClassificadas = classificarDatasOcrDocumental({
            textoExtraido: textoSeguro,
            datasTexto,
            datasNomeArquivo,
        });
        const datasRelevantesClassificadas = obterDatasRelevantesClassificadas(datasClassificadas);
        const camposExtraidos = montarCamposExtraidosDocumento({
            textoExtraido: textoSeguro,
            arquivoNome,
            datasClassificadas,
            linhasOcr,
        });
        const resumoTextual = montarResumoTextualDocumento({
            textoExtraido: textoSeguro,
            arquivoNome,
            datasDocumentoConfiaveis: datasComparaveis,
            paginasLidas,
            totalPaginas,
            buscaAmpliada,
        });
        const textoPrevia = montarPreviaTextoDocumento(textoSeguro);
        const confiancaCalculada = calcularConfiancaLeitura({
            textoExtraido: textoSeguro,
            datasTexto,
            tipoLeitura,
            textoLimitado,
        });
        const confiancaInformada = Number(confiancaOcr);
        const confianca = Number.isFinite(confiancaInformada) && confiancaInformada > 0
            ? Math.round((confiancaCalculada + Math.min(100, Math.max(0, confiancaInformada))) / 2)
            : confiancaCalculada;
        const comparacaoDatasPermitida = Boolean(
            COMPARACAO_AUTOMATICA_DATAS_OCR_ATIVA &&
            textoSeguro &&
            datasComparaveis.length > 0 &&
            confianca >= CONFIANCA_MINIMA_COMPARACAO_DATAS &&
            textoPossuiConteudoDocumentoConfiavel(textoSeguro) &&
            tipoLeitura === "pdf_texto_local"
        );
        const datasAssinaturaDigital = comparacaoDatasPermitida
            ? filtrarDatasPorCategoria(datasComparaveis, "assinatura_digital")
            : [];
        const datasProvaveisVencimento = comparacaoDatasPermitida
            ? filtrarDatasPorCategoria(datasComparaveis, "vencimento")
            : [];
        const datasProvaveisEmissaoRealizacao = comparacaoDatasPermitida
            ? filtrarDatasPorCategoria(datasComparaveis, "emissao_realizacao")
            : [];

        let resumo = "Leitura local não encontrou camada de texto confiável para comparar datas automaticamente.";

        if (datasRelevantesClassificadas.length) {
            resumo = `Leitura local encontrou ${datasRelevantesClassificadas.length} data(s) documental(is) relevante(s): ${datasRelevantesClassificadas.map((data) => data.br).join(", ")}.`;
        } else if (datasComparaveis.length) {
            resumo = `Leitura local encontrou ${datasComparaveis.length} data(s), mas nenhuma foi classificada como vigência, assinatura ou data documental principal.`;
        } else if (datasNomeArquivo.length) {
            resumo = `Foram encontradas data(s) apenas no nome do arquivo: ${datasNomeArquivo.map((data) => data.br).join(", ")}. Essas datas não foram usadas para apontar divergência automática.`;
        }

        if (!comparacaoDatasPermitida && datasRelevantesClassificadas.length) {
            resumo += " A comparação automática entre datas lidas e datas cadastradas segue desativada para evitar falso alerta; a validação principal continua pelas regras locais já existentes.";
        }

        return {
            executado,
            tipoLeitura,
            arquivoNome,
            mimeType,
            extensao,
            confianca,
            textoExtraido: textoSeguro,
            textoPrevia,
            resumoTextual,
            camposExtraidos,
            linhasOcr: Array.isArray(linhasOcr) ? linhasOcr.slice(0, 120) : [],
            assinaturasTabela: Array.isArray(assinaturasTabela) ? assinaturasTabela.slice(0, 30) : [],
            assinaturasDocumento: Array.isArray(assinaturasDocumento) ? assinaturasDocumento.slice(0, 20) : [],
            textoLimitado,
            paginasLidas,
            totalPaginas,
            buscaAmpliada,
            datasEncontradas,
            datasDocumentoConfiaveis: datasComparaveis,
            datasRelevantesClassificadas,
            datasClassificadas,
            datasNomeArquivo,
            datasAssinaturaDigital,
            datasProvaveisVencimento,
            datasProvaveisEmissaoRealizacao,
            comparacaoDatasPermitida,
            avisos,
            erro,
            resumo,
        };
    }

    async function executarLeituraDocumentalLocal({ arquivo = null, arquivoNome = "", mimeType = "" } = {}) {
        const nome = obterNomeArquivo(arquivo, arquivoNome);
        const mime = obterMimeArquivo(arquivo, mimeType);
        const extensao = obterExtensaoArquivo({ arquivo, arquivoNome: nome });

        if (!arquivoPossuiArrayBuffer(arquivo)) {
            return montarRetornoLeituraBase({
                executado: false,
                tipoLeitura: nome ? "nome_arquivo" : "sem_arquivo_local",
                arquivoNome: nome,
                mimeType: mime,
                extensao,
                textoExtraido: "",
                avisos: nome ? ["Somente o nome do arquivo foi avaliado. Datas no nome não geram divergência automática."] : [],
            });
        }

        if (/^image\//i.test(mime) || ["jpg", "jpeg", "png", "webp"].includes(extensao)) {
            const leituraImagem = await extrairTextoImagemComOcr({
                arquivo,
                arquivoNome: nome,
                mimeType: mime,
                extensao,
            });
            const textoExtraido = leituraImagem?.texto || "";
            const avisos = [...(leituraImagem?.avisos || [])];

            if (!textoExtraido) {
                avisos.push("NÃ£o foi encontrado texto confiÃ¡vel na imagem. Conferir manualmente qualidade, enquadramento, foco e iluminaÃ§Ã£o do documento.");
            }

            return montarRetornoLeituraBase({
                executado: true,
                tipoLeitura: textoExtraido ? "ocr_imagem_local" : "imagem_dependente_ocr",
                arquivoNome: nome,
                mimeType: mime,
                extensao,
                textoExtraido,
                linhasOcr: leituraImagem?.linhasOcr || [],
                assinaturasTabela: leituraImagem?.assinaturasTabela || [],
                assinaturasDocumento: leituraImagem?.assinaturasDocumento || [],
                paginasLidas: leituraImagem?.paginasLidas || 0,
                totalPaginas: leituraImagem?.totalPaginas || 0,
                confiancaOcr: leituraImagem?.confianca ?? null,
                avisos,
            });
        }

        if (extensao && extensao !== "pdf" && mime !== "application/pdf") {
            return montarRetornoLeituraBase({
                executado: false,
                tipoLeitura: "formato_sem_leitura_textual",
                arquivoNome: nome,
                mimeType: mime,
                extensao,
                textoExtraido: "",
                avisos: ["Formato sem leitura textual local nesta etapa."],
            });
        }

        try {
            const buffer = await arquivo.arrayBuffer();
            const tamanhoOriginal = buffer.byteLength;
            const textoLimitado = tamanhoOriginal > LIMITE_BYTES_LEITURA_LOCAL;
            const bytes = new Uint8Array(buffer.slice(0, LIMITE_BYTES_LEITURA_LOCAL));
            const leituraPdfJs = await extrairTextoPdfComPdfJs(buffer);
            const leituraOcrImagem = leituraPdfJs.texto ? null : await extrairTextoPrimeiraPaginaPdfComOcr(buffer);
            const textoExtraido = leituraPdfJs.texto || leituraOcrImagem?.texto || extrairTextoLegivelPdf(bytes);
            const textoVeioDoOcrImagem = Boolean(!leituraPdfJs.texto && leituraOcrImagem?.texto);
            const avisos = [...(leituraPdfJs.avisos || []), ...(leituraOcrImagem?.avisos || [])];

            if (textoLimitado) {
                avisos.push("Leitura bruta limitada aos primeiros 8 MB para preservar performance no navegador.");
            }

            if (textoExtraido && leituraPdfJs.texto) {
                avisos.push("Texto extraído pela camada textual do PDF usando PDF.js, sem API paga.");
            }

            if (textoVeioDoOcrImagem) {
                avisos.push("Texto extraído por OCR local de imagem usando tesseract.js, sem API paga.");
            }

            if (!textoExtraido) {
                avisos.push("Não foi encontrada camada de texto confiável. O PDF pode ser uma imagem escaneada, conter apenas imagens ou exigir conferência manual.");
                avisos.push("Datas encontradas somente no nome do arquivo não serão usadas para acusar divergência com o cadastro.");
            }

            return montarRetornoLeituraBase({
                executado: true,
                tipoLeitura: textoExtraido ? (textoVeioDoOcrImagem ? "ocr_imagem_local" : "pdf_texto_local") : "pdf_sem_texto_legivel",
                arquivoNome: nome,
                mimeType: mime,
                extensao,
                textoExtraido,
                textoLimitado,
                linhasOcr: textoVeioDoOcrImagem ? (leituraOcrImagem?.linhasOcr || []) : [],
                assinaturasTabela: textoVeioDoOcrImagem ? (leituraOcrImagem?.assinaturasTabela || []) : [],
                assinaturasDocumento: textoVeioDoOcrImagem ? (leituraOcrImagem?.assinaturasDocumento || []) : [],
                paginasLidas: textoVeioDoOcrImagem ? (leituraOcrImagem?.paginasLidas || 1) : (leituraPdfJs.paginasLidas || 0),
                totalPaginas: leituraPdfJs.totalPaginas || leituraOcrImagem?.totalPaginas || 0,
                buscaAmpliada: leituraPdfJs.buscaAmpliada || null,
                avisos,
            });
        } catch (error) {
            return montarRetornoLeituraBase({
                executado: false,
                tipoLeitura: "erro_leitura_local",
                arquivoNome: nome,
                mimeType: mime,
                extensao,
                textoExtraido: "",
                erro: error?.message || "Erro ao executar leitura local do arquivo.",
                avisos: ["A leitura local falhou, mas o fluxo de salvamento não deve ser bloqueado."],
            });
        }
    }

    return {
        executarLeituraDocumentalLocal,
    };
}
