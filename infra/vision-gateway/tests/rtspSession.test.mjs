import test from "node:test";
import assert from "node:assert/strict";

import {
    EventEmitter,
} from "node:events";

import {
    PassThrough,
} from "node:stream";

import {
    CameraHealthTracker,
} from "../src/health/cameraHealth.mjs";

import {
    buildRtspFfmpegArgs,
    createRtspSession,
} from "../src/rtsp/rtspSession.mjs";

function createChild() {
    const child =
        new EventEmitter();

    child.stdout =
        new PassThrough();

    child.stderr =
        new PassThrough();

    child.exitCode =
        null;

    child.killed =
        false;

    return child;
}

function createFixture() {
    const child =
        createChild();

    const starts =
        [];

    let stopCount =
        0;

    const ffmpeg = {
        start(
            input,
        ) {
            starts.push(
                input,
            );

            return child;
        },

        stop() {
            stopCount +=
                1;

            return true;
        },
    };

    const logs =
        [];

    const logger = {
        info(
            event,
            context,
        ) {
            logs.push({
                level:
                    "info",
                event,
                context,
            });
        },

        error(
            event,
            context,
        ) {
            logs.push({
                level:
                    "error",
                event,
                context,
            });
        },
    };

    const health =
        new CameraHealthTracker({
            cameraId:
                "gate-test-01",
        });

    const camera = {
        id:
            "gate-test-01",
        endpoint:
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
    };

    const credentials = {
        username:
            "test-user",
        password:
            "test-secret",
    };

    const session =
        createRtspSession({
            camera,
            credentials,
            ffmpeg,
            health,
            logger,
        });

    return {
        child,
        ffmpeg,
        health,
        logs,
        session,
        starts,
        credentials,

        get stopCount() {
            return stopCount;
        },
    };
}

test(
    "monta argumentos FFmpeg homologados para RTSP UDP",
    () => {
        const args =
            buildRtspFfmpegArgs({
                camera:
                    {
                        id:
                            "gate-test-01",
                        endpoint:
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
                    },
                credentials:
                    {
                        username:
                            "user",
                        password:
                            "secret",
                    },
            });

        const transportIndex =
            args.indexOf(
                "-rtsp_transport",
            );

        const timeoutIndex =
            args.indexOf(
                "-timeout",
            );

        const inputIndex =
            args.indexOf(
                "-i",
            );

        const progressIndex =
            args.indexOf(
                "-progress",
            );

        assert.equal(
            args[
                transportIndex + 1
            ],
            "udp",
        );

        assert.equal(
            args[
                timeoutIndex + 1
            ],
            "10000000",
        );

        assert.equal(
            args[
                progressIndex + 1
            ],
            "pipe:1",
        );

        assert.equal(
            args[
                inputIndex + 1
            ],
            "rtsp://user:secret@camera.example.local:554/onvif1",
        );

        assert.deepEqual(
            args.slice(
                -4,
            ),
            [
                "-an",
                "-f",
                "null",
                "-",
            ],
        );
    },
);

test(
    "primeiro frame leva health para ONLINE sem registrar segredo",
    () => {
        const fixture =
            createFixture();

        fixture.session.start();

        assert.equal(
            fixture.health
                .snapshot()
                .status,
            "DEGRADED",
        );

        fixture.child.stdout.write(
            "frame=1\nprogress=continue\n",
        );

        assert.equal(
            fixture.health
                .snapshot()
                .status,
            "ONLINE",
        );

        assert.equal(
            fixture.session
                .snapshot()
                .firstFrameSeen,
            true,
        );

        assert.equal(
            fixture.session
                .snapshot()
                .lastFrame,
            1,
        );

        const serializedLogs =
            JSON.stringify(
                fixture.logs,
            );

        assert.equal(
            serializedLogs.includes(
                "test-secret",
            ),
            false,
        );

        assert.equal(
            serializedLogs.includes(
                "test-user",
            ),
            false,
        );

        assert.equal(
            serializedLogs.includes(
                "rtsp://",
            ),
            false,
        );

        assert.equal(
            fixture.starts.length,
            1,
        );
    },
);

test(
    "saida antes do primeiro frame marca camera OFFLINE",
    () => {
        const fixture =
            createFixture();

        fixture.session.start();

        fixture.child.emit(
            "exit",
            1,
            null,
        );

        const health =
            fixture.health.snapshot();

        assert.equal(
            health.status,
            "OFFLINE",
        );

        assert.equal(
            health.reason,
            "ffmpeg_exit_before_first_frame",
        );

        assert.equal(
            fixture.session
                .snapshot()
                .state,
            "STOPPED",
        );
    },
);

test(
    "stop e explicito e nao implementa reconexao",
    () => {
        const fixture =
            createFixture();

        fixture.session.start();

        const result =
            fixture.session.stop();

        assert.equal(
            result,
            true,
        );

        assert.equal(
            fixture.stopCount,
            1,
        );

        assert.equal(
            fixture.starts.length,
            1,
        );

        assert.equal(
            fixture.health
                .snapshot()
                .status,
            "DEGRADED",
        );

        fixture.child.emit(
            "exit",
            0,
            "SIGTERM",
        );

        assert.equal(
            fixture.health
                .snapshot()
                .status,
            "OFFLINE",
        );

        assert.equal(
            fixture.health
                .snapshot()
                .reason,
            "stopped",
        );

        assert.equal(
            fixture.starts.length,
            1,
        );
    },
);
