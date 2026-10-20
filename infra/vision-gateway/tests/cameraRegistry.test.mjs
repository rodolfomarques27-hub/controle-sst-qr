import test from "node:test";
import assert from "node:assert/strict";

import {
    CameraRegistry,
} from "../src/cameras/cameraRegistry.mjs";

function createCamera(
    id,
    host,
) {
    return {
        id,
        endpoint:
            {
                host,
                port:
                    554,
                path:
                    "/onvif1",
                transport:
                    "udp",
            },
    };
}

test(
    "registra cameras com camera_id independente do IP",
    () => {
        const registry =
            new CameraRegistry();

        const camera =
            registry.register(
                createCamera(
                    "gate-01",
                    "camera-a.example.local",
                ),
            );

        assert.equal(
            camera.id,
            "gate-01",
        );

        assert.equal(
            camera.endpoint.host,
            "camera-a.example.local",
        );

        assert.equal(
            registry.size,
            1,
        );
    },
);

test(
    "rejeita camera_id duplicado",
    () => {
        const registry =
            new CameraRegistry();

        registry.register(
            createCamera(
                "gate-01",
                "camera-a.example.local",
            ),
        );

        assert.throws(
            () =>
                registry.register(
                    createCamera(
                        "gate-01",
                        "camera-b.example.local",
                    ),
                ),
            /Camera ja registrada/,
        );
    },
);

test(
    "permite trocar endpoint preservando camera_id",
    () => {
        const registry =
            new CameraRegistry();

        registry.register(
            createCamera(
                "gate-01",
                "camera-a.example.local",
            ),
        );

        const updated =
            registry.updateEndpoint(
                "gate-01",
                {
                    host:
                        "camera-b.example.local",
                    port:
                        8554,
                    path:
                        "stream-main",
                    transport:
                        "tcp",
                },
            );

        assert.equal(
            updated.id,
            "gate-01",
        );

        assert.equal(
            updated.endpoint.host,
            "camera-b.example.local",
        );

        assert.equal(
            updated.endpoint.port,
            8554,
        );

        assert.equal(
            updated.endpoint.path,
            "/stream-main",
        );

        assert.equal(
            updated.endpoint.transport,
            "tcp",
        );
    },
);
