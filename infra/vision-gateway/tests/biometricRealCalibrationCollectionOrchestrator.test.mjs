import test from "node:test";
import assert from "node:assert/strict";

import {
    REAL_CALIBRATION_ORCHESTRATOR_STATE,
    REAL_CALIBRATION_ORCHESTRATOR_CAPTURE_STATUS,
    createBiometricRealCalibrationCollectionOrchestrator,
} from "../src/identity/biometricRealCalibrationCollectionOrchestrator.mjs";

function createPlan({
    sampleCount =
        2,
} = {}) {
    const samples =
        Array.from(
            {
                length:
                    sampleCount,
            },
            (
                _,
                index,
            ) => ({
                sampleId:
                    `cal-p001-enroll-${String(index + 1).padStart(2, "0")}`,

                profileId:
                    "test-profile",

                role:
                    "ENROLLMENT",

                captureConditionId:
                    index % 2 === 0
                        ? "condition-a"
                        : "condition-b",
            }),
        );

    return {
        calibrationParticipantIds: [
            "cal-p001",
        ],

        evaluationParticipantIds: [
            "eval-p001",
        ],

        captureConditionCatalog: [
            {
                id:
                    "condition-a",

                deviceId:
                    "camera-a",
            },
            {
                id:
                    "condition-b",

                deviceId:
                    "camera-b",
            },
        ],

        participants: [
            {
                participantId:
                    "cal-p001",

                sessions: [
                    {
                        sessionId:
                            "session-cal-p001-enroll",

                        samples,
                    },
                ],
            },
            {
                participantId:
                    "eval-p001",

                sessions: [
                    {
                        sessionId:
                            "session-eval-p001-enroll",

                        samples: [
                            {
                                sampleId:
                                    "eval-p001-enroll-01",

                                profileId:
                                    "test-profile",

                                role:
                                    "ENROLLMENT",

                                captureConditionId:
                                    "condition-a",
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

function createRunner({
    captureResults =
        [],
    throwOnCapture =
        false,
} = {}) {
    const calls = {
        start: [],
        capture: [],
        complete:
            0,
        finalize:
            0,
        abort:
            0,
    };

    let state =
        "READY";

    let active =
        false;

    let captured =
        0;

    return {
        calls,

        startSession(sessionId) {
            calls.start.push(
                sessionId,
            );

            active =
                true;

            state =
                "COLLECTING";

            return this.snapshot();
        },

        async captureSample(sampleId) {
            calls.capture.push(
                sampleId,
            );

            if (throwOnCapture) {
                throw new Error(
                    "runner-capture-failed",
                );
            }

            const result =
                captureResults.length >
                0
                    ? captureResults.shift()
                    : {
                        accepted:
                            true,

                        status:
                            "CAPTURED",
                    };

            if (
                result.accepted ===
                    true &&
                result.status ===
                    "CAPTURED"
            ) {
                captured +=
                    1;
            }

            return Object.freeze({
                ...result,
            });
        },

        completeSession() {
            calls.complete +=
                1;

            active =
                false;

            state =
                "COLLECTING";

            return this.snapshot();
        },

        finalize() {
            calls.finalize +=
                1;

            state =
                "FINALIZED";

            return Object.freeze({
                executionManifest:
                    Object.freeze({
                        phase:
                            "CALIBRATION",
                    }),

                calibrationDataset:
                    Object.freeze({
                        datasetVersion:
                            "test",
                    }),

                validationSummary:
                    Object.freeze({
                        readyForCalibrationAnalysis:
                            true,
                    }),
            });
        },

        abort() {
            calls.abort +=
                1;

            active =
                false;

            state =
                "ABORTED";

            return true;
        },

        snapshot() {
            return Object.freeze({
                state,
                activeSession:
                    active,
                capturedSamples:
                    captured,
            });
        },
    };
}

function createFreshFrame({
    readyAfterChecks =
        2,

    neverReady =
        false,

    throwOnArm =
        false,
} = {}) {
    const calls = {
        arm: [],
        check:
            0,
        reset:
            0,
    };

    let armed =
        false;

    let deviceId =
        null;

    let checksSinceArm =
        0;

    return {
        calls,

        async arm(nextDeviceId) {
            calls.arm.push(
                nextDeviceId,
            );

            if (throwOnArm) {
                throw new Error(
                    "fresh-arm-failed",
                );
            }

            armed =
                true;

            deviceId =
                nextDeviceId;

            checksSinceArm =
                0;

            return Object.freeze({
                armed:
                    true,

                deviceId,

                baselineLastFrame:
                    10,

                drainedPendingFrame:
                    true,
            });
        },

        checkCaptureAdmission() {
            calls.check +=
                1;

            checksSinceArm +=
                1;

            if (
                neverReady ||
                checksSinceArm <
                    readyAfterChecks
            ) {
                return Object.freeze({
                    armed,

                    readyForCapture:
                        false,

                    reason:
                        "FRAME_NOT_ADVANCED",

                    baselineLastFrame:
                        10,

                    observedLastFrame:
                        10,
                });
            }

            return Object.freeze({
                armed,

                readyForCapture:
                    true,

                reason:
                    "FRESH_FRAME_READY",

                baselineLastFrame:
                    10,

                observedLastFrame:
                    11,
            });
        },

        reset() {
            calls.reset +=
                1;

            const wasArmed =
                armed;

            armed =
                false;

            deviceId =
                null;

            checksSinceArm =
                0;

            return wasArmed;
        },

        snapshot() {
            return Object.freeze({
                armed,
                deviceId,
            });
        },
    };
}

test(
    "R10C coordena fresh-frame e runner sem reutilizar estado entre amostras",
    async () => {
        const runner =
            createRunner();

        const fresh =
            createFreshFrame({
                readyAfterChecks:
                    2,
            });

        let waits =
            0;

        const orchestrator =
            createBiometricRealCalibrationCollectionOrchestrator({
                collectionPlan:
                    createPlan(),

                runner,

                freshFrameAdmission:
                    fresh,

                freshFrameTimeoutMs:
                    10,

                pollIntervalMs:
                    1,

                wait:
                    async () => {
                        waits +=
                            1;
                    },
            });

        const initial =
            orchestrator.snapshot();

        assert.equal(
            initial.state,
            REAL_CALIBRATION_ORCHESTRATOR_STATE.READY,
        );

        assert.equal(
            initial.totalSessions,
            1,
        );

        assert.equal(
            initial.totalSamples,
            2,
        );

        orchestrator.startSession(
            "session-cal-p001-enroll",
        );

        const first =
            await orchestrator.captureSample(
                "cal-p001-enroll-01",
            );

        const second =
            await orchestrator.captureSample(
                "cal-p001-enroll-02",
            );

        assert.equal(
            first.accepted,
            true,
        );

        assert.equal(
            first.status,
            "CAPTURED",
        );

        assert.equal(
            second.accepted,
            true,
        );

        assert.equal(
            second.status,
            "CAPTURED",
        );

        assert.deepEqual(
            fresh.calls.arm,
            [
                "camera-a",
                "camera-b",
            ],
        );

        assert.equal(
            runner.calls.capture.length,
            2,
        );

        assert.ok(
            fresh.calls.reset >=
                4,
        );

        assert.ok(
            waits >=
                2,
        );

        const afterSession =
            orchestrator.completeSession();

        assert.equal(
            afterSession.completedSessions,
            1,
        );

        assert.equal(
            afterSession.capturedSamples,
            2,
        );

        const finalized =
            orchestrator.finalize();

        assert.equal(
            finalized.validationSummary
                .readyForCalibrationAnalysis,
            true,
        );

        assert.equal(
            orchestrator.snapshot().state,
            REAL_CALIBRATION_ORCHESTRATOR_STATE.FINALIZED,
        );

        assert.equal(
            runner.calls.finalize,
            1,
        );

        assert.equal(
            runner.calls.abort,
            0,
        );
    },
);

test(
    "R10C timeout de fresh-frame nao chama captureSample e permite abort seguro",
    async () => {
        const runner =
            createRunner();

        const fresh =
            createFreshFrame({
                neverReady:
                    true,
            });

        const orchestrator =
            createBiometricRealCalibrationCollectionOrchestrator({
                collectionPlan:
                    createPlan({
                        sampleCount:
                            1,
                    }),

                runner,

                freshFrameAdmission:
                    fresh,

                freshFrameTimeoutMs:
                    2,

                pollIntervalMs:
                    1,

                wait:
                    async () => {},
            });

        orchestrator.startSession(
            "session-cal-p001-enroll",
        );

        const result =
            await orchestrator.captureSample(
                "cal-p001-enroll-01",
            );

        assert.equal(
            result.accepted,
            false,
        );

        assert.equal(
            result.status,
            REAL_CALIBRATION_ORCHESTRATOR_CAPTURE_STATUS
                .FRESH_FRAME_TIMEOUT,
        );

        assert.equal(
            runner.calls.capture.length,
            0,
        );

        assert.equal(
            orchestrator.snapshot().capturedSamples,
            0,
        );

        assert.equal(
            orchestrator.snapshot().state,
            REAL_CALIBRATION_ORCHESTRATOR_STATE.SESSION_ACTIVE,
        );

        assert.equal(
            orchestrator.abort(),
            true,
        );

        assert.equal(
            runner.calls.abort,
            1,
        );

        assert.equal(
            orchestrator.snapshot().state,
            REAL_CALIBRATION_ORCHESTRATOR_STATE.ABORTED,
        );
    },
);

test(
    "R10C rejeicao NO_FACE nao contabiliza amostra e permite repetir a mesma amostra",
    async () => {
        const runner =
            createRunner({
                captureResults: [
                    {
                        accepted:
                            false,

                        status:
                            "NO_FACE",
                    },
                    {
                        accepted:
                            true,

                        status:
                            "CAPTURED",
                    },
                ],
            });

        const fresh =
            createFreshFrame({
                readyAfterChecks:
                    1,
            });

        const orchestrator =
            createBiometricRealCalibrationCollectionOrchestrator({
                collectionPlan:
                    createPlan({
                        sampleCount:
                            1,
                    }),

                runner,

                freshFrameAdmission:
                    fresh,

                freshFrameTimeoutMs:
                    5,

                pollIntervalMs:
                    1,

                wait:
                    async () => {},
            });

        orchestrator.startSession(
            "session-cal-p001-enroll",
        );

        const rejected =
            await orchestrator.captureSample(
                "cal-p001-enroll-01",
            );

        assert.equal(
            rejected.accepted,
            false,
        );

        assert.equal(
            rejected.status,
            "NO_FACE",
        );

        assert.equal(
            orchestrator.snapshot().capturedSamples,
            0,
        );

        const accepted =
            await orchestrator.captureSample(
                "cal-p001-enroll-01",
            );

        assert.equal(
            accepted.accepted,
            true,
        );

        assert.equal(
            accepted.status,
            "CAPTURED",
        );

        assert.equal(
            orchestrator.snapshot().capturedSamples,
            1,
        );

        assert.equal(
            runner.calls.capture.length,
            2,
        );

        orchestrator.completeSession();

        assert.equal(
            orchestrator.snapshot().completedSessions,
            1,
        );
    },
);

test(
    "R10C excecao estrutural no fresh-frame executa fail-safe e aborta runner",
    async () => {
        const runner =
            createRunner();

        const fresh =
            createFreshFrame({
                throwOnArm:
                    true,
            });

        const orchestrator =
            createBiometricRealCalibrationCollectionOrchestrator({
                collectionPlan:
                    createPlan({
                        sampleCount:
                            1,
                    }),

                runner,

                freshFrameAdmission:
                    fresh,

                freshFrameTimeoutMs:
                    5,

                pollIntervalMs:
                    1,

                wait:
                    async () => {},
            });

        orchestrator.startSession(
            "session-cal-p001-enroll",
        );

        await assert.rejects(
            () =>
                orchestrator.captureSample(
                    "cal-p001-enroll-01",
                ),
            /fresh-arm-failed/,
        );

        assert.equal(
            runner.calls.capture.length,
            0,
        );

        assert.equal(
            runner.calls.abort,
            1,
        );

        assert.equal(
            orchestrator.snapshot().state,
            REAL_CALIBRATION_ORCHESTRATOR_STATE.FAILED,
        );

        assert.equal(
            orchestrator.snapshot().freshFrameArmed,
            false,
        );
    },
);

test(
    "R10C impede completar sessao antes de todas as amostras aceitas",
    async () => {
        const runner =
            createRunner();

        const fresh =
            createFreshFrame({
                readyAfterChecks:
                    1,
            });

        const orchestrator =
            createBiometricRealCalibrationCollectionOrchestrator({
                collectionPlan:
                    createPlan(),

                runner,

                freshFrameAdmission:
                    fresh,

                freshFrameTimeoutMs:
                    5,

                pollIntervalMs:
                    1,

                wait:
                    async () => {},
            });

        orchestrator.startSession(
            "session-cal-p001-enroll",
        );

        await orchestrator.captureSample(
            "cal-p001-enroll-01",
        );

        assert.throws(
            () =>
                orchestrator.completeSession(),
            /SESSION_SAMPLES_INCOMPLETE/,
        );

        assert.equal(
            runner.calls.complete,
            0,
        );

        assert.equal(
            orchestrator.snapshot().state,
            REAL_CALIBRATION_ORCHESTRATOR_STATE.SESSION_ACTIVE,
        );
    },
);

test(
    "R10C nao permite amostra de outro split entrar na sessao CALIBRATION",
    async () => {
        const runner =
            createRunner();

        const fresh =
            createFreshFrame({
                readyAfterChecks:
                    1,
            });

        const orchestrator =
            createBiometricRealCalibrationCollectionOrchestrator({
                collectionPlan:
                    createPlan({
                        sampleCount:
                            1,
                    }),

                runner,

                freshFrameAdmission:
                    fresh,

                freshFrameTimeoutMs:
                    5,

                pollIntervalMs:
                    1,

                wait:
                    async () => {},
            });

        orchestrator.startSession(
            "session-cal-p001-enroll",
        );

        await assert.rejects(
            async () =>
                orchestrator.captureSample(
                    "eval-p001-enroll-01",
                ),
            /CALIBRATION_SAMPLE_UNKNOWN/,
        );

        assert.equal(
            runner.calls.capture.length,
            0,
        );

        assert.equal(
            fresh.calls.arm.length,
            0,
        );
    },
);