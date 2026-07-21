const normalizar = (valor = "") => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const limparValorExtraido = (valor = "") => String(valor || "")
    .replace(/^[\s:;|_-]+|[\s:;|_-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

const extrairCampo = (texto, rotulos, rotulosFim) => {
    const inicio = `(?:${rotulos.join("|")})\\s*[:;|_-]?\\s*`;
    const fim = rotulosFim.length ? `(?=\\s+(?:${rotulosFim.join("|")})\\s*[:;|_-]?|$)` : "$";
    const correspondencia = String(texto || "").match(new RegExp(`${inicio}(.+?)${fim}`, "i"));
    return limparValorExtraido(correspondencia?.[1] || "");
};

const linhaPertenceAoDia = (linhaNormalizada, dia) => {
    const candidatos = [dia?.nome, dia?.curto, dia?.dia, dia?.data]
        .map(normalizar)
        .filter((valor) => valor.length >= 3);

    return candidatos.some((valor) => linhaNormalizada.includes(valor));
};

export function extrairSugestoesTemaResponsavelDds({ linhasOcr = [], texto = "", dias = [] } = {}) {
    const linhas = [
        ...linhasOcr.map((linha) => String(linha?.texto || "")),
        ...String(texto || "").split(/[\r\n]+/),
    ].map(limparValorExtraido).filter((linha) => linha.length >= 5);

    return dias.map((dia) => {
        const linhasDoDia = linhas.filter((linha) => linhaPertenceAoDia(normalizar(linha), dia));
        const candidatas = linhasDoDia.length ? linhasDoDia : [];
        let temaSugerido = "";
        let responsavelSugerido = "";

        for (const linha of candidatas) {
            if (!temaSugerido) {
                temaSugerido = extrairCampo(
                    linha,
                    ["tema", "assunto"],
                    ["respons[aá]vel", "aplicador", "ministrante", "tema", "assunto"]
                );
            }

            if (!responsavelSugerido) {
                responsavelSugerido = extrairCampo(
                    linha,
                    ["respons[aá]vel", "aplicador", "ministrante"],
                    ["tema", "assunto", "data", "dia"]
                );
            }
        }

        const possuiTema = temaSugerido.length >= 3 && temaSugerido.length <= 180;
        const possuiResponsavel = responsavelSugerido.length >= 3 && responsavelSugerido.length <= 100;

        return {
            temaSugerido: possuiTema ? temaSugerido : "",
            responsavelSugerido: possuiResponsavel ? responsavelSugerido : "",
            confianca: possuiTema && possuiResponsavel ? 0.78 : (possuiTema || possuiResponsavel ? 0.62 : 0),
            origem: possuiTema || possuiResponsavel ? "ocr_local_rotulado" : "nao_identificado",
            requerConferenciaManual: true,
        };
    });
}
