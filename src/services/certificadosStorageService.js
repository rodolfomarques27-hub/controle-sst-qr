import { validarArquivoAntesUpload } from "../components/FileUploadAviso";
import { sanitizarNomeArquivo } from "../utils/sstUtils";

export const BUCKET_CERTIFICADOS_TREINAMENTOS = "certificados-treinamentos";

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

    const nomeSeguro = sanitizarNomeArquivo(arquivo.name || "certificado.pdf");
    const codigoPasta = codigoPastaCertificado(colaborador);
    const treinamentoIdSeguro = Number(treinamentoId);

    if (!Number.isFinite(treinamentoIdSeguro)) {
        throw new Error("Treinamento/documento inválido para organizar o certificado no Storage.");
    }

    const caminho = `${codigoPasta}/${treinamentoIdSeguro}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
        .from(BUCKET_CERTIFICADOS_TREINAMENTOS)
        .upload(caminho, arquivo, {
            cacheControl: "3600",
            upsert: true,
            contentType: arquivo.type || "application/pdf",
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
