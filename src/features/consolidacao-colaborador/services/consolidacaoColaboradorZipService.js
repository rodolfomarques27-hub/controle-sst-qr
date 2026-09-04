import {
    Zip,
    ZipPassThrough,
} from "fflate";

import {
    criarPlanoZipConsolidacaoColaborador,
} from "../domain/consolidacaoColaboradorZipPlan.js";

import {
    iterarArquivosFisicosConsolidacaoColaborador,
} from "./consolidacaoColaboradorArquivosService.js";

import {
    criarPdfConsolidacaoColaboradorService,
} from "./consolidacaoColaboradorRelatorioPdfService.js";

export const CONSOLIDACAO_COLABORADOR_ZIP_SCHEMA_VERSION =
    "consolidacao-colaborador-zip-v1";

const ZIP_PLAN_SCHEMA_VERSION =
    "consolidacao-colaborador-zip-plan-v1";

const PASTA_RESUMO_DOCUMENTAL =
    "00_RESUMO_DOCUMENTAL";

const LIMITE_CAMINHO_RELATIVO =
    230;

function textoSeguro(
    valor = ""
) {
    return String(
        valor ??
            ""
    ).trim();
}

function listaSegura(
    valor
) {
    return Array.isArray(
        valor
    )
        ? valor
        : [];
}

function normalizarComparacao(
    valor
) {
    return textoSeguro(
        valor
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase();
}

function possuiCaractereControleWindows(
    valor
) {
    return Array.from(
        textoSeguro(
            valor
        )
    ).some(
        (
            caractere
        ) => {
            const codigo =
                caractere.charCodeAt(
                    0
                );

            return (
                codigo <=
                    31 ||
                (
                    codigo >=
                        127 &&
                    codigo <=
                        159
                )
            );
        }
    );
}

function validarNomeArquivoGerado(
    nomeArquivo
) {
    const nome =
        textoSeguro(
            nomeArquivo
        );

    if (!nome) {
        throw new Error(
            "Consolidação ZIP: nome do resumo PDF ausente."
        );
    }

    if (
        /[<>:"/\\|?*]/.test(
            nome
        ) ||
        possuiCaractereControleWindows(
            nome
        ) ||
        /^[. ]/.test(
            nome
        ) ||
        /[. ]$/.test(
            nome
        )
    ) {
        throw new Error(
            "Consolidação ZIP: nome do resumo PDF não é seguro para Windows."
        );
    }

    if (
        !/\.pdf$/i.test(
            nome
        )
    ) {
        throw new Error(
            "Consolidação ZIP: resumo documental não possui extensão PDF."
        );
    }

    return nome;
}

function validarPlanoZip(
    planoZip
) {
    if (
        !planoZip ||
        typeof planoZip !==
            "object"
    ) {
        throw new Error(
            "Consolidação ZIP: Plano ZIP não informado."
        );
    }

    if (
        planoZip
            .schemaVersion !==
        ZIP_PLAN_SCHEMA_VERSION
    ) {
        throw new Error(
            "Consolidação ZIP: schema do Plano ZIP inválido."
        );
    }

    if (
        planoZip
            .podeGerar !==
        true
    ) {
        throw new Error(
            "Consolidação ZIP: Plano ZIP está bloqueado."
        );
    }

    const arquivos =
        listaSegura(
            planoZip
                .arquivos
        );

    if (
        arquivos.length ===
        0
    ) {
        throw new Error(
            "Consolidação ZIP: Plano ZIP não possui evidências."
        );
    }

    if (
        Number(
            planoZip
                .totalArquivos
        ) !==
        arquivos.length
    ) {
        throw new Error(
            "Consolidação ZIP: totalArquivos diverge dos arquivos planejados."
        );
    }

    const nomeZip =
        textoSeguro(
            planoZip
                .nomeZip
        );

    if (
        !nomeZip ||
        !/\.zip$/i.test(
            nomeZip
        )
    ) {
        throw new Error(
            "Consolidação ZIP: nomeZip inválido."
        );
    }

    const empresa =
        textoSeguro(
            planoZip
                ?.raiz
                ?.empresa
        );

    const colaborador =
        textoSeguro(
            planoZip
                ?.raiz
                ?.colaborador
        );

    if (
        !empresa ||
        !colaborador
    ) {
        throw new Error(
            "Consolidação ZIP: raiz canônica empresa/colaborador ausente."
        );
    }

    return {
        arquivos,
        empresa,
        colaborador,
        nomeZip,
    };
}

function criarCaminhoResumo({
    nomeArquivo,
}) {
    const nome =
        validarNomeArquivoGerado(
            nomeArquivo
        );

    const caminho =
        [
            PASTA_RESUMO_DOCUMENTAL,
            nome,
        ].join(
            "/"
        );

    if (
        caminho.length >
        LIMITE_CAMINHO_RELATIVO
    ) {
        throw new Error(
            `Consolidação ZIP: caminho do resumo excedeu ${LIMITE_CAMINHO_RELATIVO} caracteres.`
        );
    }

    return caminho;
}

function validarResultadoPdf({
    resultadoPdf,
    selecaoId,
}) {
    if (
        !resultadoPdf ||
        typeof resultadoPdf !==
            "object"
    ) {
        throw new Error(
            "Consolidação ZIP: renderer PDF não retornou resultado."
        );
    }

    if (
        !(resultadoPdf.blob instanceof Blob) ||
        resultadoPdf.blob.size <=
            0
    ) {
        throw new Error(
            "Consolidação ZIP: resumo PDF físico inválido."
        );
    }

    if (
        textoSeguro(
            resultadoPdf
                .mimeType
        ) !==
        "application/pdf"
    ) {
        throw new Error(
            "Consolidação ZIP: mime type do resumo PDF inválido."
        );
    }

    if (
        textoSeguro(
            resultadoPdf
                .selecaoId
        ) !==
        selecaoId
    ) {
        throw new Error(
            "Consolidação ZIP: o resumo PDF pertence a outra seleção."
        );
    }

    return resultadoPdf;
}

function criarColetorZip() {
    const partes =
        [];

    let erroZip =
        null;

    let finalizado =
        false;

    let resolverFinalizacao;

    const finalizacao =
        new Promise(
            (
                resolve
            ) => {
                resolverFinalizacao =
                    resolve;
            }
        );

    const zip =
        new Zip(
            (
                erro,
                dados,
                final
            ) => {
                if (erro) {
                    erroZip =
                        erro;

                    resolverFinalizacao();

                    return;
                }

                if (
                    dados &&
                    dados.byteLength >
                        0
                ) {
                    partes.push(
                        dados
                    );
                }

                if (final) {
                    finalizado =
                        true;

                    resolverFinalizacao();
                }
            }
        );

    return {
        zip,
        partes,
        finalizacao,

        verificarErro() {
            if (erroZip) {
                throw new Error(
                    `Consolidação ZIP: fflate falhou: ${erroZip?.message || erroZip}`
                );
            }
        },

        finalizado() {
            return finalizado;
        },
    };
}

function adicionarEntradaZip({
    coletor,
    caminhoRelativo,
    dados,
}) {
    const caminho =
        textoSeguro(
            caminhoRelativo
        );

    if (!caminho) {
        throw new Error(
            "Consolidação ZIP: entrada sem caminho relativo."
        );
    }

    if (
        !(dados instanceof Uint8Array) ||
        dados.byteLength ===
            0
    ) {
        throw new Error(
            `Consolidação ZIP: bytes inválidos para ${caminho}.`
        );
    }

    const entrada =
        new ZipPassThrough(
            caminho
        );

    coletor.zip.add(
        entrada
    );

    entrada.push(
        dados,
        true
    );

    coletor.verificarErro();
}

function indexarArquivosPlanejados(
    arquivos
) {
    const mapa =
        new Map();

    const caminhos =
        new Set();

    for (
        const arquivo
        of arquivos
    ) {
        const chave =
            textoSeguro(
                arquivo
                    ?.chaveSelecao
            );

        const caminho =
            textoSeguro(
                arquivo
                    ?.caminhoRelativo
            );

        if (
            !chave ||
            !caminho
        ) {
            throw new Error(
                "Consolidação ZIP: arquivo planejado sem identidade física completa."
            );
        }

        if (
            mapa.has(
                chave
            )
        ) {
            throw new Error(
                `Consolidação ZIP: chave planejada duplicada: ${chave}`
            );
        }

        const caminhoNormalizado =
            normalizarComparacao(
                caminho
            );

        if (
            caminhos.has(
                caminhoNormalizado
            )
        ) {
            throw new Error(
                `Consolidação ZIP: caminho planejado duplicado: ${caminho}`
            );
        }

        mapa.set(
            chave,
            arquivo
        );

        caminhos.add(
            caminhoNormalizado
        );
    }

    return {
        mapa,
        caminhos,
    };
}

export async function criarZipConsolidacaoColaboradorService({
    supabase,
    estruturaExportacao,
    heroUrl,
    criarPlanoZip =
        criarPlanoZipConsolidacaoColaborador,
    criarPdf =
        criarPdfConsolidacaoColaboradorService,
    iterarArquivosFisicos =
        iterarArquivosFisicosConsolidacaoColaborador,
} = {}) {
    if (
        typeof criarPlanoZip !==
        "function" ||
        typeof criarPdf !==
        "function" ||
        typeof iterarArquivosFisicos !==
        "function"
    ) {
        throw new Error(
            "Consolidação ZIP: dependências canônicas indisponíveis."
        );
    }

    const planoZip =
        criarPlanoZip(
            estruturaExportacao
        );

    const {
        arquivos,
        empresa,
        colaborador,
        nomeZip,
    } =
        validarPlanoZip(
            planoZip
        );

    const selecaoId =
        textoSeguro(
            planoZip
                .selecaoId
        );

    if (!selecaoId) {
        throw new Error(
            "Consolidação ZIP: selecaoId ausente."
        );
    }

    const resultadoPdf =
        validarResultadoPdf({
            resultadoPdf:
                await criarPdf({
                    estruturaExportacao,
                    heroUrl,
                }),
            selecaoId,
        });

    const caminhoResumo =
        criarCaminhoResumo({
            nomeArquivo:
                resultadoPdf
                    .nomeArquivo,
        });

    const {
        mapa:
            arquivosPlanejados,
        caminhos:
            caminhosPlanejados,
    } =
        indexarArquivosPlanejados(
            arquivos
        );

    const caminhoResumoNormalizado =
        normalizarComparacao(
            caminhoResumo
        );

    if (
        caminhosPlanejados.has(
            caminhoResumoNormalizado
        )
    ) {
        throw new Error(
            "Consolidação ZIP: resumo PDF colide com evidência planejada."
        );
    }

    const bytesPdf =
        new Uint8Array(
            await resultadoPdf
                .blob
                .arrayBuffer()
        );

    const coletor =
        criarColetorZip();

    adicionarEntradaZip({
        coletor,
        caminhoRelativo:
            caminhoResumo,
        dados:
            bytesPdf,
    });

    const consumidas =
        new Set();

    let totalBytesEvidencias =
        0;

    for await (
        const arquivoFisico
        of iterarArquivosFisicos({
            supabase,
            planoZip,
        })
    ) {
        const chave =
            textoSeguro(
                arquivoFisico
                    ?.chaveSelecao
            );

        const planejado =
            arquivosPlanejados.get(
                chave
            );

        if (!planejado) {
            throw new Error(
                `Consolidação ZIP: evidência física não pertence ao plano: ${chave || "(sem chave)"}`
            );
        }

        if (
            consumidas.has(
                chave
            )
        ) {
            throw new Error(
                `Consolidação ZIP: evidência física repetida: ${chave}`
            );
        }

        if (
            textoSeguro(
                arquivoFisico
                    ?.caminhoRelativo
            ) !==
            textoSeguro(
                planejado
                    ?.caminhoRelativo
            )
        ) {
            throw new Error(
                `Consolidação ZIP: caminho físico divergiu do plano para ${chave}.`
            );
        }

        if (
            textoSeguro(
                planejado
                    ?.arquivoSha256
            ) &&
            arquivoFisico
                ?.sha256Validado !==
            true
        ) {
            throw new Error(
                `Consolidação ZIP: SHA-256 esperado não foi validado para ${chave}.`
            );
        }

        const dados =
            arquivoFisico
                ?.dados;

        adicionarEntradaZip({
            coletor,
            caminhoRelativo:
                planejado
                    .caminhoRelativo,
            dados,
        });

        totalBytesEvidencias +=
            dados.byteLength;

        consumidas.add(
            chave
        );
    }

    if (
        consumidas.size !==
        arquivosPlanejados.size
    ) {
        throw new Error(
            `Consolidação ZIP: pacote físico incompleto. Esperado=${arquivosPlanejados.size}; recebido=${consumidas.size}.`
        );
    }

    coletor.zip.end();

    await coletor.finalizacao;

    coletor.verificarErro();

    if (
        !coletor.finalizado()
    ) {
        throw new Error(
            "Consolidação ZIP: fflate não finalizou o pacote."
        );
    }

    const blob =
        new Blob(
            coletor.partes,
            {
                type:
                    "application/zip",
            }
        );

    if (
        blob.size <=
        0
    ) {
        throw new Error(
            "Consolidação ZIP: Blob ZIP final inválido."
        );
    }

    return {
        schemaVersion:
            CONSOLIDACAO_COLABORADOR_ZIP_SCHEMA_VERSION,

        blob,

        nomeArquivo:
            nomeZip,

        mimeType:
            "application/zip",

        selecaoId,

        planoId:
            textoSeguro(
                planoZip
                    .planoId
            ),

        empresa,

        colaborador,

        totalDocumentos:
            Number(
                planoZip
                    .totalDocumentos
            ) ||
            0,

        totalArquivos:
            arquivos.length,

        totalEntradas:
            arquivos.length +
            1,

        totalPastas:
            Number(
                planoZip
                    .totalPastas
            ) +
            1,

        tamanhoBytesZip:
            blob.size,

        tamanhoBytesConteudo:
            totalBytesEvidencias +
            bytesPdf.byteLength,

        resumoPdf: {
            caminhoRelativo:
                caminhoResumo,

            nomeArquivo:
                resultadoPdf
                    .nomeArquivo,

            totalPaginas:
                resultadoPdf
                    .totalPaginas,

            tamanhoBytes:
                bytesPdf.byteLength,
        },

        estruturaPastas: [
            PASTA_RESUMO_DOCUMENTAL,

            ...listaSegura(
                planoZip
                    .estruturaPastas
            ),
        ],

        estrategia:
            "fflate-zip-passthrough-v1",
    };
}