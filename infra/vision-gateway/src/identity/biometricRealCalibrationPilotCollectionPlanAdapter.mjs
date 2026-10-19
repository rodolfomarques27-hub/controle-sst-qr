import {
    CALIBRATION_SPLIT,
    IDENTIFICATION_SEARCH_KIND,
    SAMPLE_ROLE,
    VERIFICATION_LABEL,
    validateBiometricCalibrationCollectionPlan,
} from "./biometricCalibrationCollectionProtocol.mjs";

import {
    REAL_CALIBRATION_PILOT_PLAN,
} from "./biometricRealCalibrationPilotPlan.mjs";

function requireNonEmptyString(value, name) {
    if (
        typeof value !== "string" ||
        value.trim().length === 0
    ) {
        throw new TypeError(
            `${name} deve ser string nao vazia.`,
        );
    }

    return value.trim();
}

function requirePlainObject(value, name) {
    if (
        value === null ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw new TypeError(
            `${name} deve ser objeto.`,
        );
    }

    return value;
}

function requirePilotPlan(plan) {
    const source =
        requirePlainObject(
            plan,
            "pilotPlan",
        );

    if (
        source.status !==
        "AWAITING_RUNTIME_BINDINGS"
    ) {
        throw new TypeError(
            "pilotPlan.status deve permanecer AWAITING_RUNTIME_BINDINGS.",
        );
    }

    if (
        source.authorization?.collectionAllowed !==
        false
    ) {
        throw new TypeError(
            "pilotPlan nao pode autorizar coleta real.",
        );
    }

    if (
        source.privacy?.piiAllowed !==
        false
    ) {
        throw new TypeError(
            "pilotPlan deve manter piiAllowed=false.",
        );
    }

    if (
        source.privacy?.biometricPersistence !==
        false
    ) {
        throw new TypeError(
            "pilotPlan deve manter biometricPersistence=false.",
        );
    }

    return source;
}

function normalizeBindings({
    pilotPlan,
    environmentId,
    deviceBindings,
}) {
    const normalizedEnvironmentId =
        requireNonEmptyString(
            environmentId,
            "environmentId",
        );

    const bindings =
        requirePlainObject(
            deviceBindings,
            "deviceBindings",
        );

    const expectedConditionIds =
        pilotPlan.captureConditions.map(
            (condition) => condition.id,
        );

    const bindingKeys =
        Object.keys(bindings);

    for (
        const conditionId of
        expectedConditionIds
    ) {
        if (
            !Object.hasOwn(
                bindings,
                conditionId,
            )
        ) {
            throw new TypeError(
                `deviceBindings sem binding para ${conditionId}.`,
            );
        }

        requireNonEmptyString(
            bindings[conditionId],
            `deviceBindings.${conditionId}`,
        );
    }

    for (const bindingKey of bindingKeys) {
        if (
            !expectedConditionIds.includes(
                bindingKey,
            )
        ) {
            throw new TypeError(
                `deviceBindings possui conditionId desconhecido: ${bindingKey}.`,
            );
        }
    }

    return {
        environmentId:
            normalizedEnvironmentId,

        deviceBindings:
            Object.fromEntries(
                expectedConditionIds.map(
                    (conditionId) => [
                        conditionId,
                        requireNonEmptyString(
                            bindings[conditionId],
                            `deviceBindings.${conditionId}`,
                        ),
                    ],
                ),
            ),
    };
}

function transformCaptureConditions({
    pilotPlan,
    environmentId,
    deviceBindings,
}) {
    return pilotPlan.captureConditions.map(
        (condition) => ({
            id:
                condition.id,

            lighting:
                condition.lighting,

            distanceBand:
                condition.distanceBand,

            pose:
                condition.pose,

            glasses:
                condition.glasses,

            ppe: [
                ...condition.ppe,
            ],

            deviceId:
                deviceBindings[
                    condition.id
                ],

            environmentId,
        }),
    );
}

function transformParticipants({
    pilotPlan,
    profileId,
}) {
    return pilotPlan.participants.map(
        (participant) => ({
            participantId:
                participant.participantId,

            sessions:
                participant.sessions.map(
                    (session) => ({
                        sessionId:
                            session.sessionId,

                        samples:
                            session.plannedSamples.map(
                                (sample) => ({
                                    sampleId:
                                        sample.sampleId,

                                    profileId,

                                    role:
                                        sample.role,

                                    captureConditionId:
                                        sample.captureConditionId,
                                }),
                            ),
                    }),
                ),
        }),
    );
}

function indexParticipants(participants) {
    return new Map(
        participants.map(
            (participant) => [
                participant.participantId,
                participant,
            ],
        ),
    );
}

function samplesByRole({
    participantById,
    participantId,
    role,
}) {
    const participant =
        participantById.get(
            participantId,
        );

    if (!participant) {
        throw new TypeError(
            `participantId inexistente: ${participantId}.`,
        );
    }

    return participant.sessions
        .flatMap(
            (session) =>
                session.samples,
        )
        .filter(
            (sample) =>
                sample.role === role,
        );
}

function nextParticipantId(
    participantIds,
    participantId,
    offset = 1,
) {
    const currentIndex =
        participantIds.indexOf(
            participantId,
        );

    if (currentIndex < 0) {
        throw new TypeError(
            `participantId fora do split: ${participantId}.`,
        );
    }

    return participantIds[
        (
            currentIndex +
            offset
        ) %
        participantIds.length
    ];
}

function buildVerificationComparisons({
    split,
    participantIds,
    participantById,
    genuineCount,
    impostorCount,
}) {
    const comparisons = [];

    for (
        let index = 0;
        index < genuineCount;
        index++
    ) {
        const participantId =
            participantIds[
                index %
                participantIds.length
            ];

        const enrollmentSamples =
            samplesByRole({
                participantById,
                participantId,
                role:
                    SAMPLE_ROLE.ENROLLMENT,
            });

        const probeSamples =
            samplesByRole({
                participantById,
                participantId,
                role:
                    SAMPLE_ROLE.PROBE,
            });

        comparisons.push({
            comparisonId:
                `comparison-${split.toLowerCase()}-genuine-${String(index + 1).padStart(2, "0")}`,

            split,

            label:
                VERIFICATION_LABEL.GENUINE,

            enrollmentSampleId:
                enrollmentSamples[
                    index %
                    enrollmentSamples.length
                ].sampleId,

            probeSampleId:
                probeSamples[
                    index %
                    probeSamples.length
                ].sampleId,
        });
    }

    for (
        let index = 0;
        index < impostorCount;
        index++
    ) {
        const enrollmentParticipantId =
            participantIds[
                index %
                participantIds.length
            ];

        const probeParticipantId =
            nextParticipantId(
                participantIds,
                enrollmentParticipantId,
            );

        const enrollmentSamples =
            samplesByRole({
                participantById,
                participantId:
                    enrollmentParticipantId,
                role:
                    SAMPLE_ROLE.ENROLLMENT,
            });

        const probeSamples =
            samplesByRole({
                participantById,
                participantId:
                    probeParticipantId,
                role:
                    SAMPLE_ROLE.PROBE,
            });

        comparisons.push({
            comparisonId:
                `comparison-${split.toLowerCase()}-impostor-${String(index + 1).padStart(2, "0")}`,

            split,

            label:
                VERIFICATION_LABEL.IMPOSTOR,

            enrollmentSampleId:
                enrollmentSamples[
                    index %
                    enrollmentSamples.length
                ].sampleId,

            probeSampleId:
                probeSamples[
                    index %
                    probeSamples.length
                ].sampleId,
        });
    }

    return comparisons;
}

function buildMatedGallery({
    participantIds,
    participantId,
    gallerySize,
}) {
    const gallery = [
        participantId,
    ];

    let offset = 1;

    while (
        gallery.length <
        gallerySize
    ) {
        const candidate =
            nextParticipantId(
                participantIds,
                participantId,
                offset,
            );

        if (
            !gallery.includes(
                candidate,
            )
        ) {
            gallery.push(
                candidate,
            );
        }

        offset++;

        if (
            offset >
            participantIds.length
        ) {
            break;
        }
    }

    if (
        gallery.length !==
        gallerySize
    ) {
        throw new TypeError(
            "split nao possui participantes suficientes para galeria MATED.",
        );
    }

    return gallery;
}

function buildNonMatedGallery({
    participantIds,
    participantId,
    gallerySize,
}) {
    const gallery =
        participantIds
            .filter(
                (candidate) =>
                    candidate !==
                    participantId,
            )
            .slice(
                0,
                gallerySize,
            );

    if (
        gallery.length !==
        gallerySize
    ) {
        throw new TypeError(
            "split nao possui participantes suficientes para galeria NON_MATED.",
        );
    }

    return gallery;
}

function buildIdentificationSearches({
    split,
    participantIds,
    participantById,
    gallerySize,
    matedCount,
    nonMatedCount,
}) {
    const searches = [];

    for (
        let index = 0;
        index < matedCount;
        index++
    ) {
        const participantId =
            participantIds[
                index %
                participantIds.length
            ];

        const probeSamples =
            samplesByRole({
                participantById,
                participantId,
                role:
                    SAMPLE_ROLE.PROBE,
            });

        searches.push({
            searchId:
                `search-${split.toLowerCase()}-mated-${String(index + 1).padStart(2, "0")}`,

            split,

            kind:
                IDENTIFICATION_SEARCH_KIND.MATED,

            probeSampleId:
                probeSamples[
                    index %
                    probeSamples.length
                ].sampleId,

            galleryParticipantIds:
                buildMatedGallery({
                    participantIds,
                    participantId,
                    gallerySize,
                }),

            mateParticipantId:
                participantId,
        });
    }

    for (
        let index = 0;
        index < nonMatedCount;
        index++
    ) {
        const participantId =
            participantIds[
                index %
                participantIds.length
            ];

        const probeSamples =
            samplesByRole({
                participantById,
                participantId,
                role:
                    SAMPLE_ROLE.PROBE,
            });

        searches.push({
            searchId:
                `search-${split.toLowerCase()}-non-mated-${String(index + 1).padStart(2, "0")}`,

            split,

            kind:
                IDENTIFICATION_SEARCH_KIND.NON_MATED,

            probeSampleId:
                probeSamples[
                    index %
                    probeSamples.length
                ].sampleId,

            galleryParticipantIds:
                buildNonMatedGallery({
                    participantIds,
                    participantId,
                    gallerySize,
                }),
        });
    }

    return searches;
}

function requireSplitCapacity(
    participantIds,
    gallerySize,
    split,
) {
    if (
        !Array.isArray(
            participantIds,
        ) ||
        participantIds.length === 0
    ) {
        throw new TypeError(
            `${split} deve possuir participantes.`,
        );
    }

    if (
        gallerySize >=
        participantIds.length
    ) {
        throw new TypeError(
            `${split} precisa possuir mais participantes que plannedGallerySize para buscas NON_MATED.`,
        );
    }
}

export function createBiometricRealCalibrationPilotCollectionPlan({
    pilotPlan =
        REAL_CALIBRATION_PILOT_PLAN,

    protocolVersion,

    profileId,

    environmentId,

    deviceBindings,
} = {}) {
    const pilot =
        requirePilotPlan(
            pilotPlan,
        );

    const normalizedProtocolVersion =
        requireNonEmptyString(
            protocolVersion,
            "protocolVersion",
        );

    const normalizedProfileId =
        requireNonEmptyString(
            profileId,
            "profileId",
        );

    const bindings =
        normalizeBindings({
            pilotPlan:
                pilot,

            environmentId,

            deviceBindings,
        });

    requireSplitCapacity(
        pilot.calibrationParticipantIds,
        pilot.plannedGallerySize,
        CALIBRATION_SPLIT.CALIBRATION,
    );

    requireSplitCapacity(
        pilot.evaluationParticipantIds,
        pilot.plannedGallerySize,
        CALIBRATION_SPLIT.EVALUATION,
    );

    const participants =
        transformParticipants({
            pilotPlan:
                pilot,

            profileId:
                normalizedProfileId,
        });

    const participantById =
        indexParticipants(
            participants,
        );

    const calibrationMinimums =
        pilot.controlledStudyMinimums
            .calibration;

    const evaluationMinimums =
        pilot.controlledStudyMinimums
            .evaluation;

    const verificationComparisons = [
        ...buildVerificationComparisons({
            split:
                CALIBRATION_SPLIT.CALIBRATION,

            participantIds:
                pilot.calibrationParticipantIds,

            participantById,

            genuineCount:
                calibrationMinimums
                    .genuineComparisons,

            impostorCount:
                calibrationMinimums
                    .impostorComparisons,
        }),

        ...buildVerificationComparisons({
            split:
                CALIBRATION_SPLIT.EVALUATION,

            participantIds:
                pilot.evaluationParticipantIds,

            participantById,

            genuineCount:
                evaluationMinimums
                    .genuineComparisons,

            impostorCount:
                evaluationMinimums
                    .impostorComparisons,
        }),
    ];

    const identificationSearches = [
        ...buildIdentificationSearches({
            split:
                CALIBRATION_SPLIT.CALIBRATION,

            participantIds:
                pilot.calibrationParticipantIds,

            participantById,

            gallerySize:
                pilot.plannedGallerySize,

            matedCount:
                calibrationMinimums
                    .matedSearches,

            nonMatedCount:
                calibrationMinimums
                    .nonMatedSearches,
        }),

        ...buildIdentificationSearches({
            split:
                CALIBRATION_SPLIT.EVALUATION,

            participantIds:
                pilot.evaluationParticipantIds,

            participantById,

            gallerySize:
                pilot.plannedGallerySize,

            matedCount:
                evaluationMinimums
                    .matedSearches,

            nonMatedCount:
                evaluationMinimums
                    .nonMatedSearches,
        }),
    ];

    const collectionPlan = {
        protocolVersion:
            normalizedProtocolVersion,

        profileId:
            normalizedProfileId,

        plannedParticipantCount:
            pilot.plannedParticipantCount,

        sessionsPerParticipant:
            pilot.sessionsPerParticipant,

        samplesPerSession:
            pilot.samplesPerSession,

        plannedGallerySize:
            pilot.plannedGallerySize,

        captureConditionCatalog:
            transformCaptureConditions({
                pilotPlan:
                    pilot,

                environmentId:
                    bindings.environmentId,

                deviceBindings:
                    bindings.deviceBindings,
            }),

        participants,

        calibrationParticipantIds: [
            ...pilot.calibrationParticipantIds,
        ],

        evaluationParticipantIds: [
            ...pilot.evaluationParticipantIds,
        ],

        verificationComparisons,

        identificationSearches,

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
                pilot.plannedParticipantCount,

            minimumSessionsPerParticipant:
                pilot.sessionsPerParticipant,

            minimumSamplesPerSession:
                pilot.samplesPerSession,

            minimumGenuineComparisons:
                calibrationMinimums
                    .genuineComparisons,

            minimumImpostorComparisons:
                calibrationMinimums
                    .impostorComparisons,

            minimumMatedSearches:
                calibrationMinimums
                    .matedSearches,

            minimumNonMatedSearches:
                calibrationMinimums
                    .nonMatedSearches,

            minimumGallerySize:
                pilot.plannedGallerySize,

            minimumSamplesPerCondition:
                1,
        },
    };

    validateBiometricCalibrationCollectionPlan(
        collectionPlan,
    );

    return collectionPlan;
}