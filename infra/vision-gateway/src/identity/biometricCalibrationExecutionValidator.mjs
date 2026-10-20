import {
    evaluateBiometricControlledStudyContract,
} from "./biometricControlledStudyContract.mjs";

import {
    CALIBRATION_SPLIT,
    IDENTIFICATION_SEARCH_KIND,
    VERIFICATION_LABEL,
    validateBiometricCalibrationCollectionPlan,
} from "./biometricCalibrationCollectionProtocol.mjs";

import {
    evaluateBiometricCalibrationExecutionManifest,
} from "./biometricCalibrationExecutionManifest.mjs";

import {
    CALIBRATION_RECORD_TYPE,
    validateBiometricCalibrationDataset,
} from "./biometricCalibrationDataContract.mjs";

const RESULT_KEYS =
    Object.freeze([
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
    ]);

function safeId(
    value,
) {
    return value.trim();
}

function toIdSet(
    values,
) {
    return new Set(
        values.map(
            (
                value,
            ) =>
                safeId(
                    value,
                ),
        ),
    );
}

function setsEqual(
    left,
    right,
) {
    if (
        left.size !==
        right.size
    ) {
        return false;
    }

    for (
        const value of
        left
    ) {
        if (
            !right.has(
                value,
            )
        ) {
            return false;
        }
    }

    return true;
}

function allEqual(
    values,
) {
    if (
        values.length ===
        0
    ) {
        return false;
    }

    const first =
        values[0];

    return values.every(
        (
            value,
        ) =>
            value ===
            first,
    );
}

function pushBlocker(
    blockers,
    code,
) {
    if (
        !blockers.includes(
            code,
        )
    ) {
        blockers.push(
            code,
        );
    }
}

function emptyResult() {
    return {
        contractReady:
            false,

        planValid:
            false,

        manifestValid:
            false,

        datasetValid:
            false,

        datasetVersionCompatible:
            false,

        protocolCompatible:
            false,

        profileCompatible:
            false,

        environmentCompatible:
            false,

        participantExecutionComplete:
            false,

        sessionExecutionComplete:
            false,

        sampleExecutionComplete:
            false,

        conditionExecutionComplete:
            false,

        deviceExecutionComplete:
            false,

        verificationTraceabilityValid:
            false,

        identificationTraceabilityValid:
            false,

        timestampsComplete:
            false,

        plannedCountsMatch:
            false,

        readyForCalibrationAnalysis:
            false,

        warnings:
            [],

        blockers:
            [],
    };
}

function freezeResult(
    result,
) {
    const keys =
        Object.keys(
            result,
        );

    if (
        keys.length !==
            RESULT_KEYS.length ||
        keys.some(
            (
                key,
                index,
            ) =>
                key !==
                RESULT_KEYS[index],
        )
    ) {
        throw new Error(
            "resultado do validator possui shape nao autorizado.",
        );
    }

    return Object.freeze({
        ...result,

        warnings:
            Object.freeze([
                ...result.warnings,
            ]),

        blockers:
            Object.freeze([
                ...result.blockers,
            ]),
    });
}

function buildPlanModel(
    plan,
) {
    const conditionById =
        new Map(
            plan.captureConditionCatalog.map(
                (
                    condition,
                ) => [
                    condition.id,
                    condition,
                ],
            ),
        );

    const calibrationParticipantIds =
        new Set(
            plan.calibrationParticipantIds,
        );

    const participants =
        new Map();

    const participantIds =
        new Set();

    const sessionIds =
        new Set();

    const sampleIds =
        new Set();

    const conditionIds =
        new Set();

    const deviceIds =
        new Set();

    const environmentIds =
        new Set();

    const sampleIndex =
        new Map();

    for (
        const participant of
        plan.participants
    ) {
        if (
            !calibrationParticipantIds.has(
                participant.participantId,
            )
        ) {
            continue;
        }

        participantIds.add(
            participant.participantId,
        );

        const sessions =
            new Map();

        for (
            const session of
            participant.sessions
        ) {
            sessionIds.add(
                session.sessionId,
            );

            const samples =
                new Map();

            for (
                const sample of
                session.samples
            ) {
                const condition =
                    conditionById.get(
                        sample.captureConditionId,
                    );

                const normalized =
                    Object.freeze({
                        participantId:
                            participant.participantId,

                        sessionId:
                            session.sessionId,

                        sampleId:
                            sample.sampleId,

                        captureConditionId:
                            sample.captureConditionId,

                        deviceId:
                            condition.deviceId,

                        environmentId:
                            condition.environmentId,
                    });

                sampleIds.add(
                    sample.sampleId,
                );

                conditionIds.add(
                    sample.captureConditionId,
                );

                deviceIds.add(
                    condition.deviceId,
                );

                environmentIds.add(
                    condition.environmentId,
                );

                samples.set(
                    sample.sampleId,
                    normalized,
                );

                sampleIndex.set(
                    sample.sampleId,
                    normalized,
                );
            }

            sessions.set(
                session.sessionId,
                Object.freeze({
                    sessionId:
                        session.sessionId,

                    samples,
                }),
            );
        }

        participants.set(
            participant.participantId,
            Object.freeze({
                participantId:
                    participant.participantId,

                sessions,
            }),
        );
    }

    const verification =
        new Map();

    for (
        const comparison of
        plan.verificationComparisons
    ) {
        if (
            comparison.split !==
            CALIBRATION_SPLIT.CALIBRATION
        ) {
            continue;
        }

        verification.set(
            comparison.comparisonId,
            comparison,
        );
    }

    const identification =
        new Map();

    for (
        const search of
        plan.identificationSearches
    ) {
        if (
            search.split !==
            CALIBRATION_SPLIT.CALIBRATION
        ) {
            continue;
        }

        identification.set(
            search.searchId,
            search,
        );
    }

    const counts =
        Object.freeze({
            genuineComparisons:
                Array.from(
                    verification.values(),
                ).filter(
                    (
                        item,
                    ) =>
                        item.label ===
                        VERIFICATION_LABEL.GENUINE,
                ).length,

            impostorComparisons:
                Array.from(
                    verification.values(),
                ).filter(
                    (
                        item,
                    ) =>
                        item.label ===
                        VERIFICATION_LABEL.IMPOSTOR,
                ).length,

            matedSearches:
                Array.from(
                    identification.values(),
                ).filter(
                    (
                        item,
                    ) =>
                        item.kind ===
                        IDENTIFICATION_SEARCH_KIND.MATED,
                ).length,

            nonMatedSearches:
                Array.from(
                    identification.values(),
                ).filter(
                    (
                        item,
                    ) =>
                        item.kind ===
                        IDENTIFICATION_SEARCH_KIND.NON_MATED,
                ).length,
        });

    return Object.freeze({
        participants,
        participantIds,
        sessionIds,
        sampleIds,
        conditionIds,
        deviceIds,
        environmentIds,
        conditionById,
        sampleIndex,
        verification,
        identification,
        counts,
    });
}

function buildManifestModel(
    manifest,
) {
    const participants =
        new Map();

    const participantIds =
        new Set();

    const sessionIds =
        new Set();

    const sampleIds =
        new Set();

    const conditionIds =
        new Set();

    const deviceIds =
        new Set();

    const sessionIndex =
        new Map();

    for (
        const participant of
        manifest.participants
    ) {
        const participantId =
            safeId(
                participant.participantId,
            );

        participantIds.add(
            participantId,
        );

        const sessions =
            new Map();

        for (
            const session of
            participant.sessions
        ) {
            const sessionId =
                safeId(
                    session.sessionId,
                );

            sessionIds.add(
                sessionId,
            );

            const startedAtMs =
                Date.parse(
                    session.startedAt,
                );

            const completedAtMs =
                Date.parse(
                    session.completedAt,
                );

            const samples =
                new Map();

            for (
                const sample of
                session.samples
            ) {
                const sampleId =
                    safeId(
                        sample.sampleId,
                    );

                const captureConditionId =
                    safeId(
                        sample.captureConditionId,
                    );

                const deviceId =
                    safeId(
                        sample.deviceId,
                    );

                sampleIds.add(
                    sampleId,
                );

                conditionIds.add(
                    captureConditionId,
                );

                deviceIds.add(
                    deviceId,
                );

                samples.set(
                    sampleId,
                    Object.freeze({
                        sampleId,
                        captureConditionId,
                        deviceId,

                        capturedAtMs:
                            Date.parse(
                                sample.capturedAt,
                            ),
                    }),
                );
            }

            const normalizedSession =
                Object.freeze({
                    sessionId,
                    startedAtMs,
                    completedAtMs,
                    samples,
                });

            sessions.set(
                sessionId,
                normalizedSession,
            );

            sessionIndex.set(
                sessionId,
                normalizedSession,
            );
        }

        participants.set(
            participantId,
            Object.freeze({
                participantId,
                sessions,
            }),
        );
    }

    return Object.freeze({
        participants,
        participantIds,
        sessionIds,
        sampleIds,
        conditionIds,
        deviceIds,
        sessionIndex,
    });
}

function buildDatasetModel(
    dataset,
) {
    const conditionDeviceMap =
        new Map(
            dataset.captureConditionCatalog.map(
                (
                    condition,
                ) => [
                    condition.id,
                    condition.deviceId,
                ],
            ),
        );

    const conditionIds =
        new Set();

    const deviceIds =
        new Set();

    const verificationRecords =
        [];

    const identificationRecords =
        [];

    for (
        const record of
        dataset.records
    ) {
        conditionIds.add(
            record.captureConditionId,
        );

        const deviceId =
            conditionDeviceMap.get(
                record.captureConditionId,
            );

        if (
            deviceId !==
            undefined
        ) {
            deviceIds.add(
                deviceId,
            );
        }

        if (
            record.type ===
            CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON
        ) {
            verificationRecords.push(
                record,
            );
        }
        else {
            identificationRecords.push(
                record,
            );
        }
    }

    const counts =
        Object.freeze({
            genuineComparisons:
                verificationRecords.filter(
                    (
                        record,
                    ) =>
                        record.label ===
                        VERIFICATION_LABEL.GENUINE,
                ).length,

            impostorComparisons:
                verificationRecords.filter(
                    (
                        record,
                    ) =>
                        record.label ===
                        VERIFICATION_LABEL.IMPOSTOR,
                ).length,

            matedSearches:
                identificationRecords.filter(
                    (
                        record,
                    ) =>
                        record.kind ===
                        IDENTIFICATION_SEARCH_KIND.MATED,
                ).length,

            nonMatedSearches:
                identificationRecords.filter(
                    (
                        record,
                    ) =>
                        record.kind ===
                        IDENTIFICATION_SEARCH_KIND.NON_MATED,
                ).length,
        });

    return Object.freeze({
        conditionDeviceMap,
        conditionIds,
        deviceIds,
        verificationRecords:
            Object.freeze(
                verificationRecords,
            ),
        identificationRecords:
            Object.freeze(
                identificationRecords,
            ),
        counts,
    });
}

function participantsComplete({
    contractPhase,
    planModel,
    manifestModel,
}) {
    const contractIds =
        toIdSet(
            contractPhase.participantIds,
        );

    return (
        setsEqual(
            contractIds,
            planModel.participantIds,
        ) &&
        setsEqual(
            contractIds,
            manifestModel.participantIds,
        )
    );
}

function sessionsComplete({
    contractPhase,
    planModel,
    manifestModel,
}) {
    const contractSessionIds =
        toIdSet(
            contractPhase.sessionIds,
        );

    if (
        !setsEqual(
            contractSessionIds,
            planModel.sessionIds,
        ) ||
        !setsEqual(
            contractSessionIds,
            manifestModel.sessionIds,
        )
    ) {
        return false;
    }

    for (
        const [
            participantId,
            planParticipant,
        ] of
        planModel.participants
    ) {
        const manifestParticipant =
            manifestModel.participants.get(
                participantId,
            );

        if (!manifestParticipant) {
            return false;
        }

        if (
            !setsEqual(
                new Set(
                    planParticipant.sessions.keys(),
                ),
                new Set(
                    manifestParticipant.sessions.keys(),
                ),
            )
        ) {
            return false;
        }
    }

    return true;
}

function samplesComplete({
    planModel,
    manifestModel,
}) {
    if (
        !setsEqual(
            planModel.sampleIds,
            manifestModel.sampleIds,
        )
    ) {
        return false;
    }

    for (
        const [
            participantId,
            planParticipant,
        ] of
        planModel.participants
    ) {
        const manifestParticipant =
            manifestModel.participants.get(
                participantId,
            );

        if (!manifestParticipant) {
            return false;
        }

        for (
            const [
                sessionId,
                planSession,
            ] of
            planParticipant.sessions
        ) {
            const manifestSession =
                manifestParticipant.sessions.get(
                    sessionId,
                );

            if (!manifestSession) {
                return false;
            }

            if (
                !setsEqual(
                    new Set(
                        planSession.samples.keys(),
                    ),
                    new Set(
                        manifestSession.samples.keys(),
                    ),
                )
            ) {
                return false;
            }
        }
    }

    return true;
}

function conditionsComplete({
    contractPhase,
    planModel,
    manifestModel,
    datasetModel,
}) {
    const contractConditionIds =
        toIdSet(
            contractPhase.captureConditionIds,
        );

    if (
        !setsEqual(
            contractConditionIds,
            planModel.conditionIds,
        ) ||
        !setsEqual(
            contractConditionIds,
            manifestModel.conditionIds,
        ) ||
        !setsEqual(
            contractConditionIds,
            datasetModel.conditionIds,
        )
    ) {
        return false;
    }

    for (
        const [
            participantId,
            planParticipant,
        ] of
        planModel.participants
    ) {
        const manifestParticipant =
            manifestModel.participants.get(
                participantId,
            );

        if (!manifestParticipant) {
            return false;
        }

        for (
            const [
                sessionId,
                planSession,
            ] of
            planParticipant.sessions
        ) {
            const manifestSession =
                manifestParticipant.sessions.get(
                    sessionId,
                );

            if (!manifestSession) {
                return false;
            }

            for (
                const [
                    sampleId,
                    planSample,
                ] of
                planSession.samples
            ) {
                const manifestSample =
                    manifestSession.samples.get(
                        sampleId,
                    );

                if (
                    !manifestSample ||
                    manifestSample.captureConditionId !==
                        planSample.captureConditionId
                ) {
                    return false;
                }
            }
        }
    }

    return true;
}

function devicesComplete({
    contractPhase,
    planModel,
    manifestModel,
    datasetModel,
}) {
    const contractDeviceIds =
        toIdSet(
            contractPhase.deviceIds,
        );

    if (
        !setsEqual(
            contractDeviceIds,
            planModel.deviceIds,
        ) ||
        !setsEqual(
            contractDeviceIds,
            manifestModel.deviceIds,
        ) ||
        !setsEqual(
            contractDeviceIds,
            datasetModel.deviceIds,
        )
    ) {
        return false;
    }

    for (
        const [
            participantId,
            planParticipant,
        ] of
        planModel.participants
    ) {
        const manifestParticipant =
            manifestModel.participants.get(
                participantId,
            );

        if (!manifestParticipant) {
            return false;
        }

        for (
            const [
                sessionId,
                planSession,
            ] of
                planParticipant.sessions
        ) {
            const manifestSession =
                manifestParticipant.sessions.get(
                    sessionId,
                );

            if (!manifestSession) {
                return false;
            }

            for (
                const [
                    sampleId,
                    planSample,
                ] of
                planSession.samples
            ) {
                const manifestSample =
                    manifestSession.samples.get(
                        sampleId,
                    );

                if (
                    !manifestSample ||
                    manifestSample.deviceId !==
                        planSample.deviceId
                ) {
                    return false;
                }
            }
        }
    }

    for (
        const conditionId of
        planModel.conditionIds
    ) {
        const planCondition =
            planModel.conditionById.get(
                conditionId,
            );

        const datasetDeviceId =
            datasetModel.conditionDeviceMap.get(
                conditionId,
            );

        if (
            !planCondition ||
            datasetDeviceId !==
                planCondition.deviceId
        ) {
            return false;
        }
    }

    return true;
}

function verificationTraceabilityValid({
    planModel,
    datasetModel,
}) {
    if (
        datasetModel.verificationRecords.length !==
        planModel.verification.size
    ) {
        return false;
    }

    const seen =
        new Set();

    for (
        const record of
        datasetModel.verificationRecords
    ) {
        if (
            !Object.hasOwn(
                record,
                "comparisonId",
            )
        ) {
            return false;
        }

        const comparisonId =
            record.comparisonId;

        if (
            seen.has(
                comparisonId,
            )
        ) {
            return false;
        }

        const planned =
            planModel.verification.get(
                comparisonId,
            );

        if (!planned) {
            return false;
        }

        const probe =
            planModel.sampleIndex.get(
                planned.probeSampleId,
            );

        if (!probe) {
            return false;
        }

        if (
            record.label !==
                planned.label ||
            record.sampleId !==
                planned.probeSampleId ||
            record.sessionId !==
                probe.sessionId ||
            record.captureConditionId !==
                probe.captureConditionId
        ) {
            return false;
        }

        seen.add(
            comparisonId,
        );
    }

    return (
        seen.size ===
        planModel.verification.size
    );
}

function identificationTraceabilityValid({
    planModel,
    datasetModel,
}) {
    if (
        datasetModel.identificationRecords.length !==
        planModel.identification.size
    ) {
        return false;
    }

    const seen =
        new Set();

    for (
        const record of
        datasetModel.identificationRecords
    ) {
        const planned =
            planModel.identification.get(
                record.searchId,
            );

        if (
            !planned ||
            seen.has(
                record.searchId,
            )
        ) {
            return false;
        }

        const probe =
            planModel.sampleIndex.get(
                planned.probeSampleId,
            );

        if (!probe) {
            return false;
        }

        if (
            record.kind !==
                planned.kind ||
            record.sessionId !==
                probe.sessionId ||
            record.captureConditionId !==
                probe.captureConditionId ||
            record.candidateCount !==
                planned.galleryParticipantIds.length
        ) {
            return false;
        }

        seen.add(
            record.searchId,
        );
    }

    return (
        seen.size ===
        planModel.identification.size
    );
}

function timestampsComplete({
    dataset,
    manifestModel,
}) {
    if (
        dataset.records.length ===
        0
    ) {
        return false;
    }

    let latestRecordMs =
        Number.NEGATIVE_INFINITY;

    for (
        const record of
        dataset.records
    ) {
        if (
            record.timestamp ===
                null ||
            record.timestamp ===
                undefined
        ) {
            return false;
        }

        const timestampMs =
            Date.parse(
                record.timestamp,
            );

        if (
            !Number.isFinite(
                timestampMs,
            )
        ) {
            return false;
        }

        const session =
            manifestModel.sessionIndex.get(
                record.sessionId,
            );

        if (
            !session ||
            timestampMs <
                session.startedAtMs ||
            timestampMs >
                session.completedAtMs
        ) {
            return false;
        }

        latestRecordMs =
            Math.max(
                latestRecordMs,
                timestampMs,
            );
    }

    const createdAtMs =
        Date.parse(
            dataset.createdAt,
        );

    return (
        Number.isFinite(
            createdAtMs,
        ) &&
        createdAtMs >=
            latestRecordMs
    );
}

function countsEqual(
    left,
    middle,
    right,
) {
    const keys =
        [
            "genuineComparisons",
            "impostorComparisons",
            "matedSearches",
            "nonMatedSearches",
        ];

    return keys.every(
        (
            key,
        ) =>
            left[key] ===
                middle[key] &&
            left[key] ===
                right[key],
    );
}

export function evaluateBiometricCalibrationExecutionValidation({
    controlledStudyContract,
    collectionPlan,
    executionManifest,
    calibrationDataset,
} = {}) {
    const result =
        emptyResult();

    let contractSummary;

    try {
        contractSummary =
            evaluateBiometricControlledStudyContract(
                controlledStudyContract,
            );
    }
    catch {
        contractSummary =
            null;
    }

    if (
        !contractSummary ||
        !contractSummary.contractValid
    ) {
        pushBlocker(
            result.blockers,
            "CONTRACT_INVALID",
        );
    }
    else if (
        !contractSummary.readyForControlledStudy
    ) {
        pushBlocker(
            result.blockers,
            "CONTRACT_NOT_READY",
        );
    }
    else {
        result.contractReady =
            true;
    }

    let plan =
        null;

    try {
        plan =
            validateBiometricCalibrationCollectionPlan(
                collectionPlan,
            );

        result.planValid =
            true;
    }
    catch {
        pushBlocker(
            result.blockers,
            "PLAN_INVALID",
        );
    }

    let manifestSummary;

    try {
        manifestSummary =
            evaluateBiometricCalibrationExecutionManifest(
                executionManifest,
            );
    }
    catch {
        manifestSummary =
            null;
    }

    if (
        !manifestSummary ||
        !manifestSummary.manifestValid
    ) {
        pushBlocker(
            result.blockers,
            "MANIFEST_INVALID",
        );
    }
    else {
        result.manifestValid =
            true;

        if (
            !manifestSummary.readyForCalibrationExecutionValidation
        ) {
            pushBlocker(
                result.blockers,
                "MANIFEST_NOT_READY",
            );
        }
    }

    let dataset =
        null;

    try {
        dataset =
            validateBiometricCalibrationDataset(
                calibrationDataset,
            );

        result.datasetValid =
            true;
    }
    catch {
        pushBlocker(
            result.blockers,
            "DATASET_INVALID",
        );
    }

    if (
        !result.contractReady ||
        !result.planValid ||
        !result.manifestValid ||
        !manifestSummary?.readyForCalibrationExecutionValidation ||
        !result.datasetValid
    ) {
        return freezeResult(
            result,
        );
    }

    try {
        const contractPhase =
            controlledStudyContract.calibration;

        const planModel =
            buildPlanModel(
                plan,
            );

        const manifestModel =
            buildManifestModel(
                executionManifest,
            );

        const datasetModel =
            buildDatasetModel(
                dataset,
            );

        result.datasetVersionCompatible =
            allEqual([
                safeId(
                    contractPhase.datasetVersion,
                ),
                safeId(
                    executionManifest.datasetVersion,
                ),
                dataset.datasetVersion,
            ]);

        if (
            !result.datasetVersionCompatible
        ) {
            pushBlocker(
                result.blockers,
                "DATASET_VERSION_INCOMPATIBLE",
            );
        }

        result.protocolCompatible =
            allEqual([
                safeId(
                    controlledStudyContract.protocolVersion,
                ),
                safeId(
                    contractPhase.protocolVersion,
                ),
                plan.protocolVersion,
                safeId(
                    executionManifest.protocolVersion,
                ),
                dataset.protocolVersion,
            ]);

        if (
            !result.protocolCompatible
        ) {
            pushBlocker(
                result.blockers,
                "PROTOCOL_INCOMPATIBLE",
            );
        }

        result.profileCompatible =
            allEqual([
                safeId(
                    controlledStudyContract.profileId,
                ),
                safeId(
                    contractPhase.profileId,
                ),
                plan.profileId,
                safeId(
                    executionManifest.profileId,
                ),
                dataset.profileId,
            ]);

        if (
            !result.profileCompatible
        ) {
            pushBlocker(
                result.blockers,
                "PROFILE_INCOMPATIBLE",
            );
        }

        const contractEnvironmentId =
            safeId(
                contractPhase.environmentId,
            );

        result.environmentCompatible =
            allEqual([
                contractEnvironmentId,
                safeId(
                    executionManifest.environmentId,
                ),
                dataset.environmentId,
            ]) &&
            planModel.environmentIds.size ===
                1 &&
            planModel.environmentIds.has(
                contractEnvironmentId,
            );

        if (
            !result.environmentCompatible
        ) {
            pushBlocker(
                result.blockers,
                "ENVIRONMENT_INCOMPATIBLE",
            );
        }

        result.participantExecutionComplete =
            participantsComplete({
                contractPhase,
                planModel,
                manifestModel,
            });

        if (
            !result.participantExecutionComplete
        ) {
            pushBlocker(
                result.blockers,
                "PARTICIPANT_EXECUTION_INCOMPLETE",
            );
        }

        result.sessionExecutionComplete =
            result.participantExecutionComplete &&
            sessionsComplete({
                contractPhase,
                planModel,
                manifestModel,
            });

        if (
            !result.sessionExecutionComplete
        ) {
            pushBlocker(
                result.blockers,
                "SESSION_EXECUTION_INCOMPLETE",
            );
        }

        result.sampleExecutionComplete =
            result.sessionExecutionComplete &&
            samplesComplete({
                planModel,
                manifestModel,
            });

        if (
            !result.sampleExecutionComplete
        ) {
            pushBlocker(
                result.blockers,
                "SAMPLE_EXECUTION_INCOMPLETE",
            );
        }

        result.conditionExecutionComplete =
            result.sampleExecutionComplete &&
            conditionsComplete({
                contractPhase,
                planModel,
                manifestModel,
                datasetModel,
            });

        if (
            !result.conditionExecutionComplete
        ) {
            pushBlocker(
                result.blockers,
                "CONDITION_EXECUTION_INCOMPLETE",
            );
        }

        result.deviceExecutionComplete =
            result.sampleExecutionComplete &&
            devicesComplete({
                contractPhase,
                planModel,
                manifestModel,
                datasetModel,
            });

        if (
            !result.deviceExecutionComplete
        ) {
            pushBlocker(
                result.blockers,
                "DEVICE_EXECUTION_INCOMPLETE",
            );
        }

        result.verificationTraceabilityValid =
            verificationTraceabilityValid({
                planModel,
                datasetModel,
            });

        if (
            !result.verificationTraceabilityValid
        ) {
            pushBlocker(
                result.blockers,
                "VERIFICATION_TRACEABILITY_INVALID",
            );
        }

        result.identificationTraceabilityValid =
            identificationTraceabilityValid({
                planModel,
                datasetModel,
            });

        if (
            !result.identificationTraceabilityValid
        ) {
            pushBlocker(
                result.blockers,
                "IDENTIFICATION_TRACEABILITY_INVALID",
            );
        }

        result.timestampsComplete =
            timestampsComplete({
                dataset,
                manifestModel,
            });

        if (
            !result.timestampsComplete
        ) {
            pushBlocker(
                result.blockers,
                "TIMESTAMPS_INCOMPLETE",
            );
        }

        result.plannedCountsMatch =
            countsEqual(
                contractPhase.plannedCounts,
                planModel.counts,
                datasetModel.counts,
            );

        if (
            !result.plannedCountsMatch
        ) {
            pushBlocker(
                result.blockers,
                "PLANNED_COUNTS_MISMATCH",
            );
        }

        result.readyForCalibrationAnalysis =
            result.contractReady &&
            result.planValid &&
            result.manifestValid &&
            result.datasetValid &&
            result.datasetVersionCompatible &&
            result.protocolCompatible &&
            result.profileCompatible &&
            result.environmentCompatible &&
            result.participantExecutionComplete &&
            result.sessionExecutionComplete &&
            result.sampleExecutionComplete &&
            result.conditionExecutionComplete &&
            result.deviceExecutionComplete &&
            result.verificationTraceabilityValid &&
            result.identificationTraceabilityValid &&
            result.timestampsComplete &&
            result.plannedCountsMatch &&
            result.blockers.length ===
                0;
    }
    catch {
        result.readyForCalibrationAnalysis =
            false;

        pushBlocker(
            result.blockers,
            "CROSS_VALIDATION_ERROR",
        );
    }

    return freezeResult(
        result,
    );
}
