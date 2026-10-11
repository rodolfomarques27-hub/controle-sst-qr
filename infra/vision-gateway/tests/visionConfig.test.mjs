import test from "node:test";
import assert from "node:assert/strict";

import {
    loadVisionConfig,
    toPublicVisionConfig,
} from "../src/config/visionConfig.mjs";

test(
    "usa defaults locais seguros sem camera configurada",
    () => {
        const config =
            loadVisionConfig({
                env:
                    {},
            });

        assert.equal(
            config.service.host,
            "127.0.0.1",
        );

        assert.equal(
            config.service.port,
            8787,
        );

        assert.equal(
            config.ffmpeg.path,
            "ffmpeg",
        );

        assert.equal(
            config.camera,
            null,
        );
    },
);

test(
    "configuracao publica nao expoe usuario ou senha",
    () => {
        const config =
            loadVisionConfig({
                env:
                    {
                        SAFESCAN_CAMERA_ID:
                            "gate-test-01",
                        SAFESCAN_CAMERA_HOST:
                            "camera.example.local",
                        SAFESCAN_CAMERA_PORT:
                            "554",
                        SAFESCAN_CAMERA_PATH:
                            "/onvif1",
                        SAFESCAN_CAMERA_TRANSPORT:
                            "udp",
                        SAFESCAN_CAMERA_USERNAME:
                            "test-user",
                        SAFESCAN_CAMERA_PASSWORD:
                            "test-password",
                    },
            });

        const publicConfig =
            toPublicVisionConfig(
                config,
            );

        const serialized =
            JSON.stringify(
                publicConfig,
            );

        assert.equal(
            publicConfig.camera.id,
            "gate-test-01",
        );

        assert.equal(
            publicConfig.camera.credentialsConfigured,
            true,
        );

        assert.equal(
            serialized.includes(
                "test-user",
            ),
            false,
        );

        assert.equal(
            serialized.includes(
                "test-password",
            ),
            false,
        );
    },
);

test(
    "health server nao pode ser configurado fora de loopback",
    () => {
        assert.throws(
            () =>
                loadVisionConfig({
                    env:
                        {
                            SAFESCAN_VISION_HOST:
                                "0.0.0.0",
                        },
                }),
            /loopback/,
        );
    },
);

test(
    "rejeita transporte de camera nao suportado",
    () => {
        assert.throws(
            () =>
                loadVisionConfig({
                    env:
                        {
                            SAFESCAN_CAMERA_ID:
                                "gate-test-01",
                            SAFESCAN_CAMERA_HOST:
                                "camera.example.local",
                            SAFESCAN_CAMERA_TRANSPORT:
                                "invalid",
                        },
                }),
            /udp ou tcp/,
        );
    },
);
