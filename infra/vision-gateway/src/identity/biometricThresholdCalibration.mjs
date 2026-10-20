const SCORE_MIN = -1;
const SCORE_MAX = 1;
const MARGIN_MIN = 0;
const MARGIN_MAX = 2;

export const VERIFICATION_LABEL = Object.freeze({
    GENUINE: "GENUINE",
    IMPOSTOR: "IMPOSTOR",
});

export const IDENTIFICATION_SEARCH_KIND = Object.freeze({
    MATED: "MATED",
    NON_MATED: "NON_MATED",
});

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

function normalizeFiniteNumber(value, name, min, max) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max
    ) {
        throw new TypeError(`${name} deve ser numero finito entre ${min} e ${max}.`);
    }

    return value;
}

function normalizeNonNegativeInteger(value, name) {
    if (
        !Number.isInteger(value) ||
        value < 0
    ) {
        throw new TypeError(`${name} deve ser inteiro maior ou igual a zero.`);
    }

    return value;
}

function normalizeThresholdGrid(thresholds) {
    if (!Array.isArray(thresholds) || thresholds.length === 0) {
        throw new TypeError("thresholds deve ser array nao vazio e explicitamente fornecido.");
    }

    const normalized = thresholds.map((value, index) =>
        normalizeFiniteNumber(
            value,
            `thresholds[${index}]`,
            SCORE_MIN,
            SCORE_MAX,
        ),
    );

    return Object.freeze(
        Array.from(new Set(normalized)).sort((left, right) => left - right),
    );
}

function normalizePercentilePoints(points) {
    if (!Array.isArray(points) || points.length === 0) {
        throw new TypeError("percentilePoints deve ser array nao vazio e explicitamente fornecido.");
    }

    const normalized = points.map((value, index) =>
        normalizeFiniteNumber(
            value,
            `percentilePoints[${index}]`,
            0,
            1,
        ),
    );

    return Object.freeze(
        Array.from(new Set(normalized)).sort((left, right) => left - right),
    );
}

function normalizeMinimumSampleCounts(value) {
    const source = assertPlainObject(value, "minimumSampleCounts");

    return Object.freeze({
        genuineComparisons: normalizeNonNegativeInteger(
            source.genuineComparisons,
            "minimumSampleCounts.genuineComparisons",
        ),
        impostorComparisons: normalizeNonNegativeInteger(
            source.impostorComparisons,
            "minimumSampleCounts.impostorComparisons",
        ),
        matedSearches: normalizeNonNegativeInteger(
            source.matedSearches,
            "minimumSampleCounts.matedSearches",
        ),
        nonMatedSearches: normalizeNonNegativeInteger(
            source.nonMatedSearches,
            "minimumSampleCounts.nonMatedSearches",
        ),
    });
}

function normalizeVerificationComparisons(records) {
    if (!Array.isArray(records)) {
        throw new TypeError("verificationComparisons deve ser array.");
    }

    return records.map((record, index) => {
        const source = assertPlainObject(
            record,
            `verificationComparisons[${index}]`,
        );

        if (!Object.values(VERIFICATION_LABEL).includes(source.label)) {
            throw new TypeError(
                `verificationComparisons[${index}].label invalido.`,
            );
        }

        return Object.freeze({
            label: source.label,
            score: normalizeFiniteNumber(
                source.score,
                `verificationComparisons[${index}].score`,
                SCORE_MIN,
                SCORE_MAX,
            ),
        });
    });
}

function normalizeIdentificationSearches(records) {
    if (!Array.isArray(records)) {
        throw new TypeError("identificationSearches deve ser array.");
    }

    return records.map((record, index) => {
        const source = assertPlainObject(
            record,
            `identificationSearches[${index}]`,
        );

        if (!Object.values(IDENTIFICATION_SEARCH_KIND).includes(source.kind)) {
            throw new TypeError(
                `identificationSearches[${index}].kind invalido.`,
            );
        }

        const top1Score = normalizeFiniteNumber(
            source.top1Score,
            `identificationSearches[${index}].top1Score`,
            SCORE_MIN,
            SCORE_MAX,
        );

        let top2Score = null;
        let margin = null;

        if (source.top2Score !== undefined && source.top2Score !== null) {
            top2Score = normalizeFiniteNumber(
                source.top2Score,
                `identificationSearches[${index}].top2Score`,
                SCORE_MIN,
                SCORE_MAX,
            );

            if (top2Score > top1Score) {
                throw new TypeError(
                    `identificationSearches[${index}].top2Score nao pode superar top1Score.`,
                );
            }

            margin = top1Score - top2Score;
        }

        if (
            source.margin !== undefined &&
            source.margin !== null
        ) {
            const suppliedMargin = normalizeFiniteNumber(
                source.margin,
                `identificationSearches[${index}].margin`,
                MARGIN_MIN,
                MARGIN_MAX,
            );

            if (
                margin !== null &&
                Math.abs(suppliedMargin - margin) > 1e-12
            ) {
                throw new TypeError(
                    `identificationSearches[${index}].margin diverge de top1Score - top2Score.`,
                );
            }

            margin = suppliedMargin;
        }

        if (
            source.kind === IDENTIFICATION_SEARCH_KIND.MATED &&
            typeof source.top1IsMate !== "boolean"
        ) {
            throw new TypeError(
                `identificationSearches[${index}].top1IsMate e obrigatorio para MATED.`,
            );
        }

        if (
            source.kind === IDENTIFICATION_SEARCH_KIND.NON_MATED &&
            source.top1IsMate !== undefined
        ) {
            throw new TypeError(
                `identificationSearches[${index}].top1IsMate nao e permitido para NON_MATED.`,
            );
        }

        return Object.freeze({
            kind: source.kind,
            top1Score,
            top2Score,
            margin,
            top1IsMate:
                source.kind === IDENTIFICATION_SEARCH_KIND.MATED
                    ? source.top1IsMate
                    : null,
        });
    });
}

function quantile(sortedValues, probability) {
    if (sortedValues.length === 0) {
        return null;
    }

    if (sortedValues.length === 1) {
        return sortedValues[0];
    }

    const position = (sortedValues.length - 1) * probability;
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);

    if (lowerIndex === upperIndex) {
        return sortedValues[lowerIndex];
    }

    const weight = position - lowerIndex;

    return (
        sortedValues[lowerIndex] * (1 - weight) +
        sortedValues[upperIndex] * weight
    );
}

function summarizeDistribution(values, percentilePoints) {
    const sorted = [...values].sort((left, right) => left - right);

    return Object.freeze({
        count: sorted.length,
        min: sorted.length > 0 ? sorted[0] : null,
        max: sorted.length > 0 ? sorted[sorted.length - 1] : null,
        mean:
            sorted.length > 0
                ? sorted.reduce((sum, value) => sum + value, 0) /
                  sorted.length
                : null,
        percentiles: Object.freeze(
            percentilePoints.map((probability) =>
                Object.freeze({
                    probability,
                    value: quantile(sorted, probability),
                }),
            ),
        ),
    });
}

function buildVerificationMetrics({
    genuineScores,
    impostorScores,
    thresholds,
}) {
    return Object.freeze(
        thresholds.map((threshold) => {
            const falseMatches = impostorScores.filter(
                (score) => score >= threshold,
            ).length;
            const falseNonMatches = genuineScores.filter(
                (score) => score < threshold,
            ).length;
            const trueMatches = genuineScores.length - falseNonMatches;
            const trueNonMatches = impostorScores.length - falseMatches;

            const fmr =
                impostorScores.length > 0
                    ? falseMatches / impostorScores.length
                    : null;
            const fnmr =
                genuineScores.length > 0
                    ? falseNonMatches / genuineScores.length
                    : null;
            const tpr =
                genuineScores.length > 0
                    ? trueMatches / genuineScores.length
                    : null;
            const tnr =
                impostorScores.length > 0
                    ? trueNonMatches / impostorScores.length
                    : null;

            return Object.freeze({
                threshold,
                counts: Object.freeze({
                    trueMatches,
                    falseMatches,
                    trueNonMatches,
                    falseNonMatches,
                }),
                fmr,
                fnmr,
                tpr,
                tnr,
                roc: Object.freeze({
                    falsePositiveRate: fmr,
                    truePositiveRate: tpr,
                }),
                det: Object.freeze({
                    falseMatchRate: fmr,
                    falseNonMatchRate: fnmr,
                }),
            });
        }),
    );
}

function buildIdentificationMetrics({
    matedSearches,
    nonMatedSearches,
    thresholds,
}) {
    return Object.freeze(
        thresholds.map((threshold) => {
            const falsePositiveIdentifications = nonMatedSearches.filter(
                (search) => search.top1Score >= threshold,
            ).length;

            const failedMatedIdentifications = matedSearches.filter(
                (search) =>
                    !search.top1IsMate ||
                    search.top1Score < threshold,
            ).length;

            return Object.freeze({
                threshold,
                fpir:
                    nonMatedSearches.length > 0
                        ? falsePositiveIdentifications /
                          nonMatedSearches.length
                        : null,
                fnir:
                    matedSearches.length > 0
                        ? failedMatedIdentifications /
                          matedSearches.length
                        : null,
                counts: Object.freeze({
                    falsePositiveIdentifications,
                    failedMatedIdentifications,
                    matedSearches: matedSearches.length,
                    nonMatedSearches: nonMatedSearches.length,
                }),
            });
        }),
    );
}

function chooseMetricCandidate(rows, scoreFunction) {
    const eligible = rows.filter((row) => scoreFunction(row) !== null);

    if (eligible.length === 0) {
        return null;
    }

    return eligible.reduce((best, row) => {
        const rowScore = scoreFunction(row);
        const bestScore = scoreFunction(best);

        if (rowScore < bestScore) {
            return row;
        }

        if (rowScore === bestScore && row.threshold < best.threshold) {
            return row;
        }

        return best;
    });
}

function buildOperatingPointCandidates({
    verificationMetrics,
    identificationMetrics,
}) {
    const equalErrorNearest = chooseMetricCandidate(
        verificationMetrics,
        (row) =>
            row.fmr === null || row.fnmr === null
                ? null
                : Math.abs(row.fmr - row.fnmr),
    );

    const lowestVerificationTotalError = chooseMetricCandidate(
        verificationMetrics,
        (row) =>
            row.fmr === null || row.fnmr === null
                ? null
                : row.fmr + row.fnmr,
    );

    const lowestOpenSetTotalError = chooseMetricCandidate(
        identificationMetrics,
        (row) =>
            row.fpir === null || row.fnir === null
                ? null
                : row.fpir + row.fnir,
    );

    return Object.freeze({
        equalErrorNearest,
        lowestVerificationTotalError,
        lowestOpenSetTotalError,
        recommendedThreshold: null,
        note:
            "Candidatos estatisticos somente informativos; nenhuma selecao produtiva automatica e realizada.",
    });
}

function buildSampleWarnings({
    counts,
    minimumSampleCounts,
}) {
    const warnings = [];

    for (const key of Object.keys(minimumSampleCounts)) {
        if (counts[key] < minimumSampleCounts[key]) {
            warnings.push(
                Object.freeze({
                    code: "INSUFFICIENT_SAMPLE",
                    dataset: key,
                    actual: counts[key],
                    minimumRequested: minimumSampleCounts[key],
                }),
            );
        }
    }

    if (counts.genuineComparisons === 0) {
        warnings.push(
            Object.freeze({
                code: "VERIFICATION_GENUINE_DATA_MISSING",
            }),
        );
    }

    if (counts.impostorComparisons === 0) {
        warnings.push(
            Object.freeze({
                code: "VERIFICATION_IMPOSTOR_DATA_MISSING",
            }),
        );
    }

    if (counts.matedSearches === 0) {
        warnings.push(
            Object.freeze({
                code: "IDENTIFICATION_MATED_DATA_MISSING",
            }),
        );
    }

    if (counts.nonMatedSearches === 0) {
        warnings.push(
            Object.freeze({
                code: "IDENTIFICATION_NON_MATED_DATA_MISSING",
            }),
        );
    }

    return Object.freeze(warnings);
}

export function analyzeBiometricThresholdCalibration({
    verificationComparisons,
    identificationSearches,
    thresholds,
    percentilePoints,
    minimumSampleCounts,
} = {}) {
    const normalizedThresholds = normalizeThresholdGrid(thresholds);
    const normalizedPercentiles = normalizePercentilePoints(percentilePoints);
    const normalizedMinimums = normalizeMinimumSampleCounts(minimumSampleCounts);
    const verification = normalizeVerificationComparisons(
        verificationComparisons,
    );
    const identification = normalizeIdentificationSearches(
        identificationSearches,
    );

    const genuineScores = verification
        .filter((record) => record.label === VERIFICATION_LABEL.GENUINE)
        .map((record) => record.score);
    const impostorScores = verification
        .filter((record) => record.label === VERIFICATION_LABEL.IMPOSTOR)
        .map((record) => record.score);

    const matedSearches = identification.filter(
        (record) => record.kind === IDENTIFICATION_SEARCH_KIND.MATED,
    );
    const nonMatedSearches = identification.filter(
        (record) => record.kind === IDENTIFICATION_SEARCH_KIND.NON_MATED,
    );

    const top1Scores = identification.map((record) => record.top1Score);
    const top2Scores = identification
        .filter((record) => record.top2Score !== null)
        .map((record) => record.top2Score);
    const margins = identification
        .filter((record) => record.margin !== null)
        .map((record) => record.margin);

    const counts = Object.freeze({
        genuineComparisons: genuineScores.length,
        impostorComparisons: impostorScores.length,
        matedSearches: matedSearches.length,
        nonMatedSearches: nonMatedSearches.length,
    });

    const verificationMetrics = buildVerificationMetrics({
        genuineScores,
        impostorScores,
        thresholds: normalizedThresholds,
    });

    const identificationMetrics = buildIdentificationMetrics({
        matedSearches,
        nonMatedSearches,
        thresholds: normalizedThresholds,
    });

    return Object.freeze({
        counts,
        thresholdGrid: normalizedThresholds,
        percentilePoints: normalizedPercentiles,
        verification: Object.freeze({
            metricsByThreshold: verificationMetrics,
            genuineScoreDistribution: summarizeDistribution(
                genuineScores,
                normalizedPercentiles,
            ),
            impostorScoreDistribution: summarizeDistribution(
                impostorScores,
                normalizedPercentiles,
            ),
        }),
        identification: Object.freeze({
            metricsByThreshold: identificationMetrics,
            top1ScoreDistribution: summarizeDistribution(
                top1Scores,
                normalizedPercentiles,
            ),
            top2ScoreDistribution: summarizeDistribution(
                top2Scores,
                normalizedPercentiles,
            ),
            marginDistribution: summarizeDistribution(
                margins,
                normalizedPercentiles,
            ),
        }),
        operatingPointCandidates: buildOperatingPointCandidates({
            verificationMetrics,
            identificationMetrics,
        }),
        warnings: buildSampleWarnings({
            counts,
            minimumSampleCounts: normalizedMinimums,
        }),
        candidateThreshold: null,
        matchThreshold: null,
        ambiguityMargin: null,
        productiveDecision: null,
    });
}
