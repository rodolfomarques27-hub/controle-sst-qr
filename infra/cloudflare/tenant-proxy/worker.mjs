const BASE_DOMAIN =
    "safescanbrasil.com.br";

const ORIGIN_HOST =
    "www.safescanbrasil.com.br";

const RESERVED_LABELS =
    new Set([
        "www",
        "admin",
        "idealiza",
    ]);

const SAFE_LABEL =
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

function normalizeHostname(
    value
) {
    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /\.$/,
            ""
        );
}

export function deriveTenantSlug(
    hostname
) {
    const normalized =
        normalizeHostname(
            hostname
        );

    const suffix =
        `.${BASE_DOMAIN}`;

    if (
        !normalized.endsWith(
            suffix
        )
    ) {
        return null;
    }

    const candidate =
        normalized.slice(
            0,
            -suffix.length
        );

    if (
        !candidate ||
        candidate.includes(
            "."
        )
    ) {
        return null;
    }

    if (
        RESERVED_LABELS.has(
            candidate
        )
    ) {
        return null;
    }

    if (
        !SAFE_LABEL.test(
            candidate
        )
    ) {
        return null;
    }

    return candidate;
}

export function buildOriginUrl(
    inputUrl
) {
    const incoming =
        inputUrl instanceof globalThis.URL
            ? new globalThis.URL(
                inputUrl.toString()
            )
            : new globalThis.URL(
                String(
                    inputUrl
                )
            );

    const slug =
        deriveTenantSlug(
            incoming.hostname
        );

    if (!slug) {
        return null;
    }

    incoming.protocol =
        "https:";

    incoming.hostname =
        ORIGIN_HOST;

    incoming.port =
        "";

    return {
        slug,
        url:
            incoming,
    };
}

function jsonResponse(
    status,
    payload
) {
    return new globalThis.Response(
        JSON.stringify(
            payload
        ),
        {
            status,

            headers:
                {
                    "Content-Type":
                        "application/json; charset=utf-8",

                    "Cache-Control":
                        "no-store",
                },
        }
    );
}

function rewriteLocationHeader(
    value,
    tenantHostname
) {
    if (!value) {
        return value;
    }

    try {
        const target =
            new globalThis.URL(
                value
            );

        if (
            target.hostname.toLowerCase() ===
            ORIGIN_HOST
        ) {
            target.hostname =
                tenantHostname;

            return target.toString();
        }
    }
    catch {
        // Location relativa ou não parseável:
        // preservar exatamente como veio.
    }

    return value;
}

async function proxyTenantRequest(
    request
) {
    if (
        request.method !==
            "GET" &&
        request.method !==
            "HEAD"
    ) {
        return jsonResponse(
            405,
            {
                ok:
                    false,

                code:
                    "method_not_allowed",

                message:
                    "Este domínio de tenant aceita somente navegação GET/HEAD.",
            }
        );
    }

    const incomingUrl =
        new globalThis.URL(
            request.url
        );

    const origin =
        buildOriginUrl(
            incomingUrl
        );

    if (!origin) {
        return jsonResponse(
            404,
            {
                ok:
                    false,

                code:
                    "tenant_hostname_invalid",

                message:
                    "Hostname não reconhecido como tenant SafeScan.",
            }
        );
    }

    const headers =
        new globalThis.Headers(
            request.headers
        );

    headers.set(
        "x-safescan-tenant-host",
        incomingUrl.hostname
    );

    headers.set(
        "x-safescan-tenant-slug",
        origin.slug
    );

    headers.set(
        "x-forwarded-host",
        incomingUrl.hostname
    );

    const originRequest =
        new globalThis.Request(
            origin.url.toString(),
            {
                method:
                    request.method,

                headers,

                redirect:
                    "manual",
            }
        );

    const originResponse =
        await globalThis.fetch(
            originRequest
        );

    const responseHeaders =
        new globalThis.Headers(
            originResponse.headers
        );

    responseHeaders.set(
        "x-safescan-tenant-proxy",
        "v1"
    );

    const location =
        responseHeaders.get(
            "location"
        );

    if (location) {
        responseHeaders.set(
            "location",
            rewriteLocationHeader(
                location,
                incomingUrl.hostname
            )
        );
    }

    return new globalThis.Response(
        originResponse.body,
        {
            status:
                originResponse.status,

            statusText:
                originResponse.statusText,

            headers:
                responseHeaders,
        }
    );
}

export default {
    async fetch(
        request
    ) {
        try {
            return await proxyTenantRequest(
                request
            );
        }
        catch (error) {
            return jsonResponse(
                502,
                {
                    ok:
                        false,

                    code:
                        "tenant_proxy_origin_error",

                    message:
                        error instanceof Error
                            ? error.message
                            : "Falha ao consultar o origin SafeScan.",
                }
            );
        }
    },
};