export function escaparHtmlControleMaoDeObraDds(valor = "") {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function parseDataControleMaoDeObraDds(valor = "") {
    const texto = String(valor || "").trim();

    if (!texto) return null;

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
        const [ano, mes, dia] = texto.slice(0, 10).split("-").map(Number);
        return new Date(ano, mes - 1, dia);
    }

    if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
        const [dia, mes, ano] = texto.slice(0, 10).split("/").map(Number);
        return new Date(ano, mes - 1, dia);
    }

    const data = new Date(texto);
    return Number.isNaN(data.getTime()) ? null : data;
}

export function formatarDataControleMaoDeObraDds(valor = "") {
    const data = parseDataControleMaoDeObraDds(valor);

    if (!data) return "-";

    return data.toLocaleDateString("pt-BR");
}

export function normalizarNomeEmpresaMaoDeObraDds(valor = "") {
    return String(valor || "Empresa não informada").trim().toUpperCase() || "EMPRESA NÃO INFORMADA";
}

export function normalizarFuncaoMaoDeObraDds(valor = "") {
    return String(valor || "Sem função").trim().toUpperCase() || "SEM FUNÇÃO";
}

export function formatarNumeroMaoDeObraDds(valor = 0) {
    const numero = Number(valor || 0);

    if (Number.isInteger(numero)) {
        return String(numero);
    }

    return numero.toFixed(1).replace(".", ",");
}

export function registroAtualPertenceAoMesHistoricoDds(registro, periodo) {
    if (!registro || !periodo?.inicio || !periodo?.fim) return false;

    const inicio = parseDataControleMaoDeObraDds(periodo.inicio);
    const fim = parseDataControleMaoDeObraDds(periodo.fim);

    if (!inicio || !fim) return false;

    const codigo = String(registro?.codigo || registro?.dados?.codigo || "").trim();
    const codigoMes = codigo.match(/DDS-(\d{4})-(\d{2})/i);

    if (codigoMes) {
        const anoCodigo = Number(codigoMes[1]);
        const mesCodigo = Number(codigoMes[2]) - 1;

        if (anoCodigo === inicio.getFullYear() && mesCodigo === inicio.getMonth()) {
            return true;
        }
    }

    const datas = [
        registro?.periodoInicio,
        registro?.periodoFim,
        registro?.dataInicio,
        registro?.dataFim,
        registro?.data,
        registro?.criadoEm,
        registro?.createdAt,
        registro?.created_at,
        registro?.updatedAt,
        registro?.updated_at,
        registro?.dados?.periodoInicio,
        registro?.dados?.periodoFim,
        registro?.dados?.dataInicio,
        registro?.dados?.dataFim,
        registro?.dados?.data,
        registro?.dados?.salvoEm,
        registro?.dados?.conferenciaAssistida?.salvoEm,
        registro?.dados?.conferenciaAssistida?.fechamento?.concluidoEm,
        registro?.dados?.conferenciaAssistida?.fechamento?.data,
    ];

    return datas.some((valor) => {
        const data = parseDataControleMaoDeObraDds(valor);
        return data && data >= inicio && data <= fim;
    });
}
