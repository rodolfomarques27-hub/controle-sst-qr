export function createCommonVerificationStudySections({
    enrollmentId,
    probeId,
}) {
    return {
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

export function createCommonScoringProtocol(
    profileId,
) {
    return {
        profileId,

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

export function createCommonAnalysisAcceptancePolicies() {
    return {
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

export function createCommonCalibrationParticipant({
    participantId,
    profileId,
    sessionId,
    enrollmentId,
    probeId,
}) {
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

                        profileId,

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

                        profileId,

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

                        profileId,

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

                        profileId,

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

export function createCommonControlledStudyContract({
    protocolVersion,
    profileId,
    datasetVersion,
    evaluationDatasetVersion,
    environmentId,
    calibrationParticipants,
    evaluationParticipants,
    sessionId,
}) {
    const plannedCounts = {
        genuineComparisons:
            1,

        impostorComparisons:
            1,

        matedSearches:
            1,

        nonMatedSearches:
            1,
    };

    return {
        protocolVersion,

        profileId,

        calibration: {
            datasetVersion,

            protocolVersion,

            profileId,

            environmentId,

            deviceIds: [
                "device-a",
                "device-b",
            ],

            captureConditionIds: [
                "condition-a",
                "condition-b",
            ],

            participantIds: [
                ...calibrationParticipants,
            ],

            sessionIds:
                calibrationParticipants.map(
                    sessionId,
                ),

            plannedCounts: {
                ...plannedCounts,
            },
        },

        evaluation: {
            datasetVersion:
                evaluationDatasetVersion,

            protocolVersion,

            profileId,

            environmentId,

            deviceIds: [
                "device-a",
                "device-b",
            ],

            captureConditionIds: [
                "condition-a",
                "condition-b",
            ],

            participantIds: [
                ...evaluationParticipants,
            ],

            sessionIds:
                evaluationParticipants.map(
                    sessionId,
                ),

            plannedCounts: {
                ...plannedCounts,
            },
        },

        ...createCommonAnalysisAcceptancePolicies(),
    };
}
