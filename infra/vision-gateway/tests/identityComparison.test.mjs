import test from "node:test";
import assert from "node:assert/strict";

import {
    IDENTITY_COMPARISON_MODE,
    IDENTITY_REFERENCE_STATE,
    compareIdentityEmbeddings,
    createIdentityComparisonProfile,
} from "../src/identity/identityComparison.mjs";

const MODEL_SHA =
    "0BA9FBFA01B5270C96627C4EF784DA859931E02F04419C829E83484087C34E79";

const PROFILE_INPUT =
    Object.freeze({
        modelId:
            "opencv-sface-2021dec",
        modelSha256:
            MODEL_SHA,
        embeddingDim:
            128,
        alignmentVersion:
            "sface-5pt-112-v1",
        preprocessVersion:
            "bgr-rgb-nchw-f32-scale1-mean0-v1",
        normalizationVersion:
            "l2-v1",
    });

const PROFILE =
    createIdentityComparisonProfile(
        PROFILE_INPUT,
    );

const OTHER_PROFILE =
    createIdentityComparisonProfile({
        ...PROFILE_INPUT,
        alignmentVersion:
            "sface-5pt-112-v2",
    });

const THRESHOLDS =
    Object.freeze({
        candidateThreshold:
            0.5,
        matchThreshold:
            0.8,
        ambiguityMargin:
            0.05,
    });

function unitFromScore(
    score,
) {
    if (
        typeof score !==
            "number" ||
        !Number.isFinite(
            score,
        ) ||
        score <
            -1 ||
        score >
            1
    ) {
        throw new TypeError(
            "score sintetico invalido.",
        );
    }

    const embedding =
        new Float32Array(
            128,
        );

    embedding[0] =
        score;

    embedding[1] =
        Math.sqrt(
            Math.max(
                0,
                1 -
                score *
                score,
            ),
        );

    return embedding;
}

function unitFromAngleDegrees(
    degrees,
) {
    const radians =
        degrees *
        Math.PI /
        180;

    const embedding =
        new Float32Array(
            128,
        );

    embedding[0] =
        Math.cos(
            radians,
        );

    embedding[1] =
        Math.sin(
            radians,
        );

    return embedding;
}

function observed() {
    return unitFromScore(
        1,
    );
}

function reference({
    collaboratorId,
    referenceId,
    score,
    profileId =
        PROFILE.profileId,
    state =
        IDENTITY_REFERENCE_STATE.ACTIVE,
    embedding =
        null,
}) {
    return {
        collaboratorId,
        referenceId,
        profileId,
        state,
        embedding:
            embedding ??
            unitFromScore(
                score,
            ),
    };
}

function compare({
    mode =
        IDENTITY_COMPARISON_MODE.IDENTIFICATION,
    references,
    targetCollaboratorId,
    profile =
        PROFILE_INPUT,
    thresholds =
        THRESHOLDS,
    observedEmbedding =
        observed(),
} = {}) {
    return compareIdentityEmbeddings({
        mode,
        profile,
        observedEmbedding,
        references,
        targetCollaboratorId,
        ...thresholds,
    });
}

test(
    "profile gera profileId deterministico com contrato SFace 128-D",
    () => {
        const first =
            createIdentityComparisonProfile(
                PROFILE_INPUT,
            );

        const second =
            createIdentityComparisonProfile(
                PROFILE_INPUT,
            );

        assert.equal(
            first.embeddingDim,
            128,
        );

        assert.equal(
            first.profileId,
            second.profileId,
        );

        assert.match(
            first.profileId,
            /opencv-sface-2021dec/,
        );
    },
);

test(
    "VERIFICATION 1:1 retorna MATCH quando score supera matchThreshold",
    () => {
        const result =
            compare({
                mode:
                    IDENTITY_COMPARISON_MODE.VERIFICATION,
                targetCollaboratorId:
                    "colab-a",
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.9,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "MATCH",
        );

        assert.equal(
            result.collaboratorId,
            "colab-a",
        );

        assert.ok(
            result.score >=
            0.89,
        );

        assert.equal(
            result.confidence,
            null,
        );

        assert.equal(
            "embedding" in result,
            false,
        );
    },
);

test(
    "VERIFICATION 1:1 retorna LOW_CONFIDENCE entre candidate e match",
    () => {
        const result =
            compare({
                mode:
                    IDENTITY_COMPARISON_MODE.VERIFICATION,
                targetCollaboratorId:
                    "colab-a",
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.7,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "LOW_CONFIDENCE",
        );

        assert.equal(
            result.collaboratorId,
            "colab-a",
        );
    },
);

test(
    "VERIFICATION 1:1 retorna NO_MATCH abaixo de candidateThreshold",
    () => {
        const result =
            compare({
                mode:
                    IDENTITY_COMPARISON_MODE.VERIFICATION,
                targetCollaboratorId:
                    "colab-a",
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.3,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "NO_MATCH",
        );

        assert.equal(
            result.collaboratorId,
            null,
        );
    },
);

test(
    "IDENTIFICATION 1:N retorna MATCH com top1 acima do match e margem suficiente",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.9,
                        }),
                        reference({
                            collaboratorId:
                                "colab-b",
                            referenceId:
                                "ref-b1",
                            score:
                                0.6,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "MATCH",
        );

        assert.equal(
            result.collaboratorId,
            "colab-a",
        );

        assert.ok(
            result.runnerUpScore >=
            0.59,
        );

        assert.ok(
            result.margin >
            0.05,
        );
    },
);

test(
    "IDENTIFICATION retorna LOW_CONFIDENCE para unico candidato plausivel abaixo do match",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.7,
                        }),
                        reference({
                            collaboratorId:
                                "colab-b",
                            referenceId:
                                "ref-b1",
                            score:
                                0.3,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "LOW_CONFIDENCE",
        );

        assert.equal(
            result.collaboratorId,
            "colab-a",
        );
    },
);

test(
    "IDENTIFICATION retorna NO_MATCH quando nenhuma referencia atinge candidateThreshold",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.4,
                        }),
                        reference({
                            collaboratorId:
                                "colab-b",
                            referenceId:
                                "ref-b1",
                            score:
                                0.2,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "NO_MATCH",
        );

        assert.equal(
            result.collaboratorId,
            null,
        );
    },
);

test(
    "sem referencia ACTIVE compativel retorna NO_REFERENCE",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                1,
                            state:
                                IDENTITY_REFERENCE_STATE.REVOKED,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "NO_REFERENCE",
        );

        assert.equal(
            result.score,
            null,
        );
    },
);

test(
    "profile incompativel nunca e comparado e resulta NO_REFERENCE quando isolado",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                1,
                            profileId:
                                OTHER_PROFILE.profileId,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "NO_REFERENCE",
        );
    },
);

test(
    "referencia REVOKED e ignorada mesmo quando teria score maior",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.9,
                        }),
                        reference({
                            collaboratorId:
                                "colab-b",
                            referenceId:
                                "ref-b1",
                            score:
                                1,
                            state:
                                IDENTITY_REFERENCE_STATE.REVOKED,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "MATCH",
        );

        assert.equal(
            result.collaboratorId,
            "colab-a",
        );
    },
);

test(
    "multiplas referencias do mesmo colaborador sao agregadas por centroid L2",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            embedding:
                                unitFromAngleDegrees(
                                    20,
                                ),
                        }),
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a2",
                            embedding:
                                unitFromAngleDegrees(
                                    -20,
                                ),
                        }),
                        reference({
                            collaboratorId:
                                "colab-b",
                            referenceId:
                                "ref-b1",
                            score:
                                0.2,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "MATCH",
        );

        assert.equal(
            result.collaboratorId,
            "colab-a",
        );

        assert.ok(
            result.score >
            0.99999,
        );
    },
);

test(
    "dois candidatos plausiveis sem margem suficiente retornam AMBIGUOUS",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.9,
                        }),
                        reference({
                            collaboratorId:
                                "colab-b",
                            referenceId:
                                "ref-b1",
                            score:
                                0.88,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "AMBIGUOUS",
        );

        assert.equal(
            result.collaboratorId,
            null,
        );

        assert.ok(
            result.margin <=
            THRESHOLDS.ambiguityMargin,
        );
    },
);

test(
    "empate exato entre candidatos plausiveis retorna AMBIGUOUS deterministicamente",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-b",
                            referenceId:
                                "ref-b1",
                            score:
                                0.9,
                        }),
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.9,
                        }),
                    ],
                thresholds: {
                    ...THRESHOLDS,
                    ambiguityMargin:
                        0,
                },
            });

        assert.equal(
            result.status,
            "AMBIGUOUS",
        );

        assert.ok(
            Math.abs(
                result.margin,
            ) <
            1e-7,
        );
    },
);

test(
    "margem suficiente permite MATCH mesmo com segundo candidato plausivel",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.92,
                        }),
                        reference({
                            collaboratorId:
                                "colab-b",
                            referenceId:
                                "ref-b1",
                            score:
                                0.7,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "MATCH",
        );

        assert.equal(
            result.collaboratorId,
            "colab-a",
        );

        assert.ok(
            result.margin >
            THRESHOLDS.ambiguityMargin,
        );
    },
);

test(
    "VERIFICATION exige targetCollaboratorId e nao usa referencias de outro colaborador",
    () => {
        assert.throws(
            () =>
                compare({
                    mode:
                        IDENTITY_COMPARISON_MODE.VERIFICATION,
                    references:
                        [],
                    targetCollaboratorId:
                        undefined,
                }),
            /colaborador\.id/,
        );

        const result =
            compare({
                mode:
                    IDENTITY_COMPARISON_MODE.VERIFICATION,
                targetCollaboratorId:
                    "colab-a",
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-b",
                            referenceId:
                                "ref-b1",
                            score:
                                1,
                        }),
                    ],
            });

        assert.equal(
            result.status,
            "NO_REFERENCE",
        );
    },
);

test(
    "embedding com tamanho invalido e rejeitado",
    () => {
        assert.throws(
            () =>
                compare({
                    references:
                        [],
                    observedEmbedding:
                        new Float32Array(
                            127,
                        ),
                }),
            /128/,
        );
    },
);

test(
    "embedding com valor nao finito e rejeitado",
    () => {
        const invalid =
            observed();

        invalid[5] =
            Number.NaN;

        assert.throws(
            () =>
                compare({
                    references:
                        [],
                    observedEmbedding:
                        invalid,
                }),
            /finito/,
        );
    },
);

test(
    "embedding que nao esta L2-normalizado e rejeitado",
    () => {
        const invalid =
            new Float32Array(
                128,
            );

        invalid[0] =
            2;

        assert.throws(
            () =>
                compare({
                    references:
                        [],
                    observedEmbedding:
                        invalid,
                }),
            /L2-normalizado/,
        );
    },
);

test(
    "thresholds nao possuem defaults implicitos",
    () => {
        assert.throws(
            () =>
                compareIdentityEmbeddings({
                    mode:
                        IDENTITY_COMPARISON_MODE.IDENTIFICATION,
                    profile:
                        PROFILE_INPUT,
                    observedEmbedding:
                        observed(),
                    references:
                        [],
                }),
            /candidateThreshold/,
        );

        assert.throws(
            () =>
                compareIdentityEmbeddings({
                    mode:
                        IDENTITY_COMPARISON_MODE.IDENTIFICATION,
                    profile:
                        PROFILE_INPUT,
                    observedEmbedding:
                        observed(),
                    references:
                        [],
                    candidateThreshold:
                        0.5,
                    matchThreshold:
                        0.8,
                }),
            /ambiguityMargin/,
        );
    },
);

test(
    "candidateThreshold maior que matchThreshold e rejeitado",
    () => {
        assert.throws(
            () =>
                compare({
                    references:
                        [],
                    thresholds: {
                        candidateThreshold:
                            0.9,
                        matchThreshold:
                            0.8,
                        ambiguityMargin:
                            0.05,
                    },
                }),
            /nao pode ser maior/,
        );
    },
);

test(
    "referenceId duplicado e rejeitado para impedir peso duplicado no centroid",
    () => {
        assert.throws(
            () =>
                compare({
                    references:
                        [
                            reference({
                                collaboratorId:
                                    "colab-a",
                                referenceId:
                                    "ref-dup",
                                score:
                                    0.9,
                            }),
                            reference({
                                collaboratorId:
                                    "colab-a",
                                referenceId:
                                    "ref-dup",
                                score:
                                    0.8,
                            }),
                        ],
                }),
            /duplicado/,
        );
    },
);

test(
    "resultado tecnico nao expoe embedding e mantem confidence null",
    () => {
        const result =
            compare({
                references:
                    [
                        reference({
                            collaboratorId:
                                "colab-a",
                            referenceId:
                                "ref-a1",
                            score:
                                0.9,
                        }),
                    ],
            });

        assert.deepEqual(
            Object.keys(
                result,
            ).sort(),
            [
                "collaboratorId",
                "confidence",
                "margin",
                "mode",
                "profileId",
                "reason",
                "runnerUpScore",
                "score",
                "status",
            ].sort(),
        );

        assert.equal(
            result.confidence,
            null,
        );
    },
);
