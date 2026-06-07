import {
    DOCUMENTOS_VERIFICACAO_BUCKETS,
    DOCUMENTOS_VERIFICACAO_ORIGEM_ANALISE,
    DOCUMENTOS_VERIFICACAO_ORIGENS,
    DOCUMENTOS_VERIFICACAO_PESOS,
    DOCUMENTOS_VERIFICACAO_TABELAS,
    DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO,
} from "../constants/documentosVerificacaoConstants";
import {
    avaliarArquivoBasicoVerificacao,
    avaliarDatasCertificadoVerificacao,
    avaliarDatasDocumentoEmpresaVerificacao,
    avaliarDuplicidadeVerificacao,
    avaliarObservacaoVerificacao,
    criarIndicioVerificacao,
    filtrarPayloadSupabaseVerificacao,
    formatarDataIsoVerificacao,
    gerarHashArquivoVerificacao,
    limparTextoVerificacao,
    montarResultadoVerificacaoBase,
    normalizarTextoVerificacao,
    obterExtensaoArquivoVerificacao,
    obterMimeArquivoVerificacao,
    obterNomeArquivoVerificacao,
    obterTamanhoArquivoVerificacao,
    valorUuidOuNullVerificacao,
} from "../utils/documentosVerificacaoUtils";

let moduloOcrDocumentalPromise = null;

async function carregarModuloOcrDocumental() {
    if (!moduloOcrDocumentalPromise) {
        moduloOcrDocumentalPromise = import("./documentosOcrService");
    }

    return moduloOcrDocumentalPromise;
}

function obterArquivoUrlDocumento(documento = {}) {
    return documento.arquivo_url ||
        documento.url_do_arquivo ||
        documento.arquivoUrl ||
        documento.urlDoArquivo ||
        documento.caminho_storage ||
        documento.caminhoStorage ||
        documento.storage_path ||
        documento.storagePath ||
        "";
}

function obterArquivoNomeDocumento(documento = {}, arquivo = null) {
    return obterNomeArquivoVerificacao({
        arquivo,
        arquivoNome: documento.arquivo_nome || documento.nome_do_arquivo || documento.arquivoNome || documento.nomeDoArquivo || "",
    });
}

function obterEmpresaIdDocumento(documento = {}, empresa = {}) {
    return documento.empresa_id ||
        documento.empresaId ||
        empresa.id ||
        null;
}

function obterColaboradorIdCertificado(certificado = {}, colaborador = {}) {
    return certificado.colaborador_id ||
        certificado.colaboradorId ||
        colaborador.id ||
        certificado.colaborador?.id ||
        null;
}

function obterTreinamentoIdUuidCertificado(certificado = {}, treinamento = {}) {
    return valorUuidOuNullVerificacao(
        certificado.treinamento_id ||
        certificado.treinamentoUuid ||
        treinamento.id ||
        ""
    );
}

function obterTipoCertificado(certificado = {}, treinamento = {}) {
    return certificado.tipo_treinamento ||
        certificado.tipoTreinamento ||
        certificado.nome_treinamento ||
        certificado.nomeTreinamento ||
        treinamento.nome ||
        "";
}


function arquivoPossuiArrayBufferVerificacao(arquivo = null) {
    return Boolean(
        arquivo &&
        typeof arquivo === "object" &&
        typeof arquivo.arrayBuffer === "function"
    );
}

function obterArquivoValidoVerificacao(arquivo = null) {
    return arquivoPossuiArrayBufferVerificacao(arquivo) ? arquivo : null;
}

function obterNumeroOuNullVerificacao(...valores) {
    for (const valor of valores) {
        if (valor === null || valor === undefined || valor === "") continue;

        const numero = Number(valor);

        if (Number.isFinite(numero)) {
            return numero;
        }
    }

    return null;
}

function obterTamanhoBytesDocumento(documento = {}) {
    return obterNumeroOuNullVerificacao(
        documento.tamanho_bytes,
        documento.tamanhoBytes,
        documento.arquivo_tamanho,
        documento.arquivoTamanho,
        documento.file_size,
        documento.fileSize,
        documento.size,
        documento.bytes
    );
}

function documentoPossuiReferenciaArquivo(documento = {}, arquivo = null) {
    return Boolean(
        arquivo ||
        obterArquivoUrlDocumento(documento) ||
        obterArquivoNomeDocumento(documento, null) ||
        documento.caminho_storage ||
        documento.caminhoStorage
    );
}

function filtrarIndiciosArquivoSemArquivoLocal({ indicios = [], arquivo = null, documento = {} } = {}) {
    if (arquivo || !documentoPossuiReferenciaArquivo(documento, arquivo)) {
        return indicios;
    }

    return indicios.filter((indicio = {}) => {
        const texto = `${indicio.codigo || ""} ${indicio.titulo || ""} ${indicio.detalhe || ""}`.toLowerCase();

        const indicaTamanhoZero =
            texto.includes("arquivo_muito_pequeno") ||
            texto.includes("arquivo muito pequeno") ||
            texto.includes("tamanho identificado: 0 bytes") ||
            texto.includes("0 bytes");

        return !indicaTamanhoZero;
    });
}

function montarMetadadosArquivo({ arquivo = null, documento = {}, bucketPadrao = "" } = {}) {
    const arquivoValido = obterArquivoValidoVerificacao(arquivo);
    const arquivoNome = obterArquivoNomeDocumento(documento, arquivoValido);
    const arquivoUrl = obterArquivoUrlDocumento(documento);
    const tamanhoBytes = obterTamanhoArquivoVerificacao({
        arquivo: arquivoValido,
        tamanhoBytes: obterTamanhoBytesDocumento(documento),
    });
    const mimeType = obterMimeArquivoVerificacao({
        arquivo: arquivoValido,
        mimeType: documento.mime_type || documento.mimeType || "",
    });

    return {
        arquivoNome,
        arquivoUrl,
        bucket: documento.bucket || bucketPadrao || "",
        caminhoStorage: documento.caminho_storage || documento.caminhoStorage || arquivoUrl || "",
        tamanhoBytes,
        mimeType,
        extensao: obterExtensaoArquivoVerificacao(arquivoNome),
    };
}

function avaliarEmpresaDocumento({ documento = {}, empresa = {} } = {}) {
    const indicios = [];
    const empresaIdDocumento = documento.empresa_id || documento.empresaId || "";
    const empresaId = empresa.id || "";

    if (!empresaIdDocumento && !empresaId) {
        indicios.push(criarIndicioVerificacao({
            codigo: "empresa_nao_identificada",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "Empresa não identificada",
            detalhe: "Não foi possível identificar a empresa vinculada ao documento.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.EMPRESA_NAO_IDENTIFICADA,
            recomendacao: "Vincular o documento a uma empresa cadastrada.",
        }));
    }

    if (empresaIdDocumento && empresaId && String(empresaIdDocumento) !== String(empresaId)) {
        indicios.push(criarIndicioVerificacao({
            codigo: "divergencia_empresa_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "Divergência de empresa vinculada",
            detalhe: "O documento está vinculado a uma empresa diferente da empresa informada para análise.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DIVERGENCIA_EMPRESA,
            recomendacao: "Conferir se o documento pertence à empresa correta.",
            dados: {
                empresaIdDocumento,
                empresaIdAnalise: empresaId,
            },
        }));
    }

    return indicios;
}

function avaliarCadastroCertificado({ certificado = {}, colaborador = {}, treinamento = {} } = {}) {
    const indicios = [];

    const colaboradorId = obterColaboradorIdCertificado(certificado, colaborador);
    const tipoCertificado = normalizarTextoVerificacao(obterTipoCertificado(certificado, treinamento));
    const nomeTreinamento = normalizarTextoVerificacao(treinamento.nome || "");

    if (!colaboradorId) {
        indicios.push(criarIndicioVerificacao({
            codigo: "colaborador_nao_identificado",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "Colaborador não identificado",
            detalhe: "O certificado não possui colaborador válido vinculado.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.COLABORADOR_NAO_IDENTIFICADO,
            bloqueia: true,
            recomendacao: "Vincular o certificado ao colaborador correto antes da liberação.",
        }));
    }

    if (!tipoCertificado && !nomeTreinamento) {
        indicios.push(criarIndicioVerificacao({
            codigo: "treinamento_nao_identificado",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "Treinamento/documento não identificado",
            detalhe: "O certificado não possui treinamento ou documento vinculado.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.TREINAMENTO_NAO_IDENTIFICADO,
            recomendacao: "Selecionar o treinamento/documento correto.",
        }));
    }

    if (tipoCertificado && nomeTreinamento && tipoCertificado !== nomeTreinamento) {
        indicios.push(criarIndicioVerificacao({
            codigo: "divergencia_treinamento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "Divergência no nome do treinamento",
            detalhe: "O nome do treinamento no certificado analisado diverge do treinamento informado.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DIVERGENCIA_TREINAMENTO,
            recomendacao: "Conferir se o certificado corresponde ao treinamento selecionado.",
            dados: {
                tipoCertificado,
                nomeTreinamento,
            },
        }));
    }

    return indicios;
}

function leituraDocumentalPossuiDataConfirmada(leitura = {}) {
    const datasRelevantes = [
        ...(Array.isArray(leitura?.datasRelevantesClassificadas) ? leitura.datasRelevantesClassificadas : []),
        ...(Array.isArray(leitura?.datasDocumentoConfiaveis) ? leitura.datasDocumentoConfiaveis : []),
    ].filter((data) => data?.iso);

    const campos = leitura?.camposExtraidos || leitura?.campos_extraidos || {};

    return Boolean(
        datasRelevantes.length > 0 ||
        campos?.assinatura_data ||
        campos?.data_encerramento ||
        campos?.vigencia_inicio ||
        campos?.vigencia_fim
    );
}

function avaliarLeituraDataCertificado({ leitura, arquivo = null, exigeVencimento = true } = {}) {
    const indicios = [];

    if (!exigeVencimento && leituraDocumentalPossuiDataConfirmada(leitura)) {
        return indicios;
    }

    if (!arquivoPossuiArrayBufferVerificacao(arquivo)) {
        return indicios;
    }

    if (leituraDocumentalPossuiDataConfirmada(leitura)) {
        return indicios;
    }

    indicios.push(criarIndicioVerificacao({
        codigo: "data_impressa_nao_confirmada_automaticamente",
        tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
        titulo: "Data impressa não confirmada automaticamente",
        detalhe: "A leitura local não conseguiu confirmar a data impressa do certificado/ASO. O arquivo pode ser imagem escaneada, não possuir camada de texto ou exigir OCR real de imagem.",
        peso: 45,
        bloqueia: false,
        recomendacao: "Conferir manualmente a data no PDF/imagem antes de considerar o documento aprovado.",
        dados: {
            tipoLeitura: leitura?.tipoLeitura || leitura?.tipo_leitura || "não identificado",
            confianca: leitura?.confianca || 0,
            datasEncontradas: (leitura?.datasEncontradas || []).map((data) => data?.iso).filter(Boolean),
        },
    }));

    return indicios;
}

function aplicarRevisaoManualQuandoDataNaoConfirmada(resultado = {}, indicios = []) {
    const possuiDataNaoConfirmada = indicios.some(
        (indicio) => indicio?.codigo === "data_impressa_nao_confirmada_automaticamente"
    );

    if (!possuiDataNaoConfirmada) return resultado;

    const proximoResultado = { ...resultado };

    if (String(proximoResultado.status_verificacao || "").toLowerCase() === "aprovado") {
        proximoResultado.status_verificacao = "revisao_manual";
    }

    if (String(proximoResultado.nivel_risco || "").toLowerCase() === "baixo") {
        proximoResultado.nivel_risco = "medio";
    }

    proximoResultado.score_risco = Math.max(Number(proximoResultado.score_risco || 0), 45);
    proximoResultado.resumo = [
        proximoResultado.resumo,
        "A data impressa não foi confirmada pela leitura local; manter em revisão manual até conferência visual.",
    ].filter(Boolean).join(" ").trim();

    return proximoResultado;
}

export function normalizarVerificacaoDocumental(item = {}) {
    return {
        ...item,
        id: item.id || "",
        origemTipo: item.origem_tipo || item.origemTipo || "",
        origemTabela: item.origem_tabela || item.origemTabela || "",
        documentoId: item.documento_id || item.documentoId || "",
        empresaId: item.empresa_id || item.empresaId || "",
        colaboradorId: item.colaborador_id || item.colaboradorId || "",
        treinamentoId: item.treinamento_id || item.treinamentoId || "",
        tipoDocumento: item.tipo_documento || item.tipoDocumento || "",
        nomeDocumento: item.nome_documento || item.nomeDocumento || "",
        arquivoNome: item.arquivo_nome || item.arquivoNome || "",
        arquivoUrl: item.arquivo_url || item.arquivoUrl || "",
        caminhoStorage: item.caminho_storage || item.caminhoStorage || "",
        mimeType: item.mime_type || item.mimeType || "",
        tamanhoBytes: item.tamanho_bytes ?? item.tamanhoBytes ?? null,
        hashArquivo: item.hash_arquivo || item.hashArquivo || "",
        dataEmissao: item.data_emissao || item.dataEmissao || "",
        dataRealizacao: item.data_realizacao || item.dataRealizacao || "",
        dataVencimento: item.data_vencimento || item.dataVencimento || "",
        statusVerificacao: item.status_verificacao || item.statusVerificacao || "",
        nivelRisco: item.nivel_risco || item.nivelRisco || "",
        scoreRisco: item.score_risco ?? item.scoreRisco ?? 0,
        indicios: Array.isArray(item.indicios) ? item.indicios : [],
        recomendacoes: Array.isArray(item.recomendacoes) ? item.recomendacoes : [],
        resumo: item.resumo || "",
        origemAnalise: item.origem_analise || item.origemAnalise || "",
        modeloIa: item.modelo_ia || item.modeloIa || "",
        retornoIa: item.retorno_ia || item.retornoIa || null,
        ocrTexto: item.ocr_texto || item.ocrTexto || "",
        analisadoPorIa: Boolean(item.analisado_por_ia || item.analisadoPorIa),
        createdAt: item.created_at || item.createdAt || "",
        updatedAt: item.updated_at || item.updatedAt || "",
    };
}

export async function analisarDocumentoEmpresaLocal({
    documento = {},
    empresa = {},
    arquivo = null,
    registrosExistentes = [],
    hashArquivoInformado = "",
} = {}) {
    const metadadosArquivo = montarMetadadosArquivo({
        arquivo,
        documento,
        bucketPadrao: DOCUMENTOS_VERIFICACAO_BUCKETS.DOCUMENTOS_EMPRESAS,
    });

    const arquivoValidoParaHash = obterArquivoValidoVerificacao(arquivo);
    const hashArquivo = hashArquivoInformado || (arquivoValidoParaHash ? await gerarHashArquivoVerificacao(arquivoValidoParaHash) : "");
    const {
        avaliarLeituraDocumentalComCadastro,
        executarLeituraDocumentalLocal,
        montarRetornoLeituraParaPersistencia,
    } = await carregarModuloOcrDocumental();
    const leituraDocumental = await executarLeituraDocumentalLocal({
        arquivo: arquivoValidoParaHash,
        arquivoNome: metadadosArquivo.arquivoNome,
        mimeType: metadadosArquivo.mimeType,
    });
    const retornoLeituraDocumental = montarRetornoLeituraParaPersistencia(leituraDocumental);

    const indiciosArquivo = filtrarIndiciosArquivoSemArquivoLocal({
        arquivo,
        documento,
        indicios: avaliarArquivoBasicoVerificacao({
            arquivo: arquivoValidoParaHash,
            arquivoNome: metadadosArquivo.arquivoNome,
            mimeType: metadadosArquivo.mimeType,
            tamanhoBytes: metadadosArquivo.tamanhoBytes,
            arquivoUrl: metadadosArquivo.arquivoUrl,
        }),
    });

    const indicios = [
        ...indiciosArquivo,
        ...avaliarDatasDocumentoEmpresaVerificacao({
            dataEmissao: documento.data_emissao || documento.dataEmissao,
            dataVencimento: documento.data_vencimento || documento.dataVencimento,
        }),
        ...avaliarLeituraDocumentalComCadastro({
            leitura: leituraDocumental,
            empresa,
            dataEmissao: documento.data_emissao || documento.dataEmissao,
            dataVencimento: documento.data_vencimento || documento.dataVencimento,
            origemTipo: DOCUMENTOS_VERIFICACAO_ORIGENS.DOCUMENTO_EMPRESA,
        }),
        ...avaliarEmpresaDocumento({
            documento,
            empresa,
        }),
        ...avaliarObservacaoVerificacao(documento.observacao),
        ...avaliarDuplicidadeVerificacao({
            hashArquivo,
            arquivoNome: metadadosArquivo.arquivoNome,
            tamanhoBytes: metadadosArquivo.tamanhoBytes,
            registrosExistentes,
            documentoIdAtual: documento.id || null,
        }),
    ];

    const resultado = montarResultadoVerificacaoBase({ indicios });

    return {
        origem_tipo: DOCUMENTOS_VERIFICACAO_ORIGENS.DOCUMENTO_EMPRESA,
        origem_tabela: DOCUMENTOS_VERIFICACAO_TABELAS.DOCUMENTOS_EMPRESAS,
        documento_id: valorUuidOuNullVerificacao(documento.id),
        empresa_id: valorUuidOuNullVerificacao(obterEmpresaIdDocumento(documento, empresa)),
        colaborador_id: null,
        treinamento_id: null,
        tipo_documento: documento.tipo_documento || documento.tipo || documento.tipoDocumento || "",
        nome_documento: documento.nome_documento || documento.tipo_documento || documento.tipo || "",
        arquivo_nome: metadadosArquivo.arquivoNome,
        arquivo_url: metadadosArquivo.arquivoUrl,
        bucket: metadadosArquivo.bucket,
        caminho_storage: metadadosArquivo.caminhoStorage,
        mime_type: metadadosArquivo.mimeType,
        tamanho_bytes: metadadosArquivo.tamanhoBytes,
        hash_arquivo: hashArquivo || null,
        data_emissao: formatarDataIsoVerificacao(documento.data_emissao || documento.dataEmissao),
        data_realizacao: null,
        data_vencimento: formatarDataIsoVerificacao(documento.data_vencimento || documento.dataVencimento),
        origem_analise: leituraDocumental?.executado || leituraDocumental?.datasEncontradas?.length
            ? DOCUMENTOS_VERIFICACAO_ORIGEM_ANALISE.OCR_LOCAL
            : DOCUMENTOS_VERIFICACAO_ORIGEM_ANALISE.REGRAS_LOCAIS,
        retorno_ia: retornoLeituraDocumental ? { leitura_documental_local: retornoLeituraDocumental } : null,
        ocr_texto: leituraDocumental?.textoExtraido || null,
        analisado_por_ia: false,
        ...resultado,
    };
}

export async function analisarCertificadoLocal({
    certificado = {},
    colaborador = {},
    treinamento = {},
    arquivo = null,
    registrosExistentes = [],
    hashArquivoInformado = "",
    exigeVencimento = true,
} = {}) {
    const documentoNormalizado = {
        ...certificado,
        arquivo_url: certificado.arquivo_url || certificado.arquivoUrl || certificado.url_do_arquivo || certificado.urlDoArquivo || certificado.caminho_storage || certificado.caminhoStorage || "",
        arquivo_nome: certificado.arquivo_nome || certificado.arquivoNome || certificado.nome_do_arquivo || certificado.nomeDoArquivo || "",
        caminho_storage: certificado.caminho_storage || certificado.caminhoStorage || certificado.arquivo_url || certificado.arquivoUrl || "",
        mime_type: certificado.mime_type || certificado.mimeType || certificado.tipo_arquivo || certificado.tipoArquivo || "",
        tamanho_bytes: obterTamanhoBytesDocumento(certificado),
    };

    const metadadosArquivo = montarMetadadosArquivo({
        arquivo,
        documento: documentoNormalizado,
        bucketPadrao: DOCUMENTOS_VERIFICACAO_BUCKETS.CERTIFICADOS_TREINAMENTOS,
    });

    const arquivoValidoParaHash = obterArquivoValidoVerificacao(arquivo);
    const hashArquivo = hashArquivoInformado || (arquivoValidoParaHash ? await gerarHashArquivoVerificacao(arquivoValidoParaHash) : "");
    const {
        avaliarLeituraDocumentalComCadastro,
        executarLeituraDocumentalLocal,
        montarRetornoLeituraParaPersistencia,
    } = await carregarModuloOcrDocumental();
    const leituraDocumental = await executarLeituraDocumentalLocal({
        arquivo: arquivoValidoParaHash,
        arquivoNome: metadadosArquivo.arquivoNome,
        mimeType: metadadosArquivo.mimeType,
    });
    const retornoLeituraDocumental = montarRetornoLeituraParaPersistencia(leituraDocumental);

    const indiciosArquivo = filtrarIndiciosArquivoSemArquivoLocal({
        arquivo: arquivoValidoParaHash,
        documento: documentoNormalizado,
        indicios: avaliarArquivoBasicoVerificacao({
            arquivo: arquivoValidoParaHash,
            arquivoNome: metadadosArquivo.arquivoNome,
            mimeType: metadadosArquivo.mimeType,
            tamanhoBytes: metadadosArquivo.tamanhoBytes,
            arquivoUrl: metadadosArquivo.arquivoUrl,
        }),
    });

    const indicios = [
        ...indiciosArquivo,
        ...avaliarDatasCertificadoVerificacao({
            dataRealizacao: certificado.data_realizacao || certificado.dataRealizacao,
            dataVencimento: certificado.data_vencimento || certificado.dataVencimento,
            exigeVencimento,
        }),
        ...avaliarLeituraDocumentalComCadastro({
            leitura: leituraDocumental,
            dataRealizacao: certificado.data_realizacao || certificado.dataRealizacao,
            dataVencimento: certificado.data_vencimento || certificado.dataVencimento,
            origemTipo: DOCUMENTOS_VERIFICACAO_ORIGENS.CERTIFICADO,
        }),
        ...avaliarLeituraDataCertificado({
            leitura: leituraDocumental,
            arquivo: arquivoValidoParaHash,
            exigeVencimento,
        }),
        ...avaliarCadastroCertificado({
            certificado,
            colaborador,
            treinamento,
        }),
        ...avaliarObservacaoVerificacao(certificado.observacao),
        ...avaliarDuplicidadeVerificacao({
            hashArquivo,
            arquivoNome: metadadosArquivo.arquivoNome,
            tamanhoBytes: metadadosArquivo.tamanhoBytes,
            registrosExistentes,
            documentoIdAtual: certificado.id || null,
        }),
    ];

    const resultadoBase = montarResultadoVerificacaoBase({ indicios });
    const resultado = aplicarRevisaoManualQuandoDataNaoConfirmada(resultadoBase, indicios);
    const tipoCertificado = obterTipoCertificado(certificado, treinamento);

    return {
        origem_tipo: DOCUMENTOS_VERIFICACAO_ORIGENS.CERTIFICADO,
        origem_tabela: DOCUMENTOS_VERIFICACAO_TABELAS.CERTIFICADOS,
        documento_id: valorUuidOuNullVerificacao(certificado.id),
        empresa_id: valorUuidOuNullVerificacao(colaborador.empresaId || colaborador.empresa_id || certificado.empresa_id || null),
        colaborador_id: valorUuidOuNullVerificacao(obterColaboradorIdCertificado(certificado, colaborador)),
        treinamento_id: obterTreinamentoIdUuidCertificado(certificado, treinamento),
        tipo_documento: tipoCertificado,
        nome_documento: tipoCertificado,
        arquivo_nome: metadadosArquivo.arquivoNome,
        arquivo_url: metadadosArquivo.arquivoUrl,
        bucket: metadadosArquivo.bucket,
        caminho_storage: metadadosArquivo.caminhoStorage,
        mime_type: metadadosArquivo.mimeType,
        tamanho_bytes: metadadosArquivo.tamanhoBytes,
        hash_arquivo: hashArquivo || null,
        data_emissao: null,
        data_realizacao: formatarDataIsoVerificacao(certificado.data_realizacao || certificado.dataRealizacao),
        data_vencimento: formatarDataIsoVerificacao(certificado.data_vencimento || certificado.dataVencimento),
        origem_analise: leituraDocumental?.executado || leituraDocumental?.datasEncontradas?.length
            ? DOCUMENTOS_VERIFICACAO_ORIGEM_ANALISE.OCR_LOCAL
            : DOCUMENTOS_VERIFICACAO_ORIGEM_ANALISE.REGRAS_LOCAIS,
        retorno_ia: retornoLeituraDocumental ? { leitura_documental_local: retornoLeituraDocumental } : null,
        ocr_texto: leituraDocumental?.textoExtraido || null,
        analisado_por_ia: false,
        ...resultado,
    };
}

export async function salvarVerificacaoDocumental({
    supabase,
    verificacao,
    usuario = null,
} = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para salvar verificação documental.");
    }

    if (!verificacao?.origem_tipo || !verificacao?.origem_tabela) {
        throw new Error("Dados de origem da verificação documental não informados.");
    }

    const payload = filtrarPayloadSupabaseVerificacao({
        origem_tipo: verificacao.origem_tipo,
        origem_tabela: verificacao.origem_tabela,
        documento_id: valorUuidOuNullVerificacao(verificacao.documento_id),
        empresa_id: valorUuidOuNullVerificacao(verificacao.empresa_id),
        colaborador_id: valorUuidOuNullVerificacao(verificacao.colaborador_id),
        treinamento_id: valorUuidOuNullVerificacao(verificacao.treinamento_id),
        tipo_documento: limparTextoVerificacao(verificacao.tipo_documento),
        nome_documento: limparTextoVerificacao(verificacao.nome_documento),
        arquivo_nome: limparTextoVerificacao(verificacao.arquivo_nome),
        arquivo_url: limparTextoVerificacao(verificacao.arquivo_url),
        bucket: limparTextoVerificacao(verificacao.bucket),
        caminho_storage: limparTextoVerificacao(verificacao.caminho_storage),
        mime_type: limparTextoVerificacao(verificacao.mime_type),
        tamanho_bytes: verificacao.tamanho_bytes ?? null,
        hash_arquivo: limparTextoVerificacao(verificacao.hash_arquivo),
        data_emissao: verificacao.data_emissao || null,
        data_realizacao: verificacao.data_realizacao || null,
        data_vencimento: verificacao.data_vencimento || null,
        data_referencia: verificacao.data_referencia || new Date().toISOString().slice(0, 10),
        status_verificacao: verificacao.status_verificacao,
        nivel_risco: verificacao.nivel_risco,
        score_risco: Number(verificacao.score_risco || 0),
        indicios: Array.isArray(verificacao.indicios) ? verificacao.indicios : [],
        recomendacoes: Array.isArray(verificacao.recomendacoes) ? verificacao.recomendacoes : [],
        resumo: limparTextoVerificacao(verificacao.resumo),
        observacao_manual: limparTextoVerificacao(verificacao.observacao_manual),
        origem_analise: verificacao.origem_analise || DOCUMENTOS_VERIFICACAO_ORIGEM_ANALISE.REGRAS_LOCAIS,
        modelo_ia: verificacao.modelo_ia || null,
        retorno_ia: verificacao.retorno_ia || null,
        ocr_texto: verificacao.ocr_texto || null,
        analisado_por_ia: Boolean(verificacao.analisado_por_ia),
        verificado_por: valorUuidOuNullVerificacao(usuario?.id || verificacao.verificado_por),
        verificado_por_email: limparTextoVerificacao(usuario?.email || verificacao.verificado_por_email),
    });

    const { data, error } = await supabase
        .from("verificacoes_documentais")
        .insert(payload)
        .select("*")
        .single();

    if (error) {
        throw new Error(`Erro ao salvar verificação documental: ${error.message}`);
    }

    return normalizarVerificacaoDocumental(data);
}

export async function verificarDocumentoEmpresa({
    supabase = null,
    documento = {},
    empresa = {},
    arquivo = null,
    registrosExistentes = [],
    usuario = null,
    salvarResultado = false,
} = {}) {
    const verificacao = await analisarDocumentoEmpresaLocal({
        documento,
        empresa,
        arquivo,
        registrosExistentes,
    });

    if (!salvarResultado) {
        return normalizarVerificacaoDocumental(verificacao);
    }

    return salvarVerificacaoDocumental({
        supabase,
        verificacao,
        usuario,
    });
}

export async function verificarCertificadoTreinamento({
    supabase = null,
    certificado = {},
    colaborador = {},
    treinamento = {},
    arquivo = null,
    registrosExistentes = [],
    usuario = null,
    salvarResultado = false,
    exigeVencimento = true,
} = {}) {
    const verificacao = await analisarCertificadoLocal({
        certificado,
        colaborador,
        treinamento,
        arquivo,
        registrosExistentes,
        exigeVencimento,
    });

    if (!salvarResultado) {
        return normalizarVerificacaoDocumental(verificacao);
    }

    return salvarVerificacaoDocumental({
        supabase,
        verificacao,
        usuario,
    });
}

export async function listarVerificacoesDocumentais({
    supabase,
    origemTipo = "",
    origemTabela = "",
    documentoId = "",
    empresaId = "",
    colaboradorId = "",
    limite = 100,
} = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para listar verificações documentais.");
    }

    let consulta = supabase
        .from("verificacoes_documentais")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limite);

    if (origemTipo) {
        consulta = consulta.eq("origem_tipo", origemTipo);
    }

    if (origemTabela) {
        consulta = consulta.eq("origem_tabela", origemTabela);
    }

    if (documentoId) {
        consulta = consulta.eq("documento_id", documentoId);
    }

    if (empresaId) {
        consulta = consulta.eq("empresa_id", empresaId);
    }

    if (colaboradorId) {
        consulta = consulta.eq("colaborador_id", colaboradorId);
    }

    const { data, error } = await consulta;

    if (error) {
        throw new Error(`Erro ao listar verificações documentais: ${error.message}`);
    }

    return (data || []).map(normalizarVerificacaoDocumental);
}

export async function obterUltimaVerificacaoDocumental({
    supabase,
    origemTipo,
    origemTabela,
    documentoId,
} = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para obter verificação documental.");
    }

    if (!origemTipo || !origemTabela || !documentoId) {
        return null;
    }

    const { data, error } = await supabase
        .from("verificacoes_documentais")
        .select("*")
        .eq("origem_tipo", origemTipo)
        .eq("origem_tabela", origemTabela)
        .eq("documento_id", documentoId)
        .order("created_at", { ascending: false })
        .limit(1);

    if (error) {
        throw new Error(`Erro ao obter última verificação documental: ${error.message}`);
    }

    return data?.[0] ? normalizarVerificacaoDocumental(data[0]) : null;
}
