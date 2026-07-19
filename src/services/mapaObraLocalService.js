const CHAVE_MAPA_OBRA_LOCAL = "safescan:mapa-obra:mvp:v2";
const CHAVE_MAPA_OBRA_LEGACY = "safescan:mapa-obra:mvp:v1";
const CHAVE_MAPA_OBRA_ATIVA = "safescan:mapa-obra:obra-ativa";

function obterTiposPontoPersonalizados(valor = {}, pontos = []) {
    const informados = Array.isArray(valor.tiposPontoPersonalizados)
        ? valor.tiposPontoPersonalizados
        : pontos.map((item) => String(item?.tipo || "").trim());

    const tiposPadrao = new Set(
        [
            "Escritório",
            "Canteiro",
            "Almoxarifado",
            "Vestiário",
            "Área de refeição",
            "Central de vendas",
            "Placa de sinalização",
            "Outro ponto",
        ].map((tipo) => tipo.toLocaleLowerCase("pt-BR")),
    );

    const catalogo = new Map();

    informados
        .map((tipo) => String(tipo || "").trim())
        .filter(Boolean)
        .forEach((tipo) => {
            const chave = tipo.toLocaleLowerCase("pt-BR");

            if (!tiposPadrao.has(chave) && !catalogo.has(chave)) {
                catalogo.set(chave, tipo);
            }
        });

    return Array.from(catalogo.values());
}
function obterTiposAlertaPersonalizados(valor = {}, alertas = []) {
    const informados = Array.isArray(valor.tiposAlertaPersonalizados)
        ? valor.tiposAlertaPersonalizados
        : alertas.map((item) => String(item?.tipo || "").trim());
    const tiposPadrao = new Set([
        "Buraco ou escavação",
        "Área sem isolamento",
        "Risco de queda",
        "Risco elétrico",
        "Circulação de máquinas",
        "Acesso obstruído",
        "Vazamento",
        "Sinalização inadequada",
        "Falta de EPI",
        "Trabalho em altura",
        "Outro alerta",
    ]);
    return Array.from(
        new Set(
            informados
                .map((tipo) => String(tipo || "").trim())
                .filter((tipo) => tipo && !tiposPadrao.has(tipo)),
        ),
    );
}

function mapaVazio() {
    return {
        obraId: "",
        obraNome: "",
        planta: null,
        pontos: [],
        tiposPontoPersonalizados: [],
        alertas: [],
        tiposAlertaPersonalizados: [],
    };
}

function normalizarMapa(valor = {}) {
    const pontos = Array.isArray(valor.pontos) ? valor.pontos : [];
    const alertas = Array.isArray(valor.alertas) ? valor.alertas : [];

    return {
        empresaId: String(valor.empresaId || ""),
        empresaNome: String(valor.empresaNome || ""),
        obraId: String(valor.obraId || ""),
        obraNome: String(valor.obraNome || ""),
        planta: valor.planta || null,
        pontos,
        tiposPontoPersonalizados: obterTiposPontoPersonalizados(
            valor,
            pontos,
        ),
        alertas,
        tiposAlertaPersonalizados: obterTiposAlertaPersonalizados(
            valor,
            alertas,
        ),
    };
}

function lerArmazenamento() {
    if (typeof window === "undefined") return { mapas: [] };
    const atual = JSON.parse(window.localStorage.getItem(CHAVE_MAPA_OBRA_LOCAL) || "null");
    if (Array.isArray(atual?.mapas)) return atual;
    const legado = JSON.parse(window.localStorage.getItem(CHAVE_MAPA_OBRA_LEGACY) || "null");
    return legado?.obraId ? { mapas: [normalizarMapa(legado)] } : { mapas: [] };
}

export function lerMapaObraLocal(obraId = "") {
    if (typeof window === "undefined") return mapaVazio();
    try {
        const mapas = lerArmazenamento().mapas;
        const ativa = obraId || window.localStorage.getItem(CHAVE_MAPA_OBRA_ATIVA) || "";
        const mapa = ativa ? mapas.find((item) => String(item.obraId || "") === String(ativa)) : mapas[0];
        return mapa ? normalizarMapa(mapa) : mapaVazio();
    } catch { return mapaVazio(); }
}

export function listarMapasObraLocal() {
    if (typeof window === "undefined") return [];
    try {
        return lerArmazenamento().mapas.map(normalizarMapa);
    } catch { return []; }
}

export function salvarMapaObraLocal(mapa) {
    const proximo = { ...mapaVazio(), ...(mapa && typeof mapa === "object" ? mapa : {}), ...normalizarMapa(mapa) };
    if (typeof window !== "undefined") {
        try {
            const mapas = lerArmazenamento().mapas.filter((item) => String(item.obraId || "") !== String(proximo.obraId || ""));
            if (proximo.obraId) mapas.push(proximo);
            window.localStorage.setItem(CHAVE_MAPA_OBRA_LOCAL, JSON.stringify({ mapas }));
            if (proximo.obraId) window.localStorage.setItem(CHAVE_MAPA_OBRA_ATIVA, proximo.obraId);
            window.dispatchEvent(new CustomEvent("safescan-mapa-atualizado"));
        } catch { /* armazenamento pode estar indisponível */ }
    }
    return proximo;
}

export function criarTokenMapaLocal() { return `mapa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`; }
