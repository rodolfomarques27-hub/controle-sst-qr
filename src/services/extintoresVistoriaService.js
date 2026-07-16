const CHAVE_EXTINTORES_VISTORIA = "safescan:vistoria:extintores:v1";
const CHAVE_INSPECOES_EXTINTORES = "safescan:vistoria:inspecoes:v1";
const CHAVE_MANUTENCOES_EXTINTORES = "safescan:vistoria:manutencoes:v1";

export const SITUACOES_EXTINTOR = [
    "Em operação",
    "Em inspeção",
    "Em manutenção",
    "Em recarga",
    "Aguardando retorno",
    "Baixado",
];

export const TIPOS_SERVICO_EXTINTOR = [
    { valor: "Inspeção técnica", situacao: "Em inspeção" },
    { valor: "Manutenção de 1º nível", situacao: "Em manutenção" },
    { valor: "Manutenção de 2º nível / recarga", situacao: "Em recarga" },
    { valor: "Manutenção de 3º nível / ensaio hidrostático", situacao: "Em manutenção" },
    { valor: "Recarga após uso ou perda de carga", situacao: "Em recarga" },
];

const POSICOES_INICIAIS = [
    { top: 18, left: 20 }, { top: 28, left: 52 }, { top: 42, left: 76 }, { top: 58, left: 30 }, { top: 72, left: 62 },
    { top: 82, left: 16 }, { top: 34, left: 24 }, { top: 48, left: 58 }, { top: 66, left: 82 }, { top: 86, left: 48 },
];

export const ITENS_CHECKLIST_EXTINTOR_MENSAL = [
    { id: "acesso", label: "Acesso livre e sinalização visível" },
    { id: "suporte", label: "Fixação, suporte e altura adequados" },
    { id: "lacres", label: "Lacre, pino e selo sem violação" },
    { id: "pressao", label: "Indicador de pressão na faixa verde" },
    { id: "mangueira", label: "Mangueira, esguicho e difusor íntegros" },
    { id: "casco", label: "Casco sem amassado, corrosão ou vazamento" },
    { id: "validade", label: "Validade e identificação legíveis" },
];

export const TIPOS_EXTINTORES_BRASIL = [
    { valor: "PQS ABC", label: "Pó químico seco ABC" },
    { valor: "PQS BC", label: "Pó químico seco BC" },
    { valor: "CO2", label: "Dióxido de carbono (CO2)" },
    { valor: "Água Pressurizada", label: "Água pressurizada" },
    { valor: "Espuma Mecânica", label: "Espuma mecânica" },
];

export function proximoCodigoExtintor(extintores = listarExtintoresVistoria()) {
    const numeros = extintores.map((item) => Number(String(item.codigo || "").replace(/\D/g, ""))).filter(Number.isFinite);
    let proximo = 1;
    while (numeros.includes(proximo)) proximo += 1;
    return `E-${String(proximo).padStart(2, "0")}`;
}

function normalizarCodigoExtintor(codigo) {
    const numero = Number(String(codigo || "").replace(/\D/g, ""));
    return Number.isFinite(numero) && numero > 0
        ? `E-${String(numero).padStart(2, "0")}`
        : String(codigo || "");
}

function lerJson(chave, fallback) {
    if (typeof window === "undefined") return fallback;
    try { return JSON.parse(window.localStorage.getItem(chave) || "null") || fallback; } catch { return fallback; }
}

function salvarJson(chave, valor) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(chave, JSON.stringify(valor));
}

export function criarExtintoresIniciais() {
    return Array.from({ length: 20 }, (_, indice) => {
        const numero = indice + 1;
        return {
            id: `extintor-${numero}`,
            codigo: `E-${String(numero).padStart(2, "0")}`,
            tokenQr: `ext-${numero}-${Math.random().toString(36).slice(2, 10)}`,
            pontoId: "",
            ponto: "",
            localizacao: numero <= 10 ? "Escritório e apoio" : "Frente de obra",
            tipo: numero % 2 === 0 ? "PQS ABC" : "CO2",
            capacidade: "6 kg",
            status: "Ativo",
            situacaoOperacional: "Em operação",
            dataAquisicao: "",
            fabricante: "",
            numeroSerie: "",
            posicao: POSICOES_INICIAIS[(numero - 1) % POSICOES_INICIAIS.length],
            criadoEm: new Date().toISOString(),
        };
    });
}

export function listarExtintoresVistoria() {
    const salvo = lerJson(CHAVE_EXTINTORES_VISTORIA, null);
    if (Array.isArray(salvo) && salvo.length) {
        const normalizados = salvo.map((item) => ({
            ...item,
            codigo: normalizarCodigoExtintor(item.codigo),
            situacaoOperacional: item.situacaoOperacional || (item.status === "Ativo" ? "Em operação" : "Baixado"),
            dataAquisicao: item.dataAquisicao || "",
            fabricante: item.fabricante || "",
            numeroSerie: item.numeroSerie || "",
        }));
        if (normalizados.some((item, indice) => item.codigo !== salvo[indice]?.codigo)) {
            salvarJson(CHAVE_EXTINTORES_VISTORIA, normalizados);
        }
        return normalizados;
    }
    const iniciais = criarExtintoresIniciais();
    salvarJson(CHAVE_EXTINTORES_VISTORIA, iniciais);
    return iniciais;
}

export function salvarExtintoresVistoria(extintores = []) {
    salvarJson(CHAVE_EXTINTORES_VISTORIA, extintores);
    return extintores;
}

export function listarInspecoesExtintores() {
    return lerJson(CHAVE_INSPECOES_EXTINTORES, []);
}

export function salvarInspecaoExtintor(inspecao) {
    const atuais = listarInspecoesExtintores();
    const registro = { ...inspecao, id: inspecao.id || `vistoria-${Date.now()}`, atualizadoEm: new Date().toISOString() };
    const semAtual = atuais.filter((item) => item.id !== registro.id);
    salvarJson(CHAVE_INSPECOES_EXTINTORES, [registro, ...semAtual]);
    return registro;
}

export function listarManutencoesExtintores() {
    const registros = lerJson(CHAVE_MANUTENCOES_EXTINTORES, []);
    return Array.isArray(registros) ? registros : [];
}

export function salvarManutencoesExtintores(registros = []) {
    salvarJson(CHAVE_MANUTENCOES_EXTINTORES, registros);
    return registros;
}

export function registrarEnvioManutencaoExtintor(dados) {
    const atuais = listarManutencoesExtintores();
    const registro = {
        id: dados.id || `manutencao-${Date.now()}`,
        extintorId: dados.extintorId,
        tipoServico: dados.tipoServico,
        motivo: dados.motivo || "Programada",
        empresaNome: dados.empresaNome || "",
        empresaCnpj: dados.empresaCnpj || "",
        registroInmetro: dados.registroInmetro || "",
        ordemServico: dados.ordemServico || "",
        dataSaida: dados.dataSaida || new Date().toISOString().slice(0, 10),
        previsaoRetorno: dados.previsaoRetorno || "",
        dataRetorno: "",
        seloConformidade: "",
        observacoes: dados.observacoes || "",
        status: "Em andamento",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
    };
    salvarManutencoesExtintores([registro, ...atuais.filter((item) => item.id !== registro.id)]);
    return registro;
}

export function concluirManutencaoExtintor(id, dados = {}) {
    const atuais = listarManutencoesExtintores();
    const atualizados = atuais.map((item) => item.id === id ? {
        ...item,
        dataRetorno: dados.dataRetorno || new Date().toISOString().slice(0, 10),
        seloConformidade: dados.seloConformidade || "",
        observacoesRetorno: dados.observacoesRetorno || "",
        proximaManutencao: dados.proximaManutencao || "",
        proximoEnsaioHidrostatico: dados.proximoEnsaioHidrostatico || "",
        status: "Concluído",
        atualizadoEm: new Date().toISOString(),
    } : item);
    salvarManutencoesExtintores(atualizados);
    return atualizados.find((item) => item.id === id) || null;
}

export function obterManutencaoAbertaExtintor(extintorId) {
    return listarManutencoesExtintores().find((item) =>
        String(item.extintorId) === String(extintorId) && item.status === "Em andamento",
    ) || null;
}

export function gerarUrlQrExtintor(extintor) {
    if (typeof window === "undefined") return extintor?.tokenQr || "";
    return `${window.location.origin}/?vistoriaQr=${encodeURIComponent(extintor?.tokenQr || "")}`;
}
