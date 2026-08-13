const OBRA_SEM_VINCULO_ID = "__sem_obra__";

function textoSeguro(valor, limite = 1000) {
    return String(valor ?? "")
        .trim()
        .slice(0, limite);
}

function normalizarChave(valor) {
    return textoSeguro(valor, 500)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function obterEmpresaId(empresa = {}) {
    return textoSeguro(
        empresa.id ||
        empresa.empresaId ||
        empresa.empresa_id,
        80,
    );
}

function obterEmpresaPaiId(empresa = {}) {
    return textoSeguro(
        empresa.empresaPaiId ||
        empresa.empresa_pai_id ||
        empresa.empresaPai?.id ||
        empresa.empresa_pai?.id,
        80,
    );
}

function obterTipoEmpresa(empresa = {}) {
    return textoSeguro(
        empresa.tipoEmpresa ||
        empresa.tipo_empresa ||
        empresa.tipo,
        120,
    );
}

function empresaContratante(empresa = {}) {
    return normalizarChave(
        obterTipoEmpresa(empresa),
    ).includes("contratante");
}

function normalizarEmpresaBanco(empresa = {}) {
    return {
        ...empresa,
        id: obterEmpresaId(empresa),
        nome: textoSeguro(
            empresa.nome ||
            empresa.razaoSocial ||
            empresa.razao_social ||
            "Empresa sem identificação",
            300,
        ),
        cnpj: textoSeguro(
            empresa.cnpj ||
            empresa.documento,
            60,
        ),
        empresaPaiId:
            obterEmpresaPaiId(empresa),
        tipoEmpresa:
            obterTipoEmpresa(empresa),
        logoUrl: textoSeguro(
            empresa.logoUrl ||
            empresa.logoURL ||
            empresa.logo_url,
            1200,
        ),
    };
}

function obterObraId(vinculo = {}) {
    return textoSeguro(
        vinculo.obraId ||
        vinculo.obra_id ||
        vinculo.obra?.id,
        80,
    );
}

function normalizarObra(obra = {}, obraId = "") {
    return {
        id: textoSeguro(
            obra.id || obraId,
            80,
        ),
        nome: textoSeguro(
            obra.nome ||
            obra.nomeObra ||
            obra.nome_obra ||
            "Obra sem identificação",
            300,
        ),
        numeroObra: textoSeguro(
            obra.numeroObra ||
            obra.numero_obra,
            120,
        ),
        cidade: textoSeguro(
            obra.cidade,
            150,
        ),
        uf: textoSeguro(
            obra.uf,
            30,
        ),
        endereco: textoSeguro(
            obra.endereco,
            300,
        ),
        status: textoSeguro(
            obra.status,
            100,
        ),
    };
}

function registroInativo(status) {
    const chave =
        normalizarChave(status);

    return [
        "inativa",
        "inativo",
        "cancelada",
        "cancelado",
        "excluida",
        "excluido",
    ].includes(chave);
}

function vinculoAtivo(vinculo = {}) {
    return !registroInativo(
        vinculo.status,
    );
}

function obraAtiva(obra = {}) {
    return !registroInativo(
        obra.status,
    );
}

function calcularTotais(empresas = []) {
    const conformes =
        empresas.reduce(
            (total, empresa) =>
                total +
                (
                    Number.isFinite(
                        Number(empresa?.totalConformes),
                    )
                        ? Number(empresa.totalConformes)
                        : 0
                ),
            0,
        );

    const pendentes =
        empresas.reduce(
            (total, empresa) =>
                total +
                (
                    Number.isFinite(
                        Number(empresa?.totalPendentes),
                    )
                        ? Number(empresa.totalPendentes)
                        : 0
                ),
            0,
        );

    const classificados =
        conformes + pendentes;

    const percentualConforme =
        classificados > 0
            ? Math.round(
                (conformes / classificados) * 100,
            )
            : 0;

    const percentualPendente =
        classificados > 0
            ? Math.max(
                0,
                100 - percentualConforme,
            )
            : 0;

    return {
        conformes,
        pendentes,
        classificados,
        percentualConforme,
        percentualPendente,
    };
}

function ordenarEmpresas(empresas = []) {
    return [...empresas].sort(
        (a, b) =>
            String(a?.nome || "").localeCompare(
                String(b?.nome || ""),
                "pt-BR",
            ),
    );
}

function ordenarContratantes(empresas = []) {
    return [...empresas].sort(
        (a, b) =>
            String(a?.nome || "").localeCompare(
                String(b?.nome || ""),
                "pt-BR",
            ),
    );
}

function enriquecerEmpresaRelatorioComEmpresaPai({
    empresaRelatorio,
    mapaEmpresasBanco,
} = {}) {
    if (
        !empresaRelatorio ||
        typeof empresaRelatorio !== "object"
    ) {
        return null;
    }

    const empresaId =
        obterEmpresaId(
            empresaRelatorio,
        );

    const empresaBanco =
        mapaEmpresasBanco instanceof Map
            ? mapaEmpresasBanco.get(
                empresaId,
            )
            : null;

    const empresaBase =
        empresaBanco ||
        empresaRelatorio;

    const ehSubcontratada =
        normalizarChave(
            obterTipoEmpresa(
                empresaBase,
            ),
        ).includes(
            "subcontrat",
        );

    if (!ehSubcontratada) {
        return empresaRelatorio;
    }

    const empresaPaiId =
        obterEmpresaPaiId(
            empresaBase,
        );

    const empresaPai =
        (
            empresaPaiId &&
            mapaEmpresasBanco instanceof Map
        )
            ? mapaEmpresasBanco.get(
                empresaPaiId,
            )
            : null;

    const empresaPaiNome =
        textoSeguro(
            empresaRelatorio.empresaPaiNome ||
            empresaRelatorio.empresa_pai_nome ||
            empresaPai?.nome,
            300,
        );

    return {
        ...empresaRelatorio,
        empresaPaiId,
        empresaPaiNome,
    };
}

function localizarContratante({
    empresaIdsFiscalizaveis = [],
    empresaIdsVinculados = [],
    mapaEmpresasBanco,
} = {}) {
    const paisContratantes =
        new Map();

    empresaIdsFiscalizaveis.forEach(
        (empresaId) => {
            const empresa =
                mapaEmpresasBanco.get(
                    empresaId,
                );

            const empresaPaiId =
                obterEmpresaPaiId(
                    empresa,
                );

            if (!empresaPaiId) {
                return;
            }

            const empresaPai =
                mapaEmpresasBanco.get(
                    empresaPaiId,
                );

            if (
                empresaPai &&
                empresaContratante(
                    empresaPai,
                )
            ) {
                paisContratantes.set(
                    empresaPai.id,
                    empresaPai,
                );
            }
        },
    );

    if (paisContratantes.size > 0) {
        return ordenarContratantes(
            Array.from(
                paisContratantes.values(),
            ),
        )[0];
    }

    const vinculadasContratantes =
        empresaIdsVinculados
            .map(
                (empresaId) =>
                    mapaEmpresasBanco.get(
                        empresaId,
                    ),
            )
            .filter(Boolean)
            .filter(empresaContratante);

    if (
        vinculadasContratantes.length > 0
    ) {
        return ordenarContratantes(
            vinculadasContratantes,
        )[0];
    }

    return null;
}

export function agruparRelatorioAnualPorObras({
    relatorio = {},
    empresasBanco = [],
    obrasEmpresasBanco = [],
} = {}) {
    const empresasRelatorio =
        Array.isArray(relatorio?.empresas)
            ? relatorio.empresas
                .filter(
                    (empresa) =>
                        obterEmpresaId(
                            empresa,
                        ),
                )
            : [];

    const mapaRelatorio =
        new Map(
            empresasRelatorio.map(
                (empresa) => [
                    obterEmpresaId(
                        empresa,
                    ),
                    empresa,
                ],
            ),
        );

    const empresasBancoNormalizadas =
        (
            Array.isArray(empresasBanco)
                ? empresasBanco
                : []
        )
            .map(normalizarEmpresaBanco)
            .filter(
                (empresa) =>
                    empresa.id,
            );

    const mapaEmpresasBanco =
        new Map(
            empresasBancoNormalizadas.map(
                (empresa) => [
                    empresa.id,
                    empresa,
                ],
            ),
        );

    const grupos =
        new Map();

    (
        Array.isArray(obrasEmpresasBanco)
            ? obrasEmpresasBanco
            : []
    ).forEach((vinculo) => {
        if (!vinculoAtivo(vinculo)) {
            return;
        }

        const obraId =
            obterObraId(vinculo);

        const empresaId =
            textoSeguro(
                vinculo.empresaId ||
                vinculo.empresa_id ||
                vinculo.empresa?.id,
                80,
            );

        if (!obraId || !empresaId) {
            return;
        }

        const obra =
            normalizarObra(
                vinculo.obra || {},
                obraId,
            );

        if (!obraAtiva(obra)) {
            return;
        }

        if (!grupos.has(obraId)) {
            grupos.set(
                obraId,
                {
                    obra,
                    empresaIdsVinculados:
                        new Set(),
                },
            );
        }

        grupos
            .get(obraId)
            .empresaIdsVinculados
            .add(empresaId);
    });

    const empresasComObra =
        new Set();

    const obras =
        [];

    grupos.forEach(
        (
            grupo,
            obraId,
        ) => {
            const empresaIdsFiscalizaveis =
                Array.from(
                    grupo
                        .empresaIdsVinculados,
                )
                    .filter(
                        (empresaId) =>
                            mapaRelatorio.has(
                                empresaId,
                            ),
                    );

            if (
                empresaIdsFiscalizaveis.length === 0
            ) {
                return;
            }

            empresaIdsFiscalizaveis.forEach(
                (empresaId) =>
                    empresasComObra.add(
                        empresaId,
                    ),
            );

            const empresas =
                ordenarEmpresas(
                    empresaIdsFiscalizaveis
                        .map(
                            (empresaId) =>
                                enriquecerEmpresaRelatorioComEmpresaPai({
                                    empresaRelatorio:
                                        mapaRelatorio.get(
                                            empresaId,
                                        ),
                                    mapaEmpresasBanco,
                                }),
                        )
                        .filter(Boolean),
                );

            const contratante =
                localizarContratante({
                    empresaIdsFiscalizaveis,
                    empresaIdsVinculados:
                        Array.from(
                            grupo
                                .empresaIdsVinculados,
                        ),
                    mapaEmpresasBanco,
                });

            obras.push({
                ...grupo.obra,
                id: obraId,
                contratante,
                empresas,
                totalEmpresas:
                    empresas.length,
                totais:
                    calcularTotais(
                        empresas,
                    ),
            });
        },
    );

    const empresasSemObra =
        ordenarEmpresas(
            empresasRelatorio
                .filter(
                    (empresa) =>
                        !empresasComObra.has(
                            obterEmpresaId(
                                empresa,
                            ),
                        ),
                )
                .map(
                    (empresa) =>
                        enriquecerEmpresaRelatorioComEmpresaPai({
                            empresaRelatorio:
                                empresa,
                            mapaEmpresasBanco,
                        }),
                )
                .filter(Boolean),
        );

    if (empresasSemObra.length > 0) {
        const empresaIdsFiscalizaveis =
            empresasSemObra.map(
                obterEmpresaId,
            );

        const contratante =
            localizarContratante({
                empresaIdsFiscalizaveis,
                empresaIdsVinculados: [],
                mapaEmpresasBanco,
            });

        obras.push({
            id: OBRA_SEM_VINCULO_ID,
            nome: "SEM OBRA VINCULADA",
            numeroObra: "",
            cidade: "",
            uf: "",
            endereco: "",
            status: "",
            semVinculo: true,
            contratante,
            empresas:
                empresasSemObra,
            totalEmpresas:
                empresasSemObra.length,
            totais:
                calcularTotais(
                    empresasSemObra,
                ),
        });
    }

    return obras.sort(
        (a, b) => {
            if (
                a.id ===
                OBRA_SEM_VINCULO_ID
            ) {
                return 1;
            }

            if (
                b.id ===
                OBRA_SEM_VINCULO_ID
            ) {
                return -1;
            }

            return String(
                a.nome || "",
            ).localeCompare(
                String(
                    b.nome || "",
                ),
                "pt-BR",
            );
        },
    );
}

export {
    OBRA_SEM_VINCULO_ID,
};