import {
    fileURLToPath,
} from "node:url";

import {
    alignFace,
} from "../alignment/faceAlignment.mjs";

import {
    createYunetDetector,
} from "../detection/yunetDetector.mjs";

import {
    createSfaceEmbeddingExtractor,
} from "../recognition/sfaceEmbedding.mjs";

import {
    createBiometricBrokerClient,
} from "./biometricBrokerClient.mjs";

import {
    createBiometricFrameOrchestrator,
} from "./biometricFrameOrchestrator.mjs";

import {
    createBiometricFrameProcessingLoop,
} from "./biometricFrameProcessingLoop.mjs";

import {
    createBiometricIdentificationPipeline,
} from "./biometricIdentificationPipeline.mjs";

const DEFAULT_YUNET_MODEL_PATH =
    fileURLToPath(
        new URL(
            "../../models/face_detection_yunet_2026may.onnx",
            import.meta.url,
        ),
    );

const DEFAULT_SFACE_MODEL_PATH =
    fileURLToPath(
        new URL(
            "../../models/face_recognition_sface_2021dec.onnx",
            import.meta.url,
        ),
    );

const RUNTIME_STATE =
    Object.freeze({
        READY:
            "READY",

        RUNNING:
            "RUNNING",

        STOPPED:
            "STOPPED",

        SHUTTING_DOWN:
            "SHUTTING_DOWN",

        SHUTDOWN:
            "SHUTDOWN",
    });

const FORBIDDEN_RESULT_KEY =
    /(embedding|vector|cipher|token|secret|password|credential|frame|image|pixel|bgr)/i;

const MAX_RESULT_DEPTH =
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

function requireObject(
    value,
    name,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(
            value,
        )
    ) {
        throw new TypeError(
            `${name} deve ser objeto.`,
        );
    }

    return value;
}

function requireNonEmptyString(
    value,
    name,
) {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new TypeError(
            `${name} deve ser string nao vazia.`,
        );
    }

    return value.trim();
}

function requirePositiveInteger(
    value,
    name,
) {
    if (
        !Number.isSafeInteger(
            value,
        ) ||
        value <= 0
    ) {
        throw new TypeError(
            `${name} deve ser inteiro positivo.`,
        );
    }

    return value;
}

function requireFiniteNumber(
    value,
    name,
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(
            value,
        )
    ) {
        throw new TypeError(
            `${name} deve ser numero finito.`,
        );
    }

    return value;
}

function normalizeAlignmentPolicy(
    value,
) {
    const source =
        requireObject(
            value,
            "alignmentPolicy",
        );

    const paddingRatio =
        requireFiniteNumber(
            source.paddingRatio,
            "alignmentPolicy.paddingRatio",
        );

    if (paddingRatio < 0) {
        throw new RangeError(
            "alignmentPolicy.paddingRatio nao pode ser negativo.",
        );
    }

    const minFaceSizePx =
        requireFiniteNumber(
            source.minFaceSizePx,
            "alignmentPolicy.minFaceSizePx",
        );

    if (minFaceSizePx <= 0) {
        throw new RangeError(
            "alignmentPolicy.minFaceSizePx deve ser maior que zero.",
        );
    }

    const minVisibleAreaRatio =
        requireFiniteNumber(
            source.minVisibleAreaRatio,
            "alignmentPolicy.minVisibleAreaRatio",
        );

    if (
        minVisibleAreaRatio <= 0 ||
        minVisibleAreaRatio > 1
    ) {
        throw new RangeError(
            "alignmentPolicy.minVisibleAreaRatio deve estar acima de zero e ate 1.",
        );
    }

    const maxRmsError =
        requireFiniteNumber(
            source.maxRmsError,
            "alignmentPolicy.maxRmsError",
        );

    if (maxRmsError <= 0) {
        throw new RangeError(
            "alignmentPolicy.maxRmsError deve ser maior que zero.",
        );
    }

    return Object.freeze({
        paddingRatio,
        minFaceSizePx,
        minVisibleAreaRatio,
        maxRmsError,
    });
}

function normalizeBrokerConfig(
    value,
) {
    const source =
        requireObject(
            value,
            "brokerConfig",
        );

    const normalized =
        {
            url:
                requireNonEmptyString(
                    source.url,
                    "brokerConfig.url",
                ),

            token:
                requireNonEmptyString(
                    source.token,
                    "brokerConfig.token",
                ),
        };

    if (
        source.timeoutMs !== undefined &&
        source.timeoutMs !== null
    ) {
        normalized.timeoutMs =
            requirePositiveInteger(
                source.timeoutMs,
                "brokerConfig.timeoutMs",
            );
    }

    return Object.freeze(
        normalized,
    );
}

function normalizeModelPath(
    value,
    fallback,
    name,
) {
    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    return requireNonEmptyString(
        value,
        name,
    );
}

function normalizeFactories(
    factories,
) {
    if (
        factories !== undefined &&
        (
            !factories ||
            typeof factories !== "object" ||
            Array.isArray(
                factories,
            )
        )
    ) {
        throw new TypeError(
            "factories deve ser objeto quando informado.",
        );
    }

    const source =
        factories ??
        {};

    return Object.freeze({
        createBrokerClient:
            requireFunction(
                source.createBiometricBrokerClient ??
                    createBiometricBrokerClient,
                "factories.createBiometricBrokerClient",
            ),

        createIdentificationPipeline:
            requireFunction(
                source.createBiometricIdentificationPipeline ??
                    createBiometricIdentificationPipeline,
                "factories.createBiometricIdentificationPipeline",
            ),

        createYunetDetector:
            requireFunction(
                source.createYunetDetector ??
                    createYunetDetector,
                "factories.createYunetDetector",
            ),

        createSfaceEmbeddingExtractor:
            requireFunction(
                source.createSfaceEmbeddingExtractor ??
                    createSfaceEmbeddingExtractor,
                "factories.createSfaceEmbeddingExtractor",
            ),

        createFrameOrchestrator:
            requireFunction(
                source.createBiometricFrameOrchestrator ??
                    createBiometricFrameOrchestrator,
                "factories.createBiometricFrameOrchestrator",
            ),

        createFrameProcessingLoop:
            requireFunction(
                source.createBiometricFrameProcessingLoop ??
                    createBiometricFrameProcessingLoop,
                "factories.createBiometricFrameProcessingLoop",
            ),

        alignFace:
            requireFunction(
                source.alignFace ??
                    alignFace,
                "factories.alignFace",
            ),
    });
}

function requireSession(
    session,
) {
    const source =
        requireObject(
            session,
            "session",
        );

    requireFunction(
        source.takeLatestFrame,
        "session.takeLatestFrame",
    );

    requireFunction(
        source.snapshot,
        "session.snapshot",
    );

    return source;
}

function requireDetector(
    detector,
) {
    const source =
        requireObject(
            detector,
            "YuNet detector",
        );

    requireFunction(
        source.detectBgr,
        "YuNet detector.detectBgr",
    );

    requireFunction(
        source.release,
        "YuNet detector.release",
    );

    return source;
}

function requireExtractor(
    extractor,
) {
    const source =
        requireObject(
            extractor,
            "SFace extractor",
        );

    requireFunction(
        source.extractBgr112,
        "SFace extractor.extractBgr112",
    );

    requireFunction(
        source.release,
        "SFace extractor.release",
    );

    return source;
}

function requireFrameLoop(
    loop,
) {
    const source =
        requireObject(
            loop,
            "biometricFrameProcessingLoop",
        );

    for (
        const method of
        [
            "start",
            "stop",
            "whenIdle",
            "snapshot",
        ]
    ) {
        requireFunction(
            source[
                method
            ],
            `biometricFrameProcessingLoop.${method}`,
        );
    }

    return source;
}

function sanitizeResultValue(
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
        MAX_RESULT_DEPTH
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
        return Object.freeze(
            value
                .map(
                    (
                        item,
                    ) =>
                        sanitizeResultValue(
                            item,
                            depth + 1,
                        ),
                )
                .filter(
                    (
                        item,
                    ) =>
                        item !== undefined,
                ),
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
                FORBIDDEN_RESULT_KEY.test(
                    key,
                )
            ) {
                continue;
            }

            const safeChild =
                sanitizeResultValue(
                    child,
                    depth + 1,
                );

            if (safeChild !== undefined) {
                sanitized[
                    key
                ] =
                    safeChild;
            }
        }

        return Object.freeze(
            sanitized,
        );
    }

    return undefined;
}

function finiteCounter(
    value,
) {
    return (
        Number.isSafeInteger(
            value,
        ) &&
        value >= 0
    )
        ? value
        : 0;
}

function sanitizeFrameLoopSnapshot(
    value,
) {
    const source =
        (
            value &&
            typeof value === "object" &&
            !Array.isArray(
                value,
            )
        )
            ? value
            : {};

    return Object.freeze({
        state:
            typeof source.state === "string"
                ? source.state
                : null,

        running:
            source.running === true,

        processing:
            source.processing === true,

        scheduled:
            source.scheduled === true,

        pollIntervalMs:
            (
                Number.isSafeInteger(
                    source.pollIntervalMs,
                ) &&
                source.pollIntervalMs > 0
            )
                ? source.pollIntervalMs
                : null,

        processedFrames:
            finiteCounter(
                source.processedFrames,
            ),

        emptyPolls:
            finiteCounter(
                source.emptyPolls,
            ),

        errorCount:
            finiteCounter(
                source.errorCount,
            ),

        lastResult:
            sanitizeResultValue(
                source.lastResult,
            ) ?? null,

        lastErrorCode:
            typeof source.lastErrorCode === "string"
                ? source.lastErrorCode
                : null,
    });
}

function lifecycleError() {
    const error =
        new Error(
            "runtime biometrico ja foi encerrado.",
        );

    error.code =
        "BIOMETRIC_RUNTIME_SHUTDOWN";

    return error;
}

async function releaseIgnoringErrors(
    resource,
) {
    if (
        !resource ||
        typeof resource.release !== "function"
    ) {
        return;
    }

    try {
        await resource.release();
    }
    catch {
        /*
         * Rollback de inicializacao nunca mascara
         * o erro original da construcao.
         */
    }
}

export async function createBiometricProcessingRuntime({
    session,
    brokerConfig,
    productivePolicy =
        null,
    pollIntervalMs,
    alignmentPolicy,
    getIdentificationContext,
    yunetModelPath,
    sfaceModelPath,
    setTimer =
        setTimeout,
    clearTimer =
        clearTimeout,
    factories,
} = {}) {
    const normalizedSession =
        requireSession(
            session,
        );

    const normalizedBrokerConfig =
        normalizeBrokerConfig(
            brokerConfig,
        );

    const normalizedPollIntervalMs =
        requirePositiveInteger(
            pollIntervalMs,
            "pollIntervalMs",
        );

    const normalizedAlignmentPolicy =
        normalizeAlignmentPolicy(
            alignmentPolicy,
        );

    const normalizedGetContext =
        requireFunction(
            getIdentificationContext,
            "getIdentificationContext",
        );

    const normalizedSetTimer =
        requireFunction(
            setTimer,
            "setTimer",
        );

    const normalizedClearTimer =
        requireFunction(
            clearTimer,
            "clearTimer",
        );

    const normalizedFactories =
        normalizeFactories(
            factories,
        );

    const normalizedYunetModelPath =
        normalizeModelPath(
            yunetModelPath,
            DEFAULT_YUNET_MODEL_PATH,
            "yunetModelPath",
        );

    const normalizedSfaceModelPath =
        normalizeModelPath(
            sfaceModelPath,
            DEFAULT_SFACE_MODEL_PATH,
            "sfaceModelPath",
        );

    let detector =
        null;

    let extractor =
        null;

    let frameLoop =
        null;

    try {
        const brokerClient =
            await normalizedFactories
                .createBrokerClient({
                    ...normalizedBrokerConfig,
                });

        const identificationPipeline =
            await normalizedFactories
                .createIdentificationPipeline({
                    brokerClient,
                    productivePolicy,
                });

        detector =
            await normalizedFactories
                .createYunetDetector({
                    modelPath:
                        normalizedYunetModelPath,
                });

        requireDetector(
            detector,
        );

        extractor =
            await normalizedFactories
                .createSfaceEmbeddingExtractor({
                    modelPath:
                        normalizedSfaceModelPath,
                });

        requireExtractor(
            extractor,
        );

        const orchestrator =
            await normalizedFactories
                .createFrameOrchestrator({
                    detector,
                    alignFace:
                        normalizedFactories.alignFace,
                    embeddingExtractor:
                        extractor,
                    identificationPipeline,
                    alignmentPolicy:
                        normalizedAlignmentPolicy,
                });

        frameLoop =
            await normalizedFactories
                .createFrameProcessingLoop({
                    session:
                        normalizedSession,
                    orchestrator,
                    getIdentificationContext:
                        normalizedGetContext,
                    pollIntervalMs:
                        normalizedPollIntervalMs,
                    setTimer:
                        normalizedSetTimer,
                    clearTimer:
                        normalizedClearTimer,
                });

        requireFrameLoop(
            frameLoop,
        );
    }
    catch (error) {
        await releaseIgnoringErrors(
            extractor,
        );

        await releaseIgnoringErrors(
            detector,
        );

        throw error;
    }

    let state =
        RUNTIME_STATE.READY;

    let detectorReleased =
        false;

    let extractorReleased =
        false;

    let shutdownPromise =
        null;

    function snapshot() {
        return Object.freeze({
            state,

            running:
                state ===
                RUNTIME_STATE.RUNNING,

            released:
                (
                    state ===
                        RUNTIME_STATE.SHUTDOWN &&
                    detectorReleased &&
                    extractorReleased
                ),

            brokerConfigured:
                true,

            models:
                Object.freeze({
                    yunetLoaded:
                        !detectorReleased,

                    sfaceLoaded:
                        !extractorReleased,
                }),

            frameLoop:
                sanitizeFrameLoopSnapshot(
                    frameLoop.snapshot(),
                ),
        });
    }

    function start() {
        if (
            state ===
                RUNTIME_STATE.SHUTTING_DOWN ||
            state ===
                RUNTIME_STATE.SHUTDOWN
        ) {
            throw lifecycleError();
        }

        const started =
            frameLoop.start();

        if (
            started ||
            frameLoop
                .snapshot()
                .running ===
                true
        ) {
            state =
                RUNTIME_STATE.RUNNING;
        }

        return started;
    }

    function stop() {
        if (
            state ===
                RUNTIME_STATE.SHUTTING_DOWN ||
            state ===
                RUNTIME_STATE.SHUTDOWN
        ) {
            return false;
        }

        const stopped =
            frameLoop.stop();

        state =
            RUNTIME_STATE.STOPPED;

        return stopped;
    }

    function shutdown() {
        if (shutdownPromise) {
            return shutdownPromise;
        }

        state =
            RUNTIME_STATE.SHUTTING_DOWN;

        shutdownPromise =
            (
                async () => {
                    let firstError =
                        null;

                    try {
                        frameLoop.stop();
                    }
                    catch (error) {
                        firstError =
                            error;
                    }

                    try {
                        await frameLoop.whenIdle();
                    }
                    catch (error) {
                        firstError ??=
                            error;
                    }

                    try {
                        await extractor.release();

                        extractorReleased =
                            true;
                    }
                    catch (error) {
                        firstError ??=
                            error;
                    }

                    try {
                        await detector.release();

                        detectorReleased =
                            true;
                    }
                    catch (error) {
                        firstError ??=
                            error;
                    }

                    state =
                        RUNTIME_STATE.SHUTDOWN;

                    if (firstError) {
                        throw firstError;
                    }

                    return true;
                }
            )();

        return shutdownPromise;
    }

    return Object.freeze({
        start,
        stop,
        shutdown,
        snapshot,
    });
}
