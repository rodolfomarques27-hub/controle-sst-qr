import {
    existsSync,
} from "node:fs";

import {
    resolve,
} from "node:path";

import {
    createPpePresenceMonitor,
} from "../detection/ppePresenceMonitor.mjs";

import {
    createOperationalTelemetryPublisher,
} from "./operationalTelemetryPublisher.mjs";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requiredText(
    env,
    name,
) {
    const value =
        String(
            env?.[
                name
            ] ??
                ""
        ).trim();

    if (!value) {
        throw new Error(
            `${name}_required`
        );
    }

    return value;
}

function requiredUuid(
    env,
    name,
) {
    const value =
        requiredText(
            env,
            name
        );

    if (
        !UUID.test(
            value
        )
    ) {
        throw new Error(
            `${name}_invalid`
        );
    }

    return value.toLowerCase();
}

function emptyPpe() {
    return {
        status:
            "STALE",

        personCount:
            0,

        counts: {
            hardhat: 0,
            noHardhat: 0,
            vest: 0,
            noVest: 0,
            person: 0,
        },

        maxConfidence: {
            hardhat: 0,
            noHardhat: 0,
            vest: 0,
            noVest: 0,
            person: 0,
        },

        updatedAt:
            null,
    };
}

function cameraSnapshot(
    runtime,
    cameraId,
    now,
) {
    const snapshot =
        runtime.getSnapshot();

    const camera =
        Array.isArray(
            snapshot?.cameras
        )
            ? snapshot.cameras.find(
                (
                    item
                ) =>
                    item?.cameraId ===
                    cameraId
            )
            : null;

    if (!camera) {
        return {
            status:
                "NO_CAMERA_CONFIGURED",

            framesRecent:
                false,

            frameCount:
                0,
        };
    }

    const lastFrameAt =
        Date.parse(
            camera
                ?.health
                ?.lastFrameAt ??
                ""
        );

    const framesRecent =
        Number.isFinite(
            lastFrameAt
        ) &&
        now >=
            lastFrameAt &&
        now -
            lastFrameAt <=
            10000 &&
        camera
            ?.rtsp
            ?.running ===
            true &&
        camera
            ?.rtsp
            ?.firstFrameSeen ===
            true;

    const frameCount =
        Number.isSafeInteger(
            camera
                ?.rtsp
                ?.lastFrame
        )
            ? Math.max(
                0,
                camera.rtsp.lastFrame
            )
            : 0;

    if (framesRecent) {
        return {
            status:
                "FRAMES_RECENT",

            framesRecent:
                true,

            frameCount,
        };
    }

    if (
        camera
            ?.rtsp
            ?.running ===
        true
    ) {
        return {
            status:
                "SESSION_NO_RECENT_FRAMES",

            framesRecent:
                false,

            frameCount,
        };
    }

    return {
        status:
            "NO_ACTIVE_SESSION",

        framesRecent:
            false,

        frameCount,
    };
}

export function createOperationalTelemetryRuntime({
    runtime,
    env =
        process.env,
    createPpeMonitor =
        createPpePresenceMonitor,
    createPublisher =
        createOperationalTelemetryPublisher,
    fileExists =
        existsSync,
    nowImpl =
        Date.now,
    setIntervalImpl =
        setInterval,
    clearIntervalImpl =
        clearInterval,
} = {}) {
    if (
        !runtime
            ?.config
            ?.camera
            ?.id ||
        typeof runtime.startCamera !==
            "function" ||
        typeof runtime.stopCamera !==
            "function" ||
        typeof runtime.getSnapshot !==
            "function"
    ) {
        throw new TypeError(
            "runtime_invalid"
        );
    }

    const cameraId =
        runtime
            .config
            .camera
            .id;

    const modelPath =
        resolve(
            requiredText(
                env,
                "SAFESCAN_PPE_MODEL_PATH"
            )
        );

    if (
        !fileExists(
            modelPath
        )
    ) {
        throw new Error(
            "SAFESCAN_PPE_MODEL_PATH_not_found"
        );
    }

    const intervalMs =
        Number(
            env
                .SAFESCAN_OPERATIONAL_TELEMETRY_INTERVAL_MS ??
            5000
        );

    if (
        !Number.isSafeInteger(
            intervalMs
        ) ||
        intervalMs < 3000 ||
        intervalMs > 30000
    ) {
        throw new Error(
            "telemetry_interval_invalid"
        );
    }

    const ppe =
        createPpeMonitor({
            runtime,
            cameraId,
            modelPath,
        });

    const publisher =
        createPublisher({
            endpointUrl:
                requiredText(
                    env,
                    "SAFESCAN_OPERATIONAL_INGEST_URL"
                ),

            deviceId:
                requiredText(
                    env,
                    "SAFESCAN_OPERATIONAL_DEVICE_ID"
                ),

            cameraId,

            tenantId:
                requiredUuid(
                    env,
                    "SAFESCAN_OPERATIONAL_TENANT_ID"
                ),

            empresaId:
                requiredUuid(
                    env,
                    "SAFESCAN_OPERATIONAL_EMPRESA_ID"
                ),

            deviceSecretBase64:
                requiredText(
                    env,
                    "SAFESCAN_OPERATIONAL_DEVICE_SECRET_BASE64"
                ),
        });

    let started =
        false;

    let publishing =
        false;

    let timer =
        null;

    async function publishNow() {
        if (
            !started ||
            publishing
        ) {
            return false;
        }

        publishing =
            true;

        try {
            const now =
                nowImpl();

            const camera =
                cameraSnapshot(
                    runtime,
                    cameraId,
                    now
                );

            const ppeSnapshot =
                camera.framesRecent
                    ? ppe.snapshot()
                    : emptyPpe();

            return await publisher
                .publishTelemetry({
                    cameraStatus:
                        camera.status,

                    framesRecent:
                        camera.framesRecent,

                    frameCount:
                        camera.frameCount,

                    observedAt:
                        new Date(
                            now
                        ).toISOString(),

                    ppe:
                        ppeSnapshot,
                });
        }
        finally {
            publishing =
                false;
        }
    }

    async function start() {
        if (started) {
            return false;
        }

        started =
            true;

        try {
            await Promise.resolve(
                runtime.startCamera(
                    cameraId
                )
            );

            ppe.start();

            await publishNow();

            timer =
                setIntervalImpl(
                    () => {
                        void publishNow();
                    },
                    intervalMs
                );

            timer?.unref?.();

            return true;
        }
        catch (
            error
        ) {
            started =
                false;

            publisher.close();

            try {
                await ppe.stop();
            }
            catch {
                // Safe stop.
            }

            try {
                runtime.stopCamera(
                    cameraId
                );
            }
            catch {
                // Safe stop.
            }

            throw error;
        }
    }

    async function stop() {
        if (
            timer !==
            null
        ) {
            clearIntervalImpl(
                timer
            );

            timer =
                null;
        }

        started =
            false;

        publisher.close();

        await ppe.stop();

        runtime.stopCamera(
            cameraId
        );

        return true;
    }

    return Object.freeze({
        start,
        stop,
        publishNow,
    });
}