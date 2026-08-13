export const CERTIDAO_PDF_MIME_TYPE =
    "application/pdf";

export const CERTIDAO_PDF_LIMITE_BYTES =
    25 * 1024 * 1024;

const MIME_BINARIO_GENERICO =
    "application/octet-stream";

function textoSeguro(valor) {
    return String(valor ?? "").trim();
}

function obterExtensaoArquivo(nome = "") {
    const nomeSeguro =
        textoSeguro(nome).toLowerCase();

    const correspondencia =
        nomeSeguro.match(/\.([a-z0-9]+)$/i);

    return correspondencia?.[1] || "";
}

function normalizarLimiteBytes(limiteBytes) {
    const limite =
        Number(limiteBytes);

    if (
        !Number.isFinite(limite) ||
        limite <= 0
    ) {
        return CERTIDAO_PDF_LIMITE_BYTES;
    }

    return Math.floor(limite);
}

async function verificarAssinaturaPdf(arquivo) {
    if (
        !arquivo ||
        typeof arquivo.arrayBuffer !== "function"
    ) {
        return false;
    }

    const amostra =
        typeof arquivo.slice === "function"
            ? arquivo.slice(0, 1024)
            : arquivo;

    const buffer =
        await amostra.arrayBuffer();

    const bytes =
        new Uint8Array(buffer).slice(0, 1024);

    const textoCabecalho =
        Array.from(bytes)
            .map((byte) =>
                String.fromCharCode(byte)
            )
            .join("");

    return textoCabecalho.includes("%PDF-");
}

export async function inspecionarArquivoCertidaoPdf(
    arquivo,
    {
        limiteBytes =
            CERTIDAO_PDF_LIMITE_BYTES,
    } = {}
) {
    const erros = [];
    const avisos = [];

    if (!arquivo) {
        return {
            valido: false,
            nomeOriginal: "",
            mimeType: "",
            extensao: "",
            tamanhoBytes: 0,
            tamanhoMb: 0,
            limiteBytes:
                normalizarLimiteBytes(limiteBytes),
            assinaturaPdfValida: false,
            erros: ["Nenhum arquivo foi informado."],
            avisos,
        };
    }

    const limite =
        normalizarLimiteBytes(limiteBytes);

    const nomeOriginal =
        textoSeguro(arquivo.name);

    const mimeType =
        textoSeguro(arquivo.type)
            .toLowerCase();

    const extensao =
        obterExtensaoArquivo(nomeOriginal);

    const tamanhoBytes =
        Number(arquivo.size || 0);

    if (
        !Number.isFinite(tamanhoBytes) ||
        tamanhoBytes <= 0
    ) {
        erros.push(
            "O arquivo está vazio ou possui tamanho inválido."
        );
    }

    if (tamanhoBytes > limite) {
        erros.push(
            "O PDF deve ter no máximo 25 MB."
        );
    }

    if (!nomeOriginal) {
        erros.push(
            "O arquivo não possui nome identificável."
        );
    }

    if (extensao !== "pdf") {
        erros.push(
            "A extensão do arquivo deve ser .pdf."
        );
    }

    if (
        mimeType &&
        mimeType !== CERTIDAO_PDF_MIME_TYPE &&
        mimeType !== MIME_BINARIO_GENERICO
    ) {
        erros.push(
            "O tipo MIME informado não corresponde a um PDF."
        );
    }

    if (!mimeType) {
        avisos.push(
            "O navegador não informou o tipo MIME; a assinatura interna será usada como confirmação."
        );
    }

    if (mimeType === MIME_BINARIO_GENERICO) {
        avisos.push(
            "O navegador informou MIME genérico; a assinatura interna será usada como confirmação."
        );
    }

    let assinaturaPdfValida = false;

    if (
        erros.length === 0 ||
        (
            tamanhoBytes > 0 &&
            tamanhoBytes <= limite
        )
    ) {
        try {
            assinaturaPdfValida =
                await verificarAssinaturaPdf(arquivo);
        }
        catch (erro) {
            erros.push(
                erro?.message ||
                "Não foi possível verificar a assinatura interna do PDF."
            );
        }
    }

    if (!assinaturaPdfValida) {
        erros.push(
            "A assinatura interna %PDF- não foi localizada. O arquivo pode estar corrompido ou ter apenas a extensão renomeada."
        );
    }

    return {
        valido: erros.length === 0,
        nomeOriginal,
        mimeType:
            mimeType ||
            CERTIDAO_PDF_MIME_TYPE,
        mimeTypeInformado: mimeType,
        extensao,
        tamanhoBytes,
        tamanhoMb:
            Math.round(
                (
                    tamanhoBytes /
                    (1024 * 1024)
                ) * 100
            ) / 100,
        limiteBytes: limite,
        assinaturaPdfValida,
        erros:
            [...new Set(erros)],
        avisos:
            [...new Set(avisos)],
    };
}

export async function validarArquivoCertidaoPdf(
    arquivo,
    opcoes = {}
) {
    const resultado =
        await inspecionarArquivoCertidaoPdf(
            arquivo,
            opcoes
        );

    if (!resultado.valido) {
        const erro =
            new Error(
                resultado.erros[0] ||
                "O arquivo PDF informado é inválido."
            );

        erro.name =
            "CertidaoPdfValidationError";

        erro.codigo =
            "CERTIDAO_PDF_INVALIDO";

        erro.detalhes =
            resultado;

        throw erro;
    }

    return resultado;
}