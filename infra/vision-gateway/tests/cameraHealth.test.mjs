import test from "node:test";
import assert from "node:assert/strict";

import {
    CAMERA_HEALTH_STATUS,
    CameraHealthTracker,
} from "../src/health/cameraHealth.mjs";

function createClock(
    values,
) {
    const queue =
        values.map(
            (
                value,
            ) =>
                new Date(
                    value,
                ),
        );

    return () => {
        const value =
            queue.shift();

        if (!value) {
            throw new Error(
                "Relogio de teste esgotado.",
            );
        }

        return value;
    };
}

test(
    "camera inicia OFFLINE",
    () => {
        const tracker =
            new CameraHealthTracker({
                cameraId:
                    "gate-01",
                now:
                    () =>
                        new Date(
                            "2026-10-11T10:00:00.000Z",
                        ),
            });

        const snapshot =
            tracker.snapshot();

        assert.equal(
            snapshot.cameraId,
            "gate-01",
        );

        assert.equal(
            snapshot.status,
            CAMERA_HEALTH_STATUS.OFFLINE,
        );

        assert.equal(
            snapshot.reason,
            "not_started",
        );
    },
);

test(
    "camera transita ONLINE, DEGRADED e OFFLINE",
    () => {
        const tracker =
            new CameraHealthTracker({
                cameraId:
                    "gate-01",
                now:
                    createClock([
                        "2026-10-11T10:00:00.000Z",
                        "2026-10-11T10:00:01.000Z",
                        "2026-10-11T10:00:02.000Z",
                        "2026-10-11T10:00:03.000Z",
                    ]),
            });

        const online =
            tracker.markOnline();

        assert.equal(
            online.status,
            CAMERA_HEALTH_STATUS.ONLINE,
        );

        assert.equal(
            online.lastFrameAt,
            "2026-10-11T10:00:01.000Z",
        );

        const degraded =
            tracker.markDegraded(
                "frame_stale",
            );

        assert.equal(
            degraded.status,
            CAMERA_HEALTH_STATUS.DEGRADED,
        );

        assert.equal(
            degraded.reason,
            "frame_stale",
        );

        const offline =
            tracker.markOffline(
                "stream_closed",
            );

        assert.equal(
            offline.status,
            CAMERA_HEALTH_STATUS.OFFLINE,
        );

        assert.equal(
            offline.reason,
            "stream_closed",
        );
    },
);

test(
    "tentativas de reconexao sao contabilizadas",
    () => {
        const tracker =
            new CameraHealthTracker({
                cameraId:
                    "gate-02",
                now:
                    createClock([
                        "2026-10-11T10:00:00.000Z",
                        "2026-10-11T10:00:01.000Z",
                        "2026-10-11T10:00:02.000Z",
                    ]),
            });

        tracker.recordReconnectAttempt(
            "rtsp_disconnect",
        );

        const snapshot =
            tracker.recordReconnectAttempt(
                "rtsp_disconnect",
            );

        assert.equal(
            snapshot.reconnectAttempts,
            2,
        );

        assert.equal(
            snapshot.lastReconnectAttemptAt,
            "2026-10-11T10:00:02.000Z",
        );
    },
);
