import { supabase } from "../lib/supabaseClient";
import { TAMANHO_PAGINA_SUPABASE } from "../constants/sistemaConstants";
import { abrirArquivoUrl, extrairCaminhoStorage } from "../utils/sstUtils";

export async function buscarTodosRegistrosSupabase(tabela, colunas = "*", opcoes = {}) {
    const {
        campoOrdenacao = null,
        crescente = false,
        tamanhoPagina = TAMANHO_PAGINA_SUPABASE,
    } = opcoes;

    const todos = [];
    let inicio = 0;

    while (true) {
        let consulta = supabase
            .from(tabela)
            .select(colunas)
            .range(inicio, inicio + tamanhoPagina - 1);

        if (campoOrdenacao) {
            consulta = consulta.order(campoOrdenacao, { ascending: crescente });
        }

        const { data, error } = await consulta;

        if (error) {
            throw error;
        }

        const pagina = data || [];
        todos.push(...pagina);

        if (pagina.length < tamanhoPagina) {
            break;
        }

        inicio += tamanhoPagina;
    }

    return todos;
}

export async function listarTodosArquivosStorage(bucket, prefixo = "", opcoes = {}) {
    const {
        tamanhoPagina = TAMANHO_PAGINA_SUPABASE,
        sortBy = { column: "name", order: "asc" },
    } = opcoes;

    const todos = [];
    let offset = 0;

    while (true) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(prefixo, {
                limit: tamanhoPagina,
                offset,
                sortBy,
            });

        if (error) {
            throw error;
        }

        const pagina = data || [];
        todos.push(...pagina);

        if (pagina.length < tamanhoPagina) {
            break;
        }

        offset += tamanhoPagina;
    }

    return todos;
}

export function obterUrlPublicaStorage(bucket, caminhoOuUrl, versao = "") {
    if (!bucket || !caminhoOuUrl) return "";

    const caminho = extrairCaminhoStorage(bucket, caminhoOuUrl);

    if (!caminho) return "";

    const valor = String(caminho).trim();

    if (/^(blob:|data:)/i.test(valor)) {
        return valor;
    }

    let url = valor;

    if (!/^https?:\/\//i.test(valor)) {
        try {
            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(valor);

            url = data?.publicUrl || "";
        } catch {
            return "";
        }
    }

    if (!url) return "";

    const versaoTratada = String(versao || "").trim();

    if (!versaoTratada) return url;

    const separador = url.includes("?") ? "&" : "?";

    return `${url}${separador}v=${encodeURIComponent(versaoTratada)}`;
}

export async function criarUrlAssinadaStorage(bucket, caminhoOuUrl, validadeSegundos = 600) {
    if (!bucket || !caminhoOuUrl) return "";

    const caminho = extrairCaminhoStorage(bucket, caminhoOuUrl);

    if (!caminho) return "";

    if (String(caminho).startsWith("http")) {
        return caminho;
    }

    if (bucket === "logos-empresas") {
        return obterUrlPublicaStorage(bucket, caminho);
    }

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(caminho, validadeSegundos);

    if (error) {
        console.warn(`Erro ao gerar URL assinada do bucket ${bucket}:`, error.message);
        return "";
    }

    return data?.signedUrl || "";
}

export function obterUrlLogoEmpresa(caminho) {
    return obterUrlPublicaStorage("logos-empresas", caminho);
}

export async function abrirArquivoStorage(bucket, caminhoOuUrl) {
    const url = await criarUrlAssinadaStorage(bucket, caminhoOuUrl, 600);

    if (!url) {
        alert("Não foi possível gerar link temporário para o arquivo.");
        return;
    }

    abrirArquivoUrl(url);
}
