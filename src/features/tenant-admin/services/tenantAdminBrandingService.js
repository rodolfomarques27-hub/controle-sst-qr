import { obterUrlPublicaStorage } from "../../../services/supabaseServices";

const BUCKET_BRANDING_TENANT =
    "logos-empresas";

const LIMITE_FUNDO_BYTES =
    5 * 1024 * 1024;

const LIMITE_LOGO_BYTES =
    2 * 1024 * 1024;

const AJUSTE_PADRAO =
    Object.freeze({
        size: "cover",
        position: "center center",
        overlay: 0.62,
    });

function textoSeguro(
    valor = ""
) {
    return String(
        valor || ""
    ).trim();
}

function validarTenantId(
    tenantId
) {
    const valor =
        textoSeguro(
            tenantId
        );

    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            valor
        )
    ) {
        throw new Error(
            "Tenant inválido para identidade visual."
        );
    }

    return valor;
}

function caminhosBranding(
    tenantId
) {
    const base =
        `${tenantId}/branding/login`;

    return {
        pasta:
            base,

        fundo:
            `${base}/fundo-login.jpg`,

        logo:
            `${base}/logo-contratante.png`,
    };
}

export function normalizarAjusteBrandingTenantAdmin(
    valor = {}
) {
    const size =
        String(
            valor?.size ||
            AJUSTE_PADRAO.size
        )
            .trim()
            .toLowerCase();

    const position =
        String(
            valor?.position ||
            AJUSTE_PADRAO.position
        ).trim();

    const overlayNumerico =
        Number(
            valor?.overlay
        );

    return {
        size:
            [
                "cover",
                "contain",
            ].includes(
                size
            )
                ? size
                : AJUSTE_PADRAO.size,

        position:
            [
                "center center",
                "center top",
                "center bottom",
                "left center",
                "right center",
            ].includes(
                position
            )
                ? position
                : AJUSTE_PADRAO.position,

        overlay:
            Number.isFinite(
                overlayNumerico
            )
                ? Math.min(
                    0.82,
                    Math.max(
                        0.28,
                        overlayNumerico
                    )
                )
                : AJUSTE_PADRAO.overlay,
    };
}

export function obterLimitesBrandingTenantAdmin() {
    return {
        fundoBytes:
            LIMITE_FUNDO_BYTES,

        logoBytes:
            LIMITE_LOGO_BYTES,

        tiposFundo:
            [
                "image/jpeg",
                "image/png",
                "image/webp",
            ],

        tipoLogo:
            "image/png",
    };
}

export async function carregarBrandingTenantAdminService({
    supabase,
    tenantId,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const id =
        validarTenantId(
            tenantId
        );

    const caminhos =
        caminhosBranding(
            id
        );

    const [
        configuracaoResultado,
        storageResultado,
    ] =
        await Promise.all([
            supabase
                .from(
                    "tenant_branding"
                )
                .select(
                    "tenant_id,fundo_login_ajuste,updated_at"
                )
                .eq(
                    "tenant_id",
                    id
                )
                .maybeSingle(),

            supabase
                .storage
                .from(
                    BUCKET_BRANDING_TENANT
                )
                .list(
                    caminhos.pasta,
                    {
                        limit:
                            20,

                        sortBy: {
                            column:
                                "name",

                            order:
                                "asc",
                        },
                    }
                ),
        ]);

    if (
        configuracaoResultado.error
    ) {
        throw new Error(
            configuracaoResultado
                .error
                .message ||
            "Não foi possível carregar a configuração visual do tenant."
        );
    }

    if (
        storageResultado.error
    ) {
        throw new Error(
            storageResultado
                .error
                .message ||
            "Não foi possível consultar os arquivos de identidade visual."
        );
    }

    const arquivos =
        Array.isArray(
            storageResultado.data
        )
            ? storageResultado.data
            : [];

    const fundo =
        arquivos.find(
            (arquivo) =>
                arquivo?.name ===
                "fundo-login.jpg"
        ) ||
        null;

    const logo =
        arquivos.find(
            (arquivo) =>
                arquivo?.name ===
                "logo-contratante.png"
        ) ||
        null;

    const versao =
        [
            configuracaoResultado
                .data
                ?.updated_at,
            fundo?.updated_at,
            logo?.updated_at,
        ]
            .filter(
                Boolean
            )
            .sort(
                (a, b) =>
                    a.localeCompare(
                        b
                    )
            )
            .at(
                -1
            ) ||
        "";

    return {
        tenantId:
            id,

        configurado:
            Boolean(
                configuracaoResultado
                    .data
            ),

        ajuste:
            normalizarAjusteBrandingTenantAdmin(
                configuracaoResultado
                    .data
                    ?.fundo_login_ajuste
            ),

        fundoUrl:
            fundo
                ? obterUrlPublicaStorage(
                    BUCKET_BRANDING_TENANT,
                    caminhos.fundo,
                    versao
                )
                : "",

        logoUrl:
            logo
                ? obterUrlPublicaStorage(
                    BUCKET_BRANDING_TENANT,
                    caminhos.logo,
                    versao
                )
                : "",

        possuiFundo:
            Boolean(
                fundo
            ),

        possuiLogo:
            Boolean(
                logo
            ),

        updatedAt:
            configuracaoResultado
                .data
                ?.updated_at ||
            null,
    };
}

export async function salvarAjusteBrandingTenantAdminService({
    supabase,
    tenantId,
    ajuste,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const id =
        validarTenantId(
            tenantId
        );

    const ajusteFinal =
        normalizarAjusteBrandingTenantAdmin(
            ajuste
        );

    const {
        data,
        error,
    } =
        await supabase
            .from(
                "tenant_branding"
            )
            .upsert(
                {
                    tenant_id:
                        id,

                    fundo_login_ajuste:
                        ajusteFinal,
                },
                {
                    onConflict:
                        "tenant_id",
                }
            )
            .select(
                "tenant_id,fundo_login_ajuste,updated_at"
            )
            .single();

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível salvar a aparência do login."
        );
    }

    return data;
}

export async function salvarFundoBrandingTenantAdminService({
    supabase,
    tenantId,
    arquivo,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const id =
        validarTenantId(
            tenantId
        );

    if (!arquivo) {
        throw new Error(
            "Imagem de fundo não informada."
        );
    }

    if (
        Number(
            arquivo.size ||
            0
        ) >
        LIMITE_FUNDO_BYTES
    ) {
        throw new Error(
            "A imagem de fundo excede 5 MiB."
        );
    }

    const {
        error,
    } =
        await supabase
            .storage
            .from(
                BUCKET_BRANDING_TENANT
            )
            .upload(
                caminhosBranding(
                    id
                ).fundo,
                arquivo,
                {
                    upsert:
                        true,

                    cacheControl:
                        "60",

                    contentType:
                        arquivo.type ||
                        "image/jpeg",
                }
            );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível salvar o fundo do login."
        );
    }
}

export async function salvarLogoBrandingTenantAdminService({
    supabase,
    tenantId,
    arquivo,
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const id =
        validarTenantId(
            tenantId
        );

    if (!arquivo) {
        throw new Error(
            "Logo não informada."
        );
    }

    if (
        String(
            arquivo.type ||
            ""
        ).toLowerCase() !==
        "image/png"
    ) {
        throw new Error(
            "A logo deve estar em PNG."
        );
    }

    if (
        Number(
            arquivo.size ||
            0
        ) >
        LIMITE_LOGO_BYTES
    ) {
        throw new Error(
            "A logo excede 2 MiB."
        );
    }

    const {
        error,
    } =
        await supabase
            .storage
            .from(
                BUCKET_BRANDING_TENANT
            )
            .upload(
                caminhosBranding(
                    id
                ).logo,
                arquivo,
                {
                    upsert:
                        true,

                    cacheControl:
                        "60",

                    contentType:
                        "image/png",
                }
            );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível salvar a logo do login."
        );
    }
}

async function removerArquivoBranding({
    supabase,
    tenantId,
    tipo,
}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado."
        );
    }

    const id =
        validarTenantId(
            tenantId
        );

    const caminhos =
        caminhosBranding(
            id
        );

    const caminho =
        tipo ===
            "logo"
            ? caminhos.logo
            : caminhos.fundo;

    const {
        error,
    } =
        await supabase
            .storage
            .from(
                BUCKET_BRANDING_TENANT
            )
            .remove(
                [
                    caminho,
                ]
            );

    if (error) {
        throw new Error(
            error.message ||
            "Não foi possível remover o arquivo de identidade visual."
        );
    }
}

export async function removerFundoBrandingTenantAdminService(
    parametros = {}
) {
    return removerArquivoBranding({
        ...parametros,
        tipo:
            "fundo",
    });
}

export async function removerLogoBrandingTenantAdminService(
    parametros = {}
) {
    return removerArquivoBranding({
        ...parametros,
        tipo:
            "logo",
    });
}