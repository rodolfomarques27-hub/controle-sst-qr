const BUCKET_ASSINATURAS_EMAIL_SST =
    "assinaturas-email-sst";

const TAMANHO_MAXIMO_ASSINATURA_EMAIL_SST =
    2 * 1024 * 1024;

const TIPOS_MIME_ASSINATURA_EMAIL_SST =
    new Set([
        "image/png",
        "image/jpeg",
    ]);

const CAMINHOS_ASSINATURA_EMAIL_SST =
    Object.freeze({
        alerta_documento_colaborador:
            "modelos/alerta_documento_colaborador/assinatura",

        alerta_documento_empresa:
            "modelos/alerta_documento_empresa/assinatura",

        alerta_documentos_lote:
            "modelos/alerta_documentos_lote/assinatura",

        alerta_treinamentos:
            "modelos/alerta_treinamentos/assinatura",

        alerta_auditoria:
            "modelos/alerta_auditoria/assinatura",

        certidao_mensal_documental:
            "modelos/certidao_mensal_documental/assinatura",
    });

function validarClienteSupabase(supabase) {
    if (
        !supabase ||
        !supabase.storage ||
        typeof supabase.storage.from !== "function"
    ) {
        throw new Error(
            "Cliente Supabase indisponível para acessar a assinatura."
        );
    }
}

function formatarErroStorage(
    error,
    mensagemPadrao
) {
    const mensagem =
        String(
            error?.message ||
            error?.error ||
            ""
        ).trim();

    return mensagem
        ? `${mensagemPadrao} ${mensagem}`
        : mensagemPadrao;
}

function erroIndicaArquivoAusente(error) {
    const status =
        Number(
            error?.statusCode ??
            error?.status ??
            0
        );

    const codigo =
        String(
            error?.code ||
            ""
        )
            .trim()
            .toLowerCase();

    const mensagem =
        String(
            error?.message ||
            error?.error ||
            ""
        )
            .trim()
            .toLowerCase();

    return (
        status === 404 ||
        codigo === "404" ||
        codigo === "not_found" ||
        codigo === "object_not_found" ||
        mensagem.includes("not found") ||
        mensagem.includes("object not found")
    );
}

export function obterCaminhoAssinaturaModeloEmailSst(
    tipo
) {
    const tipoNormalizado =
        String(tipo || "")
            .trim()
            .toLowerCase();

    const caminho =
        CAMINHOS_ASSINATURA_EMAIL_SST[
            tipoNormalizado
        ];

    if (!caminho) {
        throw new Error(
            "Tipo de modelo de e-mail SST inválido para a assinatura."
        );
    }

    return caminho;
}

export function validarArquivoAssinaturaModeloEmailSst(
    arquivo
) {
    if (
        !arquivo ||
        typeof arquivo !== "object"
    ) {
        throw new Error(
            "Selecione uma imagem de assinatura."
        );
    }

    const tamanhoBytes =
        Number(arquivo.size);

    const tipoMime =
        String(arquivo.type || "")
            .trim()
            .toLowerCase();

    if (
        !Number.isFinite(tamanhoBytes) ||
        tamanhoBytes < 1
    ) {
        throw new Error(
            "A imagem da assinatura está vazia ou é inválida."
        );
    }

    if (
        tamanhoBytes >
        TAMANHO_MAXIMO_ASSINATURA_EMAIL_SST
    ) {
        throw new Error(
            "A imagem da assinatura deve possuir no máximo 2 MB."
        );
    }

    if (
        !TIPOS_MIME_ASSINATURA_EMAIL_SST.has(
            tipoMime
        )
    ) {
        throw new Error(
            "A assinatura deve estar no formato PNG ou JPEG."
        );
    }

    return {
        tipoMime,
        tamanhoBytes,
    };
}

function validarBlobAssinatura(blob) {
    if (
        !blob ||
        typeof blob !== "object"
    ) {
        throw new Error(
            "A assinatura armazenada não retornou um arquivo válido."
        );
    }

    const tipoMime =
        String(blob.type || "")
            .trim()
            .toLowerCase();

    const tamanhoBytes =
        Number(blob.size);

    if (
        !TIPOS_MIME_ASSINATURA_EMAIL_SST.has(
            tipoMime
        )
    ) {
        throw new Error(
            "A assinatura armazenada possui um formato inválido."
        );
    }

    if (
        !Number.isFinite(tamanhoBytes) ||
        tamanhoBytes < 1 ||
        tamanhoBytes >
            TAMANHO_MAXIMO_ASSINATURA_EMAIL_SST
    ) {
        throw new Error(
            "A assinatura armazenada possui um tamanho inválido."
        );
    }

    return {
        tipoMime,
        tamanhoBytes,
    };
}

export async function baixarAssinaturaModeloEmailSstService({
    supabase,
    tipo,
}) {
    validarClienteSupabase(supabase);

    const caminho =
        obterCaminhoAssinaturaModeloEmailSst(
            tipo
        );

    const {
        data,
        error,
    } =
        await supabase.storage
            .from(
                BUCKET_ASSINATURAS_EMAIL_SST
            )
            .download(caminho);

    if (error) {
        if (erroIndicaArquivoAusente(error)) {
            return null;
        }

        throw new Error(
            formatarErroStorage(
                error,
                "Não foi possível carregar a assinatura privada."
            )
        );
    }

    if (!data) {
        return null;
    }

    const {
        tipoMime,
        tamanhoBytes,
    } =
        validarBlobAssinatura(data);

    return {
        caminho,
        blob: data,
        tipoMime,
        tamanhoBytes,
    };
}

export async function salvarAssinaturaModeloEmailSstService({
    supabase,
    tipo,
    arquivo,
}) {
    validarClienteSupabase(supabase);

    const caminho =
        obterCaminhoAssinaturaModeloEmailSst(
            tipo
        );

    const {
        tipoMime,
        tamanhoBytes,
    } =
        validarArquivoAssinaturaModeloEmailSst(
            arquivo
        );

    const {
        data,
        error,
    } =
        await supabase.storage
            .from(
                BUCKET_ASSINATURAS_EMAIL_SST
            )
            .upload(
                caminho,
                arquivo,
                {
                    upsert: true,
                    contentType: tipoMime,
                    cacheControl: "60",
                }
            );

    if (error) {
        throw new Error(
            formatarErroStorage(
                error,
                "Não foi possível salvar a assinatura privada."
            )
        );
    }

    return {
        caminho:
            data?.path ||
            caminho,
        tipoMime,
        tamanhoBytes,
    };
}

export async function removerAssinaturaModeloEmailSstService({
    supabase,
    tipo,
}) {
    validarClienteSupabase(supabase);

    const caminho =
        obterCaminhoAssinaturaModeloEmailSst(
            tipo
        );

    const {
        error,
    } =
        await supabase.storage
            .from(
                BUCKET_ASSINATURAS_EMAIL_SST
            )
            .remove([
                caminho,
            ]);

    if (
        error &&
        !erroIndicaArquivoAusente(error)
    ) {
        throw new Error(
            formatarErroStorage(
                error,
                "Não foi possível remover a assinatura privada."
            )
        );
    }

    return {
        caminho,
        removida: true,
    };
}

export const CONFIGURACAO_ASSINATURAS_EMAIL_SST =
    Object.freeze({
        bucket:
            BUCKET_ASSINATURAS_EMAIL_SST,

        tamanhoMaximoBytes:
            TAMANHO_MAXIMO_ASSINATURA_EMAIL_SST,

        tiposMime:
            Object.freeze([
                ...TIPOS_MIME_ASSINATURA_EMAIL_SST,
            ]),

        caminhos:
            CAMINHOS_ASSINATURA_EMAIL_SST,
    });
