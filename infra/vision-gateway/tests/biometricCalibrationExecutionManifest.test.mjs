import test from "node:test";
import assert from "node:assert/strict";

import {
    CALIBRATION_EXECUTION_PHASE,
    evaluateBiometricCalibrationExecutionManifest,
} from "../src/identity/biometricCalibrationExecutionManifest.mjs";

function validManifest() {
    return {
        protocolVersion:
            "r7f-v1",

        profileId:
            "sface-profile-v1",

        datasetVersion:
            "calibration-dataset-v1",

        phase:
            CALIBRATION_EXECUTION_PHASE.CALIBRATION,

        environmentId:
            "portaria-lab",

        participants: [
            {
                participantId:
                    "participant-cal-01",

                sessions: [
                    {
                        sessionId:
                            "session-cal-01",

                        startedAt:
                            "2026-10-13T08:00:00-03:00",

                        completedAt:
                            "2026-10-13T08:10:00-03:00",

                        samples: [
                            {
                                sampleId:
                                    "sample-cal-01-enroll",

                                capturedAt:
                                    "2026-10-13T08:02:00-03:00",

                                captureConditionId:
                                    "condition-normal",

                                deviceId:
                                    "camera-01",
                            },
                            {
                                sampleId:
                                    "sample-cal-01-probe",

                                capturedAt:
                                    "2026-10-13T08:04:00-03:00",

                                captureConditionId:
                                    "condition-oculos",

                                deviceId:
                                    "camera-01",
                            },
                        ],
                    },
                ],
            },
            {
                participantId:
                    "participant-cal-02",

                sessions: [
                    {
                        sessionId:
                            "session-cal-02",

                        startedAt:
                            "2026-10-13T08:20:00-03:00",

                        completedAt:
                            "2026-10-13T08:30:00-03:00",

                        samples: [
                            {
                                sampleId:
                                    "sample-cal-02-enroll",

                                capturedAt:
                                    "2026-10-13T08:22:00-03:00",

                                captureConditionId:
                                    "condition-normal",

                                deviceId:
                                    "camera-01",
                            },
                            {
                                sampleId:
                                    "sample-cal-02-probe",

                                capturedAt:
                                    "2026-10-13T08:24:00-03:00",

                                captureConditionId:
                                    "condition-oculos",

                                deviceId:
                                    "camera-01",
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

function cloneManifest() {
    return JSON.parse(
        JSON.stringify(
            validManifest(),
        ),
    );
}

test(
    "manifest CALIBRATION valido fica pronto para validacao de execucao",
    () => {
        const result =
            evaluateBiometricCalibrationExecutionManifest(
                validManifest(),
            );

        assert.deepEqual(
            result,
            {
                manifestValid:
                    true,

                readyForCalibrationExecutionValidation:
                    true,

                warnings:
                    [],

                blockers:
                    [],
            },
        );
    },
);

test(
    "resultado possui somente as quatro chaves seguras autorizadas",
    () => {
        const result =
            evaluateBiometricCalibrationExecutionManifest(
                validManifest(),
            );

        assert.deepEqual(
            Object.keys(
                result,
            ),
            [
                "manifestValid",
                "readyForCalibrationExecutionValidation",
                "warnings",
                "blockers",
            ],
        );
    },
);

test(
    "phase aceita exclusivamente CALIBRATION",
    () => {
        const manifest =
            cloneManifest();

        manifest.phase =
            "EVALUATION";

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.equal(
            result.manifestValid,
            false,
        );

        assert.deepEqual(
            result.blockers,
            [
                "PHASE_INVALID",
            ],
        );
    },
);

test(
    "campo obrigatorio ausente invalida manifest sem default",
    () => {
        const manifest =
            cloneManifest();

        delete manifest.datasetVersion;

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.equal(
            result.manifestValid,
            false,
        );

        assert.deepEqual(
            result.blockers,
            [
                "MISSING_FIELD",
            ],
        );
    },
);

test(
    "campo extra comum e rejeitado",
    () => {
        const manifest =
            cloneManifest();

        manifest.notes =
            "nao permitido";

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.equal(
            result.manifestValid,
            false,
        );

        assert.deepEqual(
            result.blockers,
            [
                "EXTRA_FIELD",
            ],
        );
    },
);

test(
    "PII e rejeitada pelo contrato",
    () => {
        const manifest =
            cloneManifest();

        manifest.participants[0].cpf =
            "00000000000";

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.equal(
            result.manifestValid,
            false,
        );

        assert.deepEqual(
            result.blockers,
            [
                "FORBIDDEN_FIELD",
            ],
        );
    },
);

test(
    "material biometrico e rejeitado pelo contrato",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[0]
            .sessions[0]
            .samples[0]
            .embedding =
            [
                0.1,
                0.2,
            ];

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.equal(
            result.manifestValid,
            false,
        );

        assert.deepEqual(
            result.blockers,
            [
                "FORBIDDEN_FIELD",
            ],
        );
    },
);

test(
    "score e threshold nao pertencem ao execution manifest",
    () => {
        for (
            const forbiddenKey of
            [
                "score",
                "matchThreshold",
            ]
        ) {
            const manifest =
                cloneManifest();

            manifest
                .participants[0]
                .sessions[0]
                .samples[0][
                    forbiddenKey
                ] =
                0.8;

            const result =
                evaluateBiometricCalibrationExecutionManifest(
                    manifest,
                );

            assert.equal(
                result.manifestValid,
                false,
                forbiddenKey,
            );

            assert.deepEqual(
                result.blockers,
                [
                    "FORBIDDEN_FIELD",
                ],
                forbiddenKey,
            );
        }
    },
);

test(
    "participantId deve ser globalmente unico",
    () => {
        const manifest =
            cloneManifest();

        manifest.participants[1].participantId =
            manifest.participants[0].participantId;

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "DUPLICATE_PARTICIPANT_ID",
            ],
        );
    },
);

test(
    "sessionId deve ser globalmente unico",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[1]
            .sessions[0]
            .sessionId =
            manifest
                .participants[0]
                .sessions[0]
                .sessionId;

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "DUPLICATE_SESSION_ID",
            ],
        );
    },
);

test(
    "sampleId deve ser globalmente unico",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[1]
            .sessions[0]
            .samples[0]
            .sampleId =
            manifest
                .participants[0]
                .sessions[0]
                .samples[0]
                .sampleId;

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "DUPLICATE_SAMPLE_ID",
            ],
        );
    },
);

test(
    "identificador opaco invalido e rejeitado",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[0]
            .participantId =
            "participante com espaco";

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "OPAQUE_ID_INVALID",
            ],
        );
    },
);

test(
    "timestamp fora do formato ISO aceito e rejeitado",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[0]
            .sessions[0]
            .startedAt =
            "13/10/2026 08:00";

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "TIMESTAMP_INVALID",
            ],
        );
    },
);

test(
    "data calendario impossivel e rejeitada",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[0]
            .sessions[0]
            .startedAt =
            "2026-02-30T08:00:00-03:00";

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "TIMESTAMP_INVALID",
            ],
        );
    },
);

test(
    "startedAt nao pode ser posterior a completedAt",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[0]
            .sessions[0]
            .startedAt =
            "2026-10-13T08:11:00-03:00";

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "SESSION_TIME_ORDER_INVALID",
            ],
        );
    },
);

test(
    "capturedAt nao pode ocorrer antes do inicio da sessao",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[0]
            .sessions[0]
            .samples[0]
            .capturedAt =
            "2026-10-13T07:59:59-03:00";

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "SAMPLE_TIME_OUTSIDE_SESSION",
            ],
        );
    },
);

test(
    "capturedAt nao pode ocorrer depois do fim da sessao",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[0]
            .sessions[0]
            .samples[0]
            .capturedAt =
            "2026-10-13T08:10:01-03:00";

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "SAMPLE_TIME_OUTSIDE_SESSION",
            ],
        );
    },
);

test(
    "participants deve ser colecao nao vazia",
    () => {
        const manifest =
            cloneManifest();

        manifest.participants =
            [];

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "EMPTY_COLLECTION",
            ],
        );
    },
);

test(
    "cada participante deve possuir ao menos uma sessao",
    () => {
        const manifest =
            cloneManifest();

        manifest.participants[0].sessions =
            [];

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "EMPTY_COLLECTION",
            ],
        );
    },
);

test(
    "cada sessao deve possuir ao menos uma amostra",
    () => {
        const manifest =
            cloneManifest();

        manifest
            .participants[0]
            .sessions[0]
            .samples =
            [];

        const result =
            evaluateBiometricCalibrationExecutionManifest(
                manifest,
            );

        assert.deepEqual(
            result.blockers,
            [
                "EMPTY_COLLECTION",
            ],
        );
    },
);

test(
    "resultado seguro nao expoe ids PII biometria thresholds ou decisao",
    () => {
        const serialized =
            JSON.stringify(
                evaluateBiometricCalibrationExecutionManifest(
                    validManifest(),
                ),
            ).toLowerCase();

        for (
            const forbidden of
            [
                "participant-cal-01",
                "session-cal-01",
                "sample-cal-01",
                "camera-01",
                "cpf",
                "email",
                "embedding",
                "vector",
                "score",
                "threshold",
                "token",
                "password",
                "credential",
                "productive",
                "decision",
            ]
        ) {
            assert.equal(
                serialized.includes(
                    forbidden,
                ),
                false,
                forbidden,
            );
        }
    },
);
