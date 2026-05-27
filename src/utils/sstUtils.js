import { DAY, LIMITE_STORAGE_MB } from "../constants/sstConstants";

const hoje = new Date();

export function normalizarTextoBusca(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}


export function normalizarDataAniversario(valor) {
    if (!valor) return "";

    const texto = String(valor).trim();
    if (!texto) return "";

    const somenteData = texto.slice(0, 10);

    // Formato padrão salvo pelo campo date do Supabase/input: YYYY-MM-DD.
    const iso = somenteData.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
        const ano = Number(iso[1]);
        const mes = Number(iso[2]);
        const dia = Number(iso[3]);
        const data = new Date(ano, mes - 1, dia, 12, 0, 0);

        if (data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia) {
            return `${iso[1]}-${iso[2]}-${iso[3]}`;
        }

        return "";
    }

    // Aceita datas digitadas/importadas como DD/MM/YYYY, DD-MM-YYYY ou DD.MM.YYYY.
    const br = texto.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (br) {
        const dia = Number(br[1]);
        const mes = Number(br[2]);
        let ano = Number(br[3]);

        if (ano < 100) ano += ano >= 70 ? 1900 : 2000;

        const data = new Date(ano, mes - 1, dia, 12, 0, 0);
        if (data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia) {
            return `${String(ano).padStart(4, "0")}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        }
    }

    return "";
}


export function diasParaVencer(dataISO) {
    if (!dataISO) return null;

    const venc = new Date(`${dataISO}T12:00:00`);
    const base = new Date(hoje.toISOString().slice(0, 10) + "T12:00:00");
    const dias = Math.ceil((venc - base) / DAY);

    return Number.isFinite(dias) ? dias : null;
}


export function formatDate(dataISO) {
    if (!dataISO) return "-";
    return new Date(`${dataISO}T12:00:00`).toLocaleDateString("pt-BR");
}


export function formatarAniversario(dataISO) {
    const data = normalizarDataAniversario(dataISO);
    if (!data) return "-";
    return `${data.slice(8, 10)}/${data.slice(5, 7)}/${data.slice(0, 4)}`;
}


export function formatarDataHora(dataISO) {
    if (!dataISO) return "-";
    const data = new Date(dataISO);
    if (Number.isNaN(data.getTime())) return "-";
    return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}


export function textoNaoAplicavel(valor = "") {
    const texto = String(valor || "").trim();
    if (!texto) return "";
    const normalizado = normalizarTextoBusca(texto).replace(/_/g, " ");
    if (normalizado.includes("nao aplicavel") || normalizado.includes("não aplicavel")) return "";
    return texto;
}


export function apenasNumeros(valor) {
    return String(valor || "").replace(/\D/g, "");
}


export function formatarBytes(bytes = 0) {
    const valor = Number(bytes) || 0;

    if (valor < 1024) return `${valor} B`;
    if (valor < 1024 ** 2) return `${(valor / 1024).toFixed(1)} KB`;
    if (valor < 1024 ** 3) return `${(valor / 1024 ** 2).toFixed(2)} MB`;

    return `${(valor / 1024 ** 3).toFixed(2)} GB`;
}


export function calcularPercentualUsoStorage(bytesUsados = 0) {
    const limiteBytes = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    return Math.min(100, Math.max(0, Math.round((Number(bytesUsados || 0) / limiteBytes) * 100)));
}


export function resumirNavegador(userAgent = "") {
    const agente = String(userAgent || "");

    if (agente.includes("Edg/")) return "Microsoft Edge";
    if (agente.includes("Chrome/")) return "Google Chrome";
    if (agente.includes("Firefox/")) return "Mozilla Firefox";
    if (agente.includes("Safari/") && !agente.includes("Chrome/")) return "Safari";

    return agente ? "Navegador identificado" : "Não identificado";
}


export function obterOrigemAcesso() {
    if (typeof window === "undefined") {
        return {
            url: "Servidor / ambiente sem navegador",
            pagina: "-",
            navegador: "-",
            plataforma: "-",
            idioma: "-",
        };
    }

    return {
        url: window.location?.href || "",
        origem: window.location?.origin || "",
        pagina: `${window.location?.pathname || "/"}${window.location?.search || ""}`,
        navegador: resumirNavegador(window.navigator?.userAgent || ""),
        userAgent: window.navigator?.userAgent || "",
        plataforma: window.navigator?.platform || "",
        idioma: window.navigator?.language || "",
    };
}


export function normalizarEmailDestinatario(valor) {
    return String(valor || "")
        .split(/[;,]/)
        .map((email) => email.trim())
        .filter(Boolean)
        .join(",");
}


export function formatarCnpj(valor) {
    const numeros = apenasNumeros(valor).slice(0, 14);

    if (!numeros) return "";

    return numeros
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}


export function formatarTelefone(valor) {
    const numeros = apenasNumeros(valor).slice(0, 11);

    if (!numeros) return "";

    if (numeros.length <= 10) {
        return numeros
            .replace(/^(\d{2})(\d)/, "($1) $2")
            .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return numeros
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
}


export function classNames(...items) {
    return items.filter(Boolean).join(" ");
}


export function obterParametroUrl(nome) {
    if (typeof window === "undefined") return "";

    const parametrosNormais = new URLSearchParams(window.location.search || "");
    const valorNormal = parametrosNormais.get(nome);

    if (valorNormal) return valorNormal;

    const hash = window.location.hash || "";
    const queryHash = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
    const parametrosHash = new URLSearchParams(queryHash);

    return parametrosHash.get(nome) || "";
}


export function extrairCaminhoStorage(bucket, caminhoOuUrl) {
    const valor = String(caminhoOuUrl || "").trim();
    if (!valor) return "";

    if (!valor.startsWith("http")) {
        return valor.replace(/^\/+/, "");
    }

    try {
        const url = new URL(valor);
        const marcadores = [
            `/storage/v1/object/public/${bucket}/`,
            `/storage/v1/object/sign/${bucket}/`,
        ];

        const marcador = marcadores.find((item) => url.pathname.includes(item));
        if (!marcador) return valor;

        const caminho = url.pathname.slice(url.pathname.indexOf(marcador) + marcador.length);
        return decodeURIComponent(caminho).replace(/^\/+/, "");
    } catch {
        return valor;
    }
}


export function ehUuid(valor) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(valor || "").trim()
    );
}


export function sanitizarNomeArquivo(nome) {
    return String(nome || "documento.pdf")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .replace(/-+/g, "-")
        .toLowerCase();
}


export function abrirArquivoUrl(url) {
    if (!url) return;

    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


export function converterDataParaISO(dia, mes, ano) {
    const d = Number(dia);
    const m = Number(mes);
    let a = Number(ano);

    if (!d || !m || !a) return "";

    if (a < 100) a += a >= 70 ? 1900 : 2000;

    if (d < 1 || d > 31 || m < 1 || m > 12 || a < 1990 || a > 2100) return "";

    const data = new Date(a, m - 1, d, 12, 0, 0);

    if (data.getFullYear() !== a || data.getMonth() !== m - 1 || data.getDate() !== d) {
        return "";
    }

    return data.toISOString().slice(0, 10);
}


export function converterDataIsoDireta(ano, mes, dia) {
    return converterDataParaISO(dia, mes, ano);
}


export function limparTextoPdfBruto(texto = "") {
    return String(texto || "")
        .replace(/\\r/g, " ")
        .replace(/\\n/g, " ")
        .replace(/[()<>[\]{}]/g, " ")
        .replace(/\s+/g, " ");
}
