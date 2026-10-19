import test from "node:test";
import assert from "node:assert/strict";

import {
    createBiometricProcessingRuntime,
} from "../src/identity/biometricProcessingRuntime.mjs";

const BROKER_CONFIG =
    Object.freeze({
        url:
            "https://broker.example.test",

        token:
            "0123456789abcdef0123456789abcdef",

        timeoutMs:
            1000,
    });

const ALIGNMENT_POLICY =
    Object.freeze({
        paddingRatio:
            0.2,

        minFaceSizePx:
            40,

        minVisibleAreaRatio:
            0.7,

        maxRmsError:
            8,
    });

function createContext() {
    return {
        tenantId:
            "11111111-1111-4111-8111-111111111111",

        empresaId:
            "22222222-2222-4222-8222-222222222222",

        profileId:
            "sface-test-profile",

        requestId:
            "33333333-3333-4333-8333-333333333333",
    };
}

function createDeferred() {
    let resolve;
    let reject;

    const promise =
        new Promise(
            (
                resolvePromise,
                rejectPromise,
            ) => {
                resolve =
                    resolvePromise;

                reject =
                    rejectPromise;
            },
        );

    return {
        promise,
        resolve,
        reject,
    };
}

function createHarness({
    failAt =
        null,

    customLoop =
        null,

    customLoopSnapshot =
        null,
} = {}) {
    const events =
        [];

    let yunetReleaseCount =
        0;

    let sfaceReleaseCount =
        0;

    let sessionStartCount =
        0;

    let sessionStopCount =
        0;

    let orchestratorArgs =
        null;

    let loopArgs =
        null;

    let yunetOptions =
        null;

    let sfaceOptions =
        null;

    const session =
        {
            takeLatestFrame() {
                return null;
            },

            snapshot() {
                return {
                    frames: {
                        width:
                            1920,

                        height:
                            1080,
                    },
                };
            },

            start() {
                sessionStartCount +=
                    1;

                events.push(
                    "session.start",
                );
            },

            stop() {
                sessionStopCount +=
                    1;

                events.push(
                    "session.stop",
                );
            },
        };

    const detector =
        {
            async detectBgr() {
                return [];
            },

            async release() {
                yunetReleaseCount +=
                    1;

                events.push(
                    "yunet.release",
                );

                return true;
            },
        };

    const extractor =
        {
            async extractBgr112() {
                return new Float32Array(
                    128,
                );
            },

            async release() {
                sfaceReleaseCount +=
                    1;

                events.push(
                    "sface.release",
                );

                return true;
            },
        };

    const brokerClient =
        {
            async identify() {
                return {
                    status:
                        "NO_REFERENCE",
                };
            },
        };

    const identificationPipeline =
        {
            async identifySface() {
                return {
                    status:
                        "NO_REFERENCE",
                };
            },
        };

    const orchestrator =
        {
            async processFrame() {
                return {
                    status:
                        "NO_REFERENCE",
                };
            },
        };

    let loopRunning =
        false;

    const defaultLoop =
        {
            start() {
                events.push(
                    "loop.start",
                );

                if (loopRunning) {
                    return false;
                }

                loopRunning =
                    true;

                return true;
            },

            stop() {
                events.push(
                    "loop.stop",
                );

                const wasRunning =
                    loopRunning;

                loopRunning =
                    false;

                return wasRunning;
            },

            async whenIdle() {
                events.push(
                    "loop.whenIdle",
                );
            },

            snapshot() {
                if (customLoopSnapshot) {
                    return customLoopSnapshot();
                }

                return {
                    state:
                        loopRunning
                            ? "WAITING_FRAME"
                            : "STOPPED",

                    running:
                        loopRunning,

                    processing:
                        false,

                    scheduled:
                        loopRunning,

                    pollIntervalMs:
                        25,

                    processedFrames:
                        0,

                    emptyPolls:
                        0,

                    errorCount:
                        0,

                    lastResult:
                        null,

                    lastErrorCode:
                        null,
                };
            },
        };

    const loop =
        customLoop ??
        defaultLoop;

    const alignFace =
        () => ({
            data:
                new Uint8Array(
                    112 *
                    112 *
                    3
                ),

            width:
                112,

            height:
                112,
        });

    const factories =
        {
            createBiometricBrokerClient(
                options,
            ) {
                events.push(
                    "broker.create",
                );

                if (
                    failAt ===
                    "broker"
                ) {
                    throw new Error(
                        "broker failure",
                    );
                }

                assert.equal(
                    options.url,
                    BROKER_CONFIG.url,
                );

                assert.equal(
                    options.token,
                    BROKER_CONFIG.token,
                );

                return brokerClient;
            },

            createBiometricIdentificationPipeline(
                options,
            ) {
                events.push(
                    "pipeline.create",
                );

                if (
                    failAt ===
                    "pipeline"
                ) {
                    throw new Error(
                        "pipeline failure",
                    );
                }

                assert.equal(
                    options.brokerClient,
                    brokerClient,
                );

                return identificationPipeline;
            },

            async createYunetDetector(
                options,
            ) {
                events.push(
                    "yunet.create",
                );

                yunetOptions =
                    options;

                if (
                    failAt ===
                    "yunet"
                ) {
                    throw new Error(
                        "yunet failure",
                    );
                }

                return detector;
            },

            async createSfaceEmbeddingExtractor(
                options,
            ) {
                events.push(
                    "sface.create",
                );

                sfaceOptions =
                    options;

                if (
                    failAt ===
                    "sface"
                ) {
                    throw new Error(
                        "sface failure",
                    );
                }

                return extractor;
            },

            createBiometricFrameOrchestrator(
                options,
            ) {
                events.push(
                    "orchestrator.create",
                );

                orchestratorArgs =
                    options;

                if (
                    failAt ===
                    "orchestrator"
                ) {
                    throw new Error(
                        "orchestrator failure",
                    );
                }

                return orchestrator;
            },

            createBiometricFrameProcessingLoop(
                options,
            ) {
                events.push(
                    "loop.create",
                );

                loopArgs =
                    options;

                if (
                    failAt ===
                    "loop"
                ) {
                    throw new Error(
                        "loop failure",
                    );
                }

                return loop;
            },

            alignFace,
        };

    return {
        events,
        session,
        detector,
        extractor,
        brokerClient,
        identificationPipeline,
        orchestrator,
        loop,
        factories,

        stats() {
            return {
                yunetReleaseCount,
                sfaceReleaseCount,
                sessionStartCount,
                sessionStopCount,
                orchestratorArgs,
                loopArgs,
                yunetOptions,
                sfaceOptions,
            };
        },
    };
}

function createRuntime(
    harness,
    overrides =
        {},
) {
    return createBiometricProcessingRuntime({
        session:
            harness.session,

        brokerConfig:
            BROKER_CONFIG,

        pollIntervalMs:
            25,

        alignmentPolicy:
            ALIGNMENT_POLICY,

        getIdentificationContext:
            createContext,

        setTimer:
            () => 1,

        clearTimer:
            () => {},

        factories:
            harness.factories,

        ...overrides,
    });
}

test(
    "construcao conecta broker, pipeline, YuNet, SFace, orchestrator e loop na ordem correta",
    async () => {
        const harness =
            createHarness();

        const runtime =
            await createRuntime(
                harness,
            );

        assert.deepEqual(
            harness.events,
            [
                "broker.create",
                "pipeline.create",
                "yunet.create",
                "sface.create",
                "orchestrator.create",
                "loop.create",
            ],
        );

        const stats =
            harness.stats();

        assert.equal(
            stats.orchestratorArgs.detector,
            harness.detector,
        );

        assert.equal(
            stats.orchestratorArgs.embeddingExtractor,
            harness.extractor,
        );

        assert.equal(
            stats.orchestratorArgs.identificationPipeline,
            harness.identificationPipeline,
        );

        assert.equal(
            stats.orchestratorArgs.alignFace,
            harness.factories.alignFace,
        );

        assert.deepEqual(
            stats.orchestratorArgs.alignmentPolicy,
            ALIGNMENT_POLICY,
        );

        assert.equal(
            stats.loopArgs.session,
            harness.session,
        );

        assert.equal(
            stats.loopArgs.orchestrator,
            harness.orchestrator,
        );

        assert.equal(
            stats.loopArgs.pollIntervalMs,
            25,
        );

        assert.equal(
            stats.loopArgs.getIdentificationContext,
            createContext,
        );

        const yunetPath =
            stats.yunetOptions
                .modelPath
                .replaceAll(
                    "\\",
                    "/",
                );

        const sfacePath =
            stats.sfaceOptions
                .modelPath
                .replaceAll(
                    "\\",
                    "/",
                );

        assert.ok(
            yunetPath.endsWith(
                "/models/face_detection_yunet_2026may.onnx",
            ),
        );

        assert.ok(
            sfacePath.endsWith(
                "/models/face_recognition_sface_2021dec.onnx",
            ),
        );

        const snapshot =
            runtime.snapshot();

        assert.equal(
            snapshot.state,
            "READY",
        );

        assert.equal(
            snapshot.running,
            false,
        );

        assert.equal(
            snapshot.released,
            false,
        );
    },
);

test(
    "configuracao invalida falha antes de qualquer factory ou modelo",
    async () => {
        const harness =
            createHarness();

        await assert.rejects(
            () =>
                createRuntime(
                    harness,
                    {
                        alignmentPolicy: {
                            paddingRatio:
                                0.2,

                            minFaceSizePx:
                                40,

                            minVisibleAreaRatio:
                                0.7,
                        },
                    },
                ),
            /maxRmsError/,
        );

        assert.deepEqual(
            harness.events,
            [],
        );
    },
);

test(
    "falha ao criar YuNet nao tenta criar SFace",
    async () => {
        const harness =
            createHarness({
                failAt:
                    "yunet",
            });

        await assert.rejects(
            () =>
                createRuntime(
                    harness,
                ),
            /yunet failure/,
        );

        assert.deepEqual(
            harness.events,
            [
                "broker.create",
                "pipeline.create",
                "yunet.create",
            ],
        );

        assert.equal(
            harness.stats().sfaceReleaseCount,
            0,
        );

        assert.equal(
            harness.stats().yunetReleaseCount,
            0,
        );
    },
);

test(
    "falha ao criar SFace libera YuNet ja carregado",
    async () => {
        const harness =
            createHarness({
                failAt:
                    "sface",
            });

        await assert.rejects(
            () =>
                createRuntime(
                    harness,
                ),
            /sface failure/,
        );

        assert.deepEqual(
            harness.events,
            [
                "broker.create",
                "pipeline.create",
                "yunet.create",
                "sface.create",
                "yunet.release",
            ],
        );

        assert.equal(
            harness.stats().yunetReleaseCount,
            1,
        );
    },
);

test(
    "falha depois dos dois modelos faz rollback SFace antes de YuNet",
    async () => {
        const harness =
            createHarness({
                failAt:
                    "loop",
            });

        await assert.rejects(
            () =>
                createRuntime(
                    harness,
                ),
            /loop failure/,
        );

        assert.deepEqual(
            harness.events.slice(
                -2,
            ),
            [
                "sface.release",
                "yunet.release",
            ],
        );

        assert.equal(
            harness.stats().sfaceReleaseCount,
            1,
        );

        assert.equal(
            harness.stats().yunetReleaseCount,
            1,
        );
    },
);

test(
    "start inicia somente o frame loop e nunca inicia a session RTSP",
    async () => {
        const harness =
            createHarness();

        const runtime =
            await createRuntime(
                harness,
            );

        assert.equal(
            runtime.start(),
            true,
        );

        const stats =
            harness.stats();

        assert.equal(
            stats.sessionStartCount,
            0,
        );

        assert.equal(
            stats.sessionStopCount,
            0,
        );

        assert.equal(
            runtime.snapshot().state,
            "RUNNING",
        );

        assert.equal(
            harness.events.includes(
                "loop.start",
            ),
            true,
        );

        assert.equal(
            harness.events.includes(
                "session.start",
            ),
            false,
        );
    },
);

test(
    "stop interrompe apenas o loop sem liberar modelos ou parar RTSP",
    async () => {
        const harness =
            createHarness();

        const runtime =
            await createRuntime(
                harness,
            );

        runtime.start();

        assert.equal(
            runtime.stop(),
            true,
        );

        const stats =
            harness.stats();

        assert.equal(
            stats.sfaceReleaseCount,
            0,
        );

        assert.equal(
            stats.yunetReleaseCount,
            0,
        );

        assert.equal(
            stats.sessionStopCount,
            0,
        );

        assert.equal(
            runtime.snapshot().state,
            "STOPPED",
        );
    },
);

test(
    "shutdown aguarda whenIdle antes de liberar SFace e depois YuNet",
    async () => {
        const deferred =
            createDeferred();

        const events =
            [];

        let running =
            true;

        const customLoop =
            {
                start() {
                    events.push(
                        "loop.start",
                    );

                    return false;
                },

                stop() {
                    events.push(
                        "loop.stop",
                    );

                    running =
                        false;

                    return true;
                },

                async whenIdle() {
                    events.push(
                        "loop.whenIdle",
                    );

                    await deferred.promise;

                    events.push(
                        "loop.idle",
                    );
                },

                snapshot() {
                    return {
                        state:
                            running
                                ? "PROCESSING"
                                : "STOPPED",

                        running,

                        processing:
                            true,

                        scheduled:
                            false,

                        pollIntervalMs:
                            25,

                        processedFrames:
                            0,

                        emptyPolls:
                            0,

                        errorCount:
                            0,

                        lastResult:
                            null,

                        lastErrorCode:
                            null,
                    };
                },
            };

        const harness =
            createHarness({
                customLoop,
            });

        harness.factories.createSfaceEmbeddingExtractor =
            async () => ({
                async extractBgr112() {
                    return new Float32Array(
                        128,
                    );
                },

                async release() {
                    events.push(
                        "sface.release",
                    );

                    return true;
                },
            });

        harness.factories.createYunetDetector =
            async () => ({
                async detectBgr() {
                    return [];
                },

                async release() {
                    events.push(
                        "yunet.release",
                    );

                    return true;
                },
            });

        const runtime =
            await createRuntime(
                harness,
            );

        const shutdownPromise =
            runtime.shutdown();

        await Promise.resolve();
        await Promise.resolve();

        assert.deepEqual(
            events,
            [
                "loop.stop",
                "loop.whenIdle",
            ],
        );

        deferred.resolve();

        await shutdownPromise;

        assert.deepEqual(
            events,
            [
                "loop.stop",
                "loop.whenIdle",
                "loop.idle",
                "sface.release",
                "yunet.release",
            ],
        );

        assert.equal(
            runtime.snapshot().state,
            "SHUTDOWN",
        );

        assert.equal(
            runtime.snapshot().released,
            true,
        );
    },
);

test(
    "shutdown e idempotente e start depois de shutdown e bloqueado",
    async () => {
        const harness =
            createHarness();

        const runtime =
            await createRuntime(
                harness,
            );

        await runtime.shutdown();
        await runtime.shutdown();

        const stats =
            harness.stats();

        assert.equal(
            stats.sfaceReleaseCount,
            1,
        );

        assert.equal(
            stats.yunetReleaseCount,
            1,
        );

        assert.throws(
            () =>
                runtime.start(),
            (
                error,
            ) =>
                error?.code ===
                "BIOMETRIC_RUNTIME_SHUTDOWN",
        );

        assert.equal(
            runtime.stop(),
            false,
        );
    },
);

test(
    "snapshot usa allowlist operacional e nao expoe token, credenciais, frame, imagem ou embedding",
    async () => {
        const secret =
            "NAO-PODE-VAZAR";

        const harness =
            createHarness({
                customLoopSnapshot() {
                    return {
                        state:
                            "WAITING_FRAME",

                        running:
                            true,

                        processing:
                            false,

                        scheduled:
                            true,

                        pollIntervalMs:
                            25,

                        processedFrames:
                            7,

                        emptyPolls:
                            2,

                        errorCount:
                            1,

                        lastErrorCode:
                            "BROKER_TIMEOUT",

                        token:
                            secret,

                        credentials:
                            secret,

                        frame:
                            new Uint8Array(
                                6,
                            ),

                        image:
                            secret,

                        embedding:
                            new Float32Array(
                                128,
                            ),

                        lastResult: {
                            status:
                                "BIOMETRIC_RANKING_AVAILABLE",

                            token:
                                secret,

                            frame:
                                new Uint8Array(
                                    6,
                                ),

                            embedding:
                                new Float32Array(
                                    128,
                                ),

                            nested: {
                                credentials:
                                    secret,

                                safe:
                                    "ok",
                            },
                        },
                    };
                },
            });

        const runtime =
            await createRuntime(
                harness,
            );

        const snapshot =
            runtime.snapshot();

        const serialized =
            JSON.stringify(
                snapshot,
            );

        assert.equal(
            serialized.includes(
                secret,
            ),
            false,
        );

        assert.equal(
            serialized.toLowerCase().includes(
                '"token"',
            ),
            false,
        );

        assert.equal(
            serialized.toLowerCase().includes(
                '"credentials"',
            ),
            false,
        );

        assert.equal(
            serialized.toLowerCase().includes(
                '"embedding"',
            ),
            false,
        );

        assert.equal(
            serialized.toLowerCase().includes(
                '"frame"',
            ),
            false,
        );

        assert.equal(
            serialized.toLowerCase().includes(
                '"image"',
            ),
            false,
        );

        assert.equal(
            snapshot.frameLoop.processedFrames,
            7,
        );

        assert.equal(
            snapshot.frameLoop.lastResult.nested.safe,
            "ok",
        );
    },
);
