const ROOT_KEYS =
    new Set([
        "protocolVersion",
        "profileId",
        "calibration",
        "evaluation",
        "analysisPolicy",
        "acceptancePolicy",
    ]);

const PHASE_KEYS =
    new Set([
        "datasetVersion",
        "protocolVersion",
        "profileId",
        "environmentId",
        "deviceIds",
        "captureConditionIds",
        "participantIds",
        "sessionIds",
        "plannedCounts",
    ]);

const ANALYSIS_POLICY_KEYS =
    new Set([
        "thresholdGrid",
        "percentilePoints",
        "minimumSampleCounts",
    ]);

const COUNT_KEYS =
    new Set([
        "genuineComparisons",
        "impostorComparisons",
        "matedSearches",
        "nonMatedSearches",
    ]);

const ACCEPTANCE_POLICY_KEYS =
    new Set([
        "maxFmr",
        "maxFnmr",
        "maxFpir",
        "maxFnir",
        "minimumEvaluationParticipants",
        "minimumGenuineComparisons",
        "minimumImpostorComparisons",
        "minimumMatedSearches",
        "minimumNonMatedSearches",
    ]);

const RESULT_KEYS =
    Object.freeze([
        "contractValid",
        "readyForControlledStudy",
        "warnings",
        "blockers",
    ]);

const OPAQUE_ID_PATTERN =
    /^[A-Za-z0-9._:|%+-]{1,256}$/;

const FORBIDDEN_KEY_PATTERN =
    /(^|_)(name|nome|cpf|email|phone|telefone|matricula|image|frame|crop|embedding|vector|centroid|cipher|ciphertext|token|secret|password|credential|biometricmaterial|storage)(_|$)/i;

function assertPlainObject(
    value,
    name,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(
            value,
        )
    ) {
        throw new TypeError(
            `${name} deve ser objeto.`,
        );
    }

    return value;
}

function assertExactKeys(
    value,
    allowed,
    name,
) {
    const keys =
        Object.keys(
            value,
        );

    for (const key of keys) {
        if (
            FORBIDDEN_KEY_PATTERN.test(
                key,
            )
        ) {
            throw new TypeError(
                `${name} contem campo proibido.`,
            );
        }

        if (!allowed.has(key)) {
            throw new TypeError(
                `${name}.${key} nao e permitido.`,
            );
        }
    }

    for (const key of allowed) {
        if (
            !Object.hasOwn(
                value,
                key,
            )
        ) {
            throw new TypeError(
                `${name}.${key} deve ser explicitamente fornecido.`,
            );
        }
    }
}

function normalizeOpaqueId(
    value,
    name,
) {
    if (typeof value !== "string") {
        throw new TypeError(
            `${name} deve ser string opaca.`,
        );
    }

    const normalized =
        value.trim();

    if (
        !OPAQUE_ID_PATTERN.test(
            normalized,
        )
    ) {
        throw new TypeError(
            `${name} deve ser identificador opaco valido.`,
        );
    }

    return normalized;
}

function normalizeIdArray(
    value,
    name,
) {
    if (
        !Array.isArray(
            value,
        ) ||
        value.length === 0
    ) {
        throw new TypeError(
            `${name} deve ser array nao vazio.`,
        );
    }

    const normalized =
        value.map(
            (
                item,
                index,
            ) =>
                normalizeOpaqueId(
                    item,
                    `${name}[${index}]`,
                ),
        );

    if (
        new Set(
            normalized,
        ).size !==
        normalized.length
    ) {
        throw new TypeError(
            `${name} nao pode conter duplicados.`,
        );
    }

    return Object.freeze(
        normalized,
    );
}

function normalizeNonNegativeInteger(
    value,
    name,
) {
    if (
        !Number.isSafeInteger(
            value,
        ) ||
        value < 0
    ) {
        throw new TypeError(
            `${name} deve ser inteiro maior ou igual a zero.`,
        );
    }

    return value;
}

function normalizePositiveInteger(
    value,
    name,
) {
    if (
        !Number.isSafeInteger(
            value,
        ) ||
        value < 1
    ) {
        throw new TypeError(
            `${name} deve ser inteiro maior ou igual a um.`,
        );
    }

    return value;
}

function normalizeRatio(
    value,
    name,
) {
    if (
        typeof value !== "number" ||
        !Number.isFinite(
            value,
        ) ||
        value < 0 ||
        value > 1
    ) {
        throw new TypeError(
            `${name} deve ser numero finito entre 0 e 1.`,
        );
    }

    return value;
}

function normalizeThresholdGrid(
    value,
) {
    if (
        !Array.isArray(
            value,
        ) ||
        value.length === 0
    ) {
        throw new TypeError(
            "analysisPolicy.thresholdGrid deve ser array nao vazio.",
        );
    }

    const normalized =
        value.map(
            (
                item,
                index,
            ) => {
                if (
                    typeof item !== "number" ||
                    !Number.isFinite(
                        item,
                    ) ||
                    item < -1 ||
                    item > 1
                ) {
                    throw new TypeError(
                        `analysisPolicy.thresholdGrid[${index}] deve estar entre -1 e 1.`,
                    );
                }

                return item;
            },
        );

    for (
        let index = 1;
        index < normalized.length;
        index += 1
    ) {
        if (
            normalized[index] <=
            normalized[
                index - 1
            ]
        ) {
            throw new TypeError(
                "analysisPolicy.thresholdGrid deve ser estritamente crescente e sem duplicados.",
            );
        }
    }

    return Object.freeze(
        normalized,
    );
}

function normalizePercentilePoints(
    value,
) {
    if (
        !Array.isArray(
            value,
        ) ||
        value.length === 0
    ) {
        throw new TypeError(
            "analysisPolicy.percentilePoints deve ser array nao vazio.",
        );
    }

    const normalized =
        value.map(
            (
                item,
                index,
            ) => {
                if (
                    typeof item !== "number" ||
                    !Number.isFinite(
                        item,
                    ) ||
                    item < 0 ||
                    item > 1
                ) {
                    throw new TypeError(
                        `analysisPolicy.percentilePoints[${index}] deve estar entre 0 e 1.`,
                    );
                }

                return item;
            },
        );

    for (
        let index = 1;
        index < normalized.length;
        index += 1
    ) {
        if (
            normalized[index] <=
            normalized[
                index - 1
            ]
        ) {
            throw new TypeError(
                "analysisPolicy.percentilePoints deve ser estritamente crescente e sem duplicados.",
            );
        }
    }

    return Object.freeze(
        normalized,
    );
}

function normalizeCounts(
    value,
    name,
    {
        positive =
            false,
    } = {},
) {
    const source =
        assertPlainObject(
            value,
            name,
        );

    assertExactKeys(
        source,
        COUNT_KEYS,
        name,
    );

    const normalize =
        positive
            ? normalizePositiveInteger
            : normalizeNonNegativeInteger;

    return Object.freeze({
        genuineComparisons:
            normalize(
                source.genuineComparisons,
                `${name}.genuineComparisons`,
            ),

        impostorComparisons:
            normalize(
                source.impostorComparisons,
                `${name}.impostorComparisons`,
            ),

        matedSearches:
            normalize(
                source.matedSearches,
                `${name}.matedSearches`,
            ),

        nonMatedSearches:
            normalize(
                source.nonMatedSearches,
                `${name}.nonMatedSearches`,
            ),
    });
}

function normalizePhase(
    value,
    name,
) {
    const source =
        assertPlainObject(
            value,
            name,
        );

    assertExactKeys(
        source,
        PHASE_KEYS,
        name,
    );

    return Object.freeze({
        datasetVersion:
            normalizeOpaqueId(
                source.datasetVersion,
                `${name}.datasetVersion`,
            ),

        protocolVersion:
            normalizeOpaqueId(
                source.protocolVersion,
                `${name}.protocolVersion`,
            ),

        profileId:
            normalizeOpaqueId(
                source.profileId,
                `${name}.profileId`,
            ),

        environmentId:
            normalizeOpaqueId(
                source.environmentId,
                `${name}.environmentId`,
            ),

        deviceIds:
            normalizeIdArray(
                source.deviceIds,
                `${name}.deviceIds`,
            ),

        captureConditionIds:
            normalizeIdArray(
                source.captureConditionIds,
                `${name}.captureConditionIds`,
            ),

        participantIds:
            normalizeIdArray(
                source.participantIds,
                `${name}.participantIds`,
            ),

        sessionIds:
            normalizeIdArray(
                source.sessionIds,
                `${name}.sessionIds`,
            ),

        plannedCounts:
            normalizeCounts(
                source.plannedCounts,
                `${name}.plannedCounts`,
            ),
    });
}

function normalizeAnalysisPolicy(
    value,
) {
    const source =
        assertPlainObject(
            value,
            "analysisPolicy",
        );

    assertExactKeys(
        source,
        ANALYSIS_POLICY_KEYS,
        "analysisPolicy",
    );

    return Object.freeze({
        thresholdGrid:
            normalizeThresholdGrid(
                source.thresholdGrid,
            ),

        percentilePoints:
            normalizePercentilePoints(
                source.percentilePoints,
            ),

        minimumSampleCounts:
            normalizeCounts(
                source.minimumSampleCounts,
                "analysisPolicy.minimumSampleCounts",
                {
                    positive:
                        true,
                },
            ),
    });
}

function normalizeAcceptancePolicy(
    value,
) {
    const source =
        assertPlainObject(
            value,
            "acceptancePolicy",
        );

    assertExactKeys(
        source,
        ACCEPTANCE_POLICY_KEYS,
        "acceptancePolicy",
    );

    return Object.freeze({
        maxFmr:
            normalizeRatio(
                source.maxFmr,
                "acceptancePolicy.maxFmr",
            ),

        maxFnmr:
            normalizeRatio(
                source.maxFnmr,
                "acceptancePolicy.maxFnmr",
            ),

        maxFpir:
            normalizeRatio(
                source.maxFpir,
                "acceptancePolicy.maxFpir",
            ),

        maxFnir:
            normalizeRatio(
                source.maxFnir,
                "acceptancePolicy.maxFnir",
            ),

        minimumEvaluationParticipants:
            normalizePositiveInteger(
                source.minimumEvaluationParticipants,
                "acceptancePolicy.minimumEvaluationParticipants",
            ),

        minimumGenuineComparisons:
            normalizePositiveInteger(
                source.minimumGenuineComparisons,
                "acceptancePolicy.minimumGenuineComparisons",
            ),

        minimumImpostorComparisons:
            normalizePositiveInteger(
                source.minimumImpostorComparisons,
                "acceptancePolicy.minimumImpostorComparisons",
            ),

        minimumMatedSearches:
            normalizePositiveInteger(
                source.minimumMatedSearches,
                "acceptancePolicy.minimumMatedSearches",
            ),

        minimumNonMatedSearches:
            normalizePositiveInteger(
                source.minimumNonMatedSearches,
                "acceptancePolicy.minimumNonMatedSearches",
            ),
    });
}

function normalizeContract(
    input,
) {
    const source =
        assertPlainObject(
            input,
            "controlledStudyContract",
        );

    assertExactKeys(
        source,
        ROOT_KEYS,
        "controlledStudyContract",
    );

    return Object.freeze({
        protocolVersion:
            normalizeOpaqueId(
                source.protocolVersion,
                "controlledStudyContract.protocolVersion",
            ),

        profileId:
            normalizeOpaqueId(
                source.profileId,
                "controlledStudyContract.profileId",
            ),

        calibration:
            normalizePhase(
                source.calibration,
                "calibration",
            ),

        evaluation:
            normalizePhase(
                source.evaluation,
                "evaluation",
            ),

        analysisPolicy:
            normalizeAnalysisPolicy(
                source.analysisPolicy,
            ),

        acceptancePolicy:
            normalizeAcceptancePolicy(
                source.acceptancePolicy,
            ),
    });
}

function hasOverlap(
    left,
    right,
) {
    const rightSet =
        new Set(
            right,
        );

    return left.some(
        (
            value,
        ) =>
            rightSet.has(
                value,
            ),
    );
}

function minimumCountsMet(
    actual,
    minimum,
) {
    return (
        actual.genuineComparisons >=
            minimum.genuineComparisons &&
        actual.impostorComparisons >=
            minimum.impostorComparisons &&
        actual.matedSearches >=
            minimum.matedSearches &&
        actual.nonMatedSearches >=
            minimum.nonMatedSearches
    );
}

function evaluationMinimumsMet(
    evaluation,
    policy,
) {
    return (
        evaluation.participantIds.length >=
            policy.minimumEvaluationParticipants &&
        evaluation.plannedCounts.genuineComparisons >=
            policy.minimumGenuineComparisons &&
        evaluation.plannedCounts.impostorComparisons >=
            policy.minimumImpostorComparisons &&
        evaluation.plannedCounts.matedSearches >=
            policy.minimumMatedSearches &&
        evaluation.plannedCounts.nonMatedSearches >=
            policy.minimumNonMatedSearches
    );
}

function pushUnique(
    target,
    code,
) {
    if (!target.includes(code)) {
        target.push(
            code,
        );
    }
}

function frozenResult({
    contractValid,
    readyForControlledStudy,
    warnings,
    blockers,
}) {
    const result =
        {
            contractValid,
            readyForControlledStudy,
            warnings:
                Object.freeze([
                    ...warnings,
                ]),
            blockers:
                Object.freeze([
                    ...blockers,
                ]),
        };

    for (const key of Object.keys(result)) {
        if (!RESULT_KEYS.includes(key)) {
            throw new Error(
                "resultado R7F contem campo nao autorizado.",
            );
        }
    }

    return Object.freeze(
        result,
    );
}

export function evaluateBiometricControlledStudyContract(
    input = {},
) {
    const warnings =
        [];

    const blockers =
        [];

    let contract;

    try {
        contract =
            normalizeContract(
                input,
            );
    }
    catch {
        return frozenResult({
            contractValid:
                false,

            readyForControlledStudy:
                false,

            warnings,

            blockers:
                [
                    "CONTRACT_INVALID",
                ],
        });
    }

    const {
        calibration,
        evaluation,
        analysisPolicy,
        acceptancePolicy,
    } =
        contract;

    if (
        calibration.protocolVersion !==
            contract.protocolVersion ||
        evaluation.protocolVersion !==
            contract.protocolVersion
    ) {
        pushUnique(
            blockers,
            "PROTOCOL_INCOMPATIBLE",
        );
    }

    if (
        calibration.profileId !==
            contract.profileId ||
        evaluation.profileId !==
            contract.profileId
    ) {
        pushUnique(
            blockers,
            "PROFILE_INCOMPATIBLE",
        );
    }

    if (
        calibration.datasetVersion ===
        evaluation.datasetVersion
    ) {
        pushUnique(
            blockers,
            "DATASET_OVERLAP",
        );
    }

    if (
        hasOverlap(
            calibration.participantIds,
            evaluation.participantIds,
        )
    ) {
        pushUnique(
            blockers,
            "PARTICIPANT_OVERLAP",
        );
    }

    if (
        hasOverlap(
            calibration.sessionIds,
            evaluation.sessionIds,
        )
    ) {
        pushUnique(
            blockers,
            "SESSION_OVERLAP",
        );
    }

    const contractBlockers =
        new Set([
            "PROTOCOL_INCOMPATIBLE",
            "PROFILE_INCOMPATIBLE",
            "DATASET_OVERLAP",
            "PARTICIPANT_OVERLAP",
            "SESSION_OVERLAP",
        ]);

    const contractValid =
        !blockers.some(
            (
                blocker,
            ) =>
                contractBlockers.has(
                    blocker,
                ),
        );

    if (
        !minimumCountsMet(
            calibration.plannedCounts,
            analysisPolicy.minimumSampleCounts,
        )
    ) {
        pushUnique(
            blockers,
            "CALIBRATION_MINIMUMS_NOT_MET",
        );
    }

    if (
        !evaluationMinimumsMet(
            evaluation,
            acceptancePolicy,
        )
    ) {
        pushUnique(
            blockers,
            "EVALUATION_MINIMUMS_NOT_MET",
        );
    }

    const readyForControlledStudy =
        contractValid &&
        blockers.length ===
            0;

    return frozenResult({
        contractValid,
        readyForControlledStudy,
        warnings,
        blockers,
    });
}
