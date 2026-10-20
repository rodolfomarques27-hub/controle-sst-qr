import assert from "node:assert/strict";
import test from "node:test";

import {
    LOCAL_CALIBRATION_BIOMETRIC_PERSISTENCE,
    LOCAL_CALIBRATION_EXECUTION_MODE,
    createLocalBiometricCalibrationPilotEntrypoint,
} from "../dev/biometricCalibrationPilotEntrypoint.mjs";

function authorized() {
    return {
        CAMERA:
            true,
        RTSP:
            true,
        PARTICIPANTS:
            true,
    };
}

function sentinelInputs(
    factoryOverrides,
) {
    return {
        authorizations:
            authorized(),

        env:
            Object.freeze({}),

        runtimeOptions:
            Object.freeze({}),

        controlledStudyContract:
            Object.freeze({
                marker:
                    "controlled-study-contract",
            }),

        collectionPlan:
            Object.freeze({
                marker:
                    "collection-plan",
            }),

        scoringProtocol:
            Object.freeze({
                marker:
                    "scoring-protocol",
            }),

        detector:
            Object.freeze({
                marker:
                    "detector",
            }),

        alignFace:
            () =>
                "not-called",

        embeddingExtractor:
            Object.freeze({
                marker:
                    "embedding-extractor",
            }),

        admissionAlignmentConfig:
            Object.freeze({
                marker:
                    "admission-alignment",
            }),

        collectionAlignmentPolicy:
            Object.freeze({
                marker:
                    "collection-alignment",
            }),

        admissionOptions:
            Object.freeze({
                marker:
                    "admission-options",
            }),

        orchestratorOptions:
            Object.freeze({
                marker:
                    "orchestrator-options",
            }),

        factoryOverrides,
    };
}

test(
    "falha fechado antes de criar runtime quando CAMERA, RTSP ou PARTICIPANTS nao foi autorizado",
    () => {
        for (
            const missing of
            [
                "CAMERA",
                "RTSP",
                "PARTICIPANTS",
            ]
        ) {
            let runtimeCalls =
                0;

            const authorizations =
                {
                    ...authorized(),
                    [missing]:
                        false,
                };

            assert.throws(
                () =>
                    createLocalBiometricCalibrationPilotEntrypoint({
                        authorizations,

                        factoryOverrides: {
                            createGatewayRuntime() {
                                runtimeCalls +=
                                    1;

                                return {};
                            },
                        },
                    }),
                (
                    error,
                ) => {
                    assert.equal(
                        error.code,
                        "LOCAL_CALIBRATION_AUTHORIZATION_REQUIRED",
                    );

                    assert.deepEqual(
                        error.missing,
                        [
                            missing,
                        ],
                    );

                    return true;
                },
            );

            assert.equal(
                runtimeCalls,
                0,
            );
        }
    },
);

test(
    "compoe runtime local sem iniciar health server, camera ou captura automaticamente",
    async () => {
        const calls =
            {
                runtime:
                    0,
                admission:
                    0,
                fresh:
                    0,
                runner:
                    0,
                orchestrator:
                    0,
                healthStart:
                    0,
                cameraStart:
                    0,
                admissionRun:
                    0,
                capture:
                    0,
            };

        const captured =
            {};

        const source =
            Object.freeze({
                marker:
                    "capture-source",
            });

        const runtime =
            {
                rtspSessions:
                    new Map([
                        [
                            "device-a",
                            source,
                        ],
                    ]),

                healthServer: {
                    start() {
                        calls.healthStart +=
                            1;

                        throw new Error(
                            "health server nao deve iniciar",
                        );
                    },
                },

                startCamera() {
                    calls.cameraStart +=
                        1;

                    throw new Error(
                        "camera nao deve iniciar",
                    );
                },
            };

        const admission =
            Object.freeze({
                run() {
                    calls.admissionRun +=
                        1;
                },

                snapshot() {
                    return {};
                },
            });

        const freshFrameAdmission =
            Object.freeze({
                arm() {
                    return {};
                },

                checkCaptureAdmission() {
                    return {};
                },

                reset() {
                    return true;
                },

                snapshot() {
                    return {};
                },
            });

        const runner =
            Object.freeze({
                startSession() {
                    return {};
                },

                captureSample() {
                    calls.capture +=
                        1;

                    return {};
                },

                completeSession() {
                    return {};
                },

                finalize() {
                    return {};
                },

                abort() {
                    return true;
                },

                snapshot() {
                    return {};
                },
            });

        const orchestrator =
            Object.freeze({
                startSession() {
                    return {};
                },

                captureSample() {
                    calls.capture +=
                        1;

                    return {};
                },

                completeSession() {
                    return {};
                },

                finalize() {
                    return {};
                },

                abort() {
                    return true;
                },

                snapshot() {
                    return {};
                },
            });

        const factoryOverrides =
            {
                createGatewayRuntime(
                    options,
                ) {
                    calls.runtime +=
                        1;

                    captured.runtimeOptions =
                        options;

                    return runtime;
                },

                createAdmission(
                    options,
                ) {
                    calls.admission +=
                        1;

                    captured.admissionOptions =
                        options;

                    return admission;
                },

                createFreshFrameAdmission(
                    options,
                ) {
                    calls.fresh +=
                        1;

                    captured.freshOptions =
                        options;

                    return freshFrameAdmission;
                },

                createRunner(
                    options,
                ) {
                    calls.runner +=
                        1;

                    captured.runnerOptions =
                        options;

                    return runner;
                },

                createOrchestrator(
                    options,
                ) {
                    calls.orchestrator +=
                        1;

                    captured.orchestratorOptions =
                        options;

                    return orchestrator;
                },
            };

        const input =
            sentinelInputs(
                factoryOverrides,
            );

        const entrypoint =
            createLocalBiometricCalibrationPilotEntrypoint(
                input,
            );

        assert.equal(
            calls.runtime,
            1,
        );

        assert.equal(
            calls.admission,
            1,
        );

        assert.equal(
            calls.fresh,
            1,
        );

        assert.equal(
            calls.runner,
            1,
        );

        assert.equal(
            calls.orchestrator,
            1,
        );

        assert.equal(
            calls.healthStart,
            0,
        );

        assert.equal(
            calls.cameraStart,
            0,
        );

        assert.equal(
            calls.admissionRun,
            0,
        );

        assert.equal(
            calls.capture,
            0,
        );

        assert.equal(
            captured
                .admissionOptions
                .createRuntime(),
            runtime,
        );

        assert.equal(
            captured
                .admissionOptions
                .env,
            input.env,
        );

        assert.equal(
            captured
                .freshOptions
                .resolveCaptureSource,
            entrypoint
                .resolveCaptureSource,
        );

        assert.equal(
            captured
                .runnerOptions
                .resolveCaptureSource,
            entrypoint
                .resolveCaptureSource,
        );

        assert.equal(
            captured
                .runnerOptions
                .collectionPlan,
            input.collectionPlan,
        );

        assert.equal(
            captured
                .orchestratorOptions
                .collectionPlan,
            input.collectionPlan,
        );

        assert.equal(
            captured
                .orchestratorOptions
                .runner,
            runner,
        );

        assert.equal(
            captured
                .orchestratorOptions
                .freshFrameAdmission,
            freshFrameAdmission,
        );

        assert.equal(
            entrypoint.runtime,
            runtime,
        );

        assert.equal(
            entrypoint.admission,
            admission,
        );

        assert.equal(
            entrypoint.runner,
            runner,
        );

        assert.equal(
            entrypoint.orchestrator,
            orchestrator,
        );

        assert.equal(
            entrypoint.mode,
            LOCAL_CALIBRATION_EXECUTION_MODE,
        );

        assert.equal(
            entrypoint.biometricPersistence,
            false,
        );

        assert.equal(
            LOCAL_CALIBRATION_BIOMETRIC_PERSISTENCE,
            false,
        );

        assert.equal(
            await entrypoint
                .resolveCaptureSource(
                    "device-a",
                ),
            source,
        );

        await assert.rejects(
            () =>
                entrypoint
                    .resolveCaptureSource(
                        "missing-device",
                    ),
            (
                error,
            ) => {
                assert.equal(
                    error.code,
                    "LOCAL_CALIBRATION_CAPTURE_SOURCE_NOT_FOUND",
                );

                return true;
            },
        );

        assert.equal(
            calls.healthStart,
            0,
        );

        assert.equal(
            calls.cameraStart,
            0,
        );

        assert.equal(
            calls.capture,
            0,
        );
    },
);

test(
    "modo local permanece manual e autorizacoes normalizadas ficam imutaveis",
    () => {
        const source =
            Object.freeze({
                marker:
                    "capture-source",
            });

        const runtime =
            Object.freeze({
                rtspSessions:
                    new Map([
                        [
                            "device-a",
                            source,
                        ],
                    ]),
            });

        const passive =
            Object.freeze({});

        const factoryOverrides =
            {
                createGatewayRuntime:
                    () =>
                        runtime,

                createAdmission:
                    () =>
                        passive,

                createFreshFrameAdmission:
                    () =>
                        passive,

                createRunner:
                    () =>
                        passive,

                createOrchestrator:
                    () =>
                        passive,
            };

        const entrypoint =
            createLocalBiometricCalibrationPilotEntrypoint(
                sentinelInputs(
                    factoryOverrides,
                ),
            );

        assert.equal(
            entrypoint.mode,
            "EXPLICIT_MANUAL_ONLY",
        );

        assert.equal(
            Object.isFrozen(
                entrypoint
                    .authorizations,
            ),
            true,
        );

        assert.deepEqual(
            entrypoint
                .authorizations,
            {
                CAMERA:
                    true,
                RTSP:
                    true,
                PARTICIPANTS:
                    true,
            },
        );

        assert.equal(
            entrypoint
                .biometricPersistence,
            false,
        );
    },
);
