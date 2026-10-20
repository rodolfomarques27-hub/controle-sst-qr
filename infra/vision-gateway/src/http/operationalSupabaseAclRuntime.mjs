import {
    createOperationalResultBridge,
} from "../identity/operationalResultBridge.mjs";

import {
    createOperationalResultSseHandler,
} from "./operationalResultSseHandler.mjs";

import {
    createSupabaseCameraViewAuthorizationAdapter,
} from "./supabaseCameraViewAuthorizationAdapter.mjs";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CAMERA_ID =
    /^[A-Za-z0-9_.:-]{1,160}$/;

function normalizeBinding(cameraId, binding) {
    if (
        typeof cameraId !== "string" ||
        !CAMERA_ID.test(cameraId) ||
        !binding ||
        typeof binding !== "object" ||
        Array.isArray(binding) ||
        binding.cameraId !== cameraId ||
        typeof binding.tenantId !== "string" ||
        !UUID.test(binding.tenantId) ||
        typeof binding.empresaId !== "string" ||
        !UUID.test(binding.empresaId)
    ) {
        throw new Error("trusted_camera_binding_unavailable");
    }

    return Object.freeze({
        cameraId,
        tenantId: binding.tenantId.toLowerCase(),
        empresaId: binding.empresaId.toLowerCase(),
    });
}

function sameScope(left, right) {
    return Boolean(
        left &&
        right &&
        left.cameraId === right.cameraId &&
        left.tenantId === right.tenantId &&
        left.empresaId === right.empresaId
    );
}

export function createOperationalSupabaseAclRuntime({
    supabaseUrl,
    anonKey,
    fetchImpl = globalThis.fetch,
    getCameraBinding,
} = {}) {
    if (typeof getCameraBinding !== "function") {
        throw new TypeError(
            "trusted_getCameraBinding_obrigatorio"
        );
    }

    const adapter =
        createSupabaseCameraViewAuthorizationAdapter({
            supabaseUrl,
            anonKey,
            fetchImpl,
        });

    async function resolveCameraScope(cameraId) {
        return normalizeBinding(
            cameraId,
            await getCameraBinding(cameraId),
        );
    }

    async function isAuthorized({
        principal,
        cameraId,
        tenantId,
        empresaId,
    }) {
        if (
            !principal ||
            principal.cameraId !== cameraId ||
            principal.tenantId !== tenantId ||
            principal.empresaId !== empresaId ||
            typeof principal.guard?.revalidate !== "function"
        ) {
            return false;
        }

        try {
            const binding =
                await resolveCameraScope(cameraId);

            if (!sameScope(binding, principal)) {
                return false;
            }

            return (
                await principal.guard.revalidate()
            ) === true;
        }
        catch {
            return false;
        }
    }

    const bridge = createOperationalResultBridge({
        resolveCameraScope,
        authorizePrincipal: isAuthorized,
    });

    async function handle(
        request,
        response,
        { cameraId } = {},
    ) {
        // Autenticacao isolada por requisicao.
        // Nenhum principal e compartilhado entre conexoes.
        const authenticateRequest = async (incoming) => {
            if (incoming !== request) {
                throw new Error("unauthorized");
            }

            const guard = adapter.createGuard({
                request,
                cameraId,
            });

            const authorizedScope =
                await guard.authorize();

            if (!authorizedScope) {
                throw new Error("unauthorized");
            }

            let trustedScope;

            try {
                trustedScope =
                    await resolveCameraScope(cameraId);
            }
            catch {
                throw new Error("forbidden");
            }

            if (!sameScope(
                authorizedScope,
                trustedScope,
            )) {
                throw new Error("forbidden");
            }

            return Object.freeze({
                userId: authorizedScope.userId,
                cameraId,
                tenantId: authorizedScope.tenantId,
                empresaId: authorizedScope.empresaId,
                guard,
            });
        };

        const sessionBridge = Object.freeze({
            async subscribe({
                cameraId: subscribedCameraId,
                principal,
                onResult,
            }) {
                let live = true;
                let unsubscribeUnderlying = null;
                let queue = Promise.resolve();

                const emit = (event) => {
                    // Serializa eventos para impedir que
                    // validacoes concorrentes invertam
                    // a ordem de entrega.
                    queue = queue.then(async () => {
                        if (
                            !live ||
                            response.writableEnded ||
                            response.destroyed
                        ) {
                            return;
                        }

                        const authorized =
                            await isAuthorized({
                                principal,
                                cameraId: subscribedCameraId,
                                tenantId: principal.tenantId,
                                empresaId: principal.empresaId,
                            });

                        if (!authorized) {
                            live = false;
                            unsubscribeUnderlying?.();

                            if (
                                !response.writableEnded &&
                                !response.destroyed
                            ) {
                                response.end();
                            }

                            return;
                        }

                        if (
                            live &&
                            !response.writableEnded &&
                            !response.destroyed
                        ) {
                            onResult(event);
                        }
                    }).catch(() => {
                        live = false;
                        unsubscribeUnderlying?.();

                        if (
                            !response.writableEnded &&
                            !response.destroyed
                        ) {
                            response.end();
                        }
                    });
                };

                unsubscribeUnderlying =
                    await bridge.subscribe({
                        cameraId: subscribedCameraId,
                        principal,
                        onResult: emit,
                    });

                return () => {
                    live = false;
                    unsubscribeUnderlying?.();
                };
            },
        });

        const transport =
            createOperationalResultSseHandler({
                bridge: sessionBridge,
                authenticateRequest,
            });

        return transport.handle(
            request,
            response,
            { cameraId },
        );
    }

    return Object.freeze({
        handle,
        publishSnapshot: bridge.publishSnapshot,
    });
}
