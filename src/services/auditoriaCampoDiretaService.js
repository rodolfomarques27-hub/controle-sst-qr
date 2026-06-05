import { montarMensagemFluidaAuditoriaCampo } from "./auditoriaCampoService";
import { reduzirFotoParaAuditoria } from "./imagemService";
import { normalizarTextoBusca, sanitizarNomeArquivo } from "../utils/sstUtils";
import { obterTokenAuditoriaPublicaUrl } from "../constants/auditoriaPublicaConstants";

export function obterTokenAuditoriaCampoPublicaConfigurado() {
    return String(obterTokenAuditoriaPublicaUrl() || "").trim();
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
        codigoQrParametro: parametros.get("codigo_qr") || parametros.get("codigoQr") || parametros.get("qr") || parametros.get("codigo") || "",
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


export function valorAuditoriaCampoInformado(valor = "") {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    const normalizado = normalizarTextoBusca(texto).replace(/\s+/g, " ").trim();

    if (["nao aplicavel", "nao se aplica", "n/a", "na", "nao informado", "nao informada"].includes(normalizado)) {
        return "";
    }

    return texto;
}

export function formatarDataAuditoriaCampoDireta(valor = "") {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    const formatoIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (formatoIso) {
        return `${formatoIso[3]}/${formatoIso[2]}/${formatoIso[1]}`;
    }

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return texto;

    return data.toLocaleDateString("pt-BR");
}

export function formatarNumeroAuditoriaCampoDireta(valor = "") {
    const texto = String(valor || "").trim();
    if (!texto) return "";

    const encontrado = texto.match(/^AUD-(\d{4})-(\d+)$/i);
    if (!encontrado) return texto;

    return `AUD-${String(encontrado[2]).padStart(4, "0")}-${encontrado[1]}`;
}

export function formatarTelefoneAuditoriaCampoDireta(valor = "") {
    const digitos = String(valor || "").replace(/\D/g, "").slice(0, 11);

    if (!digitos) return "";

    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 2)} ${digitos.slice(2)}`;
    if (digitos.length <= 10) return `${digitos.slice(0, 2)} ${digitos.slice(2, 6)}-${digitos.slice(6)}`;

    return `${digitos.slice(0, 2)} ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

function adicionarLinhaResumoAuditoria(linhas, label, valor, { data = false } = {}) {
    const texto = valorAuditoriaCampoInformado(valor);
    if (!texto) return;

    linhas.push(`${label}: ${data ? formatarDataAuditoriaCampoDireta(texto) : texto}`);
}

export function montarTextoNotificacaoAuditoriaCampoDireta({ formulario, tipoAtual, numeroAuditoria = "" }) {
    const numero = formatarNumeroAuditoriaCampoDireta(numeroAuditoria || formulario?.numeroAuditoria || formulario?.numero_auditoria || "");
    const linhas = [
        "Prezado,",
        "",
        numero
            ? `Foi realizada uma nova auditoria de campo nº ${numero}. Seguem abaixo as informações para acompanhamento e tratativa.`
            : "Foi realizada uma nova auditoria de campo. Seguem abaixo as informações para acompanhamento e tratativa.",
        "",
        "Resumo técnico da auditoria:",
    ];

    adicionarLinhaResumoAuditoria(linhas, "Tipo", tipoAtual?.label || formulario?.tipoAuditoria);
    adicionarLinhaResumoAuditoria(linhas, "Empresa responsável", formulario?.empresaResponsavel);
    adicionarLinhaResumoAuditoria(linhas, "Área", formulario?.area);
    adicionarLinhaResumoAuditoria(linhas, "Subárea", formulario?.subarea);
    adicionarLinhaResumoAuditoria(linhas, "Local", formulario?.local);
    adicionarLinhaResumoAuditoria(linhas, "Máquina/equipamento", formulario?.maquinaEquipamento);
    adicionarLinhaResumoAuditoria(linhas, "Grau de risco", formulario?.grauRisco);
    adicionarLinhaResumoAuditoria(linhas, "Status", formulario?.statusAuditoria);
    adicionarLinhaResumoAuditoria(linhas, "Auditor", formulario?.auditorNome);
    adicionarLinhaResumoAuditoria(linhas, "Responsável pela tratativa", formulario?.responsavelTratativa);
    adicionarLinhaResumoAuditoria(linhas, "Prazo para adequação", formulario?.prazoAdequacao, { data: true });

    const situacao = valorAuditoriaCampoInformado(formulario?.situacaoEncontrada);
    if (situacao) {
        linhas.push("", "Situação encontrada:", situacao);
    }

    const acao = valorAuditoriaCampoInformado(formulario?.acaoRecomendada);
    if (acao) {
        linhas.push("", "Ação recomendada:", acao);
    }

    const observacoes = valorAuditoriaCampoInformado(formulario?.observacoesGerais);
    if (observacoes) {
        linhas.push("", "Observações complementares:", observacoes);
    }

    if (formulario?.fotoAntes || formulario?.fotoDepois) {
        linhas.push("", "Evidências:", "As fotos/evidências foram anexadas ao registro da auditoria no sistema.");
    }

    linhas.push("", "Em caso de dúvida, fico à disposição para orientar a tratativa e acompanhar a regularização.");

    return linhas.join("\n");
}

export function montarResumoAuditoriaCampoDiretaFinal({ auditoria = {}, formulario = {}, tipoAtual = {} } = {}) {
    const numero = auditoria.numeroAuditoria || auditoria.numero_auditoria || formulario.numeroAuditoria || formulario.numero_auditoria || auditoria.id || "";
    const formularioResumo = {
        tipoAuditoria: formulario.tipoAuditoria || auditoria.tipoAuditoria || auditoria.tipo_auditoria,
        empresaResponsavel: formulario.empresaResponsavel || auditoria.empresaResponsavel || auditoria.empresa_responsavel || auditoria.empresaNome || auditoria.empresa_nome,
        area: formulario.area || auditoria.area,
        subarea: formulario.subarea || auditoria.subarea,
        local: formulario.local || auditoria.local,
        maquinaEquipamento: formulario.maquinaEquipamento || auditoria.maquinaEquipamento || auditoria.maquina_equipamento,
        grauRisco: formulario.grauRisco || auditoria.grauRisco || auditoria.grau_risco,
        statusAuditoria: formulario.statusAuditoria || auditoria.statusAuditoria || auditoria.status_auditoria,
        auditorNome: formulario.auditorNome || auditoria.auditorNome || auditoria.auditor_nome,
        responsavelTratativa: formulario.responsavelTratativa || auditoria.responsavelTratativa || auditoria.responsavel_tratativa,
        prazoAdequacao: formulario.prazoAdequacao || auditoria.prazoAdequacao || auditoria.prazo_adequacao,
        situacaoEncontrada: formulario.situacaoEncontrada || auditoria.situacaoEncontrada || auditoria.situacao_encontrada,
        acaoRecomendada: formulario.acaoRecomendada || auditoria.acaoRecomendada || auditoria.acao_recomendada,
        observacoesGerais: formulario.observacoesGerais || auditoria.observacoesGerais || auditoria.observacoes_gerais,
        fotoAntes: formulario.fotoAntes || auditoria.fotoAntesUrl || auditoria.foto_antes_url,
        fotoDepois: formulario.fotoDepois || auditoria.fotoDepoisUrl || auditoria.foto_depois_url,
    };

    return montarTextoNotificacaoAuditoriaCampoDireta({
        formulario: formularioResumo,
        tipoAtual,
        numeroAuditoria: numero,
    });
}

export function formatarWhatsappBrasilAuditoriaCampoDireta(valor = "") {
    const apenasDigitos = String(valor || "").replace(/\D/g, "");

    if (!apenasDigitos) return "";

    if (apenasDigitos.startsWith("55") && apenasDigitos.length >= 12) {
        return apenasDigitos;
    }

    return `55${apenasDigitos}`;
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
    codigoQrParametro = "",
    linkOrigemQrCampo = "",
} = {}) {
    const checklistDinamico = montarChecklistDinamicoAuditoriaCampoDireta(resultado);
    const codigoQrCampo = String(codigoQrParametro || "").trim();
    const linkQrCampo = String(linkOrigemQrCampo || "").trim();
    const observacoesOriginais = formulario.observacoesGerais.trim();
    const registroOrigemQr = codigoQrCampo ? `QR Code de campo vinculado: ${codigoQrCampo}` : "";
    const observacoesComRastreio = [observacoesOriginais, registroOrigemQr].filter(Boolean).join("\n");
    const origemAuditoria = codigoQrCampo ? `QR Code de campo / ${codigoQrCampo}` : "Link direto / auditoria-campo";

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
        observacoes_gerais: observacoesComRastreio || null,
        observacao: observacoesOriginais || formulario.situacaoEncontrada.trim(),
        checklist: checklistDinamico,
        checklist_dinamico: checklistDinamico,
        pontuacao: resultado.percentual ?? 0,
        classificacao: resultado.classificacao || "Sem avaliação",
        tem_desvio_grave: Boolean(resultado.temDesvioGrave),
        categoria_desvio_principal: categoriaAtual.label,
        total_desvios: ["Aberta", "Em andamento", "Vencida"].includes(formulario.statusAuditoria) ? 1 : 0,
        origem: origemAuditoria,
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
            qrCodeCampo: codigoQrCampo ? {
                codigo: codigoQrCampo,
                link: linkQrCampo || null,
                tipo: tipoAtual.valor,
                tipoLabel: tipoAtual.label,
                alvo: formulario.maquinaEquipamento.trim() || formulario.area.trim() || formulario.local.trim() || null,
                maquinaEquipamento: formulario.maquinaEquipamento.trim() || null,
                area: formulario.area.trim() || null,
                local: formulario.local.trim() || null,
                empresaResponsavel: formulario.empresaResponsavel.trim() || null,
            } : null,
        },
    };
}
