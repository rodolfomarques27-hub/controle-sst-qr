const BUCKET_DDS_ASSINADOS = "dds-assinados";
const LIMITE_ARQUIVO_DDS_BYTES = 25 * 1024 * 1024;

function textoSeguroDdsDocumento(valor) {
    return String(valor ?? "").trim();
}

function normalizarMimeDdsDocumento(arquivo) {
    const mime = textoSeguroDdsDocumento(arquivo?.type).toLowerCase();
    const nome = textoSeguroDdsDocumento(arquivo?.name).toLowerCase();

    if (mime === "application/pdf" || nome.endsWith(".pdf")) {
        return "application/pdf";
    }

    if (mime === "image/png" || nome.endsWith(".png")) {
        return "image/png";
    }

    if (
        mime === "image/jpeg" ||
        nome.endsWith(".jpg") ||
        nome.endsWith(".jpeg")
    ) {
        return "image/jpeg";
    }

    if (mime === "image/webp" || nome.endsWith(".webp")) {
        return "image/webp";
    }

    return mime;
}

function extensaoPorMimeDdsDocumento(mimeType) {
    switch (mimeType) {
        case "application/pdf":
            return "pdf";
        case "image/png":
            return "png";
        case "image/jpeg":
            return "jpg";
        case "image/webp":
            return "webp";
        default:
            return "bin";
    }
}

function normalizarSegmentoCaminhoDdsDocumento(valor, fallback = "sem-identificacao") {
    const normalizado = textoSeguroDdsDocumento(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 100);

    return normalizado || fallback;
}

function bytesParaHexDdsDocumento(bytes) {
    return Array.from(new Uint8Array(bytes))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function validarArquivoDdsAssinado(arquivo) {
    if (!arquivo) {
        throw new Error("Arquivo DDS não informado.");
    }

    const tamanho = Number(arquivo.size || 0);

    if (!Number.isFinite(tamanho) || tamanho <= 0) {
        throw new Error("O arquivo DDS está vazio ou inválido.");
    }

    if (tamanho > LIMITE_ARQUIVO_DDS_BYTES) {
        throw new Error("O arquivo DDS deve ter no máximo 25 MB.");
    }

    const mimeType = normalizarMimeDdsDocumento(arquivo);

    const tiposPermitidos = new Set([
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/webp",
    ]);

    if (!tiposPermitidos.has(mimeType)) {
        throw new Error(
            "Formato não permitido. Anexe PDF, PNG, JPG, JPEG ou WEBP."
        );
    }

    return {
        mimeType,
        tamanhoBytes: tamanho,
        nomeOriginal:
            textoSeguroDdsDocumento(arquivo.name) ||
            `dds-assinado.${extensaoPorMimeDdsDocumento(mimeType)}`,
    };
}

export async function calcularHashSha256ArquivoDds(arquivo) {
    validarArquivoDdsAssinado(arquivo);

    if (
        typeof globalThis.crypto === "undefined" ||
        !globalThis.crypto.subtle ||
        typeof globalThis.crypto.subtle.digest !== "function"
    ) {
        throw new Error(
            "O navegador não oferece suporte ao cálculo seguro SHA-256."
        );
    }

    const buffer = await arquivo.arrayBuffer();

    const hashBuffer =
        await globalThis.crypto.subtle.digest(
            "SHA-256",
            buffer
        );

    return bytesParaHexDdsDocumento(hashBuffer);
}

function construirCaminhoStorageDds({
    registroId,
    hashSha256,
    mimeType,
}) {
    const registroSeguro =
        normalizarSegmentoCaminhoDdsDocumento(
            registroId,
            "registro-sem-id"
        );

    const hashSeguro =
        textoSeguroDdsDocumento(hashSha256)
            .toLowerCase()
            .slice(0, 64);

    const extensao =
        extensaoPorMimeDdsDocumento(mimeType);

    return [
        registroSeguro,
        `${hashSeguro}.${extensao}`,
    ].join("/");
}

export async function buscarDocumentoDdsPorHash({
    supabase,
    registroId,
    hashSha256,
}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado.");
    }

    const registroIdSeguro =
        textoSeguroDdsDocumento(registroId);

    const hashSeguro =
        textoSeguroDdsDocumento(hashSha256).toLowerCase();

    if (!registroIdSeguro || !hashSeguro) {
        return null;
    }

    const { data, error } = await supabase
        .from("dds_documentos")
        .select("*")
        .eq("registro_id", registroIdSeguro)
        .ilike("hash_sha256", hashSeguro)
        .maybeSingle();

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível consultar o documento DDS."
        );
    }

    return data || null;
}

export async function registrarDocumentoDdsAssinado({
    supabase,
    registro,
    arquivo,
    leitura = null,
    quantidadePaginas = null,
}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado.");
    }

    const registroId =
        textoSeguroDdsDocumento(
            registro?.id ||
            registro?.ddsRegistroId ||
            registro?.registro_id
        );

    const codigo =
        textoSeguroDdsDocumento(registro?.codigo);

    if (!registroId) {
        throw new Error(
            "O registro DDS precisa estar salvo antes do upload do documento."
        );
    }

    if (!codigo) {
        throw new Error("Código do DDS não informado.");
    }

    const arquivoValidado =
        validarArquivoDdsAssinado(arquivo);

    const hashSha256 =
        await calcularHashSha256ArquivoDds(arquivo);

    const existente =
        await buscarDocumentoDdsPorHash({
            supabase,
            registroId,
            hashSha256,
        });

    if (existente) {
        return {
            documento: existente,
            reutilizado: true,
            hashSha256,
        };
    }

    const caminhoStorage =
        construirCaminhoStorageDds({
            registroId,
            hashSha256,
            mimeType: arquivoValidado.mimeType,
        });

    const bucket =
        supabase.storage.from(
            BUCKET_DDS_ASSINADOS
        );

    const { error: erroUpload } =
        await bucket.upload(
            caminhoStorage,
            arquivo,
            {
                cacheControl: "3600",
                contentType:
                    arquivoValidado.mimeType,
                upsert: false,
            }
        );

    const uploadCriado =
        !erroUpload;

    if (
        erroUpload &&
        !String(
            erroUpload.message || ""
        ).toLowerCase().includes("already exists")
    ) {
        throw new Error(
            erroUpload.message ||
            "Não foi possível enviar a folha DDS assinada."
        );
    }

    const metadados = {
        codigo,
        processamento: {
            origem:
                textoSeguroDdsDocumento(
                    leitura?.origem
                ) || "scanner_dds",
            confiancaOcr:
                Number.isFinite(
                    Number(leitura?.confiancaOcr ?? leitura?.confianca)
                )
                    ? Number(leitura?.confiancaOcr ?? leitura?.confianca)
                    : null,
            paginasAnalisadas:
                Array.isArray(
                    leitura?.paginasAnalisadas
                )
                    ? leitura.paginasAnalisadas
                    : [],
            avisos:
                Array.isArray(leitura?.avisos)
                    ? leitura.avisos.slice(0, 50)
                    : [],
        },
    };

    const payload = {
        registro_id: registroId,
        bucket_id: BUCKET_DDS_ASSINADOS,
        caminho_storage: caminhoStorage,
        nome_original:
            arquivoValidado.nomeOriginal,
        mime_type:
            arquivoValidado.mimeType,
        tamanho_bytes:
            arquivoValidado.tamanhoBytes,
        hash_sha256: hashSha256,
        quantidade_paginas:
            Number.isFinite(
                Number(quantidadePaginas)
            )
                ? Math.max(
                    1,
                    Number(quantidadePaginas)
                )
                : null,
        leitura_ocr: metadados,
    };

    const { data, error } = await supabase
        .from("dds_documentos")
        .insert(payload)
        .select("*")
        .single();

    if (error) {
        let documentoConcorrente = null;

        try {
            documentoConcorrente =
                await buscarDocumentoDdsPorHash({
                    supabase,
                    registroId,
                    hashSha256,
                });
        } catch {
            documentoConcorrente = null;
        }

        if (documentoConcorrente) {
            return {
                documento:
                    documentoConcorrente,
                reutilizado: true,
                hashSha256,
            };
        }

        if (uploadCriado) {
            await bucket
                .remove([caminhoStorage])
                .catch(() => null);
        }

        throw new Error(
            error.message ||
            "Não foi possível registrar o documento DDS."
        );
    }

    return {
        documento: data,
        reutilizado: false,
        hashSha256,
    };
}

function normalizarStatusFrequenciaDds(valor) {
    const status =
        textoSeguroDdsDocumento(valor)
            .toLowerCase();

    if (
        status === "presente" ||
        status === "p"
    ) {
        return "presente";
    }

    if (
        status === "ausente" ||
        status === "x"
    ) {
        return "ausente";
    }

    return "manual";
}

function normalizarUuidDdsDocumento(valor) {
    const texto =
        textoSeguroDdsDocumento(valor);

    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(texto)
        ? texto
        : null;
}

function normalizarConfiancaDdsDocumento(valor) {
    const numero =
        Number(valor);

    if (!Number.isFinite(numero)) {
        return null;
    }

    return Math.max(
        0,
        Math.min(
            1,
            numero > 1
                ? numero / 100
                : numero
        )
    );
}

function obterPaginaParticipanteDdsDocumento(
    participante
) {
    const pagina =
        Number(
            participante?.paginaEsperada ??
            participante?.paginaImpressa ??
            participante?.pagina ??
            0
        );

    return Number.isFinite(pagina) &&
        pagina > 0
        ? Math.floor(pagina)
        : 1;
}

function obterLinhaPaginaParticipanteDdsDocumento({
    participante,
    pagina,
    numero,
}) {
    const linhaInformada =
        Number(
            participante?.numeroLinha ??
            participante?.linhaImpressa ??
            0
        );

    if (
        Number.isFinite(linhaInformada) &&
        linhaInformada > 0
    ) {
        return Math.floor(linhaInformada);
    }

    if (pagina <= 1) {
        return numero;
    }

    return (
        numero -
        10 -
        ((pagina - 2) * 20)
    );
}

function criarMapaEvidenciasOcrDds(
    marcacoes = []
) {
    const mapa =
        new Map();

    if (!Array.isArray(marcacoes)) {
        return mapa;
    }

    marcacoes.forEach((marcacao) => {
        const pagina =
            Number(marcacao?.pagina || 0);

        const numeroLinha =
            Number(
                marcacao?.numeroLinha || 0
            );

        const diaIndice =
            Number(
                marcacao?.diaIndice
            );

        if (
            !Number.isFinite(pagina) ||
            pagina <= 0 ||
            !Number.isFinite(numeroLinha) ||
            numeroLinha <= 0 ||
            !Number.isFinite(diaIndice)
        ) {
            return;
        }

        mapa.set(
            `${pagina}-${numeroLinha}-${diaIndice}`,
            marcacao
        );
    });

    return mapa;
}

function obterSugestaoOcrFrequenciaDds({
    marcacaoDia,
    marcacaoSemana,
    leituraExecutada,
}) {
    if (marcacaoDia?.x_visual === true) {
        return "ausente";
    }

    if (
        marcacaoDia?.assinatura_visual === true ||
        marcacaoSemana?.assinatura_visual === true
    ) {
        return "presente";
    }

    return leituraExecutada
        ? "manual"
        : "nao_analisado";
}

export function montarFrequenciasEstruturadasDds({
    participantes = [],
    dias = [],
    frequencia = {},
    leitura = null,
}) {
    const mapaOcr =
        criarMapaEvidenciasOcrDds(
            leitura?.marcacoesDdsDias
        );

    const leituraExecutada =
        Boolean(leitura);

    const confiancaGlobal =
        normalizarConfiancaDdsDocumento(
            leitura?.confiancaOcr ??
            leitura?.confianca
        );

    const diasAtivos =
        Array.isArray(dias)
            ? dias.filter(
                (dia) =>
                    dia?.semAtividadeConfirmada !== true &&
                    dia?.semAtividade !== true
            )
            : [];

    const linhas = [];

    participantes.forEach(
        (participante) => {
            const participanteNumero =
                Number(
                    participante?.numero || 0
                );

            if (
                !Number.isFinite(
                    participanteNumero
                ) ||
                participanteNumero <= 0
            ) {
                return;
            }

            const identificadorParticipante =
                textoSeguroDdsDocumento(
                    participante?.id ||
                    participante?.colaboradorId ||
                    participante?.codigoSafescan ||
                    participante?.idAdicional
                );

            const participanteChave =
                identificadorParticipante ||
                `numero-${participanteNumero}`;

            const colaboradorId =
                normalizarUuidDdsDocumento(
                    participante?.colaboradorId ||
                    participante?.id
                );

            const paginaEsperada =
                obterPaginaParticipanteDdsDocumento(
                    participante
                );

            const numeroLinha =
                obterLinhaPaginaParticipanteDdsDocumento({
                    participante,
                    pagina: paginaEsperada,
                    numero:
                        participanteNumero,
                });

            diasAtivos.forEach(
                (dia, indiceDiaAtivo) => {
                    const diaChave =
                        textoSeguroDdsDocumento(
                            dia?.chaveAssistida ||
                            dia?.indiceAssistido ||
                            dia?.indice ||
                            dia?.data ||
                            dia?.nome ||
                            indiceDiaAtivo
                        );

                    const dataReferencia =
                        textoSeguroDdsDocumento(
                            dia?.data
                        ).slice(0, 10);

                    if (!dataReferencia) {
                        return;
                    }

                    const diaIndiceRaw =
                        Number(
                            dia?.indice ??
                            dia?.posicaoSemana ??
                            indiceDiaAtivo
                        );

                    const diaIndice =
                        Number.isFinite(
                            diaIndiceRaw
                        )
                            ? diaIndiceRaw
                            : indiceDiaAtivo;

                    const chaveFrequencia =
                        `${participanteNumero}-${diaChave}`;

                    const status =
                        normalizarStatusFrequenciaDds(
                            frequencia?.[
                                chaveFrequencia
                            ]
                        );

                    const marcacaoDia =
                        mapaOcr.get(
                            `${paginaEsperada}-${numeroLinha}-${diaIndice}`
                        ) || null;

                    const marcacaoSemana =
                        mapaOcr.get(
                            `${paginaEsperada}-${numeroLinha}-7`
                        ) || null;

                    const sugestaoOcr =
                        obterSugestaoOcrFrequenciaDds({
                            marcacaoDia,
                            marcacaoSemana,
                            leituraExecutada,
                        });

                    const evidenciaDetectada =
                        Boolean(
                            marcacaoDia?.x_visual ||
                            marcacaoDia
                                ?.assinatura_visual ||
                            marcacaoSemana
                                ?.assinatura_visual
                        );

                    linhas.push({
                        participanteChave,
                        participanteNumero,
                        colaboradorId,
                        participanteNome:
                            textoSeguroDdsDocumento(
                                participante?.nome
                            ) ||
                            `Participante ${participanteNumero}`,
                        participanteFuncao:
                            textoSeguroDdsDocumento(
                                participante?.funcao
                            ) || null,
                        participanteEmpresa:
                            textoSeguroDdsDocumento(
                                participante?.empresa ||
                                participante?.empresaNome
                            ) || null,
                        codigoSafescan:
                            textoSeguroDdsDocumento(
                                participante?.codigoSafescan
                            ) || null,
                        participanteOrigem:
                            textoSeguroDdsDocumento(
                                participante?.origem
                            ) || "cadastro",
                        participanteTipo:
                            textoSeguroDdsDocumento(
                                participante?.tipo
                            ) || "colaborador",
                        paginaImpressa:
                            paginaEsperada,
                        linhaImpressa:
                            numeroLinha > 0
                                ? numeroLinha
                                : null,
                        dataReferencia,
                        diaChave,
                        diaPosicao:
                            diaIndice,
                        status,
                        sugestaoOcr,
                        confiancaOcr:
                            evidenciaDetectada
                                ? confiancaGlobal
                                : null,
                        paginaOcr:
                            paginaEsperada,
                        celulaOcr: {
                            pagina:
                                paginaEsperada,
                            numeroLinha,
                            diaIndice,
                            marcacaoDia:
                                marcacaoDia || {},
                            marcacaoSemana:
                                marcacaoSemana || {},
                        },
                        confirmadoManualmente:
                            true,
                        divergenteOcr:
                            Boolean(
                                (
                                    sugestaoOcr ===
                                        "presente" ||
                                    sugestaoOcr ===
                                        "ausente"
                                ) &&
                                sugestaoOcr !==
                                    status
                            ),
                    });
                }
            );
        }
    );

    return linhas;
}

export function montarTemasEstruturadosDds({
    dias = [],
    temasDias = [],
}) {
    return dias
        .map((dia, indiceAtual) => {
            const indiceOriginalRaw =
                Number(
                    dia?.posicaoSemana ??
                    dia?.indice ??
                    indiceAtual
                );

            const indiceOriginal =
                Number.isFinite(
                    indiceOriginalRaw
                )
                    ? indiceOriginalRaw
                    : indiceAtual;

            const confirmado =
                temasDias?.[
                    indiceOriginal
                ] || {};

            const dataReferencia =
                textoSeguroDdsDocumento(
                    dia?.data
                ).slice(0, 10);

            if (!dataReferencia) {
                return null;
            }

            return {
                dataReferencia,
                diaChave:
                    textoSeguroDdsDocumento(
                        dia?.chaveAssistida ||
                        dia?.indiceAssistido ||
                        dia?.indice ||
                        dia?.nome ||
                        indiceOriginal
                    ),
                diaPosicao:
                    indiceOriginal,
                temaPlanejado:
                    textoSeguroDdsDocumento(
                        dia?.temaPlanejado ||
                        dia?.tema
                    ) || null,
                temaConfirmado:
                    textoSeguroDdsDocumento(
                        dia?.temaConfirmado ??
                        confirmado?.temaConfirmado
                    ) || null,
                responsavelPlanejado:
                    textoSeguroDdsDocumento(
                        dia?.responsavelPlanejado ||
                        dia?.responsavel
                    ) || null,
                responsavelConfirmado:
                    textoSeguroDdsDocumento(
                        dia?.responsavelConfirmado ??
                        confirmado
                            ?.responsavelConfirmado
                    ) || null,
                origemTemaConfirmado:
                    textoSeguroDdsDocumento(
                        dia?.origemTemaConfirmado ??
                        confirmado
                            ?.origemTemaConfirmado
                    ) || null,
                semAtividade:
                    dia?.semAtividadeConfirmada === true ||
                    dia?.semAtividade === true ||
                    confirmado
                        ?.semAtividadeConfirmada === true ||
                    confirmado
                        ?.semAtividade === true,
            };
        })
        .filter(Boolean);
}

export async function sincronizarConferenciaEstruturadaDds({
    supabase,
    registroId,
    documentoId = null,
    status = "em_conferencia",
    estatisticas = {},
    leitura = null,
    snapshot = {},
    participantes = [],
    dias = [],
    frequencia = {},
    temasDias = [],
    acao = "salvar_conferencia",
    motivo = null,
}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado.");
    }

    const registroIdSeguro =
        textoSeguroDdsDocumento(registroId);

    if (!registroIdSeguro) {
        throw new Error(
            "Registro DDS não informado para sincronização."
        );
    }

    const frequenciasEstruturadas =
        montarFrequenciasEstruturadasDds({
            participantes,
            dias,
            frequencia,
            leitura,
        });

    const temasEstruturados =
        montarTemasEstruturadosDds({
            dias,
            temasDias,
        });

    const leituraOcr = {
        versao: "dds-leitura-ocr-v1",
        confiancaOcr:
            Number.isFinite(
                Number(leitura?.confiancaOcr ?? leitura?.confianca)
            )
                ? Number(leitura?.confiancaOcr ?? leitura?.confianca)
                : null,
        paginasAnalisadas:
            Array.isArray(
                leitura?.paginasAnalisadas
            )
                ? leitura.paginasAnalisadas
                : [],
        totalMarcacoes:
            Array.isArray(
                leitura?.marcacoesDdsDias
            )
                ? leitura.marcacoesDdsDias.length
                : 0,
    };

    const { data, error } =
        await supabase.rpc(
            "sincronizar_conferencia_dds",
            {
                p_registro_id:
                    registroIdSeguro,
                p_documento_id:
                    documentoId || null,
                p_status:
                    status,
                p_estatisticas:
                    estatisticas || {},
                p_leitura_ocr:
                    leituraOcr,
                p_snapshot:
                    snapshot || {},
                p_frequencias:
                    frequenciasEstruturadas,
                p_temas_dias:
                    temasEstruturados,
                p_acao:
                    acao,
                p_motivo:
                    motivo || null,
            }
        );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível sincronizar os dados estruturados do DDS."
        );
    }

    return {
        conferenciaId:
            data?.conferencia_id ||
            data?.conferenciaId ||
            data,
        resultado: data,
        frequencias:
            frequenciasEstruturadas,
        temasDias:
            temasEstruturados,
        leituraOcr,
    };
}

export async function criarUrlTemporariaDocumentoDds({
    supabase,
    documento,
    validadeSegundos = 300,
}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado.");
    }

    const bucket =
        textoSeguroDdsDocumento(
            documento?.bucket_id ||
            documento?.bucketId
        ) || BUCKET_DDS_ASSINADOS;

    const caminho =
        textoSeguroDdsDocumento(
            documento?.caminho_storage ||
            documento?.caminhoStorage
        );

    if (!caminho) {
        throw new Error(
            "Caminho do documento DDS não informado."
        );
    }

    const validade =
        Math.min(
            Math.max(
                Number(validadeSegundos) || 300,
                60
            ),
            3600
        );

    const { data, error } =
        await supabase.storage
            .from(bucket)
            .createSignedUrl(
                caminho,
                validade
            );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível abrir o documento DDS."
        );
    }

    return data?.signedUrl || "";
}

export async function listarDocumentosDdsPorRegistros({
    supabase,
    registroIds = [],
} = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado.");
    }

    const ids = Array.from(new Set(
        (Array.isArray(registroIds) ? registroIds : [])
            .map((id) => textoSeguroDdsDocumento(id))
            .filter(Boolean)
    ));

    if (!ids.length) return [];

    const documentos = [];

    for (let indice = 0; indice < ids.length; indice += 100) {
        const lote = ids.slice(indice, indice + 100);
        const { data, error } = await supabase
            .from("dds_documentos")
            .select("*")
            .in("registro_id", lote)
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(
                error.message || "Não foi possível consultar o histórico de PDFs DDS."
            );
        }

        if (Array.isArray(data)) documentos.push(...data);
    }

    return documentos;
}

export async function excluirDocumentoDdsHistorico({ supabase, documento } = {}) {
    if (!supabase) throw new Error("Cliente Supabase não informado.");

    const documentoId = textoSeguroDdsDocumento(documento?.id);
    const registroId = textoSeguroDdsDocumento(documento?.registro_id || documento?.registroId);
    const bucketId = textoSeguroDdsDocumento(documento?.bucket_id || documento?.bucketId) || BUCKET_DDS_ASSINADOS;
    const caminho = textoSeguroDdsDocumento(documento?.caminho_storage || documento?.caminhoStorage);

    if (!documentoId || !registroId || !caminho) {
        throw new Error("Dados do PDF DDS incompletos para exclusão.");
    }

    const { data: arquivoBackup, error: erroDownload } = await supabase.storage
        .from(bucketId)
        .download(caminho);

    if (erroDownload && !/not found|does not exist|404/i.test(String(erroDownload.message || ""))) {
        throw new Error(erroDownload.message || "Não foi possível proteger o arquivo antes da exclusão.");
    }

    const { error: erroStorage } = await supabase.storage.from(bucketId).remove([caminho]);
    if (erroStorage && !/not found|does not exist|404/i.test(String(erroStorage.message || ""))) {
        throw new Error(erroStorage.message || "Não foi possível excluir o PDF do armazenamento.");
    }

    const { error: erroBanco } = await supabase
        .from("dds_documentos")
        .delete()
        .eq("id", documentoId)
        .eq("registro_id", registroId);

    if (erroBanco) {
        if (arquivoBackup) {
            await supabase.storage.from(bucketId).upload(caminho, arquivoBackup, {
                contentType: documento?.mime_type || "application/pdf",
                cacheControl: "3600",
                upsert: true,
            }).catch(() => null);
        }
        throw new Error(erroBanco.message || "Não foi possível excluir o registro do PDF DDS.");
    }

    return true;
}

export {
    BUCKET_DDS_ASSINADOS,
    LIMITE_ARQUIVO_DDS_BYTES,
};
