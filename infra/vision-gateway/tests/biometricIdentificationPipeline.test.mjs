import test from "node:test";
import assert from "node:assert/strict";

import {
    BiometricBrokerClientError,
    createBiometricBrokerClient,
} from "../src/identity/biometricBrokerClient.mjs";

import {
    createBiometricIdentificationPipeline,
} from "../src/identity/biometricIdentificationPipeline.mjs";

const TENANT_ID =
    "78e03188-cb88-40ee-95df-82cfbc2022ef";

const EMPRESA_ID =
    "21332ffa-414c-4f9b-91a3-b091daa8e9c4";

const REQUEST_ID =
    "11111111-1111-4111-8111-111111111111";

const PROFILE_ID =
    "sface-2021dec";

const TOKEN =
    "broker-pipeline-test-token-" +
    "x".repeat(
        32,
    );

function createUnitEmbedding() {
    const embedding =
        new Float32Array(
            128,
        );

    embedding[0] =
        1;

    return embedding;
}

function createClient(
    fetchImpl,
) {
    return createBiometricBrokerClient({
        url:
            "https://example.invalid/functions/v1/biometric-broker",
        token:
            TOKEN,
        fetchImpl,
    });
}

test(
    "encaminha SFace normalizado ao biometricBrokerClient.identify sem alterar o embedding",
    async () => {
        const observedEmbedding =
            createUnitEmbedding();

        let captured =
            null;

        const brokerClient =
            createClient(
                async (
                    url,
                    options,
                ) => {
                    captured =
                        Object.freeze({
                            url,
                            options,
                            body:
                                JSON.parse(
                                    options.body,
                                ),
                        });

                    return new Response(
                        JSON.stringify({
                            ok:
                                true,
                            operation:
                                "identify",
                            result: {
                                status:
                                    "NO_REFERENCE",
                                candidateCount:
                                    0,
                                top1:
                                    null,
                                top2:
                                    null,
                                margin:
                                    null,
                                fineVerification:
                                    null,
                                thresholds:
                                    null,
                                decision:
                                    null,
                            },
                        }),
                        {
                            status:
                                200,
                            headers: {
                                "content-type":
                                    "application/json",
                            },
                        },
                    );
                },
            );

        const pipeline =
            createBiometricIdentificationPipeline({
                brokerClient,
            });

        const result =
            await pipeline.identifySface({
                tenantId:
                    TENANT_ID,
                empresaId:
                    EMPRESA_ID,
                profileId:
                    PROFILE_ID,
                requestId:
                    REQUEST_ID,
                observedEmbedding,
            });

        assert.equal(
            captured.url,
            "https://example.invalid/functions/v1/biometric-broker",
        );

        assert.equal(
            captured.body.operation,
            "identify",
        );

        assert.deepEqual(
            Object.keys(
                captured.body.input,
            ).sort(),
            [
                "empresaId",
                "observedEmbedding",
                "profileId",
                "requestId",
                "tenantId",
            ],
        );

        assert.equal(
            captured.body.input.tenantId,
            TENANT_ID,
        );

        assert.equal(
            captured.body.input.empresaId,
            EMPRESA_ID,
        );

        assert.equal(
            captured.body.input.profileId,
            PROFILE_ID,
        );

        assert.equal(
            captured.body.input.requestId,
            REQUEST_ID,
        );

        assert.equal(
            captured.body.input.observedEmbedding.length,
            128,
        );

        assert.equal(
            captured.body.input.observedEmbedding[0],
            1,
        );

        assert.equal(
            observedEmbedding[0],
            1,
        );

        assert.equal(
            result.status,
            "NO_REFERENCE",
        );

        assert.equal(
            result.thresholds,
            null,
        );

        assert.equal(
            result.decision,
            null,
        );
    },
);

test(
    "rejeita embedding SFace invalido antes de chamar o broker client",
    async () => {
        let fetchCalled =
            false;

        const brokerClient =
            createClient(
                async () => {
                    fetchCalled =
                        true;

                    throw new Error(
                        "fetch fake nao deveria ser chamado",
                    );
                },
            );

        const pipeline =
            createBiometricIdentificationPipeline({
                brokerClient,
            });

        const invalid =
            new Float32Array(
                128,
            );

        invalid[0] =
            2;

        await assert.rejects(
            () =>
                pipeline.identifySface({
                    tenantId:
                        TENANT_ID,
                    empresaId:
                        EMPRESA_ID,
                    profileId:
                        PROFILE_ID,
                    requestId:
                        REQUEST_ID,
                    observedEmbedding:
                        invalid,
                }),
            /EMBEDDING_NOT_L2_NORMALIZED/,
        );

        assert.equal(
            fetchCalled,
            false,
        );
    },
);

test(
    "propaga erro controlado do biometricBrokerClient sem transformar em decisao local",
    async () => {
        const brokerClient =
            createClient(
                async () => {
                    throw new Error(
                        "synthetic-network-failure",
                    );
                },
            );

        const pipeline =
            createBiometricIdentificationPipeline({
                brokerClient,
            });

        await assert.rejects(
            () =>
                pipeline.identifySface({
                    tenantId:
                        TENANT_ID,
                    empresaId:
                        EMPRESA_ID,
                    profileId:
                        PROFILE_ID,
                    requestId:
                        REQUEST_ID,
                    observedEmbedding:
                        createUnitEmbedding(),
                }),
            (
                error,
            ) => {
                assert.equal(
                    error instanceof
                        BiometricBrokerClientError,
                    true,
                );

                assert.equal(
                    error.code,
                    "BROKER_NETWORK_ERROR",
                );

                assert.equal(
                    error.status,
                    null,
                );

                assert.equal(
                    error.message.includes(
                        TOKEN,
                    ),
                    false,
                );

                return true;
            },
        );
    },
);

test(
    "exige brokerClient com identify e nao cria transporte proprio",
    () => {
        assert.throws(
            () =>
                createBiometricIdentificationPipeline(),
            /brokerClient\.identify/,
        );

        assert.throws(
            () =>
                createBiometricIdentificationPipeline({
                    brokerClient:
                        {},
                }),
            /brokerClient\.identify/,
        );
    },
);
