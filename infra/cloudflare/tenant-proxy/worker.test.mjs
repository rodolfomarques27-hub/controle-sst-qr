import assert from "node:assert/strict";

import test from "node:test";

import {
    buildOriginUrl,
    deriveTenantSlug,
} from "./worker.mjs";

test(
    "extrai slug de tenant válido",
    () => {
        assert.equal(
            deriveTenantSlug(
                "teste.safescanbrasil.com.br"
            ),
            "teste"
        );

        assert.equal(
            deriveTenantSlug(
                "empresa-123.safescanbrasil.com.br"
            ),
            "empresa-123"
        );
    }
);

test(
    "rejeita domínios fora da zona SafeScan",
    () => {
        assert.equal(
            deriveTenantSlug(
                "teste.example.com"
            ),
            null
        );

        assert.equal(
            deriveTenantSlug(
                "safescanbrasil.com.br"
            ),
            null
        );
    }
);

test(
    "rejeita hostnames profundos",
    () => {
        assert.equal(
            deriveTenantSlug(
                "abc.teste.safescanbrasil.com.br"
            ),
            null
        );
    }
);

test(
    "preserva hosts reservados fora do proxy tenant",
    () => {
        assert.equal(
            deriveTenantSlug(
                "www.safescanbrasil.com.br"
            ),
            null
        );

        assert.equal(
            deriveTenantSlug(
                "admin.safescanbrasil.com.br"
            ),
            null
        );

        assert.equal(
            deriveTenantSlug(
                "idealiza.safescanbrasil.com.br"
            ),
            null
        );
    }
);

test(
    "rejeita todos os hosts reservados da plataforma",
    () => {
        const reservedHosts =
            [
                "www.safescanbrasil.com.br",
                "admin.safescanbrasil.com.br",
                "app.safescanbrasil.com.br",
                "api.safescanbrasil.com.br",
                "qr.safescanbrasil.com.br",
                "status.safescanbrasil.com.br",
                "assets.safescanbrasil.com.br",
                "static.safescanbrasil.com.br",
                "auth.safescanbrasil.com.br",
                "idealiza.safescanbrasil.com.br",
            ];

        for (const hostname of reservedHosts) {
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
    "rejeita label inválida",
    () => {
        assert.equal(
            deriveTenantSlug(
                "-teste.safescanbrasil.com.br"
            ),
            null
        );

        assert.equal(
            deriveTenantSlug(
                "teste-.safescanbrasil.com.br"
            ),
            null
        );

        assert.equal(
            deriveTenantSlug(
                "teste_cliente.safescanbrasil.com.br"
            ),
            null
        );
    }
);

test(
    "reescreve somente o origin e preserva path/query",
    () => {
        const result =
            buildOriginUrl(
                "https://teste.safescanbrasil.com.br/admin/login?origem=tenant"
            );

        assert.ok(
            result
        );

        assert.equal(
            result.slug,
            "teste"
        );

        assert.equal(
            result.url.protocol,
            "https:"
        );

        assert.equal(
            result.url.hostname,
            "www.safescanbrasil.com.br"
        );

        assert.equal(
            result.url.pathname,
            "/admin/login"
        );

        assert.equal(
            result.url.search,
            "?origem=tenant"
        );
    }
);

test(
    "health marker utiliza o mesmo origin canônico",
    () => {
        const result =
            buildOriginUrl(
                "https://cliente-a.safescanbrasil.com.br/safescan-tenant-health.json"
            );

        assert.ok(
            result
        );

        assert.equal(
            result.url.toString(),
            "https://www.safescanbrasil.com.br/safescan-tenant-health.json"
        );
    }
);