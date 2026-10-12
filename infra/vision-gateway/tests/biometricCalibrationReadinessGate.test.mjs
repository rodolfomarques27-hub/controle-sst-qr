import test from "node:test";
import assert from "node:assert/strict";

import {
    CALIBRATION_SPLIT,
    IDENTIFICATION_SEARCH_KIND,
    SAMPLE_ROLE,
    VERIFICATION_LABEL,
} from "../src/identity/biometricCalibrationCollectionProtocol.mjs";

import {
    CALIBRATION_RECORD_TYPE,
} from "../src/identity/biometricCalibrationDataContract.mjs";

import {
    evaluateBiometricCalibrationReadiness,
} from "../src/identity/biometricCalibrationReadinessGate.mjs";

const PROFILE_ID = "profile-synthetic-v1";
const PROTOCOL_VERSION = "calibration-protocol-v1";
const ENVIRONMENT_ID = "environment-lab-a";

function participant(participantId, sessionId, conditionA, conditionB) {
    return {
        participantId,
        sessions: [
            {
                sessionId,
                samples: [
                    {
                        sampleId: `${participantId}-enroll`,
                        profileId: PROFILE_ID,
                        role: SAMPLE_ROLE.ENROLLMENT,
                        captureConditionId: conditionA,
                    },
                    {
                        sampleId: `${participantId}-probe`,
                        profileId: PROFILE_ID,
                        role: SAMPLE_ROLE.PROBE,
                        captureConditionId: conditionB,
                    },
                ],
            },
        ],
    };
}

function validPlan() {
    return {
        protocolVersion: PROTOCOL_VERSION,
        profileId: PROFILE_ID,
        plannedParticipantCount: 6,
        sessionsPerParticipant: 1,
        samplesPerSession: 2,
        plannedGallerySize: 2,
        captureConditionCatalog: [
            {
                id: "condition-a",
                lighting: "controlled-bright",
                distanceBand: "near-band",
                pose: "frontal",
                glasses: false,
                ppe: [],
                deviceId: "device-lab-a",
                environmentId: ENVIRONMENT_ID,
            },
            {
                id: "condition-b",
                lighting: "controlled-dim",
                distanceBand: "mid-band",
                pose: "slight-yaw",
                glasses: true,
                ppe: ["helmet"],
                deviceId: "device-lab-b",
                environmentId: ENVIRONMENT_ID,
            },
        ],
        participants: [
            participant("study-p01", "session-p01", "condition-a", "condition-b"),
            participant("study-p02", "session-p02", "condition-b", "condition-a"),
            participant("study-p03", "session-p03", "condition-a", "condition-b"),
            participant("study-p04", "session-p04", "condition-b", "condition-a"),
            participant("study-p05", "session-p05", "condition-a", "condition-b"),
            participant("study-p06", "session-p06", "condition-b", "condition-a"),
        ],
        calibrationParticipantIds: [
            "study-p01",
            "study-p02",
            "study-p03",
        ],
        evaluationParticipantIds: [
            "study-p04",
            "study-p05",
            "study-p06",
        ],
        verificationComparisons: [
            {
                comparisonId: "verification-genuine-01",
                split: CALIBRATION_SPLIT.CALIBRATION,
                label: VERIFICATION_LABEL.GENUINE,
                enrollmentSampleId: "study-p01-enroll",
                probeSampleId: "study-p01-probe",
            },
            {
                comparisonId: "verification-impostor-01",
                split: CALIBRATION_SPLIT.CALIBRATION,
                label: VERIFICATION_LABEL.IMPOSTOR,
                enrollmentSampleId: "study-p01-enroll",
                probeSampleId: "study-p02-probe",
            },
        ],
        identificationSearches: [
            {
                searchId: "search-mated-01",
                split: CALIBRATION_SPLIT.CALIBRATION,
                kind: IDENTIFICATION_SEARCH_KIND.MATED,
                probeSampleId: "study-p01-probe",
                galleryParticipantIds: [
                    "study-p01",
                    "study-p02",
                ],
                mateParticipantId: "study-p01",
            },
            {
                searchId: "search-nonmated-01",
                split: CALIBRATION_SPLIT.CALIBRATION,
                kind: IDENTIFICATION_SEARCH_KIND.NON_MATED,
                probeSampleId: "study-p03-probe",
                galleryParticipantIds: [
                    "study-p01",
                    "study-p02",
                ],
            },
        ],
        policies: {
            enrollmentProbeSeparationRequired: true,
            disjointCalibrationEvaluationRequired: true,
            requireMatedSearches: true,
            requireNonMatedSearches: true,
        },
        sufficiencyCriteria: {
            minimumParticipants: 3,
            minimumSessionsPerParticipant: 1,
            minimumSamplesPerSession: 2,
            minimumGenuineComparisons: 1,
            minimumImpostorComparisons: 1,
            minimumMatedSearches: 1,
            minimumNonMatedSearches: 1,
            minimumGallerySize: 2,
            minimumSamplesPerCondition: 2,
        },
    };
}

function validDataset() {
    return {
        datasetVersion: "calibration-dataset-v1",
        protocolVersion: PROTOCOL_VERSION,
        profileId: PROFILE_ID,
        environmentId: ENVIRONMENT_ID,
        captureConditionCatalog: [
            {
                id: "condition-a",
                lighting: "controlled-bright",
                distanceBand: "near-band",
                pose: "frontal",
                glasses: false,
                ppe: [],
                deviceId: "device-lab-a",
            },
            {
                id: "condition-b",
                lighting: "controlled-dim",
                distanceBand: "mid-band",
                pose: "slight-yaw",
                glasses: true,
                ppe: ["helmet"],
                deviceId: "device-lab-b",
            },
        ],
        createdAt: "2026-10-12T21:30:00Z",
        records: [
            {
                type: CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON,
                sessionId: "session-p01",
                sampleId: "evaluation-genuine-01",
                profileId: PROFILE_ID,
                label: VERIFICATION_LABEL.GENUINE,
                score: 0.91,
                captureConditionId: "condition-a",
            },
            {
                type: CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON,
                sessionId: "session-p02",
                sampleId: "evaluation-impostor-01",
                profileId: PROFILE_ID,
                label: VERIFICATION_LABEL.IMPOSTOR,
                score: 0.18,
                captureConditionId: "condition-b",
            },
            {
                type: CALIBRATION_RECORD_TYPE.IDENTIFICATION_SEARCH,
                sessionId: "session-p01",
                searchId: "evaluation-mated-01",
                profileId: PROFILE_ID,
                kind: IDENTIFICATION_SEARCH_KIND.MATED,
                top1Score: 0.88,
                top2Score: 0.41,
                top1IsMate: true,
                candidateCount: 2,
                captureConditionId: "condition-a",
            },
            {
                type: CALIBRATION_RECORD_TYPE.IDENTIFICATION_SEARCH,
                sessionId: "session-p03",
                searchId: "evaluation-nonmated-01",
                profileId: PROFILE_ID,
                kind: IDENTIFICATION_SEARCH_KIND.NON_MATED,
                top1Score: 0.29,
                top2Score: 0.12,
                margin: 0.17,
                candidateCount: 2,
                captureConditionId: "condition-b",
            },
        ],
    };
}

function analysisPolicy() {
    return {
        thresholds: [
            0.2,
            0.6,
            0.9,
        ],
        percentilePoints: [
            0,
            0.5,
            1,
        ],
        minimumSampleCounts: {
            genuineComparisons: 1,
            impostorComparisons: 1,
            matedSearches: 1,
            nonMatedSearches: 1,
        },
    };
}

function validInput() {
    return {
        plan: validPlan(),
        dataset: validDataset(),
        datasetSplit: CALIBRATION_SPLIT.CALIBRATION,
        analysisPolicy: analysisPolicy(),
    };
}

function evaluate(overrides = {}) {
    return evaluateBiometricCalibrationReadiness({
        ...validInput(),
        ...overrides,
    });
}

test("gate sintetico ponta a ponta fica tecnicamente pronto", () => {
    const result = evaluate();

    assert.equal(result.planStructurallyReady, true);
    assert.equal(result.datasetContractValid, true);
    assert.equal(result.calibrationHarnessCompatible, true);
    assert.equal(result.profileCompatible, true);
    assert.equal(result.splitIsolationValid, true);
    assert.equal(result.conditionCoverageValid, true);
    assert.equal(result.verificationCoverageValid, true);
    assert.equal(result.identificationCoverageValid, true);
    assert.equal(result.technicalReadyForControlledStudy, true);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(result.blockers, []);
});

test("relatorio possui somente as chaves seguras autorizadas", () => {
    const result = evaluate();

    assert.deepEqual(
        Object.keys(result),
        [
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
        ],
    );
});

test("profile incompatível bloqueia prontidao sem expor ids", () => {
    const dataset = validDataset();
    dataset.profileId = "profile-other";
    for (const record of dataset.records) {
        record.profileId = "profile-other";
    }

    const result = evaluate({ dataset });

    assert.equal(result.datasetContractValid, true);
    assert.equal(result.profileCompatible, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
    assert.ok(result.blockers.includes("PROFILE_INCOMPATIBLE"));
});

test("protocolVersion incompatível bloqueia prontidao", () => {
    const dataset = validDataset();
    dataset.protocolVersion = "protocol-other";

    const result = evaluate({ dataset });

    assert.equal(result.datasetContractValid, true);
    assert.equal(result.technicalReadyForControlledStudy, false);
    assert.ok(result.blockers.includes("PROTOCOL_INCOMPATIBLE"));
});

test("sessao do split oposto invalida isolamento", () => {
    const dataset = validDataset();
    dataset.records[0].sessionId = "session-p04";

    const result = evaluate({ dataset });

    assert.equal(result.splitIsolationValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
    assert.ok(result.blockers.includes("SPLIT_ISOLATION_INVALID"));
});

test("politica de disjuncao deve permanecer habilitada", () => {
    const plan = validPlan();
    plan.policies.disjointCalibrationEvaluationRequired = false;

    const result = evaluate({ plan });

    assert.equal(result.planStructurallyReady, true);
    assert.equal(result.splitIsolationValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
});

test("politica enrollment probe deve permanecer habilitada", () => {
    const plan = validPlan();
    plan.policies.enrollmentProbeSeparationRequired = false;

    const result = evaluate({ plan });

    assert.equal(result.splitIsolationValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
});

test("catalogo de condicao divergente bloqueia cobertura", () => {
    const dataset = validDataset();
    dataset.captureConditionCatalog[0].lighting = "different-lighting";

    const result = evaluate({ dataset });

    assert.equal(result.conditionCoverageValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
});

test("condicao planejada sem registro observado bloqueia cobertura", () => {
    const dataset = validDataset();

    dataset.records = dataset.records.filter(
        (record) => record.captureConditionId === "condition-a",
    );

    const result = evaluate({ dataset });

    assert.equal(result.conditionCoverageValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
});

test("ausencia de genuine no dataset invalida cobertura de verificacao", () => {
    const dataset = validDataset();
    dataset.records = dataset.records.filter(
        (record) =>
            record.type !== CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON ||
            record.label !== VERIFICATION_LABEL.GENUINE,
    );

    const result = evaluate({ dataset });

    assert.equal(result.verificationCoverageValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
});

test("ausencia de impostor no dataset invalida cobertura de verificacao", () => {
    const dataset = validDataset();
    dataset.records = dataset.records.filter(
        (record) =>
            record.type !== CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON ||
            record.label !== VERIFICATION_LABEL.IMPOSTOR,
    );

    const result = evaluate({ dataset });

    assert.equal(result.verificationCoverageValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
});

test("ausencia de MATED no dataset invalida cobertura de identificacao", () => {
    const dataset = validDataset();
    dataset.records = dataset.records.filter(
        (record) =>
            record.type !== CALIBRATION_RECORD_TYPE.IDENTIFICATION_SEARCH ||
            record.kind !== IDENTIFICATION_SEARCH_KIND.MATED,
    );

    const result = evaluate({ dataset });

    assert.equal(result.identificationCoverageValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
});

test("ausencia de NON_MATED no dataset invalida cobertura de identificacao", () => {
    const dataset = validDataset();
    dataset.records = dataset.records.filter(
        (record) =>
            record.type !== CALIBRATION_RECORD_TYPE.IDENTIFICATION_SEARCH ||
            record.kind !== IDENTIFICATION_SEARCH_KIND.NON_MATED,
    );

    const result = evaluate({ dataset });

    assert.equal(result.identificationCoverageValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
});

test("plano estruturalmente insuficiente gera warning e readiness false", () => {
    const plan = validPlan();
    plan.sufficiencyCriteria.minimumParticipants = 7;

    const result = evaluate({ plan });

    assert.equal(result.planStructurallyReady, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
    assert.ok(
        result.warnings.some(
            (warning) =>
                warning === "PLAN:INSUFFICIENT_PLAN:participants",
        ),
    );
});

test("dataset inválido por campo extra e bloqueado pelo contrato R7C", () => {
    const dataset = validDataset();
    dataset.records[0].nome = "synthetic-forbidden";

    const result = evaluate({ dataset });

    assert.equal(result.datasetContractValid, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
    assert.ok(result.blockers.includes("DATASET_CONTRACT_INVALID"));
});

test("analysisPolicy e obrigatório e nao possui defaults silenciosos", () => {
    const input = validInput();
    delete input.analysisPolicy.thresholds;

    assert.throws(
        () => evaluateBiometricCalibrationReadiness(input),
        /thresholds deve ser explicitamente fornecido/,
    );
});

test("grid invalida torna harness incompatível sem produzir decisao", () => {
    const policy = analysisPolicy();
    policy.thresholds = [2];

    const result = evaluate({ analysisPolicy: policy });

    assert.equal(result.calibrationHarnessCompatible, false);
    assert.equal(result.technicalReadyForControlledStudy, false);
    assert.ok(
        result.blockers.includes("CALIBRATION_HARNESS_INCOMPATIBLE"),
    );
});

test("relatorio nao contem PII material biometrico threshold ou decisao", () => {
    const serialized = JSON.stringify(evaluate());

    for (const forbidden of [
        "nome",
        "cpf",
        "matricula",
        "email",
        "telefone",
        "colaboradorId",
        "image",
        "frame",
        "crop",
        "storage",
        "embedding",
        "centroid",
        "ciphertext",
        "keyVersion",
        "token",
        "threshold",
        "productiveDecision",
        "sstEligibility",
        "physicalAccess",
    ]) {
        assert.equal(
            serialized.toLowerCase().includes(
                forbidden.toLowerCase(),
            ),
            false,
            `relatorio nao deve conter ${forbidden}`,
        );
    }
});
