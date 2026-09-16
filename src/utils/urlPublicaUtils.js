const ORIGEM_PUBLICA_PADRAO =
    "https://www.safescanbrasil.com.br";

const textoSeguroUrlPublica =
    (valor = "") =>
        String(
            valor ?? ""
        ).trim();

function hostnameOrigemPublicaBloqueado(
    hostname = ""
) {
    const host =
        String(
            hostname ?? ""
        )
            .trim()
            .toLowerCase()
            .replace(/\.$/, "");

    if (!host) {
        return true;
    }

    const localhost =
        host === "localhost"
        ||
        host.endsWith(
            ".localhost"
        );

    const ipv4Loopback =
        host.startsWith(
            "127."
        );

    const ipv6Loopback =
        host === "::1"
        ||
        host === "[::1]";

    const hostNaoPublico =
        host === "0.0.0.0";

    const previewVercel =
        host === "vercel.app"
        ||
        host.endsWith(
            ".vercel.app"
        );

    return (
        localhost
        ||
        ipv4Loopback
        ||
        ipv6Loopback
        ||
        hostNaoPublico
        ||
        previewVercel
    );
}

function normalizarOrigemPublicaDuravel(
    valor = ""
) {
    const texto =
        textoSeguroUrlPublica(
            valor
        );

    if (!texto) {
        return "";
    }

    try {
        const url =
            new URL(
                texto
            );

        const protocoloValido =
            url.protocol === "https:";

        const credenciaisAusentes =
            !url.username
            &&
            !url.password;

        const portaPublica =
            !url.port;

        const hostnameValido =
            !hostnameOrigemPublicaBloqueado(
                url.hostname
            );

        if (
            !protocoloValido
            ||
            !credenciaisAusentes
            ||
            !portaPublica
            ||
            !hostnameValido
        ) {
            return "";
        }

        return url.origin
            .replace(
                /\/$/,
                ""
            );
    } catch {
        return "";
    }
}

function obterOrigemPublicaConfigurada() {
    const configurada =
        normalizarOrigemPublicaDuravel(
            import.meta.env
                ?.VITE_PUBLIC_APP_URL
        );

    return (
        configurada
        ||
        ORIGEM_PUBLICA_PADRAO
    );
}

export function obterOrigemPublicaSistema(
    origem = ""
) {
    const origemExplicita =
        normalizarOrigemPublicaDuravel(
            origem
        );

    if (origemExplicita) {
        return origemExplicita;
    }

    return obterOrigemPublicaConfigurada();
}

export function montarUrlPublicaSistema(
    caminho = "/",
    origem = ""
) {
    const origemPublica =
        obterOrigemPublicaSistema(
            origem
        );

    const caminhoSeguro =
        textoSeguroUrlPublica(
            caminho
        )
        ||
        "/";

    return (
        `${origemPublica}${
            caminhoSeguro.startsWith("/")
                ? caminhoSeguro
                : `/${caminhoSeguro}`
        }`
    );
}