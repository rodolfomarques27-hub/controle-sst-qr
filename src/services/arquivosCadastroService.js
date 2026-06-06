import { reduzirFotoParaAuditoria } from "./imagemService";
import { sanitizarNomeArquivo } from "../utils/sstUtils";

function arquivoEhImagem(arquivo) {
    return String(arquivo?.type || "").toLowerCase().startsWith("image/");
}

async function otimizarImagemAntesDoUpload(arquivo, opcoes = {}) {
    if (!arquivo || !arquivoEhImagem(arquivo)) return arquivo;

    return reduzirFotoParaAuditoria(arquivo, {
        maxLado: opcoes.maxLado || 1600,
        alvoBytes: opcoes.alvoBytes || 900 * 1024,
        qualidadeInicial: opcoes.qualidadeInicial || 0.86,
        qualidadeMinima: opcoes.qualidadeMinima || 0.55,
        tipoSaida: opcoes.tipoSaida || "image/jpeg",
    });
}

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

    const arquivoFinal = await otimizarImagemAntesDoUpload(arquivo, {
        maxLado: 1000,
        alvoBytes: 650 * 1024,
        qualidadeInicial: 0.84,
        qualidadeMinima: 0.55,
    });

    validarArquivoUpload({
        arquivo: arquivoFinal,
        tipoValidacao: "fotoAuditoria",
        mensagemErro: "Arquivo de logo fora do limite configurado.",
        validarArquivoAntesUpload,
    });

    const nomeSeguro = sanitizarNomeArquivo(arquivoFinal.name);
    const caminho = `${empresaId || "nova-empresa"}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
        .from("logos-empresas")
        .upload(caminho, arquivoFinal, {
            cacheControl: "3600",
            upsert: true,
            contentType: arquivoFinal.type || "image/png",
        });

    if (error) {
        throw new Error(`Erro ao enviar logo: ${error.message}`);
    }

    return { logoUrl: caminho, logoNome: nomeSeguro };
}

export async function enviarContratoEmpresaStorage({ supabase, arquivo, empresaId, validarArquivoAntesUpload }) {
    if (!arquivo) return { contratoUrl: null, contratoNome: null };

    const arquivoFinal = await otimizarImagemAntesDoUpload(arquivo, {
        maxLado: 1600,
        alvoBytes: 1200 * 1024,
        qualidadeInicial: 0.86,
        qualidadeMinima: 0.58,
    });

    validarArquivoUpload({
        arquivo: arquivoFinal,
        tipoValidacao: "documentoExtenso",
        mensagemErro: "Contrato fora do limite configurado.",
        validarArquivoAntesUpload,
    });

    const nomeSeguro = sanitizarNomeArquivo(arquivoFinal.name);
    const caminho = `${empresaId || "nova-empresa"}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
        .from("contratos-empresas")
        .upload(caminho, arquivoFinal, {
            cacheControl: "3600",
            upsert: true,
            contentType: arquivoFinal.type || "application/pdf",
        });

    if (error) {
        throw new Error(`Erro ao enviar contrato: ${error.message}`);
    }

    return { contratoUrl: caminho, contratoNome: nomeSeguro };
}

export async function enviarFotoColaboradorStorage({ supabase, arquivo, colaboradorId, validarArquivoAntesUpload }) {
    if (!arquivo) return { fotoUrl: null, fotoNome: null };

    const arquivoFinal = await otimizarImagemAntesDoUpload(arquivo, {
        maxLado: 1000,
        alvoBytes: 650 * 1024,
        qualidadeInicial: 0.84,
        qualidadeMinima: 0.55,
    });

    validarArquivoUpload({
        arquivo: arquivoFinal,
        tipoValidacao: "fotoAuditoria",
        mensagemErro: "Arquivo de imagem fora do limite configurado.",
        validarArquivoAntesUpload,
    });

    const nomeSeguro = sanitizarNomeArquivo(arquivoFinal.name);
    const caminho = `${colaboradorId}/${Date.now()}-${nomeSeguro}`;

    const { error } = await supabase.storage
        .from("fotos-colaboradores")
        .upload(caminho, arquivoFinal, {
            cacheControl: "3600",
            upsert: true,
            contentType: arquivoFinal.type || "image/png",
        });

    if (error) {
        throw new Error(`Erro ao enviar foto do colaborador: ${error.message}`);
    }

    return { fotoUrl: caminho, fotoNome: nomeSeguro };
}
