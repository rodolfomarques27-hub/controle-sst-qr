import {
    DOCUMENTOS_VERIFICACAO_LIMITES,
    DOCUMENTOS_VERIFICACAO_MENSAGENS_PADRAO,
    DOCUMENTOS_VERIFICACAO_NOMES_SUSPEITOS,
    DOCUMENTOS_VERIFICACAO_PESOS,
    DOCUMENTOS_VERIFICACAO_RISCO,
    DOCUMENTOS_VERIFICACAO_STATUS,
    DOCUMENTOS_VERIFICACAO_TERMOS_ALERTA_OBSERVACAO,
    DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO,
    DOCUMENTOS_VERIFICACAO_EXTENSOES_PERMITIDAS,
    DOCUMENTOS_VERIFICACAO_MIME_PERMITIDOS,
} from "../constants/documentosVerificacaoConstants";

export function normalizarTextoVerificacao(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

export function limparTextoVerificacao(valor = "") {
    return String(valor || "").trim();
}

export function obterDataSeguraVerificacao(valor) {
    if (!valor) return null;

    if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
        return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate(), 12, 0, 0);
    }

    const texto = String(valor).trim();

    if (!texto) return null;

    const data = /^\d{4}-\d{2}-\d{2}$/.test(texto)
        ? new Date(`${texto}T12:00:00`)
        : new Date(texto);

    if (Number.isNaN(data.getTime())) return null;

    return new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12, 0, 0);
}

export function formatarDataIsoVerificacao(valor) {
    const data = obterDataSeguraVerificacao(valor);
    if (!data) return null;
    return data.toISOString().slice(0, 10);
}

export function hojeVerificacao() {
    const agora = new Date();
    return new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12, 0, 0);
}

export function diferencaDiasVerificacao(dataInicial, dataFinal) {
    const inicio = obterDataSeguraVerificacao(dataInicial);
    const fim = obterDataSeguraVerificacao(dataFinal);

    if (!inicio || !fim) return null;

    const umDia = 1000 * 60 * 60 * 24;
    return Math.round((fim.getTime() - inicio.getTime()) / umDia);
}

export function obterExtensaoArquivoVerificacao(nomeArquivo = "") {
    const partes = String(nomeArquivo || "").split(".");
    if (partes.length <= 1) return "";
    return normalizarTextoVerificacao(partes.pop());
}

export function obterNomeArquivoVerificacao({ arquivo, arquivoNome, nome_do_arquivo, nomeDoArquivo } = {}) {
    return (
        arquivo?.name ||
        arquivoNome ||
        nome_do_arquivo ||
        nomeDoArquivo ||
        ""
    );
}

export function obterTamanhoArquivoVerificacao({ arquivo, tamanhoBytes, tamanho_bytes } = {}) {
    const valor = arquivo?.size ?? tamanhoBytes ?? tamanho_bytes ?? null;
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
}

export function obterMimeArquivoVerificacao({ arquivo, mimeType, mime_type } = {}) {
    return arquivo?.type || mimeType || mime_type || "";
}

export async function gerarHashArquivoVerificacao(arquivo) {
    if (!arquivo) return "";

    if (typeof crypto === "undefined" || !crypto.subtle) {
        return "";
    }

    const buffer = await arquivo.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

export function criarIndicioVerificacao({
    codigo,
    tipo = DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.CONTEUDO,
    titulo,
    detalhe = "",
    peso = 0,
    bloqueia = false,
    recomendacao = "",
    dados = {},
}) {
    return {
        codigo,
        tipo,
        titulo,
        detalhe,
        peso: Number.isFinite(Number(peso)) ? Number(peso) : 0,
        bloqueia: Boolean(bloqueia),
        recomendacao,
        dados,
    };
}

export function calcularScoreVerificacao(indicios = []) {
    const possuiBloqueio = indicios.some((indicio) => indicio?.bloqueia);

    if (possuiBloqueio) {
        return 100;
    }

    const total = indicios.reduce((soma, indicio) => soma + Number(indicio?.peso || 0), 0);
    return Math.max(0, Math.min(100, Math.round(total)));
}

export function calcularNivelRiscoVerificacao(score = 0, possuiBloqueio = false) {
    if (possuiBloqueio) return DOCUMENTOS_VERIFICACAO_RISCO.CRITICO;

    if (score >= 76) return DOCUMENTOS_VERIFICACAO_RISCO.CRITICO;
    if (score >= 51) return DOCUMENTOS_VERIFICACAO_RISCO.ALTO;
    if (score >= 21) return DOCUMENTOS_VERIFICACAO_RISCO.MEDIO;
    if (score >= 1) return DOCUMENTOS_VERIFICACAO_RISCO.BAIXO;

    return DOCUMENTOS_VERIFICACAO_RISCO.BAIXO;
}

export function calcularStatusVerificacao(score = 0, possuiBloqueio = false) {
    if (possuiBloqueio) return DOCUMENTOS_VERIFICACAO_STATUS.BLOQUEADO;

    if (score >= 76) return DOCUMENTOS_VERIFICACAO_STATUS.SUSPEITO;
    if (score >= 51) return DOCUMENTOS_VERIFICACAO_STATUS.REVISAO_MANUAL;
    if (score >= 21) return DOCUMENTOS_VERIFICACAO_STATUS.ATENCAO;

    return DOCUMENTOS_VERIFICACAO_STATUS.APROVADO;
}

export function montarRecomendacoesVerificacao(indicios = []) {
    const recomendacoes = indicios
        .map((indicio) => limparTextoVerificacao(indicio?.recomendacao))
        .filter(Boolean);

    if (indicios.length > 0) {
        recomendacoes.push(DOCUMENTOS_VERIFICACAO_MENSAGENS_PADRAO.REVISAO_MANUAL);
    }

    recomendacoes.push(DOCUMENTOS_VERIFICACAO_MENSAGENS_PADRAO.ANALISE_LOCAL);
    recomendacoes.push(DOCUMENTOS_VERIFICACAO_MENSAGENS_PADRAO.NAO_AFIRMA_FALSIFICACAO);

    return Array.from(new Set(recomendacoes));
}

export function montarResumoVerificacao({ indicios = [], status, score, nivelRisco } = {}) {
    const scoreNormalizado = Math.max(0, Math.min(100, Number(score || 0)));
    const conformidade = Math.max(0, Math.min(100, 100 - scoreNormalizado));

    if (!indicios.length) {
        return `${DOCUMENTOS_VERIFICACAO_MENSAGENS_PADRAO.SEM_INDICIOS} Status: ${status}. Risco técnico: ${scoreNormalizado}/100. Conformidade: ${conformidade}/100. Risco: ${nivelRisco}.`;
    }

    const principais = indicios
        .slice()
        .sort((a, b) => Number(b.peso || 0) - Number(a.peso || 0))
        .slice(0, 3)
        .map((indicio) => indicio.titulo)
        .filter(Boolean)
        .join("; ");

    return `Indícios identificados: ${principais}. Status: ${status}. Risco técnico: ${scoreNormalizado}/100. Conformidade: ${conformidade}/100. Risco: ${nivelRisco}.`;
}

export function montarResultadoVerificacaoBase({ indicios = [], erro = "" } = {}) {
    if (erro) {
        return {
            status_verificacao: DOCUMENTOS_VERIFICACAO_STATUS.ERRO,
            nivel_risco: DOCUMENTOS_VERIFICACAO_RISCO.NAO_AVALIADO,
            score_risco: 0,
            indicios: [],
            recomendacoes: [
                "Falha ao executar a verificação documental.",
                erro,
            ],
            resumo: `Erro na verificação documental: ${erro}`,
        };
    }

    const possuiBloqueio = indicios.some((indicio) => indicio?.bloqueia);
    const score = calcularScoreVerificacao(indicios);
    const status = calcularStatusVerificacao(score, possuiBloqueio);
    const nivelRisco = calcularNivelRiscoVerificacao(score, possuiBloqueio);
    const recomendacoes = montarRecomendacoesVerificacao(indicios);
    const resumo = montarResumoVerificacao({
        indicios,
        status,
        score,
        nivelRisco,
    });

    return {
        status_verificacao: status,
        nivel_risco: nivelRisco,
        score_risco: score,
        indicios,
        recomendacoes,
        resumo,
    };
}

export function avaliarArquivoBasicoVerificacao({
    arquivo = null,
    arquivoNome = "",
    mimeType = "",
    tamanhoBytes = null,
    arquivoUrl = "",
} = {}) {
    const indicios = [];

    const nome = obterNomeArquivoVerificacao({
        arquivo,
        arquivoNome,
    });

    const tamanho = obterTamanhoArquivoVerificacao({
        arquivo,
        tamanhoBytes,
    });

    const mime = obterMimeArquivoVerificacao({
        arquivo,
        mimeType,
    });

    const extensao = obterExtensaoArquivoVerificacao(nome);
    const nomeNormalizado = normalizarTextoVerificacao(nome);
    const possuiArquivo = Boolean(arquivo || arquivoUrl || nome);

    if (!possuiArquivo) {
        indicios.push(criarIndicioVerificacao({
            codigo: "arquivo_ausente",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.ARQUIVO,
            titulo: "Arquivo ausente",
            detalhe: "O registro não possui arquivo anexado ou caminho de arquivo informado.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.ARQUIVO_AUSENTE,
            bloqueia: true,
            recomendacao: "Anexar o documento original antes de considerar a validação.",
        }));

        return indicios;
    }

    if (mime && !DOCUMENTOS_VERIFICACAO_MIME_PERMITIDOS.includes(mime)) {
        indicios.push(criarIndicioVerificacao({
            codigo: "mime_type_nao_recomendado",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.ARQUIVO,
            titulo: "Tipo de arquivo não recomendado",
            detalhe: `MIME type identificado: ${mime}.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.TIPO_ARQUIVO_INVALIDO,
            bloqueia: true,
            recomendacao: "Solicitar novo envio em PDF, JPG, JPEG, PNG ou WEBP.",
            dados: { mime },
        }));
    }

    if (extensao && !DOCUMENTOS_VERIFICACAO_EXTENSOES_PERMITIDAS.includes(extensao)) {
        indicios.push(criarIndicioVerificacao({
            codigo: "extensao_nao_recomendada",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.ARQUIVO,
            titulo: "Extensão de arquivo não recomendada",
            detalhe: `Extensão identificada: ${extensao}.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.EXTENSAO_INVALIDA,
            bloqueia: true,
            recomendacao: "Solicitar novo envio em formato permitido.",
            dados: { extensao },
        }));
    }

    if (tamanho !== null && tamanho < DOCUMENTOS_VERIFICACAO_LIMITES.TAMANHO_MINIMO_BYTES) {
        indicios.push(criarIndicioVerificacao({
            codigo: "arquivo_muito_pequeno",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.ARQUIVO,
            titulo: "Arquivo muito pequeno",
            detalhe: `Tamanho identificado: ${tamanho} bytes.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.ARQUIVO_MUITO_PEQUENO,
            recomendacao: "Verificar se o arquivo está incompleto, ilegível, cortado ou corrompido.",
            dados: { tamanho },
        }));
    } else if (tamanho !== null && tamanho < DOCUMENTOS_VERIFICACAO_LIMITES.TAMANHO_ALERTA_BYTES) {
        indicios.push(criarIndicioVerificacao({
            codigo: "arquivo_pequeno_alerta",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.ARQUIVO,
            titulo: "Arquivo com tamanho abaixo do esperado",
            detalhe: `Tamanho identificado: ${tamanho} bytes.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.ARQUIVO_PEQUENO_ALERTA,
            recomendacao: "Conferir manualmente a legibilidade do documento.",
            dados: { tamanho },
        }));
    }

    if (tamanho !== null && tamanho > DOCUMENTOS_VERIFICACAO_LIMITES.TAMANHO_MAXIMO_RECOMENDADO_BYTES) {
        indicios.push(criarIndicioVerificacao({
            codigo: "arquivo_muito_grande",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.ARQUIVO,
            titulo: "Arquivo muito grande",
            detalhe: `Tamanho identificado: ${tamanho} bytes.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.ARQUIVO_MUITO_GRANDE,
            recomendacao: "Verificar se o arquivo contém páginas desnecessárias ou imagens pesadas.",
            dados: { tamanho },
        }));
    }

    const termoSuspeito = DOCUMENTOS_VERIFICACAO_NOMES_SUSPEITOS.find((termo) =>
        nomeNormalizado.includes(normalizarTextoVerificacao(termo))
    );

    if (termoSuspeito) {
        indicios.push(criarIndicioVerificacao({
            codigo: "nome_arquivo_suspeito",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.ARQUIVO,
            titulo: "Nome de arquivo com termo de atenção",
            detalhe: `Termo identificado no nome do arquivo: ${termoSuspeito}.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.NOME_SUSPEITO,
            recomendacao: "Conferir manualmente se o arquivo enviado é a versão oficial.",
            dados: { nome, termoSuspeito },
        }));
    }

    return indicios;
}

export function avaliarDatasDocumentoEmpresaVerificacao({
    dataEmissao,
    dataVencimento,
} = {}) {
    const indicios = [];
    const hoje = hojeVerificacao();

    const emissao = obterDataSeguraVerificacao(dataEmissao);
    const vencimento = obterDataSeguraVerificacao(dataVencimento);

    if (!emissao) {
        indicios.push(criarIndicioVerificacao({
            codigo: "sem_data_emissao",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Documento sem data de emissão",
            detalhe: "A data de emissão não foi informada.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.SEM_DATA_EMISSAO,
            recomendacao: "Informar ou conferir a data de emissão do documento.",
        }));
    }

    if (!vencimento) {
        indicios.push(criarIndicioVerificacao({
            codigo: "sem_data_vencimento",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Documento sem data de vencimento/revisão",
            detalhe: "A data de vencimento ou revisão não foi informada.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.SEM_DATA_VENCIMENTO,
            recomendacao: "Informar a validade ou revisão do documento, quando aplicável.",
        }));
    }

    if (emissao && emissao > hoje) {
        indicios.push(criarIndicioVerificacao({
            codigo: "data_emissao_futura",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Data de emissão futura",
            detalhe: "A data de emissão está posterior à data atual.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DATA_EMISSAO_FUTURA,
            recomendacao: "Conferir se houve erro de digitação ou inconsistência no documento.",
            dados: { dataEmissao: formatarDataIsoVerificacao(emissao) },
        }));
    }

    if (vencimento && vencimento < hoje) {
        indicios.push(criarIndicioVerificacao({
            codigo: "documento_vencido",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Documento vencido",
            detalhe: "A data de vencimento/revisão está anterior à data atual.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DOCUMENTO_VENCIDO,
            bloqueia: true,
            recomendacao: "Solicitar documento atualizado antes da liberação.",
            dados: { dataVencimento: formatarDataIsoVerificacao(vencimento) },
        }));
    }

    if (emissao && vencimento && vencimento < emissao) {
        indicios.push(criarIndicioVerificacao({
            codigo: "vencimento_antes_emissao",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Validade anterior à emissão",
            detalhe: "A data de vencimento/revisão está anterior à data de emissão.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DATA_VENCIMENTO_ANTES_EMISSAO,
            bloqueia: true,
            recomendacao: "Corrigir as datas ou solicitar novo documento.",
            dados: {
                dataEmissao: formatarDataIsoVerificacao(emissao),
                dataVencimento: formatarDataIsoVerificacao(vencimento),
            },
        }));
    }

    if (vencimento && vencimento >= hoje) {
        const dias = diferencaDiasVerificacao(hoje, vencimento);

        if (dias !== null && dias <= DOCUMENTOS_VERIFICACAO_LIMITES.DIAS_ALERTA_VENCIMENTO) {
            indicios.push(criarIndicioVerificacao({
                codigo: "documento_a_vencer",
                tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
                titulo: "Documento próximo do vencimento",
                detalhe: `Documento vence em ${dias} dia(s).`,
                peso: DOCUMENTOS_VERIFICACAO_PESOS.DOCUMENTO_A_VENCER,
                recomendacao: "Programar atualização do documento.",
                dados: { diasParaVencer: dias },
            }));
        }
    }

    return indicios;
}

export function avaliarDatasCertificadoVerificacao({
    dataRealizacao,
    dataVencimento,
    exigeVencimento = true,
} = {}) {
    const indicios = [];
    const hoje = hojeVerificacao();

    const realizacao = obterDataSeguraVerificacao(dataRealizacao);
    const vencimento = obterDataSeguraVerificacao(dataVencimento);

    if (!realizacao) {
        indicios.push(criarIndicioVerificacao({
            codigo: "sem_data_realizacao",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Certificado sem data de realização/emissão",
            detalhe: "A data de realização ou emissão do certificado não foi informada.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.SEM_DATA_REALIZACAO,
            recomendacao: "Informar ou conferir a data de realização/emissão.",
        }));
    }

    if (exigeVencimento && !vencimento) {
        indicios.push(criarIndicioVerificacao({
            codigo: "sem_data_vencimento_certificado",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Certificado sem data de vencimento",
            detalhe: "A data de vencimento do certificado não foi informada.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.SEM_DATA_VENCIMENTO,
            recomendacao: "Informar a validade do certificado, quando aplicável.",
        }));
    }

    if (realizacao && realizacao > hoje) {
        indicios.push(criarIndicioVerificacao({
            codigo: "data_realizacao_futura",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Data de realização futura",
            detalhe: "A data de realização/emissão está posterior à data atual.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DATA_REALIZACAO_FUTURA,
            recomendacao: "Conferir se houve erro de digitação ou inconsistência no certificado.",
            dados: { dataRealizacao: formatarDataIsoVerificacao(realizacao) },
        }));
    }

    if (vencimento && vencimento < hoje) {
        indicios.push(criarIndicioVerificacao({
            codigo: "certificado_vencido",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Certificado vencido",
            detalhe: "A data de vencimento está anterior à data atual.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DOCUMENTO_VENCIDO,
            bloqueia: true,
            recomendacao: "Solicitar certificado atualizado antes da liberação.",
            dados: { dataVencimento: formatarDataIsoVerificacao(vencimento) },
        }));
    }

    if (realizacao && vencimento && vencimento < realizacao) {
        indicios.push(criarIndicioVerificacao({
            codigo: "vencimento_antes_realizacao",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
            titulo: "Vencimento anterior à realização",
            detalhe: "A data de vencimento está anterior à data de realização/emissão.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.DATA_VENCIMENTO_ANTES_REALIZACAO,
            bloqueia: true,
            recomendacao: "Corrigir as datas ou solicitar novo certificado.",
            dados: {
                dataRealizacao: formatarDataIsoVerificacao(realizacao),
                dataVencimento: formatarDataIsoVerificacao(vencimento),
            },
        }));
    }

    if (vencimento && vencimento >= hoje) {
        const dias = diferencaDiasVerificacao(hoje, vencimento);

        if (dias !== null && dias <= DOCUMENTOS_VERIFICACAO_LIMITES.DIAS_ALERTA_VENCIMENTO) {
            indicios.push(criarIndicioVerificacao({
                codigo: "certificado_a_vencer",
                tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DATA,
                titulo: "Certificado próximo do vencimento",
                detalhe: `Certificado vence em ${dias} dia(s).`,
                peso: DOCUMENTOS_VERIFICACAO_PESOS.DOCUMENTO_A_VENCER,
                recomendacao: "Programar reciclagem ou atualização do treinamento.",
                dados: { diasParaVencer: dias },
            }));
        }
    }

    return indicios;
}

export function avaliarObservacaoVerificacao(observacao = "") {
    const texto = normalizarTextoVerificacao(observacao);
    const indicios = [];

    if (!texto) return indicios;

    const termoEncontrado = DOCUMENTOS_VERIFICACAO_TERMOS_ALERTA_OBSERVACAO.find((termo) =>
        texto.includes(normalizarTextoVerificacao(termo))
    );

    if (termoEncontrado) {
        indicios.push(criarIndicioVerificacao({
            codigo: "observacao_com_termo_alerta",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.OBSERVACAO,
            titulo: "Observação contém termo de alerta",
            detalhe: `Termo identificado na observação: ${termoEncontrado}.`,
            peso: DOCUMENTOS_VERIFICACAO_PESOS.OBSERVACAO_COM_ALERTA,
            recomendacao: "Ler a observação e confirmar manualmente a situação do documento.",
            dados: { termoEncontrado },
        }));
    }

    return indicios;
}

export function avaliarDuplicidadeVerificacao({
    hashArquivo = "",
    arquivoNome = "",
    tamanhoBytes = null,
    registrosExistentes = [],
    documentoIdAtual = null,
} = {}) {
    const indicios = [];
    const nomeNormalizado = normalizarTextoVerificacao(arquivoNome);
    const tamanhoNormalizado = tamanhoBytes === null ? null : Number(tamanhoBytes);

    const duplicadoPorHash = hashArquivo
        ? registrosExistentes.find((registro) =>
            String(registro?.id || "") !== String(documentoIdAtual || "") &&
            registro?.hash_arquivo &&
            String(registro.hash_arquivo) === String(hashArquivo)
        )
        : null;

    if (duplicadoPorHash) {
        indicios.push(criarIndicioVerificacao({
            codigo: "hash_duplicado",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DUPLICIDADE,
            titulo: "Arquivo idêntico já analisado",
            detalhe: "O hash SHA-256 do arquivo coincide com outro registro de verificação documental.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.HASH_DUPLICADO,
            recomendacao: "Conferir se houve reenvio do mesmo arquivo ou uso indevido em outro documento.",
            dados: {
                documentoDuplicadoId: duplicadoPorHash.id || null,
                hashArquivo,
            },
        }));
    }

    const duplicadoPorNomeTamanho = nomeNormalizado && tamanhoNormalizado !== null
        ? registrosExistentes.find((registro) => {
            const mesmoId = String(registro?.id || "") === String(documentoIdAtual || "");
            const nomeRegistro = normalizarTextoVerificacao(registro?.arquivo_nome || registro?.nome_do_arquivo || "");
            const tamanhoRegistro = Number(registro?.tamanho_bytes ?? registro?.tamanhoBytes ?? NaN);

            return !mesmoId &&
                nomeRegistro &&
                nomeRegistro === nomeNormalizado &&
                Number.isFinite(tamanhoRegistro) &&
                tamanhoRegistro === tamanhoNormalizado;
        })
        : null;

    if (duplicadoPorNomeTamanho) {
        indicios.push(criarIndicioVerificacao({
            codigo: "nome_tamanho_duplicado",
            tipo: DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO.DUPLICIDADE,
            titulo: "Arquivo com mesmo nome e tamanho já identificado",
            detalhe: "Existe outro registro com o mesmo nome de arquivo e tamanho.",
            peso: DOCUMENTOS_VERIFICACAO_PESOS.NOME_TAMANHO_DUPLICADO,
            recomendacao: "Verificar se o arquivo foi reenviado ou se pertence a outro colaborador/empresa.",
            dados: {
                documentoDuplicadoId: duplicadoPorNomeTamanho.id || null,
                arquivoNome,
                tamanhoBytes: tamanhoNormalizado,
            },
        }));
    }

    return indicios;
}

export function filtrarPayloadSupabaseVerificacao(payload = {}) {
    return Object.fromEntries(
        Object.entries(payload).filter(([, valor]) => valor !== undefined)
    );
}

export function valorUuidOuNullVerificacao(valor) {
    const texto = String(valor || "").trim();

    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(texto)) {
        return texto;
    }

    return null;
}
