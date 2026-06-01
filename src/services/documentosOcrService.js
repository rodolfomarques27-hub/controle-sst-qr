import {
    DOCUMENTOS_VERIFICACAO_PESOS,
    DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO,
} from "../constants/documentosVerificacaoConstants";
import {
    criarIndicioVerificacao,
    diferencaDiasVerificacao,
    formatarDataIsoVerificacao,
    normalizarTextoVerificacao,
    obterDataSeguraVerificacao,
    obterExtensaoArquivoVerificacao,
} from "../utils/documentosVerificacaoUtils";

const LIMITE_BYTES_LEITURA_LOCAL = 8 * 1024 * 1024;
const LIMITE_TEXTO_OCR_SALVAR = 6000;
const TOLERANCIA_DIAS_COMPARACAO = 2;

const DATAS_PADRAO_IGNORADAS = new Set([
    "1900-01-01",
    "1970-01-01",
    "1999-02-22",
]);

const MESES_PT_BR = Object.freeze({
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

function arquivoPossuiArrayBuffer(arquivo = null) {
    return Boolean(
        arquivo &&
        typeof arquivo === "object" &&
        typeof arquivo.arrayBuffer === "function"
    );
}

function obterNomeArquivo(arquivo = null, arquivoNome = "") {
    if (arquivo?.name) return arquivo.name;
    return String(arquivoNome || "").trim();
}

function obterMimeArquivo(arquivo = null, mimeType = "") {
    if (arquivo?.type) return arquivo.type;
    return String(mimeType || "").trim();
}

function obterExtensaoArquivo({ arquivo = null, arquivoNome = "" } = {}) {
    return obterExtensaoArquivoVerificacao(obterNomeArquivo(arquivo, arquivoNome));
}

function textoContemConteudoMinimo(texto = "") {
    const limpo = String(texto || "")
        .replace(/[^a-zA-ZÀ-ÿ0-9/.-]/g, "")
        .trim();

    return limpo.length >= 20;
}

function decodificarBytes(bytes, codificacao) {
    try {
        return new TextDecoder(codificacao, { fatal: false }).decode(bytes);
    } catch {
        return "";
    }
}

function limparTextoPossivelDocumento(texto = "") {
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

function limitarTextoParaSalvar(texto = "") {
    const limpo = limparTextoPossivelDocumento(texto);

    if (limpo.length <= LIMITE_TEXTO_OCR_SALVAR) {
        return limpo;
    }

    return `${limpo.slice(0, LIMITE_TEXTO_OCR_SALVAR)}... [texto limitado para armazenamento]`;
}

function obterContextoTexto(texto = "", indice = 0, tamanho = 70) {
    const inicio = Math.max(0, indice - tamanho);
    const fim = Math.min(texto.length, indice + tamanho);

    return limparTextoPossivelDocumento(texto.slice(inicio, fim));
}

function normalizarAno(anoValor) {
    const texto = String(anoValor || "").trim();
    const numero = Number(texto);

    if (!Number.isFinite(numero)) return null;

    if (texto.length === 2) {
        return numero <= 49 ? 2000 + numero : 1900 + numero;
    }

    return numero;
}

function montarDataIso(diaValor, mesValor, anoValor) {
    const dia = Number(diaValor);
    const mes = Number(mesValor);
    const ano = normalizarAno(anoValor);

    if (!Number.isInteger(dia) || !Number.isInteger(mes) || !Number.isInteger(ano)) return null;
    if (ano < 1990 || ano > 2100) return null;
    if (mes < 1 || mes > 12) return null;
    if (dia < 1 || dia > 31) return null;

    const data = new Date(ano, mes - 1, dia, 12, 0, 0);

    if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes - 1 ||
        data.getDate() !== dia
    ) {
        return null;
    }

    return data.toISOString().slice(0, 10);
}

function formatarDataBr(iso = "") {
    const partes = String(iso || "").slice(0, 10).split("-");

    if (partes.length !== 3) return iso;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function classificarContextoData(contexto = "") {
    const texto = normalizarTextoVerificacao(contexto);
    const categorias = [];

    if (/assin|signature|certificado digital|validacao digital|validado digitalmente|icp-brasil|carimbo de tempo/.test(texto)) {
        categorias.push("assinatura_digital");
    }

    if (/validade|vencimento|vence|vencera|vencerá|expira|expiracao|expiração|vigencia|vigência|ate|até|prazo/.test(texto)) {
        categorias.push("vencimento");
    }

    if (/emissao|emissão|emitido|realizacao|realização|realizado|conclusao|conclusão|concluido|concluído|treinamento|curso|data de inicio|data de início|inicio|início/.test(texto)) {
        categorias.push("emissao_realizacao");
    }

    return categorias;
}

function registrarDataEncontrada({ mapa, iso, contexto, origem }) {
    if (!iso || DATAS_PADRAO_IGNORADAS.has(iso)) return;

    const existente = mapa.get(iso);
    const categorias = classificarContextoData(contexto);

    if (existente) {
        existente.ocorrencias += 1;
        existente.categorias = Array.from(new Set([...existente.categorias, ...categorias]));

        if (contexto && contexto.length > existente.contexto.length) {
            existente.contexto = contexto;
        }

        return;
    }

    mapa.set(iso, {
        iso,
        br: formatarDataBr(iso),
        contexto,
        categorias,
        origem,
        ocorrencias: 1,
    });
}

export function extrairDatasTextoDocumental(texto = "", origem = "texto") {
    const conteudo = limparTextoPossivelDocumento(texto);
    const mapa = new Map();

    const regexDataBr = /\b([0-3]?\d)[\/.-]([01]?\d)[\/.-]((?:19|20)\d{2}|\d{2})\b/g;
    const regexDataIso = /\b((?:19|20)\d{2})[\/.-]([01]?\d)[\/.-]([0-3]?\d)\b/g;
    const regexDataExtenso = /\b([0-3]?\d)\s+de\s+([a-zA-ZÀ-ÿçÇ]+)\s+de\s+((?:19|20)\d{2}|\d{2})\b/gi;

    for (const match of conteudo.matchAll(regexDataBr)) {
        const iso = montarDataIso(match[1], match[2], match[3]);
        registrarDataEncontrada({
            mapa,
            iso,
            contexto: obterContextoTexto(conteudo, match.index || 0),
            origem,
        });
    }

    for (const match of conteudo.matchAll(regexDataIso)) {
        const iso = montarDataIso(match[3], match[2], match[1]);
        registrarDataEncontrada({
            mapa,
            iso,
            contexto: obterContextoTexto(conteudo, match.index || 0),
            origem,
        });
    }

    for (const match of conteudo.matchAll(regexDataExtenso)) {
        const mes = MESES_PT_BR[normalizarTextoVerificacao(match[2])];
        const iso = mes ? montarDataIso(match[1], mes, match[3]) : null;
        registrarDataEncontrada({
            mapa,
            iso,
            contexto: obterContextoTexto(conteudo, match.index || 0),
            origem,
        });
    }

    return Array.from(mapa.values()).sort((a, b) => a.iso.localeCompare(b.iso));
}

function filtrarDatasPorCategoria(datas = [], categoria = "") {
    return datas.filter((data) => Array.isArray(data.categorias) && data.categorias.includes(categoria));
}

function calcularConfiancaLeitura({ textoExtraido = "", datasEncontradas = [], tipoLeitura = "", textoLimitado = false } = {}) {
    let score = 0;

    if (textoContemConteudoMinimo(textoExtraido)) score += 35;
    if (tipoLeitura === "pdf_texto_local") score += 20;
    if (tipoLeitura === "nome_arquivo") score += 10;
    score += Math.min(30, datasEncontradas.length * 10);

    if (textoLimitado) score -= 8;

    return Math.max(0, Math.min(100, Math.round(score)));
}

function montarRetornoLeituraBase({
    executado = false,
    tipoLeitura = "nao_executado",
    arquivoNome = "",
    mimeType = "",
    extensao = "",
    textoExtraido = "",
    textoLimitado = false,
    avisos = [],
    erro = "",
} = {}) {
    const textoParaDatas = [textoExtraido, arquivoNome].filter(Boolean).join(" ");
    const datasEncontradas = extrairDatasTextoDocumental(textoParaDatas, textoExtraido ? tipoLeitura : "nome_arquivo");
    const datasAssinaturaDigital = filtrarDatasPorCategoria(datasEncontradas, "assinatura_digital");
    const datasProvaveisVencimento = filtrarDatasPorCategoria(datasEncontradas, "vencimento");
    const datasProvaveisEmissaoRealizacao = filtrarDatasPorCategoria(datasEncontradas, "emissao_realizacao");
    const confianca = calcularConfiancaLeitura({
        textoExtraido,
        datasEncontradas,
        tipoLeitura,
        textoLimitado,
    });

    const resumo = datasEncontradas.length
        ? `Leitura local encontrou ${datasEncontradas.length} data(s): ${datasEncontradas.map((data) => data.br).join(", ")}.`
        : "Leitura local não encontrou datas confiáveis no arquivo.";

    return {
        executado,
        tipoLeitura,
        arquivoNome,
        mimeType,
        extensao,
        confianca,
        textoExtraido: limitarTextoParaSalvar(textoExtraido),
        textoLimitado,
        datasEncontradas,
        datasAssinaturaDigital,
        datasProvaveisVencimento,
        datasProvaveisEmissaoRealizacao,
        avisos,
        erro,
        resumo,
    };
}

export async function executarLeituraDocumentalLocal({ arquivo = null, arquivoNome = "", mimeType = "" } = {}) {
    const nome = obterNomeArquivo(arquivo, arquivoNome);
    const mime = obterMimeArquivo(arquivo, mimeType);
    const extensao = obterExtensaoArquivo({ arquivo, arquivoNome: nome });

    if (!arquivoPossuiArrayBuffer(arquivo)) {
        return montarRetornoLeituraBase({
            executado: false,
            tipoLeitura: nome ? "nome_arquivo" : "sem_arquivo_local",
            arquivoNome: nome,
            mimeType: mime,
            extensao,
            textoExtraido: "",
            avisos: nome ? ["Somente o nome do arquivo foi usado para tentativa de identificar datas."] : [],
        });
    }

    if (/^image\//i.test(mime) || ["jpg", "jpeg", "png", "webp"].includes(extensao)) {
        return montarRetornoLeituraBase({
            executado: false,
            tipoLeitura: "imagem_dependente_ocr",
            arquivoNome: nome,
            mimeType: mime,
            extensao,
            textoExtraido: "",
            avisos: [
                "Arquivo de imagem identificado. OCR real de imagem será tratado em etapa própria para não aumentar o bundle principal.",
            ],
        });
    }

    if (extensao && extensao !== "pdf" && mime !== "application/pdf") {
        return montarRetornoLeituraBase({
            executado: false,
            tipoLeitura: "formato_sem_leitura_textual",
            arquivoNome: nome,
            mimeType: mime,
            extensao,
            textoExtraido: "",
            avisos: ["Formato sem leitura textual local nesta etapa."],
        });
    }

    try {
        const buffer = await arquivo.arrayBuffer();
        const tamanhoOriginal = buffer.byteLength;
        const textoLimitado = tamanhoOriginal > LIMITE_BYTES_LEITURA_LOCAL;
        const bytes = new Uint8Array(buffer.slice(0, LIMITE_BYTES_LEITURA_LOCAL));
        const textoUtf8 = decodificarBytes(bytes, "utf-8");
        const textoWin1252 = decodificarBytes(bytes, "windows-1252");
        const textoExtraido = limparTextoPossivelDocumento(`${textoUtf8} ${textoWin1252}`);
        const avisos = [];

        if (textoLimitado) {
            avisos.push("Leitura limitada aos primeiros 8 MB para preservar performance no navegador.");
        }

        if (!textoContemConteudoMinimo(textoExtraido)) {
            avisos.push("Não foi encontrada camada de texto legível. O PDF pode ser digitalizado como imagem.");
        }

        return montarRetornoLeituraBase({
            executado: true,
            tipoLeitura: "pdf_texto_local",
            arquivoNome: nome,
            mimeType: mime,
            extensao,
            textoExtraido,
            textoLimitado,
            avisos,
        });
    } catch (error) {
        return montarRetornoLeituraBase({
            executado: false,
            tipoLeitura: "erro_leitura_local",
            arquivoNome: nome,
            mimeType: mime,
            extensao,
            textoExtraido: "",
            erro: error?.message || "Erro ao executar leitura local do arquivo.",
            avisos: ["A leitura local falhou, mas o fluxo de salvamento não deve ser bloqueado."],
        });
    }
}

function encontrarDataMaisProxima(dataCadastroIso, datas = []) {
    const dataCadastro = obterDataSeguraVerificacao(dataCadastroIso);

    if (!dataCadastro || !datas.length) return null;

    return datas
        .map((data) => {
            const diferenca = Math.abs(diferencaDiasVerificacao(dataCadastro, data.iso) ?? 999999);
            return { ...data, diferencaDias: diferenca };
        })
        .sort((a, b) => a.diferencaDias - b.diferencaDias)[0] || null;
}

function datasContemCadastro(dataCadastroIso, datas = []) {
    const dataCadastro = obterDataSeguraVerificacao(dataCadastroIso);

    if (!dataCadastro) return true;

    return datas.some((data) => {
        const diferenca = Math.abs(diferencaDiasVerificacao(dataCadastro, data.iso) ?? 999999);
        return diferenca <= TOLERANCIA_DIAS_COMPARACAO;
    });
}

function compararCampoDataCadastro({
    leitura,
    dataCadastro,
    labelCampo,
    codigo,
    categoriaPreferencial = "",
    pesoPadrao = DOCUMENTOS_VERIFICACAO_PESOS.DATA_CADASTRO_NAO_LOCALIZADA_DOCUMENTO,
} = {}) {
    const dataCadastroIso = formatarDataIsoVerificacao(dataCadastro);

    if (!dataCadastroIso || !leitura?.datasEncontradas?.length) return null;

    const datasPreferenciais = categoriaPreferencial
        ? filtrarDatasPorCategoria(leitura.datasEncontradas, categoriaPreferencial)
        : [];
    const baseComparacao = datasPreferenciais.length ? datasPreferenciais : leitura.datasEncontradas;

    if (datasContemCadastro(dataCadastroIso, baseComparacao)) return null;

    const maisProxima = encontrarDataMaisProxima(dataCadastroIso, baseComparacao);
    const peso = maisProxima?.diferencaDias >= 30
        ? pesoPadrao
        : DOCUMENTOS_VERIFICACAO_PESOS.DATA_CADASTRO_NAO_LOCALIZADA_DOCUMENTO_LEVE;

    return criarIndicioVerificacao({
        codigo,
        tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
        titulo: `${labelCampo} cadastrada não localizada na leitura do documento`,
        detalhe: maisProxima
            ? `${labelCampo} cadastrada: ${formatarDataBr(dataCadastroIso)}. Data mais próxima lida no arquivo: ${maisProxima.br} (${maisProxima.diferencaDias} dia(s) de diferença).`
            : `${labelCampo} cadastrada: ${formatarDataBr(dataCadastroIso)}. Datas lidas no arquivo: ${leitura.datasEncontradas.map((data) => data.br).join(", ")}.`,
        peso,
        recomendacao: "Conferir manualmente se a data cadastrada no sistema corresponde à data real do documento.",
        dados: {
            dataCadastro: dataCadastroIso,
            dataMaisProximaDocumento: maisProxima?.iso || null,
            diferencaDias: maisProxima?.diferencaDias ?? null,
            datasEncontradas: leitura.datasEncontradas.map((data) => data.iso),
        },
    });
}

function avaliarAssinaturaDigitalLeitura({ leitura, dataVencimento } = {}) {
    const indicios = [];
    const hoje = new Date();
    const hojeMeioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0);
    const vencimento = obterDataSeguraVerificacao(dataVencimento);

    for (const dataAssinatura of leitura?.datasAssinaturaDigital || []) {
        const assinatura = obterDataSeguraVerificacao(dataAssinatura.iso);

        if (!assinatura) continue;

        if (assinatura > hojeMeioDia) {
            indicios.push(criarIndicioVerificacao({
                codigo: "assinatura_digital_futura",
                tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
                titulo: "Data de assinatura digital futura",
                detalhe: `A leitura local identificou possível data de assinatura digital futura: ${dataAssinatura.br}.`,
                peso: DOCUMENTOS_VERIFICACAO_PESOS.DATA_ASSINATURA_DIGITAL_FUTURA,
                recomendacao: "Conferir o certificado digital, carimbo de tempo ou validade da assinatura.",
                dados: { dataAssinatura: dataAssinatura.iso },
            }));
        }

        if (vencimento && assinatura > vencimento) {
            indicios.push(criarIndicioVerificacao({
                codigo: "assinatura_digital_apos_vencimento",
                tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
                titulo: "Assinatura digital posterior ao vencimento cadastrado",
                detalhe: `Assinatura provável: ${dataAssinatura.br}. Vencimento cadastrado: ${formatarDataBr(formatarDataIsoVerificacao(vencimento))}.`,
                peso: DOCUMENTOS_VERIFICACAO_PESOS.DATA_ASSINATURA_APOS_VENCIMENTO,
                recomendacao: "Validar manualmente a assinatura digital e a vigência do documento.",
                dados: {
                    dataAssinatura: dataAssinatura.iso,
                    dataVencimento: formatarDataIsoVerificacao(vencimento),
                },
            }));
        }
    }

    return indicios;
}

export function avaliarLeituraDocumentalComCadastro({
    leitura,
    dataEmissao,
    dataRealizacao,
    dataVencimento,
    origemTipo = "documento_empresa",
} = {}) {
    const indicios = [];

    if (!leitura) return indicios;

    if (leitura.executado && !leitura.datasEncontradas?.length && textoContemConteudoMinimo(leitura.textoExtraido)) {
        indicios.push(criarIndicioVerificacao({
            codigo: "nenhuma_data_localizada_leitura_documental",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OCR,
            titulo: "Nenhuma data localizada na leitura local do documento",
            detalhe: "O arquivo possui algum texto legível, mas nenhuma data foi localizada nos formatos esperados.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.NENHUMA_DATA_LOCALIZADA_DOCUMENTO,
            recomendacao: "Conferir manualmente datas, assinatura, emissão e validade do documento.",
            dados: {
                tipoLeitura: leitura.tipoLeitura,
                confianca: leitura.confianca,
            },
        }));
    }

    if (leitura.datasEncontradas?.length) {
        const indicioDataEmissao = origemTipo === "certificado"
            ? compararCampoDataCadastro({
                leitura,
                dataCadastro: dataRealizacao,
                labelCampo: "Data de realização/emissão",
                codigo: "data_realizacao_nao_localizada_documento",
                categoriaPreferencial: "emissao_realizacao",
            })
            : compararCampoDataCadastro({
                leitura,
                dataCadastro: dataEmissao,
                labelCampo: "Data de emissão",
                codigo: "data_emissao_nao_localizada_documento",
                categoriaPreferencial: "emissao_realizacao",
            });

        const indicioVencimento = compararCampoDataCadastro({
            leitura,
            dataCadastro: dataVencimento,
            labelCampo: "Data de vencimento",
            codigo: "data_vencimento_nao_localizada_documento",
            categoriaPreferencial: "vencimento",
            pesoPadrao: DOCUMENTOS_VERIFICACAO_PESOS.DATA_VENCIMENTO_DIVERGENTE_DOCUMENTO,
        });

        if (indicioDataEmissao) indicios.push(indicioDataEmissao);
        if (indicioVencimento) indicios.push(indicioVencimento);
    }

    indicios.push(...avaliarAssinaturaDigitalLeitura({ leitura, dataVencimento }));

    return indicios;
}

export function montarRetornoLeituraParaPersistencia(leitura = null) {
    if (!leitura) return null;

    return {
        tipo_leitura: leitura.tipoLeitura,
        executado: Boolean(leitura.executado),
        confianca: leitura.confianca,
        resumo: leitura.resumo,
        datas_encontradas: (leitura.datasEncontradas || []).map((data) => ({
            iso: data.iso,
            br: data.br,
            categorias: data.categorias,
            ocorrencias: data.ocorrencias,
            contexto: data.contexto,
        })),
        datas_assinatura_digital: (leitura.datasAssinaturaDigital || []).map((data) => data.iso),
        datas_provaveis_vencimento: (leitura.datasProvaveisVencimento || []).map((data) => data.iso),
        datas_provaveis_emissao_realizacao: (leitura.datasProvaveisEmissaoRealizacao || []).map((data) => data.iso),
        avisos: leitura.avisos || [],
        erro: leitura.erro || "",
    };
}
