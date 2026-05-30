import { sanitizarNomeArquivo } from "../utils/sstUtils";

function validarArquivoUpload({ arquivo, tipoValidacao, mensagemErro, validarArquivoAntesUpload }) {
    if (!arquivo) return;

    if (typeof validarArquivoAntesUpload !== "function") {
        throw new Error("Validador de upload indisponível.");
    }

    if (!validarArquivoAntesUpload(arquivo, tipoValidacao)) {
        throw new Error(mensagemErro);
    }
}

export async function enviarLogoEmpresaStorage({ supabase, arquivo, empresaId, validarArquivoAntesUpload }) {
    if (!arquivo) return { logoUrl: null, logoNome: null };

    validarArquivoUpload({
        arquivo,
        tipoValidacao: "fotoAuditoria",
        mensagemErro: "Arquivo de logo fora do limite configurado.",
        validarArquivoAntesUpload,
    });

    const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
    const caminho = `${empresaId || "nova-empresa"}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
        .from("logos-empresas")
        .upload(caminho, arquivo, {
            cacheControl: "3600",
            upsert: true,
            contentType: arquivo.type || "image/png",
        });

    if (error) {
        throw new Error(`Erro ao enviar logo: ${error.message}`);
    }

    return { logoUrl: caminho, logoNome: nomeSeguro };
}

export async function enviarContratoEmpresaStorage({ supabase, arquivo, empresaId, validarArquivoAntesUpload }) {
    if (!arquivo) return { contratoUrl: null, contratoNome: null };

    validarArquivoUpload({
        arquivo,
        tipoValidacao: "documentoExtenso",
        mensagemErro: "Contrato fora do limite configurado.",
        validarArquivoAntesUpload,
    });

    const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
    const caminho = `${empresaId || "nova-empresa"}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
        .from("contratos-empresas")
        .upload(caminho, arquivo, {
            cacheControl: "3600",
            upsert: true,
            contentType: arquivo.type || "application/pdf",
        });

    if (error) {
        throw new Error(`Erro ao enviar contrato: ${error.message}`);
    }

    return { contratoUrl: caminho, contratoNome: nomeSeguro };
}

export async function enviarFotoColaboradorStorage({ supabase, arquivo, colaboradorId, validarArquivoAntesUpload }) {
    if (!arquivo) return { fotoUrl: null, fotoNome: null };

    validarArquivoUpload({
        arquivo,
        tipoValidacao: "fotoAuditoria",
        mensagemErro: "Arquivo de imagem fora do limite configurado.",
        validarArquivoAntesUpload,
    });

    const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
    const caminho = `${colaboradorId}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
        .from("fotos-colaboradores")
        .upload(caminho, arquivo, {
            cacheControl: "3600",
            upsert: true,
            contentType: arquivo.type || "image/png",
        });

    if (error) {
        throw new Error(`Erro ao enviar foto do colaborador: ${error.message}`);
    }

    return { fotoUrl: caminho, fotoNome: nomeSeguro };
}
