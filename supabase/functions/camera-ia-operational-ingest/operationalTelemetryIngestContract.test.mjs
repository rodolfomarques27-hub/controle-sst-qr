import test from "node:test";
import assert from "node:assert/strict";
import {
    createHash,
    createHmac,
} from "node:crypto";

import {
    createOperationalTelemetryIngestContract,
} from "./operationalTelemetryIngestContract.mjs";

const secret =
    Buffer.alloc(
        32,
        9,
    );

const deviceId =
    "portaria-01-device";

const eventId =
    "22222222-2222-4222-8222-222222222222";

const nonce =
    "11111111-1111-4111-8111-111111111111";

const tenantId =
    "0327aeee-b8e6-46f9-9acd-087d1a00d155";

const empresaId =
    "9a0aa3d6-505a-4f6c-80f3-010631c03285";

const keyId =
    "33333333-3333-4333-8333-333333333333";

const now =
    1792688400000;

function payload() {
    return {
        version:
            1,

        eventId,

        deviceId,

        cameraId:
            "portaria-01",

        tenantId,

        empresaId,

        observedAt:
            new Date(
                now,
            ).toISOString(),

        camera: {
            status:
                "FRAMES_RECENT",

            framesRecent:
                true,

            frameCount:
                42,
        },

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
    };
}

function signedRequest(
    body,
    overrideSignature =
        null,
) {
    const timestamp =
        String(
            Math.floor(
                now /
                1000,
            ),
        );

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

    const canonical =
        `${timestamp}\n${nonce}\n${digest}\n/functions/v1/camera-ia-operational-ingest`;

    const signature =
        overrideSignature ||
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

    return new Request(
        "https://project.supabase.co/functions/v1/camera-ia-operational-ingest",
        {
            method:
                "POST",

            headers: {
                "content-type":
                    "application/json",

                "x-safescan-device-id":
                    deviceId,

                "x-safescan-event-id":
                    eventId,

                "x-safescan-timestamp":
                    timestamp,

                "x-safescan-nonce":
                    nonce,

                "x-safescan-signature":
                    signature,
            },

            body,
        },
    );
}

test(
    "aceita telemetria HMAC valida e sanitizada",
    async () => {
        let committed =
            null;

        const contract =
            createOperationalTelemetryIngestContract({
                nowImpl:
                    () =>
                        now,

                async resolveDevice() {
                    return {
                        deviceId,

                        cameraId:
                            "portaria-01",

                        tenantId,

                        empresaId,

                        keyId,

                        status:
                            "ativo",
                    };
                },

                async getSigningKey() {
                    return {
                        deviceId,
                        keyId,

                        secretBase64:
                            secret.toString(
                                "base64",
                            ),
                    };
                },

                async commitTelemetry(
                    value,
                ) {
                    committed =
                        value;

                    return true;
                },
            });

        const body =
            JSON.stringify(
                payload(),
            );

        const response =
            await contract.handle(
                signedRequest(
                    body,
                ),
            );

        assert.equal(
            response.status,
            202,
        );

        assert.ok(
            committed,
        );

        assert.equal(
            committed.payload.camera.status,
            "FRAMES_RECENT",
        );

        assert.equal(
            committed.payload.ppe.counts.hardhat,
            1,
        );

        assert.equal(
            committed.payload.ppe.counts.vest,
            1,
        );
    },
);

test(
    "rejeita assinatura HMAC invalida",
    async () => {
        const contract =
            createOperationalTelemetryIngestContract({
                nowImpl:
                    () =>
                        now,

                async resolveDevice() {
                    return {
                        deviceId,

                        cameraId:
                            "portaria-01",

                        tenantId,

                        empresaId,

                        keyId,

                        status:
                            "ativo",
                    };
                },

                async getSigningKey() {
                    return {
                        deviceId,
                        keyId,

                        secretBase64:
                            secret.toString(
                                "base64",
                            ),
                    };
                },

                async commitTelemetry() {
                    throw new Error(
                        "NAO_DEVERIA_COMMITAR",
                    );
                },
            });

        const body =
            JSON.stringify(
                payload(),
            );

        const response =
            await contract.handle(
                signedRequest(
                    body,
                    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                ),
            );

        assert.equal(
            response.status,
            401,
        );
    },
);