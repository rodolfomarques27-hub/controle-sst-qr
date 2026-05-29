import { montarMensagemFluidaAuditoriaCampo } from "./auditoriaCampoService";
import { reduzirFotoParaAuditoria } from "./imagemService";
import { normalizarTextoBusca, sanitizarNomeArquivo } from "../utils/sstUtils";
import {
    carregarConfiguracaoAuditoriaPublicaSistema,
    TOKEN_AUDITORIA_CAMPO_PUBLICA_PADRAO,
} from "../constants/auditoriaPublicaConstants";

export { TOKEN_AUDITORIA_CAMPO_PUBLICA_PADRAO };

export function obterTokenAuditoriaCampoPublicaConfigurado() {
    return carregarConfiguracaoAuditoriaPublicaSistema().tokenPublico || TOKEN_AUDITORIA_CAMPO_PUBLICA_PADRAO;
}

export function obterParametrosAuditoriaCampoDiretaUrl() {
    if (typeof window === "undefined") return new URLSearchParams("");

    const parametrosNormais = new URLSearchParams(window.location.search || "");
    const hash = window.location.hash || "";
    const indiceConsultaHash = hash.indexOf("?");

    if (indiceConsultaHash >= 0) {
        const queryHash = hash.slice(indiceConsultaHash + 1);
        const parametrosHash = new URLSearchParams(queryHash);

        parametrosNormais.forEach((valor, chave) => {
            if (!parametrosHash.has(chave)) {
                parametrosHash.set(chave, valor);
            }
        });

        return parametrosHash;
    }

    return parametrosNormais;
}

export function extrairParametrosAuditoriaCampoDireta(parametros = new URLSearchParams("")) {
    return {
        tipoParametro: parametros.get("tipo") || parametros.get("tipo_auditoria") || "area",
        identificacaoParametro: parametros.get("id") || parametros.get("maquina") || parametros.get("equipamento") || "",
        areaParametro: parametros.get("area") || "",
        localParametro: parametros.get("local") || "",
        empresaParametro: parametros.get("empresa") || parametros.get("empresa_responsavel") || "",
        subareaParametro: parametros.get("subarea") || "",
        tokenParametro: parametros.get("token") || parametros.get("chave") || "",
    };
}

export function montarLinkAuditoriaCampoDireta({ origem = "", token = "", parametrosExtras = {} } = {}) {
    const params = new URLSearchParams();

    if (token) {
        params.set("token", token);
    }

    Object.entries(parametrosExtras || {}).forEach(([chave, valor]) => {
        if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
            params.set(chave, String(valor));
        }
    });

    const consulta = params.toString();
    return `${origem}/#/auditoria-campo${consulta ? `?${consulta}` : ""}`;
}

export function criarFormularioInicialAuditoriaCampoDireta({
    tipoInicial,
    identificacaoParametro = "",
    areaParametro = "",
    subareaParametro = "",
    localParametro = "",
    empresaParametro = "",
} = {}) {
    return {
        tipoAuditoria: tipoInicial?.valor || "area",
        categoriaAuditoria: "isolamento",
        titulo: identificacaoParametro
            ? `Auditoria de campo - ${tipoInicial?.label || "Área"} ${identificacaoParametro}`
            : `Auditoria de campo - ${tipoInicial?.label || "Área"}`,
        area: areaParametro,
        subarea: subareaParametro,
        local: localParametro,
        maquinaEquipamento: identificacaoParametro,
        empresaResponsavel: empresaParametro,
        auditorNome: "",
        grauRisco: "Baixo",
        situacaoEncontrada: "",
        acaoRecomendada: "",
        responsavelTratativa: "",
        emailResponsavel: "",
        whatsappResponsavel: "",
        nomeTstResponsavel: "",
        emailTstResponsavel: "",
        whatsappTstResponsavel: "",
        prazoAdequacao: "",
        statusAuditoria: "Aberta",
        fotoAntes: null,
        fotoDepois: null,
        observacoesGerais: "",
    };
}

function normalizarNomeEmpresaAuditoria(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

export function listarEmpresasAuditoriaCampoDireta(empresasBanco = []) {
    const mapa = new Map();

    (empresasBanco || []).forEach((empresa) => {
        if (!empresa?.nome) return;
        const chave = normalizarNomeEmpresaAuditoria(empresa.nome);
        if (!mapa.has(chave)) mapa.set(chave, empresa);
    });

    return Array.from(mapa.values())
        .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
}

export function encontrarEmpresaAuditoriaCampoDireta(empresasAuditoriaCampo = [], nomeEmpresa = "") {
    const nomeNormalizado = normalizarTextoBusca(nomeEmpresa).trim();

    if (!nomeNormalizado) return null;

    return empresasAuditoriaCampo.find((empresa) =>
        normalizarTextoBusca(empresa.nome).trim() === nomeNormalizado
    ) || null;
}

export function obterContatosEmpresaAuditoriaCampoDireta(empresaSelecionadaAuditoria) {
    if (!empresaSelecionadaAuditoria) {
        return {
            responsavel: "",
            email: "",
            whatsapp: "",
            tstResponsavel: "",
            tstEmail: "",
            tstWhatsapp: "",
        };
    }

    return {
        responsavel: empresaSelecionadaAuditoria.responsavel_auditoria || empresaSelecionadaAuditoria.responsavel || "",
        email: empresaSelecionadaAuditoria.email_auditoria || empresaSelecionadaAuditoria.email || "",
        whatsapp: empresaSelecionadaAuditoria.whatsapp_auditoria || empresaSelecionadaAuditoria.telefone || "",
        tstResponsavel: empresaSelecionadaAuditoria.tst_responsavel || "",
        tstEmail: empresaSelecionadaAuditoria.tst_email || "",
        tstWhatsapp: empresaSelecionadaAuditoria.tst_whatsapp || "",
    };
}

export function aplicarContatosEmpresaAuditoriaCampoDireta(formularioAtual, empresa, nomeEmpresa = "") {
    if (!empresa) {
        return {
            ...formularioAtual,
            empresaResponsavel: nomeEmpresa,
        };
    }

    const contatos = obterContatosEmpresaAuditoriaCampoDireta(empresa);

    return {
        ...formularioAtual,
        empresaResponsavel: empresa.nome,
        responsavelTratativa: formularioAtual.responsavelTratativa || contatos.responsavel,
        emailResponsavel: contatos.email || formularioAtual.emailResponsavel,
        whatsappResponsavel: contatos.whatsapp || formularioAtual.whatsappResponsavel,
        nomeTstResponsavel: contatos.tstResponsavel || formularioAtual.nomeTstResponsavel,
        emailTstResponsavel: contatos.tstEmail || formularioAtual.emailTstResponsavel,
        whatsappTstResponsavel: contatos.tstWhatsapp || formularioAtual.whatsappTstResponsavel,
    };
}

export function montarTextoNotificacaoAuditoriaCampoDireta({ formulario, tipoAtual }) {
    return [
        `Auditoria de campo: ${formulario.titulo || "Sem título"}`,
        `Tipo: ${tipoAtual.label}`,
        `Empresa responsável: ${formulario.empresaResponsavel || "Não informada"}`,
        `Área: ${formulario.area || "Não informada"}`,
        `Local: ${formulario.local || "Não informado"}`,
        `Grau de risco: ${formulario.grauRisco}`,
        `Status: ${formulario.statusAuditoria}`,
        `Auditor: ${formulario.auditorNome || "Não informado"}`,
        "",
        `Situação encontrada: ${formulario.situacaoEncontrada || "Não informada"}`,
        `Ação recomendada: ${formulario.acaoRecomendada || "Não informada"}`,
        `Responsável pela tratativa: ${formulario.responsavelTratativa || "Não informado"}`,
        `Prazo: ${formulario.prazoAdequacao || "Não informado"}`,
    ].join("\n");
}

export function formatarWhatsappBrasilAuditoriaCampoDireta(valor = "") {
    const apenasDigitos = String(valor || "").replace(/\D/g, "");

    if (!apenasDigitos) return "";

    return apenasDigitos.startsWith("55") ? apenasDigitos : `55${apenasDigitos}`;
}

export function montarLinksNotificacaoAuditoriaCampoDireta({ formulario, tipoAtual, contatosEmpresaAuditoria, textoNotificacaoResponsavel }) {
    const assuntoNotificacaoResponsavel = `Auditoria de campo - ${formulario.grauRisco || "Risco"} - ${formulario.titulo || tipoAtual.label}`;
    const emailResponsavelAuditoria = String(formulario.emailResponsavel || "").trim();
    const whatsappResponsavelFormatado = formatarWhatsappBrasilAuditoriaCampoDireta(formulario.whatsappResponsavel);
    const emailTstAuditoria = String(formulario.emailTstResponsavel || contatosEmpresaAuditoria.tstEmail || "").trim();
    const whatsappTstFormatado = formatarWhatsappBrasilAuditoriaCampoDireta(formulario.whatsappTstResponsavel || contatosEmpresaAuditoria.tstWhatsapp);

    return {
        assuntoNotificacaoResponsavel,
        emailResponsavelAuditoria,
        whatsappResponsavelFormatado,
        linkEmailResponsavel: emailResponsavelAuditoria
            ? `mailto:${emailResponsavelAuditoria}?subject=${encodeURIComponent(assuntoNotificacaoResponsavel)}&body=${encodeURIComponent(textoNotificacaoResponsavel)}`
            : "",
        linkWhatsappResponsavel: whatsappResponsavelFormatado
            ? `https://wa.me/${whatsappResponsavelFormatado}?text=${encodeURIComponent(textoNotificacaoResponsavel)}`
            : "",
        emailTstAuditoria,
        whatsappTstFormatado,
        linkEmailTstAuditoria: emailTstAuditoria
            ? `mailto:${emailTstAuditoria}?subject=${encodeURIComponent(assuntoNotificacaoResponsavel)}&body=${encodeURIComponent(textoNotificacaoResponsavel)}`
            : "",
        linkWhatsappTstAuditoria: whatsappTstFormatado
            ? `https://wa.me/${whatsappTstFormatado}?text=${encodeURIComponent(textoNotificacaoResponsavel)}`
            : "",
    };
}

export function validarFormularioAuditoriaCampoDireta(formulario) {
    if (!formulario.tipoAuditoria) return "Selecione o tipo de auditoria.";
    if (!formulario.titulo.trim()) return "Informe o título/assunto da auditoria.";
    if (!formulario.local.trim() && !formulario.area.trim() && !formulario.maquinaEquipamento.trim()) {
        return "Informe ao menos área, local ou máquina/equipamento.";
    }
    if (!formulario.situacaoEncontrada.trim()) return "Descreva a situação encontrada.";

    return "";
}

export function montarChecklistDinamicoAuditoriaCampoDireta(resultado) {
    return (resultado?.itens || []).map((item) => ({
        pergunta: item.pergunta,
        resposta: item.resposta.chave,
        respostaTexto: item.resposta.texto,
        pontos: item.resposta.pontos,
    }));
}

export async function gerarNumeroAuditoriaCampoDireta(supabaseClient) {
    const { data, error } = await supabaseClient.rpc("gerar_numero_auditoria_campo");
    if (!error && data) return data;

    const ano = new Date().getFullYear();
    return `AUD-${ano}-${String(Date.now()).slice(-4)}`;
}

export async function uploadFotoAuditoriaCampoDireta({ supabaseClient, arquivo, numeroAuditoria, tipo, validarArquivoAntesUpload }) {
    if (!arquivo) return "";

    const otimizada = await reduzirFotoParaAuditoria(arquivo, { maxLado: 1400, alvoBytes: 800 * 1024 });

    if (!validarArquivoAntesUpload(otimizada, "fotoAuditoria")) {
        throw new Error("A foto ficou acima do limite mesmo após a redução automática.");
    }

    const nomeSeguro = sanitizarNomeArquivo(otimizada.name || `${tipo}.jpg`);
    const caminho = `auditorias-publicas/${numeroAuditoria}/${tipo}-${Date.now()}-${nomeSeguro}`;
    const { error } = await supabaseClient.storage.from("auditorias-campo").upload(caminho, otimizada, {
        cacheControl: "3600",
        upsert: true,
        contentType: otimizada.type || "image/jpeg",
    });

    if (error) throw new Error(`Erro ao enviar ${tipo}: ${error.message}`);

    return caminho;
}

export function montarPayloadAuditoriaCampoDireta({
    formulario,
    resultado,
    categoriaAtual,
    tipoAtual,
    tokenParametro,
    contatosEmpresaAuditoria,
    emailResponsavelAuditoria,
    whatsappResponsavelFormatado,
    emailTstAuditoria,
    whatsappTstFormatado,
    textoNotificacaoResponsavel,
    fotoAntesUrl = "",
    fotoDepoisUrl = "",
} = {}) {
    const checklistDinamico = montarChecklistDinamicoAuditoriaCampoDireta(resultado);

    return {
        tipo_auditoria: formulario.tipoAuditoria,
        titulo: formulario.titulo.trim(),
        area: formulario.area.trim() || null,
        subarea: formulario.subarea.trim() || null,
        local: formulario.local.trim() || null,
        maquina_equipamento: formulario.maquinaEquipamento.trim() || null,
        empresa_responsavel: formulario.empresaResponsavel.trim() || null,
        empresa_nome: formulario.empresaResponsavel.trim() || null,
        auditor_nome: formulario.auditorNome.trim() || "Não informado",
        grau_risco: formulario.grauRisco,
        situacao_encontrada: formulario.situacaoEncontrada.trim(),
        acao_recomendada: formulario.acaoRecomendada.trim() || null,
        responsavel_tratativa: formulario.responsavelTratativa.trim() || null,
        prazo_adequacao: formulario.prazoAdequacao || null,
        status_auditoria: formulario.statusAuditoria,
        status_desvio: formulario.statusAuditoria === "Resolvida" ? "Corrigido" : "Aberto",
        foto_antes_url: fotoAntesUrl || null,
        foto_depois_url: fotoDepoisUrl || null,
        observacoes_gerais: formulario.observacoesGerais.trim() || null,
        observacao: formulario.observacoesGerais.trim() || formulario.situacaoEncontrada.trim(),
        checklist: checklistDinamico,
        checklist_dinamico: checklistDinamico,
        pontuacao: resultado.percentual ?? 0,
        classificacao: resultado.classificacao || "Sem avaliação",
        tem_desvio_grave: Boolean(resultado.temDesvioGrave),
        categoria_desvio_principal: categoriaAtual.label,
        total_desvios: ["Aberta", "Em andamento", "Vencida"].includes(formulario.statusAuditoria) ? 1 : 0,
        origem: "Link direto / auditoria-campo",
        token_qr: tokenParametro || null,
        notificacao: {
            titulo: formulario.titulo.trim(),
            mensagem: montarMensagemFluidaAuditoriaCampo({
                numeroAuditoria: "Será gerado ao salvar",
                tipoAuditoria: tipoAtual.label,
                titulo: formulario.titulo.trim(),
                area: formulario.area.trim(),
                local: formulario.local.trim(),
                maquinaEquipamento: formulario.maquinaEquipamento.trim(),
                empresaResponsavel: formulario.empresaResponsavel.trim(),
                auditorNome: formulario.auditorNome.trim() || "Não informado",
                grauRisco: formulario.grauRisco,
                classificacao: resultado.classificacao,
                pontuacao: resultado.percentual ?? 0,
                statusAuditoria: formulario.statusAuditoria,
                responsavelTratativa: formulario.responsavelTratativa.trim(),
                prazoAdequacao: formulario.prazoAdequacao,
            }, { tipo: tipoAtual.label, titulo: formulario.titulo.trim() }),
            auditor: formulario.auditorNome.trim() || "Não informado",
            emailResponsavel: emailResponsavelAuditoria || null,
            whatsappResponsavel: whatsappResponsavelFormatado || null,
            nomeTstResponsavel: formulario.nomeTstResponsavel || contatosEmpresaAuditoria.tstResponsavel || null,
            emailTstResponsavel: emailTstAuditoria || null,
            whatsappTstResponsavel: whatsappTstFormatado || null,
            textoEnvio: textoNotificacaoResponsavel,
            complementos: formulario.acaoRecomendada ? [formulario.acaoRecomendada.trim()] : [],
        },
    };
}
