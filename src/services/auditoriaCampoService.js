import {
    respostasAuditoriaCampo,
    categoriasAuditoriaCampo,
    tiposAuditoriaCampoDireta,
    categoriasPadronizadasAuditoriaCampo,
    checklistDinamicoAuditoriaCampo,
} from "../constants/auditoriaCampoConstants";
import {
    normalizarTextoBusca,
    textoNaoAplicavel,
    formatDate,
    formatarDataHora,
} from "../utils/sstUtils";

const hoje = new Date();

function obterCategoriaPadronizadaAuditoriaCampo(valor = "") {
    return categoriasPadronizadasAuditoriaCampo.find((item) => item.valor === valor) || categoriasPadronizadasAuditoriaCampo[0];
}

function obterTipoAuditoriaCampoPorParametro(parametro = "") {
    const valor = normalizarTextoBusca(parametro || "").replace(/\s+/g, "-");
    return tiposAuditoriaCampoDireta.find((tipo) => tipo.valor === parametro || tipo.parametros.some((item) => normalizarTextoBusca(item).replace(/\s+/g, "-") === valor)) || tiposAuditoriaCampoDireta[0];
}

function obterTipoAuditoriaCampoDireta(valor = "") {
    return tiposAuditoriaCampoDireta.find((tipo) => tipo.valor === valor) || tiposAuditoriaCampoDireta[0];
}

function checklistParaTipoAuditoriaCampo(valor = "") {
    const tipo = obterTipoAuditoriaCampoDireta(valor);
    return checklistDinamicoAuditoriaCampo[tipo.grupo] || checklistDinamicoAuditoriaCampo.geral;
}

function criarRespostasChecklistDinamico(tipoAuditoria = "area") {
    return checklistParaTipoAuditoriaCampo(tipoAuditoria).reduce((acc, item) => {
        acc[item] = "nao_aplicavel";
        return acc;
    }, {});
}

function calcularResultadoChecklistDinamico(respostas = {}) {
    const itens = Object.entries(respostas || {}).map(([pergunta, chaveResposta]) => ({
        pergunta,
        resposta: obterRespostaAuditoriaCampo(chaveResposta || "nao_aplicavel"),
    }));

    const aplicaveis = itens.filter((item) => item.resposta.chave !== "nao_aplicavel");
    const pontosPossiveis = Math.max(1, aplicaveis.length * 10);
    const pontos = aplicaveis.reduce((total, item) => total + Number(item.resposta.pontos || 0), 0);
    const percentual = Math.max(0, Math.min(100, Math.round((pontos / pontosPossiveis) * 100)));
    const temDesvioGrave = itens.some((item) => item.resposta.chave === "desvio_grave");

    let classificacao = "Crítico";
    if (temDesvioGrave) classificacao = "Ação imediata";
    else if (percentual >= 90) classificacao = "Excelente";
    else if (percentual >= 75) classificacao = "Conforme com observações";
    else if (percentual >= 50) classificacao = "Atenção";

    return {
        pontos,
        pontosPossiveis,
        percentual,
        classificacao,
        temDesvioGrave,
        itens,
    };
}


function notificacaoPadraoAuditoriaCampo(colaborador = {}, resultado = {}) {
    const nome = colaborador.nome || "colaborador não informado";
    const empresa = colaborador.empresaExibicao || colaborador.empresa || "empresa não informada";
    const classificacao = resultado.classificacao || "classificação pendente";
    const pontuacao = Number.isFinite(Number(resultado.percentual)) ? `${resultado.percentual}%` : "pontuação pendente";

    return {
        titulo: `Auditoria de campo - ${nome}`,
        mensagem: `Foi registrada uma auditoria de campo para ${nome}, da empresa ${empresa}. Resultado: ${classificacao} (${pontuacao}).`,
        complementos: [],
        visualizarPreview: false,
    };
}

function montarPreviewNotificacaoAuditoriaCampo(notificacao = {}, complementos = []) {
    const linhas = [
        notificacao.titulo ? `Assunto: ${notificacao.titulo}` : "Assunto: Auditoria de campo",
        "",
        notificacao.mensagem || "",
    ];

    if (notificacao.auditor) {
        linhas.push("", `Auditor responsável: ${notificacao.auditor}`);
    }

    const listaComplementos = Array.isArray(complementos) ? complementos.filter(Boolean) : [];

    if (listaComplementos.length > 0) {
        linhas.push("", "Complementos:");
        listaComplementos.forEach((item, index) => linhas.push(`${index + 1}. ${item}`));
    }

    return linhas.join("\n").trim();
}


function montarMensagemFluidaAuditoriaCampo(auditoria = {}, alvoAuditoria = {}) {
    const numero = auditoria.numeroAuditoria || auditoria.numero_auditoria || "Sem número";
    const tipo = auditoria.tipoAuditoria || auditoria.tipo_auditoria || alvoAuditoria.tipo || "Auditoria de campo";
    const alvo = alvoAuditoria.titulo || auditoria.maquinaEquipamento || auditoria.maquina_equipamento || auditoria.area || auditoria.local || auditoria.nomeColaborador || "Não informado";
    const codigoQrCampo = auditoria.codigoQrCampo || auditoria.codigo_qr_campo || auditoria.codigo_qr || auditoria.notificacao?.qrCodeCampo?.codigo || auditoria.notificacao?.codigoQrCampo || "";
    const empresa = auditoria.empresaNome || auditoria.empresa_nome || auditoria.empresaResponsavel || auditoria.empresa_responsavel || "Empresa não informada";
    const auditor = auditoria.auditorNome || auditoria.auditor_nome || auditoria.auditor || "Auditor não informado";
    const risco = auditoria.grauRisco || auditoria.grau_risco || "Não informado";
    const classificacao = auditoria.classificacao || "Sem classificação";
    const pontuacao = Number.isFinite(Number(auditoria.pontuacao)) ? `${Number(auditoria.pontuacao)}%` : "Não calculada";
    const status = auditoria.statusAuditoria || auditoria.status_auditoria || auditoria.statusDesvio || auditoria.status_desvio || "Aberta";
    const situacao = auditoria.situacaoEncontrada || auditoria.situacao_encontrada || "Situação não informada";
    const acao = auditoria.acaoRecomendada || auditoria.acao_recomendada || "Ação recomendada não informada";
    const responsavel = auditoria.responsavelTratativa || auditoria.responsavel_tratativa || "Responsável não informado";
    const prazo = auditoria.prazoAdequacao || auditoria.prazo_adequacao ? formatDate(auditoria.prazoAdequacao || auditoria.prazo_adequacao) : "Prazo não informado";

    const linhas = [
        `Olá, foi registrada a auditoria de campo ${numero}.`,
        "",
        "Resumo da auditoria:",
        `• Tipo: ${tipo}`,
        `• Local/alvo auditado: ${alvo}`,
        ...(codigoQrCampo ? [`• QR Code de origem: ${codigoQrCampo}`] : []),
        `• Empresa responsável: ${empresa}`,
        `• Grau de risco: ${risco}`,
        `• Status atual: ${status}`,
        `• Auditor: ${auditor}`,
        "",
        "Condição encontrada:",
        `• ${situacao}`,
        "",
        "Tratativa solicitada:",
        `• Ação recomendada: ${acao}`,
        `• Responsável: ${responsavel}`,
        `• Prazo: ${prazo}`,
        "",
        "Indicador da auditoria:",
        `• Classificação: ${classificacao}`,
        `• Conformidade calculada: ${pontuacao}`,
        "",
        "Solicitação: avaliar a condição registrada, iniciar ou atualizar a tratativa e retornar com as evidências de correção quando aplicável.",
    ];

    return linhas.join("\n");
}


function obterRespostaAuditoriaCampo(chave) {
    return respostasAuditoriaCampo.find((item) => item.chave === chave) || respostasAuditoriaCampo[0];
}

function rotuloPontuacaoAuditoriaCampo(resposta = {}) {
    if (resposta.chave === "nao_aplicavel") return "Ignora o cálculo";
    return resposta.descricaoPontuacao || `${Number(resposta.pontos || 0)} pontos`;
}

function calcularResultadoAuditoriaCampo(respostas = {}) {
    const itens = categoriasAuditoriaCampo.map((categoria) => ({
        categoria,
        resposta: obterRespostaAuditoriaCampo(respostas[categoria.chave] || "conforme"),
    }));

    const aplicaveis = itens.filter((item) => item.resposta.chave !== "nao_aplicavel");
    const base = Math.max(1, aplicaveis.length * 10);
    const pontos = aplicaveis.reduce((total, item) => total + Number(item.resposta.pontos || 0), 0);
    const percentual = Math.max(0, Math.min(100, Math.round((pontos / base) * 100)));
    const temDesvioGrave = itens.some((item) => item.resposta.chave === "desvio_grave");

    let classificacao = "Crítico";

    if (temDesvioGrave) classificacao = "Ação imediata";
    else if (percentual >= 90) classificacao = "Excelente";
    else if (percentual >= 75) classificacao = "Conforme com observações";
    else if (percentual >= 50) classificacao = "Atenção";

    return {
        pontos,
        pontosPossiveis: base,
        percentual,
        classificacao,
        temDesvioGrave,
        itens,
    };
}

function classeClassificacaoAuditoriaCampo(classificacao = "") {
    const texto = normalizarTextoBusca(classificacao);

    if (texto.includes("excelente")) return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    if (texto.includes("observ")) return "bg-blue-50 text-blue-700 ring-blue-200";
    if (texto.includes("atencao") || texto.includes("atenção")) return "bg-orange-50 text-orange-700 ring-orange-200";
    if (texto.includes("acao") || texto.includes("ação") || texto.includes("critico") || texto.includes("crítico")) return "bg-red-50 text-red-700 ring-red-200";

    return "bg-slate-50 text-slate-700 ring-slate-200";
}

function normalizarAuditoriaCampo(item = {}) {
    const checklist = Array.isArray(item.checklist) ? item.checklist : [];
    const codigoQrCampo = item.codigo_qr_campo || item.codigoQrCampo || item.codigo_qr || item.notificacao?.qrCodeCampo?.codigo || item.notificacao?.codigoQrCampo || "";
    const linkQrCampo = item.link_qr_campo || item.linkQrCampo || item.notificacao?.qrCodeCampo?.link || "";
    const desviosBrutos = Array.isArray(item.desvios) ? item.desvios : [];
    const desvios = desviosBrutos.map((desvio) => ({
        ...desvio,
        observacaoAberto: desvio.observacao_aberto || desvio.observacaoAberto || "",
        observacaoTratativa: desvio.observacao_tratativa || desvio.observacaoTratativa || "",
        observacaoCorrigido: desvio.observacao_corrigido || desvio.observacaoCorrigido || "",
        fotoAntesUrl: desvio.foto_antes_url || desvio.fotoAntesUrl || "",
        fotoDepoisUrl: desvio.foto_depois_url || desvio.fotoDepoisUrl || "",
        notificacao: desvio.notificacao || {},
    }));

    return {
        id: item.id,
        colaboradorId: item.colaborador_id || item.colaboradorId || null,
        empresaId: item.empresa_id || item.empresaId || null,
        tokenQr: item.token_qr || item.tokenQr || "",
        codigoQrCampo,
        linkQrCampo,
        colaboradorNome: item.colaborador_nome || item.colaboradorNome || item.colaboradores?.nome || "",
        empresaNome: item.empresa_nome || item.empresaNome || item.empresas?.nome || item.empresa_responsavel || item.empresaResponsavel || "",
        numeroAuditoria: item.numero_auditoria || item.numeroAuditoria || "",
        tipoAuditoria: item.tipo_auditoria || item.tipoAuditoria || "",
        titulo: item.titulo || item.assunto || item.numero_auditoria || item.numeroAuditoria || "",
        area: item.area || "",
        subarea: item.subarea || "",
        local: item.local || "",
        maquinaEquipamento: item.maquina_equipamento || item.maquinaEquipamento || "",
        empresaResponsavel: item.empresa_responsavel || item.empresaResponsavel || item.empresa_nome || item.empresaNome || "",
        emailResponsavel: item.email_responsavel || item.emailResponsavel || item.notificacao?.emailResponsavel || item.notificacao?.email_responsavel || "",
        whatsappResponsavel: item.whatsapp_responsavel || item.whatsappResponsavel || item.notificacao?.whatsappResponsavel || item.notificacao?.whatsapp_responsavel || "",
        grauRisco: item.grau_risco || item.grauRisco || "",
        situacaoEncontrada: item.situacao_encontrada || item.situacaoEncontrada || "",
        acaoRecomendada: item.acao_recomendada || item.acaoRecomendada || "",
        responsavelTratativa: item.responsavel_tratativa || item.responsavelTratativa || "",
        prazoAdequacao: item.prazo_adequacao || item.prazoAdequacao || "",
        statusAuditoria: item.status_auditoria || item.statusAuditoria || "",
        fotoAntesUrl: item.foto_antes_url || item.fotoAntesUrl || "",
        fotoDepoisUrl: item.foto_depois_url || item.fotoDepoisUrl || "",
        observacoesGerais: item.observacoes_gerais || item.observacoesGerais || item.observacao || "",
        checklistDinamico: Array.isArray(item.checklist_dinamico) ? item.checklist_dinamico : (Array.isArray(item.checklistDinamico) ? item.checklistDinamico : []),
        funcao: item.funcao || item.colaboradores?.funcao || "",
        statusDocumental: item.status_documental || item.statusDocumental || "",
        boasPraticas: item.boas_praticas || item.boasPraticas || "",
        observacao: item.observacao || item.observacaoAuditoria || "",
        notificacao: item.notificacao || {},
        checklist,
        pontuacao: Number(item.pontuacao || 0),
        classificacao: item.classificacao || "",
        temDesvioGrave: Boolean(item.tem_desvio_grave || item.temDesvioGrave),
        categoriaDesvioPrincipal: item.categoria_desvio_principal || item.categoriaDesvioPrincipal || "",
        totalDesvios: Number(item.total_desvios || item.totalDesvios || desvios.length || 0),
        statusDesvio: item.status_desvio || item.statusDesvio || "",
        auditorNome: item.auditor_nome || item.auditorNome || item.enviado_por || "",
        origem: item.origem || "QR Code",
        createdAt: item.created_at || item.createdAt || "",
        desvios,
    };
}


function identificarAlvoAuditoriaCampo(item = {}) {
    const colaborador = String(item.colaboradorNome || item.colaborador_nome || item.colaboradores?.nome || "").trim();
    const maquina = textoNaoAplicavel(item.maquinaEquipamento || item.maquina_equipamento || "");
    const area = textoNaoAplicavel(item.area || "");
    const subarea = textoNaoAplicavel(item.subarea || "");
    const local = textoNaoAplicavel(item.local || "");
    const tipo = String(item.tipoAuditoria || item.tipo_auditoria || "").trim();
    const codigoQrCampo = item.codigoQrCampo || item.codigo_qr_campo || item.codigo_qr || item.notificacao?.qrCodeCampo?.codigo || item.notificacao?.codigoQrCampo || "";
    const titulo = String(item.titulo || item.assunto || item.numeroAuditoria || item.numero_auditoria || "Auditoria de campo").trim();

    if (colaborador) {
        return {
            titulo: colaborador,
            tipo: "Colaborador auditado",
            descricao: [item.empresaNome || item.empresa_nome || item.empresaResponsavel || item.empresa_responsavel, item.funcao].filter(Boolean).join(" · "),
        };
    }

    if (maquina) {
        return {
            titulo: maquina,
            tipo: tipo && normalizarTextoBusca(tipo).includes("equip") ? "Equipamento auditado" : "Máquina/equipamento auditado",
            descricao: [area, local, item.empresaResponsavel || item.empresa_responsavel || item.empresaNome || item.empresa_nome, codigoQrCampo ? `QR ${codigoQrCampo}` : ""].filter(Boolean).join(" · "),
        };
    }

    if (area) {
        return {
            titulo: area,
            tipo: "Área auditada",
            descricao: [subarea, local, item.empresaResponsavel || item.empresa_responsavel || item.empresaNome || item.empresa_nome].filter(Boolean).join(" · "),
        };
    }

    if (local) {
        return {
            titulo: local,
            tipo: "Local auditado",
            descricao: [tipo, item.empresaResponsavel || item.empresa_responsavel || item.empresaNome || item.empresa_nome].filter(Boolean).join(" · "),
        };
    }

    return {
        titulo,
        tipo: tipo || "Auditoria de campo",
        descricao: [item.empresaResponsavel || item.empresa_responsavel || item.empresaNome || item.empresa_nome].filter(Boolean).join(" · "),
    };
}

function fotosAuditoriaCampo(item = {}) {
    const desvios = Array.isArray(item.desvios) ? item.desvios : [];
    const desvioPrincipal = desvios[0] || {};
    return {
        antes: desvioPrincipal.fotoAntesUrl || desvioPrincipal.foto_antes_url || item.fotoAntesUrl || item.foto_antes_url || "",
        depois: desvioPrincipal.fotoDepoisUrl || desvioPrincipal.foto_depois_url || item.fotoDepoisUrl || item.foto_depois_url || "",
    };
}

function auditoriaCampoAberta(item = {}) {
    const status = normalizarTextoBusca(item.statusDesvio || item.status_desvio || "");
    return (item.totalDesvios || item.total_desvios || 0) > 0 && !["corrigido", "cancelado", "fechado", "concluido", "concluído"].some((termo) => status.includes(termo));
}

function auditoriaCampoVencida(item = {}) {
    const prazoValor = item.prazoAdequacao || item.prazo_adequacao;
    if (!prazoValor) return false;
    const prazo = new Date(`${prazoValor}T23:59:59`);
    if (Number.isNaN(prazo.getTime())) return false;
    const status = normalizarTextoBusca(item.statusAuditoria || item.status_auditoria || item.statusDesvio || item.status_desvio || "");
    const concluida = ["resolvida", "corrigido", "corrigida", "concluido", "concluído", "cancelada"].some((termo) => status.includes(termo));
    return !concluida && prazo < hoje;
}

function obterPesoRiscoStatusEquipamentoAuditoriaCampo(valor = "") {
    const texto = normalizarTextoBusca(valor);

    if (texto.includes("crit")) return 4;
    if (texto.includes("alto")) return 3;
    if (texto.includes("medio") || texto.includes("médio")) return 2;
    if (texto.includes("baixo")) return 1;

    return 0;
}

function obterRotuloRiscoStatusEquipamentoAuditoriaCampo(peso = 0) {
    if (peso >= 4) return "Crítico";
    if (peso === 3) return "Alto";
    if (peso === 2) return "Médio";
    if (peso === 1) return "Baixo";

    return "Não informado";
}

function calcularStatusEquipamentoAuditoriaCampo(historicoAuditorias = []) {
    const historico = Array.isArray(historicoAuditorias) ? historicoAuditorias : [];

    if (historico.length === 0) {
        return {
            status: "Sem auditoria",
            descricao: "Nenhuma auditoria vinculada ao QR Code foi encontrada no histórico carregado.",
            orientacao: "Realize a primeira auditoria para formar histórico do equipamento.",
            ultimaAuditoria: "Não realizada",
            pendenciasAbertas: 0,
            maiorRisco: "Não informado",
            totalAuditorias: 0,
            chave: "sem_auditoria",
            containerClass: "bg-slate-50 ring-slate-200",
            statusClass: "bg-white text-slate-600 ring-slate-200",
            valueClass: "text-slate-700",
        };
    }

    const historicoOrdenado = [...historico].sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
    const auditoriasAbertas = historicoOrdenado.filter(auditoriaCampoAberta);
    const vencidas = historicoOrdenado.filter(auditoriaCampoVencida);
    const maiorPesoRisco = historicoOrdenado.reduce((maior, auditoria) => Math.max(maior, obterPesoRiscoStatusEquipamentoAuditoriaCampo(auditoria.grauRisco || auditoria.grau_risco || auditoria.classificacao || "")), 0);
    const maiorPesoRiscoAberto = auditoriasAbertas.reduce((maior, auditoria) => Math.max(maior, obterPesoRiscoStatusEquipamentoAuditoriaCampo(auditoria.grauRisco || auditoria.grau_risco || auditoria.classificacao || "")), 0);
    const temDesvioGrave = historicoOrdenado.some((auditoria) => Boolean(auditoria.temDesvioGrave || auditoria.tem_desvio_grave) || normalizarTextoBusca(auditoria.classificacao).includes("acao imediata"));
    const ultima = historicoOrdenado[0] || {};
    const ultimaAuditoria = ultima.createdAt || ultima.created_at ? formatarDataHora(ultima.createdAt || ultima.created_at) : "Sem data";

    if (vencidas.length > 0 || temDesvioGrave || maiorPesoRiscoAberto >= 4) {
        return {
            status: "Crítico / bloquear uso",
            descricao: "Existe condição crítica, auditoria vencida ou desvio grave vinculado ao equipamento.",
            orientacao: "Não utilizar o equipamento até avaliação e liberação do TST responsável.",
            ultimaAuditoria,
            pendenciasAbertas: auditoriasAbertas.length,
            maiorRisco: obterRotuloRiscoStatusEquipamentoAuditoriaCampo(Math.max(maiorPesoRisco, maiorPesoRiscoAberto)),
            totalAuditorias: historicoOrdenado.length,
            chave: "critico",
            containerClass: "bg-red-50 ring-red-100",
            statusClass: "bg-red-100 text-red-700 ring-red-200",
            valueClass: "text-red-700",
        };
    }

    if (auditoriasAbertas.length > 0 || maiorPesoRiscoAberto >= 3) {
        return {
            status: "Atenção",
            descricao: "Existe pendência aberta para acompanhamento.",
            orientacao: "Verifique a condição antes do uso e acompanhe a tratativa registrada.",
            ultimaAuditoria,
            pendenciasAbertas: auditoriasAbertas.length,
            maiorRisco: obterRotuloRiscoStatusEquipamentoAuditoriaCampo(Math.max(maiorPesoRisco, maiorPesoRiscoAberto)),
            totalAuditorias: historicoOrdenado.length,
            chave: "atencao",
            containerClass: "bg-orange-50 ring-orange-100",
            statusClass: "bg-orange-100 text-orange-700 ring-orange-200",
            valueClass: "text-orange-700",
        };
    }

    return {
        status: "Liberado",
        descricao: "Sem pendência aberta no histórico carregado.",
        orientacao: "Equipamento sem bloqueio registrado no histórico carregado. Mantenha a inspeção antes do uso.",
        ultimaAuditoria,
        pendenciasAbertas: 0,
        maiorRisco: obterRotuloRiscoStatusEquipamentoAuditoriaCampo(maiorPesoRisco),
        totalAuditorias: historicoOrdenado.length,
        chave: "liberado",
        containerClass: "bg-emerald-50 ring-emerald-100",
        statusClass: "bg-emerald-100 text-emerald-700 ring-emerald-200",
        valueClass: "text-emerald-700",
    };
}


export {
    obterCategoriaPadronizadaAuditoriaCampo,
    obterTipoAuditoriaCampoPorParametro,
    obterTipoAuditoriaCampoDireta,
    checklistParaTipoAuditoriaCampo,
    criarRespostasChecklistDinamico,
    calcularResultadoChecklistDinamico,
    notificacaoPadraoAuditoriaCampo,
    montarPreviewNotificacaoAuditoriaCampo,
    montarMensagemFluidaAuditoriaCampo,
    obterRespostaAuditoriaCampo,
    rotuloPontuacaoAuditoriaCampo,
    calcularResultadoAuditoriaCampo,
    classeClassificacaoAuditoriaCampo,
    normalizarAuditoriaCampo,
    identificarAlvoAuditoriaCampo,
    fotosAuditoriaCampo,
    auditoriaCampoAberta,
    auditoriaCampoVencida,
    calcularStatusEquipamentoAuditoriaCampo,
};
