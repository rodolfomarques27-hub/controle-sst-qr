import test from "node:test";
import assert from "node:assert/strict";

import {
    CALIBRATION_SPLIT,
    IDENTIFICATION_SEARCH_KIND,
    VERIFICATION_LABEL,
    validateBiometricCalibrationCollectionPlan,
} from "../src/identity/biometricCalibrationCollectionProtocol.mjs";

import {
    REAL_CALIBRATION_PILOT_PLAN,
} from "../src/identity/biometricRealCalibrationPilotPlan.mjs";

import {
    createBiometricRealCalibrationPilotCollectionPlan,
} from "../src/identity/biometricRealCalibrationPilotCollectionPlanAdapter.mjs";

const SYNTHETIC_BINDINGS = Object.freeze({
    "condition-a":
        "synthetic-device-a",

    "condition-b":
        "synthetic-device-b",
});

function createPlan() {
    return (
        createBiometricRealCalibrationPilotCollectionPlan({
            protocolVersion:
                "r7f-pilot-protocol-v1",

            profileId:
                "sface-pilot-profile-v1",

            environmentId:
                "synthetic-environment",

            deviceBindings:
                SYNTHETIC_BINDINGS,
        })
    );
}

test(
    "R7 exige bindings offline explicitos antes de gerar CollectionPlan",
    () => {
        assert.throws(
            () =>
                createBiometricRealCalibrationPilotCollectionPlan({
                    protocolVersion:
                        "r7f-pilot-protocol-v1",

                    profileId:
                        "sface-pilot-profile-v1",

                    deviceBindings:
                        SYNTHETIC_BINDINGS,
                }),

            /environmentId/,
        );

        assert.throws(
            () =>
                createBiometricRealCalibrationPilotCollectionPlan({
                    protocolVersion:
                        "r7f-pilot-protocol-v1",

                    profileId:
                        "sface-pilot-profile-v1",

                    environmentId:
                        "synthetic-environment",

                    deviceBindings: {
                        "condition-a":
                            "synthetic-device-a",
                    },
                }),

            /condition-b/,
        );
    },
);

test(
    "R7 gera CollectionPlan diretamente aceito pelo validator oficial",
    () => {
        const plan =
            createPlan();

        assert.doesNotThrow(
            () =>
                validateBiometricCalibrationCollectionPlan(
                    plan,
                ),
        );

        assert.deepEqual(
            Object.keys(plan).sort(),
            [
                "calibrationParticipantIds",
                "captureConditionCatalog",
                "evaluationParticipantIds",
                "identificationSearches",
                "participants",
                "plannedGallerySize",
                "plannedParticipantCount",
                "policies",
                "profileId",
                "protocolVersion",
                "samplesPerSession",
                "sessionsPerParticipant",
                "sufficiencyCriteria",
                "verificationComparisons",
            ].sort(),
        );
    },
);

test(
    "R7 preserva seis pseudonimos duas sessoes quatro amostras e 48 capturas",
    () => {
        const plan =
            createPlan();

        assert.equal(
            plan.plannedParticipantCount,
            6,
        );

        assert.equal(
            plan.calibrationParticipantIds.length,
            3,
        );

        assert.equal(
            plan.evaluationParticipantIds.length,
            3,
        );

        assert.equal(
            plan.sessionsPerParticipant,
            2,
        );

        assert.equal(
            plan.samplesPerSession,
            4,
        );

        const totalSamples =
            plan.participants.reduce(
                (
                    total,
                    participant,
                ) =>
                    total +
                    participant.sessions.reduce(
                        (
                            subtotal,
                            session,
                        ) =>
                            subtotal +
                            session.samples.length,

                        0,
                    ),

                0,
            );

        assert.equal(
            totalSamples,
            48,
        );
    },
);

test(
    "R7 materializa profile e bindings somente nos campos executaveis",
    () => {
        const plan =
            createPlan();

        assert.equal(
            plan.captureConditionCatalog.length,
            2,
        );

        for (
            const condition of
            plan.captureConditionCatalog
        ) {
            assert.equal(
                condition.environmentId,
                "synthetic-environment",
            );

            assert.equal(
                condition.deviceId,
                SYNTHETIC_BINDINGS[
                    condition.id
                ],
            );
        }

        for (
            const participant of
            plan.participants
        ) {
            assert.deepEqual(
                Object.keys(
                    participant,
                ).sort(),
                [
                    "participantId",
                    "sessions",
                ],
            );

            for (
                const session of
                participant.sessions
            ) {
                assert.deepEqual(
                    Object.keys(
                        session,
                    ).sort(),
                    [
                        "samples",
                        "sessionId",
                    ],
                );

                for (
                    const sample of
                    session.samples
                ) {
                    assert.equal(
                        sample.profileId,
                        "sface-pilot-profile-v1",
                    );

                    assert.equal(
                        Object.hasOwn(
                            sample,
                            "plannedSamples",
                        ),
                        false,
                    );
                }
            }
        }
    },
);

test(
    "R7 materializa comparacoes GENUINE e IMPOSTOR nos dois splits",
    () => {
        const plan =
            createPlan();

        const calibration =
            plan.verificationComparisons.filter(
                (item) =>
                    item.split ===
                    CALIBRATION_SPLIT.CALIBRATION,
            );

        const evaluation =
            plan.verificationComparisons.filter(
                (item) =>
                    item.split ===
                    CALIBRATION_SPLIT.EVALUATION,
            );

        assert.equal(
            calibration.filter(
                (item) =>
                    item.label ===
                    VERIFICATION_LABEL.GENUINE,
            ).length,
            8,
        );

        assert.equal(
            calibration.filter(
                (item) =>
                    item.label ===
                    VERIFICATION_LABEL.IMPOSTOR,
            ).length,
            8,
        );

        assert.equal(
            evaluation.filter(
                (item) =>
                    item.label ===
                    VERIFICATION_LABEL.GENUINE,
            ).length,
            8,
        );

        assert.equal(
            evaluation.filter(
                (item) =>
                    item.label ===
                    VERIFICATION_LABEL.IMPOSTOR,
            ).length,
            8,
        );
    },
);

test(
    "R7 materializa buscas MATED e NON_MATED com galeria dois",
    () => {
        const plan =
            createPlan();

        const calibration =
            plan.identificationSearches.filter(
                (item) =>
                    item.split ===
                    CALIBRATION_SPLIT.CALIBRATION,
            );

        const evaluation =
            plan.identificationSearches.filter(
                (item) =>
                    item.split ===
                    CALIBRATION_SPLIT.EVALUATION,
            );

        assert.equal(
            calibration.filter(
                (item) =>
                    item.kind ===
                    IDENTIFICATION_SEARCH_KIND.MATED,
            ).length,
            6,
        );

        assert.equal(
            calibration.filter(
                (item) =>
                    item.kind ===
                    IDENTIFICATION_SEARCH_KIND.NON_MATED,
            ).length,
            6,
        );

        assert.equal(
            evaluation.filter(
                (item) =>
                    item.kind ===
                    IDENTIFICATION_SEARCH_KIND.MATED,
            ).length,
            5,
        );

        assert.equal(
            evaluation.filter(
                (item) =>
                    item.kind ===
                    IDENTIFICATION_SEARCH_KIND.NON_MATED,
            ).length,
            5,
        );

        for (
            const search of
            plan.identificationSearches
        ) {
            assert.equal(
                search.galleryParticipantIds.length,
                2,
            );

            if (
                search.kind ===
                IDENTIFICATION_SEARCH_KIND.MATED
            ) {
                assert.ok(
                    search.galleryParticipantIds.includes(
                        search.mateParticipantId,
                    ),
                );
            }

            if (
                search.kind ===
                IDENTIFICATION_SEARCH_KIND.NON_MATED
            ) {
                assert.equal(
                    Object.hasOwn(
                        search,
                        "mateParticipantId",
                    ),
                    false,
                );
            }
        }
    },
);

test(
    "R7 e deterministico nao altera R5 e nao transporta governanca para CollectionPlan",
    () => {
        const pilotBefore =
            JSON.stringify(
                REAL_CALIBRATION_PILOT_PLAN,
            );

        const first =
            createPlan();

        const second =
            createPlan();

        assert.deepEqual(
            first,
            second,
        );

        assert.equal(
            JSON.stringify(
                REAL_CALIBRATION_PILOT_PLAN,
            ),
            pilotBefore,
        );

        for (
            const forbiddenKey of
            [
                "planVersion",
                "status",
                "purpose",
                "runtimeBindings",
                "privacy",
                "authorization",
                "production",
            ]
        ) {
            assert.equal(
                Object.hasOwn(
                    first,
                    forbiddenKey,
                ),
                false,
            );
        }

        const serialized =
            JSON.stringify(
                first,
            );

        assert.equal(
            serialized.includes(
                "rtsp://",
            ),
            false,
        );

        assert.equal(
            serialized.includes(
                "password",
            ),
            false,
        );

        assert.equal(
            serialized.includes(
                "username",
            ),
            false,
        );
    },
);