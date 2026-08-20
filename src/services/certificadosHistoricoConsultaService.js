const BUCKET_CERTIFICADOS = "certificados-treinamentos";

const CAMPOS_HISTORICO = [
    "id",
    "certificado_origem_id",
    "colaborador_id",
    "treinamento_codigo",
    "tipo_treinamento",
    "nome_treinamento",
    "data_realizacao",
    "data_vencimento",
    "arquivo_url",
    "url_do_arquivo",
    "arquivo_nome",
    "nome_do_arquivo",
    "status_validacao",
    "motivo",
    "arquivado_em",
].join(",");

function textoSeguro(valor = "") {
    return String(valor || "").trim();
}

function obterReferenciaArquivo(registro = {}) {
    return textoSeguro(
        registro?.arquivo_url ||
        registro?.url_do_arquivo ||
        ""
    );
}

export function normalizarCaminhoArquivoHistoricoCertificado(
    valor = ""
) {
    const referencia = textoSeguro(valor);

    if (!referencia) {
        return "";
    }

    if (/^(blob:|data:)/i.test(referencia)) {
        return referencia;
    }

    if (!/^https?:/i.test(referencia)) {
        return referencia.replace(/^\/+/, "");
    }

    try {
        const url = new URL(referencia);
        const caminhoUrl = decodeURIComponent(url.pathname);

        const marcadores = [
            `/storage/v1/object/public/${BUCKET_CERTIFICADOS}/`,
            `/storage/v1/object/sign/${BUCKET_CERTIFICADOS}/`,
            `/storage/v1/object/${BUCKET_CERTIFICADOS}/`,
        ];

        for (const marcador of marcadores) {
            const indice = caminhoUrl.indexOf(marcador);

            if (indice >= 0) {
                return caminhoUrl
                    .slice(indice + marcador.length)
                    .replace(/^\/+/, "");
            }
        }
    } catch {
        return referencia;
    }

    return referencia;
}

export async function listarHistoricoCertificadoService({
    supabase,
    certificadoId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado para consulta do histórico."
        );
    }

    const id = textoSeguro(certificadoId);

    if (!id) {
        return [];
    }

    const { data, error } = await supabase
        .from("certificados_historico")
        .select(CAMPOS_HISTORICO)
        .eq("certificado_origem_id", id)
        .order("arquivado_em", {
            ascending: false,
        });

    if (error) {
        throw new Error(
            `Erro ao carregar histórico do certificado: ${error.message}`
        );
    }

    return Array.isArray(data)
        ? data
        : [];
}

export async function listarHistoricoCertificadosEmLoteService({
    supabase,
    certificadoIds = [],
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado para consulta em lote do histórico."
        );
    }

    const entrada =
        Array.isArray(certificadoIds)
            ? certificadoIds
            : [certificadoIds];

    const ids =
        Array.from(
            new Set(
                entrada
                    .map(
                        (valor) =>
                            textoSeguro(valor)
                    )
                    .filter(Boolean)
            )
        );

    if (!ids.length) {
        return [];
    }

    const { data, error } =
        await supabase
            .from("certificados_historico")
            .select(CAMPOS_HISTORICO)
            .in(
                "certificado_origem_id",
                ids
            )
            .order(
                "arquivado_em",
                {
                    ascending: false,
                }
            );

    if (error) {
        throw new Error(
            "Erro ao carregar histórico dos certificados em lote: " +
                error.message
        );
    }

    return Array.isArray(data)
        ? data
        : [];
}
export async function criarUrlHistoricoCertificadoService({
    supabase,
    registro,
    expiresIn = 300,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado para abrir a versão histórica."
        );
    }

    const referencia =
        obterReferenciaArquivo(registro);

    if (!referencia) {
        throw new Error(
            "A versão histórica não possui arquivo associado."
        );
    }

    const caminho =
        normalizarCaminhoArquivoHistoricoCertificado(
            referencia
        );

    if (!caminho) {
        throw new Error(
            "Não foi possível identificar o arquivo histórico."
        );
    }

    if (/^(https?:|blob:|data:)/i.test(caminho)) {
        return caminho;
    }

    const validadeNumero = Number(expiresIn);

    const validade =
        Number.isFinite(validadeNumero) &&
        validadeNumero > 0
            ? Math.floor(validadeNumero)
            : 300;

    const { data, error } = await supabase.storage
        .from(BUCKET_CERTIFICADOS)
        .createSignedUrl(
            caminho,
            validade
        );

    if (
        error ||
        !data?.signedUrl
    ) {
        throw new Error(
            `Não foi possível abrir a versão histórica: ${
                error?.message ||
                "URL assinada não gerada."
            }`
        );
    }

    return data.signedUrl;
}