import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL_FIXO = "";
const SUPABASE_ANON_KEY_FIXA = "";

export const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL_FIXO || "").trim();
export const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_FIXA || "").trim();
export const SUPABASE_CONFIGURADO = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const MENSAGEM_SUPABASE_NAO_CONFIGURADO =
    "Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env da raiz do projeto e reinicie o servidor.";

function obterPrefixoSessaoSupabaseAtual() {
    if (!SUPABASE_URL) return "";

    try {
        const referenciaProjeto = new URL(SUPABASE_URL).hostname.split(".")[0];
        return referenciaProjeto ? `sb-${referenciaProjeto}-auth-token` : "";
    } catch {
        return "";
    }
}

function removerChavesSessaoSupabase(armazenamento, prefixo) {
    if (!armazenamento || !prefixo) return 0;

    const chaves = [];

    for (let indice = 0; indice < armazenamento.length; indice += 1) {
        const chave = armazenamento.key(indice);

        if (chave === prefixo || chave?.startsWith(`${prefixo}-`)) {
            chaves.push(chave);
        }
    }

    chaves.forEach((chave) => armazenamento.removeItem(chave));
    return chaves.length;
}

export function erroSessaoSupabaseInvalida(error = null) {
    const codigo = String(error?.code || "").trim().toLowerCase();
    const mensagem = String(error?.message || error || "").trim().toLowerCase();

    return (
        codigo === "refresh_token_not_found"
        || codigo === "invalid_refresh_token"
        || mensagem.includes("invalid refresh token")
        || mensagem.includes("refresh token not found")
    );
}

export function limparSessaoSupabaseLocalInvalida() {
    if (typeof window === "undefined") return 0;

    const prefixo = obterPrefixoSessaoSupabaseAtual();
    let removidas = 0;

    try {
        removidas += removerChavesSessaoSupabase(window.localStorage, prefixo);
    } catch {
        // Ignora armazenamento local indisponível.
    }

    try {
        removidas += removerChavesSessaoSupabase(window.sessionStorage, prefixo);
    } catch {
        // Ignora armazenamento de sessão indisponível.
    }

    return removidas;
}

function criarConsultaSupabaseDesabilitada() {
    const resposta = {
        data: null,
        error: new Error(MENSAGEM_SUPABASE_NAO_CONFIGURADO),
    };

    const builder = {
        select: () => builder,
        insert: () => builder,
        update: () => builder,
        upsert: () => builder,
        delete: () => builder,
        order: () => builder,
        limit: () => builder,
        range: () => builder,
        eq: () => builder,
        neq: () => builder,
        gt: () => builder,
        gte: () => builder,
        lt: () => builder,
        lte: () => builder,
        like: () => builder,
        ilike: () => builder,
        is: () => builder,
        filter: () => builder,
        match: () => builder,
        contains: () => builder,
        containedBy: () => builder,
        or: () => builder,
        not: () => builder,
        "in": () => builder,
        single: () => Promise.resolve(resposta),
        maybeSingle: () => Promise.resolve(resposta),
        then: (resolve, reject) => Promise.resolve(resposta).then(resolve, reject),
        catch: (reject) => Promise.resolve(resposta).catch(reject),
        finally: (callback) => Promise.resolve(resposta).finally(callback),
    };

    return builder;
}

function criarSupabaseDesabilitado() {
    const resposta = {
        data: null,
        error: new Error(MENSAGEM_SUPABASE_NAO_CONFIGURADO),
    };

    return {
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            onAuthStateChange: () => ({
                data: {
                    subscription: {
                        unsubscribe: () => { },
                    },
                },
            }),
            signInWithPassword: async () => resposta,
            resetPasswordForEmail: async () => resposta,
            updateUser: async () => resposta,
            signOut: async () => ({ error: null }),
        },
        from: () => criarConsultaSupabaseDesabilitada(),
        rpc: async () => resposta,
        storage: {
            from: () => ({
                upload: async () => resposta,
                remove: async () => resposta,
                list: async () => ({ data: [], error: new Error(MENSAGEM_SUPABASE_NAO_CONFIGURADO) }),
                download: async () => resposta,
                createSignedUrl: async () => resposta,
                getPublicUrl: () => ({ data: { publicUrl: "" } }),
            }),
        },
    };
}

export const supabase = SUPABASE_CONFIGURADO
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
    })
    : criarSupabaseDesabilitado();

if (!SUPABASE_CONFIGURADO) {
    console.warn(MENSAGEM_SUPABASE_NAO_CONFIGURADO);
}
