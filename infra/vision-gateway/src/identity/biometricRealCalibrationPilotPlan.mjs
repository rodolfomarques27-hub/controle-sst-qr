import {
    REAL_CALIBRATION_AUTHORIZATION_BLOCKER,
    REAL_CALIBRATION_PARTICIPANT_ID_POLICY,
} from "./biometricRealCalibrationCollectionPreparation.mjs";

export const REAL_CALIBRATION_PILOT_PLAN_VERSION =
    "r7f-pilot-v1";

export const REAL_CALIBRATION_PILOT_STATUS =
    "AWAITING_RUNTIME_BINDINGS";

const CALIBRATION_PARTICIPANT_IDS = Object.freeze([
    "cal-p001",
    "cal-p002",
    "cal-p003",
]);

const EVALUATION_PARTICIPANT_IDS = Object.freeze([
    "eval-p001",
    "eval-p002",
    "eval-p003",
]);

const SAMPLE_CONDITION_SEQUENCE = Object.freeze([
    "condition-a",
    "condition-b",
    "condition-a",
    "condition-b",
]);

function deepFreeze(value) {
    if (
        value === null ||
        typeof value !== "object" ||
        Object.isFrozen(value)
    ) {
        return value;
    }

    Object.freeze(value);

    for (const nested of Object.values(value)) {
        deepFreeze(nested);
    }

    return value;
}

function sessionRoleSuffix(role) {
    return role === "ENROLLMENT"
        ? "enroll"
        : "probe";
}

function buildSession(participantId, role) {
    const suffix =
        sessionRoleSuffix(role);

    return {
        sessionId:
            `session-${participantId}-${suffix}`,

        role,

        plannedSamples:
            SAMPLE_CONDITION_SEQUENCE.map(
                (captureConditionId, index) => ({
                    sampleId:
                        `${participantId}-${suffix}-${String(index + 1).padStart(2, "0")}`,

                    role,

                    captureConditionId,
                }),
            ),
    };
}

function buildParticipant(participantId, split) {
    return {
        participantId,
        split,

        sessions: [
            buildSession(
                participantId,
                "ENROLLMENT",
            ),

            buildSession(
                participantId,
                "PROBE",
            ),
        ],
    };
}

const PARTICIPANTS = [
    ...CALIBRATION_PARTICIPANT_IDS.map(
        (participantId) =>
            buildParticipant(
                participantId,
                "CALIBRATION",
            ),
    ),

    ...EVALUATION_PARTICIPANT_IDS.map(
        (participantId) =>
            buildParticipant(
                participantId,
                "EVALUATION",
            ),
    ),
];

export const REAL_CALIBRATION_PILOT_PLAN =
    deepFreeze({
        planVersion:
            REAL_CALIBRATION_PILOT_PLAN_VERSION,

        status:
            REAL_CALIBRATION_PILOT_STATUS,

        purpose:
            "CONTROLLED_TECHNICAL_PILOT_NOT_PRODUCTION_HOMOLOGATION",

        participantIdPolicy: {
            description:
                REAL_CALIBRATION_PARTICIPANT_ID_POLICY.description,

            calibrationPattern:
                REAL_CALIBRATION_PARTICIPANT_ID_POLICY.calibrationPattern.source,

            evaluationPattern:
                REAL_CALIBRATION_PARTICIPANT_ID_POLICY.evaluationPattern.source,
        },

        plannedParticipantCount: 6,

        splitCounts: {
            calibration: 3,
            evaluation: 3,
        },

        calibrationParticipantIds:
            CALIBRATION_PARTICIPANT_IDS,

        evaluationParticipantIds:
            EVALUATION_PARTICIPANT_IDS,

        participants:
            PARTICIPANTS,

        sessionsPerParticipant: 2,

        sessionRoles: [
            "ENROLLMENT",
            "PROBE",
        ],

        samplesPerSession: 4,

        enrollmentReferencesPerParticipant: 4,

        probeSamplesPerParticipant: 4,

        plannedCapturesPerParticipant: 8,

        plannedCaptureCount: 48,

        plannedGallerySize: 2,

        captureConditions: [
            {
                id: "condition-a",
                lighting: "real-bright",
                distanceBand: "near",
                pose: "frontal",
                glasses: false,
                ppe: [],
            },
            {
                id: "condition-b",
                lighting: "real-dim",
                distanceBand: "mid",
                pose: "frontal",
                glasses: true,
                ppe: [
                    "helmet",
                ],
            },
        ],

        scoringPolicy: {
            verificationReferenceAggregation:
                "PARTICIPANT_ENROLLMENT_CENTROID",

            identificationReferenceAggregation:
                "PARTICIPANT_ENROLLMENT_CENTROID",

            minimumEnrollmentReferencesPerParticipant:
                3,

            maximumEnrollmentReferencesPerParticipant:
                5,
        },

        controlledStudyMinimums: {
            calibration: {
                genuineComparisons: 8,
                impostorComparisons: 8,
                matedSearches: 6,
                nonMatedSearches: 6,
            },

            evaluation: {
                minimumParticipants: 3,
                genuineComparisons: 8,
                impostorComparisons: 8,
                matedSearches: 5,
                nonMatedSearches: 5,
            },
        },

        runtimeBindings: {
            environmentId: null,
            deviceIds: [],
            status:
                "PENDING_EXPLICIT_AUTHORIZATION",
        },

        privacy: {
            participantIdentifiers:
                "PSEUDONYMOUS_ONLY",

            piiAllowed: false,

            embeddingRetention:
                "MEMORY_ONLY",

            biometricPersistence:
                false,
        },

        authorization: {
            cameraRequired: true,
            rtspRequired: true,
            participantsRequired: true,

            blockers: [
                REAL_CALIBRATION_AUTHORIZATION_BLOCKER.CAMERA,
                REAL_CALIBRATION_AUTHORIZATION_BLOCKER.RTSP,
                REAL_CALIBRATION_AUTHORIZATION_BLOCKER.PARTICIPANTS,
            ],

            collectionAllowed:
                false,
        },

        production: {
            thresholdSet: false,
            productionApproval: false,
            padLivenessValidated: false,
            fallbackValidated: false,
        },
    });