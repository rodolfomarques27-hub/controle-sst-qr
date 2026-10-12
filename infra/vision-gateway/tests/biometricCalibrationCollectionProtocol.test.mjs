import test from "node:test";
import assert from "node:assert/strict";

import {
    CALIBRATION_SPLIT,
    IDENTIFICATION_SEARCH_KIND,
    SAMPLE_ROLE,
    VERIFICATION_LABEL,
    summarizeBiometricCalibrationCollectionPlan,
    validateBiometricCalibrationCollectionPlan,
} from "../src/identity/biometricCalibrationCollectionProtocol.mjs";

function participant(participantId, sessionId, conditionA, conditionB) {
    return {
        participantId,
        sessions: [
            {
                sessionId,
                samples: [
                    {
                        sampleId: `${participantId}-enroll`,
                        profileId: "profile-synthetic-v1",
                        role: SAMPLE_ROLE.ENROLLMENT,
                        captureConditionId: conditionA,
                    },
                    {
                        sampleId: `${participantId}-probe`,
                        profileId: "profile-synthetic-v1",
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
        protocolVersion: "calibration-protocol-v1",
        profileId: "profile-synthetic-v1",
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
                environmentId: "environment-lab-a",
            },
            {
                id: "condition-b",
                lighting: "controlled-dim",
                distanceBand: "mid-band",
                pose: "slight-yaw",
                glasses: true,
                ppe: ["helmet"],
                deviceId: "device-lab-b",
                environmentId: "environment-lab-b",
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
        calibrationParticipantIds: ["study-p01", "study-p02", "study-p03"],
        evaluationParticipantIds: ["study-p04", "study-p05", "study-p06"],
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
                galleryParticipantIds: ["study-p01", "study-p02"],
                mateParticipantId: "study-p01",
            },
            {
                searchId: "search-nonmated-01",
                split: CALIBRATION_SPLIT.EVALUATION,
                kind: IDENTIFICATION_SEARCH_KIND.NON_MATED,
                probeSampleId: "study-p04-probe",
                galleryParticipantIds: ["study-p05", "study-p06"],
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

function clone(value) {
    return structuredClone(value);
}

test("plano sintetico valido fica estruturalmente pronto", () => {
    const summary = summarizeBiometricCalibrationCollectionPlan(validPlan());

    assert.equal(summary.plannedParticipants, 6);
    assert.equal(summary.plannedSessions, 6);
    assert.equal(summary.plannedSamples, 12);
    assert.equal(summary.plannedGenuineComparisons, 1);
    assert.equal(summary.plannedImpostorComparisons, 1);
    assert.equal(summary.plannedMatedSearches, 1);
    assert.equal(summary.plannedNonMatedSearches, 1);
    assert.equal(summary.readyForRealCollection, true);
    assert.deepEqual(summary.warnings, []);
});

test("rejeita participantId duplicado", () => {
    const plan = validPlan();
    plan.participants[1].participantId = "study-p01";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /participantId duplicado/,
    );
});

test("rejeita sessionId duplicado", () => {
    const plan = validPlan();
    plan.participants[1].sessions[0].sessionId = "session-p01";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /sessionId duplicado/,
    );
});

test("rejeita sampleId duplicado", () => {
    const plan = validPlan();
    plan.participants[1].sessions[0].samples[0].sampleId = "study-p01-enroll";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /sampleId duplicado/,
    );
});

test("rejeita captureConditionId inexistente", () => {
    const plan = validPlan();
    plan.participants[0].sessions[0].samples[0].captureConditionId = "missing-condition";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /captureConditionId nao existe/,
    );
});

test("rejeita mistura de profileId nas amostras", () => {
    const plan = validPlan();
    plan.participants[0].sessions[0].samples[0].profileId = "other-profile";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /profileId diverge/,
    );
});

test("rejeita vazamento de participante entre calibration e evaluation", () => {
    const plan = validPlan();
    plan.evaluationParticipantIds.push("study-p01");

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /simultaneamente em calibration e evaluation/,
    );
});

test("rejeita amostra que nao corresponde ao role de enrollment", () => {
    const plan = validPlan();
    plan.verificationComparisons[0].enrollmentSampleId = "study-p01-probe";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /deve referenciar amostra ENROLLMENT/,
    );
});

test("rejeita GENUINE entre participantes diferentes", () => {
    const plan = validPlan();
    plan.verificationComparisons[0].probeSampleId = "study-p02-probe";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /GENUINE exige amostras do mesmo participante/,
    );
});

test("rejeita IMPOSTOR do mesmo participante", () => {
    const plan = validPlan();
    plan.verificationComparisons[1].probeSampleId = "study-p01-probe";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /IMPOSTOR exige participantes diferentes/,
    );
});

test("rejeita ausencia de MATED quando politica exige", () => {
    const plan = validPlan();
    plan.identificationSearches = plan.identificationSearches.filter(
        (item) => item.kind !== IDENTIFICATION_SEARCH_KIND.MATED,
    );

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /ao menos uma busca MATED/,
    );
});

test("rejeita ausencia de NON_MATED quando politica exige", () => {
    const plan = validPlan();
    plan.identificationSearches = plan.identificationSearches.filter(
        (item) => item.kind !== IDENTIFICATION_SEARCH_KIND.NON_MATED,
    );

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /ao menos uma busca NON_MATED/,
    );
});

test("rejeita galeria com tamanho diferente do planejado", () => {
    const plan = validPlan();
    plan.identificationSearches[0].galleryParticipantIds = ["study-p01"];

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /plannedGallerySize/,
    );
});

test("rejeita MATED quando o mate nao esta na galeria", () => {
    const plan = validPlan();
    plan.identificationSearches[0].galleryParticipantIds = [
        "study-p02",
        "study-p03",
    ];

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /mateParticipantId presente na galeria/,
    );
});

test("rejeita NON_MATED quando dono do probe esta na galeria", () => {
    const plan = validPlan();
    plan.identificationSearches[1].galleryParticipantIds = [
        "study-p04",
        "study-p05",
    ];

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /NON_MATED nao pode conter o dono do probe/,
    );
});

test("rejeita cobertura por condicao abaixo do minimo explicito", () => {
    const plan = validPlan();
    plan.sufficiencyCriteria.minimumSamplesPerCondition = 7;

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /cobertura .* abaixo do minimo/,
    );
});

test("criterios de suficiência abaixo do planejado geram warnings e ready false", () => {
    const plan = validPlan();
    plan.sufficiencyCriteria.minimumParticipants = 7;
    plan.sufficiencyCriteria.minimumGenuineComparisons = 2;
    plan.sufficiencyCriteria.minimumGallerySize = 3;

    const summary = summarizeBiometricCalibrationCollectionPlan(plan);

    assert.equal(summary.readyForRealCollection, false);
    assert.equal(summary.warnings.length, 3);
    assert.ok(summary.warnings.every((item) => item.code === "INSUFFICIENT_PLAN"));
});


test("rejeita comparacao que mistura participantes fora do split declarado", () => {
    const plan = validPlan();
    plan.verificationComparisons[1].probeSampleId = "study-p04-probe";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /fora do split declarado/,
    );
});

test("rejeita busca com galeria fora do split declarado", () => {
    const plan = validPlan();
    plan.identificationSearches[1].galleryParticipantIds = [
        "study-p01",
        "study-p05",
    ];

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /galeria fora do split declarado/,
    );
});

test("schema fechado rejeita PII no participante", () => {
    const plan = validPlan();
    plan.participants[0].nome = "Pessoa Sintetica";

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /\.nome nao e permitido/,
    );
});

test("schema fechado rejeita material biometrico na amostra", () => {
    const plan = validPlan();
    plan.participants[0].sessions[0].samples[0].embedding = [0.1, 0.2];

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /\.embedding nao e permitido/,
    );
});

test("schema fechado rejeita threshold no plano", () => {
    const plan = validPlan();
    plan.matchThreshold = 0.8;

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(plan),
        /matchThreshold nao e permitido/,
    );
});

test("resumo contem somente metadados seguros e nenhuma decisao produtiva", () => {
    const summary = summarizeBiometricCalibrationCollectionPlan(validPlan());
    const serialized = JSON.stringify(summary);

    assert.equal(summary.readinessScope, "STRUCTURAL_PLAN_ONLY");

    for (const forbidden of [
        "participantId",
        "sampleId",
        "sessionId",
        "image",
        "frame",
        "crop",
        "embedding",
        "centroid",
        "ciphertext",
        "keyVersion",
        "token",
        "MATCH",
        "NO_MATCH",
        "sstEligibility",
        "physicalAccess",
        "threshold",
        "productiveDecision",
    ]) {
        assert.equal(serialized.includes(forbidden), false, forbidden);
    }
});

test("quantidades planejadas devem coincidir com participantes e sessoes", () => {
    const participantMismatch = validPlan();
    participantMismatch.plannedParticipantCount = 7;

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(participantMismatch),
        /plannedParticipantCount diverge/,
    );

    const sessionMismatch = validPlan();
    sessionMismatch.sessionsPerParticipant = 2;

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(sessionMismatch),
        /sessions deve possuir exatamente/,
    );

    const sampleMismatch = validPlan();
    sampleMismatch.samplesPerSession = 3;

    assert.throws(
        () => validateBiometricCalibrationCollectionPlan(sampleMismatch),
        /samples deve possuir exatamente/,
    );
});
