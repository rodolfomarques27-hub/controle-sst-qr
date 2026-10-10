import { Buffer } from "node:buffer";
import { expect, test as base } from "@playwright/test";

const LOCAL_ORIGIN = "http://127.0.0.1:4173";
const MOCK_PREFIX = "/__mock_supabase__";
const STORAGE_KEY = "sb-127-auth-token";
const TENANT_HOST = "cliente-a.safescanbrasil.com.br";
const TENANT_ID = "00000000-0000-4000-8000-0000000000a1";
const USER_ID = "00000000-0000-4000-8000-0000000000b1";
const USER_EMAIL = "usuario.reg3b@example.test";

function base64Url(valor) {
    return Buffer.from(JSON.stringify(valor)).toString("base64url");
}

function criarJwtFake(expiresAt) {
    const header = base64Url({
        alg: "HS256",
        typ: "JWT",
    });

    const payload = base64Url({
        aud: "authenticated",
        email: USER_EMAIL,
        exp: expiresAt,
        role: "authenticated",
        sub: USER_ID,
    });

    return header + "." + payload + ".reg3b";
}

function criarUsuarioFake() {
    return {
        id: USER_ID,
        aud: "authenticated",
        role: "authenticated",
        email: USER_EMAIL,
        app_metadata: {
            provider: "email",
            providers: ["email"],
        },
        user_metadata: {},
        created_at: "2026-01-01T00:00:00.000Z",
    };
}

function criarSessaoFake({ expirada = false } = {}) {
    const expiresAt = expirada ? 1 : 4102444800;

    return {
        access_token: criarJwtFake(expiresAt),
        token_type: "bearer",
        expires_in: 3600,
        expires_at: expiresAt,
        refresh_token: "reg3b-refresh-token",
        user: criarUsuarioFake(),
    };
}

function respostaTenant() {
    return {
        estado: "resolved",
        hostname: TENANT_HOST,
        tenant: {
            id: TENANT_ID,
            slug: "cliente-a",
            nome: "Cliente A REG-3B",
        },
        dominio: {
            tipo: "subdominio",
            principal: true,
        },
        dominioCanonico: {
            hostname: TENANT_HOST,
            tipo: "subdominio",
            principal: true,
        },
        branding: null,
    };
}

function respostaMembership(scenario) {
    return {
        id: "membership-reg3b",
        tenant_id: scenario.membershipTenantId || TENANT_ID,
        user_id: USER_ID,
        papel: scenario.papel || "consulta",
        status: scenario.membershipStatus || "ativo",
        permissoes: {},
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
    };
}

function catalogoModulosFake() {
    return [
        {
            chave: "nucleo_safescan",
            nome: "Núcleo SafeScan",
            obrigatorio: true,
            ativo: true,
            metadados: {},
        },
    ];
}

async function responderJson(route, valor, status = 200) {
    await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(valor),
    });
}

async function configurarRedeMock(page, scenario) {
    await page.route("**/*", async (route) => {
        const url = new globalThis.URL(route.request().url());

        if (url.origin !== LOCAL_ORIGIN) {
            await route.abort("blockedbyclient");
            return;
        }

        if (!url.pathname.startsWith(MOCK_PREFIX)) {
            await route.continue();
            return;
        }

        const apiPath = url.pathname.slice(MOCK_PREFIX.length);

        if (apiPath === "/auth/v1/token") {
            if (scenario.session === "invalid") {
                await responderJson(
                    route,
                    {
                        code: "refresh_token_not_found",
                        message: "Invalid Refresh Token: Refresh Token Not Found",
                    },
                    400
                );

                return;
            }

            await responderJson(
                route,
                criarSessaoFake()
            );

            return;
        }

        if (apiPath === "/auth/v1/user") {
            await responderJson(
                route,
                criarUsuarioFake()
            );

            return;
        }

        if (apiPath === "/auth/v1/logout") {
            await responderJson(
                route,
                {}
            );

            return;
        }

        if (
            apiPath ===
            "/rest/v1/rpc/resolver_branding_tenant_por_hostname"
        ) {
            await responderJson(
                route,
                respostaTenant()
            );

            return;
        }

        if (
            apiPath ===
            "/rest/v1/rpc/usuario_tem_acesso_tenant"
        ) {
            await responderJson(
                route,
                scenario.accessAllowed !== false
            );

            return;
        }

        if (
            apiPath ===
            "/rest/v1/tenant_memberships"
        ) {
            await responderJson(
                route,
                respostaMembership(
                    scenario
                )
            );

            return;
        }

        if (
            apiPath ===
            "/rest/v1/modulos_sistema"
        ) {
            await responderJson(
                route,
                catalogoModulosFake()
            );

            return;
        }

        if (
            apiPath ===
                "/rest/v1/tenant_modulos" ||
            apiPath ===
                "/rest/v1/tenant_recursos_operacionais"
        ) {
            await responderJson(
                route,
                []
            );

            return;
        }

        if (
            apiPath ===
                "/rest/v1/rpc/registrar_login_usuario_sistema" ||
            apiPath ===
                "/rest/v1/rpc/usuario_permissao_sistema_atual"
        ) {
            await responderJson(
                route,
                null
            );

            return;
        }

        if (
            apiPath.startsWith(
                "/rest/v1/rpc/"
            )
        ) {
            await responderJson(
                route,
                null
            );

            return;
        }

        if (
            apiPath.startsWith(
                "/rest/v1/"
            )
        ) {
            await responderJson(
                route,
                []
            );

            return;
        }

        await responderJson(
            route,
            {},
            404
        );
    });
}

async function prepararSessao(page, scenario) {
    if (
        scenario.session !== "valid" &&
        scenario.session !== "invalid"
    ) {
        return;
    }

    const sessao = criarSessaoFake({
        expirada:
            scenario.session ===
            "invalid",
    });

    await page.addInitScript(
        ({ storageKey, sessionValue }) => {
            const seedKey =
                "__safescan_reg3b_seeded";

            if (
                globalThis.sessionStorage.getItem(
                    seedKey
                ) === "1"
            ) {
                return;
            }

            globalThis.localStorage.setItem(
                storageKey,
                JSON.stringify(
                    sessionValue
                )
            );

            globalThis.sessionStorage.setItem(
                seedKey,
                "1"
            );
        },
        {
            storageKey:
                STORAGE_KEY,

            sessionValue:
                sessao,
        }
    );
}

export const test = base.extend({
    abrirTenantMock: async (
        {
            page,
        },
        use
    ) => {
        let usado = false;

        await use(
            async (
                scenario = {}
            ) => {
                if (usado) {
                    throw new Error(
                        "O cenário tenant mock pode ser aberto somente uma vez por teste."
                    );
                }

                usado = true;

                await configurarRedeMock(
                    page,
                    scenario
                );

                await prepararSessao(
                    page,
                    scenario
                );

                return page.goto(
                    "/dev-app?tenant_host=cliente-a.safescanbrasil.com.br"
                );
            }
        );
    },
});

export {
    expect,
    STORAGE_KEY,
};