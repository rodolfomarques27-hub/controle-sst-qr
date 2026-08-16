const BUCKET_FUNDO_LOGIN = "logos-empresas";
const CAMINHO_FUNDO_LOGIN = "configuracoes/login/fundo-login.jpg";
const CAMINHO_LOGO_CONTRATANTE_LOGIN = "configuracoes/login/logo-contratante.png";

const AJUSTE_FUNDO_LOGIN_PADRAO = Object.freeze({
    size: "cover",
    position: "center center",
    overlay: 0.62,
});

const TAMANHOS_FUNDO_LOGIN_VALIDOS = new Set([
    "cover",
    "contain",
    "115% auto",
]);

const POSICOES_FUNDO_LOGIN_VALIDAS = new Set([
    "center center",
    "center 30%",
    "center 70%",
    "30% center",
    "70% center",
]);

export function normalizarAjusteFundoLoginService(valor = {}) {
    const size = String(valor?.size || "").trim().toLowerCase();
    const position = String(valor?.position || "").trim().toLowerCase().replace(/\s+/g, " ");
    const overlayNumerico = Number(valor?.overlay);

    return {
        size: TAMANHOS_FUNDO_LOGIN_VALIDOS.has(size)
            ? size
            : AJUSTE_FUNDO_LOGIN_PADRAO.size,
        position: POSICOES_FUNDO_LOGIN_VALIDAS.has(position)
            ? position
            : AJUSTE_FUNDO_LOGIN_PADRAO.position,
        overlay: Number.isFinite(overlayNumerico)
            ? Math.min(0.82, Math.max(0.28, overlayNumerico))
            : AJUSTE_FUNDO_LOGIN_PADRAO.overlay,
    };
}

function normalizarEstadoFundoLoginPublico(data) {
    const estado = Array.isArray(data) ? data[0] : data;
    const ajusteRecebido = estado?.ajuste;

    return {
        imagemDisponivel: Boolean(estado?.imagem_disponivel),
        configuracaoDisponivel: Boolean(estado?.configuracao_disponivel),
        ajuste: ajusteRecebido && typeof ajusteRecebido === "object" && !Array.isArray(ajusteRecebido)
            ? normalizarAjusteFundoLoginService(ajusteRecebido)
            : null,
        versao: String(estado?.versao || "").trim(),
    };
}

function montarUrlPublicaStorage(supabase, caminho, versao = "") {
    try {
        const { data } = supabase.storage
            .from(BUCKET_FUNDO_LOGIN)
            .getPublicUrl(caminho);

        const url = data?.publicUrl || "";

        if (!url) return "";

        return versao
            ? `${url}?v=${encodeURIComponent(versao)}`
            : url;
    } catch {
        return "";
    }
}

export function obterUrlLogoContratanteLoginPublicoService({ supabase, versao = "" }) {
    if (!supabase) return "";

    const versaoFinal = String(versao || Date.now());

    return montarUrlPublicaStorage(
        supabase,
        CAMINHO_LOGO_CONTRATANTE_LOGIN,
        versaoFinal
    );
}

export async function carregarFundoLoginPublicoService({ supabase }) {
    try {
        const { data, error } = await supabase.rpc(
            "obter_estado_fundo_login_publico"
        );

        if (error) {
            return {
                imagemUrl: "",
                ajuste: null,
                origem: "padrao",
                erro: error.message || "Estado do fundo do login indisponível.",
            };
        }

        const estado = normalizarEstadoFundoLoginPublico(data);

        if (!estado.imagemDisponivel) {
            return {
                imagemUrl: "",
                ajuste: null,
                origem: "padrao",
                erro: "",
            };
        }

        const versao = estado.versao || String(Date.now());
        const imagemUrl = montarUrlPublicaStorage(
            supabase,
            CAMINHO_FUNDO_LOGIN,
            versao
        );

        return {
            imagemUrl,
            ajuste: estado.ajuste,
            origem: imagemUrl ? "storage" : "padrao",
            erro: "",
        };
    } catch (error) {
        return {
            imagemUrl: "",
            ajuste: null,
            origem: "padrao",
            erro: error?.message || "Não foi possível verificar o fundo do login.",
        };
    }
}

export async function salvarAjusteFundoLoginService({ supabase, ajuste }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para salvar o ajuste do fundo do login.");
    }

    const ajusteNormalizado = normalizarAjusteFundoLoginService(ajuste);
    const { data, error } = await supabase.rpc(
        "salvar_ajuste_fundo_login_sistema",
        {
            p_size: ajusteNormalizado.size,
            p_position: ajusteNormalizado.position,
            p_overlay: ajusteNormalizado.overlay,
        }
    );

    if (error) {
        throw new Error(error.message || "Não foi possível salvar o ajuste do fundo do login.");
    }

    const resultado = Array.isArray(data) ? data[0] : data;

    return {
        ajuste: normalizarAjusteFundoLoginService(
            resultado?.ajuste || ajusteNormalizado
        ),
        versao: String(resultado?.versao || "").trim(),
    };
}

export async function restaurarAjusteFundoLoginService({ supabase }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para restaurar o ajuste do fundo do login.");
    }

    const { data, error } = await supabase.rpc(
        "restaurar_ajuste_fundo_login_sistema"
    );

    if (error) {
        throw new Error(error.message || "Não foi possível restaurar o ajuste do fundo do login.");
    }

    const resultado = Array.isArray(data) ? data[0] : data;

    return {
        ajuste: normalizarAjusteFundoLoginService(
            resultado?.ajuste || AJUSTE_FUNDO_LOGIN_PADRAO
        ),
        versao: String(resultado?.versao || "").trim(),
    };
}