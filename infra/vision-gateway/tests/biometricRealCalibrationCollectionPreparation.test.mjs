import test from "node:test";
import assert from "node:assert/strict";

import {
    REAL_CALIBRATION_AUTHORIZATION_BLOCKER,
    REAL_CALIBRATION_FRESH_FRAME_PROTOCOL,
    createBiometricCalibrationFreshFrameAdmissionController,
    evaluateBiometricRealCalibrationCollectionPreparation,
} from "../src/identity/biometricRealCalibrationCollectionPreparation.mjs";

const PROTOCOL_VERSION = "r7f-v1";
const PROFILE_ID = "sface-profile-v1";
const ENVIRONMENT_ID = "environment-lab";
const DATASET_VERSION = "calibration-dataset-v1";

const CAL_PARTICIPANTS = Object.freeze([
    "cal-p001",
    "cal-p002",
    "cal-p003",
]);

const EVAL_PARTICIPANTS = Object.freeze([
    "eval-p001",
    "eval-p002",
    "eval-p003",
]);

function sessionId(participantId, role) {
    return `session-${participantId}-${role.toLowerCase()}`;
}

function enrollmentId(participantId, index) {
    return `${participantId}-enroll-${String(index).padStart(2, "0")}`;
}

function probeId(participantId, index) {
    return `${participantId}-probe-${String(index).padStart(2, "0")}`;
}

function createSamples(participantId, role, count = 4) {
    return Array.from(
        { length: count },
        (_, zeroBased) => {
            const index = zeroBased + 1;
            return {
                sampleId:
                    role === "ENROLLMENT"
                        ? enrollmentId(participantId, index)
                        : probeId(participantId, index),
                profileId: PROFILE_ID,
                role,
                captureConditionId:
                    index % 2 === 1
                        ? "condition-a"
                        : "condition-b",
            };
        },
    );
}

function participant(participantId, count = 4) {
    return {
        participantId,
        sessions: [
            {
                sessionId: sessionId(participantId, "ENROLLMENT"),
                samples: createSamples(participantId, "ENROLLMENT", count),
            },
            {
                sessionId: sessionId(participantId, "PROBE"),
                samples: createSamples(participantId, "PROBE", count),
            },
        ],
    };
}

function phase(participantIds, datasetVersion) {
    return {
        datasetVersion,
        protocolVersion: PROTOCOL_VERSION,
        profileId: PROFILE_ID,
        environmentId: ENVIRONMENT_ID,
        deviceIds: [
            "device-a",
            "device-b",
        ],
        captureConditionIds: [
            "condition-a",
            "condition-b",
        ],
        participantIds: [
            ...participantIds,
        ],
        sessionIds: participantIds.flatMap((participantId) => [
            sessionId(participantId, "ENROLLMENT"),
            sessionId(participantId, "PROBE"),
        ]),
        plannedCounts: {
            genuineComparisons: 1,
            impostorComparisons: 1,
            matedSearches: 1,
            nonMatedSearches: 1,
        },
    };
}

function controlledStudyContract() {
    return {
        protocolVersion: PROTOCOL_VERSION,
        profileId: PROFILE_ID,
        calibration: phase(CAL_PARTICIPANTS, DATASET_VERSION),
        evaluation: phase(EVAL_PARTICIPANTS, "evaluation-dataset-v1"),
        analysisPolicy: {
            thresholdGrid: [
                0.2,
                0.4,
                0.6,
                0.8,
            ],
            percentilePoints: [
                0,
                0.5,
                0.95,
                1,
            ],
            minimumSampleCounts: {
                genuineComparisons: 1,
                impostorComparisons: 1,
                matedSearches: 1,
                nonMatedSearches: 1,
            },
        },
        acceptancePolicy: {
            maxFmr: 0.1,
            maxFnmr: 0.1,
            maxFpir: 0.1,
            maxFnir: 0.1,
            minimumEvaluationParticipants: 3,
            minimumGenuineComparisons: 1,
            minimumImpostorComparisons: 1,
            minimumMatedSearches: 1,
            minimumNonMatedSearches: 1,
        },
    };
}

function collectionPlan(sampleCount = 4) {
    return {
        protocolVersion: PROTOCOL_VERSION,
        profileId: PROFILE_ID,
        plannedParticipantCount: 6,
        sessionsPerParticipant: 2,
        samplesPerSession: sampleCount,
        plannedGallerySize: 2,
        captureConditionCatalog: [
            {
                id: "condition-a",
                lighting: "real-bright",
                distanceBand: "near",
                pose: "frontal",
                glasses: false,
                ppe: [],
                deviceId: "device-a",
                environmentId: ENVIRONMENT_ID,
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
                deviceId: "device-b",
                environmentId: ENVIRONMENT_ID,
            },
        ],
        participants: [
            ...CAL_PARTICIPANTS.map((id) => participant(id, sampleCount)),
            ...EVAL_PARTICIPANTS.map((id) => participant(id, sampleCount)),
        ],
        calibrationParticipantIds: [
            ...CAL_PARTICIPANTS,
        ],
        evaluationParticipantIds: [
            ...EVAL_PARTICIPANTS,
        ],
        verificationComparisons: [
            {
                comparisonId: "comparison-cal-genuine",
                split: "CALIBRATION",
                label: "GENUINE",
                enrollmentSampleId: enrollmentId("cal-p001", 1),
                probeSampleId: probeId("cal-p001", 1),
            },
            {
                comparisonId: "comparison-cal-impostor",
                split: "CALIBRATION",
                label: "IMPOSTOR",
                enrollmentSampleId: enrollmentId("cal-p001", 2),
                probeSampleId: probeId("cal-p002", 1),
            },
            {
                comparisonId: "comparison-eval-genuine",
                split: "EVALUATION",
                label: "GENUINE",
                enrollmentSampleId: enrollmentId("eval-p001", 1),
                probeSampleId: probeId("eval-p001", 1),
            },
            {
                comparisonId: "comparison-eval-impostor",
                split: "EVALUATION",
                label: "IMPOSTOR",
                enrollmentSampleId: enrollmentId("eval-p001", 2),
                probeSampleId: probeId("eval-p002", 1),
            },
        ],
        identificationSearches: [
            {
                searchId: "search-cal-mated",
                split: "CALIBRATION",
                kind: "MATED",
                probeSampleId: probeId("cal-p001", 2),
                galleryParticipantIds: [
                    "cal-p001",
                    "cal-p002",
                ],
                mateParticipantId: "cal-p001",
            },
            {
                searchId: "search-cal-nonmated",
                split: "CALIBRATION",
                kind: "NON_MATED",
                probeSampleId: probeId("cal-p003", 1),
                galleryParticipantIds: [
                    "cal-p001",
                    "cal-p002",
                ],
            },
            {
                searchId: "search-eval-mated",
                split: "EVALUATION",
                kind: "MATED",
                probeSampleId: probeId("eval-p001", 2),
                galleryParticipantIds: [
                    "eval-p001",
                    "eval-p002",
                ],
                mateParticipantId: "eval-p001",
            },
            {
                searchId: "search-eval-nonmated",
                split: "EVALUATION",
                kind: "NON_MATED",
                probeSampleId: probeId("eval-p003", 1),
                galleryParticipantIds: [
                    "eval-p001",
                    "eval-p002",
                ],
            },
        ],
        policies: {
            enrollmentProbeSeparationRequired: true,
            disjointCalibrationEvaluationRequired: true,
            requireMatedSearches: true,
            requireNonMatedSearches: true,
        },
        sufficiencyCriteria: {
            minimumParticipants: 6,
            minimumSessionsPerParticipant: 2,
            minimumSamplesPerSession: sampleCount,
            minimumGenuineComparisons: 1,
            minimumImpostorComparisons: 1,
            minimumMatedSearches: 1,
            minimumNonMatedSearches: 1,
            minimumGallerySize: 2,
            minimumSamplesPerCondition: 1,
        },
    };
}

function scoringProtocol() {
    return {
        profileId: PROFILE_ID,
        verificationReferenceAggregation:
            "PARTICIPANT_ENROLLMENT_CENTROID",
        identificationReferenceAggregation:
            "PARTICIPANT_ENROLLMENT_CENTROID",
        minimumEnrollmentReferencesPerParticipant: 3,
        maximumEnrollmentReferencesPerParticipant: 5,
        embeddingRetention: "MEMORY_ONLY",
        persistedArtifacts: "EXECUTION_MANIFEST_AND_R7C_DATASET",
    };
}

function evaluate({
    contract = controlledStudyContract(),
    plan = collectionPlan(),
    protocol = scoringProtocol(),
} = {}) {
    return evaluateBiometricRealCalibrationCollectionPreparation({
        controlledStudyContract: contract,
        collectionPlan: plan,
        scoringProtocol: protocol,
    });
}

function renameParticipant({
    contract,
    plan,
    from,
    to,
    split,
}) {
    const participantItem =
        plan.participants.find((item) => item.participantId === from);
    participantItem.participantId = to;

    const splitKey =
        split === "CALIBRATION"
            ? "calibrationParticipantIds"
            : "evaluationParticipantIds";

    plan[splitKey] =
        plan[splitKey].map((id) => id === from ? to : id);

    const phaseKey =
        split === "CALIBRATION"
            ? "calibration"
            : "evaluation";

    contract[phaseKey].participantIds =
        contract[phaseKey].participantIds.map((id) => id === from ? to : id);

    for (const search of plan.identificationSearches) {
        search.galleryParticipantIds =
            search.galleryParticipantIds.map((id) => id === from ? to : id);

        if (search.mateParticipantId === from) {
            search.mateParticipantId = to;
        }
    }
}

function createSyntheticSource({
    lastFrame = 10,
    withPendingFrame = true,
    running = true,
} = {}) {
    const width = 4;
    const height = 4;

    let state =
        running
            ? "RUNNING"
            : "STOPPED";

    let runningFlag =
        running;

    let firstFrameSeen =
        running;

    let currentLastFrame =
        lastFrame;

    let pendingFrame =
        withPendingFrame
            ? new Uint8Array(width * height * 3).fill(7)
            : null;

    let startCalls = 0;
    let stopCalls = 0;
    let takeCalls = 0;

    function snapshot() {
        return {
            state,
            running: runningFlag,
            firstFrameSeen,
            lastFrame: currentLastFrame,
            frames: {
                format: "bgr24",
                width,
                height,
                queue: {
                    capacity: 1,
                    pending: pendingFrame !== null,
                    pendingBytes: pendingFrame?.byteLength ?? 0,
                },
            },
        };
    }

    function takeLatestFrame() {
        takeCalls += 1;
        const frame = pendingFrame;
        pendingFrame = null;
        return frame;
    }

    return {
        snapshot,
        takeLatestFrame,
        start() {
            startCalls += 1;
        },
        stop() {
            stopCalls += 1;
        },
        pushFreshFrame({
            nextLastFrame = currentLastFrame + 1,
            byteLength = width * height * 3,
        } = {}) {
            currentLastFrame = nextLastFrame;
            pendingFrame = new Uint8Array(byteLength).fill(9);
            return pendingFrame;
        },
        advanceWithoutFrame(nextLastFrame = currentLastFrame + 1) {
            currentLastFrame = nextLastFrame;
            pendingFrame = null;
        },
        changeDimensions() {
            const originalSnapshot = snapshot;
            this.snapshot = () => {
                const value = originalSnapshot();
                value.frames.width = width + 1;
                return value;
            };
        },
        markStopped() {
            state = "STOPPED";
            runningFlag = false;
        },
        staleFrame() {
            return pendingFrame;
        },
        counts() {
            return {
                startCalls,
                stopCalls,
                takeCalls,
            };
        },
    };
}

test("preparacao valida fica offline-ready mas bloqueada para coleta real", () => {
    const result = evaluate();

    assert.equal(result.offlineReadinessValid, true);
    assert.equal(result.realCollectionReady, false);
    assert.equal(result.downstreamContractsCompatible, true);
    assert.deepEqual(
        result.blockers,
        [
            REAL_CALIBRATION_AUTHORIZATION_BLOCKER.CAMERA,
            REAL_CALIBRATION_AUTHORIZATION_BLOCKER.RTSP,
            REAL_CALIBRATION_AUTHORIZATION_BLOCKER.PARTICIPANTS,
        ],
    );
});

test("resumo de readiness nao expoe participant IDs", () => {
    const serialized = JSON.stringify(evaluate());

    for (const participantId of [
        ...CAL_PARTICIPANTS,
        ...EVAL_PARTICIPANTS,
    ]) {
        assert.equal(serialized.includes(participantId), false);
    }
});

test("participantId fora do padrao pseudonimo bloqueia readiness", () => {
    const contract = controlledStudyContract();
    const plan = collectionPlan();

    renameParticipant({
        contract,
        plan,
        from: "cal-p003",
        to: "cal-person003",
        split: "CALIBRATION",
    });

    const result = evaluate({ contract, plan });

    assert.equal(result.participantIdsOpaque, false);
    assert.equal(
        result.blockers.includes("PARTICIPANT_IDS_NOT_OPAQUE"),
        true,
    );
});

test("menos de 3 ENROLLMENT planejadas bloqueia readiness", () => {
    const result = evaluate({
        plan: collectionPlan(2),
    });

    assert.equal(result.planValid, true);
    assert.equal(result.enrollmentReferenceCountsValid, false);
    assert.equal(
        result.blockers.includes("REFERENCE_ENROLLMENT_COUNT_INVALID"),
        true,
    );
});

test("mais de 5 ENROLLMENT planejadas bloqueia readiness", () => {
    const result = evaluate({
        plan: collectionPlan(6),
    });

    assert.equal(result.planValid, true);
    assert.equal(result.enrollmentReferenceCountsValid, false);
});

test("sessao misturando ENROLLMENT e PROBE e bloqueada", () => {
    const plan = collectionPlan();

    plan.participants
        .find((item) => item.participantId === "cal-p001")
        .sessions[0]
        .samples[3]
        .role = "PROBE";

    const result = evaluate({ plan });

    assert.equal(result.planValid, true);
    assert.equal(result.enrollmentProbeSessionSeparationValid, false);
    assert.equal(
        result.blockers.includes(
            "ENROLLMENT_PROBE_SESSION_SEPARATION_INVALID",
        ),
        true,
    );
});

test("profileId divergente no scoring protocol bloqueia compatibilidade", () => {
    const protocol = scoringProtocol();
    protocol.profileId = "other-profile";

    const result = evaluate({ protocol });

    assert.equal(result.scoringProtocolValid, true);
    assert.equal(result.profileCompatible, false);
});

test("device set divergente do R7F bloqueia devicesConditionsValid", () => {
    const contract = controlledStudyContract();
    contract.calibration.deviceIds = [
        "device-a",
    ];

    const result = evaluate({ contract });

    assert.equal(result.contractReady, true);
    assert.equal(result.devicesConditionsValid, false);
});

test("fresh-frame protocol exige fila 1, avanço estrito e consumidor exclusivo", () => {
    assert.equal(REAL_CALIBRATION_FRESH_FRAME_PROTOCOL.queueCapacity, 1);
    assert.equal(
        REAL_CALIBRATION_FRESH_FRAME_PROTOCOL.requireStrictLastFrameAdvance,
        true,
    );
    assert.equal(
        REAL_CALIBRATION_FRESH_FRAME_PROTOCOL.requirePendingFreshFrame,
        true,
    );
    assert.equal(
        REAL_CALIBRATION_FRESH_FRAME_PROTOCOL.exclusiveConsumerRequired,
        true,
    );
});

test("arm drena frame antigo, zera buffer e registra baseline", async () => {
    const source = createSyntheticSource();
    const stale = source.staleFrame();

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    const armed = await controller.arm("device-a");

    assert.equal(armed.armed, true);
    assert.equal(armed.baselineLastFrame, 10);
    assert.equal(armed.drainedPendingFrame, true);
    assert.ok(stale.every((value) => value === 0));
    assert.equal(source.snapshot().frames.queue.pending, false);
});

test("sem avanço de lastFrame capture admission permanece bloqueada", async () => {
    const source = createSyntheticSource();

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await controller.arm("device-a");
    const result = controller.checkCaptureAdmission();

    assert.equal(result.readyForCapture, false);
    assert.equal(result.reason, "FRAME_NOT_ADVANCED");
});

test("avanço de lastFrame sem frame pendente permanece bloqueado", async () => {
    const source = createSyntheticSource();

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await controller.arm("device-a");
    source.advanceWithoutFrame(11);

    const result = controller.checkCaptureAdmission();

    assert.equal(result.readyForCapture, false);
    assert.equal(result.reason, "FRESH_FRAME_NOT_AVAILABLE");
});

test("frame novo com lastFrame avancado libera admission sem consumir o frame", async () => {
    const source = createSyntheticSource();

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await controller.arm("device-a");
    const fresh = source.pushFreshFrame({
        nextLastFrame: 11,
    });

    const takeCallsBefore =
        source.counts().takeCalls;

    const result = controller.checkCaptureAdmission();

    assert.equal(result.readyForCapture, true);
    assert.equal(result.reason, "FRESH_FRAME_READY");
    assert.equal(source.counts().takeCalls, takeCallsBefore);
    assert.equal(source.snapshot().frames.queue.pending, true);
    assert.equal(source.staleFrame(), fresh);
});

test("fresh frame com tamanho inesperado nao libera capture admission", async () => {
    const source = createSyntheticSource();

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await controller.arm("device-a");
    source.pushFreshFrame({
        nextLastFrame: 11,
        byteLength: 7,
    });

    const result = controller.checkCaptureAdmission();

    assert.equal(result.readyForCapture, false);
    assert.equal(result.reason, "FRESH_FRAME_SIZE_INVALID");
});

test("mudanca do contrato de dimensoes apos arm bloqueia capture admission", async () => {
    const source = createSyntheticSource();

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await controller.arm("device-a");
    source.pushFreshFrame({
        nextLastFrame: 11,
    });
    source.changeDimensions();

    const result = controller.checkCaptureAdmission();

    assert.equal(result.readyForCapture, false);
    assert.equal(result.reason, "SOURCE_CONTRACT_CHANGED");
});

test("source que deixa RUNNING apos arm bloqueia capture admission", async () => {
    const source = createSyntheticSource();

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await controller.arm("device-a");
    source.markStopped();

    const result = controller.checkCaptureAdmission();

    assert.equal(result.readyForCapture, false);
    assert.equal(result.reason, "SOURCE_NOT_RUNNING");
});

test("arm rejeita source que ainda nao esta RUNNING", async () => {
    const source = createSyntheticSource({
        running: false,
        withPendingFrame: false,
    });

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await assert.rejects(
        async () => controller.arm("device-a"),
        /RUNNING/,
    );
});

test("controller nao permite segundo arm sem reset", async () => {
    const source = createSyntheticSource();

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await controller.arm("device-a");

    await assert.rejects(
        async () => controller.arm("device-a"),
        /ja esta armado/,
    );

    assert.equal(controller.reset(), true);
    assert.equal(controller.snapshot().armed, false);
});


test("arm detecta violacao de consumidor exclusivo durante drenagem", async () => {
    const source = {
        snapshot() {
            return {
                state: "RUNNING",
                running: true,
                firstFrameSeen: true,
                lastFrame: 10,
                frames: {
                    format: "bgr24",
                    width: 4,
                    height: 4,
                    queue: {
                        capacity: 1,
                        pending: true,
                        pendingBytes: 48,
                    },
                },
            };
        },
        takeLatestFrame() {
            return null;
        },
    };

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await assert.rejects(
        async () => controller.arm("device-a"),
        /exclusive consumer/,
    );
});

test("fresh-frame controller nunca chama start ou stop da fonte", async () => {
    const source = createSyntheticSource();

    const controller =
        createBiometricCalibrationFreshFrameAdmissionController({
            resolveCaptureSource: async () => source,
        });

    await controller.arm("device-a");
    source.pushFreshFrame({
        nextLastFrame: 11,
    });
    controller.checkCaptureAdmission();
    controller.reset();

    assert.deepEqual(
        source.counts(),
        {
            startCalls: 0,
            stopCalls: 0,
            takeCalls: 1,
        },
    );
});
