function normalizarStatusDashboard(valor) {
    return String(valor || "")
        .trim()
        .toLocaleUpperCase("pt-BR");
}

function competenciaMesIso(dataReferencia = new Date()) {
    const referencia =
        dataReferencia instanceof Date &&
        !Number.isNaN(dataReferencia.getTime())
            ? dataReferencia
            : new Date();

    const ano =
        referencia.getFullYear();

    const mes =
        String(
            referencia.getMonth() + 1,
        ).padStart(
            2,
            "0",
        );

    return `${ano}-${mes}-01`;
}

function formatarCompetenciaDashboard(valor) {
    const partes =
        String(valor || "")
            .split("-");

    if (
        partes.length < 2 ||
        !partes[0] ||
        !partes[1]
    ) {
        return "";
    }

    return `${partes[1]}/${partes[0]}`;
}

function dadosConsultaDashboard(
    resultado,
    contexto,
    padrao = [],
) {
    if (resultado?.error) {
        throw new Error(
            `${contexto}: ${
                resultado.error.message ||
                "falha na consulta"
            }`,
        );
    }

    return resultado?.data ?? padrao;
}

export async function carregarIndicadoresOperacionaisDashboard({
    supabase,
    dataReferencia = new Date(),
} = {}) {
    if (!supabase) {
        throw new Error(
            "Cliente Supabase não informado para os indicadores operacionais.",
        );
    }

    const competenciaAtual =
        competenciaMesIso(
            dataReferencia,
        );

    const [
        obrasResultado,
        extintoresResultado,
        inspecoesResultado,
        competenciaRecenteResultado,
    ] =
        await Promise.all([
            supabase
                .from("obras")
                .select(
                    "id,nome,cidade,uf,numero_obra,status",
                ),

            supabase
                .from("extintores")
                .select(
                    "id,obra_id,codigo,localizacao,ponto_nome,tipo,capacidade,status,situacao_operacional",
                ),

            supabase
                .from("extintores_inspecoes")
                .select(
                    "extintor_id,competencia",
                )
                .eq(
                    "competencia",
                    competenciaAtual,
                ),

            supabase
                .from(
                    "certidao_mensal_competencias",
                )
                .select("competencia")
                .lte(
                    "competencia",
                    competenciaAtual,
                )
                .order(
                    "competencia",
                    {
                        ascending: false,
                    },
                )
                .limit(1),
        ]);

    const obras =
        dadosConsultaDashboard(
            obrasResultado,
            "Falha ao consultar obras",
        );

    const extintores =
        dadosConsultaDashboard(
            extintoresResultado,
            "Falha ao consultar extintores",
        );

    const inspecoes =
        dadosConsultaDashboard(
            inspecoesResultado,
            "Falha ao consultar inspeções de extintores",
        );

    const competenciasRecentes =
        dadosConsultaDashboard(
            competenciaRecenteResultado,
            "Falha ao consultar a competência documental",
        );

    const obrasAtivasItens =
        obras.filter(
            (obra) =>
                normalizarStatusDashboard(
                    obra?.status,
                ) === "ATIVA",
        );

    const extintoresAtivos =
        extintores.filter(
            (extintor) =>
                normalizarStatusDashboard(
                    extintor?.status,
                ) === "ATIVO",
        );

    const extintoresForaOperacaoItens =
        extintoresAtivos.filter(
            (extintor) =>
                normalizarStatusDashboard(
                    extintor?.situacao_operacional,
                ) !== "EM OPERAÇÃO",
        );

    const idsExtintoresAtivos =
        new Set(
            extintoresAtivos
                .map(
                    (extintor) =>
                        String(
                            extintor?.id ||
                            "",
                        ),
                )
                .filter(Boolean),
        );

    const idsInspecionadosMes =
        new Set(
            inspecoes
                .map(
                    (inspecao) =>
                        String(
                            inspecao?.extintor_id ||
                            "",
                        ),
                )
                .filter(
                    (id) =>
                        id &&
                        idsExtintoresAtivos.has(
                            id,
                        ),
                ),
        );

    const inspecoesExtintoresPendentesItens =
        extintoresAtivos.filter(
            (extintor) =>
                !idsInspecionadosMes.has(
                    String(
                        extintor?.id ||
                        "",
                    ),
                ),
        );

    const competenciaDocumentalIso =
        String(
            competenciasRecentes?.[0]
                ?.competencia ||
            "",
        );

    let competenciasDocumentaisAbertasItens =
        [];

    let pendenciasDocumentaisMensaisItens =
        [];

    if (competenciaDocumentalIso) {
        const competenciasResultado =
            await supabase
                .from(
                    "certidao_mensal_competencias",
                )
                .select(
                    "id,empresa_id,competencia,status",
                )
                .eq(
                    "competencia",
                    competenciaDocumentalIso,
                );

        const competencias =
            dadosConsultaDashboard(
                competenciasResultado,
                "Falha ao consultar competências documentais",
            );

        competenciasDocumentaisAbertasItens =
            competencias.filter(
                (competencia) =>
                    normalizarStatusDashboard(
                        competencia?.status,
                    ) !== "FECHADA",
            );

        const competenciaPorId =
            new Map(
                competencias.map(
                    (competencia) => [
                        String(
                            competencia?.id ||
                            "",
                        ),
                        competencia,
                    ],
                ),
            );

        const competenciaIds =
            competencias
                .map(
                    (competencia) =>
                        String(
                            competencia?.id ||
                            "",
                        ),
                )
                .filter(Boolean);

        if (competenciaIds.length > 0) {
            const pendenciasResultado =
                await supabase
                    .from(
                        "certidao_mensal_itens",
                    )
                    .select(
                        "id,competencia_id,tipo_documento,titulo,status",
                    )
                    .in(
                        "competencia_id",
                        competenciaIds,
                    )
                    .eq(
                        "status",
                        "PENDENTE",
                    );

            const pendencias =
                dadosConsultaDashboard(
                    pendenciasResultado,
                    "Falha ao consultar pendências documentais",
                );

            const pendenciasMensaisValidas =
                pendencias.filter(
                    (item) =>
                        String(
                            item?.tipo_documento ||
                            "",
                        )
                            .trim()
                            .toLocaleLowerCase(
                                "pt-BR",
                            ) !==
                        "aso-pcmso",
                );

            pendenciasDocumentaisMensaisItens =
                pendenciasMensaisValidas.map(
                    (item) => {
                        const competencia =
                            competenciaPorId.get(
                                String(
                                    item?.competencia_id ||
                                    "",
                                ),
                            );

                        return {
                            ...item,
                            empresa_id:
                                competencia?.empresa_id ||
                                null,
                            competencia:
                                competencia?.competencia ||
                                competenciaDocumentalIso,
                        };
                    },
                );
        }
    }

    return {
        obrasAtivas:
            obrasAtivasItens.length,

        competenciasDocumentaisAbertas:
            competenciasDocumentaisAbertasItens.length,

        pendenciasDocumentaisMensais:
            pendenciasDocumentaisMensaisItens.length,

        extintoresForaOperacao:
            extintoresForaOperacaoItens.length,

        inspecoesExtintoresPendentes:
            inspecoesExtintoresPendentesItens.length,

        totalExtintoresAtivos:
            extintoresAtivos.length,

        competenciaDocumental:
            formatarCompetenciaDashboard(
                competenciaDocumentalIso,
            ),

        competenciaInspecao:
            formatarCompetenciaDashboard(
                competenciaAtual,
            ),

        obrasCadastro:
            obras,

        obrasAtivasItens,

        competenciasDocumentaisAbertasItens,

        pendenciasDocumentaisMensaisItens,

        extintoresForaOperacaoItens,

        inspecoesExtintoresPendentesItens,
    };
}