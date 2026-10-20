const UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createSupabaseUserAuthenticator({
    supabaseUrl,
    anonKey,
    fetchImpl = globalThis.fetch,
    timeoutMs = 5000,
} = {}) {
    let base;

    try {
        base = new URL(supabaseUrl);
    }
    catch {
        throw new TypeError("supabaseUrl invalida");
    }

    if (
        base.protocol !== "https:" ||
        base.username ||
        base.password ||
        base.search ||
        base.hash ||
        base.pathname !== "/"
    ) {
        throw new TypeError("supabaseUrl deve ser origem HTTPS");
    }

    if (
        typeof anonKey !== "string" ||
        anonKey.length < 20 ||
        anonKey.length > 4096 ||
        /\s/.test(anonKey)
    ) {
        throw new TypeError("anonKey invalida");
    }

    if (
        typeof fetchImpl !== "function" ||
        !Number.isSafeInteger(timeoutMs) ||
        timeoutMs < 100 ||
        timeoutMs > 30000
    ) {
        throw new TypeError("configuracao de autenticacao invalida");
    }

    const endpoint = new URL("/auth/v1/user", base).href;

    return async function authenticateRequest(request) {
        const header = request?.headers?.authorization;

        const match =
            typeof header === "string"
                ? /^Bearer ([^\s]+)$/i.exec(header)
                : null;

        if (
            !match ||
            match[1].length < 20 ||
            match[1].length > 8192
        ) {
            throw new Error("unauthorized");
        }

        const controller = new AbortController();
        const timer = setTimeout(
            () => controller.abort(),
            timeoutMs
        );

        timer.unref?.();

        try {
            const response = await fetchImpl(endpoint, {
                method: "GET",
                headers: {
                    apikey: anonKey,
                    authorization: `Bearer ${match[1]}`,
                    accept: "application/json",
                },
                redirect: "error",
                signal: controller.signal,
            });

            if (
                !response?.ok ||
                response.status !== 200 ||
                typeof response.text !== "function"
            ) {
                throw new Error("unauthorized");
            }

            const raw = await response.text();

            if (raw.length > 65536) {
                throw new Error("unauthorized");
            }

            const user = JSON.parse(raw);

            if (
                !user ||
                typeof user !== "object" ||
                !UUID.test(user.id)
            ) {
                throw new Error("unauthorized");
            }

            // Identidade minima verificada pelo Auth.
            // Nenhuma permissao de tenant e presumida.
            return Object.freeze({
                userId: user.id.toLowerCase(),
            });
        }
        catch {
            throw new Error("unauthorized");
        }
        finally {
            clearTimeout(timer);
        }
    };
}
