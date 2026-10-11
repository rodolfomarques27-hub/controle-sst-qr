import test from "node:test";
import assert from "node:assert/strict";

import {
    BGR24_CHANNELS,
    createRawBgrFrameAssembler,
} from "../src/frames/rawBgrFrameAssembler.mjs";

test(
    "assembler calcula frame boundary BGR24 deterministicamente",
    () => {
        const assembler =
            createRawBgrFrameAssembler({
                width:
                    4,

                height:
                    2,
            });

        assert.equal(
            BGR24_CHANNELS,
            3,
        );

        assert.deepEqual(
            assembler.snapshot(),
            {
                width:
                    4,

                height:
                    2,

                channels:
                    3,

                frameSize:
                    24,

                pendingBytes:
                    0,

                pushedChunks:
                    0,

                totalBytes:
                    0,

                completedFrames:
                    0,
            },
        );

        assert.throws(
            () =>
                createRawBgrFrameAssembler({
                    width:
                        0,

                    height:
                        2,
                }),
            /width deve ser inteiro positivo/,
        );
    },
);

test(
    "assembler monta um frame dividido em multiplos chunks",
    () => {
        const assembler =
            createRawBgrFrameAssembler({
                width:
                    2,

                height:
                    1,
            });

        const expected =
            Uint8Array.from([
                1,
                2,
                3,
                4,
                5,
                6,
            ]);

        assert.equal(
            assembler.push(
                expected.subarray(
                    0,
                    1,
                ),
            ).length,
            0,
        );

        assert.equal(
            assembler.push(
                expected.subarray(
                    1,
                    4,
                ),
            ).length,
            0,
        );

        const frames =
            assembler.push(
                expected.subarray(
                    4,
                ),
            );

        assert.equal(
            frames.length,
            1,
        );

        assert.deepEqual(
            Array.from(
                frames[0],
            ),
            Array.from(
                expected,
            ),
        );

        assert.equal(
            assembler.snapshot().pendingBytes,
            0,
        );

        assert.equal(
            assembler.snapshot().completedFrames,
            1,
        );
    },
);

test(
    "assembler emite dois frames quando um unico chunk contem dois frames",
    () => {
        const assembler =
            createRawBgrFrameAssembler({
                width:
                    1,

                height:
                    1,
            });

        const chunk =
            Uint8Array.from([
                1,
                2,
                3,

                4,
                5,
                6,
            ]);

        const frames =
            assembler.push(
                chunk,
            );

        assert.equal(
            frames.length,
            2,
        );

        assert.deepEqual(
            Array.from(
                frames[0],
            ),
            [
                1,
                2,
                3,
            ],
        );

        assert.deepEqual(
            Array.from(
                frames[1],
            ),
            [
                4,
                5,
                6,
            ],
        );

        assert.equal(
            assembler.snapshot().completedFrames,
            2,
        );
    },
);

test(
    "assembler preserva sobra parcial depois de multiplos frames",
    () => {
        const assembler =
            createRawBgrFrameAssembler({
                width:
                    1,

                height:
                    1,
            });

        const first =
            assembler.push(
                Uint8Array.from([
                    1,
                    2,
                    3,

                    4,
                    5,
                    6,

                    7,
                ]),
            );

        assert.equal(
            first.length,
            2,
        );

        assert.equal(
            assembler.snapshot().pendingBytes,
            1,
        );

        const second =
            assembler.push(
                Uint8Array.from([
                    8,
                    9,
                ]),
            );

        assert.equal(
            second.length,
            1,
        );

        assert.deepEqual(
            Array.from(
                second[0],
            ),
            [
                7,
                8,
                9,
            ],
        );

        assert.equal(
            assembler.snapshot().pendingBytes,
            0,
        );

        assert.equal(
            assembler.snapshot().completedFrames,
            3,
        );
    },
);

test(
    "assembler nao cria aliasing com buffer de entrada nem com buffer interno",
    () => {
        const assembler =
            createRawBgrFrameAssembler({
                width:
                    1,

                height:
                    1,
            });

        const source =
            Uint8Array.from([
                10,
                20,
                30,
            ]);

        const firstFrames =
            assembler.push(
                source,
            );

        const firstFrame =
            firstFrames[0];

        source[0] =
            200;

        assert.deepEqual(
            Array.from(
                firstFrame,
            ),
            [
                10,
                20,
                30,
            ],
        );

        assembler.push(
            Uint8Array.from([
                40,
                50,
                60,
            ]),
        );

        assert.deepEqual(
            Array.from(
                firstFrame,
            ),
            [
                10,
                20,
                30,
            ],
        );
    },
);

test(
    "assembler reset descarta residuo e zera snapshot",
    () => {
        const assembler =
            createRawBgrFrameAssembler({
                width:
                    1,

                height:
                    1,
            });

        assembler.push(
            Uint8Array.from([
                99,
                88,
            ]),
        );

        assert.equal(
            assembler.snapshot().pendingBytes,
            2,
        );

        const reset =
            assembler.reset();

        assert.deepEqual(
            reset,
            {
                width:
                    1,

                height:
                    1,

                channels:
                    3,

                frameSize:
                    3,

                pendingBytes:
                    0,

                pushedChunks:
                    0,

                totalBytes:
                    0,

                completedFrames:
                    0,
            },
        );

        const frames =
            assembler.push(
                Uint8Array.from([
                    1,
                    2,
                    3,
                ]),
            );

        assert.deepEqual(
            Array.from(
                frames[0],
            ),
            [
                1,
                2,
                3,
            ],
        );
    },
);
