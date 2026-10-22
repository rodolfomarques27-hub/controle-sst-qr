const PATH =
    "/functions/v1/camera-ia-operational-ingest";

const SAFE_ID =
    /^[A-Za-z0-9_.:-]{1,160}$/;

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TIMESTAMP =
    /^[1-9][0-9]{0,11}$/;

const SIGNATURE =
    /^[A-Za-z0-9_-]{43}$/;

const MAX_BODY_BYTES =
    4096;

const MAX_SKEW_SECONDS =
    120;

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

const PAYLOAD_KEYS =
    [
        "version",
        "eventId",
        "deviceId",
        "cameraId",
        "tenantId",
        "empresaId",
        "observedAt",
        "camera",
        "ppe",
    ];

const CAMERA_KEYS =
    [
        "status",
        "framesRecent",
        "frameCount",
    ];

const PPE_KEYS =
    [
        "status",
        "personCount",
        "counts",
        "maxConfidence",
    ];

const PPE_VALUE_KEYS =
    [
        "hardhat",
        "noHardhat",
        "vest",
        "noVest",
        "person",
    ];

function response(
    status,
    code,
) {
    return new Response(
        JSON.stringify({
            ok:
                status >= 200 &&
                status < 300,

            code,
        }),
        {
            status,

            headers: {
                "content-type":
                    "application/json; charset=utf-8",

                "cache-control":
                    "no-store, private",

                "x-content-type-options":
                    "nosniff",

                "referrer-policy":
                    "no-referrer",
            },
        },
    );
}

function exactKeys(
    value,
    expected,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return false;
    }

    const keys =
        Object.keys(value);

    return (
        keys.length ===
            expected.length &&
        expected.every(
            (
                key,
                index,
            ) =>
                keys[index] ===
                key,
        )
    );
}

function safeCount(
    value,
) {
    return (
        Number.isSafeInteger(value) &&
        value >= 0 &&
        value <= 50
    );
}

function safeConfidence(
    value,
) {
    return (
        typeof value === "number" &&
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 1
    );
}

function canonicalBase64Key(
    input,
) {
    if (
        typeof input !== "string" ||
        input.length > 128 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(
            input,
        )
    ) {
        return null;
    }

    try {
        const binary =
            atob(input);

        if (
            binary.length < 32 ||
            binary.length > 64 ||
            btoa(binary) !==
                input
        ) {
            return null;
        }

        return Uint8Array.from(
            binary,
            (
                character,
            ) =>
                character.charCodeAt(
                    0,
                ),
        );
    }
    catch {
        return null;
    }
}

function canonicalBase64UrlSignature(
    input,
) {
    if (
        typeof input !== "string" ||
        !SIGNATURE.test(input)
    ) {
        return null;
    }

    try {
        const padding =
            input.length % 4 === 0
                ? ""
                : "=".repeat(
                    4 -
                    (
                        input.length %
                        4
                    ),
                );

        const binary =
            atob(
                input
                    .replace(
                        /-/g,
                        "+",
                    )
                    .replace(
                        /_/g,
                        "/",
                    ) +
                padding,
            );

        if (
            binary.length !== 32
        ) {
            return null;
        }

        return Uint8Array.from(
            binary,
            (
                character,
            ) =>
                character.charCodeAt(
                    0,
                ),
        );
    }
    catch {
        return null;
    }
}

function validPayload(
    payload,
    deviceId,
    eventId,
) {
    if (
        !exactKeys(
            payload,
            PAYLOAD_KEYS,
        ) ||
        payload.version !== 1 ||
        payload.deviceId !==
            deviceId ||
        payload.eventId !==
            eventId ||
        typeof payload.cameraId !==
            "string" ||
        !SAFE_ID.test(
            payload.cameraId,
        ) ||
        typeof payload.tenantId !==
            "string" ||
        !UUID.test(
            payload.tenantId,
        ) ||
        typeof payload.empresaId !==
            "string" ||
        !UUID.test(
            payload.empresaId,
        ) ||
        typeof payload.observedAt !==
            "string" ||
        !Number.isFinite(
            Date.parse(
                payload.observedAt,
            ),
        )
    ) {
        return false;
    }

    if (
        !exactKeys(
            payload.camera,
            CAMERA_KEYS,
        ) ||
        typeof payload.camera.status !==
            "string" ||
        !CAMERA_STATUS.has(
            payload.camera.status,
        ) ||
        typeof payload.camera.framesRecent !==
            "boolean" ||
        payload.camera.framesRecent !==
            (
                payload.camera.status ===
                "FRAMES_RECENT"
            ) ||
        !Number.isSafeInteger(
            payload.camera.frameCount,
        ) ||
        payload.camera.frameCount < 0
    ) {
        return false;
    }

    if (
        !exactKeys(
            payload.ppe,
            PPE_KEYS,
        ) ||
        typeof payload.ppe.status !==
            "string" ||
        !PPE_STATUS.has(
            payload.ppe.status,
        ) ||
        !safeCount(
            payload.ppe.personCount,
        ) ||
        !exactKeys(
            payload.ppe.counts,
            PPE_VALUE_KEYS,
        ) ||
        !exactKeys(
            payload.ppe.maxConfidence,
            PPE_VALUE_KEYS,
        )
    ) {
        return false;
    }

    for (
        const key of
        PPE_VALUE_KEYS
    ) {
        if (
            !safeCount(
                payload.ppe.counts[
                    key
                ],
            ) ||
            !safeConfidence(
                payload.ppe.maxConfidence[
                    key
                ],
            )
        ) {
            return false;
        }
    }

    if (
        payload.ppe.status !==
            "PPE_DETECTED" &&
        (
            payload.ppe.personCount !==
                0 ||
            PPE_VALUE_KEYS.some(
                (
                    key,
                ) =>
                    payload.ppe.counts[
                        key
                    ] !== 0 ||
                    payload.ppe.maxConfidence[
                        key
                    ] !== 0,
            )
        )
    ) {
        return false;
    }

    return true;
}

async function readLimitedBody(
    request,
) {
    const advertised =
        request.headers.get(
            "content-length",
        );

    if (
        advertised !== null &&
        (
            !/^[0-9]{1,9}$/.test(
                advertised,
            ) ||
            Number(
                advertised,
            ) >
                MAX_BODY_BYTES
        )
    ) {
        return null;
    }

    if (!request.body) {
        return null;
    }

    const reader =
        request.body.getReader();

    const chunks =
        [];

    let total =
        0;

    try {
        while (true) {
            const {
                done,
                value,
            } =
                await reader.read();

            if (done) {
                break;
            }

            if (
                !(
                    value instanceof
                    Uint8Array
                )
            ) {
                return null;
            }

            total +=
                value.byteLength;

            if (
                total >
                MAX_BODY_BYTES
            ) {
                return null;
            }

            chunks.push(
                value,
            );
        }

        if (total < 1) {
            return null;
        }

        const body =
            new Uint8Array(
                total,
            );

        let offset =
            0;

        for (
            const chunk of
            chunks
        ) {
            body.set(
                chunk,
                offset,
            );

            offset +=
                chunk.length;
        }

        return body;
    }
    finally {
        try {
            await reader.cancel();
        }
        catch {
            // Corpo ja consumido.
        }

        try {
            reader.releaseLock();
        }
        catch {
            // Reader ja liberado.
        }
    }
}

function trustedDeviceRecord(
    deviceId,
    value,
) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        value.deviceId !==
            deviceId ||
        typeof value.cameraId !==
            "string" ||
        !SAFE_ID.test(
            value.cameraId,
        ) ||
        typeof value.tenantId !==
            "string" ||
        !UUID.test(
            value.tenantId,
        ) ||
        typeof value.empresaId !==
            "string" ||
        !UUID.test(
            value.empresaId,
        ) ||
        typeof value.keyId !==
            "string" ||
        !UUID.test(
            value.keyId,
        ) ||
        value.status !==
            "ativo"
    ) {
        return null;
    }

    return Object.freeze({
        deviceId,

        cameraId:
            value.cameraId,

        tenantId:
            value.tenantId.toLowerCase(),

        empresaId:
            value.empresaId.toLowerCase(),

        keyId:
            value.keyId.toLowerCase(),
    });
}

export function createOperationalTelemetryIngestContract({
    resolveDevice,
    getSigningKey,
    commitTelemetry,
    cryptoImpl =
        globalThis.crypto,
    nowImpl =
        Date.now,
} = {}) {
    if (
        typeof resolveDevice !==
            "function" ||
        typeof getSigningKey !==
            "function" ||
        typeof commitTelemetry !==
            "function" ||
        typeof nowImpl !==
            "function" ||
        !cryptoImpl?.subtle
    ) {
        throw new TypeError(
            "trusted_dependencies_required",
        );
    }

    async function handle(
        request,
    ) {
        if (
            !(
                request instanceof
                Request
            )
        ) {
            return response(
                400,
                "REQUISICAO_INVALIDA",
            );
        }

        if (
            request.method !==
            "POST"
        ) {
            return response(
                405,
                "METODO_INVALIDO",
            );
        }

        let pathname;

        try {
            pathname =
                new URL(
                    request.url,
                ).pathname;
        }
        catch {
            return response(
                400,
                "URL_INVALIDA",
            );
        }

        if (
            pathname !==
            PATH
        ) {
            return response(
                404,
                "ROTA_INVALIDA",
            );
        }

        if (
            request.headers.get(
                "content-type",
            ) !==
            "application/json"
        ) {
            return response(
                400,
                "CONTEUDO_INVALIDO",
            );
        }

        const deviceId =
            request.headers.get(
                "x-safescan-device-id",
            );

        const eventId =
            request.headers.get(
                "x-safescan-event-id",
            );

        const timestamp =
            request.headers.get(
                "x-safescan-timestamp",
            );

        const nonce =
            request.headers.get(
                "x-safescan-nonce",
            );

        const signature =
            request.headers.get(
                "x-safescan-signature",
            );

        const signedBytes =
            canonicalBase64UrlSignature(
                signature,
            );

        if (
            typeof deviceId !==
                "string" ||
            !SAFE_ID.test(
                deviceId,
            ) ||
            typeof eventId !==
                "string" ||
            !UUID.test(
                eventId,
            ) ||
            typeof timestamp !==
                "string" ||
            !TIMESTAMP.test(
                timestamp,
            ) ||
            typeof nonce !==
                "string" ||
            !UUID.test(
                nonce,
            ) ||
            !signedBytes
        ) {
            return response(
                400,
                "CABECALHOS_INVALIDOS",
            );
        }

        const eventEpochSeconds =
            Number(
                timestamp,
            );

        const now =
            nowImpl();

        if (
            !Number.isSafeInteger(
                now,
            ) ||
            !Number.isSafeInteger(
                eventEpochSeconds,
            ) ||
            Math.abs(
                Math.floor(
                    now /
                    1000,
                ) -
                eventEpochSeconds,
            ) >
                MAX_SKEW_SECONDS
        ) {
            return response(
                401,
                "REQUISICAO_EXPIRADA",
            );
        }

        let rawBody;
        let payload;

        try {
            rawBody =
                await readLimitedBody(
                    request,
                );

            if (!rawBody) {
                return response(
                    400,
                    "CORPO_INVALIDO",
                );
            }

            const rawText =
                new TextDecoder(
                    "utf-8",
                    {
                        fatal:
                            true,
                    },
                ).decode(
                    rawBody,
                );

            payload =
                JSON.parse(
                    rawText,
                );

            if (
                JSON.stringify(
                    payload,
                ) !==
                    rawText ||
                !validPayload(
                    payload,
                    deviceId,
                    eventId,
                )
            ) {
                return response(
                    400,
                    "PAYLOAD_INVALIDO",
                );
            }
        }
        catch {
            return response(
                400,
                "PAYLOAD_INVALIDO",
            );
        }

        try {
            const record =
                trustedDeviceRecord(
                    deviceId,
                    await resolveDevice({
                        deviceId,
                    }),
                );

            if (
                !record ||
                record.cameraId !==
                    payload.cameraId ||
                record.tenantId !==
                    payload.tenantId.toLowerCase() ||
                record.empresaId !==
                    payload.empresaId.toLowerCase()
            ) {
                return response(
                    401,
                    "ESCOPO_INVALIDO",
                );
            }

            const keyRecord =
                await getSigningKey({
                    deviceId:
                        record.deviceId,

                    keyId:
                        record.keyId,
                });

            if (
                !keyRecord ||
                keyRecord.deviceId !==
                    record.deviceId ||
                String(
                    keyRecord.keyId ||
                    "",
                ).toLowerCase() !==
                    record.keyId
            ) {
                return response(
                    401,
                    "CHAVE_INVALIDA",
                );
            }

            const secret =
                canonicalBase64Key(
                    keyRecord.secretBase64,
                );

            if (!secret) {
                return response(
                    401,
                    "CHAVE_INVALIDA",
                );
            }

            const hash =
                await cryptoImpl.subtle.digest(
                    "SHA-256",
                    rawBody,
                );

            const digest =
                Array.from(
                    new Uint8Array(
                        hash,
                    ),
                    (
                        byte,
                    ) =>
                        byte
                            .toString(
                                16,
                            )
                            .padStart(
                                2,
                                "0",
                            ),
                ).join(
                    "",
                );

            const canonical =
                `${timestamp}\n${nonce}\n${digest}\n${PATH}`;

            const hmacKey =
                await cryptoImpl.subtle.importKey(
                    "raw",
                    secret,
                    {
                        name:
                            "HMAC",

                        hash:
                            "SHA-256",
                    },
                    false,
                    [
                        "verify",
                    ],
                );

            const verified =
                await cryptoImpl.subtle.verify(
                    "HMAC",
                    hmacKey,
                    signedBytes,
                    new TextEncoder().encode(
                        canonical,
                    ),
                );

            if (
                verified !==
                true
            ) {
                return response(
                    401,
                    "ASSINATURA_INVALIDA",
                );
            }

            const committed =
                await commitTelemetry({
                    deviceId:
                        record.deviceId,

                    cameraId:
                        record.cameraId,

                    tenantId:
                        record.tenantId,

                    empresaId:
                        record.empresaId,

                    keyId:
                        record.keyId,

                    eventId:
                        eventId.toLowerCase(),

                    nonce:
                        nonce.toLowerCase(),

                    eventEpochSeconds,

                    payload,
                });

            return response(
                committed ===
                    true
                    ? 202
                    : 409,

                committed ===
                    true
                    ? "TELEMETRIA_ACEITA"
                    : "EVENTO_REJEITADO",
            );
        }
        catch {
            return response(
                503,
                "BACKEND_INDISPONIVEL",
            );
        }
    }

    return Object.freeze({
        handle,
    });
}