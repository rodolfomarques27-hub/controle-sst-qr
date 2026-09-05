export const painelPadraoDashboard = {
    cards: true,
    pendencias: true,
    documentosAVencer30Dias: true,
    conformidade: true,
    colaboradoresFuncao: true,
    rankingEmpresas: true,
    documentosTipo: true,
    ultimosDocumentos: true,
    alertas: true,
};

export const cartasPadraoDashboard = {
    colaboradoresMobilizados: true,
    colaboradoresLiberados: true,
    comPendencia: true,
    emAnalise: true,
    empresasAtivas: true,
    documentosVencidos: true,
    documentosAVencer: true,
    treinamentosVencidos: true,
    documentosFuncionariosAVencer: true,
    horasTrabalhadasMes: true,
    colaboradoresBloqueados: true,
    desviosAbertos: true,
    aniversariantesMes: true,
    armazenamentoUtilizado: true,
    obrasAtivas: true,
    ddsRealizadosMes: true,
    participacoesDdsMes: true,
    competenciasDocumentaisAbertas: true,
    pendenciasDocumentaisMensais: true,
    extintoresForaOperacao: true,
    inspecoesExtintoresPendentes: true,
};

export const tamanhosPadraoCartasDashboard = {
    colaboradoresMobilizados: "padrao",
    colaboradoresLiberados: "padrao",
    comPendencia: "padrao",
    emAnalise: "padrao",
    empresasAtivas: "padrao",
    documentosVencidos: "padrao",
    documentosAVencer: "padrao",
    treinamentosVencidos: "padrao",
    documentosFuncionariosAVencer: "padrao",
    horasTrabalhadasMes: "padrao",
    colaboradoresBloqueados: "padrao",
    desviosAbertos: "padrao",
    aniversariantesMes: "padrao",
    armazenamentoUtilizado: "padrao",
    obrasAtivas: "padrao",
    ddsRealizadosMes: "padrao",
    participacoesDdsMes: "padrao",
    competenciasDocumentaisAbertas: "padrao",
    pendenciasDocumentaisMensais: "padrao",
    extintoresForaOperacao: "padrao",
    inspecoesExtintoresPendentes: "padrao",
};

export const tamanhosPadraoBlocosDashboard = {
    cards: "destaque",
    pendencias: "grande",
    documentosAVencer30Dias: "grande",
    conformidade: "medio",
    rankingEmpresas: "destaque",
    colaboradoresFuncao: "medio",
    alertas: "medio",
    documentosTipo: "medio",
    ultimosDocumentos: "medio",
};

export const ordemPadraoBlocosDashboard = [
    "cards",
    "pendencias",
    "documentosAVencer30Dias",
    "conformidade",
    "rankingEmpresas",
    "colaboradoresFuncao",
    "alertas",
    "documentosTipo",
    "ultimosDocumentos",
];

export const ordemPadraoCartasDashboard = [
    "colaboradoresMobilizados",
    "colaboradoresLiberados",
    "comPendencia",
    "emAnalise",
    "empresasAtivas",
    "documentosVencidos",
    "documentosAVencer",
    "treinamentosVencidos",
    "documentosFuncionariosAVencer",
    "horasTrabalhadasMes",
    "colaboradoresBloqueados",
    "desviosAbertos",
    "aniversariantesMes",
    "obrasAtivas",
    "ddsRealizadosMes",
    "participacoesDdsMes",
    "competenciasDocumentaisAbertas",
    "pendenciasDocumentaisMensais",
    "extintoresForaOperacao",
    "inspecoesExtintoresPendentes",
    "armazenamentoUtilizado",
];

export const opcoesTamanhoCartaDashboard = [
    { chave: "padrao", label: "Padrão", descricao: "1 coluna" },
    { chave: "medio", label: "Médio", descricao: "2 colunas" },
    { chave: "grande", label: "Grande", descricao: "3 colunas" },
    { chave: "destaque", label: "Destaque", descricao: "linha inteira" },
];

export const opcoesPainelDashboard = [
    { chave: "cards", label: "Cards principais" },
    { chave: "pendencias", label: "Pendências críticas" },
    { chave: "documentosAVencer30Dias", label: "Documentos a vencer em 30 dias" },
    { chave: "conformidade", label: "Resumo de conformidade" },
    { chave: "rankingEmpresas", label: "Ranking por empresa" },
    { chave: "colaboradoresFuncao", label: "Colaboradores por função" },
    { chave: "alertas", label: "Alertas importantes" },
    { chave: "documentosTipo", label: "Documentos por tipo" },
    { chave: "ultimosDocumentos", label: "Últimos documentos enviados" },
];

export const blocosComTamanhoDashboard = opcoesPainelDashboard;

export const opcoesTamanhoBlocoDashboard = [
    { chave: "padrao", label: "Padrão", descricao: "menor" },
    { chave: "medio", label: "Médio", descricao: "metade da linha" },
    { chave: "grande", label: "Grande", descricao: "maior destaque" },
    { chave: "destaque", label: "Destaque", descricao: "linha inteira" },
];

export const blocosRecolhidosPadraoDashboard = {
    pendencias: false,
    documentosAVencer30Dias: false,
    conformidade: false,
    rankingEmpresas: false,
    colaboradoresFuncao: false,
    alertas: false,
    documentosTipo: false,
    ultimosDocumentos: false,
};


export function moverItemPainel(lista = [], chave, direcao) {
    const indice = lista.indexOf(chave);
    if (indice < 0) return lista;

    const novoIndice = indice + direcao;
    if (novoIndice < 0 || novoIndice >= lista.length) return lista;

    const novaLista = [...lista];
    const [item] = novaLista.splice(indice, 1);
    novaLista.splice(novoIndice, 0, item);
    return novaLista;
}

export function reordenarPorArrastePainel(lista = [], origem, destino) {
    if (!origem || !destino || origem === destino) return lista;

    const origemIndice = lista.indexOf(origem);
    const destinoIndice = lista.indexOf(destino);

    if (origemIndice < 0 || destinoIndice < 0) return lista;

    const novaLista = [...lista];
    const [item] = novaLista.splice(origemIndice, 1);
    novaLista.splice(destinoIndice, 0, item);
    return novaLista;
}

export function prepararArrastePainel(evento) {
    evento.dataTransfer.effectAllowed = "move";
    evento.dataTransfer.setData("text/plain", "mover");
}

export function normalizarTamanhoCartaDashboard(chave, tamanhosCartasDashboard = {}) {
    const tamanho = tamanhosCartasDashboard[chave] || "padrao";
    return ["padrao", "medio", "grande", "destaque"].includes(tamanho) ? tamanho : "padrao";
}

export function classeTamanhoCartaDashboard(chave, tamanhosCartasDashboard = {}) {
    const tamanho = normalizarTamanhoCartaDashboard(chave, tamanhosCartasDashboard);

    if (tamanho === "destaque") return "dashboard-summary-card--destaque sm:col-span-2 lg:col-span-4 xl:col-span-5";
    if (tamanho === "grande") return "dashboard-summary-card--grande sm:col-span-2 lg:col-span-3 xl:col-span-3";
    if (tamanho === "medio") return "dashboard-summary-card--medio sm:col-span-2 xl:col-span-2";

    return "dashboard-summary-card--padrao";
}

export function classeTamanhoBlocoDashboard(chave, tamanhosBlocosDashboard = {}) {
    const tamanho = tamanhosBlocosDashboard[chave] || "padrao";

    if (tamanho === "destaque") return "md:col-span-2 xl:col-span-6";
    if (tamanho === "grande") return "md:col-span-2 xl:col-span-4";
    if (tamanho === "medio") return "md:col-span-2 xl:col-span-3";

    return "md:col-span-1 xl:col-span-2";
}

export function classeValorCartaDashboard(chave, tamanhosCartasDashboard = {}) {
    const tamanho = tamanhosCartasDashboard[chave] || "padrao";

    if (tamanho === "destaque") return "text-4xl";
    if (tamanho === "grande") return "text-3xl";
    if (tamanho === "medio") return "text-2xl";

    return "text-[26px]";
}

export function estiloCartaDashboard(chave, storageStatusDashboard = {}) {
    const estilos = {
        colaboradoresMobilizados: {
            icone: "bg-blue-50 text-blue-600 ring-blue-100",
            valor: "text-slate-950",
        },
        colaboradoresLiberados: {
            icone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
            valor: "text-slate-950",
        },
        comPendencia: {
            icone: "bg-orange-50 text-orange-600 ring-orange-100",
            valor: "text-slate-950",
        },
        emAnalise: {
            icone: "bg-violet-50 text-violet-600 ring-violet-100",
            valor: "text-slate-950",
        },
        empresasAtivas: {
            icone: "bg-cyan-50 text-cyan-700 ring-cyan-100",
            valor: "text-slate-950",
        },
        documentosVencidos: {
            icone: "bg-red-50 text-red-600 ring-red-100",
            valor: "text-slate-950",
        },
        documentosAVencer: {
            icone: "bg-amber-50 text-amber-600 ring-amber-100",
            valor: "text-slate-950",
        },
        treinamentosVencidos: {
            icone: "bg-purple-50 text-purple-600 ring-purple-100",
            valor: "text-slate-950",
        },
        documentosFuncionariosAVencer: {
            icone: "bg-orange-50 text-orange-600 ring-orange-100",
            valor: "text-slate-950",
        },
        horasTrabalhadasMes: {
            icone: "bg-indigo-50 text-indigo-600 ring-indigo-100",
            valor: "text-slate-950",
        },
        colaboradoresBloqueados: {
            icone: "bg-teal-50 text-teal-700 ring-teal-100",
            valor: "text-slate-950",
        },
        desviosAbertos: {
            icone: "bg-red-50 text-red-600 ring-red-100",
            valor: "text-slate-950",
        },
        aniversariantesMes: {
            icone: "bg-sky-50 text-sky-600 ring-sky-100",
            valor: "text-slate-950",
        },
        obrasAtivas: {
            icone: "bg-cyan-50 text-cyan-700 ring-cyan-100",
            valor: "text-slate-950",
        },
        ddsRealizadosMes: {
            icone: "bg-indigo-50 text-indigo-600 ring-indigo-100",
            valor: "text-slate-950",
        },
        participacoesDdsMes: {
            icone: "bg-sky-50 text-sky-600 ring-sky-100",
            valor: "text-slate-950",
        },
        competenciasDocumentaisAbertas: {
            icone: "bg-amber-50 text-amber-700 ring-amber-100",
            valor: "text-slate-950",
        },
        pendenciasDocumentaisMensais: {
            icone: "bg-orange-50 text-orange-700 ring-orange-100",
            valor: "text-slate-950",
        },
        extintoresForaOperacao: {
            icone: "bg-red-50 text-red-600 ring-red-100",
            valor: "text-slate-950",
        },
        inspecoesExtintoresPendentes: {
            icone: "bg-violet-50 text-violet-600 ring-violet-100",
            valor: "text-slate-950",
        },
        armazenamentoUtilizado: {
            icone: storageStatusDashboard.iconeClasse || "bg-slate-100 text-slate-700 ring-slate-200",
            valor: storageStatusDashboard.valorClasse || "text-slate-950",
        },
    };

    return estilos[chave] || {
        icone: "bg-slate-100 text-slate-700 ring-slate-200",
        valor: "text-slate-950",
    };
}
