// Extração, classificação e resumo de dados documentais obtidos pelo OCR.
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
    formatarDataBr,
    limparTextoPossivelDocumento,
    valorPareceSomenteDocumentoFiscal,
} from "./documentosOcrUtils";
import { extrairFuncaoAsoDocumento } from "./asoFuncaoService";

export function criarAnaliseDocumental() {
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

    function extrairDatasTextoDocumental(texto = "", origem = "texto") {
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
        const textoInicialNormalizado = normalizarTextoVerificacao(
            String(texto || "").slice(0, 1500)
        );
        const arquivoNomeNormalizado = normalizarTextoVerificacao(
            arquivoNome
        );

        /*
         * O ASO normalmente cita o PCMSO no corpo do documento.
         * O titulo explicito do documento e o nome do arquivo possuem
         * prioridade sobre essas referencias secundarias.
         */
        const possuiTituloAsoExplicito =
            textoInicialNormalizado.includes(
                "atestado de saude ocupacional"
            );

        const arquivoNomeIndicaAso =
            /\baso\b/.test(
                arquivoNomeNormalizado
            );

        if (
            possuiTituloAsoExplicito ||
            arquivoNomeIndicaAso
        ) {
            return "ASO - Atestado de Sa\u00fade Ocupacional";
        }

        if (base.includes("programa de controle medico de saude ocupacional") || base.includes("pcmso")) {
            return "PCMSO - Programa de Controle Médico de Saúde Ocupacional";
        }

        if (base.includes("programa de gerenciamento de riscos") || /\bpgr\b/.test(base)) {
            return "PGR - Programa de Gerenciamento de Riscos";
        }

        if (base.includes("laudo tecnico das condicoes ambientais") || base.includes("ltcat")) {
            return "LTCAT - Laudo Técnico das Condições Ambientais do Trabalho";
        }

        if (/\baso\b/.test(base)) {
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
        const funcaoDocumentoAso = extrairFuncaoAsoDocumento({
            tipoDocumento,
            texto,
            linhasOcr,
        });
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
            funcao_documento: funcaoDocumentoAso.funcaoOriginal || "",
            funcao_documento_normalizada: funcaoDocumentoAso.funcaoNormalizada || "",
            funcao_documento_confianca: funcaoDocumentoAso.confianca || "",
            funcao_documento_origem: funcaoDocumentoAso.origem || "",
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

    return {
        LIMITE_BYTES_LEITURA_LOCAL,
        LIMITE_TEXTO_PDFJS,
        LIMITE_MAIOR_LADO_OCR_IMAGEM,
        PAGINAS_MAXIMAS_PDFJS,
        PAGINAS_FINAIS_BUSCA_PDFJS,
        PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS,
        CONFIANCA_MINIMA_COMPARACAO_DATAS,
        COMPARACAO_AUTOMATICA_DATAS_OCR_ATIVA,
        arquivoPossuiArrayBuffer,
        obterNomeArquivo,
        obterMimeArquivo,
        obterExtensaoArquivo,
        decodificarBytes,
        textoParecePdfBrutoOuImagemEmbutida,
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
    };
}
