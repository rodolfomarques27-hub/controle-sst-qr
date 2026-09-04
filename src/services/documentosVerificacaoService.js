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
import {
    analisarColaboradorDocumentoColetivoEtapa4,
    classificarTipoDocumentoTreinamentoEtapa2,
} from "./classificadorDocumentoTreinamentoService";
import { compararFuncaoAsoComCadastro } from "./asoFuncaoService";
import { obterTodasMatrizesFuncao } from "./colaboradorDocumentosService";

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
            titulo: "Empresa nÃƒÂ£o identificada",
            detalhe: "NÃƒÂ£o foi possÃƒÂ­vel identificar a empresa vinculada ao documento.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.EMPRESA_NAO_IDENTIFICADA,
            recomendacao: "Vincular o documento a uma empresa cadastrada.",
        }));
    }

    if (empresaIdDocumento && empresaId && String(empresaIdDocumento) !== String(empresaId)) {
        indicios.push(criarIndicioVerificacao({
            codigo: "divergencia_empresa_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "DivergÃƒÂªncia de empresa vinculada",
            detalhe: "O documento estÃƒÂ¡ vinculado a uma empresa diferente da empresa informada para anÃƒÂ¡lise.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DIVERGENCIA_EMPRESA,
            recomendacao: "Conferir se o documento pertence ÃƒÂ  empresa correta.",
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
            titulo: "Colaborador nÃƒÂ£o identificado",
            detalhe: "O certificado nÃƒÂ£o possui colaborador vÃƒÂ¡lido vinculado.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.COLABORADOR_NAO_IDENTIFICADO,
            bloqueia: true,
            recomendacao: "Vincular o certificado ao colaborador correto antes da liberaÃƒÂ§ÃƒÂ£o.",
        }));
    }

    if (!tipoCertificado && !nomeTreinamento) {
        indicios.push(criarIndicioVerificacao({
            codigo: "treinamento_nao_identificado",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "Treinamento/documento nÃƒÂ£o identificado",
            detalhe: "O certificado nÃƒÂ£o possui treinamento ou documento vinculado.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.TREINAMENTO_NAO_IDENTIFICADO,
            recomendacao: "Selecionar o treinamento/documento correto.",
        }));
    }

    if (tipoCertificado && nomeTreinamento && tipoCertificado !== nomeTreinamento) {
        indicios.push(criarIndicioVerificacao({
            codigo: "divergencia_treinamento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "DivergÃƒÂªncia no nome do treinamento",
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
        titulo: "Data impressa nÃƒÂ£o confirmada automaticamente",
        detalhe: "A leitura local nÃƒÂ£o conseguiu confirmar a data impressa do certificado/ASO. O arquivo pode ser imagem escaneada, nÃƒÂ£o possuir camada de texto ou exigir OCR real de imagem.",
        peso: 45,
        bloqueia: false,
        recomendacao: "Conferir manualmente a data no PDF/imagem antes de considerar o documento aprovado.",
        dados: {
            tipoLeitura: leitura?.tipoLeitura || leitura?.tipo_leitura || "nÃƒÂ£o identificado",
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
        "A data impressa nÃƒÂ£o foi confirmada pela leitura local; manter em revisÃƒÂ£o manual atÃƒÂ© conferÃƒÂªncia visual.",
    ].filter(Boolean).join(" ").trim();

    return proximoResultado;
}

function formatarCnpjVerificacao(valor = "") {
    const digitos = String(valor || "").replace(/\D/g, "");

    if (digitos.length !== 14) {
        return String(valor || "").trim();
    }

    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
}
function ehFichaRegistroCltEsocialVerificacao({ certificado = {}, treinamento = {}, conferencia = {} } = {}) {
    const texto = normalizarTextoConferencia([
        certificado?.tipo,
        certificado?.tipo_documento,
        certificado?.tipoDocumento,
        certificado?.nome_documento,
        certificado?.nomeDocumento,
        certificado?.categoria,
        certificado?.observacao,
        certificado?.arquivo_nome,
        certificado?.arquivoNome,
        treinamento?.nome,
        treinamento?.tipo,
        treinamento?.categoria,
        treinamento?.base,
        conferencia?.tipoDocumento,
        conferencia?.tipo_documento,
        conferencia?.tipoDocumentoDetectado,
        conferencia?.documentoTipo,
        conferencia?.documentoIdentificado,
        conferencia?.nomeDocumento,
        conferencia?.nome_documento,
        conferencia?.categoriaDocumento,
        conferencia?.tipoDocumentoEsperado,
        conferencia?.resumo,
    ].filter(Boolean).join(" "));

    return /ficha\s+(de\s+)?registro|registro\s+(de\s+)?empregado|registro\s+clt|\bclt\b|e\s*social|\besocial\b|data\s+de\s+admissao/.test(texto);
}

function indicioBloqueanteFichaRegistroNaoConfirmado(indicio = {}) {
    const codigo = String(indicio?.codigo || "").toLowerCase();

    if ([
        "data_impressa_nao_confirmada_automaticamente",
        "colaborador_localizado_por_nome_arquivo",
    ].includes(codigo)) {
        return false;
    }

    const texto = normalizarTextoConferencia([
        codigo,
        indicio?.titulo,
        indicio?.detalhe,
        indicio?.recomendacao,
    ].filter(Boolean).join(" "));

    return (
        /colaborador.*nao.*confirmad/.test(texto) ||
        /nome.*nao.*confirmad/.test(texto) ||
        /empresa.*nao.*confirmad/.test(texto) ||
        /cnpj.*(nao.*confirmad|divergent)/.test(texto) ||
        /assinatura.*nao.*confirmad/.test(texto) ||
        /documento.*(incorreto|nao.*confirmad)/.test(texto) ||
        /tipo.*documento.*nao.*confirmad/.test(texto)
    );
}

function conferenciaFichaRegistroPossuiEvidenciasFortes(conferencia = {}) {
    const texto = normalizarTextoConferencia(JSON.stringify(conferencia || {}));

    const empresaLocalizada = /empresa.*(localizad|confirmad|encontrad)/.test(texto);
    const cnpjLocalizado = /cnpj.*(localizad|confirmad|extraid|compat|encontrad)/.test(texto);
    const assinaturaLocalizada =
        /assinatura.*(localizad|confirmad|visual)/.test(texto) ||
        /assinatura_visual.*true/.test(texto) ||
        /assinaturavisual.*true/.test(texto);
    const documentoLocalizado =
        /documento.*(correto|localizad|confirmad)/.test(texto) ||
        /documentocorretoporconferencia.*true/.test(texto) ||
        /treinamento.*(localizad|confirmad)/.test(texto) ||
        /ficha.*registro/.test(texto);

    return empresaLocalizada && cnpjLocalizado && assinaturaLocalizada && documentoLocalizado;
}
function filtrarDataNaoConfirmadaFichaRegistroAprovavel({
    indicios = [],
    certificado = {},
    treinamento = {},
    conferencia = {},
} = {}) {
    if (!ehFichaRegistroCltEsocialVerificacao({ certificado, treinamento, conferencia })) {
        return indicios;
    }

    const possuiPendenciaObrigatoria = indicios.some(indicioBloqueanteFichaRegistroNaoConfirmado);

    if (possuiPendenciaObrigatoria) {
        return indicios;
    }

    const codigosTolerados = new Set(["data_impressa_nao_confirmada_automaticamente"]);

    if (conferenciaFichaRegistroPossuiEvidenciasFortes(conferencia)) {
        codigosTolerados.add("colaborador_localizado_por_nome_arquivo");
    }

    return indicios.filter(
        (indicio = {}) => !codigosTolerados.has(indicio?.codigo)
    );
}

function normalizarDataFichaEpiVerificacao(valor = "") {
    const texto = String(valor || "").trim();

    if (!texto) return "";

    const iso = texto.match(/^((?:19|20)\d{2})-(\d{2})-(\d{2})$/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

    const br = texto.match(/^([0-3]?\d)[/.-]([01]?\d)[/.-]((?:19|20)?\d{2})$/);
    if (!br) return "";

    const dia = br[1].padStart(2, "0");
    const mes = br[2].padStart(2, "0");
    let ano = br[3];

    if (ano.length === 2) {
        ano = Number(ano) >= 70 ? `19${ano}` : `20${ano}`;
    }

    const data = new Date(`${ano}-${mes}-${dia}T12:00:00`);

    if (
        Number.isNaN(data.getTime()) ||
        data.getFullYear() !== Number(ano) ||
        data.getMonth() + 1 !== Number(mes) ||
        data.getDate() !== Number(dia)
    ) {
        return "";
    }

    return `${ano}-${mes}-${dia}`;
}

function documentoFichaEpiVerificacao({ certificado = {}, treinamento = {}, conferencia = {} } = {}) {
    const base = normalizarTextoConferencia(`${treinamento?.nome || ""} ${certificado?.nome_treinamento || ""} ${certificado?.tipo_treinamento || ""} ${conferencia?.treinamento?.nomeCadastro || ""}`);

    return /nr\s*-?\s*0?6|ficha\s+(de\s+)?epi|epis\s+atualizada|controle\s+de\s+entrega\s+de\s+epi|entrega\s+de\s+epi|equipamento\s+de\s+protecao\s+individual/.test(base);
}

function obterDataFichaEpiDocumentoVerificacao({ leitura = {} } = {}) {
    const campos = leitura?.camposExtraidos || leitura?.campos_extraidos || {};

    const camposDiretos = [
        campos?.data_entrega,
        campos?.dataEntrega,
        campos?.data_entrega_br,
        campos?.dataEntregaBr,
        campos?.data_recebimento,
        campos?.dataRecebimento,
        campos?.data_recebimento_br,
        campos?.dataRecebimentoBr,
    ];

    for (const valor of camposDiretos) {
        const data = normalizarDataFichaEpiVerificacao(valor);
        if (data) return data;
    }

    const listas = [
        ...(Array.isArray(leitura?.datasRelevantesClassificadas) ? leitura.datasRelevantesClassificadas : []),
        ...(Array.isArray(leitura?.datasDocumentoConfiaveis) ? leitura.datasDocumentoConfiaveis : []),
        ...(Array.isArray(leitura?.datasEncontradas) ? leitura.datasEncontradas : []),
    ];

    const candidatas = listas
        .filter((data) => data && (data.iso || data.br))
        .filter((data) => {
            const origem = normalizarTextoConferencia(`${data.origem || ""} ${data.fonte || ""} ${data.tipoLeitura || ""} ${data.tipo_leitura || ""}`);
            return !origem.includes("nome_arquivo");
        })
        .map((data) => ({
            iso: normalizarDataFichaEpiVerificacao(data.iso || data.br),
            contexto: normalizarTextoConferencia(`${data.contexto || ""} ${data.rotulo || ""} ${data.tipo || ""}`),
        }))
        .filter((data) => data.iso);

    const preferencial = candidatas.find((data) =>
        /entrega|recebimento|devolucao|epi|equipamento|ca\b|assinatura/.test(data.contexto)
    );

    return preferencial?.iso || candidatas[0]?.iso || "";
}

function obterDataRealizacaoCertificadoVerificacao({ certificado = {}, treinamento = {}, conferencia = {}, leitura = {} } = {}) {
    const campos = leitura?.camposExtraidos || leitura?.campos_extraidos || {};
    const base = normalizarTextoConferencia(`${treinamento?.nome || ""} ${certificado?.nome_treinamento || ""} ${certificado?.tipo_treinamento || ""} ${conferencia?.treinamento?.nomeCadastro || ""}`);

    const ehFichaRegistro = /ficha\s+(de\s+)?registro|registro\s+clt|\bclt\b|esocial|e\s*social|data\s+de\s+admissao/.test(base);
    const ehFichaEpi = documentoFichaEpiVerificacao({ certificado, treinamento, conferencia });

    if (ehFichaRegistro) {
        return campos?.data_admissao ||
            campos?.dataAdmissao ||
            campos?.data_registro ||
            campos?.dataRegistro ||
            campos?.data_inicio_contrato ||
            campos?.dataInicioContrato ||
            certificado?.data_admissao ||
            certificado?.dataAdmissao ||
            certificado?.data_registro ||
            certificado?.dataRegistro ||
            "";
    }

    if (ehFichaEpi) {
        return obterDataFichaEpiDocumentoVerificacao({ leitura }) || "";
    }

    return certificado?.data_realizacao || certificado?.dataRealizacao || "";
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

function obterAssinaturasTabelaConferencia(leitura = {}) {
    const campos = obterCamposLeituraConferencia(leitura);
    const assinaturas = leitura?.assinaturasTabela || leitura?.assinaturas_tabela || campos?.assinaturas_tabela || [];

    return Array.isArray(assinaturas) ? assinaturas : [];
}

function obterAssinaturasDocumentoConferencia(leitura = {}) {
    const campos = obterCamposLeituraConferencia(leitura);
    const retornoIa = leitura?.retornoIa || leitura?.retorno_ia || {};
    const leituraLocal = retornoIa?.leitura_documental_local || {};
    const assinaturas = leitura?.assinaturasDocumento ||
        leitura?.assinaturas_documento ||
        campos?.assinaturas_documento ||
        leituraLocal?.assinaturas_documento ||
        [];

    return Array.isArray(assinaturas) ? assinaturas : [];
}

function obterAssinaturaDocumentoIndividual(leitura = {}) {
    const assinaturas = obterAssinaturasDocumentoConferencia(leitura);

    if (!assinaturas.length) return null;

    return assinaturas
        .filter((assinatura) => assinatura?.assinatura_visual || assinatura?.assinaturaVisual)
        .sort((a, b) => {
            const empregadoA = String(a?.tipo || "").includes("empregado") ? 1 : 0;
            const empregadoB = String(b?.tipo || "").includes("empregado") ? 1 : 0;
            if (empregadoA !== empregadoB) return empregadoB - empregadoA;
            return Number(b?.assinatura_densidade_azul || b?.assinaturaDensidadeAzul || 0) - Number(a?.assinatura_densidade_azul || a?.assinaturaDensidadeAzul || 0);
        })[0] || null;
}

function documentoPareceAssinaturaIndividual({ texto = "", treinamento = {}, certificado = {} } = {}) {
    const base = normalizarTextoConferencia(`${texto} ${treinamento?.nome || ""} ${certificado?.nome_treinamento || ""} ${certificado?.tipo_treinamento || ""}`);

    return /ordem de servico|ordem de serviÃƒÂ§o|assinatura do empregado|seguranca e saude do trabalho|seguranÃƒÂ§a e saÃƒÂºde do trabalho|registro de empregado|ficha de registro|data de admissao|data de admissÃƒÂ£o|controle de entrega de epi|entrega de epi|equipamento de protecao individual|equipamento de proteÃƒÂ§ÃƒÂ£o individual|declaracao de recebimento|declaraÃƒÂ§ÃƒÂ£o de recebimento|atestado de saude ocupacional|atestado de saÃƒÂºde ocupacional|aso|assinado digitalmente|icp-brasil|participante|certificado de treinamento|certificamos que|tecnico em seguranca do trabalho|tÃƒÂ©cnico em seguranÃƒÂ§a do trabalho|reg mte/.test(base);
}

function obterAssinaturaDigitalAsoConferencia({ texto = "", campos = {} } = {}) {
    const base = normalizarTextoConferencia([
        texto,
        campos?.tipo_documento,
        campos?.assinatura_data_br,
        campos?.data_encerramento_br,
        campos?.codigo_verificacao,
    ].filter(Boolean).join(" "));

    const ehAso = /\baso\b|atestado de saude ocupacional|atestado de saÃƒÂºde ocupacional/.test(base);

    if (!ehAso) {
        return {
            localizada: false,
            origem: "assinatura_digital_aso_nao_aplicavel",
            evidencia: "",
        };
    }

    const possuiAssinaturaDigital = /documento assinado digitalmente|assinado digitalmente|assinatura digital|icp brasil|icpbrasil|padrao icp|padrÃƒÂ£o icp/.test(base);
    const possuiCodigoAutenticidade = /codigo de autenticidade|cÃƒÂ³digo de autenticidade|codigo de verificacao|cÃƒÂ³digo de verificaÃƒÂ§ÃƒÂ£o|codigo de validacao|cÃƒÂ³digo de validaÃƒÂ§ÃƒÂ£o|validador|validar este documento/.test(base);
    const possuiResponsavelMedico = /medico examinador|mÃƒÂ©dico examinador|medico responsavel|mÃƒÂ©dico responsÃƒÂ¡vel|pcmso|crm\s*uf|\bcrm\b/.test(base);
    const possuiDataAssinatura = Boolean(campos?.assinatura_data || campos?.assinatura_data_br || campos?.data_encerramento || campos?.data_encerramento_br);

    const localizada = Boolean(
        (possuiAssinaturaDigital && (possuiResponsavelMedico || possuiCodigoAutenticidade || possuiDataAssinatura)) ||
        (possuiCodigoAutenticidade && possuiResponsavelMedico && possuiDataAssinatura)
    );

    if (!localizada) {
        return {
            localizada: false,
            origem: "assinatura_digital_aso_nao_confirmada",
            evidencia: "",
        };
    }

    const evidencias = [];
    if (possuiAssinaturaDigital) evidencias.push("assinatura digital/ICP-Brasil");
    if (possuiCodigoAutenticidade) evidencias.push("cÃƒÂ³digo de autenticidade/validaÃƒÂ§ÃƒÂ£o");
    if (possuiResponsavelMedico) evidencias.push("mÃƒÂ©dico/CRM/PCMSO");
    if (possuiDataAssinatura) evidencias.push("data de assinatura extraÃƒÂ­da");

    return {
        localizada: true,
        origem: "assinatura_digital_aso_icp_brasil",
        evidencia: evidencias.join(" + "),
    };
}


function textoIndicaCertificadoTreinamentoEscaneado(texto = "") {
    const base = normalizarTextoConferencia(texto);

    return /certificado de treinamento|certificamos que|conteudo programatico|conteÃƒÂºdo programÃƒÂ¡tico|carga horaria|carga horÃƒÂ¡ria|tecnico em seguranca do trabalho|tÃƒÂ©cnico em seguranÃƒÂ§a do trabalho|reg mte|sao jose dos campos|sÃƒÂ£o josÃƒÂ© dos campos/.test(base);
}

function empresaRibeiroAquinoConfirmadaPorModeloCertificado({
    nomeEmpresaNormalizado = "",
    perfilDocumental = "",
    nomeEncontrado = null,
    treinamentoEncontrado = null,
    textoDocumento = "",
    cnpjEmpresa = "",
    cnpjDocumentoEncontrado = false,
    cnpjEncontrado = null,
} = {}) {
    if (!nomeEmpresaNormalizado.includes("ribeiro")) return false;
    if (perfilDocumental !== "certificado") return false;
    if (nomeEncontrado !== true) return false;
    if (treinamentoEncontrado !== true) return false;
    if (!textoIndicaCertificadoTreinamentoEscaneado(textoDocumento)) return false;

    const cnpjDivergenteConfirmado = Boolean(cnpjEmpresa && cnpjDocumentoEncontrado && cnpjEncontrado === false);
    if (cnpjDivergenteConfirmado) return false;

    return true;
}

function textoIndicaListaPresencaRibeiroAquino(texto = "") {
    const base = normalizarTextoConferencia(texto);

    return Boolean(
        /lista de presenca|lista de presenÃƒÂ§a|dialogo de seguranca|diÃƒÂ¡logo de seguranÃƒÂ§a|tema\s+integracao|tema\s+integraÃƒÂ§ÃƒÂ£o|instrutor|carga horaria|carga horÃƒÂ¡ria|obra|cidade/.test(base)
    );
}

function empresaRibeiroAquinoConfirmadaPorModeloLista({
    nomeEmpresaNormalizado = "",
    perfilDocumental = "",
    listaPresenca = false,
    nomeEncontrado = null,
    treinamentoEncontrado = null,
    textoDocumento = "",
    cnpjEmpresa = "",
    cnpjDocumentoEncontrado = false,
    cnpjEncontrado = null,
} = {}) {
    if (!nomeEmpresaNormalizado.includes("ribeiro")) return false;
    if (!(listaPresenca || perfilDocumental === "lista_presenca")) return false;
    if (nomeEncontrado !== true) return false;
    if (treinamentoEncontrado === false) return false;
    if (!textoIndicaListaPresencaRibeiroAquino(textoDocumento)) return false;

    const cnpjDivergenteConfirmado = Boolean(cnpjEmpresa && cnpjDocumentoEncontrado && cnpjEncontrado === false);
    if (cnpjDivergenteConfirmado) return false;

    return true;
}

function assinaturaCertificadoEscaneadoProvavel({
    perfilDocumental = "",
    nomeEncontrado = null,
    treinamentoEncontrado = null,
    documentoAssinaturaIndividual = false,
    assinaturaDocumentoIndividual = null,
    textoDocumento = "",
} = {}) {
    if (perfilDocumental !== "certificado") return false;
    if (nomeEncontrado !== true) return false;
    if (treinamentoEncontrado !== true) return false;

    if (assinaturaDocumentoIndividual) return true;

    return Boolean(
        documentoAssinaturaIndividual &&
        textoIndicaCertificadoTreinamentoEscaneado(textoDocumento)
    );
}

function extrairCpfsDocumentoConferencia(texto = "") {
    const conteudo = String(texto || "");
    const formatados = Array.from(conteudo.matchAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g)).map((match) => match[0]);
    const rotulados = Array.from(conteudo.matchAll(/cpf\s*[-:]?\s*(\d{3}[.\s]?\d{3}[.\s]?\d{3}[-\s]?\d{2})/gi)).map((match) => match[1]);

    return Array.from(new Set([...formatados, ...rotulados]
        .map(apenasDigitosConferencia)
        .filter((valor) => valor.length === 11)));
}

function documentoPossuiCpfQualquer(texto = "") {
    return extrairCpfsDocumentoConferencia(texto).length > 0;
}


function extrairCnpjsDocumentoConferencia(texto = "") {
    const conteudo = String(texto || "");
    const formatados = Array.from(conteudo.matchAll(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g)).map((match) => match[0]);
    const rotulados = Array.from(conteudo.matchAll(/cnpj\s*[-:]?\s*(\d{2}[.\s]?\d{3}[.\s]?\d{3}[/\s]?\d{4}[-\s]?\d{2})/gi)).map((match) => match[1]);

    return Array.from(new Set([...formatados, ...rotulados]
        .map(apenasDigitosConferencia)
        .filter((valor) => valor.length === 14)));
}

function documentoPossuiCnpjQualquer(texto = "") {
    return extrairCnpjsDocumentoConferencia(texto).length > 0;
}

function obterPerfilDocumentalConferencia({ texto = "", treinamento = {}, certificado = {}, arquivoNome = "" } = {}) {
    const base = normalizarTextoConferencia(`${arquivoNome} ${texto} ${treinamento?.nome || ""} ${certificado?.nome_treinamento || ""} ${certificado?.tipo_treinamento || ""}`);

    if (/aso|atestado de saude ocupacional|atestado de saÃƒÂºde ocupacional/.test(base)) return "aso";
    if (/registro de empregado|ficha de registro|clt|esocial|data de admissao|data de admissÃƒÂ£o/.test(base)) return "registro";
    if (/ordem de servico|ordem de serviÃƒÂ§o|seguranca e saude do trabalho|seguranÃƒÂ§a e saÃƒÂºde do trabalho/.test(base)) return "ordem_servico";
    if (/controle de entrega de epi|ficha de epi|entrega de epi|equipamento de protecao individual|equipamento de proteÃƒÂ§ÃƒÂ£o individual|declaracao de recebimento|declaraÃƒÂ§ÃƒÂ£o de recebimento/.test(base)) return "ficha_epi";
    if (/lista de presenca|lista de presenÃƒÂ§a|nome do colaborador|nome cargo assinatura|declaro ter participado|integra[cÃƒÂ§][aÃƒÂ£]o/.test(base)) return "lista_presenca";
    if (/certificado de treinamento|certificamos que|conteudo programatico|conteÃƒÂºdo programÃƒÂ¡tico|participante/.test(base)) return "certificado";

    return "generico";
}

function escaparRegexConferencia(valor = "") {
    return String(valor || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function estimarNumeroLinhaColaboradorNoTexto({ texto = "", nomeColaborador = "" } = {}) {
    const base = normalizarTextoConferencia(texto);
    const baseCompacta = base.replace(/\s+/g, "");
    const tokens = tokensNomeConferencia(nomeColaborador);

    if (!base || tokens.length < 2) return null;

    const buscarNumeroAntes = (indice) => {
        if (!Number.isFinite(indice) || indice < 0) return null;

        const trechoAnterior = base.slice(Math.max(0, indice - 45), indice).trim();
        const numeros = Array.from(trechoAnterior.matchAll(/\b(\d{1,2})\b/g)).map((item) => Number(item[1]));
        const numero = numeros.reverse().find((valor) => Number.isInteger(valor) && valor >= 1 && valor <= 80);

        return numero || null;
    };

    const padraoCompleto = tokens.map(escaparRegexConferencia).join("\\s+");
    const regexCompletoComNumero = new RegExp(`(?:^|\\s)(\\d{1,2})\\s+${padraoCompleto}(?:\\s|$)`);
    const matchCompleto = base.match(regexCompletoComNumero);

    if (matchCompleto?.[1]) {
        const numero = Number(matchCompleto[1]);
        if (Number.isInteger(numero) && numero >= 1 && numero <= 80) return numero;
    }

    const primeiro = tokens[0];
    const segundo = tokens[1];
    const ultimo = tokens[tokens.length - 1];

    const padroesParciais = [
        [primeiro, segundo],
        [primeiro, ultimo],
    ]
        .filter((partes) => partes.every(Boolean))
        .map((partes) => partes.map(escaparRegexConferencia).join("\\s+"));

    for (const padrao of padroesParciais) {
        const regexComNumero = new RegExp(`(?:^|\\s)(\\d{1,2})\\s+${padrao}(?:\\s|$)`);
        const match = base.match(regexComNumero);

        if (match?.[1]) {
            const numero = Number(match[1]);
            if (Number.isInteger(numero) && numero >= 1 && numero <= 80) return numero;
        }

        const regexNome = new RegExp(padrao);
        const matchNome = regexNome.exec(base);
        const numeroAntes = buscarNumeroAntes(matchNome?.index ?? -1);

        if (numeroAntes) return numeroAntes;
    }

    const compactoParcial = `${primeiro || ""}${segundo || ""}`;
    const indiceCompacto = compactoParcial.length >= 6 ? baseCompacta.indexOf(compactoParcial) : -1;

    if (indiceCompacto >= 0) {
        const nomeCompactoCompleto = tokens.join("");
        const indiceBaseAproximado = nomeCompactoCompleto
            ? base.indexOf(primeiro)
            : -1;

        const numeroAntes = buscarNumeroAntes(indiceBaseAproximado);
        if (numeroAntes) return numeroAntes;
    }

    const regexCompleto = new RegExp(padraoCompleto);
    const matchNomeCompleto = regexCompleto.exec(base);

    return buscarNumeroAntes(matchNomeCompleto?.index ?? -1);
}

function montarLinhaAssinaturaTabelaConferencia(linhaTabela = {}, identificador = "") {
    if (!linhaTabela) return null;

    const numeroLinha = Number(linhaTabela?.numeroLinha || linhaTabela?.numero_linha || 0) || identificador || "";

    return {
        indice: `tabela-${numeroLinha || "aproximada"}`,
        texto: numeroLinha ? `Linha ${numeroLinha} da lista de presenÃƒÂ§a` : "Linha provÃƒÂ¡vel da lista de presenÃƒÂ§a",
        y0: linhaTabela.y0,
        y1: linhaTabela.y1,
        yCentro: linhaTabela.yCentro,
        assinatura_visual: Boolean(linhaTabela.assinatura_visual || linhaTabela.assinaturaVisual),
        assinatura_densidade: linhaTabela.assinatura_densidade ?? linhaTabela.assinaturaDensidade ?? null,
        assinatura_densidade_azul: linhaTabela.assinatura_densidade_azul ?? linhaTabela.assinaturaDensidadeAzul ?? null,
        assinatura_espalhamento_horizontal: linhaTabela.assinatura_espalhamento_horizontal ?? linhaTabela.assinaturaEspalhamentoHorizontal ?? null,
        assinatura_espalhamento_vertical: linhaTabela.assinatura_espalhamento_vertical ?? linhaTabela.assinaturaEspalhamentoVertical ?? null,
        assinatura_origem: linhaTabela.assinatura_origem || "fallback_tabela_presenca_linha_numerada",
    };
}

function assinaturaTabelaTemTracoVisual(linhaTabela = {}) {
    return Boolean(
        linhaTabela?.assinatura_visual ||
        linhaTabela?.assinaturaVisual ||
        Number(linhaTabela?.assinatura_densidade_azul || linhaTabela?.assinaturaDensidadeAzul || 0) > 0.00045 ||
        (
            Number(linhaTabela?.assinatura_densidade || linhaTabela?.assinaturaDensidade || 0) > 0.0024 &&
            Number(linhaTabela?.assinatura_espalhamento_horizontal || linhaTabela?.assinaturaEspalhamentoHorizontal || 0) > 0.018
        )
    );
}

function encontrarAssinaturaTabelaPorNumeroFlexivel(assinaturas = [], numeroLinha = null) {
    const numero = Number(numeroLinha || 0);

    if (!Number.isInteger(numero) || numero <= 0) return null;

    const candidatos = assinaturas
        .map((linha) => {
            const numeroTabela = Number(linha?.numeroLinha || linha?.numero_linha || 0);
            return {
                linha,
                numeroTabela,
                distanciaNumero: Number.isInteger(numeroTabela) ? Math.abs(numeroTabela - numero) : 999,
                possuiAssinatura: assinaturaTabelaTemTracoVisual(linha),
            };
        })
        .filter((item) => Number.isInteger(item.numeroTabela) && item.distanciaNumero <= 2)
        .sort((a, b) => {
            if (a.possuiAssinatura !== b.possuiAssinatura) return a.possuiAssinatura ? -1 : 1;
            return a.distanciaNumero - b.distanciaNumero;
        });

    return candidatos[0]?.linha || null;
}

function assinaturaProvavelPorTabela({ leitura = {}, textoDocumento = "", nomeColaborador = "", linhaReferencia = null } = {}) {
    const assinaturas = obterAssinaturasTabelaConferencia(leitura);
    if (!assinaturas.length) return null;

    const numeroLinha = estimarNumeroLinhaColaboradorNoTexto({ texto: textoDocumento, nomeColaborador });

    if (numeroLinha) {
        const linhaTabela = encontrarAssinaturaTabelaPorNumeroFlexivel(assinaturas, numeroLinha);
        const resultado = montarLinhaAssinaturaTabelaConferencia(linhaTabela, numeroLinha);

        if (resultado) {
            return {
                ...resultado,
                assinatura_visual: Boolean(resultado.assinatura_visual || assinaturaTabelaTemTracoVisual(linhaTabela)),
                nome_score: null,
                nome_tokens_encontrados: tokensNomeConferencia(nomeColaborador),
                origem_linha: Number(linhaTabela?.numeroLinha || linhaTabela?.numero_linha || 0) === Number(numeroLinha)
                    ? "tabela_presenca_linha_numerada"
                    : "tabela_presenca_linha_vizinha_numerada",
            };
        }
    }

    const yReferencia = Number(linhaReferencia?.yCentro || 0);

    if (Number.isFinite(yReferencia) && yReferencia > 0) {
        const linhasProximas = assinaturas
            .map((linha) => ({
                linha,
                distancia: Math.abs(Number(linha?.yCentro || 0) - yReferencia),
                possuiAssinatura: assinaturaTabelaTemTracoVisual(linha),
            }))
            .filter((item) => item.distancia <= 0.07)
            .sort((a, b) => {
                if (a.possuiAssinatura !== b.possuiAssinatura) return a.possuiAssinatura ? -1 : 1;
                return a.distancia - b.distancia;
            });
        const linhaMaisProxima = linhasProximas[0];
        const resultado = montarLinhaAssinaturaTabelaConferencia(linhaMaisProxima?.linha, "aproximada");

        if (resultado) {
            return {
                ...resultado,
                assinatura_visual: Boolean(resultado.assinatura_visual || assinaturaTabelaTemTracoVisual(linhaMaisProxima?.linha)),
                nome_score: linhaReferencia?.nome_score ?? null,
                nome_tokens_encontrados: linhaReferencia?.nome_tokens_encontrados || tokensNomeConferencia(nomeColaborador),
                origem_linha: "tabela_presenca_por_y_linha_ocr",
            };
        }
    }

    return null;
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
    const baseCompacta = base.replace(/\s+/g, "");

    if (!tokens.length || !base) {
        return {
            encontrado: false,
            proporcao: 0,
            totalTokens: tokens.length,
            tokensEncontrados: [],
            score: 0,
            compactoEncontrado: false,
        };
    }

    const tokensEncontrados = tokens.filter((token) =>
        base.includes(token) || baseCompacta.includes(token)
    );

    const primeiro = tokens[0];
    const segundo = tokens[1] || "";
    const ultimo = tokens[tokens.length - 1];

    const contemPrimeiro = Boolean(primeiro && (base.includes(primeiro) || baseCompacta.includes(primeiro)));
    const contemSegundo = Boolean(segundo && (base.includes(segundo) || baseCompacta.includes(segundo)));
    const contemUltimo = Boolean(ultimo && (base.includes(ultimo) || baseCompacta.includes(ultimo)));

    const compactoPrimeiroSegundo = Boolean(primeiro && segundo && baseCompacta.includes(`${primeiro}${segundo}`));
    const compactoNomeCompleto = Boolean(tokens.length >= 2 && baseCompacta.includes(tokens.join("")));

    const proporcao = tokensEncontrados.length / tokens.length;

    const contemDuasPartesFortes = contemPrimeiro && (
        contemSegundo ||
        contemUltimo ||
        tokensEncontrados.length >= 2 ||
        compactoPrimeiroSegundo
    );

    const score =
        (proporcao * 100) +
        (contemPrimeiro ? 12 : 0) +
        (contemSegundo ? 8 : 0) +
        (contemUltimo ? 8 : 0) +
        (compactoPrimeiroSegundo ? 12 : 0) +
        (compactoNomeCompleto ? 18 : 0);

    const encontrado = Boolean(
        compactoNomeCompleto ||
        compactoPrimeiroSegundo ||
        (proporcao >= 0.67 && contemDuasPartesFortes) ||
        (tokensEncontrados.length >= 3 && contemPrimeiro) ||
        (tokensEncontrados.length >= 2 && contemPrimeiro && (contemSegundo || contemUltimo))
    );

    return {
        encontrado,
        proporcao,
        totalTokens: tokens.length,
        tokensEncontrados,
        score,
        compactoEncontrado: Boolean(compactoNomeCompleto || compactoPrimeiroSegundo),
    };
}

function distanciaLevenshteinConferencia(a = "", b = "") {
    const textoA = String(a || "");
    const textoB = String(b || "");

    if (textoA === textoB) return 0;
    if (!textoA) return textoB.length;
    if (!textoB) return textoA.length;

    const linhas = Array.from({ length: textoA.length + 1 }, () => new Array(textoB.length + 1).fill(0));

    for (let i = 0; i <= textoA.length; i += 1) {
        linhas[i][0] = i;
    }
    for (let j = 0; j <= textoB.length; j += 1) {
        linhas[0][j] = j;
    }

    for (let i = 1; i <= textoA.length; i += 1) {
        for (let j = 1; j <= textoB.length; j += 1) {
            const custo = textoA[i - 1] === textoB[j - 1] ? 0 : 1;
            linhas[i][j] = Math.min(
                linhas[i - 1][j] + 1,
                linhas[i][j - 1] + 1,
                linhas[i - 1][j - 1] + custo
            );
        }
    }

    return linhas[textoA.length][textoB.length];
}

function similaridadeTextoConferencia(a = "", b = "") {
    const textoA = normalizarTextoConferencia(a).replace(/\s+/g, "");
    const textoB = normalizarTextoConferencia(b).replace(/\s+/g, "");

    if (!textoA || !textoB) return 0;
    if (textoA === textoB) return 1;

    const maximo = Math.max(textoA.length, textoB.length);

    if (!maximo) return 0;

    const distancia = distanciaLevenshteinConferencia(textoA, textoB);
    return Math.max(0, 1 - (distancia / maximo));
}

function pontuarNomeColaboradorListaColetiva({
    texto = "",
    nome = "",
    listaPresenca = false,
    empresaEncontrada = null,
    treinamentoEncontrado = null,
    dataCoerente = false,
    candidatos = [],
    colaborador = {},
} = {}) {
    const tokensNome = tokensNomeConferencia(nome);
    const base = normalizarTextoConferencia(texto);
    const baseCompacta = base.replace(/\s+/g, "");

    if (!listaPresenca || !tokensNome.length || !base) {
        return {
            encontrado: false,
            provavel: false,
            score: 0,
            origem: "",
            tokensEncontrados: [],
            nomeExtraido: "",
            motivo: "",
        };
    }

    const nomeCompacto = tokensNome.join("");
    const doisPrimeiros = tokensNome.slice(0, 2);
    const doisPrimeirosCompacto = doisPrimeiros.join("");

    if (baseCompacta.includes(nomeCompacto)) {
        return {
            encontrado: true,
            provavel: false,
            score: 100,
            origem: "nome_completo_ocr",
            tokensEncontrados: tokensNome,
            nomeExtraido: tokensNome.join(" "),
            motivo: "Nome completo encontrado de forma compacta no texto OCR.",
        };
    }

    if (
        doisPrimeiros.length === 2 &&
        doisPrimeirosCompacto.length >= 6 &&
        (baseCompacta.includes(doisPrimeirosCompacto) || base.includes(doisPrimeiros.join(" ")))
    ) {
        return {
            encontrado: true,
            provavel: false,
            score: 95,
            origem: "dois_primeiros_nomes_ocr",
            tokensEncontrados: doisPrimeiros,
            nomeExtraido: doisPrimeiros.join(" "),
            motivo: "Dois primeiros nomes encontrados na lista de presença.",
        };
    }

    const tokensTexto = base.split(" ").filter(Boolean);
    const correspondencias = tokensNome
        .map((tokenNome) => {
            let melhor = null;

            for (const tokenTexto of tokensTexto) {
                const similaridade = similaridadeTextoConferencia(tokenNome, tokenTexto);

                if (similaridade < 0.67) continue;

                if (!melhor || similaridade > melhor.similaridade) {
                    melhor = {
                        tokenNome,
                        tokenTexto,
                        similaridade,
                    };
                }
            }

            return melhor;
        })
        .filter(Boolean);

    const tokensEncontrados = correspondencias.map((item) => item.tokenTexto);
    const cobertura = correspondencias.length / tokensNome.length;
    const mediaSimilaridade = correspondencias.length
        ? correspondencias.reduce((soma, item) => soma + item.similaridade, 0) / correspondencias.length
        : 0;

    let score = Math.round((cobertura * 65) + (mediaSimilaridade * 35));
    let origem = correspondencias.length >= 2 ? "lista_presenca_nome_parcial_forte" : "nome_aproximado_lista_presenca";
    let provavel = false;

    const primeiroNome = tokensNome[0] || "";
    const primeiroNomeUnico = primeiroNomeUnicoEntreCandidatos({
        primeiroNome,
        candidatos,
        colaborador,
    });

    if (
        correspondencias.length === 1 &&
        primeiroNomeUnico &&
        empresaEncontrada === true &&
        treinamentoEncontrado === true &&
        dataCoerente
    ) {
        score = Math.max(score, 60);
        provavel = true;
        origem = "primeiro_nome_unico_lista_presenca";
    } else if (correspondencias.length >= 2 && score >= 75) {
        provavel = false;
    } else if (correspondencias.length >= 1 && score >= 45) {
        provavel = true;
    }

    const encontrado = score >= 75 && correspondencias.length >= 2;
    const nomeExtraido = tokensEncontrados.join(" ") || correspondencias.map((item) => item.tokenTexto).join(" ");

    return {
        encontrado,
        provavel: provavel && !encontrado,
        score,
        origem,
        tokensEncontrados,
        nomeExtraido,
        motivo: encontrado
            ? "Correspondência forte na lista de presença."
            : (provavel
                ? "Correspondência parcial com conferência visual recomendada."
                : "Correspondência fraca para lista de presença."),
    };
}

function textoContemNomePessoa({ texto = "", nome = "" } = {}) {
    return pontuarNomePessoaNoTexto({ texto, nome }).encontrado;
}

const PRIMEIROS_NOMES_COMUNS_CONFERENCIA = new Set([
    "joao",
    "jose",
    "maria",
    "pedro",
    "rafael",
    "carlos",
    "luis",
    "luiz",
    "francisco",
    "antonio",
    "ana",
    "paulo",
    "marcos",
    "marco",
    "lucas",
    "bruno",
]);

function obterPrimeiroNomeConferencia(nome = "") {
    return tokensNomeConferencia(nome)[0] || "";
}

function obterCandidatosColaboradorConferencia({ certificado = {}, colaborador = {}, treinamento = {} } = {}) {
    const listas = [
        certificado?.colaboradores,
        certificado?.colaboradoresEmpresa,
        certificado?.colaboradores_empresa,
        certificado?.empresa?.colaboradores,
        colaborador?.empresa?.colaboradores,
        treinamento?.colaboradores,
    ];

    return listas.find((lista) => Array.isArray(lista) && lista.length) || [];
}

function primeiroNomeUnicoEntreCandidatos({ primeiroNome = "", candidatos = [], colaborador = {} } = {}) {
    if (!primeiroNome || PRIMEIROS_NOMES_COMUNS_CONFERENCIA.has(primeiroNome)) return false;

    if (!Array.isArray(candidatos) || !candidatos.length) {
        return true;
    }

    const idReferencia = String(colaborador?.id || colaborador?.colaborador_id || "");
    const codigoReferencia = String(colaborador?.codigoFuncionario || colaborador?.codigo_funcionario || "");
    const candidatosMesmoNome = candidatos.filter((candidato) =>
        obterPrimeiroNomeConferencia(
            candidato?.nome ||
            candidato?.nomeCompleto ||
            candidato?.nome_completo ||
            candidato?.colaborador_nome ||
            ""
        ) === primeiroNome
    );

    if (candidatosMesmoNome.length <= 1) return true;

    return candidatosMesmoNome.every((candidato) => {
        const mesmoId = idReferencia && String(candidato?.id || candidato?.colaborador_id || "") === idReferencia;
        const mesmoCodigo = codigoReferencia && String(candidato?.codigoFuncionario || candidato?.codigo_funcionario || "") === codigoReferencia;
        return mesmoId || mesmoCodigo;
    });
}

function analisarCorrespondenciaColaboradorLista({
    texto = "",
    nomeColaborador = "",
    listaPresenca = false,
    documentoColetivo = false,
    empresaEncontrada = null,
    treinamentoEncontrado = null,
    dataCoerente = false,
    candidatos = [],
    colaborador = {},
} = {}) {
    const pontuacao = pontuarNomeColaboradorListaColetiva({
        texto,
        nome: nomeColaborador,
        listaPresenca: Boolean(listaPresenca || documentoColetivo),
        empresaEncontrada,
        treinamentoEncontrado,
        dataCoerente,
        candidatos,
        colaborador,
    });

    if (pontuacao.encontrado) {
        return {
            encontrado: true,
            origem: pontuacao.origem,
            confianca: "alta",
            tokensEncontrados: pontuacao.tokensEncontrados,
            score: pontuacao.score,
            nomeExtraido: pontuacao.nomeExtraido,
            observacao: pontuacao.motivo,
        };
    }

    if (pontuacao.provavel) {
        return {
            encontrado: false,
            origem: pontuacao.origem,
            confianca: "media",
            tokensEncontrados: pontuacao.tokensEncontrados,
            score: pontuacao.score,
            nomeExtraido: pontuacao.nomeExtraido,
            provavel: true,
            observacao: pontuacao.motivo,
        };
    }

    return {
        encontrado: false,
        origem: "",
        confianca: "baixa",
        tokensEncontrados: pontuacao.tokensEncontrados,
        score: pontuacao.score,
        nomeExtraido: pontuacao.nomeExtraido,
        observacao: pontuacao.motivo,
    };
}

function combinarLinhasOcrParaBusca(linhas = []) {
    const registros = Array.isArray(linhas) ? linhas : [];
    const combinadas = [];

    registros.forEach((linha, indice) => {
        if (!linha?.texto) return;

        combinadas.push({ ...linha, origem_linha: "ocr_linha" });

        for (let tamanho = 2; tamanho <= 4; tamanho += 1) {
            const grupo = registros.slice(indice, indice + tamanho).filter((item) => item?.texto);

            if (grupo.length !== tamanho) continue;

            const distancia = Math.abs(Number(grupo[grupo.length - 1]?.yCentro || 0) - Number(grupo[0]?.yCentro || 0));

            if (distancia > 0.12) continue;

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

function documentoPossuiColunaAssinaturaConferencia({ texto = "", leitura = {} } = {}) {
    const base = normalizarTextoConferencia(texto);
    const possuiAssinaturaTabela = obterAssinaturasTabelaConferencia(leitura).length > 0;

    return Boolean(
        possuiAssinaturaTabela ||
        /\bnome\b[\s\S]{0,140}\bassinatura\b/.test(base) ||
        /\bfuncao\b[\s\S]{0,100}\bassinatura\b/.test(base) ||
        (base.includes("nome") && base.includes("assinatura"))
    );
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
    const id = Number(certificado?.treinamento_codigo || certificado?.treinamentoId || certificado?.treinamento_id || treinamento?.id || 0);

    if (!base && !nome && !id) return null;

    const regrasPorId = {
        1: [/\bintegracao\b/, /\bintegra[cÃƒÂ§][aÃƒÂ£]o\b/, /mobilizacao|mobilizaÃƒÂ§ÃƒÂ£o/, /lista de presenca|lista de presenÃƒÂ§a/],
        2: [/\bnr\s*35\b/, /trabalho em altura/, /altura/],
        3: [/\bnr\s*12\b/, /maquinas e equipamentos|mÃƒÂ¡quinas e equipamentos/, /protecoes especificas|proteÃƒÂ§ÃƒÂµes especÃƒÂ­ficas/],
        4: [/\bnr\s*10\b/, /eletricidade|eletrica|elÃƒÂ©trica/],
        5: [/pemt|pta|plataforma/],
        6: [/trabalho a quente|solda|nr\s*34/],
        7: [/lixadeira|esmerilhadeira/],
        8: [/\bnr\s*0?6\b/, /uso correto dos epi|uso correto de epi|treinamento de uso correto dos epi/],
        9: [/\bnr\s*18[.,]?0?6\b/, /escavacoes|escavaÃƒÂ§ÃƒÂµes|fundacoes|fundaÃƒÂ§ÃƒÂµes/, /treinamento de seguranca para trabalhos em escavacoes/],
        10: [/\bnr\s*33\b/, /espaco confinado|espaÃƒÂ§o confinado/],
        11: [/\bnr\s*11\b/, /transporte movimentacao|transporte movimentaÃƒÂ§ÃƒÂ£o/, /movimentacao armazenagem|movimentaÃƒÂ§ÃƒÂ£o armazenagem/, /manuseio de materiais/],
        12: [/escavacao|escavaÃƒÂ§ÃƒÂ£o|abertura de valas|vala|valas/],
        14: [/ficha de epi|controle de entrega de epi|entrega de epi|equipamento de protecao individual|equipamento de proteÃƒÂ§ÃƒÂ£o individual/],
        15: [/ordem de servico|ordem de serviÃƒÂ§o|seguranca e saude do trabalho|seguranÃƒÂ§a e saÃƒÂºde do trabalho/],
        16: [/\bnr\s*21\b/, /trabalho a ceu aberto|trabalho a cÃƒÂ©u aberto/, /protetor solar|protecao solar|proteÃƒÂ§ÃƒÂ£o solar/],
        17: [/\bnr\s*25\b/, /meio ambiente|descarte de residuos|descarte de resÃƒÂ­duos/],
        18: [/\bnr\s*17\b/, /ergonomia|orientacao postural|orientaÃƒÂ§ÃƒÂ£o postural/],
        19: [/\bnr\s*26\b/, /sinalizacao de seguranca|sinalizaÃƒÂ§ÃƒÂ£o de seguranÃƒÂ§a|sinalizacao|sinalizaÃƒÂ§ÃƒÂ£o|transito|trÃƒÂ¢nsito/],
        20: [/\bnr\s*23\b/, /incendio|incÃƒÂªndio/],
        21: [/registro de empregado|ficha de registro|clt|esocial|data de admissao|data de admissÃƒÂ£o/],
        22: [/aso|atestado de saude ocupacional|atestado de saÃƒÂºde ocupacional/],
    };

    if (id && regrasPorId[id] && regrasPorId[id].some((regex) => regex.test(base))) return true;
    if (nome.includes("18 06") && (/18\s*06|escavacoes|escavaÃƒÂ§ÃƒÂµes|fundacoes|fundaÃƒÂ§ÃƒÂµes/.test(base))) return true;

    const tokens = nome.split(" ").filter((token) => token.length >= 3 && !["documento", "treinamento", "funcao", "funÃƒÂ§ÃƒÂ£o", "curso", "para"].includes(token));
    if (!tokens.length) return null;

    const encontrados = tokens.filter((token) => base.includes(token));
    return encontrados.length / tokens.length >= 0.40;
}

function montarConferenciaDocumentalCertificado({ leitura = {}, certificado = {}, colaborador = {}, treinamento = {}, metadadosArquivo = {} } = {}) {
    const textoDocumento = obterTextoLeituraConferencia(leitura);
    const textoComArquivo = obterTextoLeituraConferenciaComArquivo(leitura, metadadosArquivo);
    const nomeColaborador = obterNomeColaboradorAnalise(colaborador, certificado);
    const cpfColaborador = obterCpfColaboradorAnalise(colaborador, certificado);
    const empresaColaborador = obterEmpresaColaboradorAnalise(colaborador, certificado);
    const cnpjEmpresa = obterCnpjEmpresaAnalise(colaborador, certificado);
    const campos = obterCamposLeituraConferencia(leitura);
    const perfilDocumental = obterPerfilDocumentalConferencia({ texto: textoComArquivo, treinamento, certificado, arquivoNome: metadadosArquivo?.arquivoNome || "" });
    const assinaturaDigitalAso = perfilDocumental === "aso"
        ? obterAssinaturaDigitalAsoConferencia({ texto: textoDocumento, campos })
        : { localizada: false, origem: "assinatura_digital_aso_nao_aplicavel", evidencia: "" };
    const linhaColaboradorOcr = localizarLinhaColaboradorOcr({ leitura, nomeColaborador });
    const linhaColaboradorTabela = assinaturaProvavelPorTabela({
        leitura,
        textoDocumento,
        nomeColaborador,
        linhaReferencia: linhaColaboradorOcr,
    });
    const linhaOcrTemAssinatura = Boolean(linhaColaboradorOcr?.assinatura_visual || linhaColaboradorOcr?.assinaturaVisual);
    const linhaTabelaTemAssinatura = Boolean(linhaColaboradorTabela?.assinatura_visual || linhaColaboradorTabela?.assinaturaVisual);
    const linhaColaborador = linhaTabelaTemAssinatura || (!linhaOcrTemAssinatura && linhaColaboradorTabela)
        ? linhaColaboradorTabela
        : (linhaColaboradorOcr || linhaColaboradorTabela);
    const classificacaoTreinamentoEtapa2 = classificarTipoDocumentoTreinamentoEtapa2({
        nomeArquivo: metadadosArquivo?.arquivoNome || "",
        texto: textoComArquivo,
        textoOcr: textoDocumento,
        tipoDetectado: perfilDocumental,
    });
    const listaPresencaDetectada = documentoPareceListaPresenca({ texto: textoDocumento, leitura });
    const listaPresenca = Boolean(
        listaPresencaDetectada ||
        classificacaoTreinamentoEtapa2?.tipoDocumento === "coletivo" ||
        classificacaoTreinamentoEtapa2?.perfil === "lista_presenca"
    );
    const possuiColunaAssinatura = documentoPossuiColunaAssinaturaConferencia({
        texto: textoDocumento,
        leitura,
    });
    const analiseColaboradorColetivoEtapa4 = listaPresenca && nomeColaborador
        ? analisarColaboradorDocumentoColetivoEtapa4({
            nomeColaborador,
            texto: textoComArquivo,
            textoOcr: textoDocumento,
        })
        : null;
    const assinaturaDocumentoIndividual = obterAssinaturaDocumentoIndividual(leitura);
    const documentoAssinaturaIndividual = documentoPareceAssinaturaIndividual({ texto: textoDocumento, treinamento, certificado });
    const nomeEncontradoTextoGeral = nomeColaborador
        ? textoContemNomePessoa({ texto: textoDocumento, nome: nomeColaborador })
        : null;
    const nomeEncontradoLinha = Boolean(linhaColaborador);
    const nomeEncontradoColetivoEtapa4 = Boolean(analiseColaboradorColetivoEtapa4?.localizado);
    const documentoIndividualPorPerfil = [
        "aso",
        "os",
        "ordem_servico",
        "ordem_servico_seguranca",
        "ficha_epi",
        "ficha_registro",
        "registro",
        "certificado",
        "certificado_individual",
        "documento_individual",
    ].includes(String(perfilDocumental || "").toLowerCase());

    const nomeEncontradoPorArquivo = Boolean(
        nomeColaborador &&
        documentoIndividualPorPerfil &&
        !listaPresenca &&
        nomeArquivoCompativelComColaboradorConferencia({
            arquivo: {
                name: metadadosArquivo?.arquivoNome ||
                    certificado?.arquivo?.name ||
                    certificado?.arquivo_nome ||
                    certificado?.arquivoNome ||
                    certificado?.nomeArquivo ||
                    certificado?.nome_arquivo ||
                    "",
            },
            nomeColaborador,
        })
    );

    const nomeLocalizadoApenasPorArquivo = Boolean(
        nomeEncontradoPorArquivo &&
        !nomeEncontradoTextoGeral &&
        !nomeEncontradoLinha
    );

    let nomeEncontrado = nomeColaborador
        ? (listaPresenca
            ? Boolean(nomeEncontradoLinha || nomeEncontradoColetivoEtapa4)
            : Boolean(nomeEncontradoTextoGeral || nomeEncontradoLinha || nomeEncontradoPorArquivo))
        : null;

    const cpfDocumentoEncontrado = documentoPossuiCpfQualquer(textoDocumento);
    const cnpjDocumentoEncontrado = documentoPossuiCnpjQualquer(textoDocumento) || Boolean(campos?.cnpj);
    const cpfEncontrado = documentoContemCpf(textoDocumento, cpfColaborador);
    const cnpjEncontrado = documentoContemCnpj(textoDocumento, cnpjEmpresa);
    const textoNormalizadoDocumento = normalizarTextoConferencia(textoDocumento);
    const nomeEmpresaNormalizado = normalizarTextoConferencia(empresaColaborador);
    const treinamentoEncontrado = documentoContemTreinamento({ texto: textoComArquivo, treinamento, certificado });
    const empresaEncontradaNoTexto = empresaColaborador
        ? textoContemNomePessoa({ texto: textoDocumento, nome: empresaColaborador }) ||
        (textoNormalizadoDocumento.includes(normalizarTextoConferencia("Ribeiro Aquino")) && nomeEmpresaNormalizado.includes("ribeiro")) ||
        (campos?.empresa_nome && textoContemNomePessoa({ texto: campos.empresa_nome, nome: empresaColaborador }))
        : null;
    const empresaEncontradaPorVinculo = Boolean(
        empresaColaborador &&
        nomeEncontrado === true &&
        (cpfEncontrado === true || cpfDocumentoEncontrado === true || cnpjEncontrado === true || cnpjDocumentoEncontrado === true) &&
        (documentoAssinaturaIndividual || listaPresenca || perfilDocumental !== "generico")
    );
    const empresaEncontradaPorLogoRibeiro = empresaRibeiroAquinoConfirmadaPorModeloCertificado({
        nomeEmpresaNormalizado,
        perfilDocumental,
        nomeEncontrado,
        treinamentoEncontrado,
        textoDocumento,
        cnpjEmpresa,
        cnpjDocumentoEncontrado,
        cnpjEncontrado,
    });
    const empresaEncontradaPorListaRibeiro = empresaRibeiroAquinoConfirmadaPorModeloLista({
        nomeEmpresaNormalizado,
        perfilDocumental,
        listaPresenca,
        nomeEncontrado,
        treinamentoEncontrado,
        textoDocumento,
        cnpjEmpresa,
        cnpjDocumentoEncontrado,
        cnpjEncontrado,
    });
    const empresaEncontradaPorFichaEpiRibeiro = Boolean(
        perfilDocumental === "ficha_epi" &&
        nomeEmpresaNormalizado.includes("ribeiro") &&
        (nomeEncontrado === true || nomeEncontradoPorArquivo === true || nomeEncontradoLinha === true || nomeEncontradoTextoGeral === true) &&
        /ficha\s+(de\s+)?epi|controle\s+de\s+entrega\s+de\s+epi|entrega\s+de\s+epi|equipamento\s+de\s+protecao\s+individual|recebimento|devolucao|assinatura|\bca\b|capacete|luva|botina|oculos|protetor|respirador|uniforme|cinto/.test(normalizarTextoConferencia(`${textoComArquivo} ${textoDocumento}`))
    );
    const empresaEncontrada = empresaEncontradaNoTexto === true || empresaEncontradaPorVinculo || empresaEncontradaPorLogoRibeiro || empresaEncontradaPorListaRibeiro || empresaEncontradaPorFichaEpiRibeiro ? true : empresaEncontradaNoTexto;
    const dataCoerenteLista = Boolean(
        certificado?.dataRealizacao ||
        certificado?.data_realizacao ||
        campos?.data_documento ||
        campos?.data_realizacao ||
        campos?.data_principal ||
        leitura?.dataPrincipal ||
        leitura?.data_principal ||
        (Array.isArray(leitura?.datasEncontradas) && leitura.datasEncontradas.length) ||
        (Array.isArray(leitura?.datas_encontradas) && leitura.datas_encontradas.length) ||
        /\b[0-3]?\d[/.-][01]?\d[/.-](?:19|20)\d{2}\b/.test(textoDocumento)
    );
    const correspondenciaColaboradorLista = analisarCorrespondenciaColaboradorLista({
        texto: textoComArquivo,
        nomeColaborador,
        listaPresenca,
        documentoColetivo: listaPresenca,
        empresaEncontrada,
        treinamentoEncontrado,
        dataCoerente: dataCoerenteLista,
        candidatos: obterCandidatosColaboradorConferencia({ certificado, colaborador, treinamento }),
        colaborador,
    });

    const scoreColaboradorLista = Number(correspondenciaColaboradorLista?.score || 0);
    const colaboradorListaLocalizado = listaPresenca && correspondenciaColaboradorLista?.encontrado === true && scoreColaboradorLista >= 75;
    const colaboradorListaProvavel = listaPresenca && !colaboradorListaLocalizado && scoreColaboradorLista >= 45;

    if (listaPresenca && nomeColaborador && !nomeEncontrado && colaboradorListaLocalizado) {
        nomeEncontrado = true;
    }
    const linhaAssinaturaBase = linhaColaborador || assinaturaDocumentoIndividual;
    const assinaturaDensidade = linhaAssinaturaBase?.assinatura_densidade ?? null;
    const assinaturaDensidadeAzul = linhaAssinaturaBase?.assinatura_densidade_azul ?? null;
    const assinaturaEspalhamentoHorizontal = linhaAssinaturaBase?.assinatura_espalhamento_horizontal ?? null;
    const assinaturaEspalhamentoVertical = linhaAssinaturaBase?.assinatura_espalhamento_vertical ?? null;
    const assinaturaCertificadoEscaneado = assinaturaCertificadoEscaneadoProvavel({
        perfilDocumental,
        nomeEncontrado,
        treinamentoEncontrado,
        documentoAssinaturaIndividual,
        assinaturaDocumentoIndividual,
        textoDocumento,
    });
    const assinaturaVisual = assinaturaDigitalAso?.localizada || assinaturaCertificadoEscaneado
        ? true
        : linhaAssinaturaBase
            ? Boolean(
                linhaAssinaturaBase.assinatura_visual ||
                linhaAssinaturaBase.assinaturaVisual ||
                Number(assinaturaDensidadeAzul || 0) > 0.00045 ||
                (Number(assinaturaDensidade || 0) > 0.0024 && Number(assinaturaEspalhamentoHorizontal || 0) > 0.018)
            )
            : null;
    const fichaEpiAssinaturaProvavel = Boolean(
        perfilDocumental === "ficha_epi" &&
        (nomeEncontrado === true || nomeEncontradoPorArquivo === true || nomeEncontradoLinha === true || nomeEncontradoTextoGeral === true) &&
        /assinatura|recebimento|devolucao|entrega|ficha\s+(de\s+)?epi|controle\s+de\s+entrega/.test(normalizarTextoConferencia(`${textoComArquivo} ${textoDocumento}`)) &&
        (linhaAssinaturaBase || possuiColunaAssinatura || assinaturaDocumentoIndividual || obterAssinaturasTabelaConferencia(leitura).length)
    );

    const assinaturaVisualFinal = perfilDocumental === "ficha_epi"
        ? Boolean(
            assinaturaVisual === true ||
            fichaEpiAssinaturaProvavel ||
            linhaTabelaTemAssinatura ||
            linhaOcrTemAssinatura ||
            Boolean(linhaAssinaturaBase && (
                linhaAssinaturaBase.assinatura_visual ||
                linhaAssinaturaBase.assinaturaVisual ||
                Number(assinaturaDensidadeAzul || 0) > 0.00045 ||
                (Number(assinaturaDensidade || 0) > 0.0024 && Number(assinaturaEspalhamentoHorizontal || 0) > 0.018)
            ))
        )
        : assinaturaVisual;

    const assinaturaAplicavel = Boolean(
        perfilDocumental === "ficha_epi" ||
        (listaPresenca && (nomeEncontrado || possuiColunaAssinatura)) ||
        ((documentoAssinaturaIndividual || perfilDocumental === "certificado") && nomeEncontrado)
    );
    const documentoConfirmadoPorConferencia = Boolean(
        nomeEncontrado === true &&
        !nomeLocalizadoApenasPorArquivo &&
        assinaturaVisualFinal === true &&
        empresaEncontrada === true
    );
    const treinamentoEncontradoFinal = treinamentoEncontrado === false && documentoConfirmadoPorConferencia
        ? true
        : treinamentoEncontrado;

    return {
        executado: Boolean(leitura?.executado || textoDocumento || obterLinhasOcrConferencia(leitura).length),
        documentoCorretoPorConferencia: documentoConfirmadoPorConferencia,
        perfilDocumental,
        tipoLeitura: leitura?.tipoLeitura || leitura?.tipo_leitura || "nÃƒÂ£o informado",
        listaPresenca,
        dataCoerenteLista,
        colaborador: {
            nomeCadastro: nomeColaborador,
            encontrado: nomeEncontrado,
            encontradoTextoGeral: nomeEncontradoTextoGeral,
            encontradoLinha: nomeEncontradoLinha,
            encontradoPorArquivo: nomeEncontradoPorArquivo,
            localizadoApenasPorArquivo: nomeLocalizadoApenasPorArquivo,
            origemIdentificacao: nomeEncontradoLinha
                ? "linha_ocr_ou_tabela"
                : nomeEncontradoColetivoEtapa4
                    ? "lista_presenca_nome_parcial_forte"
                    : colaboradorListaLocalizado
                        ? (correspondenciaColaboradorLista?.origem || "lista_presenca_nome_parcial_forte")
                        : nomeEncontradoTextoGeral
                            ? "texto_ocr"
                            : nomeEncontradoPorArquivo
                                ? "nome_arquivo"
                                : "nao_localizado",
            confiancaIdentificacao: nomeEncontradoLinha || nomeEncontradoColetivoEtapa4 || nomeEncontradoTextoGeral
                ? "alta"
                : colaboradorListaLocalizado
                    ? "alta"
                    : colaboradorListaProvavel
                        ? "media"
                    : nomeEncontradoPorArquivo
                        ? "media"
                        : "baixa",
            observacaoIdentificacao: nomeLocalizadoApenasPorArquivo
                ? "Colaborador localizado pelo nome do arquivo; OCR nÃ£o confirmou o nome no conteÃºdo do documento."
                : (correspondenciaColaboradorLista?.observacao || ""),
            linhaOcr: linhaColaborador?.texto || "",
            linhaIndice: linhaColaborador?.indice ?? null,
            origemLinha: nomeLocalizadoApenasPorArquivo
                ? "nome_arquivo"
                : (linhaColaborador?.assinatura_origem === "fallback_tabela_presenca_linha_numerada"
                    ? "tabela_presenca_linha_numerada"
                    : (linhaColaborador?.origem_linha || "ocr")),
            scoreLinha: linhaColaborador?.nome_score ?? analiseColaboradorColetivoEtapa4?.confianca ?? scoreColaboradorLista ?? null,
            tokensEncontrados: linhaColaborador?.nome_tokens_encontrados || analiseColaboradorColetivoEtapa4?.tokensEncontrados || correspondenciaColaboradorLista?.tokensEncontrados || [],
            nomeExtraidoColetivo: analiseColaboradorColetivoEtapa4?.nomeExtraido || "",
            motivoIdentificacaoColetiva: analiseColaboradorColetivoEtapa4?.motivo || correspondenciaColaboradorLista?.observacao || "",
            localizadoPorPrimeiroNome: correspondenciaColaboradorLista?.origem === "primeiro_nome_unico_lista_presenca",
            localizadoPorCorrespondenciaParcial: colaboradorListaLocalizado || correspondenciaColaboradorLista?.origem === "dois_primeiros_nomes_ocr" || correspondenciaColaboradorLista?.origem === "lista_presenca_nome_parcial_forte",
            provavelPorPrimeiroNome: Boolean(colaboradorListaProvavel || correspondenciaColaboradorLista?.provavel),
            scoreIdentificacao: scoreColaboradorLista,
        },
        cpf: {
            informadoCadastro: Boolean(cpfColaborador || cpfDocumentoEncontrado),
            encontrado: cpfColaborador ? cpfEncontrado : (cpfDocumentoEncontrado || null),
            encontradoNoDocumento: cpfDocumentoEncontrado,
            cpfCadastro: cpfColaborador,
            cpfsExtraidos: extrairCpfsDocumentoConferencia(textoDocumento),
        },
        empresa: {
            nomeCadastro: empresaColaborador,
            encontrada: empresaEncontrada,
            localizada: empresaEncontrada,
            avaliada: empresaEncontrada !== null && empresaEncontrada !== undefined,
            nomeExtraido: campos?.empresa_nome || (empresaEncontradaPorFichaEpiRibeiro ? empresaColaborador : ""),
            origem: empresaEncontradaNoTexto === true
                ? "ocr_texto_logo_ou_nome"
                : (empresaEncontradaPorVinculo
                    ? "vinculo_colaborador_cpf_documento"
                    : (empresaEncontradaPorFichaEpiRibeiro
                        ? "logo_ribeiro_aquino_ficha_epi"
                        : (empresaEncontradaPorLogoRibeiro
                            ? "logo_ribeiro_aquino_modelo_certificado"
                            : (empresaEncontradaPorListaRibeiro ? "logo_ribeiro_aquino_lista_presenca" : "")))),
        },
        cnpj: {
            informadoCadastro: Boolean(cnpjEmpresa || cnpjDocumentoEncontrado),
            encontrado: cnpjEmpresa ? cnpjEncontrado : (cnpjDocumentoEncontrado || null),
            cnpjCadastro: cnpjEmpresa,
            cnpjExtraido: formatarCnpjVerificacao(campos?.cnpj || extrairCnpjsDocumentoConferencia(textoDocumento)[0] || ""),
            cnpjsExtraidos: extrairCnpjsDocumentoConferencia(textoDocumento),
            obrigatorio: perfilDocumental === "ficha_epi" ? false : !(listaPresenca && empresaEncontrada === true && treinamentoEncontradoFinal === true),
            observacao: listaPresenca && empresaEncontrada === true && treinamentoEncontradoFinal === true && !cnpjDocumentoEncontrado
                ? "NÃ£o exigido para este tipo de documento"
                : "",
        },
        treinamento: {
            nomeCadastro: treinamento?.nome || certificado?.nome_treinamento || certificado?.tipo_treinamento || "",
            encontrado: perfilDocumental === "ficha_epi" ? true : treinamentoEncontradoFinal,
            encontradoNoTexto: treinamentoEncontrado,
            validadoPorConferencia: Boolean(perfilDocumental === "ficha_epi" || (documentoConfirmadoPorConferencia && treinamentoEncontrado === false)),
            observacao: documentoConfirmadoPorConferencia && treinamentoEncontrado === false
                ? "Treinamento nÃƒÂ£o confirmado no OCR, mas documento aceito porque colaborador, assinatura e empresa foram localizados."
                : "",
        },
        assinatura: {
            aplicavel: perfilDocumental === "ficha_epi" ? true : assinaturaAplicavel,
            visualLocalizada: assinaturaVisualFinal,
            localizada: assinaturaVisualFinal,
            encontrada: assinaturaVisualFinal,
            digitalAsoLocalizada: Boolean(assinaturaDigitalAso?.localizada),
            evidenciaDigitalAso: assinaturaDigitalAso?.evidencia || "",
            densidade: assinaturaDensidade,
            densidadeAzul: assinaturaDensidadeAzul,
            espalhamentoHorizontal: assinaturaEspalhamentoHorizontal,
            espalhamentoVertical: assinaturaEspalhamentoVertical,
            origem: assinaturaDigitalAso?.localizada
                ? assinaturaDigitalAso.origem
                : (assinaturaCertificadoEscaneado
                    ? "assinatura_certificado_escaneado"
                    : (linhaColaborador?.assinatura_origem || linhaColaborador?.assinaturaOrigem || assinaturaDocumentoIndividual?.assinatura_origem || "assinatura_documento")),
            pagina: assinaturaDocumentoIndividual?.pagina || linhaColaborador?.pagina || null,
            possuiColunaAssinatura,
            observacao: assinaturaDigitalAso?.localizada
                ? `Assinatura digital do ASO localizada por ${assinaturaDigitalAso.evidencia}.`
                : assinaturaCertificadoEscaneado
                    ? "Assinatura visual provÃƒÂ¡vel localizada no certificado escaneado do colaborador/responsÃƒÂ¡vel."
                    : assinaturaVisualFinal === true
                        ? (perfilDocumental === "ficha_epi" ? "Assinatura visual localizada na linha do colaborador." : (listaPresenca ? "Assinatura visual localizada na mesma faixa da linha do colaborador." : "Assinatura visual localizada no campo de assinatura do documento."))
                        : assinaturaVisualFinal === false
                            ? "Colaborador localizado, mas a assinatura nÃƒÂ£o foi confirmada visualmente. Conferir o campo de assinatura."
                            : assinaturaAplicavel
                                ? "Assinatura aplicável em documento coletivo. Conferir visualmente a assinatura na linha do colaborador."
                                : "Assinatura não aplicável porque o colaborador não foi localizado ou o documento não possui campo de assinatura identificado.",
        },
    };
}



function documentoColetivoOuGeralParaConferencia(conferencia = {}, arquivo = null, leitura = {}) {
    const textoLeitura = typeof obterTextoLeituraConferencia === "function"
        ? obterTextoLeituraConferencia(leitura)
        : "";

    const texto = [
        arquivo?.name,
        arquivo?.nome,
        arquivo?.filename,
        conferencia?.treinamento?.nomeCadastro,
        conferencia?.treinamento?.nome,
        conferencia?.perfilDocumental,
        conferencia?.tipoDocumento,
        conferencia?.listaPresenca ? "lista de presenca" : "",
        textoLeitura.slice(0, 2500),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!texto) return false;

    const documentoIndividual = /\b(aso|atestado de saude ocupacional|ficha epi|ficha de epi|ficha registro|ficha de registro|registro clt|esocial|ordem de servico|\bos\b)\b/.test(texto);

    if (documentoIndividual) return false;

    const estruturaListaPresenca = /\bnome\b.*\bfuncao\b.*\bassinatura\b/.test(texto) ||
        /\bdeclaro ter participado do treinamento\b/.test(texto) ||
        /\bassinatura instrutor\b/.test(texto) ||
        /\binstrutor\b.*\btec\b.*\bseg\b/.test(texto);

    const temNr = /\bnr\s*\d+|\bnr\d+/.test(texto);
    const temIntegracao = /\bintegracao\b/.test(texto);
    const temGeral = /\bgeral\b/.test(texto);
    const temTreinamento = /\btreinamento\b/.test(texto);
    const temaTreinamento = /\b(ergonomia|seguranca|escavacoes|fundacoes|protecao solar|creme de protecao|meio ambiente|residuos|sinalizacao|transito|transporte|movimentacao|armazenagem|maquinas|equipamentos|orientacao postural)\b/.test(texto);

    return Boolean(
        conferencia?.listaPresenca ||
        estruturaListaPresenca ||
        (temNr && (temaTreinamento || temGeral || temTreinamento)) ||
        (temIntegracao && /\bseguranca\b/.test(texto)) ||
        (temGeral && temaTreinamento)
    );
}



function nomeColaboradorCompativelComTextoOcrForte({ nomeCadastro = "", textoOcr = "" } = {}) {
    const normalizar = (valor = "") =>
        normalizarTextoConferencia(valor)
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

    const nome = normalizar(nomeCadastro);
    const texto = normalizar(textoOcr);

    if (!nome || !texto) return false;

    const nomeSemEspaco = nome.replace(/\s+/g, "");
    const textoSemEspaco = texto.replace(/\s+/g, "");

    if (texto.includes(nome)) return true;
    if (textoSemEspaco.includes(nomeSemEspaco)) return true;

    const tokensNome = nome
        .split(" ")
        .filter((token) => token.length >= 3);

    if (tokensNome.length < 2) return false;

    const tokensFortes = tokensNome.filter((token) =>
        texto.includes(token) || textoSemEspaco.includes(token)
    );

    const primeiroNomeEncontrado = tokensNome[0] && (
        texto.includes(tokensNome[0]) ||
        textoSemEspaco.includes(tokensNome[0])
    );

    const proporcao = tokensFortes.length / tokensNome.length;

    return Boolean(
        proporcao >= 0.67 ||
        (primeiroNomeEncontrado && tokensFortes.length >= 2)
    );
}


function documentoListaPresencaOuColetivoSeguro(conferencia = {}, arquivo = null, leitura = {}) {
    const textoLeitura = typeof obterTextoLeituraConferencia === "function"
        ? obterTextoLeituraConferencia(leitura)
        : "";

    const texto = [
        arquivo?.name,
        arquivo?.nome,
        arquivo?.filename,
        conferencia?.treinamento?.nomeCadastro,
        conferencia?.treinamento?.nome,
        conferencia?.tipoDocumento,
        conferencia?.tipo_documento,
        conferencia?.nomeDocumento,
        conferencia?.nome_documento,
        conferencia?.listaPresenca ? "lista presenca" : "",
        conferencia?.lista_presenca ? "lista presenca" : "",
        conferencia?.documentoColetivo ? "documento coletivo" : "",
        textoLeitura.slice(0, 4000),
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!texto) return false;

    const documentoIndividual = /\b(aso|atestado de saude ocupacional|ficha epi|ficha de epi|ficha registro|ficha de registro|registro clt|esocial|ordem de servico|\bos\b)\b/.test(texto);

    if (documentoIndividual) return false;

    const estruturaLista = (
        /\bnome\b.*\bfuncao\b.*\bassinatura\b/.test(texto) ||
        /\bnome\b.*\bfun\w*\b.*\bassinatura\b/.test(texto) ||
        /\bdeclaro ter participado\b/.test(texto) ||
        /\blista de presenca\b/.test(texto) ||
        /\bassinatura instrutor\b/.test(texto) ||
        /\binstrutor\b.*\btec\b.*\bseg\b/.test(texto)
    );

    const treinamentoColetivo = (
        /\bnr\s*\d+|\bnr\d+/.test(texto) ||
        /\bintegracao\b/.test(texto) ||
        /\btreinamento\b/.test(texto)
    ) && /\b(geral|seguranca|ergonomia|obra|construcao|ceu aberto|protetor solar|creme de protecao|meio ambiente|residuos|escavacoes|fundacoes|sinalizacao|transito|transporte|movimentacao|armazenagem|maquinas|equipamentos)\b/.test(texto);

    return Boolean(
        conferencia?.listaPresenca ||
        conferencia?.lista_presenca ||
        conferencia?.documentoColetivo ||
        estruturaLista ||
        treinamentoColetivo
    );
}


function nomeArquivoCompativelComColaboradorConferencia({ arquivo = null, nomeColaborador = "" } = {}) {
    const nomeArquivo = normalizarTextoConferencia(
        arquivo?.name ||
        arquivo?.nome ||
        arquivo?.filename ||
        ""
    );

    const nomeCadastro = normalizarTextoConferencia(nomeColaborador);

    if (!nomeArquivo || !nomeCadastro) return false;

    const textoArquivo = nomeArquivo.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/\s+/g, " ").trim();
    const compactoArquivo = textoArquivo.replace(/[^a-z0-9]/g, "");
    const compactoCadastro = nomeCadastro.replace(/[^a-z0-9]/g, "");

    if (compactoArquivo.includes(compactoCadastro) || compactoCadastro.includes(compactoArquivo)) {
        return true;
    }

    const tokensCadastro = nomeCadastro
        .split(" ")
        .filter((token) => token.length >= 3);

    if (!tokensCadastro.length) return false;

    const primeiro = tokensCadastro[0];
    const ultimo = tokensCadastro[tokensCadastro.length - 1];

    const encontrados = tokensCadastro.filter((token) =>
        textoArquivo.includes(token) ||
        compactoArquivo.includes(token)
    );

    const encontrouPrimeiro = primeiro && (
        textoArquivo.includes(primeiro) ||
        compactoArquivo.includes(primeiro)
    );

    const encontrouUltimo = ultimo && (
        textoArquivo.includes(ultimo) ||
        compactoArquivo.includes(ultimo)
    );

    return Boolean(
        encontrados.length >= 2 ||
        (encontrouPrimeiro && encontrouUltimo)
    );
}

function avaliarConferenciaDocumentalCertificado({ conferencia = {}, leitura = {}, arquivo = null } = {}) {
    const indicios = [];
    const textoDisponivel = Boolean(obterTextoLeituraConferencia(leitura).trim() || obterLinhasOcrConferencia(leitura).length);

    if (!arquivoPossuiArrayBufferVerificacao(arquivo) || !textoDisponivel) {
        return indicios;
    }

    const textoOcrCompletoConferencia = obterTextoLeituraConferencia(leitura);

    const colaboradorLocalizadoPorNomeForte = nomeColaboradorCompativelComTextoOcrForte({
        nomeCadastro: conferencia?.colaborador?.nomeCadastro || "",
        textoOcr: textoOcrCompletoConferencia,
    });

    const documentoColetivoNomeForte =
        documentoListaPresencaOuColetivoSeguro(conferencia, arquivo, leitura) ||
        documentoColetivoOuGeralParaConferencia(conferencia, arquivo, leitura);

    if (
        conferencia?.colaborador?.nomeCadastro &&
        conferencia?.colaborador?.encontrado === false &&
        colaboradorLocalizadoPorNomeForte &&
        documentoColetivoNomeForte
    ) {
        indicios.push(criarIndicioVerificacao({
            codigo: "colaborador_confirmado_apenas_no_texto_ocr",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Colaborador confirmado apenas no texto OCR",
            detalhe: `A leitura local encontrou indÃƒÂ­cio do nome ${conferencia.colaborador.nomeCadastro} no texto do documento, mas nÃƒÂ£o confirmou a linha do colaborador e a assinatura na lista de presenÃƒÂ§a. Manter em conferÃƒÂªncia manual.`,
            peso: 25,
            bloqueia: false,
            recomendacao: "Conferir visualmente se o colaborador aparece na linha correta da lista e se hÃƒÂ¡ assinatura correspondente antes de considerar o documento totalmente aprovado.",
            dados: {
                ...conferencia.colaborador,
                documentoColetivo: true,
                localizadoApenasNoTexto: true,
            },
        }));
    }

    if (conferencia?.colaborador?.localizadoApenasPorArquivo) {
        indicios.push(criarIndicioVerificacao({
            codigo: "colaborador_localizado_por_nome_arquivo",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Colaborador localizado pelo nome do arquivo",
            detalhe: conferencia?.colaborador?.observacaoIdentificacao || "O nome do arquivo Ã© compatÃ­vel com o colaborador selecionado, mas o OCR nÃ£o confirmou o nome no conteÃºdo.",
            peso: 35,
            bloqueia: false,
            recomendacao: "Conferir visualmente o documento antes de considerar a verificaÃ§Ã£o como totalmente aprovada.",
            dados: conferencia.colaborador,
        }));
    }

    if (conferencia?.colaborador?.nomeCadastro && conferencia?.colaborador?.encontrado === false && !colaboradorLocalizadoPorNomeForte) {
        const documentoColetivo = Boolean(
            conferencia?.listaPresenca ||
            conferencia?.lista_presenca ||
            conferencia?.documentoColetivo ||
            conferencia?.documento_coletivo ||
            documentoListaPresencaOuColetivoSeguro(conferencia, arquivo, leitura) ||
            documentoColetivoOuGeralParaConferencia(conferencia, arquivo, leitura)
        );
        const nomeArquivoCompativelComColaborador = nomeArquivoCompativelComColaboradorConferencia({
            arquivo,
            nomeColaborador: conferencia?.colaborador?.nomeCadastro || "",
        });
        const pendenciaManualSemBloqueio = Boolean(documentoColetivo || nomeArquivoCompativelComColaborador);
        indicios.push(criarIndicioVerificacao({
            codigo: documentoColetivo
                ? "colaborador_nao_confirmado_documento_coletivo"
                : "colaborador_nao_localizado_no_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: documentoColetivo
                ? "Colaborador nÃƒÂ£o confirmado automaticamente em documento coletivo"
                : "Colaborador nÃƒÂ£o localizado no documento",
            detalhe: documentoColetivo
                ? `A leitura local/OCR nÃƒÂ£o confirmou automaticamente o nome ${conferencia.colaborador.nomeCadastro}. Como o arquivo aparenta ser documento geral/coletivo, manter em conferÃƒÂªncia manual em vez de bloquear automaticamente.`
                : `A leitura local/OCR nÃƒÂ£o encontrou o nome ${conferencia.colaborador.nomeCadastro} no certificado ou lista de presenÃƒÂ§a.`,
            peso: pendenciaManualSemBloqueio ? (nomeArquivoCompativelComColaborador ? 35 : 25) : 75,
            bloqueia: !pendenciaManualSemBloqueio,
            recomendacao: documentoColetivo
                ? "Conferir visualmente se o documento coletivo/lista geral corresponde ao colaborador, empresa e treinamento selecionados."
                : "Conferir se o arquivo foi vinculado ao colaborador correto. Se o nome realmente nÃƒÂ£o constar na lista, substituir o documento.",
            dados: {
                ...conferencia.colaborador,
                documentoColetivo,
            },
        }));
    }

    if (
        conferencia?.listaPresenca &&
        conferencia?.colaborador?.encontrado &&
        conferencia?.assinatura?.visualLocalizada === false &&
        !conferencia?.assinatura?.possuiColunaAssinatura
    ) {
        indicios.push(criarIndicioVerificacao({
            codigo: "assinatura_colaborador_nao_confirmada_lista",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Assinatura do colaborador nÃƒÂ£o confirmada na lista",
            detalhe: "O colaborador foi localizado na lista, porÃƒÂ©m a leitura visual nÃƒÂ£o confirmou assinatura na mesma linha.",
            peso: 35,
            bloqueia: false,
            recomendacao: "Conferir visualmente a linha do colaborador antes de aprovar o treinamento.",
            dados: conferencia.assinatura,
        }));
    }

        /*
         * ============================================================
         * C11C — CPF AUSENTE NÃO É INCONSISTÊNCIA DOCUMENTAL
         * ============================================================
         *
         * A simples ausência do CPF no arquivo não caracteriza
         * divergência de identidade.
         *
         * REGRAS:
         *
         * 1. Documento individual sem qualquer CPF:
         *    -> não gera indício de CPF.
         *
         * 2. Documento possui algum CPF, porém o CPF cadastrado
         *    do colaborador não foi confirmado:
         *    -> permanece em atenção para conferência manual.
         *
         * 3. Lista de presença:
         *    -> mantém a regra tolerante de peso baixo já existente.
         *
         * Nenhum novo bloqueio automático é criado aqui.
         * ============================================================
         */

        if (
            conferencia?.cpf?.informadoCadastro &&
            conferencia?.cpf?.encontrado === false
        ) {
            const cpfsExtraidosCpf =
                Array.isArray(
                    conferencia
                        ?.cpf
                        ?.cpfsExtraidos
                )
                    ? conferencia
                        .cpf
                        .cpfsExtraidos
                        .filter(Boolean)
                    : [];

            const possuiAlgumCpfNoDocumento =
                conferencia
                    ?.cpf
                    ?.encontradoNoDocumento === true ||
                cpfsExtraidosCpf.length > 0;

            const listaPresencaCpf =
                Boolean(
                    conferencia?.listaPresenca ||
                    conferencia?.lista_presenca
                );

            if (
                listaPresencaCpf ||
                possuiAlgumCpfNoDocumento
            ) {
                const cpfRequerConferencia =
                    possuiAlgumCpfNoDocumento &&
                    !listaPresencaCpf;

                indicios.push(
                    criarIndicioVerificacao({
                        codigo:
                            cpfRequerConferencia
                                ? "cpf_colaborador_nao_confere_documento"
                                : "cpf_colaborador_nao_localizado_documento",

                        tipo:
                            DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,

                        titulo:
                            cpfRequerConferencia
                                ? "CPF localizado no documento requer conferência"
                                : "CPF do colaborador não localizado no documento",

                        detalhe:
                            cpfRequerConferencia
                                ? "A leitura local encontrou CPF no documento, porém não confirmou o CPF cadastrado para o colaborador. Conferir visualmente a identificação."
                                : "A lista não apresentou correspondência automática com o CPF cadastrado. A ausência isolada do CPF em lista de presença não caracteriza divergência de identidade.",

                        peso:
                            listaPresencaCpf
                                ? 10
                                : 30,

                        bloqueia:
                            false,

                        recomendacao:
                            cpfRequerConferencia
                                ? "Conferir visualmente a quem pertence o CPF localizado antes de aprovar."
                                : "Conferir CPF somente quando o documento possuir esse dado ou houver outra divergência de identidade.",

                        dados: {
                            ...conferencia.cpf,

                            possuiAlgumCpfNoDocumento,
                        },
                    })
                );
            }
        }
    if (conferencia?.cnpj?.informadoCadastro && conferencia?.cnpj?.encontrado === false && conferencia?.cnpj?.cnpjExtraido) {
        indicios.push(criarIndicioVerificacao({
            codigo: "cnpj_empresa_nao_confere_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "CNPJ da empresa nÃƒÂ£o confere com o documento",
            detalhe: "O documento possui CNPJ localizado, mas ele não corresponde ao CNPJ vinculado ao colaborador/empresa.",
            peso: 70,
            bloqueia: true,
            recomendacao: "Conferir se o documento pertence ÃƒÂ  empresa correta antes de aprovar.",
            dados: conferencia.cnpj,
        }));
    }

    if (conferencia?.empresa?.nomeCadastro && conferencia?.empresa?.encontrada === false && !conferencia?.cnpj?.cnpjExtraido) {
        indicios.push(criarIndicioVerificacao({
            codigo: "empresa_nao_confirmada_no_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Empresa nÃƒÂ£o confirmada no documento",
            detalhe: `A leitura local nÃƒÂ£o confirmou a empresa ${conferencia.empresa.nomeCadastro} no documento.`,
            peso: 25,
            bloqueia: false,
            recomendacao: "Conferir visualmente se o treinamento pertence ÃƒÂ  empresa correta.",
            dados: conferencia.empresa,
        }));
    }

    if (conferencia?.treinamento?.nomeCadastro && conferencia?.treinamento?.encontrado === false && !conferencia?.documentoCorretoPorConferencia) {
        indicios.push(criarIndicioVerificacao({
            codigo: "treinamento_nao_confirmado_no_documento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Treinamento nÃƒÂ£o confirmado no texto do documento",
            detalhe: `A leitura local nÃƒÂ£o confirmou ${conferencia.treinamento.nomeCadastro} no arquivo.`,
            peso: 35,
            bloqueia: false,
            recomendacao: "Conferir manualmente se o arquivo corresponde ao treinamento selecionado.",
            dados: conferencia.treinamento,
        }));
    }

    return indicios;
}


function normalizarIndiciosDocumentoColetivoTreinamentoEtapa57({ indicios = [], conferencia = {} } = {}) {
    const listaPresenca = Boolean(
        conferencia?.listaPresenca ||
        conferencia?.lista_presenca ||
        conferencia?.documentoColetivo ||
        conferencia?.documento_coletivo
    );

    if (!listaPresenca || !Array.isArray(indicios) || !indicios.length) {
        return indicios;
    }

    return indicios.map((indicio = {}) => {
        if (indicio?.codigo !== "colaborador_nao_localizado_no_documento") {
            return indicio;
        }

        return criarIndicioVerificacao({
            ...indicio,
            codigo: "colaborador_nao_confirmado_documento_coletivo",
            tipo: indicio.tipo || DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Colaborador nao confirmado automaticamente em documento coletivo",
            detalhe: indicio.detalhe || "A leitura local/OCR nao confirmou automaticamente o nome do colaborador. Como o arquivo aparenta ser documento coletivo/lista de presenca, manter em conferencia manual em vez de bloquear automaticamente.",
            peso: Math.min(Number(indicio.peso || 25), 25),
            bloqueia: false,
            recomendacao: indicio.recomendacao || "Conferir visualmente se o documento coletivo/lista geral corresponde ao colaborador, empresa e treinamento selecionados.",
            dados: {
                ...(indicio.dados || {}),
                documentoColetivo: true,
                conferenciaManual: true,
            },
        });
    });
}

function cnpjNaoDeveGerarRiscoEmListaColetiva({ conferencia = {}, indicio = {} } = {}) {
    const codigo = String(indicio?.codigo || "").toLowerCase();
    const falaDeCnpj = codigo.includes("cnpj") ||
        normalizarTextoConferencia(`${indicio?.titulo || ""} ${indicio?.detalhe || ""}`).includes("cnpj");

    if (!falaDeCnpj) return false;

    const listaOuColetivo = Boolean(
        conferencia?.listaPresenca ||
        conferencia?.lista_presenca ||
        conferencia?.documentoColetivo ||
        conferencia?.documento_coletivo
    );
    const empresaLocalizada = conferencia?.empresa?.encontrada === true;
    const treinamentoLocalizado = conferencia?.treinamento?.encontrado === true;
    const colaboradorLocalizadoOuColetivo = conferencia?.colaborador?.encontrado === true || listaOuColetivo;
    const possuiCnpjDivergente = Boolean(conferencia?.cnpj?.cnpjExtraido && conferencia?.cnpj?.encontrado === false);

    return Boolean(
        listaOuColetivo &&
        empresaLocalizada &&
        treinamentoLocalizado &&
        colaboradorLocalizadoOuColetivo &&
        !possuiCnpjDivergente
    );
}

function filtrarIndiciosCnpjNaoObrigatorioLista({ indicios = [], conferencia = {} } = {}) {
    if (!Array.isArray(indicios) || !indicios.length) return indicios;

    return indicios.filter((indicio) => !cnpjNaoDeveGerarRiscoEmListaColetiva({ conferencia, indicio }));
}

function filtrarIndiciosListaCoerenteAprovavel({ indicios = [], conferencia = {} } = {}) {
    if (!Array.isArray(indicios) || !indicios.length) return indicios;

    const listaOuColetivo = Boolean(
        conferencia?.listaPresenca ||
        conferencia?.lista_presenca ||
        conferencia?.documentoColetivo ||
        conferencia?.documento_coletivo
    );
    const empresaLocalizada = conferencia?.empresa?.encontrada === true;
    const treinamentoLocalizado = conferencia?.treinamento?.encontrado === true;
    const dataCoerente = Boolean(conferencia?.dataCoerenteLista);
    const tokensEncontrados = Array.isArray(conferencia?.colaborador?.tokensEncontrados) ? conferencia.colaborador.tokensEncontrados : [];
    const colaboradorLocalizado = conferencia?.colaborador?.encontrado === true ||
        conferencia?.colaborador?.localizadoPorCorrespondenciaParcial === true ||
        conferencia?.colaborador?.localizadoPorPrimeiroNome === true ||
        conferencia?.colaborador?.provavelPorPrimeiroNome === true ||
        tokensEncontrados.length >= 2;
    const cnpjDivergente = Boolean(conferencia?.cnpj?.cnpjExtraido && conferencia?.cnpj?.encontrado === false);

    if (!listaOuColetivo || !empresaLocalizada || !treinamentoLocalizado || !dataCoerente || !colaboradorLocalizado) {
        return indicios;
    }

    const codigosRemoviveis = new Set([
        "colaborador_confirmado_apenas_no_texto_ocr",
        "colaborador_nao_confirmado_documento_coletivo",
        "colaborador_nao_localizado_no_documento",
        "assinatura_colaborador_nao_confirmada_lista",
        "cpf_colaborador_nao_localizado_documento",
        "empresa_nao_confirmada_no_documento",
        "treinamento_nao_confirmado_no_documento",
    ]);

    return indicios.filter((indicio = {}) => {
        const codigo = String(indicio?.codigo || "");

        if (codigosRemoviveis.has(codigo)) return false;
        if (!cnpjDivergente && cnpjNaoDeveGerarRiscoEmListaColetiva({ conferencia, indicio })) return false;

        return true;
    });
}

function fichaEpiAprovavelConferencia({ conferencia = {}, arquivo = null, leitura = {} } = {}) {
    const treinamentoNome = String(conferencia?.treinamento?.nomeCadastro || "");
    const arquivoNome = String(
        arquivo?.name ||
        arquivo?.nome ||
        arquivo?.arquivo ||
        arquivo?.filename ||
        arquivo ||
        ""
    );

    const textoLeitura = String(
        leitura?.texto ||
        leitura?.textoExtraido ||
        leitura?.texto_extraido ||
        leitura?.textoOcr ||
        leitura?.texto_ocr ||
        ""
    );

    const base = normalizarTextoConferencia(`${treinamentoNome} ${arquivoNome} ${textoLeitura}`);
    const colaborador = conferencia?.colaborador || {};
    const tokensEncontrados = Array.isArray(colaborador?.tokensEncontrados) ? colaborador.tokensEncontrados : [];

    const ehFichaEpiSelecionada =
        /nr\s*-?\s*0?6|ficha\s+(de\s+)?epi|epis\s+atualizada|controle\s+de\s+entrega\s+de\s+epi|entrega\s+de\s+epi|equipamento\s+de\s+protecao\s+individual/.test(base);

    const temEvidenciaFichaEpi =
        /ficha\s+(de\s+)?epi|controle\s+de\s+entrega|entrega\s+de\s+epi|equipamento\s+de\s+protecao\s+individual|declaracao\s+de\s+recebimento|recebimento|devolucao|\bca\b|capacete|luva|botina|oculos|protetor|respirador|uniforme|cinto/.test(base);

    const colaboradorAceito =
        colaborador?.encontrado === true ||
        colaborador?.localizadoApenasPorArquivo === true ||
        colaborador?.localizadoPorCorrespondenciaParcial === true ||
        colaborador?.localizadoPorPrimeiroNome === true ||
        colaborador?.provavelPorPrimeiroNome === true ||
        tokensEncontrados.length >= 2;

    return Boolean(ehFichaEpiSelecionada && temEvidenciaFichaEpi && colaboradorAceito);
}

function filtrarIndiciosFichaEpiAprovavel({ indicios = [], conferencia = {}, arquivo = null, leitura = {} } = {}) {
    if (!fichaEpiAprovavelConferencia({ conferencia, arquivo, leitura })) return indicios;

    const codigosTolerados = new Set([
        "data_impressa_nao_confirmada_automaticamente",
        "treinamento_nao_confirmado_no_documento",
        "colaborador_localizado_por_nome_arquivo",
        "colaborador_confirmado_apenas_no_texto_ocr",
        "assinatura_colaborador_nao_confirmada_lista",
        "cpf_colaborador_nao_localizado_documento",
    ]);

    return indicios.filter((indicio) => {
        const codigo = String(indicio?.codigo || "");
        const textoIndicio = normalizarTextoConferencia(`${codigo} ${indicio?.titulo || ""} ${indicio?.detalhe || ""}`);

        if (codigosTolerados.has(codigo)) return false;

        if (
            /data.*realizacao|realizacao.*data|data.*emissao|emissao.*data|sem.*data|data.*nao.*informada|nao.*possui.*data/.test(textoIndicio) &&
            /certificado|documento|realizacao|emissao/.test(textoIndicio)
        ) {
            return false;
        }

        return true;
    });
}
function aplicarAprovacaoControladaListaColetiva({ resultado = {}, conferencia = {}, indicios = [] } = {}) {
    const listaOuColetivo = Boolean(
        conferencia?.listaPresenca ||
        conferencia?.lista_presenca ||
        conferencia?.documentoColetivo ||
        conferencia?.documento_coletivo
    );
    const empresaLocalizada = conferencia?.empresa?.encontrada === true;
    const treinamentoLocalizado = conferencia?.treinamento?.encontrado === true;
    const dataCoerente = Boolean(conferencia?.dataCoerenteLista);
    const cnpjDivergente = Boolean(conferencia?.cnpj?.cnpjExtraido && conferencia?.cnpj?.encontrado === false);
    const possuiBloqueio = Array.isArray(indicios) && indicios.some((indicio) => indicio?.bloqueia);
    const colaborador = conferencia?.colaborador || {};
    const assinatura = conferencia?.assinatura || {};
    const tokensEncontrados = Array.isArray(colaborador?.tokensEncontrados) ? colaborador.tokensEncontrados : [];
    const colaboradorAceito = colaborador?.encontrado === true ||
        colaborador?.localizadoPorCorrespondenciaParcial === true ||
        colaborador?.localizadoPorPrimeiroNome === true ||
        colaborador?.provavelPorPrimeiroNome === true ||
        tokensEncontrados.length >= 2;

    const podeAprovar = Boolean(
        listaOuColetivo &&
        empresaLocalizada &&
        treinamentoLocalizado &&
        dataCoerente &&
        colaboradorAceito &&
        !cnpjDivergente &&
        !possuiBloqueio
    );

    if (!podeAprovar) {
        return {
            resultado,
            conferencia,
            aprovacaoControlada: false,
            conferenciaVisual: false,
        };
    }

    const conferenciaVisual = Boolean(
        colaborador?.provavelPorPrimeiroNome ||
        colaborador?.localizadoPorPrimeiroNome ||
        colaborador?.localizadoPorCorrespondenciaParcial ||
        tokensEncontrados.length >= 2 ||
        assinatura?.visualLocalizada !== true
    );

    const resultadoFinal = {
        ...resultado,
        status_verificacao: "aprovado",
        nivel_risco: "baixo",
        score_risco: 0,
        indicios: [],
        recomendacoes: conferenciaVisual
            ? ["Aprovado com conferência visual."]
            : [],
        resumo: conferenciaVisual
            ? "Aprovado com conferência visual."
            : "Aprovado automaticamente.",
        aprovacao_controlada: true,
        conferencia_visual: conferenciaVisual,
    };

    const conferenciaFinal = {
        ...conferencia,
        aprovacaoControlada: true,
        conferenciaVisual,
        colaborador: {
            ...colaborador,
            encontrado: true,
            confiancaIdentificacao: conferenciaVisual ? (colaborador.confiancaIdentificacao || "media") : "alta",
            observacaoIdentificacao: conferenciaVisual
                ? (colaborador.observacaoIdentificacao || "Colaborador localizado com conferÃªncia visual.")
                : (colaborador.observacaoIdentificacao || ""),
        },
        assinatura: {
            ...assinatura,
            aplicavel: true,
            observacao: conferenciaVisual
                ? (assinatura.observacao || "Assinatura aplicÃ¡vel. Conferir visualmente a assinatura na linha do colaborador.")
                : (assinatura.observacao || "Assinatura localizada."),
        },
        cnpj: {
            ...conferencia?.cnpj,
            obrigatorio: false,
            observacao: conferencia?.cnpj?.observacao || "NÃ£o exigido para este tipo de documento.",
        },
    };

    return {
        resultado: resultadoFinal,
        conferencia: conferenciaFinal,
        aprovacaoControlada: true,
        conferenciaVisual,
    };
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
    const camposExtraidosFuncaoAso = leituraDocumental?.camposExtraidos || {};

    const tipoDocumentoDetectadoFuncaoAso = String(
        camposExtraidosFuncaoAso.tipo_documento ||
        ""
    ).trim();

    const tipoDocumentoSelecionadoFuncaoAso = String(
        obterTipoCertificado(
            certificado,
            treinamento
        ) ||
        ""
    ).trim();

    const tipoDocumentoSelecionadoNormalizadoFuncaoAso =
        normalizarTextoVerificacao(
            tipoDocumentoSelecionadoFuncaoAso
        );

    const funcaoDocumentoNormalizadaFuncaoAso = String(
        camposExtraidosFuncaoAso.funcao_documento_normalizada ||
        normalizarTextoVerificacao(
            camposExtraidosFuncaoAso.funcao_documento ||
            ""
        )
    ).trim();

    /*
     * A classificacao OCR nao pode cancelar a conferencia quando:
     * - o usuario selecionou NR-07 ASO; e
     * - a funcao foi efetivamente extraida do documento.
     *
     * Isso protege o fluxo contra ASOs que citam PCMSO no corpo.
     */
    const selecaoIndicaAso = Boolean(
        tipoDocumentoSelecionadoNormalizadoFuncaoAso.includes(
            "atestado de saude ocupacional"
        ) ||
        /\baso\b/.test(
            tipoDocumentoSelecionadoNormalizadoFuncaoAso
        )
    );

    const tipoDocumentoComparacaoFuncaoAso =
        selecaoIndicaAso &&
        funcaoDocumentoNormalizadaFuncaoAso
            ? tipoDocumentoSelecionadoFuncaoAso
            : (
                tipoDocumentoDetectadoFuncaoAso ||
                tipoDocumentoSelecionadoFuncaoAso
            );

    const comparacaoFuncaoAsoBase =
        compararFuncaoAsoComCadastro({
            tipoDocumento:
                tipoDocumentoComparacaoFuncaoAso,
            funcaoDocumento:
                camposExtraidosFuncaoAso.funcao_documento ||
                "",
            funcaoDocumentoNormalizada:
                funcaoDocumentoNormalizadaFuncaoAso,
            funcaoDocumentoConfianca:
                camposExtraidosFuncaoAso.funcao_documento_confianca ||
                "",
            funcaoDocumentoOrigem:
                camposExtraidosFuncaoAso.funcao_documento_origem ||
                "",
            funcaoCadastro:
                colaborador.funcao ||
                colaborador.cargo ||
                colaborador.cargo_funcao ||
                "",

            /*
             * G4-D-R1-R1:
             * o comparador ASO é puro e recebe aqui o
             * catálogo efetivamente ativo no SafeScan:
             * base + remotas + personalizadas.
             */
            matrizesFuncao:
                obterTodasMatrizesFuncao(),
        });

    const comparacaoFuncaoAso = {
        ...comparacaoFuncaoAsoBase,
        tipoDocumentoDetectado:
            tipoDocumentoDetectadoFuncaoAso,
        tipoDocumentoSelecionado:
            tipoDocumentoSelecionadoFuncaoAso,
        tipoDocumentoUsado:
            tipoDocumentoComparacaoFuncaoAso,
        selecaoIndicavaAso:
            selecaoIndicaAso,
    };
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

    const indiciosBrutos = [
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

    const indiciosBrutosNormalizados = normalizarIndiciosDocumentoColetivoTreinamentoEtapa57({
        indicios: indiciosBrutos,
        conferencia: conferenciaDocumental,
    });
    const indiciosSemCnpjNaoObrigatorio = filtrarIndiciosCnpjNaoObrigatorioLista({
        indicios: indiciosBrutosNormalizados,
        conferencia: conferenciaDocumental,
    });
    const indiciosAjustadosFichaEpi = filtrarIndiciosFichaEpiAprovavel({
        indicios: indiciosSemCnpjNaoObrigatorio,
        conferencia: conferenciaDocumental,
        arquivo: arquivoValidoParaHash,
        leitura: leituraDocumental,
    });
    const indiciosListaCoerente = filtrarIndiciosListaCoerenteAprovavel({
        indicios: indiciosAjustadosFichaEpi,
        conferencia: conferenciaDocumental,
    });

    const indiciosPreConferencia = conferenciaDocumental?.documentoCorretoPorConferencia
        ? indiciosListaCoerente.filter((indicio = {}) => ![
            "treinamento_nao_confirmado_no_documento",
            "data_impressa_nao_confirmada_automaticamente",
            "empresa_nao_confirmada_no_documento",
            "assinatura_colaborador_nao_confirmada_lista",
        ].includes(indicio.codigo))
        : indiciosListaCoerente;

    const indicios = filtrarDataNaoConfirmadaFichaRegistroAprovavel({
        indicios: indiciosPreConferencia,
        certificado,
        treinamento,
        conferencia: conferenciaDocumental,
    });

    const dataRealizacaoFinal = obterDataRealizacaoCertificadoVerificacao({
        certificado,
        treinamento,
        conferencia: conferenciaDocumental,
        leitura: leituraDocumental,
    });

    const resultadoBase = montarResultadoVerificacaoBase({ indicios });
    const resultado = aplicarRevisaoManualQuandoDataNaoConfirmada(resultadoBase, indicios);
    const consolidadoAutomatico = aplicarAprovacaoControladaListaColetiva({
        resultado,
        conferencia: conferenciaDocumental,
        indicios,
    });
    const resultadoFinal = consolidadoAutomatico.resultado;
    const conferenciaDocumentalFinal = consolidadoAutomatico.conferencia;
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
        data_realizacao: formatarDataIsoVerificacao(dataRealizacaoFinal),
        data_vencimento: formatarDataIsoVerificacao(certificado.data_vencimento || certificado.dataVencimento),
        origem_analise: leituraDocumental?.executado || leituraDocumental?.datasEncontradas?.length
            ? DOCUMENTOS_VERIFICACAO_ORIGEM_ANALISE.OCR_LOCAL
            : DOCUMENTOS_VERIFICACAO_ORIGEM_ANALISE.REGRAS_LOCAIS,
        retorno_ia: retornoLeituraDocumental ? {
            leitura_documental_local: retornoLeituraDocumental,
            comparacao_funcao_aso: comparacaoFuncaoAso,
            conferencia_documental: conferenciaDocumentalFinal,
            aprovacao_controlada: consolidadoAutomatico.aprovacaoControlada,
            conferencia_visual: consolidadoAutomatico.conferenciaVisual,
        } : null,
        ocr_texto: leituraDocumental?.textoExtraido || null,
        analisado_por_ia: false,
        ...resultadoFinal,
    };
}

export async function salvarVerificacaoDocumental({
    supabase,
    verificacao,
    usuario = null,
} = {}) {
    if (!supabase) {
        throw new Error("Cliente Supabase nÃƒÂ£o informado para salvar verificaÃƒÂ§ÃƒÂ£o documental.");
    }

    if (!verificacao?.origem_tipo || !verificacao?.origem_tabela) {
        throw new Error("Dados de origem da verificaÃƒÂ§ÃƒÂ£o documental nÃƒÂ£o informados.");
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
        throw new Error(`Erro ao salvar verificaÃƒÂ§ÃƒÂ£o documental: ${error.message}`);
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
        throw new Error("Cliente Supabase nÃƒÂ£o informado para listar verificaÃƒÂ§ÃƒÂµes documentais.");
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
        throw new Error(`Erro ao listar verificaÃƒÂ§ÃƒÂµes documentais: ${error.message}`);
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
        throw new Error("Cliente Supabase nÃƒÂ£o informado para obter verificaÃƒÂ§ÃƒÂ£o documental.");
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
        throw new Error(`Erro ao obter ÃƒÂºltima verificaÃƒÂ§ÃƒÂ£o documental: ${error.message}`);
    }

    return data?.[0] ? normalizarVerificacaoDocumental(data[0]) : null;
}


