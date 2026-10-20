export const BIOMETRIC_FRAME_LOOP_STATE =
    Object.freeze({
        STOPPED:
            "STOPPED",

        WAITING_FRAME:
            "WAITING_FRAME",

        PROCESSING:
            "PROCESSING",
    });

const FORBIDDEN_SNAPSHOT_KEY =
    /(embedding|vector|cipher|token|secret|password|credential|frame|image|pixel|bgr)/i;

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

function normalizeIdentificationContext(
    value,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(
            value,
        )
    ) {
        throw new TypeError(
            "getIdentificationContext deve retornar objeto.",
        );
    }

    return Object.freeze({
        tenantId:
            requireNonEmptyString(
                value.tenantId,
                "tenantId",
            ),

        empresaId:
            requireNonEmptyString(
                value.empresaId,
                "empresaId",
            ),

        profileId:
            requireNonEmptyString(
                value.profileId,
                "profileId",
            ),

        requestId:
            requireNonEmptyString(
                value.requestId,
                "requestId",
            ),
    });
}

function readDimensions(
    sessionSnapshot,
) {
    const width =
        requirePositiveInteger(
            sessionSnapshot?.frames?.width,
            "session.snapshot().frames.width",
        );

    const height =
        requirePositiveInteger(
            sessionSnapshot?.frames?.height,
            "session.snapshot().frames.height",
        );

    return Object.freeze({
        width,
        height,
    });
}

function validateBgrFrame(
    frame,
    width,
    height,
) {
    if (
        !(
            frame instanceof
            Uint8Array
        )
    ) {
        throw new TypeError(
            "session.takeLatestFrame() deve retornar Uint8Array ou null.",
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
        frame.byteLength !==
            expectedBytes
    ) {
        throw new RangeError(
            "frame BGR24 possui tamanho incompatível com o snapshot da sessao.",
        );
    }
}

function sanitizeSnapshotValue(
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
        return Object.freeze(
            value
                .map(
                    (
                        item,
                    ) =>
                        sanitizeSnapshotValue(
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
                FORBIDDEN_SNAPSHOT_KEY.test(
                    key,
                )
            ) {
                continue;
            }

            const safeChild =
                sanitizeSnapshotValue(
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

export function createBiometricFrameProcessingLoop({
    session,
    orchestrator,
    getIdentificationContext,
    pollIntervalMs,
    setTimer,
    clearTimer,
} = {}) {
    const takeLatestFrame =
        requireFunction(
            session?.takeLatestFrame,
            "session.takeLatestFrame",
        );

    const getSessionSnapshot =
        requireFunction(
            session?.snapshot,
            "session.snapshot",
        );

    const processFrame =
        requireFunction(
            orchestrator?.processFrame,
            "orchestrator.processFrame",
        );

    const getContext =
        requireFunction(
            getIdentificationContext,
            "getIdentificationContext",
        );

    const scheduleTimer =
        requireFunction(
            setTimer,
            "setTimer",
        );

    const cancelTimer =
        requireFunction(
            clearTimer,
            "clearTimer",
        );

    const intervalMs =
        requirePositiveInteger(
            pollIntervalMs,
            "pollIntervalMs",
        );

    let running =
        false;

    let processing =
        false;

    let timerHandle =
        null;

    let processedFrames =
        0;

    let emptyPolls =
        0;

    let errorCount =
        0;

    let lastResult =
        null;

    let lastErrorCode =
        null;

    const idleWaiters =
        new Set();

    function state() {
        if (processing) {
            return BIOMETRIC_FRAME_LOOP_STATE.PROCESSING;
        }

        if (running) {
            return BIOMETRIC_FRAME_LOOP_STATE.WAITING_FRAME;
        }

        return BIOMETRIC_FRAME_LOOP_STATE.STOPPED;
    }

    function snapshot() {
        return Object.freeze({
            state:
                state(),

            running,

            processing,

            scheduled:
                timerHandle !== null,

            pollIntervalMs:
                intervalMs,

            processedFrames,

            emptyPolls,

            errorCount,

            lastResult:
                sanitizeSnapshotValue(
                    lastResult,
                ) ?? null,

            lastErrorCode,
        });
    }

    function recordError(
        error,
        fallbackCode,
    ) {
        errorCount +=
            1;

        lastErrorCode =
            safeErrorCode(
                error,
                fallbackCode,
            );
    }

    function resolveIdleWaiters() {
        if (
            processing ||
            idleWaiters.size ===
                0
        ) {
            return false;
        }

        const waiters =
            Array.from(
                idleWaiters,
            );

        idleWaiters.clear();

        for (
            const resolve of
            waiters
        ) {
            resolve();
        }

        return true;
    }

    function whenIdle() {
        if (!processing) {
            return Promise.resolve();
        }

        return new Promise(
            (
                resolve,
            ) => {
                idleWaiters.add(
                    resolve,
                );
            },
        );
    }

    function scheduleNext() {
        if (
            !running ||
            processing ||
            timerHandle !== null
        ) {
            return false;
        }

        timerHandle =
            scheduleTimer(
                () => {
                    timerHandle =
                        null;

                    return poll();
                },
                intervalMs,
            );

        return true;
    }

    async function poll() {
        if (
            !running ||
            processing
        ) {
            return snapshot();
        }

        processing =
            true;

        try {
            let frame;

            try {
                frame =
                    takeLatestFrame.call(
                        session,
                    );
            }
            catch (error) {
                recordError(
                    error,
                    "SESSION_FRAME_READ_FAILED",
                );

                return snapshot();
            }

            if (
                frame === null ||
                frame === undefined
            ) {
                emptyPolls +=
                    1;

                lastErrorCode =
                    null;

                return snapshot();
            }

            let dimensions;

            try {
                dimensions =
                    readDimensions(
                        getSessionSnapshot.call(
                            session,
                        ),
                    );

                validateBgrFrame(
                    frame,
                    dimensions.width,
                    dimensions.height,
                );
            }
            catch (error) {
                recordError(
                    error,
                    "SESSION_FRAME_INVALID",
                );

                return snapshot();
            }

            let context;

            try {
                context =
                    normalizeIdentificationContext(
                        await getContext(),
                    );
            }
            catch (error) {
                recordError(
                    error,
                    "IDENTIFICATION_CONTEXT_FAILED",
                );

                return snapshot();
            }

            try {
                const result =
                    await processFrame.call(
                        orchestrator,
                        {
                            data:
                                frame,

                            width:
                                dimensions.width,

                            height:
                                dimensions.height,

                            tenantId:
                                context.tenantId,

                            empresaId:
                                context.empresaId,

                            profileId:
                                context.profileId,

                            requestId:
                                context.requestId,
                        },
                    );

                processedFrames +=
                    1;

                lastResult =
                    sanitizeSnapshotValue(
                        result,
                    ) ?? null;

                lastErrorCode =
                    null;
            }
            catch (error) {
                recordError(
                    error,
                    "PROCESSING_FAILED",
                );
            }
        }
        finally {
            processing =
                false;

            resolveIdleWaiters();

            if (running) {
                scheduleNext();
            }
        }

        return snapshot();
    }

    function start() {
        if (running) {
            return false;
        }

        running =
            true;

        scheduleNext();

        return true;
    }

    function stop() {
        const wasActive =
            running ||
            processing ||
            timerHandle !== null;

        running =
            false;

        if (timerHandle !== null) {
            cancelTimer(
                timerHandle,
            );

            timerHandle =
                null;
        }

        return wasActive;
    }

    return Object.freeze({
        start,
        stop,
        whenIdle,
        snapshot,
    });
}
