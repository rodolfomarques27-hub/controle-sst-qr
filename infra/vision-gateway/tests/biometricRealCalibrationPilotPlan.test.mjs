import test from "node:test";
import assert from "node:assert/strict";

import {
    REAL_CALIBRATION_PARTICIPANT_ID_POLICY,
    REAL_CALIBRATION_AUTHORIZATION_BLOCKER,
} from "../src/identity/biometricRealCalibrationCollectionPreparation.mjs";

import {
    REAL_CALIBRATION_PILOT_PLAN,
    REAL_CALIBRATION_PILOT_PLAN_VERSION,
    REAL_CALIBRATION_PILOT_STATUS,
} from "../src/identity/biometricRealCalibrationPilotPlan.mjs";

test(
    "plano piloto possui seis participantes pseudonimos separados 3/3",
    () => {
        const plan =
            REAL_CALIBRATION_PILOT_PLAN;

        assert.equal(
            plan.plannedParticipantCount,
            6,
        );

        assert.equal(
            plan.splitCounts.calibration,
            3,
        );

        assert.equal(
            plan.splitCounts.evaluation,
            3,
        );

        assert.equal(
            plan.calibrationParticipantIds.length,
            3,
        );

        assert.equal(
            plan.evaluationParticipantIds.length,
            3,
        );

        const allIds = [
            ...plan.calibrationParticipantIds,
            ...plan.evaluationParticipantIds,
        ];

        assert.equal(
            new Set(allIds).size,
            6,
        );

        for (
            const participantId of
            plan.calibrationParticipantIds
        ) {
            assert.match(
                participantId,
                REAL_CALIBRATION_PARTICIPANT_ID_POLICY
                    .calibrationPattern,
            );
        }

        for (
            const participantId of
            plan.evaluationParticipantIds
        ) {
            assert.match(
                participantId,
                REAL_CALIBRATION_PARTICIPANT_ID_POLICY
                    .evaluationPattern,
            );
        }
    },
);

test(
    "plano piloto materializa duas sessoes e quatro amostras por sessao",
    () => {
        const plan =
            REAL_CALIBRATION_PILOT_PLAN;

        assert.equal(
            plan.sessionsPerParticipant,
            2,
        );

        assert.equal(
            plan.samplesPerSession,
            4,
        );

        assert.equal(
            plan.plannedCapturesPerParticipant,
            8,
        );

        assert.equal(
            plan.plannedCaptureCount,
            48,
        );

        assert.equal(
            plan.participants.length,
            6,
        );

        for (
            const participant of
            plan.participants
        ) {
            assert.equal(
                participant.sessions.length,
                2,
            );

            assert.deepEqual(
                participant.sessions.map(
                    (session) => session.role,
                ),
                [
                    "ENROLLMENT",
                    "PROBE",
                ],
            );

            for (
                const session of
                participant.sessions
            ) {
                assert.equal(
                    session.plannedSamples.length,
                    4,
                );

                assert.equal(
                    new Set(
                        session.plannedSamples.map(
                            (sample) => sample.sampleId,
                        ),
                    ).size,
                    4,
                );

                for (
                    const sample of
                    session.plannedSamples
                ) {
                    assert.equal(
                        sample.role,
                        session.role,
                    );
                }
            }
        }
    },
);

test(
    "quatro referencias enrollment permanecem dentro da regra obrigatoria 3 a 5",
    () => {
        const plan =
            REAL_CALIBRATION_PILOT_PLAN;

        assert.equal(
            plan.enrollmentReferencesPerParticipant,
            4,
        );

        assert.equal(
            plan.scoringPolicy
                .minimumEnrollmentReferencesPerParticipant,
            3,
        );

        assert.equal(
            plan.scoringPolicy
                .maximumEnrollmentReferencesPerParticipant,
            5,
        );

        assert.ok(
            plan.enrollmentReferencesPerParticipant >=
                plan.scoringPolicy
                    .minimumEnrollmentReferencesPerParticipant,
        );

        assert.ok(
            plan.enrollmentReferencesPerParticipant <=
                plan.scoringPolicy
                    .maximumEnrollmentReferencesPerParticipant,
        );
    },
);

test(
    "condicoes do piloto nao materializam camera real nem credencial",
    () => {
        const plan =
            REAL_CALIBRATION_PILOT_PLAN;

        assert.equal(
            plan.captureConditions.length,
            2,
        );

        assert.equal(
            plan.runtimeBindings.environmentId,
            null,
        );

        assert.deepEqual(
            plan.runtimeBindings.deviceIds,
            [],
        );

        assert.equal(
            plan.runtimeBindings.status,
            "PENDING_EXPLICIT_AUTHORIZATION",
        );

        for (
            const condition of
            plan.captureConditions
        ) {
            assert.equal(
                Object.hasOwn(
                    condition,
                    "deviceId",
                ),
                false,
            );
        }

        const serialized =
            JSON.stringify(plan);

        assert.equal(
            serialized.includes("rtsp://"),
            false,
        );

        assert.equal(
            serialized.includes("password"),
            false,
        );

        assert.equal(
            serialized.includes("username"),
            false,
        );
    },
);

test(
    "privacidade e autorizacoes mantem coleta real bloqueada",
    () => {
        const plan =
            REAL_CALIBRATION_PILOT_PLAN;

        assert.equal(
            plan.privacy.piiAllowed,
            false,
        );

        assert.equal(
            plan.privacy.embeddingRetention,
            "MEMORY_ONLY",
        );

        assert.equal(
            plan.privacy.biometricPersistence,
            false,
        );

        assert.equal(
            plan.authorization.collectionAllowed,
            false,
        );

        assert.deepEqual(
            plan.authorization.blockers,
            [
                REAL_CALIBRATION_AUTHORIZATION_BLOCKER.CAMERA,
                REAL_CALIBRATION_AUTHORIZATION_BLOCKER.RTSP,
                REAL_CALIBRATION_AUTHORIZATION_BLOCKER.PARTICIPANTS,
            ],
        );

        assert.equal(
            plan.production.thresholdSet,
            false,
        );

        assert.equal(
            plan.production.productionApproval,
            false,
        );

        assert.equal(
            plan.production.padLivenessValidated,
            false,
        );

        assert.equal(
            plan.production.fallbackValidated,
            false,
        );
    },
);

test(
    "plano piloto fica congelado e explicitamente nao produtivo",
    () => {
        const plan =
            REAL_CALIBRATION_PILOT_PLAN;

        assert.equal(
            REAL_CALIBRATION_PILOT_PLAN_VERSION,
            "r7f-pilot-v1",
        );

        assert.equal(
            REAL_CALIBRATION_PILOT_STATUS,
            "AWAITING_RUNTIME_BINDINGS",
        );

        assert.equal(
            plan.purpose,
            "CONTROLLED_TECHNICAL_PILOT_NOT_PRODUCTION_HOMOLOGATION",
        );

        assert.equal(
            Object.isFrozen(plan),
            true,
        );

        assert.equal(
            Object.isFrozen(plan.participants),
            true,
        );

        assert.equal(
            Object.isFrozen(plan.captureConditions),
            true,
        );
    },
);