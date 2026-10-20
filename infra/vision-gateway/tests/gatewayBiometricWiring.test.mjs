import test from "node:test";
import assert from "node:assert/strict";

import {
    readFile,
} from "node:fs/promises";

import {
    createGatewayRuntime,
} from "../src/index.mjs";

const CAMERA_ID =
    "gate-test-01";

const BROKER_TOKEN =
    "0123456789abcdef0123456789abcdef";

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

function createEnv({
    broker =
        true,
} = {}) {
    const env =
        {
            SAFESCAN_VISION_HOST:
                "127.0.0.1",

            SAFESCAN_VISION_PORT:
                "8787",

            SAFESCAN_FFMPEG_PATH:
                "ffmpeg",

            SAFESCAN_CAMERA_ID:
                CAMERA_ID,

            SAFESCAN_CAMERA_HOST:
                "camera.test.local",

            SAFESCAN_CAMERA_PORT:
                "554",

            SAFESCAN_CAMERA_PATH:
                "/onvif1",

            SAFESCAN_CAMERA_TRANSPORT:
                "udp",
        };

    if (broker) {
        env.SAFESCAN_BIOMETRIC_BROKER_URL =
            "https://broker.example.test";

        env.SAFESCAN_BIOMETRIC_BROKER_TOKEN =
            BROKER_TOKEN;

        env.SAFESCAN_BIOMETRIC_BROKER_TIMEOUT_MS =
            "1000";
    }

    return env;
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

function createBiometricRuntimeStub({
    shutdownError =
        null,

    shutdownDeferred =
        null,
} = {}) {
    let running =
        false;

    let startCount =
        0;

    let stopCount =
        0;

    let shutdownCount =
        0;

    return {
        start() {
            startCount +=
                1;

            if (running) {
                return false;
            }

            running =
                true;

            return true;
        },

        stop() {
            stopCount +=
                1;

            const wasRunning =
                running;

            running =
                false;

            return wasRunning;
        },

        async shutdown() {
            shutdownCount +=
                1;

            running =
                false;

            if (shutdownDeferred) {
                await shutdownDeferred.promise;
            }

            if (shutdownError) {
                throw shutdownError;
            }

            return true;
        },

        snapshot() {
            return {
                state:
                    running
                        ? "RUNNING"
                        : "STOPPED",

                running,
            };
        },

        stats() {
            return {
                running,
                startCount,
                stopCount,
                shutdownCount,
            };
        },
    };
}

function createStartOptions() {
    return {
        pollIntervalMs:
            25,

        alignmentPolicy:
            ALIGNMENT_POLICY,

        getIdentificationContext:
            createContext,

        yunetModelPath:
            "C:/synthetic/yunet.onnx",

        sfaceModelPath:
            "C:/synthetic/sface.onnx",

        setTimer:
            () => 1,

        clearTimer:
            () => {},
    };
}

test(
    "gateway e criado sem carregar runtime biometrico e index usa dynamic import",
    async () => {
        let factoryCalls =
            0;

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () => {
                        factoryCalls +=
                            1;

                        return createBiometricRuntimeStub();
                    },
            });

        assert.equal(
            factoryCalls,
            0,
        );

        assert.equal(
            runtime.rtspSessions.size,
            0,
        );

        const source =
            await readFile(
                new URL(
                    "../src/index.mjs",
                    import.meta.url,
                ),
                "utf8",
            );

        assert.equal(
            source.includes(
                'from "./identity/biometricProcessingRuntime.mjs"'
            ),
            false,
        );

        assert.equal(
            source.includes(
                '"./identity/biometricProcessingRuntime.mjs"'
            ),
            true,
        );

        assert.equal(
            source.includes(
                "await import("
            ),
            true,
        );
    },
);

test(
    "start biometrico sem broker falha antes de criar session ou factory",
    async () => {
        let factoryCalls =
            0;

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv({
                        broker:
                            false,
                    }),

                biometricRuntimeFactory:
                    async () => {
                        factoryCalls +=
                            1;

                        return createBiometricRuntimeStub();
                    },
            });

        await assert.rejects(
            () =>
                runtime.startBiometricProcessing(
                    CAMERA_ID,
                    createStartOptions(),
                ),
            (
                error,
            ) =>
                error?.code ===
                "BIOMETRIC_BROKER_NOT_CONFIGURED",
        );

        assert.equal(
            factoryCalls,
            0,
        );

        assert.equal(
            runtime.rtspSessions.size,
            0,
        );
    },
);

test(
    "start cria session RTSP parada e nao inicia FFmpeg ou camera",
    async () => {
        let factoryCalls =
            0;

        const biometricRuntime =
            createBiometricRuntimeStub();

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () => {
                        factoryCalls +=
                            1;

                        return biometricRuntime;
                    },
            });

        assert.equal(
            await runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            ),
            true,
        );

        const session =
            runtime.rtspSessions.get(
                CAMERA_ID,
            );

        assert.ok(
            session,
        );

        const rtsp =
            session.snapshot();

        assert.equal(
            rtsp.state,
            "STOPPED",
        );

        assert.equal(
            rtsp.running,
            false,
        );

        assert.equal(
            rtsp.firstFrameSeen,
            false,
        );

        assert.equal(
            factoryCalls,
            1,
        );

        assert.equal(
            biometricRuntime.stats().running,
            true,
        );
    },
);

test(
    "wiring encaminha session, broker e opcoes B2A sem substituir politica produtiva",
    async () => {
        let captured =
            null;

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async (
                        options,
                    ) => {
                        captured =
                            options;

                        return createBiometricRuntimeStub();
                    },
            });

        const productivePolicy =
            Object.freeze({
                marker:
                    "gateway-policy-reference",
            });

        const options =
            {
                ...createStartOptions(),
                productivePolicy,
            };

        await runtime.startBiometricProcessing(
            CAMERA_ID,
            options,
        );

        assert.ok(
            captured.session,
        );

        assert.equal(
            captured.session,
            runtime.rtspSessions.get(
                CAMERA_ID,
            ),
        );

        assert.equal(
            captured.pollIntervalMs,
            options.pollIntervalMs,
        );

        assert.equal(
            captured.alignmentPolicy,
            options.alignmentPolicy,
        );

        assert.equal(
            captured.getIdentificationContext,
            options.getIdentificationContext,
        );

        assert.equal(
            captured.yunetModelPath,
            options.yunetModelPath,
        );

        assert.equal(
            captured.sfaceModelPath,
            options.sfaceModelPath,
        );

        assert.equal(
            captured.setTimer,
            options.setTimer,
        );

        assert.equal(
            captured.clearTimer,
            options.clearTimer,
        );

        assert.equal(
            captured.productivePolicy,
            productivePolicy,
        );

        assert.equal(
            captured.brokerConfig.url,
            "https://broker.example.test",
        );

        assert.equal(
            captured.brokerConfig.token,
            BROKER_TOKEN,
        );

        assert.equal(
            captured.brokerConfig.timeoutMs,
            1000,
        );
    },
);

test(
    "wiring encaminha ausencia de productivePolicy como null",
    async () => {
        let captured =
            null;

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async (
                        options,
                    ) => {
                        captured =
                            options;

                        return createBiometricRuntimeStub();
                    },
            });

        await runtime.startBiometricProcessing(
            CAMERA_ID,
            createStartOptions(),
        );

        assert.equal(
            captured.productivePolicy,
            null,
        );
    },
);

test(
    "starts concorrentes compartilham a mesma Promise e executam start uma unica vez",
    async () => {
        const deferred =
            createDeferred();

        const biometricRuntime =
            createBiometricRuntimeStub();

        let factoryCalls =
            0;

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () => {
                        factoryCalls +=
                            1;

                        return deferred.promise;
                    },
            });

        const first =
            runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            );

        const second =
            runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            );

        assert.equal(
            first,
            second,
        );

        await Promise.resolve();
        await Promise.resolve();

        assert.equal(
            factoryCalls,
            1,
        );

        deferred.resolve(
            biometricRuntime,
        );

        const results =
            await Promise.all([
                first,
                second,
            ]);

        assert.deepEqual(
            results,
            [
                true,
                true,
            ],
        );

        assert.equal(
            factoryCalls,
            1,
        );

        assert.equal(
            biometricRuntime.stats().startCount,
            1,
        );

        assert.equal(
            runtime.rtspSessions.size,
            1,
        );
    },
);

test(
    "start repetido reutiliza runtime existente sem recriar modelos",
    async () => {
        let factoryCalls =
            0;

        const biometricRuntime =
            createBiometricRuntimeStub();

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () => {
                        factoryCalls +=
                            1;

                        return biometricRuntime;
                    },
            });

        const first =
            await runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            );

        const second =
            await runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            );

        assert.equal(
            first,
            true,
        );

        assert.equal(
            second,
            false,
        );

        assert.equal(
            factoryCalls,
            1,
        );

        assert.equal(
            biometricRuntime.stats().startCount,
            2,
        );
    },
);

test(
    "stop durante criacao aguarda runtime e deixa processamento parado sem parar RTSP",
    async () => {
        const deferred =
            createDeferred();

        const biometricRuntime =
            createBiometricRuntimeStub();

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () =>
                        deferred.promise,
            });

        const startPromise =
            runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            );

        await Promise.resolve();
        await Promise.resolve();

        const stopPromise =
            runtime.stopBiometricProcessing(
                CAMERA_ID,
            );

        deferred.resolve(
            biometricRuntime,
        );

        const [
            started,
            stopped,
        ] =
            await Promise.all([
                startPromise,
                stopPromise,
            ]);

        assert.equal(
            started,
            true,
        );

        assert.equal(
            stopped,
            true,
        );

        assert.equal(
            biometricRuntime.stats().running,
            false,
        );

        assert.equal(
            biometricRuntime.stats().stopCount,
            1,
        );

        const rtsp =
            runtime
                .rtspSessions
                .get(
                    CAMERA_ID,
                )
                .snapshot();

        assert.equal(
            rtsp.state,
            "STOPPED",
        );

        assert.equal(
            rtsp.running,
            false,
        );
    },
);

test(
    "shutdown durante criacao aguarda start e encerra o runtime ja iniciado",
    async () => {
        const deferred =
            createDeferred();

        const biometricRuntime =
            createBiometricRuntimeStub();

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () =>
                        deferred.promise,
            });

        const startPromise =
            runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            );

        await Promise.resolve();
        await Promise.resolve();

        const shutdownPromise =
            runtime.shutdownBiometricProcessing(
                CAMERA_ID,
            );

        assert.equal(
            biometricRuntime.stats().startCount,
            0,
        );

        assert.equal(
            biometricRuntime.stats().shutdownCount,
            0,
        );

        deferred.resolve(
            biometricRuntime,
        );

        const [
            started,
            shutdown,
        ] =
            await Promise.all([
                startPromise,
                shutdownPromise,
            ]);

        assert.equal(
            started,
            true,
        );

        assert.equal(
            shutdown,
            true,
        );

        assert.equal(
            biometricRuntime.stats().startCount,
            1,
        );

        assert.equal(
            biometricRuntime.stats().shutdownCount,
            1,
        );

        assert.equal(
            biometricRuntime.stats().running,
            false,
        );

        const rtsp =
            runtime
                .rtspSessions
                .get(
                    CAMERA_ID,
                )
                .snapshot();

        assert.equal(
            rtsp.state,
            "STOPPED",
        );

        assert.equal(
            rtsp.running,
            false,
        );
    },
);

test(
    "shutdown biometrico bem sucedido remove runtime e permite criacao nova",
    async () => {
        const runtimes =
            [
                createBiometricRuntimeStub(),
                createBiometricRuntimeStub(),
            ];

        let factoryCalls =
            0;

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () => {
                        const value =
                            runtimes[
                                factoryCalls
                            ];

                        factoryCalls +=
                            1;

                        return value;
                    },
            });

        await runtime.startBiometricProcessing(
            CAMERA_ID,
            createStartOptions(),
        );

        assert.equal(
            await runtime.shutdownBiometricProcessing(
                CAMERA_ID,
            ),
            true,
        );

        assert.equal(
            runtimes[0].stats().shutdownCount,
            1,
        );

        assert.equal(
            factoryCalls,
            1,
        );

        assert.equal(
            await runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            ),
            true,
        );

        assert.equal(
            factoryCalls,
            2,
        );

        assert.equal(
            runtimes[1].stats().startCount,
            1,
        );
    },
);

test(
    "shutdown com erro preserva runtime existente e nao cria substituto silencioso",
    async () => {
        const failure =
            new Error(
                "synthetic shutdown failure",
            );

        const biometricRuntime =
            createBiometricRuntimeStub({
                shutdownError:
                    failure,
            });

        let factoryCalls =
            0;

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () => {
                        factoryCalls +=
                            1;

                        return biometricRuntime;
                    },
            });

        await runtime.startBiometricProcessing(
            CAMERA_ID,
            createStartOptions(),
        );

        await assert.rejects(
            () =>
                runtime.shutdownBiometricProcessing(
                    CAMERA_ID,
                ),
            /synthetic shutdown failure/,
        );

        await assert.rejects(
            () =>
                runtime.shutdownBiometricProcessing(
                    CAMERA_ID,
                ),
            /synthetic shutdown failure/,
        );

        assert.equal(
            factoryCalls,
            1,
        );

        assert.equal(
            biometricRuntime.stats().shutdownCount,
            2,
        );
    },
);

test(
    "falha de criacao limpa promise fantasma e permite nova tentativa",
    async () => {
        let factoryCalls =
            0;

        const biometricRuntime =
            createBiometricRuntimeStub();

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () => {
                        factoryCalls +=
                            1;

                        if (factoryCalls === 1) {
                            throw new Error(
                                "synthetic creation failure",
                            );
                        }

                        return biometricRuntime;
                    },
            });

        await assert.rejects(
            () =>
                runtime.startBiometricProcessing(
                    CAMERA_ID,
                    createStartOptions(),
                ),
            /synthetic creation failure/,
        );

        assert.equal(
            factoryCalls,
            1,
        );

        assert.equal(
            await runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            ),
            true,
        );

        assert.equal(
            factoryCalls,
            2,
        );

        assert.equal(
            biometricRuntime.stats().startCount,
            1,
        );
    },
);

test(
    "health existente nao expoe broker token nem credenciais biometricas",
    async () => {
        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () =>
                        createBiometricRuntimeStub(),
            });

        await runtime.startBiometricProcessing(
            CAMERA_ID,
            createStartOptions(),
        );

        const serialized =
            JSON.stringify(
                runtime.getSnapshot(),
            );

        assert.equal(
            serialized.includes(
                BROKER_TOKEN,
            ),
            false,
        );

        assert.equal(
            serialized.toLowerCase().includes(
                "biometric"
            ),
            false,
        );

        assert.equal(
            serialized.includes(
                "broker.example.test"
            ),
            false,
        );
    },
);

test(
    "shutdown principal ordena biometria antes de camera e health server",
    async () => {
        const source =
            await readFile(
                new URL(
                    "../src/index.mjs",
                    import.meta.url,
                ),
                "utf8",
            );

        const biometricPosition =
            source.indexOf(
                "await runtime.shutdownBiometricProcessing("
            );

        const cameraPosition =
            source.indexOf(
                "runtime.stopCamera("
            );

        const healthPosition =
            source.indexOf(
                "await runtime.healthServer.stop();"
            );

        assert.ok(
            biometricPosition >= 0,
        );

        assert.ok(
            cameraPosition >
                biometricPosition,
        );

        assert.ok(
            healthPosition >
                cameraPosition,
        );
    },
);
