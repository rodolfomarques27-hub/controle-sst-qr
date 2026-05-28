export function nomeArquivoImagemComExtensao(nomeOriginal = "foto-auditoria.jpg", tipoSaida = "image/jpeg") {
    const nomeLimpo = String(nomeOriginal || "foto-auditoria.jpg").trim() || "foto-auditoria.jpg";
    const extensao = tipoSaida === "image/png" ? "png" : tipoSaida === "image/webp" ? "webp" : "jpg";
    const semExtensao = nomeLimpo.replace(/\.[^.]+$/, "");

    return `${semExtensao}.${extensao}`;
}

function carregarImagemArquivo(arquivo) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(arquivo);
        const imagem = new Image();

        imagem.onload = () => {
            URL.revokeObjectURL(url);
            resolve(imagem);
        };

        imagem.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Não foi possível carregar a imagem para otimização."));
        };

        imagem.src = url;
    });
}

function canvasParaBlob(canvas, tipo, qualidade) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), tipo, qualidade);
    });
}

export async function reduzirFotoParaAuditoria(arquivo, opcoes = {}) {
    if (!arquivo || !(arquivo instanceof Blob)) {
        return arquivo;
    }

    const tipoArquivo = arquivo.type || "";

    if (!tipoArquivo.startsWith("image/")) {
        return arquivo;
    }

    const maxLado = Number(opcoes.maxLado || 1400);
    const alvoBytes = Number(opcoes.alvoBytes || 800 * 1024);
    const qualidadeMinima = Number(opcoes.qualidadeMinima || 0.55);
    const qualidadeInicial = Number(opcoes.qualidadeInicial || 0.86);
    const tipoSaida = opcoes.tipoSaida || "image/jpeg";

    if (arquivo.size <= alvoBytes && !opcoes.forcarReducao) {
        return arquivo;
    }

    try {
        const imagem = await carregarImagemArquivo(arquivo);
        const larguraOriginal = imagem.naturalWidth || imagem.width || maxLado;
        const alturaOriginal = imagem.naturalHeight || imagem.height || maxLado;
        const maiorLado = Math.max(larguraOriginal, alturaOriginal, 1);
        const escala = Math.min(1, maxLado / maiorLado);
        const largura = Math.max(1, Math.round(larguraOriginal * escala));
        const altura = Math.max(1, Math.round(alturaOriginal * escala));
        const canvas = document.createElement("canvas");
        const contexto = canvas.getContext("2d", { alpha: false });

        if (!contexto) {
            return arquivo;
        }

        canvas.width = largura;
        canvas.height = altura;
        contexto.fillStyle = "#ffffff";
        contexto.fillRect(0, 0, largura, altura);
        contexto.drawImage(imagem, 0, 0, largura, altura);

        let qualidade = qualidadeInicial;
        let melhorBlob = await canvasParaBlob(canvas, tipoSaida, qualidade);

        while (melhorBlob && melhorBlob.size > alvoBytes && qualidade > qualidadeMinima) {
            qualidade = Math.max(qualidadeMinima, qualidade - 0.08);
            const proximoBlob = await canvasParaBlob(canvas, tipoSaida, qualidade);

            if (!proximoBlob) break;

            melhorBlob = proximoBlob;
        }

        if (!melhorBlob) {
            return arquivo;
        }

        if (melhorBlob.size >= arquivo.size && !opcoes.forcarReducao) {
            return arquivo;
        }

        const nome = nomeArquivoImagemComExtensao(arquivo.name, melhorBlob.type || tipoSaida);

        return new File([melhorBlob], nome, {
            type: melhorBlob.type || tipoSaida,
            lastModified: Date.now(),
        });
    } catch (error) {
        console.warn("Não foi possível reduzir a foto automaticamente:", error?.message || error);
        return arquivo;
    }
}
