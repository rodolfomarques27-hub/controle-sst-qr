import test from "node:test";
import assert from "node:assert/strict";

import {
    REAL_CAMERA_ADMISSION_BLOCKER,
    REAL_CAMERA_ADMISSION_CONFIRMATION,
    createBiometricRealCameraAdmissionHarness,
} from "../src/identity/biometricRealCameraAdmission.mjs";

const ALIGNMENT_CONFIG =
    Object.freeze({
        targetWidth:
            112,
        targetHeight:
            112,
        templateLandmarks:
            Object.freeze([
                Object.freeze({
                    x: 38.2946,
                    y: 51.6963,
                }),
                Object.freeze({
                    x: 73.5318,
                    y: 51.5014,
                }),
                Object.freeze({
                    x: 56.0252,
                    y: 71.7366,
                }),
                Object.freeze({
                    x: 41.5493,
                    y: 92.3655,
                }),
                Object.freeze({
                    x: 70.7299,
                    y: 92.2041,
                }),
            ]),
        paddingRatio:
            0,
        minFaceSizePx:
            24,
        minVisibleAreaRatio:
            0.6,
        maxRmsError:
            12,
    });

function validEmbedding() {
    const value =
        new Float32Array(
            128,
        );

    value[0] =
        1;

    return value;
}

function createFrame(
    fill =
        7,
) {
    const frame =
        new Uint8Array(
            2 *
            2 *
            3,
        );

    frame.fill(
        fill,
    );

    return frame;
}

function createAligned(
    fill =
        9,
) {
    const data =
        new Uint8Array(
            112 *
            112 *
            3,
        );

    data.fill(
        fill,
    );

    return {
        data,
        width:
            112,
        height:
            112,
        format:
            "bgr24",
    };
}

function createScenario({
    cameraConfigured =
        true,
    brokerConfigured =
        false,
    healthServerListening =
        false,
    startupMode =
        "SUCCESS",
    freshMode =
        "SUCCESS",
    faceMode =
        "ONE",
    faceModes =
        null,
    multipleDetections =
        null,
    detectorMode =
        "OK",
    alignmentMode =
        "OK",
    alignmentErrorCode =
        null,
    alignmentErrorRms =
        null,
    embeddingMode =
        "OK",
    startMode =
        "OK",
    stopMode =
        "OK",
} = {}) {
    let now =
        0;

    let startCalls =
        0;

    let stopCalls =
        0;

    let healthStartCalls =
        0;

    let detectorCalls =
        0;

    let alignmentCalls =
        0;

    let embeddingCalls =
        0;

    let state =
        "STOPPED";

    let running =
        false;

    let firstFrameSeen =
        false;

    let lastFrame =
        0;

    let pending =
        null;

    let received =
        0;

    let delivered =
        0;

    let dropped =
        0;

    let sleepCalls =
        0;

    const observedFrames =
        [];

    const observedAligned =
        [];

    const observedEmbeddings =
        [];

    const runtimeFactoryEnvs =
        [];

    function pushFrame(
        frame,
    ) {
        if (pending) {
            dropped +=
                1;
        }

        pending =
            frame;

        received +=
            1;

        lastFrame +=
            1;
    }

    function createTemporalFreshFrame(
        fill,
    ) {
        const data =
            new Uint8Array(
                2 *
                    2 *
                    3,
            );

        data.fill(
            fill,
        );

        return data;
    }
    const session =
        {
            snapshot() {
                return Object.freeze({
                    state,
                    running,
                    firstFrameSeen,
                    lastFrame,
                    frames:
                        Object.freeze({
                            format:
                                "bgr24",
                            width:
                                2,
                            height:
                                2,
                            queue:
                                Object.freeze({
                                    capacity:
                                        1,
                                    pending:
                                        pending !==
                                        null,
                                    pendingBytes:
                                        pending
                                            ?.byteLength ??
                                        0,
                                    received,
                                    delivered,
                                    dropped,
                                }),
                        }),
                });
            },

            takeLatestFrame() {
                if (!pending) {
                    return null;
                }

                const value =
                    pending;

                pending =
                    null;

                delivered +=
                    1;

                return value;
            },
        };

    const rtspSessions =
        new Map();

    const healthServer =
        {
            server:
                {
                    listening:
                        healthServerListening,
                },

            start() {
                healthStartCalls +=
                    1;
            },
        };

    const runtime =
        {
            config:
                {
                    broker:
                        brokerConfigured
                            ? {
                                url:
                                    "https://broker.invalid",
                            }
                            : null,

                    camera:
                        cameraConfigured
                            ? {
                                id:
                                    "camera-test-01",
                            }
                            : null,
                },

            rtspSessions,

            healthServer,

            startCamera(
                cameraId,
            ) {
                startCalls +=
                    1;

                assert.equal(
                    cameraId,
                    "camera-test-01",
                );

                rtspSessions.set(
                    cameraId,
                    session,
                );

                state =
                    "STARTING";

                running =
                    true;

                if (
                    startMode ===
                    "ERROR"
                ) {
                    throw new Error(
                        "synthetic start error",
                    );
                }
            },

            stopCamera(
                cameraId,
            ) {
                stopCalls +=
                    1;

                assert.equal(
                    cameraId,
                    "camera-test-01",
                );

                if (
                    stopMode ===
                    "ERROR"
                ) {
                    throw new Error(
                        "synthetic stop error",
                    );
                }

                state =
                    "STOPPED";

                running =
                    false;

                return true;
            },
        };

    const detector =
        {
            async detectBgr({
                data,
                width,
                height,
            }) {
                detectorCalls +=
                    1;

                const requestedFaceMode =
                    Array.isArray(
                        faceModes,
                    )
                        ? faceModes[
                              detectorCalls -
                                  1
                          ] ??
                          faceMode
                        : faceMode;

                const activeFaceMode =
                    requestedFaceMode ===
                        "MULTI"
                        ? "MULTIPLE"
                        : requestedFaceMode;

                observedFrames.push(
                    data,
                );

                assert.equal(
                    width,
                    2,
                );

                assert.equal(
                    height,
                    2,
                );

                if (
                    detectorMode ===
                    "ERROR"
                ) {
                    throw new Error(
                        "synthetic detector error",
                    );
                }

                if (
                    freshMode ===
                        "SUCCESS" &&
                    detectorCalls <
                        3
                ) {
                    pushFrame(
                        createTemporalFreshFrame(
                            40 +
                                detectorCalls,
                        ),
                    );
                }
                if (
                    activeFaceMode ===
                    "ZERO"
                ) {
                    return [];
                }

                if (
                activeFaceMode ===
                    "MULTIPLE"
            ) {
                if (
                    Array.isArray(
                        multipleDetections,
                    )
                ) {
                    return multipleDetections;
                }

                return [
                    {
                        x: 0,
                        y: 0,
                        width: 100,
                        height: 100,
                        score: 0.90,
                        landmarks: [],
                    },
                    {
                        x: 60,
                        y: 0,
                        width: 100,
                        height: 100,
                        score: 0.75,
                        landmarks: [],
                    },
                ];
            }

                return [
                    {},
                ];
            },
        };

    async function alignFace() {
        alignmentCalls +=
            1;

        if (
            alignmentMode ===
            "ERROR"
        ) {
            const error =
                new Error(
                    "synthetic alignment error",
                );

            if (
                alignmentErrorCode !==
                    null
            ) {
                error.name =
                    "FaceAlignmentError";

                error.code =
                    alignmentErrorCode;

                if (
                    alignmentErrorRms !==
                        null
                ) {
                    error.details =
                        Object.freeze({
                            rmsError:
                                alignmentErrorRms,
                        });
                }
            }

            throw error;
        }

        if (
            alignmentMode ===
            "INVALID"
        ) {
            return {
                data:
                    new Uint8Array(
                        4,
                    ),
                width:
                    2,
                height:
                    2,
            };
        }

        const aligned =
            createAligned();

        observedAligned.push(
            aligned.data,
        );

        return aligned;
    }

    const embeddingExtractor =
        {
            async extractBgr112({
                data,
                width,
                height,
            }) {
                embeddingCalls +=
                    1;

                assert.equal(
                    width,
                    112,
                );

                assert.equal(
                    height,
                    112,
                );

                assert.equal(
                    data.length,
                    112 *
                        112 *
                        3,
                );

                if (
                    embeddingMode ===
                    "ERROR"
                ) {
                    throw new Error(
                        "synthetic embedding error",
                    );
                }

                const embedding =
                    embeddingMode ===
                        "INVALID"
                        ? new Float32Array(
                            128,
                        )
                        : validEmbedding();

                observedEmbeddings.push(
                    embedding,
                );

                return embedding;
            },
        };

    const env =
        {
            SAFESCAN_CAMERA_ID:
                "camera-test-01",
            SAFESCAN_CAMERA_HOST:
                "192.0.2.10",
            SAFESCAN_CAMERA_USERNAME:
                "secret-user",
            SAFESCAN_CAMERA_PASSWORD:
                "secret-password",
            SAFESCAN_BIOMETRIC_BROKER_URL:
                "https://broker.example.invalid",
            SAFESCAN_BIOMETRIC_BROKER_TOKEN:
                "secret-token",
        };

    function createRuntime({
        env:
            suppliedEnv,
    }) {
        runtimeFactoryEnvs.push(
            suppliedEnv,
        );

        return runtime;
    }

    async function sleep(
        milliseconds,
    ) {
        now +=
            milliseconds;

        sleepCalls +=
            1;

        if (
            startupMode ===
                "SUCCESS" &&
            state ===
                "STARTING"
        ) {
            state =
                "RUNNING";

            running =
                true;

            firstFrameSeen =
                true;

            pushFrame(
                createFrame(
                    3,
                ),
            );

            return;
        }

        if (
            state ===
                "RUNNING" &&
            freshMode ===
                "SUCCESS" &&
            sleepCalls >=
                2 &&
            pending ===
                null
        ) {
            pushFrame(
                createFrame(
                    5,
                ),
            );

            return;
        }

        if (
            state ===
                "RUNNING" &&
            freshMode ===
                "EXTERNAL_CONSUMER" &&
            sleepCalls >=
                2 &&
            pending ===
                null
        ) {
            pushFrame(
                createFrame(
                    6,
                ),
            );

            const stolen =
                session.takeLatestFrame();

            stolen?.fill(
                0,
            );

            return;
        }

        if (
            state ===
                "RUNNING" &&
            freshMode ===
                "ADVANCE_WITHOUT_PENDING" &&
            sleepCalls >=
                2
        ) {
            lastFrame +=
                1;
        }
    }

    const harness =
        createBiometricRealCameraAdmissionHarness({
            createRuntime,
            env,
            detector,
            alignFace,
            embeddingExtractor,
            alignmentConfig:
                ALIGNMENT_CONFIG,
            startupTimeoutMs:
                30,
            freshFrameTimeoutMs:
                30,
            pollIntervalMs:
                10,
            sleep,
            nowMs:
                () =>
                    now,
        });

    return {
        harness,
        env,
        runtime,
        session,
        runtimeFactoryEnvs,
        observedFrames,
        observedAligned,
        observedEmbeddings,
        counts() {
            return {
                startCalls,
                stopCalls,
                healthStartCalls,
                detectorCalls,
                alignmentCalls,
                embeddingCalls,
                sleepCalls,
            };
        },
    };
}

test(
    "area livre precisa ser confirmada antes de criar runtime ou iniciar camera",
    async () => {
        const scenario =
            createScenario();

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    "NOT_CONFIRMED",
            });

        assert.equal(
            result.admissionPassed,
            false,
        );

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .AREA_CLEAR_NOT_CONFIRMED,
            ],
        );

        assert.equal(
            scenario.counts()
                .startCalls,
            0,
        );

        assert.equal(
            scenario.runtimeFactoryEnvs
                .length,
            0,
        );
    },
);

test(
    "runtime recebe env sem configuracao de broker",
    async () => {
        const scenario =
            createScenario();

        await scenario.harness.run({
            areaClearConfirmation:
                REAL_CAMERA_ADMISSION_CONFIRMATION,
        });

        assert.equal(
            scenario.runtimeFactoryEnvs
                .length,
            1,
        );

        const supplied =
            scenario.runtimeFactoryEnvs[0];

        assert.equal(
            Object.hasOwn(
                supplied,
                "SAFESCAN_BIOMETRIC_BROKER_URL",
            ),
            false,
        );

        assert.equal(
            Object.hasOwn(
                supplied,
                "SAFESCAN_BIOMETRIC_BROKER_TOKEN",
            ),
            false,
        );

        assert.equal(
            supplied.SAFESCAN_CAMERA_PASSWORD,
            "secret-password",
        );
    },
);

test(
    "camera ausente bloqueia admission sem start",
    async () => {
        const scenario =
            createScenario({
                cameraConfigured:
                    false,
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .CAMERA_NOT_CONFIGURED,
            ],
        );

        assert.equal(
            scenario.counts()
                .startCalls,
            0,
        );
    },
);

test(
    "broker presente no runtime bloqueia admission",
    async () => {
        const scenario =
            createScenario({
                brokerConfigured:
                    true,
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .BROKER_MUST_BE_DISABLED,
            ],
        );

        assert.equal(
            scenario.counts()
                .startCalls,
            0,
        );
    },
);

test(
    "health server previamente ativo bloqueia admission",
    async () => {
        const scenario =
            createScenario({
                healthServerListening:
                    true,
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .HEALTH_SERVER_ALREADY_RUNNING,
            ],
        );

        assert.equal(
            scenario.counts()
                .startCalls,
            0,
        );

        assert.equal(
            scenario.counts()
                .healthStartCalls,
            0,
        );
    },
);

test(
    "success path chama start e stop exatamente uma vez e nunca inicia health server",
    async () => {
        const scenario =
            createScenario();

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.equal(
            result.admissionPassed,
            true,
        );

        assert.equal(
            scenario.counts()
                .startCalls,
            1,
        );

        assert.equal(
            scenario.counts()
                .stopCalls,
            1,
        );

        assert.equal(
            scenario.counts()
                .healthStartCalls,
            0,
        );
    },
);

test(
    "timeout de startup executa stop em finally",
    async () => {
        const scenario =
            createScenario({
                startupMode:
                    "TIMEOUT",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .STARTUP_TIMEOUT,
            ],
        );

        assert.equal(
            scenario.counts()
                .stopCalls,
            1,
        );
    },
);

test(
    "timeout de fresh frame executa stop em finally",
    async () => {
        const scenario =
            createScenario({
                freshMode:
                    "TIMEOUT",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .FRESH_FRAME_TIMEOUT,
            ],
        );

        assert.equal(
            scenario.counts()
                .stopCalls,
            1,
        );
    },
);

test(
    "frame antigo e drenado e zerado antes do baseline",
    async () => {
        const scenario =
            createScenario({
                freshMode:
                    "TIMEOUT",
            });

        await scenario.harness.run({
            areaClearConfirmation:
                REAL_CAMERA_ADMISSION_CONFIRMATION,
        });

        assert.equal(
            scenario.session
                .snapshot()
                .frames
                .queue
                .delivered >=
                1,
            true,
        );
    },
);

test(
    "consumidor concorrente e detectado no protocolo fresh-frame",
    async () => {
        const scenario =
            createScenario({
                freshMode:
                    "EXTERNAL_CONSUMER",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .EXCLUSIVE_FRAME_CONSUMER_VIOLATION,
            ],
        );

        assert.equal(
            result.admissionPassed,
            false,
        );
    },
);

test(
    "avanço de lastFrame sem frame pendente e bloqueado",
    async () => {
        const scenario =
            createScenario({
                freshMode:
                    "ADVANCE_WITHOUT_PENDING",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .FRESH_FRAME_PENDING_REQUIRED,
            ],
        );
    },
);

test(
    "zero face nao executa alignment nem embedding e sempre para camera",
    async () => {
        const scenario =
            createScenario({
                faceMode:
                    "ZERO",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.equal(
            result.streamAdmission,
            true,
        );

        assert.equal(
            result.faceCount,
            0,
        );

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER.NO_FACE,
            ],
        );

        assert.equal(
            scenario.counts()
                .alignmentCalls,
            0,
        );

        assert.equal(
            scenario.counts()
                .embeddingCalls,
            0,
        );

        assert.equal(
            scenario.counts()
                .stopCalls,
            1,
        );
    },
);

test(
    "multiplas faces nao selecionam automaticamente uma face",
    async () => {
        const scenario =
            createScenario({
                faceMode:
                    "MULTIPLE",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.equal(
            result.faceCount,
            2,
        );

        assert.equal(
            result.multipleFacesOverlapBand,
            "GT_0_20_LE_0_30",
        );

        assert.equal(
            result.secondaryFaceScoreBand,
            "GT_0_70_LE_0_80",
        );

        for (const forbidden of [
            "detections",
            "bbox",
            "x",
            "y",
            "width",
            "height",
            "iou",
            "overlap",
            "score",
            "landmarks",
        ]) {
            assert.equal(
                forbidden in result,
                false,
            );
        }

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .MULTIPLE_FACES,
            ],
        );

        assert.equal(
            scenario.counts()
                .alignmentCalls,
            0,
        );
    },
);

test(
    "MULTIPLE_FACES publica somente faixas sanitizadas de overlap",
    async () => {
        const cases = [
            [90, "LE_0_10"],
            [80, "GT_0_10_LE_0_20"],
            [60, "GT_0_20_LE_0_30"],
            [50, "UNKNOWN"],
        ];

        for (const [secondX, expectedBand] of cases) {
            const scenario =
                createScenario({
                    faceMode:
                        "MULTIPLE",
                    multipleDetections:
                        [
                            {
                                x: 0,
                                y: 0,
                                width: 100,
                                height: 100,
                                score: 0.90,
                                landmarks: [],
                            },
                            {
                                x: secondX,
                                y: 0,
                                width: 100,
                                height: 100,
                                score: 0.75,
                                landmarks: [],
                            },
                        ],
                });

            const result =
                await scenario.harness.run({
                    areaClearConfirmation:
                        REAL_CAMERA_ADMISSION_CONFIRMATION,
                });

            assert.equal(
                result.faceCount,
                2,
            );

            assert.deepEqual(
                result.blockers,
                [
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .MULTIPLE_FACES,
                ],
            );

            assert.equal(
                result.multipleFacesOverlapBand,
                expectedBand,
            );

            assert.equal(
                result.secondaryFaceScoreBand,
                "GT_0_70_LE_0_80",
            );

            assert.equal(
                scenario.counts()
                    .alignmentCalls,
                0,
            );
        }
    },
);

test(
    "MULTIPLE_FACES publica somente faixa sanitizada do score secundario",
    async () => {
        const cases = [
            [0.60, "UNKNOWN"],
            [0.600001, "GT_0_60_LE_0_70"],
            [0.70, "GT_0_60_LE_0_70"],
            [0.700001, "GT_0_70_LE_0_80"],
            [0.80, "GT_0_70_LE_0_80"],
            [0.800001, "GT_0_80_LE_0_90"],
            [0.90, "GT_0_80_LE_0_90"],
            [0.900001, "GT_0_90_LE_1_00"],
            [1.00, "GT_0_90_LE_1_00"],
            [1.000001, "UNKNOWN"],
            [Number.NaN, "UNKNOWN"],
        ];

        for (const [score, expectedBand] of cases) {
            const scenario =
                createScenario({
                    faceMode:
                        "MULTIPLE",
                    multipleDetections:
                        [
                            {
                                x: 0,
                                y: 0,
                                width: 100,
                                height: 100,
                                score: 0.95,
                                landmarks: [],
                            },
                            {
                                x: 60,
                                y: 0,
                                width: 100,
                                height: 100,
                                score,
                                landmarks: [],
                            },
                        ],
                });

            const result =
                await scenario.harness.run({
                    areaClearConfirmation:
                        REAL_CAMERA_ADMISSION_CONFIRMATION,
                });

            assert.equal(
                result.secondaryFaceScoreBand,
                expectedBand,
            );

            assert.equal(
                result.multipleFacesOverlapBand,
                "GT_0_20_LE_0_30",
            );
        }
    },
);

test(
    "diagnostico MULTIPLE_FACES permanece null fora do blocker MULTIPLE_FACES",
    async () => {
        const scenario =
            createScenario();

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.equal(
            result.faceCount,
            1,
        );

        assert.equal(
            result.multipleFacesOverlapBand,
            null,
        );

        assert.equal(
            result.secondaryFaceScoreBand,
            null,
        );
    },
);
test(
    "MULTIPLE_FACES N cobre faceCount 2 3 e maior que 3",
    async () => {
        const cases = [
            {
                name:
                    "two",
                detections:
                    [
                        {
                            x: 0,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.95,
                            landmarks: [],
                        },
                        {
                            x: 60,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.75,
                            landmarks: [],
                        },
                    ],
                expectedOverlapBand:
                    "GT_0_20_LE_0_30",
                expectedScoreBand:
                    "GT_0_70_LE_0_80",
            },
            {
                name:
                    "three",
                detections:
                    [
                        {
                            x: 0,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.95,
                            landmarks: [],
                        },
                        {
                            x: 200,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.85,
                            landmarks: [],
                        },
                        {
                            x: 60,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.75,
                            landmarks: [],
                        },
                    ],
                expectedOverlapBand:
                    "GT_0_20_LE_0_30",
                expectedScoreBand:
                    "GT_0_80_LE_0_90",
            },
            {
                name:
                    "four",
                detections:
                    [
                        {
                            x: 0,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.95,
                            landmarks: [],
                        },
                        {
                            x: 300,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.75,
                            landmarks: [],
                        },
                        {
                            x: 600,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.70,
                            landmarks: [],
                        },
                        {
                            x: 90,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.65,
                            landmarks: [],
                        },
                    ],
                expectedOverlapBand:
                    "LE_0_10",
                expectedScoreBand:
                    "GT_0_70_LE_0_80",
            },
        ];

        for (const item of cases) {
            const scenario =
                createScenario({
                    faceMode:
                        "MULTIPLE",
                    multipleDetections:
                        item.detections,
                });

            const result =
                await scenario.harness.run({
                    areaClearConfirmation:
                        REAL_CAMERA_ADMISSION_CONFIRMATION,
                });

            assert.equal(
                result.faceCount,
                item.detections.length,
                item.name,
            );

            assert.deepEqual(
                result.blockers,
                [
                    REAL_CAMERA_ADMISSION_BLOCKER
                        .MULTIPLE_FACES,
                ],
                item.name,
            );

            assert.equal(
                result.multipleFacesOverlapBand,
                item.expectedOverlapBand,
                item.name,
            );

            assert.equal(
                result.secondaryFaceScoreBand,
                item.expectedScoreBand,
                item.name,
            );

            assert.equal(
                scenario.counts()
                    .alignmentCalls,
                0,
                item.name,
            );
        }
    },
);

test(
    "MULTIPLE_FACES N retorna UNKNOWN para entradas diagnosticas invalidas",
    async () => {
        const invalidGeometry =
            createScenario({
                faceMode:
                    "MULTIPLE",
                multipleDetections:
                    [
                        {
                            x: 0,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.95,
                            landmarks: [],
                        },
                        {
                            x: 200,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.85,
                            landmarks: [],
                        },
                        {
                            x: 60,
                            y: 0,
                            width: 0,
                            height: 100,
                            score: 0.75,
                            landmarks: [],
                        },
                    ],
            });

        const invalidGeometryResult =
            await invalidGeometry.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.equal(
            invalidGeometryResult
                .multipleFacesOverlapBand,
            "UNKNOWN",
        );

        assert.equal(
            invalidGeometryResult
                .secondaryFaceScoreBand,
            "GT_0_80_LE_0_90",
        );

        const invalidSecondScore =
            createScenario({
                faceMode:
                    "MULTIPLE",
                multipleDetections:
                    [
                        {
                            x: 0,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.95,
                            landmarks: [],
                        },
                        {
                            x: 200,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: Number.NaN,
                            landmarks: [],
                        },
                        {
                            x: 60,
                            y: 0,
                            width: 100,
                            height: 100,
                            score: 0.75,
                            landmarks: [],
                        },
                    ],
            });

        const invalidSecondScoreResult =
            await invalidSecondScore.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.equal(
            invalidSecondScoreResult
                .multipleFacesOverlapBand,
            "GT_0_20_LE_0_30",
        );

        assert.equal(
            invalidSecondScoreResult
                .secondaryFaceScoreBand,
            "UNKNOWN",
        );
    },
);
test(
    "erro YuNet sintetico vira DETECTION_FAILED",
    async () => {
        const scenario =
            createScenario({
                detectorMode:
                    "ERROR",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .DETECTION_FAILED,
            ],
        );

        assert.equal(
            scenario.counts()
                .stopCalls,
            1,
        );
    },
);

test(
    "erro alignment preserva somente codigo seguro FaceAlignmentError",
    async () => {
        const scenario =
            createScenario({
                alignmentMode:
                    "ERROR",
                alignmentErrorCode:
                    "ALIGNMENT_RESIDUAL_TOO_HIGH",
                alignmentErrorRms:
                    0.075,
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .ALIGNMENT_FAILED,
            ],
        );

        assert.equal(
            result.alignmentFailureCode,
            "ALIGNMENT_RESIDUAL_TOO_HIGH",
        );

        assert.equal(
            result.alignmentFailureRmsBand,
            "GT_0_05_LE_0_10",
        );

        assert.equal(
            "rmsError" in result,
            false,
        );

        assert.equal(
            "maxError" in result,
            false,
        );

        assert.equal(
            "maxRmsError" in result,
            false,
        );

        assert.equal(
            "message" in result,
            false,
        );

        assert.equal(
            "details" in result,
            false,
        );
    },
);

test(
    "faixa RMS sanitizada categoriza sem expor valor numerico",
    async () => {
        const cases = [
            [0, "LE_0_05"],
            [0.05, "LE_0_05"],
            [0.050001, "GT_0_05_LE_0_10"],
            [0.10, "GT_0_05_LE_0_10"],
            [0.100001, "GT_0_10_LE_0_25"],
            [0.25, "GT_0_10_LE_0_25"],
            [0.250001, "GT_0_25_LE_0_50"],
            [0.50, "GT_0_25_LE_0_50"],
            [0.500001, "GT_0_50_LE_1_00"],
            [1.00, "GT_0_50_LE_1_00"],
            [1.000001, "GT_1_00_LE_1_25"],
            [1.25, "GT_1_00_LE_1_25"],
            [1.250001, "GT_1_25_LE_1_50"],
            [1.50, "GT_1_25_LE_1_50"],
            [1.500001, "GT_1_50_LE_1_75"],
            [1.75, "GT_1_50_LE_1_75"],
            [1.750001, "GT_1_75_LE_2_00"],
            [2.00, "GT_1_75_LE_2_00"],
            [2.000001, "GT_2_00_LE_4_00"],
            [4.00, "GT_2_00_LE_4_00"],
            [4.000001, "GT_4_00_LE_8_00"],
            [8.00, "GT_4_00_LE_8_00"],
            [8.000001, "GT_8_00_LE_16_00"],
            [16.00, "GT_8_00_LE_16_00"],
            [16.000001, "GT_16_00"],
            [Number.NaN, "UNKNOWN"],
            [-0.01, "UNKNOWN"],
        ];

        for (const [rmsError, expectedBand] of cases) {
            const scenario =
                createScenario({
                    alignmentMode:
                        "ERROR",
                    alignmentErrorCode:
                        "ALIGNMENT_RESIDUAL_TOO_HIGH",
                    alignmentErrorRms:
                        rmsError,
                });

            const result =
                await scenario.harness.run({
                    areaClearConfirmation:
                        REAL_CAMERA_ADMISSION_CONFIRMATION,
                });

            assert.equal(
                result.alignmentFailureCode,
                "ALIGNMENT_RESIDUAL_TOO_HIGH",
            );

            assert.equal(
                result.alignmentFailureRmsBand,
                expectedBand,
            );

            assert.equal(
                "rmsError" in result,
                false,
            );

            assert.equal(
                "maxError" in result,
                false,
            );

            assert.equal(
                "maxRmsError" in result,
                false,
            );
        }

        const nonResidualScenario =
            createScenario({
                alignmentMode:
                    "ERROR",
                alignmentErrorCode:
                    "FACE_TOO_SMALL",
                alignmentErrorRms:
                    0.075,
            });

        const nonResidualResult =
            await nonResidualScenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.equal(
            nonResidualResult.alignmentFailureCode,
            "FACE_TOO_SMALL",
        );

        assert.equal(
            nonResidualResult.alignmentFailureRmsBand,
            null,
        );
    },
);

test(
    "codigo alignment fora da whitelist nao e exposto",
    async () => {
        const scenario =
            createScenario({
                alignmentMode:
                    "ERROR",
                alignmentErrorCode:
                    "UNSAFE_PRIVATE_ALIGNMENT_DATA",
                alignmentErrorRms:
                    0.075,
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .ALIGNMENT_FAILED,
            ],
        );

        assert.equal(
            result.alignmentFailureCode,
            null,
        );

        assert.equal(
            result.alignmentFailureRmsBand,
            null,
        );
    },
);

test(
    "alignment estruturalmente invalido e bloqueado",
    async () => {
        const scenario =
            createScenario({
                alignmentMode:
                    "INVALID",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .ALIGNMENT_FAILED,
            ],
        );
    },
);

test(
    "erro SFace sintetico vira EMBEDDING_FAILED",
    async () => {
        const scenario =
            createScenario({
                embeddingMode:
                    "ERROR",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .EMBEDDING_FAILED,
            ],
        );
    },
);

test(
    "embedding 128D nao normalizado e bloqueado",
    async () => {
        const scenario =
            createScenario({
                embeddingMode:
                    "INVALID",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .EMBEDDING_FAILED,
            ],
        );
    },
);

test(
    "success path zera frame crop e embedding e nao cria artefatos de calibracao",
    async () => {
        const scenario =
            createScenario();

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.equal(
            result.admissionPassed,
            true,
        );

        assert.equal(
            result.streamAdmission,
            true,
        );

        assert.equal(
            result.visionAdmission,
            true,
        );

        assert.equal(
            result.faceCount,
            1,
        );

        assert.equal(
            result.embeddingValid,
            true,
        );

        assert.equal(
            result.calibrationSampleCaptured,
            false,
        );

        assert.equal(
            result.executionManifestCreated,
            false,
        );

        assert.equal(
            result.r7cDatasetCreated,
            false,
        );

        assert.equal(
            result.persistedArtifacts,
            false,
        );

        for (
            const frame of
            scenario.observedFrames
        ) {
            assert.ok(
                frame.every(
                    (
                        value,
                    ) =>
                        value ===
                        0,
                ),
            );
        }

        for (
            const crop of
            scenario.observedAligned
        ) {
            assert.ok(
                crop.every(
                    (
                        value,
                    ) =>
                        value ===
                        0,
                ),
            );
        }

        for (
            const embedding of
            scenario.observedEmbeddings
        ) {
            assert.ok(
                embedding.every(
                    (
                        value,
                    ) =>
                        value ===
                        0,
                ),
            );
        }
    },
);

test(
    "resultado publico nao expoe segredo imagem embedding ou identificador de participante",
    async () => {
        const scenario =
            createScenario();

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        const serialized =
            JSON.stringify(
                result,
            ).toLowerCase();

        for (
            const forbidden of
            [
                "secret-user",
                "secret-password",
                "secret-token",
                "participantid",
                "candidateThreshold",
                "matchThreshold",
                "ambiguityMargin",
                "recommendedThreshold",
            ].map(
                (
                    value,
                ) =>
                    value.toLowerCase(),
            )
        ) {
            assert.equal(
                serialized.includes(
                    forbidden,
                ),
                false,
                forbidden,
            );
        }

        assert.deepEqual(
            Object.keys(
                result,
            ),
            [
                "admissionPassed",
                "streamAdmission",
                "visionAdmission",
                "faceCount",
                "embeddingValid",
                "alignmentFailureCode",
                "alignmentFailureRmsBand",
                "multipleFacesOverlapBand",
                "secondaryFaceScoreBand",
                "cameraStartAttempted",
                "cameraStopAttempted",
                "calibrationSampleCaptured",
                "executionManifestCreated",
                "r7cDatasetCreated",
                "persistedArtifacts",
                "warnings",
                "blockers",
            ],
        );
    },
);

test(
    "falha no start ainda tenta stop em finally",
    async () => {
        const scenario =
            createScenario({
                startMode:
                    "ERROR",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.deepEqual(
            result.blockers,
            [
                REAL_CAMERA_ADMISSION_BLOCKER
                    .START_FAILED,
            ],
        );

        assert.equal(
            scenario.counts()
                .startCalls,
            1,
        );

        assert.equal(
            scenario.counts()
                .stopCalls,
            1,
        );
    },
);

test(
    "falha no stop derruba admission",
    async () => {
        const scenario =
            createScenario({
                stopMode:
                    "ERROR",
            });

        const result =
            await scenario.harness.run({
                areaClearConfirmation:
                    REAL_CAMERA_ADMISSION_CONFIRMATION,
            });

        assert.equal(
            result.admissionPassed,
            false,
        );

        assert.equal(
            result.blockers.includes(
                REAL_CAMERA_ADMISSION_BLOCKER
                    .STOP_FAILED,
            ),
            true,
        );
    },
);

test(
    "harness e one-shot e rejeita segunda execucao",
    async () => {
        const scenario =
            createScenario();

        await scenario.harness.run({
            areaClearConfirmation:
                REAL_CAMERA_ADMISSION_CONFIRMATION,
        });

        await assert.rejects(
            async () =>
                scenario.harness.run({
                    areaClearConfirmation:
                        REAL_CAMERA_ADMISSION_CONFIRMATION,
                }),
            /one-shot/,
        );
    },
);

// R9E lifecycle stop convergence regression
test(
    "R9E aguarda STOPPING convergir para STOPPED",
    async () => {
        const {
            waitForCameraSessionStopped,
        } =
            await import(
                "../src/identity/biometricRealCameraAdmission.mjs",
            );

        let snapshots =
            0;

        const session = {
            snapshot() {
                snapshots +=
                    1;

                if (
                    snapshots <
                    3
                ) {
                    return {
                        state:
                            "STOPPING",
                        running:
                            true,
                    };
                }

                return {
                    state:
                        "STOPPED",
                    running:
                        false,
                };
            },
        };

        const result =
            await waitForCameraSessionStopped({
                session,
                timeoutMs:
                    20,
                pollIntervalMs:
                    1,
                waitImpl:
                    async () => {},
            });

        assert.equal(
            result.state,
            "STOPPED",
        );

        assert.equal(
            result.running,
            false,
        );

        assert.equal(
            snapshots,
            3,
        );
    },
);

test(
    "R9E convergencia que excede timeout retorna STOP_FAILED",
    async () => {
        const {
            REAL_CAMERA_ADMISSION_BLOCKER,
            waitForCameraSessionStopped,
        } =
            await import(
                "../src/identity/biometricRealCameraAdmission.mjs",
            );

        const session = {
            snapshot() {
                return {
                    state:
                        "STOPPING",
                    running:
                        true,
                };
            },
        };

        await assert.rejects(
            () =>
                waitForCameraSessionStopped({
                    session,
                    timeoutMs:
                        2,
                    pollIntervalMs:
                        1,
                    waitImpl:
                        async () => {},
                }),
            (error) => {
                assert.equal(
                    error.code,
                    REAL_CAMERA_ADMISSION_BLOCKER.STOP_FAILED,
                );

                return true;
            },
        );
    },
);

test(
    "P28 consenso temporal cobre as 27 sequencias ZERO ONE MULTI",
    async () => {
        const modes =
            [
                "ZERO",
                "ONE",
                "MULTI",
            ];

        const totals =
            {
                NO_FACE_STABLE: 0,
                SINGLE_FACE_STABLE: 0,
                MULTIPLE_FACES_STABLE: 0,
                DETECTION_UNSTABLE: 0,
            };

        for (const first of modes) {
            for (const second of modes) {
                for (const third of modes) {
                    const sequence =
                        [
                            first,
                            second,
                            third,
                        ];

                    const zeroCount =
                        sequence.filter(
                            (value) =>
                                value ===
                                "ZERO",
                        ).length;

                    const oneCount =
                        sequence.filter(
                            (value) =>
                                value ===
                                "ONE",
                        ).length;

                    const multiCount =
                        sequence.filter(
                            (value) =>
                                value ===
                                "MULTI",
                        ).length;

                    const expected =
                        zeroCount >=
                            2
                            ? "NO_FACE_STABLE"
                            : oneCount >=
                                  2
                                ? "SINGLE_FACE_STABLE"
                                : multiCount >=
                                      2
                                    ? "MULTIPLE_FACES_STABLE"
                                    : "DETECTION_UNSTABLE";

                    totals[expected] +=
                        1;

                    const scenario =
                        createScenario({
                            faceModes:
                                sequence,
                        });

                    const result =
                        await scenario.harness.run({
                            areaClearConfirmation:
                                REAL_CAMERA_ADMISSION_CONFIRMATION,
                        });

                    const counts =
                        scenario.counts();

                    assert.equal(
                        counts.detectorCalls,
                        3,
                        `detectorCalls ${sequence.join("/")}`,
                    );

                    if (
                        expected ===
                        "NO_FACE_STABLE"
                    ) {
                        assert.equal(
                            result.faceCount,
                            0,
                        );

                        assert.deepEqual(
                            result.blockers,
                            [
                                REAL_CAMERA_ADMISSION_BLOCKER
                                    .NO_FACE,
                            ],
                        );

                        assert.equal(
                            counts.alignmentCalls,
                            0,
                        );

                        assert.equal(
                            counts.embeddingCalls,
                            0,
                        );
                    }
                    else if (
                        expected ===
                        "SINGLE_FACE_STABLE"
                    ) {
                        assert.equal(
                            result.faceCount,
                            1,
                        );

                        assert.deepEqual(
                            result.blockers,
                            [],
                        );

                        assert.equal(
                            result.admissionPassed,
                            true,
                        );

                        assert.equal(
                            counts.alignmentCalls,
                            1,
                        );

                        assert.equal(
                            counts.embeddingCalls,
                            1,
                        );
                    }
                    else if (
                        expected ===
                        "MULTIPLE_FACES_STABLE"
                    ) {
                        assert.ok(
                            result.faceCount >=
                                2,
                        );

                        assert.deepEqual(
                            result.blockers,
                            [
                                REAL_CAMERA_ADMISSION_BLOCKER
                                    .MULTIPLE_FACES,
                            ],
                        );

                        assert.equal(
                            counts.alignmentCalls,
                            0,
                        );

                        assert.equal(
                            counts.embeddingCalls,
                            0,
                        );
                    }
                    else {
                        assert.equal(
                            result.faceCount,
                            null,
                        );

                        assert.deepEqual(
                            result.blockers,
                            [
                                REAL_CAMERA_ADMISSION_BLOCKER
                                    .DETECTION_UNSTABLE,
                            ],
                        );

                        assert.equal(
                            counts.alignmentCalls,
                            0,
                        );

                        assert.equal(
                            counts.embeddingCalls,
                            0,
                        );
                    }
                }
            }
        }

        assert.deepEqual(
            totals,
            {
                NO_FACE_STABLE: 7,
                SINGLE_FACE_STABLE: 7,
                MULTIPLE_FACES_STABLE: 7,
                DETECTION_UNSTABLE: 6,
            },
        );
    },
);

test(
    "P28 contrato estatico preserva tres fresh frames sem early exit",
    async () => {
        const { readFileSync } =
            await import(
                "node:fs",
            );

        const source =
            readFileSync(
                new URL(
                    "../src/identity/biometricRealCameraAdmission.mjs",
                    import.meta.url,
                ),
                "utf8",
            );

        const start =
            source.indexOf(
                "const temporalCounts =",
            );

        const end =
            source.indexOf(
                "await alignFaceImpl({",
                start,
            );

        assert.ok(
            start >=
                0,
        );

        assert.ok(
            end >
                start,
        );

        const temporal =
            source.slice(
                start,
                end,
            );

        assert.match(
            temporal,
            /temporalSample\s*<\s*[\r\n\s]*3/,
        );

        assert.match(
            temporal,
            /temporalSample\s*\+=\s*[\r\n\s]*1/,
        );

        assert.doesNotMatch(
            temporal,
            /\bbreak\s*;/,
        );

        assert.match(
            temporal,
            /zeroBytes\(\s*frame,\s*\)/,
        );

        assert.match(
            temporal,
            /zeroBytes\(\s*currentFrame,\s*\)/,
        );

        assert.match(
            temporal,
            /frame\s*=\s*[\r\n\s]*currentFrame/,
        );

        assert.match(
            temporal,
            /currentFrame\s*=\s*[\r\n\s]*null/,
        );

        assert.match(
            temporal,
            /"DETECTION_UNSTABLE"/,
        );
    },
);
