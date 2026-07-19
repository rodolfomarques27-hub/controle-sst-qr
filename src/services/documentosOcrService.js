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
import {
    filtrarDatasPorCategoria,
    formatarDataBr,
    limparTextoPossivelDocumento,
    valorPareceSomenteDocumentoFiscal,
} from "./documentosOcrUtils";
import { carregarPdfJsDocumental } from "./documentosOcrPdfJsService";
import { criarInfraestruturaLeituraDocumental } from "./documentosOcrArquivoService";
import { criarFluxoLeituraDocumental } from "./documentosOcrLeituraService";
import {
    calcularAssinaturaVisualFaixa,
    detectarAssinaturasDocumento,
    detectarAssinaturasTabelaPresenca,
    detectarLinhasHorizontaisTabelaPresenca,
    montarLinhasOcrComAssinatura,
    reconhecerTextoCanvasComOcrComOrientacao,
} from "./documentosOcrVisualService";

const LIMITE_BYTES_LEITURA_LOCAL = 8 * 1024 * 1024;
const LIMITE_TEXTO_OCR_SALVAR = 6000;
const LIMITE_TEXTO_PDFJS = 18000;
const LIMITE_MAIOR_LADO_OCR_IMAGEM = 1800;
const PAGINAS_MAXIMAS_PDFJS = 6;
const PAGINAS_FINAIS_BUSCA_PDFJS = 10;
const PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS = 160;
const CONFIANCA_MINIMA_COMPARACAO_DATAS = 58;
const COMPARACAO_AUTOMATICA_DATAS_OCR_ATIVA = false;
const ANO_MINIMO_DATA_DOCUMENTAL_RELEVANTE = 2022;
const ANO_MINIMO_DATA_FORTE_ASSINATURA_ENCERRAMENTO = 2022;

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

    return resultados.sort((a, b) => b.iso.localeCompare(a.iso));
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

        if (dataEhAntigaSemContextoForte(data, data.contexto || "")) {
            adicionarDataClassificada(classificadas.ignoradas, data, {
                tipo: "ignorada",
                motivo: `Data anterior a ${ANO_MINIMO_DATA_DOCUMENTAL_RELEVANTE}; não usar como data documental, mesmo quando aparecer em página de encerramento ou rodapé.`,
            });
            continue;
        }

        if (contextoForteEncerramento && !contextoIndicaReferenciaLegal(data.contexto || "")) {
            adicionarDataClassificada(classificadas.outrasRelevantes, data, {
                tipo: "encerramento_documento",
                rotulo: "Data de encerramento / assinatura técnica do documento",
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
    const conteudo = limparTextoPossivelDocumento(texto);
    const porCampoEmpresa = limitarTextoResumo(
        encontrarPrimeiroGrupo(
            conteudo,
            /Empresa:\s*([\s\S]{3,180}?)(?:\s+CPF\s*\/\s*CNPJ|\s+CNPJ|\s+Endere[cç]o|\s+Unidade:|\s+CPF\b|$)/i
        ),
        120
    );

    if (porCampoEmpresa && !valorPareceSomenteDocumentoFiscal(porCampoEmpresa)) {
        return porCampoEmpresa;
    }

    const porRazaoSocialAntesCnpj = encontrarPrimeiroGrupo(
        conteudo,
        /([A-ZÀ-Ú0-9][A-ZÀ-Ú0-9\s&.,'ºª-]{6,180}?(?:LTDA|EIRELI|S\/?A|S\.A\.|ME|EPP))\s*[-–—]?\s*\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/i
    );

    if (porRazaoSocialAntesCnpj && !valorPareceSomenteDocumentoFiscal(porRazaoSocialAntesCnpj)) {
        return limitarTextoResumo(porRazaoSocialAntesCnpj, 120);
    }

    return "";
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


function normalizarTextoDataAdmissaoRegistro(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function obterDatasBrTextoAdmissaoRegistro(valor = "") {
    return Array.from(String(valor || "").matchAll(/\b([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})\b/g))
        .map((match) => match?.[1] || "")
        .filter(Boolean);
}

function obterDataPreferencialAdmissaoRegistro(datas = []) {
    const lista = Array.isArray(datas) ? datas.filter(Boolean) : [];

    if (!lista.length) return "";

    const contagem = lista.reduce((acc, data) => {
        acc[data] = (acc[data] || 0) + 1;
        return acc;
    }, {});

    const repetida = lista.find((data) => contagem[data] >= 2);

    return repetida || lista[0] || "";
}

function obterPrimeiraDataBrTextoAdmissaoRegistro(valor = "") {
    return obterDataPreferencialAdmissaoRegistro(obterDatasBrTextoAdmissaoRegistro(valor));
}

function linhaOcrPossuiContextoProibidoAdmissao(linha = {}) {
    const texto = linha?.textoNormalizado || normalizarTextoDataAdmissaoRegistro(linha?.texto || linha?.text || "");

    return /\bnascimento\b|\bnaturalidade\b|\bctps\b|\bpis\b|\btitulo\b|\bcpf\b|\brg\b|\bidentidade\b|\bemissao\b|\bexpedicao\b/.test(texto);
}

function linhaOcrEhRotuloAdmissaoRegistro(linha = {}) {
    const texto = linha?.textoNormalizado || normalizarTextoDataAdmissaoRegistro(linha?.texto || linha?.text || "");

    if (/\bnascimento\b|\bnaturalidade\b/.test(texto)) {
        return false;
    }

    return /\bdata\s+de\s+admissao\b/.test(texto) ||
        /\badmissao\b/.test(texto) ||
        /\bdata\s+do\s+registro\b/.test(texto) ||
        /\binicio\s+do\s+contrato\b/.test(texto) ||
        /\bopcao\s+em\s+fgts\b/.test(texto) ||
        /\boptante\s+fgts\b/.test(texto);
}

function normalizarLinhasOcrAdmissaoRegistro(linhasOcr = []) {
    return Array.isArray(linhasOcr)
        ? linhasOcr
            .map((linha, indice) => ({
                indice,
                texto: String(linha?.texto || linha?.text || ""),
                textoNormalizado: normalizarTextoDataAdmissaoRegistro(linha?.texto || linha?.text || ""),
                x0: Number(linha?.x0 || 0),
                y0: Number(linha?.y0 || linha?.yCentro || 0),
                yCentro: Number(linha?.yCentro || linha?.y0 || 0),
            }))
            .filter((linha) => linha.texto)
            .sort((a, b) => {
                const dy = a.yCentro - b.yCentro;
                if (Math.abs(dy) > 0.002) return dy;
                return a.x0 - b.x0;
            })
        : [];
}

function obterDataAdmissaoPorLinhasOcr(linhasOcr = []) {
    const linhasOrdenadas = normalizarLinhasOcrAdmissaoRegistro(linhasOcr);

    if (!linhasOrdenadas.length) return "";

    for (let indice = 0; indice < linhasOrdenadas.length; indice += 1) {
        const linha = linhasOrdenadas[indice];

        if (!linhaOcrEhRotuloAdmissaoRegistro(linha)) {
            continue;
        }

        const dataMesmaLinha = obterPrimeiraDataBrTextoAdmissaoRegistro(linha.texto);

        if (dataMesmaLinha) {
            return dataMesmaLinha;
        }

        const candidatasDepois = linhasOrdenadas
            .map((candidata, indiceCandidata) => ({ ...candidata, indiceCandidata }))
            .filter((candidata) => {
                if (candidata.indiceCandidata <= indice || candidata.indiceCandidata > indice + 12) return false;
                if (linhaOcrPossuiContextoProibidoAdmissao(candidata)) return false;

                return Boolean(obterPrimeiraDataBrTextoAdmissaoRegistro(candidata.texto));
            });

        const dataDepois = obterPrimeiraDataBrTextoAdmissaoRegistro(candidatasDepois[0]?.texto || "");

        if (dataDepois) {
            return dataDepois;
        }

        const candidatasAntes = linhasOrdenadas
            .map((candidata, indiceCandidata) => ({ ...candidata, indiceCandidata }))
            .filter((candidata) => {
                if (candidata.indiceCandidata >= indice || candidata.indiceCandidata < indice - 6) return false;
                if (linhaOcrPossuiContextoProibidoAdmissao(candidata)) return false;

                return Boolean(obterPrimeiraDataBrTextoAdmissaoRegistro(candidata.texto));
            })
            .reverse();

        const dataAntes = obterPrimeiraDataBrTextoAdmissaoRegistro(candidatasAntes[0]?.texto || "");

        if (dataAntes) {
            return dataAntes;
        }
    }

    return "";
}

function obterDataAdmissaoRegistroResumo(texto = "", linhasOcr = []) {
    const dataPorLinha = obterDataAdmissaoPorLinhasOcr(linhasOcr);

    if (dataPorLinha) {
        return dataPorLinha;
    }

    const base = limparTextoPossivelDocumento(texto)
        .replace(/\s+/g, " ")
        .trim();

    const padroes = [
        /\bdata\s+de\s+admiss[aã]o\b[^0-9]{0,260}([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i,
        /\badmiss[aã]o\b[^0-9]{0,260}([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i,
        /\bdata\s+do\s+registro\b[^0-9]{0,260}([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i,
        /\bin[ií]cio\s+do\s+contrato\b[^0-9]{0,260}([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i,
        /\bop[cç][aã]o\s+em\s+fgts\b[^0-9]{0,260}([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i,
        /\boptante\s+fgts\b[^0-9]{0,260}([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i,
    ];

    for (const padrao of padroes) {
        const match = base.match(padrao);
        const data = match?.[1] || "";

        if (data) {
            return data;
        }
    }

    return "";
}
function montarCamposExtraidosDocumento({ textoExtraido = "", arquivoNome = "", datasClassificadas = {}, linhasOcr = [] } = {}) {
    const texto = limparTextoPossivelDocumento(textoExtraido);
    const tipoDocumento = obterTipoDocumentoResumo(texto, arquivoNome);
    const empresaNome = obterEmpresaResumo(texto);
    const cnpj = obterCnpjResumo(texto);
    const codigoVerificacao = obterCodigoVerificacaoResumo(texto);
    const totalFuncionarios = obterTotalFuncionariosResumo(texto);
    const dataAssinaturaTexto = obterDataAssinaturaResumo(texto);
    const dataAdmissaoRegistroTexto = obterDataAdmissaoRegistroResumo(texto, linhasOcr);
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
        data_admissao: dataIsoDeTextoDataBr(dataAdmissaoRegistroTexto) || "",
        data_admissao_br: dataAdmissaoRegistroTexto || "",
        assinatura_data: assinaturaClassificada?.iso || dataIsoDeTextoDataBr(dataAssinaturaTexto) || dataEncerramento?.iso || "",
        assinatura_data_br: assinaturaClassificada?.br || dataAssinaturaTexto || dataEncerramento?.br || "",
        data_encerramento: dataEncerramento?.iso || "",
        data_encerramento_br: dataEncerramento?.br || "",
        codigo_verificacao: codigoVerificacao || "",
        total_funcionarios: totalFuncionarios || "",
        linhas_ocr: Array.isArray(linhasOcr) ? linhasOcr.slice(0, 80) : [],
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

const {
    extrairTextoLegivelPdf,
    lerTextoPaginaPdfJs,
    extrairTextoImagemComOcr,
    extrairTextoPrimeiraPaginaPdfComOcr,
} = criarInfraestruturaLeituraDocumental({
    LIMITE_MAIOR_LADO_OCR_IMAGEM,
    arquivoPossuiArrayBuffer,
    decodificarBytes,
    textoParecePdfBrutoOuImagemEmbutida,
    textoPossuiConteudoDocumentoConfiavel,
    extrairDatasTextoDocumental,
});

function detectarXVisualFaixaDds(canvas, faixa = {}) {
    if (!canvas || typeof canvas.getContext !== "function") {
        return { xVisual: false, origem: "sem_canvas" };
    }

    const contexto = canvas.getContext("2d", { willReadFrequently: true });

    if (!contexto) {
        return { xVisual: false, origem: "sem_contexto_canvas" };
    }

    const largura = canvas.width || 1;
    const altura = canvas.height || 1;
    const xInicio = Math.max(0, Math.floor(Number(faixa.x0 || 0) * largura));
    const xFim = Math.min(largura, Math.ceil(Number(faixa.x1 || 1) * largura));
    const yInicio = Math.max(0, Math.floor(Number(faixa.y0 || 0) * altura));
    const yFim = Math.min(altura, Math.ceil(Number(faixa.y1 || 1) * altura));
    const larguraRecorte = Math.max(1, xFim - xInicio);
    const alturaRecorte = Math.max(1, yFim - yInicio);

    if (larguraRecorte < 10 || alturaRecorte < 8) {
        return {
            xVisual: false,
            densidade: 0,
            densidadeEscura: 0,
            densidadeAzul: 0,
            proporcaoPrincipal: 0,
            proporcaoSecundaria: 0,
            centroRatio: 0,
            diagonaisBalanceadas: false,
            quadrantesAtivos: 0,
            origem: "recorte_insuficiente",
        };
    }

    try {
        const dados = contexto.getImageData(xInicio, yInicio, larguraRecorte, alturaRecorte).data;

        let pixelsX = 0;
        let pixelsAzuis = 0;
        let total = 0;
        let diagonalPrincipal = 0;
        let diagonalSecundaria = 0;
        let centro = 0;

        const colunas = new Set();
        const linhas = new Set();
        const quadrantes = [0, 0, 0, 0];

        for (let y = 2; y < alturaRecorte - 2; y += 1) {
            for (let x = 2; x < larguraRecorte - 2; x += 1) {
                const i = (y * larguraRecorte + x) * 4;
                const r = dados[i];
                const g = dados[i + 1];
                const b = dados[i + 2];

                total += 1;

                const azulCaneta = b > 70 && b > r * 1.12 && b > g * 0.82 && r < 190 && g < 205;
                if (azulCaneta) pixelsAzuis += 1;

                const media = (r + g + b) / 3;
                const diferencaCanais = Math.max(r, g, b) - Math.min(r, g, b);

                // Padrão oficial: X de ausência deve ser escuro/preto/neutro.
                // Marca azul é tratada como rubrica/presença, não como ausência.
                const escuroNeutro = (
                    media < 155 &&
                    diferencaCanais <= 70 &&
                    !(b > r * 1.18 && b > g * 0.92)
                );

                const escuroForte = r < 115 && g < 115 && b < 145;

                if (!escuroNeutro && !escuroForte) continue;

                pixelsX += 1;
                colunas.add(x);
                linhas.add(y);

                const nx = larguraRecorte > 1 ? x / (larguraRecorte - 1) : 0;
                const ny = alturaRecorte > 1 ? y / (alturaRecorte - 1) : 0;

                if (Math.abs(ny - nx) <= 0.14) diagonalPrincipal += 1;
                if (Math.abs(ny - (1 - nx)) <= 0.14) diagonalSecundaria += 1;
                if (nx >= 0.30 && nx <= 0.70 && ny >= 0.30 && ny <= 0.70) centro += 1;

                if (nx < 0.5 && ny < 0.5) quadrantes[0] += 1;
                else if (nx >= 0.5 && ny < 0.5) quadrantes[1] += 1;
                else if (nx < 0.5 && ny >= 0.5) quadrantes[2] += 1;
                else quadrantes[3] += 1;
            }
        }

        const densidade = total ? pixelsX / total : 0;
        const densidadeEscura = densidade;
        const densidadeAzul = total ? pixelsAzuis / total : 0;
        const espalhamentoHorizontal = larguraRecorte ? colunas.size / larguraRecorte : 0;
        const espalhamentoVertical = alturaRecorte ? linhas.size / alturaRecorte : 0;
        const proporcaoPrincipal = pixelsX ? diagonalPrincipal / pixelsX : 0;
        const proporcaoSecundaria = pixelsX ? diagonalSecundaria / pixelsX : 0;
        const centroRatio = pixelsX ? centro / pixelsX : 0;
        const diagonaisBalanceadas = Math.abs(proporcaoPrincipal - proporcaoSecundaria) <= 0.18;
        const quadrantesAtivos = quadrantes.filter((valor) => valor >= 2).length;

        const xVisual = Boolean(
            pixelsX >= 8 &&
            densidade >= 0.003 &&
            densidade <= 0.18 &&
            densidadeAzul <= 0.035 &&
            espalhamentoHorizontal >= 0.11 &&
            espalhamentoVertical >= 0.13 &&
            proporcaoPrincipal >= 0.08 &&
            proporcaoSecundaria >= 0.08 &&
            (
                centroRatio >= 0.035 ||
                quadrantesAtivos >= 3
            ) &&
            diagonaisBalanceadas
        );

        return {
            xVisual,
            densidade,
            densidadeEscura,
            densidadeAzul,
            espalhamentoHorizontal,
            espalhamentoVertical,
            proporcaoPrincipal,
            proporcaoSecundaria,
            centroRatio,
            diagonaisBalanceadas,
            quadrantesAtivos,
            origem: "analise_visual_x_dds_preto_escuro",
        };
    } catch {
        return {
            xVisual: false,
            densidade: 0,
            densidadeEscura: 0,
            densidadeAzul: 0,
            proporcaoPrincipal: 0,
            proporcaoSecundaria: 0,
            centroRatio: 0,
            diagonaisBalanceadas: false,
            quadrantesAtivos: 0,
            origem: "erro_analise_visual_x_dds",
        };
    }
}

function detectarMarcacoesDdsPorDia(canvas, opcoes = {}) {
    const linhas = detectarLinhasHorizontaisTabelaPresenca(canvas, opcoes);
    const altura = canvas?.height || 1;

    if (!linhas.length || linhas.length < 4) return [];

    const resultados = [];
    const maxLinhas = Math.min(Number(opcoes?.maxLinhas || 65), linhas.length - 1);
    const indiceInicial = Number.isInteger(Number(opcoes?.indiceInicial)) ? Number(opcoes.indiceInicial) : 1;
    const x0Dias = Number.isFinite(Number(opcoes?.x0Dias)) ? Number(opcoes.x0Dias) : 0.49;
    const x1Dias = Number.isFinite(Number(opcoes?.x1Dias)) ? Number(opcoes.x1Dias) : 0.913;
    const x0Semanal = Number.isFinite(Number(opcoes?.x0Semanal)) ? Number(opcoes.x0Semanal) : 0.925;
    const x1Semanal = Number.isFinite(Number(opcoes?.x1Semanal)) ? Number(opcoes.x1Semanal) : 0.965;
    const quantidadeDias = Math.max(1, Number(opcoes?.quantidadeDias || 7));
    const larguraDia = (x1Dias - x0Dias) / quantidadeDias;

    const analisarCelula = ({ x0, x1, y0, y1, diaIndice, tipoMarcacao }) => {
        const assinatura = calcularAssinaturaVisualFaixa(canvas, {
            x0,
            x1,
            y0,
            y1,
            origem: `analise_visual_dds_${tipoMarcacao}`,
        });

        const analiseX = detectarXVisualFaixaDds(canvas, { x0, x1, y0, y1 });

        const densidade = Number(assinatura.densidade || 0);
        const densidadeAzul = Number(assinatura.densidadeAzul || 0);
        const espalhamentoHorizontal = Number(assinatura.espalhamentoHorizontal || 0);
        const espalhamentoVertical = Number(assinatura.espalhamentoVertical || 0);

        const pareceTracoSimples =
            espalhamentoHorizontal >= 0.22 &&
            espalhamentoVertical <= 0.09 &&
            densidadeAzul < 0.018;

        const assinaturaVisualDds = tipoMarcacao === "semana_completa"
            ? Boolean(assinatura.assinaturaVisual || densidade >= 0.020 || densidadeAzul >= 0.010)
            : Boolean(
                !analiseX.xVisual &&
                (
                    assinatura.assinaturaVisual ||
                    (
                        !pareceTracoSimples &&
                        densidadeAzul >= 0.0035 &&
                        espalhamentoHorizontal >= 0.045 &&
                        espalhamentoVertical >= 0.055
                    ) ||
                    (
                        !pareceTracoSimples &&
                        densidade >= 0.006 &&
                        espalhamentoHorizontal >= 0.04 &&
                        espalhamentoVertical >= 0.06
                    )
                )
            );

        return {
            diaIndice,
            tipoMarcacao,
            x0: Number(x0.toFixed(4)),
            x1: Number(x1.toFixed(4)),
            y0: Number(y0.toFixed(4)),
            y1: Number(y1.toFixed(4)),
            yCentro: Number(((y0 + y1) / 2).toFixed(4)),
            assinatura_visual: assinaturaVisualDds,
            assinatura_visual_base: assinatura.assinaturaVisual,
            assinatura_densidade: densidade,
            assinatura_densidade_azul: densidadeAzul,
            assinatura_espalhamento_horizontal: espalhamentoHorizontal,
            assinatura_espalhamento_vertical: espalhamentoVertical,
            assinatura_parece_traco_simples: pareceTracoSimples,
            x_visual: tipoMarcacao === "dia" ? Boolean(analiseX.xVisual) : false,
            x_densidade: Number(analiseX.densidade || 0),
            x_densidade_escura: Number(analiseX.densidadeEscura || 0),
            x_densidade_azul: Number(analiseX.densidadeAzul || 0),
            x_proporcao_diagonal_principal: Number(analiseX.proporcaoPrincipal || 0),
            x_proporcao_diagonal_secundaria: Number(analiseX.proporcaoSecundaria || 0),
            x_centro_ratio: Number(analiseX.centroRatio || 0),
            x_diagonais_balanceadas: Boolean(analiseX.diagonaisBalanceadas),
            x_quadrantes_ativos: Number(analiseX.quadrantesAtivos || 0),
            x_escuro_forte: Boolean(analiseX.xEscuroForte),
            x_azul_formato: Boolean(analiseX.xAzulFormato),
            assinatura_origem: assinatura.origem,
            grade_calibrada_dds: true,
        };
    };

    for (let indice = indiceInicial; indice < maxLinhas; indice += 1) {
        const superior = linhas[indice];
        const inferior = linhas[indice + 1];

        if (!superior || !inferior) continue;

        const alturaLinhaPx = inferior.y - superior.y;

        if (alturaLinhaPx < 12) continue;

        const y0 = (superior.y + Math.max(2, alturaLinhaPx * 0.08)) / altura;
        const y1 = (inferior.y - Math.max(2, alturaLinhaPx * 0.08)) / altura;

        for (let diaIndice = 0; diaIndice < quantidadeDias; diaIndice += 1) {
            const margemX = Math.max(0.002, larguraDia * 0.05);
            const x0 = x0Dias + (larguraDia * diaIndice) + margemX;
            const x1 = x0Dias + (larguraDia * (diaIndice + 1)) - margemX;

            resultados.push({
                numeroLinha: indice,
                ...analisarCelula({
                    x0,
                    x1,
                    y0,
                    y1,
                    diaIndice,
                    tipoMarcacao: "dia",
                }),
            });
        }

        resultados.push({
            numeroLinha: indice,
            ...analisarCelula({
                x0: x0Semanal,
                x1: x1Semanal,
                y0,
                y1,
                diaIndice: quantidadeDias,
                tipoMarcacao: "semana_completa",
            }),
        });
    }

    return resultados;
}

function normalizarTextoDdsScanner(valor = "") {
    return normalizarTextoVerificacao(String(valor || ""))
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function gerarVariacoesCodigoDds(codigo = "") {
    const bruto = String(codigo || "").trim();
    const normalizado = normalizarTextoDdsScanner(bruto);
    const semSeparadores = normalizado.replace(/\s+/g, "");

    return Array.from(new Set([
        bruto,
        normalizado,
        semSeparadores,
        bruto.replace(/-/g, " "),
        bruto.replace(/-/g, ""),
        bruto.replace(/^DDS/i, "DDS "),
    ].map((item) => normalizarTextoDdsScanner(item)).filter((item) => item.length >= 5)));
}

function pontuarTextoDdsScanner(texto = "", contextoDds = {}) {
    const normalizado = normalizarTextoDdsScanner(texto);
    const indicios = [];
    let score = 0;

    if (!normalizado) {
        return { score: 0, indicios, encontrouCodigo: false, termosLocalizados: 0 };
    }

    const contem = (valor = "") => {
        const termo = normalizarTextoDdsScanner(valor);
        return termo.length >= 3 && normalizado.includes(termo);
    };

    const codigos = gerarVariacoesCodigoDds(contextoDds?.codigo || contextoDds?.codigoEsperado || "");
    const encontrouCodigo = codigos.some((codigo) => codigo && normalizado.includes(codigo));

    if (encontrouCodigo) {
        score += 45;
        indicios.push("codigo_dds");
    }

    const termosFortes = [
        ["dds", 12],
        ["dds semanal", 18],
        ["dialogo diario de seguranca", 18],
        ["dialogo de seguranca", 14],
        ["diario de seguranca", 14],
        ["safescan", 12],
        ["lista de presenca", 12],
        ["participantes", 10],
        ["codigo safescan", 10],
        ["obra", 6],
        ["periodo", 6],
        ["responsavel", 5],
    ];

    let termosLocalizados = 0;

    for (const [termo, peso] of termosFortes) {
        if (contem(termo)) {
            score += peso;
            termosLocalizados += 1;
            indicios.push(`termo:${termo}`);
        }
    }

    const empresa = contextoDds?.empresaNome || contextoDds?.empresa || "";
    const obra = contextoDds?.obraNome || contextoDds?.obra || "";
    const periodoInicio = contextoDds?.periodoInicio || "";
    const periodoFim = contextoDds?.periodoFim || "";

    if (empresa && contem(empresa)) {
        score += 14;
        indicios.push("empresa");
    }

    if (obra && contem(obra)) {
        score += 12;
        indicios.push("obra");
    }

    if (periodoInicio && contem(periodoInicio)) {
        score += 8;
        indicios.push("periodo_inicio");
    }

    if (periodoFim && contem(periodoFim)) {
        score += 8;
        indicios.push("periodo_fim");
    }

    const participantes = Array.isArray(contextoDds?.participantes) ? contextoDds.participantes : [];
    const amostraParticipantes = participantes.slice(0, 80);
    let participantesLocalizados = 0;

    for (const participante of amostraParticipantes) {
        const codigo = participante?.codigoSafescan || participante?.codigoSafeScan || participante?.codigoFuncionario || participante?.codigo || "";
        const nome = participante?.nome || "";

        if ((codigo && contem(codigo)) || (nome && contem(nome))) {
            participantesLocalizados += 1;
        }
    }

    if (participantesLocalizados > 0) {
        score += Math.min(20, participantesLocalizados * 4);
        indicios.push(`participantes:${participantesLocalizados}`);
    }

    const tokens = normalizado.match(/[a-z0-9]{3,}/g) || [];
    score += Math.min(15, Math.floor(tokens.length / 8));

    return {
        score: Math.max(0, Math.min(100, Math.round(score))),
        indicios,
        encontrouCodigo,
        termosLocalizados,
        participantesLocalizados,
    };
}

async function extrairTextoPdfDdsComOcrDirecionado(buffer, contextoDds = {}) {
    const avisos = [];

    if (!buffer || !buffer.byteLength || typeof document === "undefined") {
        return {
            texto: "",
            linhasOcr: [],
            paginasLidas: 0,
            totalPaginas: 0,
            assinaturasTabela: [],
            assinaturasDocumento: [],
            marcacoesDdsDias: [],
            confianca: 0,
            diagnosticoDdsOcr: {
                score: 0,
                origem: "dds_ocr_nao_executado",
            },
            avisos,
        };
    }

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

        if (!totalPaginas) {
            return {
                texto: "",
                linhasOcr: [],
                paginasLidas: 0,
                totalPaginas: 0,
                assinaturasTabela: [],
                assinaturasDocumento: [],
            marcacoesDdsDias: [],
                confianca: 0,
                diagnosticoDdsOcr: {
                    score: 0,
                    origem: "dds_pdf_sem_paginas",
                },
                avisos: ["OCR direcionado DDS não encontrou páginas no PDF."],
            };
        }

        const paginas = totalPaginas <= 6 ? Array.from({ length: totalPaginas }, (_, indice) => indice + 1) : Array.from(new Set([1, 2, totalPaginas - 1, totalPaginas].filter((pagina) => pagina >= 1 && pagina <= totalPaginas)));
        const tentativas = [];

        async function executarPagina(numeroPagina) {
            const pagina = await pdf.getPage(numeroPagina);
            const viewportBase = pagina.getViewport({ scale: 1 });
            const escalaBase = 2.25;
            const limiteLargura = 2400;
            const limiteAltura = 1800;
            const escalaMaximaPorLargura = viewportBase.width ? limiteLargura / viewportBase.width : escalaBase;
            const escalaMaximaPorAltura = viewportBase.height ? limiteAltura / viewportBase.height : escalaBase;
            const escalaSegura = Math.max(1.5, Math.min(escalaBase, escalaMaximaPorLargura, escalaMaximaPorAltura));
            const viewport = pagina.getViewport({ scale: escalaSegura });
            const canvas = document.createElement("canvas");
            const contexto = canvas.getContext("2d", { willReadFrequently: true, alpha: false });

            if (!contexto) {
                avisos.push(`OCR direcionado DDS não conseguiu preparar canvas da página ${numeroPagina}.`);
                return;
            }

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            contexto.fillStyle = "#ffffff";
            contexto.fillRect(0, 0, canvas.width, canvas.height);

            await pagina.render({ canvasContext: contexto, viewport }).promise;
            await new Promise((resolve) => setTimeout(resolve, 0));

            const resultadoOcr = await reconhecerTextoCanvasComOcrComOrientacao(canvas, extrairDatasTextoDocumental);
            const canvasAnalise = resultadoOcr?.canvasAnalise || canvas;
            const texto = limparTextoPossivelDocumento(resultadoOcr?.texto || "");
            const pontuacao = pontuarTextoDdsScanner(texto, contextoDds);
            const textoNormalizadoOcr = normalizarTextoVerificacao(texto);

            const linhasOcr = montarLinhasOcrComAssinatura(canvasAnalise, resultadoOcr?.palavras || [])
                .map((linha) => ({
                    ...linha,
                    pagina: numeroPagina,
                    rotacao: resultadoOcr?.rotacao || 0,
                    texto: linha?.texto ? `DDS pág. ${numeroPagina}: ${linha.texto}` : linha?.texto,
                }));

            const pareceDds = pontuacao.score >= 25 || /dds|dialogo|diálogo|safescan|lista de presenca|lista de presença/.test(textoNormalizadoOcr);
            const assinaturasTabela = pareceDds
                ? detectarAssinaturasTabelaPresenca(canvasAnalise, { yInicio: 0.28, x0: 0.60, x1: 0.98, maxLinhas: 65 })
                    .map((assinatura) => ({ ...assinatura, pagina: numeroPagina, rotacao: resultadoOcr?.rotacao || 0 }))
                : [];

            const marcacoesDdsDias = pareceDds
                ? detectarMarcacoesDdsPorDia(canvasAnalise, {
                    yInicio: 0.44,
                    x0Dias: 0.49,
                    x1Dias: 0.913,
                    quantidadeDias: 7,
                    maxLinhas: 65,
                }).map((marcacao) => ({ ...marcacao, pagina: numeroPagina, rotacao: resultadoOcr?.rotacao || 0 }))
                : [];

            const assinaturasDocumento = detectarAssinaturasDocumento(canvasAnalise, numeroPagina, textoNormalizadoOcr)
                .map((assinatura) => ({ ...assinatura, rotacao: resultadoOcr?.rotacao || 0 }));

            tentativas.push({
                pagina: numeroPagina,
                texto,
                linhasOcr,
                assinaturasTabela,
                marcacoesDdsDias,
                assinaturasDocumento,
                confianca: Number(resultadoOcr?.confianca || 0),
                rotacao: resultadoOcr?.rotacao || 0,
                score: pontuacao.score,
                pontuacao,
            });

            try {
                if (resultadoOcr?.canvasAnalise && resultadoOcr.canvasAnalise !== canvas) {
                    resultadoOcr.canvasAnalise.width = 1;
                    resultadoOcr.canvasAnalise.height = 1;
                }

                canvas.width = 1;
                canvas.height = 1;
            } catch {
                // Liberação de memória sem bloquear o fluxo.
            }

            await new Promise((resolve) => setTimeout(resolve, 0));
        }

        for (const numeroPagina of paginas) {
            await executarPagina(numeroPagina);
        }

        try {
            await pdf.destroy();
        } catch {
            // Liberação de memória sem bloquear o fluxo.
        }

        const ordenadas = tentativas.sort((a, b) => {
            const scoreA = Number(a.score || 0) + Math.min(20, Number(a.confianca || 0) / 5);
            const scoreB = Number(b.score || 0) + Math.min(20, Number(b.confianca || 0) / 5);
            return scoreB - scoreA;
        });

        const melhor = ordenadas[0] || null;
        const textoFinal = limparTextoPossivelDocumento(
            ordenadas
                .filter((item) => item?.texto)
                .slice(0, 2)
                .map((item) => `Página ${item.pagina}: ${item.texto}`)
                .join(" ")
        );

        const linhasOcr = ordenadas.flatMap((item) => item?.linhasOcr || []).slice(0, 120);
        const assinaturasTabela = ordenadas.flatMap((item) => item?.assinaturasTabela || []).slice(0, 60);
        const marcacoesDdsDias = ordenadas.flatMap((item) => item?.marcacoesDdsDias || []).slice(0, 520);
        const assinaturasDocumento = ordenadas.flatMap((item) => item?.assinaturasDocumento || []).slice(0, 30);
        const score = Number(melhor?.score || 0);

        avisos.push(`OCR direcionado DDS analisou página(s) ${paginas.join(", ")} em resolução ampliada para buscar código/cabeçalho do DDS.`);

        if (melhor?.rotacao) {
            avisos.push(`OCR direcionado DDS selecionou leitura com rotação ${melhor.rotacao}° na página ${melhor.pagina}.`);
        }

        if (score < 35) {
            avisos.push("OCR direcionado DDS não encontrou código/cabeçalho com segurança suficiente.");
        }

        return {
            texto: textoFinal,
            linhasOcr,
            paginasLidas: paginas.length,
            totalPaginas,
            assinaturasTabela,
            marcacoesDdsDias,
            assinaturasDocumento,
            confianca: Number(melhor?.confianca || 0),
            diagnosticoDdsOcr: {
                score,
                pagina: melhor?.pagina || 0,
                rotacao: melhor?.rotacao || 0,
                encontrouCodigo: Boolean(melhor?.pontuacao?.encontrouCodigo),
                termosLocalizados: Number(melhor?.pontuacao?.termosLocalizados || 0),
                participantesLocalizados: Number(melhor?.pontuacao?.participantesLocalizados || 0),
                indicios: melhor?.pontuacao?.indicios || [],
                origem: "dds_ocr_direcionado",
            },
            avisos,
        };
    } catch (error) {
        return {
            texto: "",
            linhasOcr: [],
            paginasLidas: 0,
            totalPaginas: 0,
            assinaturasTabela: [],
            assinaturasDocumento: [],
            marcacoesDdsDias: [],
            confianca: 0,
            diagnosticoDdsOcr: {
                score: 0,
                origem: "dds_ocr_erro",
            },
            avisos: [`OCR direcionado DDS indisponível: ${error?.message || "erro desconhecido"}.`],
        };
    }
}
export const {
    executarLeituraDocumentalLocal,
} = criarFluxoLeituraDocumental({
    normalizarTextoVerificacao,
    filtrarDatasPorCategoria,
    limparTextoPossivelDocumento,
    carregarPdfJsDocumental,
    LIMITE_BYTES_LEITURA_LOCAL,
    LIMITE_TEXTO_PDFJS,
    PAGINAS_MAXIMAS_PDFJS,
    PAGINAS_FINAIS_BUSCA_PDFJS,
    PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS,
    CONFIANCA_MINIMA_COMPARACAO_DATAS,
    COMPARACAO_AUTOMATICA_DATAS_OCR_ATIVA,
    arquivoPossuiArrayBuffer,
    obterNomeArquivo,
    obterMimeArquivo,
    obterExtensaoArquivo,
    limitarTextoParaSalvar,
    dataEhAntigaSemContextoForte,
    extrairDatasTextoDocumental,
    contextoIndicaReferenciaLegal,
    contextoIndicaCodigoOuCadastroNaoData,
    extrairVigenciaPrincipalTexto,
    extrairAssinaturaDigitalTexto,
    extrairDatasEncerramentoTexto,
    classificarDatasOcrDocumental,
    obterDatasRelevantesClassificadas,
    textoPossuiConteudoDocumentoConfiavel,
    montarCamposExtraidosDocumento,
    montarResumoTextualDocumento,
    montarPreviaTextoDocumento,
    calcularConfiancaLeitura,
    extrairTextoLegivelPdf,
    lerTextoPaginaPdfJs,
    extrairTextoImagemComOcr,
    extrairTextoPrimeiraPaginaPdfComOcr,
});

export async function executarLeituraDdsLocal({
    arquivo = null,
    arquivoNome = "",
    mimeType = "",
    contextoDds = {},
} = {}) {
    const leituraBase = await executarLeituraDocumentalLocal({ arquivo, arquivoNome, mimeType });
    const nome = obterNomeArquivo(arquivo, arquivoNome);
    const mime = obterMimeArquivo(arquivo, mimeType);
    const extensao = obterExtensaoArquivo({ arquivo, arquivoNome: nome });

    const textoBase = [
        leituraBase?.textoExtraido || "",
        leituraBase?.textoPrevia || "",
        ...((leituraBase?.linhasOcr || []).map((linha) => linha?.texto || "")),
    ].join(" ");

    const pontuacaoBase = pontuarTextoDdsScanner(textoBase, contextoDds);
    let leituraDirecionada = null;

    if (arquivoPossuiArrayBuffer(arquivo) && (mime === "application/pdf" || extensao === "pdf")) {
        try {
            const buffer = await arquivo.arrayBuffer();
            leituraDirecionada = await extrairTextoPdfDdsComOcrDirecionado(buffer, contextoDds);
        } catch (error) {
            leituraDirecionada = {
                texto: "",
                linhasOcr: [],
                paginasLidas: 0,
                totalPaginas: leituraBase?.totalPaginas || 0,
                assinaturasTabela: [],
                assinaturasDocumento: [],
            marcacoesDdsDias: [],
                confianca: 0,
                diagnosticoDdsOcr: {
                    score: 0,
                    origem: "dds_ocr_erro",
                },
                avisos: [`OCR direcionado DDS falhou: ${error?.message || "erro desconhecido"}.`],
            };
        }
    }

    const pontuacaoDirecionada = leituraDirecionada?.diagnosticoDdsOcr || {
        ...pontuacaoBase,
        origem: "leitura_base",
    };

    const scoreBase = Number(pontuacaoBase?.score || 0);
    const scoreDirecionado = Number(pontuacaoDirecionada?.score || 0);
    const textoDirecionado = limparTextoPossivelDocumento(leituraDirecionada?.texto || "");
    const deveUsarDirecionada = Boolean(
        textoDirecionado &&
        (
            scoreDirecionado >= Math.max(28, scoreBase + 8) ||
            pontuacaoDirecionada.encontrouCodigo ||
            scoreDirecionado >= 45
        )
    );

    if (!deveUsarDirecionada) {
        return {
            ...leituraBase,
            diagnosticoDdsOcr: {
                score: scoreBase,
                pagina: 0,
                rotacao: 0,
                encontrouCodigo: Boolean(pontuacaoBase?.encontrouCodigo),
                termosLocalizados: Number(pontuacaoBase?.termosLocalizados || 0),
                participantesLocalizados: Number(pontuacaoBase?.participantesLocalizados || 0),
                indicios: pontuacaoBase?.indicios || [],
                origem: "leitura_base",
                scoreDirecionado,
            },
            avisos: [
                ...(leituraBase?.avisos || []),
                ...(leituraDirecionada?.avisos || []),
                "Leitura direcionada DDS executada como apoio, mas a leitura base permaneceu como referência principal.",
            ],
        };
    }

    const textoSeguro = limitarTextoParaSalvar(textoDirecionado);
    const confiancaBase = Number(leituraBase?.confianca || 0);
    const confiancaDirecionada = Number(leituraDirecionada?.confianca || 0);
    const confiancaFinal = Math.max(
        confiancaBase,
        Math.min(92, Math.round((confiancaDirecionada + scoreDirecionado) / 2))
    );

    return {
        ...leituraBase,
        tipoLeitura: "dds_ocr_direcionado",
        textoExtraido: textoSeguro,
        textoPrevia: montarPreviaTextoDocumento(textoSeguro),
        linhasOcr: Array.isArray(leituraDirecionada?.linhasOcr) ? leituraDirecionada.linhasOcr.slice(0, 120) : [],
        assinaturasTabela: Array.isArray(leituraDirecionada?.assinaturasTabela) ? leituraDirecionada.assinaturasTabela.slice(0, 60) : [],
        marcacoesDdsDias: Array.isArray(leituraDirecionada?.marcacoesDdsDias) ? leituraDirecionada.marcacoesDdsDias.slice(0, 520) : [],
        assinaturasDocumento: Array.isArray(leituraDirecionada?.assinaturasDocumento) ? leituraDirecionada.assinaturasDocumento.slice(0, 30) : [],
        paginasLidas: leituraDirecionada?.paginasLidas || leituraBase?.paginasLidas || 0,
        totalPaginas: leituraDirecionada?.totalPaginas || leituraBase?.totalPaginas || 0,
        confianca: confiancaFinal,
        diagnosticoDdsOcr: {
            ...pontuacaoDirecionada,
            score: scoreDirecionado,
            scoreBase,
            origem: "dds_ocr_direcionado",
        },
        avisos: [
            ...(leituraBase?.avisos || []),
            ...(leituraDirecionada?.avisos || []),
            `Leitura direcionada DDS selecionada com score ${scoreDirecionado}/100.`,
        ],
    };
}

export { avaliarLeituraDocumentalComCadastro } from "./documentosOcrCadastroService";

export { montarRetornoLeituraParaPersistencia } from "./documentosOcrPersistenciaService";
