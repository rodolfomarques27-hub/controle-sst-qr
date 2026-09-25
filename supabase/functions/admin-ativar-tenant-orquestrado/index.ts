import {
    createClient,
} from "npm:@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin":
        "*",

    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
        "POST, OPTIONS",
};

const GOOGLE_DOH =
    "https://dns.google/resolve";

const CLOUDFLARE_DOH =
    "https://cloudflare-dns.com/dns-query";

const BASE_DOMAIN =
    "safescanbrasil.com.br";

const HEALTH_PATH =
    "/safescan-tenant-health.json";

const PROXY_MARKER_HEADER =
    "x-safescan-tenant-proxy";

const PROXY_MARKER_EXPECTED =
    "v1";

const ATIVACAO_REAL_HABILITADA =
    false;

const HEALTH_SIGNATURE = {
    service:
        "SafeScan Brasil",

    purpose:
        "tenant-domain-health",

    protocol:
        "safescan-tenant-v1",

    version:
        1,
};

function jsonResponse(
    status: number,
    payload: unknown,
) {
    return new Response(
        JSON.stringify(
            payload
        ),
        {
            status,

            headers:
                {
                    ...corsHeaders,

                    "Content-Type":
                        "application/json; charset=utf-8",

                    "Cache-Control":
                        "no-store",
                },
        }
    );
}

function texto(
    valor: unknown,
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarHostname(
    valor: unknown,
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

function uuidValido(
    valor: unknown,
) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        texto(
            valor
        )
    );
}

function obterChavePublicavel() {
    const legacyAnon =
        Deno.env.get(
            "SUPABASE_ANON_KEY"
        );

    if (legacyAnon) {
        return legacyAnon;
    }

    const publishable =
        Deno.env.get(
            "SUPABASE_PUBLISHABLE_KEY"
        );

    if (publishable) {
        return publishable;
    }

    const publishableKeys =
        Deno.env.get(
            "SUPABASE_PUBLISHABLE_KEYS"
        );

    if (publishableKeys) {
        try {
            const parsed =
                JSON.parse(
                    publishableKeys
                );

            const valor =
                parsed?.default;

            if (
                typeof valor ===
                    "string" &&
                valor.trim()
            ) {
                return valor.trim();
            }
        }
        catch {
            // Continuar para o erro explícito abaixo.
        }
    }

    throw new Error(
        "Chave pública Supabase indisponível na Edge Function."
    );
}

async function fetchComTimeout(
    input: string,
    init: RequestInit = {},
    timeoutMs = 8000,
) {
    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => {
                controller.abort();
            },
            timeoutMs
        );

    try {
        return await fetch(
            input,
            {
                ...init,

                signal:
                    controller.signal,
            }
        );
    }
    finally {
        clearTimeout(
            timeout
        );
    }
}

async function consultarDnsGoogle(
    hostname: string,
    tipo: string,
) {
    const url =
        `${GOOGLE_DOH}?name=${encodeURIComponent(hostname)}&type=${encodeURIComponent(tipo)}`;

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

        respostas:
            Array.isArray(
                payload?.Answer
            )
                ? payload.Answer
                : [],
    };
}

async function consultarDnsCloudflare(
    hostname: string,
    tipo: string,
) {
    const url =
        `${CLOUDFLARE_DOH}?name=${encodeURIComponent(hostname)}&type=${encodeURIComponent(tipo)}`;

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

        respostas:
            Array.isArray(
                payload?.Answer
            )
                ? payload.Answer
                : [],
    };
}

async function consultarDns(
    hostname: string,
    tipo: string,
) {
    try {
        return await consultarDnsGoogle(
            hostname,
            tipo
        );
    }
    catch (googleError) {
        try {
            return await consultarDnsCloudflare(
                hostname,
                tipo
            );
        }
        catch (cloudflareError) {
            throw new Error(
                (
                    "Não foi possível consultar DNS público. " +
                    (
                        cloudflareError instanceof Error
                            ? cloudflareError.message
                            : googleError instanceof Error
                                ? googleError.message
                                : ""
                    )
                ).trim()
            );
        }
    }
}

function extrairDadosDns(
    respostas: unknown[],
) {
    return respostas
        .map(
            (resposta) => {
                if (
                    !resposta ||
                    typeof resposta !==
                        "object"
                ) {
                    return "";
                }

                const data =
                    (
                        resposta as {
                            data?: unknown;
                        }
                    ).data;

                return texto(
                    data
                )
                    .toLowerCase()
                    .replace(
                        /\.$/,
                        ""
                    );
            }
        )
        .filter(
            Boolean
        );
}

async function diagnosticarDns(
    hostname: string,
) {
    const [
        respostaA,
        respostaCname,
    ] =
        await Promise.all([
            consultarDns(
                hostname,
                "A"
            ),

            consultarDns(
                hostname,
                "CNAME"
            ),
        ]);

    const a =
        extrairDadosDns(
            respostaA.respostas
        );

    const cname =
        extrairDadosDns(
            respostaCname.respostas
        );

    const todos =
        [
            ...a,
            ...cname,
        ];

    const resolve =
        todos.length >
        0;

    const destinoVercelConhecido =
        todos.some(
            (valor) =>
                valor ===
                    "76.76.21.21" ||
                valor ===
                    "216.198.79.1" ||
                /vercel-dns(?:-\d+)?\.com$/i.test(
                    valor
                )
        );

    return {
        ok:
            resolve,

        resolve,

        destinoVercelConhecido,

        a,

        cname,

        provedorA:
            respostaA.provedor,

        provedorCname:
            respostaCname.provedor,
    };
}

async function diagnosticarHttps(
    hostname: string,
) {
    const url =
        `https://${hostname}${HEALTH_PATH}`;

    try {
        const response =
            await fetchComTimeout(
                url,
                {
                    method:
                        "GET",

                    redirect:
                        "follow",

                    cache:
                        "no-store",

                    headers:
                        {
                            Accept:
                                "application/json",

                            "User-Agent":
                                "SafeScan-Tenant-Orchestrator/1.0",
                        },
                },
                10000
            );

        const raw =
            await response.text();

        let payload:
            Record<string, unknown> |
            null =
                null;

        try {
            payload =
                JSON.parse(
                    raw
                );
        }
        catch {
            payload =
                null;
        }

        const proxyMarker =
            texto(
                response.headers.get(
                    PROXY_MARKER_HEADER
                )
            ).toLowerCase();

        const proxyWorkerSafeScan =
            response.ok &&
            proxyMarker ===
                PROXY_MARKER_EXPECTED;

        const assinaturaSafeScan =
            response.ok &&
            payload?.service ===
                HEALTH_SIGNATURE.service &&
            payload?.purpose ===
                HEALTH_SIGNATURE.purpose &&
            payload?.protocol ===
                HEALTH_SIGNATURE.protocol &&
            Number(
                payload?.version
            ) ===
                HEALTH_SIGNATURE.version;

        return {
            ok:
                assinaturaSafeScan &&
                proxyWorkerSafeScan,

            respondeu:
                response.ok,

            assinaturaSafeScan,

            proxyWorkerSafeScan,

            proxyMarker,

            statusHttp:
                response.status,

            url,

            payload:
                assinaturaSafeScan
                    ? payload
                    : null,
        };
    }
    catch (error) {
        return {
            ok:
                false,

            respondeu:
                false,

            assinaturaSafeScan:
                false,

            proxyWorkerSafeScan:
                false,

            proxyMarker:
                "",

            statusHttp:
                null,

            url,

            erro:
                error instanceof Error
                    ? error.message
                    : "Falha desconhecida ao acessar HTTPS.",
        };
    }
}

async function diagnosticarInfraestruturaGlobal() {
    const wildcardHost =
        `infra-server-${Date.now()}.${BASE_DOMAIN}`;

    const dns =
        await diagnosticarDns(
            wildcardHost
        );

    const https =
        await diagnosticarHttps(
            wildcardHost
        );

    const workerValidado =
        dns.ok &&
        https.ok &&
        https.assinaturaSafeScan ===
            true &&
        https.proxyWorkerSafeScan ===
            true;

    return {
        ok:
            true,

        bloqueado:
            !workerValidado,

        modo:
            "infraestrutura",

        consultadoEm:
            new Date().toISOString(),

        wildcardHost,

        dns,

        https,

        worker:
            {
                validado:
                    workerValidado,

                marker:
                    https.proxyMarker ||
                    "",

                assinaturaSafeScan:
                    https.assinaturaSafeScan ===
                    true,

                mensagem:
                    workerValidado
                        ? "Wildcard DNS, HTTPS, assinatura SafeScan e marker do Worker validados."
                        : "A prova server-side do Worker ainda não está GREEN.",
            },

        ativacaoRealHabilitada:
            ATIVACAO_REAL_HABILITADA,
    };
}

Deno.serve(
    async (
        req: Request,
    ) => {
        if (
            req.method ===
            "OPTIONS"
        ) {
            return new Response(
                "ok",
                {
                    headers:
                        corsHeaders,
                }
            );
        }

        if (
            req.method !==
            "POST"
        ) {
            return jsonResponse(
                405,
                {
                    ok:
                        false,

                    erro:
                        "Método não permitido.",
                }
            );
        }

        try {
            const authorization =
                texto(
                    req.headers.get(
                        "Authorization"
                    )
                );

            if (
                !authorization
                    .toLowerCase()
                    .startsWith(
                        "bearer "
                    )
            ) {
                return jsonResponse(
                    401,
                    {
                        ok:
                            false,

                        erro:
                            "Sessão autenticada obrigatória.",
                    }
                );
            }

            const supabaseUrl =
                texto(
                    Deno.env.get(
                        "SUPABASE_URL"
                    )
                );

            if (!supabaseUrl) {
                throw new Error(
                    "SUPABASE_URL indisponível."
                );
            }

            const publishableKey =
                obterChavePublicavel();

            const supabase =
                createClient(
                    supabaseUrl,
                    publishableKey,
                    {
                        auth:
                            {
                                persistSession:
                                    false,

                                autoRefreshToken:
                                    false,

                                detectSessionInUrl:
                                    false,
                            },

                        global:
                            {
                                headers:
                                    {
                                        Authorization:
                                            authorization,
                                    },
                            },
                    }
                );

            const token =
                authorization.replace(
                    /^Bearer\s+/i,
                    ""
                );

            const {
                data:
                    userData,
                error:
                    userError,
            } =
                await supabase.auth.getUser(
                    token
                );

            if (
                userError ||
                !userData?.user?.id
            ) {
                return jsonResponse(
                    401,
                    {
                        ok:
                            false,

                        erro:
                            "Sessão inválida ou expirada.",
                    }
                );
            }

            const {
                data:
                    adminGlobal,
                error:
                    adminError,
            } =
                await supabase.rpc(
                    "usuario_admin_global"
                );

            if (
                adminError ||
                adminGlobal !==
                    true
            ) {
                return jsonResponse(
                    403,
                    {
                        ok:
                            false,

                        erro:
                            "Ativação restrita ao administrador global SafeScan.",
                    }
                );
            }

            let body:
                Record<string, unknown>;

            try {
                body =
                    await req.json();
            }
            catch {
                return jsonResponse(
                    400,
                    {
                        ok:
                            false,

                        erro:
                            "Payload JSON inválido.",
                    }
                );
            }

            const modo =
                texto(
                    body?.modo ||
                    "diagnostico"
                ).toLowerCase();

            if (
                ![
                    "diagnostico",
                    "ativar",
                    "infraestrutura",
                ].includes(
                    modo
                )
            ) {
                return jsonResponse(
                    400,
                    {
                        ok:
                            false,

                        erro:
                            "Modo inválido.",
                    }
                );
            }

            if (
                modo ===
                    "infraestrutura"
            ) {
                const infraestrutura =
                    await diagnosticarInfraestruturaGlobal();

                return jsonResponse(
                    200,
                    infraestrutura
                );
            }

            const tenantId =
                texto(
                    body?.tenantId
                );

            if (
                !uuidValido(
                    tenantId
                )
            ) {
                return jsonResponse(
                    400,
                    {
                        ok:
                            false,

                        erro:
                            "tenantId inválido.",
                    }
                );
            }

            let liberacaoPiloto:
                Record<string, unknown> |
                null =
                    null;

            let liberacaoPilotoAtiva =
                false;

            if (
                !ATIVACAO_REAL_HABILITADA
            ) {
                const {
                    data:
                        liberacaoData,
                    error:
                        liberacaoError,
                } =
                    await supabase.rpc(
                        "admin_obter_liberacao_ativacao_tenant",
                        {
                            p_tenant_id:
                                tenantId,
                        }
                    );

                if (liberacaoError) {
                    throw new Error(
                        liberacaoError.message ||
                        "Não foi possível consultar a liberação piloto do tenant."
                    );
                }

                liberacaoPiloto =
                    liberacaoData &&
                    typeof liberacaoData ===
                        "object"
                        ? liberacaoData as Record<string, unknown>
                        : null;

                liberacaoPilotoAtiva =
                    liberacaoPiloto
                        ?.habilitada ===
                    true;
            }

            const ativacaoPermitida =
                ATIVACAO_REAL_HABILITADA ||
                liberacaoPilotoAtiva;

            if (
                modo ===
                    "ativar" &&
                !ativacaoPermitida
            ) {
                return jsonResponse(
                    403,
                    {
                        ok:
                            false,

                        bloqueado:
                            true,

                        modo,

                        etapa:
                            "gate_ativacao_real",

                        tenantId,

                        ativacaoRealHabilitada:
                            ATIVACAO_REAL_HABILITADA,

                        liberacaoPilotoAtiva,

                        ativacaoPermitida,

                        prontoParaAtivar:
                            false,

                        mensagem:
                            "A ativação real permanece fechada globalmente e este tenant não possui liberação piloto ativa.",
                    }
                );
            }

            const {
                data:
                    tenants,
                error:
                    tenantsError,
            } =
                await supabase.rpc(
                    "admin_listar_tenants_plataforma"
                );

            if (tenantsError) {
                throw new Error(
                    tenantsError.message ||
                    "Não foi possível carregar o tenant."
                );
            }

            const tenant =
                Array.isArray(
                    tenants
                )
                    ? tenants.find(
                        (
                            item:
                                Record<string, unknown>,
                        ) =>
                            texto(
                                item?.tenant_id
                            ) ===
                            tenantId
                    )
                    : null;

            if (!tenant) {
                return jsonResponse(
                    404,
                    {
                        ok:
                            false,

                        erro:
                            "Tenant não localizado.",
                    }
                );
            }

            const slug =
                texto(
                    tenant.tenant_slug
                ).toLowerCase();

            const hostname =
                normalizarHostname(
                    tenant.dominio_principal
                );

            const hostnameEsperado =
                `${slug}.safescanbrasil.com.br`;

            const statusTenant =
                texto(
                    tenant.tenant_status
                ).toLowerCase();

            const statusDominio =
                texto(
                    tenant.dominio_status
                ).toLowerCase();

            const empresasTotal =
                Number(
                    tenant.empresas_total ||
                    0
                );

            const adminsAtivos =
                Number(
                    tenant.admins_ativos ||
                    0
                );

            const possuiBranding =
                tenant.possui_branding ===
                true;

            const requisitosInternos = {
                statusTenant:
                    [
                        "rascunho",
                        "ativo",
                    ].includes(
                        statusTenant
                    ),

                empresa:
                    empresasTotal >=
                    1,

                administrador:
                    adminsAtivos >=
                    1,

                branding:
                    possuiBranding,

                dominioPrincipal:
                    Boolean(
                        hostname
                    ),

                hostnameEsperado:
                    Boolean(
                        hostname
                    ) &&
                    hostname ===
                        hostnameEsperado,

                statusDominio:
                    [
                        "pendente",
                        "ativo",
                    ].includes(
                        statusDominio
                    ),
            };

            const internosOk =
                Object.values(
                    requisitosInternos
                ).every(
                    Boolean
                );

            if (!internosOk) {
                return jsonResponse(
                    200,
                    {
                        ok:
                            true,

                        bloqueado:
                            true,

                        modo,

                        etapa:
                            "pre_requisitos_internos",

                        tenantId,

                        hostname,

                        requisitosInternos,

                        prontoParaAtivar:
                            false,

                        mensagem:
                            "O tenant ainda possui pré-requisitos internos pendentes.",
                    }
                );
            }

            const dns =
                await diagnosticarDns(
                    hostname
                );

            if (!dns.ok) {
                return jsonResponse(
                    200,
                    {
                        ok:
                            true,

                        bloqueado:
                            true,

                        modo,

                        etapa:
                            "dns",

                        tenantId,

                        hostname,

                        requisitosInternos,

                        dns,

                        prontoParaAtivar:
                            false,

                        mensagem:
                            "O domínio ainda não resolve no DNS público.",
                    }
                );
            }

            const https =
                await diagnosticarHttps(
                    hostname
                );

            const prontoParaAtivar =
                dns.ok &&
                https.ok &&
                https.assinaturaSafeScan &&
                https.proxyWorkerSafeScan;

            const diagnostico = {
                ok:
                    true,

                bloqueado:
                    !prontoParaAtivar,

                modo,

                tenantId,

                tenant:
                    {
                        nome:
                            tenant.tenant_nome,

                        slug,

                        status:
                            statusTenant,
                    },

                hostname,

                hostnameEsperado,

                requisitosInternos,

                dns,

                https,

                prontoParaAtivar,

                ativacaoRealHabilitada:
                    ATIVACAO_REAL_HABILITADA,

                liberacaoPilotoAtiva,

                ativacaoPermitida,

                consultadoEm:
                    new Date().toISOString(),
            };

            if (
                modo ===
                "diagnostico"
            ) {
                return jsonResponse(
                    200,
                    diagnostico
                );
            }

            if (!prontoParaAtivar) {
                return jsonResponse(
                    200,
                    {
                        ...diagnostico,

                        mensagem:
                            "A ativação foi bloqueada porque DNS/HTTPS/assinatura SafeScan ainda não estão GREEN.",
                    }
                );
            }

            const {
                data:
                    verificacao,
                error:
                    verificacaoError,
            } =
                await supabase.rpc(
                    "admin_verificar_dominio_tenant",
                    {
                        p_tenant_id:
                            tenantId,

                        p_hostname:
                            hostname,
                    }
                );

            if (verificacaoError) {
                return jsonResponse(
                    409,
                    {
                        ...diagnostico,

                        ok:
                            false,

                        bloqueado:
                            true,

                        etapa:
                            "registrar_verificacao",

                        erro:
                            verificacaoError.message ||
                            "Não foi possível registrar a verificação do domínio.",
                    }
                );
            }

            const {
                data:
                    ativacao,
                error:
                    ativacaoError,
            } =
                await supabase.rpc(
                    "admin_ativar_tenant",
                    {
                        p_tenant_id:
                            tenantId,
                    }
                );

            if (ativacaoError) {
                return jsonResponse(
                    409,
                    {
                        ...diagnostico,

                        ok:
                            false,

                        parcial:
                            true,

                        bloqueado:
                            true,

                        etapa:
                            "ativar_tenant",

                        verificacao,

                        erro:
                            ativacaoError.message ||
                            "O domínio foi verificado, mas a ativação do tenant não pôde ser concluída.",
                    }
                );
            }

            return jsonResponse(
                200,
                {
                    ...diagnostico,

                    ok:
                        true,

                    bloqueado:
                        false,

                    ativado:
                        true,

                    verificacao,

                    ativacao,

                    mensagem:
                        "Cliente ativado com sucesso.",
                }
            );
        }
        catch (error) {
            return jsonResponse(
                500,
                {
                    ok:
                        false,

                    erro:
                        error instanceof Error
                            ? error.message
                            : "Falha inesperada no orquestrador de ativação.",
                }
            );
        }
    }
);