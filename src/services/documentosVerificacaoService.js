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

function normalizarTextoConferencia(valor = "") {
    return normalizarTextoVerificacao(valor)
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function apenasDigitosConferencia(valor = "") {
    return String(valor || "").replace(/\D/g, "");
}

function obterTextoLeituraConferencia(leitura = {}) {
    const campos = obterCamposLeituraConferencia(leitura);
    const linhas = obterLinhasOcrConferencia(leitura)
        .map((linha) => linha?.texto || "")
        .filter(Boolean)
        .join(" ");

    return limparTextoVerificacao([
        leitura?.textoExtraido,
        leitura?.texto_extraido,
        leitura?.textoPrevia,
        leitura?.texto_previa,
        campos?.texto_ocr || "",
        linhas,
    ].filter(Boolean).join(" "));
}

function obterTextoLeituraConferenciaComArquivo(leitura = {}, metadadosArquivo = {}) {
    return limparTextoVerificacao([
        obterTextoLeituraConferencia(leitura),
        metadadosArquivo?.arquivoNome,
    ].filter(Boolean).join(" "));
}

function obterCamposLeituraConferencia(leitura = {}) {
    return leitura?.camposExtraidos || leitura?.campos_extraidos || {};
}

function obterLinhasOcrConferencia(leitura = {}) {
    const campos = obterCamposLeituraConferencia(leitura);
    const linhas = leitura?.linhasOcr || leitura?.linhas_ocr || campos?.linhas_ocr || [];

    return Array.isArray(linhas) ? linhas : [];
}

function tokensNomeConferencia(nome = "") {
    return normalizarTextoConferencia(nome)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3 && !["dos", "das", "de", "da", "do", "e"].includes(token));
}

function pontuarNomePessoaNoTexto({ texto = "", nome = "" } = {}) {
    const tokens = tokensNomeConferencia(nome);
    const base = normalizarTextoConferencia(texto);

    if (!tokens.length || !base) {
        return {
            encontrado: false,
            proporcao: 0,
            totalTokens: tokens.length,
            tokensEncontrados: [],
            score: 0,
        };
    }

    const tokensEncontrados = tokens.filter((token) => base.includes(token));
    const primeiro = tokens[0];
    const ultimo = tokens[tokens.length - 1];
    const contemPrimeiro = base.includes(primeiro);
    const contemUltimo = base.includes(ultimo);
    const contemPontas = tokens.length <= 1 || (contemPrimeiro && contemUltimo);
    const proporcao = tokensEncontrados.length / tokens.length;
    const score = (proporcao * 100) + (contemPrimeiro ? 10 : 0) + (contemUltimo ? 10 : 0);
    const encontrado = (
        (proporcao >= 0.70 && (contemPontas || tokensEncontrados.length >= Math.min(3, tokens.length))) ||
        (tokensEncontrados.length >= 3 && contemPrimeiro) ||
        (tokensEncontrados.length >= 2 && contemPrimeiro && contemUltimo)
    );

    return {
        encontrado,
        proporcao,
        totalTokens: tokens.length,
        tokensEncontrados,
        score,
    };
}

function textoContemNomePessoa({ texto = "", nome = "" } = {}) {
    return pontuarNomePessoaNoTexto({ texto, nome }).encontrado;
}

function combinarLinhasOcrParaBusca(linhas = []) {
    const registros = Array.isArray(linhas) ? linhas : [];
    const combinadas = [];

    registros.forEach((linha, indice) => {
        if (!linha?.texto) return;

        combinadas.push({ ...linha, origem_linha: "ocr_linha" });

        for (let tamanho = 2; tamanho <= 3; tamanho += 1) {
            const grupo = registros.slice(indice, indice + tamanho).filter((item) => item?.texto);

            if (grupo.length !== tamanho) continue;

            const distancia = Math.abs(Number(grupo[grupo.length - 1]?.yCentro || 0) - Number(grupo[0]?.yCentro || 0));

            if (distancia > 0.085) continue;

            const assinaturaLinha = grupo.find((item) => item?.assinatura_visual || item?.assinaturaVisual) || grupo[grupo.length - 1] || grupo[0];

            combinadas.push({
                indice: grupo.map((item) => item.indice).join("+"),
                texto: limparTextoVerificacao(grupo.map((item) => item.texto).join(" ")),
                texto_normalizado: normalizarTextoConferencia(grupo.map((item) => item.texto).join(" ")),
                x0: Math.min(...grupo.map((item) => Number(item.x0 || 0))),
                x1: Math.max(...grupo.map((item) => Number(item.x1 || 0))),
                y0: Math.min(...grupo.map((item) => Number(item.y0 || item.yCentro || 0))),
                y1: Math.max(...grupo.map((item) => Number(item.y1 || item.yCentro || 0))),
                yCentro: grupo.reduce((total, item) => total + Number(item.yCentro || 0), 0) / grupo.length,
                assinatura_visual: Boolean(assinaturaLinha?.assinatura_visual || assinaturaLinha?.assinaturaVisual),
                assinatura_densidade: Math.max(...grupo.map((item) => Number(item.assinatura_densidade || 0))),
                assinatura_densidade_azul: Math.max(...grupo.map((item) => Number(item.assinatura_densidade_azul || 0))),
                assinatura_espalhamento_horizontal: Math.max(...grupo.map((item) => Number(item.assinatura_espalhamento_horizontal || 0))),
                assinatura_espalhamento_vertical: Math.max(...grupo.map((item) => Number(item.assinatura_espalhamento_vertical || 0))),
                assinatura_origem: assinaturaLinha?.assinatura_origem || "ocr_linhas_combinadas",
                origem_linha: "ocr_linhas_combinadas",
            });
        }
    });

    return combinadas;
}

function assinaturaProvavelPorLinhaVizinha({ linhas = [], linhaReferencia = null } = {}) {
    if (!linhaReferencia || !Array.isArray(linhas) || !linhas.length) return null;

    const yReferencia = Number(linhaReferencia.yCentro || 0);

    if (!Number.isFinite(yReferencia) || yReferencia <= 0) return null;

    const vizinhas = linhas
        .map((linha) => ({
            linha,
            distancia: Math.abs(Number(linha?.yCentro || 0) - yReferencia),
        }))
        .filter((item) => item.distancia <= 0.042)
        .sort((a, b) => a.distancia - b.distancia);

    const comAssinatura = vizinhas.find((item) => Boolean(item.linha?.assinatura_visual || item.linha?.assinaturaVisual));

    if (!comAssinatura) return null;

    return {
        assinatura_visual: true,
        assinatura_densidade: comAssinatura.linha.assinatura_densidade ?? null,
        assinatura_densidade_azul: comAssinatura.linha.assinatura_densidade_azul ?? null,
        assinatura_espalhamento_horizontal: comAssinatura.linha.assinatura_espalhamento_horizontal ?? null,
        assinatura_espalhamento_vertical: comAssinatura.linha.assinatura_espalhamento_vertical ?? null,
        assinatura_origem: "linha_vizinha_mesma_faixa_tabela",
    };
}

function localizarLinhaColaboradorOcr({ leitura = {}, nomeColaborador = "" } = {}) {
    const linhasOriginais = obterLinhasOcrConferencia(leitura);
    const linhas = combinarLinhasOcrParaBusca(linhasOriginais);
    const tokensNome = tokensNomeConferencia(nomeColaborador);

    if (!linhas.length || !tokensNome.length) return null;

    const candidatas = linhas
        .map((linha) => {
            const pontuacao = pontuarNomePessoaNoTexto({ texto: linha?.texto || "", nome: nomeColaborador });
            const yCentro = Number(linha?.yCentro || 0);
            const bonusTabela = yCentro > 0.52 ? 18 : 0;
            const penalidadeCabecalho = yCentro && yCentro < 0.25 ? 20 : 0;
            const bonusAssinatura = linha?.assinatura_visual || linha?.assinaturaVisual ? 8 : 0;
            return {
                linha,
                ...pontuacao,
                scoreFinal: pontuacao.score + bonusTabela + bonusAssinatura - penalidadeCabecalho,
            };
        })
        .filter((item) => item.tokensEncontrados.length > 0)
        .sort((a, b) => b.scoreFinal - a.scoreFinal || b.tokensEncontrados.length - a.tokensEncontrados.length);

    const melhor = candidatas[0];

    if (!melhor) return null;

    const aceito = (
        melhor.encontrado ||
        melhor.tokensEncontrados.length >= Math.min(3, tokensNome.length) ||
        (melhor.tokensEncontrados.length >= 2 && melhor.tokensEncontrados.includes(tokensNome[0])) ||
        (melhor.scoreFinal >= 78 && melhor.tokensEncontrados.length >= 2)
    );

    if (!aceito) return null;

    const assinaturaVizinha = assinaturaProvavelPorLinhaVizinha({
        linhas: linhasOriginais,
        linhaReferencia: melhor.linha,
    });

    return {
        ...melhor.linha,
        ...(assinaturaVizinha || {}),
        nome_score: Number(melhor.scoreFinal.toFixed(2)),
        nome_tokens_encontrados: melhor.tokensEncontrados,
    };
}

function documentoPareceListaPresenca({ texto = "", leitura = {} } = {}) {
    const base = normalizarTextoConferencia(texto);
    const linhas = obterLinhasOcrConferencia(leitura);

    return Boolean(
        base.includes("nome do colaborador") ||
        base.includes("colaborador") && base.includes("assinatura") ||
        base.includes("lista") && base.includes("assinatura") ||
        base.includes("declaro ter participado") ||
        linhas.some((linha) => Number(linha?.yCentro || 0) > 0.55 && normalizarTextoConferencia(linha?.texto || "").split(" ").length >= 2)
    );
}

function obterNomeColaboradorAnalise(colaborador = {}, certificado = {}) {
    return limparTextoVerificacao(
        colaborador?.nome ||
        colaborador?.nomeCompleto ||
        colaborador?.nome_completo ||
        certificado?.colaborador_nome ||
        certificado?.colaboradorNome ||
        certificado?.colaborador?.nome ||
        ""
    );
}

function obterCpfColaboradorAnalise(colaborador = {}, certificado = {}) {
    return apenasDigitosConferencia(
        colaborador?.cpf ||
        colaborador?.documento ||
        colaborador?.cpf_colaborador ||
        certificado?.cpf ||
        certificado?.colaborador_cpf ||
        certificado?.colaborador?.cpf ||
        ""
    );
}

function obterEmpresaColaboradorAnalise(colaborador = {}, certificado = {}) {
    return limparTextoVerificacao(
        colaborador?.empresaExibicao ||
        colaborador?.empresa_exibicao ||
        colaborador?.empresaNome ||
        colaborador?.empresa_nome ||
        colaborador?.empresa ||
        colaborador?.empresas?.nome ||
        certificado?.empresa_nome ||
        certificado?.empresaNome ||
        certificado?.colaborador?.empresa ||
        certificado?.colaborador?.empresaExibicao ||
        ""
    );
}

function obterCnpjEmpresaAnalise(colaborador = {}, certificado = {}) {
    return apenasDigitosConferencia(
        colaborador?.empresaCnpj ||
        colaborador?.empresa_cnpj ||
        colaborador?.cnpj ||
        colaborador?.empresas?.cnpj ||
        colaborador?.empresas?.documento ||
        certificado?.empresa_cnpj ||
        certificado?.empresaCnpj ||
        certificado?.cnpj ||
        ""
    );
}

function documentoContemCnpj(texto = "", cnpj = "") {
    const alvo = apenasDigitosConferencia(cnpj);
    if (!alvo || alvo.length !== 14) return null;

    const documento = apenasDigitosConferencia(texto);
    if (!documento) return false;

    return documento.includes(alvo);
}

function documentoContemCpf(texto = "", cpf = "") {
    const alvo = apenasDigitosConferencia(cpf);
    if (!alvo || alvo.length !== 11) return null;

    const documento = apenasDigitosConferencia(texto);
    if (!documento) return false;

    return documento.includes(alvo);
}

function documentoContemTreinamento({ texto = "", treinamento = {}, certificado = {} } = {}) {
    const base = normalizarTextoConferencia(`${texto} ${certificado?.arquivo_nome || certificado?.arquivoNome || ""}`);
    const nome = normalizarTextoConferencia(treinamento?.nome || certificado?.nome_treinamento || certificado?.tipo_treinamento || "");
    const id = Number(certificado?.treinamento_codigo || certificado?.treinamentoId || treinamento?.id || 0);

    if (!base || (!nome && !id)) return null;

    if (id === 11 && (/\bnr\s*11\b/.test(base) || base.includes("transporte movimentacao") || base.includes("movimentacao armazenagem") || base.includes("manuseio de materiais"))) {
        return true;
    }

    const tokens = nome.split(" ").filter((token) => token.length >= 3 && !["documento", "treinamento", "funcao", "função"].includes(token));
    if (!tokens.length) return null;

    const encontrados = tokens.filter((token) => base.includes(token));
    return encontrados.length / tokens.length >= 0.45;
}

function montarConferenciaDocumentalCertificado({ leitura = {}, certificado = {}, colaborador = {}, treinamento = {}, metadadosArquivo = {} } = {}) {
    const textoDocumento = obterTextoLeituraConferencia(leitura);
    const textoComArquivo = obterTextoLeituraConferenciaComArquivo(leitura, metadadosArquivo);
    const nomeColaborador = obterNomeColaboradorAnalise(colaborador, certificado);
    const cpfColaborador = obterCpfColaboradorAnalise(colaborador, certificado);
    const empresaColaborador = obterEmpresaColaboradorAnalise(colaborador, certificado);
    const cnpjEmpresa = obterCnpjEmpresaAnalise(colaborador, certificado);
    const campos = obterCamposLeituraConferencia(leitura);
    const linhaColaborador = localizarLinhaColaboradorOcr({ leitura, nomeColaborador });
    const listaPresenca = documentoPareceListaPresenca({ texto: textoDocumento, leitura });
    const nomeEncontrado = nomeColaborador ? Boolean(textoContemNomePessoa({ texto: textoDocumento, nome: nomeColaborador }) || linhaColaborador) : null;
    const cpfEncontrado = documentoContemCpf(textoDocumento, cpfColaborador);
    const cnpjEncontrado = documentoContemCnpj(textoDocumento, cnpjEmpresa);
    const empresaEncontrada = empresaColaborador ? textoContemNomePessoa({ texto: textoDocumento, nome: empresaColaborador }) || normalizarTextoConferencia(textoDocumento).includes(normalizarTextoConferencia("Ribeiro Aquino")) && normalizarTextoConferencia(empresaColaborador).includes("ribeiro") : null;
    const treinamentoEncontrado = documentoContemTreinamento({ texto: textoComArquivo, treinamento, certificado });
    const assinaturaDensidade = linhaColaborador?.assinatura_densidade ?? null;
    const assinaturaDensidadeAzul = linhaColaborador?.assinatura_densidade_azul ?? null;
    const assinaturaEspalhamentoHorizontal = linhaColaborador?.assinatura_espalhamento_horizontal ?? null;
    const assinaturaEspalhamentoVertical = linhaColaborador?.assinatura_espalhamento_vertical ?? null;
    const assinaturaVisual = linhaColaborador
        ? Boolean(
            linhaColaborador.assinatura_visual ||
            linhaColaborador.assinaturaVisual ||
            Number(assinaturaDensidadeAzul || 0) > 0.0007 ||
            (Number(assinaturaDensidade || 0) > 0.0032 && Number(assinaturaEspalhamentoHorizontal || 0) > 0.025)
        )
        : null;
    const assinaturaAplicavel = Boolean(listaPresenca && nomeEncontrado);

    return {
        executado: Boolean(leitura?.executado || texto || obterLinhasOcrConferencia(leitura).length),
        tipoLeitura: leitura?.tipoLeitura || leitura?.tipo_leitura || "não informado",
        listaPresenca,
        colaborador: {
            nomeCadastro: nomeColaborador,
            encontrado: nomeEncontrado,
            linhaOcr: linhaColaborador?.texto || "",
            linhaIndice: linhaColaborador?.indice ?? null,
            scoreLinha: linhaColaborador?.nome_score ?? null,
            tokensEncontrados: linhaColaborador?.nome_tokens_encontrados || [],
        },
        cpf: {
            informadoCadastro: Boolean(cpfColaborador),
            encontrado: cpfEncontrado,
        },
        empresa: {
            nomeCadastro: empresaColaborador,
            encontrada: empresaEncontrada,
            nomeExtraido: campos?.empresa_nome || "",
        },
        cnpj: {
            informadoCadastro: Boolean(cnpjEmpresa),
            encontrado: cnpjEncontrado,
            cnpjExtraido: campos?.cnpj || "",
        },
        treinamento: {
            nomeCadastro: treinamento?.nome || certificado?.nome_treinamento || certificado?.tipo_treinamento || "",
            encontrado: treinamentoEncontrado,
        },
        assinatura: {
            aplicavel: assinaturaAplicavel,
            visualLocalizada: assinaturaVisual,
            densidade: assinaturaDensidade,
            densidadeAzul: assinaturaDensidadeAzul,
            espalhamentoHorizontal: assinaturaEspalhamentoHorizontal,
            espalhamentoVertical: assinaturaEspalhamentoVertical,
            origem: linhaColaborador?.assinatura_origem || linhaColaborador?.assinaturaOrigem || "ocr_linha_tabela",
            observacao: assinaturaVisual === true
                ? "Assinatura visual localizada na mesma faixa da linha do colaborador."
                : assinaturaVisual === false
                    ? "Colaborador localizado, mas a assinatura não foi confirmada visualmente na linha. Conferir a coluna de assinatura."
                    : assinaturaAplicavel
                        ? "Colaborador localizado, mas a posição da linha não foi suficiente para avaliar assinatura automaticamente."
                        : "Assinatura não aplicável porque o colaborador não foi localizado na lista ou o documento não foi classificado como lista.",
        },
    };
}

function avaliarConferenciaDocumentalCertificado({ conferencia = {}, leitura = {}, arquivo = null } = {}) {
    const indicios = [];
    const textoDisponivel = Boolean(obterTextoLeituraConferencia(leitura).trim() || obterLinhasOcrConferencia(leitura).length);

    if (!arquivoPossuiArrayBufferVerificacao(arquivo) || !textoDisponivel) {
        return indicios;
    }

    if (conferencia?.colaborador?.nomeCadastro && conferencia?.colaborador?.encontrado === false) {
        indicios.push(criarIndicioVerificacao({
            codigo: "colaborador_nao_localizado_no_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Colaborador não localizado no documento",
            detalhe: `A leitura local/OCR não encontrou o nome ${conferencia.colaborador.nomeCadastro} no certificado ou lista de presença.`,
            peso: 75,
            bloqueia: true,
            recomendacao: "Conferir se o arquivo foi vinculado ao colaborador correto. Se o nome realmente não constar na lista, substituir o documento.",
            dados: conferencia.colaborador,
        }));
    }

    if (conferencia?.listaPresenca && conferencia?.colaborador?.encontrado && conferencia?.assinatura?.visualLocalizada === false) {
        indicios.push(criarIndicioVerificacao({
            codigo: "assinatura_colaborador_nao_confirmada_lista",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Assinatura do colaborador não confirmada na lista",
            detalhe: "O colaborador foi localizado na lista, porém a leitura visual não confirmou assinatura na mesma linha.",
            peso: 35,
            bloqueia: false,
            recomendacao: "Conferir visualmente a linha do colaborador antes de aprovar o treinamento.",
            dados: conferencia.assinatura,
        }));
    }

    if (conferencia?.cpf?.informadoCadastro && conferencia?.cpf?.encontrado === false) {
        indicios.push(criarIndicioVerificacao({
            codigo: "cpf_colaborador_nao_localizado_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "CPF do colaborador não localizado no documento",
            detalhe: "O cadastro possui CPF, mas a leitura local não encontrou esse CPF no arquivo. Em listas de presença isso pode ser normal.",
            peso: conferencia?.listaPresenca ? 10 : 30,
            bloqueia: false,
            recomendacao: "Quando o documento possuir campo de CPF, conferir se pertence ao colaborador correto.",
            dados: conferencia.cpf,
        }));
    }

    if (conferencia?.cnpj?.informadoCadastro && conferencia?.cnpj?.encontrado === false && conferencia?.cnpj?.cnpjExtraido) {
        indicios.push(criarIndicioVerificacao({
            codigo: "cnpj_empresa_nao_confere_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "CNPJ da empresa não confere com o documento",
            detalhe: "O documento possui CNPJ extraído, mas ele não corresponde ao CNPJ vinculado ao colaborador/empresa.",
            peso: 70,
            bloqueia: true,
            recomendacao: "Conferir se o documento pertence à empresa correta antes de aprovar.",
            dados: conferencia.cnpj,
        }));
    }

    if (conferencia?.empresa?.nomeCadastro && conferencia?.empresa?.encontrada === false && !conferencia?.cnpj?.cnpjExtraido) {
        indicios.push(criarIndicioVerificacao({
            codigo: "empresa_nao_confirmada_no_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Empresa não confirmada no documento",
            detalhe: `A leitura local não confirmou a empresa ${conferencia.empresa.nomeCadastro} no documento.`,
            peso: 25,
            bloqueia: false,
            recomendacao: "Conferir visualmente se o treinamento pertence à empresa correta.",
            dados: conferencia.empresa,
        }));
    }

    if (conferencia?.treinamento?.nomeCadastro && conferencia?.treinamento?.encontrado === false) {
        indicios.push(criarIndicioVerificacao({
            codigo: "treinamento_nao_confirmado_no_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Treinamento não confirmado no texto do documento",
            detalhe: `A leitura local não confirmou ${conferencia.treinamento.nomeCadastro} no arquivo.`,
            peso: 35,
            bloqueia: false,
            recomendacao: "Conferir manualmente se o arquivo corresponde ao treinamento selecionado.",
            dados: conferencia.treinamento,
        }));
    }

    return indicios;
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
    const conferenciaDocumental = montarConferenciaDocumentalCertificado({
        leitura: leituraDocumental,
        certificado,
        colaborador,
        treinamento,
        metadadosArquivo,
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
        ...avaliarConferenciaDocumentalCertificado({
            conferencia: conferenciaDocumental,
            leitura: leituraDocumental,
            arquivo: arquivoValidoParaHash,
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
        retorno_ia: retornoLeituraDocumental ? {
            leitura_documental_local: retornoLeituraDocumental,
            conferencia_documental: conferenciaDocumental,
        } : null,
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
