export const CALIBRATION_SPLIT = Object.freeze({
    CALIBRATION: "CALIBRATION",
    EVALUATION: "EVALUATION",
});

export const SAMPLE_ROLE = Object.freeze({
    ENROLLMENT: "ENROLLMENT",
    PROBE: "PROBE",
});

export const VERIFICATION_LABEL = Object.freeze({
    GENUINE: "GENUINE",
    IMPOSTOR: "IMPOSTOR",
});

export const IDENTIFICATION_SEARCH_KIND = Object.freeze({
    MATED: "MATED",
    NON_MATED: "NON_MATED",
});

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9._:|%+-]{1,256}$/;

const PLAN_KEYS = new Set([
    "protocolVersion",
    "profileId",
    "plannedParticipantCount",
    "sessionsPerParticipant",
    "samplesPerSession",
    "plannedGallerySize",
    "captureConditionCatalog",
    "participants",
    "calibrationParticipantIds",
    "evaluationParticipantIds",
    "verificationComparisons",
    "identificationSearches",
    "policies",
    "sufficiencyCriteria",
]);

const CONDITION_KEYS = new Set([
    "id",
    "lighting",
    "distanceBand",
    "pose",
    "glasses",
    "ppe",
    "deviceId",
    "environmentId",
]);

const PARTICIPANT_KEYS = new Set([
    "participantId",
    "sessions",
]);

const SESSION_KEYS = new Set([
    "sessionId",
    "samples",
]);

const SAMPLE_KEYS = new Set([
    "sampleId",
    "profileId",
    "role",
    "captureConditionId",
]);

const VERIFICATION_KEYS = new Set([
    "comparisonId",
    "split",
    "label",
    "enrollmentSampleId",
    "probeSampleId",
]);

const IDENTIFICATION_KEYS = new Set([
    "searchId",
    "split",
    "kind",
    "probeSampleId",
    "galleryParticipantIds",
    "mateParticipantId",
]);

const POLICY_KEYS = new Set([
    "enrollmentProbeSeparationRequired",
    "disjointCalibrationEvaluationRequired",
    "requireMatedSearches",
    "requireNonMatedSearches",
]);

const SUFFICIENCY_KEYS = new Set([
    "minimumParticipants",
    "minimumSessionsPerParticipant",
    "minimumSamplesPerSession",
    "minimumGenuineComparisons",
    "minimumImpostorComparisons",
    "minimumMatedSearches",
    "minimumNonMatedSearches",
    "minimumGallerySize",
    "minimumSamplesPerCondition",
]);

function assertPlainObject(value, name) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
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
        throw new TypeError(`${name} deve ser identificador opaco sem espacos ou dados pessoais evidentes.`);
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

function normalizePositiveInteger(value, name) {
    if (!Number.isInteger(value) || value < 1) {
        throw new TypeError(`${name} deve ser inteiro maior ou igual a um.`);
    }

    return value;
}

function normalizeNonNegativeInteger(value, name) {
    if (!Number.isInteger(value) || value < 0) {
        throw new TypeError(`${name} deve ser inteiro maior ou igual a zero.`);
    }

    return value;
}

function normalizeBoolean(value, name) {
    if (typeof value !== "boolean") {
        throw new TypeError(`${name} deve ser boolean.`);
    }

    return value;
}

function normalizeSplit(value, name) {
    if (!Object.values(CALIBRATION_SPLIT).includes(value)) {
        throw new TypeError(`${name} invalido.`);
    }

    return value;
}

function normalizeStringArray(values, name) {
    if (!Array.isArray(values)) {
        throw new TypeError(`${name} deve ser array.`);
    }

    const normalized = values.map((value, index) =>
        normalizeOpaqueId(value, `${name}[${index}]`),
    );

    if (new Set(normalized).size !== normalized.length) {
        throw new TypeError(`${name} nao pode conter ids duplicados.`);
    }

    return Object.freeze(normalized);
}

function normalizePpe(values, name) {
    if (!Array.isArray(values)) {
        throw new TypeError(`${name} deve ser array.`);
    }

    const normalized = values.map((value, index) =>
        normalizeDescriptor(value, `${name}[${index}]`),
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

    const ids = new Set();

    const normalized = value.map((item, index) => {
        const name = `captureConditionCatalog[${index}]`;
        const source = assertPlainObject(item, name);
        assertExactKeys(source, CONDITION_KEYS, name);

        const id = normalizeOpaqueId(source.id, `${name}.id`);

        if (ids.has(id)) {
            throw new TypeError(`captureConditionCatalog.id duplicado: ${id}`);
        }

        ids.add(id);

        return Object.freeze({
            id,
            lighting: normalizeDescriptor(source.lighting, `${name}.lighting`),
            distanceBand: normalizeDescriptor(source.distanceBand, `${name}.distanceBand`),
            pose: normalizeDescriptor(source.pose, `${name}.pose`),
            glasses: normalizeBoolean(source.glasses, `${name}.glasses`),
            ppe: normalizePpe(source.ppe, `${name}.ppe`),
            deviceId: normalizeOpaqueId(source.deviceId, `${name}.deviceId`),
            environmentId: normalizeOpaqueId(source.environmentId, `${name}.environmentId`),
        });
    });

    return Object.freeze(normalized);
}

function normalizePolicies(value) {
    const source = assertPlainObject(value, "policies");
    assertExactKeys(source, POLICY_KEYS, "policies");

    return Object.freeze({
        enrollmentProbeSeparationRequired: normalizeBoolean(
            source.enrollmentProbeSeparationRequired,
            "policies.enrollmentProbeSeparationRequired",
        ),
        disjointCalibrationEvaluationRequired: normalizeBoolean(
            source.disjointCalibrationEvaluationRequired,
            "policies.disjointCalibrationEvaluationRequired",
        ),
        requireMatedSearches: normalizeBoolean(
            source.requireMatedSearches,
            "policies.requireMatedSearches",
        ),
        requireNonMatedSearches: normalizeBoolean(
            source.requireNonMatedSearches,
            "policies.requireNonMatedSearches",
        ),
    });
}

function normalizeSufficiencyCriteria(value) {
    const source = assertPlainObject(value, "sufficiencyCriteria");
    assertExactKeys(source, SUFFICIENCY_KEYS, "sufficiencyCriteria");

    return Object.freeze({
        minimumParticipants: normalizeNonNegativeInteger(
            source.minimumParticipants,
            "sufficiencyCriteria.minimumParticipants",
        ),
        minimumSessionsPerParticipant: normalizeNonNegativeInteger(
            source.minimumSessionsPerParticipant,
            "sufficiencyCriteria.minimumSessionsPerParticipant",
        ),
        minimumSamplesPerSession: normalizeNonNegativeInteger(
            source.minimumSamplesPerSession,
            "sufficiencyCriteria.minimumSamplesPerSession",
        ),
        minimumGenuineComparisons: normalizeNonNegativeInteger(
            source.minimumGenuineComparisons,
            "sufficiencyCriteria.minimumGenuineComparisons",
        ),
        minimumImpostorComparisons: normalizeNonNegativeInteger(
            source.minimumImpostorComparisons,
            "sufficiencyCriteria.minimumImpostorComparisons",
        ),
        minimumMatedSearches: normalizeNonNegativeInteger(
            source.minimumMatedSearches,
            "sufficiencyCriteria.minimumMatedSearches",
        ),
        minimumNonMatedSearches: normalizeNonNegativeInteger(
            source.minimumNonMatedSearches,
            "sufficiencyCriteria.minimumNonMatedSearches",
        ),
        minimumGallerySize: normalizeNonNegativeInteger(
            source.minimumGallerySize,
            "sufficiencyCriteria.minimumGallerySize",
        ),
        minimumSamplesPerCondition: normalizeNonNegativeInteger(
            source.minimumSamplesPerCondition,
            "sufficiencyCriteria.minimumSamplesPerCondition",
        ),
    });
}

function normalizeParticipants({
    value,
    profileId,
    conditionIds,
    sessionsPerParticipant,
    samplesPerSession,
}) {
    if (!Array.isArray(value) || value.length === 0) {
        throw new TypeError("participants deve ser array nao vazio.");
    }

    const participantIds = new Set();
    const sessionIds = new Set();
    const sampleIds = new Set();
    const sampleIndex = new Map();
    const conditionCounts = new Map(
        Array.from(conditionIds, (id) => [id, 0]),
    );

    const normalized = value.map((participant, participantIndex) => {
        const participantName = `participants[${participantIndex}]`;
        const source = assertPlainObject(participant, participantName);
        assertExactKeys(source, PARTICIPANT_KEYS, participantName);

        const participantId = normalizeOpaqueId(
            source.participantId,
            `${participantName}.participantId`,
        );

        if (participantIds.has(participantId)) {
            throw new TypeError(`participantId duplicado: ${participantId}`);
        }

        participantIds.add(participantId);

        if (!Array.isArray(source.sessions)) {
            throw new TypeError(`${participantName}.sessions deve ser array.`);
        }

        if (source.sessions.length !== sessionsPerParticipant) {
            throw new TypeError(
                `${participantName}.sessions deve possuir exatamente sessionsPerParticipant sessoes.`,
            );
        }

        const sessions = source.sessions.map((session, sessionIndex) => {
            const sessionName = `${participantName}.sessions[${sessionIndex}]`;
            const sessionSource = assertPlainObject(session, sessionName);
            assertExactKeys(sessionSource, SESSION_KEYS, sessionName);

            const sessionId = normalizeOpaqueId(
                sessionSource.sessionId,
                `${sessionName}.sessionId`,
            );

            if (sessionIds.has(sessionId)) {
                throw new TypeError(`sessionId duplicado: ${sessionId}`);
            }

            sessionIds.add(sessionId);

            if (!Array.isArray(sessionSource.samples)) {
                throw new TypeError(`${sessionName}.samples deve ser array.`);
            }

            if (sessionSource.samples.length !== samplesPerSession) {
                throw new TypeError(
                    `${sessionName}.samples deve possuir exatamente samplesPerSession amostras.`,
                );
            }

            const samples = sessionSource.samples.map((sample, sampleIndexLocal) => {
                const sampleName = `${sessionName}.samples[${sampleIndexLocal}]`;
                const sampleSource = assertPlainObject(sample, sampleName);
                assertExactKeys(sampleSource, SAMPLE_KEYS, sampleName);

                const sampleId = normalizeOpaqueId(
                    sampleSource.sampleId,
                    `${sampleName}.sampleId`,
                );

                if (sampleIds.has(sampleId)) {
                    throw new TypeError(`sampleId duplicado: ${sampleId}`);
                }

                sampleIds.add(sampleId);

                const sampleProfileId = normalizeOpaqueId(
                    sampleSource.profileId,
                    `${sampleName}.profileId`,
                );

                if (sampleProfileId !== profileId) {
                    throw new TypeError(
                        `${sampleName}.profileId diverge do profileId unico do plano.`,
                    );
                }

                if (!Object.values(SAMPLE_ROLE).includes(sampleSource.role)) {
                    throw new TypeError(`${sampleName}.role invalido.`);
                }

                const captureConditionId = normalizeOpaqueId(
                    sampleSource.captureConditionId,
                    `${sampleName}.captureConditionId`,
                );

                if (!conditionIds.has(captureConditionId)) {
                    throw new TypeError(
                        `${sampleName}.captureConditionId nao existe no captureConditionCatalog.`,
                    );
                }

                conditionCounts.set(
                    captureConditionId,
                    conditionCounts.get(captureConditionId) + 1,
                );

                const normalizedSample = Object.freeze({
                    sampleId,
                    profileId: sampleProfileId,
                    role: sampleSource.role,
                    captureConditionId,
                });

                sampleIndex.set(sampleId, Object.freeze({
                    participantId,
                    sessionId,
                    sample: normalizedSample,
                }));

                return normalizedSample;
            });

            return Object.freeze({
                sessionId,
                samples: Object.freeze(samples),
            });
        });

        return Object.freeze({
            participantId,
            sessions: Object.freeze(sessions),
        });
    });

    return {
        participants: Object.freeze(normalized),
        participantIds,
        sampleIndex,
        conditionCounts,
    };
}

function normalizeSplitAssignments({
    calibrationParticipantIds,
    evaluationParticipantIds,
    participantIds,
    policies,
}) {
    const calibration = normalizeStringArray(
        calibrationParticipantIds,
        "calibrationParticipantIds",
    );
    const evaluation = normalizeStringArray(
        evaluationParticipantIds,
        "evaluationParticipantIds",
    );

    for (const id of [...calibration, ...evaluation]) {
        if (!participantIds.has(id)) {
            throw new TypeError(`split referencia participantId inexistente: ${id}`);
        }
    }

    if (policies.disjointCalibrationEvaluationRequired) {
        const calibrationSet = new Set(calibration);

        for (const id of evaluation) {
            if (calibrationSet.has(id)) {
                throw new TypeError(
                    `participantId presente simultaneamente em calibration e evaluation: ${id}`,
                );
            }
        }
    }

    const assigned = new Set([...calibration, ...evaluation]);

    for (const id of participantIds) {
        if (!assigned.has(id)) {
            throw new TypeError(`participantId sem split atribuido: ${id}`);
        }
    }

    return Object.freeze({
        calibrationParticipantIds: calibration,
        evaluationParticipantIds: evaluation,
    });
}

function normalizeVerificationComparisons({
    value,
    sampleIndex,
    policies,
    calibrationParticipantIds,
    evaluationParticipantIds,
}) {
    if (!Array.isArray(value)) {
        throw new TypeError("verificationComparisons deve ser array.");
    }

    const ids = new Set();

    return Object.freeze(value.map((item, index) => {
        const name = `verificationComparisons[${index}]`;
        const source = assertPlainObject(item, name);
        assertExactKeys(source, VERIFICATION_KEYS, name);

        const comparisonId = normalizeOpaqueId(
            source.comparisonId,
            `${name}.comparisonId`,
        );

        if (ids.has(comparisonId)) {
            throw new TypeError(`comparisonId duplicado: ${comparisonId}`);
        }

        ids.add(comparisonId);

        if (!Object.values(VERIFICATION_LABEL).includes(source.label)) {
            throw new TypeError(`${name}.label invalido.`);
        }

        const split = normalizeSplit(source.split, `${name}.split`);
        const splitIds = new Set(
            split === CALIBRATION_SPLIT.CALIBRATION
                ? calibrationParticipantIds
                : evaluationParticipantIds,
        );

        const enrollmentSampleId = normalizeOpaqueId(
            source.enrollmentSampleId,
            `${name}.enrollmentSampleId`,
        );
        const probeSampleId = normalizeOpaqueId(
            source.probeSampleId,
            `${name}.probeSampleId`,
        );

        const enrollment = sampleIndex.get(enrollmentSampleId);
        const probe = sampleIndex.get(probeSampleId);

        if (!enrollment) {
            throw new TypeError(`${name}.enrollmentSampleId inexistente.`);
        }

        if (!probe) {
            throw new TypeError(`${name}.probeSampleId inexistente.`);
        }

        if (enrollment.sample.role !== SAMPLE_ROLE.ENROLLMENT) {
            throw new TypeError(`${name}.enrollmentSampleId deve referenciar amostra ENROLLMENT.`);
        }

        if (probe.sample.role !== SAMPLE_ROLE.PROBE) {
            throw new TypeError(`${name}.probeSampleId deve referenciar amostra PROBE.`);
        }

        if (
            !splitIds.has(enrollment.participantId) ||
            !splitIds.has(probe.participantId)
        ) {
            throw new TypeError(`${name} mistura participantes fora do split declarado.`);
        }

        if (
            policies.enrollmentProbeSeparationRequired &&
            enrollmentSampleId === probeSampleId
        ) {
            throw new TypeError(`${name} nao pode reutilizar a mesma amostra como enrollment e probe.`);
        }

        const sameParticipant = enrollment.participantId === probe.participantId;

        if (source.label === VERIFICATION_LABEL.GENUINE && !sameParticipant) {
            throw new TypeError(`${name} GENUINE exige amostras do mesmo participante.`);
        }

        if (source.label === VERIFICATION_LABEL.IMPOSTOR && sameParticipant) {
            throw new TypeError(`${name} IMPOSTOR exige participantes diferentes.`);
        }

        return Object.freeze({
            comparisonId,
            split,
            label: source.label,
            enrollmentSampleId,
            probeSampleId,
        });
    }));
}

function normalizeIdentificationSearches({
    value,
    sampleIndex,
    participantIds,
    plannedGallerySize,
    policies,
    calibrationParticipantIds,
    evaluationParticipantIds,
}) {
    if (!Array.isArray(value)) {
        throw new TypeError("identificationSearches deve ser array.");
    }

    const ids = new Set();

    const normalized = value.map((item, index) => {
        const name = `identificationSearches[${index}]`;
        const source = assertPlainObject(item, name);
        assertExactKeys(source, IDENTIFICATION_KEYS, name);

        const searchId = normalizeOpaqueId(source.searchId, `${name}.searchId`);

        if (ids.has(searchId)) {
            throw new TypeError(`searchId duplicado: ${searchId}`);
        }

        ids.add(searchId);

        if (!Object.values(IDENTIFICATION_SEARCH_KIND).includes(source.kind)) {
            throw new TypeError(`${name}.kind invalido.`);
        }

        const split = normalizeSplit(source.split, `${name}.split`);
        const splitIds = new Set(
            split === CALIBRATION_SPLIT.CALIBRATION
                ? calibrationParticipantIds
                : evaluationParticipantIds,
        );

        const probeSampleId = normalizeOpaqueId(
            source.probeSampleId,
            `${name}.probeSampleId`,
        );
        const probe = sampleIndex.get(probeSampleId);

        if (!probe) {
            throw new TypeError(`${name}.probeSampleId inexistente.`);
        }

        if (probe.sample.role !== SAMPLE_ROLE.PROBE) {
            throw new TypeError(`${name}.probeSampleId deve referenciar amostra PROBE.`);
        }

        const galleryParticipantIds = normalizeStringArray(
            source.galleryParticipantIds,
            `${name}.galleryParticipantIds`,
        );

        if (galleryParticipantIds.length !== plannedGallerySize) {
            throw new TypeError(
                `${name}.galleryParticipantIds deve possuir exatamente plannedGallerySize participantes.`,
            );
        }

        for (const participantId of galleryParticipantIds) {
            if (!participantIds.has(participantId)) {
                throw new TypeError(`${name} referencia participantId inexistente: ${participantId}`);
            }

            if (!splitIds.has(participantId)) {
                throw new TypeError(`${name} possui galeria fora do split declarado.`);
            }
        }

        if (!splitIds.has(probe.participantId)) {
            throw new TypeError(`${name} possui probe fora do split declarado.`);
        }

        if (source.kind === IDENTIFICATION_SEARCH_KIND.MATED) {
            const mateParticipantId = normalizeOpaqueId(
                source.mateParticipantId,
                `${name}.mateParticipantId`,
            );

            if (mateParticipantId !== probe.participantId) {
                throw new TypeError(`${name}.mateParticipantId deve corresponder ao dono do probe.`);
            }

            if (!galleryParticipantIds.includes(mateParticipantId)) {
                throw new TypeError(`${name} MATED exige mateParticipantId presente na galeria.`);
            }

            return Object.freeze({
                searchId,
                split,
                kind: source.kind,
                probeSampleId,
                galleryParticipantIds,
                mateParticipantId,
            });
        }

        if (
            source.mateParticipantId !== undefined &&
            source.mateParticipantId !== null
        ) {
            throw new TypeError(`${name}.mateParticipantId nao e permitido para NON_MATED.`);
        }

        if (galleryParticipantIds.includes(probe.participantId)) {
            throw new TypeError(`${name} NON_MATED nao pode conter o dono do probe na galeria.`);
        }

        return Object.freeze({
            searchId,
            split,
            kind: source.kind,
            probeSampleId,
            galleryParticipantIds,
            mateParticipantId: null,
        });
    });

    const matedCount = normalized.filter(
        (item) => item.kind === IDENTIFICATION_SEARCH_KIND.MATED,
    ).length;
    const nonMatedCount = normalized.filter(
        (item) => item.kind === IDENTIFICATION_SEARCH_KIND.NON_MATED,
    ).length;

    if (policies.requireMatedSearches && matedCount === 0) {
        throw new TypeError("plano exige ao menos uma busca MATED.");
    }

    if (policies.requireNonMatedSearches && nonMatedCount === 0) {
        throw new TypeError("plano exige ao menos uma busca NON_MATED.");
    }

    return Object.freeze(normalized);
}

function buildCounts(plan) {
    const sessions = plan.participants.reduce(
        (sum, participant) => sum + participant.sessions.length,
        0,
    );
    const samples = plan.participants.reduce(
        (sum, participant) =>
            sum + participant.sessions.reduce(
                (inner, session) => inner + session.samples.length,
                0,
            ),
        0,
    );
    const genuineComparisons = plan.verificationComparisons.filter(
        (item) => item.label === VERIFICATION_LABEL.GENUINE,
    ).length;
    const impostorComparisons = plan.verificationComparisons.filter(
        (item) => item.label === VERIFICATION_LABEL.IMPOSTOR,
    ).length;
    const matedSearches = plan.identificationSearches.filter(
        (item) => item.kind === IDENTIFICATION_SEARCH_KIND.MATED,
    ).length;
    const nonMatedSearches = plan.identificationSearches.filter(
        (item) => item.kind === IDENTIFICATION_SEARCH_KIND.NON_MATED,
    ).length;

    return Object.freeze({
        participants: plan.participants.length,
        sessions,
        samples,
        genuineComparisons,
        impostorComparisons,
        matedSearches,
        nonMatedSearches,
        gallerySize: plan.plannedGallerySize,
    });
}

function buildCoverage(plan) {
    const counts = new Map(
        plan.captureConditionCatalog.map((condition) => [condition.id, 0]),
    );

    for (const participant of plan.participants) {
        for (const session of participant.sessions) {
            for (const sample of session.samples) {
                counts.set(
                    sample.captureConditionId,
                    counts.get(sample.captureConditionId) + 1,
                );
            }
        }
    }

    return Object.freeze(
        plan.captureConditionCatalog.map((condition) =>
            Object.freeze({
                captureConditionId: condition.id,
                plannedSamples: counts.get(condition.id),
            }),
        ),
    );
}

function buildWarnings(plan, counts) {
    const criteria = plan.sufficiencyCriteria;
    const warnings = [];

    const checks = [
        ["participants", counts.participants, criteria.minimumParticipants],
        [
            "sessionsPerParticipant",
            plan.sessionsPerParticipant,
            criteria.minimumSessionsPerParticipant,
        ],
        [
            "samplesPerSession",
            plan.samplesPerSession,
            criteria.minimumSamplesPerSession,
        ],
        [
            "genuineComparisons",
            counts.genuineComparisons,
            criteria.minimumGenuineComparisons,
        ],
        [
            "impostorComparisons",
            counts.impostorComparisons,
            criteria.minimumImpostorComparisons,
        ],
        ["matedSearches", counts.matedSearches, criteria.minimumMatedSearches],
        [
            "nonMatedSearches",
            counts.nonMatedSearches,
            criteria.minimumNonMatedSearches,
        ],
        ["gallerySize", counts.gallerySize, criteria.minimumGallerySize],
    ];

    for (const [metric, actual, minimumRequested] of checks) {
        if (actual < minimumRequested) {
            warnings.push(Object.freeze({
                code: "INSUFFICIENT_PLAN",
                metric,
                actual,
                minimumRequested,
            }));
        }
    }

    return Object.freeze(warnings);
}

export function validateBiometricCalibrationCollectionPlan(plan) {
    const source = assertPlainObject(plan, "plan");
    assertExactKeys(source, PLAN_KEYS, "plan");

    const protocolVersion = normalizeOpaqueId(
        source.protocolVersion,
        "plan.protocolVersion",
    );
    const profileId = normalizeOpaqueId(source.profileId, "plan.profileId");
    const plannedParticipantCount = normalizePositiveInteger(
        source.plannedParticipantCount,
        "plan.plannedParticipantCount",
    );
    const sessionsPerParticipant = normalizePositiveInteger(
        source.sessionsPerParticipant,
        "plan.sessionsPerParticipant",
    );
    const samplesPerSession = normalizePositiveInteger(
        source.samplesPerSession,
        "plan.samplesPerSession",
    );
    const plannedGallerySize = normalizePositiveInteger(
        source.plannedGallerySize,
        "plan.plannedGallerySize",
    );
    const captureConditionCatalog = normalizeCaptureConditionCatalog(
        source.captureConditionCatalog,
    );
    const conditionIds = new Set(
        captureConditionCatalog.map((condition) => condition.id),
    );
    const policies = normalizePolicies(source.policies);
    const sufficiencyCriteria = normalizeSufficiencyCriteria(
        source.sufficiencyCriteria,
    );

    const participantState = normalizeParticipants({
        value: source.participants,
        profileId,
        conditionIds,
        sessionsPerParticipant,
        samplesPerSession,
    });

    if (participantState.participants.length !== plannedParticipantCount) {
        throw new TypeError(
            "plannedParticipantCount diverge da quantidade de participants.",
        );
    }

    if (plannedGallerySize > plannedParticipantCount) {
        throw new TypeError(
            "plannedGallerySize nao pode superar plannedParticipantCount.",
        );
    }

    const splitAssignments = normalizeSplitAssignments({
        calibrationParticipantIds: source.calibrationParticipantIds,
        evaluationParticipantIds: source.evaluationParticipantIds,
        participantIds: participantState.participantIds,
        policies,
    });

    const verificationComparisons = normalizeVerificationComparisons({
        value: source.verificationComparisons,
        sampleIndex: participantState.sampleIndex,
        policies,
        calibrationParticipantIds: splitAssignments.calibrationParticipantIds,
        evaluationParticipantIds: splitAssignments.evaluationParticipantIds,
    });

    const identificationSearches = normalizeIdentificationSearches({
        value: source.identificationSearches,
        sampleIndex: participantState.sampleIndex,
        participantIds: participantState.participantIds,
        plannedGallerySize,
        policies,
        calibrationParticipantIds: splitAssignments.calibrationParticipantIds,
        evaluationParticipantIds: splitAssignments.evaluationParticipantIds,
    });

    for (const [conditionId, count] of participantState.conditionCounts) {
        if (count < sufficiencyCriteria.minimumSamplesPerCondition) {
            throw new TypeError(
                `captureConditionId ${conditionId} possui cobertura ${count} abaixo do minimo ${sufficiencyCriteria.minimumSamplesPerCondition}.`,
            );
        }
    }

    return Object.freeze({
        protocolVersion,
        profileId,
        plannedParticipantCount,
        sessionsPerParticipant,
        samplesPerSession,
        plannedGallerySize,
        captureConditionCatalog,
        participants: participantState.participants,
        ...splitAssignments,
        verificationComparisons,
        identificationSearches,
        policies,
        sufficiencyCriteria,
    });
}

export function summarizeBiometricCalibrationCollectionPlan(plan) {
    const normalized = validateBiometricCalibrationCollectionPlan(plan);
    const counts = buildCounts(normalized);
    const coverageByCondition = buildCoverage(normalized);
    const warnings = buildWarnings(normalized, counts);

    return Object.freeze({
        profileId: normalized.profileId,
        protocolVersion: normalized.protocolVersion,
        plannedParticipants: counts.participants,
        plannedSessions: counts.sessions,
        plannedSamples: counts.samples,
        plannedGenuineComparisons: counts.genuineComparisons,
        plannedImpostorComparisons: counts.impostorComparisons,
        plannedMatedSearches: counts.matedSearches,
        plannedNonMatedSearches: counts.nonMatedSearches,
        plannedGallerySize: counts.gallerySize,
        coverageByCondition,
        warnings,
        readyForRealCollection: warnings.length === 0,
        readinessScope: "STRUCTURAL_PLAN_ONLY",
    });
}
