import test from "node:test";
import assert from "node:assert/strict";

import {
    evaluateBiometricControlledStudyContract,
} from "../src/identity/biometricControlledStudyContract.mjs";

function validContract() {
    return {
        protocolVersion:
            "r7f-v1",

        profileId:
            "sface-profile-v1",

        calibration: {
            datasetVersion:
                "dataset-calibration-01",

            protocolVersion:
                "r7f-v1",

            profileId:
                "sface-profile-v1",

            environmentId:
                "portaria-lab",

            deviceIds: [
                "camera-01",
            ],

            captureConditionIds: [
                "condicao-normal",
                "condicao-oculos",
            ],

            participantIds: [
                "participant-cal-01",
                "participant-cal-02",
                "participant-cal-03",
            ],

            sessionIds: [
                "session-cal-01",
                "session-cal-02",
                "session-cal-03",
            ],

            plannedCounts: {
                genuineComparisons:
                    12,

                impostorComparisons:
                    12,

                matedSearches:
                    8,

                nonMatedSearches:
                    8,
            },
        },

        evaluation: {
            datasetVersion:
                "dataset-evaluation-01",

            protocolVersion:
                "r7f-v1",

            profileId:
                "sface-profile-v1",

            environmentId:
                "portaria-lab",

            deviceIds: [
                "camera-01",
            ],

            captureConditionIds: [
                "condicao-normal",
                "condicao-oculos",
            ],

            participantIds: [
                "participant-eval-01",
                "participant-eval-02",
                "participant-eval-03",
            ],

            sessionIds: [
                "session-eval-01",
                "session-eval-02",
                "session-eval-03",
            ],

            plannedCounts: {
                genuineComparisons:
                    10,

                impostorComparisons:
                    10,

                matedSearches:
                    6,

                nonMatedSearches:
                    6,
            },
        },

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
                genuineComparisons:
                    8,

                impostorComparisons:
                    8,

                matedSearches:
                    6,

                nonMatedSearches:
                    6,
            },
        },

        acceptancePolicy: {
            maxFmr:
                0.05,

            maxFnmr:
                0.1,

            maxFpir:
                0.05,

            maxFnir:
                0.1,

            minimumEvaluationParticipants:
                3,

            minimumGenuineComparisons:
                8,

            minimumImpostorComparisons:
                8,

            minimumMatedSearches:
                5,

            minimumNonMatedSearches:
                5,
        },
    };
}

function evaluate(
    overrides =
        null,
) {
    const contract =
        validContract();

    if (overrides) {
        overrides(
            contract,
        );
    }

    return evaluateBiometricControlledStudyContract(
        contract,
    );
}

test(
    "contrato R7F valido fica pronto somente em nivel estrutural",
    () => {
        const result =
            evaluate();

        assert.equal(
            result.contractValid,
            true,
        );

        assert.equal(
            result.readyForControlledStudy,
            true,
        );

        assert.deepEqual(
            result.warnings,
            [],
        );

        assert.deepEqual(
            result.blockers,
            [],
        );
    },
);

test(
    "resultado possui somente contractValid readyForControlledStudy warnings e blockers",
    () => {
        const result =
            evaluate();

        assert.deepEqual(
            Object.keys(
                result,
            ),
            [
                "contractValid",
                "readyForControlledStudy",
                "warnings",
                "blockers",
            ],
        );
    },
);

test(
    "campo obrigatorio ausente invalida contrato sem aplicar default",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    delete contract
                        .analysisPolicy
                        .thresholdGrid;
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.equal(
            result.readyForControlledStudy,
            false,
        );

        assert.deepEqual(
            result.blockers,
            [
                "CONTRACT_INVALID",
            ],
        );
    },
);

test(
    "campo extra e rejeitado pelo contrato",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract.extraField =
                        "nao-permitido";
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.ok(
            result.blockers.includes(
                "CONTRACT_INVALID",
            ),
        );
    },
);

test(
    "campo de PII ou material biometrico e rejeitado",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract.calibration.embedding =
                        "material-proibido";
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.equal(
            result.readyForControlledStudy,
            false,
        );
    },
);

test(
    "R7F usa datasetVersion e rejeita datasetId legado",
    () => {
        const contract =
            validContract();

        contract.calibration.datasetId =
            contract.calibration.datasetVersion;

        delete contract
            .calibration
            .datasetVersion;

        const result =
            evaluateBiometricControlledStudyContract(
                contract,
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.equal(
            result.readyForControlledStudy,
            false,
        );

        assert.deepEqual(
            result.blockers,
            [
                "CONTRACT_INVALID",
            ],
        );
    },
);
test(
    "CALIBRATION e EVALUATION nao podem usar o mesmo dataset",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract.evaluation.datasetVersion =
                        contract.calibration.datasetVersion;
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.ok(
            result.blockers.includes(
                "DATASET_OVERLAP",
            ),
        );
    },
);

test(
    "participantes devem ser disjuntos entre CALIBRATION e EVALUATION",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .evaluation
                        .participantIds[0] =
                        contract
                            .calibration
                            .participantIds[0];
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.ok(
            result.blockers.includes(
                "PARTICIPANT_OVERLAP",
            ),
        );
    },
);

test(
    "sessoes devem ser disjuntas entre CALIBRATION e EVALUATION",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .evaluation
                        .sessionIds[0] =
                        contract
                            .calibration
                            .sessionIds[0];
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.ok(
            result.blockers.includes(
                "SESSION_OVERLAP",
            ),
        );
    },
);

test(
    "protocolVersion incompatível bloqueia contrato",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .evaluation
                        .protocolVersion =
                        "r7f-v2";
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.ok(
            result.blockers.includes(
                "PROTOCOL_INCOMPATIBLE",
            ),
        );
    },
);

test(
    "profileId incompatível bloqueia contrato",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .calibration
                        .profileId =
                        "outro-profile";
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.ok(
            result.blockers.includes(
                "PROFILE_INCOMPATIBLE",
            ),
        );
    },
);

test(
    "environment device e capture conditions sao obrigatorios e explicitos",
    () => {
        for (
            const field of
            [
                "environmentId",
                "deviceIds",
                "captureConditionIds",
            ]
        ) {
            const result =
                evaluate(
                    (
                        contract,
                    ) => {
                        delete contract
                            .evaluation[
                                field
                            ];
                    },
                );

            assert.equal(
                result.contractValid,
                false,
                field,
            );
        }
    },
);

test(
    "thresholdGrid rejeita valores fora do intervalo cosine",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .analysisPolicy
                        .thresholdGrid =
                        [
                            0.2,
                            1.01,
                        ];
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );

        assert.equal(
            result.readyForControlledStudy,
            false,
        );
    },
);

test(
    "thresholdGrid deve ser estritamente crescente",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .analysisPolicy
                        .thresholdGrid =
                        [
                            0.6,
                            0.4,
                        ];
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );
    },
);

test(
    "percentilePoints rejeita valor fora de zero a um",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .analysisPolicy
                        .percentilePoints =
                        [
                            0,
                            0.5,
                            1.1,
                        ];
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );
    },
);

test(
    "minimumSampleCounts nao aceita zero ou default silencioso",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .analysisPolicy
                        .minimumSampleCounts
                        .matedSearches =
                        0;
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );
    },
);

test(
    "metricas maximas da acceptancePolicy devem estar entre zero e um",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .acceptancePolicy
                        .maxFpir =
                        1.01;
                },
            );

        assert.equal(
            result.contractValid,
            false,
        );
    },
);

test(
    "plano de CALIBRATION abaixo do minimumSampleCounts nao fica pronto",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .calibration
                        .plannedCounts
                        .genuineComparisons =
                        1;
                },
            );

        assert.equal(
            result.contractValid,
            true,
        );

        assert.equal(
            result.readyForControlledStudy,
            false,
        );

        assert.ok(
            result.blockers.includes(
                "CALIBRATION_MINIMUMS_NOT_MET",
            ),
        );
    },
);

test(
    "EVALUATION abaixo dos minimos de acceptancePolicy nao fica pronta",
    () => {
        const result =
            evaluate(
                (
                    contract,
                ) => {
                    contract
                        .acceptancePolicy
                        .minimumEvaluationParticipants =
                        10;
                },
            );

        assert.equal(
            result.contractValid,
            true,
        );

        assert.equal(
            result.readyForControlledStudy,
            false,
        );

        assert.ok(
            result.blockers.includes(
                "EVALUATION_MINIMUMS_NOT_MET",
            ),
        );
    },
);

test(
    "resultado R7F nao contem PII material biometrico nem threshold produtivo",
    () => {
        const serialized =
            JSON.stringify(
                evaluate(),
            );

        for (
            const forbidden of
            [
                "nome",
                "cpf",
                "email",
                "telefone",
                "matricula",
                "embedding",
                "vector",
                "centroid",
                "cipher",
                "ciphertext",
                "token",
                "password",
                "credential",
                "image",
                "frame",
                "candidateThreshold",
                "matchThreshold",
                "ambiguityMargin",
                "recommendedThreshold",
                "productiveDecision",
                "physicalAccess",
                "sstEligibility",
            ]
        ) {
            assert.equal(
                serialized
                    .toLowerCase()
                    .includes(
                        forbidden.toLowerCase(),
                    ),
                false,
                forbidden,
            );
        }
    },
);
