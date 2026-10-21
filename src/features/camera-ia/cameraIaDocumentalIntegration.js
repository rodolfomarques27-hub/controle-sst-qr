import {
    avaliarTreinamentosColaborador,
    documentoEmAnaliseColaborador,
    normalizarCertificado,
    normalizarColaborador,
    statusGeral,
} from "../../services/colaboradorDocumentosService.js";

export const CAMERA_IA_DOCUMENTO_FICHA_EPI_ID =
    14;

export const CAMERA_IA_DOCUMENTO_ASO_ID =
    22;

const CAMPOS_CERTIFICADOS_CAMERA_IA =
    [
        "id",
        "colaborador_id",
        "treinamento_id",
        "treinamento_codigo",
        "tipo_treinamento",
        "nome_treinamento",
        "data_realizacao",
        "data_vencimento",
        "arquivo_nome",
        "nome_do_arquivo",
        "arquivo_url",
        "url_do_arquivo",
        "observacao",
        "status_validacao",
        "created_at",
    ].join(",");

function normalizarTexto(
    valor = ""
) {
    return String(
        valor ?? ""
    )
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );
}

function idDocumento(
    item = {}
) {
    return Number(
        item?.treinamento?.id ??
        item?.treinamentoId ??
        item?.treinamento_id ??
        item?.realizado?.treinamentoId ??
        item?.realizado?.treinamento_id ??
        0
    );
}

function localizarItemDocumento(
    avaliacao = {},
    documentoId
) {
    const itens =
        Array.isArray(
            avaliacao?.itens
        )
            ? avaliacao.itens
            : [];

    return (
        itens.find(
            (item) =>
                idDocumento(
                    item
                ) ===
                Number(
                    documentoId
                )
        ) ||
        null
    );
}

function possuiArquivoDocumento(
    realizado = {}
) {
    const candidato =
        realizado?.arquivoUrl ||
        realizado?.arquivo_url ||
        realizado?.urlDoArquivo ||
        realizado?.url_do_arquivo ||
        realizado?.arquivo ||
        realizado?.arquivoNome ||
        realizado?.arquivo_nome ||
        "";

    return Boolean(
        String(
            candidato || ""
        ).trim()
    );
}

function resumirDocumento({
    item = null,
    documentoId,
    rotulo,
    exigirArquivo = false,
} = {}) {
    if (!item) {
        return {
            documentoId,
            rotulo,
            badge:
                "conferencia",
            texto:
                "Não localizado",
            detalhe:
                "Documento não localizado para o colaborador conferido.",
            realizado:
                false,
        };
    }

    if (!item.realizado) {
        return {
            documentoId,
            rotulo,
            badge:
                "conferencia",
            texto:
                "Pendente",
            detalhe:
                "Documento obrigatório ainda não lançado.",
            realizado:
                false,
        };
    }

    if (
        documentoEmAnaliseColaborador(
            item
        )
    ) {
        return {
            documentoId,
            rotulo,
            badge:
                "conferencia",
            texto:
                "Em análise",
            detalhe:
                "Documento existente e aguardando conferência.",
            realizado:
                true,
        };
    }

    if (
        exigirArquivo &&
        !possuiArquivoDocumento(
            item.realizado
        )
    ) {
        return {
            documentoId,
            rotulo,
            badge:
                "conferencia",
            texto:
                "Revisar arquivo",
            detalhe:
                "Registro localizado, mas o arquivo documental não está disponível.",
            realizado:
                true,
        };
    }

    const chave =
        String(
            item?.status?.chave ||
            ""
        );

    if (
        chave ===
        "vencido"
    ) {
        return {
            documentoId,
            rotulo,
            badge:
                "bloqueado",
            texto:
                "Vencido",
            detalhe:
                "Documento vencido segundo a regra documental existente.",
            realizado:
                true,
        };
    }

    if (
        chave ===
        "vencendo"
    ) {
        return {
            documentoId,
            rotulo,
            badge:
                "conferencia",
            texto:
                "A vencer",
            detalhe:
                "Documento a vencer em até 30 dias.",
            realizado:
                true,
        };
    }

    if (
        chave ===
            "emdia" ||
        chave ===
            "semvalidade"
    ) {
        return {
            documentoId,
            rotulo,
            badge:
                "conforme",
            texto:
                chave ===
                    "semvalidade"
                    ? "Registro localizado"
                    : "Em dia",
            detalhe:
                item?.status?.texto ||
                "Documento conforme segundo a regra documental existente.",
            realizado:
                true,
        };
    }

    return {
        documentoId,
        rotulo,
        badge:
            "conferencia",
        texto:
            item?.status?.texto ||
            "Conferência necessária",
        detalhe:
            "O documento exige conferência antes de qualquer decisão operacional.",
        realizado:
            true,
    };
}

function resumirVinculo(
    colaborador = {}
) {
    const texto =
        normalizarTexto(
            [
                colaborador?.status,
                colaborador?.statusMobilizacao,
                colaborador?.status_mobilizacao,
            ].filter(
                Boolean
            ).join(" ")
        );

    if (
        texto.includes(
            "inativo"
        ) ||
        texto.includes(
            "inativa"
        ) ||
        texto.includes(
            "demitido"
        ) ||
        texto.includes(
            "demitida"
        ) ||
        texto.includes(
            "desmobilizado"
        ) ||
        texto.includes(
            "desmobilizada"
        )
    ) {
        return {
            badge:
                "bloqueado",
            texto:
                "Sem vínculo operacional ativo",
        };
    }

    return {
        badge:
            "conforme",
        texto:
            "Vínculo ativo",
    };
}

function badgeDocumentacaoGeral(
    status = ""
) {
    if (
        status ===
            "Bloqueado" ||
        status ===
            "Inativo" ||
        status ===
            "Desmobilizado"
    ) {
        return "bloqueado";
    }

    if (
        status ===
            "Com pendência" ||
        status ===
            "Em análise"
    ) {
        return "conferencia";
    }

    return "conforme";
}

function badgeTreinamentos(
    avaliacao = {}
) {
    const pendentes =
        Array.isArray(
            avaliacao?.pendentes
        )
            ? avaliacao.pendentes.length
            : 0;

    const vencidos =
        Array.isArray(
            avaliacao?.vencidos
        )
            ? avaliacao.vencidos.length
            : 0;

    const vencendo =
        Array.isArray(
            avaliacao?.vencendo
        )
            ? avaliacao.vencendo.length
            : 0;

    if (
        pendentes > 0 ||
        vencidos > 0 ||
        vencendo > 0
    ) {
        return "conferencia";
    }

    return "conforme";
}

export function montarResumoDocumentalCameraIa({
    colaborador,
    certificados = [],
} = {}) {
    if (
        !colaborador ||
        typeof colaborador !==
            "object"
    ) {
        throw new TypeError(
            "Colaborador é obrigatório para montar o resumo documental da Câmera IA."
        );
    }

    const colaboradorNormalizado =
        normalizarColaborador(
            colaborador
        );

    const certificadosNormalizados =
        (
            Array.isArray(
                certificados
            )
                ? certificados
                : []
        ).map(
            normalizarCertificado
        );

    const colaboradorCompleto = {
        ...colaboradorNormalizado,
        treinamentos:
            certificadosNormalizados,
    };

    const status =
        statusGeral(
            colaboradorCompleto
        );

    const avaliacao =
        status?.avaliacao ||
        avaliarTreinamentosColaborador(
            colaboradorCompleto
        );

    const fichaEpiItem =
        localizarItemDocumento(
            avaliacao,
            CAMERA_IA_DOCUMENTO_FICHA_EPI_ID
        );

    const asoItem =
        localizarItemDocumento(
            avaliacao,
            CAMERA_IA_DOCUMENTO_ASO_ID
        );

    const total =
        Number(
            avaliacao?.total ||
            0
        );

    const emDia =
        Array.isArray(
            avaliacao?.emDia
        )
            ? avaliacao.emDia.length
            : 0;

    const aVencer =
        Array.isArray(
            avaliacao?.vencendo
        )
            ? avaliacao.vencendo.length
            : 0;

    const vencidos =
        Array.isArray(
            avaliacao?.vencidos
        )
            ? avaliacao.vencidos.length
            : 0;

    const pendentes =
        Array.isArray(
            avaliacao?.pendentes
        )
            ? avaliacao.pendentes.length
            : 0;

    const fichaEpi =
        resumirDocumento({
            item:
                fichaEpiItem,
            documentoId:
                CAMERA_IA_DOCUMENTO_FICHA_EPI_ID,
            rotulo:
                "Ficha de EPI",
            exigirArquivo:
                true,
        });

    const aso =
        resumirDocumento({
            item:
                asoItem,
            documentoId:
                CAMERA_IA_DOCUMENTO_ASO_ID,
            rotulo:
                "ASO",
            exigirArquivo:
                false,
        });

    return {
        colaborador: {
            id:
                colaboradorCompleto.id,
            empresaId:
                colaboradorCompleto.empresaId,
            nome:
                colaboradorCompleto.nome ||
                "Colaborador",
            empresa:
                colaboradorCompleto.empresa ||
                "Empresa não informada",
            funcao:
                colaboradorCompleto.funcao ||
                "-",
            codigo:
                colaboradorCompleto.codigoFuncionario ||
                "-",
        },

        vinculo:
            resumirVinculo(
                colaboradorCompleto
            ),

        documentacao: {
            badge:
                badgeDocumentacaoGeral(
                    status?.texto ||
                    ""
                ),
            texto:
                status?.texto ||
                "Em análise",
            detalhe:
                status?.detalhe ||
                "Situação documental em conferência.",
        },

        treinamentos: {
            badge:
                badgeTreinamentos(
                    avaliacao
                ),
            total,
            emDia,
            aVencer,
            vencidos,
            pendentes,
        },

        aso,

        fichaEpi,

        identidade: {
            badge:
                "conferencia",
            texto:
                "Não homologada",
            detalhe:
                "Identidade facial não participa da decisão de acesso neste estágio.",
        },

        epiVisual: {
            badge:
                "conferencia",
            texto:
                "Não executado",
            detalhe:
                "A ficha documental de EPI não comprova o uso visual do EPI no momento do acesso.",
        },

        decisao: {
            badge:
                "conferencia",
            codigo:
                "CONFERÊNCIA MANUAL",
            detalhe:
                "Dados documentais consultados. Identidade facial e EPI visual ainda não estão homologados para decisão automática.",
        },
    };
}

export async function carregarResumoDocumentalCameraIa({
    supabase,
    empresaId,
    colaboradorId,
} = {}) {
    if (
        !supabase ||
        typeof supabase.from !==
            "function"
    ) {
        throw new TypeError(
            "Cliente Supabase é obrigatório."
        );
    }

    const empresa =
        String(
            empresaId || ""
        ).trim();

    const colaborador =
        String(
            colaboradorId || ""
        ).trim();

    if (
        !empresa ||
        !colaborador
    ) {
        throw new TypeError(
            "Empresa e colaborador são obrigatórios."
        );
    }

    const {
        data:
            colaboradorData,
        error:
            colaboradorError,
    } =
        await supabase
            .from(
                "colaboradores"
            )
            .select(`
                id,
                nome,
                funcao,
                codigo_funcionario,
                status,
                status_mobilizacao,
                empresa_id,
                treinamentos_removidos,
                treinamentos_adicionais,
                empresas (
                    id,
                    nome
                )
            `)
            .eq(
                "id",
                colaborador
            )
            .eq(
                "empresa_id",
                empresa
            )
            .maybeSingle();

    if (
        colaboradorError ||
        !colaboradorData ||
        colaboradorData.id !==
            colaborador ||
        colaboradorData.empresa_id !==
            empresa
    ) {
        throw new Error(
            "CAMERA_IA_COLABORADOR_DOCUMENTAL_INDISPONIVEL"
        );
    }

    const {
        data:
            certificadosData,
        error:
            certificadosError,
    } =
        await supabase
            .from(
                "certificados"
            )
            .select(
                CAMPOS_CERTIFICADOS_CAMERA_IA
            )
            .eq(
                "colaborador_id",
                colaborador
            )
            .order(
                "created_at",
                {
                    ascending:
                        false,
                }
            );

    if (
        certificadosError ||
        !Array.isArray(
            certificadosData
        )
    ) {
        throw new Error(
            "CAMERA_IA_CERTIFICADOS_INDISPONIVEIS"
        );
    }

    return montarResumoDocumentalCameraIa({
        colaborador:
            colaboradorData,
        certificados:
            certificadosData,
    });
}