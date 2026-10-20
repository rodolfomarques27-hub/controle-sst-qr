import test from "node:test";
import assert from "node:assert/strict";

import {
    createReconnectPolicy,
} from "../src/rtsp/reconnectPolicy.mjs";

test(
    "backoff exponencial cresce e respeita limite",
    () => {
        const policy =
            createReconnectPolicy({
                baseDelayMs:
                    100,
                maxDelayMs:
                    500,
                jitterRatio:
                    0,
                random:
                    () => 0.5,
            });

        assert.equal(
            policy.next().delayMs,
            100,
        );

        assert.equal(
            policy.next().delayMs,
            200,
        );

        assert.equal(
            policy.next().delayMs,
            400,
        );

        assert.equal(
            policy.next().delayMs,
            500,
        );

        assert.equal(
            policy.next().delayMs,
            500,
        );

        assert.equal(
            policy.snapshot().attempt,
            5,
        );
    },
);

test(
    "jitter e deterministico quando random e injetado",
    () => {
        const low =
            createReconnectPolicy({
                baseDelayMs:
                    1000,
                maxDelayMs:
                    5000,
                jitterRatio:
                    0.2,
                random:
                    () => 0,
            });

        const high =
            createReconnectPolicy({
                baseDelayMs:
                    1000,
                maxDelayMs:
                    5000,
                jitterRatio:
                    0.2,
                random:
                    () => 1,
            });

        assert.equal(
            low.next().delayMs,
            800,
        );

        assert.equal(
            high.next().delayMs,
            1200,
        );
    },
);

test(
    "reset reinicia backoff na tentativa inicial",
    () => {
        const policy =
            createReconnectPolicy({
                baseDelayMs:
                    250,
                maxDelayMs:
                    2000,
                jitterRatio:
                    0,
                random:
                    () => 0.5,
            });

        policy.next();
        policy.next();
        policy.next();

        assert.equal(
            policy.snapshot().attempt,
            3,
        );

        policy.reset();

        assert.equal(
            policy.snapshot().attempt,
            0,
        );

        assert.equal(
            policy.next().delayMs,
            250,
        );

        assert.equal(
            policy.snapshot().attempt,
            1,
        );
    },
);
