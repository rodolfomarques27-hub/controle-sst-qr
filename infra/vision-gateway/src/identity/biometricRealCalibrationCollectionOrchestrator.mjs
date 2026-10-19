import {
    CALIBRATION_CAPTURE_STATUS,
} from "./biometricCalibrationCollectionRunner.mjs";

export const REAL_CALIBRATION_ORCHESTRATOR_STATE =
    Object.freeze({
        READY:
            "READY",

        SESSION_ACTIVE:
            "SESSION_ACTIVE",

        FINALIZED:
            "FINALIZED",

        ABORTED:
            "ABORTED",

        FAILED:
            "FAILED",
    });

export const REAL_CALIBRATION_ORCHESTRATOR_CAPTURE_STATUS =
    Object.freeze({
        FRESH_FRAME_TIMEOUT:
            "FRESH_FRAME_TIMEOUT",
    });

function fail(
    code,
    message =
        code,
) {
    const error =
        new Error(
            message,
        );

    error.code =
        code;

    throw error;
}

function requireFunction(
    value,
    name,
) {
    if (
        typeof value !==
        "function"
    ) {
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
        typeof value !==
            "object" ||
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

function requireArray(
    value,
    name,
) {
    if (
        !Array.isArray(
            value,
        )
    ) {
        throw new TypeError(
            `${name} deve ser array.`,
        );
    }

    return value;
}

function requireNonEmptyString(
    value,
    name,
) {
    if (
        typeof value !==
            "string" ||
        value.trim().length ===
            0
    ) {
        throw new TypeError(
            `${name} deve ser string nao vazia.`,
        );
    }

    return value.trim();
}

function requireNonNegativeInteger(
    value,
    name,
) {
    if (
        !Number.isSafeInteger(
            value,
        ) ||
        value <
            0
    ) {
        throw new TypeError(
            `${name} deve ser inteiro seguro maior ou igual a zero.`,
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
        value <=
            0
    ) {
        throw new TypeError(
            `${name} deve ser inteiro seguro maior que zero.`,
        );
    }

    return value;
}

function freezeCaptureResult(
    accepted,
    status,
    extra =
        {},
) {
    return Object.freeze({
        accepted,
        status,
        ...extra,
    });
}

function buildOperationalModel(
    collectionPlan,
) {
    const plan =
        requireObject(
            collectionPlan,
            "collectionPlan",
        );

    const participants =
        requireArray(
            plan.participants,
            "collectionPlan.participants",
        );

    const calibrationParticipantIds =
        requireArray(
            plan.calibrationParticipantIds,
            "collectionPlan.calibrationParticipantIds",
        );

    if (
        calibrationParticipantIds.length ===
        0
    ) {
        fail(
            "CALIBRATION_PARTICIPANTS_EMPTY",
        );
    }

    const captureConditions =
        requireArray(
            plan.captureConditionCatalog,
            "collectionPlan.captureConditionCatalog",
        );

    const conditionById =
        new Map();

    for (
        const condition of
        captureConditions
    ) {
        const normalized =
            requireObject(
                condition,
                "captureCondition",
            );

        const conditionId =
            requireNonEmptyString(
                normalized.id,
                "captureCondition.id",
            );

        const deviceId =
            requireNonEmptyString(
                normalized.deviceId,
                `captureCondition.${conditionId}.deviceId`,
            );

        if (
            conditionById.has(
                conditionId,
            )
        ) {
            fail(
                "CAPTURE_CONDITION_DUPLICATED",
            );
        }

        conditionById.set(
            conditionId,
            Object.freeze({
                conditionId,
                deviceId,
            }),
        );
    }

    const participantById =
        new Map(
            participants.map(
                (participant) => [
                    participant.participantId,
                    participant,
                ],
            ),
        );

    const sessionById =
        new Map();

    const sampleById =
        new Map();

    const orderedSessionIds =
        [];

    for (
        const rawParticipantId of
        calibrationParticipantIds
    ) {
        const participantId =
            requireNonEmptyString(
                rawParticipantId,
                "calibrationParticipantId",
            );

        const participant =
            participantById.get(
                participantId,
            );

        if (!participant) {
            fail(
                "CALIBRATION_PARTICIPANT_UNKNOWN",
            );
        }

        const sessions =
            requireArray(
                participant.sessions,
                `participant.${participantId}.sessions`,
            );

        for (
            const session of
            sessions
        ) {
            const normalizedSession =
                requireObject(
                    session,
                    "session",
                );

            const sessionId =
                requireNonEmptyString(
                    normalizedSession.sessionId,
                    "session.sessionId",
                );

            if (
                sessionById.has(
                    sessionId,
                )
            ) {
                fail(
                    "CALIBRATION_SESSION_DUPLICATED",
                );
            }

            const samples =
                requireArray(
                    normalizedSession.samples,
                    `session.${sessionId}.samples`,
                );

            const sampleIds =
                [];

            for (
                const sample of
                samples
            ) {
                const normalizedSample =
                    requireObject(
                        sample,
                        "sample",
                    );

                const sampleId =
                    requireNonEmptyString(
                        normalizedSample.sampleId,
                        "sample.sampleId",
                    );

                if (
                    sampleById.has(
                        sampleId,
                    )
                ) {
                    fail(
                        "CALIBRATION_SAMPLE_DUPLICATED",
                    );
                }

                const captureConditionId =
                    requireNonEmptyString(
                        normalizedSample.captureConditionId,
                        `sample.${sampleId}.captureConditionId`,
                    );

                const condition =
                    conditionById.get(
                        captureConditionId,
                    );

                if (!condition) {
                    fail(
                        "CAPTURE_CONDITION_UNKNOWN",
                    );
                }

                const sampleModel =
                    Object.freeze({
                        sampleId,
                        sessionId,
                        participantId,
                        captureConditionId,
                        deviceId:
                            condition.deviceId,
                    });

                sampleById.set(
                    sampleId,
                    sampleModel,
                );

                sampleIds.push(
                    sampleId,
                );
            }

            sessionById.set(
                sessionId,
                Object.freeze({
                    sessionId,
                    participantId,
                    sampleIds:
                        Object.freeze([
                            ...sampleIds,
                        ]),
                }),
            );

            orderedSessionIds.push(
                sessionId,
            );
        }
    }

    if (
        orderedSessionIds.length ===
        0 ||
        sampleById.size ===
        0
    ) {
        fail(
            "CALIBRATION_PLAN_EMPTY",
        );
    }

    return Object.freeze({
        orderedSessionIds:
            Object.freeze([
                ...orderedSessionIds,
            ]),

        sessionById,

        sampleById,

        totalSessions:
            orderedSessionIds.length,

        totalSamples:
            sampleById.size,
    });
}

export function createBiometricRealCalibrationCollectionOrchestrator({
    collectionPlan,

    runner,

    freshFrameAdmission,

    freshFrameTimeoutMs =
        15000,

    pollIntervalMs =
        50,

    wait =
        (delayMs) =>
            new Promise(
                (resolve) =>
                    setTimeout(
                        resolve,
                        delayMs,
                    ),
            ),
} = {}) {
    const model =
        buildOperationalModel(
            collectionPlan,
        );

    const normalizedRunner =
        requireObject(
            runner,
            "runner",
        );

    const startRunnerSession =
        requireFunction(
            normalizedRunner.startSession,
            "runner.startSession",
        );

    const captureRunnerSample =
        requireFunction(
            normalizedRunner.captureSample,
            "runner.captureSample",
        );

    const completeRunnerSession =
        requireFunction(
            normalizedRunner.completeSession,
            "runner.completeSession",
        );

    const finalizeRunner =
        requireFunction(
            normalizedRunner.finalize,
            "runner.finalize",
        );

    const abortRunner =
        requireFunction(
            normalizedRunner.abort,
            "runner.abort",
        );

    const runnerSnapshot =
        requireFunction(
            normalizedRunner.snapshot,
            "runner.snapshot",
        );

    const fresh =
        requireObject(
            freshFrameAdmission,
            "freshFrameAdmission",
        );

    const armFreshFrame =
        requireFunction(
            fresh.arm,
            "freshFrameAdmission.arm",
        );

    const checkFreshFrame =
        requireFunction(
            fresh.checkCaptureAdmission,
            "freshFrameAdmission.checkCaptureAdmission",
        );

    const resetFreshFrame =
        requireFunction(
            fresh.reset,
            "freshFrameAdmission.reset",
        );

    const freshSnapshot =
        requireFunction(
            fresh.snapshot,
            "freshFrameAdmission.snapshot",
        );

    const timeout =
        requireNonNegativeInteger(
            freshFrameTimeoutMs,
            "freshFrameTimeoutMs",
        );

    const pollInterval =
        requirePositiveInteger(
            pollIntervalMs,
            "pollIntervalMs",
        );

    const waitImpl =
        requireFunction(
            wait,
            "wait",
        );

    let state =
        REAL_CALIBRATION_ORCHESTRATOR_STATE.READY;

    let activeSessionId =
        null;

    const capturedSampleIds =
        new Set();

    const completedSessionIds =
        new Set();

    function assertOperational() {
        if (
            state ===
                REAL_CALIBRATION_ORCHESTRATOR_STATE.FINALIZED ||
            state ===
                REAL_CALIBRATION_ORCHESTRATOR_STATE.ABORTED ||
            state ===
                REAL_CALIBRATION_ORCHESTRATOR_STATE.FAILED
        ) {
            fail(
                "ORCHESTRATOR_NOT_MUTABLE",
            );
        }
    }

    function safeFreshReset() {
        try {
            return resetFreshFrame
                .call(
                    fresh,
                );
        }
        catch {
            return false;
        }
    }

    function safeRunnerAbort() {
        try {
            return abortRunner
                .call(
                    normalizedRunner,
                );
        }
        catch {
            return false;
        }
    }

    function failSafe(
        error,
    ) {
        safeFreshReset();
        safeRunnerAbort();

        activeSessionId =
            null;

        state =
            REAL_CALIBRATION_ORCHESTRATOR_STATE.FAILED;

        throw error;
    }

    function snapshot() {
        const runnerState =
            runnerSnapshot.call(
                normalizedRunner,
            );

        const freshState =
            freshSnapshot.call(
                fresh,
            );

        return Object.freeze({
            state,

            activeSessionId,

            totalSessions:
                model.totalSessions,

            completedSessions:
                completedSessionIds.size,

            remainingSessions:
                model.totalSessions -
                completedSessionIds.size,

            totalSamples:
                model.totalSamples,

            capturedSamples:
                capturedSampleIds.size,

            remainingSamples:
                model.totalSamples -
                capturedSampleIds.size,

            runnerState:
                runnerState?.state ??
                null,

            freshFrameArmed:
                freshState?.armed ===
                true,
        });
    }

    function startSession(
        sessionId,
    ) {
        assertOperational();

        if (
            activeSessionId !==
            null
        ) {
            fail(
                "SESSION_ALREADY_ACTIVE",
            );
        }

        const normalizedSessionId =
            requireNonEmptyString(
                sessionId,
                "sessionId",
            );

        if (
            !model.sessionById.has(
                normalizedSessionId,
            )
        ) {
            fail(
                "CALIBRATION_SESSION_UNKNOWN",
            );
        }

        if (
            completedSessionIds.has(
                normalizedSessionId,
            )
        ) {
            fail(
                "SESSION_ALREADY_COMPLETED",
            );
        }

        try {
            startRunnerSession.call(
                normalizedRunner,
                normalizedSessionId,
            );

            activeSessionId =
                normalizedSessionId;

            state =
                REAL_CALIBRATION_ORCHESTRATOR_STATE
                    .SESSION_ACTIVE;

            return snapshot();
        }
        catch (error) {
            return failSafe(
                error,
            );
        }
    }

    async function waitForFreshFrame(
        deviceId,
    ) {
        const maxChecks =
            Math.max(
                1,
                Math.ceil(
                    timeout /
                    pollInterval,
                ) +
                    1,
            );

        let admission =
            null;

        for (
            let attempt = 0;
            attempt < maxChecks;
            attempt += 1
        ) {
            admission =
                checkFreshFrame.call(
                    fresh,
                );

            if (
                admission?.readyForCapture ===
                true
            ) {
                return admission;
            }

            if (
                attempt +
                    1 <
                maxChecks
            ) {
                await waitImpl(
                    pollInterval,
                );
            }
        }

        return admission ??
            Object.freeze({
                armed:
                    true,

                readyForCapture:
                    false,

                reason:
                    "FRESH_FRAME_TIMEOUT",

                deviceId,
            });
    }

    async function captureSample(
        sampleId,
    ) {
        assertOperational();

        if (
            activeSessionId ===
            null
        ) {
            fail(
                "NO_ACTIVE_SESSION",
            );
        }

        const normalizedSampleId =
            requireNonEmptyString(
                sampleId,
                "sampleId",
            );

        const sample =
            model.sampleById.get(
                normalizedSampleId,
            );

        if (!sample) {
            fail(
                "CALIBRATION_SAMPLE_UNKNOWN",
            );
        }

        if (
            sample.sessionId !==
            activeSessionId
        ) {
            fail(
                "SAMPLE_NOT_IN_ACTIVE_SESSION",
            );
        }

        if (
            capturedSampleIds.has(
                normalizedSampleId,
            )
        ) {
            fail(
                "SAMPLE_ALREADY_CAPTURED",
            );
        }

        /*
         * Reset defensivo para impedir reaproveitamento
         * acidental do estado fresh-frame anterior.
         */
        safeFreshReset();

        try {
            await armFreshFrame.call(
                fresh,
                sample.deviceId,
            );

            const admission =
                await waitForFreshFrame(
                    sample.deviceId,
                );

            if (
                admission?.readyForCapture !==
                true
            ) {
                return freezeCaptureResult(
                    false,
                    REAL_CALIBRATION_ORCHESTRATOR_CAPTURE_STATUS
                        .FRESH_FRAME_TIMEOUT,
                    {
                        reason:
                            admission?.reason ??
                            "FRESH_FRAME_TIMEOUT",

                        baselineLastFrame:
                            admission?.baselineLastFrame ??
                            null,

                        observedLastFrame:
                            admission?.observedLastFrame ??
                            null,
                    },
                );
            }

            const captureResult =
                await captureRunnerSample.call(
                    normalizedRunner,
                    normalizedSampleId,
                );

            if (
                captureResult?.accepted ===
                    true &&
                captureResult?.status ===
                    CALIBRATION_CAPTURE_STATUS
                        .CAPTURED
            ) {
                capturedSampleIds.add(
                    normalizedSampleId,
                );
            }

            return captureResult;
        }
        catch (error) {
            return failSafe(
                error,
            );
        }
        finally {
            safeFreshReset();
        }
    }

    function completeSession() {
        assertOperational();

        if (
            activeSessionId ===
            null
        ) {
            fail(
                "NO_ACTIVE_SESSION",
            );
        }

        const session =
            model.sessionById.get(
                activeSessionId,
            );

        for (
            const sampleId of
            session.sampleIds
        ) {
            if (
                !capturedSampleIds.has(
                    sampleId,
                )
            ) {
                fail(
                    "SESSION_SAMPLES_INCOMPLETE",
                );
            }
        }

        const completingSessionId =
            activeSessionId;

        try {
            completeRunnerSession.call(
                normalizedRunner,
            );

            completedSessionIds.add(
                completingSessionId,
            );

            activeSessionId =
                null;

            state =
                REAL_CALIBRATION_ORCHESTRATOR_STATE.READY;

            return snapshot();
        }
        catch (error) {
            return failSafe(
                error,
            );
        }
    }

    function finalize() {
        assertOperational();

        if (
            activeSessionId !==
            null
        ) {
            fail(
                "FINALIZE_ACTIVE_SESSION",
            );
        }

        if (
            completedSessionIds.size !==
            model.totalSessions
        ) {
            fail(
                "FINALIZE_COLLECTION_INCOMPLETE",
            );
        }

        if (
            capturedSampleIds.size !==
            model.totalSamples
        ) {
            fail(
                "FINALIZE_SAMPLE_MISSING",
            );
        }

        try {
            const result =
                finalizeRunner.call(
                    normalizedRunner,
                );

            state =
                REAL_CALIBRATION_ORCHESTRATOR_STATE.FINALIZED;

            return result;
        }
        catch (error) {
            return failSafe(
                error,
            );
        }
    }

    function abort() {
        if (
            state ===
                REAL_CALIBRATION_ORCHESTRATOR_STATE.ABORTED
        ) {
            return false;
        }

        if (
            state ===
                REAL_CALIBRATION_ORCHESTRATOR_STATE.FINALIZED
        ) {
            return false;
        }

        safeFreshReset();

        const aborted =
            safeRunnerAbort();

        activeSessionId =
            null;

        capturedSampleIds.clear();
        completedSessionIds.clear();

        state =
            REAL_CALIBRATION_ORCHESTRATOR_STATE.ABORTED;

        return aborted;
    }

    return Object.freeze({
        startSession,
        captureSample,
        completeSession,
        finalize,
        abort,
        snapshot,
    });
}