import {
    definirFuncoesTreinamentosRemotas,
    normalizarCertificado,
    normalizarColaborador,
    obterTreinamento,
    statusDocumento,
    treinamentoSemValidade,
} from "./colaboradorDocumentosService.js";
import { listarEvidenciasCertificadosEmLoteService } from "./certificadosEvidenciasService.js";
import { carregarFuncoesTreinamentosRemotas } from "./funcoesTreinamentosService.js";
import { verificarCertificadoTreinamento } from "./documentosVerificacaoService.js";
import {
    montarRevisaoTreinamentosReadOnly,
    TREINAMENTOS_REVISAO_DIVERGENCIAS,
    TREINAMENTOS_REVISAO_MOTOR_VERSAO,
    TREINAMENTOS_REVISAO_STATUS,
} from "./treinamentosRevisaoMotorService.js";

export const TREINAMENTOS_REVISAO_SERVICE_VERSAO =
    "treinamentos-revisao-service-i3-p2-f2";
export const TREINAMENTOS_REVISAO_SCHEMA_VERSAO = 1;

const RPC_SHA = "consultar_vinculos_sha256_revisao_treinamentos";
const RPC_CONCLUIR = "concluir_revisao_treinamentos";

const BUCKET_CERTIFICADOS = "certificados-treinamentos";
const LIMITE_CONCORRENCIA_REPROCESSAMENTO = 2;
const TIMEOUT_DOWNLOAD_REPROCESSAMENTO_MS = 45_000;
const CONCLUSOES_EM_ANDAMENTO = new Set();
const RECONCILIACAO_MAX_TENTATIVAS = 6;
const RECONCILIACAO_INTERVALO_MS = 400;

const STATUS_VERIFICACAO_PRIORIDADE = Object.freeze({
    pendente: 0,
    aprovado: 1,
    atencao: 2,
    revisao_manual: 3,
    suspeito: 4,
    bloqueado: 5,
    erro: 6,
});

const RESULTADO_BANCO = Object.freeze({
    [TREINAMENTOS_REVISAO_STATUS.CONFORME]: "conforme",
    [TREINAMENTOS_REVISAO_STATUS.ATENCAO]: "atencao",
    [TREINAMENTOS_REVISAO_STATUS.VENCIDO]: "vencido",
    [TREINAMENTOS_REVISAO_STATUS.DIVERGENTE]: "divergente",
    [TREINAMENTOS_REVISAO_STATUS.SEM_EVIDENCIA_SUFICIENTE]: "sem_evidencia_suficiente",
    [TREINAMENTOS_REVISAO_STATUS.REVISAO_MANUAL_NECESSARIA]: "revisao_manual_necessaria",
});

const INTEGRIDADE = Object.freeze({
    CONFORME: "conforme",
    IDENTIDADE_DIVERGENTE: "identidade_divergente",
    POSSIVEL_OUTRO_COLABORADOR: "possivel_outro_colaborador",
    DOCUMENTO_INCOMPATIVEL: "documento_incompativel",
    TREINAMENTO_DIVERGENTE: "treinamento_divergente",
    VINCULO_EVIDENCIA_SUSPEITO: "vinculo_evidencia_suspeito",
    REVISAO_MANUAL_NECESSARIA: "revisao_manual_necessaria",
    SEM_EVIDENCIA_SUFICIENTE: "sem_evidencia_suficiente",
});

function texto(valor = "") {
    return String(valor ?? "").trim();
}

function textoOuNull(valor = "") {
    return texto(valor) || null;
}

function inteiroPositivo(valor) {
    const numero = Number(valor);
    return Number.isInteger(numero) && numero > 0 ? numero : null;
}

function numeroConfianca01(valor) {
    if (valor === null || valor === undefined || valor === "") return null;
    const numero = Number(valor);
    if (!Number.isFinite(numero) || numero < 0) return null;
    if (numero <= 1) return Number(numero.toFixed(4));
    if (numero <= 100) return Number((numero / 100).toFixed(4));
    return null;
}

function validarUuid(valor, rotulo = "UUID") {
    const uuid = texto(valor).toLowerCase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)) {
        throw new Error(`${rotulo} inválido.`);
    }
    return uuid;
}

function uuidOuNull(valor) {
    const uuid = texto(valor).toLowerCase();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(uuid)
        ? uuid
        : null;
}

function dataIsoOuNull(valor) {
    const iso = texto(valor).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const data = new Date(`${iso}T00:00:00.000Z`);
    if (Number.isNaN(data.getTime()) || data.toISOString().slice(0, 10) !== iso) return null;
    return iso;
}

function hojeIsoLocal() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function dataReferencia(valor = null) {
    const hoje = hojeIsoLocal();
    const informada = dataIsoOuNull(valor);

    if (informada && informada !== hoje) {
        throw new Error(
            "A revisão de treinamentos aceita somente a situação atual. " +
            "Data de referência histórica ou futura não é suportada pelo motor canônico."
        );
    }

    if (informada) return informada;

    if (valor !== null && valor !== undefined && texto(valor)) {
        throw new Error("Data de referência da revisão inválida.");
    }

    return hoje;
}

function shaOuNull(valor) {
    const sha = texto(valor).toLowerCase();
    return /^[0-9a-f]{64}$/.test(sha) ? sha : null;
}

function validarSupabase(supabase, { exigeRpc = false } = {}) {
    if (!supabase || typeof supabase.from !== "function") {
        throw new Error("Cliente Supabase não informado para revisão de treinamentos.");
    }
    if (exigeRpc && typeof supabase.rpc !== "function") {
        throw new Error("Cliente Supabase sem suporte a RPC para revisão de treinamentos.");
    }
}

function jsonSeguro(valor, fallback) {
    try {
        const serializado = JSON.stringify(valor);
        return serializado === undefined ? fallback : JSON.parse(serializado);
    } catch {
        return fallback;
    }
}

function canonizarFingerprint(valor) {
    if (Array.isArray(valor)) {
        return valor
            .map(canonizarFingerprint)
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    }

    if (valor && typeof valor === "object") {
        return Object.fromEntries(
            Object.keys(valor)
                .sort()
                .map((chave) => [chave, canonizarFingerprint(valor[chave])])
        );
    }

    return valor;
}

async function gerarFingerprintObjeto(valor) {
    const subtle = globalThis?.crypto?.subtle;
    if (!subtle) {
        throw new Error("Web Crypto indisponível para gerar fingerprint da revisão de treinamentos.");
    }

    const material = JSON.stringify(canonizarFingerprint(jsonSeguro(valor, null)));
    const bytes = new TextEncoder().encode(material);
    const digest = await subtle.digest("SHA-256", bytes);

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

function fingerprintValido(valor) {
    return /^[0-9a-f]{64}$/.test(texto(valor).toLowerCase());
}

function ordenarPorChave(itens = [], obterChave = (item) => JSON.stringify(item)) {
    return [...(Array.isArray(itens) ? itens : [])]
        .map((item) => jsonSeguro(item, null))
        .filter((item) => item !== null)
        .sort((a, b) => texto(obterChave(a)).localeCompare(texto(obterChave(b))));
}

function indicePorId(itens = []) {
    return new Map(
        (Array.isArray(itens) ? itens : [])
            .filter((item) => texto(item?.id))
            .map((item) => [texto(item.id), item])
    );
}

function indiceUltimaVerificacao(verificacoes = []) {
    const mapa = new Map();
    const ordenadas = [...(Array.isArray(verificacoes) ? verificacoes : [])]
        .filter(Boolean)
        .sort((a, b) =>
            texto(b?.created_at || b?.createdAt || b?.updated_at || b?.updatedAt)
                .localeCompare(texto(a?.created_at || a?.createdAt || a?.updated_at || a?.updatedAt))
        );

    for (const item of ordenadas) {
        const documentoId = texto(item?.documento_id || item?.documentoId);
        if (documentoId && !mapa.has(documentoId)) mapa.set(documentoId, item);
    }
    return mapa;
}

function snapshotColaborador(colaborador = {}, bruto = {}) {
    return {
        id: colaborador?.id || bruto?.id || null,
        nome: texto(colaborador?.nome || bruto?.nome),
        cpf: texto(colaborador?.cpf || bruto?.cpf),
        matricula: texto(bruto?.matricula || colaborador?.matricula),
        matriculaEsocial: texto(colaborador?.matriculaEsocial || bruto?.matricula_esocial),
        codigoFuncionario: texto(colaborador?.codigoFuncionario || bruto?.codigo_funcionario),
        funcao: texto(colaborador?.funcao || bruto?.funcao),
        empresaId: colaborador?.empresaId || bruto?.empresa_id || null,
        status: texto(colaborador?.status || bruto?.status),
        statusMobilizacao: texto(colaborador?.statusMobilizacao || bruto?.status_mobilizacao),
    };
}

function snapshotEmpresa(empresa = null) {
    if (!empresa) return null;
    return {
        id: empresa?.id || null,
        nome: texto(empresa?.nome),
        cnpj: texto(empresa?.cnpj),
        numeroContrato: texto(empresa?.numero_contrato || empresa?.numeroContrato),
        tipoEmpresa: texto(empresa?.tipo_empresa || empresa?.tipoEmpresa),
        empresaPaiId: empresa?.empresa_pai_id || empresa?.empresaPaiId || null,
        status: texto(empresa?.status),
    };
}

function divergenciasComSha(divergencias = [], vinculosSha = null) {
    const conjunto = new Set(Array.isArray(divergencias) ? divergencias.filter(Boolean) : []);
    if (!vinculosSha) return [...conjunto];

    const mesmos = Number(vinculosSha?.mesmo_colaborador_total || 0);
    const outros = Number(vinculosSha?.outros_colaboradores_acessiveis_total || 0);
    const foraEscopo = vinculosSha?.possui_vinculo_fora_escopo === true;

    if (mesmos > 1) conjunto.add(TREINAMENTOS_REVISAO_DIVERGENCIAS.DUPLICIDADE_SHA);
    if (outros > 0) {
        conjunto.add(TREINAMENTOS_REVISAO_DIVERGENCIAS.POSSIVEL_OUTRO_COLABORADOR);
        conjunto.add(TREINAMENTOS_REVISAO_DIVERGENCIAS.VINCULO_EVIDENCIA_SUSPEITO);
    }
    if (foraEscopo) conjunto.add(TREINAMENTOS_REVISAO_DIVERGENCIAS.VINCULO_EVIDENCIA_SUSPEITO);
    return [...conjunto];
}

function statusComSha(statusOriginal, divergencias = []) {
    if (
        statusOriginal === TREINAMENTOS_REVISAO_STATUS.REVISAO_MANUAL_NECESSARIA ||
        statusOriginal === TREINAMENTOS_REVISAO_STATUS.SEM_EVIDENCIA_SUFICIENTE
    ) {
        return statusOriginal;
    }

    const shaSuspeito = divergencias.some((item) => [
        TREINAMENTOS_REVISAO_DIVERGENCIAS.DUPLICIDADE_SHA,
        TREINAMENTOS_REVISAO_DIVERGENCIAS.POSSIVEL_OUTRO_COLABORADOR,
        TREINAMENTOS_REVISAO_DIVERGENCIAS.VINCULO_EVIDENCIA_SUSPEITO,
    ].includes(item));

    return shaSuspeito ? TREINAMENTOS_REVISAO_STATUS.DIVERGENTE : statusOriginal;
}

function statusIntegridade(divergencias = [], statusRevisao = "") {
    const conjunto = new Set(Array.isArray(divergencias) ? divergencias : []);
    if (conjunto.has(TREINAMENTOS_REVISAO_DIVERGENCIAS.IDENTIDADE_DIVERGENTE)) return INTEGRIDADE.IDENTIDADE_DIVERGENTE;
    if (conjunto.has(TREINAMENTOS_REVISAO_DIVERGENCIAS.POSSIVEL_OUTRO_COLABORADOR)) return INTEGRIDADE.POSSIVEL_OUTRO_COLABORADOR;
    if (conjunto.has(TREINAMENTOS_REVISAO_DIVERGENCIAS.DOCUMENTO_INCOMPATIVEL)) return INTEGRIDADE.DOCUMENTO_INCOMPATIVEL;
    if (conjunto.has(TREINAMENTOS_REVISAO_DIVERGENCIAS.TREINAMENTO_DIVERGENTE)) return INTEGRIDADE.TREINAMENTO_DIVERGENTE;
    if (
        conjunto.has(TREINAMENTOS_REVISAO_DIVERGENCIAS.VINCULO_EVIDENCIA_SUSPEITO) ||
        conjunto.has(TREINAMENTOS_REVISAO_DIVERGENCIAS.DUPLICIDADE_SHA) ||
        conjunto.has(TREINAMENTOS_REVISAO_DIVERGENCIAS.DUPLICIDADE_LOGICA)
    ) {
        return INTEGRIDADE.VINCULO_EVIDENCIA_SUSPEITO;
    }
    if (statusRevisao === TREINAMENTOS_REVISAO_STATUS.SEM_EVIDENCIA_SUFICIENTE) return INTEGRIDADE.SEM_EVIDENCIA_SUFICIENTE;
    if (statusRevisao === TREINAMENTOS_REVISAO_STATUS.REVISAO_MANUAL_NECESSARIA) return INTEGRIDADE.REVISAO_MANUAL_NECESSARIA;
    return INTEGRIDADE.CONFORME;
}

function statusTemporalBanco(chave = "") {
    const valor = texto(chave).toLowerCase();
    if (valor === "vencido") return "vencido";
    if (valor === "vencendo") return "atencao";
    if (valor === "emdia") return "conforme";
    if (valor === "semvalidade") return "nao_aplicavel";
    return "sem_data_suficiente";
}

function resultadoBanco(status) {
    const valor = RESULTADO_BANCO[status];
    if (!valor) throw new Error(`Status de revisão não suportado para persistência: ${texto(status) || "vazio"}.`);
    return valor;
}

function conferenciaDocumentalVerificacao(verificacao = null) {
    if (!verificacao) return {};
    const retorno = verificacao?.retorno_ia || verificacao?.retornoIa || {};
    const conferencia = retorno?.conferencia_documental || retorno?.conferenciaDocumental || {};
    return conferencia && typeof conferencia === "object" ? conferencia : {};
}

function leituraDocumentalVerificacao(verificacao = null) {
    if (!verificacao) return {};
    const retorno = verificacao?.retorno_ia || verificacao?.retornoIa || {};
    const leitura = retorno?.leitura_documental_local || retorno?.leituraDocumentalLocal || {};
    return leitura && typeof leitura === "object" ? leitura : {};
}

function snapshotConferenciaDocumental(verificacao = null) {
    const conferencia = conferenciaDocumentalVerificacao(verificacao);
    if (!Object.keys(conferencia).length) return null;

    const colaborador = conferencia?.colaborador || {};
    const cpf = conferencia?.cpf || {};
    const treinamento = conferencia?.treinamento || {};
    const empresa = conferencia?.empresa || {};
    const listaPresenca = conferencia?.listaPresenca || conferencia?.lista_presenca || {};

    return jsonSeguro({
        tipoLeitura: conferencia?.tipoLeitura || conferencia?.tipo_leitura || null,
        perfilDocumental: conferencia?.perfilDocumental || conferencia?.perfil_documental || null,
        documentoCorretoPorConferencia: conferencia?.documentoCorretoPorConferencia ?? null,
        colaborador: {
            encontrado: colaborador?.encontrado === true,
            nomeCadastro: textoOuNull(colaborador?.nomeCadastro),
            nomeExtraidoColetivo: textoOuNull(colaborador?.nomeExtraidoColetivo),
            confiancaIdentificacao: textoOuNull(colaborador?.confiancaIdentificacao),
            scoreIdentificacao: Number.isFinite(Number(colaborador?.scoreIdentificacao))
                ? Number(colaborador.scoreIdentificacao)
                : null,
            origemIdentificacao: textoOuNull(colaborador?.origemIdentificacao),
            observacaoIdentificacao: textoOuNull(colaborador?.observacaoIdentificacao),
            encontradoPorArquivo: colaborador?.encontradoPorArquivo === true,
            encontradoTextoGeral: colaborador?.encontradoTextoGeral === true,
        },
        cpf: {
            informadoCadastro: cpf?.informadoCadastro === true,
            cpfCadastro: textoOuNull(cpf?.cpfCadastro),
            encontradoNoDocumento: cpf?.encontradoNoDocumento === true,
            cpfsExtraidos: Array.isArray(cpf?.cpfsExtraidos)
                ? cpf.cpfsExtraidos.map(texto).filter(Boolean)
                : [],
        },
        treinamento: {
            encontrado: treinamento?.encontrado === true,
            nomeCadastro: textoOuNull(treinamento?.nomeCadastro),
            encontradoNoTexto: treinamento?.encontradoNoTexto === true,
            validadoPorConferencia: treinamento?.validadoPorConferencia === true,
            observacao: textoOuNull(treinamento?.observacao),
        },
        empresa: jsonSeguro(empresa, {}),
        listaPresenca: jsonSeguro(listaPresenca, {}),
    }, null);
}

function snapshotLeituraDocumental(verificacao = null) {
    const leitura = leituraDocumentalVerificacao(verificacao);
    if (!Object.keys(leitura).length) return null;

    return jsonSeguro({
        executado: leitura?.executado === true,
        tipoLeitura: textoOuNull(leitura?.tipo_leitura || leitura?.tipoLeitura),
        confianca: Number.isFinite(Number(leitura?.confianca)) ? Number(leitura.confianca) : null,
        paginasLidas: Number.isFinite(Number(leitura?.paginas_lidas || leitura?.paginasLidas))
            ? Number(leitura?.paginas_lidas || leitura?.paginasLidas)
            : null,
        totalPaginas: Number.isFinite(Number(leitura?.total_paginas || leitura?.totalPaginas))
            ? Number(leitura?.total_paginas || leitura?.totalPaginas)
            : null,
        datasEncontradas: jsonSeguro(leitura?.datas_encontradas || leitura?.datasEncontradas, []),
        datasConfiaveis: jsonSeguro(leitura?.datas_documento_confiaveis || leitura?.datasDocumentoConfiaveis, []),
        camposExtraidos: jsonSeguro(leitura?.campos_extraidos || leitura?.camposExtraidos, {}),
    }, null);
}

function snapshotVerificacao(verificacao = null) {
    if (!verificacao) return null;
    return {
        id: verificacao?.id || null,
        documentoId: textoOuNull(verificacao?.documento_id || verificacao?.documentoId),
        hashArquivo: shaOuNull(verificacao?.hash_arquivo || verificacao?.hashArquivo),
        dataRealizacao: dataIsoOuNull(verificacao?.data_realizacao || verificacao?.dataRealizacao),
        dataVencimento: dataIsoOuNull(verificacao?.data_vencimento || verificacao?.dataVencimento),
        statusVerificacao: texto(verificacao?.status_verificacao || verificacao?.statusVerificacao),
        nivelRisco: texto(verificacao?.nivel_risco || verificacao?.nivelRisco),
        scoreRisco: Number.isFinite(Number(verificacao?.score_risco ?? verificacao?.scoreRisco))
            ? Number(verificacao?.score_risco ?? verificacao?.scoreRisco)
            : null,
        tipoDocumento: texto(verificacao?.tipo_documento || verificacao?.tipoDocumento),
        resumo: texto(verificacao?.resumo),
        indicios: jsonSeguro(verificacao?.indicios, []),
        recomendacoes: jsonSeguro(verificacao?.recomendacoes, []),
        observacaoManual: texto(verificacao?.observacao_manual || verificacao?.observacaoManual),
        origemAnalise: texto(verificacao?.origem_analise || verificacao?.origemAnalise),
        conferenciaDocumental: snapshotConferenciaDocumental(verificacao),
        leituraDocumental: snapshotLeituraDocumental(verificacao),
        createdAt: texto(verificacao?.created_at || verificacao?.createdAt),
        updatedAt: texto(verificacao?.updated_at || verificacao?.updatedAt),
    };
}

function dadosEncontradosVerificacao(verificacao = null) {
    const conferencia = conferenciaDocumentalVerificacao(verificacao);
    const colaborador = conferencia?.colaborador || {};
    const cpf = conferencia?.cpf || {};
    const treinamento = conferencia?.treinamento || {};
    const leitura = leituraDocumentalVerificacao(verificacao);

    const scoreIdentidade = numeroConfianca01(colaborador?.scoreIdentificacao);
    const confiancaDocumento = numeroConfianca01(leitura?.confianca);

    return {
        identidadeEncontrada: {
            nomeExtraido: textoOuNull(colaborador?.nomeExtraidoColetivo),
            nomeCadastroConfirmado:
                colaborador?.encontrado === true
                    ? textoOuNull(colaborador?.nomeCadastro)
                    : null,
            cpfCadastroConfirmado:
                cpf?.encontradoNoDocumento === true
                    ? textoOuNull(cpf?.cpfCadastro)
                    : null,
            cpfsExtraidos: Array.isArray(cpf?.cpfsExtraidos)
                ? cpf.cpfsExtraidos.map(texto).filter(Boolean)
                : [],
            origemIdentificacao: textoOuNull(colaborador?.origemIdentificacao),
            confiancaIdentificacao: textoOuNull(colaborador?.confiancaIdentificacao),
            scoreIdentificacao: Number.isFinite(Number(colaborador?.scoreIdentificacao))
                ? Number(colaborador.scoreIdentificacao)
                : null,
        },
        treinamentoIdentificado:
            treinamento?.encontrado === true
                ? textoOuNull(treinamento?.nomeCadastro)
                : null,
        confiancaIdentidade: scoreIdentidade,
        confiancaDocumento,
        confiancaTreinamento: null,
    };
}

function montarEvidenciaPrevia({
    evidencia,
    itemMotor,
    colaborador,
    vinculosSha,
    verificacaoAnterior,
    verificacaoReprocessada,
    reprocessamento,
}) {
    const divergencias = divergenciasComSha(itemMotor?.divergencias, vinculosSha);
    const statusRevisao = statusComSha(itemMotor?.statusRevisao, divergencias);
    const shaPersistido = shaOuNull(evidencia?.arquivoSha256 || evidencia?.arquivo_sha256);
    const shaReprocessado = shaOuNull(reprocessamento?.hashReprocessado);
    const sha = shaPersistido || shaReprocessado;
    const mesmos = Number(vinculosSha?.mesmo_colaborador_total || 0);
    const outros = Number(vinculosSha?.outros_colaboradores_acessiveis_total || 0);
    const tipoEvidencia = texto(evidencia?.tipoEvidencia || evidencia?.tipo_evidencia) || "evidencia_complementar";
    const encontrados = dadosEncontradosVerificacao(verificacaoReprocessada || verificacaoAnterior);

    return {
        id: evidencia?.id || null,
        certificadoEvidenciaId: uuidOuNull(evidencia?.id),
        certificadoOrigemId: uuidOuNull(evidencia?.certificadoOrigemId || evidencia?.certificado_origem_id),
        colaboradorId: evidencia?.colaboradorId || evidencia?.colaborador_id || null,
        treinamentoId: uuidOuNull(evidencia?.treinamentoId || evidencia?.treinamento_id),
        treinamentoCodigo: inteiroPositivo(evidencia?.treinamentoCodigo ?? evidencia?.treinamento_codigo),
        tipoEvidencia,
        tipoEvidenciaReconhecido: evidencia?.tipoEvidenciaReconhecido === true,
        arquivoNome: texto(evidencia?.arquivoNome || evidencia?.arquivo_nome),
        arquivoUrl: texto(evidencia?.arquivoUrl || evidencia?.arquivo_url),
        arquivoSha256: sha,
        arquivoSha256Persistido: shaPersistido,
        identidadeEsperada: {
            colaboradorId: colaborador?.id || null,
            nome: texto(colaborador?.nome),
            cpf: texto(colaborador?.cpf),
            matricula: texto(colaborador?.matricula),
            matriculaEsocial: texto(colaborador?.matriculaEsocial),
        },
        identidadeEncontrada: encontrados.identidadeEncontrada,
        tipoDocumentoEsperado: tipoEvidencia === "lista_presenca" ? "lista_presenca" : "certificado_treinamento",
        tipoDocumentoIdentificado: textoOuNull(
            verificacaoReprocessada?.tipo_documento ||
            verificacaoReprocessada?.tipoDocumento ||
            verificacaoAnterior?.tipo_documento ||
            verificacaoAnterior?.tipoDocumento
        ),
        treinamentoEsperado: textoOuNull(itemMotor?.treinamentoNome),
        treinamentoIdentificado: encontrados.treinamentoIdentificado,
        confiancaIdentidade: encontrados.confiancaIdentidade,
        confiancaDocumento: encontrados.confiancaDocumento,
        confiancaTreinamento: encontrados.confiancaTreinamento,
        statusIntegridade: statusIntegridade(divergencias, statusRevisao),
        duplicidadeMesmoColaborador: mesmos > 1,
        duplicidadeOutroColaborador: outros > 0,
        vinculoForaEscopo: vinculosSha?.possui_vinculo_fora_escopo === true,
        vinculosSha256: jsonSeguro(vinculosSha, {}) || {},
        divergencias,
        verificacaoAnterior: snapshotVerificacao(verificacaoAnterior),
        verificacaoReprocessada: snapshotVerificacao(verificacaoReprocessada),
        verificacaoDocumental: snapshotVerificacao(verificacaoReprocessada || verificacaoAnterior),
        reprocessamento: jsonSeguro({
            ok: reprocessamento?.ok === true,
            erro: textoOuNull(reprocessamento?.erro),
            hashEsperado: shaOuNull(reprocessamento?.hashEsperado),
            hashReprocessado: shaOuNull(reprocessamento?.hashReprocessado),
            hashConfere: reprocessamento?.hashConfere ?? null,
            bucket: textoOuNull(reprocessamento?.bucket),
            caminhoStorage: textoOuNull(reprocessamento?.caminhoStorage),
        }, {}),
    };
}

function montarItemPrevia({
    itemMotor,
    certificadoBruto,
    colaborador,
    verificacoesAnteriores,
    reprocessamentosPorEvidencia,
    vinculosShaPorSha,
}) {
    const evidencias = (Array.isArray(itemMotor?.evidencias) ? itemMotor.evidencias : []).map((evidencia) => {
        const evidenciaId = texto(evidencia?.id);
        const reprocessamento = evidenciaId ? reprocessamentosPorEvidencia.get(evidenciaId) || null : null;
        const sha =
            shaOuNull(evidencia?.arquivoSha256 || evidencia?.arquivo_sha256) ||
            shaOuNull(reprocessamento?.hashReprocessado);
        const certificadoOrigemId = texto(
            evidencia?.certificadoOrigemId || evidencia?.certificado_origem_id || itemMotor?.certificadoPrincipalId
        );

        return montarEvidenciaPrevia({
            evidencia,
            itemMotor,
            colaborador,
            vinculosSha: sha ? vinculosShaPorSha.get(sha) || null : null,
            verificacaoAnterior: certificadoOrigemId
                ? verificacoesAnteriores.get(certificadoOrigemId) || null
                : null,
            verificacaoReprocessada: reprocessamento?.verificacao || null,
            reprocessamento,
        });
    });

    const conjunto = new Set(Array.isArray(itemMotor?.divergencias) ? itemMotor.divergencias : []);
    evidencias.forEach((evidencia) => evidencia.divergencias.forEach((item) => conjunto.add(item)));
    const divergencias = [...conjunto];
    const statusRevisao = statusComSha(itemMotor?.statusRevisao, divergencias);
    const statusAnterior = statusDocumento(
        certificadoBruto?.data_vencimento || certificadoBruto?.vencimento || null,
        itemMotor?.semValidade === true
    );

    return {
        chave: texto(itemMotor?.chave),
        treinamentoCodigo: inteiroPositivo(itemMotor?.treinamentoCodigo),
        treinamentoId: uuidOuNull(certificadoBruto?.treinamento_id),
        treinamentoNome: texto(itemMotor?.treinamentoNome) || "Treinamento não identificado",
        treinamentoReconhecido: itemMotor?.treinamentoReconhecido === true,
        certificadoPrincipalId: uuidOuNull(itemMotor?.certificadoPrincipalId),
        certificadosLogicosOrigem: (Array.isArray(itemMotor?.certificadosLogicosOrigem) ? itemMotor.certificadosLogicosOrigem : [])
            .map(uuidOuNull)
            .filter(Boolean),
        quantidadeRegistrosCertificado: Number(itemMotor?.quantidadeRegistrosCertificado || 0),
        quantidadeEvidencias: evidencias.length,
        dataRealizacaoSalva: dataIsoOuNull(certificadoBruto?.data_realizacao || certificadoBruto?.realizado),
        dataVencimentoSalva: dataIsoOuNull(certificadoBruto?.data_vencimento || certificadoBruto?.vencimento),
        dataRealizacaoRevisada: dataIsoOuNull(itemMotor?.dataRealizacao),
        dataVencimentoRevisada: dataIsoOuNull(itemMotor?.vencimentoCanonico || itemMotor?.vencimentoPersistido),
        semValidade: itemMotor?.semValidade === true,
        statusTemporalAnterior: {
            chave: texto(statusAnterior?.chave),
            texto: texto(statusAnterior?.texto),
        },
        statusTemporalAnteriorPersistencia: statusTemporalBanco(statusAnterior?.chave),
        statusTemporalMotor: {
            chave: texto(itemMotor?.statusTemporal?.chave),
            texto: texto(itemMotor?.statusTemporal?.texto),
        },
        statusTemporalPersistencia: statusTemporalBanco(itemMotor?.statusTemporal?.chave),
        statusIntegridade: statusIntegridade(divergencias, statusRevisao),
        statusRevisao,
        resultadoPersistencia: resultadoBanco(statusRevisao),
        divergencias,
        evidencias,
        requerRevisaoHumana: [
            TREINAMENTOS_REVISAO_STATUS.DIVERGENTE,
            TREINAMENTOS_REVISAO_STATUS.REVISAO_MANUAL_NECESSARIA,
            TREINAMENTOS_REVISAO_STATUS.SEM_EVIDENCIA_SUFICIENTE,
        ].includes(statusRevisao),
    };
}

function calcularResumo(itens = []) {
    const resumo = Object.fromEntries(Object.values(TREINAMENTOS_REVISAO_STATUS).map((status) => [status, 0]));
    itens.forEach((item) => {
        if (Object.hasOwn(resumo, item?.statusRevisao)) resumo[item.statusRevisao] += 1;
    });
    const total = itens.length;
    const conformes = resumo[TREINAMENTOS_REVISAO_STATUS.CONFORME] || 0;
    const percentual = total ? Number((conformes * 100 / total).toFixed(2)) : 0;
    return { resumo, total, percentual };
}

export function montarPreviaRevisaoTreinamentosComDados({
    colaborador = {},
    colaboradorBruto = {},
    empresa = null,
    certificados = [],
    certificadosBrutos = [],
    evidencias = [],
    verificacoes = [],
    verificacoesMotor = null,
    reprocessamentosPorEvidencia = new Map(),
    vinculosShaPorSha = new Map(),
    dataReferencia: referencia = null,
} = {}) {
    const colaboradorSnapshot = snapshotColaborador(colaborador, colaboradorBruto);
    if (!colaboradorSnapshot.id) throw new Error("Colaborador inválido para montar a prévia da revisão.");

    const motor = montarRevisaoTreinamentosReadOnly({
        colaborador: { ...colaborador, treinamentos: Array.isArray(certificados) ? certificados : [] },
        certificados,
        evidencias,
        verificacoes: Array.isArray(verificacoesMotor) ? verificacoesMotor : verificacoes,
    });

    const certificadosPorId = indicePorId(certificadosBrutos);
    const verificacoesAnteriores = indiceUltimaVerificacao(verificacoes);
    const itens = motor.itens.map((itemMotor) => montarItemPrevia({
        itemMotor,
        certificadoBruto: certificadosPorId.get(texto(itemMotor?.certificadoPrincipalId)) || null,
        colaborador: colaboradorSnapshot,
        verificacoesAnteriores,
        reprocessamentosPorEvidencia,
        vinculosShaPorSha,
    }));
    const calculo = calcularResumo(itens);

    return {
        serviceVersion: TREINAMENTOS_REVISAO_SERVICE_VERSAO,
        schemaVersion: TREINAMENTOS_REVISAO_SCHEMA_VERSAO,
        motorVersion: TREINAMENTOS_REVISAO_MOTOR_VERSAO,
        dataReferencia: dataReferencia(referencia),
        readOnly: true,
        colaborador: colaboradorSnapshot,
        empresa: snapshotEmpresa(empresa),
        totalTreinamentosLogicos: calculo.total,
        denominadorTreinamentos: calculo.total,
        percentualConformidade: calculo.percentual,
        resumo: calculo.resumo,
        itens,
        ignoradosDocumentais: jsonSeguro(motor?.ignoradosDocumentais, []),
        avaliacaoCanonicaErro: textoOuNull(motor?.avaliacaoCanonicaErro),
        requerRevisaoHumana: itens.some((item) => item.requerRevisaoHumana),
        diagnostico: {
            somenteLeitura: true,
            reprocessamentoFisico: true,
            certificadosCarregados: Array.isArray(certificados) ? certificados.length : 0,
            evidenciasCarregadas: Array.isArray(evidencias) ? evidencias.length : 0,
            verificacoesCarregadas: Array.isArray(verificacoes) ? verificacoes.length : 0,
            evidenciasReprocessadas: reprocessamentosPorEvidencia instanceof Map
                ? [...reprocessamentosPorEvidencia.values()].filter((item) => item?.ok === true).length
                : 0,
            evidenciasComFalhaReprocessamento: reprocessamentosPorEvidencia instanceof Map
                ? [...reprocessamentosPorEvidencia.values()].filter((item) => item?.ok !== true).length
                : 0,
            shasConsultados: vinculosShaPorSha instanceof Map ? vinculosShaPorSha.size : 0,
        },
    };
}

async function carregarContextoColaborador({ supabase, colaboradorId }) {
    const { data, error } = await supabase
        .from("colaboradores")
        .select(`
            id, empresa_id, nome, funcao, matricula, matricula_esocial, cpf,
            codigo_funcionario, status, status_mobilizacao, data_admissao,
            data_desligamento, data_demissao, treinamentos_removidos,
            treinamentos_adicionais,
            empresa:empresas(
                id, nome, cnpj, numero_contrato, tipo_empresa, empresa_pai_id, status
            )
        `)
        .eq("id", colaboradorId)
        .maybeSingle();

    if (error) throw new Error(`Erro ao carregar colaborador para revisão de treinamentos: ${error.message}`);
    if (!data) throw new Error("Colaborador não localizado ou sem acesso autorizado.");

    const empresa = data?.empresa || null;
    return {
        colaboradorBruto: data,
        colaborador: normalizarColaborador({ ...data, empresas: empresa }),
        empresa,
    };
}

async function carregarCertificados({ supabase, colaboradorId }) {
    const { data, error } = await supabase
        .from("certificados")
        .select(`
            id, colaborador_id, treinamento_id, treinamento_codigo,
            tipo_treinamento, nome_treinamento, data_realizacao, data_vencimento,
            arquivo_url, arquivo_nome, status_validacao, observacao, created_at, updated_at
        `)
        .eq("colaborador_id", colaboradorId)
        .order("created_at", { ascending: true });

    if (error) throw new Error(`Erro ao carregar certificados para revisão de treinamentos: ${error.message}`);
    const brutos = Array.isArray(data) ? data : [];
    return { brutos, normalizados: brutos.map(normalizarCertificado) };
}

async function carregarVerificacoes({ supabase, certificadoIds = [] }) {
    const ids = [...new Set((Array.isArray(certificadoIds) ? certificadoIds : []).map(texto).filter(Boolean))];
    if (!ids.length) return [];

    const { data, error } = await supabase
        .from("verificacoes_documentais")
        .select(`
            id, documento_id, colaborador_id, treinamento_id, tipo_documento,
            nome_documento, arquivo_nome, arquivo_url, hash_arquivo,
            data_realizacao, data_vencimento, status_verificacao, nivel_risco,
            score_risco, indicios, recomendacoes, resumo, observacao_manual,
            origem_analise, retorno_ia, data_referencia, created_at, updated_at
        `)
        .eq("origem_tipo", "certificado")
        .eq("origem_tabela", "certificados")
        .in("documento_id", ids)
        .order("created_at", { ascending: false });

    if (error) throw new Error(`Erro ao carregar verificações documentais da revisão: ${error.message}`);
    return Array.isArray(data) ? data : [];
}

async function carregarMatrizCanonica({ supabase }) {
    const resultado = await carregarFuncoesTreinamentosRemotas({ supabase });
    if (!resultado?.disponivel) {
        throw new Error(resultado?.motivo || "Matriz remota de funções e treinamentos indisponível para revisão.");
    }
    definirFuncoesTreinamentosRemotas(resultado.funcoes || []);
    return resultado.funcoes || [];
}


function normalizarCaminhoStorage(caminhoInformado = "", bucket = BUCKET_CERTIFICADOS) {
    const valor = texto(caminhoInformado);
    if (!valor) return "";
    if (!/^https?:\/\//i.test(valor)) return valor.split("?")[0].replace(/^\/+/, "");

    try {
        const url = new URL(valor);
        const path = decodeURIComponent(url.pathname || "");
        const marcadores = [
            `/storage/v1/object/public/${bucket}/`,
            `/storage/v1/object/sign/${bucket}/`,
            `/object/public/${bucket}/`,
            `/object/sign/${bucket}/`,
            `/${bucket}/`,
        ];

        for (const marcador of marcadores) {
            const indice = path.indexOf(marcador);
            if (indice >= 0) return path.slice(indice + marcador.length).split("?")[0].replace(/^\/+/, "");
        }

        return path.split("/").pop() || "";
    } catch {
        return valor.split("?")[0].replace(/^\/+/, "");
    }
}

async function aguardarComTimeout(promise, timeoutMs, mensagem) {
    const limite = Number(timeoutMs);
    if (!Number.isFinite(limite) || limite <= 0) return promise;

    let timer = null;
    try {
        return await Promise.race([
            promise,
            new Promise((_, reject) => {
                timer = setTimeout(() => reject(new Error(mensagem)), limite);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

function arquivoParaAnalise(blob, nomeArquivo = "certificado.pdf") {
    if (!blob || typeof blob.arrayBuffer !== "function") {
        throw new Error("Arquivo físico inválido para reprocessamento documental.");
    }

    const nome = texto(nomeArquivo) || "certificado.pdf";
    if (typeof File !== "undefined") {
        return new File([blob], nome, { type: blob.type || "application/pdf" });
    }

    try {
        Object.defineProperty(blob, "name", { value: nome, configurable: true });
    } catch {
        // Blob continua utilizável: o nome também é enviado no objeto certificado.
    }

    return blob;
}

async function baixarEvidenciaParaReprocessamento({ supabase, evidencia }) {
    if (!supabase?.storage || typeof supabase.storage.from !== "function") {
        throw new Error("Cliente Supabase sem suporte a Storage para reprocessar evidências.");
    }

    const bucket = BUCKET_CERTIFICADOS;
    const caminho = normalizarCaminhoStorage(
        evidencia?.arquivoUrl || evidencia?.arquivo_url,
        bucket
    );
    const nomeArquivo = texto(evidencia?.arquivoNome || evidencia?.arquivo_nome) || caminho.split("/").pop() || "certificado.pdf";

    if (!caminho) {
        throw new Error("Evidência sem caminho físico no Storage para reprocessamento.");
    }

    const { data, error } = await aguardarComTimeout(
        supabase.storage.from(bucket).download(caminho),
        TIMEOUT_DOWNLOAD_REPROCESSAMENTO_MS,
        `Tempo limite excedido ao baixar ${nomeArquivo} para reprocessamento.`
    );
    if (error) {
        throw new Error(`Falha ao baixar evidência para reprocessamento: ${error.message}`);
    }

    return {
        arquivo: arquivoParaAnalise(data, nomeArquivo),
        bucket,
        caminhoStorage: caminho,
        nomeArquivo,
    };
}

function certificadoParaReprocessamento({ evidencia, certificadoBruto, colaboradorId, arquivo }) {
    const codigo = inteiroPositivo(
        evidencia?.treinamentoCodigo ??
        evidencia?.treinamento_codigo ??
        certificadoBruto?.treinamento_codigo
    );
    const treinamento = obterTreinamento(codigo);
    const arquivoNome = texto(evidencia?.arquivoNome || evidencia?.arquivo_nome || certificadoBruto?.arquivo_nome);
    const arquivoUrl = texto(evidencia?.arquivoUrl || evidencia?.arquivo_url || certificadoBruto?.arquivo_url);

    return {
        codigo,
        treinamento,
        certificado: {
            ...certificadoBruto,
            id: certificadoBruto?.id || evidencia?.certificadoOrigemId || evidencia?.certificado_origem_id || null,
            colaborador_id: evidencia?.colaboradorId || evidencia?.colaborador_id || colaboradorId || null,
            treinamento_id: evidencia?.treinamentoId || evidencia?.treinamento_id || certificadoBruto?.treinamento_id || null,
            treinamento_codigo: codigo,
            tipo_treinamento: evidencia?.tipoTreinamento || evidencia?.tipo_treinamento || certificadoBruto?.tipo_treinamento || treinamento?.nome || "",
            nome_treinamento: evidencia?.nomeTreinamento || evidencia?.nome_treinamento || certificadoBruto?.nome_treinamento || treinamento?.nome || "",
            data_realizacao: evidencia?.dataRealizacao || evidencia?.data_realizacao || certificadoBruto?.data_realizacao || null,
            data_vencimento: evidencia?.dataVencimento || evidencia?.data_vencimento || certificadoBruto?.data_vencimento || null,
            arquivo_url: arquivoUrl,
            caminho_storage: arquivoUrl,
            arquivo_nome: arquivoNome,
            mime_type: arquivo?.type || "application/pdf",
            tamanho_bytes: Number.isFinite(Number(arquivo?.size)) ? Number(arquivo.size) : null,
        },
    };
}

function criarVerificacaoFalhaReprocessamento({ evidencia, erro }) {
    return {
        documento_id: evidencia?.certificadoOrigemId || evidencia?.certificado_origem_id || null,
        status_verificacao: "erro",
        nivel_risco: "nao_avaliado",
        score_risco: 0,
        indicios: [{
            codigo: "reprocessamento_evidencia_falhou",
            tipo: "arquivo",
            titulo: "Falha no reprocessamento da evidência",
            detalhe: texto(erro?.message || erro || "Falha não identificada."),
            peso: 0,
            bloqueia: false,
            recomendacao: "Executar conferência manual da evidência antes de concluir a revisão.",
            dados: {
                evidenciaId: evidencia?.id || null,
                arquivoNome: textoOuNull(evidencia?.arquivoNome || evidencia?.arquivo_nome),
            },
        }],
        recomendacoes: ["Executar conferência manual da evidência antes de concluir a revisão."],
        resumo: `Falha no reprocessamento da evidência: ${texto(erro?.message || erro || "falha não identificada")}`,
        origem_analise: "revisao_treinamentos_readonly",
    };
}

function aplicarIntegridadeHashReprocessamento({ verificacao, evidencia }) {
    const esperado = shaOuNull(evidencia?.arquivoSha256 || evidencia?.arquivo_sha256);
    const atual = shaOuNull(verificacao?.hash_arquivo || verificacao?.hashArquivo);

    if (!esperado) {
        return { verificacao, hashEsperado: null, hashReprocessado: atual, hashConfere: null };
    }

    if (!atual) {
        const indicio = {
            codigo: "hash_reprocessamento_indisponivel",
            tipo: "arquivo",
            titulo: "Hash do arquivo não pôde ser confirmado no reprocessamento",
            detalhe: "A evidência possui SHA-256 persistido, mas o reprocessamento não conseguiu calcular o hash físico atual.",
            peso: 55,
            bloqueia: false,
            recomendacao: "Conferir manualmente a evidência antes de concluir a revisão.",
            dados: { hashEsperado: esperado },
        };
        return {
            verificacao: {
                ...verificacao,
                status_verificacao: "revisao_manual",
                statusVerificacao: "revisao_manual",
                nivel_risco: "alto",
                nivelRisco: "alto",
                score_risco: Math.max(55, Number(verificacao?.score_risco ?? verificacao?.scoreRisco ?? 0)),
                scoreRisco: Math.max(55, Number(verificacao?.score_risco ?? verificacao?.scoreRisco ?? 0)),
                indicios: [...(Array.isArray(verificacao?.indicios) ? verificacao.indicios : []), indicio],
                resumo: [texto(verificacao?.resumo), indicio.detalhe].filter(Boolean).join(" "),
            },
            hashEsperado: esperado,
            hashReprocessado: null,
            hashConfere: false,
        };
    }

    if (atual !== esperado) {
        const indicio = {
            codigo: "arquivo_sha256_divergente_reprocessamento",
            tipo: "arquivo",
            titulo: "SHA-256 físico divergente",
            detalhe: "O conteúdo baixado do Storage não corresponde ao SHA-256 persistido para a evidência.",
            peso: 100,
            bloqueia: true,
            recomendacao: "Bloquear a conclusão automática e investigar a integridade física do arquivo.",
            dados: { hashEsperado: esperado, hashReprocessado: atual },
        };
        return {
            verificacao: {
                ...verificacao,
                status_verificacao: "bloqueado",
                statusVerificacao: "bloqueado",
                nivel_risco: "critico",
                nivelRisco: "critico",
                score_risco: 100,
                scoreRisco: 100,
                indicios: [...(Array.isArray(verificacao?.indicios) ? verificacao.indicios : []), indicio],
                resumo: [texto(verificacao?.resumo), indicio.detalhe].filter(Boolean).join(" "),
            },
            hashEsperado: esperado,
            hashReprocessado: atual,
            hashConfere: false,
        };
    }

    return { verificacao, hashEsperado: esperado, hashReprocessado: atual, hashConfere: true };
}

function emitirProgressoReprocessamento(onProgresso, { concluidas = 0, total = 0 } = {}) {
    if (typeof onProgresso !== "function") return;

    const totalSeguro = Math.max(0, Number(total) || 0);
    const concluidasSeguras = Math.max(
        0,
        Math.min(totalSeguro, Number(concluidas) || 0)
    );
    const percentual = totalSeguro > 0
        ? Number(((concluidasSeguras / totalSeguro) * 100).toFixed(2))
        : 100;

    try {
        onProgresso(Object.freeze({
            fase: "reprocessamento_evidencias",
            concluidas: concluidasSeguras,
            total: totalSeguro,
            percentual,
        }));
    } catch {
        // A telemetria visual não pode interromper o reprocessamento documental.
    }
}

async function mapearComConcorrencia(
    itens = [],
    limite = LIMITE_CONCORRENCIA_REPROCESSAMENTO,
    executor,
    aoConcluir = null
) {
    const entrada = Array.isArray(itens) ? itens : [];
    const saida = new Array(entrada.length);
    const concorrencia = Math.max(1, Math.min(Number(limite) || 1, 4, entrada.length || 1));
    let cursor = 0;
    let concluidos = 0;

    async function trabalhador() {
        while (cursor < entrada.length) {
            const indice = cursor;
            cursor += 1;
            saida[indice] = await executor(entrada[indice], indice);
            concluidos += 1;

            if (typeof aoConcluir === "function") {
                try {
                    aoConcluir({
                        indice,
                        concluidos,
                        total: entrada.length,
                    });
                } catch {
                    // Callback auxiliar não pode interromper o lote.
                }
            }
        }
    }

    await Promise.all(Array.from({ length: concorrencia }, () => trabalhador()));
    return saida;
}

async function reprocessarEvidenciasFisicas({
    supabase,
    colaborador,
    certificadosBrutos = [],
    evidencias = [],
    verificacoesAnteriores = [],
    verificarCertificado = verificarCertificadoTreinamento,
    limiteConcorrencia = LIMITE_CONCORRENCIA_REPROCESSAMENTO,
    onProgresso = null,
}) {
    if (typeof verificarCertificado !== "function") {
        throw new Error("Verificador canônico indisponível para reprocessamento de treinamentos.");
    }

    const certificadosPorId = indicePorId(certificadosBrutos);
    const totalEvidencias = Array.isArray(evidencias) ? evidencias.length : 0;

    emitirProgressoReprocessamento(onProgresso, {
        concluidas: 0,
        total: totalEvidencias,
    });

    const resultados = await mapearComConcorrencia(evidencias, limiteConcorrencia, async (evidencia) => {
        const certificadoOrigemId = texto(evidencia?.certificadoOrigemId || evidencia?.certificado_origem_id);
        const certificadoBruto = certificadosPorId.get(certificadoOrigemId) || {};

        try {
            const download = await baixarEvidenciaParaReprocessamento({ supabase, evidencia });
            const preparado = certificadoParaReprocessamento({
                evidencia,
                certificadoBruto,
                colaboradorId: colaborador?.id,
                arquivo: download.arquivo,
            });
            const verificacaoBruta = await verificarCertificado({
                supabase,
                certificado: preparado.certificado,
                colaborador,
                treinamento: preparado.treinamento,
                arquivo: download.arquivo,
                registrosExistentes: verificacoesAnteriores,
                usuario: null,
                salvarResultado: false,
                exigeVencimento: !treinamentoSemValidade(preparado.codigo),
            });

            if (!verificacaoBruta || typeof verificacaoBruta !== "object") {
                throw new Error("Verificador canônico não retornou resultado documental.");
            }

            const verificacaoBase = {
                ...verificacaoBruta,
                documento_id: certificadoOrigemId || verificacaoBruta?.documento_id || verificacaoBruta?.documentoId || null,
                documentoId: certificadoOrigemId || verificacaoBruta?.documentoId || verificacaoBruta?.documento_id || null,
            };
            const integridade = aplicarIntegridadeHashReprocessamento({
                verificacao: verificacaoBase,
                evidencia,
            });

            return {
                evidenciaId: texto(evidencia?.id),
                certificadoOrigemId,
                ok: integridade.hashConfere !== false,
                erro: integridade.hashConfere === false && integridade.hashReprocessado === null
                    ? "Hash físico atual não pôde ser confirmado."
                    : integridade.hashConfere === false
                        ? "SHA-256 físico divergente da evidência persistida."
                        : "",
                verificacao: integridade.verificacao,
                hashEsperado: integridade.hashEsperado,
                hashReprocessado: integridade.hashReprocessado,
                hashConfere: integridade.hashConfere,
                bucket: download.bucket,
                caminhoStorage: download.caminhoStorage,
            };
        } catch (error) {
            return {
                evidenciaId: texto(evidencia?.id),
                certificadoOrigemId,
                ok: false,
                erro: texto(error?.message || error || "Falha no reprocessamento."),
                verificacao: criarVerificacaoFalhaReprocessamento({ evidencia, erro: error }),
                hashEsperado: shaOuNull(evidencia?.arquivoSha256 || evidencia?.arquivo_sha256),
                hashReprocessado: null,
                hashConfere: false,
                bucket: BUCKET_CERTIFICADOS,
                caminhoStorage: normalizarCaminhoStorage(evidencia?.arquivoUrl || evidencia?.arquivo_url),
            };
        }
    }, ({ concluidos, total }) => {
        emitirProgressoReprocessamento(onProgresso, {
            concluidas: concluidos,
            total,
        });
    });

    return resultados;
}

function prioridadeStatusVerificacao(status = "") {
    return STATUS_VERIFICACAO_PRIORIDADE[texto(status).toLowerCase()] ?? 0;
}

function agregarVerificacoesReprocessadas(resultados = []) {
    const grupos = new Map();
    for (const resultado of Array.isArray(resultados) ? resultados : []) {
        const certificadoId = texto(resultado?.certificadoOrigemId);
        if (!certificadoId) continue;
        if (!grupos.has(certificadoId)) grupos.set(certificadoId, []);
        grupos.get(certificadoId).push(resultado);
    }

    const agregadas = [];
    for (const [certificadoId, itens] of grupos.entries()) {
        const ordenados = [...itens].sort((a, b) =>
            prioridadeStatusVerificacao(b?.verificacao?.status_verificacao || b?.verificacao?.statusVerificacao) -
            prioridadeStatusVerificacao(a?.verificacao?.status_verificacao || a?.verificacao?.statusVerificacao)
        );
        const pior = ordenados[0]?.verificacao || {};
        const score = Math.max(...ordenados.map((item) => Number(item?.verificacao?.score_risco ?? item?.verificacao?.scoreRisco ?? 0)), 0);
        const indicios = ordenados.flatMap((item) =>
            (Array.isArray(item?.verificacao?.indicios) ? item.verificacao.indicios : []).map((indicio) => ({
                ...indicio,
                dados: {
                    ...(indicio?.dados && typeof indicio.dados === "object" ? indicio.dados : {}),
                    evidenciaRevisaoId: item?.evidenciaId || null,
                },
            }))
        );
        const recomendacoes = Array.from(new Set(
            ordenados.flatMap((item) => Array.isArray(item?.verificacao?.recomendacoes) ? item.verificacao.recomendacoes : [])
                .map(texto)
                .filter(Boolean)
        ));

        agregadas.push({
            ...pior,
            documento_id: certificadoId,
            documentoId: certificadoId,
            status_verificacao: texto(pior?.status_verificacao || pior?.statusVerificacao) || "erro",
            statusVerificacao: texto(pior?.statusVerificacao || pior?.status_verificacao) || "erro",
            score_risco: score,
            scoreRisco: score,
            indicios,
            recomendacoes,
            resumo: ordenados
                .map((item) => texto(item?.verificacao?.resumo))
                .filter(Boolean)
                .join(" | "),
            origem_analise: "revisao_treinamentos_readonly",
            origemAnalise: "revisao_treinamentos_readonly",
        });
    }

    return agregadas;
}

function mapaReprocessamentos(resultados = []) {
    return new Map(
        (Array.isArray(resultados) ? resultados : [])
            .filter((item) => texto(item?.evidenciaId))
            .map((item) => [texto(item.evidenciaId), item])
    );
}

function vinculosShaFingerprint(vinculosShaPorSha = new Map()) {
    if (!(vinculosShaPorSha instanceof Map)) return [];
    return [...vinculosShaPorSha.entries()]
        .map(([sha, valor]) => [texto(sha), jsonSeguro(valor, {})])
        .sort((a, b) => a[0].localeCompare(b[0]));
}

function materialFonteFingerprint({
    contexto,
    funcoesRemotas = [],
    certificadosBrutos = [],
    evidencias = [],
    verificacoes = [],
    vinculosShaPorSha = new Map(),
}) {
    return {
        colaborador: snapshotColaborador(contexto?.colaborador || {}, contexto?.colaboradorBruto || {}),
        empresa: snapshotEmpresa(contexto?.empresa || null),
        funcoesRemotas: ordenarPorChave(funcoesRemotas, (item) => item?.id || item?.funcao || item?.nome || JSON.stringify(item)),
        certificados: ordenarPorChave(certificadosBrutos, (item) => item?.id),
        evidencias: ordenarPorChave(evidencias, (item) => item?.id),
        verificacoes: ordenarPorChave(verificacoes, (item) =>
            `${item?.documento_id || item?.documentoId || ""}|${item?.created_at || item?.createdAt || ""}|${item?.id || ""}`
        ).map(snapshotVerificacao),
        vinculosSha: vinculosShaFingerprint(vinculosShaPorSha),
    };
}

function materialPreviaFingerprint(previa = {}) {
    return {
        serviceVersion: previa?.serviceVersion,
        schemaVersion: previa?.schemaVersion,
        motorVersion: previa?.motorVersion,
        dataReferencia: previa?.dataReferencia,
        fonteFingerprint: previa?.fonteFingerprint,
        shasReferencia: previa?.shasReferencia,
        colaborador: previa?.colaborador,
        empresa: previa?.empresa,
        totalTreinamentosLogicos: previa?.totalTreinamentosLogicos,
        percentualConformidade: previa?.percentualConformidade,
        resumo: previa?.resumo,
        requerRevisaoHumana: previa?.requerRevisaoHumana,
        itens: (Array.isArray(previa?.itens) ? previa.itens : []).map((item) => ({
            chave: item?.chave,
            treinamentoCodigo: item?.treinamentoCodigo,
            treinamentoId: item?.treinamentoId,
            treinamentoNome: item?.treinamentoNome,
            dataRealizacaoSalva: item?.dataRealizacaoSalva,
            dataVencimentoSalva: item?.dataVencimentoSalva,
            dataRealizacaoRevisada: item?.dataRealizacaoRevisada,
            dataVencimentoRevisada: item?.dataVencimentoRevisada,
            statusTemporalAnteriorPersistencia: item?.statusTemporalAnteriorPersistencia,
            statusTemporalPersistencia: item?.statusTemporalPersistencia,
            statusIntegridade: item?.statusIntegridade,
            statusRevisao: item?.statusRevisao,
            divergencias: item?.divergencias,
            evidencias: (Array.isArray(item?.evidencias) ? item.evidencias : []).map((evidencia) => ({
                certificadoEvidenciaId: evidencia?.certificadoEvidenciaId,
                certificadoOrigemId: evidencia?.certificadoOrigemId,
                tipoEvidencia: evidencia?.tipoEvidencia,
                arquivoNome: evidencia?.arquivoNome,
                arquivoUrl: evidencia?.arquivoUrl,
                arquivoSha256: evidencia?.arquivoSha256,
                arquivoSha256Persistido: evidencia?.arquivoSha256Persistido,
                identidadeEsperada: evidencia?.identidadeEsperada,
                identidadeEncontrada: evidencia?.identidadeEncontrada,
                tipoDocumentoIdentificado: evidencia?.tipoDocumentoIdentificado,
                treinamentoIdentificado: evidencia?.treinamentoIdentificado,
                confiancaIdentidade: evidencia?.confiancaIdentidade,
                confiancaDocumento: evidencia?.confiancaDocumento,
                statusIntegridade: evidencia?.statusIntegridade,
                divergencias: evidencia?.divergencias,
                verificacaoAnterior: evidencia?.verificacaoAnterior,
                verificacaoReprocessada: evidencia?.verificacaoReprocessada,
                reprocessamento: evidencia?.reprocessamento,
            })),
        })),
        ignoradosDocumentais: previa?.ignoradosDocumentais,
        avaliacaoCanonicaErro: previa?.avaliacaoCanonicaErro,
    };
}

async function carregarFontesRevisao({ supabase, colaboradorId }) {
    const [contexto, funcoesRemotas] = await Promise.all([
        carregarContextoColaborador({ supabase, colaboradorId }),
        carregarMatrizCanonica({ supabase }),
    ]);

    const certificados = await carregarCertificados({ supabase, colaboradorId });
    const certificadoIds = certificados.brutos.map((item) => item?.id).filter(Boolean);
    const [evidencias, verificacoes] = await Promise.all([
        listarEvidenciasCertificadosEmLoteService({
            supabase,
            certificadoIds,
            incluirHistoricas: false,
        }),
        carregarVerificacoes({ supabase, certificadoIds }),
    ]);

    return {
        contexto,
        funcoesRemotas,
        certificados,
        evidencias,
        verificacoes,
    };
}

export async function consultarVinculosSha256RevisaoTreinamentosService({
    supabase,
    colaboradorId,
    sha256,
} = {}) {
    validarSupabase(supabase, { exigeRpc: true });
    const id = validarUuid(colaboradorId, "UUID do colaborador");
    const sha = shaOuNull(sha256);
    if (!sha) throw new Error("SHA-256 inválido para consulta de vínculos da revisão.");

    const { data, error } = await supabase.rpc(RPC_SHA, {
        p_colaborador_id: id,
        p_sha256: sha,
    });
    if (error) throw new Error(`Erro ao consultar vínculos SHA-256 da revisão: ${error.message}`);
    return jsonSeguro(data, {}) || {};
}

async function consultarShasPorLista({ supabase, colaboradorId, shas = [] }) {
    const unicos = [...new Set(
        (Array.isArray(shas) ? shas : [])
            .map(shaOuNull)
            .filter(Boolean)
    )];

    const pares = await mapearComConcorrencia(unicos, 4, async (sha) => [
        sha,
        await consultarVinculosSha256RevisaoTreinamentosService({ supabase, colaboradorId, sha256: sha }),
    ]);
    return new Map(pares);
}

function shasReferenciaRevisao({ evidencias = [], reprocessamentos = [] } = {}) {
    const shas = new Set();
    for (const evidencia of Array.isArray(evidencias) ? evidencias : []) {
        const sha = shaOuNull(evidencia?.arquivoSha256 || evidencia?.arquivo_sha256);
        if (sha) shas.add(sha);
    }
    for (const resultado of Array.isArray(reprocessamentos) ? reprocessamentos : []) {
        const sha = shaOuNull(resultado?.hashReprocessado);
        if (sha) shas.add(sha);
    }
    return [...shas].sort();
}

async function gerarFonteFingerprintComVinculos({ fontes, vinculosShaPorSha, shasReferencia }) {
    return gerarFingerprintObjeto({
        ...materialFonteFingerprint({
            contexto: fontes.contexto,
            funcoesRemotas: fontes.funcoesRemotas,
            certificadosBrutos: fontes.certificados.brutos,
            evidencias: fontes.evidencias,
            verificacoes: fontes.verificacoes,
            vinculosShaPorSha,
        }),
        shasReferencia: [...(Array.isArray(shasReferencia) ? shasReferencia : [])].sort(),
    });
}

export async function prepararPreviaRevisaoTreinamentosService({
    supabase,
    colaboradorId,
    dataReferencia: referencia = null,
    verificarCertificado = verificarCertificadoTreinamento,
    limiteConcorrencia = LIMITE_CONCORRENCIA_REPROCESSAMENTO,
    onProgresso = null,
} = {}) {
    validarSupabase(supabase, { exigeRpc: true });
    const id = validarUuid(colaboradorId, "UUID do colaborador");
    const referenciaSegura = dataReferencia(referencia);
    const fontes = await carregarFontesRevisao({ supabase, colaboradorId: id });

    const reprocessamentos = await reprocessarEvidenciasFisicas({
        supabase,
        colaborador: fontes.contexto.colaborador,
        certificadosBrutos: fontes.certificados.brutos,
        evidencias: fontes.evidencias,
        verificacoesAnteriores: fontes.verificacoes,
        verificarCertificado,
        limiteConcorrencia,
        onProgresso,
    });
    const verificacoesMotor = agregarVerificacoesReprocessadas(reprocessamentos);
    const reprocessamentosPorEvidencia = mapaReprocessamentos(reprocessamentos);
    const shasReferencia = shasReferenciaRevisao({
        evidencias: fontes.evidencias,
        reprocessamentos,
    });
    const vinculosShaPorSha = await consultarShasPorLista({
        supabase,
        colaboradorId: id,
        shas: shasReferencia,
    });
    const fonteFingerprint = await gerarFonteFingerprintComVinculos({
        fontes,
        vinculosShaPorSha,
        shasReferencia,
    });

    const previaBase = montarPreviaRevisaoTreinamentosComDados({
        colaborador: fontes.contexto.colaborador,
        colaboradorBruto: fontes.contexto.colaboradorBruto,
        empresa: fontes.contexto.empresa,
        certificados: fontes.certificados.normalizados,
        certificadosBrutos: fontes.certificados.brutos,
        evidencias: fontes.evidencias,
        verificacoes: fontes.verificacoes,
        verificacoesMotor,
        reprocessamentosPorEvidencia,
        vinculosShaPorSha,
        dataReferencia: referenciaSegura,
    });

    const geradoEm = new Date().toISOString();
    const previaComFonte = {
        ...previaBase,
        geradoEm,
        fonteFingerprint,
        shasReferencia,
        diagnostico: {
            ...previaBase.diagnostico,
            funcoesRemotasCarregadas: fontes.funcoesRemotas.length,
            shasReprocessadosOuPersistidos: shasReferencia.length,
            limiteConcorrenciaReprocessamento: Math.max(1, Math.min(Number(limiteConcorrencia) || 1, 4)),
        },
    };
    const previaFingerprint = await gerarFingerprintObjeto(materialPreviaFingerprint(previaComFonte));

    return {
        ...previaComFonte,
        previaFingerprint,
    };
}

export async function recalcularFonteFingerprintRevisaoTreinamentosService({
    supabase,
    colaboradorId,
    shasReferencia = [],
} = {}) {
    validarSupabase(supabase, { exigeRpc: true });
    const id = validarUuid(colaboradorId, "UUID do colaborador");
    const fontes = await carregarFontesRevisao({ supabase, colaboradorId: id });
    const shas = [...new Set((Array.isArray(shasReferencia) ? shasReferencia : []).map(shaOuNull).filter(Boolean))].sort();
    const vinculosShaPorSha = await consultarShasPorLista({
        supabase,
        colaboradorId: id,
        shas,
    });
    return gerarFonteFingerprintComVinculos({
        fontes,
        vinculosShaPorSha,
        shasReferencia: shas,
    });
}

export async function gerarConclusaoFingerprintRevisaoTreinamentos({
    previa,
    decisoesHumanas = {},
} = {}) {
    if (!fingerprintValido(previa?.previaFingerprint)) {
        throw new Error("Prévia sem fingerprint técnico válido para conclusão.");
    }

    return gerarFingerprintObjeto({
        previaFingerprint: previa.previaFingerprint,
        decisoesHumanas: jsonSeguro(decisoesHumanas, {}),
        motorVersion: previa?.motorVersion,
        schemaVersion: previa?.schemaVersion,
    });
}

function decisaoHumana(decisoes = {}, item = {}) {
    if (!decisoes || typeof decisoes !== "object" || Array.isArray(decisoes)) return null;
    const chaves = [
        texto(item?.chave),
        texto(item?.certificadoPrincipalId),
        item?.treinamentoCodigo ? String(item.treinamentoCodigo) : "",
    ].filter(Boolean);
    for (const chave of chaves) {
        const valor = decisoes[chave];
        if (valor && typeof valor === "object") return valor;
    }
    return null;
}

function resumoBanco(previa = {}, { conclusaoFingerprint = null } = {}) {
    const resumo = previa?.resumo || {};
    return {
        total_treinamentos: Number(previa?.totalTreinamentosLogicos || 0),
        conformes: Number(resumo[TREINAMENTOS_REVISAO_STATUS.CONFORME] || 0),
        atencao: Number(resumo[TREINAMENTOS_REVISAO_STATUS.ATENCAO] || 0),
        vencidos: Number(resumo[TREINAMENTOS_REVISAO_STATUS.VENCIDO] || 0),
        divergentes: Number(resumo[TREINAMENTOS_REVISAO_STATUS.DIVERGENTE] || 0),
        sem_evidencia_suficiente: Number(resumo[TREINAMENTOS_REVISAO_STATUS.SEM_EVIDENCIA_SUFICIENTE] || 0),
        revisao_manual_necessaria: Number(resumo[TREINAMENTOS_REVISAO_STATUS.REVISAO_MANUAL_NECESSARIA] || 0),
        percentual_conformidade: Number(previa?.percentualConformidade || 0),
        requer_revisao_humana: previa?.requerRevisaoHumana === true,
        service_versao: TREINAMENTOS_REVISAO_SERVICE_VERSAO,
        schema_versao: TREINAMENTOS_REVISAO_SCHEMA_VERSAO,
        gerado_em: textoOuNull(previa?.geradoEm),
        fonte_fingerprint: fingerprintValido(previa?.fonteFingerprint) ? previa.fonteFingerprint : null,
        previa_fingerprint: fingerprintValido(previa?.previaFingerprint) ? previa.previaFingerprint : null,
        conclusao_fingerprint: fingerprintValido(conclusaoFingerprint) ? conclusaoFingerprint : null,
        reprocessamento_fisico: true,
        shas_referencia: jsonSeguro(previa?.shasReferencia, []) || [],
    };
}

function evidenciaBanco(evidencia = {}) {
    return {
        certificado_evidencia_id: evidencia?.certificadoEvidenciaId || null,
        certificado_origem_id: evidencia?.certificadoOrigemId || null,
        tipo_evidencia: texto(evidencia?.tipoEvidencia) || "evidencia_complementar",
        arquivo_nome: textoOuNull(evidencia?.arquivoNome),
        arquivo_url: textoOuNull(evidencia?.arquivoUrl),
        arquivo_sha256: shaOuNull(evidencia?.arquivoSha256),
        arquivo_sha256_persistido: shaOuNull(evidencia?.arquivoSha256Persistido),
        identidade_esperada: jsonSeguro(evidencia?.identidadeEsperada, {}) || {},
        identidade_encontrada: jsonSeguro(evidencia?.identidadeEncontrada, {}) || {},
        tipo_documento_esperado: textoOuNull(evidencia?.tipoDocumentoEsperado),
        tipo_documento_identificado: textoOuNull(evidencia?.tipoDocumentoIdentificado),
        treinamento_esperado: textoOuNull(evidencia?.treinamentoEsperado),
        treinamento_identificado: textoOuNull(evidencia?.treinamentoIdentificado),
        confianca_identidade: numeroConfianca01(evidencia?.confiancaIdentidade),
        confianca_documento: numeroConfianca01(evidencia?.confiancaDocumento),
        confianca_treinamento: numeroConfianca01(evidencia?.confiancaTreinamento),
        status_integridade: texto(evidencia?.statusIntegridade) || INTEGRIDADE.REVISAO_MANUAL_NECESSARIA,
        duplicidade_mesmo_colaborador: evidencia?.duplicidadeMesmoColaborador === true,
        duplicidade_outro_colaborador: evidencia?.duplicidadeOutroColaborador === true,
        vinculo_fora_escopo: evidencia?.vinculoForaEscopo === true,
        vinculos_sha256: jsonSeguro(evidencia?.vinculosSha256, {}) || {},
        divergencias: jsonSeguro(evidencia?.divergencias, []) || [],
        verificacao_anterior: jsonSeguro(evidencia?.verificacaoAnterior, null),
        verificacao_reprocessada: jsonSeguro(evidencia?.verificacaoReprocessada, null),
        reprocessamento: jsonSeguro(evidencia?.reprocessamento, {}) || {},
    };
}

export function montarPayloadConclusaoRevisaoTreinamentos({
    previa,
    decisoesHumanas = {},
    conclusaoFingerprint = null,
} = {}) {
    if (!previa || previa?.readOnly !== true) {
        throw new Error("Prévia read-only inválida para conclusão da revisão.");
    }
    if (previa?.motorVersion !== TREINAMENTOS_REVISAO_MOTOR_VERSAO) {
        throw new Error("Versão do motor da prévia não corresponde ao motor ativo.");
    }
    if (!fingerprintValido(previa?.fonteFingerprint) || !fingerprintValido(previa?.previaFingerprint)) {
        throw new Error("Prévia sem fingerprints válidos para conclusão segura.");
    }
    if (!Array.isArray(previa?.itens) || !previa.itens.length) {
        throw new Error("A revisão deve possuir ao menos um treinamento para conclusão.");
    }

    const pItens = previa.itens.map((item) => {
        const decisao = decisaoHumana(decisoesHumanas, item);
        return {
            certificado_origem_id: item?.certificadoPrincipalId || null,
            treinamento_id: item?.treinamentoId || null,
            treinamento_codigo: inteiroPositivo(item?.treinamentoCodigo),
            nome_treinamento: texto(item?.treinamentoNome) || "Treinamento não identificado",
            data_realizacao_salva: dataIsoOuNull(item?.dataRealizacaoSalva),
            data_vencimento_salva: dataIsoOuNull(item?.dataVencimentoSalva),
            data_realizacao_revisada: dataIsoOuNull(item?.dataRealizacaoRevisada),
            data_vencimento_revisada: dataIsoOuNull(item?.dataVencimentoRevisada),
            status_temporal_anterior: texto(item?.statusTemporalAnteriorPersistencia) || "sem_data_suficiente",
            status_temporal_revisado: texto(item?.statusTemporalPersistencia) || "sem_data_suficiente",
            status_integridade: texto(item?.statusIntegridade) || INTEGRIDADE.REVISAO_MANUAL_NECESSARIA,
            resultado_geral: resultadoBanco(item?.statusRevisao),
            divergencias: jsonSeguro(item?.divergencias, []) || [],
            decisao_humana: textoOuNull(decisao?.decisao || decisao?.resultado),
            observacao_manual: textoOuNull(decisao?.observacao || decisao?.observacaoManual),
            evidencias: (Array.isArray(item?.evidencias) ? item.evidencias : []).map(evidenciaBanco),
            snapshot_motor: {
                chave: texto(item?.chave),
                status_revisao: texto(item?.statusRevisao),
                status_temporal_anterior: jsonSeguro(item?.statusTemporalAnterior, {}) || {},
                status_temporal_motor: jsonSeguro(item?.statusTemporalMotor, {}) || {},
                certificados_logicos_origem: jsonSeguro(item?.certificadosLogicosOrigem, []) || [],
                requer_revisao_humana: item?.requerRevisaoHumana === true,
            },
        };
    });

    const payload = {
        p_colaborador_id: validarUuid(previa?.colaborador?.id, "UUID do colaborador da prévia"),
        p_data_referencia: dataReferencia(previa?.dataReferencia),
        p_motor_versao: TREINAMENTOS_REVISAO_MOTOR_VERSAO,
        p_resumo: resumoBanco(previa, { conclusaoFingerprint }),
        p_itens: pItens,
    };
    JSON.stringify(payload);
    return payload;
}



const COLUNAS_HISTORICO_REVISAO = [
    "id",
    "colaborador_id",
    "empresa_id",
    "numero_revisao",
    "data_referencia",
    "status",
    "motor_versao",
    "schema_versao",
    "executado_por_email",
    "total_treinamentos",
    "total_conformes",
    "total_atencao",
    "total_vencidos",
    "total_divergentes",
    "total_sem_evidencia",
    "total_revisao_manual",
    "percentual_conformidade",
    "pdf_bucket",
    "pdf_caminho",
    "pdf_nome",
    "pdf_sha256",
    "pdf_tamanho_bytes",
    "pdf_gerado_em",
    "created_at",
].join(",");

function normalizarResumoHistoricoRevisao(registro = {}) {
    const pdfCaminho = texto(registro?.pdf_caminho);
    const pdfNome = texto(registro?.pdf_nome);

    return {
        id: texto(registro?.id),
        colaboradorId: texto(registro?.colaborador_id),
        empresaId: texto(registro?.empresa_id),
        numeroRevisao: Number(registro?.numero_revisao) || 0,
        dataReferencia: texto(registro?.data_referencia),
        status: texto(registro?.status),
        motorVersao: texto(registro?.motor_versao),
        schemaVersao: Number(registro?.schema_versao) || 0,
        executadoPorEmail: texto(registro?.executado_por_email),
        totalTreinamentos: Number(registro?.total_treinamentos) || 0,
        totalConformes: Number(registro?.total_conformes) || 0,
        totalAtencao: Number(registro?.total_atencao) || 0,
        totalVencidos: Number(registro?.total_vencidos) || 0,
        totalDivergentes: Number(registro?.total_divergentes) || 0,
        totalSemEvidencia: Number(registro?.total_sem_evidencia) || 0,
        totalRevisaoManual: Number(registro?.total_revisao_manual) || 0,
        percentualConformidade: Number(registro?.percentual_conformidade) || 0,
        createdAt: texto(registro?.created_at),
        pdfDisponivel: Boolean(pdfCaminho),
        pdf: pdfCaminho
            ? {
                bucket: texto(registro?.pdf_bucket),
                caminho: pdfCaminho,
                nome: pdfNome,
                sha256: texto(registro?.pdf_sha256),
                tamanhoBytes: Number(registro?.pdf_tamanho_bytes) || 0,
                geradoEm: texto(registro?.pdf_gerado_em),
            }
            : null,
    };
}

function normalizarItemHistoricoRevisao(registro = {}) {
    return {
        id: texto(registro?.id),
        revisaoId: texto(registro?.revisao_id),
        ordem: Number(registro?.ordem) || 0,
        certificadoOrigemId: texto(registro?.certificado_origem_id) || null,
        treinamentoId: texto(registro?.treinamento_id) || null,
        treinamentoCodigo: Number(registro?.treinamento_codigo) || null,
        nomeTreinamento: texto(registro?.nome_treinamento),
        dataRealizacaoSalva: texto(registro?.data_realizacao_salva),
        dataVencimentoSalva: texto(registro?.data_vencimento_salva),
        dataRealizacaoRevisada: texto(registro?.data_realizacao_revisada),
        dataVencimentoRevisada: texto(registro?.data_vencimento_revisada),
        statusTemporalAnterior: texto(registro?.status_temporal_anterior),
        statusTemporalRevisado: texto(registro?.status_temporal_revisado),
        statusIntegridade: texto(registro?.status_integridade),
        resultadoGeral: texto(registro?.resultado_geral),
        evidenciasTotal: Number(registro?.evidencias_total) || 0,
        divergencias: jsonSeguro(registro?.divergencias, []) || [],
        decisaoHumana: texto(registro?.decisao_humana),
        observacaoManual: texto(registro?.observacao_manual),
        evidencias: [],
    };
}

function normalizarEvidenciaHistoricoRevisao(registro = {}) {
    return {
        id: texto(registro?.id),
        revisaoId: texto(registro?.revisao_id),
        revisaoItemId: texto(registro?.revisao_item_id),
        ordem: Number(registro?.ordem) || 0,
        certificadoEvidenciaId: texto(registro?.certificado_evidencia_id) || null,
        certificadoOrigemId: texto(registro?.certificado_origem_id) || null,
        tipoEvidencia: texto(registro?.tipo_evidencia),
        arquivoNome: texto(registro?.arquivo_nome),
        arquivoUrl: texto(registro?.arquivo_url),
        arquivoSha256: texto(registro?.arquivo_sha256),
        tipoDocumentoEsperado: texto(registro?.tipo_documento_esperado),
        tipoDocumentoIdentificado: texto(registro?.tipo_documento_identificado),
        treinamentoEsperado: texto(registro?.treinamento_esperado),
        treinamentoIdentificado: texto(registro?.treinamento_identificado),
        statusIntegridade: texto(registro?.status_integridade),
        duplicidadeMesmoColaborador: registro?.duplicidade_mesmo_colaborador === true,
        duplicidadeOutroColaborador: registro?.duplicidade_outro_colaborador === true,
        vinculoForaEscopo: registro?.vinculo_fora_escopo === true,
        divergencias: jsonSeguro(registro?.divergencias, []) || [],
    };
}

export async function listarHistoricoRevisoesTreinamentosService({
    supabase,
    colaboradorId,
    limite = 50,
} = {}) {
    validarSupabase(supabase);
    const id = validarUuid(colaboradorId, "UUID do colaborador para histórico");
    const limiteSeguro = Math.max(1, Math.min(100, Number(limite) || 50));

    const { data, error } = await supabase
        .from("treinamentos_revisoes")
        .select(COLUNAS_HISTORICO_REVISAO)
        .eq("colaborador_id", id)
        .eq("status", "concluida")
        .order("numero_revisao", { ascending: false })
        .limit(limiteSeguro);

    if (error) {
        throw new Error(`Falha ao listar histórico de revisões: ${error.message}`);
    }

    const revisoes = (Array.isArray(data) ? data : [])
        .map(normalizarResumoHistoricoRevisao)
        .filter((revisao) => revisao.id && revisao.numeroRevisao > 0);

    return {
        colaboradorId: id,
        revisoes,
        total: revisoes.length,
        readOnly: true,
    };
}

export async function obterHistoricoRevisaoTreinamentosService({
    supabase,
    revisaoId,
    colaboradorId = null,
} = {}) {
    validarSupabase(supabase);
    const idRevisao = validarUuid(revisaoId, "UUID da revisão histórica");
    const idColaborador = colaboradorId
        ? validarUuid(colaboradorId, "UUID do colaborador do histórico")
        : null;

    let consultaRevisao = supabase
        .from("treinamentos_revisoes")
        .select(`${COLUNAS_HISTORICO_REVISAO},colaborador_snapshot,empresa_snapshot,resumo,snapshot`)
        .eq("id", idRevisao)
        .eq("status", "concluida");

    if (idColaborador) {
        consultaRevisao = consultaRevisao.eq("colaborador_id", idColaborador);
    }

    const { data: revisaoRegistro, error: erroRevisao } = await consultaRevisao.maybeSingle();
    if (erroRevisao) {
        throw new Error(`Falha ao abrir revisão histórica: ${erroRevisao.message}`);
    }
    if (!revisaoRegistro) {
        throw new Error("Revisão histórica não localizada para este colaborador.");
    }

    const [resultadoItens, resultadoEvidencias] = await Promise.all([
        supabase
            .from("treinamentos_revisao_itens")
            .select(
                "id,revisao_id,ordem,certificado_origem_id,treinamento_id,treinamento_codigo,nome_treinamento,data_realizacao_salva,data_vencimento_salva,data_realizacao_revisada,data_vencimento_revisada,status_temporal_anterior,status_temporal_revisado,status_integridade,resultado_geral,evidencias_total,divergencias,decisao_humana,observacao_manual,created_at"
            )
            .eq("revisao_id", idRevisao)
            .order("ordem", { ascending: true }),
        supabase
            .from("treinamentos_revisao_evidencias")
            .select(
                "id,revisao_id,revisao_item_id,ordem,certificado_evidencia_id,certificado_origem_id,tipo_evidencia,arquivo_nome,arquivo_url,arquivo_sha256,tipo_documento_esperado,tipo_documento_identificado,treinamento_esperado,treinamento_identificado,status_integridade,duplicidade_mesmo_colaborador,duplicidade_outro_colaborador,vinculo_fora_escopo,divergencias,created_at"
            )
            .eq("revisao_id", idRevisao)
            .order("ordem", { ascending: true }),
    ]);

    if (resultadoItens.error) {
        throw new Error(`Falha ao carregar itens da revisão histórica: ${resultadoItens.error.message}`);
    }
    if (resultadoEvidencias.error) {
        throw new Error(`Falha ao carregar evidências da revisão histórica: ${resultadoEvidencias.error.message}`);
    }

    const itens = (Array.isArray(resultadoItens.data) ? resultadoItens.data : [])
        .map(normalizarItemHistoricoRevisao);
    const itensPorId = new Map(itens.map((item) => [item.id, item]));

    for (const registro of Array.isArray(resultadoEvidencias.data) ? resultadoEvidencias.data : []) {
        const evidencia = normalizarEvidenciaHistoricoRevisao(registro);
        const item = itensPorId.get(evidencia.revisaoItemId);
        if (item) item.evidencias.push(evidencia);
    }

    return {
        revisao: {
            ...normalizarResumoHistoricoRevisao(revisaoRegistro),
            colaboradorSnapshot: jsonSeguro(revisaoRegistro?.colaborador_snapshot, {}) || {},
            empresaSnapshot: jsonSeguro(revisaoRegistro?.empresa_snapshot, {}) || {},
            resumo: jsonSeguro(revisaoRegistro?.resumo, {}) || {},
            snapshot: jsonSeguro(revisaoRegistro?.snapshot, {}) || {},
        },
        itens,
        totalItens: itens.length,
        totalEvidencias: itens.reduce((total, item) => total + item.evidencias.length, 0),
        readOnly: true,
    };
}

async function buscarRevisaoConcluidaPorFingerprint({ supabase, colaboradorId, conclusaoFingerprint }) {
    if (!fingerprintValido(conclusaoFingerprint)) return null;

    const { data, error } = await supabase
        .from("treinamentos_revisoes")
        .select("id, numero_revisao, total_treinamentos, percentual_conformidade, resumo, status, created_at")
        .eq("colaborador_id", colaboradorId)
        .eq("status", "concluida")
        .eq("resumo->>conclusao_fingerprint", conclusaoFingerprint)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(`Falha ao reconciliar conclusão da revisão: ${error.message}`);
    }
    return data || null;
}

function aguardarReconciliacao(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
}

async function reconciliarConclusaoPorFingerprint({
    supabase,
    colaboradorId,
    conclusaoFingerprint,
    maxTentativas = RECONCILIACAO_MAX_TENTATIVAS,
    intervaloMs = RECONCILIACAO_INTERVALO_MS,
} = {}) {
    let ultimoErro = null;
    const totalTentativas = Math.max(1, Number(maxTentativas) || 1);

    for (let tentativa = 1; tentativa <= totalTentativas; tentativa += 1) {
        if (tentativa > 1) {
            await aguardarReconciliacao(intervaloMs);
        }

        try {
            const revisao = await buscarRevisaoConcluidaPorFingerprint({
                supabase,
                colaboradorId,
                conclusaoFingerprint,
            });
            if (revisao) {
                return {
                    revisao,
                    tentativas: tentativa,
                    ultimoErro: null,
                };
            }
        } catch (error) {
            ultimoErro = error;
        }
    }

    return {
        revisao: null,
        tentativas: totalTentativas,
        ultimoErro,
    };
}

function retornoRevisaoReconciliada({
    revisao,
    colaboradorId,
    conclusaoFingerprint,
    tentativas,
} = {}) {
    const revisaoId = validarUuid(revisao?.id, "UUID da revisão reconciliada");
    const numeroRevisao = inteiroPositivo(revisao?.numero_revisao);
    if (!numeroRevisao) {
        throw new Error("Número da revisão reconciliada inválido.");
    }

    return {
        ok: true,
        revisao_id: revisaoId,
        numero_revisao: numeroRevisao,
        total_treinamentos: Number(revisao?.total_treinamentos) || 0,
        percentual_conformidade: Number(revisao?.percentual_conformidade) || 0,
        pdf_bucket: "revisoes-treinamentos",
        pdf_caminho_esperado: `${colaboradorId}/${revisaoId}/revisao-${numeroRevisao}.pdf`,
        conclusao_fingerprint: conclusaoFingerprint,
        reconciliada: true,
        resposta_rpc_perdida: true,
        tentativas_reconciliacao: Number(tentativas) || 1,
    };
}

async function validarPreviaAindaAtual({ supabase, previa }) {
    const atual = await recalcularFonteFingerprintRevisaoTreinamentosService({
        supabase,
        colaboradorId: previa?.colaborador?.id,
        shasReferencia: previa?.shasReferencia,
    });
    if (atual !== previa?.fonteFingerprint) {
        throw new Error("Prévia desatualizada. Os dados de origem mudaram; execute a revisão novamente antes de concluir.");
    }
    return atual;
}

export async function concluirRevisaoTreinamentosService({
    supabase,
    previa,
    decisoesHumanas = {},
    confirmarConclusao = false,
} = {}) {
    validarSupabase(supabase, { exigeRpc: true });
    if (confirmarConclusao !== true) {
        throw new Error("A conclusão da revisão exige confirmação explícita do usuário.");
    }

    const colaboradorId = validarUuid(previa?.colaborador?.id, "UUID do colaborador da prévia");
    if (CONCLUSOES_EM_ANDAMENTO.has(colaboradorId)) {
        throw new Error("Já existe uma conclusão de revisão em andamento para este colaborador.");
    }

    CONCLUSOES_EM_ANDAMENTO.add(colaboradorId);
    try {
        dataReferencia(previa?.dataReferencia);
        await validarPreviaAindaAtual({ supabase, previa });
        const conclusaoFingerprint = await gerarConclusaoFingerprintRevisaoTreinamentos({
            previa,
            decisoesHumanas,
        });
        const payload = montarPayloadConclusaoRevisaoTreinamentos({
            previa,
            decisoesHumanas,
            conclusaoFingerprint,
        });

        const { data, error } = await supabase.rpc(RPC_CONCLUIR, payload);
        if (!error) {
            return {
                ...(jsonSeguro(data, {}) || {}),
                conclusao_fingerprint: conclusaoFingerprint,
                reconciliada: false,
            };
        }

        const reconciliacao = await reconciliarConclusaoPorFingerprint({
            supabase,
            colaboradorId,
            conclusaoFingerprint,
        });
        if (reconciliacao.revisao) {
            return retornoRevisaoReconciliada({
                revisao: reconciliacao.revisao,
                colaboradorId,
                conclusaoFingerprint,
                tentativas: reconciliacao.tentativas,
            });
        }

        const detalheReconciliacao = reconciliacao.ultimoErro
            ? ` A leitura de reconciliação também falhou: ${reconciliacao.ultimoErro.message}.`
            : "";
        const erroConclusao = new Error(
            `Erro ao concluir revisão de treinamentos: ${error.message}.` +
            detalheReconciliacao +
            " Não foi possível confirmar se a transação chegou ao servidor; não repita a conclusão automaticamente."
        );
        erroConclusao.resultadoDesconhecido = true;
        erroConclusao.conclusaoFingerprint = conclusaoFingerprint;
        erroConclusao.erroRpcOriginal = jsonSeguro(error, {}) || {};
        erroConclusao.erroReconciliacao = reconciliacao.ultimoErro?.message || null;
        erroConclusao.tentativasReconciliacao = reconciliacao.tentativas;
        throw erroConclusao;
    } finally {
        CONCLUSOES_EM_ANDAMENTO.delete(colaboradorId);
    }
}
