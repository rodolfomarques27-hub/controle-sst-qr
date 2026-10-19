import { createBiometricCaptureRejectionCounter } from "./biometricCaptureRejectionCounter.mjs";
import {
    SFACE_CANONICAL_LANDMARKS_112,
    SFACE_INPUT_HEIGHT,
    SFACE_INPUT_WIDTH,
} from "../recognition/sfaceEmbedding.mjs";

import {
    validateEmbedding128,
} from "./biometricReferenceLifecycle.mjs";

import {
    CALIBRATION_SPLIT,
    IDENTIFICATION_SEARCH_KIND,
    SAMPLE_ROLE,
    VERIFICATION_LABEL,
    validateBiometricCalibrationCollectionPlan,
} from "./biometricCalibrationCollectionProtocol.mjs";

import {
    evaluateBiometricControlledStudyContract,
} from "./biometricControlledStudyContract.mjs";

import {
    createBiometricCalibrationScoringProtocol,
    scoreBiometricCalibrationIdentification,
    scoreBiometricCalibrationVerification,
} from "./biometricCalibrationScoringProtocol.mjs";

import {
    evaluateBiometricCalibrationExecutionManifest,
} from "./biometricCalibrationExecutionManifest.mjs";

import {
    CALIBRATION_RECORD_TYPE,
    validateBiometricCalibrationDataset,
} from "./biometricCalibrationDataContract.mjs";

import {
    evaluateBiometricCalibrationExecutionValidation,
} from "./biometricCalibrationExecutionValidator.mjs";

export const CALIBRATION_COLLECTION_RUNNER_STATE =
    Object.freeze({
        READY:
            "READY",

        COLLECTING:
            "COLLECTING",

        COLLECTION_COMPLETE:
            "COLLECTION_COMPLETE",

        FINALIZED:
            "FINALIZED",

        ABORTED:
            "ABORTED",

        FAILED:
            "FAILED",
    });

export const CALIBRATION_CAPTURE_STATUS =
    Object.freeze({
        CAPTURED:
            "CAPTURED",

        FRAME_UNAVAILABLE:
            "FRAME_UNAVAILABLE",

        INVALID_FRAME:
            "INVALID_FRAME",

        NO_FACE:
            "NO_FACE",

        MULTIPLE_FACES:
            "MULTIPLE_FACES",

        DETECTION_FAILED:
            "DETECTION_FAILED",

        ALIGNMENT_FAILED:
            "ALIGNMENT_FAILED",

        EMBEDDING_FAILED:
            "EMBEDDING_FAILED",
    });

const ISO_UTC_PATTERN =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

const EMBEDDING_L2_TOLERANCE =
    1e-5;

class CalibrationRunnerError extends Error {
    constructor(
        code,
    ) {
        super(
            code,
        );

        this.name =
            "CalibrationRunnerError";

        this.code =
            code;
    }
}

function fail(
    code,
) {
    throw new CalibrationRunnerError(
        code,
    );
}

function requireFunction(
    value,
    name,
) {
    if (typeof value !== "function") {
        throw new TypeError(
            `${name} deve ser funcao.`,
        );
    }

    return value;
}

function requireObject(
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

function requireAlignmentPolicy(
    value,
) {
    const source =
        requireObject(
            value,
            "alignmentPolicy",
        );

    const result =
        {};

    for (
        const key of
        [
            "paddingRatio",
            "minFaceSizePx",
            "minVisibleAreaRatio",
            "maxRmsError",
        ]
    ) {
        const current =
            source[key];

        if (
            typeof current !==
                "number" ||
            !Number.isFinite(
                current,
            )
        ) {
            throw new TypeError(
                `alignmentPolicy.${key} deve ser numero finito.`,
            );
        }

        result[key] =
            current;
    }

    return Object.freeze(
        result,
    );
}

function requireIsoUtc(
    value,
    name,
) {
    if (
        typeof value !==
            "string" ||
        !ISO_UTC_PATTERN.test(
            value,
        ) ||
        !Number.isFinite(
            Date.parse(
                value,
            ),
        )
    ) {
        throw new TypeError(
            `${name} deve ser timestamp ISO UTC.`,
        );
    }

    return value;
}

function normalizeId(
    value,
) {
    return value.trim();
}

function setOf(
    values,
) {
    return new Set(
        values.map(
            normalizeId,
        ),
    );
}

function setsEqual(
    left,
    right,
) {
    if (
        left.size !==
        right.size
    ) {
        return false;
    }

    for (
        const value of
        left
    ) {
        if (
            !right.has(
                value,
            )
        ) {
            return false;
        }
    }

    return true;
}

function freezeCaptureResult(
    accepted,
    status,
) {
    return Object.freeze({
        accepted,
        status,
    });
}

function buildCalibrationPlanModel({
    plan,
    controlledStudyContract,
    scoringProtocol,
}) {
    const calibrationPhase =
        controlledStudyContract.calibration;

    const calibrationParticipantIds =
        new Set(
            plan.calibrationParticipantIds,
        );

    const evaluationParticipantIds =
        new Set(
            plan.evaluationParticipantIds,
        );

    const conditionById =
        new Map(
            plan.captureConditionCatalog.map(
                (
                    condition,
                ) => [
                    condition.id,
                    condition,
                ],
            ),
        );

    const participantById =
        new Map();

    const sessionById =
        new Map();

    const sampleById =
        new Map();

    const evaluationSessionIds =
        new Set();

    const evaluationSampleIds =
        new Set();

    const calibrationSessionIds =
        new Set();

    const calibrationSampleIds =
        new Set();

    const calibrationConditionIds =
        new Set();

    const calibrationDeviceIds =
        new Set();

    const calibrationEnvironmentIds =
        new Set();

    for (
        const participant of
        plan.participants
    ) {
        const isCalibration =
            calibrationParticipantIds.has(
                participant.participantId,
            );

        const isEvaluation =
            evaluationParticipantIds.has(
                participant.participantId,
            );

        if (
            !isCalibration &&
            !isEvaluation
        ) {
            fail(
                "PREFLIGHT_PARTICIPANT_SPLIT_INVALID",
            );
        }

        participantById.set(
            participant.participantId,
            participant,
        );

        for (
            const session of
            participant.sessions
        ) {
            const sessionModel =
                {
                    participantId:
                        participant.participantId,

                    sessionId:
                        session.sessionId,

                    split:
                        isCalibration
                            ? CALIBRATION_SPLIT.CALIBRATION
                            : CALIBRATION_SPLIT.EVALUATION,

                    sampleIds:
                        [],
                };

            sessionById.set(
                session.sessionId,
                sessionModel,
            );

            if (isCalibration) {
                calibrationSessionIds.add(
                    session.sessionId,
                );
            }
            else {
                evaluationSessionIds.add(
                    session.sessionId,
                );
            }

            for (
                const sample of
                session.samples
            ) {
                const condition =
                    conditionById.get(
                        sample.captureConditionId,
                    );

                if (!condition) {
                    fail(
                        "PREFLIGHT_CAPTURE_CONDITION_MISSING",
                    );
                }

                const sampleModel =
                    {
                        participantId:
                            participant.participantId,

                        sessionId:
                            session.sessionId,

                        sampleId:
                            sample.sampleId,

                        profileId:
                            sample.profileId,

                        role:
                            sample.role,

                        captureConditionId:
                            sample.captureConditionId,

                        deviceId:
                            condition.deviceId,

                        environmentId:
                            condition.environmentId,

                        split:
                            sessionModel.split,
                    };

                sessionModel.sampleIds.push(
                    sample.sampleId,
                );

                sampleById.set(
                    sample.sampleId,
                    sampleModel,
                );

                if (isCalibration) {
                    calibrationSampleIds.add(
                        sample.sampleId,
                    );

                    calibrationConditionIds.add(
                        sample.captureConditionId,
                    );

                    calibrationDeviceIds.add(
                        condition.deviceId,
                    );

                    calibrationEnvironmentIds.add(
                        condition.environmentId,
                    );
                }
                else {
                    evaluationSampleIds.add(
                        sample.sampleId,
                    );
                }
            }
        }
    }

    const expectedParticipants =
        setOf(
            calibrationPhase.participantIds,
        );

    if (
        !setsEqual(
            expectedParticipants,
            calibrationParticipantIds,
        )
    ) {
        fail(
            "PREFLIGHT_PARTICIPANTS_INCOMPATIBLE",
        );
    }

    if (
        !setsEqual(
            setOf(
                calibrationPhase.sessionIds,
            ),
            calibrationSessionIds,
        )
    ) {
        fail(
            "PREFLIGHT_SESSIONS_INCOMPATIBLE",
        );
    }

    if (
        !setsEqual(
            setOf(
                calibrationPhase.captureConditionIds,
            ),
            calibrationConditionIds,
        )
    ) {
        fail(
            "PREFLIGHT_CONDITIONS_INCOMPATIBLE",
        );
    }

    if (
        !setsEqual(
            setOf(
                calibrationPhase.deviceIds,
            ),
            calibrationDeviceIds,
        )
    ) {
        fail(
            "PREFLIGHT_DEVICES_INCOMPATIBLE",
        );
    }

    if (
        calibrationEnvironmentIds.size !==
            1 ||
        !calibrationEnvironmentIds.has(
            calibrationPhase.environmentId,
        )
    ) {
        fail(
            "PREFLIGHT_ENVIRONMENT_INCOMPATIBLE",
        );
    }

    const verificationComparisons =
        plan.verificationComparisons.filter(
            (
                item,
            ) =>
                item.split ===
                CALIBRATION_SPLIT.CALIBRATION,
        );

    const identificationSearches =
        plan.identificationSearches.filter(
            (
                item,
            ) =>
                item.split ===
                CALIBRATION_SPLIT.CALIBRATION,
        );

    const counts =
        {
            genuineComparisons:
                verificationComparisons.filter(
                    (
                        item,
                    ) =>
                        item.label ===
                        VERIFICATION_LABEL.GENUINE,
                ).length,

            impostorComparisons:
                verificationComparisons.filter(
                    (
                        item,
                    ) =>
                        item.label ===
                        VERIFICATION_LABEL.IMPOSTOR,
                ).length,

            matedSearches:
                identificationSearches.filter(
                    (
                        item,
                    ) =>
                        item.kind ===
                        IDENTIFICATION_SEARCH_KIND.MATED,
                ).length,

            nonMatedSearches:
                identificationSearches.filter(
                    (
                        item,
                    ) =>
                        item.kind ===
                        IDENTIFICATION_SEARCH_KIND.NON_MATED,
                ).length,
        };

    for (
        const key of
        Object.keys(
            counts,
        )
    ) {
        if (
            counts[key] !==
            calibrationPhase.plannedCounts[key]
        ) {
            fail(
                "PREFLIGHT_PLANNED_COUNTS_INCOMPATIBLE",
            );
        }
    }

    const referenceParticipantIds =
        new Set();

    for (
        const comparison of
        verificationComparisons
    ) {
        const enrollment =
            sampleById.get(
                comparison.enrollmentSampleId,
            );

        if (
            !enrollment ||
            enrollment.split !==
                CALIBRATION_SPLIT.CALIBRATION ||
            enrollment.role !==
                SAMPLE_ROLE.ENROLLMENT
        ) {
            fail(
                "PREFLIGHT_VERIFICATION_REFERENCE_INVALID",
            );
        }

        referenceParticipantIds.add(
            enrollment.participantId,
        );
    }

    for (
        const search of
        identificationSearches
    ) {
        for (
            const participantId of
            search.galleryParticipantIds
        ) {
            if (
                !calibrationParticipantIds.has(
                    participantId,
                )
            ) {
                fail(
                    "PREFLIGHT_GALLERY_PARTICIPANT_INVALID",
                );
            }

            referenceParticipantIds.add(
                participantId,
            );
        }
    }

    for (
        const participantId of
        referenceParticipantIds
    ) {
        let enrollmentCount =
            0;

        for (
            const sample of
            sampleById.values()
        ) {
            if (
                sample.split ===
                    CALIBRATION_SPLIT.CALIBRATION &&
                sample.participantId ===
                    participantId &&
                sample.role ===
                    SAMPLE_ROLE.ENROLLMENT
            ) {
                enrollmentCount +=
                    1;
            }
        }

        if (
            enrollmentCount <
                scoringProtocol
                    .minimumEnrollmentReferencesPerParticipant ||
            enrollmentCount >
                scoringProtocol
                    .maximumEnrollmentReferencesPerParticipant
        ) {
            fail(
                "PREFLIGHT_ENROLLMENT_REFERENCE_COUNT_INVALID",
            );
        }
    }

    return Object.freeze({
        calibrationParticipantIds,
        calibrationSessionIds,
        calibrationSampleIds,
        calibrationConditionIds,
        calibrationDeviceIds,
        participantById,
        sessionById,
        sampleById,
        conditionById,

        evaluationSessionIds,
        evaluationSampleIds,

        verificationComparisons:
            Object.freeze(
                verificationComparisons,
            ),

        identificationSearches:
            Object.freeze(
                identificationSearches,
            ),
    });
}

function requireSource(
    source,
) {
    const normalized =
        requireObject(
            source,
            "captureSource",
        );

    requireFunction(
        normalized.takeLatestFrame,
        "captureSource.takeLatestFrame",
    );

    requireFunction(
        normalized.snapshot,
        "captureSource.snapshot",
    );

    return normalized;
}

function readSourceDimensions(
    source,
) {
    const snapshot =
        source.snapshot();

    const frames =
        snapshot?.frames;

    if (
        !frames ||
        frames.format !==
            "bgr24" ||
        !Number.isSafeInteger(
            frames.width,
        ) ||
        frames.width <=
            0 ||
        !Number.isSafeInteger(
            frames.height,
        ) ||
        frames.height <=
            0
    ) {
        fail(
            "CAPTURE_SOURCE_INVALID",
        );
    }

    return Object.freeze({
        width:
            frames.width,

        height:
            frames.height,
    });
}

function validateFrame({
    frame,
    width,
    height,
}) {
    if (
        !(
            frame instanceof
            Uint8Array
        )
    ) {
        return false;
    }

    const expectedBytes =
        width *
        height *
        3;

    return (
        Number.isSafeInteger(
            expectedBytes,
        ) &&
        frame.byteLength ===
            expectedBytes
    );
}

function zeroBytes(
    value,
) {
    if (
        value instanceof
        Uint8Array
    ) {
        value.fill(
            0,
        );
    }
}

function zeroEmbedding(
    value,
) {
    if (
        value instanceof
        Float32Array
    ) {
        value.fill(
            0,
        );
    }
}

function freezeArtifact(
    value,
) {
    if (
        value === null ||
        typeof value !==
            "object"
    ) {
        return value;
    }

    if (
        ArrayBuffer.isView(
            value,
        )
    ) {
        return value;
    }

    for (
        const child of
        Object.values(
            value,
        )
    ) {
        freezeArtifact(
            child,
        );
    }

    return Object.freeze(
        value,
    );
}

export function createBiometricCalibrationCollectionRunner({
    controlledStudyContract,
    collectionPlan,
    scoringProtocol,
    resolveCaptureSource,
    detector,
    alignFace,
    embeddingExtractor,
    alignmentPolicy,
    now =
        () =>
            new Date()
                .toISOString(),
} = {}) {
    const contractSummary =
        evaluateBiometricControlledStudyContract(
            controlledStudyContract,
        );

    if (
        !contractSummary.contractValid
    ) {
        fail(
            "CONTRACT_INVALID",
        );
    }

    if (
        !contractSummary.readyForControlledStudy
    ) {
        fail(
            "CONTRACT_NOT_READY",
        );
    }

    const plan =
        validateBiometricCalibrationCollectionPlan(
            collectionPlan,
        );

    const normalizedScoringProtocol =
        createBiometricCalibrationScoringProtocol(
            scoringProtocol,
        );

    if (
        controlledStudyContract.protocolVersion.trim() !==
            plan.protocolVersion ||
        controlledStudyContract.calibration.protocolVersion.trim() !==
            plan.protocolVersion
    ) {
        fail(
            "PREFLIGHT_PROTOCOL_INCOMPATIBLE",
        );
    }

    if (
        controlledStudyContract.profileId.trim() !==
            plan.profileId ||
        controlledStudyContract.calibration.profileId.trim() !==
            plan.profileId ||
        normalizedScoringProtocol.profileId !==
            plan.profileId
    ) {
        fail(
            "PREFLIGHT_PROFILE_INCOMPATIBLE",
        );
    }

    const resolveSource =
        requireFunction(
            resolveCaptureSource,
            "resolveCaptureSource",
        );

    const detectBgr =
        requireFunction(
            detector?.detectBgr,
            "detector.detectBgr",
        );

    const alignFaceImpl =
        requireFunction(
            alignFace,
            "alignFace",
        );

    const extractBgr112 =
        requireFunction(
            embeddingExtractor?.extractBgr112,
            "embeddingExtractor.extractBgr112",
        );

    const clock =
        requireFunction(
            now,
            "now",
        );

    const policy =
        requireAlignmentPolicy(
            alignmentPolicy,
        );

    const model =
        buildCalibrationPlanModel({
            plan,
            controlledStudyContract,
            scoringProtocol:
                normalizedScoringProtocol,
        });

    let state =
        CALIBRATION_COLLECTION_RUNNER_STATE.READY;

    let activeSessionId =
        null;

    const sessionExecution =
        new Map();

    const acceptedCaptures =
        new Map();
    const rejectionCounter = createBiometricCaptureRejectionCounter(
        Object.values(CALIBRATION_CAPTURE_STATUS),
    );

    function trackedCaptureResult(accepted, status) {
        rejectionCounter.observe(accepted, status);
        return freezeCaptureResult(accepted, status);
    }


    function assertMutable() {
        if (
            state ===
                CALIBRATION_COLLECTION_RUNNER_STATE.FINALIZED ||
            state ===
                CALIBRATION_COLLECTION_RUNNER_STATE.ABORTED ||
            state ===
                CALIBRATION_COLLECTION_RUNNER_STATE.FAILED
        ) {
            fail(
                "RUNNER_NOT_MUTABLE",
            );
        }
    }

    function timestamp(
        name,
    ) {
        return requireIsoUtc(
            clock(),
            name,
        );
    }

    function snapshot() {
        let completedSessions =
            0;

        for (
            const execution of
            sessionExecution.values()
        ) {
            if (
                execution.completedAt !==
                null
            ) {
                completedSessions +=
                    1;
            }
        }

        return Object.freeze({
            state,

            preflightReady:
                true,

            activeSession:
                activeSessionId !==
                null,

            totalSessions:
                model.calibrationSessionIds.size,

            completedSessions,

            totalSamples:
                model.calibrationSampleIds.size,

            capturedSamples:
                acceptedCaptures.size,

            remainingSamples:
                model.calibrationSampleIds.size -
                acceptedCaptures.size,
        });
    }

    function startSession(
        sessionId,
    ) {
        assertMutable();

        if (
            model.evaluationSessionIds.has(
                sessionId,
            )
        ) {
            fail(
                "EVALUATION_SESSION_REJECTED",
            );
        }

        const session =
            model.sessionById.get(
                sessionId,
            );

        if (
            !session ||
            session.split !==
                CALIBRATION_SPLIT.CALIBRATION
        ) {
            fail(
                "CALIBRATION_SESSION_UNKNOWN",
            );
        }

        if (
            activeSessionId !==
            null
        ) {
            fail(
                "SESSION_ALREADY_ACTIVE",
            );
        }

        if (
            sessionExecution.has(
                sessionId,
            )
        ) {
            fail(
                "SESSION_ALREADY_STARTED",
            );
        }

        const startedAt =
            timestamp(
                "startedAt",
            );

        sessionExecution.set(
            sessionId,
            {
                startedAt,
                completedAt:
                    null,
            },
        );

        activeSessionId =
            sessionId;

        state =
            CALIBRATION_COLLECTION_RUNNER_STATE.COLLECTING;

        return snapshot();
    }

    async function captureSample(
        sampleId,
    ) {
        assertMutable();

        if (
            activeSessionId ===
            null
        ) {
            fail(
                "NO_ACTIVE_SESSION",
            );
        }

        if (
            model.evaluationSampleIds.has(
                sampleId,
            )
        ) {
            fail(
                "EVALUATION_SAMPLE_REJECTED",
            );
        }

        const sample =
            model.sampleById.get(
                sampleId,
            );

        if (
            !sample ||
            sample.split !==
                CALIBRATION_SPLIT.CALIBRATION
        ) {
            fail(
                "CALIBRATION_SAMPLE_UNKNOWN",
            );
        }

        if (
            sample.sessionId !==
            activeSessionId
        ) {
            fail(
                "SAMPLE_NOT_IN_ACTIVE_SESSION",
            );
        }

        if (
            acceptedCaptures.has(
                sampleId,
            )
        ) {
            fail(
                "SAMPLE_ALREADY_CAPTURED",
            );
        }

        const source =
            requireSource(
                await resolveSource(
                    sample.deviceId,
                ),
            );

        const dimensions =
            readSourceDimensions(
                source,
            );

        const frame =
            await source
                .takeLatestFrame();

        if (frame === null) {
            return trackedCaptureResult(
                false,
                CALIBRATION_CAPTURE_STATUS.FRAME_UNAVAILABLE,
            );
        }

        if (
            !validateFrame({
                frame,
                width:
                    dimensions.width,
                height:
                    dimensions.height,
            })
        ) {
            zeroBytes(
                frame,
            );

            return trackedCaptureResult(
                false,
                CALIBRATION_CAPTURE_STATUS.INVALID_FRAME,
            );
        }

        const capturedAt =
            timestamp(
                "capturedAt",
            );

        let aligned =
            null;

        let observedEmbedding =
            null;

        try {
            let detections;

            try {
                detections =
                    await detectBgr({
                        data:
                            frame,
                        width:
                            dimensions.width,
                        height:
                            dimensions.height,
                    });
            }
            catch {
                return trackedCaptureResult(
                    false,
                    CALIBRATION_CAPTURE_STATUS.DETECTION_FAILED,
                );
            }

            if (
                !Array.isArray(
                    detections,
                )
            ) {
                return trackedCaptureResult(
                    false,
                    CALIBRATION_CAPTURE_STATUS.DETECTION_FAILED,
                );
            }

            if (
                detections.length ===
                0
            ) {
                return trackedCaptureResult(
                    false,
                    CALIBRATION_CAPTURE_STATUS.NO_FACE,
                );
            }

            if (
                detections.length !==
                1
            ) {
                return trackedCaptureResult(
                    false,
                    CALIBRATION_CAPTURE_STATUS.MULTIPLE_FACES,
                );
            }

            try {
                aligned =
                    await alignFaceImpl({
                        data:
                            frame,
                        width:
                            dimensions.width,
                        height:
                            dimensions.height,

                        detection:
                            detections[0],

                        targetWidth:
                            SFACE_INPUT_WIDTH,

                        targetHeight:
                            SFACE_INPUT_HEIGHT,

                        templateLandmarks:
                            SFACE_CANONICAL_LANDMARKS_112,

                        paddingRatio:
                            policy.paddingRatio,

                        minFaceSizePx:
                            policy.minFaceSizePx,

                        minVisibleAreaRatio:
                            policy.minVisibleAreaRatio,

                        maxRmsError:
                            policy.maxRmsError,
                    });
            }
            catch {
                return trackedCaptureResult(
                    false,
                    CALIBRATION_CAPTURE_STATUS.ALIGNMENT_FAILED,
                );
            }

            if (
                !(
                    aligned?.data instanceof
                    Uint8Array
                ) ||
                aligned.width !==
                    SFACE_INPUT_WIDTH ||
                aligned.height !==
                    SFACE_INPUT_HEIGHT ||
                aligned.data.byteLength !==
                    SFACE_INPUT_WIDTH *
                    SFACE_INPUT_HEIGHT *
                    3
            ) {
                return trackedCaptureResult(
                    false,
                    CALIBRATION_CAPTURE_STATUS.ALIGNMENT_FAILED,
                );
            }

            try {
                observedEmbedding =
                    await extractBgr112({
                        data:
                            aligned.data,
                        width:
                            aligned.width,
                        height:
                            aligned.height,
                    });

                const validation =
                    validateEmbedding128(
                        observedEmbedding,
                        {
                            l2Tolerance:
                                EMBEDDING_L2_TOLERANCE,
                        },
                    );

                if (
                    !validation.valid
                ) {
                    return trackedCaptureResult(
                        false,
                        CALIBRATION_CAPTURE_STATUS.EMBEDDING_FAILED,
                    );
                }

                acceptedCaptures.set(
                    sampleId,
                    {
                        capturedAt,

                        embedding:
                            Float32Array.from(
                                observedEmbedding,
                            ),
                    },
                );
            }
            catch {
                return trackedCaptureResult(
                    false,
                    CALIBRATION_CAPTURE_STATUS.EMBEDDING_FAILED,
                );
            }

            return trackedCaptureResult(
                true,
                CALIBRATION_CAPTURE_STATUS.CAPTURED,
            );
        }
        finally {
            zeroEmbedding(
                observedEmbedding,
            );

            zeroBytes(
                aligned?.data,
            );

            zeroBytes(
                frame,
            );
        }
    }

    function completeSession() {
        assertMutable();

        if (
            activeSessionId ===
            null
        ) {
            fail(
                "NO_ACTIVE_SESSION",
            );
        }

        const session =
            model.sessionById.get(
                activeSessionId,
            );

        for (
            const sampleId of
            session.sampleIds
        ) {
            if (
                !acceptedCaptures.has(
                    sampleId,
                )
            ) {
                fail(
                    "SESSION_SAMPLES_INCOMPLETE",
                );
            }
        }

        const execution =
            sessionExecution.get(
                activeSessionId,
            );

        const completedAt =
            timestamp(
                "completedAt",
            );

        const completedAtMs =
            Date.parse(
                completedAt,
            );

        if (
            completedAtMs <
            Date.parse(
                execution.startedAt,
            )
        ) {
            fail(
                "CLOCK_ORDER_INVALID",
            );
        }

        for (
            const sampleId of
            session.sampleIds
        ) {
            if (
                completedAtMs <
                Date.parse(
                    acceptedCaptures
                        .get(
                            sampleId,
                        )
                        .capturedAt,
                )
            ) {
                fail(
                    "CLOCK_ORDER_INVALID",
                );
            }
        }

        execution.completedAt =
            completedAt;

        activeSessionId =
            null;

        const allCompleted =
            Array.from(
                model.calibrationSessionIds,
            ).every(
                (
                    sessionId,
                ) =>
                    sessionExecution
                        .get(
                            sessionId,
                        )
                        ?.completedAt !==
                    null &&
                    sessionExecution
                        .get(
                            sessionId,
                        )
                        ?.completedAt !==
                    undefined,
            );

        state =
            allCompleted
                ? CALIBRATION_COLLECTION_RUNNER_STATE
                    .COLLECTION_COMPLETE
                : CALIBRATION_COLLECTION_RUNNER_STATE
                    .COLLECTING;

        return snapshot();
    }

    function scoringSamples() {
        return Array.from(
            model.calibrationSampleIds,
        ).map(
            (
                sampleId,
            ) => {
                const sample =
                    model.sampleById.get(
                        sampleId,
                    );

                const captured =
                    acceptedCaptures.get(
                        sampleId,
                    );

                if (
                    !captured?.embedding
                ) {
                    fail(
                        "FINALIZE_SAMPLE_MISSING",
                    );
                }

                return {
                    sampleId:
                        sample.sampleId,

                    participantId:
                        sample.participantId,

                    profileId:
                        sample.profileId,

                    role:
                        sample.role,

                    embedding:
                        captured.embedding,
                };
            },
        );
    }

    function buildExecutionManifest() {
        const participants =
            [];

        for (
            const participantId of
            plan.calibrationParticipantIds
        ) {
            const participant =
                model.participantById.get(
                    participantId,
                );

            const sessions =
                participant.sessions.map(
                    (
                        session,
                    ) => {
                        const execution =
                            sessionExecution.get(
                                session.sessionId,
                            );

                        return {
                            sessionId:
                                session.sessionId,

                            startedAt:
                                execution.startedAt,

                            completedAt:
                                execution.completedAt,

                            samples:
                                session.samples.map(
                                    (
                                        sample,
                                    ) => {
                                        const sampleModel =
                                            model.sampleById.get(
                                                sample.sampleId,
                                            );

                                        const capture =
                                            acceptedCaptures.get(
                                                sample.sampleId,
                                            );

                                        return {
                                            sampleId:
                                                sample.sampleId,

                                            capturedAt:
                                                capture.capturedAt,

                                            captureConditionId:
                                                sampleModel.captureConditionId,

                                            deviceId:
                                                sampleModel.deviceId,
                                        };
                                    },
                                ),
                        };
                    },
                );

            participants.push({
                participantId,
                sessions,
            });
        }

        return freezeArtifact({
            protocolVersion:
                plan.protocolVersion,

            profileId:
                plan.profileId,

            datasetVersion:
                controlledStudyContract
                    .calibration
                    .datasetVersion,

            phase:
                "CALIBRATION",

            environmentId:
                controlledStudyContract
                    .calibration
                    .environmentId,

            participants,
        });
    }

    function buildCalibrationDataset() {
        const samples =
            scoringSamples();

        const records =
            [];

        for (
            const comparison of
            model.verificationComparisons
        ) {
            const result =
                scoreBiometricCalibrationVerification({
                    protocol:
                        normalizedScoringProtocol,

                    samples,

                    enrollmentSampleId:
                        comparison.enrollmentSampleId,

                    probeSampleId:
                        comparison.probeSampleId,
                });

            const probe =
                model.sampleById.get(
                    comparison.probeSampleId,
                );

            records.push({
                type:
                    CALIBRATION_RECORD_TYPE
                        .VERIFICATION_COMPARISON,

                sessionId:
                    probe.sessionId,

                sampleId:
                    comparison.probeSampleId,

                comparisonId:
                    comparison.comparisonId,

                profileId:
                    plan.profileId,

                label:
                    comparison.label,

                score:
                    result.score,

                captureConditionId:
                    probe.captureConditionId,

                timestamp:
                    acceptedCaptures
                        .get(
                            comparison.probeSampleId,
                        )
                        .capturedAt,
            });
        }

        for (
            const search of
            model.identificationSearches
        ) {
            const result =
                scoreBiometricCalibrationIdentification({
                    protocol:
                        normalizedScoringProtocol,

                    samples,

                    probeSampleId:
                        search.probeSampleId,

                    galleryParticipantIds:
                        search.galleryParticipantIds,

                    kind:
                        search.kind,

                    ...(
                        search.kind ===
                        IDENTIFICATION_SEARCH_KIND.MATED
                            ? {
                                mateParticipantId:
                                    search.mateParticipantId,
                            }
                            : {}
                    ),
                });

            const probe =
                model.sampleById.get(
                    search.probeSampleId,
                );

            records.push({
                type:
                    CALIBRATION_RECORD_TYPE
                        .IDENTIFICATION_SEARCH,

                sessionId:
                    probe.sessionId,

                searchId:
                    search.searchId,

                profileId:
                    plan.profileId,

                kind:
                    search.kind,

                top1Score:
                    result.top1Score,

                top2Score:
                    result.top2Score,

                margin:
                    result.margin,

                ...(
                    search.kind ===
                        IDENTIFICATION_SEARCH_KIND.MATED
                        ? {
                            top1IsMate:
                                result.top1IsMate,
                        }
                        : {}
                ),

                candidateCount:
                    result.candidateCount,

                captureConditionId:
                    probe.captureConditionId,

                timestamp:
                    acceptedCaptures
                        .get(
                            search.probeSampleId,
                        )
                        .capturedAt,
            });
        }

        const createdAt =
            timestamp(
                "dataset.createdAt",
            );

        let latestRecordMs =
            Number.NEGATIVE_INFINITY;

        for (
            const record of
            records
        ) {
            latestRecordMs =
                Math.max(
                    latestRecordMs,
                    Date.parse(
                        record.timestamp,
                    ),
                );
        }

        if (
            Date.parse(
                createdAt,
            ) <
            latestRecordMs
        ) {
            fail(
                "CLOCK_ORDER_INVALID",
            );
        }

        const captureConditionCatalog =
            Array.from(
                model.calibrationConditionIds,
            ).map(
                (
                    conditionId,
                ) => {
                    const condition =
                        model.conditionById.get(
                            conditionId,
                        );

                    return {
                        id:
                            condition.id,

                        lighting:
                            condition.lighting,

                        distanceBand:
                            condition.distanceBand,

                        pose:
                            condition.pose,

                        glasses:
                            condition.glasses,

                        ppe:
                            [
                                ...condition.ppe,
                            ],

                        deviceId:
                            condition.deviceId,
                    };
                },
            );

        return {
            datasetVersion:
                controlledStudyContract
                    .calibration
                    .datasetVersion,

            protocolVersion:
                plan.protocolVersion,

            profileId:
                plan.profileId,

            environmentId:
                controlledStudyContract
                    .calibration
                    .environmentId,

            captureConditionCatalog,

            createdAt,

            records,
        };
    }

    function cleanupEmbeddings() {
        for (
            const capture of
            acceptedCaptures.values()
        ) {
            zeroEmbedding(
                capture.embedding,
            );

            capture.embedding =
                null;
        }
    }

    function finalize() {
        assertMutable();

        if (
            activeSessionId !==
            null
        ) {
            fail(
                "FINALIZE_ACTIVE_SESSION",
            );
        }

        if (
            state !==
            CALIBRATION_COLLECTION_RUNNER_STATE
                .COLLECTION_COMPLETE
        ) {
            fail(
                "FINALIZE_COLLECTION_INCOMPLETE",
            );
        }

        for (
            const sessionId of
            model.calibrationSessionIds
        ) {
            if (
                !sessionExecution
                    .get(
                        sessionId,
                    )
                    ?.completedAt
            ) {
                fail(
                    "FINALIZE_SESSION_MISSING",
                );
            }
        }

        for (
            const sampleId of
            model.calibrationSampleIds
        ) {
            if (
                !acceptedCaptures.has(
                    sampleId,
                )
            ) {
                fail(
                    "FINALIZE_SAMPLE_MISSING",
                );
            }
        }

        try {
            const executionManifest =
                buildExecutionManifest();

            const manifestSummary =
                evaluateBiometricCalibrationExecutionManifest(
                    executionManifest,
                );

            if (
                !manifestSummary.manifestValid ||
                !manifestSummary
                    .readyForCalibrationExecutionValidation
            ) {
                fail(
                    "FINALIZE_MANIFEST_INVALID",
                );
            }

            const calibrationDataset =
                validateBiometricCalibrationDataset(
                    buildCalibrationDataset(),
                );

            const validationSummary =
                evaluateBiometricCalibrationExecutionValidation({
                    controlledStudyContract,
                    collectionPlan,
                    executionManifest,
                    calibrationDataset,
                });

            if (
                !validationSummary
                    .readyForCalibrationAnalysis
            ) {
                fail(
                    "FINALIZE_EXECUTION_VALIDATION_FAILED",
                );
            }

            state =
                CALIBRATION_COLLECTION_RUNNER_STATE.FINALIZED;

            return Object.freeze({
                executionManifest,
                calibrationDataset,
                validationSummary,
            });
        }
        catch (error) {
            state =
                CALIBRATION_COLLECTION_RUNNER_STATE.FAILED;

            throw error;
        }
        finally {
            cleanupEmbeddings();
        }
    }

    function abort() {
        if (
            state ===
                CALIBRATION_COLLECTION_RUNNER_STATE.ABORTED
        ) {
            return false;
        }

        if (
            state ===
                CALIBRATION_COLLECTION_RUNNER_STATE.FINALIZED ||
            state ===
                CALIBRATION_COLLECTION_RUNNER_STATE.FAILED
        ) {
            return false;
        }

        cleanupEmbeddings();

        acceptedCaptures.clear();
        sessionExecution.clear();

        activeSessionId =
            null;

        state =
            CALIBRATION_COLLECTION_RUNNER_STATE.ABORTED;

        return true;
    }

    return Object.freeze({
        startSession,
        captureSample,
        completeSession,
        finalize,
        abort,
        snapshot,
        getQualityRejectionSummary: () => rejectionCounter.snapshot(),
    });
}
