import { AlertTriangle, CheckCircle2, FileText, XCircle } from "lucide-react";
import {
    treinamentosBase,
    IDS_DOCUMENTOS_CRITICOS_COLABORADOR,
    matrizTreinamentosPorFuncao,
} from "../constants/treinamentosConstants";
import {
    normalizarTextoBusca,
    normalizarDataAniversario,
    diasParaVencer,
    formatDate,
    converterDataParaISO,
    converterDataIsoDireta,
    limparTextoPdfBruto,
} from "../utils/sstUtils";

const hoje = new Date();

export function obterStatusInicialColaborador() {
    return "Em análise";
}



export function obterFuncoesPersonalizadasSalvas() {
    if (typeof window === "undefined") return [];

    try {
        const salvas = JSON.parse(window.localStorage.getItem("funcoesTreinamentosPersonalizadas") || "[]");
        return Array.isArray(salvas) ? salvas : [];
    } catch {
        return [];
    }
}

export function salvarFuncoesPersonalizadas(lista) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("funcoesTreinamentosPersonalizadas", JSON.stringify(lista));
}

export function obterTodasMatrizesFuncao() {
    const personalizadas = obterFuncoesPersonalizadasSalvas();
    const matrizGeral = matrizTreinamentosPorFuncao.find((item) => item.chave === "geral");
    const fixasSemGeral = matrizTreinamentosPorFuncao.filter((item) => item.chave !== "geral");

    return [...fixasSemGeral, ...personalizadas, matrizGeral];
}

export function obterMatrizFuncao(funcao) {
    const texto = normalizarTextoBusca(funcao);
    const matrizes = obterTodasMatrizesFuncao();

    return (
        matrizes.find((item) =>
            item.chave !== "geral" && item.termos.some((termo) => texto.includes(normalizarTextoBusca(termo)))
        ) || matrizes.find((item) => item.chave === "geral")
    );
}

export function treinamentosObrigatoriosFuncao(funcao) {
    const matriz = obterMatrizFuncao(funcao);
    return Array.from(new Set(matriz.treinamentos)).map((id) => obterTreinamento(id)).filter(Boolean);
}

export function gerarCodigoFuncionario(nome = "") {
    const base = normalizarTextoBusca(nome)
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 4)
        .toUpperCase();

    const aleatorio = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `COL-${base || "SST"}-${aleatorio}`;
}

function obterOrdemTreinamentoParaLista(treinamento = {}) {
    const nome = String(treinamento?.nome || "");
    const matchNr = nome.match(/NR\s*[-–—º°]?\s*(\d+(?:[.,]\d+)?)/i);

    if (matchNr?.[1]) {
        return Number(String(matchNr[1]).replace(",", "."));
    }

    if (normalizarTextoBusca(nome).includes("ficha")) {
        return 0;
    }

    return Number(treinamento?.id || 9999);
}

function ordenarItensTreinamentoColaborador(itens = []) {
    return [...itens].sort((a, b) => {
        const ordemA = obterOrdemTreinamentoParaLista(a?.treinamento);
        const ordemB = obterOrdemTreinamentoParaLista(b?.treinamento);

        if (ordemA !== ordemB) return ordemA - ordemB;

        return String(a?.treinamento?.nome || "").localeCompare(String(b?.treinamento?.nome || ""), "pt-BR");
    });
}

export function avaliarTreinamentosColaborador(colaborador) {
    const removidos = (colaborador.treinamentosRemovidos || []).map(Number);
    const adicionais = (colaborador.treinamentosAdicionais || []).map(Number);
    const realizados = colaborador.treinamentos || [];
    const idsRealizados = realizados
        .map((item) => Number(item.treinamentoId))
        .filter((id) => Number.isFinite(id) && id > 0);
    const obrigatoriosBase = treinamentosObrigatoriosFuncao(colaborador.funcao);
    const idsObrigatoriosBase = Array.from(new Set([
        ...obrigatoriosBase.map((treinamento) => Number(treinamento.id)),
        ...adicionais,
    ])).filter((id) => !removidos.includes(Number(id)));

    // Além da matriz da função, mostra também todo treinamento já lançado para o colaborador.
    // Assim, se for enviado um NR-11/NR-18/etc. que não estava na matriz, ele entra na lista
    // do colaborador como documento enviado adicional e deixa de sumir da visão de treinamentos.
    const idsParaExibir = Array.from(new Set([
        ...idsObrigatoriosBase,
        ...idsRealizados,
    ]));

    const obrigatorios = idsParaExibir
        .map((id) => obterTreinamento(id))
        .filter(Boolean);

    const itens = ordenarItensTreinamentoColaborador(obrigatorios.map((treinamento) => {
        const realizado = realizados.find((item) => Number(item.treinamentoId) === Number(treinamento.id));
        const obrigatorioMatriz = idsObrigatoriosBase.includes(Number(treinamento.id));

        if (!realizado) {
            return {
                treinamento,
                realizado: null,
                obrigatorioMatriz,
                adicionalEnviado: false,
                status: {
                    chave: "pendente",
                    texto: "Pendente",
                    icon: AlertTriangle,
                    classe: "bg-blue-50 text-blue-700 ring-blue-200",
                    barra: "bg-blue-500",
                },
            };
        }

        return {
            treinamento,
            realizado,
            obrigatorioMatriz,
            adicionalEnviado: !obrigatorioMatriz,
            status: statusDocumento(realizado.vencimento, treinamentoSemValidade(treinamento.id)),
        };
    }));

    const pendentes = itens.filter((item) => item.status.chave === "pendente");
    const vencidos = itens.filter((item) => item.status.chave === "vencido");
    const vencendo = itens.filter((item) => item.status.chave === "vencendo");
    const emDia = itens.filter((item) => ["emdia", "semvalidade"].includes(item.status.chave));

    return {
        matriz: obterMatrizFuncao(colaborador.funcao),
        itens,
        pendentes,
        vencidos,
        vencendo,
        emDia,
        total: itens.length,
    };
}

export function normalizarColaborador(item) {
    return {
        id: item.id,
        empresaId: item.empresa_id || item.empresaId || null,
        nome: item.nome || "",
        empresa: item.empresas?.nome || item.empresa || "Empresa não informada",
        empresaTipo: item.empresas?.tipo_empresa || item.empresaTipo || "",
        empresaPaiId: item.empresas?.empresa_pai_id || item.empresaPaiId || null,
        empresaPaiNome: item.empresaPaiNome || "",
        empresaExibicao: item.empresaExibicao || item.empresas?.nome || item.empresa || "Empresa não informada",
        cargo: item.cargo || item.cargo_funcao || item.funcao || "",
        funcao: item.funcao || item.cargo || item.cargo_funcao || "-",
        matricula: item.matricula || "-",
        codigoFuncionario: item.codigo_funcionario || item.codigoFuncionario || `COL-${String(item.id).slice(0, 8).toUpperCase()}`,
        fotoUrl: item.foto_url || item.fotoUrl || "",
        fotoNome: item.foto_nome || item.fotoNome || "",
        status: item.status || "Ativo",
        statusMobilizacao: item.status_mobilizacao || item.statusMobilizacao || "",
        dataNascimento: normalizarDataAniversario(item.data_nascimento || item.dataNascimento || item.nascimento || item.dt_nascimento || item.data_de_nascimento || item.data_aniversario || ""),
        mostrarAniversarioDashboard: item.mostrar_aniversario_dashboard !== false && item.mostrarAniversarioDashboard !== false,
        treinamentosRemovidos: item.treinamentos_removidos || item.treinamentosRemovidos || [],
        treinamentosAdicionais: item.treinamentos_adicionais || item.treinamentosAdicionais || [],
        token: item.token_qr || item.token || `SST-${String(item.id).slice(0, 8)}`,
        treinamentos: item.treinamentos || [],
    };
}


export function normalizarCertificado(item) {
    const tipoTreinamento = item.tipo_treinamento || item.tipoTreinamento || item.nome_treinamento || item.nomeTreinamento || "";
    const idNumerico =
        Number.isFinite(Number(item.treinamento_codigo || item.treinamentoCodigo))
            ? Number(item.treinamento_codigo || item.treinamentoCodigo)
            : Number.isFinite(Number(item.treinamento_id || item.treinamentoId))
                ? Number(item.treinamento_id || item.treinamentoId)
                : obterTreinamentoIdPorTipo(tipoTreinamento);

    return {
        id: item.id,
        colaboradorId: item.colaborador_id || item.colaboradorId || null,
        treinamentoId: Number(idNumerico),
        tipoTreinamento,
        nomeTreinamento: item.nome_treinamento || item.nomeTreinamento || tipoTreinamento || "",
        realizado: item.data_realizacao || item.realizado || "",
        vencimento: item.data_vencimento || item.vencimento || "",
        arquivo: item.arquivo_nome || item.nome_do_arquivo || item.arquivo || "",
        arquivoUrl: item.arquivo_url || item.url_do_arquivo || item.arquivoUrl || "",
        observacao: item.observacao || "",
        statusValidacao: item.status_validacao || "Validado",
        createdAt: item.created_at || "",
    };
}

export function treinamentoSemValidade(treinamentoId) {
    const treinamento = obterTreinamento(Number(treinamentoId));
    return treinamento?.validadePadrao === null || treinamento?.validadePadrao === 0;
}

export function statusDocumento(dataISO, semValidade = false) {
    if (semValidade) {
        return {
            chave: "semvalidade",
            texto: "Sem validade",
            icon: FileText,
            classe: "bg-slate-50 text-slate-700 ring-slate-200",
            barra: "bg-slate-400",
        };
    }

    const dias = diasParaVencer(dataISO);

    if (dias === null) {
        return {
            chave: "semdata",
            texto: "Sem data",
            icon: AlertTriangle,
            classe: "bg-blue-50 text-blue-700 ring-blue-200",
            barra: "bg-blue-500",
        };
    }

    if (dias < 0) {
        return {
            chave: "vencido",
            texto: "Vencido",
            icon: XCircle,
            classe: "bg-red-50 text-red-700 ring-red-200",
            barra: "bg-red-500",
        };
    }

    if (dias <= 30) {
        return {
            chave: "vencendo",
            texto: "A vencer",
            icon: AlertTriangle,
            classe: "bg-orange-50 text-orange-700 ring-orange-200",
            barra: "bg-orange-500",
        };
    }

    return {
        chave: "emdia",
        texto: "Em dia",
        icon: CheckCircle2,
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        barra: "bg-emerald-500",
    };
}



export function obterDataAniversarioColaborador(colaborador) {
    return normalizarDataAniversario(
        colaborador?.dataNascimento ||
        colaborador?.data_nascimento ||
        colaborador?.nascimento ||
        colaborador?.dt_nascimento ||
        colaborador?.data_de_nascimento ||
        colaborador?.data_aniversario ||
        ""
    );
}

export function mesAniversarioColaborador(colaborador) {
    const data = obterDataAniversarioColaborador(colaborador);
    if (!data) return null;

    const mes = Number(data.slice(5, 7));
    return mes >= 1 && mes <= 12 ? mes : null;
}

export function diaAniversarioColaborador(colaborador) {
    const data = obterDataAniversarioColaborador(colaborador);
    if (!data) return null;

    const dia = Number(data.slice(8, 10));
    return dia >= 1 && dia <= 31 ? dia : null;
}

export function proximoAniversariante(lista = []) {
    const hojeBase = new Date();
    const anoAtual = hojeBase.getFullYear();

    const candidatos = lista
        .map((colaborador) => {
            const mes = mesAniversarioColaborador(colaborador);
            const dia = diaAniversarioColaborador(colaborador);
            if (!mes || !dia) return null;

            let data = new Date(anoAtual, mes - 1, dia, 12, 0, 0);
            if (data < new Date(anoAtual, hojeBase.getMonth(), hojeBase.getDate(), 0, 0, 0)) {
                data = new Date(anoAtual + 1, mes - 1, dia, 12, 0, 0);
            }

            return { colaborador, data };
        })
        .filter(Boolean)
        .sort((a, b) => a.data - b.data);

    return candidatos[0] || null;
}

export function deveMostrarAniversarioColaborador(colaborador) {
    return colaborador?.mostrarAniversarioDashboard !== false;
}


export function obterFuncaoCargoColaborador(colaborador) {
    return String(colaborador?.funcao || colaborador?.cargo || "").trim() || "Função não informada";
}

export function colaboradorContaComoMobilizado(colaborador) {
    const classificacao = statusGeral(colaborador).texto;

    return classificacao === "Liberado" || classificacao === "Com pendência";
}


export function obterTreinamento(id) {
    return treinamentosBase.find((t) => Number(t.id) === Number(id)) || { nome: "Treinamento não cadastrado", categoria: "-", validadePadrao: 365 };
}

export function obterTreinamentoIdPorTipo(valor) {
    const texto = normalizarTextoBusca(valor);

    if (!texto) return null;

    const encontrado = treinamentosBase.find((treinamento) => {
        const nome = normalizarTextoBusca(treinamento.nome);
        const categoria = normalizarTextoBusca(treinamento.categoria);
        const base = normalizarTextoBusca(treinamento.base);

        return (
            nome === texto ||
            nome.includes(texto) ||
            texto.includes(nome) ||
            categoria === texto ||
            base === texto
        );
    });

    return encontrado?.id || null;
}

export function calcularVencimentoTreinamento(treinamentoId, dataRealizacao) {
    const treinamento = obterTreinamento(Number(treinamentoId));

    if (!dataRealizacao || !treinamento?.validadePadrao) return "";

    const data = new Date(`${dataRealizacao}T12:00:00`);
    data.setDate(data.getDate() + Number(treinamento.validadePadrao));
    return data.toISOString().slice(0, 10);
}

export function inferirTreinamentoPorNomeArquivo(nomeArquivo = "") {
    const texto = normalizarTextoBusca(nomeArquivo)
        .replace(/[_-]+/g, " ")
        .replace(/\.pdf$|\.png$|\.jpg$|\.jpeg$|\.webp$/g, " ");

    const contem = (...termos) => termos.some((termo) => texto.includes(normalizarTextoBusca(termo)));

    if (contem("registro", "ficha registro")) return obterTreinamento(21);
    if (contem("aso", "atestado de saude", "atestado saúde")) return obterTreinamento(22);
    if (contem("integracao", "integração", "mobilizacao", "mobilização")) return obterTreinamento(1);

    if (contem("ficha epi", "ficha de epi", "epis atualizada", "epi ") && !contem("nr 06", "nr06", "nr-06")) {
        return obterTreinamento(14);
    }

    if (contem("nr 06", "nr06", "nr-06", "uso correto de epi", "uso correto de epis")) return obterTreinamento(8);
    if (contem("ordem de servico", "ordem de serviço", " os ")) return obterTreinamento(15);
    if (contem("procedimento operacional", "procedimento da funcao", "procedimento da função")) return obterTreinamento(13);

    if (contem("nr 10", "nr10", "nr-10")) return obterTreinamento(4);
    if (contem("nr 11", "nr11", "nr-11")) return obterTreinamento(11);
    if (contem("nr 12", "nr12", "nr-12", "maquinas", "máquinas", "equipamentos")) {
        if (contem("pemt", "pta", "plataforma")) return obterTreinamento(5);
        if (contem("lixadeira", "esmerilhadeira")) return obterTreinamento(7);
        return obterTreinamento(3);
    }
    if (contem("nr 17", "nr17", "nr-17", "ergonomia", "postural")) return obterTreinamento(18);
    if (contem("nr 18.06", "nr18.06", "nr-18.06", "nr 1806", "nr1806")) return obterTreinamento(9);
    if (contem("nr 18", "nr18", "nr-18")) {
        if (contem("escavacao", "escavação", "vala", "valas", "fundacao", "fundação", "fundacoes", "fundações")) return obterTreinamento(9);
        if (contem("solda", "quente")) return obterTreinamento(6);
        if (contem("pemt", "pta", "plataforma")) return obterTreinamento(5);
        if (contem("lixadeira", "esmerilhadeira")) return obterTreinamento(7);
        return obterTreinamento(9);
    }
    if (contem("nr 21", "nr21", "nr-21", "ceu aberto", "céu aberto", "protetor solar")) return obterTreinamento(16);
    if (contem("nr 23", "nr23", "nr-23", "incendio", "incêndio")) return obterTreinamento(20);
    if (contem("nr 25", "nr25", "nr-25", "residuo", "resíduo", "meio ambiente")) return obterTreinamento(17);
    if (contem("nr 26", "nr26", "nr-26", "sinalizacao", "sinalização", "vias")) return obterTreinamento(19);
    if (contem("nr 33", "nr33", "nr-33", "confinado")) return obterTreinamento(10);
    if (contem("nr 35", "nr35", "nr-35", "altura")) return obterTreinamento(2);

    if (contem("lista")) return obterTreinamento(3);
    if (contem("epi")) return obterTreinamento(14);

    return null;
}


const MESES_DATA_EXTENSO_TREINAMENTOS = Object.freeze({
    janeiro: 1,
    jan: 1,
    fevereiro: 2,
    fev: 2,
    marco: 3,
    março: 3,
    mar: 3,
    abril: 4,
    abr: 4,
    maio: 5,
    mai: 5,
    junho: 6,
    jun: 6,
    julho: 7,
    jul: 7,
    agosto: 8,
    ago: 8,
    setembro: 9,
    set: 9,
    outubro: 10,
    out: 10,
    novembro: 11,
    nov: 11,
    dezembro: 12,
    dez: 12,
});

function converterDataExtensoParaISO(diaValor, mesValor, anoValor) {
    const mes = MESES_DATA_EXTENSO_TREINAMENTOS[normalizarTextoBusca(mesValor)];
    if (!mes) return "";
    return converterDataParaISO(diaValor, mes, anoValor);
}


function normalizarDigitosOcrData(valor = "") {
    return String(valor || "")
        .replace(/[Oo]/g, "0")
        .replace(/[Il|]/g, "1")
        .replace(/S/g, "5")
        .replace(/B/g, "8");
}

function normalizarDatasComErrosOcr(texto = "") {
    let conteudo = String(texto || "");

    conteudo = conteudo.replace(
        /\b([0-3]?[0-9OoIl|])\s*[\/.-]\s*([0-1]?[0-9OoIl|])\s*[\/.-]\s*((?:[12][0-9OoIl|]{3})|[0-9OoIl|]{2})\b/g,
        (_, dia, mes, ano) => `${normalizarDigitosOcrData(dia)}/${normalizarDigitosOcrData(mes)}/${normalizarDigitosOcrData(ano)}`
    );

    conteudo = conteudo.replace(
        /\b([0-3]?[0-9OoIl|])\s+de\s+([a-zA-ZÀ-ÿçÇ]+)\s+de\s+((?:[12][0-9OoIl|]{3})|[0-9OoIl|]{2})\b/gi,
        (_, dia, mes, ano) => `${normalizarDigitosOcrData(dia)} de ${mes} de ${normalizarDigitosOcrData(ano)}`
    );

    return conteudo;
}

function anoIsoTreinamento(iso = "") {
    const ano = Number(String(iso || "").slice(0, 4));
    return Number.isFinite(ano) ? ano : 0;
}

function contextoBuscaDataTreinamento(item = {}) {
    return normalizarTextoBusca(`${item?.contexto || ""} ${item?.texto || ""} ${item?.origem || ""}`);
}

function contextoIndicaNascimentoRegistro(item = {}) {
    const contexto = contextoBuscaDataTreinamento(item);
    return /nascimento|data de nascimento|naturalidade|filiacao|filiação|pai|mae|mãe/.test(contexto);
}

function contextoIndicaAdmissaoRegistro(item = {}) {
    const contexto = contextoBuscaDataTreinamento(item);
    return /data de admissao|data de admissão|admissao|admissão|opcao em|opção em|fgts|registro de empregado/.test(contexto);
}

function contextoIndicaFechamentoOs(item = {}) {
    const contexto = contextoBuscaDataTreinamento(item);
    return /pagina 2|página 2|sao jose dos campos|são josé dos campos|assinatura do empregado|tecnico em seg|técnico em seg|reg\s*:\s*sp|ordem de servico|ordem de serviço|recebi treinamento/.test(contexto);
}

function contextoIndicaDataNaoPrincipal(item = {}) {
    const contexto = contextoBuscaDataTreinamento(item);
    return /nascimento|data de nascimento|filiacao|filiação|naturalidade|cpf|cnpj|ctps|pis|titulo eleitoral|título eleitoral|zona|secao|seção|cnh|portaria|codigo|código|crm|exames realizados|exame realizado|acuidade|audiometria|eletrocardiograma|eletroencefalograma|espirometria|glicose|raio x|raio-x|data da saida|data da saída|rescisao|rescisão|desligamento/.test(contexto);
}

function selecionarMelhorDataDocumento(candidatos = [], tipoDocumento = "") {
    const tipo = normalizarTextoBusca(tipoDocumento);
    const unicos = (candidatos || [])
        .filter((item) => item?.iso)
        .filter((item, index, array) =>
            array.findIndex((outro) => outro.iso === item.iso && outro.origem === item.origem) === index
        )
        .sort((a, b) => Number(b.pontuacao || 0) - Number(a.pontuacao || 0) || String(b.iso || "").localeCompare(String(a.iso || "")));

    if (!unicos.length) return [];

    if (/ficha|registro|clt|esocial/.test(tipo)) {
        const admissao = unicos
            .filter((item) => contextoIndicaAdmissaoRegistro(item))
            .map((item) => ({ ...item, pontuacao: Number(item.pontuacao || 0) + 120 }))
            .sort((a, b) => Number(b.pontuacao || 0) - Number(a.pontuacao || 0));

        if (admissao.length) return admissao;

        const recentesSemNascimento = unicos
            .filter((item) => anoIsoTreinamento(item.iso) >= 2020 && !contextoIndicaNascimentoRegistro(item) && !contextoIndicaDataNaoPrincipal(item))
            .map((item) => ({ ...item, pontuacao: Number(item.pontuacao || 0) + 60 }))
            .sort((a, b) => Number(b.pontuacao || 0) - Number(a.pontuacao || 0) || String(b.iso || "").localeCompare(String(a.iso || "")));

        if (recentesSemNascimento.length) return recentesSemNascimento;

        // Se só sobrou nascimento ou dado cadastral antigo, melhor pedir data manual do que sugerir errado.
        return [];
    }

    if (/ordem|servico|serviço|\bos\b/.test(tipo)) {
        const fechamento = unicos
            .filter((item) => contextoIndicaFechamentoOs(item) && !contextoIndicaDataNaoPrincipal(item))
            .map((item) => ({ ...item, pontuacao: Number(item.pontuacao || 0) + 100 }))
            .sort((a, b) => Number(b.pontuacao || 0) - Number(a.pontuacao || 0));

        if (fechamento.length) return fechamento;

        const recentes = unicos
            .filter((item) => anoIsoTreinamento(item.iso) >= 2020 && !contextoIndicaDataNaoPrincipal(item))
            .map((item) => ({ ...item, pontuacao: Number(item.pontuacao || 0) + 35 }))
            .sort((a, b) => Number(b.pontuacao || 0) - Number(a.pontuacao || 0));

        if (recentes.length) return recentes;
    }

    return unicos.filter((item) => !contextoIndicaDataNaoPrincipal(item) || Number(item.pontuacao || 0) >= 20);
}

function tipoDocumentoPorArquivoParaData(nomeArquivo = "") {
    const treinamento = inferirTreinamentoPorNomeArquivo(nomeArquivo);
    return normalizarTextoBusca(`${treinamento?.nome || ""} ${nomeArquivo || ""}`);
}

export function dataRealizacaoPorArquivo() {
    // Não usar lastModified nem a data atual como fallback automático.
    // Esses valores podem representar apenas a data do arquivo no computador,
    // e não a data real impressa no certificado/lista/ASO.
    return "";
}

export function extrairDatasComContexto(texto = "", opcoes = {}) {
    const resultado = [];
    const textoNormalizado = normalizarDatasComErrosOcr(String(texto || "")).replace(/\s+/g, " ");
    const tipoDocumento = normalizarTextoBusca(opcoes?.tipoDocumento || opcoes?.tipo || "");
    const regexDataBr = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g;
    const regexDataIso = /\b(20\d{2}|19\d{2})[/.-](\d{1,2})[/.-](\d{1,2})\b/g;
    const regexDataExtenso = /\b(\d{1,2})\s+de\s+([a-zA-ZÀ-ÿçÇ]+)\s+de\s+(\d{2,4})\b/gi;

    const palavrasEmissao = [
        "emissão",
        "emissao",
        "emitido",
        "realização",
        "realizacao",
        "realizado",
        "realizada",
        "data do treinamento",
        "data treinamento",
        "data do aso",
        "data aso",
        "data",
        "treinamento",
        "curso",
        "nome da empresa",
        "horario",
        "horário",
        "responsavel pelo treinamento",
        "responsável pelo treinamento",
        "medico examinador",
        "médico examinador",
        "assinatura do responsavel",
        "assinatura do responsável",
        "instrutor",
        "admissão",
        "admissao",
        "data de admissão",
        "data de admissao",
        "opção em",
        "opcao em",
        "são josé dos campos",
        "sao jose dos campos",
        "assinatura do empregado",
        "técnico em seg",
        "tecnico em seg",
        "ordem de serviço",
        "ordem de servico",
        "entrega de epi",
        "controle de entrega",
        "declaração de recebimento",
        "declaracao de recebimento",
        "assinatura do empregado",
    ];

    const palavrasVencimento = [
        "validade",
        "vencimento",
        "vence",
        "vencer",
        "válido até",
        "valido ate",
        "apto até",
        "apto ate",
    ];

    const palavrasIgnorar = [
        "nascimento",
        "data de nascimento",
        "naturalidade",
        "filiação",
        "filiacao",
        "pai",
        "mãe",
        "mae",
        "exames realizados",
        "exame realizado",
        "acuidade visual",
        "eletrocardiograma",
        "audiometria",
        "eletroencefalograma",
        "espirometria",
        "glicose",
        "raio x",
        "raio-x",
        "codigo",
        "código",
        "cod atendimento",
        "cpf",
        "cnpj",
        "crm",
        "ctps",
        "pis",
        "título eleitoral",
        "titulo eleitoral",
        "zona",
        "seção",
        "secao",
        "cnh",
        "portaria",
        "data da saída",
        "data da saida",
        "data aviso",
        "data projeção",
        "data projecao",
        "rescisão",
        "rescisao",
        "desligamento",
    ];

    const adicionar = (match, iso, indice) => {
        if (!iso) return;

        const data = new Date(`${iso}T12:00:00`);
        const hojeBase = new Date(hoje.toISOString().slice(0, 10) + "T12:00:00");
        const limiteFuturo = new Date(hojeBase);

        limiteFuturo.setDate(limiteFuturo.getDate() + 30);

        // Data de realização/emissão não deve ser muito futura.
        if (data > limiteFuturo) return;

        const inicio = Math.max(0, indice - 180);
        const fim = Math.min(textoNormalizado.length, indice + match[0].length + 180);
        const contexto = textoNormalizado.slice(inicio, fim).trim();
        const contextoBusca = normalizarTextoBusca(contexto);

        let pontuacao = 1;

        palavrasEmissao.forEach((palavra) => {
            if (contextoBusca.includes(normalizarTextoBusca(palavra))) pontuacao += 4;
        });

        palavrasVencimento.forEach((palavra) => {
            if (contextoBusca.includes(normalizarTextoBusca(palavra))) pontuacao -= 7;
        });

        palavrasIgnorar.forEach((palavra) => {
            if (contextoBusca.includes(normalizarTextoBusca(palavra))) pontuacao -= 12;
        });

        if (/data\s*[:\-]/i.test(contexto)) pontuacao += 14;
        if (/nome\s+da\s+empresa|hor[aá]rio|respons[aá]vel\s+pelo\s+treinamento|assinatura\s+do\s+respons[aá]vel|instrutor/i.test(contexto)) pontuacao += 10;
        if (/treinamento\s+de|certificado\s+de|atestado\s+de\s+sa[uú]de\s+ocupacional/i.test(contexto)) pontuacao += 8;

        // Ordem de Serviço: normalmente a data fica no fechamento, perto da cidade e das assinaturas.
        if (/ordem\s+de\s+servi[cç]o|assinatura\s+do\s+empregado|t[eé]cnico\s+em\s+seg|s[aã]o\s+jos[eé]\s+dos\s+campos/i.test(contexto)) {
            pontuacao += 26;
        }

        // Ficha de registro: priorizar admissão/opção do FGTS, nunca nascimento.
        if (/data\s+de\s+admiss[aã]o|admiss[aã]o|op[cç][aã]o\s+em/i.test(contexto)) {
            pontuacao += 36;
        }

        if (/ficha|registro|clt|esocial/.test(tipoDocumento) && /data\s+de\s+nascimento|nascimento|filia[cç][aã]o|naturalidade/i.test(contexto)) {
            pontuacao -= 90;
        }

        if (/ordem|servico|serviço|os/.test(tipoDocumento) && /s[aã]o\s+jos[eé]\s+dos\s+campos|assinatura\s+do\s+empregado|t[eé]cnico\s+em\s+seg/i.test(contexto)) {
            pontuacao += 24;
        }

        if (/epi|equipamento\s+de\s+prote[cç][aã]o\s+individual/.test(tipoDocumento)) {
            if (/admiss[aã]o|data\s+de\s+admiss[aã]o/i.test(contexto)) pontuacao -= 48;
            if (/entrega\s+de\s+epi|controle\s+de\s+entrega|declara[cç][aã]o\s+de\s+recebimento|assinatura\s+do\s+empregado|s[aã]o\s+jos[eé]\s+dos\s+campos/i.test(contexto)) pontuacao += 32;
        }

        if (/aso|atestado\s+de\s+sa[uú]de\s+ocupacional/.test(tipoDocumento)) {
            if (/exames?\s+realizados|acuidade|audiometria|eletrocardiograma|eletroencefalograma|espirometria|glicose|raio\s*x|nascimento/i.test(contexto)) pontuacao -= 60;
            if (/m[eé]dico\s+examinador|crm|data\s*$|assinado\s+digitalmente|icp-brasil|c[oó]digo\s+de\s+autenticidade/i.test(contexto)) pontuacao += 36;
        }

        if (/lista|nr\s*[-º]?\s*(?:11|12|17|18|21|25|26)|integra/.test(tipoDocumento)) {
            if (/data\s*[:\-]|nome\s+da\s+empresa|hor[aá]rio|respons[aá]vel\s+pelo\s+treinamento|instrutor/i.test(contexto)) pontuacao += 24;
        }

        if (/exames?\s+realizados|data\s+de\s+nascimento|nascimento|acuidade|audiometria|eletrocardiograma|eletroencefalograma|espirometria|glicose|raio\s*x/i.test(contexto)) pontuacao -= 35;
        if (/cpf|cnpj|ctps|pis|cnh|t[ií]tulo\s+eleitoral|zona|se[cç][aã]o|c[oó]digo|portaria/i.test(contexto)) pontuacao -= 18;

        resultado.push({
            iso,
            texto: match[0],
            contexto,
            pontuacao,
        });
    };

    let match;

    while ((match = regexDataBr.exec(textoNormalizado))) {
        adicionar(match, converterDataParaISO(match[1], match[2], match[3]), match.index);
    }

    while ((match = regexDataIso.exec(textoNormalizado))) {
        adicionar(match, converterDataIsoDireta(match[1], match[2], match[3]), match.index);
    }

    while ((match = regexDataExtenso.exec(textoNormalizado))) {
        adicionar(match, converterDataExtensoParaISO(match[1], match[2], match[3]), match.index);
    }

    return resultado
        .filter((item, index, array) => array.findIndex((outro) => outro.iso === item.iso) === index)
        .sort((a, b) => b.pontuacao - a.pontuacao || b.iso.localeCompare(a.iso));
}

async function executarLeituraDocumentalParaData(arquivo) {
    try {
        const modulo = await import("./documentosOcrService");
        if (typeof modulo.executarLeituraDocumentalLocal !== "function") return null;

        return await modulo.executarLeituraDocumentalLocal({
            arquivo,
            arquivoNome: arquivo?.name || "",
            mimeType: arquivo?.type || "",
        });
    } catch {
        return null;
    }
}

function obterTextoLeituraDocumentalParaData(leitura = {}) {
    if (!leitura) return "";

    const campos = leitura.camposExtraidos || leitura.campos_extraidos || {};
    const linhasOcr = Array.isArray(leitura.linhasOcr)
        ? leitura.linhasOcr
        : Array.isArray(leitura.linhas_ocr)
            ? leitura.linhas_ocr
            : Array.isArray(campos.linhas_ocr)
                ? campos.linhas_ocr
                : [];

    const resumoTextual = Array.isArray(leitura.resumoTextual)
        ? leitura.resumoTextual.join(" ")
        : Array.isArray(leitura.resumo_textual)
            ? leitura.resumo_textual.join(" ")
            : "";

    return [
        leitura.textoExtraido,
        leitura.texto_extraido,
        leitura.textoPrevia,
        leitura.texto_previa,
        resumoTextual,
        campos.tipo_documento,
        campos.empresa_nome,
        campos.assinatura_data_br,
        campos.data_encerramento_br,
        ...linhasOcr.map((linha) => linha?.texto || ""),
    ].filter(Boolean).join(" ");
}

function adicionarDatasLeituraDocumental(candidatos, leitura = {}, opcoes = {}) {
    if (!leitura) return;

    const textoOcr = obterTextoLeituraDocumentalParaData(leitura);
    const tipoDocumento = opcoes?.tipoDocumento || "";

    extrairDatasComContexto(textoOcr, { tipoDocumento }).forEach((item) =>
        candidatos.push({
            ...item,
            origem: "OCR local",
            pontuacao: item.pontuacao + 8,
        })
    );

    const relevantes = [
        ...(Array.isArray(leitura.datasRelevantesClassificadas) ? leitura.datasRelevantesClassificadas : []),
        ...(Array.isArray(leitura.datas_relevantes_classificadas) ? leitura.datas_relevantes_classificadas : []),
    ];

    relevantes.forEach((data) => {
        const iso = data?.iso || "";
        if (!iso) return;

        candidatos.push({
            iso,
            texto: data?.br || formatDate(iso),
            contexto: [data?.rotulo, data?.motivo, data?.contexto].filter(Boolean).join(" "),
            origem: "OCR local classificado",
            pontuacao: 18,
        });
    });
}

export async function lerTextoPossivelDoArquivo(arquivo) {
    if (!arquivo) return "";

    const nome = arquivo.name || "";
    const extensao = nome.split(".").pop()?.toLowerCase() || "";

    try {
        if (["txt", "csv"].includes(extensao) || String(arquivo.type || "").startsWith("text/")) {
            return await arquivo.text();
        }

        if (extensao === "pdf" || arquivo.type === "application/pdf") {
            const buffer = await arquivo.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let bruto = "";
            const tamanhoMaximo = Math.min(bytes.length, 2_000_000);

            for (let i = 0; i < tamanhoMaximo; i += 1) {
                const byte = bytes[i];

                if (byte >= 32 && byte <= 126) {
                    bruto += String.fromCharCode(byte);
                } else {
                    bruto += " ";
                }
            }

            return limparTextoPdfBruto(bruto);
        }

        // Imagens dependem de OCR. Sem OCR, tentamos apenas o nome do arquivo.
        return "";
    } catch {
        return "";
    }
}

export async function detectarDataEmissaoArquivo(arquivo) {
    if (!arquivo) {
        return {
            data: "",
            origem: "nenhuma",
            confianca: 0,
            mensagem: "Nenhum arquivo selecionado.",
        };
    }

    const candidatos = [];
    const nomeArquivo = arquivo.name || "";
    const tipoDocumento = tipoDocumentoPorArquivoParaData(nomeArquivo);

    extrairDatasComContexto(nomeArquivo, { tipoDocumento }).forEach((item) =>
        candidatos.push({
            ...item,
            origem: "nome do arquivo",
            pontuacao: item.pontuacao + 1,
        })
    );

    const textoArquivo = await lerTextoPossivelDoArquivo(arquivo);

    extrairDatasComContexto(textoArquivo, { tipoDocumento }).forEach((item) =>
        candidatos.push({
            ...item,
            origem: "conteúdo do arquivo",
            pontuacao: item.pontuacao + 3,
        })
    );

    let ordenados = selecionarMelhorDataDocumento(candidatos, tipoDocumento);

    // Se a leitura simples não encontrou data confiável, reaproveita a leitura documental
    // robusta com PDF.js/OCR local. Isso corrige listas escaneadas de treinamento,
    // como NR-11, em que a data está visível no cabeçalho, mas não existe texto bruto no PDF.
    if (!ordenados.length || Number(ordenados[0]?.pontuacao || 0) < 8) {
        const leituraDocumental = await executarLeituraDocumentalParaData(arquivo);
        adicionarDatasLeituraDocumental(candidatos, leituraDocumental, { tipoDocumento });

        ordenados = selecionarMelhorDataDocumento(candidatos, tipoDocumento);
    }

    const melhor = ordenados[0];

    if (!melhor || Number(melhor.pontuacao || 0) <= 0) {
        return {
            data: "",
            origem: "não identificada",
            confianca: 0,
            mensagem: "Não foi possível identificar a data no arquivo. Informe manualmente antes de salvar.",
        };
    }

    const confianca = Math.max(1, Math.min(100, Math.round(melhor.pontuacao * 10)));

    return {
        data: melhor.iso,
        origem: melhor.origem,
        confianca,
        contexto: melhor.contexto,
        mensagem: `Data sugerida: ${formatDate(melhor.iso)} (${melhor.origem}). Confira antes de salvar.`,
    };
}

export function analisarArquivosTreinamentoMassa(arquivos = []) {
    return Array.from(arquivos || []).map((arquivo) => {
        const treinamento = inferirTreinamentoPorNomeArquivo(arquivo.name);
        const dataRealizacao = dataRealizacaoPorArquivo(arquivo);

        return {
            arquivo,
            nomeArquivo: arquivo.name,
            treinamento,
            dataRealizacao,
            dataVencimento: treinamento && dataRealizacao ? calcularVencimentoTreinamento(treinamento.id, dataRealizacao) : "",
            reconhecido: Boolean(treinamento),
        };
    });
}

export function itemDocumentoCriticoColaborador(item) {
    const id = Number(item?.treinamento?.id || item?.treinamentoId || item?.treinamento_id || 0);
    const nome = normalizarTextoBusca(item?.treinamento?.nome || item?.nomeTreinamento || item?.tipoTreinamento || "");

    return (
        IDS_DOCUMENTOS_CRITICOS_COLABORADOR.includes(id) ||
        nome.includes("aso") ||
        nome.includes("atestado de saude") ||
        nome.includes("ficha de registro") ||
        nome.includes("registro clt") ||
        nome.includes("integracao") ||
        nome.includes("mobilizacao sst") ||
        nome.includes("ordem de servico") ||
        nome.includes("ficha de epi") ||
        nome.includes("epis atualizada")
    );
}

export function documentoEmAnaliseColaborador(item) {
    const statusValidacao = normalizarTextoBusca(
        item?.realizado?.statusValidacao ||
        item?.realizado?.status_validacao ||
        item?.statusValidacao ||
        item?.status_validacao ||
        ""
    );

    return (
        Boolean(item?.realizado) &&
        (
            statusValidacao.includes("analise") ||
            statusValidacao.includes("conferencia") ||
            statusValidacao.includes("validacao") ||
            statusValidacao.includes("aguardando")
        ) &&
        !statusValidacao.includes("validado") &&
        !statusValidacao.includes("aprovado")
    );
}

export function classeClassificacaoColaborador(status) {
    const texto = String(status || "");

    if (texto === "Liberado") return "bg-emerald-600 text-white";
    if (texto === "Com pendência") return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (texto === "Bloqueado") return "bg-red-600 text-white";
    if (texto === "Em análise") return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
    if (texto === "Desmobilizado") return "bg-slate-600 text-white";
    if (texto === "Inativo") return "bg-slate-100 text-slate-700 ring-1 ring-slate-300";

    return "bg-slate-100 text-slate-700 ring-1 ring-slate-300";
}

export function statusGeral(colaborador) {
    const avaliacao = avaliarTreinamentosColaborador(colaborador);
    const textoSituacao = normalizarTextoBusca(`${colaborador?.status || ""} ${colaborador?.statusMobilizacao || ""} ${colaborador?.status_mobilizacao || ""}`);

    if (textoSituacao.includes("desmobilizado") || textoSituacao.includes("desmobilizada")) {
        return {
            texto: "Desmobilizado",
            classe: classeClassificacaoColaborador("Desmobilizado"),
            detalhe: "Colaborador removido da obra.",
            avaliacao,
        };
    }

    if (textoSituacao.includes("inativo") || textoSituacao.includes("inativa")) {
        return {
            texto: "Inativo",
            classe: classeClassificacaoColaborador("Inativo"),
            detalhe: "Colaborador cadastrado, mas sem mobilização ativa.",
            avaliacao,
        };
    }

    const possuiDocumentoEmAnalise = avaliacao.itens.some(documentoEmAnaliseColaborador);

    if (
        textoSituacao.includes("em analise") ||
        textoSituacao.includes("em análise") ||
        textoSituacao.includes("aguardando conferencia") ||
        textoSituacao.includes("aguardando conferência") ||
        possuiDocumentoEmAnalise
    ) {
        return {
            texto: "Em análise",
            classe: classeClassificacaoColaborador("Em análise"),
            detalhe: "Documento enviado, mas aguardando conferência.",
            avaliacao,
        };
    }

    const documentosCriticosFaltantes = avaliacao.pendentes.filter(itemDocumentoCriticoColaborador);
    const bloqueadoPorStatus = textoSituacao.includes("bloqueado") || textoSituacao.includes("bloqueada") || textoSituacao.includes("impedido") || textoSituacao.includes("impedida");

    if (bloqueadoPorStatus || avaliacao.vencidos.length > 0 || documentosCriticosFaltantes.length > 0) {
        const motivos = [];

        if (bloqueadoPorStatus) motivos.push("status manual bloqueado");
        if (avaliacao.vencidos.length > 0) motivos.push(`${avaliacao.vencidos.length} documento(s) ou treinamento(s) obrigatório(s) vencido(s)`);
        if (documentosCriticosFaltantes.length > 0) motivos.push(`${documentosCriticosFaltantes.length} documento(s) crítico(s) faltante(s)`);

        return {
            texto: "Bloqueado",
            classe: classeClassificacaoColaborador("Bloqueado"),
            detalhe: motivos.join("; ") || "Existe pendência bloqueante.",
            avaliacao,
        };
    }

    const pendenciasNaoBloqueantes = avaliacao.pendentes.filter((item) => !itemDocumentoCriticoColaborador(item));

    if (pendenciasNaoBloqueantes.length > 0 || avaliacao.vencendo.length > 0) {
        const detalhes = [];

        if (pendenciasNaoBloqueantes.length > 0) detalhes.push(`${pendenciasNaoBloqueantes.length} pendência(s) não bloqueante(s)`);
        if (avaliacao.vencendo.length > 0) detalhes.push(`${avaliacao.vencendo.length} item(ns) a vencer em até 30 dias`);

        return {
            texto: "Com pendência",
            classe: classeClassificacaoColaborador("Com pendência"),
            detalhe: detalhes.join("; ") || "Existe pendência, mas não bloqueia a mobilização.",
            avaliacao,
        };
    }

    return {
        texto: "Liberado",
        classe: classeClassificacaoColaborador("Liberado"),
        detalhe: "Documentos e treinamentos obrigatórios em dia.",
        avaliacao,
    };
}

