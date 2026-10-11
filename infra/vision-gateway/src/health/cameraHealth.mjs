export const CAMERA_HEALTH_STATUS =
    Object.freeze({
        ONLINE:
            "ONLINE",
        DEGRADED:
            "DEGRADED",
        OFFLINE:
            "OFFLINE",
    });

function requireCameraId(
    cameraId,
) {
    if (
        typeof cameraId !== "string" ||
        !cameraId.trim()
    ) {
        throw new TypeError(
            "cameraId deve ser uma string nao vazia.",
        );
    }

    return cameraId.trim();
}

function normalizeReason(
    reason,
) {
    if (
        reason === undefined ||
        reason === null ||
        reason === ""
    ) {
        return null;
    }

    return String(reason);
}

function normalizeTimestamp(
    value,
) {
    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        throw new TypeError(
            "Relogio retornou data invalida.",
        );
    }

    return date.toISOString();
}

export class CameraHealthTracker {
    #cameraId;
    #now;
    #state;

    constructor({
        cameraId,
        now = () => new Date(),
    }) {
        if (
            typeof now !== "function"
        ) {
            throw new TypeError(
                "now deve ser uma funcao.",
            );
        }

        this.#cameraId =
            requireCameraId(
                cameraId,
            );

        this.#now =
            now;

        const createdAt =
            this.#timestamp();

        this.#state = {
            cameraId:
                this.#cameraId,
            status:
                CAMERA_HEALTH_STATUS.OFFLINE,
            since:
                createdAt,
            lastFrameAt:
                null,
            lastReconnectAttemptAt:
                null,
            reconnectAttempts:
                0,
            reason:
                "not_started",
        };
    }

    #timestamp() {
        return normalizeTimestamp(
            this.#now(),
        );
    }

    #setStatus(
        status,
        {
            reason = null,
            frameReceived = false,
        } = {},
    ) {
        const at =
            this.#timestamp();

        this.#state = {
            ...this.#state,
            status,
            since:
                at,
            lastFrameAt:
                frameReceived
                    ? at
                    : this.#state.lastFrameAt,
            reason:
                normalizeReason(
                    reason,
                ),
        };

        return this.snapshot();
    }

    markOnline() {
        this.#state = {
            ...this.#state,
            reconnectAttempts:
                0,
        };

        return this.#setStatus(
            CAMERA_HEALTH_STATUS.ONLINE,
            {
                frameReceived:
                    true,
            },
        );
    }

    markDegraded(
        reason,
    ) {
        return this.#setStatus(
            CAMERA_HEALTH_STATUS.DEGRADED,
            {
                reason,
            },
        );
    }

    markOffline(
        reason,
    ) {
        return this.#setStatus(
            CAMERA_HEALTH_STATUS.OFFLINE,
            {
                reason,
            },
        );
    }

    recordFrame() {
        const at =
            this.#timestamp();

        this.#state = {
            ...this.#state,
            lastFrameAt:
                at,
        };

        return this.snapshot();
    }

    recordReconnectAttempt(
        reason = null,
    ) {
        const at =
            this.#timestamp();

        this.#state = {
            ...this.#state,
            reconnectAttempts:
                this.#state.reconnectAttempts + 1,
            lastReconnectAttemptAt:
                at,
            reason:
                normalizeReason(
                    reason,
                ) ?? this.#state.reason,
        };

        return this.snapshot();
    }

    snapshot() {
        return Object.freeze({
            ...this.#state,
        });
    }
}
