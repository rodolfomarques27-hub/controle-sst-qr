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

export function createGatewayRuntime({
    env = process.env,
    logSink,
} = {}) {
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

        const session =
            createRtspSession({
                camera,
                credentials,
                ffmpeg,
                health,
                logger,
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
        startCamera,
        stopCamera,
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
