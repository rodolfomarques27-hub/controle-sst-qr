import test from "node:test";
import assert from "node:assert/strict";

import {
    BIOMETRIC_FRAME_STAGE,
    BIOMETRIC_FRAME_STATUS,
    createBiometricFrameOrchestrator,
} from "../src/identity/biometricFrameOrchestrator.mjs";

const TENANT_ID =
    "11111111-1111-4111-8111-111111111111";

const EMPRESA_ID =
    "22222222-2222-4222-8222-222222222222";

const REQUEST_ID =
    "33333333-3333-4333-8333-333333333333";

const PROFILE_ID =
    "sface-synthetic-profile";

const SYNTHETIC_ALIGNMENT_POLICY =
    Object.freeze({
        paddingRatio:
            0.2,

        minFaceSizePx:
            24,

        minVisibleAreaRatio:
            0.6,

        maxRmsError:
            12,
    });

function createFrame() {
    return {
        data:
            new Uint8Array(
                4 * 4 * 3,
            ),

        width:
            4,

        height:
            4,
    };
}

function createFace(
    score = 0.95,
) {
    return Object.freeze({
        x:
            0,

        y:
            0,

        width:
            4,

        height:
            4,

        score,

        landmarks:
            Object.freeze([
                Object.freeze({
                    x:
                        1,
                    y:
                        1,
                }),

                Object.freeze({
                    x:
                        3,
                    y:
                        1,
                }),

                Object.freeze({
                    x:
                        2,
                    y:
                        2,
                }),

                Object.freeze({
                    x:
                        1,
                    y:
                        3,
                }),

                Object.freeze({
                    x:
                        3,
                    y:
                        3,
                }),
            ]),
    });
}

function createUnitEmbedding() {
    const embedding =
        new Float32Array(
            128,
        );

    embedding[0] =
        1;

    return embedding;
}

function createFixture({
    faces = [
        createFace(),
    ],

    detectionError =
        null,

    alignmentError =
        null,

    embeddingError =
        null,

    identificationError =
        null,

    biometricResult = {
        status:
            "RANKED",

        candidateCount:
            1,

        top1: {
            colaboradorId:
                "44444444-4444-4444-8444-444444444444",

            score:
                0.93,
        },

        top2:
            null,

        margin:
            null,

        fineVerification:
            null,

        thresholds:
            null,

        decision:
            null,
    },
} = {}) {
    const calls = {
        order:
            [],

        detect:
            0,

        align:
            0,

        embed:
            0,

        identify:
            0,

        alignInput:
            null,

        identifyInput:
            null,

        embedding:
            null,
    };

    const detector = {
        async detectBgr() {
            calls.order.push(
                "detect",
            );

            calls.detect +=
                1;

            if (detectionError) {
                throw detectionError;
            }

            return faces;
        },
    };

    function alignFace(
        input,
    ) {
        calls.order.push(
            "align",
        );

        calls.align +=
            1;

        calls.alignInput =
            input;

        if (alignmentError) {
            throw alignmentError;
        }

        return Object.freeze({
            data:
                new Uint8Array(
                    112 * 112 * 3,
                ),

            width:
                112,

            height:
                112,

            format:
                "bgr24",
        });
    }

    const embeddingExtractor = {
        async extractBgr112() {
            calls.order.push(
                "embed",
            );

            calls.embed +=
                1;

            if (embeddingError) {
                throw embeddingError;
            }

            const embedding =
                createUnitEmbedding();

            calls.embedding =
                embedding;

            return embedding;
        },
    };

    const identificationPipeline = {
        async identifySface(
            input,
        ) {
            calls.order.push(
                "identify",
            );

            calls.identify +=
                1;

            calls.identifyInput =
                input;

            if (identificationError) {
                throw identificationError;
            }

            return biometricResult;
        },
    };

    return {
        calls,

        orchestrator:
            createBiometricFrameOrchestrator({
                detector,

                alignFace,

                embeddingExtractor,

                identificationPipeline,

                alignmentPolicy:
                    SYNTHETIC_ALIGNMENT_POLICY,
            }),
    };
}

async function processFixture(
    fixture,
) {
    return fixture.orchestrator.processFrame({
        ...createFrame(),

        tenantId:
            TENANT_ID,

        empresaId:
            EMPRESA_ID,

        profileId:
            PROFILE_ID,

        requestId:
            REQUEST_ID,
    });
}

test(
    "uma face executa deteccao, alinhamento 112, SFace e identificacao exatamente uma vez",
    async () => {
        const fixture =
            createFixture({
                biometricResult: {
                    status:
                        "RANKED",

                    candidateCount:
                        1,

                    top1: {
                        colaboradorId:
                            "44444444-4444-4444-8444-444444444444",

                        score:
                            0.93,

                        embedding:
                            [
                                1,
                                2,
                                3,
                            ],

                        token:
                            "nao-pode-vazar",
                    },

                    top2:
                        null,

                    margin:
                        null,

                    fineVerification:
                        null,

                    thresholds:
                        null,

                    decision:
                        null,

                    privateInternalField:
                        "nao-publicar",
                },
            });

        const result =
            await processFixture(
                fixture,
            );

        assert.equal(
            result.status,
            BIOMETRIC_FRAME_STATUS.BIOMETRIC_RANKING_AVAILABLE,
        );

        assert.deepEqual(
            fixture.calls.order,
            [
                "detect",
                "align",
                "embed",
                "identify",
            ],
        );

        assert.equal(
            fixture.calls.align,
            1,
        );

        assert.equal(
            fixture.calls.embed,
            1,
        );

        assert.equal(
            fixture.calls.identify,
            1,
        );

        assert.equal(
            fixture.calls.alignInput.targetWidth,
            112,
        );

        assert.equal(
            fixture.calls.alignInput.targetHeight,
            112,
        );

        assert.equal(
            fixture.calls.alignInput.templateLandmarks.length,
            5,
        );

        assert.equal(
            fixture.calls.identifyInput.tenantId,
            TENANT_ID,
        );

        assert.equal(
            fixture.calls.identifyInput.empresaId,
            EMPRESA_ID,
        );

        assert.equal(
            fixture.calls.identifyInput.profileId,
            PROFILE_ID,
        );

        assert.equal(
            fixture.calls.identifyInput.requestId,
            REQUEST_ID,
        );

        assert.equal(
            result.biometric.status,
            "RANKED",
        );

        assert.equal(
            result.biometric.top1.score,
            0.93,
        );

        assert.equal(
            Object.hasOwn(
                result,
                "decision",
            ),
            false,
        );

        assert.equal(
            Object.hasOwn(
                result.biometric,
                "privateInternalField",
            ),
            false,
        );

        const serialized =
            JSON.stringify(
                result,
            );

        assert.equal(
            serialized.includes(
                "embedding",
            ),
            false,
        );

        assert.equal(
            serialized.includes(
                "nao-pode-vazar",
            ),
            false,
        );

        assert.ok(
            fixture.calls.embedding.every(
                (
                    value,
                ) =>
                    value ===
                    0,
            ),
        );
    },
);

test(
    "zero faces retorna NO_FACE e interrompe antes de alinhamento, SFace e broker",
    async () => {
        const fixture =
            createFixture({
                faces:
                    [],
            });

        const result =
            await processFixture(
                fixture,
            );

        assert.equal(
            result.status,
            BIOMETRIC_FRAME_STATUS.NO_FACE,
        );

        assert.equal(
            result.faceCount,
            0,
        );

        assert.deepEqual(
            fixture.calls.order,
            [
                "detect",
            ],
        );
    },
);

test(
    "multiplas faces retornam MULTIPLE_FACES sem escolher candidato nem chamar broker",
    async () => {
        const fixture =
            createFixture({
                faces: [
                    createFace(
                        0.99,
                    ),

                    createFace(
                        0.8,
                    ),
                ],
            });

        const result =
            await processFixture(
                fixture,
            );

        assert.equal(
            result.status,
            BIOMETRIC_FRAME_STATUS.MULTIPLE_FACES,
        );

        assert.equal(
            result.faceCount,
            2,
        );

        assert.deepEqual(
            fixture.calls.order,
            [
                "detect",
            ],
        );
    },
);

test(
    "falha YuNet retorna PROCESSING_ERROR em DETECTION sem propagar mensagem",
    async () => {
        const error =
            new Error(
                "segredo-na-mensagem",
            );

        error.code =
            "YUNET_FAILED";

        const fixture =
            createFixture({
                detectionError:
                    error,
            });

        const result =
            await processFixture(
                fixture,
            );

        assert.equal(
            result.status,
            BIOMETRIC_FRAME_STATUS.PROCESSING_ERROR,
        );

        assert.equal(
            result.stage,
            BIOMETRIC_FRAME_STAGE.DETECTION,
        );

        assert.equal(
            result.errorCode,
            "YUNET_FAILED",
        );

        assert.equal(
            JSON.stringify(
                result,
            ).includes(
                "segredo-na-mensagem",
            ),
            false,
        );

        assert.deepEqual(
            fixture.calls.order,
            [
                "detect",
            ],
        );
    },
);

test(
    "falha de alinhamento interrompe antes de SFace e broker",
    async () => {
        const error =
            new Error(
                "face pequena",
            );

        error.code =
            "FACE_TOO_SMALL";

        const fixture =
            createFixture({
                alignmentError:
                    error,
            });

        const result =
            await processFixture(
                fixture,
            );

        assert.equal(
            result.status,
            BIOMETRIC_FRAME_STATUS.PROCESSING_ERROR,
        );

        assert.equal(
            result.stage,
            BIOMETRIC_FRAME_STAGE.ALIGNMENT,
        );

        assert.equal(
            result.errorCode,
            "FACE_TOO_SMALL",
        );

        assert.deepEqual(
            fixture.calls.order,
            [
                "detect",
                "align",
            ],
        );
    },
);

test(
    "falha SFace interrompe antes do broker",
    async () => {
        const fixture =
            createFixture({
                embeddingError:
                    new Error(
                        "falha sintetica",
                    ),
            });

        const result =
            await processFixture(
                fixture,
            );

        assert.equal(
            result.status,
            BIOMETRIC_FRAME_STATUS.PROCESSING_ERROR,
        );

        assert.equal(
            result.stage,
            BIOMETRIC_FRAME_STAGE.EMBEDDING,
        );

        assert.equal(
            result.errorCode,
            "EMBEDDING_FAILED",
        );

        assert.deepEqual(
            fixture.calls.order,
            [
                "detect",
                "align",
                "embed",
            ],
        );
    },
);

test(
    "timeout do broker retorna erro controlado e zera embedding temporario",
    async () => {
        const error =
            new Error(
                "token-super-secreto",
            );

        error.code =
            "BROKER_TIMEOUT";

        const fixture =
            createFixture({
                identificationError:
                    error,
            });

        const result =
            await processFixture(
                fixture,
            );

        assert.equal(
            result.status,
            BIOMETRIC_FRAME_STATUS.PROCESSING_ERROR,
        );

        assert.equal(
            result.stage,
            BIOMETRIC_FRAME_STAGE.IDENTIFICATION,
        );

        assert.equal(
            result.errorCode,
            "BROKER_TIMEOUT",
        );

        assert.equal(
            JSON.stringify(
                result,
            ).includes(
                "token-super-secreto",
            ),
            false,
        );

        assert.ok(
            fixture.calls.embedding.every(
                (
                    value,
                ) =>
                    value ===
                    0,
            ),
        );
    },
);

test(
    "NO_REFERENCE permanece evidencia biometrica e nao vira bloqueio ou liberacao",
    async () => {
        const fixture =
            createFixture({
                biometricResult: {
                    status:
                        "NO_REFERENCE",

                    candidateCount:
                        0,

                    top1:
                        null,

                    top2:
                        null,

                    margin:
                        null,

                    fineVerification:
                        null,

                    thresholds:
                        null,

                    decision:
                        null,
                },
            });

        const result =
            await processFixture(
                fixture,
            );

        assert.equal(
            result.status,
            BIOMETRIC_FRAME_STATUS.NO_REFERENCE,
        );

        assert.equal(
            result.biometric.status,
            "NO_REFERENCE",
        );

        assert.equal(
            Object.hasOwn(
                result,
                "accessDecision",
            ),
            false,
        );
    },
);

test(
    "frame invalido retorna erro INPUT sem acionar o detector",
    async () => {
        const fixture =
            createFixture();

        const result =
            await fixture.orchestrator.processFrame({
                data:
                    new Uint8Array(
                        5,
                    ),

                width:
                    4,

                height:
                    4,

                requestId:
                    REQUEST_ID,
            });

        assert.equal(
            result.status,
            BIOMETRIC_FRAME_STATUS.PROCESSING_ERROR,
        );

        assert.equal(
            result.stage,
            BIOMETRIC_FRAME_STAGE.INPUT,
        );

        assert.equal(
            result.errorCode,
            "INVALID_FRAME",
        );

        assert.deepEqual(
            fixture.calls.order,
            [],
        );
    },
);
