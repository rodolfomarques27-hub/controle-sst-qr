import { validarArquivoAntesUpload } from "../components/FileUploadAviso";
import { sanitizarNomeArquivo } from "../utils/sstUtils";

export const BUCKET_CERTIFICADOS_TREINAMENTOS = "certificados-treinamentos";

const MIMES_IMAGEM_CERTIFICADO = new Set(["image/jpeg", "image/png", "image/webp"]);
const LIMITE_MAIOR_LADO_CERTIFICADO_IMAGEM = 1800;

function arquivoEhPdf(arquivo) {
    const tipo = String(arquivo?.type || "").toLowerCase();
    const nome = String(arquivo?.name || "").toLowerCase();
    return tipo === "application/pdf" || nome.endsWith(".pdf");
}

function arquivoEhImagemSuportadaCertificado(arquivo) {
    const tipo = String(arquivo?.type || "").toLowerCase();
    const nome = String(arquivo?.name || "").toLowerCase();

    return MIMES_IMAGEM_CERTIFICADO.has(tipo) ||
        nome.endsWith(".jpg") ||
        nome.endsWith(".jpeg") ||
        nome.endsWith(".png") ||
        nome.endsWith(".webp");
}

function trocarExtensaoParaPdf(nome = "certificado.pdf") {
    const nomeTratado = String(nome || "certificado.pdf").trim() || "certificado.pdf";
    return nomeTratado.replace(/\.[^.]+$/, "") + ".pdf";
}

function carregarImagemCertificado(arquivo) {
    return new Promise((resolve, reject) => {
        if (typeof Image === "undefined" || typeof URL === "undefined") {
            reject(new Error("O navegador nÃ£o possui suporte para converter imagem em PDF antes do upload."));
            return;
        }

        const url = URL.createObjectURL(arquivo);
        const imagem = new Image();

        imagem.onload = () => {
            URL.revokeObjectURL(url);
            resolve(imagem);
        };

        imagem.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("NÃ£o foi possÃ­vel carregar a imagem do certificado para envio."));
        };

        imagem.src = url;
    });
}

function desenharImagemCertificadoEmCanvas(imagem) {
    const larguraOriginal = Number(imagem.naturalWidth || imagem.width || 0);
    const alturaOriginal = Number(imagem.naturalHeight || imagem.height || 0);

    if (!larguraOriginal || !alturaOriginal) {
        throw new Error("Imagem do certificado sem dimensÃµes vÃ¡lidas.");
    }

    const maiorLado = Math.max(larguraOriginal, alturaOriginal);
    const escala = maiorLado > LIMITE_MAIOR_LADO_CERTIFICADO_IMAGEM
        ? LIMITE_MAIOR_LADO_CERTIFICADO_IMAGEM / maiorLado
        : 1;
    const largura = Math.max(1, Math.round(larguraOriginal * escala));
    const altura = Math.max(1, Math.round(alturaOriginal * escala));
    const canvas = document.createElement("canvas");

    canvas.width = largura;
    canvas.height = altura;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
        throw new Error("NÃ£o foi possÃ­vel preparar a imagem do certificado para upload.");
    }

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, largura, altura);
    ctx.drawImage(imagem, 0, 0, largura, altura);

    return canvas;
}

function base64ParaUint8Array(base64 = "") {
    const binario = atob(base64);
    const bytes = new Uint8Array(binario.length);

    for (let i = 0; i < binario.length; i += 1) {
        bytes[i] = binario.charCodeAt(i);
    }

    return bytes;
}

function montarPdfComJpeg({ jpegBytes, larguraImagem, alturaImagem }) {
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];
    let posicao = 0;

    const adicionar = (parte) => {
        const bytes = typeof parte === "string" ? encoder.encode(parte) : parte;
        chunks.push(bytes);
        posicao += bytes.length;
    };

    const adicionarObjetoTexto = (numero, conteudo) => {
        offsets[numero] = posicao;
        adicionar(`${numero} 0 obj\n${conteudo}\nendobj\n`);
    };

    const paginaPaisagem = larguraImagem > alturaImagem;
    const larguraPagina = paginaPaisagem ? 842 : 595;
    const alturaPagina = paginaPaisagem ? 595 : 842;
    const escala = Math.min(larguraPagina / larguraImagem, alturaPagina / alturaImagem);
    const larguraDesenho = larguraImagem * escala;
    const alturaDesenho = alturaImagem * escala;
    const x = (larguraPagina - larguraDesenho) / 2;
    const y = (alturaPagina - alturaDesenho) / 2;
    const conteudoPagina = `q ${larguraDesenho.toFixed(2)} 0 0 ${alturaDesenho.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;

    adicionar("%PDF-1.4\n");
    adicionarObjetoTexto(1, "<< /Type /Catalog /Pages 2 0 R >>");
    adicionarObjetoTexto(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    adicionarObjetoTexto(
        3,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${larguraPagina} ${alturaPagina}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
    );

    offsets[4] = posicao;
    adicionar(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${larguraImagem} /Height ${alturaImagem} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    adicionar(jpegBytes);
    adicionar("\nendstream\nendobj\n");

    offsets[5] = posicao;
    adicionar(`5 0 obj\n<< /Length ${encoder.encode(conteudoPagina).length} >>\nstream\n${conteudoPagina}\nendstream\nendobj\n`);

    const inicioXref = posicao;
    adicionar("xref\n0 6\n0000000000 65535 f \n");
    for (let i = 1; i <= 5; i += 1) {
        adicionar(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
    }
    adicionar(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`);

    return new Blob(chunks, { type: "application/pdf" });
}

async function converterImagemCertificadoParaPdf(arquivo) {
    const imagem = await carregarImagemCertificado(arquivo);
    const canvas = desenharImagemCertificadoEmCanvas(imagem);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    const jpegBytes = base64ParaUint8Array(dataUrl.split(",")[1] || "");
    const pdfBlob = montarPdfComJpeg({
        jpegBytes,
        larguraImagem: canvas.width,
        alturaImagem: canvas.height,
    });
    const nomePdf = trocarExtensaoParaPdf(arquivo.name || "certificado.pdf");

    if (typeof File === "function") {
        return new File([pdfBlob], nomePdf, {
            type: "application/pdf",
            lastModified: arquivo.lastModified || Date.now(),
        });
    }

    Object.defineProperty(pdfBlob, "name", { value: nomePdf });
    return pdfBlob;
}

async function prepararArquivoCertificadoParaUpload(arquivo) {
    if (arquivoEhPdf(arquivo)) return arquivo;

    if (arquivoEhImagemSuportadaCertificado(arquivo)) {
        return converterImagemCertificadoParaPdf(arquivo);
    }

    throw new Error("Formato de certificado nÃ£o suportado. Envie PDF, JPG, PNG ou WebP.");
}

export function codigoPastaCertificado(colaborador) {
    const codigo = String(colaborador?.codigoFuncionario || colaborador?.codigo_funcionario || "").trim();

    if (!codigo) {
        throw new Error("O colaborador não possui código do funcionário para organizar o arquivo no Storage.");
    }

    return sanitizarNomeArquivo(codigo).replace(/\.[^.]+$/, "");
}

export async function enviarArquivoCertificado({ supabase, arquivo, colaborador, treinamentoId }) {
    if (!arquivo) return { arquivoUrl: null, arquivoNome: null };

    if (!supabase) {
        throw new Error("Cliente Supabase não informado para upload do certificado.");
    }

    if (!validarArquivoAntesUpload(arquivo, "documentoSimples")) {
        throw new Error("Certificado/documento fora do limite configurado.");
    }

    const arquivoUpload = await prepararArquivoCertificadoParaUpload(arquivo);
    const nomeSeguro = sanitizarNomeArquivo(arquivoUpload.name || arquivo.name || "certificado.pdf");
    const codigoPasta = codigoPastaCertificado(colaborador);
    const treinamentoIdSeguro = Number(treinamentoId);

    if (!Number.isFinite(treinamentoIdSeguro)) {
        throw new Error("Treinamento/documento inválido para organizar o certificado no Storage.");
    }

    /*
     * CERT-HIST-G1-R2-F1
     *
     * Todos os certificados/documentos persistidos em
     * public.certificados recebem identidade física imutável.
     *
     * timestamp + randomUUID:
     * - evita reutilização do caminho;
     * - permite coexistência das versões.
     *
     * upsert:false:
     * - impede sobrescrita silenciosa.
     */
    const identificadorVersao =
        globalThis.crypto?.randomUUID?.();

    if (!identificadorVersao) {
        throw new Error(
            "O navegador não disponibiliza crypto.randomUUID para versionar o certificado/documento."
        );
    }

    const caminho =
        `${codigoPasta}/${treinamentoIdSeguro}/${Date.now()}-${identificadorVersao}-${nomeSeguro}`;

    const { error } = await supabase.storage
        .from(BUCKET_CERTIFICADOS_TREINAMENTOS)
        .upload(caminho, arquivoUpload, {
            cacheControl: "3600",
            upsert: false,
            contentType: arquivoUpload.type || "application/pdf",
        });

    if (error) {
        throw new Error(`Erro ao enviar certificado: ${error.message}`);
    }

    return { arquivoUrl: caminho, arquivoNome: nomeSeguro };
}

export async function removerArquivoCertificadoStorage({ supabase, caminho }) {
    const caminhoTratado = String(caminho || "").trim();

    if (!caminhoTratado) return false;

    const { error } = await supabase.storage
        .from(BUCKET_CERTIFICADOS_TREINAMENTOS)
        .remove([caminhoTratado]);

    if (error) {
        throw new Error(`Erro ao remover certificado antigo do Storage: ${error.message}`);
    }

    return true;
}

export async function gerarUrlAssinadaCertificado({ supabase, caminho, expiracaoSegundos = 60 * 10 }) {
    const caminhoTratado = String(caminho || "").trim();

    if (!caminhoTratado) {
        throw new Error("Caminho do certificado não informado para visualização.");
    }

    const { data, error } = await supabase.storage
        .from(BUCKET_CERTIFICADOS_TREINAMENTOS)
        .createSignedUrl(caminhoTratado, expiracaoSegundos);

    if (error) {
        throw new Error(`Erro ao gerar link do certificado: ${error.message}`);
    }

    return data?.signedUrl || "";
}
