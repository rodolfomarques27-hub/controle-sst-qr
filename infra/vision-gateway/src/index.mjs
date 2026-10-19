import {
    pathToFileURL,
} from "node:url";

import {
    CameraRegistry,
} from "./cameras/cameraRegistry.mjs";

import {
    loadVisionConfig,
    toPublicVisionConfig,
} from "./config/visionConfig.mjs";

import {
    createFfmpegProcess,
} from "./ffmpeg/ffmpegProcess.mjs";

import {
    CameraHealthTracker,
} from "./health/cameraHealth.mjs";

import {
    createHealthServer,
} from "./http/healthServer.mjs";

import {
    createStructuredLogger,
} from "./logging/structuredLogger.mjs";

import {
    createRtspSession,
} from "./rtsp/rtspSession.mjs";

function requireCameraId(
    cameraId,
) {
    if (
        typeof cameraId !== "string" ||
        !cameraId.trim()
    ) {
        throw new TypeError(
            "cameraId e obrigatorio.",
        );
    }

    return cameraId.trim();
}

async function createDefaultBiometricRuntime(
    options,
) {
    const module =
        await import(
            "./identity/biometricProcessingRuntime.mjs"
        );

    if (
        typeof module
            .createBiometricProcessingRuntime !==
        "function"
    ) {
        throw new Error(
            "biometricProcessingRuntime nao expoe factory esperada.",
        );
    }

    return module
        .createBiometricProcessingRuntime(
            options,
        );
}

function requireBiometricRuntimeFactory(
    value,
) {
    if (typeof value !== "function") {
        throw new TypeError(
            "biometricRuntimeFactory deve ser funcao.",
        );
    }

    return value;
}

function requireBiometricStartOptions(
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
            "options biometricas devem ser objeto.",
        );
    }

    return value;
}

function requireBiometricRuntime(
    runtime,
) {
    if (
        !runtime ||
        typeof runtime !== "object"
    ) {
        throw new TypeError(
            "factory biometrica deve retornar runtime.",
        );
    }

    for (
        const method of
        [
            "start",
            "stop",
            "shutdown",
            "snapshot",
        ]
    ) {
        if (
            typeof runtime[
                method
            ] !== "function"
        ) {
            throw new TypeError(
                `runtime biometrico sem ${method}().`,
            );
        }
    }

    return runtime;
}

function brokerNotConfiguredError() {
    const error =
        new Error(
            "broker biometrico nao configurado.",
        );

    error.code =
        "BIOMETRIC_BROKER_NOT_CONFIGURED";

    return error;
}

export function createGatewayRuntime({
    env = process.env,
    logSink,
    rtspOptions = {},
    biometricRuntimeFactory =
        createDefaultBiometricRuntime,
} = {}) {
    if (
        !rtspOptions ||
        typeof rtspOptions !== "object"
    ) {
        throw new TypeError(
            "rtspOptions deve ser um objeto.",
        );
    }

    const normalizedBiometricRuntimeFactory =
        requireBiometricRuntimeFactory(
            biometricRuntimeFactory,
        );

    // Explicit opt-in only; invalid values fail closed.
    const inputMode =
        env?.SAFESCAN_VISION_RTSP_INPUT_MODE ??
        "direct";

    if (
        inputMode !== "direct" &&
        inputMode !== "go2rtc_local"
    ) {
        throw new Error(
            "SAFESCAN_VISION_RTSP_INPUT_MODE invalido.",
        );
    }

    const config =
        loadVisionConfig({
            env,
        });

    const logger =
        createStructuredLogger({
            sink:
                logSink,
        });

    const registry =
        new CameraRegistry();

    const healthByCamera =
        new Map();

    const configuredCameraById =
        new Map();

    const rtspSessions =
        new Map();

    const biometricRuntimeByCamera =
        new Map();

    const biometricRuntimeCreationByCamera =
        new Map();

    const biometricRuntimeStartByCamera =
        new Map();

    const biometricRuntimeShutdownByCamera =
        new Map();

    if (config.camera) {
        registry.register({
            id:
                config.camera.id,
            endpoint:
                config.camera.endpoint,
        });

        healthByCamera.set(
            config.camera.id,
            new CameraHealthTracker({
                cameraId:
                    config.camera.id,
            }),
        );

        configuredCameraById.set(
            config.camera.id,
            config.camera,
        );
    }

    const ffmpeg =
        createFfmpegProcess({
            ffmpegPath:
                config.ffmpeg.path,
            logger,
        });

    function getConfiguredCamera(
        cameraId,
    ) {
        const normalizedCameraId =
            requireCameraId(
                cameraId,
            );

        const camera =
            registry.get(
                normalizedCameraId,
            );

        if (!camera) {
            throw new Error(
                `Camera nao registrada: ${normalizedCameraId}`,
            );
        }

        const configuredCamera =
            configuredCameraById.get(
                normalizedCameraId,
            );

        if (!configuredCamera) {
            throw new Error(
                `Camera sem configuracao RTSP: ${normalizedCameraId}`,
            );
        }

        const health =
            healthByCamera.get(
                normalizedCameraId,
            );

        if (!health) {
            throw new Error(
                `Camera sem health tracker: ${normalizedCameraId}`,
            );
        }

        return {
            camera,
            credentials:
                configuredCamera.credentials,
            health,
        };
    }

    function getOrCreateRtspSession(
        cameraId,
    ) {
        const normalizedCameraId =
            requireCameraId(
                cameraId,
            );

        const existing =
            rtspSessions.get(
                normalizedCameraId,
            );

        if (existing) {
            return existing;
        }

        const {
            camera,
            credentials,
            health,
        } =
            getConfiguredCamera(
                normalizedCameraId,
            );

        const useLocalRelay =
            inputMode === "go2rtc_local";

        // Never pass camera secrets or the direct endpoint to FFmpeg in relay mode.
        const sessionCamera =
            useLocalRelay
                ? {
                    id: camera.id,
                    endpoint: {
                        host: "127.0.0.1",
                        port: 8554,
                        path: "/sala_teste",
                        transport: "tcp",
                    },
                }
                : camera;

        const session =
            createRtspSession({
                camera: sessionCamera,
                credentials:
                    useLocalRelay ? {} : credentials,
                ffmpeg,
                health,
                logger,
                reconnectPolicy:
                    rtspOptions.reconnectPolicy,
                setTimer:
                    rtspOptions.setTimer,
                clearTimer:
                    rtspOptions.clearTimer,
                ingestMode:
                    useLocalRelay
                        ? "ffmpeg-rtsp"
                        : rtspOptions.ingestMode,
                interleavedClientFactory:
                    rtspOptions.interleavedClientFactory,
                stableFrameThreshold:
                    rtspOptions.stableFrameThreshold,
            });

        rtspSessions.set(
            normalizedCameraId,
            session,
        );

        return session;
    }

    function startCamera(
        cameraId =
            config.camera?.id,
    ) {
        const normalizedCameraId =
            requireCameraId(
                cameraId,
            );

        return getOrCreateRtspSession(
            normalizedCameraId,
        ).start();
    }

    function stopCamera(
        cameraId =
            config.camera?.id,
    ) {
        const normalizedCameraId =
            requireCameraId(
                cameraId,
            );

        const session =
            rtspSessions.get(
                normalizedCameraId,
            );

        if (!session) {
            return false;
        }

        return session.stop();
    }

    async function getOrCreateBiometricRuntime(
        cameraId,
        options,
    ) {
        const normalizedCameraId =
            requireCameraId(
                cameraId,
            );

        const existing =
            biometricRuntimeByCamera.get(
                normalizedCameraId,
            );

        if (existing) {
            return existing;
        }

        const creating =
            biometricRuntimeCreationByCamera.get(
                normalizedCameraId,
            );

        if (creating) {
            return creating;
        }

        if (!config.broker) {
            throw brokerNotConfiguredError();
        }

        const normalizedOptions =
            requireBiometricStartOptions(
                options,
            );

        const session =
            getOrCreateRtspSession(
                normalizedCameraId,
            );

        let creationPromise;

        creationPromise =
            (
                async () => {
                    const runtime =
                        requireBiometricRuntime(
                            await normalizedBiometricRuntimeFactory({
                                session,
                                brokerConfig:
                                    config.broker,
                                productivePolicy:
                                    normalizedOptions.productivePolicy ??
                                        null,
                                pollIntervalMs:
                                    normalizedOptions.pollIntervalMs,
                                alignmentPolicy:
                                    normalizedOptions.alignmentPolicy,
                                getIdentificationContext:
                                    normalizedOptions.getIdentificationContext,
                                yunetModelPath:
                                    normalizedOptions.yunetModelPath,
                                sfaceModelPath:
                                    normalizedOptions.sfaceModelPath,
                                setTimer:
                                    normalizedOptions.setTimer,
                                clearTimer:
                                    normalizedOptions.clearTimer,
                            }),
                        );

                    biometricRuntimeByCamera.set(
                        normalizedCameraId,
                        runtime,
                    );

                    return runtime;
                }
            )()
                .finally(
                    () => {
                        if (
                            biometricRuntimeCreationByCamera.get(
                                normalizedCameraId,
                            ) ===
                            creationPromise
                        ) {
                            biometricRuntimeCreationByCamera.delete(
                                normalizedCameraId,
                            );
                        }
                    },
                );

        biometricRuntimeCreationByCamera.set(
            normalizedCameraId,
            creationPromise,
        );

        return creationPromise;
    }

    function startBiometricProcessing(
        cameraId =
            config.camera?.id,
        options = {},
    ) {
        const normalizedCameraId =
            requireCameraId(
                cameraId,
            );

        const existingStart =
            biometricRuntimeStartByCamera.get(
                normalizedCameraId,
            );

        if (existingStart) {
            return existingStart;
        }

        let startPromise;

        startPromise =
            (
                async () => {
                    const shuttingDown =
                        biometricRuntimeShutdownByCamera.get(
                            normalizedCameraId,
                        );

                    if (shuttingDown) {
                        await shuttingDown;
                    }

                    const runtime =
                        await getOrCreateBiometricRuntime(
                            normalizedCameraId,
                            options,
                        );

                    return runtime.start();
                }
            )()
                .finally(
                    () => {
                        if (
                            biometricRuntimeStartByCamera.get(
                                normalizedCameraId,
                            ) ===
                            startPromise
                        ) {
                            biometricRuntimeStartByCamera.delete(
                                normalizedCameraId,
                            );
                        }
                    },
                );

        biometricRuntimeStartByCamera.set(
            normalizedCameraId,
            startPromise,
        );

        return startPromise;
    }

    async function stopBiometricProcessing(
        cameraId =
            config.camera?.id,
    ) {
        const normalizedCameraId =
            requireCameraId(
                cameraId,
            );

        const shuttingDown =
            biometricRuntimeShutdownByCamera.get(
                normalizedCameraId,
            );

        if (shuttingDown) {
            await shuttingDown;

            return false;
        }

        const starting =
            biometricRuntimeStartByCamera.get(
                normalizedCameraId,
            );

        if (starting) {
            try {
                await starting;
            }
            catch {
                /*
                 * O start ja entrega seu proprio erro ao chamador.
                 * Aqui seguimos para limpar qualquer runtime criado.
                 */
            }
        }

        const runtime =
            biometricRuntimeByCamera.get(
                normalizedCameraId,
            );

        if (!runtime) {
            return false;
        }

        return runtime.stop();
    }

    function shutdownBiometricProcessing(
        cameraId =
            config.camera?.id,
    ) {
        const normalizedCameraId =
            requireCameraId(
                cameraId,
            );

        const existingShutdown =
            biometricRuntimeShutdownByCamera.get(
                normalizedCameraId,
            );

        if (existingShutdown) {
            return existingShutdown;
        }

        const starting =
            biometricRuntimeStartByCamera.get(
                normalizedCameraId,
            );

        const existingRuntime =
            biometricRuntimeByCamera.get(
                normalizedCameraId,
            );

        const creating =
            biometricRuntimeCreationByCamera.get(
                normalizedCameraId,
            );

        if (
            !starting &&
            !existingRuntime &&
            !creating
        ) {
            return Promise.resolve(
                false,
            );
        }

        let shutdownPromise;

        shutdownPromise =
            (
                async () => {
                    if (starting) {
                        try {
                            await starting;
                        }
                        catch {
                            /*
                             * Mesmo quando start falha, pode existir
                             * runtime construido que precise de shutdown.
                             */
                        }
                    }

                    const runtime =
                        biometricRuntimeByCamera.get(
                            normalizedCameraId,
                        ) ??
                        (
                            creating
                                ? await creating
                                : null
                        );

                    if (!runtime) {
                        return false;
                    }

                    const result =
                        await runtime.shutdown();

                    if (
                        biometricRuntimeByCamera.get(
                            normalizedCameraId,
                        ) ===
                        runtime
                    ) {
                        biometricRuntimeByCamera.delete(
                            normalizedCameraId,
                        );
                    }

                    return result;
                }
            )()
                .finally(
                    () => {
                        if (
                            biometricRuntimeShutdownByCamera.get(
                                normalizedCameraId,
                            ) ===
                            shutdownPromise
                        ) {
                            biometricRuntimeShutdownByCamera.delete(
                                normalizedCameraId,
                            );
                        }
                    },
                );

        biometricRuntimeShutdownByCamera.set(
            normalizedCameraId,
            shutdownPromise,
        );

        return shutdownPromise;
    }

    function getBiometricProcessingSnapshot(
        cameraId =
            config.camera?.id,
    ) {
        const normalizedCameraId =
            requireCameraId(
                cameraId,
            );

        if (
            !registry.get(
                normalizedCameraId,
            )
        ) {
            return null;
        }

        const shuttingDown =
            biometricRuntimeShutdownByCamera.has(
                normalizedCameraId,
            );

        const starting =
            biometricRuntimeStartByCamera.has(
                normalizedCameraId,
            ) ||
            biometricRuntimeCreationByCamera.has(
                normalizedCameraId,
            );

        const runtime =
            biometricRuntimeByCamera.get(
                normalizedCameraId,
            ) ?? null;

        const runtimeSnapshot =
            runtime
                ? runtime.snapshot()
                : null;

        const frameLoop =
            (
                runtimeSnapshot?.frameLoop &&
                typeof runtimeSnapshot.frameLoop === "object"
            )
                ? runtimeSnapshot.frameLoop
                : {};

        let state;

        if (shuttingDown) {
            state =
                "SHUTTING_DOWN";
        }
        else if (starting) {
            state =
                "STARTING";
        }
        else if (!runtime) {
            state =
                "NOT_INITIALIZED";
        }
        else if (
            runtimeSnapshot?.state === "READY" ||
            runtimeSnapshot?.state === "RUNNING" ||
            runtimeSnapshot?.state === "STOPPED"
        ) {
            state =
                runtimeSnapshot.state;
        }
        else {
            state =
                runtimeSnapshot?.running === true
                    ? "RUNNING"
                    : "STOPPED";
        }

        return {
            cameraId:
                normalizedCameraId,

            state,

            running:
                runtimeSnapshot?.running === true,

            processing:
                frameLoop.processing === true,

            processedFrames:
                frameLoop.processedFrames ??
                0,

            emptyPolls:
                frameLoop.emptyPolls ??
                0,

            errorCount:
                frameLoop.errorCount ??
                0,

            lastErrorCode:
                frameLoop.lastErrorCode ??
                null,

            lastResult:
                frameLoop.lastResult ??
                null,
        };
    }

    const getSnapshot =
        () => ({
            service:
                "safescan-vision-gateway",
            status:
                "ok",
            cameras:
                registry.list().map(
                    (
                        camera,
                    ) => ({
                        cameraId:
                            camera.id,
                        endpoint:
                            camera.endpoint,
                        health:
                            healthByCamera
                                .get(
                                    camera.id,
                                )
                                ?.snapshot() ?? null,
                        rtsp:
                            rtspSessions
                                .get(
                                    camera.id,
                                )
                                ?.snapshot() ?? null,
                    }),
                ),
        });

    const healthServer =
        createHealthServer({
            host:
                config.service.host,
            port:
                config.service.port,
            getSnapshot,
            getBiometricSnapshot:
                getBiometricProcessingSnapshot,
            logger,
        });

    return Object.freeze({
        config,
        publicConfig:
            toPublicVisionConfig(
                config,
            ),
        logger,
        registry,
        healthByCamera,
        rtspSessions,
        ffmpeg,
        healthServer,
        getSnapshot,
        getBiometricProcessingSnapshot,
        startCamera,
        stopCamera,
        startBiometricProcessing,
        stopBiometricProcessing,
        shutdownBiometricProcessing,
    });
}

export async function startGateway(
    options = {},
) {
    const runtime =
        createGatewayRuntime(
            options,
        );

    const address =
        await runtime.healthServer.start();

    runtime.logger.info(
        "vision.gateway.started",
        {
            address,
            config:
                runtime.publicConfig,
        },
    );

    return runtime;
}

async function runMain() {
    const runtime =
        await startGateway();

    let stopping =
        false;

    const shutdown =
        async (
            signal,
        ) => {
            if (stopping) {
                return;
            }

            stopping =
                true;

            runtime.logger.info(
                "vision.gateway.stopping",
                {
                    signal,
                },
            );

            for (
                const cameraId of
                runtime.rtspSessions.keys()
            ) {
                try {
                    await runtime.shutdownBiometricProcessing(
                        cameraId,
                    );
                }
                catch (error) {
                    runtime.logger.error(
                        "vision.gateway.biometric_shutdown_failed",
                        {
                            cameraId,
                            error,
                        },
                    );
                }
            }

            for (
                const cameraId of
                runtime.rtspSessions.keys()
            ) {
                try {
                    runtime.stopCamera(
                        cameraId,
                    );
                }
                catch (error) {
                    runtime.logger.error(
                        "vision.gateway.camera_stop_failed",
                        {
                            cameraId,
                            error,
                        },
                    );
                }
            }

            await runtime.healthServer.stop();

            process.exitCode =
                0;
        };

    process.once(
        "SIGINT",
        () => {
            void shutdown(
                "SIGINT",
            );
        },
    );

    process.once(
        "SIGTERM",
        () => {
            void shutdown(
                "SIGTERM",
            );
        },
    );
}

const isMainModule =
    Boolean(
        process.argv[1],
    ) &&
    import.meta.url ===
        pathToFileURL(
            process.argv[1],
        ).href;

if (isMainModule) {
    runMain().catch(
        (
            error,
        ) => {
            const logger =
                createStructuredLogger();

            logger.error(
                "vision.gateway.fatal",
                {
                    error,
                },
            );

            process.exitCode =
                1;
        },
    );
}
