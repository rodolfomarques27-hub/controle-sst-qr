import test from "node:test";
import assert from "node:assert/strict";
import {
    fileURLToPath,
} from "node:url";

import {
    createYunetDetector,
} from "../src/detection/yunetDetector.mjs";

import {
    alignFace,
} from "../src/alignment/faceAlignment.mjs";

import {
    SFACE_CANONICAL_LANDMARKS_112,
    SFACE_EMBEDDING_SIZE,
    createSfaceEmbeddingExtractor,
} from "../src/recognition/sfaceEmbedding.mjs";

import {
    createBiometricCalibrationCollectionRunner,
} from "../src/identity/biometricCalibrationCollectionRunner.mjs";

const YUNET_MODEL_PATH =
    fileURLToPath(
        new URL(
            "../models/face_detection_yunet_2026may.onnx",
            import.meta.url,
        ),
    );

const SFACE_MODEL_PATH =
    fileURLToPath(
        new URL(
            "../models/face_recognition_sface_2021dec.onnx",
            import.meta.url,
        ),
    );

const PROTOCOL_VERSION =
    "r7f-v1";

const PROFILE_ID =
    "sface-profile-v1";

const ENVIRONMENT_ID =
    "environment-lab";

const DATASET_VERSION =
    "calibration-dataset-v1";

const FRAME_WIDTH =
    160;

const FRAME_HEIGHT =
    160;

const FACE_X =
    24;

const FACE_Y =
    24;

const FACE_SIZE =
    112;

const CAL_PARTICIPANTS =
    Object.freeze([
        "cal-p01",
        "cal-p02",
        "cal-p03",
    ]);

const EVAL_PARTICIPANTS =
    Object.freeze([
        "eval-p01",
        "eval-p02",
        "eval-p03",
    ]);

const ALIGNMENT_POLICY =
    Object.freeze({
        paddingRatio:
            0,

        minFaceSizePx:
            24,

        minVisibleAreaRatio:
            1,

        maxRmsError:
            1e-5,
    });

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

function createSyntheticAlignedFace(
    seed,
) {
    const data =
        new Uint8Array(
            FACE_SIZE *
            FACE_SIZE *
            3,
        );

    for (
        let y = 0;
        y < FACE_SIZE;
        y += 1
    ) {
        for (
            let x = 0;
            x < FACE_SIZE;
            x += 1
        ) {
            const offset =
                (
                    y *
                    FACE_SIZE +
                    x
                ) *
                3;

            data[offset] =
                (
                    x *
                        3 +
                    y *
                        5 +
                    seed *
                        71 +
                    (
                        (
                            x ^
                            y
                        ) *
                        seed *
                        13
                    )
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
                    seed *
                        43 +
                    (
                        (
                            x *
                            y +
                            seed *
                            19
                        ) %
                        251
                    )
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
                    seed *
                        29 +
                    (
                        (
                            (
                                x +
                                seed
                            ) *
                            (
                                y +
                                seed *
                                3
                            )
                        ) %
                        253
                    )
                ) %
                256;
        }
    }

    return data;
}

function createSyntheticFrame(
    seed,
) {
    const frame =
        new Uint8Array(
            FRAME_WIDTH *
            FRAME_HEIGHT *
            3,
        );

    const face =
        createSyntheticAlignedFace(
            seed,
        );

    for (
        let y = 0;
        y < FACE_SIZE;
        y += 1
    ) {
        for (
            let x = 0;
            x < FACE_SIZE;
            x += 1
        ) {
            const sourceOffset =
                (
                    y *
                    FACE_SIZE +
                    x
                ) *
                3;

            const targetOffset =
                (
                    (
                        y +
                        FACE_Y
                    ) *
                    FRAME_WIDTH +
                    (
                        x +
                        FACE_X
                    )
                ) *
                3;

            frame[targetOffset] =
                face[sourceOffset];

            frame[
                targetOffset +
                1
            ] =
                face[
                    sourceOffset +
                    1
                ];

            frame[
                targetOffset +
                2
            ] =
                face[
                    sourceOffset +
                    2
                ];
        }
    }

    face.fill(
        0,
    );

    return frame;
}

function syntheticDetection() {
    return Object.freeze({
        x:
            FACE_X,

        y:
            FACE_Y,

        width:
            FACE_SIZE,

        height:
            FACE_SIZE,

        score:
            1,

        landmarks:
            Object.freeze(
                SFACE_CANONICAL_LANDMARKS_112.map(
                    (
                        point,
                    ) =>
                        Object.freeze({
                            x:
                                point.x +
                                FACE_X,

                            y:
                                point.y +
                                FACE_Y,
                        }),
                ),
            ),
    });
}

function sessionId(
    participantId,
) {
    return `session-${participantId}`;
}

function enrollmentId(
    participantId,
    index,
) {
    return (
        `${participantId}-enroll-` +
        String(
            index,
        ).padStart(
            2,
            "0",
        )
    );
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

            participantIds: [
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

            participantIds: [
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
                    "synthetic-bright",

                distanceBand:
                    "synthetic-near",

                pose:
                    "synthetic-frontal",

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
                    "synthetic-dim",

                distanceBand:
                    "synthetic-mid",

                pose:
                    "synthetic-frontal",

                glasses:
                    false,

                ppe:
                    [],

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

        calibrationParticipantIds: [
            ...CAL_PARTICIPANTS,
        ],

        evaluationParticipantIds: [
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
    const base =
        Date.UTC(
            2026,
            9,
            13,
            12,
            0,
            0,
            0,
        );

    let tick =
        0;

    return () => {
        const value =
            new Date(
                base +
                tick *
                1000,
            ).toISOString();

        tick +=
            1;

        return value;
    };
}

function participantSeed(
    participantId,
) {
    if (
        participantId ===
        "cal-p01"
    ) {
        return 7;
    }

    if (
        participantId ===
        "cal-p02"
    ) {
        return 41;
    }

    return 89;
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

test(
    "PISTA A - YuNet ONNX real executa em CPU sobre frame BGR sintetico",
    async () => {
        const detector =
            await createYunetDetector({
                modelPath:
                    YUNET_MODEL_PATH,
            });

        let frame =
            null;

        try {
            assert.equal(
                detector.provider,
                "cpu",
            );

            frame =
                new Uint8Array(
                    32 *
                    32 *
                    3,
                );

            for (
                let index = 0;
                index < frame.length;
                index += 1
            ) {
                frame[index] =
                    (
                        index *
                        17 +
                        31
                    ) %
                    256;
            }

            const detections =
                await detector.detectBgr({
                    data:
                        frame,

                    width:
                        32,

                    height:
                        32,
                });

            assert.equal(
                Array.isArray(
                    detections,
                ),
                true,
            );

            for (
                const detection of
                detections
            ) {
                assert.equal(
                    Number.isFinite(
                        detection.score,
                    ),
                    true,
                );

                assert.equal(
                    detection.landmarks.length,
                    5,
                );
            }
        }
        finally {
            if (frame) {
                frame.fill(
                    0,
                );
            }

            assert.equal(
                await detector.release(),
                true,
            );
        }
    },
);

test(
    "PISTA A - SFace ONNX real executa em CPU e produz embedding 128D L2 normalizado",
    async () => {
        const extractor =
            await createSfaceEmbeddingExtractor({
                modelPath:
                    SFACE_MODEL_PATH,
            });

        let synthetic =
            null;

        let embedding =
            null;

        try {
            assert.equal(
                extractor.provider,
                "cpu",
            );

            assert.equal(
                extractor.embeddingSize,
                SFACE_EMBEDDING_SIZE,
            );

            synthetic =
                createSyntheticAlignedFace(
                    113,
                );

            embedding =
                await extractor.extractBgr112({
                    data:
                        synthetic,

                    width:
                        112,

                    height:
                        112,
                });

            assert.equal(
                embedding instanceof
                    Float32Array,
                true,
            );

            assert.equal(
                embedding.length,
                128,
            );

            for (
                const value of
                embedding
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
                        embedding,
                    ) -
                    1
                ) <
                1e-5,
            );
        }
        finally {
            synthetic?.fill(
                0,
            );

            embedding?.fill(
                0,
            );

            assert.equal(
                await extractor.release(),
                true,
            );
        }
    },
);

test(
    "PISTA B - runner completo usa alignFace e SFace reais e finaliza CALIBRATION sintetico",
    async () => {
        const extractor =
            await createSfaceEmbeddingExtractor({
                modelPath:
                    SFACE_MODEL_PATH,
            });

        const plan =
            collectionPlan();

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

        const observedFrames =
            [];

        const alignedBuffers =
            [];

        const observedEmbeddings =
            [];

        let syntheticDetectorCalls =
            0;

        let realAlignmentCalls =
            0;

        let realSfaceCalls =
            0;

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
                Object.freeze({
                    snapshot() {
                        return {
                            frames: {
                                format:
                                    "bgr24",

                                width:
                                    FRAME_WIDTH,

                                height:
                                    FRAME_HEIGHT,
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
                }),
            );
        }

        const detector =
            Object.freeze({
                async detectBgr({
                    data,
                    width,
                    height,
                }) {
                    syntheticDetectorCalls +=
                        1;

                    assert.equal(
                        data instanceof
                            Uint8Array,
                        true,
                    );

                    assert.equal(
                        width,
                        FRAME_WIDTH,
                    );

                    assert.equal(
                        height,
                        FRAME_HEIGHT,
                    );

                    return [
                        syntheticDetection(),
                    ];
                },
            });

        function realAlignment(
            input,
        ) {
            realAlignmentCalls +=
                1;

            const result =
                alignFace(
                    input,
                );

            assert.equal(
                result.width,
                112,
            );

            assert.equal(
                result.height,
                112,
            );

            assert.equal(
                result.format,
                "bgr24",
            );

            assert.ok(
                result.diagnostics.rmsError <
                1e-5,
            );

            alignedBuffers.push(
                result.data,
            );

            return result;
        }

        const realEmbeddingExtractor =
            Object.freeze({
                async extractBgr112(
                    input,
                ) {
                    realSfaceCalls +=
                        1;

                    const embedding =
                        await extractor.extractBgr112(
                            input,
                        );

                    assert.equal(
                        embedding.length,
                        128,
                    );

                    assert.ok(
                        Math.abs(
                            l2Norm(
                                embedding,
                            ) -
                            1
                        ) <
                        1e-5,
                    );

                    observedEmbeddings.push(
                        embedding,
                    );

                    return embedding;
                },
            });

        const runner =
            createBiometricCalibrationCollectionRunner({
                controlledStudyContract:
                    controlledStudyContract(),

                collectionPlan:
                    plan,

                scoringProtocol:
                    scoringProtocol(),

                async resolveCaptureSource(
                    deviceId,
                ) {
                    sourceCalls.push(
                        deviceId,
                    );

                    const source =
                        sources.get(
                            deviceId,
                        );

                    assert.ok(
                        source,
                    );

                    return source;
                },

                detector,

                alignFace:
                    realAlignment,

                embeddingExtractor:
                    realEmbeddingExtractor,

                alignmentPolicy:
                    ALIGNMENT_POLICY,

                now:
                    makeClock(),
            });

        try {
            assert.equal(
                extractor.provider,
                "cpu",
            );

            assert.equal(
                runner.snapshot()
                    .state,
                "READY",
            );

            for (
                const participantItem of
                plan.participants
            ) {
                if (
                    !CAL_PARTICIPANTS.includes(
                        participantItem.participantId,
                    )
                ) {
                    continue;
                }

                for (
                    const session of
                    participantItem.sessions
                ) {
                    runner.startSession(
                        session.sessionId,
                    );

                    for (
                        const sample of
                        session.samples
                    ) {
                        const deviceId =
                            conditionDevice(
                                plan,
                                sample.captureConditionId,
                            );

                        const frame =
                            createSyntheticFrame(
                                participantSeed(
                                    participantItem.participantId,
                                ),
                            );

                        observedFrames.push(
                            frame,
                        );

                        queues
                            .get(
                                deviceId,
                            )
                            .push(
                                frame,
                            );

                        const result =
                            await runner.captureSample(
                                sample.sampleId,
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

                        assert.equal(
                            result.accepted,
                            true,
                        );

                        assert.equal(
                            result.status,
                            "CAPTURED",
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

                        const lastAligned =
                            alignedBuffers[
                                alignedBuffers.length -
                                1
                            ];

                        assert.ok(
                            lastAligned.every(
                                (
                                    value,
                                ) =>
                                    value ===
                                    0,
                            ),
                        );

                        const lastEmbedding =
                            observedEmbeddings[
                                observedEmbeddings.length -
                                1
                            ];

                        assert.ok(
                            lastEmbedding.every(
                                (
                                    value,
                                ) =>
                                    value ===
                                    0,
                            ),
                        );

                        const captureJson =
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
                                captureJson.includes(
                                    forbidden,
                                ),
                                false,
                            );
                        }
                    }

                    runner.completeSession();
                }
            }

            assert.equal(
                runner.snapshot()
                    .state,
                "COLLECTION_COMPLETE",
            );

            assert.equal(
                syntheticDetectorCalls,
                12,
            );

            assert.equal(
                realAlignmentCalls,
                12,
            );

            assert.equal(
                realSfaceCalls,
                12,
            );

            assert.equal(
                sourceCalls.length,
                12,
            );

            const finalized =
                runner.finalize();

            assert.equal(
                finalized.validationSummary
                    .readyForCalibrationAnalysis,
                true,
            );

            assert.equal(
                finalized.executionManifest.phase,
                "CALIBRATION",
            );

            assert.equal(
                finalized.executionManifest
                    .participants
                    .length,
                3,
            );

            assert.equal(
                finalized.calibrationDataset
                    .records
                    .length,
                4,
            );

            const manifestProbe =
                finalized.executionManifest
                    .participants
                    .find(
                        (
                            item,
                        ) =>
                            item.participantId ===
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
                finalized.calibrationDataset
                    .records
                    .find(
                        (
                            record,
                        ) =>
                            record.comparisonId ===
                            "comparison-cal-genuine",
                    );

            const identification =
                finalized.calibrationDataset
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

            assert.equal(
                typeof verification.score,
                "number",
            );

            assert.equal(
                typeof identification.top1Score,
                "number",
            );

            assert.equal(
                typeof identification.top2Score,
                "number",
            );

            assert.equal(
                typeof identification.margin,
                "number",
            );

            assert.equal(
                identification.top1IsMate,
                true,
            );

            assert.equal(
                runner.snapshot()
                    .state,
                "FINALIZED",
            );

            const serialized =
                JSON.stringify(
                    finalized,
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

            for (
                const frame of
                observedFrames
            ) {
                assert.ok(
                    frame.every(
                        (
                            value,
                        ) =>
                            value ===
                            0,
                    ),
                );
            }

            for (
                const aligned of
                alignedBuffers
            ) {
                assert.ok(
                    aligned.every(
                        (
                            value,
                        ) =>
                            value ===
                            0,
                    ),
                );
            }

            for (
                const embedding of
                observedEmbeddings
            ) {
                assert.ok(
                    embedding.every(
                        (
                            value,
                        ) =>
                            value ===
                            0,
                    ),
                );
            }
        }
        finally {
            for (
                const queue of
                queues.values()
            ) {
                for (
                    const frame of
                    queue
                ) {
                    frame.fill(
                        0,
                    );
                }

                queue.length =
                    0;
            }

            assert.equal(
                await extractor.release(),
                true,
            );
        }
    },
);
