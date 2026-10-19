import {
    CALIBRATION_SPLIT,
    IDENTIFICATION_SEARCH_KIND,
    SAMPLE_ROLE,
    validateBiometricCalibrationCollectionPlan,
} from "./biometricCalibrationCollectionProtocol.mjs";
import { evaluateBiometricControlledStudyContract } from "./biometricControlledStudyContract.mjs";
import { createBiometricCalibrationScoringProtocol } from "./biometricCalibrationScoringProtocol.mjs";
import { CALIBRATION_EXECUTION_PHASE } from "./biometricCalibrationExecutionManifest.mjs";
import { CALIBRATION_RECORD_TYPE } from "./biometricCalibrationDataContract.mjs";
import { evaluateBiometricCalibrationExecutionValidation } from "./biometricCalibrationExecutionValidator.mjs";

export const REAL_CALIBRATION_PARTICIPANT_ID_POLICY = Object.freeze({
    calibrationPattern: /^cal-p\d{3,}$/,
    evaluationPattern: /^eval-p\d{3,}$/,
    description: "SPLIT_PREFIXED_NUMERIC_PSEUDONYM",
});

export const REAL_CALIBRATION_FRESH_FRAME_PROTOCOL = Object.freeze({
    queueCapacity: 1,
    drainPendingFrameBeforeArm: true,
    baselineField: "lastFrame",
    requireStrictLastFrameAdvance: true,
    requirePendingFreshFrame: true,
    exclusiveConsumerRequired: true,
    frameFormat: "bgr24",
});

export const REAL_CALIBRATION_AUTHORIZATION_BLOCKER = Object.freeze({
    CAMERA: "REAL_CAMERA_AUTHORIZATION_REQUIRED",
    RTSP: "REAL_RTSP_AUTHORIZATION_REQUIRED",
    PARTICIPANTS: "REAL_PARTICIPANTS_AUTHORIZATION_REQUIRED",
});

const STARTED_AT = "2026-01-01T00:00:00.000Z";
const CAPTURED_AT = "2026-01-01T00:00:01.000Z";
const COMPLETED_AT = "2026-01-01T00:00:02.000Z";
const CREATED_AT = "2026-01-01T00:00:03.000Z";

function addBlocker(blockers, code) {
    if (!blockers.includes(code)) blockers.push(code);
}

function sameSet(left, right) {
    if (left.size !== right.size) return false;
    for (const value of left) if (!right.has(value)) return false;
    return true;
}

function buildIndexes(plan) {
    const participantById = new Map();
    const sampleById = new Map();
    const conditionById = new Map(
        plan.captureConditionCatalog.map((condition) => [condition.id, condition]),
    );

    for (const participant of plan.participants) {
        participantById.set(participant.participantId, participant);
        for (const session of participant.sessions) {
            for (const sample of session.samples) {
                sampleById.set(sample.sampleId, {
                    participantId: participant.participantId,
                    sessionId: session.sessionId,
                    sample,
                });
            }
        }
    }

    return Object.freeze({
        participantById,
        sampleById,
        conditionById,
    });
}

function participantIdsAreOpaque(plan) {
    return (
        plan.calibrationParticipantIds.every((id) =>
            REAL_CALIBRATION_PARTICIPANT_ID_POLICY.calibrationPattern.test(id)
        ) &&
        plan.evaluationParticipantIds.every((id) =>
            REAL_CALIBRATION_PARTICIPANT_ID_POLICY.evaluationPattern.test(id)
        )
    );
}

function referenceCountsAreValid({ plan, indexes, scoringProtocol }) {
    if (
        scoringProtocol.minimumEnrollmentReferencesPerParticipant !== 3 ||
        scoringProtocol.maximumEnrollmentReferencesPerParticipant !== 5
    ) {
        return false;
    }

    const referenceIds = new Set();

    for (const comparison of plan.verificationComparisons) {
        if (comparison.split !== CALIBRATION_SPLIT.CALIBRATION) continue;
        const enrollment = indexes.sampleById.get(comparison.enrollmentSampleId);
        if (!enrollment) return false;
        referenceIds.add(enrollment.participantId);
    }

    for (const search of plan.identificationSearches) {
        if (search.split !== CALIBRATION_SPLIT.CALIBRATION) continue;
        for (const participantId of search.galleryParticipantIds) {
            referenceIds.add(participantId);
        }
    }

    for (const participantId of referenceIds) {
        const participant = indexes.participantById.get(participantId);
        if (!participant) return false;

        let enrollmentCount = 0;
        for (const session of participant.sessions) {
            for (const sample of session.samples) {
                if (sample.role === SAMPLE_ROLE.ENROLLMENT) enrollmentCount += 1;
            }
        }

        if (enrollmentCount < 3 || enrollmentCount > 5) return false;
    }

    return true;
}

function sessionsAreRoleSeparated(plan) {
    const calibrationIds = new Set(plan.calibrationParticipantIds);

    for (const participant of plan.participants) {
        if (!calibrationIds.has(participant.participantId)) continue;

        let enrollmentSessions = 0;
        let probeSessions = 0;

        for (const session of participant.sessions) {
            const roles = new Set(session.samples.map((sample) => sample.role));
            if (roles.size !== 1) return false;

            const [role] = roles;
            if (role === SAMPLE_ROLE.ENROLLMENT) enrollmentSessions += 1;
            else if (role === SAMPLE_ROLE.PROBE) probeSessions += 1;
            else return false;
        }

        if (enrollmentSessions < 1 || probeSessions < 1) return false;
    }

    return true;
}

function devicesAndConditionsAreCompatible({ plan, contract, indexes }) {
    const calibrationIds = new Set(plan.calibrationParticipantIds);
    const conditions = new Set();
    const devices = new Set();
    const environments = new Set();

    for (const participant of plan.participants) {
        if (!calibrationIds.has(participant.participantId)) continue;

        for (const session of participant.sessions) {
            for (const sample of session.samples) {
                const condition = indexes.conditionById.get(sample.captureConditionId);
                if (!condition) return false;
                conditions.add(condition.id);
                devices.add(condition.deviceId);
                environments.add(condition.environmentId);
            }
        }
    }

    return (
        sameSet(conditions, new Set(contract.calibration.captureConditionIds)) &&
        sameSet(devices, new Set(contract.calibration.deviceIds)) &&
        environments.size === 1 &&
        environments.has(contract.calibration.environmentId)
    );
}

function verificationIsTraceable({ plan, indexes }) {
    const calibrationIds = new Set(plan.calibrationParticipantIds);
    const comparisons = plan.verificationComparisons.filter(
        (item) => item.split === CALIBRATION_SPLIT.CALIBRATION,
    );
    if (comparisons.length === 0) return false;

    for (const comparison of comparisons) {
        const enrollment = indexes.sampleById.get(comparison.enrollmentSampleId);
        const probe = indexes.sampleById.get(comparison.probeSampleId);
        if (
            !enrollment ||
            !probe ||
            enrollment.sample.role !== SAMPLE_ROLE.ENROLLMENT ||
            probe.sample.role !== SAMPLE_ROLE.PROBE ||
            !calibrationIds.has(enrollment.participantId) ||
            !calibrationIds.has(probe.participantId)
        ) return false;
    }

    return true;
}

function identificationIsTraceable({ plan, indexes }) {
    const calibrationIds = new Set(plan.calibrationParticipantIds);
    const searches = plan.identificationSearches.filter(
        (item) => item.split === CALIBRATION_SPLIT.CALIBRATION,
    );
    if (searches.length === 0) return false;

    for (const search of searches) {
        const probe = indexes.sampleById.get(search.probeSampleId);
        if (
            !probe ||
            probe.sample.role !== SAMPLE_ROLE.PROBE ||
            !calibrationIds.has(probe.participantId) ||
            search.galleryParticipantIds.length !== plan.plannedGallerySize
        ) return false;

        for (const participantId of search.galleryParticipantIds) {
            if (!calibrationIds.has(participantId)) return false;
        }

        if (
            search.kind === IDENTIFICATION_SEARCH_KIND.MATED &&
            !search.galleryParticipantIds.includes(search.mateParticipantId)
        ) return false;

        if (
            search.kind === IDENTIFICATION_SEARCH_KIND.NON_MATED &&
            search.mateParticipantId !== null
        ) return false;
    }

    return true;
}

function buildStructuralManifest({ plan, contract }) {
    const calibrationIds = new Set(plan.calibrationParticipantIds);

    return {
        protocolVersion: plan.protocolVersion,
        profileId: plan.profileId,
        datasetVersion: contract.calibration.datasetVersion,
        phase: CALIBRATION_EXECUTION_PHASE.CALIBRATION,
        environmentId: contract.calibration.environmentId,
        participants: plan.participants
            .filter((participant) => calibrationIds.has(participant.participantId))
            .map((participant) => ({
                participantId: participant.participantId,
                sessions: participant.sessions.map((session) => ({
                    sessionId: session.sessionId,
                    startedAt: STARTED_AT,
                    completedAt: COMPLETED_AT,
                    samples: session.samples.map((sample) => {
                        const condition = plan.captureConditionCatalog.find(
                            (item) => item.id === sample.captureConditionId,
                        );
                        return {
                            sampleId: sample.sampleId,
                            capturedAt: CAPTURED_AT,
                            captureConditionId: sample.captureConditionId,
                            deviceId: condition.deviceId,
                        };
                    }),
                })),
            })),
    };
}

function buildStructuralDataset({ plan, contract, indexes }) {
    const records = [];

    for (const comparison of plan.verificationComparisons) {
        if (comparison.split !== CALIBRATION_SPLIT.CALIBRATION) continue;
        const probe = indexes.sampleById.get(comparison.probeSampleId);

        records.push({
            type: CALIBRATION_RECORD_TYPE.VERIFICATION_COMPARISON,
            sessionId: probe.sessionId,
            sampleId: comparison.probeSampleId,
            comparisonId: comparison.comparisonId,
            profileId: plan.profileId,
            label: comparison.label,
            score: 0,
            captureConditionId: probe.sample.captureConditionId,
            timestamp: CAPTURED_AT,
        });
    }

    for (const search of plan.identificationSearches) {
        if (search.split !== CALIBRATION_SPLIT.CALIBRATION) continue;
        const probe = indexes.sampleById.get(search.probeSampleId);

        records.push({
            type: CALIBRATION_RECORD_TYPE.IDENTIFICATION_SEARCH,
            sessionId: probe.sessionId,
            searchId: search.searchId,
            profileId: plan.profileId,
            kind: search.kind,
            top1Score: 0.51,
            top2Score: 0.34,
            margin: 0.17,
            ...(search.kind === IDENTIFICATION_SEARCH_KIND.MATED
                ? { top1IsMate: true }
                : {}),
            candidateCount: search.galleryParticipantIds.length,
            captureConditionId: probe.sample.captureConditionId,
            timestamp: CAPTURED_AT,
        });
    }

    const calibrationConditionIds = new Set(contract.calibration.captureConditionIds);

    return {
        datasetVersion: contract.calibration.datasetVersion,
        protocolVersion: plan.protocolVersion,
        profileId: plan.profileId,
        environmentId: contract.calibration.environmentId,
        captureConditionCatalog: plan.captureConditionCatalog
            .filter((condition) => calibrationConditionIds.has(condition.id))
            .map((condition) => ({
                id: condition.id,
                lighting: condition.lighting,
                distanceBand: condition.distanceBand,
                pose: condition.pose,
                glasses: condition.glasses,
                ppe: [...condition.ppe],
                deviceId: condition.deviceId,
            })),
        createdAt: CREATED_AT,
        records,
    };
}

function downstreamContractsAreCompatible({
    controlledStudyContract,
    collectionPlan,
    plan,
    indexes,
}) {
    try {
        const validation = evaluateBiometricCalibrationExecutionValidation({
            controlledStudyContract,
            collectionPlan,
            executionManifest: buildStructuralManifest({
                plan,
                contract: controlledStudyContract,
            }),
            calibrationDataset: buildStructuralDataset({
                plan,
                contract: controlledStudyContract,
                indexes,
            }),
        });

        return validation.readyForCalibrationAnalysis === true;
    }
    catch {
        return false;
    }
}

export function evaluateBiometricRealCalibrationCollectionPreparation({
    controlledStudyContract,
    collectionPlan,
    scoringProtocol,
} = {}) {
    const blockers = [];

    let contractSummary = null;
    let plan = null;
    let normalizedScoringProtocol = null;

    try {
        contractSummary = evaluateBiometricControlledStudyContract(
            controlledStudyContract,
        );
    }
    catch { /* Intentionally ignored: best-effort cleanup. */ }

    const contractReady = Boolean(
        contractSummary?.contractValid &&
        contractSummary?.readyForControlledStudy,
    );
    if (!contractReady) addBlocker(blockers, "CONTRACT_NOT_READY");

    try {
        plan = validateBiometricCalibrationCollectionPlan(collectionPlan);
    }
    catch { /* Intentionally ignored: best-effort cleanup. */ }

    const planValid = plan !== null;
    if (!planValid) addBlocker(blockers, "PLAN_INVALID");

    try {
        normalizedScoringProtocol =
            createBiometricCalibrationScoringProtocol(scoringProtocol);
    }
    catch { /* Intentionally ignored: best-effort cleanup. */ }

    const scoringProtocolValid = normalizedScoringProtocol !== null;
    if (!scoringProtocolValid) {
        addBlocker(blockers, "SCORING_PROTOCOL_INVALID");
    }

    let protocolCompatible = false;
    let profileCompatible = false;
    let participantIdsOpaque = false;
    let enrollmentReferenceCountsValid = false;
    let enrollmentProbeSessionSeparationValid = false;
    let devicesConditionsValid = false;
    let galleryValid = false;
    let verificationTraceabilityValid = false;
    let identificationTraceabilityValid = false;
    let downstreamContractsCompatible = false;

    if (contractReady && planValid && scoringProtocolValid) {
        protocolCompatible =
            controlledStudyContract.protocolVersion.trim() === plan.protocolVersion &&
            controlledStudyContract.calibration.protocolVersion.trim() ===
                plan.protocolVersion;

        profileCompatible =
            controlledStudyContract.profileId.trim() === plan.profileId &&
            controlledStudyContract.calibration.profileId.trim() ===
                plan.profileId &&
            normalizedScoringProtocol.profileId === plan.profileId;

        const indexes = buildIndexes(plan);

        participantIdsOpaque = participantIdsAreOpaque(plan);
        enrollmentReferenceCountsValid = referenceCountsAreValid({
            plan,
            indexes,
            scoringProtocol: normalizedScoringProtocol,
        });
        enrollmentProbeSessionSeparationValid = sessionsAreRoleSeparated(plan);
        devicesConditionsValid = devicesAndConditionsAreCompatible({
            plan,
            contract: controlledStudyContract,
            indexes,
        });

        galleryValid = plan.identificationSearches
            .filter((search) => search.split === CALIBRATION_SPLIT.CALIBRATION)
            .every(
                (search) =>
                    search.galleryParticipantIds.length ===
                    plan.plannedGallerySize,
            );

        verificationTraceabilityValid = verificationIsTraceable({
            plan,
            indexes,
        });
        identificationTraceabilityValid = identificationIsTraceable({
            plan,
            indexes,
        });

        downstreamContractsCompatible = downstreamContractsAreCompatible({
            controlledStudyContract,
            collectionPlan,
            plan,
            indexes,
        });
    }

    const structuralChecks = [
        ["PROTOCOL_INCOMPATIBLE", protocolCompatible],
        ["PROFILE_INCOMPATIBLE", profileCompatible],
        ["PARTICIPANT_IDS_NOT_OPAQUE", participantIdsOpaque],
        ["REFERENCE_ENROLLMENT_COUNT_INVALID", enrollmentReferenceCountsValid],
        [
            "ENROLLMENT_PROBE_SESSION_SEPARATION_INVALID",
            enrollmentProbeSessionSeparationValid,
        ],
        ["DEVICES_CONDITIONS_INCOMPATIBLE", devicesConditionsValid],
        ["GALLERY_INVALID", galleryValid],
        ["VERIFICATION_TRACEABILITY_INVALID", verificationTraceabilityValid],
        ["IDENTIFICATION_TRACEABILITY_INVALID", identificationTraceabilityValid],
        ["DOWNSTREAM_CONTRACTS_INCOMPATIBLE", downstreamContractsCompatible],
    ];

    for (const [code, valid] of structuralChecks) {
        if (!valid) addBlocker(blockers, code);
    }

    const offlineReadinessValid = blockers.length === 0;

    addBlocker(blockers, REAL_CALIBRATION_AUTHORIZATION_BLOCKER.CAMERA);
    addBlocker(blockers, REAL_CALIBRATION_AUTHORIZATION_BLOCKER.RTSP);
    addBlocker(blockers, REAL_CALIBRATION_AUTHORIZATION_BLOCKER.PARTICIPANTS);

    return Object.freeze({
        contractReady,
        planValid,
        scoringProtocolValid,
        protocolCompatible,
        profileCompatible,
        participantIdsOpaque,
        enrollmentReferenceCountsValid,
        enrollmentProbeSessionSeparationValid,
        devicesConditionsValid,
        galleryValid,
        verificationTraceabilityValid,
        identificationTraceabilityValid,
        downstreamContractsCompatible,
        freshFrameProtocolDefined: true,
        offlineReadinessValid,
        realCollectionReady: false,
        warnings: Object.freeze([]),
        blockers: Object.freeze(blockers),
    });
}

function requireNonEmptyString(value, name) {
    if (typeof value !== "string" || value.trim() === "") {
        throw new TypeError(`${name} deve ser string nao vazia.`);
    }
    return value.trim();
}

function requireSource(source) {
    if (
        !source ||
        typeof source !== "object" ||
        typeof source.snapshot !== "function" ||
        typeof source.takeLatestFrame !== "function"
    ) {
        throw new TypeError(
            "capture source deve expor snapshot e takeLatestFrame.",
        );
    }
    return source;
}

function normalizeSourceSnapshot(value) {
    if (
        !value ||
        typeof value !== "object" ||
        !Number.isSafeInteger(value.lastFrame) ||
        value.lastFrame < 0 ||
        !value.frames ||
        typeof value.frames !== "object" ||
        value.frames.format !== REAL_CALIBRATION_FRESH_FRAME_PROTOCOL.frameFormat ||
        !Number.isSafeInteger(value.frames.width) ||
        value.frames.width < 1 ||
        !Number.isSafeInteger(value.frames.height) ||
        value.frames.height < 1 ||
        !value.frames.queue ||
        typeof value.frames.queue !== "object" ||
        value.frames.queue.capacity !==
            REAL_CALIBRATION_FRESH_FRAME_PROTOCOL.queueCapacity ||
        typeof value.frames.queue.pending !== "boolean" ||
        !Number.isSafeInteger(value.frames.queue.pendingBytes) ||
        value.frames.queue.pendingBytes < 0
    ) {
        throw new TypeError(
            "capture source snapshot incompativel com fresh-frame protocol.",
        );
    }
    return value;
}

function sourceIsRunning(snapshot) {
    return (
        snapshot.state === "RUNNING" &&
        snapshot.running === true &&
        snapshot.firstFrameSeen === true
    );
}

function admissionSnapshot(armed) {
    if (!armed) {
        return Object.freeze({
            armed: false,
            deviceId: null,
            baselineLastFrame: null,
            drainedPendingFrame: false,
        });
    }

    return Object.freeze({
        armed: true,
        deviceId: armed.deviceId,
        baselineLastFrame: armed.baselineLastFrame,
        drainedPendingFrame: armed.drainedPendingFrame,
    });
}

export function createBiometricCalibrationFreshFrameAdmissionController({
    resolveCaptureSource,
} = {}) {
    if (typeof resolveCaptureSource !== "function") {
        throw new TypeError("resolveCaptureSource deve ser funcao.");
    }

    let armed = null;

    async function arm(deviceId) {
        if (armed) throw new Error("fresh-frame admission ja esta armado.");

        const normalizedDeviceId = requireNonEmptyString(deviceId, "deviceId");
        const source = requireSource(
            await resolveCaptureSource(normalizedDeviceId),
        );
        const before = normalizeSourceSnapshot(source.snapshot());

        if (!sourceIsRunning(before)) {
            throw new Error("capture source deve estar RUNNING antes do arm.");
        }

        const staleFrame = source.takeLatestFrame();
        let drainedPendingFrame = false;

        if (
            before.frames.queue.pending === true &&
            staleFrame === null
        ) {
            throw new Error(
                "exclusive consumer violado durante drenagem fresh-frame.",
            );
        }

        if (staleFrame !== null) {
            if (!(staleFrame instanceof Uint8Array)) {
                throw new TypeError("frame drenado deve ser Uint8Array.");
            }
            staleFrame.fill(0);
            drainedPendingFrame = true;
        }

        const afterDrain = normalizeSourceSnapshot(source.snapshot());

        if (!sourceIsRunning(afterDrain)) {
            throw new Error(
                "capture source deixou estado RUNNING durante arm.",
            );
        }

        if (
            afterDrain.frames.format !== before.frames.format ||
            afterDrain.frames.width !== before.frames.width ||
            afterDrain.frames.height !== before.frames.height
        ) {
            throw new Error(
                "capture source mudou contrato de frame durante arm.",
            );
        }

        if (afterDrain.frames.queue.pending) {
            throw new Error(
                "fresh-frame arm deve terminar com fila drenada.",
            );
        }

        armed = {
            deviceId: normalizedDeviceId,
            source,
            baselineLastFrame: afterDrain.lastFrame,
            frameFormat: afterDrain.frames.format,
            frameWidth: afterDrain.frames.width,
            frameHeight: afterDrain.frames.height,
            drainedPendingFrame,
        };

        return admissionSnapshot(armed);
    }

    function checkCaptureAdmission() {
        if (!armed) {
            return Object.freeze({
                armed: false,
                readyForCapture: false,
                reason: "NOT_ARMED",
                baselineLastFrame: null,
                observedLastFrame: null,
            });
        }

        const current = normalizeSourceSnapshot(armed.source.snapshot());

        if (!sourceIsRunning(current)) {
            return Object.freeze({
                armed: true,
                readyForCapture: false,
                reason: "SOURCE_NOT_RUNNING",
                baselineLastFrame: armed.baselineLastFrame,
                observedLastFrame: current.lastFrame,
            });
        }

        if (
            current.frames.format !== armed.frameFormat ||
            current.frames.width !== armed.frameWidth ||
            current.frames.height !== armed.frameHeight
        ) {
            return Object.freeze({
                armed: true,
                readyForCapture: false,
                reason: "SOURCE_CONTRACT_CHANGED",
                baselineLastFrame: armed.baselineLastFrame,
                observedLastFrame: current.lastFrame,
            });
        }

        if (current.lastFrame <= armed.baselineLastFrame) {
            return Object.freeze({
                armed: true,
                readyForCapture: false,
                reason: "FRAME_NOT_ADVANCED",
                baselineLastFrame: armed.baselineLastFrame,
                observedLastFrame: current.lastFrame,
            });
        }

        if (!current.frames.queue.pending) {
            return Object.freeze({
                armed: true,
                readyForCapture: false,
                reason: "FRESH_FRAME_NOT_AVAILABLE",
                baselineLastFrame: armed.baselineLastFrame,
                observedLastFrame: current.lastFrame,
            });
        }

        const expectedBytes = armed.frameWidth * armed.frameHeight * 3;

        if (current.frames.queue.pendingBytes !== expectedBytes) {
            return Object.freeze({
                armed: true,
                readyForCapture: false,
                reason: "FRESH_FRAME_SIZE_INVALID",
                baselineLastFrame: armed.baselineLastFrame,
                observedLastFrame: current.lastFrame,
            });
        }

        return Object.freeze({
            armed: true,
            readyForCapture: true,
            reason: "FRESH_FRAME_READY",
            baselineLastFrame: armed.baselineLastFrame,
            observedLastFrame: current.lastFrame,
        });
    }

    function reset() {
        if (!armed) return false;
        armed = null;
        return true;
    }

    function snapshot() {
        return admissionSnapshot(armed);
    }

    return Object.freeze({
        arm,
        checkCaptureAdmission,
        reset,
        snapshot,
    });
}
