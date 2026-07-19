import { reduzirFotoParaAuditoria } from "./imagemService.js";

export const BUCKET_MAPAS_OBRAS = "mapas-obras";
export const LIMITE_BYTES_PLANTA_MAPA = 8 * 1024 * 1024;
export const VALIDADE_URL_PLANTA_MAPA_SEGUNDOS = 60 * 60;

const MIMES_PLANTA_MAPA = new Set([
    "image/jpeg",
    "image/png",
]);

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textoSeguro(valor) {
    return String(valor || "").trim();
}

function exigirSupabase(supabase) {
    if (
        !supabase ||
        !supabase.storage ||
        typeof supabase.storage.from !== "function"
    ) {
        throw new Error(
            "Cliente Supabase indisponível para o Storage do mapa.",
        );
    }
}

function normalizarMime(tipo) {
    const mime = textoSeguro(tipo).toLowerCase();

    if (mime === "image/jpg") {
        return "image/jpeg";
    }

    return mime;
}

function exigirUuidObra(obraId) {
    const id = textoSeguro(obraId);

    if (!UUID_PATTERN.test(id)) {
        throw new Error(
            "A obra precisa possuir um UUID válido antes do upload da planta.",
        );
    }

    return id.toLowerCase();
}

function sanitizarSegmentoCaminho(valor, fallback = "arquivo") {
    const texto = textoSeguro(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "-")
        .replace(/-{2,}/g, "-")
        .replace(/^[._-]+|[._-]+$/g, "")
        .slice(0, 100);

    return texto || fallback;
}

function nomeArquivoSeguro(nomeOriginal, mime) {
    const tipo = normalizarMime(mime);
    const extensao = tipo === "image/png" ? "png" : "jpg";

    const nome = textoSeguro(nomeOriginal)
        .replace(/\.[^.]+$/, "");

    const base = sanitizarSegmentoCaminho(
        nome,
        "planta",
    ).slice(0, 80);

    return `${base}.${extensao}`;
}

function criarIdentificadorCaminho() {
    const uuid = globalThis.crypto?.randomUUID?.();

    if (uuid) {
        return uuid.replace(/-/g, "").slice(0, 12);
    }

    return Date.now().toString(36);
}

function validarTipoPlanta(tipo) {
    const valor = textoSeguro(tipo).toLowerCase();

    if (valor !== "geral" && valor !== "detalhada") {
        throw new Error(
            "Tipo de planta inválido. Use geral ou detalhada.",
        );
    }

    return valor;
}

function validarPertencimentoCaminho(caminho, obraId = "") {
    const caminhoSeguro = textoSeguro(caminho);

    if (!caminhoSeguro) {
        throw new Error("Caminho da planta não informado.");
    }

    if (
        caminhoSeguro.startsWith("/") ||
        caminhoSeguro.includes("\\") ||
        caminhoSeguro.includes("..") ||
        caminhoSeguro.includes("://") ||
        /^data:/i.test(caminhoSeguro)
    ) {
        throw new Error("Caminho da planta inválido.");
    }

    const segmentos = caminhoSeguro
        .split("/")
        .filter(Boolean);

    if (segmentos.length < 3) {
        throw new Error(
            "O caminho da planta não segue a estrutura do bucket.",
        );
    }

    const obraDoCaminho = exigirUuidObra(segmentos[0]);

    if (
        obraId &&
        obraDoCaminho !== exigirUuidObra(obraId)
    ) {
        throw new Error(
            "O caminho da planta não pertence à obra informada.",
        );
    }

    return caminhoSeguro;
}

export function validarArquivoPlantaMapa(arquivo) {
    if (!arquivo || typeof arquivo !== "object") {
        throw new Error("Selecione uma imagem para a planta.");
    }

    const mime = normalizarMime(arquivo.type);

    if (!MIMES_PLANTA_MAPA.has(mime)) {
        throw new Error(
            "A planta deve estar no formato PNG, JPG ou JPEG.",
        );
    }

    const tamanho = Number(arquivo.size);

    if (!Number.isFinite(tamanho) || tamanho <= 0) {
        throw new Error("O arquivo da planta está vazio.");
    }

    if (tamanho > LIMITE_BYTES_PLANTA_MAPA) {
        throw new Error(
            "A planta excede o limite máximo de 8 MB.",
        );
    }

    return {
        mime,
        tamanho,
        nome: nomeArquivoSeguro(
            arquivo.name,
            mime,
        ),
    };
}

export function construirCaminhoPlantaMapa({
    obraId,
    tipo = "geral",
    pontoId = "",
    nomeArquivo = "planta.jpg",
    mime = "image/jpeg",
    agora = Date.now(),
    identificador = "",
} = {}) {
    const obra = exigirUuidObra(obraId);
    const tipoSeguro = validarTipoPlanta(tipo);

    const instante = Number(agora);

    if (!Number.isFinite(instante) || instante <= 0) {
        throw new Error(
            "Data inválida para geração do caminho da planta.",
        );
    }

    const nome = nomeArquivoSeguro(
        nomeArquivo,
        mime,
    );

    const sufixo = sanitizarSegmentoCaminho(
        identificador || criarIdentificadorCaminho(),
        "arquivo",
    ).slice(0, 24);

    const arquivo = `${Math.trunc(instante)}-${sufixo}-${nome}`;

    if (tipoSeguro === "geral") {
        return `${obra}/planta-geral/${arquivo}`;
    }

    const ponto = sanitizarSegmentoCaminho(
        pontoId,
        "",
    );

    if (!ponto) {
        throw new Error(
            "O ponto precisa estar identificado para receber uma planta detalhada.",
        );
    }

    return `${obra}/pontos/${ponto}/${arquivo}`;
}

export function validarCaminhoPlantaMapa({
    caminho,
    obraId = "",
} = {}) {
    return validarPertencimentoCaminho(
        caminho,
        obraId,
    );
}

async function otimizarArquivoPlanta(arquivo) {
    const arquivoOtimizado =
        await reduzirFotoParaAuditoria(
            arquivo,
            {
                maxLado: 2200,
                alvoBytes: 1500 * 1024,
                qualidadeInicial: 0.88,
                qualidadeMinima: 0.58,
                tipoSaida: "image/jpeg",
            },
        );

    validarArquivoPlantaMapa(arquivoOtimizado);

    return arquivoOtimizado;
}

export async function obterUrlAssinadaPlantaMapa({
    supabase,
    caminho,
    obraId = "",
    validadeSegundos =
        VALIDADE_URL_PLANTA_MAPA_SEGUNDOS,
} = {}) {
    exigirSupabase(supabase);

    const caminhoSeguro =
        validarPertencimentoCaminho(
            caminho,
            obraId,
        );

    const validade = Math.max(
        60,
        Math.min(
            6 * 60 * 60,
            Number(validadeSegundos) ||
                VALIDADE_URL_PLANTA_MAPA_SEGUNDOS,
        ),
    );

    const { data, error } = await supabase.storage
        .from(BUCKET_MAPAS_OBRAS)
        .createSignedUrl(
            caminhoSeguro,
            validade,
        );

    if (error) {
        throw new Error(
            `Erro ao gerar acesso temporário à planta: ${error.message}`,
        );
    }

    const url = textoSeguro(data?.signedUrl);

    if (!url) {
        throw new Error(
            "O Storage não retornou a URL temporária da planta.",
        );
    }

    return url;
}

export async function enviarPlantaMapaStorage({
    supabase,
    arquivo,
    obraId,
    tipo = "geral",
    pontoId = "",
    agora = Date.now(),
    identificador = "",
    validadeSegundos =
        VALIDADE_URL_PLANTA_MAPA_SEGUNDOS,
} = {}) {
    exigirSupabase(supabase);
    exigirUuidObra(obraId);
    validarTipoPlanta(tipo);
    validarArquivoPlantaMapa(arquivo);

    const arquivoFinal =
        await otimizarArquivoPlanta(arquivo);

    const validacaoFinal =
        validarArquivoPlantaMapa(arquivoFinal);

    const caminho = construirCaminhoPlantaMapa({
        obraId,
        tipo,
        pontoId,
        nomeArquivo:
            arquivoFinal.name ||
            arquivo.name ||
            "planta.jpg",
        mime: validacaoFinal.mime,
        agora,
        identificador,
    });

    const bucket =
        supabase.storage.from(BUCKET_MAPAS_OBRAS);

    const { error: erroUpload } =
        await bucket.upload(
            caminho,
            arquivoFinal,
            {
                cacheControl: "3600",
                upsert: false,
                contentType:
                    validacaoFinal.mime,
            },
        );

    if (erroUpload) {
        throw new Error(
            `Erro ao enviar planta da obra: ${erroUpload.message}`,
        );
    }

    let url = "";

    try {
        url =
            await obterUrlAssinadaPlantaMapa({
                supabase,
                caminho,
                obraId,
                validadeSegundos,
            });
    } catch (error) {
        await bucket
            .remove([caminho])
            .catch(() => null);

        throw error;
    }

    return {
        nome: validacaoFinal.nome,
        path: caminho,
        url,
        tipo: validacaoFinal.mime,
        tamanhoBytes:
            validacaoFinal.tamanho,
    };
}

export async function removerPlantaMapaStorage({
    supabase,
    caminho,
    obraId = "",
} = {}) {
    exigirSupabase(supabase);

    if (!textoSeguro(caminho)) {
        return false;
    }

    const caminhoSeguro =
        validarPertencimentoCaminho(
            caminho,
            obraId,
        );

    const { error } = await supabase.storage
        .from(BUCKET_MAPAS_OBRAS)
        .remove([caminhoSeguro]);

    if (error) {
        throw new Error(
            `Erro ao remover planta da obra: ${error.message}`,
        );
    }

    return true;
}
