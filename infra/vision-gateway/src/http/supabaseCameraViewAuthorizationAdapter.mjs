import {
    createSupabaseUserAuthenticator,
} from "./supabaseUserAuthenticator.mjs";

const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const CAMERA_ID =
    /^[A-Za-z0-9_.:-]{1,160}$/;

const TOKEN =
    /^Bearer ([A-Za-z0-9._~+/=-]{20,8192})$/i;

const MAX_RESPONSE_CHARS = 16384;

export function createSupabaseCameraViewAuthorizationAdapter({
    supabaseUrl,
    anonKey,
    fetchImpl = globalThis.fetch,
    timeoutMs = 5000,
} = {}) {
    const authenticate =
        createSupabaseUserAuthenticator({
            supabaseUrl,
            anonKey,
            fetchImpl,
            timeoutMs,
        });

    const endpoint = new URL(
        "/rest/v1/rpc/camera_ia_autorizar_visualizacao",
        supabaseUrl,
    ).href;

    function createGuard({ request, cameraId } = {}) {
        if (
            typeof cameraId !== "string" ||
            !CAMERA_ID.test(cameraId)
        ) {
            throw new TypeError("cameraId invalido");
        }

        const authorization =
            request?.headers?.authorization;

        if (
            typeof authorization !== "string" ||
            !TOKEN.test(authorization)
        ) {
            throw new Error("unauthorized");
        }

        // Captura o header uma vez por sessao.
        // O token nunca entra no resultado retornado.
        const userRequest = Object.freeze({
            headers: Object.freeze({
                authorization,
            }),
        });

        let bound = null;
        let revoked = false;

        async function verify() {
            try {
                // Verifica a identidade na API oficial Auth.
                const principal =
                    await authenticate(userRequest);

                if (!UUID.test(principal?.userId)) {
                    return null;
                }

                const controller =
                    new AbortController();

                const timer = setTimeout(
                    () => controller.abort(),
                    timeoutMs,
                );

                timer.unref?.();

                try {
                    // RPC chamada como o proprio usuario.
                    // Nao utiliza service_role.
                    const response = await fetchImpl(
                        endpoint,
                        {
                            method: "POST",

                            headers: {
                                apikey: anonKey,
                                authorization,
                                accept: "application/json",
                                "content-type": "application/json",
                            },

                            body: JSON.stringify({
                                p_camera_id: cameraId,
                            }),

                            redirect: "error",
                            cache: "no-store",
                            signal: controller.signal,
                        },
                    );

                    if (
                        !response?.ok ||
                        response.status !== 200 ||
                        typeof response.text !== "function" ||
                        !/^application\/json(?:\s*;|\s*$)/i.test(
                            response.headers?.get?.(
                                "content-type",
                            ) ?? "",
                        )
                    ) {
                        return null;
                    }

                    const raw = await response.text();

                    if (
                        raw.length > MAX_RESPONSE_CHARS
                    ) {
                        return null;
                    }

                    const records = JSON.parse(raw);

                    // Exatamente uma camera autorizada.
                    if (
                        !Array.isArray(records) ||
                        records.length !== 1
                    ) {
                        return null;
                    }

                    const row = records[0];

                    if (
                        !row ||
                        typeof row !== "object" ||
                        Array.isArray(row) ||
                        row.camera_id !== cameraId ||
                        typeof row.tenant_id !== "string" ||
                        !UUID.test(row.tenant_id) ||
                        typeof row.empresa_id !== "string" ||
                        !UUID.test(row.empresa_id)
                    ) {
                        return null;
                    }

                    // Projecao minima, sem metadados,
                    // biometria ou credenciais.
                    return Object.freeze({
                        userId:
                            principal.userId.toLowerCase(),
                        cameraId,
                        tenantId:
                            row.tenant_id.toLowerCase(),
                        empresaId:
                            row.empresa_id.toLowerCase(),
                    });
                }
                finally {
                    clearTimeout(timer);
                }
            }
            catch {
                // Erro de rede, Auth ou RPC:
                // acesso negado por padrao.
                return null;
            }
        }

        return Object.freeze({
            async authorize() {
                if (revoked) {
                    return null;
                }

                const scope = await verify();

                if (!scope) {
                    revoked = true;
                    return null;
                }

                // Nao permite alterar tenant, empresa,
                // camera ou usuario durante a sessao.
                if (
                    bound &&
                    (
                        bound.userId !== scope.userId ||
                        bound.cameraId !== scope.cameraId ||
                        bound.tenantId !== scope.tenantId ||
                        bound.empresaId !== scope.empresaId
                    )
                ) {
                    revoked = true;
                    return null;
                }

                bound = scope;

                return scope;
            },

            async revalidate() {
                if (!bound || revoked) {
                    return false;
                }

                const next = await verify();

                const allowed = Boolean(
                    next &&
                    next.userId === bound.userId &&
                    next.cameraId === bound.cameraId &&
                    next.tenantId === bound.tenantId &&
                    next.empresaId === bound.empresaId
                );

                if (!allowed) {
                    // Revogacao irreversivel nesta sessao.
                    revoked = true;
                }

                return allowed;
            },
        });
    }

    return Object.freeze({
        createGuard,
    });
}
