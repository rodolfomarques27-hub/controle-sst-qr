export const CERTIDAO_MENSAL_RPC_PERFIL_DOCUMENTAL =
    Object.freeze({
        LISTAR:
            "listar_regras_perfil_documental_certidao_mensal",

        SALVAR:
            "admin_salvar_regra_perfil_documental_certidao_mensal",
    });

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_COMPETENCIA =
    /^\d{4}-(0[1-9]|1[0-2])-01$/;

const PADRAO_TIPO_DOCUMENTO =
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const LIMITE_MOTIVO =
    500;

const ESCOPOS_PERFIL_DOCUMENTAL =
    new Set([
        "ANUAL",
        "COMPETENCIA",
    ]);

// SAFE_SCAN_CERT2_V8_EXCECAO_MENSAL

let clienteSupabasePadraoPromise =
    null;

function textoSeguro(
    valor,
    limite = 2000,
) {
    return String(
        valor ?? "",
    )
        .trim()
        .slice(
            0,
            limite,
        );
}

function objetoSeguro(
    valor,
) {
    return (
        valor &&
        typeof valor === "object" &&
        !Array.isArray(valor)
    )
        ? valor
        : {};
}

function criarErroPerfilDocumental(
    erroOriginal,
    mensagem,
    {
        rpc = "",
        etapa = "",
    } = {},
) {
    const erro =
        new Error(
            textoSeguro(
                mensagem,
            ) ||
            "Falha no perfil documental das Certidões Mensais.",
        );

    erro.name =
        "CertidaoMensalPerfilDocumentalError";

    erro.codigo =
        textoSeguro(
            erroOriginal?.code,
            100,
        );

    erro.detalhes =
        textoSeguro(
            erroOriginal?.details ||
                erroOriginal?.message ||
                erroOriginal?.hint,
        );

    erro.rpc =
        textoSeguro(
            rpc,
            200,
        );

    erro.etapa =
        textoSeguro(
            etapa,
            100,
        );

    erro.cause =
        erroOriginal || null;

    return erro;
}

function validarEmpresaId(
    valor,
) {
    const empresaId =
        textoSeguro(
            valor,
            60,
        );

    if (
        !PADRAO_UUID.test(
            empresaId,
        )
    ) {
        throw criarErroPerfilDocumental(
            null,
            "A empresa informada é inválida para o perfil documental.",
            {
                etapa:
                    "validacao_empresa",
            },
        );
    }

    return empresaId;
}

function validarTipoDocumento(
    valor,
) {
    const tipoDocumento =
        textoSeguro(
            valor,
            100,
        ).toLowerCase();

    if (
        !PADRAO_TIPO_DOCUMENTO.test(
            tipoDocumento,
        )
    ) {
        throw criarErroPerfilDocumental(
            null,
            "O tipo documental informado é inválido.",
            {
                etapa:
                    "validacao_tipo_documento",
            },
        );
    }

    return tipoDocumento;
}

function validarCompetenciaInicio(
    valor,
) {
    const competenciaInicio =
        textoSeguro(
            valor,
            10,
        );

    if (
        !PADRAO_COMPETENCIA.test(
            competenciaInicio,
        )
    ) {
        throw criarErroPerfilDocumental(
            null,
            "A competência inicial deve usar o formato YYYY-MM-01.",
            {
                etapa:
                    "validacao_competencia",
            },
        );
    }

    return competenciaInicio;
}

function normalizarMotivo(
    valor,
) {
    const motivo =
        textoSeguro(
            valor,
            LIMITE_MOTIVO + 1,
        );

    if (
        motivo.length >
        LIMITE_MOTIVO
    ) {
        throw criarErroPerfilDocumental(
            null,
            `O motivo deve possuir no máximo ${LIMITE_MOTIVO} caracteres.`,
            {
                etapa:
                    "validacao_motivo",
            },
        );
    }

    return motivo || null;
}

function validarClienteSupabase(
    clienteSupabase,
) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.rpc !==
            "function"
    ) {
        throw criarErroPerfilDocumental(
            null,
            "Cliente Supabase inválido para o perfil documental.",
            {
                etapa:
                    "cliente_supabase",
            },
        );
    }

    return clienteSupabase;
}

async function obterClienteSupabasePadrao() {
    if (!clienteSupabasePadraoPromise) {
        clienteSupabasePadraoPromise =
            import(
                "../../../lib/supabaseClient.js"
            )
                .then(
                    ({
                        supabase,
                    }) =>
                        validarClienteSupabase(
                            supabase,
                        ),
                )
                .catch(
                    (erroOriginal) => {
                        clienteSupabasePadraoPromise =
                            null;

                        throw criarErroPerfilDocumental(
                            erroOriginal,
                            "Não foi possível carregar o cliente Supabase.",
                            {
                                etapa:
                                    "cliente_supabase",
                            },
                        );
                    },
                );
    }

    return clienteSupabasePadraoPromise;
}

async function resolverClienteSupabase(
    clienteSupabase,
) {
    if (clienteSupabase) {
        return validarClienteSupabase(
            clienteSupabase,
        );
    }

    return obterClienteSupabasePadrao();
}

async function executarRpcPerfilDocumental({
    clienteSupabase,
    rpc,
    parametros,
    mensagemErro,
}) {
    const cliente =
        await resolverClienteSupabase(
            clienteSupabase,
        );

    let resposta;

    try {
        resposta =
            await cliente.rpc(
                rpc,
                parametros,
            );
    }
    catch (erroOriginal) {
        throw criarErroPerfilDocumental(
            erroOriginal,
            mensagemErro,
            {
                rpc,
                etapa:
                    "chamada_rpc",
            },
        );
    }

    if (resposta?.error) {
        throw criarErroPerfilDocumental(
            resposta.error,
            mensagemErro,
            {
                rpc,
                etapa:
                    "resposta_rpc",
            },
        );
    }

    return resposta?.data ?? null;
}

function normalizarEscopoPerfilDocumental(
    valor,
    competenciaInicio = "",
) {
    const legadoSemEscopo =
        valor ===
            undefined ||
        valor ===
            null;

    if (legadoSemEscopo) {
        /*
         * Compatibilidade read-only com banco pré-migration.
         */
        return String(
            competenciaInicio || "",
        ).slice(
            5,
            7,
        ) === "01"
            ? "ANUAL"
            : "COMPETENCIA";
    }

    const escopo =
        textoSeguro(
            valor,
            30,
        ).toUpperCase();

    if (
        ESCOPOS_PERFIL_DOCUMENTAL.has(
            escopo,
        )
    ) {
        return escopo;
    }

    throw criarErroPerfilDocumental(
        null,
        "O escopo informado é inválido. Use ANUAL ou COMPETENCIA.",
        {
            etapa:
                "validacao_escopo",
        },
    );
}


export function normalizarRegraPerfilDocumental(
    registro,
) {
    const regra =
        objetoSeguro(
            registro,
        );

    const competenciaInicio =
        textoSeguro(
            regra.competencia_inicio ||
                regra.competenciaInicio,
            10,
        );

    return {
        id:
            textoSeguro(
                regra.id,
                60,
            ) ||
            null,

        empresaId:
            textoSeguro(
                regra.empresa_id ||
                    regra.empresaId,
                60,
            ) ||
            null,

        tipoDocumento:
            textoSeguro(
                regra.tipo_documento ||
                    regra.tipoDocumento,
                100,
            ).toLowerCase(),

        exigido:
            regra.exigido === true,

        escopo:
            normalizarEscopoPerfilDocumental(
                regra.escopo,
                competenciaInicio,
            ),

        competenciaInicio,

        motivo:
            textoSeguro(
                regra.motivo,
                LIMITE_MOTIVO,
            ) ||
            null,

        criadoEm:
            textoSeguro(
                regra.criado_em ||
                    regra.criadoEm,
                100,
            ) ||
            null,

        criadoPor:
            textoSeguro(
                regra.criado_por ||
                    regra.criadoPor,
                60,
            ) ||
            null,

        atualizadoEm:
            textoSeguro(
                regra.atualizado_em ||
                    regra.atualizadoEm,
                100,
            ) ||
            null,

        atualizadoPor:
            textoSeguro(
                regra.atualizado_por ||
                    regra.atualizadoPor,
                60,
            ) ||
            null,
    };
}


export async function listarRegrasPerfilDocumentalCertidaoMensal(
    empresaId,
    {
        clienteSupabase = null,
    } = {},
) {
    const empresaIdNormalizado =
        validarEmpresaId(
            empresaId,
        );

    const data =
        await executarRpcPerfilDocumental({
            clienteSupabase,

            rpc:
                CERTIDAO_MENSAL_RPC_PERFIL_DOCUMENTAL
                    .LISTAR,

            parametros: {
                p_empresa_id:
                    empresaIdNormalizado,
            },

            mensagemErro:
                "Não foi possível carregar o perfil documental da empresa.",
        });

    return (
        Array.isArray(data)
            ? data
            : []
    ).map(
        normalizarRegraPerfilDocumental,
    );
}

export async function salvarRegraPerfilDocumentalCertidaoMensal(
    dados,
    {
        clienteSupabase = null,
    } = {},
) {
    const registro =
        objetoSeguro(
            dados,
        );

    const empresaId =
        validarEmpresaId(
            registro.empresaId,
        );

    const tipoDocumento =
        validarTipoDocumento(
            registro.tipoDocumento,
        );

    if (
        typeof registro.exigido !==
        "boolean"
    ) {
        throw criarErroPerfilDocumental(
            null,
            "O estado de exigibilidade deve ser verdadeiro ou falso.",
            {
                etapa:
                    "validacao_exigibilidade",
            },
        );
    }

    const competenciaInicio =
        validarCompetenciaInicio(
            registro.competenciaInicio,
        );

    const escopo =
        normalizarEscopoPerfilDocumental(
            registro.escopo,
            competenciaInicio,
        );

    if (
        !ESCOPOS_PERFIL_DOCUMENTAL.has(
            escopo,
        )
    ) {
        throw criarErroPerfilDocumental(
            null,
            "O escopo da regra deve ser ANUAL ou COMPETENCIA.",
            {
                etapa:
                    "validacao_escopo",
            },
        );
    }

    const motivo =
        normalizarMotivo(
            registro.motivo,
        );

    const data =
        await executarRpcPerfilDocumental({
            clienteSupabase,

            rpc:
                CERTIDAO_MENSAL_RPC_PERFIL_DOCUMENTAL
                    .SALVAR,

            parametros: {
                p_empresa_id:
                    empresaId,

                p_tipo_documento:
                    tipoDocumento,

                p_exigido:
                    registro.exigido,

                p_competencia_inicio:
                    competenciaInicio,

                p_escopo:
                    escopo,

                p_motivo:
                    motivo,
            },

            mensagemErro:
                "Não foi possível salvar a regra do perfil documental.",
        });

    const resposta =
        objetoSeguro(
            Array.isArray(data)
                ? data[0]
                : data,
        );

    const regraBruta =
        objetoSeguro(
            resposta.regra,
        );

    if (
        resposta.ok !== true ||
        !regraBruta.id
    ) {
        throw criarErroPerfilDocumental(
            null,
            "O banco retornou uma resposta inválida ao salvar o perfil documental.",
            {
                rpc:
                    CERTIDAO_MENSAL_RPC_PERFIL_DOCUMENTAL
                        .SALVAR,

                etapa:
                    "normalizacao_resposta",
            },
        );
    }

    return {
        ok:
            true,

        regra:
            normalizarRegraPerfilDocumental(
                regraBruta,
            ),

        proximaRegraInicio:
            textoSeguro(
                resposta.proximaRegraInicio ||
                    resposta.proxima_regra_inicio,
                10,
            ) ||
            null,

        historicoProtegido:
            resposta.historicoProtegido ===
                true ||
            resposta.historico_protegido ===
                true,
    };
}