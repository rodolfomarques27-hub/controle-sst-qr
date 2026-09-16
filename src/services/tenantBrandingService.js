import { obterUrlPublicaStorage } from "./supabaseServices";

const BUCKET_BRANDING_TENANT =
    "logos-empresas";

const REGEX_UUID_BRANDING_TENANT =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textoBrandingSeguro(
    valor = ""
) {
    return String(
        valor || ""
    ).trim();
}

export function tenantIdBrandingValido(
    valor
) {
    return REGEX_UUID_BRANDING_TENANT.test(
        textoBrandingSeguro(
            valor
        )
    );
}

export function resolverTenantIdBrandingRecursoService({
    tenantId = "",
    empresaId = "",
    empresas = [],
} = {}) {
    const tenantDireto =
        textoBrandingSeguro(
            tenantId
        );

    if (
        tenantIdBrandingValido(
            tenantDireto
        )
    ) {
        return tenantDireto;
    }

    const empresaIdNormalizado =
        textoBrandingSeguro(
            empresaId
        );

    if (
        !empresaIdNormalizado ||
        !Array.isArray(empresas)
    ) {
        return "";
    }

    const empresa =
        empresas.find(
            (item) =>
                textoBrandingSeguro(
                    item?.id ||
                    item?.empresaId ||
                    item?.empresa_id
                ) ===
                empresaIdNormalizado
        ) ||
        null;

    const tenantEmpresa =
        textoBrandingSeguro(
            empresa?.tenant_id ||
            empresa?.tenantId
        );

    return tenantIdBrandingValido(
        tenantEmpresa
    )
        ? tenantEmpresa
        : "";
}

export function obterUrlLogoQrCodeTenantService({
    tenantId = "",
    versao = "",
} = {}) {
    const tenantIdNormalizado =
        textoBrandingSeguro(
            tenantId
        );

    if (
        !tenantIdBrandingValido(
            tenantIdNormalizado
        )
    ) {
        return "";
    }

    return obterUrlPublicaStorage(
        BUCKET_BRANDING_TENANT,
        tenantIdNormalizado +
            "/branding/qrcode/logo-qrcode.png",
        textoBrandingSeguro(
            versao
        )
    );
}

export function resolverBrandingLoginRuntimeService({
    branding = null,
} = {}) {
    const valor =
        branding &&
        typeof branding === "object"
            ? branding
            : {};

    const bucket =
        textoBrandingSeguro(
            valor.bucket
        ) ||
        BUCKET_BRANDING_TENANT;

    if (
        bucket !==
        BUCKET_BRANDING_TENANT
    ) {
        return {
            fundoLoginUrl: "",
            logoContratanteUrl: "",
            ajusteFundoLogin: null,
            tenantAware: false,
        };
    }

    const versao =
        textoBrandingSeguro(
            valor.versao
        );

    const fundoLoginPath =
        textoBrandingSeguro(
            valor.fundoLoginPath
        );

    const logoLoginPath =
        textoBrandingSeguro(
            valor.logoLoginPath
        );

    return {
        fundoLoginUrl:
            fundoLoginPath
                ? obterUrlPublicaStorage(
                    bucket,
                    fundoLoginPath,
                    versao
                )
                : "",

        logoContratanteUrl:
            logoLoginPath
                ? obterUrlPublicaStorage(
                    bucket,
                    logoLoginPath,
                    versao
                )
                : "",

        ajusteFundoLogin:
            valor.ajusteFundoLogin &&
            typeof valor.ajusteFundoLogin ===
                "object"
                ? valor.ajusteFundoLogin
                : null,

        tenantAware:
            Boolean(
                fundoLoginPath ||
                logoLoginPath
            ),
    };
}
