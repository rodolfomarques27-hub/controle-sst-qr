const BASE_DOMAIN =
    "safescanbrasil.com.br";

const GOOGLE_DOH =
    "https://dns.google/resolve";

const CLOUDFLARE_DOH =
    "https://cloudflare-dns.com/dns-query";

const DNS_TYPES = {
    A:
        1,

    NS:
        2,

    CNAME:
        5,

    DS:
        43,
};

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

async function fetchComTimeout(
    url,
    options = {},
    timeoutMs = 8000
) {
    const controller =
        new globalThis.AbortController();

    const timer =
        globalThis.setTimeout(
            () =>
                controller.abort(),
            timeoutMs
        );

    try {
        return await globalThis.fetch(
            url,
            {
                ...options,

                signal:
                    controller.signal,
            }
        );
    }
    finally {
        globalThis.clearTimeout(
            timer
        );
    }
}

function normalizarRespostaDns(
    resposta
) {
    if (
        !resposta ||
        typeof resposta !==
            "object"
    ) {
        return "";
    }

    return texto(
        resposta.data
    )
        .toLowerCase()
        .replace(
            /\.$/,
            ""
        );
}

async function consultarGoogle({
    hostname,
    type,
}) {
    const url =
        `${GOOGLE_DOH}?name=${encodeURIComponent(
            hostname
        )}&type=${encodeURIComponent(
            type
        )}`;

    const response =
        await fetchComTimeout(
            url,
            {
                headers:
                    {
                        Accept:
                            "application/dns-json",
                    },

                cache:
                    "no-store",
            }
        );

    if (!response.ok) {
        throw new Error(
            `Google DNS respondeu HTTP ${response.status}.`
        );
    }

    const payload =
        await response.json();

    return {
        provedor:
            "Google Public DNS",

        status:
            Number(
                payload?.Status
            ),

        answers:
            Array.isArray(
                payload?.Answer
            )
                ? payload.Answer
                : [],
    };
}

async function consultarCloudflare({
    hostname,
    type,
}) {
    const url =
        `${CLOUDFLARE_DOH}?name=${encodeURIComponent(
            hostname
        )}&type=${encodeURIComponent(
            type
        )}`;

    const response =
        await fetchComTimeout(
            url,
            {
                headers:
                    {
                        Accept:
                            "application/dns-json",
                    },

                cache:
                    "no-store",
            }
        );

    if (!response.ok) {
        throw new Error(
            `Cloudflare DNS respondeu HTTP ${response.status}.`
        );
    }

    const payload =
        await response.json();

    return {
        provedor:
            "Cloudflare DNS",

        status:
            Number(
                payload?.Status
            ),

        answers:
            Array.isArray(
                payload?.Answer
            )
                ? payload.Answer
                : [],
    };
}

async function consultarDns({
    hostname,
    tipo,
}) {
    const type =
        DNS_TYPES[tipo];

    if (!type) {
        throw new Error(
            `Tipo DNS não suportado: ${tipo}.`
        );
    }

    let resultado;

    try {
        resultado =
            await consultarGoogle({
                hostname,
                type,
            });
    }
    catch {
        resultado =
            await consultarCloudflare({
                hostname,
                type,
            });
    }

    return {
        ...resultado,

        hostname,

        tipo,

        valores:
            resultado.answers
                .map(
                    normalizarRespostaDns
                )
                .filter(
                    Boolean
                ),
    };
}

async function testarHttps(
    hostname
) {
    const url =
        `https://${hostname}/`;

    try {
        await fetchComTimeout(
            url,
            {
                method:
                    "GET",

                mode:
                    "no-cors",

                cache:
                    "no-store",

                redirect:
                    "follow",
            },
            10000
        );

        return {
            ok:
                true,

            hostname,

            url,
        };
    }
    catch (error) {
        return {
            ok:
                false,

            hostname,

            url,

            erro:
                error?.message ||
                "Não foi possível alcançar o endereço HTTPS.",
        };
    }
}

function classificarDnsAutoritativo(
    nameservers
) {
    if (
        nameservers.some(
            (value) =>
                value.endsWith(
                    ".cloudflare.com"
                )
        )
    ) {
        return "Cloudflare";
    }

    if (
        nameservers.some(
            (value) =>
                value.endsWith(
                    ".sec.dns.br"
                )
        )
    ) {
        return "Registro.br";
    }

    if (
        nameservers.length >
        0
    ) {
        return "Outro provedor";
    }

    return "Não identificado";
}

export async function diagnosticarInfraestruturaGlobalService() {
    const wildcardHost =
        `infra-check-${globalThis.Date.now()}.${BASE_DOMAIN}`;

    const [
        ns,
        ds,
        apexA,
        wwwCname,
        adminA,
        idealizaCname,
        wildcardA,
        wildcardCname,
    ] =
        await globalThis.Promise.all([
            consultarDns({
                hostname:
                    BASE_DOMAIN,

                tipo:
                    "NS",
            }),

            consultarDns({
                hostname:
                    BASE_DOMAIN,

                tipo:
                    "DS",
            }),

            consultarDns({
                hostname:
                    BASE_DOMAIN,

                tipo:
                    "A",
            }),

            consultarDns({
                hostname:
                    `www.${BASE_DOMAIN}`,

                tipo:
                    "CNAME",
            }),

            consultarDns({
                hostname:
                    `admin.${BASE_DOMAIN}`,

                tipo:
                    "A",
            }),

            consultarDns({
                hostname:
                    `idealiza.${BASE_DOMAIN}`,

                tipo:
                    "CNAME",
            }),

            consultarDns({
                hostname:
                    wildcardHost,

                tipo:
                    "A",
            }),

            consultarDns({
                hostname:
                    wildcardHost,

                tipo:
                    "CNAME",
            }),
        ]);

    const wildcardValores =
        [
            ...wildcardA.valores,
            ...wildcardCname.valores,
        ];

    const wildcardAtivo =
        wildcardValores.length >
        0;

    const httpsConhecidos =
        await globalThis.Promise.all([
            testarHttps(
                BASE_DOMAIN
            ),

            testarHttps(
                `www.${BASE_DOMAIN}`
            ),

            testarHttps(
                `admin.${BASE_DOMAIN}`
            ),

            testarHttps(
                `idealiza.${BASE_DOMAIN}`
            ),
        ]);

    const wildcardHttps =
        wildcardAtivo
            ? await testarHttps(
                wildcardHost
            )
            : {
                ok:
                    false,

                hostname:
                    wildcardHost,

                ignorado:
                    true,

                erro:
                    "Wildcard DNS ainda não está ativo.",
            };

    const nameservers =
        ns.valores;

    const dnssecAtivo =
        ds.valores.length >
        0;

    const dnsAutoritativo =
        classificarDnsAutoritativo(
            nameservers
        );

    return {
        baseDomain:
            BASE_DOMAIN,

        consultadoEm:
            new globalThis.Date().toISOString(),

        dns:
            {
                autoritativo:
                    dnsAutoritativo,

                nameservers,

                dnssecAtivo,

                ds:
                    ds.valores,

                wildcardHost,

                wildcardAtivo,

                wildcardValores,
            },

        hosts:
            {
                apex:
                    {
                        hostname:
                            BASE_DOMAIN,

                        tipo:
                            "A",

                        valores:
                            apexA.valores,

                        dnsOk:
                            apexA.valores.length >
                            0,

                        https:
                            httpsConhecidos[0],
                    },

                www:
                    {
                        hostname:
                            `www.${BASE_DOMAIN}`,

                        tipo:
                            "CNAME",

                        valores:
                            wwwCname.valores,

                        dnsOk:
                            wwwCname.valores.length >
                            0,

                        https:
                            httpsConhecidos[1],
                    },

                admin:
                    {
                        hostname:
                            `admin.${BASE_DOMAIN}`,

                        tipo:
                            "A",

                        valores:
                            adminA.valores,

                        dnsOk:
                            adminA.valores.length >
                            0,

                        https:
                            httpsConhecidos[2],
                    },

                idealiza:
                    {
                        hostname:
                            `idealiza.${BASE_DOMAIN}`,

                        tipo:
                            "CNAME",

                        valores:
                            idealizaCname.valores,

                        dnsOk:
                            idealizaCname.valores.length >
                            0,

                        https:
                            httpsConhecidos[3],
                    },
            },

        wildcard:
            {
                dnsOk:
                    wildcardAtivo,

                httpsOk:
                    wildcardHttps.ok ===
                    true,

                https:
                    wildcardHttps,
            },

        worker:
            {
                configurado:
                    wildcardAtivo &&
                    wildcardHttps.ok ===
                        true,

                validado:
                    wildcardAtivo &&
                    wildcardHttps.ok ===
                        true,

                status:
                    wildcardAtivo &&
                    wildcardHttps.ok ===
                        true
                        ? "Worker SafeScan e rota wildcard operacionais."
                        : wildcardAtivo
                          ? "Wildcard detectado; HTTPS do proxy ainda precisa de validação."
                          : "Wildcard e proxy ainda não estão disponíveis.",
            },

        ativacaoAutomatica:
            {
                pronta:
                    wildcardAtivo &&
                    wildcardHttps.ok ===
                        true,

                motivo:
                    wildcardAtivo &&
                    wildcardHttps.ok ===
                        true
                        ? "Wildcard DNS e HTTPS disponíveis."
                        : "Wildcard/HTTPS de tenants ainda não estão disponíveis.",
            },
    };
}