import {
    createHash,
    createHmac,
    randomUUID,
} from "node:crypto";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SAFE_ID =
    /^[A-Za-z0-9_.:-]{1,160}$/;

const EDGE_PATH =
    "/functions/v1/camera-ia-operational-ingest";

const CAMERA_STATUS =
    new Set([
        "NO_CAMERA_CONFIGURED",
        "NO_ACTIVE_SESSION",
        "SESSION_NO_RECENT_FRAMES",
        "FRAMES_RECENT",
    ]);

const PPE_STATUS =
    new Set([
        "INITIALIZING",
        "WAITING_FOR_FRAMES",
        "PPE_DETECTED",
        "NO_PERSON",
        "STALE",
        "ERROR",
        "UNAVAILABLE",
    ]);

function requireId(
    value,
    name,
) {
    if (
        typeof value !== "string" ||
        !SAFE_ID.test(
            value
        )
    ) {
        throw new TypeError(
            `${name}_invalid`
        );
    }

    return value;
}

function requireUuid(
    value,
    name,
) {
    if (
        typeof value !== "string" ||
        !UUID.test(
            value
        )
    ) {
        throw new TypeError(
            `${name}_invalid`
        );
    }

    return value.toLowerCase();
}

function requireEndpoint(
    value,
) {
    if (
        typeof value !== "string" ||
        value !== value.trim()
    ) {
        throw new TypeError(
            "endpoint_invalid"
        );
    }

    let url;

    try {
        url =
            new URL(
                value
            );
    }
    catch {
        throw new TypeError(
            "endpoint_invalid"
        );
    }

    if (
        url.protocol !== "https:" ||
        url.pathname !== EDGE_PATH ||
        url.search ||
        url.hash ||
        url.username ||
        url.password ||
        url.port ||
        !url.hostname.endsWith(
            ".supabase.co"
        )
    ) {
        throw new TypeError(
            "supabase_https_endpoint_required"
        );
    }

    return url.href;
}

function decodeSecret(
    value,
) {
    if (
        typeof value !== "string" ||
        value.length > 128
    ) {
        throw new TypeError(
            "device_secret_invalid"
        );
    }

    const secret =
        Buffer.from(
            value,
            "base64"
        );

    if (
        secret.length < 32 ||
        secret.length > 64 ||
        secret.toString(
            "base64"
        ) !== value
    ) {
        throw new TypeError(
            "device_secret_invalid"
        );
    }

    return secret;
}

function validCount(
    value,
) {
    return (
        Number.isSafeInteger(
            value
        ) &&
        value >= 0 &&
        value <= 50
    );
}

function validConfidence(
    value,
) {
    return (
        typeof value === "number" &&
        Number.isFinite(
            value
        ) &&
        value >= 0 &&
        value <= 1
    );
}

function normalizePpe(
    value,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(
            value
        ) ||
        typeof value.status !== "string" ||
        !PPE_STATUS.has(
            value.status
        ) ||
        !validCount(
            value.personCount
        )
    ) {
        throw new TypeError(
            "ppe_invalid"
        );
    }

    const keys =
        [
            "hardhat",
            "noHardhat",
            "vest",
            "noVest",
            "person",
        ];

    const counts =
        {};

    const maxConfidence =
        {};

    for (
        const key of
        keys
    ) {
        const count =
            value.counts?.[
                key
            ];

        const confidence =
            value.maxConfidence?.[
                key
            ];

        if (
            !validCount(
                count
            ) ||
            !validConfidence(
                confidence
            )
        ) {
            throw new TypeError(
                "ppe_contract_invalid"
            );
        }

        counts[
            key
        ] =
            count;

        maxConfidence[
            key
        ] =
            confidence;
    }

    if (
        value.status !==
            "PPE_DETECTED" &&
        (
            value.personCount !== 0 ||
            keys.some(
                (
                    key
                ) =>
                    counts[
                        key
                    ] !== 0 ||
                    maxConfidence[
                        key
                    ] !== 0
            )
        )
    ) {
        throw new TypeError(
            "ppe_unmeasured_invalid"
        );
    }

    return Object.freeze({
        status:
            value.status,

        personCount:
            value.personCount,

        counts:
            Object.freeze(
                counts
            ),

        maxConfidence:
            Object.freeze(
                maxConfidence
            ),
    });
}

function normalizeTelemetry(
    value,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(
            value
        ) ||
        typeof value.cameraStatus !==
            "string" ||
        !CAMERA_STATUS.has(
            value.cameraStatus
        ) ||
        typeof value.framesRecent !==
            "boolean" ||
        value.framesRecent !==
            (
                value.cameraStatus ===
                "FRAMES_RECENT"
            ) ||
        !Number.isSafeInteger(
            value.frameCount
        ) ||
        value.frameCount < 0 ||
        typeof value.observedAt !==
            "string" ||
        !Number.isFinite(
            Date.parse(
                value.observedAt
            )
        )
    ) {
        throw new TypeError(
            "telemetry_invalid"
        );
    }

    return Object.freeze({
        cameraStatus:
            value.cameraStatus,

        framesRecent:
            value.framesRecent,

        frameCount:
            value.frameCount,

        observedAt:
            value.observedAt,

        ppe:
            normalizePpe(
                value.ppe
            ),
    });
}

export function createOperationalTelemetryPublisher({
    endpointUrl,
    deviceId,
    cameraId,
    tenantId,
    empresaId,
    deviceSecretBase64,
    fetchImpl =
        globalThis.fetch,
    nowImpl =
        Date.now,
    nonceImpl =
        randomUUID,
    eventIdImpl =
        randomUUID,
    timeoutMs =
        5000,
} = {}) {
    const endpoint =
        requireEndpoint(
            endpointUrl
        );

    const boundDevice =
        requireId(
            deviceId,
            "device_id"
        );

    const boundCamera =
        requireId(
            cameraId,
            "camera_id"
        );

    const boundTenant =
        requireUuid(
            tenantId,
            "tenant_id"
        );

    const boundEmpresa =
        requireUuid(
            empresaId,
            "empresa_id"
        );

    const secret =
        decodeSecret(
            deviceSecretBase64
        );

    if (
        typeof fetchImpl !== "function" ||
        typeof nowImpl !== "function" ||
        typeof nonceImpl !== "function" ||
        typeof eventIdImpl !== "function" ||
        !Number.isSafeInteger(
            timeoutMs
        ) ||
        timeoutMs < 100 ||
        timeoutMs > 30000
    ) {
        secret.fill(
            0
        );

        throw new TypeError(
            "publisher_configuration_invalid"
        );
    }

    let closed =
        false;

    let activeController =
        null;

    async function publishTelemetry(
        input,
    ) {
        if (closed) {
            return false;
        }

        let telemetry;

        try {
            telemetry =
                normalizeTelemetry(
                    input
                );
        }
        catch {
            return false;
        }

        const eventId =
            eventIdImpl();

        const nonce =
            nonceImpl();

        if (
            typeof eventId !== "string" ||
            !UUID.test(
                eventId
            ) ||
            typeof nonce !== "string" ||
            !UUID.test(
                nonce
            )
        ) {
            return false;
        }

        const epochSeconds =
            Math.floor(
                nowImpl() /
                1000
            );

        if (
            !Number.isSafeInteger(
                epochSeconds
            ) ||
            epochSeconds <= 0
        ) {
            return false;
        }

        const payload =
            Object.freeze({
                version:
                    1,

                eventId:
                    eventId.toLowerCase(),

                deviceId:
                    boundDevice,

                cameraId:
                    boundCamera,

                tenantId:
                    boundTenant,

                empresaId:
                    boundEmpresa,

                observedAt:
                    telemetry.observedAt,

                camera:
                    Object.freeze({
                        status:
                            telemetry.cameraStatus,

                        framesRecent:
                            telemetry.framesRecent,

                        frameCount:
                            telemetry.frameCount,
                    }),

                ppe:
                    telemetry.ppe,
            });

        const body =
            JSON.stringify(
                payload
            );

        const digest =
            createHash(
                "sha256"
            )
                .update(
                    body,
                    "utf8"
                )
                .digest(
                    "hex"
                );

        const canonical =
            `${epochSeconds}\n${nonce}\n${digest}\n${EDGE_PATH}`;

        const signature =
            createHmac(
                "sha256",
                secret
            )
                .update(
                    canonical,
                    "utf8"
                )
                .digest(
                    "base64url"
                );

        const controller =
            new AbortController();

        activeController =
            controller;

        const timer =
            setTimeout(
                () =>
                    controller.abort(),
                timeoutMs
            );

        timer.unref?.();

        try {
            const response =
                await fetchImpl(
                    endpoint,
                    {
                        method:
                            "POST",

                        headers: {
                            "content-type":
                                "application/json",

                            accept:
                                "application/json",

                            "x-safescan-device-id":
                                boundDevice,

                            "x-safescan-event-id":
                                payload.eventId,

                            "x-safescan-timestamp":
                                String(
                                    epochSeconds
                                ),

                            "x-safescan-nonce":
                                nonce,

                            "x-safescan-signature":
                                signature,
                        },

                        body,

                        cache:
                            "no-store",

                        redirect:
                            "error",

                        credentials:
                            "omit",

                        signal:
                            controller.signal,
                    }
                );

            return (
                response?.ok === true &&
                response.status === 202
            );
        }
        catch {
            return false;
        }
        finally {
            clearTimeout(
                timer
            );

            if (
                activeController ===
                controller
            ) {
                activeController =
                    null;
            }
        }
    }

    function close() {
        closed =
            true;

        activeController?.abort();

        secret.fill(
            0
        );
    }

    return Object.freeze({
        publishTelemetry,
        close,
    });
}