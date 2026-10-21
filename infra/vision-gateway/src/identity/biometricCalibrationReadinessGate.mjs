import {
    CALIBRATION_SPLIT,
    summarizeBiometricCalibrationCollectionPlan,
    validateBiometricCalibrationCollectionPlan,
} from "./biometricCalibrationCollectionProtocol.mjs";

import {
    toBiometricThresholdCalibrationInput,
    validateBiometricCalibrationDataset,
} from "./biometricCalibrationDataContract.mjs";

import {
    IDENTIFICATION_SEARCH_KIND,
    VERIFICATION_LABEL,
    analyzeBiometricThresholdCalibration,
} from "./biometricThresholdCalibration.mjs";

const GATE_KEYS = new Set([
    "plan",
    "dataset",
    "datasetSplit",
    "analysisPolicy",
]);

const ANALYSIS_POLICY_KEYS = new Set([
    "thresholds",
    "percentilePoints",
    "minimumSampleCounts",
]);

const REPORT_KEYS = Object.freeze([
    "planStructurallyReady",
    "datasetContractValid",
    "calibrationHarnessCompatible",
    "profileCompatible",
    "splitIsolationValid",
    "conditionCoverageValid",
    "verificationCoverageValid",
    "identificationCoverageValid",
    "technicalReadyForControlledStudy",
    "warnings",
    "blockers",
]);

function assertPlainObject(value, name) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw new TypeError(`${name} deve ser objeto.`);
    }

    return value;
}

function assertExactKeys(value, allowedKeys, name) {
    for (const key of Object.keys(value)) {
        if (!allowedKeys.has(key)) {
            throw new TypeError(`${name}.${key} nao e permitido pelo readiness gate.`);
        }
    }
}

function normalizeAnalysisPolicy(value) {
    const source = assertPlainObject(value, "analysisPolicy");
    assertExactKeys(source, ANALYSIS_POLICY_KEYS, "analysisPolicy");

    for (const key of ANALYSIS_POLICY_KEYS) {
        if (!Object.hasOwn(source, key)) {
            throw new TypeError(
                `analysisPolicy.${key} deve ser explicitamente fornecido.`,
            );
        }
    }

    return Object.freeze({
        thresholds: source.thresholds,
        percentilePoints: source.percentilePoints,
        minimumSampleCounts: source.minimumSampleCounts,
    });
}

function normalizeDatasetSplit(value) {
    if (!Object.values(CALIBRATION_SPLIT).includes(value)) {
        throw new TypeError("datasetSplit deve ser CALIBRATION ou EVALUATION.");
    }

    return value;
}

function pushUnique(target, code) {
    if (!target.includes(code)) {
        target.push(code);
    }
}

function safePlanWarningCode(warning) {
    const metric =
        warning &&
        typeof warning === "object" &&
        typeof warning.metric === "string"
            ? `:${warning.metric}`
            : "";

    const code =
        warning &&
        typeof warning === "object" &&
        typeof warning.code === "string"
            ? warning.code
            : "UNKNOWN";

    return `PLAN:${code}${metric}`;
}

function safeHarnessWarningCode(warning) {
    const dataset =
        warning &&
        typeof warning === "object" &&
        typeof warning.dataset === "string"
            ? `:${warning.dataset}`
            : "";

    const code =
        warning &&
        typeof warning === "object" &&
        typeof warning.code === "string"
            ? warning.code
            : "UNKNOWN";

    return `HARNESS:${code}${dataset}`;
}

function arraysEqualAsSets(left, right) {
    if (left.length !== right.length) {
        return false;
    }

    const a = [...left].sort((left, right) => left.localeCompare(right));
    const b = [...right].sort((left, right) => left.localeCompare(right));

    return a.every((value, index) => value === b[index]);
}

function sameConditionDefinition(planCondition, datasetCondition) {
    return (
        planCondition.id === datasetCondition.id &&
        planCondition.lighting === datasetCondition.lighting &&
        planCondition.distanceBand === datasetCondition.distanceBand &&
        planCondition.pose === datasetCondition.pose &&
        planCondition.glasses === datasetCondition.glasses &&
        planCondition.deviceId === datasetCondition.deviceId &&
        arraysEqualAsSets(planCondition.ppe, datasetCondition.ppe)
    );
}

function buildAllowedSessionIds(plan, datasetSplit) {
    const participantIds =
        datasetSplit === CALIBRATION_SPLIT.CALIBRATION
            ? new Set(plan.calibrationParticipantIds)
            : new Set(plan.evaluationParticipantIds);

    const allowed = new Set();

    for (const participant of plan.participants) {
        if (!participantIds.has(participant.participantId)) {
            continue;
        }

        for (const session of participant.sessions) {
            allowed.add(session.sessionId);
        }
    }

    return allowed;
}

function validateSplitIsolation({
    plan,
    dataset,
    datasetSplit,
}) {
    if (
        plan.policies.disjointCalibrationEvaluationRequired !== true ||
        plan.policies.enrollmentProbeSeparationRequired !== true
    ) {
        return false;
    }

    const allowedSessions = buildAllowedSessionIds(plan, datasetSplit);

    if (allowedSessions.size === 0) {
        return false;
    }

    return dataset.records.every((record) =>
        allowedSessions.has(record.sessionId),
    );
}

function validateConditionCoverage({
    plan,
    dataset,
}) {
    const expectedPlanConditions = plan.captureConditionCatalog.filter(
        (condition) => condition.environmentId === dataset.environmentId,
    );

    if (expectedPlanConditions.length === 0) {
        return false;
    }

    if (
        expectedPlanConditions.length !==
        dataset.captureConditionCatalog.length
    ) {
        return false;
    }

    const datasetById = new Map(
        dataset.captureConditionCatalog.map((condition) => [
            condition.id,
            condition,
        ]),
    );

    for (const planCondition of expectedPlanConditions) {
        const datasetCondition = datasetById.get(planCondition.id);

        if (
            !datasetCondition ||
            !sameConditionDefinition(planCondition, datasetCondition)
        ) {
            return false;
        }
    }

    const usedConditionIds = new Set(
        dataset.records.map((record) => record.captureConditionId),
    );

    return expectedPlanConditions.every((condition) =>
        usedConditionIds.has(condition.id),
    );
}

function validateVerificationCoverage({
    plan,
    converted,
    datasetSplit,
}) {
    const plannedForSplit = plan.verificationComparisons.filter(
        (record) => record.split === datasetSplit,
    );

    const plannedGenuine = plannedForSplit.some(
        (record) => record.label === VERIFICATION_LABEL.GENUINE,
    );
    const plannedImpostor = plannedForSplit.some(
        (record) => record.label === VERIFICATION_LABEL.IMPOSTOR,
    );

    const actualGenuine = converted.verificationComparisons.some(
        (record) => record.label === VERIFICATION_LABEL.GENUINE,
    );
    const actualImpostor = converted.verificationComparisons.some(
        (record) => record.label === VERIFICATION_LABEL.IMPOSTOR,
    );

    return (
        plannedGenuine &&
        plannedImpostor &&
        actualGenuine &&
        actualImpostor
    );
}

function validateIdentificationCoverage({
    plan,
    converted,
    datasetSplit,
}) {
    const plannedForSplit = plan.identificationSearches.filter(
        (record) => record.split === datasetSplit,
    );

    const plannedMated = plannedForSplit.some(
        (record) => record.kind === IDENTIFICATION_SEARCH_KIND.MATED,
    );
    const plannedNonMated = plannedForSplit.some(
        (record) => record.kind === IDENTIFICATION_SEARCH_KIND.NON_MATED,
    );

    const actualMated = converted.identificationSearches.some(
        (record) => record.kind === IDENTIFICATION_SEARCH_KIND.MATED,
    );
    const actualNonMated = converted.identificationSearches.some(
        (record) => record.kind === IDENTIFICATION_SEARCH_KIND.NON_MATED,
    );

    return (
        plannedMated &&
        plannedNonMated &&
        actualMated &&
        actualNonMated
    );
}

function frozenReport(values) {
    const result = {};

    for (const key of REPORT_KEYS) {
        result[key] = values[key];
    }

    return Object.freeze(result);
}

export function evaluateBiometricCalibrationReadiness(input = {}) {
    const source = assertPlainObject(input, "readinessInput");
    assertExactKeys(source, GATE_KEYS, "readinessInput");

    const datasetSplit = normalizeDatasetSplit(source.datasetSplit);
    const analysisPolicy = normalizeAnalysisPolicy(source.analysisPolicy);

    const warnings = [];
    const blockers = [];

    let normalizedPlan = null;
    let planSummary = null;

    try {
        normalizedPlan = validateBiometricCalibrationCollectionPlan(
            source.plan,
        );
        planSummary = summarizeBiometricCalibrationCollectionPlan(
            source.plan,
        );
    } catch {
        pushUnique(blockers, "PLAN_CONTRACT_INVALID");
    }

    const planStructurallyReady =
        planSummary?.readyForRealCollection === true &&
        planSummary?.readinessScope === "STRUCTURAL_PLAN_ONLY";

    if (planSummary) {
        for (const warning of planSummary.warnings) {
            pushUnique(warnings, safePlanWarningCode(warning));
        }
    }

    if (!planStructurallyReady) {
        pushUnique(blockers, "PLAN_NOT_STRUCTURALLY_READY");
    }

    let normalizedDataset = null;
    let converted = null;

    try {
        normalizedDataset = validateBiometricCalibrationDataset(
            source.dataset,
        );
        converted = toBiometricThresholdCalibrationInput(
            source.dataset,
        );
    } catch {
        pushUnique(blockers, "DATASET_CONTRACT_INVALID");
    }

    const datasetContractValid =
        normalizedDataset !== null &&
        converted !== null;

    const profileCompatible =
        normalizedPlan !== null &&
        normalizedDataset !== null &&
        normalizedPlan.profileId === normalizedDataset.profileId;

    if (!profileCompatible) {
        pushUnique(blockers, "PROFILE_INCOMPATIBLE");
    }

    const protocolCompatible =
        normalizedPlan !== null &&
        normalizedDataset !== null &&
        normalizedPlan.protocolVersion ===
            normalizedDataset.protocolVersion;

    if (!protocolCompatible) {
        pushUnique(blockers, "PROTOCOL_INCOMPATIBLE");
    }

    const splitIsolationValid =
        normalizedPlan !== null &&
        normalizedDataset !== null &&
        validateSplitIsolation({
            plan: normalizedPlan,
            dataset: normalizedDataset,
            datasetSplit,
        });

    if (!splitIsolationValid) {
        pushUnique(blockers, "SPLIT_ISOLATION_INVALID");
    }

    const conditionCoverageValid =
        normalizedPlan !== null &&
        normalizedDataset !== null &&
        validateConditionCoverage({
            plan: normalizedPlan,
            dataset: normalizedDataset,
        });

    if (!conditionCoverageValid) {
        pushUnique(blockers, "CONDITION_COVERAGE_INVALID");
    }

    const verificationCoverageValid =
        normalizedPlan !== null &&
        converted !== null &&
        validateVerificationCoverage({
            plan: normalizedPlan,
            converted,
            datasetSplit,
        });

    if (!verificationCoverageValid) {
        pushUnique(blockers, "VERIFICATION_COVERAGE_INVALID");
    }

    const identificationCoverageValid =
        normalizedPlan !== null &&
        converted !== null &&
        validateIdentificationCoverage({
            plan: normalizedPlan,
            converted,
            datasetSplit,
        });

    if (!identificationCoverageValid) {
        pushUnique(blockers, "IDENTIFICATION_COVERAGE_INVALID");
    }

    let calibrationHarnessCompatible = false;

    if (converted !== null) {
        try {
            const analysis = analyzeBiometricThresholdCalibration({
                verificationComparisons:
                    converted.verificationComparisons,
                identificationSearches:
                    converted.identificationSearches,
                thresholds: analysisPolicy.thresholds,
                percentilePoints: analysisPolicy.percentilePoints,
                minimumSampleCounts:
                    analysisPolicy.minimumSampleCounts,
            });

            calibrationHarnessCompatible =
                analysis.candidateThreshold === null &&
                analysis.matchThreshold === null &&
                analysis.ambiguityMargin === null &&
                analysis.productiveDecision === null;

            for (const warning of analysis.warnings) {
                pushUnique(warnings, safeHarnessWarningCode(warning));
            }
        } catch {
            pushUnique(blockers, "CALIBRATION_HARNESS_INCOMPATIBLE");
        }
    } else {
        pushUnique(blockers, "CALIBRATION_HARNESS_INCOMPATIBLE");
    }

    if (!calibrationHarnessCompatible) {
        pushUnique(blockers, "CALIBRATION_HARNESS_INCOMPATIBLE");
    }

    const technicalReadyForControlledStudy =
        planStructurallyReady &&
        datasetContractValid &&
        calibrationHarnessCompatible &&
        profileCompatible &&
        protocolCompatible &&
        splitIsolationValid &&
        conditionCoverageValid &&
        verificationCoverageValid &&
        identificationCoverageValid &&
        blockers.length === 0;

    return frozenReport({
        planStructurallyReady,
        datasetContractValid,
        calibrationHarnessCompatible,
        profileCompatible,
        splitIsolationValid,
        conditionCoverageValid,
        verificationCoverageValid,
        identificationCoverageValid,
        technicalReadyForControlledStudy,
        warnings: Object.freeze([...warnings]),
        blockers: Object.freeze([...blockers]),
    });
}
