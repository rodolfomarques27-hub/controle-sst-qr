import type {
    AnexoPdf,
    DocumentoSnapshot,
    PartePlanejada,
    SupabaseClientAny,
} from "./types.ts";

import {
    ErroHttp,
    mensagemErro,
    nomeArquivoSeguro,
    sha256Hex,
} from "./utils.ts";

const RESERVA_CORPO_CABECALHOS_BYTES =
    384 * 1024;

const SOBRECARGA_POR_ANEXO_BYTES =
    2048;

function estimarTamanhoMime(
    tamanhoOriginalBytes: number,
) {
    if (
        !Number.isSafeInteger(
            tamanhoOriginalBytes,
        ) ||
        tamanhoOriginalBytes <= 0
    ) {
        throw new ErroHttp(
            422,
            "O tamanho de um anexo é inválido.",
        );
    }

    const tamanhoBase64 =
        Math.ceil(
            tamanhoOriginalBytes / 3,
        ) * 4;

    return (
        tamanhoBase64 +
        SOBRECARGA_POR_ANEXO_BYTES
    );
}

function calcularTamanhoEstimado(
    documentos: DocumentoSnapshot[],
    assinaturaBytes: number,
) {
    const assinaturaEstimada =
        assinaturaBytes > 0
            ? estimarTamanhoMime(
                assinaturaBytes,
            )
            : 0;

    const documentosEstimados =
        documentos.reduce(
            (
                total,
                documento,
            ) =>
                total +
                estimarTamanhoMime(
                    documento.tamanhoBytes,
                ),
            0,
        );

    return (
        RESERVA_CORPO_CABECALHOS_BYTES +
        assinaturaEstimada +
        documentosEstimados
    );
}

export function planejarPartes(
    documentos: DocumentoSnapshot[],
    anexarPdfs: boolean,
    limiteMensagemBytes: number,
    assinaturaBytes: number,
    assuntoBase: string,
): PartePlanejada[] {
    if (documentos.length === 0) {
        throw new ErroHttp(
            409,
            "Nenhum documento está disponível para envio.",
        );
    }

    if (
        !Number.isSafeInteger(
            limiteMensagemBytes,
        ) ||
        limiteMensagemBytes <= 0
    ) {
        throw new ErroHttp(
            422,
            "O limite de tamanho da mensagem é inválido.",
        );
    }

    if (
        !Number.isSafeInteger(
            assinaturaBytes,
        ) ||
        assinaturaBytes < 0
    ) {
        throw new ErroHttp(
            422,
            "O tamanho da assinatura é inválido.",
        );
    }

    if (!anexarPdfs) {
        return [
            {
                numero:
                    1,

                total:
                    1,

                assunto:
                    assuntoBase,

                documentos,

                tamanhoAnexosBytes:
                    0,
            },
        ];
    }

    const tamanhoBase =
        calcularTamanhoEstimado(
            [],
            assinaturaBytes,
        );

    if (
        tamanhoBase >=
        limiteMensagemBytes
    ) {
        throw new ErroHttp(
            422,
            "A assinatura e a estrutura da mensagem ocupam todo o limite disponível.",
        );
    }

    const grupos: DocumentoSnapshot[][] =
        [];

    let grupoAtual: DocumentoSnapshot[] =
        [];

    for (const documento of documentos) {
        const tamanhoDocumento =
            calcularTamanhoEstimado(
                [documento],
                assinaturaBytes,
            );

        if (
            tamanhoDocumento >
            limiteMensagemBytes
        ) {
            throw new ErroHttp(
                422,
                `O PDF "${documento.nomeArquivo}" ultrapassa o limite de uma única mensagem.`,
            );
        }

        const grupoCandidato =
            [
                ...grupoAtual,
                documento,
            ];

        const tamanhoCandidato =
            calcularTamanhoEstimado(
                grupoCandidato,
                assinaturaBytes,
            );

        if (
            grupoAtual.length > 0 &&
            tamanhoCandidato >
                limiteMensagemBytes
        ) {
            grupos.push(
                grupoAtual,
            );

            grupoAtual =
                [documento];
        }
        else {
            grupoAtual =
                grupoCandidato;
        }
    }

    if (grupoAtual.length > 0) {
        grupos.push(
            grupoAtual,
        );
    }

    const total =
        grupos.length;

    return grupos.map(
        (
            grupo,
            indice,
        ) => {
            const numero =
                indice + 1;

            const tamanhoAnexosBytes =
                grupo.reduce(
                    (
                        soma,
                        documento,
                    ) =>
                        soma +
                        documento.tamanhoBytes,
                    0,
                );

            return {
                numero,
                total,

                assunto:
                    total > 1
                        ? `${assuntoBase} — parte ${numero} de ${total}`
                        : assuntoBase,

                documentos:
                    grupo,

                tamanhoAnexosBytes,
            };
        },
    );
}

function validarCabecalhoPdf(
    bytes: Uint8Array,
    nomeArquivo: string,
) {
    const pdf =
        bytes.length >= 5 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2d;

    if (!pdf) {
        throw new ErroHttp(
            409,
            `O arquivo "${nomeArquivo}" não possui cabeçalho PDF válido.`,
        );
    }
}

export async function baixarAnexosParte(
    adminClient: SupabaseClientAny,
    parte: PartePlanejada,
): Promise<AnexoPdf[]> {
    const anexos: AnexoPdf[] =
        [];

    for (const documento of parte.documentos) {
        const {
            data,
            error,
        } =
            await adminClient.storage
                .from(
                    documento.bucket,
                )
                .download(
                    documento.caminhoStorage,
                );

        if (
            error ||
            !data
        ) {
            throw new ErroHttp(
                500,
                `Falha ao baixar "${documento.nomeArquivo}": ${mensagemErro(error)}.`,
            );
        }

        const bytes =
            new Uint8Array(
                await data.arrayBuffer(),
            );

        if (
            bytes.byteLength !==
            documento.tamanhoBytes
        ) {
            throw new ErroHttp(
                409,
                `O tamanho do arquivo "${documento.nomeArquivo}" diverge do registro persistido.`,
            );
        }

        validarCabecalhoPdf(
            bytes,
            documento.nomeArquivo,
        );

        const hashAtual =
            await sha256Hex(
                bytes,
            );

        if (
            hashAtual !==
            documento.hashSha256
        ) {
            throw new ErroHttp(
                409,
                `A integridade SHA-256 do arquivo "${documento.nomeArquivo}" não foi confirmada.`,
            );
        }

        anexos.push({
            filename:
                nomeArquivoSeguro(
                    documento.nomeArquivo,
                    documento.ordem,
                ),

            content:
                bytes,

            contentType:
                "application/pdf",
        });
    }

    return anexos;
}