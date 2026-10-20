import test from "node:test";
import assert from "node:assert/strict";

import {
    evaluateBiometricCalibrationExecutionValidation,
} from "../src/identity/biometricCalibrationExecutionValidator.mjs";
import {
    createCommonAnalysisAcceptancePolicies,
} from "./biometricCalibrationVerificationFixtures.mjs";

const PROTOCOL_VERSION =
    "r7f-v1";

const PROFILE_ID =
    "sface-profile-v1";

const CALIBRATION_DATASET_VERSION =
    "calibration-dataset-v1";

const EVALUATION_DATASET_VERSION =
    "evaluation-dataset-v1";

const ENVIRONMENT_ID =
    "environment-lab";

const CALIBRATION_PARTICIPANTS =
    [
        "cal-p01",
        "cal-p02",
        "cal-p03",
    ];

const EVALUATION_PARTICIPANTS =
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

function enrollmentSampleId(
    participantId,
) {
    return `${participantId}-enroll`;
}

function probeSampleId(
    participantId,
) {
    return `${participantId}-probe`;
}

function participant(
    participantId,
    enrollmentConditionId,
    probeConditionId,
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
                            enrollmentSampleId(
                                participantId,
                            ),

                        profileId:
                            PROFILE_ID,

                        role:
                            "ENROLLMENT",

                        captureConditionId:
                            enrollmentConditionId,
                    },
                    {
                        sampleId:
                            probeSampleId(
                                participantId,
                            ),

                        profileId:
                            PROFILE_ID,

                        role:
                            "PROBE",

                        captureConditionId:
                            probeConditionId,
                    },
                ],
            },
        ],
    };
}

function validControlledStudyContract() {
    return {
        protocolVersion:
            PROTOCOL_VERSION,

        profileId:
            PROFILE_ID,

        calibration: {
            datasetVersion:
                CALIBRATION_DATASET_VERSION,

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
                    ...CALIBRATION_PARTICIPANTS,
                ],

            sessionIds:
                CALIBRATION_PARTICIPANTS.map(
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
                EVALUATION_DATASET_VERSION,

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
                    ...EVALUATION_PARTICIPANTS,
                ],

            sessionIds:
                EVALUATION_PARTICIPANTS.map(
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

        ...createCommonAnalysisAcceptancePolicies(),
    };
}

function validCollectionPlan() {
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
            2,

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
            participant(
                "cal-p01",
                "condition-a",
                "condition-b",
            ),

            participant(
                "cal-p02",
                "condition-b",
                "condition-a",
            ),

            participant(
                "cal-p03",
                "condition-a",
                "condition-b",
            ),

            participant(
                "eval-p01",
                "condition-a",
                "condition-b",
            ),

            participant(
                "eval-p02",
                "condition-b",
                "condition-a",
            ),

            participant(
                "eval-p03",
                "condition-a",
                "condition-b",
            ),
        ],

        calibrationParticipantIds:
            [
                ...CALIBRATION_PARTICIPANTS,
            ],

        evaluationParticipantIds:
            [
                ...EVALUATION_PARTICIPANTS,
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
                    enrollmentSampleId(
                        "cal-p01",
                    ),

                probeSampleId:
                    probeSampleId(
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
                    enrollmentSampleId(
                        "cal-p01",
                    ),

                probeSampleId:
                    probeSampleId(
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
                    enrollmentSampleId(
                        "eval-p01",
                    ),

                probeSampleId:
                    probeSampleId(
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
                    enrollmentSampleId(
                        "eval-p01",
                    ),

                probeSampleId:
                    probeSampleId(
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
                    probeSampleId(
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
                    probeSampleId(
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
                    probeSampleId(
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
                    probeSampleId(
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
                2,

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

function sessionWindow(
    participantId,
) {
    const windows =
        {
            "cal-p01": [
                "2026-10-13T08:00:00Z",
                "2026-10-13T08:10:00Z",
                "2026-10-13T08:01:00Z",
                "2026-10-13T08:02:00Z",
            ],

            "cal-p02": [
                "2026-10-13T08:20:00Z",
                "2026-10-13T08:30:00Z",
                "2026-10-13T08:21:00Z",
                "2026-10-13T08:22:00Z",
            ],

            "cal-p03": [
                "2026-10-13T08:40:00Z",
                "2026-10-13T08:50:00Z",
                "2026-10-13T08:41:00Z",
                "2026-10-13T08:42:00Z",
            ],
        };

    return windows[
        participantId
    ];
}

function manifestParticipant(
    participantId,
    enrollmentConditionId,
    probeConditionId,
) {
    const [
        startedAt,
        completedAt,
        enrollmentCapturedAt,
        probeCapturedAt,
    ] =
        sessionWindow(
            participantId,
        );

    const deviceByCondition =
        {
            "condition-a":
                "device-a",

            "condition-b":
                "device-b",
        };

    return {
        participantId,

        sessions: [
            {
                sessionId:
                    sessionId(
                        participantId,
                    ),

                startedAt,
                completedAt,

                samples: [
                    {
                        sampleId:
                            enrollmentSampleId(
                                participantId,
                            ),

                        capturedAt:
                            enrollmentCapturedAt,

                        captureConditionId:
                            enrollmentConditionId,

                        deviceId:
                            deviceByCondition[
                                enrollmentConditionId
                            ],
                    },
                    {
                        sampleId:
                            probeSampleId(
                                participantId,
                            ),

                        capturedAt:
                            probeCapturedAt,

                        captureConditionId:
                            probeConditionId,

                        deviceId:
                            deviceByCondition[
                                probeConditionId
                            ],
                    },
                ],
            },
        ],
    };
}

function validExecutionManifest() {
    return {
        protocolVersion:
            PROTOCOL_VERSION,

        profileId:
            PROFILE_ID,

        datasetVersion:
            CALIBRATION_DATASET_VERSION,

        phase:
            "CALIBRATION",

        environmentId:
            ENVIRONMENT_ID,

        participants: [
            manifestParticipant(
                "cal-p01",
                "condition-a",
                "condition-b",
            ),

            manifestParticipant(
                "cal-p02",
                "condition-b",
                "condition-a",
            ),

            manifestParticipant(
                "cal-p03",
                "condition-a",
                "condition-b",
            ),
        ],
    };
}

function validCalibrationDataset() {
    return {
        datasetVersion:
            CALIBRATION_DATASET_VERSION,

        protocolVersion:
            PROTOCOL_VERSION,

        profileId:
            PROFILE_ID,

        environmentId:
            ENVIRONMENT_ID,

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
            },
        ],

        createdAt:
            "2026-10-13T09:00:00Z",

        records: [
            {
                type:
                    "VERIFICATION_COMPARISON",

                sessionId:
                    sessionId(
                        "cal-p01",
                    ),

                sampleId:
                    probeSampleId(
                        "cal-p01",
                    ),

                comparisonId:
                    "comparison-cal-genuine",

                profileId:
                    PROFILE_ID,

                label:
                    "GENUINE",

                score:
                    0.91,

                captureConditionId:
                    "condition-b",

                timestamp:
                    "2026-10-13T08:03:00Z",
            },
            {
                type:
                    "VERIFICATION_COMPARISON",

                sessionId:
                    sessionId(
                        "cal-p02",
                    ),

                sampleId:
                    probeSampleId(
                        "cal-p02",
                    ),

                comparisonId:
                    "comparison-cal-impostor",

                profileId:
                    PROFILE_ID,

                label:
                    "IMPOSTOR",

                score:
                    0.18,

                captureConditionId:
                    "condition-a",

                timestamp:
                    "2026-10-13T08:23:00Z",
            },
            {
                type:
                    "IDENTIFICATION_SEARCH",

                sessionId:
                    sessionId(
                        "cal-p01",
                    ),

                searchId:
                    "search-cal-mated",

                profileId:
                    PROFILE_ID,

                kind:
                    "MATED",

                top1Score:
                    0.88,

                top2Score:
                    0.41,

                margin:
                    0.47,

                top1IsMate:
                    true,

                candidateCount:
                    2,

                captureConditionId:
                    "condition-b",

                timestamp:
                    "2026-10-13T08:04:00Z",
            },
            {
                type:
                    "IDENTIFICATION_SEARCH",

                sessionId:
                    sessionId(
                        "cal-p03",
                    ),

                searchId:
                    "search-cal-nonmated",

                profileId:
                    PROFILE_ID,

                kind:
                    "NON_MATED",

                top1Score:
                    0.29,

                top2Score:
                    0.12,

                margin:
                    0.17,

                candidateCount:
                    2,

                captureConditionId:
                    "condition-b",

                timestamp:
                    "2026-10-13T08:43:00Z",
            },
        ],
    };
}

function validInput() {
    return {
        controlledStudyContract:
            validControlledStudyContract(),

        collectionPlan:
            validCollectionPlan(),

        executionManifest:
            validExecutionManifest(),

        calibrationDataset:
            validCalibrationDataset(),
    };
}

function cloneInput() {
    return JSON.parse(
        JSON.stringify(
            validInput(),
        ),
    );
}

function evaluate(
    mutator =
        null,
) {
    const input =
        cloneInput();

    if (mutator) {
        mutator(
            input,
        );
    }

    return evaluateBiometricCalibrationExecutionValidation(
        input,
    );
}

function assertBlocked(
    result,
    blocker,
) {
    assert.equal(
        result.readyForCalibrationAnalysis,
        false,
    );

    assert.ok(
        result.blockers.includes(
            blocker,
        ),
        blocker,
    );
}

test(
    "execucao CALIBRATION integral fica pronta para analise",
    () => {
        const result =
            evaluate();

        assert.equal(
            result.readyForCalibrationAnalysis,
            true,
        );

        assert.deepEqual(
            result.blockers,
            [],
        );

        assert.deepEqual(
            result.warnings,
            [],
        );
    },
);

test(
    "resultado possui somente as chaves seguras autorizadas",
    () => {
        const result =
            evaluate();

        assert.deepEqual(
            Object.keys(
                result,
            ),
            [
                "contractReady",
                "planValid",
                "manifestValid",
                "datasetValid",
                "datasetVersionCompatible",
                "protocolCompatible",
                "profileCompatible",
                "environmentCompatible",
                "participantExecutionComplete",
                "sessionExecutionComplete",
                "sampleExecutionComplete",
                "conditionExecutionComplete",
                "deviceExecutionComplete",
                "verificationTraceabilityValid",
                "identificationTraceabilityValid",
                "timestampsComplete",
                "plannedCountsMatch",
                "readyForCalibrationAnalysis",
                "warnings",
                "blockers",
            ],
        );
    },
);

test(
    "R7F valido mas nao ready bloqueia analise",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .controlledStudyContract
                        .acceptancePolicy
                        .minimumEvaluationParticipants =
                        10;
                },
            );

        assert.equal(
            result.contractReady,
            false,
        );

        assertBlocked(
            result,
            "CONTRACT_NOT_READY",
        );
    },
);

test(
    "Collection Plan invalido bloqueia analise",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .collectionPlan
                        .participants[1]
                        .participantId =
                        input
                            .collectionPlan
                            .participants[0]
                            .participantId;
                },
            );

        assert.equal(
            result.planValid,
            false,
        );

        assertBlocked(
            result,
            "PLAN_INVALID",
        );
    },
);

test(
    "Execution Manifest invalido bloqueia analise",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .executionManifest
                        .phase =
                        "EVALUATION";
                },
            );

        assert.equal(
            result.manifestValid,
            false,
        );

        assertBlocked(
            result,
            "MANIFEST_INVALID",
        );
    },
);

test(
    "R7C invalido bloqueia analise",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[0]
                        .nome =
                        "campo-proibido";
                },
            );

        assert.equal(
            result.datasetValid,
            false,
        );

        assertBlocked(
            result,
            "DATASET_INVALID",
        );
    },
);

test(
    "datasetVersion deve coincidir entre R7F manifest e R7C",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .executionManifest
                        .datasetVersion =
                        "calibration-dataset-v2";
                },
            );

        assert.equal(
            result.datasetVersionCompatible,
            false,
        );

        assertBlocked(
            result,
            "DATASET_VERSION_INCOMPATIBLE",
        );
    },
);

test(
    "protocolVersion deve coincidir entre os quatro contratos",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .protocolVersion =
                        "r7f-v2";
                },
            );

        assert.equal(
            result.protocolCompatible,
            false,
        );

        assertBlocked(
            result,
            "PROTOCOL_INCOMPATIBLE",
        );
    },
);

test(
    "profileId deve coincidir entre os quatro contratos",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .profileId =
                        "profile-other";

                    for (
                        const record of
                        input
                            .calibrationDataset
                            .records
                    ) {
                        record.profileId =
                            "profile-other";
                    }
                },
            );

        assert.equal(
            result.profileCompatible,
            false,
        );

        assertBlocked(
            result,
            "PROFILE_INCOMPATIBLE",
        );
    },
);

test(
    "environmentId do manifest deve coincidir com R7F e R7C",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .executionManifest
                        .environmentId =
                        "environment-other";
                },
            );

        assert.equal(
            result.environmentCompatible,
            false,
        );

        assertBlocked(
            result,
            "ENVIRONMENT_INCOMPATIBLE",
        );
    },
);

test(
    "environmentId e derivado das capture conditions usadas no plano",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .collectionPlan
                        .captureConditionCatalog[0]
                        .environmentId =
                        "environment-other";
                },
            );

        assert.equal(
            result.environmentCompatible,
            false,
        );

        assertBlocked(
            result,
            "ENVIRONMENT_INCOMPATIBLE",
        );
    },
);

test(
    "participantes CALIBRATION devem coincidir com o manifest",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .executionManifest
                        .participants
                        .pop();
                },
            );

        assert.equal(
            result.participantExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "PARTICIPANT_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "participantIds CALIBRATION do R7F devem coincidir com o plano",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .controlledStudyContract
                        .calibration
                        .participantIds[0] =
                        "cal-p99";
                },
            );

        assert.equal(
            result.participantExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "PARTICIPANT_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "sessao executada deve permanecer associada ao participante correto",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .executionManifest
                        .participants[0]
                        .sessions[0]
                        .sessionId =
                        "session-cal-p99";
                },
            );

        assert.equal(
            result.sessionExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "SESSION_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "sessionIds do R7F devem coincidir exatamente com CALIBRATION",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .controlledStudyContract
                        .calibration
                        .sessionIds[0] =
                        "session-cal-p99";
                },
            );

        assert.equal(
            result.sessionExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "SESSION_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "amostra planejada ausente no manifest bloqueia completude",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .executionManifest
                        .participants[0]
                        .sessions[0]
                        .samples
                        .pop();
                },
            );

        assert.equal(
            result.sampleExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "SAMPLE_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "captureConditionId executada deve coincidir com a sample planejada",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .executionManifest
                        .participants[0]
                        .sessions[0]
                        .samples[0]
                        .captureConditionId =
                        "condition-b";
                },
            );

        assert.equal(
            result.conditionExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "CONDITION_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "deviceId executado deve coincidir com a condition planejada",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .executionManifest
                        .participants[0]
                        .sessions[0]
                        .samples[0]
                        .deviceId =
                        "device-b";
                },
            );

        assert.equal(
            result.deviceExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "DEVICE_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "mapping condition para device do R7C deve coincidir com o plano",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .captureConditionCatalog[0]
                        .deviceId =
                        "device-b";
                },
            );

        assert.equal(
            result.deviceExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "DEVICE_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "captureConditionIds usadas no CALIBRATION devem coincidir com R7F",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .controlledStudyContract
                        .calibration
                        .captureConditionIds[0] =
                        "condition-x";
                },
            );

        assert.equal(
            result.conditionExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "CONDITION_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "deviceIds usados no CALIBRATION devem coincidir com R7F",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .controlledStudyContract
                        .calibration
                        .deviceIds[0] =
                        "device-x";
                },
            );

        assert.equal(
            result.deviceExecutionComplete,
            false,
        );

        assertBlocked(
            result,
            "DEVICE_EXECUTION_INCOMPLETE",
        );
    },
);

test(
    "VERIFICATION_COMPARISON controlado exige comparisonId",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    delete input
                        .calibrationDataset
                        .records[0]
                        .comparisonId;
                },
            );

        assert.equal(
            result.verificationTraceabilityValid,
            false,
        );

        assertBlocked(
            result,
            "VERIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "comparisonId de EVALUATION e rejeitado no dataset CALIBRATION",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[0]
                        .comparisonId =
                        "comparison-eval-genuine";
                },
            );

        assertBlocked(
            result,
            "VERIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "label de verificacao deve coincidir com o plano",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[0]
                        .label =
                        "IMPOSTOR";
                },
            );

        assertBlocked(
            result,
            "VERIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "sampleId de verificacao deve ser o probeSampleId planejado",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[0]
                        .sampleId =
                        "unplanned-probe";
                },
            );

        assertBlocked(
            result,
            "VERIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "sessionId de verificacao deve ser a sessao do probe",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[0]
                        .sessionId =
                        sessionId(
                            "cal-p03",
                        );
                },
            );

        assertBlocked(
            result,
            "VERIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "captureConditionId de verificacao deve ser a condition do probe",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[0]
                        .captureConditionId =
                        "condition-a";
                },
            );

        assertBlocked(
            result,
            "VERIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "record de verificacao extra e rejeitado",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    const extra =
                        {
                            ...input
                                .calibrationDataset
                                .records[0],

                            comparisonId:
                                "comparison-extra",

                            sampleId:
                                "extra-probe",
                        };

                    input
                        .calibrationDataset
                        .records
                        .push(
                            extra,
                        );
                },
            );

        assertBlocked(
            result,
            "VERIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "record de verificacao ausente e rejeitado",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records
                        .splice(
                            1,
                            1,
                        );
                },
            );

        assertBlocked(
            result,
            "VERIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "searchId de EVALUATION e rejeitado no dataset CALIBRATION",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[2]
                        .searchId =
                        "search-eval-mated";
                },
            );

        assertBlocked(
            result,
            "IDENTIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "kind de identification deve coincidir com o plano",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[2]
                        .kind =
                        "NON_MATED";

                    delete input
                        .calibrationDataset
                        .records[2]
                        .top1IsMate;
                },
            );

        assertBlocked(
            result,
            "IDENTIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "sessionId da identification deve corresponder ao probe",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[2]
                        .sessionId =
                        sessionId(
                            "cal-p02",
                        );
                },
            );

        assertBlocked(
            result,
            "IDENTIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "captureConditionId da identification deve corresponder ao probe",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[2]
                        .captureConditionId =
                        "condition-a";
                },
            );

        assertBlocked(
            result,
            "IDENTIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "candidateCount deve ser igual ao tamanho da galeria planejada",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[2]
                        .candidateCount =
                        3;
                },
            );

        assertBlocked(
            result,
            "IDENTIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "search adicional nao planejado e rejeitado",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    const extra =
                        {
                            ...input
                                .calibrationDataset
                                .records[2],

                            searchId:
                                "search-extra",
                        };

                    input
                        .calibrationDataset
                        .records
                        .push(
                            extra,
                        );
                },
            );

        assertBlocked(
            result,
            "IDENTIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "search planejado ausente e rejeitado",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records
                        .pop();
                },
            );

        assertBlocked(
            result,
            "IDENTIFICATION_TRACEABILITY_INVALID",
        );
    },
);

test(
    "todo record R7C controlado exige timestamp",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    delete input
                        .calibrationDataset
                        .records[0]
                        .timestamp;
                },
            );

        assert.equal(
            result.timestampsComplete,
            false,
        );

        assertBlocked(
            result,
            "TIMESTAMPS_INCOMPLETE",
        );
    },
);

test(
    "timestamp do record deve estar dentro da janela da sessao",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .records[0]
                        .timestamp =
                        "2026-10-13T07:59:59Z";
                },
            );

        assert.equal(
            result.timestampsComplete,
            false,
        );

        assertBlocked(
            result,
            "TIMESTAMPS_INCOMPLETE",
        );
    },
);

test(
    "dataset.createdAt nao pode anteceder o ultimo record",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .calibrationDataset
                        .createdAt =
                        "2026-10-13T08:00:00Z";
                },
            );

        assert.equal(
            result.timestampsComplete,
            false,
        );

        assertBlocked(
            result,
            "TIMESTAMPS_INCOMPLETE",
        );
    },
);

test(
    "plannedCounts do R7F devem coincidir exatamente com plano e dataset",
    () => {
        const result =
            evaluate(
                (
                    input,
                ) => {
                    input
                        .controlledStudyContract
                        .calibration
                        .plannedCounts
                        .genuineComparisons =
                        2;
                },
            );

        assert.equal(
            result.plannedCountsMatch,
            false,
        );

        assertBlocked(
            result,
            "PLANNED_COUNTS_MISMATCH",
        );
    },
);

test(
    "resultado publico nao expoe ids scores PII biometria ou thresholds",
    () => {
        const serialized =
            JSON.stringify(
                evaluate(),
            ).toLowerCase();

        for (
            const forbidden of
            [
                "cal-p01",
                "session-cal-p01",
                "comparison-cal-genuine",
                "search-cal-mated",
                "device-a",
                "condition-a",
                "cpf",
                "email",
                "embedding",
                "vector",
                "score",
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
