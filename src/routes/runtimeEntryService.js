import {
    HOST_COMPATIBILIDADE_SAFE_SCAN,
    TIPOS_AMBIENTE_RUNTIME_TENANT,
    classificarAmbienteRuntimeTenant,
} from "../utils/tenantRuntimeContextUtils.js";

export const ROTA_APRESENTACAO_DEV =
    "/apresentacao";

export const ROTA_APP_COMPATIBILIDADE =
    "/app";

export const ROTA_ADMIN_DEV =
    "/admin";

export const ROTA_APP_OPERACIONAL_DEV =
    "/dev-app";

export const HOST_SITE_INSTITUCIONAL_APEX =
    "safescanbrasil.com.br";

export const HOST_ADMIN_SAFE_SCAN =
    "admin.safescanbrasil.com.br";

const PARAMETROS_PUBLICOS_OPERACIONAIS =
    Object.freeze([
        "qr",
        "vistoriaQr",
        "dds",
        "token_dds",
        "tokenDds",
    ]);

const ROTAS_PUBLICAS_OPERACIONAIS =
    Object.freeze([
        "/consulta-ponto",
        "/nova-auditoria-campo",
        "/auditoria-campo",
    ]);

function normalizarPathname(
    valor = ""
) {
    const pathname =
        String(
            valor || "/"
        )
            .trim()
            .toLowerCase();

    if (
        pathname.length > 1 &&
        pathname.endsWith("/")
    ) {
        return pathname.slice(
            0,
            -1
        );
    }

    return pathname || "/";
}

function correspondeRotaOuSubrota(
    pathname,
    rotaBase
) {
    return (
        pathname === rotaBase ||
        pathname.startsWith(
            `${rotaBase}/`
        )
    );
}

function obterBuscasLocalizacao(
    alvo = {}
) {
    const buscas = [];

    const search =
        String(
            alvo.search || ""
        ).trim();

    if (search) {
        buscas.push(
            search
        );
    }

    const hash =
        String(
            alvo.hash || ""
        );

    const indiceQueryHash =
        hash.indexOf("?");

    if (
        indiceQueryHash >= 0
    ) {
        buscas.push(
            hash.slice(
                indiceQueryHash
            )
        );
    }

    return buscas;
}

function possuiParametroPublicoOperacional(
    alvo = {}
) {
    const buscas =
        obterBuscasLocalizacao(
            alvo
        );

    return buscas.some(
        (busca) => {
            const query =
                busca.startsWith("?")
                    ? busca.slice(1)
                    : busca;

            const parametros =
                new URLSearchParams(
                    query
                );

            return PARAMETROS_PUBLICOS_OPERACIONAIS.some(
                (chave) =>
                    Boolean(
                        String(
                            parametros.get(
                                chave
                            ) || ""
                        ).trim()
                    )
            );
        }
    );
}

function ehRotaPublicaOperacional(
    pathname
) {
    return ROTAS_PUBLICAS_OPERACIONAIS.some(
        (rotaBase) =>
            correspondeRotaOuSubrota(
                pathname,
                rotaBase
            )
    );
}

function ehRotaAppCompatibilidade(
    pathname
) {
    return correspondeRotaOuSubrota(
        pathname,
        ROTA_APP_COMPATIBILIDADE
    );
}

function ehRotaAdminDev(
    pathname
) {
    return correspondeRotaOuSubrota(
        pathname,
        ROTA_ADMIN_DEV
    );
}

function ehRotaAppOperacionalDev(
    pathname
) {
    return (
        pathname ===
        ROTA_APP_OPERACIONAL_DEV
    );
}
function ehAmbientePublicoConhecido(
    classificacao = {}
) {
    return (
        classificacao.tipo ===
            TIPOS_AMBIENTE_RUNTIME_TENANT.DESENVOLVIMENTO ||
        classificacao.tipo ===
            TIPOS_AMBIENTE_RUNTIME_TENANT.PREVIEW ||
        ehHostInstitucional(
            classificacao.hostname
        )
    );
}

function ehHostInstitucional(
    hostname = ""
) {
    return (
        hostname ===
            HOST_COMPATIBILIDADE_SAFE_SCAN ||
        hostname ===
            HOST_SITE_INSTITUCIONAL_APEX
    );
}

export function deveRenderizarPainelAdmin(
    localizacao = null
) {
    const alvo =
        localizacao ??
        (
            typeof window !== "undefined"
                ? window.location
                : null
        );

    if (!alvo) {
        return false;
    }

    const pathname =
        normalizarPathname(
            alvo.pathname
        );

    const classificacao =
        classificarAmbienteRuntimeTenant(
            alvo.hostname
        );

    if (
        classificacao.hostname ===
        HOST_ADMIN_SAFE_SCAN
    ) {
        return true;
    }

    if (
        classificacao.tipo ===
            TIPOS_AMBIENTE_RUNTIME_TENANT.DESENVOLVIMENTO ||
        classificacao.tipo ===
            TIPOS_AMBIENTE_RUNTIME_TENANT.PREVIEW
    ) {
        return ehRotaAdminDev(
            pathname
        );
    }

    return false;
}

export function deveRenderizarPortalAcesso(
    localizacao = null
) {
    const alvo =
        localizacao ??
        (
            typeof window !== "undefined"
                ? window.location
                : null
        );

    if (!alvo) {
        return false;
    }

    const pathname =
        normalizarPathname(
            alvo.pathname
        );

    if (
        !ehRotaAppCompatibilidade(
            pathname
        )
    ) {
        return false;
    }

    const classificacao =
        classificarAmbienteRuntimeTenant(
            alvo.hostname
        );

    /*
     * Um hostname tenant continua
     * pertencendo exclusivamente ao tenant.
     *
     * /app nunca substitui o contexto
     * de uma empresa já resolvida pelo host.
     */
    if (
        classificacao.tipo ===
        TIPOS_AMBIENTE_RUNTIME_TENANT.TENANT
    ) {
        return false;
    }

    /*
     * O hostname administrativo pertence
     * exclusivamente ao Painel Mestre.
     */
    if (
        classificacao.hostname ===
        HOST_ADMIN_SAFE_SCAN
    ) {
        return false;
    }

    /*
     * Somente superfícies públicas conhecidas
     * recebem o portal neutro.
     *
     * Hosts desconhecidos ou reservados
     * permanecem fail-closed.
     */
    return ehAmbientePublicoConhecido(
        classificacao
    );
}

export function deveRenderizarSiteInstitucional(
    localizacao = null
) {
    const alvo =
        localizacao ??
        (
            typeof window !== "undefined"
                ? window.location
                : null
        );

    if (!alvo) {
        return false;
    }

    const pathname =
        normalizarPathname(
            alvo.pathname
        );

    const classificacao =
        classificarAmbienteRuntimeTenant(
            alvo.hostname
        );

    /*
     * Tenant real nunca pertence
     * à superfície institucional.
     */
    if (
        classificacao.tipo ===
        TIPOS_AMBIENTE_RUNTIME_TENANT.TENANT
    ) {
        return false;
    }

    const ambienteDevOuPreview =
        (
            classificacao.tipo ===
                TIPOS_AMBIENTE_RUNTIME_TENANT.DESENVOLVIMENTO ||
            classificacao.tipo ===
                TIPOS_AMBIENTE_RUNTIME_TENANT.PREVIEW
        );

    /*
     * Host admin pertence exclusivamente
     * ao Painel Mestre.
     */
    if (
        classificacao.hostname ===
        HOST_ADMIN_SAFE_SCAN
    ) {
        return false;
    }

    /*
     * /admin em DEV/Preview pertence
     * exclusivamente ao Painel Mestre.
     */
    if (
        ambienteDevOuPreview &&
        ehRotaAdminDev(
            pathname
        )
    ) {
        return false;
    }

    /*
     * /app em superfícies públicas conhecidas
     * pertence ao Portal Neutro SafeScan.
     *
     * Hosts tenant já foram excluídos acima
     * e permanecem no App operacional do tenant.
     */
    if (
        ehRotaAppCompatibilidade(
            pathname
        )
    ) {
        return false;
    }

    /*
     * Rotas públicas operacionais e
     * parâmetros de QR/DDS mantêm prioridade.
     */
    if (
        ehRotaPublicaOperacional(
            pathname
        ) ||
        possuiParametroPublicoOperacional(
            alvo
        )
    ) {
        return false;
    }

    /*
     * /dev-app é a entrada explícita do
     * App operacional somente em DEV.
     *
     * Preview, WWW e Apex continuam
     * públicos/institucionais.
     */
    if (
        classificacao.tipo ===
            TIPOS_AMBIENTE_RUNTIME_TENANT.DESENVOLVIMENTO &&
        ehRotaAppOperacionalDev(
            pathname
        )
    ) {
        return false;
    }
    /*
     * Fail-safe público:
     *
     * DEV, Preview, WWW e Apex ficam
     * no institucional por padrão.
     *
     * Uma rota desconhecida ou malformada
     * nunca cai silenciosamente no App.
     */
    if (
        ehAmbientePublicoConhecido(
            classificacao
        )
    ) {
        return true;
    }

    /*
     * Host realmente desconhecido:
     * permanece fail-closed.
     */
    return false;
}

export const deveRenderizarSiteInstitucionalDev =
    deveRenderizarSiteInstitucional;