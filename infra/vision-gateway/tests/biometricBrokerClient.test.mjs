import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import {
    BiometricBrokerClientError,
    createBiometricBrokerClient,
} from "../src/identity/biometricBrokerClient.mjs";

const TENANT_ID = "78e03188-cb88-40ee-95df-82cfbc2022ef";
const EMPRESA_ID = "21332ffa-414c-4f9b-91a3-b091daa8e9c4";
const REQUEST_ID = "11111111-1111-4111-8111-111111111111";
const PROFILE_ID = "sface-2021dec";
const TOKEN = "broker-test-token-" + "x".repeat(32);

function createUnitEmbedding() {
    const embedding = new Float32Array(128);
    embedding[0] = 1;
    return embedding;
}

function createIdentifyInput() {
    return {
        tenantId: TENANT_ID,
        empresaId: EMPRESA_ID,
        profileId: PROFILE_ID,
        requestId: REQUEST_ID,
        observedEmbedding: createUnitEmbedding(),
    };
}

async function startLocalServer(handler) {
    const server = createServer(handler);
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
            server.off("error", reject);
            resolve();
        });
    });
    const address = server.address();
    return {
        server,
        url: `http://127.0.0.1:${address.port}/biometric-broker`,
    };
}

async function closeLocalServer(server) {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
}

function createClient(url, options = {}) {
    return createBiometricBrokerClient({
        url,
        token: TOKEN,
        allowInsecureHttpForTests: true,
        ...options,
    });
}

test("exige HTTPS e token valido", () => {
    assert.throws(
        () => createBiometricBrokerClient({
            url: "http://example.com/biometric-broker",
            token: TOKEN,
        }),
        /HTTPS/,
    );
    assert.throws(
        () => createBiometricBrokerClient({
            url: "https://example.com/biometric-broker",
        }),
        /token do broker/,
    );
    assert.throws(
        () => createBiometricBrokerClient({
            url: "https://example.com/biometric-broker",
            token: "short",
        }),
        /entre 32 e/,
    );
});

test("rejeita embedding nao L2-normalizado", async () => {
    const client = createBiometricBrokerClient({
        url: "https://example.com/biometric-broker",
        token: TOKEN,
        fetchImpl: async () => {
            throw new Error("fetch nao deveria ser chamado");
        },
    });
    const embedding = new Float32Array(128);
    embedding[0] = 2;
    await assert.rejects(
        () => client.identify({
            ...createIdentifyInput(),
            observedEmbedding: embedding,
        }),
        /L2-normalizado/,
    );
});

test("envia contrato identify exato e retorna NO_REFERENCE", async () => {
    let captured = null;
    const { server, url } = await startLocalServer(async (request, response) => {
        const chunks = [];
        for await (const chunk of request) chunks.push(chunk);
        const raw = Buffer.concat(chunks).toString("utf8");
        captured = {
            method: request.method,
            headers: request.headers,
            raw,
            body: JSON.parse(raw),
        };
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({
            ok: true,
            operation: "identify",
            result: {
                status: "NO_REFERENCE",
                candidateCount: 0,
                top1: null,
                top2: null,
                margin: null,
                fineVerification: null,
                thresholds: null,
                decision: null,
            },
        }));
    });

    try {
        const result = await createClient(url).identify(createIdentifyInput());
        assert.equal(captured.method, "POST");
        assert.equal(captured.headers["content-type"], "application/json");
        assert.equal(captured.headers["x-safescan-broker-token"], TOKEN);
        assert.equal(captured.raw.includes(TOKEN), false);
        assert.deepEqual(Object.keys(captured.body), ["operation", "input"]);
        assert.deepEqual(Object.keys(captured.body.input).sort(), [
            "empresaId",
            "observedEmbedding",
            "profileId",
            "requestId",
            "tenantId",
        ]);
        assert.equal(captured.body.input.observedEmbedding.length, 128);
        assert.equal(result.status, "NO_REFERENCE");
        assert.equal(result.candidateCount, 0);
        assert.equal(result.thresholds, null);
        assert.equal(result.decision, null);
    }
    finally {
        await closeLocalServer(server);
    }
});

test("propaga 401 sem expor token", async () => {
    const { server, url } = await startLocalServer((request, response) => {
        request.resume();
        response.writeHead(401, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: false, code: "BROKER_UNAUTHORIZED" }));
    });

    try {
        await assert.rejects(
            () => createClient(url).identify(createIdentifyInput()),
            (error) => {
                assert.equal(error instanceof BiometricBrokerClientError, true);
                assert.equal(error.status, 401);
                assert.equal(error.code, "BROKER_UNAUTHORIZED");
                assert.equal(error.message.includes(TOKEN), false);
                return true;
            },
        );
    }
    finally {
        await closeLocalServer(server);
    }
});

test("propaga falha 5xx como erro controlado", async () => {
    const { server, url } = await startLocalServer((request, response) => {
        request.resume();
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: false, code: "BROKER_NOT_CONFIGURED" }));
    });

    try {
        await assert.rejects(
            () => createClient(url).identify(createIdentifyInput()),
            (error) => {
                assert.equal(error.status, 503);
                assert.equal(error.code, "BROKER_NOT_CONFIGURED");
                return true;
            },
        );
    }
    finally {
        await closeLocalServer(server);
    }
});

test("interrompe chamada quando o timeout e excedido", async () => {
    const { server, url } = await startLocalServer((request, response) => {
        request.resume();
        setTimeout(() => {
            if (!response.destroyed) {
                response.writeHead(200, { "content-type": "application/json" });
                response.end(JSON.stringify({
                    ok: true,
                    operation: "identify",
                    result: { status: "NO_REFERENCE" },
                }));
            }
        }, 200);
    });

    try {
        await assert.rejects(
            () => createClient(url, { timeoutMs: 25 }).identify(createIdentifyInput()),
            (error) => {
                assert.equal(error.code, "BROKER_TIMEOUT");
                assert.equal(error.status, null);
                return true;
            },
        );
    }
    finally {
        await closeLocalServer(server);
    }
});
