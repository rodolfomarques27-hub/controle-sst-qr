import {
    supabase,
} from "../../../lib/supabaseClient.js";

const EDGE_CONTATO_COMERCIAL =
    "enviar-contato-comercial";

function textoSeguro(
    valor,
    limite = 500,
) {
    return String(
        valor ?? "",
    )
        .replace(
            /\0/g,
            "",
        )
        .trim()
        .slice(
            0,
            limite,
        );
}

function emailValido(
    valor,
) {
    return (
        valor.length >= 3 &&
        valor.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(
            valor,
        )
    );
}

function mensagemErroEnvio(
    error,
    data,
) {
    return (
        textoSeguro(
            data?.mensagem,
            600,
        ) ||
        textoSeguro(
            data?.erro,
            600,
        ) ||
        textoSeguro(
            error?.context?.json?.mensagem,
            600,
        ) ||
        textoSeguro(
            error?.context?.json?.erro,
            600,
        ) ||
        "O canal comercial está temporariamente indisponível. Tente novamente em alguns instantes."
    );
}

export async function enviarContatoComercialService({
    primeiroNome,
    sobrenome,
    whatsapp,
    empresa,
    cargo,
    email,
    solucao,
    origem,
} = {}) {
    const payload = {
        primeiroNome:
            textoSeguro(
                primeiroNome,
                80,
            ),

        sobrenome:
            textoSeguro(
                sobrenome,
                80,
            ),

        whatsapp:
            textoSeguro(
                whatsapp,
                30,
            ),

        empresa:
            textoSeguro(
                empresa,
                120,
            ),

        cargo:
            textoSeguro(
                cargo,
                120,
            ),

        email:
            textoSeguro(
                email,
                254,
            ).toLowerCase(),

        solucao:
            textoSeguro(
                solucao,
                80,
            ),

        origem:
            textoSeguro(
                origem,
                80,
            ),
    };

    if (
        !payload.primeiroNome ||
        !payload.sobrenome ||
        !payload.whatsapp ||
        !payload.empresa ||
        !payload.cargo ||
        !payload.solucao ||
        !payload.origem
    ) {
        throw new Error(
            "Preencha todos os campos obrigatórios antes de enviar.",
        );
    }

    if (
        !emailValido(
            payload.email,
        )
    ) {
        throw new Error(
            "Informe um e-mail corporativo válido.",
        );
    }

    const {
        data,
        error,
    } =
        await supabase.functions.invoke(
            EDGE_CONTATO_COMERCIAL,
            {
                body:
                    payload,
            },
        );

    if (
        error ||
        data?.ok !== true
    ) {
        throw new Error(
            mensagemErroEnvio(
                error,
                data,
            ),
        );
    }

    return {
        ok:
            true,
    };
}
