const CAPTURE_GUIDANCE_STATUSES = new Set([
    "NO_FACE",
    "MULTIPLE_FACES",
]);

const CAMERA_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,160}$/;

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cameraIdOf(value) {
    if (
        typeof value !== "string" ||
        !CAMERA_ID_PATTERN.test(value)
    ) {
        throw new TypeError("cameraId invalido");
    }

    return value;
}

function trustedScopeOf(value) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        throw new TypeError("escopo de camera indisponivel");
    }

    const tenantId = value.tenantId;
    const empresaId = value.empresaId;

    if (
        typeof tenantId !== "string" ||
        !UUID_PATTERN.test(tenantId) ||
        typeof empresaId !== "string" ||
        !UUID_PATTERN.test(empresaId)
    ) {
        throw new TypeError("escopo de camera invalido");
    }

    return Object.freeze({
        tenantId: tenantId.toLowerCase(),
        empresaId: empresaId.toLowerCase(),
    });
}

export function createOperationalResultBridge({
    resolveCameraScope,
    authorizePrincipal,
} = {}) {
    if (
        typeof resolveCameraScope !== "function" ||
        typeof authorizePrincipal !== "function"
    ) {
        throw new TypeError(
            "resolvedor e autorizador confiaveis obrigatorios"
        );
    }

    const subscriptions = new Set();
    const observed = new Map();

    async function scopeFor(cameraId) {
        return trustedScopeOf(
            await resolveCameraScope(cameraId)
        );
    }

    async function subscribe({
        cameraId,
        principal,
        onResult,
    } = {}) {
        const camera = cameraIdOf(cameraId);

        if (
            !principal ||
            typeof principal !== "object" ||
            typeof onResult !== "function"
        ) {
            throw new TypeError("assinatura invalida");
        }

        const scope = await scopeFor(camera);

        const allowed = await authorizePrincipal({
            principal,
            cameraId: camera,
            tenantId: scope.tenantId,
            empresaId: scope.empresaId,
        });

        if (allowed !== true) {
            throw new Error("subscriber_not_authorized");
        }

        const subscription = {
            cameraId: camera,
            tenantId: scope.tenantId,
            empresaId: scope.empresaId,
            onResult,
        };

        subscriptions.add(subscription);

        return () => {
            subscriptions.delete(subscription);
        };
    }

    async function publishSnapshot({
        cameraId,
        processedFrames,
        lastResult,
    } = {}) {
        const camera = cameraIdOf(cameraId);

        if (
            !Number.isSafeInteger(processedFrames) ||
            processedFrames < 0
        ) {
            throw new TypeError("processedFrames invalido");
        }

        const scope = await scopeFor(camera);

        const scopeKey =
            `${scope.tenantId}:${scope.empresaId}:${camera}`;

        const previous = observed.get(scopeKey);

        if (
            previous &&
            processedFrames <= previous.frames
        ) {
            return false;
        }

        const status =
            lastResult &&
            typeof lastResult === "object" &&
            !Array.isArray(lastResult) &&
            typeof lastResult.status === "string" &&
            CAPTURE_GUIDANCE_STATUSES.has(lastResult.status)
                ? lastResult.status
                : null;

        observed.set(scopeKey, {
            frames: processedFrames,
            status,
        });

        // Primeira observacao estabelece a referencia.
        // Snapshot antigo nunca e retransmitido.
        if (
            !previous ||
            !status ||
            previous.status === status
        ) {
            return false;
        }

        // Projecao estrita: somente dois campos.
        const event = Object.freeze({
            accepted: false,
            status,
        });

        for (const subscription of [...subscriptions]) {
            if (
                subscription.cameraId !== camera ||
                subscription.tenantId !== scope.tenantId ||
                subscription.empresaId !== scope.empresaId
            ) {
                continue;
            }

            try {
                const delivery = subscription.onResult(event);

                if (
                    delivery &&
                    typeof delivery.catch === "function"
                ) {
                    delivery.catch(() => {});
                }
            }
            catch {
                // Falha de consumidor isolada.
                // Nenhum dado bruto e encaminhado.
            }
        }

        return true;
    }

    return Object.freeze({
        subscribe,
        publishSnapshot,
    });
}
