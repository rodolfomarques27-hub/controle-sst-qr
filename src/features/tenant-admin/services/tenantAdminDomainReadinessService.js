const GOOGLE_DOH =
    "https://dns.google/resolve";

const CLOUDFLARE_DOH =
    "https://cloudflare-dns.com/dns-query";

const VERCEL_IPV4 =
    "76.76.21.21";

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

export function normalizarHostnameTenantDomainService(
    valor
) {
    return texto(
        valor
    )
        .toLowerCase()
        .replace(
            /^https?:\/\//,
            ""
        )
        .replace(
            /\/.*$/,
            ""
        )
        .replace(
            /\.$/,
            ""
        );
}

function normalizarAlvoDns(
    valor
) {
    return texto(
        valor
    )
        .toLowerCase()
        .replace(
            /\.$/,
            ""
        );
}

function ehCnameVercel(
    valor
) {
    const alvo =
        normalizarAlvoDns(
            valor
        );

    return /^cname\.vercel-dns(?:-\d+)?\.com$/i.test(
        alvo
    );
}

function ehIpv4Vercel(
    valor
) {
    return texto(
        valor
    ) ===
        VERCEL_IPV4;
}

async function consultarGoogleDns({
    hostname,
    tipo,
    signal,
}) {
    const url =
        `${GOOGLE_DOH}?name=${encodeURIComponent(hostname)}&type=${encodeURIComponent(tipo)}`;

    const response =
        await fetch(
            url,
            {
                method:
                    "GET",

                headers:
                    {
                        Accept:
                            "application/dns-json",
                    },

                cache:
                    "no-store",

                signal,
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

        respostas:
            Array.isArray(
                payload?.Answer
            )
                ? payload.Answer
                : [],
    };
}

async function consultarCloudflareDns({
    hostname,
    tipo,
    signal,
}) {
    const url =
        `${CLOUDFLARE_DOH}?name=${encodeURIComponent(hostname)}&type=${encodeURIComponent(tipo)}`;

    const response =
        await fetch(
            url,
            {
                method:
                    "GET",

                headers:
                    {
                        Accept:
                            "application/dns-json",
                    },

                cache:
                    "no-store",

                signal,
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

        respostas:
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
    signal,
}) {
    try {
        return await consultarGoogleDns({
            hostname,
            tipo,
            signal,
        });
    }
    catch (googleError) {
        try {
            return await consultarCloudflareDns({
                hostname,
                tipo,
                signal,
            });
        }
        catch (cloudflareError) {
            throw new Error(
                (
                    "Não foi possível consultar o DNS público. " +
                    (
                        cloudflareError?.message ||
                        googleError?.message ||
                        ""
                    )
                ).trim(),
                {
                    cause:
                        cloudflareError,
                }
            );
        }
    }
}

function extrairDadosDns(
    resultado
) {
    return resultado.respostas
        .map(
            (resposta) =>
                normalizarAlvoDns(
                    resposta?.data
                )
        )
        .filter(
            Boolean
        );
}

async function testarHttps({
    hostname,
    signal,
}) {
    const url =
        `https://${hostname}/`;

    try {
        await fetch(
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

                credentials:
                    "omit",

                signal,
            }
        );

        return {
            ok:
                true,

            url,
        };
    }
    catch (error) {
        return {
            ok:
                false,

            url,

            erro:
                error?.message ||
                "O endereço HTTPS não respondeu.",
        };
    }
}

export async function testarProntidaoDominioTenantService({
    hostname,
    slug,
    signal,
} = {}) {
    const hostnameNormalizado =
        normalizarHostnameTenantDomainService(
            hostname
        );

    const slugNormalizado =
        texto(
            slug
        ).toLowerCase();

    if (!hostnameNormalizado) {
        throw new Error(
            "Hostname do tenant não informado."
        );
    }

    if (!slugNormalizado) {
        throw new Error(
            "Slug do tenant não informado."
        );
    }

    const hostnameEsperado =
        `${slugNormalizado}.safescanbrasil.com.br`;

    if (
        hostnameNormalizado !==
        hostnameEsperado
    ) {
        throw new Error(
            `Hostname divergente. Esperado: ${hostnameEsperado}.`
        );
    }

    if (
        !/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.safescanbrasil\.com\.br$/i.test(
            hostnameNormalizado
        )
    ) {
        throw new Error(
            "Hostname fora do padrão SafeScan permitido para onboarding."
        );
    }

    const [
        resultadoCname,
        resultadoA,
    ] =
        await Promise.all([
            consultarDns({
                hostname:
                    hostnameNormalizado,

                tipo:
                    "CNAME",

                signal,
            }),

            consultarDns({
                hostname:
                    hostnameNormalizado,

                tipo:
                    "A",

                signal,
            }),
        ]);

    const cnameTargets =
        extrairDadosDns(
            resultadoCname
        );

    const ipv4Targets =
        extrairDadosDns(
            resultadoA
        );

    const cnameVercel =
        cnameTargets.some(
            ehCnameVercel
        );

    const ipv4Vercel =
        ipv4Targets.some(
            ehIpv4Vercel
        );

    const dnsResolvido =
        cnameTargets.length >
            0 ||
        ipv4Targets.length >
            0;

    const dnsOk =
        dnsResolvido;

    const https =
        dnsOk
            ? await testarHttps({
                hostname:
                    hostnameNormalizado,

                signal,
            })
            : {
                ok:
                    false,

                url:
                    `https://${hostnameNormalizado}/`,

                erro:
                    "O teste HTTPS foi ignorado porque o domínio ainda não está resolvendo publicamente.",
            };

    return {
        ok:
            true,

        hostname:
            hostnameNormalizado,

        hostnameEsperado,

        consultadoEm:
            new Date().toISOString(),

        dns:
            {
                ok:
                    dnsOk,

                dnsResolvido,

                cnameVercel,

                ipv4Vercel,

                cnameTargets,

                ipv4Targets,

                provedorCname:
                    resultadoCname.provedor,

                provedorA:
                    resultadoA.provedor,
            },

        https,

        prontoParaRevisaoManual:
            dnsOk &&
            https.ok,

        observacao:
            dnsOk &&
            https.ok
                ? (
                    "A pré-checagem DNS/HTTPS passou. " +
                    "A validação autoritativa de Worker e assinatura SafeScan é realizada pelo diagnóstico server-side."
                )
                : (
                    "O domínio ainda não passou pela pré-checagem externa de resolução DNS/HTTPS."
                ),
    };
}