import {
    expect,
    STORAGE_KEY,
    test,
} from "./fixtures/safescanTenant.fixture.js";

test("rota operacional protegida sem sessão permanece no login", async ({
    page,
    abrirTenantMock,
}) => {
    const resposta = await abrirTenantMock({
        session: "none",
    });

    expect(resposta?.ok()).toBe(true);

    await expect(
        page.getByRole("heading", {
            level: 1,
            name: "Bem-vindo de volta",
        })
    ).toBeVisible();
});

test("refresh inválido limpa a sessão fake e retorna ao login", async ({
    page,
    abrirTenantMock,
}) => {
    await abrirTenantMock({
        session: "invalid",
    });

    await expect(
        page.getByRole("heading", {
            level: 1,
            name: "Bem-vindo de volta",
        })
    ).toBeVisible({
        timeout: 15_000,
    });

    const chavesSessao =
        await page.evaluate(
            (
                storageKey
            ) => {
                return Object
                    .keys(
                        globalThis.localStorage
                    )
                    .filter(
                        (
                            chave
                        ) => {
                            return (
                                chave ===
                                    storageKey ||
                                chave.startsWith(
                                    storageKey +
                                    "-"
                                )
                            );
                        }
                    );
            },
            STORAGE_KEY
        );

    expect(
        chavesSessao
    ).toEqual(
        []
    );
});

test("membership bloqueada não entra no ambiente autenticado", async ({
    page,
    abrirTenantMock,
}) => {
    await abrirTenantMock({
        session: "valid",
        accessAllowed: true,
        membershipStatus: "bloqueado",
    });

    await expect(
        page.getByRole("heading", {
            level: 2,
            name: "Acesso não autorizado",
        })
    ).toBeVisible();

    await expect(
        page.getByText(
            "Seu usuário não possui acesso ativo a este ambiente."
        )
    ).toBeVisible();
});

test("membership de outro tenant é rejeitada pelo isolamento", async ({
    page,
    abrirTenantMock,
}) => {
    await abrirTenantMock({
        session: "valid",
        accessAllowed: true,
        membershipTenantId:
            "00000000-0000-4000-8000-0000000000ff",
        membershipStatus: "ativo",
        papel: "consulta",
    });

    await expect(
        page.getByRole("heading", {
            level: 2,
            name: "Acesso não autorizado",
        })
    ).toBeVisible();
});

test("papel consulta entra no dashboard mas não recebe Acessos do App", async ({
    page,
    abrirTenantMock,
}) => {
    await abrirTenantMock({
        session: "valid",
        accessAllowed: true,
        membershipStatus: "ativo",
        papel: "consulta",
    });

    const heroDashboard =
        page.locator(
            ".dashboard-hero-sst"
        );

    await expect(
        heroDashboard
    ).toBeVisible({
        timeout: 15_000,
    });

    await expect(
        heroDashboard
    ).toContainText(
        "Bem-vindo ao painel SST."
    );

    await expect(
        page.getByText(
            "Acessos do App",
            {
                exact: true,
            }
        )
    ).toHaveCount(
        0
    );
});