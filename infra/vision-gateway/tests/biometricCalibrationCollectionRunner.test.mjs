import test from "node:test";
import assert from "node:assert/strict";

import {
    createBiometricCalibrationCollectionRunner,
} from "../src/identity/biometricCalibrationCollectionRunner.mjs";

const PROTOCOL_VERSION =
    "r7f-v1";

const PROFILE_ID =
    "sface-profile-v1";

const ENVIRONMENT_ID =
    "environment-lab";

const DATASET_VERSION =
    "calibration-dataset-v1";

const ALIGNMENT_POLICY =
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

const CAL_PARTICIPANTS =
    [
        "cal-p01",
        "cal-p02",
        "cal-p03",
    ];

const EVAL_PARTICIPANTS =
    [
        "eval-p01",
        "eval-p02",
        "eval-p03",
    ];

function sessionId(
    participantId,
) {
    return `session-${participantId}`;
}

function enrollmentId(
    participantId,
    index,
) {
    return `${participantId}-enroll-${String(index).padStart(2, "0")}`;
}

function probeId(
    participantId,
) {
    return `${participantId}-probe-01`;
}

function participant(
    participantId,
) {
    return {
        participantId,

        sessions: [
            {
                sessionId:
                    sessionId(
                        participantId,
                    ),

                samples: [
                    {
                        sampleId:
                            enrollmentId(
                                participantId,
                                1,
                            ),

                        profileId:
                            PROFILE_ID,

                        role:
                            "ENROLLMENT",

                        captureConditionId:
                            "condition-a",
                    },
                    {
                        sampleId:
                            enrollmentId(
                                participantId,
                                2,
                            ),

                        profileId:
                            PROFILE_ID,

                        role:
                            "ENROLLMENT",

                        captureConditionId:
                            "condition-b",
                    },
                    {
                        sampleId:
                            enrollmentId(
                                participantId,
                                3,
                            ),

                        profileId:
                            PROFILE_ID,

                        role:
                            "ENROLLMENT",

                        captureConditionId:
                            "condition-a",
                    },
                    {
                        sampleId:
                            probeId(
                                participantId,
                            ),

                        profileId:
                            PROFILE_ID,

                        role:
                            "PROBE",

                        captureConditionId:
                            participantId.endsWith(
                                "02",
                            )
                                ? "condition-a"
                                : "condition-b",
                    },
                ],
            },
        ],
    };
}

function controlledStudyContract() {
    return {
        protocolVersion:
            PROTOCOL_VERSION,

        profileId:
            PROFILE_ID,

        calibration: {
            datasetVersion:
                DATASET_VERSION,

            protocolVersion:
                PROTOCOL_VERSION,

            profileId:
                PROFILE_ID,

            environmentId:
                ENVIRONMENT_ID,

            deviceIds: [
                "device-a",
                "device-b",
            ],

            captureConditionIds: [
                "condition-a",
                "condition-b",
            ],

            participantIds:
                [
                    ...CAL_PARTICIPANTS,
                ],

            sessionIds:
                CAL_PARTICIPANTS.map(
                    sessionId,
                ),

            plannedCounts: {
                genuineComparisons:
                    1,

                impostorComparisons:
                    1,

                matedSearches:
                    1,

                nonMatedSearches:
                    1,
            },
        },

        evaluation: {
            datasetVersion:
                "evaluation-dataset-v1",

            protocolVersion:
                PROTOCOL_VERSION,

            profileId:
                PROFILE_ID,

            environmentId:
                ENVIRONMENT_ID,

            deviceIds: [
                "device-a",
                "device-b",
            ],

            captureConditionIds: [
                "condition-a",
                "condition-b",
            ],

            participantIds:
                [
                    ...EVAL_PARTICIPANTS,
                ],

            sessionIds:
                EVAL_PARTICIPANTS.map(
                    sessionId,
                ),

            plannedCounts: {
                genuineComparisons:
                    1,

                impostorComparisons:
                    1,

                matedSearches:
                    1,

                nonMatedSearches:
                    1,
            },
        },

        analysisPolicy: {
            thresholdGrid: [
                0.2,
                0.4,
                0.6,
                0.8,
            ],

            percentilePoints: [
                0,
                0.5,
                0.95,
                1,
            ],

            minimumSampleCounts: {
                genuineComparisons:
                    1,

                impostorComparisons:
                    1,

                matedSearches:
                    1,

                nonMatedSearches:
                    1,
            },
        },

        acceptancePolicy: {
            maxFmr:
                0.1,

            maxFnmr:
                0.1,

            maxFpir:
                0.1,

            maxFnir:
                0.1,

            minimumEvaluationParticipants:
                3,

            minimumGenuineComparisons:
                1,

            minimumImpostorComparisons:
                1,

            minimumMatedSearches:
                1,

            minimumNonMatedSearches:
                1,
        },
    };
}

function collectionPlan() {
    return {
        protocolVersion:
            PROTOCOL_VERSION,

        profileId:
            PROFILE_ID,

        plannedParticipantCount:
            6,

        sessionsPerParticipant:
            1,

        samplesPerSession:
            4,

        plannedGallerySize:
            2,

        captureConditionCatalog: [
            {
                id:
                    "condition-a",

                lighting:
                    "controlled-bright",

                distanceBand:
                    "near",

                pose:
                    "frontal",

                glasses:
                    false,

                ppe:
                    [],

                deviceId:
                    "device-a",

                environmentId:
                    ENVIRONMENT_ID,
            },
            {
                id:
                    "condition-b",

                lighting:
                    "controlled-dim",

                distanceBand:
                    "mid",

                pose:
                    "slight-yaw",

                glasses:
                    true,

                ppe: [
                    "helmet",
                ],

                deviceId:
                    "device-b",

                environmentId:
                    ENVIRONMENT_ID,
            },
        ],

        participants: [
            ...CAL_PARTICIPANTS.map(
                participant,
            ),

            ...EVAL_PARTICIPANTS.map(
                participant,
            ),
        ],

        calibrationParticipantIds:
            [
                ...CAL_PARTICIPANTS,
            ],

        evaluationParticipantIds:
            [
                ...EVAL_PARTICIPANTS,
            ],

        verificationComparisons: [
            {
                comparisonId:
                    "comparison-cal-genuine",

                split:
                    "CALIBRATION",

                label:
                    "GENUINE",

                enrollmentSampleId:
                    enrollmentId(
                        "cal-p01",
                        1,
                    ),

                probeSampleId:
                    probeId(
                        "cal-p01",
                    ),
            },
            {
                comparisonId:
                    "comparison-cal-impostor",

                split:
                    "CALIBRATION",

                label:
                    "IMPOSTOR",

                enrollmentSampleId:
                    enrollmentId(
                        "cal-p01",
                        1,
                    ),

                probeSampleId:
                    probeId(
                        "cal-p02",
                    ),
            },
            {
                comparisonId:
                    "comparison-eval-genuine",

                split:
                    "EVALUATION",

                label:
                    "GENUINE",

                enrollmentSampleId:
                    enrollmentId(
                        "eval-p01",
                        1,
                    ),

                probeSampleId:
                    probeId(
                        "eval-p01",
                    ),
            },
            {
                comparisonId:
                    "comparison-eval-impostor",

                split:
                    "EVALUATION",

                label:
                    "IMPOSTOR",

                enrollmentSampleId:
                    enrollmentId(
                        "eval-p01",
                        1,
                    ),

                probeSampleId:
                    probeId(
                        "eval-p02",
                    ),
            },
        ],

        identificationSearches: [
            {
                searchId:
                    "search-cal-mated",

                split:
                    "CALIBRATION",

                kind:
                    "MATED",

                probeSampleId:
                    probeId(
                        "cal-p01",
                    ),

                galleryParticipantIds: [
                    "cal-p01",
                    "cal-p02",
                ],

                mateParticipantId:
                    "cal-p01",
            },
            {
                searchId:
                    "search-cal-nonmated",

                split:
                    "CALIBRATION",

                kind:
                    "NON_MATED",

                probeSampleId:
                    probeId(
                        "cal-p03",
                    ),

                galleryParticipantIds: [
                    "cal-p01",
                    "cal-p02",
                ],
            },
            {
                searchId:
                    "search-eval-mated",

                split:
                    "EVALUATION",

                kind:
                    "MATED",

                probeSampleId:
                    probeId(
                        "eval-p01",
                    ),

                galleryParticipantIds: [
                    "eval-p01",
                    "eval-p02",
                ],

                mateParticipantId:
                    "eval-p01",
            },
            {
                searchId:
                    "search-eval-nonmated",

                split:
                    "EVALUATION",

                kind:
                    "NON_MATED",

                probeSampleId:
                    probeId(
                        "eval-p03",
                    ),

                galleryParticipantIds: [
                    "eval-p01",
                    "eval-p02",
                ],
            },
        ],

        policies: {
            enrollmentProbeSeparationRequired:
                true,

            disjointCalibrationEvaluationRequired:
                true,

            requireMatedSearches:
                true,

            requireNonMatedSearches:
                true,
        },

        sufficiencyCriteria: {
            minimumParticipants:
                6,

            minimumSessionsPerParticipant:
                1,

            minimumSamplesPerSession:
                4,

            minimumGenuineComparisons:
                1,

            minimumImpostorComparisons:
                1,

            minimumMatedSearches:
                1,

            minimumNonMatedSearches:
                1,

            minimumGallerySize:
                2,

            minimumSamplesPerCondition:
                1,
        },
    };
}

function scoringProtocol() {
    return {
        profileId:
            PROFILE_ID,

        verificationReferenceAggregation:
            "PARTICIPANT_ENROLLMENT_CENTROID",

        identificationReferenceAggregation:
            "PARTICIPANT_ENROLLMENT_CENTROID",

        minimumEnrollmentReferencesPerParticipant:
            3,

        maximumEnrollmentReferencesPerParticipant:
            5,

        embeddingRetention:
            "MEMORY_ONLY",

        persistedArtifacts:
            "EXECUTION_MANIFEST_AND_R7C_DATASET",
    };
}

function makeClock() {
    let index =
        0;

    return () => {
        const value =
            new Date(
                Date.UTC(
                    2026,
                    9,
                    13,
                    12,
                    index,
                    0,
                    0,
                ),
            ).toISOString();

        index +=
            1;

        return value;
    };
}

function unitEmbedding(
    index,
) {
    const result =
        new Float32Array(
            128,
        );

    result[index] =
        1;

    return result;
}

function createFrame(
    code,
) {
    const frame =
        new Uint8Array(
            4 *
            4 *
            3,
        );

    frame[0] =
        code;

    return frame;
}

function participantCode(
    participantId,
) {
    if (
        participantId ===
        "cal-p01"
    ) {
        return 0;
    }

    if (
        participantId ===
        "cal-p02"
    ) {
        return 1;
    }

    return 2;
}



function createHarness({
    contract =
        controlledStudyContract(),

    plan =
        collectionPlan(),

    protocol =
        scoringProtocol(),
} = {}) {
    const queues =
        new Map([
            [
                "device-a",
                [],
            ],
            [
                "device-b",
                [],
            ],
        ]);

    const sourceCalls =
        [];

    const frames =
        [];

    const alignedBuffers =
        [];

    const embeddings =
        [];

    let sourceStartCalls =
        0;

    let sourceStopCalls =
        0;

    let detectorMode =
        "ONE_FACE";

    let alignmentMode =
        "OK";

    let embeddingMode =
        "OK";

    const sources =
        new Map();

    for (
        const deviceId of
        [
            "device-a",
            "device-b",
        ]
    ) {
        sources.set(
            deviceId,
            {
                snapshot() {
                    return {
                        frames: {
                            format:
                                "bgr24",

                            width:
                                4,

                            height:
                                4,
                        },
                    };
                },

                takeLatestFrame() {
                    return (
                        queues
                            .get(
                                deviceId,
                            )
                            .shift() ??
                        null
                    );
                },

                start() {
                    sourceStartCalls +=
                        1;
                },

                stop() {
                    sourceStopCalls +=
                        1;
                },
            },
        );
    }

    const detector =
        {
            async detectBgr() {
                if (
                    detectorMode ===
                    "ERROR"
                ) {
                    throw new Error(
                        "synthetic detector error",
                    );
                }

                if (
                    detectorMode ===
                    "NO_FACE"
                ) {
                    return [];
                }

                if (
                    detectorMode ===
                    "MULTIPLE"
                ) {
                    return [
                        {},
                        {},
                    ];
                }

                return [
                    {},
                ];
            },
        };

    async function alignFace({
        data,
    }) {
        if (
            alignmentMode ===
            "ERROR"
        ) {
            throw new Error(
                "synthetic alignment error",
            );
        }

        const aligned =
            new Uint8Array(
                112 *
                112 *
                3,
            );

        aligned[0] =
            data[0];

        alignedBuffers.push(
            aligned,
        );

        return {
            data:
                aligned,

            width:
                112,

            height:
                112,

            format:
                "bgr24",
        };
    }

    const embeddingExtractor =
        {
            async extractBgr112({
                data,
            }) {
                if (
                    embeddingMode ===
                    "ERROR"
                ) {
                    throw new Error(
                        "synthetic embedding error",
                    );
                }

                if (
                    embeddingMode ===
                    "INVALID"
                ) {
                    return new Float32Array(
                        128,
                    );
                }

                const embedding =
                    unitEmbedding(
                        data[0],
                    );

                embeddings.push(
                    embedding,
                );

                return embedding;
            },
        };

    const runner =
        createBiometricCalibrationCollectionRunner({
            controlledStudyContract:
                contract,

            collectionPlan:
                plan,

            scoringProtocol:
                protocol,

            async resolveCaptureSource(
                deviceId,
            ) {
                sourceCalls.push(
                    deviceId,
                );

                return sources.get(
                    deviceId,
                );
            },

            detector,
            alignFace,
            embeddingExtractor,

            alignmentPolicy:
                ALIGNMENT_POLICY,

            now:
                makeClock(),
        });

    function enqueue(
        deviceId,
        frame,
    ) {
        queues
            .get(
                deviceId,
            )
            .push(
                frame,
            );

        frames.push(
            frame,
        );
    }

    return {
        runner,
        plan,
        sources,
        sourceCalls,
        frames,
        alignedBuffers,
        embeddings,
        enqueue,

        setDetectorMode(
            value,
        ) {
            detectorMode =
                value;
        },

        setAlignmentMode(
            value,
        ) {
            alignmentMode =
                value;
        },

        setEmbeddingMode(
            value,
        ) {
            embeddingMode =
                value;
        },

        sourceStartCalls() {
            return sourceStartCalls;
        },

        sourceStopCalls() {
            return sourceStopCalls;
        },
    };
}

function conditionDevice(
    plan,
    conditionId,
) {
    return plan
        .captureConditionCatalog
        .find(
            (
                item,
            ) =>
                item.id ===
                conditionId,
        )
        .deviceId;
}

async function captureWholeCalibration(
    harness,
) {
    for (
        const participant of
        harness.plan.participants
    ) {
        if (
            !CAL_PARTICIPANTS.includes(
                participant.participantId,
            )
        ) {
            continue;
        }

        for (
            const session of
            participant.sessions
        ) {
            harness.runner.startSession(
                session.sessionId,
            );

            for (
                const sample of
                session.samples
            ) {
                const deviceId =
                    conditionDevice(
                        harness.plan,
                        sample.captureConditionId,
                    );

                harness.enqueue(
                    deviceId,
                    createFrame(
                        participantCode(
                            participant.participantId,
                        ),
                    ),
                );

                const result =
                    await harness.runner.captureSample(
                        sample.sampleId,
                    );

                assert.equal(
                    result.accepted,
                    true,
                );
            }

            harness.runner.completeSession();
        }
    }
}

test(
    "preflight valido inicia runner READY sem consumir fonte",
    () => {
        const harness =
            createHarness();

        assert.deepEqual(
            harness.runner.snapshot(),
            {
                state:
                    "READY",

                preflightReady:
                    true,

                activeSession:
                    false,

                totalSessions:
                    3,

                completedSessions:
                    0,

                totalSamples:
                    12,

                capturedSamples:
                    0,

                remainingSamples:
                    12,
            },
        );

        assert.deepEqual(
            harness.sourceCalls,
            [],
        );
    },
);

test(
    "R7F valido mas nao ready bloqueia o preflight",
    () => {
        const contract =
            controlledStudyContract();

        contract.acceptancePolicy.minimumEvaluationParticipants =
            10;

        assert.throws(
            () =>
                createHarness({
                    contract,
                }),
            (
                error,
            ) =>
                error.code ===
                "CONTRACT_NOT_READY",
        );
    },
);

test(
    "profileId de scoring divergente bloqueia o preflight",
    () => {
        const protocol =
            scoringProtocol();

        protocol.profileId =
            "other-profile";

        assert.throws(
            () =>
                createHarness({
                    protocol,
                }),
            (
                error,
            ) =>
                error.code ===
                "PREFLIGHT_PROFILE_INCOMPATIBLE",
        );
    },
);

test(
    "preflight rejeita participante de referencia com menos de 3 ENROLLMENT",
    () => {
        const plan =
            collectionPlan();

        for (
            const participantItem of
            plan.participants
        ) {
            participantItem
                .sessions[0]
                .samples
                .splice(
                    2,
                    1,
                );
        }

        plan.samplesPerSession =
            3;

        plan.sufficiencyCriteria.minimumSamplesPerSession =
            3;

        assert.throws(
            () =>
                createHarness({
                    plan,
                }),
            (
                error,
            ) =>
                error.code ===
                "PREFLIGHT_ENROLLMENT_REFERENCE_COUNT_INVALID",
        );
    },
);

test(
    "startSession rejeita sessao EVALUATION",
    () => {
        const harness =
            createHarness();

        assert.throws(
            () =>
                harness.runner.startSession(
                    "session-eval-p01",
                ),
            (
                error,
            ) =>
                error.code ===
                "EVALUATION_SESSION_REJECTED",
        );
    },
);

test(
    "runner permite apenas uma sessao CALIBRATION ativa",
    () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        assert.throws(
            () =>
                harness.runner.startSession(
                    "session-cal-p02",
                ),
            (
                error,
            ) =>
                error.code ===
                "SESSION_ALREADY_ACTIVE",
        );
    },
);

test(
    "captureSample rejeita sample EVALUATION",
    async () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        await assert.rejects(
            async () =>
                harness.runner.captureSample(
                    "eval-p01-probe-01",
                ),
            (
                error,
            ) =>
                error.code ===
                "EVALUATION_SAMPLE_REJECTED",
        );
    },
);

test(
    "captureSample resolve somente o device planejado e nao chama start ou stop",
    async () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.equal(
            result.accepted,
            true,
        );

        assert.deepEqual(
            harness.sourceCalls,
            [
                "device-a",
            ],
        );

        assert.equal(
            harness.sourceStartCalls(),
            0,
        );

        assert.equal(
            harness.sourceStopCalls(),
            0,
        );
    },
);

test(
    "fila sem frame retorna FRAME_UNAVAILABLE e nao avanca sample",
    async () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.deepEqual(
            result,
            {
                accepted:
                    false,

                status:
                    "FRAME_UNAVAILABLE",
            },
        );

        assert.equal(
            harness.runner.snapshot()
                .capturedSamples,
            0,
        );
    },
);

test(
    "frame BGR com tamanho invalido e rejeitado sem avancar sample",
    async () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        const frame =
            new Uint8Array(
                5,
            );

        harness.enqueue(
            "device-a",
            frame,
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.equal(
            result.status,
            "INVALID_FRAME",
        );

        assert.equal(
            harness.runner.snapshot()
                .capturedSamples,
            0,
        );

        assert.ok(
            frame.every(
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
    "zero faces retorna NO_FACE",
    async () => {
        const harness =
            createHarness();

        harness.setDetectorMode(
            "NO_FACE",
        );

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.equal(
            result.status,
            "NO_FACE",
        );

        assert.equal(
            harness.runner.snapshot()
                .capturedSamples,
            0,
        );
    },
);

test(
    "multiplas faces retorna MULTIPLE_FACES",
    async () => {
        const harness =
            createHarness();

        harness.setDetectorMode(
            "MULTIPLE",
        );

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.equal(
            result.status,
            "MULTIPLE_FACES",
        );
    },
);

test(
    "erro de detector retorna DETECTION_FAILED",
    async () => {
        const harness =
            createHarness();

        harness.setDetectorMode(
            "ERROR",
        );

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.equal(
            result.status,
            "DETECTION_FAILED",
        );
    },
);

test(
    "erro de alinhamento retorna ALIGNMENT_FAILED",
    async () => {
        const harness =
            createHarness();

        harness.setAlignmentMode(
            "ERROR",
        );

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.equal(
            result.status,
            "ALIGNMENT_FAILED",
        );
    },
);

test(
    "erro de embedding retorna EMBEDDING_FAILED",
    async () => {
        const harness =
            createHarness();

        harness.setEmbeddingMode(
            "ERROR",
        );

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.equal(
            result.status,
            "EMBEDDING_FAILED",
        );
    },
);

test(
    "embedding invalido retorna EMBEDDING_FAILED sem aceitar sample",
    async () => {
        const harness =
            createHarness();

        harness.setEmbeddingMode(
            "INVALID",
        );

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.equal(
            result.status,
            "EMBEDDING_FAILED",
        );

        assert.equal(
            harness.runner.snapshot()
                .capturedSamples,
            0,
        );
    },
);

test(
    "sample aceita nao pode ser recapturada",
    async () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        await harness.runner.captureSample(
            "cal-p01-enroll-01",
        );

        await assert.rejects(
            async () =>
                harness.runner.captureSample(
                    "cal-p01-enroll-01",
                ),
            (
                error,
            ) =>
                error.code ===
                "SAMPLE_ALREADY_CAPTURED",
        );
    },
);

test(
    "sessao nao pode ser concluida com samples pendentes",
    () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        assert.throws(
            () =>
                harness.runner.completeSession(),
            (
                error,
            ) =>
                error.code ===
                "SESSION_SAMPLES_INCOMPLETE",
        );
    },
);

test(
    "resultado de captura aceita nao expoe score embedding frame ou crop",
    async () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.deepEqual(
            Object.keys(
                result,
            ),
            [
                "accepted",
                "status",
            ],
        );

        const serialized =
            JSON.stringify(
                result,
            ).toLowerCase();

        for (
            const forbidden of
            [
                "score",
                "embedding",
                "frame",
                "crop",
                "threshold",
            ]
        ) {
            assert.equal(
                serialized.includes(
                    forbidden,
                ),
                false,
            );
        }
    },
);

test(
    "frame crop alinhado e embedding observado sao zerados apos captura",
    async () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        const frame =
            createFrame(
                0,
            );

        harness.enqueue(
            "device-a",
            frame,
        );

        const result =
            await harness.runner.captureSample(
                "cal-p01-enroll-01",
            );

        assert.equal(
            result.accepted,
            true,
        );

        assert.ok(
            frame.every(
                (
                    value,
                ) =>
                    value ===
                    0,
            ),
        );

        assert.ok(
            harness
                .alignedBuffers[0]
                .every(
                    (
                        value,
                    ) =>
                        value ===
                        0,
                ),
        );

        assert.ok(
            harness
                .embeddings[0]
                .every(
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
    "abort limpa coleta e impede finalize",
    async () => {
        const harness =
            createHarness();

        harness.runner.startSession(
            "session-cal-p01",
        );

        harness.enqueue(
            "device-a",
            createFrame(
                0,
            ),
        );

        await harness.runner.captureSample(
            "cal-p01-enroll-01",
        );

        assert.equal(
            harness.runner.abort(),
            true,
        );

        assert.deepEqual(
            harness.runner.snapshot(),
            {
                state:
                    "ABORTED",

                preflightReady:
                    true,

                activeSession:
                    false,

                totalSessions:
                    3,

                completedSessions:
                    0,

                totalSamples:
                    12,

                capturedSamples:
                    0,

                remainingSamples:
                    12,
            },
        );

        assert.throws(
            () =>
                harness.runner.finalize(),
            (
                error,
            ) =>
                error.code ===
                "RUNNER_NOT_MUTABLE",
        );
    },
);

test(
    "finalize rejeita coleta incompleta",
    () => {
        const harness =
            createHarness();

        assert.throws(
            () =>
                harness.runner.finalize(),
            (
                error,
            ) =>
                error.code ===
                "FINALIZE_COLLECTION_INCOMPLETE",
        );
    },
);

test(
    "coleta completa gera Manifest R7C e fica readyForCalibrationAnalysis",
    async () => {
        const harness =
            createHarness();

        await captureWholeCalibration(
            harness,
        );

        assert.equal(
            harness.runner.snapshot()
                .state,
            "COLLECTION_COMPLETE",
        );

        const result =
            harness.runner.finalize();

        assert.equal(
            result.executionManifest.phase,
            "CALIBRATION",
        );

        assert.equal(
            result.executionManifest
                .participants
                .length,
            3,
        );

        assert.equal(
            result.calibrationDataset
                .records
                .length,
            4,
        );

        assert.equal(
            result.validationSummary
                .readyForCalibrationAnalysis,
            true,
        );

        assert.equal(
            harness.runner.snapshot()
                .state,
            "FINALIZED",
        );
    },
);

test(
    "records R7C usam capturedAt da probe correspondente",
    async () => {
        const harness =
            createHarness();

        await captureWholeCalibration(
            harness,
        );

        const result =
            harness.runner.finalize();

        const manifestProbe =
            result.executionManifest
                .participants
                .find(
                    (
                        participantItem,
                    ) =>
                        participantItem.participantId ===
                        "cal-p01",
                )
                .sessions[0]
                .samples
                .find(
                    (
                        sample,
                    ) =>
                        sample.sampleId ===
                        "cal-p01-probe-01",
                );

        const verification =
            result.calibrationDataset
                .records
                .find(
                    (
                        record,
                    ) =>
                        record.comparisonId ===
                        "comparison-cal-genuine",
                );

        const identification =
            result.calibrationDataset
                .records
                .find(
                    (
                        record,
                    ) =>
                        record.searchId ===
                        "search-cal-mated",
                );

        assert.equal(
            verification.timestamp,
            manifestProbe.capturedAt,
        );

        assert.equal(
            identification.timestamp,
            manifestProbe.capturedAt,
        );

        assert.ok(
            Date.parse(
                result.calibrationDataset
                    .createdAt,
            ) >=
            Date.parse(
                identification.timestamp,
            ),
        );
    },
);

test(
    "scores finais reproduzem centroides sem thresholds e artefatos nao contem embedding frame ou crop",
    async () => {
        const harness =
            createHarness();

        await captureWholeCalibration(
            harness,
        );

        const result =
            harness.runner.finalize();

        const genuine =
            result.calibrationDataset
                .records
                .find(
                    (
                        record,
                    ) =>
                        record.comparisonId ===
                        "comparison-cal-genuine",
                );

        const impostor =
            result.calibrationDataset
                .records
                .find(
                    (
                        record,
                    ) =>
                        record.comparisonId ===
                        "comparison-cal-impostor",
                );

        const mated =
            result.calibrationDataset
                .records
                .find(
                    (
                        record,
                    ) =>
                        record.searchId ===
                        "search-cal-mated",
                );

        assert.ok(
            Math.abs(
                genuine.score -
                1
            ) <
            1e-6,
        );

        assert.ok(
            Math.abs(
                impostor.score
            ) <
            1e-6,
        );

        assert.ok(
            Math.abs(
                mated.top1Score -
                1
            ) <
            1e-6,
        );

        assert.ok(
            Math.abs(
                mated.top2Score
            ) <
            1e-6,
        );

        assert.ok(
            Math.abs(
                mated.margin -
                1
            ) <
            1e-6,
        );

        assert.equal(
            mated.top1IsMate,
            true,
        );

        const serialized =
            JSON.stringify(
                result,
            ).toLowerCase();

        for (
            const forbidden of
            [
                "embedding",
                "frame",
                "crop",
                "candidatethreshold",
                "matchthreshold",
                "ambiguitymargin",
                "recommendedthreshold",
                "productivedecision",
                "accessdecision",
            ]
        ) {
            assert.equal(
                serialized.includes(
                    forbidden,
                ),
                false,
                forbidden,
            );
        }
    },
);
