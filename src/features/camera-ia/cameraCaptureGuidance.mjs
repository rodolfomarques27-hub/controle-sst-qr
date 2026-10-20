const definitions = Object.freeze({
    NO_FACE: Object.freeze({
        title: "Rosto não identificado",
        instruction: "Posicione o rosto dentro da área de captura e tente novamente.",
        success: false,
    }),
    MULTIPLE_FACES: Object.freeze({
        title: "Mais de uma pessoa identificada",
        instruction: "Deixe somente uma pessoa no enquadramento e tente novamente.",
        success: false,
    }),
    ALIGNMENT_FAILED: Object.freeze({
        title: "Não foi possível alinhar o rosto",
        instruction: "Olhe de frente para a câmera e tente outra captura.",
        success: false,
    }),
    INVALID_FRAME: Object.freeze({
        title: "Imagem inválida",
        instruction: "Verifique a câmera e tente capturar novamente.",
        success: false,
    }),
    FRAME_UNAVAILABLE: Object.freeze({
        title: "Imagem indisponível",
        instruction: "Verifique a conexão da câmera antes de tentar novamente.",
        success: false,
    }),
    DETECTION_FAILED: Object.freeze({
        title: "Falha no processamento facial",
        instruction: "Tente novamente. Se o problema persistir, solicite suporte.",
        success: false,
    }),
    EMBEDDING_FAILED: Object.freeze({
        title: "Análise facial não concluída",
        instruction: "Faça uma nova tentativa. Se persistir, procure o responsável.",
        success: false,
    }),
    CAPTURED: Object.freeze({
        title: "Captura realizada",
        instruction: "A imagem foi processada. Isso não significa liberação de acesso.",
        success: true,
    }),
});

const unknown = Object.freeze({
    title: "Resultado de captura não confirmado",
    instruction: "Não considere a captura concluída. Consulte o responsável.",
    success: false,
});

export const cameraCapturePreviewOptions = Object.freeze([
    { status: "NO_FACE", label: "Sem rosto" },
    { status: "MULTIPLE_FACES", label: "Múltiplos rostos" },
    { status: "ALIGNMENT_FAILED", label: "Alinhamento" },
    { status: "INVALID_FRAME", label: "Imagem inválida" },
    { status: "FRAME_UNAVAILABLE", label: "Sem imagem" },
    { status: "DETECTION_FAILED", label: "Detecção" },
    { status: "EMBEDDING_FAILED", label: "Análise facial" },
    { status: "CAPTURED", label: "Captura concluída" },
]);

export function getCameraCaptureGuidance(status) {
    return Object.hasOwn(definitions, status) ? definitions[status] : unknown;
}

export function getCameraCaptureGuidanceFromResult(result) {
    if (
        result === null ||
        typeof result !== "object" ||
        typeof result.accepted !== "boolean" ||
        typeof result.status !== "string" ||
        !Object.hasOwn(definitions, result.status)
    ) {
        return unknown;
    }

    const guidance = definitions[result.status];

    if (result.accepted !== guidance.success) {
        return unknown;
    }

    return guidance;
}
