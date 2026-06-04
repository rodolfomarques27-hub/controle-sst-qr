import { supabase } from "../lib/supabaseClient";
import {
    normalizarTokenPublicoOperacional,
    obterTokenAuditoriaPublicaUrl,
} from "../constants/auditoriaPublicaConstants";
import { carregarTokenAuditoriaPublicaAtivoSupabase } from "./auditoriaSistemaConfigService";

const texto = (valor) => String(valor ?? "").trim();

export function normalizarTokenAuditoriaPublica(valor = "") {
    return normalizarTokenPublicoOperacional(texto(valor));
}

export function montarTokensAuditoriaPublicaCandidatos(...listas) {
    const tokens = [];

    listas.flat(Infinity).forEach((valor) => {
        const token = normalizarTokenAuditoriaPublica(valor);
        if (token && !tokens.includes(token)) {
            tokens.push(token);
        }
    });

    return tokens;
}

function normalizarRespostaTokenAtivo(data) {
    if (!data) return "";

    if (typeof data === "string") {
        return normalizarTokenAuditoriaPublica(data);
    }

    if (Array.isArray(data)) {
        const primeiro = data[0] || null;
        return normalizarRespostaTokenAtivo(primeiro);
    }

    return normalizarTokenAuditoriaPublica(
        data.tokenPublico ||
        data.token_publico ||
        data.token ||
        data.p_token ||
        ""
    );
}

async function carregarTokenAuditoriaPublicaAtivoRpc() {
    try {
        const { data, error } = await supabase.rpc("obter_token_auditoria_publica_ativo");

        if (error) {
            return {
                ok: false,
                origem: "rpc",
                tokenPublico: "",
                erro: error.message || "Não foi possível carregar token ativo pela RPC.",
            };
        }

        const tokenPublico = normalizarRespostaTokenAtivo(data);

        if (!tokenPublico) {
            return {
                ok: false,
                origem: "rpc",
                tokenPublico: "",
                erro: data?.mensagem || "RPC não retornou token público ativo.",
            };
        }

        return {
            ok: true,
            origem: "rpc",
            tokenPublico,
            erro: "",
        };
    } catch (error) {
        return {
            ok: false,
            origem: "rpc",
            tokenPublico: "",
            erro: error?.message || "Não foi possível carregar token ativo pela RPC.",
        };
    }
}

export async function carregarTokenAuditoriaPublicaAtivoPadrao() {
    const resultadoRpc = await carregarTokenAuditoriaPublicaAtivoRpc();

    if (resultadoRpc.ok && resultadoRpc.tokenPublico) {
        return resultadoRpc;
    }

    try {
        const resultadoTabela = await carregarTokenAuditoriaPublicaAtivoSupabase();
        const tokenPublico = normalizarTokenAuditoriaPublica(resultadoTabela?.tokenPublico);

        if (resultadoTabela?.ok && tokenPublico) {
            return {
                ...resultadoTabela,
                origem: resultadoTabela.origem || "supabase",
                tokenPublico,
                erro: "",
            };
        }

        return {
            ok: false,
            origem: "supabase",
            tokenPublico: "",
            erro: resultadoTabela?.erro || resultadoRpc.erro || "Token público ativo não encontrado.",
        };
    } catch (error) {
        return {
            ok: false,
            origem: "supabase",
            tokenPublico: "",
            erro: error?.message || resultadoRpc.erro || "Não foi possível carregar token público ativo.",
        };
    }
}

export async function resolverTokenAuditoriaPublicaPadrao({ tokens = [] } = {}) {
    const resultadoAtivo = await carregarTokenAuditoriaPublicaAtivoPadrao();
    const tokenUrl = obterTokenAuditoriaPublicaUrl();
    const candidatos = montarTokensAuditoriaPublicaCandidatos(
        resultadoAtivo.tokenPublico,
        tokens,
        tokenUrl
    );

    return {
        ok: candidatos.length > 0,
        origem: resultadoAtivo.ok ? resultadoAtivo.origem : "candidatos",
        tokenPublico: candidatos[0] || "",
        tokenAtivo: resultadoAtivo.tokenPublico || "",
        candidatos,
        erro: candidatos.length > 0 ? "" : resultadoAtivo.erro || "Token público da auditoria não encontrado.",
    };
}

export async function validarAcessoAuditoriaPublicaPadrao({ senha = "", tokens = [] } = {}) {
    const senhaSegura = texto(senha);

    if (!senhaSegura) {
        return {
            ok: false,
            autorizado: false,
            tokenValidado: "",
            mensagem: "Informe a senha de acesso da auditoria.",
        };
    }

    const resolucao = await resolverTokenAuditoriaPublicaPadrao({ tokens });

    if (!resolucao.candidatos.length) {
        return {
            ok: false,
            autorizado: false,
            tokenValidado: "",
            mensagem: resolucao.erro || "Token público da auditoria não configurado.",
        };
    }

    let ultimaMensagem = "Token público da auditoria inválido, inativo ou expirado.";

    for (const tokenTentativa of resolucao.candidatos) {
        try {
            const { data, error } = await supabase.rpc("validar_acesso_auditoria_publica", {
                p_token: tokenTentativa,
                p_senha: senhaSegura,
            });

            if (error) {
                ultimaMensagem = error.message || ultimaMensagem;
                continue;
            }

            const autorizado = Boolean(data?.autorizado || data?.ok === true);

            if (autorizado) {
                return {
                    ...(data || {}),
                    ok: true,
                    autorizado: true,
                    tokenValidado: tokenTentativa,
                    mensagem: data?.mensagem || "Acesso liberado.",
                };
            }

            ultimaMensagem = data?.mensagem || ultimaMensagem;
        } catch (error) {
            ultimaMensagem = error?.message || ultimaMensagem;
        }
    }

    return {
        ok: false,
        autorizado: false,
        tokenValidado: "",
        mensagem: ultimaMensagem,
    };
}
