import {
    SFACE_CANONICAL_LANDMARKS_112,
    SFACE_INPUT_HEIGHT,
    SFACE_INPUT_WIDTH,
} from "../recognition/sfaceEmbedding.mjs";

export const BIOMETRIC_FRAME_STATUS =
    Object.freeze({
        FRAME_PROCESSED:
            "FRAME_PROCESSED",

        NO_FACE:
            "NO_FACE",

        MULTIPLE_FACES:
            "MULTIPLE_FACES",

        BIOMETRIC_RANKING_AVAILABLE:
            "BIOMETRIC_RANKING_AVAILABLE",

        NO_REFERENCE:
            "NO_REFERENCE",

        PROCESSING_ERROR:
            "PROCESSING_ERROR",
    });

export const BIOMETRIC_FRAME_STAGE =
    Object.freeze({
        INPUT:
            "INPUT",

        DETECTION:
            "DETECTION",

        ALIGNMENT:
            "ALIGNMENT",

        EMBEDDING:
            "EMBEDDING",

        IDENTIFICATION:
            "IDENTIFICATION",
    });

const PUBLIC_BIOMETRIC_KEYS =
    Object.freeze([
        "status",
        "candidateCount",
        "top1",
        "top2",
        "margin",
        "fineVerification",
        "thresholds",
        "decision",
    ]);

const FORBIDDEN_PUBLIC_KEY =
    /(embedding|vector|cipher|token|secret|password|credential)/i;

const MAX_PUBLIC_DEPTH =
    8;

function requireFunction(
    value,
    name,
) {
    if (typeof value !== "function") {
        throw new TypeError(
            `${name} deve ser funcao.`,
        );
    }

    return value;
}

function requireAlignmentPolicy(
    policy,
) {
    if (
        !policy ||
        typeof policy !== "object" ||
        Array.isArray(
            policy,
        )
    ) {
        throw new TypeError(
            "alignmentPolicy deve ser objeto.",
        );
    }

    const normalized =
        {};

    for (
        const key of
        [
            "paddingRatio",
            "minFaceSizePx",
            "minVisibleAreaRatio",
            "maxRmsError",
        ]
    ) {
        const value =
            policy[key];

        if (
            typeof value !== "number" ||
            !Number.isFinite(
                value,
            )
        ) {
            throw new TypeError(
                `alignmentPolicy.${key} deve ser numero finito.`,
            );
        }

        normalized[key] =
            value;
    }

    return Object.freeze(
        normalized,
    );
}

function validateFrame({
    data,
    width,
    height,
}) {
    if (
        !(
            data instanceof
            Uint8Array
        )
    ) {
        throw new TypeError(
            "frame.data deve ser Uint8Array/Buffer BGR24.",
        );
    }

    if (
        !Number.isSafeInteger(
            width,
        ) ||
        width <= 0 ||
        !Number.isSafeInteger(
            height,
        ) ||
        height <= 0
    ) {
        throw new TypeError(
            "frame width/height devem ser inteiros positivos.",
        );
    }

    const expectedBytes =
        width *
        height *
        3;

    if (
        !Number.isSafeInteger(
            expectedBytes,
        ) ||
        data.byteLength !==
            expectedBytes
    ) {
        throw new RangeError(
            "frame BGR24 possui tamanho invalido.",
        );
    }
}

function sanitizePublicValue(
    value,
    depth = 0,
) {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
    ) {
        return value;
    }

    if (typeof value === "number") {
        return Number.isFinite(
            value,
        )
            ? value
            : null;
    }

    if (
        value === undefined ||
        typeof value === "function" ||
        typeof value === "symbol" ||
        typeof value === "bigint"
    ) {
        return undefined;
    }

    if (
        depth >=
        MAX_PUBLIC_DEPTH
    ) {
        return null;
    }

    if (
        ArrayBuffer.isView(
            value,
        )
    ) {
        return undefined;
    }

    if (Array.isArray(value)) {
        const sanitized =
            value
                .map(
                    (
                        item,
                    ) =>
                        sanitizePublicValue(
                            item,
                            depth + 1,
                        ),
                )
                .filter(
                    (
                        item,
                    ) =>
                        item !== undefined,
                );

        return Object.freeze(
            sanitized,
        );
    }

    if (typeof value === "object") {
        const sanitized =
            {};

        for (
            const [
                key,
                child,
            ] of
            Object.entries(
                value,
            )
        ) {
            if (
                FORBIDDEN_PUBLIC_KEY.test(
                    key,
                )
            ) {
                continue;
            }

            const safeChild =
                sanitizePublicValue(
                    child,
                    depth + 1,
                );

            if (safeChild !== undefined) {
                sanitized[key] =
                    safeChild;
            }
        }

        return Object.freeze(
            sanitized,
        );
    }

    return undefined;
}

function sanitizeBiometricResult(
    result,
) {
    if (
        !result ||
        typeof result !== "object" ||
        Array.isArray(
            result,
        )
    ) {
        throw new TypeError(
            "resultado biometrico deve ser objeto.",
        );
    }

    const sanitized =
        {};

    for (
        const key of
        PUBLIC_BIOMETRIC_KEYS
    ) {
        if (
            !Object.hasOwn(
                result,
                key,
            )
        ) {
            continue;
        }

        const safeValue =
            sanitizePublicValue(
                result[key],
            );

        if (safeValue !== undefined) {
            sanitized[key] =
                safeValue;
        }
    }

    return Object.freeze(
        sanitized,
    );
}

function safeErrorCode(
    error,
    fallback,
) {
    const raw =
        typeof error?.code === "string"
            ? error.code.trim()
            : "";

    if (
        raw &&
        raw.length <= 120 &&
        /^[A-Za-z0-9_.:-]+$/.test(
            raw,
        )
    ) {
        return raw;
    }

    return fallback;
}

function processingError({
    stage,
    error,
    fallbackCode,
    requestId,
    faceCount = null,
}) {
    return Object.freeze({
        status:
            BIOMETRIC_FRAME_STATUS.PROCESSING_ERROR,

        stage,

        errorCode:
            safeErrorCode(
                error,
                fallbackCode,
            ),

        requestId:
            requestId ?? null,

        faceCount,
    });
}

function mapBiometricStatus(
    biometricResult,
) {
    if (
        biometricResult.status ===
        "NO_REFERENCE"
    ) {
        return BIOMETRIC_FRAME_STATUS.NO_REFERENCE;
    }

    if (
        biometricResult.status ===
        "RANKED"
    ) {
        return BIOMETRIC_FRAME_STATUS.BIOMETRIC_RANKING_AVAILABLE;
    }

    return BIOMETRIC_FRAME_STATUS.FRAME_PROCESSED;
}

export function createBiometricFrameOrchestrator({
    detector,
    alignFace,
    embeddingExtractor,
    identificationPipeline,
    alignmentPolicy,
} = {}) {
    const detectBgr =
        requireFunction(
            detector?.detectBgr,
            "detector.detectBgr",
        );

    const alignFaceImpl =
        requireFunction(
            alignFace,
            "alignFace",
        );

    const extractBgr112 =
        requireFunction(
            embeddingExtractor?.extractBgr112,
            "embeddingExtractor.extractBgr112",
        );

    const identifySface =
        requireFunction(
            identificationPipeline?.identifySface,
            "identificationPipeline.identifySface",
        );

    const policy =
        requireAlignmentPolicy(
            alignmentPolicy,
        );

    async function processFrame({
        data,
        width,
        height,
        tenantId,
        empresaId,
        profileId,
        requestId,
    } = {}) {
        try {
            validateFrame({
                data,
                width,
                height,
            });
        }
        catch (error) {
            return processingError({
                stage:
                    BIOMETRIC_FRAME_STAGE.INPUT,

                error,

                fallbackCode:
                    "INVALID_FRAME",

                requestId,
            });
        }

        let detections;

        try {
            detections =
                await detectBgr({
                    data,
                    width,
                    height,
                });

            if (
                !Array.isArray(
                    detections,
                )
            ) {
                const error =
                    new Error(
                        "detector retornou contrato invalido.",
                    );

                error.code =
                    "DETECTOR_INVALID_RESULT";

                throw error;
            }
        }
        catch (error) {
            return processingError({
                stage:
                    BIOMETRIC_FRAME_STAGE.DETECTION,

                error,

                fallbackCode:
                    "DETECTION_FAILED",

                requestId,
            });
        }

        if (
            detections.length ===
            0
        ) {
            return Object.freeze({
                status:
                    BIOMETRIC_FRAME_STATUS.NO_FACE,

                requestId:
                    requestId ?? null,

                faceCount:
                    0,
            });
        }

        if (
            detections.length !==
            1
        ) {
            return Object.freeze({
                status:
                    BIOMETRIC_FRAME_STATUS.MULTIPLE_FACES,

                requestId:
                    requestId ?? null,

                faceCount:
                    detections.length,
            });
        }

        const detection =
            detections[0];

        let aligned;

        try {
            aligned =
                await alignFaceImpl({
                    data,
                    width,
                    height,

                    detection,

                    targetWidth:
                        SFACE_INPUT_WIDTH,

                    targetHeight:
                        SFACE_INPUT_HEIGHT,

                    templateLandmarks:
                        SFACE_CANONICAL_LANDMARKS_112,

                    paddingRatio:
                        policy.paddingRatio,

                    minFaceSizePx:
                        policy.minFaceSizePx,

                    minVisibleAreaRatio:
                        policy.minVisibleAreaRatio,

                    maxRmsError:
                        policy.maxRmsError,
                });
        }
        catch (error) {
            return processingError({
                stage:
                    BIOMETRIC_FRAME_STAGE.ALIGNMENT,

                error,

                fallbackCode:
                    "ALIGNMENT_FAILED",

                requestId,

                faceCount:
                    1,
            });
        }

        let observedEmbedding;

        try {
            observedEmbedding =
                await extractBgr112({
                    data:
                        aligned.data,

                    width:
                        aligned.width,

                    height:
                        aligned.height,
                });
        }
        catch (error) {
            return processingError({
                stage:
                    BIOMETRIC_FRAME_STAGE.EMBEDDING,

                error,

                fallbackCode:
                    "EMBEDDING_FAILED",

                requestId,

                faceCount:
                    1,
            });
        }

        try {
            const rawBiometricResult =
                await identifySface({
                    tenantId,
                    empresaId,
                    profileId,
                    requestId,

                    observedEmbedding,
                });

            const biometricResult =
                sanitizeBiometricResult(
                    rawBiometricResult,
                );

            const detectionScore =
                Number.isFinite(
                    detection?.score,
                )
                    ? detection.score
                    : null;

            return Object.freeze({
                status:
                    mapBiometricStatus(
                        biometricResult,
                    ),

                requestId:
                    requestId ?? null,

                faceCount:
                    1,

                detection:
                    Object.freeze({
                        score:
                            detectionScore,
                    }),

                biometric:
                    biometricResult,
            });
        }
        catch (error) {
            return processingError({
                stage:
                    BIOMETRIC_FRAME_STAGE.IDENTIFICATION,

                error,

                fallbackCode:
                    "IDENTIFICATION_FAILED",

                requestId,

                faceCount:
                    1,
            });
        }
        finally {
            if (
                observedEmbedding instanceof
                Float32Array
            ) {
                observedEmbedding.fill(
                    0,
                );
            }
        }
    }

    return Object.freeze({
        processFrame,
    });
}
