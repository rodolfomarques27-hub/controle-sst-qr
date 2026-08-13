function arquivoPossuiArrayBuffer(arquivo) {
    return Boolean(
        arquivo &&
        typeof arquivo.arrayBuffer === "function"
    );
}

function bufferParaHexadecimal(buffer) {
    return Array.from(
        new Uint8Array(buffer)
    )
        .map((byte) =>
            byte.toString(16).padStart(2, "0")
        )
        .join("");
}

export async function calcularHashSha256CertidaoPdf(
    arquivo
) {
    if (!arquivoPossuiArrayBuffer(arquivo)) {
        throw new Error(
            "O arquivo não oferece suporte à leitura binária necessária para o SHA-256."
        );
    }

    if (
        typeof globalThis.crypto === "undefined" ||
        !globalThis.crypto.subtle ||
        typeof globalThis.crypto.subtle.digest !==
            "function"
    ) {
        throw new Error(
            "O navegador não oferece suporte ao cálculo seguro SHA-256."
        );
    }

    const buffer =
        await arquivo.arrayBuffer();

    const resumo =
        await globalThis.crypto.subtle.digest(
            "SHA-256",
            buffer
        );

    const valor =
        bufferParaHexadecimal(resumo);

    if (!/^[a-f0-9]{64}$/.test(valor)) {
        throw new Error(
            "O navegador retornou um hash SHA-256 inválido."
        );
    }

    return {
        algoritmo: "SHA-256",
        valor,
        hashSha256: valor,
        tamanhoBytes:
            Number(arquivo.size || buffer.byteLength || 0),
        calculadoEm:
            new Date().toISOString(),
        origem:
            "web_crypto_local",
        custoExterno: false,
    };
}

export function hashesSha256CertidaoSaoIguais(
    hashA,
    hashB
) {
    const primeiro =
        String(hashA || "")
            .trim()
            .toLowerCase();

    const segundo =
        String(hashB || "")
            .trim()
            .toLowerCase();

    return Boolean(
        /^[a-f0-9]{64}$/.test(primeiro) &&
        primeiro === segundo
    );
}