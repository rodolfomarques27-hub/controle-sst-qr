export default function criarControladorScannerDds({
    arquivoScannerDds,
    carregandoLeituraArquivoScannerDds,
    carregandoScannerDds,
    carregarRegistroDdsPorCodigo,
    codigoConferenciaDds,
    dadosDds,
    executarLeituraDdsLocal,
    leituraArquivoScannerDds,
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
    excluindoDocumentoPersistidoDds,
    setExcluindoDocumentoPersistidoDds,
    setMensagemDocumentoPersistidoDds,
    registrarDocumentoDdsAssinado,
    salvandoArquivoScannerDds,
    setSalvandoArquivoScannerDds,
    supabase,
}) {
    function normalizarDocumentoPersistidoDds(
        documento = null
    ) {
        if (
            !documento ||
            typeof documento !== "object"
        ) {
            return null;
        }

        const id =
            String(
                documento.id ||
                documento.documentoId ||
                documento.documento_id ||
                ""
            ).trim();

        const caminhoStorage =
            String(
                documento.caminho_storage ||
                documento.caminhoStorage ||
                ""
            ).trim();

        if (!id && !caminhoStorage) {
            return null;
        }

        return {
            ...documento,
            id,
            bucketId:
                String(
                    documento.bucket_id ||
                    documento.bucketId ||
                    "dds-assinados"
                ).trim() ||
                "dds-assinados",
            caminhoStorage,
            nomeOriginal:
                String(
                    documento.nome_original ||
                    documento.nomeOriginal ||
                    (
                        "dds-" +
                        (
                            registroScannerDds?.codigo ||
                            "salvo"
                        ) +
                        ".pdf"
                    )
                ).trim(),
            mimeType:
                String(
                    documento.mime_type ||
                    documento.mimeType ||
                    "application/pdf"
                ).trim() ||
                "application/pdf",
        };
    }

    function obterDocumentoPersistidoLocalDds() {
        const candidatos = [
            registroScannerDds
                ?.dados
                ?.conferenciaAssistida
                ?.documento,
            registroScannerDds
                ?.dados
                ?.conferenciaAssistida
                ?.fechamento
                ?.documento,
            registroScannerDds
                ?.dados
                ?.fechamento
                ?.documento,
            registroScannerDds
                ?.dados
                ?.documento,
            registroScannerDds
                ?.dados
                ?.documentoAssinado,
        ];

        for (const candidato of candidatos) {
            const documento =
                normalizarDocumentoPersistidoDds(
                    candidato
                );

            if (documento) {
                return documento;
            }
        }

        return null;
    }

    async function buscarDocumentoPersistidoDds() {
        if (!supabase) {
            throw new Error(
                "Supabase não disponível para consultar o PDF DDS."
            );
        }

        const registroId =
            String(
                registroScannerDds?.id ||
                ""
            ).trim();

        if (!registroId) {
            throw new Error(
                "O registro DDS precisa estar carregado antes de consultar o PDF."
            );
        }

        const documentoLocal =
            obterDocumentoPersistidoLocalDds();

        if (
            documentoLocal?.id &&
            documentoLocal?.caminhoStorage
        ) {
            return documentoLocal;
        }

        const { data, error } =
            await supabase
                .from("dds_documentos")
                .select("*")
                .eq(
                    "registro_id",
                    registroId
                )
                .order(
                    "created_at",
                    {
                        ascending: false,
                    }
                )
                .limit(1)
                .maybeSingle();

        if (error) {
            throw new Error(
                error.message ||
                "Não foi possível consultar o PDF salvo do DDS."
            );
        }

        const documento =
            normalizarDocumentoPersistidoDds(
                data
            );

        if (
            !documento?.id ||
            !documento?.caminhoStorage
        ) {
            throw new Error(
                "Nenhum PDF salvo foi localizado para este DDS."
            );
        }

        return documento;
    }

    async function baixarDocumentoPersistidoDds(
        documento
    ) {
        const { data, error } =
            await supabase.storage
                .from(
                    documento.bucketId
                )
                .download(
                    documento.caminhoStorage
                );

        if (error || !data) {
            throw new Error(
                error?.message ||
                "Não foi possível baixar o PDF salvo do DDS."
            );
        }

        return new File(
            [data],
            documento.nomeOriginal,
            {
                type:
                    documento.mimeType ||
                    data.type ||
                    "application/pdf",
            }
        );
    }

    function criarDadosSemDocumentoPersistidoDds(
        dadosOriginais = {}
    ) {
        const dados =
            JSON.parse(
                JSON.stringify(
                    dadosOriginais &&
                    typeof dadosOriginais === "object"
                        ? dadosOriginais
                        : {}
                )
            );

        const caminhos = [
            [
                "conferenciaAssistida",
                "documento",
            ],
            [
                "conferenciaAssistida",
                "documentoId",
            ],
            [
                "conferenciaAssistida",
                "documento_id",
            ],
            [
                "conferenciaAssistida",
                "fechamento",
                "documento",
            ],
            [
                "fechamento",
                "documento",
            ],
            [
                "scanner",
                "documento",
            ],
            [
                "documento",
            ],
            [
                "documentoAssinado",
            ],
        ];

        caminhos.forEach(
            (caminho) => {
                let referencia = dados;

                for (
                    let indice = 0;
                    indice < caminho.length - 1;
                    indice += 1
                ) {
                    referencia =
                        referencia?.[
                            caminho[indice]
                        ];

                    if (
                        !referencia ||
                        typeof referencia !== "object"
                    ) {
                        return;
                    }
                }

                if (
                    referencia &&
                    typeof referencia === "object"
                ) {
                    delete referencia[
                        caminho[
                            caminho.length - 1
                        ]
                    ];
                }
            }
        );

        return dados;
    }

    function montarContextoDocumentoPersistidoDds() {
        return {
            codigo:
                registroScannerDds?.codigo ||
                codigoConferenciaDds ||
                dadosDds.codigo ||
                "",
            empresaNome:
                registroScannerDds?.empresaNome ||
                registroScannerDds
                    ?.dados
                    ?.empresaNome ||
                "",
            obraNome:
                registroScannerDds?.obraNome ||
                registroScannerDds
                    ?.dados
                    ?.obraNome ||
                "",
            periodoInicio:
                registroScannerDds?.periodoInicio ||
                registroScannerDds
                    ?.dados
                    ?.periodoInicio ||
                "",
            periodoFim:
                registroScannerDds?.periodoFim ||
                registroScannerDds
                    ?.dados
                    ?.periodoFim ||
                "",
            participantes:
                participantesRegistroScannerDds,
        };
    }

    async function analisarDocumentoPersistidoDds() {
        if (
            carregandoLeituraArquivoScannerDds ||
            excluindoDocumentoPersistidoDds
        ) {
            return;
        }

        setCarregandoLeituraArquivoScannerDds(
            true
        );

        setMensagemDocumentoPersistidoDds(
            null
        );

        setErroArquivoScannerDds("");
        setErroLeituraArquivoScannerDds("");

        try {
            const documento =
                await buscarDocumentoPersistidoDds();

            const arquivo =
                await baixarDocumentoPersistidoDds(
                    documento
                );

            setArquivoScannerDds(
                arquivo
            );

            const leitura =
                await executarLeituraDdsLocal({
                    arquivo,
                    arquivoNome:
                        arquivo.name ||
                        documento.nomeOriginal ||
                        "",
                    mimeType:
                        arquivo.type ||
                        documento.mimeType ||
                        "",
                    contextoDds:
                        montarContextoDocumentoPersistidoDds(),
                });

            setLeituraArquivoScannerDds(
                leitura ||
                null
            );

            if (leitura?.erro) {
                throw new Error(
                    leitura.erro
                );
            }

            setMensagemDocumentoPersistidoDds({
                tipo: "sucesso",
                texto:
                    "PDF salvo carregado e analisado. Os resultados estão disponíveis na Conferência DDS.",
            });
        } catch (error) {
            const mensagem =
                error?.message ||
                "Não foi possível analisar o PDF salvo.";

            setErroLeituraArquivoScannerDds(
                mensagem
            );

            setMensagemDocumentoPersistidoDds({
                tipo: "erro",
                texto: mensagem,
            });
        } finally {
            setCarregandoLeituraArquivoScannerDds(
                false
            );
        }
    }

    async function excluirDocumentoPersistidoDds() {
        if (
            excluindoDocumentoPersistidoDds ||
            carregandoLeituraArquivoScannerDds
        ) {
            return;
        }

        const codigo =
            String(
                registroScannerDds?.codigo ||
                codigoConferenciaDds ||
                ""
            )
                .trim()
                .toUpperCase();

        if (!codigo) {
            setMensagemDocumentoPersistidoDds({
                tipo: "erro",
                texto:
                    "Carregue um registro DDS antes de excluir o PDF.",
            });

            return;
        }

        const confirmacaoDigitada =
            window.prompt(
                "Para excluir somente o PDF salvo, digite exatamente o código do DDS:\n\n" +
                codigo
            );

        if (confirmacaoDigitada === null) {
            return;
        }

        if (
            String(confirmacaoDigitada)
                .trim()
                .toUpperCase() !== codigo
        ) {
            setMensagemDocumentoPersistidoDds({
                tipo: "erro",
                texto:
                    "Código de confirmação incorreto. Nenhum arquivo foi excluído.",
            });

            return;
        }

        const confirmado =
            window.confirm(
                "Confirma a exclusão definitiva do PDF salvo do DDS " +
                codigo +
                "?\n\nO cadastro do DDS será mantido."
            );

        if (!confirmado) {
            return;
        }

        setExcluindoDocumentoPersistidoDds(
            true
        );

        setMensagemDocumentoPersistidoDds(
            null
        );

        const registroId =
            String(
                registroScannerDds?.id ||
                ""
            ).trim();

        const dadosOriginais =
            registroScannerDds?.dados &&
            typeof registroScannerDds.dados ===
                "object"
                ? registroScannerDds.dados
                : {};

        let dadosAtualizados = null;
        let documento = null;
        let arquivoBackup = null;
        let dadosRemovidosDoRegistro = false;
        let storageRemovido = false;

        try {
            if (!registroId) {
                throw new Error(
                    "Identificador do registro DDS não localizado."
                );
            }

            documento =
                await buscarDocumentoPersistidoDds();

            try {
                arquivoBackup =
                    await baixarDocumentoPersistidoDds(
                        documento
                    );
            } catch (errorBackup) {
                const mensagemBackup =
                    String(
                        errorBackup?.message ||
                        ""
                    );

                if (
                    !/not found|object not found|does not exist|404/i.test(
                        mensagemBackup
                    )
                ) {
                    throw new Error(
                        "Não foi possível criar a cópia de segurança do PDF antes da exclusão. " +
                        mensagemBackup
                    );
                }

                arquivoBackup = null;
            }

            dadosAtualizados =
                criarDadosSemDocumentoPersistidoDds(
                    dadosOriginais
                );

            const {
                error:
                    erroAtualizarRegistro,
            } =
                await supabase
                    .from("dds_registros")
                    .update({
                        dados:
                            dadosAtualizados,
                    })
                    .eq(
                        "id",
                        registroId
                    );

            if (erroAtualizarRegistro) {
                throw new Error(
                    erroAtualizarRegistro.message ||
                    "Não foi possível retirar a referência do PDF do registro DDS."
                );
            }

            dadosRemovidosDoRegistro = true;

            const {
                error:
                    erroRemoverStorage,
            } =
                await supabase.storage
                    .from(
                        documento.bucketId
                    )
                    .remove([
                        documento.caminhoStorage,
                    ]);

            if (erroRemoverStorage) {
                const mensagemStorage =
                    String(
                        erroRemoverStorage.message ||
                        ""
                    );

                if (
                    !/not found|object not found|does not exist|404/i.test(
                        mensagemStorage
                    )
                ) {
                    throw new Error(
                        mensagemStorage ||
                        "Não foi possível excluir o PDF do Storage."
                    );
                }
            } else {
                storageRemovido = true;
            }

            const {
                error:
                    erroExcluirDocumento,
            } =
                await supabase
                    .from("dds_documentos")
                    .delete()
                    .eq(
                        "id",
                        documento.id
                    )
                    .eq(
                        "registro_id",
                        registroId
                    );

            if (erroExcluirDocumento) {
                throw new Error(
                    erroExcluirDocumento.message ||
                    "Não foi possível excluir o registro do PDF DDS."
                );
            }

            setRegistroScannerDds({
                ...registroScannerDds,
                dados:
                    dadosAtualizados,
                atualizadoEm:
                    new Date().toISOString(),
            });

            setArquivoScannerDds(null);
            setLeituraArquivoScannerDds(null);
            setErroArquivoScannerDds("");
            setErroLeituraArquivoScannerDds("");

            setMensagemDocumentoPersistidoDds({
                tipo: "sucesso",
                texto:
                    "PDF salvo excluído com sucesso. O cadastro e o código do DDS foram mantidos.",
            });
        } catch (error) {
            const falhasRestauracao = [];

            if (
                storageRemovido &&
                arquivoBackup &&
                documento?.caminhoStorage
            ) {
                const {
                    error:
                        erroRestaurarStorage,
                } =
                    await supabase.storage
                        .from(
                            documento.bucketId
                        )
                        .upload(
                            documento.caminhoStorage,
                            arquivoBackup,
                            {
                                contentType:
                                    documento.mimeType ||
                                    arquivoBackup.type ||
                                    "application/pdf",
                                cacheControl:
                                    "3600",
                                upsert: true,
                            }
                        );

                if (erroRestaurarStorage) {
                    falhasRestauracao.push(
                        "Storage: " +
                        (
                            erroRestaurarStorage.message ||
                            "falha desconhecida"
                        )
                    );
                }
            }

            if (dadosRemovidosDoRegistro) {
                const {
                    error:
                        erroRestaurarRegistro,
                } =
                    await supabase
                        .from("dds_registros")
                        .update({
                            dados:
                                dadosOriginais,
                        })
                        .eq(
                            "id",
                            registroId
                        );

                if (erroRestaurarRegistro) {
                    falhasRestauracao.push(
                        "registro DDS: " +
                        (
                            erroRestaurarRegistro.message ||
                            "falha desconhecida"
                        )
                    );
                }
            }

            const mensagemBase =
                error?.message ||
                "Não foi possível excluir o PDF salvo.";

            const mensagemFinal =
                falhasRestauracao.length > 0
                    ? (
                        mensagemBase +
                        " Também houve falha na restauração automática: " +
                        falhasRestauracao.join(
                            " | "
                        )
                    )
                    : (
                        mensagemBase +
                        " As alterações parciais foram revertidas."
                    );

            setMensagemDocumentoPersistidoDds({
                tipo: "erro",
                texto:
                    mensagemFinal,
            });
        } finally {
            setExcluindoDocumentoPersistidoDds(
                false
            );
        }
    }

    async function buscarRegistroScannerDds(evento = null) {
        evento?.preventDefault?.();

        if (carregandoScannerDds) return;

        const codigoBusca = String(codigoConferenciaDds || "")
            .trim()
            .toUpperCase();

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
        setMensagemDocumentoPersistidoDds(null);

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

    async function salvarArquivoScannerDds() {
        if (!arquivoScannerDds) {
            setMensagemDocumentoPersistidoDds({ tipo: "erro", texto: "Selecione o PDF DDS antes de salvar." });
            return;
        }

        if (!registroScannerDds?.id || !registroScannerDds?.codigo) {
            setMensagemDocumentoPersistidoDds({
                tipo: "erro",
                texto: "Selecione um DDS cadastrado na Conferência DDS antes de salvar o PDF.",
            });
            return;
        }

        if (salvandoArquivoScannerDds) return;
        setSalvandoArquivoScannerDds(true);
        setMensagemDocumentoPersistidoDds(null);

        try {
            const resultado = await registrarDocumentoDdsAssinado({
                supabase,
                registro: registroScannerDds,
                arquivo: arquivoScannerDds,
                leitura: leituraArquivoScannerDds,
                quantidadePaginas: leituraArquivoScannerDds?.totalPaginas || null,
            });

            const documento = normalizarDocumentoPersistidoDds(resultado.documento);
            setRegistroScannerDds((registroAtual) => ({
                ...registroAtual,
                dados: {
                    ...(registroAtual?.dados || {}),
                    documentoAssinado: documento,
                },
            }));
            setMensagemDocumentoPersistidoDds({
                tipo: "sucesso",
                texto: resultado.reutilizado
                    ? `O PDF já estava salvo no histórico do ${registroScannerDds.codigo}.`
                    : `PDF salvo no histórico do ${registroScannerDds.codigo}.`,
            });
            window.dispatchEvent(new CustomEvent("safescan:dds-pdf-salvo"));
        } catch (error) {
            setMensagemDocumentoPersistidoDds({
                tipo: "erro",
                texto: error?.message || "Não foi possível salvar o PDF DDS.",
            });
        } finally {
            setSalvandoArquivoScannerDds(false);
        }
    }

    return {
        buscarRegistroScannerDds,
        selecionarArquivoScannerDds,
        limparArquivoScannerDds,
        executarLeituraArquivoScannerDds,
        salvarArquivoScannerDds,
        analisarDocumentoPersistidoDds,
        excluirDocumentoPersistidoDds,
    };
}
