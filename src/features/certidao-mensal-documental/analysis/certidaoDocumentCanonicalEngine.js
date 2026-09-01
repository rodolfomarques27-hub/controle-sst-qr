import {
    resolverDocumentoCertidaoEmLote,
} from "./certidaoDocumentBatchResolver.js";

import {
    processarArquivoCertidaoSingular,
} from "../services/certidaoMensalUploadMassaService.js";

import {
    criarResultadoDocumentoCanonicoCert2,
} from "../domain/certidaoDocumentCanonicalContract.js";

function textoSeguro(
    valor = ""
) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarEmpresas(
    contexto = {}
) {
    if (
        Array.isArray(
            contexto
                ?.empresas
        )
    ) {
        return contexto
            .empresas;
    }

    return contexto
        ?.empresa
        ? [
            contexto
                .empresa,
        ]
        : [];
}

function normalizarDataReferencia(
    contexto = {}
) {
    const valor =
        contexto
            ?.dataReferencia ||
        new Date();

    const data =
        valor instanceof Date
            ? new Date(
                valor.getTime()
            )
            : new Date(
                valor
            );

    return Number.isNaN(
        data.getTime()
    )
        ? new Date()
        : data;
}

export function analisarTextoDocumentoCert2({
    textoExtraido = "",
    contexto = {},
    leitura = {},
    hash = null,
} = {}) {
    const texto =
        textoSeguro(
            textoExtraido ||
            leitura
                ?.textoExtraido
        );

    const leituraNormalizada = {
        ...leitura,

        metodo:
            textoSeguro(
                leitura
                    ?.metodo ||
                leitura
                    ?.tipoLeitura ||
                "texto_pre_extraido"
            ),

        textoExtraido:
            texto,

        quantidadeCaracteres:
            texto.length,
    };

    const resolucao =
        resolverDocumentoCertidaoEmLote({
            textoExtraido:
                texto,

            empresas:
                normalizarEmpresas(
                    contexto
                ),

            dataReferencia:
                normalizarDataReferencia(
                    contexto
                ),
        });

    return criarResultadoDocumentoCanonicoCert2({
        leitura:
            leituraNormalizada,
        resolucao,
        hash,
    });
}

export async function analisarDocumentoCert2({
    arquivo,
    contexto = {},
    onProgress = null,
    signal = null,
    dependencias = {},
} = {}) {
    if (!arquivo) {
        throw new Error(
            "Nenhum arquivo foi informado ao Motor Documental Canônico CERT2."
        );
    }

    /*
     * SAFE_SCAN_CERT2_M3_A4_ENGINE_SINGULAR
     *
     * O motor canônico analisa diretamente UM PDF.
     * Nenhuma regra relacional/coletiva do lote participa
     * da verdade documental singular.
     */
    const item =
        await processarArquivoCertidaoSingular({
            arquivo,

            indice:
                0,

            total:
                1,

            empresas:
                normalizarEmpresas(
                    contexto
                ),

            dataReferencia:
                normalizarDataReferencia(
                    contexto
                ),

            onProgress,
            signal,
            dependencias,
        });

    if (!item) {
        throw new Error(
            "O Motor Documental Canônico CERT2 não produziu resultado para o arquivo."
        );
    }

    const resultado =
        criarResultadoDocumentoCanonicoCert2({
            leitura:
                item
                    ?.leitura ||
                {},

            resolucao:
                item
                    ?.resolucao ||
                {},

            hash:
                item
                    ?.hash ||
                null,

            validacao:
                item
                    ?.validacao ||
                null,

            erro:
                item
                    ?.erro ||
                "",
        });

    if (
        !resultado
            .rastreabilidade
            .hashSha256
    ) {
        throw new Error(
            "O Motor Documental Canônico CERT2 não recebeu um SHA-256 válido para o arquivo."
        );
    }

    return resultado;
}

export default analisarDocumentoCert2;
