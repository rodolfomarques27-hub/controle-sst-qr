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
        empresaId: null,
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

function normalizarTelefoneAuditoriaCampo(valor = "") {
    return String(valor || "").replace(/\D/g, "");
}

export function formatarTelefoneAuditoriaCampoDireta(valor = "") {
    const digitosOriginais = normalizarTelefoneAuditoriaCampo(valor);
    const digitos = digitosOriginais.startsWith("55") && digitosOriginais.length > 11
        ? digitosOriginais.slice(2)
        : digitosOriginais;

    if (!digitos) return "";
    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 2)} ${digitos.slice(2)}`;

    const ddd = digitos.slice(0, 2);
    const restante = digitos.slice(2, 11);

    if (restante.length <= 4) return `${ddd} ${restante}`;

    const parteInicial = restante.length >= 9 ? restante.slice(0, 5) : restante.slice(0, 4);
    const parteFinal = restante.length >= 9 ? restante.slice(5, 9) : restante.slice(4, 8);

    return `${ddd} ${parteInicial}${parteFinal ? `-${parteFinal}` : ""}`.trim();
}

export function formatarDataAuditoriaCampoDireta(valor = "") {
    if (!valor) return "";

    const texto = String(valor || "").trim();
    if (!texto) return "";

    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        return `${iso[3]}/${iso[2]}/${iso[1]}`;
    }

    const br = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (br) {
        const dia = br[1].padStart(2, "0");
        const mes = br[2].padStart(2, "0");
        const ano = br[3].length === 2 ? `20${br[3]}` : br[3];
        return `${dia}/${mes}/${ano}`;
    }

    const data = new Date(texto);
    if (Number.isNaN(data.getTime())) return texto;

    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const ano = data.getFullYear();

    return `${dia}/${mes}/${ano}`;
}

function normalizarEmpresaAuditoriaCampoDireta(empresa = {}) {
    const nome = String(empresa.nome || empresa.empresa_nome || empresa.razao_social || "").trim();

    if (!nome) return null;

    return {
        id: empresa.id || empresa.empresa_id || null,
        nome,
        status: empresa.status || "",
        tipo_empresa: empresa.tipo_empresa || empresa.tipoEmpresa || "",
        responsavel: empresa.responsavel_auditoria || empresa.responsavel || "",
        email: empresa.email_auditoria || empresa.email || "",
        telefone: formatarTelefoneAuditoriaCampoDireta(empresa.whatsapp_auditoria || empresa.telefone || empresa.whatsapp || ""),
        responsavel_auditoria: empresa.responsavel_auditoria || empresa.responsavel || "",
        email_auditoria: empresa.email_auditoria || empresa.email || "",
        whatsapp_auditoria: formatarTelefoneAuditoriaCampoDireta(empresa.whatsapp_auditoria || empresa.telefone || empresa.whatsapp || ""),
        tst_responsavel: empresa.tst_responsavel || "",
        tst_email: empresa.tst_email || "",
        tst_whatsapp: formatarTelefoneAuditoriaCampoDireta(empresa.tst_whatsapp || ""),
    };
}

export async function carregarEmpresasAuditoriaPublicaControlada({
    supabaseClient,
    tokenPublico = "",
    senha = "",
} = {}) {
    if (!supabaseClient) {
        return {
            ok: false,
            empresas: [],
            erro: "Cliente Supabase indisponível para carregar empresas.",
        };
    }

    const token = String(tokenPublico || "").trim();
    const senhaSegura = String(senha || "").trim();

    try {
        const { data, error } = await supabaseClient.rpc("listar_empresas_auditoria_publica", {
            p_token: token,
            p_senha: senhaSegura,
        });

        if (!error && Array.isArray(data)) {
            return {
                ok: true,
                origem: "rpc",
                empresas: data.map(normalizarEmpresaAuditoriaCampoDireta).filter(Boolean),
                erro: "",
            };
        }
    } catch {
        // Se a RPC ainda não existir no Supabase, tenta a consulta direta abaixo.
    }

    try {
        const { data, error } = await supabaseClient
            .from("empresas")
            .select("id, nome, status, tipo_empresa, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, tst_responsavel, tst_email, tst_whatsapp")
            .order("nome", { ascending: true });

        if (error) {
            return {
                ok: false,
                origem: "supabase",
                empresas: [],
                erro: error.message || "A lista de empresas está protegida pelo Supabase.",
            };
        }

        return {
            ok: true,
            origem: "supabase",
            empresas: (data || []).map(normalizarEmpresaAuditoriaCampoDireta).filter(Boolean),
            erro: "",
        };
    } catch (error) {
        return {
            ok: false,
            origem: "supabase",
            empresas: [],
            erro: error?.message || "Não foi possível carregar a lista controlada de empresas.",
        };
    }
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
        whatsapp: formatarTelefoneAuditoriaCampoDireta(empresaSelecionadaAuditoria.whatsapp_auditoria || empresaSelecionadaAuditoria.telefone || ""),
        tstResponsavel: empresaSelecionadaAuditoria.tst_responsavel || "",
        tstEmail: empresaSelecionadaAuditoria.tst_email || "",
        tstWhatsapp: formatarTelefoneAuditoriaCampoDireta(empresaSelecionadaAuditoria.tst_whatsapp || ""),
    };
}

export function aplicarContatosEmpresaAuditoriaCampoDireta(formularioAtual, empresa, nomeEmpresa = "") {
    if (!empresa) {
        return {
            ...formularioAtual,
            empresaResponsavel: nomeEmpresa,
            empresaId: null,
        };
    }

    const contatos = obterContatosEmpresaAuditoriaCampoDireta(empresa);

    return {
        ...formularioAtual,
        empresaResponsavel: empresa.nome,
        empresaId: empresa.id || null,
        responsavelTratativa: formularioAtual.responsavelTratativa || contatos.responsavel,
        emailResponsavel: contatos.email || formularioAtual.emailResponsavel,
        whatsappResponsavel: contatos.whatsapp || formularioAtual.whatsappResponsavel,
        nomeTstResponsavel: contatos.tstResponsavel || formularioAtual.nomeTstResponsavel,
        emailTstResponsavel: contatos.tstEmail || formularioAtual.emailTstResponsavel,
        whatsappTstResponsavel: contatos.tstWhatsapp || formularioAtual.whatsappTstResponsavel,
    };
}

export function montarTextoNotificacaoAuditoriaCampoDireta({
    formulario,
    tipoAtual,
    numeroAuditoria = "",
    fotoAntesUrl = "",
    fotoDepoisUrl = "",
    saudacao = false,
} = {}) {
    const linhas = [];

    if (saudacao) {
        linhas.push("Olá! Tudo bem?", "");
        linhas.push(`O registro da auditoria ${numeroAuditoria || "de campo"} foi concluído com sucesso.`);
        linhas.push("");
        linhas.push("Resumo da auditoria:");
    } else {
        linhas.push(`Auditoria de campo: ${formulario.titulo || "Sem título"}`);
    }

    const adicionar = (rotulo, valor) => {
        const texto = String(valor || "").trim();
        if (!texto) return;
        linhas.push(`${rotulo}: ${texto}`);
    };

    adicionar("Tipo", tipoAtual?.label || formulario.tipoAuditoria);
    adicionar("Empresa responsável", formulario.empresaResponsavel);
    adicionar("Área", formulario.area);
    adicionar("Subárea", formulario.subarea);
    adicionar("Local", formulario.local);
    adicionar("Máquina/equipamento", formulario.maquinaEquipamento);
    adicionar("Grau de risco", formulario.grauRisco);
    adicionar("Status", formulario.statusAuditoria);
    adicionar("Auditor", formulario.auditorNome);
    adicionar("Responsável pela tratativa", formulario.responsavelTratativa);
    adicionar("Prazo para adequação", formatarDataAuditoriaCampoDireta(formulario.prazoAdequacao));

    if (formulario.situacaoEncontrada) {
        linhas.push("", "Situação encontrada:", formulario.situacaoEncontrada.trim());
    }

    if (formulario.acaoRecomendada) {
        linhas.push("", "Ação recomendada:", formulario.acaoRecomendada.trim());
    }

    const fotos = [
        fotoAntesUrl ? "Foto antes anexada à auditoria." : "",
        fotoDepoisUrl ? "Foto depois anexada à auditoria." : "",
    ].filter(Boolean);

    if (fotos.length > 0) {
        linhas.push("", "Evidências fotográficas:", ...fotos);
        linhas.push("As fotos ficam disponíveis no registro da auditoria no sistema.");
    }

    if (saudacao) {
        linhas.push("", "Por favor, avaliar a tratativa, executar as ações necessárias e retornar com as evidências de correção quando aplicável.");
    }

    return linhas.join("\n").trim();
}

export function montarResumoAuditoriaCampoDireta({ auditoria = {}, formulario = {}, tipoAtual = {}, fotoAntesUrl = "", fotoDepoisUrl = "" } = {}) {
    return montarTextoNotificacaoAuditoriaCampoDireta({
        formulario,
        tipoAtual,
        numeroAuditoria: auditoria.numeroAuditoria || auditoria.numero_auditoria || auditoria.id || "",
        fotoAntesUrl: fotoAntesUrl || auditoria.fotoAntesUrl || auditoria.foto_antes_url || "",
        fotoDepoisUrl: fotoDepoisUrl || auditoria.fotoDepoisUrl || auditoria.foto_depois_url || "",
        saudacao: true,
    });
}

export function formatarWhatsappBrasilAuditoriaCampoDireta(valor = "") {
    const apenasDigitos = normalizarTelefoneAuditoriaCampo(valor);

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
        empresa_id: formulario.empresaId || null,
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
                prazoAdequacao: formatarDataAuditoriaCampoDireta(formulario.prazoAdequacao),
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
