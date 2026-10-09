import { supabase } from "../lib/supabaseClient";
import { reduzirFotoParaAuditoria } from "./imagemService";
import { LIMITE_FOTOS_POR_FASE } from "./auditoriaCampoFotosMultiplasService.js";
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

    if (!["image/jpeg", "image/png", "image/webp"].includes(tipoArquivo)) {
        throw new Error("Somente imagens PNG, JPG, JPEG ou WEBP podem ser enviadas como evidência da auditoria.");
    }

    if (Number(arquivoOtimizado.size || 0) > 4 * 1024 * 1024) {
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
        tipo: tipoArquivo,
        base64,
    };
}

export async function validarSenhaAuditoriaQr({
    tokenAuditoria =
        obterTokenAuditoriaQrColaboradorConfigurado(),

    senha = "",
} = {}) {
    const resultado =
        await validarAcessoAuditoriaPublicaPadrao({
            senha,

            tokens: [
                tokenAuditoria,
                obterTokenAuditoriaQrColaboradorConfigurado(),
            ],
        });

    return (
        resultado ||
        {
            ok: false,
            autorizado: false,
            mensagem:
                "Resposta inválida ao validar o PIN de acesso.",
        }
    );
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
    tokenAuditoria =
        obterTokenAuditoriaQrColaboradorConfigurado(),

    senha = "",
    tokenQr = "",
    auditoria = {},
    desvio = null,
    fotos = {},
} = {}) {
    const senhaSegura =
        texto(
            senha
        );

    const tokenQrSeguro =
        texto(
            tokenQr ||
            auditoria?.token_qr
        );

    if (!senhaSegura) {
        throw new Error(
            "Informe seu PIN de acesso antes de salvar."
        );
    }

    const validacao =
        await validarAcessoAuditoriaPublicaPadrao({
            senha:
                senhaSegura,

            tokens: [
                tokenAuditoria,
                obterTokenAuditoriaQrColaboradorConfigurado(),
            ],
        });

    const tokenAuditoriaSeguro =
        texto(
            validacao?.tokenValidado
        ) ||
        await resolverTokenAuditoriaQrColaborador(
            tokenAuditoria
        );

    if (!tokenAuditoriaSeguro) {
        throw new Error(
            "Token público da auditoria não informado."
        );
    }

    if (!validacao?.autorizado) {
        throw new Error(
            validacao?.mensagem ||
            "PIN de acesso inválido."
        );
    }

    if (!tokenQrSeguro) {
        throw new Error(
            "Token QR do colaborador não informado."
        );
    }

    const extrasAntes =
        Array.isArray(
            fotos?.extrasAntes
        )
            ? fotos.extrasAntes
            : [];

    const extrasDepois =
        Array.isArray(
            fotos?.extrasDepois
        )
            ? fotos.extrasDepois
            : [];

    if (
        (
            extrasAntes.length ||
            extrasDepois.length
        ) &&
        !desvio
    ) {
        throw new Error(
            "As fotos adicionais precisam estar vinculadas a um desvio."
        );
    }

    if (
        extrasAntes.length +
            Number(
                Boolean(
                    fotos?.antes
                )
            ) >
            LIMITE_FOTOS_POR_FASE ||

        extrasDepois.length +
            Number(
                Boolean(
                    fotos?.depois
                )
            ) >
            LIMITE_FOTOS_POR_FASE
    ) {
        throw new Error(
            "Limite de oito fotos por fase excedido."
        );
    }

    const fotoAntesPayload =
        desvio
            ? await arquivoParaBase64Payload(
                fotos?.antes
            )
            : null;

    const fotoDepoisPayload =
        desvio
            ? await arquivoParaBase64Payload(
                fotos?.depois
            )
            : null;

    const extrasAntesPayload =
        [];

    const extrasDepoisPayload =
        [];

    for (
        const arquivo
        of extrasAntes
    ) {
        extrasAntesPayload.push(
            await arquivoParaBase64Payload(
                arquivo
            )
        );
    }

    for (
        const arquivo
        of extrasDepois
    ) {
        extrasDepoisPayload.push(
            await arquivoParaBase64Payload(
                arquivo
            )
        );
    }

    const possuiExtras =
        extrasAntesPayload.length > 0 ||
        extrasDepoisPayload.length > 0;

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            "salvar-auditoria-qr-colaborador",
            {
                body: {
                    tokenAuditoria:
                        tokenAuditoriaSeguro,

                    senha:
                        senhaSegura,

                    tokenQr:
                        tokenQrSeguro,

                    auditoria,
                    desvio,

                    fotos: {
                        antes:
                            fotoAntesPayload,

                        depois:
                            fotoDepoisPayload,

                        ...(
                            possuiExtras
                                ? {
                                    extrasAntes:
                                        extrasAntesPayload,

                                    extrasDepois:
                                        extrasDepoisPayload,
                                }
                                : {}
                        ),
                    },
                },
            }
        );

    if (
        error ||
        data?.ok === false
    ) {
        throw new Error(
            error?.message ||
            data?.erro ||
            data?.mensagem ||
            "Falha ao salvar auditoria pública do colaborador."
        );
    }

    return data;
}
