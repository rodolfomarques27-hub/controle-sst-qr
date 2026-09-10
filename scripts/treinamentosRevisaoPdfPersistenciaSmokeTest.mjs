import assert from "node:assert/strict";
import {
    createHash,
    webcrypto,
} from "node:crypto";
import {
    readFile,
} from "node:fs/promises";
import {
    fileURLToPath,
} from "node:url";
import {
    dirname,
    join,
} from "node:path";

import {
    TREINAMENTOS_REVISAO_PDF_BUCKET,
    TREINAMENTOS_REVISAO_PDF_RPC,
    calcularSha256BlobService,
    criarTreinamentosRevisaoPdfPersistenciaService,
    prepararCandidatoPersistenciaPdfRevisaoTreinamentos,
} from "../src/services/treinamentosRevisaoPdfPersistenciaService.js";

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    dirname(
        __filename
    );

const SERVICE_PATH =
    join(
        __dirname,
        "..",
        "src",
        "services",
        "treinamentosRevisaoPdfPersistenciaService.js"
    );

const REVISAO_ID =
    "dbd866da-7aa6-46b4-b384-1437399eab81";

const COLABORADOR_ID =
    "aede8ad4-e12b-47fd-a634-23a0783b58c0";

const CAMINHO =
    `${COLABORADOR_ID}/${REVISAO_ID}/revisao-1.pdf`;

function criarBlobPdf(
    sufixo = "aprovado"
) {
    return new Blob(
        [
            `%PDF-1.4\nSafeScan ${sufixo}\n%%EOF`,
        ],
        {
            type:
                "application/pdf",
        }
    );
}

function criarRevisao(
    extras = {}
) {
    return {
        id:
            REVISAO_ID,
        colaborador_id:
            COLABORADOR_ID,
        numero_revisao:
            1,
        status:
            "concluida",
        pdf_bucket:
            null,
        pdf_caminho:
            null,
        pdf_nome:
            null,
        pdf_sha256:
            null,
        pdf_tamanho_bytes:
            null,
        pdf_gerado_em:
            null,
        ...extras,
    };
}

function criarPdf(
    blob = criarBlobPdf()
) {
    return {
        blob,
        tamanhoBytes:
            blob.size,
        bucket:
            TREINAMENTOS_REVISAO_PDF_BUCKET,
        nomeArquivo:
            "revisao-1.pdf",
        caminhoEsperado:
            CAMINHO,
    };
}

function criarClienteMock({
    onUpload,
    onDownload,
    onRpc,
    onRead,
} = {}) {
    const chamadas = {
        upload:
            [],
        download:
            [],
        rpc:
            [],
        read:
            [],
    };

    const cliente = {
        storage: {
            from(
                bucket
            ) {
                return {
                    async upload(
                        caminho,
                        blob,
                        options
                    ) {
                        chamadas.upload.push({
                            bucket,
                            caminho,
                            blob,
                            options,
                        });

                        if (onUpload) {
                            return onUpload({
                                bucket,
                                caminho,
                                blob,
                                options,
                                chamadas,
                            });
                        }

                        return {
                            data: {
                                path:
                                    caminho,
                            },
                            error:
                                null,
                        };
                    },

                    async download(
                        caminho
                    ) {
                        chamadas.download.push({
                            bucket,
                            caminho,
                        });

                        if (onDownload) {
                            return onDownload({
                                bucket,
                                caminho,
                                chamadas,
                            });
                        }

                        return {
                            data:
                                null,
                            error: {
                                statusCode:
                                    404,
                                message:
                                    "Object not found",
                            },
                        };
                    },
                };
            },
        },

        async rpc(
            nome,
            parametros
        ) {
            chamadas.rpc.push({
                nome,
                parametros,
            });

            if (onRpc) {
                return onRpc({
                    nome,
                    parametros,
                    chamadas,
                });
            }

            return {
                data: {
                    ok:
                        true,
                    idempotente:
                        false,
                    bucket:
                        TREINAMENTOS_REVISAO_PDF_BUCKET,
                    caminho:
                        CAMINHO,
                    sha256:
                        parametros.p_sha256,
                },
                error:
                    null,
            };
        },

        from(
            tabela
        ) {
            return {
                select(
                    colunas
                ) {
                    return {
                        eq(
                            coluna,
                            valor
                        ) {
                            const executar =
                                async () => {
                                    chamadas.read.push({
                                        tabela,
                                        colunas,
                                        coluna,
                                        valor,
                                    });

                                    if (onRead) {
                                        return onRead({
                                            tabela,
                                            colunas,
                                            coluna,
                                            valor,
                                            chamadas,
                                        });
                                    }

                                    return {
                                        data: {
                                            id:
                                                REVISAO_ID,
                                            pdf_bucket:
                                                null,
                                            pdf_caminho:
                                                null,
                                            pdf_nome:
                                                null,
                                            pdf_sha256:
                                                null,
                                            pdf_tamanho_bytes:
                                                null,
                                            pdf_gerado_em:
                                                null,
                                        },
                                        error:
                                            null,
                                    };
                                };

                            return {
                                maybeSingle:
                                    executar,
                                single:
                                    executar,
                            };
                        },
                    };
                },
            };
        },
    };

    return {
        cliente,
        chamadas,
    };
}

function criarService(
    cliente
) {
    return criarTreinamentosRevisaoPdfPersistenciaService({
        clienteSupabase:
            cliente,
        cryptoImpl:
            webcrypto,
        aguardar:
            async () => {},
        tentativasReconciliacao:
            2,
        intervaloReconciliacaoMs:
            0,
    });
}

async function shaNode(
    blob
) {
    return createHash(
        "sha256"
    )
        .update(
            Buffer.from(
                await blob.arrayBuffer()
            )
        )
        .digest(
            "hex"
        );
}

async function assertRejectCodigo(
    promise,
    codigo
) {
    await assert.rejects(
        promise,
        (error) => {
            assert.equal(
                error?.codigo,
                codigo
            );

            return true;
        }
    );
}

async function testeSha256() {
    const blob =
        criarBlobPdf();

    const esperado =
        await shaNode(
            blob
        );

    const atual =
        await calcularSha256BlobService({
            blob,
            cryptoImpl:
                webcrypto,
        });

    assert.equal(
        atual,
        esperado
    );
}

async function testePreflightPuro() {
    const blob =
        criarBlobPdf();

    const candidato =
        await prepararCandidatoPersistenciaPdfRevisaoTreinamentos({
            revisao:
                criarRevisao(),
            pdf:
                criarPdf(
                    blob
                ),
            cryptoImpl:
                webcrypto,
        });

    assert.equal(
        candidato.caminho,
        CAMINHO
    );

    assert.equal(
        candidato.nomeArquivo,
        "revisao-1.pdf"
    );

    assert.equal(
        candidato.tamanhoBytes,
        blob.size
    );

    assert.equal(
        candidato.sha256,
        await shaNode(
            blob
        )
    );

    await assert.rejects(
        prepararCandidatoPersistenciaPdfRevisaoTreinamentos({
            revisao:
                criarRevisao(),
            pdf: {
                ...criarPdf(
                    blob
                ),
                caminhoEsperado:
                    "caminho/incorreto.pdf",
            },
            cryptoImpl:
                webcrypto,
        }),
        /caminho canônico/i
    );

    await assertRejectCodigo(
        prepararCandidatoPersistenciaPdfRevisaoTreinamentos({
            revisao:
                criarRevisao({
                    pdf_caminho:
                        CAMINHO,
                }),
            pdf:
                criarPdf(
                    blob
                ),
            cryptoImpl:
                webcrypto,
        }),
        "PDF_REVISAO_JA_PERSISTIDO"
    );
}

async function testeFluxoFeliz() {
    const blob =
        criarBlobPdf();

    const {
        cliente,
        chamadas,
    } =
        criarClienteMock();

    const service =
        criarService(
            cliente
        );

    const resultado =
        await service.persistirPrimeiraEmissao({
            revisao:
                criarRevisao(),
            pdf:
                criarPdf(
                    blob
                ),
        });

    assert.equal(
        resultado.ok,
        true
    );

    assert.equal(
        resultado.sha256,
        await shaNode(
            blob
        )
    );

    assert.equal(
        chamadas.upload.length,
        1
    );

    assert.equal(
        chamadas.rpc.length,
        1
    );

    assert.equal(
        chamadas.upload[0].options.upsert,
        false
    );

    assert.equal(
        chamadas.upload[0].options.contentType,
        "application/pdf"
    );

    assert.equal(
        chamadas.rpc[0].nome,
        TREINAMENTOS_REVISAO_PDF_RPC
    );

    assert.deepEqual(
        chamadas.rpc[0].parametros,
        {
            p_revisao_id:
                REVISAO_ID,
            p_caminho:
                CAMINHO,
            p_nome:
                "revisao-1.pdf",
            p_sha256:
                resultado.sha256,
            p_tamanho_bytes:
                blob.size,
        }
    );
}

async function testeUploadAmbiguoReconciliado() {
    const blob =
        criarBlobPdf();

    const {
        cliente,
        chamadas,
    } =
        criarClienteMock({
            onUpload() {
                throw new Error(
                    "network disconnected"
                );
            },

            onDownload() {
                return {
                    data:
                        blob,
                    error:
                        null,
                };
            },
        });

    const resultado =
        await criarService(
            cliente
        ).persistirPrimeiraEmissao({
            revisao:
                criarRevisao(),
            pdf:
                criarPdf(
                    blob
                ),
        });

    assert.equal(
        resultado.ok,
        true
    );

    assert.equal(
        resultado.storageReconciliado,
        true
    );

    assert.equal(
        chamadas.upload.length,
        1
    );

    assert.equal(
        chamadas.download.length,
        1
    );

    assert.equal(
        chamadas.rpc.length,
        1
    );
}

async function testeUploadDuplicadoMesmoConteudo() {
    const blob =
        criarBlobPdf();

    const {
        cliente,
        chamadas,
    } =
        criarClienteMock({
            onUpload() {
                return {
                    data:
                        null,
                    error: {
                        statusCode:
                            400,
                        message:
                            "The resource already exists",
                    },
                };
            },

            onDownload() {
                return {
                    data:
                        blob,
                    error:
                        null,
                };
            },
        });

    const resultado =
        await criarService(
            cliente
        ).persistirPrimeiraEmissao({
            revisao:
                criarRevisao(),
            pdf:
                criarPdf(
                    blob
                ),
        });

    assert.equal(
        resultado.ok,
        true
    );

    assert.equal(
        resultado.storageReconciliado,
        true
    );

    assert.equal(
        chamadas.upload.length,
        1
    );

    assert.equal(
        chamadas.rpc.length,
        1
    );
}

async function testeUploadAmbiguoSemProvaNaoRepeteEscrita() {
    const blob =
        criarBlobPdf();

    const {
        cliente,
        chamadas,
    } =
        criarClienteMock({
            onUpload() {
                throw new Error(
                    "timeout"
                );
            },

            onDownload() {
                return {
                    data:
                        null,
                    error: {
                        statusCode:
                            404,
                        message:
                            "Object not found",
                    },
                };
            },
        });

    await assertRejectCodigo(
        criarService(
            cliente
        ).persistirPrimeiraEmissao({
            revisao:
                criarRevisao(),
            pdf:
                criarPdf(
                    blob
                ),
        }),
        "PDF_STORAGE_UPLOAD_AMBIGUO"
    );

    assert.equal(
        chamadas.upload.length,
        1,
        "Upload ambíguo nunca pode ser repetido automaticamente."
    );

    assert.equal(
        chamadas.rpc.length,
        0
    );

    assert.equal(
        chamadas.download.length,
        2
    );
}

async function testeConflitoStorage() {
    const blob =
        criarBlobPdf();

    const outroBlob =
        criarBlobPdf(
            "conteudo-divergente"
        );

    const {
        cliente,
        chamadas,
    } =
        criarClienteMock({
            onUpload() {
                return {
                    data:
                        null,
                    error: {
                        statusCode:
                            400,
                        message:
                            "The resource already exists",
                    },
                };
            },

            onDownload() {
                return {
                    data:
                        outroBlob,
                    error:
                        null,
                };
            },
        });

    await assertRejectCodigo(
        criarService(
            cliente
        ).persistirPrimeiraEmissao({
            revisao:
                criarRevisao(),
            pdf:
                criarPdf(
                    blob
                ),
        }),
        "PDF_STORAGE_CONFLITO_IMUTAVEL"
    );

    assert.equal(
        chamadas.upload.length,
        1
    );

    assert.equal(
        chamadas.rpc.length,
        0
    );
}

async function testeRpcAmbiguaReconciliada() {
    const blob =
        criarBlobPdf();

    const sha =
        await shaNode(
            blob
        );

    const {
        cliente,
        chamadas,
    } =
        criarClienteMock({
            onRpc() {
                throw new Error(
                    "connection lost after request"
                );
            },

            onRead() {
                return {
                    data: {
                        id:
                            REVISAO_ID,
                        pdf_bucket:
                            TREINAMENTOS_REVISAO_PDF_BUCKET,
                        pdf_caminho:
                            CAMINHO,
                        pdf_nome:
                            "revisao-1.pdf",
                        pdf_sha256:
                            sha,
                        pdf_tamanho_bytes:
                            blob.size,
                        pdf_gerado_em:
                            "2026-09-09T22:00:00Z",
                    },
                    error:
                        null,
                };
            },
        });

    const resultado =
        await criarService(
            cliente
        ).persistirPrimeiraEmissao({
            revisao:
                criarRevisao(),
            pdf:
                criarPdf(
                    blob
                ),
        });

    assert.equal(
        resultado.ok,
        true
    );

    assert.equal(
        resultado.rpcReconciliado,
        true
    );

    assert.equal(
        chamadas.rpc.length,
        1,
        "RPC ambígua nunca pode ser repetida automaticamente."
    );

    assert.equal(
        chamadas.read.length,
        1
    );
}

async function testeRpcAmbiguaSemConfirmacaoNaoRepeteEscrita() {
    const blob =
        criarBlobPdf();

    const {
        cliente,
        chamadas,
    } =
        criarClienteMock({
            onRpc() {
                throw new Error(
                    "timeout"
                );
            },

            onRead() {
                return {
                    data: {
                        id:
                            REVISAO_ID,
                        pdf_bucket:
                            null,
                        pdf_caminho:
                            null,
                        pdf_nome:
                            null,
                        pdf_sha256:
                            null,
                        pdf_tamanho_bytes:
                            null,
                        pdf_gerado_em:
                            null,
                    },
                    error:
                        null,
                };
            },
        });

    await assertRejectCodigo(
        criarService(
            cliente
        ).persistirPrimeiraEmissao({
            revisao:
                criarRevisao(),
            pdf:
                criarPdf(
                    blob
                ),
        }),
        "PDF_RPC_REGISTRO_AMBIGUO"
    );

    assert.equal(
        chamadas.upload.length,
        1
    );

    assert.equal(
        chamadas.rpc.length,
        1,
        "RPC ambígua nunca pode ser repetida automaticamente."
    );

    assert.equal(
        chamadas.read.length,
        2
    );
}

async function testeRpcRejeitadaConfirmada() {
    const blob =
        criarBlobPdf();

    const {
        cliente,
        chamadas,
    } =
        criarClienteMock({
            onRpc() {
                return {
                    data:
                        null,
                    error: {
                        status:
                            403,
                        message:
                            "Forbidden",
                    },
                };
            },
        });

    await assertRejectCodigo(
        criarService(
            cliente
        ).persistirPrimeiraEmissao({
            revisao:
                criarRevisao(),
            pdf:
                criarPdf(
                    blob
                ),
        }),
        "PDF_RPC_REGISTRO_REJEITADO"
    );

    assert.equal(
        chamadas.upload.length,
        1
    );

    assert.equal(
        chamadas.rpc.length,
        1
    );

    assert.equal(
        chamadas.read.length,
        2
    );
}

async function testeGuardasDeFonte() {
    const source =
        await readFile(
            SERVICE_PATH,
            "utf8"
        );

    assert.match(
        source,
        /upsert:\s*\n\s*false/
    );

    assert.doesNotMatch(
        source,
        /upsert:\s*\n\s*true/
    );

    assert.doesNotMatch(
        source,
        /\.remove\s*\(/
    );

    assert.match(
        source,
        /cryptoImpl\.subtle\.digest\s*\(/
    );

    assert.match(
        source,
        /registrar_pdf_revisao_treinamentos/
    );

    assert.match(
        source,
        /\.download\s*\(/
    );

    assert.match(
        source,
        /PDF_STORAGE_UPLOAD_AMBIGUO/
    );

    assert.match(
        source,
        /PDF_RPC_REGISTRO_AMBIGUO/
    );
}

await testeSha256();
await testePreflightPuro();
await testeFluxoFeliz();
await testeUploadAmbiguoReconciliado();
await testeUploadDuplicadoMesmoConteudo();
await testeUploadAmbiguoSemProvaNaoRepeteEscrita();
await testeConflitoStorage();
await testeRpcAmbiguaReconciliada();
await testeRpcAmbiguaSemConfirmacaoNaoRepeteEscrita();
await testeRpcRejeitadaConfirmada();
await testeGuardasDeFonte();

console.log(
    "SAFESCAN_TREINAMENTOS_REVISAO_I3_P5_P2_P1_SMOKE_OK"
);
