import test from "node:test";
import assert from "node:assert/strict";

import {
    IDENTITY_FALLBACK_METHOD,
    IDENTITY_METHOD,
    IDENTITY_STATUS,
    createFallbackContract,
    createIdentityResult,
    createRecognitionCandidate,
} from "../src/identity/identityContract.mjs";

function candidate(
    collaboratorId =
        "colab-001",
    confidence =
        0.91,
) {
    return {
        collaboratorId,
        confidence,
        score:
            0.72,
        referenceVersion:
            "photo-v1",
    };
}

test(
    "expoe somente os cinco estados previstos de identidade",
    () => {
        assert.deepEqual(
            Object.values(
                IDENTITY_STATUS,
            ).sort(),
            [
                "AMBIGUOUS",
                "LOW_CONFIDENCE",
                "MATCH",
                "NO_MATCH",
                "NO_REFERENCE",
            ],
        );
    },
);

test(
    "cria candidato sanitizado sem embedding ou imagem bruta",
    () => {
        const result =
            createRecognitionCandidate({
                ...candidate(),
                embedding:
                    [
                        0.1,
                        0.2,
                    ],
                rawImage:
                    "nao-deve-sair",
            });

        assert.equal(
            result.collaboratorId,
            "colab-001",
        );

        assert.equal(
            result.confidence,
            0.91,
        );

        assert.equal(
            result.score,
            0.72,
        );

        assert.equal(
            result.referenceVersion,
            "photo-v1",
        );

        assert.equal(
            result.method,
            IDENTITY_METHOD.FACE,
        );

        assert.equal(
            "embedding" in result,
            false,
        );

        assert.equal(
            "rawImage" in result,
            false,
        );

        assert.equal(
            Object.isFrozen(
                result,
            ),
            true,
        );
    },
);

test(
    "rejeita confidence fora do intervalo normalizado",
    () => {
        assert.throws(
            () =>
                createRecognitionCandidate({
                    ...candidate(),
                    confidence:
                        -0.01,
                }),
            /entre 0 e 1/,
        );

        assert.throws(
            () =>
                createRecognitionCandidate({
                    ...candidate(),
                    confidence:
                        1.01,
                }),
            /entre 0 e 1/,
        );
    },
);

test(
    "MATCH exige exatamente um candidato e nao exige fallback",
    () => {
        const result =
            createIdentityResult({
                status:
                    IDENTITY_STATUS.MATCH,
                candidates:
                    [
                        candidate(),
                    ],
                reason:
                    "face_match",
            });

        assert.equal(
            result.status,
            "MATCH",
        );

        assert.equal(
            result.collaboratorId,
            "colab-001",
        );

        assert.equal(
            result.confidence,
            0.91,
        );

        assert.equal(
            result.fallback.required,
            false,
        );

        assert.deepEqual(
            result.fallback.methods,
            [],
        );

        assert.equal(
            Object.isFrozen(
                result,
            ),
            true,
        );
    },
);

test(
    "LOW_CONFIDENCE preserva candidato provavel e exige QR ou manual",
    () => {
        const result =
            createIdentityResult({
                status:
                    IDENTITY_STATUS.LOW_CONFIDENCE,
                candidates:
                    [
                        candidate(
                            "colab-002",
                            0.61,
                        ),
                    ],
            });

        assert.equal(
            result.collaboratorId,
            "colab-002",
        );

        assert.equal(
            result.confidence,
            0.61,
        );

        assert.equal(
            result.fallback.required,
            true,
        );

        assert.deepEqual(
            result.fallback.methods,
            [
                IDENTITY_FALLBACK_METHOD.QR,
                IDENTITY_FALLBACK_METHOD.MANUAL,
            ],
        );
    },
);

test(
    "NO_MATCH nao aceita identidade confirmada e exige fallback",
    () => {
        const result =
            createIdentityResult({
                status:
                    IDENTITY_STATUS.NO_MATCH,
            });

        assert.equal(
            result.collaboratorId,
            null,
        );

        assert.equal(
            result.confidence,
            null,
        );

        assert.equal(
            result.candidates.length,
            0,
        );

        assert.equal(
            result.fallback.required,
            true,
        );
    },
);

test(
    "NO_REFERENCE representa ausencia de referencia fotografica",
    () => {
        const result =
            createIdentityResult({
                status:
                    IDENTITY_STATUS.NO_REFERENCE,
                reason:
                    "reference_photo_missing",
            });

        assert.equal(
            result.status,
            "NO_REFERENCE",
        );

        assert.equal(
            result.collaboratorId,
            null,
        );

        assert.equal(
            result.reason,
            "reference_photo_missing",
        );

        assert.deepEqual(
            result.fallback.methods,
            [
                "QR",
                "MANUAL",
            ],
        );
    },
);

test(
    "AMBIGUOUS exige pelo menos dois colaboradores distintos",
    () => {
        const result =
            createIdentityResult({
                status:
                    IDENTITY_STATUS.AMBIGUOUS,
                candidates:
                    [
                        candidate(
                            "colab-001",
                            0.82,
                        ),
                        candidate(
                            "colab-002",
                            0.81,
                        ),
                    ],
            });

        assert.equal(
            result.collaboratorId,
            null,
        );

        assert.equal(
            result.candidates.length,
            2,
        );

        assert.equal(
            result.fallback.required,
            true,
        );

        assert.throws(
            () =>
                createIdentityResult({
                    status:
                        IDENTITY_STATUS.AMBIGUOUS,
                    candidates:
                        [
                            candidate(
                                "colab-001",
                                0.82,
                            ),
                        ],
                }),
            /pelo menos dois/,
        );

        assert.throws(
            () =>
                createIdentityResult({
                    status:
                        IDENTITY_STATUS.AMBIGUOUS,
                    candidates:
                        [
                            candidate(
                                "colab-001",
                                0.82,
                            ),
                            candidate(
                                "colab-001",
                                0.81,
                            ),
                        ],
                }),
            /distintos/,
        );
    },
);

test(
    "contrato rejeita combinacoes incoerentes de status e candidatos",
    () => {
        assert.throws(
            () =>
                createIdentityResult({
                    status:
                        IDENTITY_STATUS.MATCH,
                    candidates:
                        [],
                }),
            /exatamente um candidato/,
        );

        assert.throws(
            () =>
                createIdentityResult({
                    status:
                        IDENTITY_STATUS.LOW_CONFIDENCE,
                    candidates:
                        [],
                }),
            /exatamente um candidato/,
        );

        assert.throws(
            () =>
                createIdentityResult({
                    status:
                        IDENTITY_STATUS.NO_MATCH,
                    candidates:
                        [
                            candidate(),
                        ],
                }),
            /nao aceita candidatos/,
        );

        assert.throws(
            () =>
                createIdentityResult({
                    status:
                        IDENTITY_STATUS.NO_REFERENCE,
                    candidates:
                        [
                            candidate(),
                        ],
                }),
            /nao aceita candidatos/,
        );
    },
);

test(
    "fallback nao cria decisao de bloqueio e oferece apenas QR e manual",
    () => {
        const fallback =
            createFallbackContract(
                IDENTITY_STATUS.NO_MATCH,
            );

        assert.equal(
            fallback.required,
            true,
        );

        assert.deepEqual(
            fallback.methods,
            [
                IDENTITY_METHOD.QR,
                IDENTITY_METHOD.MANUAL,
            ],
        );

        assert.equal(
            fallback.methods.includes(
                "BLOCK",
            ),
            false,
        );

        assert.equal(
            Object.isFrozen(
                fallback,
            ),
            true,
        );

        assert.equal(
            Object.isFrozen(
                fallback.methods,
            ),
            true,
        );
    },
);
