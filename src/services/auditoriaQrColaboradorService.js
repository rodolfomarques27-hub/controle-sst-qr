import { supabase } from "../lib/supabaseClient";
import { reduzirFotoParaAuditoria } from "./imagemService";
import { sanitizarNomeArquivo } from "../utils/sstUtils";
import { obterTokenAuditoriaPublicaUrl } from "../constants/auditoriaPublicaConstants";
import {
    resolverTokenAuditoriaPublicaPadrao,
    validarAcessoAuditoriaPublicaPadrao,
} from "./auditoriaPublicaTokenService";

function texto(valor) {
    return String(valor ?? "").trim();
}

export function obterTokenAuditoriaQrColaboradorConfigurado() {
    return texto(obterTokenAuditoriaPublicaUrl());
}

export async function resolverTokenAuditoriaQrColaborador(tokenAuditoria = "") {
    const resultado = await resolverTokenAuditoriaPublicaPadrao({
        tokens: [tokenAuditoria, obterTokenAuditoriaQrColaboradorConfigurado()],
    });

    return texto(resultado?.tokenPublico);
}

async function arquivoParaBase64Payload(arquivo) {
    if (!arquivo) return null;

    const arquivoOtimizado = await reduzirFotoParaAuditoria(arquivo, {
        maxLado: 1400,
        alvoBytes: 800 * 1024,
    });

    const tipoArquivo = String(arquivoOtimizado.type || arquivo.type || "").toLowerCase();

    if (!tipoArquivo.startsWith("image/")) {
        throw new Error("Somente imagens PNG, JPG, JPEG ou WEBP podem ser enviadas como evidência da auditoria.");
    }

    if (Number(arquivoOtimizado.size || 0) > 5 * 1024 * 1024) {
        throw new Error("Foto fora do tamanho permitido mesmo após a redução automática.");
    }

    const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Não foi possível ler a foto selecionada."));
        reader.readAsDataURL(arquivoOtimizado);
    });

    return {
        nome: sanitizarNomeArquivo(arquivoOtimizado.name || arquivo.name || "foto-auditoria.jpg"),
        tipo: arquivoOtimizado.type || arquivo.type || "image/jpeg",
        base64,
    };
}

export async function validarSenhaAuditoriaQr({
    tokenAuditoria = obterTokenAuditoriaQrColaboradorConfigurado(),
    senha = "",
} = {}) {
    const resultado = await validarAcessoAuditoriaPublicaPadrao({
        senha,
        tokens: [tokenAuditoria, obterTokenAuditoriaQrColaboradorConfigurado()],
    });

    return resultado || {
        ok: false,
        autorizado: false,
        mensagem: "Resposta inválida ao validar acesso da auditoria.",
    };
}

export async function gerarNumeroAuditoriaQr() {
    const { data, error } = await supabase.rpc("gerar_numero_auditoria_campo");

    if (!error && data) {
        return data;
    }

    const ano = new Date().getFullYear();
    const sequenciaFallback = String(Date.now()).slice(-4);

    return `AUD-${ano}-${sequenciaFallback}`;
}

export async function salvarAuditoriaQrColaborador({
    tokenAuditoria = obterTokenAuditoriaQrColaboradorConfigurado(),
    senha = "",
    tokenQr = "",
    auditoria = {},
    desvio = null,
    fotos = {},
} = {}) {
    const validacao = await validarAcessoAuditoriaPublicaPadrao({
        senha,
        tokens: [tokenAuditoria, obterTokenAuditoriaQrColaboradorConfigurado()],
    });
    const tokenAuditoriaSeguro = texto(validacao?.tokenValidado) || await resolverTokenAuditoriaQrColaborador(tokenAuditoria);
    const senhaSegura = texto(senha);
    const tokenQrSeguro = texto(tokenQr || auditoria?.token_qr);

    if (!tokenAuditoriaSeguro) {
        throw new Error("Token público da auditoria não informado.");
    }

    if (!validacao?.autorizado) {
        throw new Error(validacao?.mensagem || "Senha da auditoria inválida.");
    }

    if (!senhaSegura) {
        throw new Error("Informe a senha da auditoria antes de salvar.");
    }

    if (!tokenQrSeguro) {
        throw new Error("Token QR do colaborador não informado.");
    }

    const fotoAntesPayload = desvio ? await arquivoParaBase64Payload(fotos?.antes) : null;
    const fotoDepoisPayload = desvio ? await arquivoParaBase64Payload(fotos?.depois) : null;

    const { data, error } = await supabase.functions.invoke("salvar-auditoria-qr-colaborador", {
        body: {
            tokenAuditoria: tokenAuditoriaSeguro,
            senha: senhaSegura,
            tokenQr: tokenQrSeguro,
            auditoria,
            desvio,
            fotos: {
                antes: fotoAntesPayload,
                depois: fotoDepoisPayload,
            },
        },
    });

    if (error || data?.ok === false) {
        throw new Error(error?.message || data?.erro || data?.mensagem || "Falha ao salvar auditoria pública do colaborador.");
    }

    return data;
}
