const CLASSIFICACOES_EPI = Object.freeze({
    TODOS: "TODOS",
    CONFORME: "CONFORME",
    PENDENTE: "PENDENTE",
    REVISAR_CONTROLE: "REVISAR_CONTROLE",
});

function texto(valor = "") {
    return String(
        valor ??
            ""
    ).trim();
}

export function normalizarTextoFiltroEpi(
    valor = ""
) {
    return texto(
        valor
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLocaleLowerCase(
            "pt-BR"
        )
        .trim();
}

function normalizarClassificacaoEpi(
    valor = "Todos"
) {
    const chave =
        normalizarTextoFiltroEpi(
            valor
        );

    if (
        !chave ||
        chave === "todos" ||
        chave === "todas"
    ) {
        return CLASSIFICACOES_EPI.TODOS;
    }

    if (
        chave === "conforme" ||
        chave === "conformes"
    ) {
        return CLASSIFICACOES_EPI.CONFORME;
    }

    if (
        chave === "pendente" ||
        chave === "pendentes" ||
        chave === "revisao documental"
    ) {
        return CLASSIFICACOES_EPI.PENDENTE;
    }

    if (
        chave === "revisar" ||
        chave === "revisar controle" ||
        chave === "revisar controle 12m"
    ) {
        return CLASSIFICACOES_EPI.REVISAR_CONTROLE;
    }

    return CLASSIFICACOES_EPI.TODOS;
}

function classificacaoParaExibicao(
    classificacao =
        CLASSIFICACOES_EPI.TODOS
) {
    if (
        classificacao ===
        CLASSIFICACOES_EPI.CONFORME
    ) {
        return "Conforme";
    }

    if (
        classificacao ===
        CLASSIFICACOES_EPI.PENDENTE
    ) {
        return "Pendente";
    }

    if (
        classificacao ===
        CLASSIFICACOES_EPI.REVISAR_CONTROLE
    ) {
        return "Revisar controle";
    }

    return "Todos";
}

/*
 * CLASSIFICAÇÃO OPERACIONAL DO FILTRO.
 *
 * Importante:
 * o renderer continua preservando separadamente:
 *
 * - situação documental;
 * - controle administrativo de 12 meses.
 *
 * Aqui apenas consolidamos os dois critérios
 * para oferecer UM filtro simples ao usuário.
 */
export function classificarControleFichaEpi(
    item = {}
) {
    const situacaoDocumental =
        texto(
            item?.situacao
        ).toLocaleUpperCase(
            "pt-BR"
        );

    /*
     * Sem ficha válida/completa:
     * filtro operacional = PENDENTE.
     *
     * Inclui:
     * - PENDENTE;
     * - REVISAR documental por ausência
     *   de arquivo ou data.
     */
    if (
        situacaoDocumental !==
        "CONFORME"
    ) {
        return CLASSIFICACOES_EPI.PENDENTE;
    }

    const controleTexto =
        normalizarTextoFiltroEpi(
            item?.controle12m
        );

    const revisarControle =
        item?.controle12mRevisar ===
            true ||
        controleTexto ===
            "revisar";

    if (revisarControle) {
        return CLASSIFICACOES_EPI.REVISAR_CONTROLE;
    }

    return CLASSIFICACOES_EPI.CONFORME;
}

export function normalizarFiltrosControleFichasEpi(
    filtros = {}
) {
    const objeto =
        filtros &&
        typeof filtros ===
            "object"
            ? filtros
            : {};

    const busca =
        texto(
            objeto.busca
        );

    const empresa =
        texto(
            objeto.empresa
        ) ||
        "Todas";

    /*
     * classificacaoEpi é o contrato novo.
     *
     * classificacao / situacaoEpi permanecem
     * apenas como compatibilidade defensiva.
     */
    const classificacao =
        normalizarClassificacaoEpi(
            objeto.classificacaoEpi ??
                objeto.classificacao ??
                objeto.situacaoEpi ??
                "Todos"
        );

    return {
        busca,
        empresa,

        classificacao,

        classificacaoExibicao:
            classificacaoParaExibicao(
                classificacao
            ),
    };
}

export function aplicarFiltrosControleFichasEpi(
    colaboradores = [],
    filtros = {}
) {
    const lista =
        Array.isArray(
            colaboradores
        )
            ? colaboradores
            : [];

    const normalizados =
        normalizarFiltrosControleFichasEpi(
            filtros
        );

    const busca =
        normalizarTextoFiltroEpi(
            normalizados.busca
        );

    const empresa =
        normalizarTextoFiltroEpi(
            normalizados.empresa
        );

    const filtrarEmpresa =
        Boolean(
            empresa
        ) &&
        ![
            "todas",
            "todos",
        ].includes(
            empresa
        );

    return lista.filter(
        (item) => {
            const classificacaoItem =
                classificarControleFichaEpi(
                    item
                );

            const classificacaoTexto =
                classificacaoParaExibicao(
                    classificacaoItem
                );

            const textoBusca =
                normalizarTextoFiltroEpi(
                    [
                        item?.nome,
                        item?.funcao,
                        item?.empresa,
                        item?.fichaTexto,
                        item?.situacao,
                        item?.controle12m,
                        classificacaoTexto,
                    ]
                        .filter(Boolean)
                        .join(" ")
                );

            const bateBusca =
                !busca ||
                textoBusca.includes(
                    busca
                );

            const bateEmpresa =
                !filtrarEmpresa ||
                normalizarTextoFiltroEpi(
                    item?.empresa
                ) ===
                    empresa;

            const bateClassificacao =
                normalizados.classificacao ===
                    CLASSIFICACOES_EPI.TODOS ||
                classificacaoItem ===
                    normalizados.classificacao;

            return (
                bateBusca &&
                bateEmpresa &&
                bateClassificacao
            );
        }
    );
}

export function obterFiltrosControleFichasEpiParaExibicao(
    filtros = {}
) {
    const normalizados =
        normalizarFiltrosControleFichasEpi(
            filtros
        );

    return {
        busca:
            normalizados.busca ||
            "-",

        empresa:
            normalizados.empresa ||
            "Todas",

        classificacaoEpi:
            normalizados.classificacaoExibicao,

        /*
         * Campo consumido pelo cabeçalho atual
         * do relatório.
         */
        classificacao:
            normalizados.classificacaoExibicao,
    };
}