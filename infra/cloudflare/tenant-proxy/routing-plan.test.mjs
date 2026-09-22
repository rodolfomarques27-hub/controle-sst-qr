import assert from "node:assert/strict";

import {
    readFileSync,
} from "node:fs";

import {
    dirname,
    join,
    resolve,
} from "node:path";

import test from "node:test";

import {
    fileURLToPath,
} from "node:url";

import {
    deriveTenantSlug,
} from "./worker.mjs";

const currentDir =
    dirname(
        fileURLToPath(
            import.meta.url
        )
    );

const plan =
    JSON.parse(
        readFileSync(
            join(
                currentDir,
                "routing-plan.json"
            ),
            "utf8"
        )
    );

const wranglerRaw =
    readFileSync(
        join(
            currentDir,
            "wrangler.toml"
        ),
        "utf8"
    );

const runtimeRaw =
    readFileSync(
        resolve(
            currentDir,
            "../../../src/utils/tenantRuntimeContextUtils.js"
        ),
        "utf8"
    );

function extractSetValues(
    source,
    constantName
) {
    const expression =
        new RegExp(
            `const\\s+${constantName}\\s*=\\s*new\\s+Set\\(\\s*\\[(.*?)\\]\\s*\\)`,
            "s"
        );

    const match =
        source.match(
            expression
        );

    assert.ok(
        match,
        `Não foi possível localizar ${constantName}.`
    );

    return [
        ...match[1].matchAll(
            /"([^"]+)"/g
        ),
    ].map(
        (item) =>
            item[1]
    );
}

function hostFromRoutePattern(
    pattern
) {
    return String(
        pattern
    ).replace(
        /\/\*$/,
        ""
    );
}

test(
    "plano permanece declarativo e não executável",
    () => {
        assert.equal(
            plan.schemaVersion,
            2
        );

        assert.equal(
            plan.mode,
            "plan-only"
        );

        assert.equal(
            plan.zone,
            "safescanbrasil.com.br"
        );

        assert.equal(
            plan.workerScript,
            "safescan-tenant-proxy"
        );
    }
);

test(
    "somente hosts com origin próprio possuem bypass",
    () => {
        const expected =
            [
                "www.safescanbrasil.com.br",
                "admin.safescanbrasil.com.br",
                "idealiza.safescanbrasil.com.br",
            ];

        const actual =
            plan.routes.bypass.map(
                (route) =>
                    hostFromRoutePattern(
                        route.pattern
                    )
            );

        assert.equal(
            plan.routes.bypass.length,
            3
        );

        assert.deepEqual(
            [
                ...actual,
            ].sort(),
            [
                ...expected,
            ].sort()
        );

        for (
            const route
            of plan.routes.bypass
        ) {
            assert.equal(
                route.script,
                null,
                route.pattern
            );

            assert.equal(
                deriveTenantSlug(
                    hostFromRoutePattern(
                        route.pattern
                    )
                ),
                null,
                route.pattern
            );
        }
    }
);

test(
    "hosts reservados sem origin permanecem sob wildcard para rejeição fail closed",
    () => {
        const runtimeReserved =
            extractSetValues(
                runtimeRaw,
                "HOSTS_RESERVADOS_SAFE_SCAN"
            );

        const expected =
            runtimeReserved
                .filter(
                    (hostname) =>
                        hostname.endsWith(
                            `.${plan.zone}`
                        )
                )
                .filter(
                    (hostname) =>
                        hostname !==
                        `admin.${plan.zone}`
                );

        const actual =
            plan.routes
                .reservedWorkerRejectHosts;

        assert.equal(
            actual.length,
            7
        );

        assert.deepEqual(
            [
                ...actual,
            ].sort(),
            [
                ...expected,
            ].sort()
        );

        for (
            const hostname
            of actual
        ) {
            assert.equal(
                deriveTenantSlug(
                    hostname
                ),
                null,
                hostname
            );
        }
    }
);

test(
    "hosts de rejeição nunca aparecem nas routes de bypass",
    () => {
        const bypassHosts =
            new Set(
                plan.routes.bypass.map(
                    (route) =>
                        hostFromRoutePattern(
                            route.pattern
                        )
                )
            );

        for (
            const hostname
            of plan.routes.reservedWorkerRejectHosts
        ) {
            assert.equal(
                bypassHosts.has(
                    hostname
                ),
                false,
                hostname
            );
        }
    }
);

test(
    "wildcard permanece associado ao tenant proxy",
    () => {
        assert.deepEqual(
            plan.routes.wildcard,
            {
                pattern:
                    "*.safescanbrasil.com.br/*",

                script:
                    "safescan-tenant-proxy",
            }
        );

        assert.equal(
            deriveTenantSlug(
                "cliente-teste.safescanbrasil.com.br"
            ),
            "cliente-teste"
        );
    }
);

test(
    "wildcard DNS real é preservado sem mutation",
    () => {
        assert.deepEqual(
            plan.dnsWildcard,
            {
                management:
                    "preserve-existing",

                type:
                    "A",

                name:
                    "*.safescanbrasil.com.br",

                content:
                    "76.76.21.21",

                proxied:
                    true,
            }
        );
    }
);

test(
    "wrangler continua sem route ativa",
    () => {
        const activeLines =
            wranglerRaw
                .split(
                    /\r?\n/
                )
                .map(
                    (line) =>
                        line.trim()
                )
                .filter(
                    (line) =>
                        line &&
                        !line.startsWith(
                            "#"
                        )
                );

        const routeLines =
            activeLines.filter(
                (line) =>
                    /^(route|routes)\s*=/.test(
                        line
                    ) ||
                    /^\[\[routes\]\]/.test(
                        line
                    )
            );

        assert.deepEqual(
            routeLines,
            []
        );
    }
);

test(
    "wildcard de subdomínio não representa o apex",
    () => {
        assert.equal(
            plan.routes.wildcard.pattern,
            "*.safescanbrasil.com.br/*"
        );

        assert.equal(
            plan.routes.wildcard.pattern.startsWith(
                "*."
            ),
            true
        );
    }
);
