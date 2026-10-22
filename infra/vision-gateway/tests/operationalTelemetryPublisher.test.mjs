import test from "node:test";
import assert from "node:assert/strict";
import {
    createHash,
    createHmac,
} from "node:crypto";

import {
    createOperationalTelemetryPublisher,
} from "../src/http/operationalTelemetryPublisher.mjs";

test(
    "publisher envia somente telemetria sanitizada com HMAC",
    async () => {
        const secret =
            Buffer.alloc(
                32,
                7,
            );

        const calls =
            [];

        const publisher =
            createOperationalTelemetryPublisher({
                endpointUrl:
                    "https://koukyzczwttemgmloagt.supabase.co/functions/v1/camera-ia-operational-ingest",

                deviceId:
                    "portaria-01-device",

                cameraId:
                    "portaria-01",

                tenantId:
                    "0327aeee-b8e6-46f9-9acd-087d1a00d155",

                empresaId:
                    "9a0aa3d6-505a-4f6c-80f3-010631c03285",

                deviceSecretBase64:
                    secret.toString(
                        "base64",
                    ),

                nowImpl:
                    () =>
                        1792688400000,

                nonceImpl:
                    () =>
                        "11111111-1111-4111-8111-111111111111",

                eventIdImpl:
                    () =>
                        "22222222-2222-4222-8222-222222222222",

                fetchImpl:
                    async (
                        url,
                        init,
                    ) => {
                        calls.push({
                            url,
                            init,
                        });

                        return {
                            ok:
                                true,

                            status:
                                202,
                        };
                    },
            });

        const result =
            await publisher.publishTelemetry({
                cameraStatus:
                    "FRAMES_RECENT",

                framesRecent:
                    true,

                frameCount:
                    42,

                observedAt:
                    "2026-10-22T16:00:00.000Z",

                ppe: {
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
                            0.94,

                        noHardhat:
                            0,

                        vest:
                            0.91,

                        noVest:
                            0,

                        person:
                            0.88,
                    },
                },
            });

        assert.equal(
            result,
            true,
        );

        assert.equal(
            calls.length,
            1,
        );

        const call =
            calls[0];

        const body =
            call.init.body;

        const lower =
            body.toLowerCase();

        for (
            const forbidden of
            [
                "rtsp",
                "password",
                "username",
                "embedding",
                "framedata",
                "image",
            ]
        ) {
            assert.equal(
                lower.includes(
                    forbidden,
                ),
                false,
            );
        }

        const digest =
            createHash(
                "sha256",
            )
                .update(
                    body,
                    "utf8",
                )
                .digest(
                    "hex",
                );

        const timestamp =
            call.init.headers[
                "x-safescan-timestamp"
            ];

        const nonce =
            call.init.headers[
                "x-safescan-nonce"
            ];

        const canonical =
            `${timestamp}\n${nonce}\n${digest}\n/functions/v1/camera-ia-operational-ingest`;

        const expected =
            createHmac(
                "sha256",
                secret,
            )
                .update(
                    canonical,
                    "utf8",
                )
                .digest(
                    "base64url",
                );

        assert.equal(
            call.init.headers[
                "x-safescan-signature"
            ],
            expected,
        );

        publisher.close();
    },
);