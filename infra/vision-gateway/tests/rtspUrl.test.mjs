import test from "node:test";
import assert from "node:assert/strict";

import {
    buildRtspUrl,
    describeRtspEndpoint,
} from "../src/rtsp/rtspUrl.mjs";

test(
    "constroi URL RTSP com credenciais percent-encoded",
    () => {
        const url =
            buildRtspUrl({
                endpoint:
                    {
                        host:
                            "camera.example.local",
                        port:
                            554,
                        path:
                            "/onvif1",
                    },
                credentials:
                    {
                        username:
                            "user@example",
                        password:
                            "p@ss word",
                    },
            });

        assert.equal(
            url,
            "rtsp://user%40example:p%40ss%20word@camera.example.local:554/onvif1",
        );
    },
);

test(
    "constroi URL RTSP sem credenciais",
    () => {
        const url =
            buildRtspUrl({
                endpoint:
                    {
                        host:
                            "camera.example.local",
                        port:
                            554,
                        path:
                            "stream",
                    },
            });

        assert.equal(
            url,
            "rtsp://camera.example.local:554/stream",
        );
    },
);

test(
    "rejeita credencial parcial",
    () => {
        assert.throws(
            () =>
                buildRtspUrl({
                    endpoint:
                        {
                            host:
                                "camera.example.local",
                            port:
                                554,
                            path:
                                "/onvif1",
                        },
                    credentials:
                        {
                            username:
                                "user-only",
                        },
                }),
            /usuario e senha juntos/,
        );
    },
);

test(
    "descricao publica do endpoint nao inclui credenciais",
    () => {
        const endpoint =
            describeRtspEndpoint({
                host:
                    "camera.example.local",
                port:
                    554,
                path:
                    "onvif1",
                transport:
                    "UDP",
            });

        assert.deepEqual(
            endpoint,
            {
                host:
                    "camera.example.local",
                port:
                    554,
                path:
                    "/onvif1",
                transport:
                    "udp",
            },
        );
    },
);
