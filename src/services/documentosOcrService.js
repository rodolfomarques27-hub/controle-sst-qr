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

const LIMITE_BYTES_LEITURA_LOCAL = 8 * 1024 * 1024;
const LIMITE_TEXTO_OCR_SALVAR = 6000;
const LIMITE_TEXTO_PDFJS = 18000;
const LIMITE_MAIOR_LADO_OCR_IMAGEM = 1800;
const PAGINAS_MAXIMAS_PDFJS = 6;
const PAGINAS_FINAIS_BUSCA_PDFJS = 10;
const PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS = 160;
const TOLERANCIA_DIAS_COMPARACAO = 2;
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


async function carregarTesseractDocumental() {
    try {
        return await import("tesseract.js");
    } catch (error) {
        throw new Error(`OCR local indisponível: ${error?.message || "não foi possível carregar tesseract.js"}.`);
    }
}


function obterBboxPalavraOcr(palavra = {}) {
    const bbox = palavra?.bbox || palavra?.box || palavra?.boundingBox || null;

    if (!bbox) return null;

    const x0 = Number(bbox.x0 ?? bbox.left ?? bbox.x ?? 0);
    const y0 = Number(bbox.y0 ?? bbox.top ?? bbox.y ?? 0);
    const x1 = Number(bbox.x1 ?? (bbox.left !== undefined && bbox.width !== undefined ? bbox.left + bbox.width : 0));
    const y1 = Number(bbox.y1 ?? (bbox.top !== undefined && bbox.height !== undefined ? bbox.top + bbox.height : 0));

    if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
    if (x1 <= x0 || y1 <= y0) return null;

    return { x0, y0, x1, y1 };
}

function agruparPalavrasOcrEmLinhas(palavras = [], canvas = null) {
    const largura = Number(canvas?.width || 0) || 1;
    const altura = Number(canvas?.height || 0) || 1;
    const registros = (Array.isArray(palavras) ? palavras : [])
        .map((palavra) => {
            const texto = limparTextoPossivelDocumento(palavra?.text || palavra?.symbol || "");
            const bbox = obterBboxPalavraOcr(palavra);

            if (!texto || !bbox) return null;

            return {
                texto,
                x0: bbox.x0,
                y0: bbox.y0,
                x1: bbox.x1,
                y1: bbox.y1,
                yCentro: (bbox.y0 + bbox.y1) / 2,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.yCentro - b.yCentro || a.x0 - b.x0);

    const linhas = [];
    const toleranciaBase = Math.max(8, altura * 0.008);

    registros.forEach((palavra) => {
        const ultima = linhas[linhas.length - 1];
        const tolerancia = Math.max(toleranciaBase, (palavra.y1 - palavra.y0) * 0.65);

        if (ultima && Math.abs(ultima.yCentro - palavra.yCentro) <= tolerancia) {
            ultima.palavras.push(palavra);
            ultima.y0 = Math.min(ultima.y0, palavra.y0);
            ultima.y1 = Math.max(ultima.y1, palavra.y1);
            ultima.x0 = Math.min(ultima.x0, palavra.x0);
            ultima.x1 = Math.max(ultima.x1, palavra.x1);
            ultima.yCentro = (ultima.yCentro * (ultima.palavras.length - 1) + palavra.yCentro) / ultima.palavras.length;
            return;
        }

        linhas.push({
            palavras: [palavra],
            x0: palavra.x0,
            y0: palavra.y0,
            x1: palavra.x1,
            y1: palavra.y1,
            yCentro: palavra.yCentro,
        });
    });

    return linhas.map((linha, indice) => {
        const palavrasLinha = linha.palavras.sort((a, b) => a.x0 - b.x0);
        const texto = limparTextoPossivelDocumento(palavrasLinha.map((palavra) => palavra.texto).join(" "));

        return {
            indice,
            texto,
            texto_normalizado: normalizarTextoVerificacao(texto),
            x0: Number((linha.x0 / largura).toFixed(4)),
            x1: Number((linha.x1 / largura).toFixed(4)),
            y0: Number((linha.y0 / altura).toFixed(4)),
            y1: Number((linha.y1 / altura).toFixed(4)),
            yCentro: Number((linha.yCentro / altura).toFixed(4)),
        };
    }).filter((linha) => linha.texto);
}

function calcularAssinaturaVisualLinha(canvas, linha = {}) {
    if (!canvas || typeof canvas.getContext !== "function" || !linha) {
        return { assinaturaVisual: false, densidade: 0, origem: "sem_canvas_ou_linha" };
    }

    const contexto = canvas.getContext("2d", { willReadFrequently: true });

    if (!contexto) {
        return { assinaturaVisual: false, densidade: 0, origem: "sem_contexto_canvas" };
    }

    const largura = canvas.width || 1;
    const altura = canvas.height || 1;
    const y0Normalizado = Number(linha.y0 || linha.yCentro || 0);
    const y1Normalizado = Number(linha.y1 || linha.yCentro || y0Normalizado);
    const centroLinha = Number(linha.yCentro || ((y0Normalizado + y1Normalizado) / 2));
    const alturaLinha = Math.max(0.018, Math.abs(y1Normalizado - y0Normalizado), 0.022);

    // A coluna de assinatura costuma começar antes de 68% da página em listas escaneadas.
    // Usar uma faixa um pouco mais ampla evita perder assinatura quando a tabela foi digitalizada torta.
    const xInicio = Math.max(0, Math.floor(largura * 0.59));
    const xFim = Math.min(largura, Math.floor(largura * 0.985));
    const yInicio = Math.max(0, Math.floor((centroLinha - alturaLinha * 0.85) * altura));
    const yFim = Math.min(altura, Math.ceil((centroLinha + alturaLinha * 1.05) * altura));
    const larguraRecorte = Math.max(1, xFim - xInicio);
    const alturaRecorte = Math.max(1, yFim - yInicio);

    try {
        const dados = contexto.getImageData(xInicio, yInicio, larguraRecorte, alturaRecorte).data;
        let pixelsRelevantes = 0;
        let pixelsTinta = 0;
        let pixelsAzuis = 0;
        const colunasComTinta = new Set();
        const linhasComTinta = new Set();

        for (let y = 0; y < alturaRecorte; y += 1) {
            for (let x = 0; x < larguraRecorte; x += 1) {
                const i = (y * larguraRecorte + x) * 4;
                const r = dados[i];
                const g = dados[i + 1];
                const b = dados[i + 2];
                const a = dados[i + 3];

                if (a < 40) continue;

                pixelsRelevantes += 1;

                const luma = (0.299 * r) + (0.587 * g) + (0.114 * b);
                const diferencaCanais = Math.max(r, g, b) - Math.min(r, g, b);
                const azulCaneta = b > r + 14 && b > g + 4 && b < 245;
                const tracoEscuro = luma < 150 && diferencaCanais > 7;
                const tintaProvavel = azulCaneta || tracoEscuro;

                if (tintaProvavel) {
                    pixelsTinta += 1;
                    if (azulCaneta) pixelsAzuis += 1;
                    colunasComTinta.add(Math.floor(x / 4));
                    linhasComTinta.add(Math.floor(y / 3));
                }
            }
        }

        const densidade = pixelsRelevantes ? pixelsTinta / pixelsRelevantes : 0;
        const densidadeAzul = pixelsRelevantes ? pixelsAzuis / pixelsRelevantes : 0;
        const espalhamentoHorizontal = colunasComTinta.size / Math.max(1, Math.ceil(larguraRecorte / 4));
        const espalhamentoVertical = linhasComTinta.size / Math.max(1, Math.ceil(alturaRecorte / 3));
        const assinaturaVisual = (
            densidadeAzul > 0.0007 ||
            (densidade > 0.0032 && espalhamentoHorizontal > 0.025 && espalhamentoVertical > 0.055) ||
            (densidade > 0.0055 && espalhamentoHorizontal > 0.018)
        );

        return {
            assinaturaVisual,
            densidade: Number(densidade.toFixed(4)),
            densidadeAzul: Number(densidadeAzul.toFixed(4)),
            espalhamentoHorizontal: Number(espalhamentoHorizontal.toFixed(4)),
            espalhamentoVertical: Number(espalhamentoVertical.toFixed(4)),
            origem: "analise_visual_coluna_assinatura",
        };
    } catch {
        return { assinaturaVisual: false, densidade: 0, origem: "erro_leitura_canvas" };
    }
}


function calcularAssinaturaVisualFaixa(canvas, faixa = {}) {
    if (!canvas || typeof canvas.getContext !== "function") {
        return { assinaturaVisual: false, densidade: 0, origem: faixa.origem || "sem_canvas" };
    }

    const contexto = canvas.getContext("2d", { willReadFrequently: true });

    if (!contexto) {
        return { assinaturaVisual: false, densidade: 0, origem: faixa.origem || "sem_contexto_canvas" };
    }

    const largura = canvas.width || 1;
    const altura = canvas.height || 1;
    const xInicio = Math.max(0, Math.floor(Number(faixa.x0 || 0) * largura));
    const xFim = Math.min(largura, Math.ceil(Number(faixa.x1 || 1) * largura));
    const yInicio = Math.max(0, Math.floor(Number(faixa.y0 || 0) * altura));
    const yFim = Math.min(altura, Math.ceil(Number(faixa.y1 || 1) * altura));
    const larguraRecorte = Math.max(1, xFim - xInicio);
    const alturaRecorte = Math.max(1, yFim - yInicio);

    if (larguraRecorte < 8 || alturaRecorte < 6) {
        return {
            assinaturaVisual: false,
            densidade: 0,
            origem: faixa.origem || "recorte_insuficiente",
            larguraRecorte,
            alturaRecorte,
        };
    }

    try {
        const dados = contexto.getImageData(xInicio, yInicio, larguraRecorte, alturaRecorte).data;
        let pixelsRelevantes = 0;
        let pixelsTinta = 0;
        let pixelsAzuis = 0;
        const colunasComTinta = new Set();
        const linhasComTinta = new Set();

        for (let y = 0; y < alturaRecorte; y += 1) {
            for (let x = 0; x < larguraRecorte; x += 1) {
                // Ignora bordas do recorte para reduzir falso positivo por linha da tabela.
                if (x < 3 || y < 3 || x > larguraRecorte - 4 || y > alturaRecorte - 4) continue;

                const i = (y * larguraRecorte + x) * 4;
                const r = dados[i];
                const g = dados[i + 1];
                const b = dados[i + 2];
                const a = dados[i + 3];

                if (a < 40) continue;

                pixelsRelevantes += 1;

                const luma = (0.299 * r) + (0.587 * g) + (0.114 * b);
                const diferencaCanais = Math.max(r, g, b) - Math.min(r, g, b);
                const azulCaneta = b > r + 10 && b > g + 2 && b < 248;
                const tracoEscuro = luma < 165 && diferencaCanais > 4;
                const tintaProvavel = azulCaneta || tracoEscuro;

                if (tintaProvavel) {
                    pixelsTinta += 1;
                    if (azulCaneta) pixelsAzuis += 1;
                    colunasComTinta.add(Math.floor(x / 4));
                    linhasComTinta.add(Math.floor(y / 3));
                }
            }
        }

        const densidade = pixelsRelevantes ? pixelsTinta / pixelsRelevantes : 0;
        const densidadeAzul = pixelsRelevantes ? pixelsAzuis / pixelsRelevantes : 0;
        const espalhamentoHorizontal = colunasComTinta.size / Math.max(1, Math.ceil(larguraRecorte / 4));
        const espalhamentoVertical = linhasComTinta.size / Math.max(1, Math.ceil(alturaRecorte / 3));
        const assinaturaVisual = (
            densidadeAzul > 0.00045 ||
            (densidade > 0.0024 && espalhamentoHorizontal > 0.018 && espalhamentoVertical > 0.04) ||
            (densidade > 0.0042 && espalhamentoHorizontal > 0.012)
        );

        return {
            assinaturaVisual,
            densidade: Number(densidade.toFixed(4)),
            densidadeAzul: Number(densidadeAzul.toFixed(4)),
            espalhamentoHorizontal: Number(espalhamentoHorizontal.toFixed(4)),
            espalhamentoVertical: Number(espalhamentoVertical.toFixed(4)),
            larguraRecorte,
            alturaRecorte,
            origem: faixa.origem || "analise_visual_faixa",
        };
    } catch {
        return { assinaturaVisual: false, densidade: 0, origem: faixa.origem || "erro_leitura_canvas" };
    }
}

function detectarLinhasHorizontaisTabelaPresenca(canvas, opcoes = {}) {
    if (!canvas || typeof canvas.getContext !== "function") return [];

    const contexto = canvas.getContext("2d", { willReadFrequently: true });
    if (!contexto) return [];

    const largura = canvas.width || 1;
    const altura = canvas.height || 1;
    const xInicio = Math.floor(largura * 0.06);
    const xFim = Math.floor(largura * 0.94);
    const yInicioNormalizado = Number.isFinite(Number(opcoes?.yInicio)) ? Number(opcoes.yInicio) : 0.52;
    const yFimNormalizado = Number.isFinite(Number(opcoes?.yFim)) ? Number(opcoes.yFim) : 0.98;
    const yInicioSeguro = Math.max(0.05, Math.min(0.9, yInicioNormalizado));
    const yFimSeguro = Math.max(yInicioSeguro + 0.05, Math.min(0.99, yFimNormalizado));
    const yInicio = Math.floor(altura * yInicioSeguro);
    const yFim = Math.floor(altura * yFimSeguro);
    const larguraRegiao = Math.max(1, xFim - xInicio);
    const alturaRegiao = Math.max(1, yFim - yInicio);
    const candidatos = [];

    try {
        // Importante para performance: pegar a região da tabela uma única vez.
        // A versão anterior fazia milhares de getImageData(1x1), o que travava o Chrome.
        const dados = contexto.getImageData(xInicio, yInicio, larguraRegiao, alturaRegiao).data;
        const passoX = Math.max(7, Math.floor(larguraRegiao / 150));
        const passoY = 2;

        for (let yLocal = 0; yLocal < alturaRegiao; yLocal += passoY) {
            let escuros = 0;
            let total = 0;

            for (let xLocal = 0; xLocal < larguraRegiao; xLocal += passoX) {
                const i = (yLocal * larguraRegiao + xLocal) * 4;
                const r = dados[i];
                const g = dados[i + 1];
                const b = dados[i + 2];
                const a = dados[i + 3];

                if (a < 40) continue;

                const luma = (0.299 * r) + (0.587 * g) + (0.114 * b);
                total += 1;
                if (luma < 125) escuros += 1;
            }

            const proporcao = total ? escuros / total : 0;
            if (proporcao >= 0.14) {
                candidatos.push({ y: yInicio + yLocal, proporcao });
            }
        }
    } catch {
        return [];
    }

    const grupos = [];
    candidatos.forEach((candidato) => {
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && candidato.y - ultimo.fim <= 5) {
            ultimo.fim = candidato.y;
            ultimo.pontos.push(candidato);
            return;
        }
        grupos.push({ inicio: candidato.y, fim: candidato.y, pontos: [candidato] });
    });

    const linhas = grupos
        .map((grupo) => ({
            y: Math.round((grupo.inicio + grupo.fim) / 2),
            proporcao: Math.max(...grupo.pontos.map((ponto) => ponto.proporcao)),
            alturaGrupo: grupo.fim - grupo.inicio + 1,
        }))
        .filter((linha) => linha.proporcao >= 0.17 || linha.alturaGrupo >= 3)
        .sort((a, b) => a.y - b.y);

    return linhas.reduce((lista, linha) => {
        const anterior = lista[lista.length - 1];
        if (anterior && Math.abs(linha.y - anterior.y) < 10) {
            if (linha.proporcao > anterior.proporcao) lista[lista.length - 1] = linha;
            return lista;
        }
        lista.push(linha);
        return lista;
    }, []);
}

function detectarAssinaturasTabelaPresenca(canvas, opcoes = {}) {
    const linhas = detectarLinhasHorizontaisTabelaPresenca(canvas, opcoes);
    const altura = canvas?.height || 1;

    if (!linhas.length || linhas.length < 4) return [];

    // Em listas padrão, a primeira faixa é o cabeçalho da tabela e as seguintes são linhas numeradas.
    const resultados = [];
    const maxLinhas = Math.min(Number(opcoes?.maxLinhas || 20), linhas.length - 1);
    const indiceInicial = Number.isInteger(Number(opcoes?.indiceInicial)) ? Number(opcoes.indiceInicial) : 1;
    const x0Assinatura = Number.isFinite(Number(opcoes?.x0)) ? Number(opcoes.x0) : 0.64;
    const x1Assinatura = Number.isFinite(Number(opcoes?.x1)) ? Number(opcoes.x1) : 0.925;

    for (let indice = indiceInicial; indice < maxLinhas; indice += 1) {
        const superior = linhas[indice];
        const inferior = linhas[indice + 1];
        if (!superior || !inferior) continue;

        const alturaLinhaPx = inferior.y - superior.y;
        if (alturaLinhaPx < 12) continue;

        const y0 = (superior.y + Math.max(3, alturaLinhaPx * 0.14)) / altura;
        const y1 = (inferior.y - Math.max(3, alturaLinhaPx * 0.12)) / altura;
        const assinatura = calcularAssinaturaVisualFaixa(canvas, {
            x0: x0Assinatura,
            x1: x1Assinatura,
            y0,
            y1,
            origem: "analise_visual_linha_tabela_presenca",
        });

        resultados.push({
            numeroLinha: indice,
            y0: Number(y0.toFixed(4)),
            y1: Number(y1.toFixed(4)),
            yCentro: Number(((y0 + y1) / 2).toFixed(4)),
            assinatura_visual: assinatura.assinaturaVisual,
            assinatura_densidade: assinatura.densidade,
            assinatura_densidade_azul: assinatura.densidadeAzul || 0,
            assinatura_espalhamento_horizontal: assinatura.espalhamentoHorizontal || 0,
            assinatura_espalhamento_vertical: assinatura.espalhamentoVertical || 0,
            assinatura_origem: assinatura.origem,
        });
    }

    return resultados;
}


function detectarAssinaturasDocumento(canvas, numeroPagina = 1, textoNormalizadoPagina = "") {
    if (!canvas || typeof canvas.getContext !== "function") return [];

    const texto = normalizarTextoVerificacao(textoNormalizadoPagina);
    const documentoComAssinaturaIndividual = /ordem de servico|ordem de serviço|seguranca e saude do trabalho|segurança e saúde do trabalho|assinatura do empregado|registro de empregado|ficha de registro|empregado|data de admissao|data de admissão|controle de entrega de epi|entrega de epi|equipamento de protecao individual|equipamento de proteção individual|declaracao de recebimento|declaração de recebimento|atestado de saude ocupacional|atestado de saúde ocupacional|aso|assinado digitalmente|icp-brasil|participante/.test(texto);

    if (!documentoComAssinaturaIndividual) return [];

    const faixas = [
        {
            tipo: "assinatura_empregado",
            rotulo: "Assinatura do empregado",
            x0: 0.07,
            x1: 0.43,
            y0: 0.66,
            y1: 0.90,
        },
        {
            tipo: "assinatura_responsavel",
            rotulo: "Assinatura do responsável/TST",
            x0: 0.43,
            x1: 0.88,
            y0: 0.66,
            y1: 0.90,
        },
        {
            tipo: "assinatura_rodape",
            rotulo: "Assinatura no rodapé do documento",
            x0: 0.06,
            x1: 0.92,
            y0: 0.60,
            y1: 0.92,
        },
    ];

    return faixas.map((faixa) => {
        const assinatura = calcularAssinaturaVisualFaixa(canvas, {
            ...faixa,
            origem: `assinatura_documento_${faixa.tipo}`,
        });

        return {
            pagina: numeroPagina,
            tipo: faixa.tipo,
            rotulo: faixa.rotulo,
            assinatura_visual: assinatura.assinaturaVisual,
            assinatura_densidade: assinatura.densidade,
            assinatura_densidade_azul: assinatura.densidadeAzul || 0,
            assinatura_espalhamento_horizontal: assinatura.espalhamentoHorizontal || 0,
            assinatura_espalhamento_vertical: assinatura.espalhamentoVertical || 0,
            assinatura_origem: assinatura.origem,
            largura_recorte: assinatura.larguraRecorte || null,
            altura_recorte: assinatura.alturaRecorte || null,
        };
    }).filter((item) => item.assinatura_visual || item.tipo === "assinatura_empregado");
}

function montarLinhasOcrComAssinatura(canvas, palavras = []) {
    // Mantém a posição das linhas do OCR para localizar colaborador/data/treinamento,
    // mas não varre assinatura em todas as linhas. A assinatura é analisada só nas faixas
    // da tabela de presença, reduzindo travamento em PDFs escaneados.
    return agruparPalavrasOcrEmLinhas(palavras, canvas)
        .map((linha) => ({
            ...linha,
            assinatura_visual: null,
            assinatura_densidade: null,
            assinatura_densidade_azul: null,
            assinatura_espalhamento_horizontal: null,
            assinatura_espalhamento_vertical: null,
            assinatura_origem: "assinatura_avaliada_por_tabela_quando_aplicavel",
        }))
        .slice(0, 120);
}


function calcularScoreTextoOcrOrientacao(texto = "") {
    const limpo = limparTextoPossivelDocumento(texto);
    const normalizado = normalizarTextoVerificacao(limpo);
    const tokens = normalizado.match(/[a-z0-9]{3,}/g) || [];
    const datas = extrairDatasTextoDocumental(limpo, "ocr_orientacao").length;
    const termos = [
        "certificado", "treinamento", "lista", "presenca", "presença", "ordem", "servico", "serviço",
        "registro", "empregado", "aso", "atestado", "saude", "saúde", "ocupacional", "empresa", "cnpj",
        "cpf", "colaborador", "nome", "funcao", "função", "assinatura", "ribeiro", "aquino", "data",
        "admissao", "admissão", "epi", "ergonomia", "maquinas", "máquinas", "sinalizacao", "sinalização",
        "dds", "dialogo", "diálogo", "diario", "diário", "seguranca", "segurança", "semanal",
        "safescan", "participantes", "obra", "setor", "presenca", "presença", "folha", "conferencia", "conferência"
    ].reduce((total, termo) => total + (normalizado.includes(normalizarTextoVerificacao(termo)) ? 1 : 0), 0);

    return Math.min(100, tokens.length + termos * 8 + datas * 12 + Math.min(18, Math.floor(limpo.length / 80)));
}

function criarCanvasRotacionado(canvas, graus = 0) {
    if (!canvas || typeof document === "undefined") return canvas;

    const angulo = Number(graus || 0);
    if (!angulo) return canvas;

    const radianos = (angulo * Math.PI) / 180;
    const larguraOrigem = canvas.width || 1;
    const alturaOrigem = canvas.height || 1;
    const rotacionado = document.createElement("canvas");
    const trocaDimensao = Math.abs(angulo) % 180 === 90;

    rotacionado.width = trocaDimensao ? alturaOrigem : larguraOrigem;
    rotacionado.height = trocaDimensao ? larguraOrigem : alturaOrigem;

    const contexto = rotacionado.getContext("2d", { willReadFrequently: true });
    if (!contexto) return canvas;

    contexto.save();
    contexto.translate(rotacionado.width / 2, rotacionado.height / 2);
    contexto.rotate(radianos);
    contexto.drawImage(canvas, -larguraOrigem / 2, -alturaOrigem / 2);
    contexto.restore();

    return rotacionado;
}

async function reconhecerTextoCanvasComOcrComOrientacao(canvas) {
    const tentativas = [];
    const primeira = await reconhecerTextoCanvasComOcr(canvas);

    tentativas.push({
        ...primeira,
        canvasAnalise: canvas,
        rotacao: 0,
        scoreOrientacao: calcularScoreTextoOcrOrientacao(primeira?.texto || ""),
    });

    if (tentativas[0].scoreOrientacao >= 34) {
        return tentativas[0];
    }

    for (const rotacao of [90, 180, 270]) {
        const canvasRotacionado = criarCanvasRotacionado(canvas, rotacao);
        if (!canvasRotacionado || canvasRotacionado === canvas) continue;

        try {
            const resultado = await reconhecerTextoCanvasComOcr(canvasRotacionado);
            tentativas.push({
                ...resultado,
                canvasAnalise: canvasRotacionado,
                rotacao,
                scoreOrientacao: calcularScoreTextoOcrOrientacao(resultado?.texto || ""),
            });
        } catch {
            try {
                canvasRotacionado.width = 1;
                canvasRotacionado.height = 1;
            } catch {
                // Não bloquear a análise se não conseguir liberar o canvas.
            }
        }
    }

    return tentativas.sort((a, b) => Number(b.scoreOrientacao || 0) - Number(a.scoreOrientacao || 0))[0] || tentativas[0];
}

async function reconhecerTextoCanvasComOcr(canvas) {
    const moduloTesseract = await carregarTesseractDocumental();
    const reconhecer = moduloTesseract?.recognize || moduloTesseract?.default?.recognize;

    if (typeof reconhecer !== "function") {
        throw new Error("OCR local indisponível: função recognize não encontrada.");
    }

    const avisoOriginal = typeof console !== "undefined" ? console.warn : null;

    try {
        if (avisoOriginal) {
            console.warn = (...args) => {
                const texto = args.map((arg) => String(arg || "")).join(" ");
                if (
                    texto.includes("Image too small to scale") ||
                    texto.includes("Line cannot be recognized")
                ) {
                    return;
                }
                avisoOriginal(...args);
            };
        }

        const resultado = await reconhecer(canvas, "por", {
            logger: () => {},
            tessedit_pageseg_mode: "6",
            preserve_interword_spaces: "1",
        });

        return {
            texto: limparTextoPossivelDocumento(resultado?.data?.text || ""),
            palavras: Array.isArray(resultado?.data?.words) ? resultado.data.words : [],
            confianca: Number(resultado?.data?.confidence || 0),
        };
    } finally {
        if (avisoOriginal) {
            console.warn = avisoOriginal;
        }
    }
}

function carregarImagemParaOcr(arquivo) {
    return new Promise((resolve, reject) => {
        if (!arquivo || typeof URL === "undefined" || typeof Image === "undefined") {
            reject(new Error("Imagem local indisponÃ­vel para OCR no navegador."));
            return;
        }

        const url = URL.createObjectURL(arquivo);
        const imagem = new Image();

        imagem.onload = () => {
            URL.revokeObjectURL(url);
            resolve(imagem);
        };

        imagem.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("NÃ£o foi possÃ­vel carregar a imagem para OCR local."));
        };

        imagem.src = url;
    });
}

function desenharImagemEmCanvasOcr(imagem) {
    if (!imagem || typeof document === "undefined") {
        throw new Error("Canvas indisponÃ­vel para OCR local da imagem.");
    }

    const larguraOriginal = Number(imagem.naturalWidth || imagem.width || 0);
    const alturaOriginal = Number(imagem.naturalHeight || imagem.height || 0);

    if (!larguraOriginal || !alturaOriginal) {
        throw new Error("Imagem sem dimensÃµes vÃ¡lidas para OCR local.");
    }

    const maiorLado = Math.max(larguraOriginal, alturaOriginal);
    const escala = Math.min(1, LIMITE_MAIOR_LADO_OCR_IMAGEM / maiorLado);
    const largura = Math.max(1, Math.round(larguraOriginal * escala));
    const altura = Math.max(1, Math.round(alturaOriginal * escala));
    const canvas = document.createElement("canvas");
    const contexto = canvas.getContext("2d", { willReadFrequently: true, alpha: false });

    if (!contexto) {
        throw new Error("NÃ£o foi possÃ­vel preparar o canvas para OCR local da imagem.");
    }

    canvas.width = largura;
    canvas.height = altura;
    contexto.fillStyle = "#ffffff";
    contexto.fillRect(0, 0, largura, altura);
    contexto.drawImage(imagem, 0, 0, largura, altura);

    return {
        canvas,
        redimensionada: escala < 1,
        larguraOriginal,
        alturaOriginal,
        largura,
        altura,
    };
}

async function extrairTextoImagemComOcr({ arquivo = null, arquivoNome = "", mimeType = "", extensao = "" } = {}) {
    const avisos = [];

    if (!arquivoPossuiArrayBuffer(arquivo)) {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            linhasOcr: [],
            assinaturasTabela: [],
            assinaturasDocumento: [],
            marcacoesDdsDias: [],
            confianca: 0,
            avisos: ["Imagem sem arquivo local para executar OCR."],
        };
    }

    if (typeof document === "undefined") {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            linhasOcr: [],
            assinaturasTabela: [],
            assinaturasDocumento: [],
            marcacoesDdsDias: [],
            confianca: 0,
            avisos: ["OCR de imagem nÃ£o executado fora do navegador."],
        };
    }

    try {
        const imagem = await carregarImagemParaOcr(arquivo);
        const dadosCanvas = desenharImagemEmCanvasOcr(imagem);

        if (dadosCanvas.redimensionada) {
            avisos.push(
                `Imagem redimensionada de ${dadosCanvas.larguraOriginal}x${dadosCanvas.alturaOriginal} para ${dadosCanvas.largura}x${dadosCanvas.altura} antes do OCR, para preservar performance.`
            );
        }

        const resultadoOcr = await reconhecerTextoCanvasComOcrComOrientacao(dadosCanvas.canvas);
        const canvasAnalise = resultadoOcr?.canvasAnalise || dadosCanvas.canvas;
        const textoOcr = limparTextoPossivelDocumento(resultadoOcr?.texto || "");
        const linhasOcr = montarLinhasOcrComAssinatura(canvasAnalise, resultadoOcr?.palavras || [])
            .map((linha) => ({
                ...linha,
                pagina: 1,
                rotacao: resultadoOcr?.rotacao || 0,
                texto: linha?.texto ? `Imagem: ${linha.texto}` : linha?.texto,
            }));
        const textoNormalizadoOcr = normalizarTextoVerificacao(textoOcr);
        const assinaturasDocumento = detectarAssinaturasDocumento(canvasAnalise, 1, textoNormalizadoOcr)
            .map((assinatura) => ({ ...assinatura, rotacao: resultadoOcr?.rotacao || 0 }));

        if (resultadoOcr?.rotacao) {
            avisos.push(`OCR local corrigiu orientaÃ§Ã£o da imagem em ${resultadoOcr.rotacao}Â°.`);
        }

        avisos.push("OCR local executado na imagem usando tesseract.js, sem API paga.");

        try {
            if (resultadoOcr?.canvasAnalise && resultadoOcr.canvasAnalise !== dadosCanvas.canvas) {
                resultadoOcr.canvasAnalise.width = 1;
                resultadoOcr.canvasAnalise.height = 1;
            }
            dadosCanvas.canvas.width = 1;
            dadosCanvas.canvas.height = 1;
        } catch {
            // LiberaÃ§Ã£o de memÃ³ria sem bloquear o fluxo.
        }

        if (textoPossuiConteudoDocumentoConfiavel(textoOcr)) {
            return {
                texto: textoOcr,
                paginasLidas: 1,
                totalPaginas: 1,
                linhasOcr,
                assinaturasTabela: [],
                assinaturasDocumento,
                confianca: Number(resultadoOcr?.confianca || 0),
                avisos,
            };
        }

        return {
            texto: "",
            paginasLidas: 1,
            totalPaginas: 1,
            linhasOcr,
            assinaturasTabela: [],
            assinaturasDocumento,
            confianca: Number(resultadoOcr?.confianca || 0),
            avisos: [
                ...avisos,
                `OCR local executado, mas nÃ£o encontrou texto documental confiÃ¡vel na imagem ${arquivoNome || extensao || mimeType || ""}.`,
            ],
        };
    } catch (error) {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            linhasOcr: [],
            assinaturasTabela: [],
            assinaturasDocumento: [],
            marcacoesDdsDias: [],
            confianca: 0,
            avisos: [`OCR local da imagem indisponÃ­vel: ${error?.message || "erro desconhecido"}.`],
        };
    }
}

async function extrairTextoPrimeiraPaginaPdfComOcr(buffer) {
    if (!buffer || !buffer.byteLength) {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            avisos: [],
            linhasOcr: [],
            assinaturasTabela: [],
            assinaturasDocumento: [],
            marcacoesDdsDias: [],
        };
    }

    if (typeof document === "undefined") {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            avisos: ["OCR de imagem não executado fora do navegador."],
            linhasOcr: [],
            assinaturasTabela: [],
            assinaturasDocumento: [],
            marcacoesDdsDias: [],
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
                paginasLidas: 0,
                totalPaginas: 0,
                avisos: ["OCR local não encontrou páginas no PDF."],
                linhasOcr: [],
                assinaturasTabela: [],
                assinaturasDocumento: [],
            marcacoesDdsDias: [],
            };
        }

        const paginasParaOcr = Array.from(new Set([1, totalPaginas].filter((numero) => numero >= 1 && numero <= totalPaginas))).slice(0, 2);
        const textosPaginas = [];
        const linhasOcrGerais = [];
        const assinaturasTabelaGerais = [];
        const assinaturasDocumentoGerais = [];
        const avisos = [];

        async function executarOcrPagina(numeroPagina) {
            const pagina = await pdf.getPage(numeroPagina);
            const viewportBase = pagina.getViewport({ scale: 1 });
            const escalaBase = numeroPagina === 1 ? 1.55 : 1.45;
            const escalaMaximaPorLargura = viewportBase.width ? 1260 / viewportBase.width : escalaBase;
            const escalaMaximaPorAltura = viewportBase.height ? 1780 / viewportBase.height : escalaBase;
            const escalaSegura = Math.max(1.18, Math.min(escalaBase, escalaMaximaPorLargura, escalaMaximaPorAltura));
            const viewport = pagina.getViewport({ scale: escalaSegura });
            const canvas = document.createElement("canvas");
            const contexto = canvas.getContext("2d", { willReadFrequently: true });

            if (!contexto) {
                avisos.push(`OCR local não conseguiu preparar o canvas da página ${numeroPagina}.`);
                return;
            }

            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);

            await pagina.render({ canvasContext: contexto, viewport }).promise;
            await new Promise((resolve) => setTimeout(resolve, 0));

            const resultadoOcr = await reconhecerTextoCanvasComOcrComOrientacao(canvas);
            const canvasAnalise = resultadoOcr?.canvasAnalise || canvas;
            const textoOcr = resultadoOcr?.texto || "";
            const linhasOcr = montarLinhasOcrComAssinatura(canvasAnalise, resultadoOcr?.palavras || [])
                .map((linha) => ({
                    ...linha,
                    pagina: numeroPagina,
                    rotacao: resultadoOcr?.rotacao || 0,
                    texto: linha?.texto ? `Página ${numeroPagina}: ${linha.texto}` : linha?.texto,
                }));
            await new Promise((resolve) => setTimeout(resolve, 0));

            const textoNormalizadoOcr = normalizarTextoVerificacao(textoOcr);
            const pareceListaComAssinatura = /nome do colaborador|nome\s+cargo\s+assinatura|nome\s+assinatura|assinatura|declaro ter participado|lista de presenca|lista de presença|dialogo de seguranca|diálogo de segurança|integra[cç][aã]o|nr\s*[-º]?\s*(?:11|12|17|18|21|25|26)|manuseio de materiais|movimentacao|movimentação/.test(textoNormalizadoOcr);
            const pareceListaSimplesSuperior = Boolean(
                /lista de presenca|lista de presença|dialogo de seguranca|diálogo de segurança/.test(textoNormalizadoOcr) &&
                /nome\s+assinatura|nome[\s\S]{0,80}assinatura/.test(textoNormalizadoOcr) &&
                !/conteudo programatico|conteúdo programático|declaro ter participado|nr\s*[-º]?\s*(?:11|12|17|18|21|25|26)/.test(textoNormalizadoOcr)
            );
            const opcoesAssinaturaTabela = pareceListaSimplesSuperior
                ? { yInicio: 0.22, x0: 0.42, x1: 0.94, maxLinhas: 45 }
                : {};
            const assinaturasTabela = pareceListaComAssinatura
                ? detectarAssinaturasTabelaPresenca(canvasAnalise, opcoesAssinaturaTabela).map((assinatura) => ({ ...assinatura, pagina: numeroPagina, rotacao: resultadoOcr?.rotacao || 0 }))
                : [];
            const assinaturasDocumento = detectarAssinaturasDocumento(canvasAnalise, numeroPagina, textoNormalizadoOcr)
                .map((assinatura) => ({ ...assinatura, rotacao: resultadoOcr?.rotacao || 0 }));

            if (resultadoOcr?.rotacao) {
                avisos.push(`OCR local corrigiu orientação da página ${numeroPagina} em ${resultadoOcr.rotacao}° para ler certificado digitalizado de lado.`);
            }

            if (textoOcr) {
                textosPaginas.push(`Página ${numeroPagina}: ${textoOcr}`);
            }

            linhasOcrGerais.push(...linhasOcr);
            assinaturasTabelaGerais.push(...assinaturasTabela);
            assinaturasDocumentoGerais.push(...assinaturasDocumento);

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

        for (const numeroPagina of paginasParaOcr) {
            await executarOcrPagina(numeroPagina);
        }

        try {
            await pdf.destroy();
        } catch {
            // Liberação de memória sem bloquear o fluxo.
        }

        const textoOcrFinal = limparTextoPossivelDocumento(textosPaginas.join(" "));
        const paginasLidas = paginasParaOcr.length;

        if (paginasParaOcr.length > 1) {
            avisos.push(`OCR local executado na primeira e na última página do PDF escaneado/imagem (${paginasParaOcr.join(", ")}).`);
        } else {
            avisos.push("OCR local executado na primeira página do PDF escaneado/imagem.");
        }

        if (textoPossuiConteudoDocumentoConfiavel(textoOcrFinal)) {
            return {
                texto: textoOcrFinal,
                paginasLidas,
                totalPaginas,
                linhasOcr: linhasOcrGerais,
                assinaturasTabela: assinaturasTabelaGerais,
                assinaturasDocumento: assinaturasDocumentoGerais,
                avisos,
            };
        }

        return {
            texto: "",
            paginasLidas,
            totalPaginas,
            linhasOcr: linhasOcrGerais,
            assinaturasTabela: assinaturasTabelaGerais,
            assinaturasDocumento: assinaturasDocumentoGerais,
            avisos: [
                ...avisos,
                "OCR local executado, mas não encontrou texto documental confiável nas páginas analisadas.",
            ],
        };
    } catch (error) {
        return {
            texto: "",
            paginasLidas: 0,
            totalPaginas: 0,
            avisos: [`OCR local de imagem indisponível: ${error?.message || "erro desconhecido"}.`],
            linhasOcr: [],
            assinaturasTabela: [],
            assinaturasDocumento: [],
            marcacoesDdsDias: [],
        };
    }
}

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

            const resultadoOcr = await reconhecerTextoCanvasComOcrComOrientacao(canvas);
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
    linhasOcr = [],
    assinaturasTabela = [],
    assinaturasDocumento = [],
    confiancaOcr = null,
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
        linhasOcr,
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
    const confiancaCalculada = calcularConfiancaLeitura({
        textoExtraido: textoSeguro,
        datasTexto,
        tipoLeitura,
        textoLimitado,
    });
    const confiancaInformada = Number(confiancaOcr);
    const confianca = Number.isFinite(confiancaInformada) && confiancaInformada > 0
        ? Math.round((confiancaCalculada + Math.min(100, Math.max(0, confiancaInformada))) / 2)
        : confiancaCalculada;
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
        linhasOcr: Array.isArray(linhasOcr) ? linhasOcr.slice(0, 120) : [],
        assinaturasTabela: Array.isArray(assinaturasTabela) ? assinaturasTabela.slice(0, 30) : [],
        assinaturasDocumento: Array.isArray(assinaturasDocumento) ? assinaturasDocumento.slice(0, 20) : [],
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
        const leituraImagem = await extrairTextoImagemComOcr({
            arquivo,
            arquivoNome: nome,
            mimeType: mime,
            extensao,
        });
        const textoExtraido = leituraImagem?.texto || "";
        const avisos = [...(leituraImagem?.avisos || [])];

        if (!textoExtraido) {
            avisos.push("NÃ£o foi encontrado texto confiÃ¡vel na imagem. Conferir manualmente qualidade, enquadramento, foco e iluminaÃ§Ã£o do documento.");
        }

        return montarRetornoLeituraBase({
            executado: true,
            tipoLeitura: textoExtraido ? "ocr_imagem_local" : "imagem_dependente_ocr",
            arquivoNome: nome,
            mimeType: mime,
            extensao,
            textoExtraido,
            linhasOcr: leituraImagem?.linhasOcr || [],
            assinaturasTabela: leituraImagem?.assinaturasTabela || [],
            assinaturasDocumento: leituraImagem?.assinaturasDocumento || [],
            paginasLidas: leituraImagem?.paginasLidas || 0,
            totalPaginas: leituraImagem?.totalPaginas || 0,
            confiancaOcr: leituraImagem?.confianca ?? null,
            avisos,
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
        const leituraOcrImagem = leituraPdfJs.texto ? null : await extrairTextoPrimeiraPaginaPdfComOcr(buffer);
        const textoExtraido = leituraPdfJs.texto || leituraOcrImagem?.texto || extrairTextoLegivelPdf(bytes);
        const textoVeioDoOcrImagem = Boolean(!leituraPdfJs.texto && leituraOcrImagem?.texto);
        const avisos = [...(leituraPdfJs.avisos || []), ...(leituraOcrImagem?.avisos || [])];

        if (textoLimitado) {
            avisos.push("Leitura bruta limitada aos primeiros 8 MB para preservar performance no navegador.");
        }

        if (textoExtraido && leituraPdfJs.texto) {
            avisos.push("Texto extraído pela camada textual do PDF usando PDF.js, sem API paga.");
        }

        if (textoVeioDoOcrImagem) {
            avisos.push("Texto extraído por OCR local de imagem usando tesseract.js, sem API paga.");
        }

        if (!textoExtraido) {
            avisos.push("Não foi encontrada camada de texto confiável. O PDF pode ser uma imagem escaneada, conter apenas imagens ou exigir conferência manual.");
            avisos.push("Datas encontradas somente no nome do arquivo não serão usadas para acusar divergência com o cadastro.");
        }

        return montarRetornoLeituraBase({
            executado: true,
            tipoLeitura: textoExtraido ? (textoVeioDoOcrImagem ? "ocr_imagem_local" : "pdf_texto_local") : "pdf_sem_texto_legivel",
            arquivoNome: nome,
            mimeType: mime,
            extensao,
            textoExtraido,
            textoLimitado,
            linhasOcr: textoVeioDoOcrImagem ? (leituraOcrImagem?.linhasOcr || []) : [],
            assinaturasTabela: textoVeioDoOcrImagem ? (leituraOcrImagem?.assinaturasTabela || []) : [],
            assinaturasDocumento: textoVeioDoOcrImagem ? (leituraOcrImagem?.assinaturasDocumento || []) : [],
            paginasLidas: textoVeioDoOcrImagem ? (leituraOcrImagem?.paginasLidas || 1) : (leituraPdfJs.paginasLidas || 0),
            totalPaginas: leituraPdfJs.totalPaginas || leituraOcrImagem?.totalPaginas || 0,
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
        .replace(/\b(ltda|me|epp|eireli|sa|s\/a|ss|s\/s|construtora|construcoes|construções|pavimentadora|pavimentacao|pavimentação|comercio|comércio|servicos|serviços|empresa|grupo)\b/g, " ")
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
    const nomeDocumentoExtraido = limparTextoPossivelDocumento(campos?.empresa_nome || "");
    const nomeDocumento = valorPareceSomenteDocumentoFiscal(nomeDocumentoExtraido) ? "" : nomeDocumentoExtraido;
    const nomeEmpresa = limparTextoPossivelDocumento(empresa?.nome || empresa?.razao_social || empresa?.razaoSocial || "");

    // CNPJ igual é a validação mais forte. Quando o CNPJ extraído bate com o cadastro,
    // não gerar divergência apenas porque o nome foi lido parcialmente ou como número.
    if (cnpjDocumento && cnpjEmpresa && cnpjDocumento === cnpjEmpresa) {
        return indicios;
    }

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

export { montarRetornoLeituraParaPersistencia } from "./documentosOcrPersistenciaService";
