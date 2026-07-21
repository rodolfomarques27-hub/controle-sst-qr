function normalizarTextoFuncaoBase(valor = "") {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function localizarMatrizEspecifica({
    funcao = "",
    matrizes = [],
} = {}) {
    const textoFuncao =
        normalizarTextoFuncaoBase(funcao);

    if (!textoFuncao) {
        return null;
    }

    return (
        matrizes.find((matriz) => {
            if (
                !matriz ||
                matriz.chave === "geral" ||
                !Array.isArray(matriz.termos)
            ) {
                return false;
            }

            return matriz.termos.some((termo) => {
                const termoNormalizado =
                    normalizarTextoFuncaoBase(termo);

                return (
                    Boolean(termoNormalizado) &&
                    textoFuncao.includes(
                        termoNormalizado
                    )
                );
            });
        }) ||
        null
    );
}

export function resolverFuncaoBasePorMatrizes({
    funcao = "",
    matrizes = [],
} = {}) {
    const funcaoInformada =
        String(funcao ?? "").trim();

    const listaMatrizes =
        Array.isArray(matrizes)
            ? matrizes.filter(Boolean)
            : [];

    const matrizEspecifica =
        localizarMatrizEspecifica({
            funcao: funcaoInformada,
            matrizes: listaMatrizes,
        });

    const matrizGeral =
        listaMatrizes.find(
            (matriz) => matriz?.chave === "geral"
        ) ||
        null;

    const funcaoBase =
        matrizEspecifica?.rotulo ||
        funcaoInformada ||
        "Função não informada";

    return {
        funcaoInformada,
        funcaoNormalizada:
            normalizarTextoFuncaoBase(
                funcaoInformada
            ),
        localizada:
            Boolean(matrizEspecifica),
        chaveFuncaoBase:
            matrizEspecifica?.chave ||
            "",
        funcaoBase,
        matriz:
            matrizEspecifica ||
            matrizGeral,
    };
}
