import test from "node:test";
import assert from "node:assert/strict";

import {
    createLatestFrameQueue,
} from "../src/frames/latestFrameQueue.mjs";

test(
    "latest-frame queue inicia vazia com capacidade efetiva 1",
    () => {
        const queue =
            createLatestFrameQueue();

        assert.deepEqual(
            queue.snapshot(),
            {
                capacity:
                    1,

                pending:
                    false,

                pendingBytes:
                    0,

                received:
                    0,

                delivered:
                    0,

                dropped:
                    0,
            },
        );

        assert.equal(
            queue.take(),
            null,
        );
    },
);

test(
    "latest-frame queue entrega frame e contabiliza received/delivered",
    () => {
        const queue =
            createLatestFrameQueue();

        const source =
            Uint8Array.from([
                1,
                2,
                3,
            ]);

        const pushed =
            queue.push(
                source,
            );

        assert.equal(
            pushed.replaced,
            false,
        );

        assert.equal(
            queue.snapshot().received,
            1,
        );

        source[0] =
            200;

        const frame =
            queue.take();

        assert.deepEqual(
            Array.from(
                frame,
            ),
            [
                1,
                2,
                3,
            ],
        );

        assert.deepEqual(
            queue.snapshot(),
            {
                capacity:
                    1,

                pending:
                    false,

                pendingBytes:
                    0,

                received:
                    1,

                delivered:
                    1,

                dropped:
                    0,
            },
        );
    },
);

test(
    "latest-frame queue substitui pendente pelo frame mais recente",
    () => {
        const queue =
            createLatestFrameQueue();

        queue.push(
            Uint8Array.from([
                1,
                1,
                1,
            ]),
        );

        const replacement =
            queue.push(
                Uint8Array.from([
                    2,
                    2,
                    2,
                ]),
            );

        assert.equal(
            replacement.replaced,
            true,
        );

        assert.deepEqual(
            queue.snapshot(),
            {
                capacity:
                    1,

                pending:
                    true,

                pendingBytes:
                    3,

                received:
                    2,

                delivered:
                    0,

                dropped:
                    1,
            },
        );

        assert.deepEqual(
            Array.from(
                queue.take(),
            ),
            [
                2,
                2,
                2,
            ],
        );
    },
);

test(
    "latest-frame queue permanece limitada durante varias substituicoes",
    () => {
        const queue =
            createLatestFrameQueue();

        for (
            let value = 1;
            value <= 10;
            value += 1
        ) {
            queue.push(
                Uint8Array.from([
                    value,
                    value,
                    value,
                ]),
            );
        }

        const snapshot =
            queue.snapshot();

        assert.equal(
            snapshot.capacity,
            1,
        );

        assert.equal(
            snapshot.pending,
            true,
        );

        assert.equal(
            snapshot.received,
            10,
        );

        assert.equal(
            snapshot.delivered,
            0,
        );

        assert.equal(
            snapshot.dropped,
            9,
        );

        assert.deepEqual(
            Array.from(
                queue.take(),
            ),
            [
                10,
                10,
                10,
            ],
        );
    },
);

test(
    "latest-frame queue reset elimina pendente e zera contadores",
    () => {
        const queue =
            createLatestFrameQueue();

        queue.push(
            Uint8Array.from([
                1,
                2,
                3,
            ]),
        );

        queue.push(
            Uint8Array.from([
                4,
                5,
                6,
            ]),
        );

        const reset =
            queue.reset();

        assert.deepEqual(
            reset,
            {
                capacity:
                    1,

                pending:
                    false,

                pendingBytes:
                    0,

                received:
                    0,

                delivered:
                    0,

                dropped:
                    0,
            },
        );

        assert.equal(
            queue.take(),
            null,
        );
    },
);

test(
    "latest-frame queue rejeita frame vazio ou tipo invalido",
    () => {
        const queue =
            createLatestFrameQueue();

        assert.throws(
            () =>
                queue.push(
                    new Uint8Array(
                        0,
                    ),
                ),
            /frame nao pode ser vazio/,
        );

        assert.throws(
            () =>
                queue.push(
                    [
                        1,
                        2,
                        3,
                    ],
                ),
            /Uint8Array ou Buffer/,
        );
    },
);
