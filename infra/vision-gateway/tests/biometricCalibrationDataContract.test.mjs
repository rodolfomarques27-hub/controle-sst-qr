import test from "node:test";
import assert from "node:assert/strict";

import {
    IDENTIFICATION_SEARCH_KIND,
    VERIFICATION_LABEL,
    analyzeBiometricThresholdCalibration,
} from "../src/identity/biometricThresholdCalibration.mjs";

import {
    CALIBRATION_RECORD_TYPE,
    toBiometricThresholdCalibrationInput,
    validateBiometricCalibrationDataset,
} from "../src/identity/biometricCalibrationDataContract.mjs";

const PROFILE_ID = "sface-2021dec";

function syntheticDataset() {
    return {
        datasetVersion: "calibration-dataset-v1",
        protocolVersion: "protocol-r7c-v1",
        profileId: PROFILE_ID,
        environmentId: "env-lab-synthetic-01",
        captureConditionCatalog: [
            {
                id: "cond-front-normal-01",
                lighting: "NORMAL",
                distanceBand: "NEAR",
                pose: "FRONTAL",
                glasses: false,
                ppe: ["HELMET"],
                deviceId: "device-synthetic-01",
            },
            {
                id: "cond-side-low-01",
                lighting: "LOW",
                distanceBand: "MID",
                pose: "LATERAL",
                glasses: true,
                ppe: ["HELMET", "SAFETY_GLASSES"],
                deviceId: "device-synthetic-02",
            },
        ],
        createdAt: "2026-10-12T21:00:00Z",
        records: [
            {
                type: CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON,
                sessionId: "session-synthetic-01",
                sampleId: "sample-genuine-01",
                profileId: PROFILE_ID,
                label: VERIFICATION_LABEL.GENUINE,
                score: 0.91,
                captureConditionId: "cond-front-normal-01",
                timestamp: "2026-10-12T21:01:00Z",
            },
            {
                type: CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON,
                sessionId: "session-synthetic-01",
                sampleId: "sample-impostor-01",
                profileId: PROFILE_ID,
                label: VERIFICATION_LABEL.IMPOSTOR,
                score: 0.18,
                captureConditionId: "cond-side-low-01",
            },
            {
                type: CALIBRATION_RECORD_TYPE.IDENTIFICATION_SEARCH,
                sessionId: "session-synthetic-02",
                searchId: "search-mated-01",
                profileId: PROFILE_ID,
                kind: IDENTIFICATION_SEARCH_KIND.MATED,
                top1Score: 0.88,
                top2Score: 0.41,
                top1IsMate: true,
                candidateCount: 3,
                captureConditionId: "cond-front-normal-01",
            },
            {
                type: CALIBRATION_RECORD_TYPE.IDENTIFICATION_SEARCH,
                sessionId: "session-synthetic-02",
                searchId: "search-non-mated-01",
                profileId: PROFILE_ID,
                kind: IDENTIFICATION_SEARCH_KIND.NON_MATED,
                top1Score: 0.29,
                top2Score: 0.12,
                margin: 0.17,
                candidateCount: 3,
                captureConditionId: "cond-side-low-01",
            },
        ],
    };
}

function cloneDataset() {
    return structuredClone(syntheticDataset());
}

test("aceita registro GENUINE valido", () => {
    const result = validateBiometricCalibrationDataset(syntheticDataset());
    const record = result.records[0];

    assert.equal(record.type, "VERIFICATION_COMPARISON");
    assert.equal(record.label, "GENUINE");
    assert.equal(record.score, 0.91);
});

test("aceita registro IMPOSTOR valido", () => {
    const result = validateBiometricCalibrationDataset(syntheticDataset());
    const record = result.records[1];

    assert.equal(record.label, "IMPOSTOR");
    assert.equal(record.score, 0.18);
});

test("aceita busca MATED valida e deriva margin", () => {
    const result = validateBiometricCalibrationDataset(syntheticDataset());
    const record = result.records[2];

    assert.equal(record.kind, "MATED");
    assert.equal(record.top1IsMate, true);
    assert.ok(Math.abs(record.margin - 0.47) < 1e-12);
    assert.equal(record.candidateCount, 3);
});

test("aceita busca NON_MATED valida e preserva margin validada", () => {
    const result = validateBiometricCalibrationDataset(syntheticDataset());
    const record = result.records[3];

    assert.equal(record.kind, "NON_MATED");
    assert.equal(
        Object.hasOwn(
            record,
            "top1IsMate",
        ),
        false,
    );
    assert.ok(Math.abs(record.margin - 0.17) < 1e-12);
});

test("comparisonId opcional e normalizado quando informado", () => {
    const dataset = cloneDataset();
    dataset.records[0].comparisonId = "comparison-genuine-01";

    const result = validateBiometricCalibrationDataset(dataset);

    assert.equal(
        result.records[0].comparisonId,
        "comparison-genuine-01",
    );
});

test("dataset legado sem comparisonId permanece compativel", () => {
    const result = validateBiometricCalibrationDataset(syntheticDataset());

    assert.equal(
        Object.hasOwn(result.records[0], "comparisonId"),
        false,
    );

    assert.equal(
        Object.hasOwn(result.records[1], "comparisonId"),
        false,
    );
});

test("comparisonId informado deve ser identificador opaco valido", () => {
    const dataset = cloneDataset();

    dataset.records[0].comparisonId =
        "comparison invalido";

    assert.throws(
        () => validateBiometricCalibrationDataset(dataset),
        /comparisonId.*identificador opaco/,
    );
});

test("comparisonId informado nao pode ser duplicado entre verificacoes", () => {
    const dataset = cloneDataset();

    dataset.records[0].comparisonId =
        "comparison-shared-01";

    dataset.records[1].comparisonId =
        "comparison-shared-01";

    assert.throws(
        () => validateBiometricCalibrationDataset(dataset),
        /comparisonId duplicado/,
    );
});

test("comparisonId nao vaza para o input estatistico do harness", () => {
    const dataset = cloneDataset();

    dataset.records[0].comparisonId =
        "comparison-genuine-01";

    dataset.records[1].comparisonId =
        "comparison-impostor-01";

    const converted =
        toBiometricThresholdCalibrationInput(
            dataset,
        );

    assert.deepEqual(
        converted.verificationComparisons,
        [
            {
                label: "GENUINE",
                score: 0.91,
            },
            {
                label: "IMPOSTOR",
                score: 0.18,
            },
        ],
    );
});
test("NON_MATED validado omite completamente top1IsMate", () => {
    const result =
        validateBiometricCalibrationDataset(
            syntheticDataset(),
        );

    const record =
        result.records.find(
            (
                item,
            ) =>
                item.type ===
                    "IDENTIFICATION_SEARCH" &&
                item.kind ===
                    "NON_MATED",
        );

    assert.ok(
        record,
    );

    assert.equal(
        Object.hasOwn(
            record,
            "top1IsMate",
        ),
        false,
    );
});

test("validateBiometricCalibrationDataset e idempotente sobre dataset normalizado", () => {
    const once =
        validateBiometricCalibrationDataset(
            syntheticDataset(),
        );

    const twice =
        validateBiometricCalibrationDataset(
            once,
        );

    assert.deepEqual(
        twice,
        once,
    );

    const nonMated =
        twice.records.find(
            (
                item,
            ) =>
                item.type ===
                    "IDENTIFICATION_SEARCH" &&
                item.kind ===
                    "NON_MATED",
        );

    assert.ok(
        nonMated,
    );

    assert.equal(
        Object.hasOwn(
            nonMated,
            "top1IsMate",
        ),
        false,
    );
});
test("rejeita profile de registro diferente do profile unico do dataset", () => {
    const dataset = cloneDataset();
    dataset.records[0].profileId = "other-profile";

    assert.throws(
        () => validateBiometricCalibrationDataset(dataset),
        /profileId diverge/,
    );
});

test("rejeita score fora da faixa cosine", () => {
    const dataset = cloneDataset();
    dataset.records[0].score = 1.001;

    assert.throws(
        () => validateBiometricCalibrationDataset(dataset),
        /entre -1 e 1/,
    );
});

test("rejeita margin inconsistente com top1 menos top2", () => {
    const dataset = cloneDataset();
    dataset.records[3].margin = 0.5;

    assert.throws(
        () => validateBiometricCalibrationDataset(dataset),
        /margin diverge/,
    );
});

test("rejeita margin sem top2Score", () => {
    const dataset = cloneDataset();
    delete dataset.records[3].top2Score;

    assert.throws(
        () => validateBiometricCalibrationDataset(dataset),
        /margin exige top2Score/,
    );
});

test("MATED exige top1IsMate", () => {
    const dataset = cloneDataset();
    delete dataset.records[2].top1IsMate;

    assert.throws(
        () => validateBiometricCalibrationDataset(dataset),
        /top1IsMate e obrigatorio/,
    );
});

test("NON_MATED rejeita top1IsMate", () => {
    const dataset = cloneDataset();
    dataset.records[3].top1IsMate = false;

    assert.throws(
        () => validateBiometricCalibrationDataset(dataset),
        /top1IsMate nao e permitido/,
    );
});

test("rejeita captureConditionId inexistente", () => {
    const dataset = cloneDataset();
    dataset.records[0].captureConditionId = "cond-nao-catalogada";

    assert.throws(
        () => validateBiometricCalibrationDataset(dataset),
        /nao existe no captureConditionCatalog/,
    );
});

test("schema fechado rejeita PII e campos biometricos proibidos", () => {
    const forbiddenFields = [
        ["nome", "Pessoa Teste"],
        ["cpf", "00000000000"],
        ["matricula", "mat-01"],
        ["email", "synthetic@example.invalid"],
        ["telefone", "000000000"],
        ["colaboradorId", "real-id-proibido"],
        ["image", "base64-proibido"],
        ["frame", "frame-proibido"],
        ["crop", "crop-proibido"],
        ["storageUrl", "storage-proibido"],
        ["embedding", [1, 2, 3]],
        ["centroid", [1, 2, 3]],
        ["ciphertext", "cipher-proibido"],
        ["iv", "iv-proibido"],
        ["keyVersion", "key-proibida"],
        ["token", "token-proibido"],
        ["decision", "MATCH"],
        ["threshold", 0.7],
        ["sstEligibility", true],
        ["physicalAccess", true],
    ];

    for (const [field, value] of forbiddenFields) {
        const dataset = cloneDataset();
        dataset.records[0][field] = value;

        assert.throws(
            () => validateBiometricCalibrationDataset(dataset),
            /nao e permitido pelo contrato/,
            `campo proibido deveria falhar: ${field}`,
        );
    }
});

test("schema fechado rejeita PII no nivel do dataset e do catalogo", () => {
    const topLevel = cloneDataset();
    topLevel.cpf = "00000000000";

    assert.throws(
        () => validateBiometricCalibrationDataset(topLevel),
        /dataset\.cpf nao e permitido/,
    );

    const catalog = cloneDataset();
    catalog.captureConditionCatalog[0].cameraUrl = "rtsp://proibido";

    assert.throws(
        () => validateBiometricCalibrationDataset(catalog),
        /cameraUrl nao e permitido/,
    );
});

test("conversao entrega exclusivamente arrays aceitos pelo harness R7A", () => {
    const converted = toBiometricThresholdCalibrationInput(syntheticDataset());

    assert.deepEqual(Object.keys(converted).sort(), [
        "identificationSearches",
        "verificationComparisons",
    ]);

    assert.deepEqual(converted.verificationComparisons, [
        { label: "GENUINE", score: 0.91 },
        { label: "IMPOSTOR", score: 0.18 },
    ]);

    assert.equal(converted.identificationSearches.length, 2);
    assert.deepEqual(Object.keys(converted.identificationSearches[0]).sort(), [
        "kind",
        "margin",
        "top1IsMate",
        "top1Score",
        "top2Score",
    ]);
    assert.deepEqual(Object.keys(converted.identificationSearches[1]).sort(), [
        "kind",
        "margin",
        "top1Score",
        "top2Score",
    ]);
});

test("conversao e consumida pelo harness sem produzir threshold ou decisao", () => {
    const converted = toBiometricThresholdCalibrationInput(syntheticDataset());
    const analysis = analyzeBiometricThresholdCalibration({
        ...converted,
        thresholds: [-0.25, 0.25, 0.75],
        percentilePoints: [0, 0.5, 1],
        minimumSampleCounts: {
            genuineComparisons: 0,
            impostorComparisons: 0,
            matedSearches: 0,
            nonMatedSearches: 0,
        },
    });

    assert.equal(analysis.counts.genuineComparisons, 1);
    assert.equal(analysis.counts.impostorComparisons, 1);
    assert.equal(analysis.counts.matedSearches, 1);
    assert.equal(analysis.counts.nonMatedSearches, 1);
    assert.equal(analysis.candidateThreshold, null);
    assert.equal(analysis.matchThreshold, null);
    assert.equal(analysis.ambiguityMargin, null);
    assert.equal(analysis.productiveDecision, null);
    assert.equal(analysis.operatingPointCandidates.recommendedThreshold, null);
});

test("dataset validado nao contem decisao, threshold ou material biometrico", () => {
    const serialized = JSON.stringify(
        validateBiometricCalibrationDataset(syntheticDataset()),
    );

    for (const forbidden of [
        "colaboradorId",
        "embedding",
        "centroid",
        "ciphertext",
        "keyVersion",
        "token",
        "MATCH",
        "NO_MATCH",
        "candidateThreshold",
        "matchThreshold",
        "ambiguityMargin",
        "sstEligibility",
        "physicalAccess",
    ]) {
        assert.equal(
            serialized.includes(forbidden),
            false,
            `dataset nao deve conter ${forbidden}`,
        );
    }
});
test(
    "R7F-R8D: comparisonId diferencia verificacoes sobre a mesma probe",
    () => {
        const dataset = {
            datasetVersion:
                "r8d-dataset-v1",

            protocolVersion:
                "r8d-protocol-v1",

            profileId:
                "r8d-profile-v1",

            environmentId:
                "r8d-environment-v1",

            captureConditionCatalog: [
                {
                    id:
                        "condition-a",

                    lighting:
                        "real-bright",

                    distanceBand:
                        "near",

                    pose:
                        "frontal",

                    glasses:
                        false,

                    ppe: [],

                    deviceId:
                        "synthetic-device-a",
                },
            ],

            createdAt:
                "2026-01-01T00:00:02.000Z",

            records: [
                {
                    type:
                        "VERIFICATION_COMPARISON",

                    sessionId:
                        "session-probe-01",

                    sampleId:
                        "probe-01",

                    comparisonId:
                        "comparison-r8d-01",

                    profileId:
                        "r8d-profile-v1",

                    label:
                        "GENUINE",

                    score:
                        0.8,

                    captureConditionId:
                        "condition-a",

                    timestamp:
                        "2026-01-01T00:00:01.000Z",
                },

                {
                    type:
                        "VERIFICATION_COMPARISON",

                    sessionId:
                        "session-probe-01",

                    sampleId:
                        "probe-01",

                    comparisonId:
                        "comparison-r8d-02",

                    profileId:
                        "r8d-profile-v1",

                    label:
                        "IMPOSTOR",

                    score:
                        0.2,

                    captureConditionId:
                        "condition-a",

                    timestamp:
                        "2026-01-01T00:00:01.000Z",
                },
            ],
        };

        const normalized =
            validateBiometricCalibrationDataset(
                dataset,
            );

        assert.equal(
            normalized.records.length,
            2,
        );

        assert.equal(
            normalized.records[0].comparisonId,
            "comparison-r8d-01",
        );

        assert.equal(
            normalized.records[1].comparisonId,
            "comparison-r8d-02",
        );

        assert.equal(
            normalized.records[0].sampleId,
            normalized.records[1].sampleId,
        );

        assert.equal(
            normalized.records[0].sessionId,
            normalized.records[1].sessionId,
        );
    },
);
