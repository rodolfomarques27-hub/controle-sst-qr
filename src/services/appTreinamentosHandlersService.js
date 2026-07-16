import {
    atualizarDatasCertificadoCrud,
    excluirCertificadoTreinamentoCrud,
    gerarUrlVisualizacaoCertificado,
    salvarCertificadoTreinamentoCrud,
} from "./certificadosCrudService";
import {
    excluirArquivoStorageAuditoriaService,
    listarArquivosCertificadosStorageService,
    sincronizarCertificadosDoStorageService,
} from "./storageAuditoriaService";
import { obterTreinamento, treinamentoSemValidade } from "./colaboradorDocumentosService";

function arquivoPossuiArrayBuffer(arquivo = null) {
    return Boolean(
        arquivo &&
        typeof arquivo === "object" &&
        typeof arquivo.arrayBuffer === "function"
    );
}

function obterArquivoValidoParaAnalise(arquivo = null) {
    return arquivoPossuiArrayBuffer(arquivo) ? arquivo : null;
}

function obterNomeArquivoEntrada(arquivo = null) {
    if (!arquivo) return "";

    if (typeof arquivo === "string") {
        return arquivo;
    }

    return arquivo.name || arquivo.nome || arquivo.filename || "";
}

function normalizarTextoBloqueioColaborador(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function apenasDigitosBloqueio(valor = "") {
    return String(valor || "").replace(/\D/g, "");
}

function obterNomeColaboradorBloqueio(colaborador = {}, certificado = {}) {
    return String(
        colaborador?.nome ||
        colaborador?.nomeCompleto ||
        colaborador?.nome_completo ||
        certificado?.colaborador_nome ||
        certificado?.colaboradorNome ||
        certificado?.colaborador?.nome ||
        ""
    ).trim();
}

function obterIdentificadoresColaboradorBloqueio(colaborador = {}, certificado = {}) {
    return {
        id: String(colaborador?.id || certificado?.colaborador_id || certificado?.colaboradorId || certificado?.colaborador?.id || ""),
        codigo: String(colaborador?.codigoFuncionario || colaborador?.codigo_funcionario || certificado?.colaboradorCodigo || certificado?.colaborador?.codigoFuncionario || ""),
    };
}

function tokensNomeColaboradorBloqueio(nome = "") {
    return normalizarTextoBloqueioColaborador(nome)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) =>
            token.length >= 3 &&
            !["dos", "das", "de", "da", "do", "e", "nr", "aso", "pdf", "jpeg", "jpg", "png", "webp"].includes(token)
        );
}

function pontuarNomeColaboradorNoTextoBloqueio({ texto = "", nome = "" } = {}) {
    const base = normalizarTextoBloqueioColaborador(texto);
    const tokens = tokensNomeColaboradorBloqueio(nome);

    if (!base || tokens.length < 2) {
        return {
            encontrado: false,
            score: 0,
            tokensEncontrados: [],
            totalTokens: tokens.length,
        };
    }

    const tokensEncontrados = tokens.filter((token) => base.includes(token));
    const primeiro = tokens[0];
    const ultimo = tokens[tokens.length - 1];
    const contemPrimeiro = base.includes(primeiro);
    const contemUltimo = base.includes(ultimo);
    const proporcao = tokensEncontrados.length / tokens.length;
    const score = (proporcao * 100) + (contemPrimeiro ? 10 : 0) + (contemUltimo ? 10 : 0);

    const encontrado = Boolean(
        (proporcao >= 0.75 && (contemPrimeiro || contemUltimo)) ||
        (tokensEncontrados.length >= 3 && contemPrimeiro) ||
        (tokensEncontrados.length >= 2 && contemPrimeiro && contemUltimo)
    );

    return {
        encontrado,
        score,
        tokensEncontrados,
        totalTokens: tokens.length,
    };
}

function localizarColaboradorDiferenteNoNomeArquivo({ certificado = {}, colaboradores = [], colaboradorSelecionado = {} } = {}) {
    const nomeArquivo = obterNomeArquivoEntrada(certificado?.arquivo) || certificado?.arquivoNome || certificado?.arquivo_nome || "";
    if (!nomeArquivo) return null;

    const nomeSelecionado = obterNomeColaboradorBloqueio(colaboradorSelecionado, certificado);
    const pontuacaoSelecionado = pontuarNomeColaboradorNoTextoBloqueio({
        texto: nomeArquivo,
        nome: nomeSelecionado,
    });

    if (pontuacaoSelecionado.encontrado) return null;

    const identificadoresSelecionado = obterIdentificadoresColaboradorBloqueio(colaboradorSelecionado, certificado);

    const candidato = (colaboradores || [])
        .filter((colaborador) => {
            const identificadores = obterIdentificadoresColaboradorBloqueio(colaborador, {});
            const mesmoId = identificadoresSelecionado.id && identificadores.id && identificadoresSelecionado.id === identificadores.id;
            const mesmoCodigo = identificadoresSelecionado.codigo && identificadores.codigo && identificadoresSelecionado.codigo === identificadores.codigo;

            return !mesmoId && !mesmoCodigo;
        })
        .map((colaborador) => {
            const nome = obterNomeColaboradorBloqueio(colaborador, {});
            const pontuacao = pontuarNomeColaboradorNoTextoBloqueio({
                texto: nomeArquivo,
                nome,
            });

            return {
                colaborador,
                nome,
                ...pontuacao,
            };
        })
        .filter((item) => item.encontrado)
        .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))[0];

    return candidato || null;
}

function obterTreinamentoParaVerificacaoCertificado({ certificado = {}, certificadoNormalizado = {} } = {}) {
    const treinamentoId = Number(certificadoNormalizado.treinamentoId || certificado.treinamentoId || certificado.treinamento_codigo || certificado.treinamento_id || 0);
    const treinamento = obterTreinamento(treinamentoId) || {
        id: treinamentoId || null,
        nome: certificadoNormalizado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || "",
    };

    return {
        treinamentoId,
        treinamento,
    };
}

function montarCertificadoParaVerificacao({
    certificado = {},
    certificadoNormalizado = {},
    colaborador = {},
    treinamento = {},
} = {}) {
    const nomeArquivoEntrada = obterNomeArquivoEntrada(certificado.arquivo);

    return {
        ...certificado,
        id: certificadoNormalizado.id || certificado.id || null,
        colaborador_id: certificadoNormalizado.colaboradorId || certificado.colaborador_id || certificado.colaboradorId || colaborador.id || null,
        colaboradorId: certificadoNormalizado.colaboradorId || certificado.colaboradorId || colaborador.id || null,
        treinamento_codigo: Number(certificadoNormalizado.treinamentoId || certificado.treinamentoId || certificado.treinamento_codigo || 0) || certificado.treinamentoId || null,
        treinamentoId: Number(certificadoNormalizado.treinamentoId || certificado.treinamentoId || certificado.treinamento_codigo || 0) || certificado.treinamentoId || null,
        tipo_treinamento: certificadoNormalizado.nomeTreinamento || certificado.tipo_treinamento || treinamento.nome || "",
        nome_treinamento: certificadoNormalizado.nomeTreinamento || certificado.nome_treinamento || treinamento.nome || "",
        data_realizacao: certificadoNormalizado.realizado || certificadoNormalizado.dataRealizacao || certificado.dataRealizacao || certificado.data_realizacao || "",
        dataRealizacao: certificadoNormalizado.realizado || certificadoNormalizado.dataRealizacao || certificado.dataRealizacao || certificado.data_realizacao || "",
        data_vencimento: certificadoNormalizado.vencimento || certificadoNormalizado.dataVencimento || certificado.dataVencimento || certificado.data_vencimento || "",
        dataVencimento: certificadoNormalizado.vencimento || certificadoNormalizado.dataVencimento || certificado.dataVencimento || certificado.data_vencimento || "",
        arquivo_url: certificadoNormalizado.arquivoUrl || certificado.arquivo_url || certificado.arquivoUrl || "",
        arquivoUrl: certificadoNormalizado.arquivoUrl || certificado.arquivoUrl || certificado.arquivo_url || "",
        arquivo_nome: certificadoNormalizado.arquivoNome || certificado.arquivoNome || certificado.arquivo_nome || nomeArquivoEntrada || "",
        arquivoNome: certificadoNormalizado.arquivoNome || certificado.arquivoNome || certificado.arquivo_nome || nomeArquivoEntrada || "",
        observacao: certificado.observacao || certificadoNormalizado.observacao || null,
    };
}

function indicioCpfDivergenteVerificacao(indicio = {}) {
    if (indicio?.codigo !== "cpf_colaborador_nao_localizado_documento") return false;

    const dados = indicio?.dados || {};
    const cpfCadastro = apenasDigitosBloqueio(dados.cpfCadastro);
    const cpfsExtraidos = Array.isArray(dados.cpfsExtraidos)
        ? dados.cpfsExtraidos.map(apenasDigitosBloqueio).filter((valor) => valor.length === 11)
        : [];

    return Boolean(cpfCadastro && cpfsExtraidos.length && !cpfsExtraidos.includes(cpfCadastro));
}


function indicioDocumentoColetivoNaoConfirmado(indicio = {}, verificacao = {}) {
    const codigo = indicio?.codigo || "";
    const dados = indicio?.dados || {};

    if (
        codigo !== "colaborador_nao_localizado_no_documento" &&
        codigo !== "colaborador_nao_confirmado_documento_coletivo"
    ) {
        return false;
    }

    if (dados?.documentoColetivo === true || dados?.documentoColetivo === "true") {
        return true;
    }

    const texto = [
        indicio?.titulo,
        indicio?.detalhe,
        indicio?.recomendacao,
        verificacao?.nome_documento,
        verificacao?.nomeDocumento,
        verificacao?.arquivo_nome,
        verificacao?.arquivoNome,
        verificacao?.tipo_documento,
        verificacao?.tipoDocumento,
        verificacao?.resumo,
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

    const documentoIndividual = /\b(aso|atestado de saude ocupacional|ficha epi|ficha de epi|ficha registro|ficha de registro|ordem de servico|\bos\b)\b/.test(texto);
    if (documentoIndividual) return false;

    const coletivo = /\b(documento coletivo|geral|integracao|treinamento|lista de presenca|presenca|nr\s*\d+|nr\d+|ergonomia|seguranca|escavacoes|fundacoes|protecao solar|meio ambiente|residuos|sinalizacao|transito|transporte|movimentacao|maquinas|equipamentos)\b/.test(texto);

    return coletivo;
}


function verificacaoPareceListaPresencaOuColetivo(verificacao = {}) {
    const texto = [
        verificacao?.nome_documento,
        verificacao?.nomeDocumento,
        verificacao?.arquivo_nome,
        verificacao?.arquivoNome,
        verificacao?.tipo_documento,
        verificacao?.tipoDocumento,
        verificacao?.resumo,
        verificacao?.ocr_texto,
        verificacao?.ocrTexto,
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

    const individual = /\b(aso|atestado de saude ocupacional|ficha epi|ficha registro|ordem de servico|\bos\b)\b/.test(texto);
    if (individual) return false;

    return /\b(lista de presenca|documento coletivo|geral|integracao|treinamento|nr\s*\d+|nr\d+|ergonomia|seguranca|escavacoes|fundacoes|protetor solar|meio ambiente|residuos|sinalizacao|transito|transporte|movimentacao|maquinas|equipamentos)\b/.test(texto);
}

function indicioNomeDiferenteOuColaboradorDivergente(indicio = {}) {
    const codigo = String(indicio?.codigo || "").toLowerCase();
    const texto = [
        indicio?.codigo,
        indicio?.titulo,
        indicio?.mensagem,
        indicio?.descricao,
        indicio?.detalhe,
        indicio?.motivo,
        indicio?.texto,
        indicio?.recomendacao,
    ]
        .filter(Boolean)
        .join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    const falaDeDivergencia =
        codigo.includes("diverg") ||
        codigo.includes("outro_colaborador") ||
        codigo.includes("colaborador_diferente") ||
        texto.includes("nome diferente") ||
        texto.includes("outro colaborador") ||
        texto.includes("colaborador diferente") ||
        texto.includes("divergencia de colaborador");

    const falaDeLeituraFraca =
        texto.includes("nao localizado") ||
        texto.includes("nao encontrou") ||
        texto.includes("nao confirmado") ||
        texto.includes("apenas no texto") ||
        texto.includes("nome do arquivo") ||
        texto.includes("assinatura nao confirmada");

    return Boolean(falaDeDivergencia && !falaDeLeituraFraca);
}

function obterIndiciosBloqueantesAntesSalvar(verificacao = {}) {
    const codigosBloqueioForte = new Set([
        "cnpj_empresa_nao_confere_documento",
        "cnpj_documento_diverge_empresa_selecionada",
    ]);

    const codigosNaoBloqueiamPorLeituraFraca = new Set([
        "colaborador_nao_localizado_no_documento",
        "colaborador_nao_confirmado_documento_coletivo",
        "colaborador_confirmado_apenas_no_texto_ocr",
        "assinatura_colaborador_nao_confirmada_lista",
        "colaborador_localizado_por_nome_arquivo",
        "cpf_colaborador_nao_localizado_documento",
        "empresa_nao_confirmada_no_documento",
        "treinamento_nao_confirmado_no_documento",
        "data_impressa_nao_confirmada_automaticamente",
    ]);

    return (Array.isArray(verificacao?.indicios) ? verificacao.indicios : [])
        .filter((indicio = {}) => {
            const codigo = String(indicio?.codigo || "");

            if (codigosNaoBloqueiamPorLeituraFraca.has(codigo)) {
                return false;
            }

            return codigosBloqueioForte.has(codigo) ||
                indicioCpfDivergenteVerificacao(indicio) ||
                indicioNomeDiferenteOuColaboradorDivergente(indicio);
        });
}

function limparMensagemBloqueioDocumento(valor = "") {
    return String(valor || "")
        .split("\\n").join(" ")
        .split("\\r").join(" ")
        .split("?").join("")
        .split("?").join("")
        .split("?").join("")
        .replace(/\s+/g, " ")
        .trim();
}

function montarMensagemBloqueioAntesSalvar({ indicios = [] } = {}) {
    const principal = indicios[0] || {};
    const codigo = String(principal.codigo || "");
    const detalheOriginal = principal.detalhe || principal.titulo || "A verificacao documental encontrou divergencia."; 
    const detalheLimpo = limparMensagemBloqueioDocumento(detalheOriginal);

    if (codigo === "colaborador_nao_localizado_no_documento" ||
        codigo === "colaborador_nao_confirmado_documento_coletivo" ||
        codigo === "colaborador_confirmado_apenas_no_texto_ocr" ||
        codigo === "assinatura_colaborador_nao_confirmada_lista") {
        return [
            "Nao foi possivel confirmar automaticamente este documento.",
            "Motivo: o leitor local/OCR nao confirmou o nome e/ou a assinatura do colaborador no PDF.",
            "Revise visualmente o documento. Se o nome e a assinatura estiverem corretos, mantenha para conferencia manual; se aparecer outro colaborador, substitua o arquivo.",
        ].join("\\n");
    }

    return [
        "Nao foi possivel salvar este documento.",
        `Motivo: ${detalheLimpo}`,
        "Revise o documento antes de tentar salvar novamente.",
    ].join("\\n");
}

function normalizarTextoValidacaoNomeArquivo(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function obterNomeArquivoCertificadoValidacao(certificado = {}) {
    return (
        certificado?.arquivo?.name ||
        certificado?.arquivoNome ||
        certificado?.arquivo_nome ||
        certificado?.nomeArquivo ||
        ""
    );
}

function arquivoPareceDocumentoIndividualValidacao(nomeArquivo = "") {
    const texto = normalizarTextoValidacaoNomeArquivo(nomeArquivo);

    if (!texto) return false;

    const ehColetivo = /\b(geral|lista|presenca|coletivo)\b/.test(texto);

    if (ehColetivo) return false;

    return /\b(aso|atestado|ficha|epi|epis|registro|reg|clt|esocial|ordem|servico|os|certif|certificado|nr\s*0?6|nr0?6)\b/.test(texto);
}

function extrairTokensNomeArquivoValidacao(nomeArquivo = "") {
    const texto = normalizarTextoValidacaoNomeArquivo(nomeArquivo)
        .replace(/\b(pdf|png|jpg|jpeg|webp|aso|atestado|saude|ocupacional|ficha|epi|epis|registro|reg|clt|esocial|ordem|servico|certif|certificado|treinamento|documento|nr|nr0?6|nr\s*0?6)\b/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return texto
        .split(" ")
        .map((token) => token.trim())
        .filter(Boolean);
}

function nomeArquivoCompativelComColaboradorValidacao({ nomeArquivo = "", nomeColaborador = "" } = {}) {
    const tokensArquivo = extrairTokensNomeArquivoValidacao(nomeArquivo);
    const tokensColaborador = normalizarTextoValidacaoNomeArquivo(nomeColaborador)
        .split(" ")
        .filter((token) => token.length >= 3 && !["dos", "das", "de", "da", "do"].includes(token));

    if (!tokensArquivo.length || !tokensColaborador.length) return false;

    const fortesArquivo = tokensArquivo.filter((token) => token.length >= 3);
    const primeiroColaborador = tokensColaborador[0];
    const ultimoColaborador = tokensColaborador[tokensColaborador.length - 1];

    const fortesEncontrados = fortesArquivo.filter((token) =>
        tokensColaborador.includes(token) ||
        tokensColaborador.some((cadastro) => cadastro.includes(token) || token.includes(cadastro))
    );

    const encontrouPrimeiro = Boolean(primeiroColaborador && fortesArquivo.includes(primeiroColaborador));
    const encontrouUltimo = Boolean(ultimoColaborador && fortesArquivo.includes(ultimoColaborador));

    const iniciaisArquivo = tokensArquivo.filter((token) => token.length === 1);
    const inicialIntermediariaCompativel = iniciaisArquivo.some((inicial) =>
        tokensColaborador.some((token) => token.startsWith(inicial))
    );

    if (encontrouPrimeiro && encontrouUltimo) return true;
    if (fortesEncontrados.length >= 2 && encontrouPrimeiro) return true;
    if (fortesEncontrados.length >= 2 && inicialIntermediariaCompativel) return true;

    return false;
}

function indicioBloqueiaSomentePorNomeNaoLidoValidacao(indicio = {}) {
    const texto = normalizarTextoValidacaoNomeArquivo([
        indicio?.codigo,
        indicio?.titulo,
        indicio?.mensagem,
        indicio?.descricao,
        indicio?.detalhe,
        indicio?.motivo,
        indicio?.texto,
    ].filter(Boolean).join(" "));

    if (!texto) return false;

    const falaDeColaborador = texto.includes("colaborador") || texto.includes("nome");
    const falaNaoLocalizado =
        texto.includes("nao localizado") ||
        texto.includes("nao encontrou") ||
        texto.includes("nao confirmado") ||
        texto.includes("ocr nao encontrou");

    const divergenciaForte =
        texto.includes("cpf") ||
        texto.includes("cnpj") ||
        texto.includes("diverg") ||
        texto.includes("outro colaborador") ||
        texto.includes("outra empresa") ||
        texto.includes("empresa divergente");

    return Boolean(falaDeColaborador && falaNaoLocalizado && !divergenciaForte);
}

function podePermitirSalvarPorNomeArquivoCompativel({
    certificado = {},
    colaborador = null,
    indiciosBloqueantes = [],
} = {}) {
    if (!Array.isArray(indiciosBloqueantes) || !indiciosBloqueantes.length) return false;

    const nomeArquivo = obterNomeArquivoCertificadoValidacao(certificado);
    const nomeColaborador = colaborador?.nome || certificado?.colaborador?.nome || "";

    if (!arquivoPareceDocumentoIndividualValidacao(nomeArquivo)) return false;

    if (!nomeArquivoCompativelComColaboradorValidacao({ nomeArquivo, nomeColaborador })) {
        return false;
    }

    return indiciosBloqueantes.every(indicioBloqueiaSomentePorNomeNaoLidoValidacao);
}


async function validarCertificadoAntesDoSalvamento({
    supabase,
    certificado,
    colaboradores,
    colaboradorSelecionado,
}) {
    const colaborador = localizarColaboradorParaVerificacao({
        certificado,
        certificadoNormalizado: {},
        colaboradores,
        colaboradorSelecionado,
    });

    const arquivoValidoParaAnalise = obterArquivoValidoParaAnalise(certificado.arquivo);
    if (!arquivoValidoParaAnalise) return null;

    const { verificarCertificadoTreinamento } = await import("./documentosVerificacaoService");
    const { treinamentoId, treinamento } = obterTreinamentoParaVerificacaoCertificado({ certificado });
    const certificadoParaVerificacao = montarCertificadoParaVerificacao({
        certificado,
        certificadoNormalizado: {},
        colaborador,
        treinamento,
    });

    const verificacao = await verificarCertificadoTreinamento({
        supabase,
        certificado: certificadoParaVerificacao,
        colaborador,
        treinamento,
        arquivo: arquivoValidoParaAnalise,
        registrosExistentes: [],
        usuario: null,
        salvarResultado: false,
        exigeVencimento: !treinamentoSemValidade(treinamentoId),
    });

    const indiciosBloqueantes = obterIndiciosBloqueantesAntesSalvar(verificacao);
    const colaboradorReferenciaValidacao =
        certificado?.colaborador ||
        colaboradorSelecionado ||
        colaboradores.find((colaborador) =>
            String(colaborador.codigoFuncionario || "") === String(certificado?.colaboradorCodigo || "")
        ) ||
        null;

    const permitirPorNomeArquivoCompativel = podePermitirSalvarPorNomeArquivoCompativel({
        certificado,
        colaborador: colaboradorReferenciaValidacao,
        indiciosBloqueantes,
    });

    if (indiciosBloqueantes.length && !permitirPorNomeArquivoCompativel) {
        throw new Error(montarMensagemBloqueioAntesSalvar({ indicios: indiciosBloqueantes }));
    }

    if (permitirPorNomeArquivoCompativel) {
        console.warn(
            "Salvamento permitido com conferência manual: OCR não confirmou o nome, mas o nome do arquivo é compatível com o colaborador selecionado."
        );
    }

    return verificacao;
}


function ehFichaRegistroTreinamentoApp({ certificado = {}, certificadoNormalizado = {}, treinamento = {} } = {}) {
    const texto = [
        certificado?.treinamento?.nome,
        certificado?.nomeTreinamento,
        certificado?.nome_treinamento,
        certificado?.tipo_treinamento,
        certificado?.arquivoNome,
        certificado?.arquivo_nome,
        certificado?.arquivo,
        certificadoNormalizado?.nomeTreinamento,
        certificadoNormalizado?.nome_treinamento,
        certificadoNormalizado?.tipo_treinamento,
        treinamento?.nome,
        treinamento?.tipo,
        treinamento?.categoria,
        treinamento?.base,
    ].filter(Boolean).join(" ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

    return /ficha\s+(de\s+)?registro|registro\s+(de\s+)?empregado|registro\s+clt|\bclt\b|e\s*social|\besocial\b|data\s+de\s+admissao/.test(texto);
}
function converterStatusVerificacaoParaStatusCertificado(statusVerificacao = "") {
    const status = String(statusVerificacao || "").trim().toLowerCase();

    if (status === "aprovado") return "Aprovado";
    if (status === "atencao") return "Atenção";
    if (status === "revisao_manual") return "Revisão manual";
    if (status === "suspeito") return "Suspeito";
    if (status === "bloqueado") return "Bloqueado";
    if (status === "erro") return "Erro na verificação";

    return "Pendente de verificação";
}

function localizarColaboradorParaVerificacao({ certificado = {}, certificadoNormalizado = {}, colaboradores = [], colaboradorSelecionado = null } = {}) {
    return (
        colaboradores.find((colaborador) => String(colaborador.id) === String(certificadoNormalizado.colaboradorId || certificado.colaborador_id || certificado.colaboradorId || "")) ||
        colaboradores.find((colaborador) => String(colaborador.codigoFuncionario) === String(certificado.colaboradorCodigo || certificado.colaborador?.codigoFuncionario || "")) ||
        colaboradores.find((colaborador) => String(colaborador.id) === String(certificado.colaborador?.id || "")) ||
        colaboradorSelecionado ||
        certificado.colaborador ||
        {}
    );
}

function atualizarCertificadoNosEstados({ setColaboradores, setColaboradorSelecionado, certificadoAtualizado }) {
    setColaboradores((atual) =>
        atual.map((colaborador) => {
            if (String(colaborador.id) !== String(certificadoAtualizado.colaboradorId)) return colaborador;

            return {
                ...colaborador,
                treinamentos: (colaborador.treinamentos || []).map((item) =>
                    item.id === certificadoAtualizado.id ? { ...item, ...certificadoAtualizado } : item
                ),
            };
        })
    );

    setColaboradorSelecionado((atual) => {
        if (!atual || String(atual.id) !== String(certificadoAtualizado.colaboradorId)) return atual;

        return {
            ...atual,
            treinamentos: (atual.treinamentos || []).map((item) =>
                item.id === certificadoAtualizado.id ? { ...item, ...certificadoAtualizado } : item
            ),
        };
    });
}

async function executarVerificacaoCertificadoSemBloquearFluxo({
    supabase,
    certificado,
    certificadoNormalizado,
    colaboradores,
    colaboradorSelecionado,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    try {
        const { verificarCertificadoTreinamento } = await import("./documentosVerificacaoService");

        const { treinamentoId, treinamento } = obterTreinamentoParaVerificacaoCertificado({
            certificado,
            certificadoNormalizado,
        });
        const colaborador = localizarColaboradorParaVerificacao({
            certificado,
            certificadoNormalizado,
            colaboradores,
            colaboradorSelecionado,
        });
        const arquivoValidoParaAnalise = obterArquivoValidoParaAnalise(certificado.arquivo);
        const certificadoParaVerificacao = montarCertificadoParaVerificacao({
            certificado,
            certificadoNormalizado,
            colaborador,
            treinamento,
        });

        const verificacao = await verificarCertificadoTreinamento({
            supabase,
            certificado: certificadoParaVerificacao,
            colaborador,
            treinamento,
            arquivo: arquivoValidoParaAnalise,
            registrosExistentes: [],
            usuario: null,
            salvarResultado: true,
            exigeVencimento: !treinamentoSemValidade(treinamentoId),
        });

        const statusValidacao = converterStatusVerificacaoParaStatusCertificado(verificacao?.statusVerificacao);
        const dataRealizacaoVerificada = verificacao?.data_realizacao || verificacao?.dataRealizacao || "";
        const ehFichaRegistro = ehFichaRegistroTreinamentoApp({ certificado, certificadoNormalizado, treinamento });
        const atualizacaoCertificado = {
            status_validacao: statusValidacao,
        };

        if (ehFichaRegistro && dataRealizacaoVerificada) {
            atualizacaoCertificado.data_realizacao = dataRealizacaoVerificada;
            atualizacaoCertificado.data_vencimento = null;
        }

        const { error } = await supabase
            .from("certificados")
            .update(atualizacaoCertificado)
            .eq("id", certificadoNormalizado.id);

        if (error) {
            throw new Error(`Erro ao atualizar status da verificação documental do certificado: ${error.message}`);
        }

        const certificadoAtualizado = {
            ...certificadoNormalizado,
            statusValidacao,
            status_validacao: statusValidacao,
            ...(ehFichaRegistro && dataRealizacaoVerificada ? {
                dataRealizacao: dataRealizacaoVerificada,
                data_realizacao: dataRealizacaoVerificada,
                realizado: dataRealizacaoVerificada,
                dataVencimento: null,
                data_vencimento: null,
                vencimento: null,
            } : {}),
        };

        atualizarCertificadoNosEstados({
            setColaboradores,
            setColaboradorSelecionado,
            certificadoAtualizado,
        });

        return certificadoAtualizado;
    } catch (error) {
        console.warn("Verificação documental não bloqueou o salvamento do certificado:", error?.message || error);

        try {
            await supabase
                .from("certificados")
                .update({ status_validacao: "Erro na verificação" })
                .eq("id", certificadoNormalizado.id);

            atualizarCertificadoNosEstados({
                setColaboradores,
                setColaboradorSelecionado,
                certificadoAtualizado: {
                    ...certificadoNormalizado,
                    statusValidacao: "Erro na verificação",
                    status_validacao: "Erro na verificação",
                },
            });
        } catch (erroAtualizacao) {
            console.warn("Não foi possível marcar erro na verificação documental do certificado:", erroAtualizacao?.message || erroAtualizacao);
        }

        return certificadoNormalizado;
    }
}


export async function sincronizarCertificadosDoStorageAppService({
    supabase,
    colaboradores,
    dataReferencia,
    carregarColaboradores,
    setErroBanco,
    setCarregandoBanco,
}) {
    setErroBanco("");
    setCarregandoBanco(true);

    try {
        const mensagem = await sincronizarCertificadosDoStorageService({
            supabase,
            colaboradores,
            dataReferencia,
        });

        await carregarColaboradores();

        return mensagem;
    } catch (error) {
        setErroBanco(error.message || "Erro ao sincronizar arquivos do Storage.");
        return error.message || "Erro ao sincronizar arquivos do Storage.";
    } finally {
        setCarregandoBanco(false);
    }
}

export async function listarArquivosCertificadosStorageAppService({
    colaboradores,
    empresasBanco,
    setErroBanco,
}) {
    setErroBanco("");

    try {
        return await listarArquivosCertificadosStorageService({
            colaboradores,
            empresasBanco,
        });
    } catch (error) {
        setErroBanco(error.message || "Erro ao listar arquivos do Storage.");
        alert(error.message || "Erro ao listar arquivos do Storage.");
        return [];
    }
}

export async function excluirArquivoCertificadoStorageAppService({
    supabase,
    arquivo,
    registrarAuditoria,
    setErroBanco,
}) {
    setErroBanco("");

    if (!arquivo?.caminho) {
        alert("Arquivo inválido para exclusão.");
        return false;
    }

    if (arquivo.emUso) {
        alert(`Este arquivo está em uso em: ${arquivo.origemTipo || arquivo.tabelaOrigem || "base do sistema"}. Para evitar quebrar o histórico, exclua primeiro o registro vinculado.`);
        return false;
    }

    const ignorarConfirmacaoIndividual = Boolean(
        arquivo?.ignorarConfirmacaoIndividual
        || arquivo?.ignorarConfirmacao
        || arquivo?.limpezaEmLote
    );

    if (!ignorarConfirmacaoIndividual) {
        const confirmado = window.confirm(
            `Excluir definitivamente este arquivo do Storage?\n\nBucket: ${arquivo.bucket || "certificados-treinamentos"}\nArquivo: ${arquivo.nome}\nPasta: ${arquivo.pasta || "raiz"}`
        );

        if (!confirmado) return false;
    }

    try {
        await excluirArquivoStorageAuditoriaService({
            supabase,
            arquivo,
        });

        await registrarAuditoria("DELETE_STORAGE", arquivo.bucket || "storage", `Excluiu arquivo sem registro do Storage: ${arquivo.nome}`, arquivo.caminho, {
            bucket: arquivo.bucket || "",
            caminho: arquivo.caminho,
            pasta: arquivo.pasta || "",
            nome: arquivo.nome,
            origemTipo: arquivo.origemTipo || "",
            tabelaOrigem: arquivo.tabelaOrigem || "",
            colaboradorNome: arquivo.colaboradorNome || "",
            colaboradorCodigo: arquivo.colaboradorCodigo || "",
            colaboradorEmpresa: arquivo.colaboradorEmpresa || "",
            empresaNome: arquivo.empresaNome || "",
            empresaCnpj: arquivo.empresaCnpj || "",
            tipoDocumentoEmpresa: arquivo.tipoDocumentoEmpresa || "",
        });

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao excluir arquivo do Storage.");
        alert(error.message || "Erro ao excluir arquivo do Storage.");
        return false;
    }
}

export async function salvarCertificadoTreinamentoAppService({
    supabase,
    certificado,
    colaboradores,
    colaboradorSelecionado,
    carregarColaboradores,
    setErroBanco,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    setErroBanco("");

    try {
        await validarCertificadoAntesDoSalvamento({
            supabase,
            certificado,
            colaboradores,
            colaboradorSelecionado,
        });

        const certificadoNormalizado = await salvarCertificadoTreinamentoCrud({
            supabase,
            certificado,
            colaboradores,
            colaboradorSelecionado,
        });

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(certificadoNormalizado.colaboradorId)) return colaborador;

                const demais = (colaborador.treinamentos || []).filter(
                    (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
                );

                return {
                    ...colaborador,
                    treinamentos: [certificadoNormalizado, ...demais],
                };
            })
        );

        setColaboradorSelecionado((atual) => {
            if (!atual || String(atual.id) !== String(certificadoNormalizado.colaboradorId)) return atual;

            const demais = (atual.treinamentos || []).filter(
                (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
            );

            return {
                ...atual,
                treinamentos: [certificadoNormalizado, ...demais],
            };
        });

        executarVerificacaoCertificadoSemBloquearFluxo({
            supabase,
            certificado,
            certificadoNormalizado,
            colaboradores,
            colaboradorSelecionado,
            setColaboradores,
            setColaboradorSelecionado,
        });

        await carregarColaboradores();

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao salvar certificado.");
        alert(error.message || "Erro ao salvar certificado.");
        return false;
    }
}

export async function atualizarDatasCertificadoAppService({
    supabase,
    certificado,
    datas,
    carregarColaboradores,
    setErroBanco,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    setErroBanco("");

    try {
        const atualizado = await atualizarDatasCertificadoCrud({
            supabase,
            certificado,
            datas,
        });

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(atualizado.colaboradorId)) return colaborador;

                return {
                    ...colaborador,
                    treinamentos: (colaborador.treinamentos || []).map((item) =>
                        item.id === atualizado.id ? atualizado : item
                    ),
                };
            })
        );

        setColaboradorSelecionado((atual) => {
            if (!atual || String(atual.id) !== String(atualizado.colaboradorId)) return atual;

            return {
                ...atual,
                treinamentos: (atual.treinamentos || []).map((item) =>
                    item.id === atualizado.id ? atualizado : item
                ),
            };
        });

        const dataRealizacaoAtualizada = atualizado.realizado || atualizado.dataRealizacao || atualizado.data_realizacao || datas.realizado || certificado.realizado || certificado.dataRealizacao || certificado.data_realizacao || "";
        const dataVencimentoAtualizada = atualizado.vencimento || atualizado.dataVencimento || atualizado.data_vencimento || datas.vencimento || certificado.vencimento || certificado.dataVencimento || certificado.data_vencimento || "";
        const treinamentoIdAtualizado = Number(atualizado.treinamentoId || certificado.treinamentoId || certificado.treinamento_codigo || 0);
        const treinamentoAtualizado = certificado.treinamento || obterTreinamento(treinamentoIdAtualizado) || {
            id: treinamentoIdAtualizado || null,
            nome: atualizado.nomeTreinamento || certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || "",
        };
        const colaboradorAtualizado = certificado.colaborador || certificado.colaborador_dados || null;

        await executarVerificacaoCertificadoSemBloquearFluxo({
            supabase,
            certificado: {
                ...certificado,
                ...atualizado,
                colaborador: colaboradorAtualizado || certificado.colaborador || {},
                treinamento: treinamentoAtualizado,
                treinamentoId: treinamentoIdAtualizado || atualizado.treinamentoId || certificado.treinamentoId || null,
                treinamento_codigo: treinamentoIdAtualizado || certificado.treinamento_codigo || null,
                tipo_treinamento: atualizado.nomeTreinamento || certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || treinamentoAtualizado.nome || "",
                nome_treinamento: atualizado.nomeTreinamento || certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || treinamentoAtualizado.nome || "",
                dataRealizacao: dataRealizacaoAtualizada,
                data_realizacao: dataRealizacaoAtualizada,
                dataVencimento: dataVencimentoAtualizada,
                data_vencimento: dataVencimentoAtualizada,
                realizado: dataRealizacaoAtualizada,
                vencimento: dataVencimentoAtualizada,
            },
            certificadoNormalizado: {
                ...atualizado,
                treinamentoId: treinamentoIdAtualizado || atualizado.treinamentoId || certificado.treinamentoId || null,
                nomeTreinamento: atualizado.nomeTreinamento || certificado.nomeTreinamento || certificado.nome_treinamento || certificado.tipo_treinamento || treinamentoAtualizado.nome || "",
                dataRealizacao: dataRealizacaoAtualizada,
                data_realizacao: dataRealizacaoAtualizada,
                dataVencimento: dataVencimentoAtualizada,
                data_vencimento: dataVencimentoAtualizada,
                realizado: dataRealizacaoAtualizada,
                vencimento: dataVencimentoAtualizada,
            },
            colaboradores: colaboradorAtualizado ? [colaboradorAtualizado] : [],
            colaboradorSelecionado: colaboradorAtualizado || null,
            setColaboradores,
            setColaboradorSelecionado,
        });

        await carregarColaboradores();

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao atualizar datas do certificado.");
        alert(error.message || "Erro ao atualizar datas do certificado.");
        return false;
    }
}

export async function visualizarCertificadoTreinamentoAppService({
    supabase,
    certificado,
    setErroBanco,
}) {
    setErroBanco("");

    try {
        const signedUrl = await gerarUrlVisualizacaoCertificado({
            supabase,
            certificado,
            expiracaoSegundos: 60 * 10,
        });

        window.open(signedUrl, "_blank", "noopener,noreferrer");
        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao gerar link do certificado.");
        return false;
    }
}

export async function excluirCertificadoTreinamentoAppService({
    supabase,
    certificado,
    setErroBanco,
    setColaboradores,
}) {
    const treinamento = obterTreinamento(certificado.treinamentoId);
    const confirmar = window.confirm(`Deseja excluir o certificado ${treinamento.nome}?`);

    if (!confirmar) return false;

    setErroBanco("");

    try {
        await excluirCertificadoTreinamentoCrud({
            supabase,
            certificado,
        });

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(certificado.colaboradorId)) return colaborador;

                return {
                    ...colaborador,
                    treinamentos: (colaborador.treinamentos || []).filter((item) => item.id !== certificado.id),
                };
            })
        );

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao excluir certificado.");
        alert(error.message || "Erro ao excluir certificado.");
        return false;
    }
}
