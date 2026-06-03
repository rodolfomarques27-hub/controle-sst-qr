import { supabase } from "../lib/supabaseClient";

export const CHAVE_CONFIG_EVENTOS_AUDITORIA_SISTEMA = "auditoriaSistemaEventosVerificados";
export const TABELA_CONFIG_AUDITORIA_SISTEMA = "auditoria_sistema_configuracoes";
export const CHAVE_REGISTRO_EVENTOS_AUDITORIA_SISTEMA = "eventos_verificados";

export const EVENTOS_AUDITORIA_SISTEMA_PADRAO = [
    {
        chave: "ACESSO",
        label: "Acesso ao sistema",
        categoria: "Acesso",
        descricao: "Registra entrada no sistema e eventos gerais de acesso.",
    },
    {
        chave: "ACESSO_TELA",
        label: "Troca de tela",
        categoria: "Navegação",
        descricao: "Registra quando o usuário acessa as telas do sistema.",
    },
    {
        chave: "ACESSO_QR_INTERNO",
        label: "Consulta QR interna",
        categoria: "QR Code",
        descricao: "Registra abertura de QR Code de colaborador dentro do sistema.",
    },
    {
        chave: "ACESSO_AUDITORIA",
        label: "Acesso à Auditoria de sistema",
        categoria: "Permissão",
        descricao: "Registra liberação e acesso à área restrita da Auditoria de sistema.",
    },
    {
        chave: "BLOQUEIO_AUDITORIA",
        label: "Bloqueio da Auditoria de sistema",
        categoria: "Permissão",
        descricao: "Registra bloqueio manual da Auditoria de sistema.",
    },
    {
        chave: "ATUALIZAR_DASHBOARD_SST",
        label: "Atualização do Dashboard SST",
        categoria: "Dashboard",
        descricao: "Registra atualização manual das informações do Dashboard SST.",
    },
    {
        chave: "INSERT",
        label: "Inclusões no banco",
        categoria: "Banco de dados",
        descricao: "Registra novos cadastros e novos registros salvos.",
    },
    {
        chave: "UPDATE",
        label: "Alterações no banco",
        categoria: "Banco de dados",
        descricao: "Registra alterações em registros existentes.",
    },
    {
        chave: "DELETE",
        label: "Exclusões no banco",
        categoria: "Banco de dados",
        descricao: "Registra exclusões de registros do sistema.",
    },
    {
        chave: "DELETE_STORAGE",
        label: "Exclusão de arquivo no Storage",
        categoria: "Storage",
        descricao: "Registra remoção de arquivos armazenados sem vínculo ou por limpeza.",
    },
];

export function normalizarChaveAcaoAuditoria(acao) {
    return String(acao || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");
}

export function configuracaoPadraoEventosAuditoriaSistema() {
    return EVENTOS_AUDITORIA_SISTEMA_PADRAO.reduce((acc, evento) => {
        acc[evento.chave] = true;
        return acc;
    }, {});
}

export function normalizarConfiguracaoEventosAuditoriaSistema(configuracao = {}) {
    const padrao = configuracaoPadraoEventosAuditoriaSistema();

    if (!configuracao || typeof configuracao !== "object") {
        return padrao;
    }

    return { ...padrao, ...configuracao };
}

export function obterConfiguracaoEventosAuditoriaSistemaLocal() {
    if (typeof window === "undefined") {
        return configuracaoPadraoEventosAuditoriaSistema();
    }

    try {
        const salvo = JSON.parse(window.localStorage.getItem(CHAVE_CONFIG_EVENTOS_AUDITORIA_SISTEMA) || "null");
        return normalizarConfiguracaoEventosAuditoriaSistema(salvo);
    } catch {
        return configuracaoPadraoEventosAuditoriaSistema();
    }
}

export function obterConfiguracaoEventosAuditoriaSistema() {
    return obterConfiguracaoEventosAuditoriaSistemaLocal();
}

export function salvarConfiguracaoEventosAuditoriaSistema(configuracao) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(
        CHAVE_CONFIG_EVENTOS_AUDITORIA_SISTEMA,
        JSON.stringify(normalizarConfiguracaoEventosAuditoriaSistema(configuracao))
    );
}

export async function carregarConfiguracaoEventosAuditoriaSistemaSupabase() {
    const configuracaoLocal = obterConfiguracaoEventosAuditoriaSistemaLocal();

    try {
        const { data, error } = await supabase
            .from(TABELA_CONFIG_AUDITORIA_SISTEMA)
            .select("valor, atualizado_em")
            .eq("chave", CHAVE_REGISTRO_EVENTOS_AUDITORIA_SISTEMA)
            .maybeSingle();

        if (error) {
            return {
                configuracao: configuracaoLocal,
                origem: "local",
                atualizadoEm: null,
                erro: error.message,
            };
        }

        if (!data?.valor) {
            return {
                configuracao: configuracaoLocal,
                origem: "local",
                atualizadoEm: null,
                erro: "Configuração ainda não cadastrada no Supabase.",
            };
        }

        const configuracao = normalizarConfiguracaoEventosAuditoriaSistema(data.valor);
        salvarConfiguracaoEventosAuditoriaSistema(configuracao);

        return {
            configuracao,
            origem: "supabase",
            atualizadoEm: data.atualizado_em || null,
            erro: "",
        };
    } catch (error) {
        return {
            configuracao: configuracaoLocal,
            origem: "local",
            atualizadoEm: null,
            erro: error?.message || "Não foi possível carregar a configuração do Supabase.",
        };
    }
}

export async function salvarConfiguracaoEventosAuditoriaSistemaSupabase(configuracao) {
    const configuracaoNormalizada = normalizarConfiguracaoEventosAuditoriaSistema(configuracao);
    salvarConfiguracaoEventosAuditoriaSistema(configuracaoNormalizada);

    try {
        const { error } = await supabase
            .from(TABELA_CONFIG_AUDITORIA_SISTEMA)
            .upsert(
                {
                    chave: CHAVE_REGISTRO_EVENTOS_AUDITORIA_SISTEMA,
                    valor: configuracaoNormalizada,
                    atualizado_em: new Date().toISOString(),
                },
                { onConflict: "chave" }
            );

        if (error) {
            return {
                ok: false,
                origem: "local",
                erro: error.message,
            };
        }

        return {
            ok: true,
            origem: "supabase",
            erro: "",
        };
    } catch (error) {
        return {
            ok: false,
            origem: "local",
            erro: error?.message || "Não foi possível salvar a configuração no Supabase.",
        };
    }
}

export function auditoriaEventoHabilitado(acao, configuracao = null) {
    const chave = normalizarChaveAcaoAuditoria(acao);
    const config = configuracao || obterConfiguracaoEventosAuditoriaSistema();

    return config[chave] !== false;
}

export function montarEventosAuditoriaSistema(registros = [], configuracao = null) {
    const config = configuracao || obterConfiguracaoEventosAuditoriaSistema();
    const mapa = new Map();

    EVENTOS_AUDITORIA_SISTEMA_PADRAO.forEach((evento) => {
        mapa.set(evento.chave, {
            ...evento,
            total: 0,
            habilitado: config[evento.chave] !== false,
            origem: "padrao",
        });
    });

    registros.forEach((registro) => {
        const chave = normalizarChaveAcaoAuditoria(registro?.acao);
        if (!chave) return;

        const existente = mapa.get(chave);

        if (existente) {
            mapa.set(chave, {
                ...existente,
                total: existente.total + 1,
                habilitado: config[chave] !== false,
            });
            return;
        }

        mapa.set(chave, {
            chave,
            label: chave.replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, (letra) => letra.toUpperCase()),
            categoria: "Evento identificado",
            descricao: "Evento encontrado no histórico da Auditoria de sistema.",
            total: 1,
            habilitado: config[chave] !== false,
            origem: "historico",
        });
    });

    return Array.from(mapa.values()).sort((a, b) => {
        const categoria = String(a.categoria || "").localeCompare(String(b.categoria || ""), "pt-BR");
        if (categoria !== 0) return categoria;
        return String(a.label || a.chave).localeCompare(String(b.label || b.chave), "pt-BR");
    });
}

export const TABELA_AUDITORIA_TOKENS_PUBLICOS = "auditoria_tokens_publicos";

const textoTokenAuditoriaPublica = (valor) => String(valor ?? "").trim();

function tokenAuditoriaPublicaValido(valor) {
    const token = textoTokenAuditoriaPublica(valor);
    return token.length >= 10 ? token : "";
}

function normalizarRegistroTokenAuditoriaPublica(registro = {}, origem = "supabase") {
    const token = tokenAuditoriaPublicaValido(registro?.token);

    return {
        ok: Boolean(token),
        origem,
        tokenPublico: token,
        id: registro?.id || null,
        descricao: registro?.descricao || registro?.nome || "",
        requerSenha: registro?.requer_senha !== false,
        ativo: registro?.ativo === true,
        dataExpiracao: registro?.data_expiracao || null,
        criadoEm: registro?.created_at || registro?.criado_em || null,
        erro: token ? "" : "Token ativo não encontrado.",
    };
}

export async function carregarTokenAuditoriaPublicaAtivoSupabase() {
    try {
        const { data, error } = await supabase
            .from(TABELA_AUDITORIA_TOKENS_PUBLICOS)
            .select("id, token, descricao, ativo, requer_senha, data_expiracao, created_at")
            .eq("ativo", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            return {
                ok: false,
                origem: "supabase",
                tokenPublico: "",
                id: null,
                descricao: "",
                requerSenha: true,
                ativo: false,
                dataExpiracao: null,
                criadoEm: null,
                erro: error.message || "Não foi possível carregar o token público ativo.",
            };
        }

        if (!data?.token) {
            return {
                ok: false,
                origem: "supabase",
                tokenPublico: "",
                id: null,
                descricao: "",
                requerSenha: true,
                ativo: false,
                dataExpiracao: null,
                criadoEm: null,
                erro: "Nenhum token público ativo encontrado na tabela auditoria_tokens_publicos.",
            };
        }

        return normalizarRegistroTokenAuditoriaPublica(data, "supabase");
    } catch (error) {
        return {
            ok: false,
            origem: "supabase",
            tokenPublico: "",
            id: null,
            descricao: "",
            requerSenha: true,
            ativo: false,
            dataExpiracao: null,
            criadoEm: null,
            erro: error?.message || "Não foi possível carregar o token público ativo.",
        };
    }
}

