import test from "node:test";
import assert from "node:assert/strict";

import {
    IDENTIFICATION_SEARCH_KIND,
    VERIFICATION_LABEL,
    analyzeBiometricThresholdCalibration,
} from "../src/identity/biometricThresholdCalibration.mjs";

const THRESHOLD_GRID = Object.freeze([
    0.4,
    0.6,
    0.8,
]);

const PERCENTILES = Object.freeze([
    0,
    0.5,
    1,
]);

const MINIMUMS = Object.freeze({
    genuineComparisons: 4,
    impostorComparisons: 4,
    matedSearches: 3,
    nonMatedSearches: 2,
});

function syntheticDataset() {
    return {
        verificationComparisons: [
            { label: VERIFICATION_LABEL.GENUINE, score: 0.9 },
            { label: VERIFICATION_LABEL.GENUINE, score: 0.8 },
            { label: VERIFICATION_LABEL.GENUINE, score: 0.7 },
            { label: VERIFICATION_LABEL.GENUINE, score: 0.6 },
            { label: VERIFICATION_LABEL.IMPOSTOR, score: 0.6 },
            { label: VERIFICATION_LABEL.IMPOSTOR, score: 0.5 },
            { label: VERIFICATION_LABEL.IMPOSTOR, score: 0.4 },
            { label: VERIFICATION_LABEL.IMPOSTOR, score: 0.3 },
        ],
        identificationSearches: [
            {
                kind: IDENTIFICATION_SEARCH_KIND.MATED,
                top1Score: 0.9,
                top2Score: 0.5,
                top1IsMate: true,
            },
            {
                kind: IDENTIFICATION_SEARCH_KIND.MATED,
                top1Score: 0.85,
                top2Score: 0.8,
                top1IsMate: false,
            },
            {
                kind: IDENTIFICATION_SEARCH_KIND.MATED,
                top1Score: 0.55,
                top2Score: 0.2,
                top1IsMate: true,
            },
            {
                kind: IDENTIFICATION_SEARCH_KIND.NON_MATED,
                top1Score: 0.7,
                top2Score: 0.4,
            },
            {
                kind: IDENTIFICATION_SEARCH_KIND.NON_MATED,
                top1Score: 0.4,
                top2Score: 0.3,
            },
        ],
    };
}

function analyze(overrides = {}) {
    return analyzeBiometricThresholdCalibration({
        ...syntheticDataset(),
        thresholds: THRESHOLD_GRID,
        percentilePoints: PERCENTILES,
        minimumSampleCounts: MINIMUMS,
        ...overrides,
    });
}

test("calcula contagens genuine/impostor e mated/non-mated", () => {
    const result = analyze();

    assert.deepEqual(result.counts, {
        genuineComparisons: 4,
        impostorComparisons: 4,
        matedSearches: 3,
        nonMatedSearches: 2,
    });
});

test("calcula FMR, FNMR, TPR e TNR por threshold", () => {
    const result = analyze();
    const row = result.verification.metricsByThreshold.find(
        (item) => item.threshold === 0.6,
    );

    assert.equal(row.fmr, 0.25);
    assert.equal(row.fnmr, 0);
    assert.equal(row.tpr, 1);
    assert.equal(row.tnr, 0.75);
    assert.deepEqual(row.roc, {
        falsePositiveRate: 0.25,
        truePositiveRate: 1,
    });
    assert.deepEqual(row.det, {
        falseMatchRate: 0.25,
        falseNonMatchRate: 0,
    });
});

test("calcula FPIR e FNIR para buscas 1:N rotuladas", () => {
    const result = analyze();
    const row = result.identification.metricsByThreshold.find(
        (item) => item.threshold === 0.6,
    );

    assert.equal(row.fpir, 0.5);
    assert.equal(row.fnir, 2 / 3);
    assert.deepEqual(row.counts, {
        falsePositiveIdentifications: 1,
        failedMatedIdentifications: 2,
        matedSearches: 3,
        nonMatedSearches: 2,
    });
});

test("calcula distribuicoes de genuine, impostor, top1, top2 e margin", () => {
    const result = analyze();

    assert.equal(
        result.verification.genuineScoreDistribution.percentiles[1].value,
        0.75,
    );
    assert.equal(
        result.verification.impostorScoreDistribution.percentiles[1].value,
        0.45,
    );
    assert.equal(result.identification.top1ScoreDistribution.count, 5);
    assert.equal(result.identification.top2ScoreDistribution.count, 5);
    assert.equal(result.identification.marginDistribution.count, 5);
    assert.ok(
        Math.abs(
            result.identification.marginDistribution.percentiles[0].value -
            0.05,
        ) < 1e-12,
    );
});

test("gera candidatos estatisticos sem recomendar threshold produtivo", () => {
    const result = analyze();

    assert.ok(result.operatingPointCandidates.equalErrorNearest);
    assert.ok(result.operatingPointCandidates.lowestVerificationTotalError);
    assert.ok(result.operatingPointCandidates.lowestOpenSetTotalError);
    assert.equal(result.operatingPointCandidates.recommendedThreshold, null);
    assert.equal(result.candidateThreshold, null);
    assert.equal(result.matchThreshold, null);
    assert.equal(result.ambiguityMargin, null);
    assert.equal(result.productiveDecision, null);
});

test("warning de amostra insuficiente usa minimo explicitamente fornecido", () => {
    const result = analyze({
        minimumSampleCounts: {
            genuineComparisons: 10,
            impostorComparisons: 10,
            matedSearches: 10,
            nonMatedSearches: 10,
        },
    });

    assert.equal(
        result.warnings.filter(
            (warning) => warning.code === "INSUFFICIENT_SAMPLE",
        ).length,
        4,
    );
});

test("dataset ausente retorna metricas nulas e warnings sem inventar resultado", () => {
    const result = analyze({
        verificationComparisons: [],
        identificationSearches: [],
        minimumSampleCounts: {
            genuineComparisons: 0,
            impostorComparisons: 0,
            matedSearches: 0,
            nonMatedSearches: 0,
        },
    });

    assert.equal(result.verification.metricsByThreshold[0].fmr, null);
    assert.equal(result.verification.metricsByThreshold[0].fnmr, null);
    assert.equal(result.identification.metricsByThreshold[0].fpir, null);
    assert.equal(result.identification.metricsByThreshold[0].fnir, null);
    assert.ok(
        result.warnings.some(
            (warning) => warning.code === "VERIFICATION_GENUINE_DATA_MISSING",
        ),
    );
});

test("threshold grid e obrigatorio e nao possui default", () => {
    assert.throws(
        () =>
            analyzeBiometricThresholdCalibration({
                ...syntheticDataset(),
                percentilePoints: PERCENTILES,
                minimumSampleCounts: MINIMUMS,
            }),
        /thresholds/,
    );
});

test("percentilePoints e minimumSampleCounts sao politicas explicitas", () => {
    assert.throws(
        () =>
            analyzeBiometricThresholdCalibration({
                ...syntheticDataset(),
                thresholds: THRESHOLD_GRID,
                minimumSampleCounts: MINIMUMS,
            }),
        /percentilePoints/,
    );

    assert.throws(
        () =>
            analyzeBiometricThresholdCalibration({
                ...syntheticDataset(),
                thresholds: THRESHOLD_GRID,
                percentilePoints: PERCENTILES,
            }),
        /minimumSampleCounts/,
    );
});

test("rejeita score fora do intervalo de cosine", () => {
    assert.throws(
        () =>
            analyze({
                verificationComparisons: [
                    {
                        label: VERIFICATION_LABEL.GENUINE,
                        score: 1.01,
                    },
                ],
            }),
        /entre -1 e 1/,
    );
});

test("MATED exige top1IsMate para calcular FNIR corretamente", () => {
    assert.throws(
        () =>
            analyze({
                identificationSearches: [
                    {
                        kind: IDENTIFICATION_SEARCH_KIND.MATED,
                        top1Score: 0.9,
                        top2Score: 0.2,
                    },
                ],
            }),
        /top1IsMate/,
    );
});

test("margem fornecida deve coincidir com top1 menos top2", () => {
    assert.throws(
        () =>
            analyze({
                identificationSearches: [
                    {
                        kind: IDENTIFICATION_SEARCH_KIND.NON_MATED,
                        top1Score: 0.9,
                        top2Score: 0.4,
                        margin: 0.1,
                    },
                ],
            }),
        /diverge/,
    );
});

test("resultado nao contem embeddings, imagens, chaves, token ou decisao de acesso", () => {
    const result = analyze();
    const serialized = JSON.stringify(result);

    for (const forbidden of [
        "embedding",
        "image",
        "frame",
        "crop",
        "ciphertext",
        "keyVersion",
        "token",
        "MATCH",
        "NO_MATCH",
        "sstEligibility",
        "physicalAccess",
    ]) {
        assert.equal(
            serialized.includes(forbidden),
            false,
            `resultado nao deve conter ${forbidden}`,
        );
    }
});
