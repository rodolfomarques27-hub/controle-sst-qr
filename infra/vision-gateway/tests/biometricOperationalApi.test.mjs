import test from "node:test";
import assert from "node:assert/strict";

import {
    createGatewayRuntime,
} from "../src/index.mjs";

import {
    createHealthServer,
} from "../src/http/healthServer.mjs";

const CAMERA_ID =
    "gate-test-01";

const BROKER_TOKEN =
    "0123456789abcdef0123456789abcdef";

function createEnv({
    broker =
        true,
} = {}) {
    const env =
        {
            SAFESCAN_VISION_HOST:
                "127.0.0.1",

            SAFESCAN_VISION_PORT:
                "8787",

            SAFESCAN_FFMPEG_PATH:
                "ffmpeg",

            SAFESCAN_CAMERA_ID:
                CAMERA_ID,

            SAFESCAN_CAMERA_HOST:
                "camera.test.local",

            SAFESCAN_CAMERA_PORT:
                "554",

            SAFESCAN_CAMERA_PATH:
                "/onvif1",

            SAFESCAN_CAMERA_TRANSPORT:
                "udp",
        };

    if (broker) {
        env.SAFESCAN_BIOMETRIC_BROKER_URL =
            "https://broker.example.test";

        env.SAFESCAN_BIOMETRIC_BROKER_TOKEN =
            BROKER_TOKEN;

        env.SAFESCAN_BIOMETRIC_BROKER_TIMEOUT_MS =
            "1000";
    }

    return env;
}

function createDeferred() {
    let resolve;
    let reject;

    const promise =
        new Promise(
            (
                resolvePromise,
                rejectPromise,
            ) => {
                resolve =
                    resolvePromise;

                reject =
                    rejectPromise;
            },
        );

    return {
        promise,
        resolve,
        reject,
    };
}

function createStartOptions() {
    return {
        pollIntervalMs:
            25,

        alignmentPolicy: {
            paddingRatio:
                0.2,

            minFaceSizePx:
                40,

            minVisibleAreaRatio:
                0.7,

            maxRmsError:
                8,
        },

        getIdentificationContext() {
            return {
                tenantId:
                    "11111111-1111-4111-8111-111111111111",

                empresaId:
                    "22222222-2222-4222-8222-222222222222",

                profileId:
                    "sface-test-profile",

                requestId:
                    "33333333-3333-4333-8333-333333333333",
            };
        },
    };
}

function createRuntimeStub({
    shutdownDeferred =
        null,

    lastResult =
        null,
} = {}) {
    let state =
        "READY";

    let running =
        false;

    return {
        start() {
            if (running) {
                return false;
            }

            running =
                true;

            state =
                "RUNNING";

            return true;
        },

        stop() {
            const wasRunning =
                running;

            running =
                false;

            state =
                "STOPPED";

            return wasRunning;
        },

        async shutdown() {
            running =
                false;

            state =
                "STOPPED";

            if (shutdownDeferred) {
                await shutdownDeferred.promise;
            }

            return true;
        },

        snapshot() {
            return {
                state,
                running,

                frameLoop: {
                    state:
                        running
                            ? "WAITING_FRAME"
                            : "STOPPED",

                    running,

                    processing:
                        running,

                    scheduled:
                        running,

                    pollIntervalMs:
                        25,

                    processedFrames:
                        12,

                    emptyPolls:
                        3,

                    errorCount:
                        1,

                    lastErrorCode:
                        "BROKER_TIMEOUT",

                    lastResult,
                },
            };
        },
    };
}

function invoke(
    server,
    {
        method =
            "GET",

        url =
            "/health",
    } = {},
) {
    let statusCode =
        null;

    let headers =
        null;

    let body =
        null;

    const response =
        {
            writeHead(
                code,
                nextHeaders,
            ) {
                statusCode =
                    code;

                headers =
                    nextHeaders;
            },

            end(
                value,
            ) {
                body =
                    String(
                        value ?? "",
                    );
            },
        };

    server.emit(
        "request",
        {
            method,
            url,
        },
        response,
    );

    return {
        statusCode,
        headers,
        rawBody:
            body,

        body:
            body
                ? JSON.parse(
                    body,
                )
                : null,
    };
}

function assertNoCors(
    response,
) {
    const keys =
        Object.keys(
            response.headers ??
            {},
        ).map(
            (
                key,
            ) =>
                key.toLowerCase(),
        );

    assert.equal(
        keys.some(
            (
                key,
            ) =>
                key.startsWith(
                    "access-control-",
                ),
        ),
        false,
    );
}

test(
    "/health permanece com o contrato anterior",
    () => {
        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),
            });

        const expected =
            runtime.getSnapshot();

        const response =
            invoke(
                runtime.healthServer.server,
                {
                    url:
                        "/health",
                },
            );

        assert.equal(
            response.statusCode,
            200,
        );

        assert.deepEqual(
            response.body,
            expected,
        );

        assertNoCors(
            response,
        );
    },
);

test(
    "camera valida sem runtime retorna NOT_INITIALIZED sem criar session ou biometria",
    () => {
        let factoryCalls =
            0;

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () => {
                        factoryCalls +=
                            1;

                        return createRuntimeStub();
                    },
            });

        assert.equal(
            runtime.rtspSessions.size,
            0,
        );

        const response =
            invoke(
                runtime.healthServer.server,
                {
                    url:
                        `/api/v1/cameras/${CAMERA_ID}/biometric`,
                },
            );

        assert.equal(
            response.statusCode,
            200,
        );

        assert.deepEqual(
            response.body,
            {
                cameraId:
                    CAMERA_ID,

                state:
                    "NOT_INITIALIZED",

                running:
                    false,

                processing:
                    false,

                processedFrames:
                    0,

                emptyPolls:
                    0,

                errorCount:
                    0,

                lastErrorCode:
                    null,

                lastResult:
                    null,
            },
        );

        assert.equal(
            runtime.rtspSessions.size,
            0,
        );

        assert.equal(
            factoryCalls,
            0,
        );

        assertNoCors(
            response,
        );
    },
);

test(
    "start em andamento aparece como STARTING",
    async () => {
        const deferred =
            createDeferred();

        const biometricRuntime =
            createRuntimeStub();

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () =>
                        deferred.promise,
            });

        const startPromise =
            runtime.startBiometricProcessing(
                CAMERA_ID,
                createStartOptions(),
            );

        const response =
            invoke(
                runtime.healthServer.server,
                {
                    url:
                        `/api/v1/cameras/${CAMERA_ID}/biometric`,
                },
            );

        assert.equal(
            response.statusCode,
            200,
        );

        assert.equal(
            response.body.state,
            "STARTING",
        );

        assert.equal(
            response.body.running,
            false,
        );

        deferred.resolve(
            biometricRuntime,
        );

        await startPromise;

        await runtime.shutdownBiometricProcessing(
            CAMERA_ID,
        );
    },
);

test(
    "runtime RUNNING expoe somente allowlist e sanitiza resultado novamente na fronteira HTTP",
    async () => {
        const forbidden =
            "NAO-PODE-VAZAR";

        const biometricRuntime =
            createRuntimeStub({
                lastResult: {
                    status:
                        "BIOMETRIC_RANKING_AVAILABLE",

                    candidateCount:
                        3,

                    embedding:
                        new Float32Array(
                            128,
                        ),

                    vector:
                        forbidden,

                    cipher:
                        forbidden,

                    token:
                        forbidden,

                    secret:
                        forbidden,

                    password:
                        forbidden,

                    credential:
                        forbidden,

                    frame:
                        new Uint8Array(
                            6,
                        ),

                    image:
                        forbidden,

                    pixel:
                        forbidden,

                    bgr:
                        forbidden,

                    nested: {
                        safe:
                            "ok",

                        token:
                            forbidden,

                        credentials:
                            forbidden,
                    },
                },
            });

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () =>
                        biometricRuntime,
            });

        await runtime.startBiometricProcessing(
            CAMERA_ID,
            createStartOptions(),
        );

        const response =
            invoke(
                runtime.healthServer.server,
                {
                    url:
                        `/api/v1/cameras/${CAMERA_ID}/biometric`,
                },
            );

        assert.equal(
            response.statusCode,
            200,
        );

        assert.equal(
            response.body.state,
            "RUNNING",
        );

        assert.equal(
            response.body.running,
            true,
        );

        assert.equal(
            response.body.processing,
            true,
        );

        assert.equal(
            response.body.processedFrames,
            12,
        );

        assert.equal(
            response.body.emptyPolls,
            3,
        );

        assert.equal(
            response.body.errorCount,
            1,
        );

        assert.equal(
            response.body.lastErrorCode,
            "BROKER_TIMEOUT",
        );

        assert.equal(
            response.body.lastResult.status,
            "BIOMETRIC_RANKING_AVAILABLE",
        );

        assert.equal(
            response.body.lastResult.candidateCount,
            3,
        );

        assert.equal(
            response.body.lastResult.nested.safe,
            "ok",
        );

        const allowedKeys =
            [
                "cameraId",
                "emptyPolls",
                "errorCount",
                "lastErrorCode",
                "lastResult",
                "processedFrames",
                "processing",
                "running",
                "state",
            ];

        assert.deepEqual(
            Object.keys(
                response.body,
            ).sort(),
            allowedKeys.sort(),
        );

        const serialized =
            JSON.stringify(
                response.body,
            );

        assert.equal(
            serialized.includes(
                forbidden,
            ),
            false,
        );

        for (
            const forbiddenKey of
            [
                '"embedding"',
                '"vector"',
                '"cipher"',
                '"token"',
                '"secret"',
                '"password"',
                '"credential"',
                '"credentials"',
                '"frame"',
                '"image"',
                '"pixel"',
                '"bgr"',
            ]
        ) {
            assert.equal(
                serialized
                    .toLowerCase()
                    .includes(
                        forbiddenKey,
                    ),
                false,
            );
        }

        assertNoCors(
            response,
        );

        await runtime.shutdownBiometricProcessing(
            CAMERA_ID,
        );
    },
);

test(
    "runtime parado aparece como STOPPED",
    async () => {
        const biometricRuntime =
            createRuntimeStub();

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () =>
                        biometricRuntime,
            });

        await runtime.startBiometricProcessing(
            CAMERA_ID,
            createStartOptions(),
        );

        await runtime.stopBiometricProcessing(
            CAMERA_ID,
        );

        const response =
            invoke(
                runtime.healthServer.server,
                {
                    url:
                        `/api/v1/cameras/${CAMERA_ID}/biometric`,
                },
            );

        assert.equal(
            response.statusCode,
            200,
        );

        assert.equal(
            response.body.state,
            "STOPPED",
        );

        assert.equal(
            response.body.running,
            false,
        );

        await runtime.shutdownBiometricProcessing(
            CAMERA_ID,
        );
    },
);

test(
    "shutdown em andamento aparece como SHUTTING_DOWN",
    async () => {
        const deferred =
            createDeferred();

        const biometricRuntime =
            createRuntimeStub({
                shutdownDeferred:
                    deferred,
            });

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () =>
                        biometricRuntime,
            });

        await runtime.startBiometricProcessing(
            CAMERA_ID,
            createStartOptions(),
        );

        const shutdownPromise =
            runtime.shutdownBiometricProcessing(
                CAMERA_ID,
            );

        const response =
            invoke(
                runtime.healthServer.server,
                {
                    url:
                        `/api/v1/cameras/${CAMERA_ID}/biometric`,
                },
            );

        assert.equal(
            response.statusCode,
            200,
        );

        assert.equal(
            response.body.state,
            "SHUTTING_DOWN",
        );

        deferred.resolve();

        await shutdownPromise;
    },
);

test(
    "camera inexistente retorna 404 camera_not_found sem criar recursos",
    () => {
        let factoryCalls =
            0;

        const runtime =
            createGatewayRuntime({
                env:
                    createEnv(),

                biometricRuntimeFactory:
                    async () => {
                        factoryCalls +=
                            1;

                        return createRuntimeStub();
                    },
            });

        const response =
            invoke(
                runtime.healthServer.server,
                {
                    url:
                        "/api/v1/cameras/camera-inexistente/biometric",
                },
            );

        assert.equal(
            response.statusCode,
            404,
        );

        assert.deepEqual(
            response.body,
            {
                error:
                    "camera_not_found",
            },
        );

        assert.equal(
            factoryCalls,
            0,
        );

        assert.equal(
            runtime.rtspSessions.size,
            0,
        );

        assertNoCors(
            response,
        );
    },
);

test(
    "erro do provider retorna 500 controlado sem mensagem interna",
    () => {
        const secretMessage =
            "segredo interno que nao pode aparecer";

        const operationalServer =
            createHealthServer({
                getSnapshot:
                    () => ({
                        status:
                            "ok",
                    }),

                getBiometricSnapshot:
                    () => {
                        throw new Error(
                            secretMessage,
                        );
                    },

                logger: {
                    error() {},
                },
            });

        const response =
            invoke(
                operationalServer.server,
                {
                    url:
                        "/api/v1/cameras/gate-test-01/biometric",
                },
            );

        assert.equal(
            response.statusCode,
            500,
        );

        assert.deepEqual(
            response.body,
            {
                error:
                    "internal_error",
            },
        );

        assert.equal(
            response.rawBody.includes(
                secretMessage,
            ),
            false,
        );

        assertNoCors(
            response,
        );
    },
);

test(
    "API operacional nao adiciona CORS e nao aceita metodo mutavel",
    () => {
        const operationalServer =
            createHealthServer({
                getBiometricSnapshot:
                    () => ({
                        cameraId:
                            CAMERA_ID,

                        state:
                            "RUNNING",

                        running:
                            true,

                        processing:
                            false,

                        processedFrames:
                            1,

                        emptyPolls:
                            0,

                        errorCount:
                            0,

                        lastErrorCode:
                            null,

                        lastResult:
                            null,
                    }),
            });

        const getResponse =
            invoke(
                operationalServer.server,
                {
                    url:
                        `/api/v1/cameras/${CAMERA_ID}/biometric`,
                },
            );

        assert.equal(
            getResponse.statusCode,
            200,
        );

        assertNoCors(
            getResponse,
        );

        const postResponse =
            invoke(
                operationalServer.server,
                {
                    method:
                        "POST",

                    url:
                        `/api/v1/cameras/${CAMERA_ID}/biometric`,
                },
            );

        assert.equal(
            postResponse.statusCode,
            404,
        );

        assert.deepEqual(
            postResponse.body,
            {
                error:
                    "not_found",
            },
        );

        assertNoCors(
            postResponse,
        );
    },
);
