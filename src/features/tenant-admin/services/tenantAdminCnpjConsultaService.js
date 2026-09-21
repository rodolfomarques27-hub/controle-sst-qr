import {
    cnpjOnboardingValido,
    normalizarCnpjOnboarding,
} from "./tenantAdminOnboardingService.js";

const BRASIL_API_CNPJ_ENDPOINT =
    "https://brasilapi.com.br/api/cnpj/v1";

const TEMPO_LIMITE_MS =
    12000;

function texto(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function textoMaiusculo(
    valor
) {
    return texto(
        valor
    ).toUpperCase();
}

function normalizarTelefonePublico(
    valor
) {
    return texto(
        valor
    ).replace(
        /\D/g,
        ""
    );
}

async function obterMensagemErro(
    response
) {
    try {
        const payload =
            await response.json();

        return texto(
            payload?.message
        );
    }
    catch {
        return "";
    }
}

export async function consultarCnpjPublicoService({
    cnpj,
} = {}) {
    const documento =
        normalizarCnpjOnboarding(
            cnpj
        );

    if (
        !cnpjOnboardingValido(
            documento
        )
    ) {
        throw new Error(
            "O CNPJ informado possui dígitos inválidos."
        );
    }

    if (
        typeof globalThis.fetch !==
        "function"
    ) {
        throw new Error(
            "Consulta pública de CNPJ indisponível neste navegador."
        );
    }

    const controller =
        new AbortController();

    const timeoutId =
        globalThis.setTimeout(
            () => {
                controller.abort();
            },
            TEMPO_LIMITE_MS
        );

    let response;

    try {
        response =
            await globalThis.fetch(
                `${BRASIL_API_CNPJ_ENDPOINT}/${documento}`,
                {
                    method:
                        "GET",

                    headers:
                        {
                            Accept:
                                "application/json",
                        },

                    signal:
                        controller.signal,

                    cache:
                        "no-store",
                }
            );
    }
    catch (error) {
        if (
            error?.name ===
            "AbortError"
        ) {
            throw new Error(
                "A consulta do CNPJ demorou demais. Tente novamente."
            );
        }

        throw new Error(
            "Não foi possível consultar o CNPJ agora. Verifique sua conexão e tente novamente."
        );
    }
    finally {
        globalThis.clearTimeout(
            timeoutId
        );
    }

    if (
        response.status ===
        404
    ) {
        throw new Error(
            "CNPJ não localizado na consulta pública."
        );
    }

    if (
        response.status ===
        429
    ) {
        throw new Error(
            "O serviço público de consulta atingiu o limite temporário. Aguarde um pouco e tente novamente."
        );
    }

    if (!response.ok) {
        const mensagem =
            await obterMensagemErro(
                response
            );

        throw new Error(
            mensagem ||
            "A consulta pública do CNPJ está temporariamente indisponível."
        );
    }

    const dados =
        await response.json();

    const cnpjRetornado =
        normalizarCnpjOnboarding(
            dados?.cnpj
        );

    if (
        cnpjRetornado !==
        documento
    ) {
        throw new Error(
            "A consulta retornou um CNPJ diferente do informado."
        );
    }

    const situacaoCadastral =
        textoMaiusculo(
            dados?.descricao_situacao_cadastral
        );

    return {
        cnpj:
            documento,

        razaoSocial:
            texto(
                dados?.razao_social
            ),

        nomeFantasia:
            texto(
                dados?.nome_fantasia
            ),

        situacaoCadastral,

        ativa:
            situacaoCadastral ===
            "ATIVA",

        cep:
            texto(
                dados?.cep
            ),

        logradouro:
            texto(
                dados?.logradouro
            ),

        numero:
            texto(
                dados?.numero
            ),

        complemento:
            texto(
                dados?.complemento
            ),

        bairro:
            texto(
                dados?.bairro
            ),

        cidade:
            texto(
                dados?.municipio
            ),

        uf:
            textoMaiusculo(
                dados?.uf
            ),

        email:
            texto(
                dados?.email
            ).toLowerCase(),

        telefone:
            normalizarTelefonePublico(
                dados?.ddd_telefone_1
            ),

        naturezaJuridica:
            texto(
                dados?.natureza_juridica
            ),

        dataSituacaoCadastral:
            texto(
                dados?.data_situacao_cadastral
            ),

        fonte:
            "BrasilAPI / dados públicos do CNPJ",

        consultadoEm:
            new Date().toISOString(),
    };
}