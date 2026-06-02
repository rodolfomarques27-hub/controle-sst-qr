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

export function avaliarTreinamentosColaborador(colaborador) {
    const removidos = (colaborador.treinamentosRemovidos || []).map(Number);
    const adicionais = (colaborador.treinamentosAdicionais || []).map(Number);
    const obrigatoriosBase = treinamentosObrigatoriosFuncao(colaborador.funcao);
    const idsObrigatorios = Array.from(new Set([
        ...obrigatoriosBase.map((treinamento) => Number(treinamento.id)),
        ...adicionais,
    ]));

    const obrigatorios = idsObrigatorios
        .filter((id) => !removidos.includes(Number(id)))
        .map((id) => obterTreinamento(id))
        .filter(Boolean);

    const realizados = colaborador.treinamentos || [];

    const itens = obrigatorios.map((treinamento) => {
        const realizado = realizados.find((item) => Number(item.treinamentoId) === Number(treinamento.id));

        if (!realizado) {
            return {
                treinamento,
                realizado: null,
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
            status: statusDocumento(realizado.vencimento, treinamentoSemValidade(treinamento.id)),
        };
    });

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
    if (contem("nr 18", "nr18", "nr-18")) {
        if (contem("escavacao", "escavação", "vala", "valas")) return obterTreinamento(12);
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

export function dataRealizacaoPorArquivo(arquivo) {
    if (arquivo?.lastModified) {
        const data = new Date(arquivo.lastModified);

        if (!Number.isNaN(data.getTime())) {
            return data.toISOString().slice(0, 10);
        }
    }

    return hoje.toISOString().slice(0, 10);
}

export function extrairDatasComContexto(texto = "") {
    const resultado = [];
    const textoNormalizado = String(texto || "").replace(/\s+/g, " ");
    const regexDataBr = /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/g;
    const regexDataIso = /\b(20\d{2}|19\d{2})[/.-](\d{1,2})[/.-](\d{1,2})\b/g;

    const palavrasEmissao = [
        "emissão",
        "emissao",
        "emitido",
        "realização",
        "realizacao",
        "realizado",
        "realizada",
        "data do treinamento",
        "treinamento",
        "data do aso",
        "aso",
        "admissão",
        "admissao",
        "data de admissão",
        "data de admissao",
        "data",
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

    const adicionar = (match, iso, indice) => {
        if (!iso) return;

        const data = new Date(`${iso}T12:00:00`);
        const hojeBase = new Date(hoje.toISOString().slice(0, 10) + "T12:00:00");
        const limiteFuturo = new Date(hojeBase);

        limiteFuturo.setDate(limiteFuturo.getDate() + 30);

        // Data de realização/emissão não deve ser muito futura.
        if (data > limiteFuturo) return;

        const inicio = Math.max(0, indice - 100);
        const fim = Math.min(textoNormalizado.length, indice + match[0].length + 100);
        const contexto = textoNormalizado.slice(inicio, fim).trim();
        const contextoBusca = normalizarTextoBusca(contexto);

        let pontuacao = 1;

        palavrasEmissao.forEach((palavra) => {
            if (contextoBusca.includes(normalizarTextoBusca(palavra))) pontuacao += 4;
        });

        palavrasVencimento.forEach((palavra) => {
            if (contextoBusca.includes(normalizarTextoBusca(palavra))) pontuacao -= 7;
        });

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

    return resultado
        .filter((item, index, array) => array.findIndex((outro) => outro.iso === item.iso) === index)
        .sort((a, b) => b.pontuacao - a.pontuacao || b.iso.localeCompare(a.iso));
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

    extrairDatasComContexto(nomeArquivo).forEach((item) =>
        candidatos.push({
            ...item,
            origem: "nome do arquivo",
            pontuacao: item.pontuacao + 1,
        })
    );

    const textoArquivo = await lerTextoPossivelDoArquivo(arquivo);

    extrairDatasComContexto(textoArquivo).forEach((item) =>
        candidatos.push({
            ...item,
            origem: "conteúdo do arquivo",
            pontuacao: item.pontuacao + 3,
        })
    );

    const ordenados = candidatos
        .filter((item, index, array) =>
            array.findIndex((outro) => outro.iso === item.iso && outro.origem === item.origem) === index
        )
        .sort((a, b) => b.pontuacao - a.pontuacao || b.iso.localeCompare(a.iso));

    const melhor = ordenados[0];

    if (!melhor) {
        return {
            data: "",
            origem: "não identificada",
            confianca: 0,
            mensagem: "Não foi possível identificar a data no arquivo. Informe manualmente antes de salvar.",
        };
    }

    const confianca = Math.max(1, Math.min(100, Math.round(melhor.pontuacao * 12)));

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
            dataVencimento: treinamento ? calcularVencimentoTreinamento(treinamento.id, dataRealizacao) : "",
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

