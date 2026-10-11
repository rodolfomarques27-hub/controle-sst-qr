import test from "node:test";
import assert from "node:assert/strict";

import {
    dirname,
    resolve,
} from "node:path";

import {
    fileURLToPath,
} from "node:url";

import {
    SFACE_CANONICAL_LANDMARKS_112,
    SFACE_EMBEDDING_SIZE,
    SFACE_INPUT_BYTES,
    cosineSimilarity128,
    createSfaceEmbeddingExtractor,
    normalizeEmbeddingL2,
    preprocessSfaceBgr112,
} from "../src/recognition/sfaceEmbedding.mjs";

function createEmbedding(
    values =
        {},
) {
    const embedding =
        new Float32Array(
            SFACE_EMBEDDING_SIZE,
        );

    for (
        const [
            indexText,
            value,
        ] of
        Object.entries(
            values,
        )
    ) {
        embedding[
            Number(
                indexText,
            )
        ] =
            value;
    }

    return embedding;
}

function l2Norm(
    embedding,
) {
    let sum =
        0;

    for (
        const value of
        embedding
    ) {
        sum +=
            value *
            value;
    }

    return Math.sqrt(
        sum,
    );
}

function createSyntheticBgr112() {
    const data =
        new Uint8Array(
            SFACE_INPUT_BYTES,
        );

    const width =
        112;

    const height =
        112;

    for (
        let y = 0;
        y <
        height;
        y += 1
    ) {
        for (
            let x = 0;
            x <
            width;
            x += 1
        ) {
            const offset =
                (
                    y *
                        width +
                    x
                ) *
                3;

            data[
                offset
            ] =
                (
                    x *
                        3 +
                    y *
                        5 +
                    17
                ) %
                256;

            data[
                offset +
                1
            ] =
                (
                    x *
                        7 +
                    y *
                        11 +
                    29
                ) %
                256;

            data[
                offset +
                2
            ] =
                (
                    x *
                        13 +
                    y *
                        17 +
                    43
                ) %
                256;
        }
    }

    return data;
}

test(
    "preprocess converte BGR HWC para RGB NCHW sem dividir por 255",
    () => {
        const data =
            new Uint8Array(
                SFACE_INPUT_BYTES,
            );

        data[0] =
            10;

        data[1] =
            20;

        data[2] =
            30;

        const result =
            preprocessSfaceBgr112({
                data,
            });

        const pixels =
            112 *
            112;

        assert.deepEqual(
            Array.from(
                result.dims,
            ),
            [
                1,
                3,
                112,
                112,
            ],
        );

        assert.equal(
            result.data.length,
            SFACE_INPUT_BYTES,
        );

        assert.equal(
            result.data[0],
            30,
        );

        assert.equal(
            result.data[
                pixels
            ],
            20,
        );

        assert.equal(
            result.data[
                2 *
                pixels
            ],
            10,
        );

        assert.equal(
            result.scale,
            1,
        );

        assert.equal(
            result.mean,
            0,
        );
    },
);

test(
    "preprocess rejeita dimensoes diferentes de 112x112",
    () => {
        assert.throws(
            () =>
                preprocessSfaceBgr112({
                    data:
                        new Uint8Array(
                            SFACE_INPUT_BYTES,
                        ),

                    width:
                        111,

                    height:
                        112,
                }),
            /112x112/,
        );
    },
);

test(
    "preprocess rejeita byte length diferente de 37632",
    () => {
        assert.throws(
            () =>
                preprocessSfaceBgr112({
                    data:
                        new Uint8Array(
                            SFACE_INPUT_BYTES -
                            1,
                        ),
                }),
            /37632/,
        );
    },
);

test(
    "normalizacao L2 retorna Float32Array 128-D com norma aproximadamente 1",
    () => {
        const source =
            new Float32Array(
                SFACE_EMBEDDING_SIZE,
            );

        for (
            let index = 0;
            index <
            source.length;
            index += 1
        ) {
            source[index] =
                index +
                1;
        }

        const normalized =
            normalizeEmbeddingL2(
                source,
            );

        assert.equal(
            normalized instanceof
                Float32Array,
            true,
        );

        assert.equal(
            normalized.length,
            SFACE_EMBEDDING_SIZE,
        );

        assert.ok(
            Math.abs(
                l2Norm(
                    normalized,
                ) -
                1,
            ) <
            1e-6,
        );
    },
);

test(
    "normalizacao L2 rejeita vetor zero",
    () => {
        assert.throws(
            () =>
                normalizeEmbeddingL2(
                    new Float32Array(
                        SFACE_EMBEDDING_SIZE,
                    ),
                ),
            /maior que zero/,
        );
    },
);

test(
    "normalizacao L2 rejeita valor nao finito",
    () => {
        const source =
            createEmbedding({
                0:
                    1,
            });

        source[5] =
            Number.NaN;

        assert.throws(
            () =>
                normalizeEmbeddingL2(
                    source,
                ),
            /finito/,
        );
    },
);

test(
    "cosine similarity identity e aproximadamente 1",
    () => {
        const embedding =
            createEmbedding({
                0:
                    1,

                1:
                    2,
            });

        assert.ok(
            Math.abs(
                cosineSimilarity128(
                    embedding,
                    embedding,
                ) -
                1,
            ) <
            1e-7,
        );
    },
);

test(
    "cosine similarity ortogonal e aproximadamente 0",
    () => {
        const left =
            createEmbedding({
                0:
                    1,
            });

        const right =
            createEmbedding({
                1:
                    1,
            });

        assert.ok(
            Math.abs(
                cosineSimilarity128(
                    left,
                    right,
                ),
            ) <
            1e-7,
        );
    },
);

test(
    "cosine similarity oposta e aproximadamente -1",
    () => {
        const left =
            createEmbedding({
                0:
                    1,
            });

        const right =
            createEmbedding({
                0:
                    -1,
            });

        assert.ok(
            Math.abs(
                cosineSimilarity128(
                    left,
                    right,
                ) +
                1,
            ) <
            1e-7,
        );
    },
);

test(
    "cosine similarity valida tamanho e finitude",
    () => {
        assert.throws(
            () =>
                cosineSimilarity128(
                    new Float32Array(
                        127,
                    ),
                    new Float32Array(
                        128,
                    ),
                ),
            /128/,
        );

        const invalid =
            createEmbedding({
                0:
                    1,
            });

        invalid[2] =
            Number.POSITIVE_INFINITY;

        assert.throws(
            () =>
                cosineSimilarity128(
                    createEmbedding({
                        0:
                            1,
                    }),
                    invalid,
                ),
            /finito/,
        );
    },
);

test(
    "template canonico SFace 112 possui exatamente 5 landmarks homologados",
    () => {
        assert.deepEqual(
            SFACE_CANONICAL_LANDMARKS_112,
            [
                {
                    x:
                        38.2946,
                    y:
                        51.6963,
                },
                {
                    x:
                        73.5318,
                    y:
                        51.5014,
                },
                {
                    x:
                        56.0252,
                    y:
                        71.7366,
                },
                {
                    x:
                        41.5493,
                    y:
                        92.3655,
                },
                {
                    x:
                        70.7299,
                    y:
                        92.2041,
                },
            ],
        );

        assert.equal(
            Object.isFrozen(
                SFACE_CANONICAL_LANDMARKS_112,
            ),
            true,
        );
    },
);

test(
    "SFace CPU executa no maximo 2 inferencias reais sobre imagem sintetica e permanece deterministico",
    async () => {
        const testDirectory =
            dirname(
                fileURLToPath(
                    import.meta.url,
                ),
            );

        const modelPath =
            resolve(
                testDirectory,
                "../models/face_recognition_sface_2021dec.onnx",
            );

        const extractor =
            await createSfaceEmbeddingExtractor({
                modelPath,
            });

        let releaseGreen =
            false;

        try {
            assert.equal(
                extractor.provider,
                "cpu",
            );

            assert.deepEqual(
                Array.from(
                    extractor.inputShape,
                ),
                [
                    1,
                    3,
                    112,
                    112,
                ],
            );

            assert.equal(
                extractor.embeddingSize,
                128,
            );

            const synthetic =
                createSyntheticBgr112();

            const first =
                await extractor.extractBgr112({
                    data:
                        synthetic,
                });

            const second =
                await extractor.extractBgr112({
                    data:
                        synthetic,
                });

            assert.equal(
                first.length,
                128,
            );

            assert.equal(
                second.length,
                128,
            );

            for (
                const value of
                first
            ) {
                assert.equal(
                    Number.isFinite(
                        value,
                    ),
                    true,
                );
            }

            for (
                const value of
                second
            ) {
                assert.equal(
                    Number.isFinite(
                        value,
                    ),
                    true,
                );
            }

            assert.ok(
                Math.abs(
                    l2Norm(
                        first,
                    ) -
                    1,
                ) <
                1e-5,
            );

            assert.ok(
                Math.abs(
                    l2Norm(
                        second,
                    ) -
                    1,
                ) <
                1e-5,
            );

            let maxDifference =
                0;

            for (
                let index = 0;
                index <
                128;
                index += 1
            ) {
                maxDifference =
                    Math.max(
                        maxDifference,
                        Math.abs(
                            first[index] -
                            second[index],
                        ),
                    );
            }

            assert.ok(
                maxDifference <=
                1e-6,
            );

            assert.ok(
                cosineSimilarity128(
                    first,
                    second,
                ) >=
                0.999999,
            );
        }
        finally {
            releaseGreen =
                await extractor.release();
        }

        assert.equal(
            releaseGreen,
            true,
        );
    },
);
