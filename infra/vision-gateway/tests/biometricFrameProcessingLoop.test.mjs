import test from "node:test";
import assert from "node:assert/strict";

import {
    BIOMETRIC_FRAME_LOOP_STATE,
    createBiometricFrameProcessingLoop,
} from "../src/identity/biometricFrameProcessingLoop.mjs";

const TENANT_ID =
    "11111111-1111-4111-8111-111111111111";

const EMPRESA_ID =
    "22222222-2222-4222-8222-222222222222";

const PROFILE_ID =
    "sface-test-profile";

function createContext(
    requestId =
        "33333333-3333-4333-8333-333333333333",
) {
    return {
        tenantId:
            TENANT_ID,

        empresaId:
            EMPRESA_ID,

        profileId:
            PROFILE_ID,

        requestId,
    };
}

function createFrame(
    value,
    width = 2,
    height = 1,
) {
    return Uint8Array.from(
        Array(
            width *
            height *
            3
        ).fill(
            value,
        ),
    );
}

function createManualTimers() {
    let nextId =
        1;

    const timers =
        new Map();

    function setTimer(
        callback,
        delayMs,
    ) {
        const id =
            nextId++;

        timers.set(
            id,
            {
                callback,
                delayMs,
            },
        );

        return id;
    }

    function clearTimer(
        id,
    ) {
        return timers.delete(
            id,
        );
    }

    function pendingCount() {
        return timers.size;
    }

    function nextDelay() {
        const entry =
            timers
                .values()
                .next()
                .value;

        return entry?.delayMs ??
            null;
    }

    function fireNext() {
        const iterator =
            timers.entries().next();

        if (iterator.done) {
            return null;
        }

        const [
            id,
            entry,
        ] =
            iterator.value;

        timers.delete(
            id,
        );

        return entry.callback();
    }

    return {
        setTimer,
        clearTimer,
        pendingCount,
        nextDelay,
        fireNext,
    };
}

function createLatestSession({
    width = 2,
    height = 1,
} = {}) {
    let latest =
        null;

    let takeCount =
        0;

    let snapshotCount =
        0;

    return {
        push(
            frame,
        ) {
            latest =
                frame;
        },

        takeLatestFrame() {
            takeCount +=
                1;

            const frame =
                latest;

            latest =
                null;

            return frame;
        },

        snapshot() {
            snapshotCount +=
                1;

            return {
                frames: {
                    width,
                    height,
                },
            };
        },

        stats() {
            return {
                takeCount,
                snapshotCount,
            };
        },
    };
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

function createFixture({
    processFrame,
    getIdentificationContext =
        () =>
            createContext(),
    width = 2,
    height = 1,
    pollIntervalMs = 25,
} = {}) {
    const timers =
        createManualTimers();

    const session =
        createLatestSession({
            width,
            height,
        });

    const calls =
        [];

    const orchestrator = {
        async processFrame(
            input,
        ) {
            calls.push(
                input,
            );

            if (processFrame) {
                return processFrame(
                    input,
                    calls.length,
                );
            }

            return {
                status:
                    "NO_REFERENCE",
            };
        },
    };

    const loop =
        createBiometricFrameProcessingLoop({
            session,
            orchestrator,
            getIdentificationContext,
            pollIntervalMs,
            setTimer:
                timers.setTimer,
            clearTimer:
                timers.clearTimer,
        });

    return {
        loop,
        session,
        timers,
        calls,
    };
}

test(
    "fila vazia nao chama orquestrador e agenda proxima leitura",
    async () => {
        const fixture =
            createFixture();

        assert.equal(
            fixture.loop.start(),
            true,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            1,
        );

        assert.equal(
            fixture.timers.nextDelay(),
            25,
        );

        await fixture.timers.fireNext();

        assert.equal(
            fixture.calls.length,
            0,
        );

        assert.equal(
            fixture.loop.snapshot().emptyPolls,
            1,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            1,
        );
    },
);

test(
    "frame disponivel envia BGR, dimensoes e contexto corretos ao orquestrador",
    async () => {
        const fixture =
            createFixture();

        fixture.session.push(
            createFrame(
                7,
            ),
        );

        fixture.loop.start();

        await fixture.timers.fireNext();

        assert.equal(
            fixture.calls.length,
            1,
        );

        const input =
            fixture.calls[0];

        assert.ok(
            input.data instanceof
            Uint8Array,
        );

        assert.equal(
            input.data.byteLength,
            6,
        );

        assert.equal(
            input.width,
            2,
        );

        assert.equal(
            input.height,
            1,
        );

        assert.equal(
            input.tenantId,
            TENANT_ID,
        );

        assert.equal(
            input.empresaId,
            EMPRESA_ID,
        );

        assert.equal(
            input.profileId,
            PROFILE_ID,
        );

        assert.equal(
            input.requestId,
            "33333333-3333-4333-8333-333333333333",
        );

        assert.equal(
            fixture.loop.snapshot().processedFrames,
            1,
        );
    },
);

test(
    "start duplicado nao cria dois timers nem dois loops",
    () => {
        const fixture =
            createFixture();

        assert.equal(
            fixture.loop.start(),
            true,
        );

        assert.equal(
            fixture.loop.start(),
            false,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            1,
        );

        assert.equal(
            fixture.loop.snapshot().state,
            BIOMETRIC_FRAME_LOOP_STATE.WAITING_FRAME,
        );
    },
);

test(
    "processamento lento nunca executa duas inferencias simultaneas e consome somente frame mais recente depois",
    async () => {
        const deferred =
            createDeferred();

        let active =
            0;

        let maxActive =
            0;

        const processedValues =
            [];

        const fixture =
            createFixture({
                async processFrame(
                    input,
                    callNumber,
                ) {
                    active +=
                        1;

                    maxActive =
                        Math.max(
                            maxActive,
                            active,
                        );

                    processedValues.push(
                        input.data[0],
                    );

                    if (callNumber === 1) {
                        await deferred.promise;
                    }

                    active -=
                        1;

                    return {
                        status:
                            "FRAME_PROCESSED",
                    };
                },
            });

        fixture.session.push(
            createFrame(
                1,
            ),
        );

        fixture.loop.start();

        const firstRun =
            fixture.timers.fireNext();

        await Promise.resolve();
        await Promise.resolve();

        assert.equal(
            fixture.loop.snapshot().processing,
            true,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            0,
        );

        fixture.session.push(
            createFrame(
                2,
            ),
        );

        fixture.session.push(
            createFrame(
                3,
            ),
        );

        assert.equal(
            fixture.loop.start(),
            false,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            0,
        );

        deferred.resolve();

        await firstRun;

        assert.equal(
            fixture.timers.pendingCount(),
            1,
        );

        await fixture.timers.fireNext();

        assert.deepEqual(
            processedValues,
            [
                1,
                3,
            ],
        );

        assert.equal(
            maxActive,
            1,
        );

        assert.equal(
            fixture.loop.snapshot().processedFrames,
            2,
        );
    },
);

test(
    "snapshot remove frame bruto, embedding, token e credenciais de resultado operacional",
    async () => {
        const fixture =
            createFixture({
                processFrame() {
                    return {
                        status:
                            "BIOMETRIC_RANKING_AVAILABLE",

                        frame:
                            createFrame(
                                9,
                            ),

                        embedding:
                            new Float32Array(
                                128,
                            ),

                        token:
                            "nao-vazar",

                        nested: {
                            credentials:
                                "nao-vazar",

                            password:
                                "nao-vazar",

                            safe:
                                "ok",
                        },
                    };
                },
            });

        fixture.session.push(
            createFrame(
                1,
            ),
        );

        fixture.loop.start();

        await fixture.timers.fireNext();

        const snapshot =
            fixture.loop.snapshot();

        const serialized =
            JSON.stringify(
                snapshot,
            );

        assert.equal(
            serialized.includes(
                "nao-vazar",
            ),
            false,
        );

        assert.equal(
            serialized.toLowerCase().includes(
                "embedding",
            ),
            false,
        );

        assert.equal(
            serialized.toLowerCase().includes(
                '"frame"',
            ),
            false,
        );

        assert.equal(
            snapshot.lastResult.nested.safe,
            "ok",
        );
    },
);

test(
    "erro inesperado do orquestrador fica controlado e loop continua vivo sem vazar mensagem",
    async () => {
        let attempt =
            0;

        const fixture =
            createFixture({
                processFrame() {
                    attempt +=
                        1;

                    if (attempt === 1) {
                        const error =
                            new Error(
                                "segredo-na-mensagem",
                            );

                        error.code =
                            "BROKER_TIMEOUT";

                        throw error;
                    }

                    return {
                        status:
                            "FRAME_PROCESSED",
                    };
                },
            });

        fixture.session.push(
            createFrame(
                1,
            ),
        );

        fixture.loop.start();

        await fixture.timers.fireNext();

        let snapshot =
            fixture.loop.snapshot();

        assert.equal(
            snapshot.errorCount,
            1,
        );

        assert.equal(
            snapshot.lastErrorCode,
            "BROKER_TIMEOUT",
        );

        assert.equal(
            JSON.stringify(
                snapshot,
            ).includes(
                "segredo-na-mensagem",
            ),
            false,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            1,
        );

        fixture.session.push(
            createFrame(
                2,
            ),
        );

        await fixture.timers.fireNext();

        snapshot =
            fixture.loop.snapshot();

        assert.equal(
            snapshot.processedFrames,
            1,
        );

        assert.equal(
            snapshot.lastErrorCode,
            null,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            1,
        );
    },
);

test(
    "falha no contexto impede orquestrador e loop permanece agendado",
    async () => {
        const fixture =
            createFixture({
                getIdentificationContext() {
                    throw new Error(
                        "contexto secreto",
                    );
                },
            });

        fixture.session.push(
            createFrame(
                1,
            ),
        );

        fixture.loop.start();

        await fixture.timers.fireNext();

        const snapshot =
            fixture.loop.snapshot();

        assert.equal(
            fixture.calls.length,
            0,
        );

        assert.equal(
            snapshot.errorCount,
            1,
        );

        assert.equal(
            snapshot.lastErrorCode,
            "IDENTIFICATION_CONTEXT_FAILED",
        );

        assert.equal(
            JSON.stringify(
                snapshot,
            ).includes(
                "contexto secreto",
            ),
            false,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            1,
        );
    },
);

test(
    "stop cancela timer pendente e deixa loop parado",
    () => {
        const fixture =
            createFixture();

        fixture.loop.start();

        assert.equal(
            fixture.timers.pendingCount(),
            1,
        );

        assert.equal(
            fixture.loop.stop(),
            true,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            0,
        );

        const snapshot =
            fixture.loop.snapshot();

        assert.equal(
            snapshot.running,
            false,
        );

        assert.equal(
            snapshot.processing,
            false,
        );

        assert.equal(
            snapshot.state,
            BIOMETRIC_FRAME_LOOP_STATE.STOPPED,
        );
    },
);

test(
    "stop durante processamento impede nova iteracao depois da conclusao",
    async () => {
        const deferred =
            createDeferred();

        const fixture =
            createFixture({
                async processFrame() {
                    await deferred.promise;

                    return {
                        status:
                            "FRAME_PROCESSED",
                    };
                },
            });

        fixture.session.push(
            createFrame(
                1,
            ),
        );

        fixture.loop.start();

        const running =
            fixture.timers.fireNext();

        await Promise.resolve();
        await Promise.resolve();

        assert.equal(
            fixture.loop.snapshot().processing,
            true,
        );

        assert.equal(
            fixture.loop.stop(),
            true,
        );

        deferred.resolve();

        await running;

        assert.equal(
            fixture.timers.pendingCount(),
            0,
        );

        assert.equal(
            fixture.loop.snapshot().state,
            BIOMETRIC_FRAME_LOOP_STATE.STOPPED,
        );
    },
);

test(
    "frame com tamanho incompatível vira erro controlado sem chamar orquestrador",
    async () => {
        const fixture =
            createFixture();

        fixture.session.push(
            new Uint8Array(
                5,
            ),
        );

        fixture.loop.start();

        await fixture.timers.fireNext();

        const snapshot =
            fixture.loop.snapshot();

        assert.equal(
            fixture.calls.length,
            0,
        );

        assert.equal(
            snapshot.errorCount,
            1,
        );

        assert.equal(
            snapshot.lastErrorCode,
            "SESSION_FRAME_INVALID",
        );

        assert.equal(
            fixture.timers.pendingCount(),
            1,
        );
    },
);
test(
    "whenIdle resolve imediatamente quando nao existe processamento ativo",
    async () => {
        const fixture =
            createFixture();

        let resolved =
            false;

        const idlePromise =
            fixture.loop
                .whenIdle()
                .then(
                    () => {
                        resolved =
                            true;
                    },
                );

        await idlePromise;

        assert.equal(
            resolved,
            true,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            0,
        );

        assert.equal(
            fixture.loop.snapshot().state,
            BIOMETRIC_FRAME_LOOP_STATE.STOPPED,
        );
    },
);

test(
    "stop seguido de whenIdle aguarda processamento ativo antes de resolver",
    async () => {
        const deferred =
            createDeferred();

        const fixture =
            createFixture({
                async processFrame() {
                    await deferred.promise;

                    return {
                        status:
                            "FRAME_PROCESSED",
                    };
                },
            });

        fixture.session.push(
            createFrame(
                1,
            ),
        );

        fixture.loop.start();

        const running =
            fixture.timers.fireNext();

        await Promise.resolve();
        await Promise.resolve();

        assert.equal(
            fixture.loop.snapshot().processing,
            true,
        );

        assert.equal(
            fixture.loop.stop(),
            true,
        );

        let idleResolved =
            false;

        const idlePromise =
            fixture.loop
                .whenIdle()
                .then(
                    () => {
                        idleResolved =
                            true;
                    },
                );

        await Promise.resolve();

        assert.equal(
            idleResolved,
            false,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            0,
        );

        deferred.resolve();

        await running;
        await idlePromise;

        assert.equal(
            idleResolved,
            true,
        );

        assert.equal(
            fixture.timers.pendingCount(),
            0,
        );

        assert.equal(
            fixture.loop.snapshot().processing,
            false,
        );

        assert.equal(
            fixture.loop.snapshot().state,
            BIOMETRIC_FRAME_LOOP_STATE.STOPPED,
        );
    },
);
