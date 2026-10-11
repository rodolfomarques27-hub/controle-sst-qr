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
    createReconnectPolicy,
} from "../src/rtsp/reconnectPolicy.mjs";

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

function createFakeTimers() {
    let nextId =
        1;

    const pending =
        new Map();

    const cleared =
        [];

    function setTimer(
        callback,
        delayMs,
    ) {
        const id =
            nextId++;

        pending.set(
            id,
            {
                callback,
                delayMs,
            },
        );

        return id;
    }

    function clearTimer(
        id,
    ) {
        if (
            pending.delete(
                id,
            )
        ) {
            cleared.push(
                id,
            );
        }
    }

    function runNext() {
        const first =
            pending
                .entries()
                .next();

        if (first.done) {
            return null;
        }

        const [
            id,
            item,
        ] =
            first.value;

        pending.delete(
            id,
        );

        item.callback();

        return {
            id,
            delayMs:
                item.delayMs,
        };
    }

    function delays() {
        return Array.from(
            pending.values(),
            (
                item,
            ) =>
                item.delayMs,
        );
    }

    return {
        setTimer,
        clearTimer,
        runNext,
        delays,
        pending,
        cleared,
    };
}

function createFixture({
    stableFrameThreshold = 2,
} = {}) {
    const children =
        [
            createChild(),
            createChild(),
            createChild(),
            createChild(),
        ];

    let childCursor =
        0;

    const starts =
        [];

    let stopCount =
        0;

    const ffmpeg = {
        start(
            input,
        ) {
            const child =
                children[
                    childCursor
                ];

            childCursor +=
                1;

            if (!child) {
                throw new Error(
                    "Sem child de teste disponivel.",
                );
            }

            starts.push({
                input,
                child,
            });

            return child;
        },

        stop(
            child,
        ) {
            stopCount +=
                1;

            child.killed =
                true;

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

        warn(
            event,
            context,
        ) {
            logs.push({
                level:
                    "warn",
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

    const timers =
        createFakeTimers();

    const reconnectPolicy =
        createReconnectPolicy({
            baseDelayMs:
                100,
            maxDelayMs:
                400,
            jitterRatio:
                0,
            random:
                () => 0.5,
        });

    const session =
        createRtspSession({
            camera,
            credentials,
            ffmpeg,
            health,
            logger,
            reconnectPolicy,
            setTimer:
                timers.setTimer,
            clearTimer:
                timers.clearTimer,
            stableFrameThreshold,
        });

    return {
        children,
        ffmpeg,
        health,
        logs,
        session,
        starts,
        timers,
        reconnectPolicy,
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

        fixture.children[0].stdout.write(
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
    "queda inesperada agenda reconexao com backoff",
    () => {
        const fixture =
            createFixture();

        fixture.session.start();

        fixture.children[0].emit(
            "exit",
            1,
            null,
        );

        assert.equal(
            fixture.session
                .snapshot()
                .state,
            "RECONNECTING",
        );

        assert.equal(
            fixture.session
                .snapshot()
                .reconnectScheduled,
            true,
        );

        assert.deepEqual(
            fixture.timers.delays(),
            [
                100,
            ],
        );

        assert.equal(
            fixture.health
                .snapshot()
                .status,
            "DEGRADED",
        );

        const fired =
            fixture.timers.runNext();

        assert.equal(
            fired.delayMs,
            100,
        );

        assert.equal(
            fixture.starts.length,
            2,
        );

        assert.equal(
            fixture.session
                .snapshot()
                .state,
            "STARTING",
        );

        assert.equal(
            fixture.health
                .snapshot()
                .reconnectAttempts,
            1,
        );

        assert.equal(
            fixture.health
                .snapshot()
                .totalReconnectAttempts,
            1,
        );
    },
);

test(
    "retomada estavel reseta backoff apenas apos segundo frame",
    () => {
        const fixture =
            createFixture();

        fixture.session.start();

        fixture.children[0].stdout.write(
            "frame=5\nprogress=continue\n",
        );

        fixture.children[0].emit(
            "exit",
            1,
            null,
        );

        fixture.timers.runNext();

        fixture.children[1].stdout.write(
            "frame=1\nprogress=continue\n",
        );

        assert.equal(
            fixture.session
                .snapshot()
                .state,
            "RUNNING",
        );

        assert.equal(
            fixture.health
                .snapshot()
                .status,
            "ONLINE",
        );

        assert.equal(
            fixture.health
                .snapshot()
                .reconnectAttempts,
            1,
        );

        assert.equal(
            fixture.reconnectPolicy
                .snapshot()
                .attempt,
            1,
        );

        fixture.children[1].stdout.write(
            "frame=2\nprogress=continue\n",
        );

        assert.equal(
            fixture.health
                .snapshot()
                .reconnectAttempts,
            0,
        );

        assert.notEqual(
            fixture.health
                .snapshot()
                .lastStableAt,
            null,
        );

        assert.equal(
            fixture.reconnectPolicy
                .snapshot()
                .attempt,
            0,
        );

        fixture.children[1].emit(
            "exit",
            1,
            null,
        );

        assert.deepEqual(
            fixture.timers.delays(),
            [
                100,
            ],
        );
    },
);

test(
    "quedas consecutivas aumentam backoff ate o limite",
    () => {
        const fixture =
            createFixture();

        fixture.session.start();

        fixture.children[0].emit(
            "exit",
            1,
            null,
        );

        assert.deepEqual(
            fixture.timers.delays(),
            [
                100,
            ],
        );

        fixture.timers.runNext();

        fixture.children[1].emit(
            "exit",
            1,
            null,
        );

        assert.deepEqual(
            fixture.timers.delays(),
            [
                200,
            ],
        );

        fixture.timers.runNext();

        fixture.children[2].emit(
            "exit",
            1,
            null,
        );

        assert.deepEqual(
            fixture.timers.delays(),
            [
                400,
            ],
        );
    },
);

test(
    "stop manual cancela reconexao pendente",
    () => {
        const fixture =
            createFixture();

        fixture.session.start();

        fixture.children[0].emit(
            "exit",
            1,
            null,
        );

        assert.equal(
            fixture.timers.pending.size,
            1,
        );

        const result =
            fixture.session.stop();

        assert.equal(
            result,
            true,
        );

        assert.equal(
            fixture.timers.pending.size,
            0,
        );

        assert.equal(
            fixture.session
                .snapshot()
                .state,
            "STOPPED",
        );

        assert.equal(
            fixture.session
                .snapshot()
                .reconnectScheduled,
            false,
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

test(
    "stop de processo ativo nao agenda nova reconexao",
    () => {
        const fixture =
            createFixture();

        fixture.session.start();

        fixture.children[0].stdout.write(
            "frame=1\nprogress=continue\n",
        );

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

        fixture.children[0].emit(
            "exit",
            0,
            "SIGTERM",
        );

        assert.equal(
            fixture.session
                .snapshot()
                .state,
            "STOPPED",
        );

        assert.equal(
            fixture.timers.pending.size,
            0,
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

test(
    "error e exit do mesmo processo nao duplicam reconexao",
    () => {
        const fixture =
            createFixture();

        fixture.session.start();

        fixture.children[0].emit(
            "error",
            new Error(
                "falha simulada",
            ),
        );

        fixture.children[0].emit(
            "exit",
            1,
            null,
        );

        assert.equal(
            fixture.timers.pending.size,
            1,
        );

        assert.deepEqual(
            fixture.timers.delays(),
            [
                100,
            ],
        );
    },
);
