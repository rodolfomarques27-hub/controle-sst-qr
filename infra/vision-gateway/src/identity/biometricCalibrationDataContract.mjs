import {
    IDENTIFICATION_SEARCH_KIND,
    VERIFICATION_LABEL,
} from "./biometricThresholdCalibration.mjs";

export const CALIBRATION_RECORD_TYPE = Object.freeze({
    VERIFICATION_COMPARISON: "VERIFICATION_COMPARISON",
    IDENTIFICATION_SEARCH: "IDENTIFICATION_SEARCH",
});

const SCORE_MIN = -1;
const SCORE_MAX = 1;
const MARGIN_MIN = 0;
const MARGIN_MAX = 2;
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9._:|%+-]{1,256}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/;

const DATASET_KEYS = new Set([
    "datasetVersion",
    "protocolVersion",
    "profileId",
    "environmentId",
    "captureConditionCatalog",
    "createdAt",
    "records",
]);

const CONDITION_KEYS = new Set([
    "id",
    "lighting",
    "distanceBand",
    "pose",
    "glasses",
    "ppe",
    "deviceId",
]);

const VERIFICATION_KEYS = new Set([
    "type",
    "sessionId",
    "sampleId",
    "comparisonId",
    "profileId",
    "label",
    "score",
    "captureConditionId",
    "timestamp",
]);

const IDENTIFICATION_KEYS = new Set([
    "type",
    "sessionId",
    "searchId",
    "profileId",
    "kind",
    "top1Score",
    "top2Score",
    "margin",
    "top1IsMate",
    "candidateCount",
    "captureConditionId",
    "timestamp",
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
            throw new TypeError(`${name}.${key} nao e permitido pelo contrato.`);
        }
    }
}

function normalizeOpaqueId(value, name) {
    if (typeof value !== "string") {
        throw new TypeError(`${name} deve ser string opaca.`);
    }

    const normalized = value.trim();

    if (!OPAQUE_ID_PATTERN.test(normalized)) {
        throw new TypeError(
            `${name} deve ser identificador opaco sem espacos ou dados pessoais evidentes.`,
        );
    }

    return normalized;
}

function normalizeDescriptor(value, name) {
    if (typeof value !== "string") {
        throw new TypeError(`${name} deve ser string.`);
    }

    const normalized = value.trim();

    if (!normalized || normalized.length > 128) {
        throw new TypeError(`${name} deve possuir entre 1 e 128 caracteres.`);
    }

    return normalized;
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
    if (!Number.isInteger(value) || value < 0) {
        throw new TypeError(`${name} deve ser inteiro maior ou igual a zero.`);
    }

    return value;
}

function normalizeTimestamp(value, name, required) {
    if (value === undefined || value === null) {
        if (required) {
            throw new TypeError(`${name} e obrigatorio.`);
        }

        return null;
    }

    if (
        typeof value !== "string" ||
        !ISO_TIMESTAMP_PATTERN.test(value) ||
        Number.isNaN(Date.parse(value))
    ) {
        throw new TypeError(`${name} deve ser timestamp ISO-8601 UTC.`);
    }

    return value;
}

function normalizePpe(value, name) {
    if (!Array.isArray(value)) {
        throw new TypeError(`${name} deve ser array.`);
    }

    const normalized = value.map((item, index) =>
        normalizeDescriptor(item, `${name}[${index}]`),
    );

    if (new Set(normalized).size !== normalized.length) {
        throw new TypeError(`${name} nao pode conter valores duplicados.`);
    }

    return Object.freeze(normalized);
}

function normalizeCaptureConditionCatalog(value) {
    if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError("captureConditionCatalog deve ser array nao vazio.");
    }

    const seen = new Set();

    return Object.freeze(
        value.map((item, index) => {
            const source = assertPlainObject(
                item,
                `captureConditionCatalog[${index}]`,
            );

            assertExactKeys(
                source,
                CONDITION_KEYS,
                `captureConditionCatalog[${index}]`,
            );

            const id = normalizeOpaqueId(
                source.id,
                `captureConditionCatalog[${index}].id`,
            );

            if (seen.has(id)) {
                throw new TypeError(`captureConditionCatalog.id duplicado: ${id}`);
            }

            seen.add(id);

            if (typeof source.glasses !== "boolean") {
                throw new TypeError(
                    `captureConditionCatalog[${index}].glasses deve ser boolean.`,
                );
            }

            return Object.freeze({
                id,
                lighting: normalizeDescriptor(
                    source.lighting,
                    `captureConditionCatalog[${index}].lighting`,
                ),
                distanceBand: normalizeDescriptor(
                    source.distanceBand,
                    `captureConditionCatalog[${index}].distanceBand`,
                ),
                pose: normalizeDescriptor(
                    source.pose,
                    `captureConditionCatalog[${index}].pose`,
                ),
                glasses: source.glasses,
                ppe: normalizePpe(
                    source.ppe,
                    `captureConditionCatalog[${index}].ppe`,
                ),
                deviceId: normalizeOpaqueId(
                    source.deviceId,
                    `captureConditionCatalog[${index}].deviceId`,
                ),
            });
        }),
    );
}

function normalizeCommonRecordFields({
    source,
    name,
    datasetProfileId,
    conditionIds,
}) {
    const profileId = normalizeOpaqueId(
        source.profileId,
        `${name}.profileId`,
    );

    if (profileId !== datasetProfileId) {
        throw new TypeError(
            `${name}.profileId diverge do profileId unico do dataset.`,
        );
    }

    const captureConditionId = normalizeOpaqueId(
        source.captureConditionId,
        `${name}.captureConditionId`,
    );

    if (!conditionIds.has(captureConditionId)) {
        throw new TypeError(
            `${name}.captureConditionId nao existe no captureConditionCatalog.`,
        );
    }

    return {
        sessionId: normalizeOpaqueId(source.sessionId, `${name}.sessionId`),
        profileId,
        captureConditionId,
        timestamp: normalizeTimestamp(source.timestamp, `${name}.timestamp`, false),
    };
}

function normalizeVerificationRecord({
    source,
    index,
    datasetProfileId,
    conditionIds,
}) {
    const name = `records[${index}]`;
    assertExactKeys(source, VERIFICATION_KEYS, name);

    if (!Object.values(VERIFICATION_LABEL).includes(source.label)) {
        throw new TypeError(`${name}.label invalido.`);
    }

    const common = normalizeCommonRecordFields({
        source,
        name,
        datasetProfileId,
        conditionIds,
    });

    const comparisonId =
        Object.hasOwn(
            source,
            "comparisonId",
        )
            ? normalizeOpaqueId(
                source.comparisonId,
                `${name}.comparisonId`,
            )
            : null;

    return Object.freeze({
        type: CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON,
        ...common,
        sampleId: normalizeOpaqueId(source.sampleId, `${name}.sampleId`),
        ...(
            comparisonId === null
                ? {}
                : {
                    comparisonId,
                }
        ),
        label: source.label,
        score: normalizeFiniteNumber(
            source.score,
            `${name}.score`,
            SCORE_MIN,
            SCORE_MAX,
        ),
    });
}

function normalizeIdentificationRecord({
    source,
    index,
    datasetProfileId,
    conditionIds,
}) {
    const name = `records[${index}]`;
    assertExactKeys(source, IDENTIFICATION_KEYS, name);

    if (!Object.values(IDENTIFICATION_SEARCH_KIND).includes(source.kind)) {
        throw new TypeError(`${name}.kind invalido.`);
    }

    const common = normalizeCommonRecordFields({
        source,
        name,
        datasetProfileId,
        conditionIds,
    });

    const top1Score = normalizeFiniteNumber(
        source.top1Score,
        `${name}.top1Score`,
        SCORE_MIN,
        SCORE_MAX,
    );

    let top2Score = null;
    let margin = null;

    if (source.top2Score !== undefined && source.top2Score !== null) {
        top2Score = normalizeFiniteNumber(
            source.top2Score,
            `${name}.top2Score`,
            SCORE_MIN,
            SCORE_MAX,
        );

        if (top2Score > top1Score) {
            throw new TypeError(`${name}.top2Score nao pode superar top1Score.`);
        }

        margin = top1Score - top2Score;
    }

    if (source.margin !== undefined && source.margin !== null) {
        const suppliedMargin = normalizeFiniteNumber(
            source.margin,
            `${name}.margin`,
            MARGIN_MIN,
            MARGIN_MAX,
        );

        if (top2Score === null) {
            throw new TypeError(`${name}.margin exige top2Score.`);
        }

        if (Math.abs(suppliedMargin - margin) > 1e-12) {
            throw new TypeError(`${name}.margin diverge de top1Score - top2Score.`);
        }

        margin = suppliedMargin;
    }

    if (
        source.kind === IDENTIFICATION_SEARCH_KIND.MATED &&
        typeof source.top1IsMate !== "boolean"
    ) {
        throw new TypeError(`${name}.top1IsMate e obrigatorio para MATED.`);
    }

    if (
        source.kind === IDENTIFICATION_SEARCH_KIND.NON_MATED &&
        source.top1IsMate !== undefined
    ) {
        throw new TypeError(`${name}.top1IsMate nao e permitido para NON_MATED.`);
    }

    return Object.freeze({
        type: CALIBRATION_RECORD_TYPE.IDENTIFICATION_SEARCH,
        ...common,
        searchId: normalizeOpaqueId(source.searchId, `${name}.searchId`),
        kind: source.kind,
        top1Score,
        top2Score,
        margin,
        ...(
            source.kind === IDENTIFICATION_SEARCH_KIND.MATED
                ? {
                    top1IsMate:
                        source.top1IsMate,
                }
                : {}
        ),
        candidateCount: normalizeNonNegativeInteger(
            source.candidateCount,
            `${name}.candidateCount`,
        ),
    });
}

function normalizeRecords({ records, datasetProfileId, conditionIds }) {
    if (!Array.isArray(records)) {
        throw new TypeError("records deve ser array.");
    }

    const seenKeys = new Set();
    const seenVerificationComparisonIds = new Set();

    return Object.freeze(
        records.map((item, index) => {
            const source = assertPlainObject(item, `records[${index}]`);
            let normalized;

            if (source.type === CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON) {
                normalized = normalizeVerificationRecord({
                    source,
                    index,
                    datasetProfileId,
                    conditionIds,
                });
            } else if (source.type === CALIBRATION_RECORD_TYPE.IDENTIFICATION_SEARCH) {
                normalized = normalizeIdentificationRecord({
                    source,
                    index,
                    datasetProfileId,
                    conditionIds,
                });
            } else {
                throw new TypeError(`records[${index}].type invalido.`);
            }

            const recordKey =
                normalized.type === CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON
                    ? (
                        Object.hasOwn(
                            normalized,
                            "comparisonId",
                        )
                            ? `${normalized.type}|${normalized.sessionId}|${normalized.comparisonId}`
                            : `${normalized.type}|${normalized.sessionId}|${normalized.sampleId}`
                    )
                    : `${normalized.type}|${normalized.sessionId}|${normalized.searchId}`;

            const controlledVerification =
                normalized.type ===
                    CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON &&
                Object.hasOwn(
                    normalized,
                    "comparisonId",
                );

            if (
                seenKeys.has(recordKey) &&
                !controlledVerification
            ) {
                throw new TypeError(`registro duplicado: ${recordKey}`);
            }

            if (
                normalized.type ===
                    CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON &&
                Object.hasOwn(
                    normalized,
                    "comparisonId",
                )
            ) {
                if (
                    seenVerificationComparisonIds.has(
                        normalized.comparisonId,
                    )
                ) {
                    throw new TypeError(
                        `comparisonId duplicado: ${normalized.comparisonId}`,
                    );
                }

                seenVerificationComparisonIds.add(
                    normalized.comparisonId,
                );
            }

            seenKeys.add(recordKey);
            return normalized;
        }),
    );
}

export function validateBiometricCalibrationDataset(dataset) {
    const source = assertPlainObject(dataset, "dataset");
    assertExactKeys(source, DATASET_KEYS, "dataset");

    const profileId = normalizeOpaqueId(source.profileId, "dataset.profileId");
    const captureConditionCatalog = normalizeCaptureConditionCatalog(
        source.captureConditionCatalog,
    );
    const conditionIds = new Set(
        captureConditionCatalog.map((condition) => condition.id),
    );

    const normalized = Object.freeze({
        datasetVersion: normalizeOpaqueId(
            source.datasetVersion,
            "dataset.datasetVersion",
        ),
        protocolVersion: normalizeOpaqueId(
            source.protocolVersion,
            "dataset.protocolVersion",
        ),
        profileId,
        environmentId: normalizeOpaqueId(
            source.environmentId,
            "dataset.environmentId",
        ),
        captureConditionCatalog,
        createdAt: normalizeTimestamp(source.createdAt, "dataset.createdAt", true),
        records: normalizeRecords({
            records: source.records,
            datasetProfileId: profileId,
            conditionIds,
        }),
    });

    return normalized;
}

export function toBiometricThresholdCalibrationInput(dataset) {
    const normalized = validateBiometricCalibrationDataset(dataset);
    const verificationComparisons = [];
    const identificationSearches = [];

    for (const record of normalized.records) {
        if (record.type === CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON) {
            verificationComparisons.push(
                Object.freeze({
                    label: record.label,
                    score: record.score,
                }),
            );
            continue;
        }

        const search = {
            kind: record.kind,
            top1Score: record.top1Score,
        };

        if (record.top2Score !== null) {
            search.top2Score = record.top2Score;
            search.margin = record.margin;
        }

        if (record.kind === IDENTIFICATION_SEARCH_KIND.MATED) {
            search.top1IsMate = record.top1IsMate;
        }

        identificationSearches.push(Object.freeze(search));
    }

    return Object.freeze({
        verificationComparisons: Object.freeze(verificationComparisons),
        identificationSearches: Object.freeze(identificationSearches),
    });
}
