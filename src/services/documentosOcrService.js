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
const LIMITE_TEXTO_PDFJS = 18000;
const PAGINAS_MAXIMAS_PDFJS = 6;
const PAGINAS_FINAIS_BUSCA_PDFJS = 10;
const PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS = 160;
const TOLERANCIA_DIAS_COMPARACAO = 2;
const CONFIANCA_MINIMA_COMPARACAO_DATAS = 58;
const COMPARACAO_AUTOMATICA_DATAS_OCR_ATIVA = false;
const ANO_MINIMO_DATA_DOCUMENTAL_RELEVANTE = 2024;
const ANO_MINIMO_DATA_FORTE_ASSINATURA_ENCERRAMENTO = 2020;

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

const TERMOS_DOCUMENTAIS_CONFIAVEIS = [
    "aso",
    "atestado",
    "certificado",
    "pcmsO",
    "pcmso",
    "pgr",
    "ltcat",
    "documento",
    "treinamento",
    "curso",
    "empresa",
    "cnpj",
    "cpf",
    "colaborador",
    "funcionario",
    "funcionário",
    "emissao",
    "emissão",
    "realizacao",
    "realização",
    "validade",
    "vencimento",
    "assinatura",
    "medico",
    "médico",
    "exame",
    "saude",
    "saúde",
    "ocupacional",
];

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

function proporcaoCaracteresEstranhos(texto = "") {
    const valor = String(texto || "");
    if (!valor) return 0;

    const estranhos = (valor.match(/[�\uFFFD]/g) || []).length;
    return estranhos / valor.length;
}

function textoParecePdfBrutoOuImagemEmbutida(texto = "") {
    const valor = String(texto || "");
    const amostra = valor.slice(0, 5000);

    if (!amostra) return false;

    const marcadoresPdfBruto = [
        /%PDF-\d/i,
        /\/BitsPerComponent\b/i,
        /\/DCTDecode\b/i,
        /\/Subtype\s*\/Image\b/i,
        /\/XObject\b/i,
        /stream\s+[\s\S]{0,80}?(?:�|JFIF|Exif)/i,
        /endstream\s+endobj/i,
    ];

    return marcadoresPdfBruto.some((regex) => regex.test(amostra)) || proporcaoCaracteresEstranhos(amostra) > 0.025;
}

function limitarTextoParaSalvar(texto = "") {
    const limpo = limparTextoPossivelDocumento(texto);

    if (!limpo || textoParecePdfBrutoOuImagemEmbutida(limpo)) {
        return "";
    }

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

    return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function formatarDataBr(iso = "") {
    const partes = String(iso || "").slice(0, 10).split("-");

    if (partes.length !== 3) return iso;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function obterAnoDataIso(iso = "") {
    const ano = Number(String(iso || "").slice(0, 4));
    return Number.isInteger(ano) ? ano : null;
}

function contextoIndicaEncerramentoOuAssinaturaForte(contexto = "") {
    const texto = normalizarTextoVerificacao(contexto);

    return /encerramento|ultima datada|última datada|datada e assinada|responsavel tecnico|responsável técnico|sao jose dos campos|são josé dos campos|assinatura tecnica|assinatura técnica|assinado digitalmente|assinatura digital|icp-brasil|elaborado em|emitido em/.test(texto);
}

function dataEhAntigaSemContextoForte(data = {}, contextoAlternativo = "") {
    const iso = typeof data === "string" ? data : data?.iso || "";
    const ano = obterAnoDataIso(iso);

    if (!ano || ano >= ANO_MINIMO_DATA_DOCUMENTAL_RELEVANTE) return false;

    const contexto = typeof data === "object" ? data?.contexto || contextoAlternativo : contextoAlternativo;

    if (ano >= ANO_MINIMO_DATA_FORTE_ASSINATURA_ENCERRAMENTO && contextoIndicaEncerramentoOuAssinaturaForte(contexto)) {
        return false;
    }

    return true;
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

    if (/emissao|emissão|emitido|realizacao|realização|realizado|conclusao|conclusão|concluido|concluído|treinamento|curso|data de inicio|data de início|inicio|início|encerramento|responsavel tecnico|responsável técnico|ultima datada|última datada|datada e assinada|cidade\s*,/.test(texto)) {
        categorias.push("emissao_realizacao");
    }

    return categorias;
}

function registrarDataEncontrada({ mapa, iso, contexto, origem }) {
    if (!iso || DATAS_PADRAO_IGNORADAS.has(iso)) return;

    const chave = `${iso}__${origem || "texto"}`;
    const existente = mapa.get(chave);
    const categorias = classificarContextoData(contexto);

    if (existente) {
        existente.ocorrencias += 1;
        existente.categorias = Array.from(new Set([...existente.categorias, ...categorias]));

        if (contexto && contexto.length > existente.contexto.length) {
            existente.contexto = contexto;
        }

        return;
    }

    mapa.set(chave, {
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

    return Array.from(mapa.values()).sort((a, b) => {
        const porData = a.iso.localeCompare(b.iso);
        return porData !== 0 ? porData : String(a.origem || "").localeCompare(String(b.origem || ""));
    });
}

function filtrarDatasPorCategoria(datas = [], categoria = "") {
    return datas.filter((data) => Array.isArray(data.categorias) && data.categorias.includes(categoria));
}

function dataIsoDeTextoDataBr(valor = "") {
    const match = String(valor || "").match(/\b([0-3]?\d)[\/.-]([01]?\d)[\/.-]((?:19|20)\d{2}|\d{2})\b/);

    if (!match) return null;

    return montarDataIso(match[1], match[2], match[3]);
}

function normalizarChaveData(data = {}) {
    return data?.iso || data?.br || "";
}

function formatarEntradaDataClassificada(data = {}, extras = {}) {
    const iso = data?.iso || dataIsoDeTextoDataBr(data?.br || "");

    if (!iso) return null;

    return {
        iso,
        br: data?.br || formatarDataBr(iso),
        contexto: data?.contexto || "",
        categorias: Array.isArray(data?.categorias) ? data.categorias : [],
        ocorrencias: Number(data?.ocorrencias || 1),
        origem: data?.origem || "texto",
        ...extras,
    };
}

function adicionarDataClassificada(lista, data, extras = {}) {
    const item = formatarEntradaDataClassificada(data, extras);

    if (!item) return;

    const chave = `${item.iso}__${extras.tipo || ""}__${extras.motivo || ""}`;
    const existe = lista.some((registro) => `${registro.iso}__${registro.tipo || ""}__${registro.motivo || ""}` === chave);

    if (!existe) {
        lista.push(item);
    }
}

function contextoIndicaReferenciaLegal(contexto = "") {
    const texto = normalizarTextoVerificacao(contexto);

    return /portaria|norma regulamentadora|nr\s*[-º0-9]|nr-?\d|redacao dada|redação dada|conforme nr|lei|art\.?|medida provisoria|medida provisória|mp\s*2\.200|seprt|ministerio do trabalho|ministério do trabalho/.test(texto);
}

function contextoIndicaCodigoOuCadastroNaoData(contexto = "") {
    const texto = normalizarTextoVerificacao(contexto);

    return /cnae|codigo documento interno|código documento interno|codigo interno|código interno|grupo de risco|versao\/revisao|versão\/revisão|cpf\s*\/\s*cnpj|cnpj\s*:/.test(texto);
}

function extrairVigenciaPrincipalTexto(texto = "") {
    const conteudo = limparTextoPossivelDocumento(texto);
    const padroes = [
        /Vig[êe]ncia:[^0-9]{0,220}([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})\s+a\s+([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i,
        /(?:validade|per[ií]odo|vig[êe]ncia)[^0-9]{0,220}([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})\s+(?:a|até|ate)\s+([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i,
    ];

    for (const padrao of padroes) {
        const match = conteudo.match(padrao);

        if (!match) continue;

        const inicioIso = dataIsoDeTextoDataBr(match[1]);
        const fimIso = dataIsoDeTextoDataBr(match[2]);

        if (inicioIso && fimIso) {
            const anoInicio = obterAnoDataIso(inicioIso);
            const anoFim = obterAnoDataIso(fimIso);

            if ((anoInicio && anoInicio < ANO_MINIMO_DATA_DOCUMENTAL_RELEVANTE) || (anoFim && anoFim < ANO_MINIMO_DATA_DOCUMENTAL_RELEVANTE)) {
                continue;
            }

            return {
                inicio: {
                    iso: inicioIso,
                    br: formatarDataBr(inicioIso),
                    contexto: obterContextoTexto(conteudo, match.index || 0, 160),
                    origem: "texto",
                },
                fim: {
                    iso: fimIso,
                    br: formatarDataBr(fimIso),
                    contexto: obterContextoTexto(conteudo, match.index || 0, 160),
                    origem: "texto",
                },
            };
        }
    }

    return null;
}

function extrairAssinaturaDigitalTexto(texto = "") {
    const conteudo = limparTextoPossivelDocumento(texto);
    const padroes = [
        /(?:assinado digitalmente|assinatura digital|icp-brasil)[\s\S]{0,320}?\bem:\s*([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})\b/i,
        /\bem:\s*([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})[\s\S]{0,220}?(?:assinado digitalmente|assinatura digital|icp-brasil)/i,
    ];
    const resultados = [];

    for (const padrao of padroes) {
        const match = conteudo.match(padrao);

        if (!match) continue;

        const iso = dataIsoDeTextoDataBr(match[1]);

        if (iso) {
            resultados.push({
                iso,
                br: formatarDataBr(iso),
                contexto: obterContextoTexto(conteudo, match.index || 0, 160),
                origem: "texto",
            });
        }
    }

    return resultados;
}

function extrairDatasEncerramentoTexto(texto = "") {
    const conteudo = limparTextoPossivelDocumento(texto);
    const resultados = [];
    const usados = new Set();

    if (!conteudo) return resultados;

    const padroesBloco = [
        /(?:\b\d{1,2}\.?\s*)?encerramento[\s\S]{0,1800}/gi,
        /(?:ultima|última)\s+datada\s+e\s+assinada[\s\S]{0,1200}/gi,
        /respons[aá]vel\s+t[eé]cnico[\s\S]{0,900}/gi,
        /[A-ZÀ-Ú][A-ZÀ-Ú\s]{2,80}\s*,\s*[0-3]?\d\s+de\s+[a-zA-ZÀ-ÿçÇ]+\s+de\s+(?:19|20)\d{2}[\s\S]{0,700}/g,
    ];

    for (const padrao of padroesBloco) {
        for (const match of conteudo.matchAll(padrao)) {
            const bloco = limparTextoPossivelDocumento(match[0] || "");
            if (!bloco) continue;

            const datas = extrairDatasTextoDocumental(bloco, "texto").filter((data) => {
                if (!data?.iso) return false;
                const contextoCompleto = `${data.contexto || ""} ${bloco}`;
                const contextoForte = contextoIndicaEncerramentoOuAssinaturaForte(contextoCompleto);

                // Em páginas de encerramento é comum aparecer CNPJ/código no rodapé.
                // Quando o contexto forte existe, o rodapé não deve invalidar a data principal.
                if (!contextoForte && contextoIndicaReferenciaLegal(contextoCompleto)) return false;
                if (!contextoForte && contextoIndicaCodigoOuCadastroNaoData(contextoCompleto)) return false;
                if (dataEhAntigaSemContextoForte(data, contextoCompleto)) return false;
                return true;
            });

            for (const data of datas) {
                if (usados.has(data.iso)) continue;
                usados.add(data.iso);
                resultados.push({
                    ...data,
                    contexto: obterContextoTexto(conteudo, match.index || 0, 260) || bloco,
                    origem: "texto",
                });
            }
        }
    }

    return resultados.sort((a, b) => a.iso.localeCompare(b.iso));
}

function classificarDatasOcrDocumental({ textoExtraido = "", datasTexto = [], datasNomeArquivo = [] } = {}) {
    const classificadas = {
        vigencia: [],
        assinaturaDigital: [],
        referenciasLegais: [],
        ignoradas: [],
        outrasRelevantes: [],
        nomeArquivo: (datasNomeArquivo || []).map((data) => formatarEntradaDataClassificada(data, { motivo: "Data encontrada no nome do arquivo" })).filter(Boolean),
    };
    const usadas = new Set();
    const vigencia = extrairVigenciaPrincipalTexto(textoExtraido);

    if (vigencia?.inicio) {
        adicionarDataClassificada(classificadas.vigencia, vigencia.inicio, {
            tipo: "inicio_vigencia",
            rotulo: "Início da vigência",
        });
        usadas.add(vigencia.inicio.iso);
    }

    if (vigencia?.fim) {
        adicionarDataClassificada(classificadas.vigencia, vigencia.fim, {
            tipo: "fim_vigencia",
            rotulo: "Fim da vigência / próxima revisão",
        });
        usadas.add(vigencia.fim.iso);
    }

    for (const assinatura of extrairAssinaturaDigitalTexto(textoExtraido)) {
        adicionarDataClassificada(classificadas.assinaturaDigital, assinatura, {
            tipo: "assinatura_digital",
            rotulo: "Assinatura digital",
        });
        usadas.add(assinatura.iso);
    }

    for (const encerramento of extrairDatasEncerramentoTexto(textoExtraido)) {
        adicionarDataClassificada(classificadas.outrasRelevantes, encerramento, {
            tipo: "encerramento_documento",
            rotulo: "Data de encerramento / assinatura técnica do documento",
        });
        usadas.add(encerramento.iso);
    }

    for (const data of datasTexto || []) {
        if (!data?.iso) continue;

        if (usadas.has(data.iso)) continue;

        const contextoForteEncerramento = contextoIndicaEncerramentoOuAssinaturaForte(data.contexto || "");

        if (contextoForteEncerramento && !contextoIndicaReferenciaLegal(data.contexto || "")) {
            adicionarDataClassificada(classificadas.outrasRelevantes, data, {
                tipo: "encerramento_documento",
                rotulo: "Data de encerramento / assinatura técnica do documento",
            });
            continue;
        }

        if (dataEhAntigaSemContextoForte(data)) {
            adicionarDataClassificada(classificadas.ignoradas, data, {
                tipo: "ignorada",
                motivo: `Data anterior a ${ANO_MINIMO_DATA_DOCUMENTAL_RELEVANTE}; não usar como data documental, salvo assinatura ou encerramento com contexto forte.`,
            });
            continue;
        }

        if (contextoIndicaCodigoOuCadastroNaoData(data.contexto)) {
            adicionarDataClassificada(classificadas.ignoradas, data, {
                tipo: "ignorada",
                motivo: "Possível código, CNAE, CNPJ, versão ou dado cadastral; não usar como data documental.",
            });
            continue;
        }

        if (contextoIndicaReferenciaLegal(data.contexto)) {
            adicionarDataClassificada(classificadas.referenciasLegais, data, {
                tipo: "referencia_legal",
                motivo: "Referência legal/normativa citada no documento.",
            });
            continue;
        }

        if (Array.isArray(data.categorias) && data.categorias.includes("assinatura_digital")) {
            adicionarDataClassificada(classificadas.assinaturaDigital, data, {
                tipo: "assinatura_digital",
                rotulo: "Assinatura digital provável",
            });
            continue;
        }

        if (Array.isArray(data.categorias) && data.categorias.includes("vencimento")) {
            adicionarDataClassificada(classificadas.outrasRelevantes, data, {
                tipo: "data_documental",
                rotulo: "Data documental provável",
            });
            continue;
        }

        adicionarDataClassificada(classificadas.outrasRelevantes, data, {
            tipo: "data_documental",
            rotulo: "Outra data localizada no texto",
        });
    }

    return classificadas;
}

function obterDatasRelevantesClassificadas(datasClassificadas = {}) {
    return [
        ...(datasClassificadas.vigencia || []),
        ...(datasClassificadas.assinaturaDigital || []),
        ...(datasClassificadas.outrasRelevantes || []),
    ];
}

function contarTokensLegiveis(texto = "") {
    const tokens = normalizarTextoVerificacao(texto).match(/[a-z]{3,}/g) || [];
    return tokens.length;
}

function contarTermosDocumentais(texto = "") {
    const normalizado = normalizarTextoVerificacao(texto);

    return TERMOS_DOCUMENTAIS_CONFIAVEIS.reduce((total, termo) => {
        return normalizado.includes(normalizarTextoVerificacao(termo)) ? total + 1 : total;
    }, 0);
}

function textoPossuiConteudoDocumentoConfiavel(texto = "") {
    const limpo = limparTextoPossivelDocumento(texto);

    if (!textoContemConteudoMinimo(limpo)) return false;
    if (textoParecePdfBrutoOuImagemEmbutida(limpo)) return false;

    const tokens = contarTokensLegiveis(limpo);
    const termos = contarTermosDocumentais(limpo);

    return tokens >= 8 || termos >= 2 || (limpo.length >= 180 && tokens >= 4);
}


function limitarTextoResumo(valor = "", limite = 170) {
    const texto = limparTextoPossivelDocumento(valor)
        .replace(/\s+([,.;:])/g, "$1")
        .trim();

    if (!texto) return "";
    if (texto.length <= limite) return texto;

    return `${texto.slice(0, limite).trim()}...`;
}

function encontrarPrimeiroGrupo(texto = "", regex, grupo = 1) {
    const match = String(texto || "").match(regex);
    return limparTextoPossivelDocumento(match?.[grupo] || "");
}

function obterTipoDocumentoResumo(texto = "", arquivoNome = "") {
    const base = normalizarTextoVerificacao(`${arquivoNome} ${texto.slice(0, 1500)}`);

    if (base.includes("programa de controle medico de saude ocupacional") || base.includes("pcmso")) {
        return "PCMSO - Programa de Controle Médico de Saúde Ocupacional";
    }

    if (base.includes("programa de gerenciamento de riscos") || /\bpgr\b/.test(base)) {
        return "PGR - Programa de Gerenciamento de Riscos";
    }

    if (base.includes("laudo tecnico das condicoes ambientais") || base.includes("ltcat")) {
        return "LTCAT - Laudo Técnico das Condições Ambientais do Trabalho";
    }

    if (base.includes("atestado de saude ocupacional") || /\baso\b/.test(base)) {
        return "ASO - Atestado de Saúde Ocupacional";
    }

    if (base.includes("certificado")) {
        return "Certificado / comprovante de treinamento";
    }

    return "";
}

function obterEmpresaResumo(texto = "") {
    return limitarTextoResumo(
        encontrarPrimeiroGrupo(
            texto,
            /Empresa:\s*([\s\S]{3,180}?)(?:\s+CPF\s*\/\s*CNPJ|\s+CNPJ|\s+Endere[cç]o|\s+Unidade:|\s+CPF\b|$)/i
        ),
        120
    );
}

function obterCnpjResumo(texto = "") {
    return encontrarPrimeiroGrupo(texto, /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/);
}

function obterVigenciaResumo(texto = "") {
    const match = String(texto || "").match(/Vig[êe]ncia:[^0-9]{0,180}([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})\s+a\s+([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i);

    if (!match) return "";

    return `${match[1]} a ${match[2]}`;
}

function obterAssinaturaResumo(texto = "") {
    const frase = encontrarPrimeiroGrupo(
        texto,
        /(Documento assinado digitalmente[\s\S]{0,280}?\.)/i
    );

    return limitarTextoResumo(frase, 220);
}

function obterDataAssinaturaResumo(texto = "") {
    return encontrarPrimeiroGrupo(
        texto,
        /\bem:\s*([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})\b/i
    );
}

function obterCodigoVerificacaoResumo(texto = "") {
    return encontrarPrimeiroGrupo(
        texto,
        /C[oó]digo de verifica[cç][aã]o de autenticidade:\s*([A-Z0-9._-]{6,80})/i
    );
}

function obterTotalFuncionariosResumo(texto = "") {
    return encontrarPrimeiroGrupo(
        texto,
        /Total de funcion[aá]rios:\s*(\d{1,6})\b/i
    );
}


function montarCamposExtraidosDocumento({ textoExtraido = "", arquivoNome = "", datasClassificadas = {} } = {}) {
    const texto = limparTextoPossivelDocumento(textoExtraido);
    const tipoDocumento = obterTipoDocumentoResumo(texto, arquivoNome);
    const empresaNome = obterEmpresaResumo(texto);
    const cnpj = obterCnpjResumo(texto);
    const codigoVerificacao = obterCodigoVerificacaoResumo(texto);
    const totalFuncionarios = obterTotalFuncionariosResumo(texto);
    const dataAssinaturaTexto = obterDataAssinaturaResumo(texto);
    const vigenciaClassificada = Array.isArray(datasClassificadas?.vigencia) ? datasClassificadas.vigencia : [];
    const inicioVigencia = vigenciaClassificada.find((data) => data?.tipo === "inicio_vigencia") || vigenciaClassificada[0] || null;
    const fimVigencia = vigenciaClassificada.find((data) => data?.tipo === "fim_vigencia") || vigenciaClassificada[1] || null;
    const assinaturaClassificada = Array.isArray(datasClassificadas?.assinaturaDigital) ? datasClassificadas.assinaturaDigital[0] : null;
    const dataEncerramento = Array.isArray(datasClassificadas?.outrasRelevantes)
        ? datasClassificadas.outrasRelevantes.find((data) => String(data?.tipo || "") === "encerramento_documento")
        : null;

    return {
        tipo_documento: tipoDocumento || "",
        empresa_nome: empresaNome || "",
        cnpj: cnpj || "",
        vigencia_inicio: inicioVigencia?.iso || "",
        vigencia_inicio_br: inicioVigencia?.br || "",
        vigencia_fim: fimVigencia?.iso || "",
        vigencia_fim_br: fimVigencia?.br || "",
        assinatura_data: assinaturaClassificada?.iso || dataIsoDeTextoDataBr(dataAssinaturaTexto) || dataEncerramento?.iso || "",
        assinatura_data_br: assinaturaClassificada?.br || dataAssinaturaTexto || dataEncerramento?.br || "",
        data_encerramento: dataEncerramento?.iso || "",
        data_encerramento_br: dataEncerramento?.br || "",
        codigo_verificacao: codigoVerificacao || "",
        total_funcionarios: totalFuncionarios || "",
    };
}

function montarResumoTextualDocumento({
    textoExtraido = "",
    arquivoNome = "",
    datasDocumentoConfiaveis = [],
    paginasLidas = 0,
    totalPaginas = 0,
    buscaAmpliada = null,
} = {}) {
    const texto = limparTextoPossivelDocumento(textoExtraido);
    const resumo = [];

    if (!texto) return resumo;

    const tipoDocumento = obterTipoDocumentoResumo(texto, arquivoNome);
    const empresa = obterEmpresaResumo(texto);
    const cnpj = obterCnpjResumo(texto);
    const vigencia = obterVigenciaResumo(texto);
    const assinatura = obterAssinaturaResumo(texto);
    const dataAssinatura = obterDataAssinaturaResumo(texto);
    const codigoVerificacao = obterCodigoVerificacaoResumo(texto);
    const totalFuncionarios = obterTotalFuncionariosResumo(texto);
    const dataEncerramento = extrairDatasEncerramentoTexto(texto)[0] || null;
    const datasUnicas = Array.from(new Set((datasDocumentoConfiaveis || []).map((data) => data.br).filter(Boolean)));

    if (tipoDocumento) {
        resumo.push(`Documento identificado: ${tipoDocumento}.`);
    }

    if (empresa) {
        resumo.push(`Empresa identificada: ${empresa}${cnpj ? `, CNPJ ${cnpj}` : ""}.`);
    } else if (cnpj) {
        resumo.push(`CNPJ identificado no documento: ${cnpj}.`);
    }

    if (vigencia) {
        resumo.push(`Vigência localizada no texto: ${vigencia}.`);
    } else if (datasUnicas.length) {
        resumo.push(`Datas localizadas no texto: ${datasUnicas.slice(0, 6).join(", ")}.`);
    }

    if (dataAssinatura) {
        resumo.push(`Data de assinatura digital localizada: ${dataAssinatura}.`);
    } else if (dataEncerramento?.br) {
        resumo.push(`Data de encerramento/assinatura técnica localizada: ${dataEncerramento.br}.`);
    }

    if (assinatura) {
        resumo.push(assinatura);
    }

    if (codigoVerificacao) {
        resumo.push(`Código de verificação de autenticidade localizado: ${codigoVerificacao}.`);
    }

    if (totalFuncionarios) {
        resumo.push(`Total de funcionários citado no documento: ${totalFuncionarios}.`);
    }

    if (paginasLidas && totalPaginas) {
        if (buscaAmpliada?.executada) {
            resumo.push(
                buscaAmpliada.encontrouDataPrincipal
                    ? `Busca ampliada analisou ${paginasLidas} página(s) de ${totalPaginas} e localizou data documental provável na página ${buscaAmpliada.paginaDataPrincipal}.`
                    : `Busca ampliada analisou ${paginasLidas} página(s) de ${totalPaginas}, sem localizar vigência, emissão, revisão ou assinatura confiável.`
            );
        } else {
            resumo.push(`Leitura feita nas ${paginasLidas} primeiras página(s) de ${totalPaginas}, para preservar performance no navegador.`);
        }
    }

    if (!resumo.length) {
        resumo.push("Texto extraído com sucesso, mas sem campos principais suficientes para resumo automático confiável.");
    }

    return Array.from(new Set(resumo)).slice(0, 8);
}

function montarPreviaTextoDocumento(texto = "") {
    const limpo = limparTextoPossivelDocumento(texto);

    if (!limpo) return "";

    return limitarTextoResumo(limpo, 360);
}

function calcularConfiancaLeitura({ textoExtraido = "", datasTexto = [], tipoLeitura = "", textoLimitado = false } = {}) {
    let score = 0;

    if (textoContemConteudoMinimo(textoExtraido)) score += 20;
    if (textoPossuiConteudoDocumentoConfiavel(textoExtraido)) score += 35;
    if (tipoLeitura === "pdf_texto_local") score += 15;
    score += Math.min(25, datasTexto.length * 10);

    if (textoLimitado) score -= 8;

    return Math.max(0, Math.min(100, Math.round(score)));
}

function unescapePdfLiteral(valor = "") {
    return String(valor || "")
        .replace(/\\n/g, " ")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .replace(/\\b/g, " ")
        .replace(/\\f/g, " ")
        .replace(/\\([()\\])/g, "$1")
        .replace(/\\([0-7]{1,3})/g, (_, octal) => {
            try {
                return String.fromCharCode(parseInt(octal, 8));
            } catch {
                return " ";
            }
        });
}

function extrairStringsLiteraisPdf(textoPdf = "") {
    const bruto = String(textoPdf || "");
    const resultados = [];
    let atual = "";
    let dentro = false;
    let escape = false;
    let profundidade = 0;

    for (let indice = 0; indice < bruto.length; indice += 1) {
        const caractere = bruto[indice];

        if (!dentro) {
            if (caractere === "(") {
                dentro = true;
                profundidade = 1;
                atual = "";
                escape = false;
            }
            continue;
        }

        if (escape) {
            atual += `\\${caractere}`;
            escape = false;
            continue;
        }

        if (caractere === "\\") {
            escape = true;
            continue;
        }

        if (caractere === "(") {
            profundidade += 1;
            atual += caractere;
            continue;
        }

        if (caractere === ")") {
            profundidade -= 1;

            if (profundidade <= 0) {
                const limpo = limparTextoPossivelDocumento(unescapePdfLiteral(atual));

                if (
                    limpo.length >= 2 &&
                    !textoParecePdfBrutoOuImagemEmbutida(limpo) &&
                    (/[a-zA-ZÀ-ÿ]/.test(limpo) || /\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}/.test(limpo)) &&
                    !/^[A-Za-z0-9+/=]{28,}$/.test(limpo)
                ) {
                    resultados.push(limpo);
                }

                dentro = false;
                atual = "";
                escape = false;
                profundidade = 0;
                continue;
            }
        }

        atual += caractere;
    }

    return resultados;
}

function extrairTextoLegivelPdf(bytes) {
    const textoUtf8 = decodificarBytes(bytes, "utf-8");
    const textoWin1252 = decodificarBytes(bytes, "windows-1252");
    const bruto = textoWin1252.length > textoUtf8.length ? textoWin1252 : textoUtf8;

    const stringsPdf = extrairStringsLiteraisPdf(bruto);
    const textoExtraido = limparTextoPossivelDocumento(stringsPdf.join(" "));

    if (textoPossuiConteudoDocumentoConfiavel(textoExtraido)) {
        return textoExtraido;
    }

    return "";
}

async function carregarPdfJsDocumental() {
    const pdfjsLib = await import("pdfjs-dist");

    try {
        if (pdfjsLib?.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.mjs",
                import.meta.url
            ).toString();
        }
    } catch {
        // Se o worker não puder ser configurado, o PDF.js ainda pode tentar usar fallback.
    }

    return pdfjsLib;
}

async function lerTextoPaginaPdfJs(pdf, numeroPagina) {
    const pagina = await pdf.getPage(numeroPagina);
    const conteudo = await pagina.getTextContent({
        includeMarkedContent: false,
        disableNormalization: false,
    });

    return limparTextoPossivelDocumento(
        (conteudo?.items || [])
            .map((item) => item?.str || "")
            .filter(Boolean)
            .join(" ")
    );
}

function contextoIndicaDataDocumentalPrincipal(contexto = "") {
    const texto = normalizarTextoVerificacao(contexto);

    if (!texto) return false;
    if (contextoIndicaReferenciaLegal(contexto)) return false;
    if (contextoIndicaCodigoOuCadastroNaoData(contexto)) return false;

    const padraoPrincipalForte = /vigencia|vigência|periodo de vigencia|período de vigência|data de emissao|data de emissão|emissao do documento|emissão do documento|emitido em|elaborado em|elaboracao|elaboração|assinado em|assinatura digital|icp-brasil|encerramento|ultima datada|última datada|datada e assinada|responsavel tecnico|responsável técnico/;

    if (padraoPrincipalForte.test(texto)) return true;

    return /validade do documento|vencimento do documento|data de validade|data de vencimento|proxima revisao|próxima revisão|revisao do documento|revisão do documento/.test(texto);
}

function textoPossuiDataDocumentalPrincipal(textoPagina = "") {
    const texto = limparTextoPossivelDocumento(textoPagina);

    if (!textoPossuiConteudoDocumentoConfiavel(texto)) return false;

    const vigencia = extrairVigenciaPrincipalTexto(texto);
    if (vigencia?.inicio && vigencia?.fim) return true;

    if (extrairAssinaturaDigitalTexto(texto).length > 0) return true;
    if (extrairDatasEncerramentoTexto(texto).length > 0) return true;

    const datasTexto = extrairDatasTextoDocumental(texto, "pdf_texto_local");
    if (!datasTexto.length) return false;

    return datasTexto.some((data) => {
        if (!data?.iso) return false;
        if (dataEhAntigaSemContextoForte(data, texto)) return false;
        return contextoIndicaDataDocumentalPrincipal(`${data.contexto || ""} ${texto}`);
    });
}

function textoPaginaPossuiDataDocumentalPrincipal(textoPagina = "") {
    return textoPossuiDataDocumentalPrincipal(textoPagina);
}

function montarSequenciaBuscaPaginas(totalPaginas = 0, paginasIniciais = 0) {
    const total = Number(totalPaginas || 0);
    const inicio = Number(paginasIniciais || 0);

    if (!total || total <= inicio) return [];

    const paginas = [];
    const jaIncluidas = new Set();

    function adicionar(numero) {
        const valor = Number(numero || 0);
        if (!Number.isInteger(valor) || valor < 1 || valor > total || valor <= inicio) return;
        if (jaIncluidas.has(valor)) return;
        jaIncluidas.add(valor);
        paginas.push(valor);
    }

    const inicioFinais = Math.max(inicio + 1, total - PAGINAS_FINAIS_BUSCA_PDFJS + 1);
    for (let pagina = inicioFinais; pagina <= total; pagina += 1) {
        adicionar(pagina);
    }

    const limiteProfundo = Math.min(total, PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS);
    for (let pagina = inicio + 1; pagina <= limiteProfundo; pagina += 1) {
        adicionar(pagina);
    }

    return paginas;
}

function montarTextoPdfOrdenado(registrosPaginas = []) {
    const registrosValidos = (registrosPaginas || []).filter((registro) => registro?.texto);
    const mapa = new Map();

    const relevantes = registrosValidos.filter((registro) => registro.relevante);
    const iniciais = registrosValidos.filter((registro) => registro.numero <= PAGINAS_MAXIMAS_PDFJS && !registro.relevante);
    const demais = registrosValidos.filter((registro) => registro.numero > PAGINAS_MAXIMAS_PDFJS && !registro.relevante);

    [...relevantes, ...iniciais, ...demais]
        .sort((a, b) => {
            if (a.relevante && !b.relevante) return -1;
            if (!a.relevante && b.relevante) return 1;
            return a.numero - b.numero;
        })
        .forEach((registro) => {
            if (!mapa.has(registro.numero)) {
                mapa.set(registro.numero, registro);
            }
        });

    return limparTextoPossivelDocumento(
        Array.from(mapa.values())
            .map((registro) => `Página ${registro.numero}: ${registro.texto}`)
            .join(" ")
    ).slice(0, LIMITE_TEXTO_PDFJS);
}

async function extrairTextoPdfComPdfJs(buffer) {
    if (!buffer || !buffer.byteLength) {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            avisos: [],
            buscaAmpliada: null,
        };
    }

    const avisos = [];

    try {
        const pdfjsLib = await carregarPdfJsDocumental();
        const tarefa = pdfjsLib.getDocument({
            data: new Uint8Array(buffer.slice(0)),
            disableFontFace: true,
            useSystemFonts: true,
            verbosity: 0,
        });

        const pdf = await tarefa.promise;
        const totalPaginas = Number(pdf?.numPages || 0);
        const paginasIniciais = Math.min(totalPaginas || 0, PAGINAS_MAXIMAS_PDFJS);
        const registrosPaginas = [];
        const paginasLidasSet = new Set();
        let encontrouDataPrincipal = false;
        let paginaDataPrincipal = 0;
        let buscaAmpliadaExecutada = false;
        let buscaAmpliadaInterrompida = false;

        async function lerPagina(numeroPagina, origem = "inicial") {
            if (!numeroPagina || paginasLidasSet.has(numeroPagina)) return null;

            const textoPagina = await lerTextoPaginaPdfJs(pdf, numeroPagina);
            paginasLidasSet.add(numeroPagina);

            if (!textoPagina) return null;

            const relevante = textoPaginaPossuiDataDocumentalPrincipal(textoPagina);

            registrosPaginas.push({
                numero: numeroPagina,
                texto: textoPagina,
                relevante,
                origem,
            });

            if (relevante && !encontrouDataPrincipal) {
                encontrouDataPrincipal = true;
                paginaDataPrincipal = numeroPagina;
            }

            return registrosPaginas[registrosPaginas.length - 1];
        }

        for (let numeroPagina = 1; numeroPagina <= paginasIniciais; numeroPagina += 1) {
            await lerPagina(numeroPagina, "inicial");
        }

        let textoInicial = montarTextoPdfOrdenado(registrosPaginas);
        let precisaBuscaAmpliada = Boolean(
            totalPaginas > paginasIniciais &&
            !textoPossuiDataDocumentalPrincipal(textoInicial)
        );

        if (!textoInicial && totalPaginas > paginasIniciais) {
            precisaBuscaAmpliada = true;
        }

        if (precisaBuscaAmpliada) {
            buscaAmpliadaExecutada = true;
            const sequenciaBusca = montarSequenciaBuscaPaginas(totalPaginas, paginasIniciais);

            for (const numeroPagina of sequenciaBusca) {
                await lerPagina(numeroPagina, numeroPagina > totalPaginas - PAGINAS_FINAIS_BUSCA_PDFJS ? "final" : "ampliada");

                if (encontrouDataPrincipal) {
                    buscaAmpliadaInterrompida = true;
                    break;
                }
            }
        }

        try {
            await pdf.destroy();
        } catch {
            // Liberação de memória sem bloquear o fluxo.
        }

        const texto = montarTextoPdfOrdenado(registrosPaginas);
        const paginasLidas = paginasLidasSet.size;
        const buscaAmpliada = buscaAmpliadaExecutada
            ? {
                executada: true,
                paginasLidas,
                totalPaginas,
                paginaDataPrincipal,
                encontrouDataPrincipal,
                interrompidaAoEncontrar: buscaAmpliadaInterrompida,
                limitePaginas: PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS,
            }
            : null;

        if (texto && texto.length >= LIMITE_TEXTO_PDFJS) {
            avisos.push("Leitura textual limitada para preservar performance no navegador.");
        }

        if (buscaAmpliadaExecutada) {
            avisos.push(
                encontrouDataPrincipal
                    ? `Busca ampliada realizada: data documental provável localizada na página ${paginaDataPrincipal} após analisar ${paginasLidas} página(s) de ${totalPaginas}.`
                    : `Busca ampliada realizada em ${paginasLidas} página(s) de ${totalPaginas}, sem localizar vigência, emissão, revisão ou assinatura confiável.`
            );
        } else if (totalPaginas > paginasIniciais) {
            avisos.push(`Leitura textual feita nas ${paginasIniciais} primeiras página(s) de ${totalPaginas}.`);
        }

        if (totalPaginas > PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS && buscaAmpliadaExecutada && !encontrouDataPrincipal) {
            avisos.push(`Para preservar performance, a busca profunda automática foi limitada a ${PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS} páginas mais as páginas finais.`);
        }

        if (textoPossuiConteudoDocumentoConfiavel(texto)) {
            return {
                texto,
                paginasLidas,
                totalPaginas,
                avisos,
                buscaAmpliada,
            };
        }

        return {
            texto: "",
            paginasLidas,
            totalPaginas,
            avisos: [
                ...avisos,
                "PDF.js não encontrou texto documental confiável nas páginas analisadas.",
            ],
            buscaAmpliada,
        };
    } catch (error) {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            avisos: [
                `Leitura PDF.js indisponível: ${error?.message || "erro desconhecido"}.`,
            ],
            buscaAmpliada: null,
        };
    }
}

function montarRetornoLeituraBase({
    executado = false,
    tipoLeitura = "nao_executado",
    arquivoNome = "",
    mimeType = "",
    extensao = "",
    textoExtraido = "",
    textoLimitado = false,
    paginasLidas = 0,
    totalPaginas = 0,
    buscaAmpliada = null,
    avisos = [],
    erro = "",
} = {}) {
    const textoSeguro = limitarTextoParaSalvar(textoExtraido);
    const datasTexto = textoSeguro ? extrairDatasTextoDocumental(textoSeguro, tipoLeitura) : [];
    const datasNomeArquivo = arquivoNome ? extrairDatasTextoDocumental(arquivoNome, "nome_arquivo") : [];
    const datasEncontradas = [...datasTexto, ...datasNomeArquivo];
    const datasComparaveis = datasTexto;
    const datasClassificadas = classificarDatasOcrDocumental({
        textoExtraido: textoSeguro,
        datasTexto,
        datasNomeArquivo,
    });
    const datasRelevantesClassificadas = obterDatasRelevantesClassificadas(datasClassificadas);
    const camposExtraidos = montarCamposExtraidosDocumento({
        textoExtraido: textoSeguro,
        arquivoNome,
        datasClassificadas,
    });
    const resumoTextual = montarResumoTextualDocumento({
        textoExtraido: textoSeguro,
        arquivoNome,
        datasDocumentoConfiaveis: datasComparaveis,
        paginasLidas,
        totalPaginas,
        buscaAmpliada,
    });
    const textoPrevia = montarPreviaTextoDocumento(textoSeguro);
    const confianca = calcularConfiancaLeitura({
        textoExtraido: textoSeguro,
        datasTexto,
        tipoLeitura,
        textoLimitado,
    });
    const comparacaoDatasPermitida = Boolean(
        COMPARACAO_AUTOMATICA_DATAS_OCR_ATIVA &&
        textoSeguro &&
        datasComparaveis.length > 0 &&
        confianca >= CONFIANCA_MINIMA_COMPARACAO_DATAS &&
        textoPossuiConteudoDocumentoConfiavel(textoSeguro) &&
        tipoLeitura === "pdf_texto_local"
    );
    const datasAssinaturaDigital = comparacaoDatasPermitida
        ? filtrarDatasPorCategoria(datasComparaveis, "assinatura_digital")
        : [];
    const datasProvaveisVencimento = comparacaoDatasPermitida
        ? filtrarDatasPorCategoria(datasComparaveis, "vencimento")
        : [];
    const datasProvaveisEmissaoRealizacao = comparacaoDatasPermitida
        ? filtrarDatasPorCategoria(datasComparaveis, "emissao_realizacao")
        : [];

    let resumo = "Leitura local não encontrou camada de texto confiável para comparar datas automaticamente.";

    if (datasRelevantesClassificadas.length) {
        resumo = `Leitura local encontrou ${datasRelevantesClassificadas.length} data(s) documental(is) relevante(s): ${datasRelevantesClassificadas.map((data) => data.br).join(", ")}.`;
    } else if (datasComparaveis.length) {
        resumo = `Leitura local encontrou ${datasComparaveis.length} data(s), mas nenhuma foi classificada como vigência, assinatura ou data documental principal.`;
    } else if (datasNomeArquivo.length) {
        resumo = `Foram encontradas data(s) apenas no nome do arquivo: ${datasNomeArquivo.map((data) => data.br).join(", ")}. Essas datas não foram usadas para apontar divergência automática.`;
    }

    if (!comparacaoDatasPermitida && datasRelevantesClassificadas.length) {
        resumo += " A comparação automática entre datas lidas e datas cadastradas segue desativada para evitar falso alerta; a validação principal continua pelas regras locais já existentes.";
    }

    return {
        executado,
        tipoLeitura,
        arquivoNome,
        mimeType,
        extensao,
        confianca,
        textoExtraido: textoSeguro,
        textoPrevia,
        resumoTextual,
        camposExtraidos,
        textoLimitado,
        paginasLidas,
        totalPaginas,
        buscaAmpliada,
        datasEncontradas,
        datasDocumentoConfiaveis: datasComparaveis,
        datasRelevantesClassificadas,
        datasClassificadas,
        datasNomeArquivo,
        datasAssinaturaDigital,
        datasProvaveisVencimento,
        datasProvaveisEmissaoRealizacao,
        comparacaoDatasPermitida,
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
            avisos: nome ? ["Somente o nome do arquivo foi avaliado. Datas no nome não geram divergência automática."] : [],
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
        const leituraPdfJs = await extrairTextoPdfComPdfJs(buffer);
        const textoExtraido = leituraPdfJs.texto || extrairTextoLegivelPdf(bytes);
        const avisos = [...(leituraPdfJs.avisos || [])];

        if (textoLimitado) {
            avisos.push("Leitura bruta limitada aos primeiros 8 MB para preservar performance no navegador.");
        }

        if (textoExtraido && leituraPdfJs.texto) {
            avisos.push("Texto extraído pela camada textual do PDF usando PDF.js, sem API paga.");
        }

        if (!textoExtraido) {
            avisos.push("Não foi encontrada camada de texto confiável. O PDF pode ser uma imagem escaneada, conter apenas imagens ou exigir OCR real de imagem.");
            avisos.push("Datas encontradas somente no nome do arquivo não serão usadas para acusar divergência com o cadastro.");
        }

        return montarRetornoLeituraBase({
            executado: true,
            tipoLeitura: textoExtraido ? "pdf_texto_local" : "pdf_sem_texto_legivel",
            arquivoNome: nome,
            mimeType: mime,
            extensao,
            textoExtraido,
            textoLimitado,
            paginasLidas: leituraPdfJs.paginasLidas || 0,
            totalPaginas: leituraPdfJs.totalPaginas || 0,
            buscaAmpliada: leituraPdfJs.buscaAmpliada || null,
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

    if (!dataCadastroIso || !leitura?.comparacaoDatasPermitida) return null;

    const datasConfiaveis = leitura.datasDocumentoConfiaveis || [];
    if (!datasConfiaveis.length) return null;

    const datasPreferenciais = categoriaPreferencial
        ? filtrarDatasPorCategoria(datasConfiaveis, categoriaPreferencial)
        : [];
    const baseComparacao = datasPreferenciais.length ? datasPreferenciais : datasConfiaveis;

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
            ? `${labelCampo} cadastrada: ${formatarDataBr(dataCadastroIso)}. Data mais próxima lida no texto do arquivo: ${maisProxima.br} (${maisProxima.diferencaDias} dia(s) de diferença).`
            : `${labelCampo} cadastrada: ${formatarDataBr(dataCadastroIso)}. Datas lidas no texto do arquivo: ${baseComparacao.map((data) => data.br).join(", ")}.`,
        peso,
        recomendacao: "Conferir manualmente se a data cadastrada no sistema corresponde à data real do documento.",
        dados: {
            dataCadastro: dataCadastroIso,
            dataMaisProximaDocumento: maisProxima?.iso || null,
            diferencaDias: maisProxima?.diferencaDias ?? null,
            datasEncontradas: baseComparacao.map((data) => data.iso),
        },
    });
}

function avaliarAssinaturaDigitalLeitura({ leitura, dataVencimento } = {}) {
    const indicios = [];
    const hoje = new Date();
    const hojeMeioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12, 0, 0);
    const vencimento = obterDataSeguraVerificacao(dataVencimento);

    if (!leitura?.comparacaoDatasPermitida) return indicios;

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

function normalizarDocumentoTextoComparacao(valor = "") {
    return normalizarTextoVerificacao(valor)
        .replace(/(ltda|me|epp|eireli|sa|s\/a|ss|s\/s|construtora|construcoes|construções|pavimentadora|pavimentacao|pavimentação|comercio|comércio|servicos|serviços|empresa|grupo)/g, " ")
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function obterTokensComparacaoEmpresa(valor = "") {
    return normalizarDocumentoTextoComparacao(valor)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);
}

function calcularSimilaridadeNomeEmpresa(nomeA = "", nomeB = "") {
    const tokensA = Array.from(new Set(obterTokensComparacaoEmpresa(nomeA)));
    const tokensB = Array.from(new Set(obterTokensComparacaoEmpresa(nomeB)));

    if (!tokensA.length || !tokensB.length) return 1;

    const intersecao = tokensA.filter((token) => tokensB.includes(token));
    return intersecao.length / Math.min(tokensA.length, tokensB.length);
}

function apenasDigitosDocumento(valor = "") {
    return String(valor || "").replace(/\D/g, "");
}

function formatarCnpjDocumento(valor = "") {
    const digitos = apenasDigitosDocumento(valor);

    if (digitos.length !== 14) return valor || "";

    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
}

function obterCamposExtraidosDaLeitura(leitura = {}) {
    return leitura?.camposExtraidos || leitura?.campos_extraidos || {};
}

function avaliarEmpresaExtraidaDocumento({ leitura, empresa = {} } = {}) {
    const indicios = [];
    const campos = obterCamposExtraidosDaLeitura(leitura);
    const cnpjDocumento = apenasDigitosDocumento(campos?.cnpj);
    const cnpjEmpresa = apenasDigitosDocumento(empresa?.cnpj || empresa?.cpf_cnpj || empresa?.documento || "");
    const nomeDocumento = limparTextoPossivelDocumento(campos?.empresa_nome || "");
    const nomeEmpresa = limparTextoPossivelDocumento(empresa?.nome || empresa?.razao_social || empresa?.razaoSocial || "");

    if (cnpjDocumento && cnpjEmpresa && cnpjDocumento !== cnpjEmpresa) {
        indicios.push(criarIndicioVerificacao({
            codigo: "cnpj_documento_diverge_empresa_selecionada",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
            titulo: "CNPJ do documento diverge da empresa selecionada",
            detalhe: `O documento indica CNPJ ${formatarCnpjDocumento(cnpjDocumento)}${nomeDocumento ? ` para ${nomeDocumento}` : ""}. A empresa selecionada possui CNPJ ${formatarCnpjDocumento(cnpjEmpresa)}${nomeEmpresa ? ` (${nomeEmpresa})` : ""}.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DIVERGENCIA_EMPRESA,
            bloqueia: true,
            recomendacao: "Não aprovar este documento para a empresa selecionada. Conferir se o arquivo foi enviado na empresa correta ou substituir pelo documento correspondente.",
            dados: {
                cnpjDocumento: formatarCnpjDocumento(cnpjDocumento),
                cnpjEmpresaSelecionada: formatarCnpjDocumento(cnpjEmpresa),
                empresaDocumento: nomeDocumento,
                empresaSelecionada: nomeEmpresa,
            },
        }));

        return indicios;
    }

    if (nomeDocumento && nomeEmpresa) {
        const similaridade = calcularSimilaridadeNomeEmpresa(nomeDocumento, nomeEmpresa);

        if (similaridade < 0.35) {
            indicios.push(criarIndicioVerificacao({
                codigo: "nome_empresa_documento_diverge_empresa_selecionada",
                tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CADASTRO,
                titulo: "Nome da empresa no documento diverge da empresa selecionada",
                detalhe: `O documento indica ${nomeDocumento}. A empresa selecionada é ${nomeEmpresa}.`,
                peso: DOCUMENTOS_VERIFICACAO_PESOS.DIVERGENCIA_EMPRESA,
                bloqueia: false,
                recomendacao: "Conferir manualmente se o documento pertence à empresa correta. Se o CNPJ também divergir, o documento deve ser substituído.",
                dados: {
                    empresaDocumento: nomeDocumento,
                    empresaSelecionada: nomeEmpresa,
                    similaridade,
                },
            }));
        }
    }

    return indicios;
}

export function avaliarLeituraDocumentalComCadastro({
    leitura,
    empresa = {},
} = {}) {
    if (!leitura) return [];

    // Nesta etapa a leitura local/OCR continua sem comparar datas automaticamente,
    // para evitar falsos alertas. A exceção segura é a conferência de empresa/CNPJ,
    // pois evita aprovar documento enviado na empresa errada.
    return [
        ...avaliarEmpresaExtraidaDocumento({ leitura, empresa }),
    ];
}

export function montarRetornoLeituraParaPersistencia(leitura = null) {
    if (!leitura) return null;

    return {
        tipo_leitura: leitura.tipoLeitura,
        executado: Boolean(leitura.executado),
        confianca: leitura.confianca,
        resumo: leitura.resumo,
        resumo_textual: leitura.resumoTextual || [],
        campos_extraidos: leitura.camposExtraidos || null,
        texto_previa: leitura.textoPrevia || "",
        paginas_lidas: leitura.paginasLidas || 0,
        total_paginas: leitura.totalPaginas || 0,
        busca_ampliada: leitura.buscaAmpliada || null,
        comparacao_datas_permitida: Boolean(leitura.comparacaoDatasPermitida),
        datas_encontradas: (leitura.datasEncontradas || []).map((data) => ({
            iso: data.iso,
            br: data.br,
            categorias: data.categorias,
            ocorrencias: data.ocorrencias,
            contexto: data.contexto,
            origem: data.origem,
        })),
        datas_documento_confiaveis: (leitura.datasDocumentoConfiaveis || []).map((data) => data.iso),
        datas_relevantes_classificadas: (leitura.datasRelevantesClassificadas || []).map((data) => ({
            iso: data.iso,
            br: data.br,
            tipo: data.tipo || "",
            rotulo: data.rotulo || "",
            motivo: data.motivo || "",
        })),
        datas_classificadas: leitura.datasClassificadas || null,
        datas_nome_arquivo: (leitura.datasNomeArquivo || []).map((data) => data.iso),
        datas_assinatura_digital: (leitura.datasAssinaturaDigital || []).map((data) => data.iso),
        datas_provaveis_vencimento: (leitura.datasProvaveisVencimento || []).map((data) => data.iso),
        datas_provaveis_emissao_realizacao: (leitura.datasProvaveisEmissaoRealizacao || []).map((data) => data.iso),
        avisos: leitura.avisos || [],
        erro: leitura.erro || "",
    };
}
