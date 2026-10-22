import test from "node:test";
import assert from "node:assert/strict";

import {
    createOperationalTelemetryRuntime,
} from "../src/http/operationalTelemetryRuntime.mjs";

test(
    "runtime publica camera e EPI sem frame bruto",
    async () => {
        const now =
            Date.parse(
                "2026-10-22T16:00:00.000Z",
            );

        const published =
            [];

        let cameraStarted =
            0;

        let cameraStopped =
            0;

        let ppeStarted =
            0;

        let ppeStopped =
            0;

        let publisherClosed =
            0;

        const runtime = {
            config: {
                camera: {
                    id:
                        "portaria-01",
                },
            },

            startCamera() {
                cameraStarted +=
                    1;

                return true;
            },

            stopCamera() {
                cameraStopped +=
                    1;

                return true;
            },

            getSnapshot() {
                return {
                    cameras: [
                        {
                            cameraId:
                                "portaria-01",

                            health: {
                                lastFrameAt:
                                    new Date(
                                        now -
                                        1000,
                                    ).toISOString(),
                            },

                            rtsp: {
                                running:
                                    true,

                                firstFrameSeen:
                                    true,

                                lastFrame:
                                    42,
                            },
                        },
                    ],
                };
            },
        };

        const ppeSnapshot = {
            status:
                "PPE_DETECTED",

            personCount:
                1,

            counts: {
                hardhat:
                    1,

                noHardhat:
                    0,

                vest:
                    1,

                noVest:
                    0,

                person:
                    1,
            },

            maxConfidence: {
                hardhat:
                    0.93,

                noHardhat:
                    0,

                vest:
                    0.91,

                noVest:
                    0,

                person:
                    0.87,
            },

            updatedAt:
                new Date(
                    now,
                ).toISOString(),
        };

        const telemetry =
            createOperationalTelemetryRuntime({
                runtime,

                env: {
                    SAFESCAN_PPE_MODEL_PATH:
                        "F:\\models\\ppe.onnx",

                    SAFESCAN_OPERATIONAL_INGEST_URL:
                        "https://koukyzczwttemgmloagt.supabase.co/functions/v1/camera-ia-operational-ingest",

                    SAFESCAN_OPERATIONAL_DEVICE_ID:
                        "portaria-01-device",

                    SAFESCAN_OPERATIONAL_DEVICE_SECRET_BASE64:
                        Buffer.alloc(
                            32,
                            3,
                        ).toString(
                            "base64",
                        ),

                    SAFESCAN_OPERATIONAL_TENANT_ID:
                        "0327aeee-b8e6-46f9-9acd-087d1a00d155",

                    SAFESCAN_OPERATIONAL_EMPRESA_ID:
                        "9a0aa3d6-505a-4f6c-80f3-010631c03285",

                    SAFESCAN_OPERATIONAL_TELEMETRY_INTERVAL_MS:
                        "5000",
                },

                fileExists:
                    () =>
                        true,

                nowImpl:
                    () =>
                        now,

                createPpeMonitor:
                    () => ({
                        start() {
                            ppeStarted +=
                                1;

                            return true;
                        },

                        async stop() {
                            ppeStopped +=
                                1;

                            return true;
                        },

                        snapshot() {
                            return ppeSnapshot;
                        },
                    }),

                createPublisher:
                    () => ({
                        async publishTelemetry(
                            value,
                        ) {
                            published.push(
                                value,
                            );

                            return true;
                        },

                        close() {
                            publisherClosed +=
                                1;
                        },
                    }),

                setIntervalImpl:
                    () => ({
                        unref() {},
                    }),

                clearIntervalImpl:
                    () => {},
            });

        assert.equal(
            await telemetry.start(),
            true,
        );

        assert.equal(
            cameraStarted,
            1,
        );

        assert.equal(
            ppeStarted,
            1,
        );

        assert.equal(
            published.length,
            1,
        );

        assert.equal(
            published[0].cameraStatus,
            "FRAMES_RECENT",
        );

        assert.equal(
            published[0].framesRecent,
            true,
        );

        assert.equal(
            published[0].frameCount,
            42,
        );

        assert.deepEqual(
            published[0].ppe,
            ppeSnapshot,
        );

        assert.equal(
            Object.hasOwn(
                published[0],
                "frame",
            ),
            false,
        );

        assert.equal(
            Object.hasOwn(
                published[0],
                "embedding",
            ),
            false,
        );

        await telemetry.stop();

        assert.equal(
            ppeStopped,
            1,
        );

        assert.equal(
            cameraStopped,
            1,
        );

        assert.equal(
            publisherClosed,
            1,
        );
    },
);