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
    }

    const ffmpeg =
        createFfmpegProcess({
            ffmpegPath:
                config.ffmpeg.path,
            logger,
        });

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
        ffmpeg,
        healthServer,
        getSnapshot,
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
