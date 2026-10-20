import {
    createOperationalResultBridge,
} from "../identity/operationalResultBridge.mjs";

import {
    createOperationalResultSseHandler,
} from "./operationalResultSseHandler.mjs";

import {
    createSupabaseUserAuthenticator,
} from "./supabaseUserAuthenticator.mjs";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizedBinding(cameraId, raw) {
    if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw) ||
        raw.cameraId !== cameraId ||
        typeof raw.tenantId !== "string" ||
        !UUID.test(raw.tenantId) ||
        typeof raw.empresaId !== "string" ||
        !UUID.test(raw.empresaId)
    ) {
        throw new Error("camera_binding_unavailable");
    }

    return Object.freeze({
        tenantId: raw.tenantId.toLowerCase(),
        empresaId: raw.empresaId.toLowerCase(),
    });
}

export function createOperationalResultRuntime({
    supabaseUrl,
    anonKey,
    fetchImpl,
    getCameraBinding,
    checkUserCameraAccess,
} = {}) {
    if (
        typeof getCameraBinding !== "function" ||
        typeof checkUserCameraAccess !== "function"
    ) {
        throw new TypeError(
            "fontes confiaveis de camera e permissao obrigatorias"
        );
    }

    const resolveCameraScope = async (cameraId) =>
        normalizedBinding(
            cameraId,
            await getCameraBinding(cameraId)
        );

    const authorizePrincipal = async ({
        principal,
        cameraId,
        tenantId,
        empresaId,
    }) => {
        if (
            typeof principal?.userId !== "string" ||
            !UUID.test(principal.userId)
        ) {
            return false;
        }

        try {
            const scope = await resolveCameraScope(cameraId);

            if (
                scope.tenantId !== tenantId ||
                scope.empresaId !== empresaId
            ) {
                return false;
            }

            const permission = await checkUserCameraAccess({
                userId: principal.userId.toLowerCase(),
                cameraId,
                tenantId: scope.tenantId,
                empresaId: scope.empresaId,
            });

            return permission === true;
        }
        catch {
            return false;
        }
    };

    const bridge = createOperationalResultBridge({
        resolveCameraScope,
        authorizePrincipal,
    });

    const authenticateRequest = createSupabaseUserAuthenticator({
        supabaseUrl,
        anonKey,
        fetchImpl,
    });

    const guardedBridge = Object.freeze({
        async subscribe({ cameraId, principal, onResult } = {}) {
            const scope = await resolveCameraScope(cameraId);

            let queue = Promise.resolve();

            return bridge.subscribe({
                cameraId,
                principal,

                onResult(event) {
                    // Reconfere a permissao antes de cada entrega.
                    // Mantem a ordem dos resultados.
                    queue = queue.then(async () => {
                        const authorized = await authorizePrincipal({
                            principal,
                            cameraId,
                            tenantId: scope.tenantId,
                            empresaId: scope.empresaId,
                        });

                        if (authorized) {
                            onResult(event);
                        }
                    }).catch(() => {
                        // Falha de autorizacao: nenhum evento.
                    });

                    return queue;
                },
            });
        },
    });

    const transport = createOperationalResultSseHandler({
        bridge: guardedBridge,
        authenticateRequest,
    });

    return Object.freeze({
        handle: transport.handle,
        publishSnapshot: bridge.publishSnapshot,
    });
}
