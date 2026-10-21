import {
    setTimeout as delay,
} from "node:timers/promises";

import {
    createPpeDetector,
} from "../src/detection/ppeDetector.mjs";

const EMPTY_COUNTS =
    Object.freeze({
        hardhat: 0,
        noHardhat: 0,
        vest: 0,
        noVest: 0,
        person: 0,
    });

const EMPTY_CONFIDENCE =
    Object.freeze({
        hardhat: 0,
        noHardhat: 0,
        vest: 0,
        noVest: 0,
        person: 0,
    });

function emptySnapshot(
    status,
) {
    return {
        status,
        personCount: 0,
        counts:
            {
                ...EMPTY_COUNTS,
            },
        maxConfidence:
            {
                ...EMPTY_CONFIDENCE,
            },
        updatedAt: null,
    };
}

export function createPpePresenceDevMonitor({
    runtime,
    cameraId,
    modelPath,
    now =
        () =>
            Date.now(),
    intervalMs =
        3000,
    freshForMs =
        10000,
} = {}) {
    if (
        !runtime?.rtspSessions ||
        !cameraId ||
        typeof modelPath !==
            "string" ||
        !modelPath.trim() ||
        !Number.isInteger(
            intervalMs,
        ) ||
        intervalMs < 1000 ||
        intervalMs > 10000
    ) {
        throw new TypeError(
            "INVALID_PPE_MONITOR_CONFIGURATION",
        );
    }

    let state =
        "INITIALIZING";

    let summary =
        emptySnapshot(
            state,
        );

    let sampledAt =
        null;

    let task =
        null;

    let abort =
        null;

    let closed =
        false;

    function snapshot() {
        const age =
            sampledAt === null
                ? Infinity
                : now() -
                    sampledAt;

        if (
            closed ||
            state ===
                "STOPPED"
        ) {
            return emptySnapshot(
                "UNAVAILABLE",
            );
        }

        if (
            (
                state ===
                    "PPE_DETECTED" ||
                state ===
                    "NO_PERSON"
            ) &&
            (
                age < 0 ||
                age >
                    freshForMs
            )
        ) {
            return emptySnapshot(
                "STALE",
            );
        }

        return {
            status:
                state,

            personCount:
                state ===
                    "PPE_DETECTED"
                    ? summary.personCount
                    : 0,

            counts:
                state ===
                    "PPE_DETECTED"
                    ? {
                        ...summary.counts,
                    }
                    : {
                        ...EMPTY_COUNTS,
                    },

            maxConfidence:
                state ===
                    "PPE_DETECTED"
                    ? {
                        ...summary.maxConfidence,
                    }
                    : {
                        ...EMPTY_CONFIDENCE,
                    },

            updatedAt:
                (
                    state ===
                        "PPE_DETECTED" ||
                    state ===
                        "NO_PERSON"
                ) &&
                sampledAt !==
                    null
                    ? new Date(
                        sampledAt,
                    ).toISOString()
                    : null,
        };
    }

    async function run(
        signal,
    ) {
        let detector =
            null;

        try {
            detector =
                await createPpeDetector({
                    modelPath,
                    confidenceThreshold:
                        0.25,
                    nmsThreshold:
                        0.45,
                    maxDetections:
                        100,
                });

            state =
                "WAITING_FOR_FRAMES";

            summary =
                emptySnapshot(
                    state,
                );

            while (
                !signal.aborted
            ) {
                const session =
                    runtime.rtspSessions.get(
                        cameraId,
                    );

                const geometry =
                    session
                        ?.snapshot
                        ?.()
                        ?.frames;

                const bytes =
                    session
                        ?.takeLatestFrame
                        ?.();

                if (
                    bytes instanceof
                        Uint8Array &&
                    Number.isSafeInteger(
                        geometry?.width,
                    ) &&
                    Number.isSafeInteger(
                        geometry?.height,
                    ) &&
                    geometry.width >
                        0 &&
                    geometry.height >
                        0 &&
                    bytes.length ===
                        geometry.width *
                        geometry.height *
                        3
                ) {
                    try {
                        const result =
                            await detector.detectBgr({
                                data:
                                    bytes,
                                width:
                                    geometry.width,
                                height:
                                    geometry.height,
                            });

                        if (
                            !result ||
                            !Number.isSafeInteger(
                                result.personCount,
                            ) ||
                            result.personCount <
                                0 ||
                            !result.counts ||
                            !result.maxConfidence
                        ) {
                            throw new TypeError(
                                "INVALID_PPE_RESULT",
                            );
                        }

                        if (
                            !signal.aborted
                        ) {
                            sampledAt =
                                now();

                            const hasVisualPresence =
                                result.personCount >
                                    0 ||
                                [
                                    "person",
                                    "hardhat",
                                    "noHardhat",
                                    "vest",
                                    "noVest",
                                ].some(
                                    (
                                        key,
                                    ) =>
                                        Number.isSafeInteger(
                                            result.counts[
                                                key
                                            ],
                                        ) &&
                                        result.counts[
                                            key
                                        ] >
                                            0,
                                );

                            if (
                                hasVisualPresence
                            ) {
                                state =
                                    "PPE_DETECTED";

                                summary =
                                    result;
                            }
                            else {
                                state =
                                    "NO_PERSON";

                                summary =
                                    emptySnapshot(
                                        state,
                                    );
                            }
                        }
                    }
                    finally {
                        bytes.fill(
                            0,
                        );
                    }
                }
                else if (
                    sampledAt ===
                        null ||
                    now() -
                        sampledAt >
                        freshForMs
                ) {
                    state =
                        "WAITING_FOR_FRAMES";

                    summary =
                        emptySnapshot(
                            state,
                        );

                    sampledAt =
                        null;
                }

                try {
                    await delay(
                        intervalMs,
                        undefined,
                        {
                            signal,
                        },
                    );
                }
                catch (
                    error
                ) {
                    if (
                        !signal.aborted
                    ) {
                        throw error;
                    }
                }
            }
        }
        catch {
            if (
                !signal.aborted
            ) {
                state =
                    "ERROR";

                summary =
                    emptySnapshot(
                        state,
                    );

                sampledAt =
                    null;
            }
        }
        finally {
            if (detector) {
                try {
                    await detector.release();
                }
                catch {
                    state =
                        "ERROR";
                }
            }
        }
    }

    function start() {
        if (
            closed ||
            task
        ) {
            return false;
        }

        abort =
            new AbortController();

        task =
            run(
                abort.signal,
            );

        return true;
    }

    async function stop() {
        if (closed) {
            return true;
        }

        closed =
            true;

        abort?.abort();

        if (task) {
            await task;
        }

        state =
            "STOPPED";

        summary =
            emptySnapshot(
                state,
            );

        sampledAt =
            null;

        return true;
    }

    return Object.freeze({
        start,
        stop,
        snapshot,
    });
}