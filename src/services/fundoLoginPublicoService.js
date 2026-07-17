const BUCKET_FUNDO_LOGIN = "logos-empresas";
const CAMINHO_FUNDO_LOGIN = "configuracoes/login/fundo-login.jpg";
const CAMINHO_CONFIG_FUNDO_LOGIN = "configuracoes/login/fundo-login-config.json";

function normalizarEstadoFundoLoginPublico(data) {
    const estado = Array.isArray(data) ? data[0] : data;

    return {
        imagemDisponivel: Boolean(estado?.imagem_disponivel),
        configuracaoDisponivel: Boolean(estado?.configuracao_disponivel),
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

        const estado =
            normalizarEstadoFundoLoginPublico(data);

        if (!estado.imagemDisponivel) {
            return {
                imagemUrl: "",
                ajuste: null,
                origem: "padrao",
                erro: "",
            };
        }

        const versao =
            estado.versao || String(Date.now());

        const imagemUrl =
            montarUrlPublicaStorage(
                supabase,
                CAMINHO_FUNDO_LOGIN,
                versao
            );

        let ajuste = null;

        if (estado.configuracaoDisponivel) {
            const configUrl =
                montarUrlPublicaStorage(
                    supabase,
                    CAMINHO_CONFIG_FUNDO_LOGIN,
                    versao
                );

            if (configUrl) {
                try {
                    const resposta =
                        await fetch(configUrl, {
                            cache: "no-store",
                        });

                    if (resposta.ok) {
                        ajuste = await resposta.json();
                    }
                } catch {
                    ajuste = null;
                }
            }
        }

        return {
            imagemUrl,
            ajuste,
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