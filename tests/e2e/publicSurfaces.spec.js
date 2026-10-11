import {
    expect,
    test,
} from "@playwright/test";

const LOCAL_ORIGIN =
    "http://127.0.0.1:4173";

async function bloquearRedeExterna(
    page
) {
    await page.route(
        "**/*",
        async (
            route
        ) => {
            const url =
                route
                    .request()
                    .url();

            const requisicaoLocal =
                url ===
                    LOCAL_ORIGIN ||
                url.startsWith(
                    LOCAL_ORIGIN + "/"
                );

            if (
                requisicaoLocal
            ) {
                await route.continue();

                return;
            }

            await route.abort(
                "blockedbyclient"
            );
        }
    );
}

test.beforeEach(
    async ({
        page,
    }) => {
        await bloquearRedeExterna(
            page
        );
    }
);

test(
    "landing institucional carrega localmente sem backend real",
    async ({
        page,
    }) => {
        const resposta =
            await page.goto(
                "/"
            );

        expect(
            resposta?.ok()
        ).toBe(
            true
        );

        await expect(
            page.locator(
                "h1"
            )
        ).toContainText(
            "Segurança do Trabalho organizada da gestão ao campo."
        );

        await expect(
            page.getByRole(
                "navigation",
                {
                    name:
                        "Navegação principal",
                }
            )
        ).toBeVisible();
    }
);

test(
    "navegação institucional por âncora preserva superfície pública",
    async ({
        page,
    }) => {
        await page.goto(
            "/"
        );

        const linkRecursos =
            page
                .getByRole(
                    "link",
                    {
                        name:
                            "Recursos",

                        exact:
                            true,
                    }
                )
                .first();

        await expect(
            linkRecursos
        ).toBeVisible();

        await linkRecursos.click();

        await expect(
            page
        ).toHaveURL(
            /#recursos$/
        );

        await expect(
            page.locator(
                "#recursos"
            )
        ).toBeVisible();
    }
);

test(
    "rota desconhecida permanece fail-safe no institucional",
    async ({
        page,
    }) => {
        const resposta =
            await page.goto(
                "/rota-inexistente-reg3a"
            );

        expect(
            resposta?.ok()
        ).toBe(
            true
        );

        await expect(
            page.locator(
                "h1"
            )
        ).toContainText(
            "Segurança do Trabalho organizada da gestão ao campo."
        );
    }
);

test(
    "portal neutro /app carrega sem autenticação",
    async ({
        page,
    }) => {
        const resposta =
            await page.goto(
                "/app"
            );

        expect(
            resposta?.ok()
        ).toBe(
            true
        );

        await expect(
            page.getByRole(
                "heading",
                {
                    level:
                        1,

                    name:
                        "Acesse o ambiente da sua empresa",
                }
            )
        ).toBeVisible();

        await expect(
            page.getByLabel(
                "Identificador da empresa"
            )
        ).toBeVisible();

        await expect(
            page.getByRole(
                "button",
                {
                    name:
                        "Continuar para meu ambiente",
                }
            )
        ).toBeDisabled();
    }
);

test(
    "portal /app rejeita identificador reservado",
    async ({
        page,
    }) => {
        await page.goto(
            "/app"
        );

        await page
            .getByLabel(
                "Identificador da empresa"
            )
            .fill(
                "admin"
            );

        const botao =
            page.getByRole(
                "button",
                {
                    name:
                        "Continuar para meu ambiente",
                }
            );

        await expect(
            botao
        ).toBeEnabled();

        await botao.click();

        await expect(
            page.getByRole(
                "alert"
            )
        ).toHaveText(
            "Informe o identificador válido fornecido pela sua empresa."
        );

        await expect(
            page
        ).toHaveURL(
            /\/app$/
        );
    }
);