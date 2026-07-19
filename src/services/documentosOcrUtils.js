// Utilitários puros compartilhados pelos fluxos de OCR documental.

export function limparTextoPossivelDocumento(texto = "") {
    return String(texto || "")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\n/g, " ")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function formatarDataBr(iso = "") {
    const partes = String(iso || "").slice(0, 10).split("-");

    if (partes.length !== 3) return iso;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

export function filtrarDatasPorCategoria(datas = [], categoria = "") {
    return datas.filter((data) => Array.isArray(data.categorias) && data.categorias.includes(categoria));
}

export function valorPareceSomenteDocumentoFiscal(valor = "") {
    const texto = limparTextoPossivelDocumento(valor);
    const digitos = texto.replace(/\D/g, "");
    const semPontuacao = texto.replace(/[.\-/\s]/g, "");

    if (!texto) return false;
    if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(texto)) return true;
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(texto)) return true;
    if ((digitos.length === 14 || digitos.length === 11) && semPontuacao === digitos) return true;

    return false;
}
