import {
    HOST_COMPATIBILIDADE_SAFE_SCAN,
    TIPOS_AMBIENTE_RUNTIME_TENANT,
    classificarAmbienteRuntimeTenant,
} from "../utils/tenantRuntimeContextUtils.js";

export const ROTA_APRESENTACAO_DEV =
    "/apresentacao";

export const ROTA_APP_COMPATIBILIDADE =
    "/app";

export const HOST_SITE_INSTITUCIONAL_APEX =
    "safescanbrasil.com.br";

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

function ehRotaInstitucional(
    pathname
) {
    return (
        pathname === "/" ||
        pathname ===
            ROTA_APRESENTACAO_DEV
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
     * Tenant real sempre permanece operacional.
     */
    if (
        classificacao.tipo ===
        TIPOS_AMBIENTE_RUNTIME_TENANT.TENANT
    ) {
        return false;
    }

    /*
     * /app permanece como entrada operacional
     * de compatibilidade no host institucional.
     */
    if (
        ehRotaAppCompatibilidade(
            pathname
        )
    ) {
        return false;
    }

    /*
     * Rotas públicas operacionais têm prioridade
     * sobre a landing institucional.
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
     * DEV e Preview:
     * raiz = operacional
     * /apresentacao = institucional
     */
    if (
        classificacao.tipo ===
            TIPOS_AMBIENTE_RUNTIME_TENANT.DESENVOLVIMENTO ||
        classificacao.tipo ===
            TIPOS_AMBIENTE_RUNTIME_TENANT.PREVIEW
    ) {
        return (
            pathname ===
            ROTA_APRESENTACAO_DEV
        );
    }

    /*
     * Produção institucional:
     * www.safescanbrasil.com.br
     * safescanbrasil.com.br
     */
    if (
        !ehHostInstitucional(
            classificacao.hostname
        )
    ) {
        return false;
    }

    return ehRotaInstitucional(
        pathname
    );
}

/*
 * Mantém compatibilidade com main.jsx atual.
 * Nenhuma alteração em main.jsx é necessária
 * neste hotfix.
 */
export const deveRenderizarSiteInstitucionalDev =
    deveRenderizarSiteInstitucional;