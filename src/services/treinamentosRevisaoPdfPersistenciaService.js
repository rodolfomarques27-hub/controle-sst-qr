export const TREINAMENTOS_REVISAO_PDF_BUCKET =
    "revisoes-treinamentos";

export const TREINAMENTOS_REVISAO_PDF_RPC =
    "registrar_pdf_revisao_treinamentos";

export const TREINAMENTOS_REVISAO_PDF_LIMITE_BYTES =
    20 * 1024 * 1024;

const MIME_PDF =
    "application/pdf";

const PADRAO_UUID =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PADRAO_SHA256 =
    /^[0-9a-f]{64}$/;

const TENTATIVAS_RECONCILIACAO_PADRAO =
    6;

const INTERVALO_RECONCILIACAO_PADRAO_MS =
    350;

let clienteSupabasePadraoPromise =
    null;

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function numeroSeguro(
    valor
) {
    const numero =
        Number(
            valor
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : 0;
}

function normalizarToken(
    valor
) {
    return textoSeguro(
        valor
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase();
}

function criarErroPersistenciaPdf(
    mensagem,
    erroOriginal,
    detalhes = {}
) {
    const detalheOriginal =
        textoSeguro(
            erroOriginal?.message
        );

    const erro =
        new Error(
            detalheOriginal
                ? `${mensagem} ${detalheOriginal}`
                : mensagem
        );

    erro.cause =
        erroOriginal || null;

    Object.assign(
        erro,
        detalhes
    );

    return erro;
}

function validarClienteSupabase(
    clienteSupabase
) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.rpc !==
            "function" ||
        typeof clienteSupabase.from !==
            "function" ||
        typeof clienteSupabase.storage?.from !==
            "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para persistência do PDF da revisão."
        );
    }

    return clienteSupabase;
}

async function obterClienteSupabasePadrao() {
    if (!clienteSupabasePadraoPromise) {
        clienteSupabasePadraoPromise =
            import(
                "../lib/supabaseClient.js"
            )
                .then(
                    ({
                        supabase,
                    }) =>
                        validarClienteSupabase(
                            supabase
                        )
                )
                .catch(
                    (error) => {
                        clienteSupabasePadraoPromise =
                            null;

                        throw criarErroPersistenciaPdf(
                            "Não foi possível carregar o cliente Supabase.",
                            error,
                            {
                                codigo:
                                    "PDF_REVISAO_CLIENTE_SUPABASE_INVALIDO",

                                etapa:
                                    "cliente_supabase",
                            }
                        );
                    }
                );
    }

    return clienteSupabasePadraoPromise;
}

function obterStatusHttp(
    resposta,
    error
) {
    const candidatos = [
        error?.status,
        error?.statusCode,
        resposta?.status,
        resposta?.statusCode,
    ];

    for (
        const candidato of
        candidatos
    ) {
        if (
            candidato === null ||
            candidato === undefined ||
            candidato === ""
        ) {
            continue;
        }

        const numero =
            Number(
                candidato
            );

        if (
            Number.isInteger(
                numero
            )
        ) {
            return numero;
        }
    }

    return null;
}

function rejeicaoHttpConfirmada(
    statusHttp
) {
    return (
        Number.isInteger(
            statusHttp
        ) &&
        statusHttp >= 400 &&
        statusHttp < 500
    );
}

function erroPareceObjetoExistente(
    error
) {
    const mensagem =
        normalizarToken(
            error?.message ||
            error?.error ||
            error?.name
        );

    return (
        mensagem.includes(
            "already exists"
        ) ||
        mensagem.includes(
            "resource already exists"
        ) ||
        mensagem.includes(
            "duplicate"
        ) ||
        mensagem.includes(
            "object already exists"
        )
    );
}

function erroPareceNaoEncontrado(
    error
) {
    const statusHttp =
        obterStatusHttp(
            null,
            error
        );

    const mensagem =
        normalizarToken(
            error?.message ||
            error?.error ||
            error?.name
        );

    return (
        statusHttp === 404 ||
        mensagem.includes(
            "not found"
        ) ||
        mensagem.includes(
            "does not exist"
        ) ||
        mensagem.includes(
            "object not found"
        )
    );
}

function temValorPersistido(
    valor
) {
    return !(
        valor === null ||
        valor === undefined ||
        valor === ""
    );
}

function normalizarRegistroPdf(
    revisao
) {
    const fonte =
        revisao || {};

    return {
        bucket:
            textoSeguro(
                fonte.pdf_bucket ??
                fonte.pdfBucket
            ),

        caminho:
            textoSeguro(
                fonte.pdf_caminho ??
                fonte.pdfCaminho
            ),

        nome:
            textoSeguro(
                fonte.pdf_nome ??
                fonte.pdfNome
            ),

        sha256:
            textoSeguro(
                fonte.pdf_sha256 ??
                fonte.pdfSha256
            ).toLowerCase(),

        tamanhoBytes:
            numeroSeguro(
                fonte.pdf_tamanho_bytes ??
                fonte.pdfTamanhoBytes
            ),

        geradoEm:
            textoSeguro(
                fonte.pdf_gerado_em ??
                fonte.pdfGeradoEm
            ),
    };
}

function registroPdfPossuiAlgumValor(
    registro
) {
    return (
        temValorPersistido(
            registro.bucket
        ) ||
        temValorPersistido(
            registro.caminho
        ) ||
        temValorPersistido(
            registro.nome
        ) ||
        temValorPersistido(
            registro.sha256
        ) ||
        registro.tamanhoBytes > 0 ||
        temValorPersistido(
            registro.geradoEm
        )
    );
}

function registroPdfCompleto(
    registro
) {
    return (
        registro.bucket ===
            TREINAMENTOS_REVISAO_PDF_BUCKET &&
        Boolean(
            registro.caminho
        ) &&
        Boolean(
            registro.nome
        ) &&
        PADRAO_SHA256.test(
            registro.sha256
        ) &&
        registro.tamanhoBytes > 0
    );
}

function registroPdfConfereComCandidato(
    registro,
    candidato
) {
    return (
        registro.bucket ===
            candidato.bucket &&
        registro.caminho ===
            candidato.caminho &&
        registro.nome ===
            candidato.nomeArquivo &&
        registro.sha256 ===
            candidato.sha256 &&
        registro.tamanhoBytes ===
            candidato.tamanhoBytes
    );
}

function validarRevisaoParaPrimeiraEmissao(
    revisao
) {
    if (
        !revisao ||
        typeof revisao !==
            "object"
    ) {
        throw new Error(
            "A revisão concluída não foi informada."
        );
    }

    const revisaoId =
        textoSeguro(
            revisao.id ??
            revisao.revisaoId ??
            revisao.revisao_id
        );

    const colaboradorId =
        textoSeguro(
            revisao.colaborador_id ??
            revisao.colaboradorId ??
            revisao.colaborador_snapshot?.id ??
            revisao.colaboradorSnapshot?.id
        );

    const numeroRevisao =
        Math.trunc(
            numeroSeguro(
                revisao.numero_revisao ??
                revisao.numeroRevisao
            )
        );

    const status =
        normalizarToken(
            revisao.status
        );

    if (
        !PADRAO_UUID.test(
            revisaoId
        )
    ) {
        throw new Error(
            "O identificador da revisão não é um UUID válido."
        );
    }

    if (
        !PADRAO_UUID.test(
            colaboradorId
        )
    ) {
        throw new Error(
            "O identificador do colaborador da revisão não é um UUID válido."
        );
    }

    if (
        numeroRevisao <= 0
    ) {
        throw new Error(
            "O número da revisão é inválido para emissão do PDF."
        );
    }

    if (
        status !==
        "concluida"
    ) {
        throw new Error(
            "Somente revisão concluída pode receber PDF histórico."
        );
    }

    const registroAtual =
        normalizarRegistroPdf(
            revisao
        );

    const pdfDisponivel =
        Boolean(
            revisao.pdfDisponivel ??
            revisao.pdf_disponivel
        );

    if (
        pdfDisponivel ||
        registroPdfPossuiAlgumValor(
            registroAtual
        )
    ) {
        throw criarErroPersistenciaPdf(
            "A revisão já possui metadados de PDF e não pode iniciar nova primeira emissão.",
            null,
            {
                codigo:
                    "PDF_REVISAO_JA_PERSISTIDO",

                etapa:
                    "preflight",

                registroAtual,
            }
        );
    }

    const nomeArquivo =
        `revisao-${numeroRevisao}.pdf`;

    const caminho =
        `${colaboradorId}/${revisaoId}/${nomeArquivo}`;

    return {
        revisaoId,
        colaboradorId,
        numeroRevisao,
        nomeArquivo,
        caminho,
        bucket:
            TREINAMENTOS_REVISAO_PDF_BUCKET,
    };
}

function validarPdfRenderizado(
    pdf,
    revisaoValidada
) {
    if (
        !pdf ||
        typeof pdf !==
            "object"
    ) {
        throw new Error(
            "O PDF renderizado não foi informado."
        );
    }

    const blob =
        pdf.blob;

    if (
        !blob ||
        typeof blob.arrayBuffer !==
            "function"
    ) {
        throw new Error(
            "O renderer não retornou Blob válido para persistência."
        );
    }

    const tamanhoBytes =
        Math.trunc(
            numeroSeguro(
                pdf.tamanhoBytes ??
                blob.size
            )
        );

    if (
        tamanhoBytes <= 0 ||
        tamanhoBytes >
            TREINAMENTOS_REVISAO_PDF_LIMITE_BYTES ||
        tamanhoBytes !==
            Number(
                blob.size
            )
    ) {
        throw new Error(
            "O tamanho do PDF não corresponde aos bytes renderizados ou excede 20 MiB."
        );
    }

    const mime =
        textoSeguro(
            blob.type
        ).toLowerCase();

    if (
        mime &&
        mime !== MIME_PDF
    ) {
        throw new Error(
            "O Blob renderizado não possui MIME application/pdf."
        );
    }

    const bucket =
        textoSeguro(
            pdf.bucket
        );

    const nomeArquivo =
        textoSeguro(
            pdf.nomeArquivo ??
            pdf.nomePdf
        );

    const caminho =
        textoSeguro(
            pdf.caminhoEsperado ??
            pdf.caminho
        );

    if (
        bucket !==
        revisaoValidada.bucket
    ) {
        throw new Error(
            "O bucket do renderer não corresponde ao bucket imutável da revisão."
        );
    }

    if (
        nomeArquivo !==
        revisaoValidada.nomeArquivo
    ) {
        throw new Error(
            "O nome do PDF não corresponde ao número da revisão."
        );
    }

    if (
        caminho !==
        revisaoValidada.caminho
    ) {
        throw new Error(
            "O caminho do PDF não corresponde ao caminho canônico da revisão."
        );
    }

    return {
        blob,
        tamanhoBytes,
        bucket,
        nomeArquivo,
        caminho,
    };
}

function aguardarPadrao(
    milissegundos
) {
    return new Promise(
        (resolve) => {
            setTimeout(
                resolve,
                milissegundos
            );
        }
    );
}

export async function calcularSha256BlobService({
    blob,
    cryptoImpl = globalThis.crypto,
} = {}) {
    if (
        !blob ||
        typeof blob.arrayBuffer !==
            "function"
    ) {
        throw new Error(
            "Blob inválido para cálculo de SHA-256."
        );
    }

    if (
        !cryptoImpl?.subtle ||
        typeof cryptoImpl.subtle.digest !==
            "function"
    ) {
        throw new Error(
            "Web Crypto indisponível para cálculo de SHA-256."
        );
    }

    const bytes =
        await blob.arrayBuffer();

    const digest =
        await cryptoImpl.subtle.digest(
            "SHA-256",
            bytes
        );

    return Array.from(
        new Uint8Array(
            digest
        ),
        (byte) =>
            byte
                .toString(16)
                .padStart(
                    2,
                    "0"
                )
    ).join("");
}

export async function prepararCandidatoPersistenciaPdfRevisaoTreinamentos({
    revisao,
    pdf,
    cryptoImpl = globalThis.crypto,
} = {}) {
    const revisaoValidada =
        validarRevisaoParaPrimeiraEmissao(
            revisao
        );

    const pdfValidado =
        validarPdfRenderizado(
            pdf,
            revisaoValidada
        );

    const sha256 =
        await calcularSha256BlobService({
            blob:
                pdfValidado.blob,
            cryptoImpl,
        });

    if (
        !PADRAO_SHA256.test(
            sha256
        )
    ) {
        throw new Error(
            "O SHA-256 calculado para o PDF é inválido."
        );
    }

    return {
        ...revisaoValidada,
        ...pdfValidado,
        sha256,
    };
}

export function criarTreinamentosRevisaoPdfPersistenciaService({
    clienteSupabase,
    cryptoImpl = globalThis.crypto,
    aguardar = aguardarPadrao,
    tentativasReconciliacao =
        TENTATIVAS_RECONCILIACAO_PADRAO,
    intervaloReconciliacaoMs =
        INTERVALO_RECONCILIACAO_PADRAO_MS,
} = {}) {
    const cliente =
        validarClienteSupabase(
            clienteSupabase
        );

    const totalTentativas =
        Math.max(
            1,
            Math.min(
                12,
                Math.trunc(
                    numeroSeguro(
                        tentativasReconciliacao
                    )
                ) ||
                    TENTATIVAS_RECONCILIACAO_PADRAO
            )
        );

    const intervaloMs =
        Math.max(
            0,
            Math.trunc(
                numeroSeguro(
                    intervaloReconciliacaoMs
                )
            )
        );

    async function esperarEntreTentativas(
        tentativa
    ) {
        if (
            tentativa >= totalTentativas ||
            intervaloMs <= 0
        ) {
            return;
        }

        await aguardar(
            intervaloMs
        );
    }

    async function consultarRegistroPdf(
        revisaoId
    ) {
        try {
            const consulta =
                cliente
                    .from(
                        "treinamentos_revisoes"
                    )
                    .select(
                        "id,pdf_bucket,pdf_caminho,pdf_nome,pdf_sha256,pdf_tamanho_bytes,pdf_gerado_em"
                    )
                    .eq(
                        "id",
                        revisaoId
                    );

            const {
                data,
                error,
            } =
                typeof consulta.maybeSingle ===
                    "function"
                    ? await consulta.maybeSingle()
                    : await consulta.single();

            if (error) {
                return {
                    estado:
                        "desconhecido",
                    error,
                };
            }

            if (!data) {
                return {
                    estado:
                        "ausente",
                    registro:
                        null,
                };
            }

            const registro =
                normalizarRegistroPdf(
                    data
                );

            if (
                !registroPdfPossuiAlgumValor(
                    registro
                )
            ) {
                return {
                    estado:
                        "pendente",
                    registro,
                };
            }

            return {
                estado:
                    registroPdfCompleto(
                        registro
                    )
                        ? "persistido"
                        : "inconsistente",
                registro,
            };
        }
        catch (error) {
            return {
                estado:
                    "desconhecido",
                error,
            };
        }
    }

    async function reconciliarRegistroPdf(
        candidato
    ) {
        let ultimo =
            null;

        for (
            let tentativa = 1;
            tentativa <= totalTentativas;
            tentativa += 1
        ) {
            ultimo =
                await consultarRegistroPdf(
                    candidato.revisaoId
                );

            if (
                ultimo.estado ===
                "persistido"
            ) {
                return {
                    ...ultimo,
                    tentativa,
                    confere:
                        registroPdfConfereComCandidato(
                            ultimo.registro,
                            candidato
                        ),
                };
            }

            if (
                ultimo.estado ===
                "inconsistente"
            ) {
                return {
                    ...ultimo,
                    tentativa,
                    confere:
                        false,
                };
            }

            await esperarEntreTentativas(
                tentativa
            );
        }

        return {
            ...(ultimo || {
                estado:
                    "desconhecido",
            }),
            tentativa:
                totalTentativas,
            confere:
                false,
        };
    }

    async function lerObjetoStorage(
        candidato
    ) {
        try {
            const {
                data,
                error,
            } =
                await cliente
                    .storage
                    .from(
                        candidato.bucket
                    )
                    .download(
                        candidato.caminho
                    );

            if (error) {
                if (
                    erroPareceNaoEncontrado(
                        error
                    )
                ) {
                    return {
                        estado:
                            "ausente",
                        error,
                    };
                }

                return {
                    estado:
                        "desconhecido",
                    error,
                };
            }

            if (
                !data ||
                typeof data.arrayBuffer !==
                    "function"
            ) {
                return {
                    estado:
                        "desconhecido",
                    error:
                        new Error(
                            "Download do Storage não retornou Blob válido."
                        ),
                };
            }

            const tamanhoBytes =
                Number(
                    data.size
                );

            const sha256 =
                await calcularSha256BlobService({
                    blob:
                        data,
                    cryptoImpl,
                });

            return {
                estado:
                    tamanhoBytes ===
                        candidato.tamanhoBytes &&
                    sha256 ===
                        candidato.sha256
                        ? "confirmado"
                        : "divergente",
                tamanhoBytes,
                sha256,
            };
        }
        catch (error) {
            return {
                estado:
                    "desconhecido",
                error,
            };
        }
    }

    async function reconciliarObjetoStorage(
        candidato
    ) {
        let ultimo =
            null;

        for (
            let tentativa = 1;
            tentativa <= totalTentativas;
            tentativa += 1
        ) {
            ultimo =
                await lerObjetoStorage(
                    candidato
                );

            if (
                ultimo.estado ===
                    "confirmado" ||
                ultimo.estado ===
                    "divergente"
            ) {
                return {
                    ...ultimo,
                    tentativa,
                };
            }

            await esperarEntreTentativas(
                tentativa
            );
        }

        return {
            ...(ultimo || {
                estado:
                    "desconhecido",
            }),
            tentativa:
                totalTentativas,
        };
    }

    function montarResultadoSucesso(
        candidato,
        {
            storageReconciliado = false,
            rpcReconciliado = false,
            idempotente = false,
            respostaRpc = null,
        } = {}
    ) {
        return {
            ok:
                true,
            revisaoId:
                candidato.revisaoId,
            bucket:
                candidato.bucket,
            caminho:
                candidato.caminho,
            nomeArquivo:
                candidato.nomeArquivo,
            sha256:
                candidato.sha256,
            tamanhoBytes:
                candidato.tamanhoBytes,
            storageReconciliado,
            rpcReconciliado,
            idempotente,
            respostaRpc,
        };
    }

    async function resolverFalhaUpload(
        candidato,
        respostaUpload,
        uploadError
    ) {
        const statusHttp =
            obterStatusHttp(
                respostaUpload,
                uploadError
            );

        const reconciliacaoStorage =
            await reconciliarObjetoStorage(
                candidato
            );

        if (
            reconciliacaoStorage.estado ===
            "confirmado"
        ) {
            return {
                storageReconciliado:
                    true,
            };
        }

        if (
            reconciliacaoStorage.estado ===
            "divergente"
        ) {
            throw criarErroPersistenciaPdf(
                "Já existe outro conteúdo no caminho imutável desta revisão.",
                uploadError,
                {
                    codigo:
                        "PDF_STORAGE_CONFLITO_IMUTAVEL",

                    etapa:
                        "storage_upload",

                    candidato,
                    reconciliacaoStorage,
                }
            );
        }

        const rejeicaoConfirmada =
            rejeicaoHttpConfirmada(
                statusHttp
            );

        const objetoJaExistia =
            erroPareceObjetoExistente(
                uploadError
            );

        const objetoAusente =
            reconciliacaoStorage.estado ===
            "ausente";

        if (
            rejeicaoConfirmada &&
            !objetoJaExistia &&
            objetoAusente
        ) {
            throw criarErroPersistenciaPdf(
                "O Storage rejeitou o primeiro upload do PDF.",
                uploadError,
                {
                    codigo:
                        "PDF_STORAGE_UPLOAD_REJEITADO",

                    etapa:
                        "storage_upload",

                    statusHttp,
                    candidato,
                    reconciliacaoStorage,
                }
            );
        }

        throw criarErroPersistenciaPdf(
            "A resposta do primeiro upload do PDF é inconclusiva. Não repetir a escrita antes de nova auditoria read-only.",
            uploadError,
            {
                codigo:
                    "PDF_STORAGE_UPLOAD_AMBIGUO",

                etapa:
                    "storage_upload",

                statusHttp,
                candidato,
                reconciliacaoStorage,
            }
        );
    }

    async function executarUploadUnico(
        candidato
    ) {
        let respostaUpload =
            null;

        let uploadError =
            null;

        try {
            respostaUpload =
                await cliente
                    .storage
                    .from(
                        candidato.bucket
                    )
                    .upload(
                        candidato.caminho,
                        candidato.blob,
                        {
                            cacheControl:
                                "3600",
                            contentType:
                                MIME_PDF,
                            upsert:
                                false,
                        }
                    );

            uploadError =
                respostaUpload?.error ||
                null;
        }
        catch (error) {
            uploadError =
                error;
        }

        if (!uploadError) {
            return {
                storageReconciliado:
                    false,
            };
        }

        return resolverFalhaUpload(
            candidato,
            respostaUpload,
            uploadError
        );
    }

    function validarRespostaRpc(
        candidato,
        dadosRpc,
        storageReconciliado
    ) {
        if (
            dadosRpc?.ok !== true
        ) {
            throw criarErroPersistenciaPdf(
                "A RPC não confirmou o registro imutável do PDF.",
                null,
                {
                    codigo:
                        "PDF_RPC_RESPOSTA_INVALIDA",

                    etapa:
                        "rpc_registro",

                    candidato,
                    respostaRpc:
                        dadosRpc,
                }
            );
        }

        const bucketRetornado =
            textoSeguro(
                dadosRpc.bucket
            );

        const caminhoRetornado =
            textoSeguro(
                dadosRpc.caminho
            );

        const shaRetornado =
            textoSeguro(
                dadosRpc.sha256
            ).toLowerCase();

        if (
            bucketRetornado &&
            bucketRetornado !==
                candidato.bucket
        ) {
            throw new Error(
                "A RPC retornou bucket divergente do contrato imutável."
            );
        }

        if (
            caminhoRetornado &&
            caminhoRetornado !==
                candidato.caminho
        ) {
            throw new Error(
                "A RPC retornou caminho divergente do contrato imutável."
            );
        }

        if (
            shaRetornado &&
            shaRetornado !==
                candidato.sha256
        ) {
            throw new Error(
                "A RPC retornou SHA-256 divergente dos bytes aprovados."
            );
        }

        return montarResultadoSucesso(
            candidato,
            {
                storageReconciliado,
                rpcReconciliado:
                    false,
                idempotente:
                    Boolean(
                        dadosRpc.idempotente
                    ),
                respostaRpc:
                    dadosRpc,
            }
        );
    }

    async function resolverFalhaRpc(
        candidato,
        respostaRpc,
        rpcError,
        storageReconciliado
    ) {
        const statusHttp =
            obterStatusHttp(
                respostaRpc,
                rpcError
            );

        const reconciliacaoRpc =
            await reconciliarRegistroPdf(
                candidato
            );

        const registroPersistido =
            reconciliacaoRpc.estado ===
            "persistido";

        if (
            registroPersistido &&
            reconciliacaoRpc.confere
        ) {
            return montarResultadoSucesso(
                candidato,
                {
                    storageReconciliado,
                    rpcReconciliado:
                        true,
                    idempotente:
                        true,
                    respostaRpc:
                        null,
                }
            );
        }

        if (
            registroPersistido ||
            reconciliacaoRpc.estado ===
                "inconsistente"
        ) {
            throw criarErroPersistenciaPdf(
                "O registro remoto do PDF diverge dos bytes aprovados para esta revisão.",
                rpcError,
                {
                    codigo:
                        "PDF_RPC_CONFLITO_IMUTAVEL",

                    etapa:
                        "rpc_registro",

                    statusHttp,
                    candidato,
                    reconciliacaoRpc,
                }
            );
        }

        const rpcRejeitada =
            rejeicaoHttpConfirmada(
                statusHttp
            );

        const registroAindaPendente =
            reconciliacaoRpc.estado ===
                "pendente" ||
            reconciliacaoRpc.estado ===
                "ausente";

        if (
            rpcRejeitada &&
            registroAindaPendente
        ) {
            throw criarErroPersistenciaPdf(
                "A RPC rejeitou o registro do PDF. O objeto no Storage deve permanecer intacto para nova análise.",
                rpcError,
                {
                    codigo:
                        "PDF_RPC_REGISTRO_REJEITADO",

                    etapa:
                        "rpc_registro",

                    statusHttp,
                    candidato,
                    reconciliacaoRpc,
                }
            );
        }

        throw criarErroPersistenciaPdf(
            "A resposta da RPC de registro do PDF é inconclusiva. Não repetir a escrita antes de nova auditoria read-only.",
            rpcError,
            {
                codigo:
                    "PDF_RPC_REGISTRO_AMBIGUO",

                etapa:
                    "rpc_registro",

                statusHttp,
                candidato,
                reconciliacaoRpc,
            }
        );
    }

    async function executarRegistroRpcUnico(
        candidato,
        storageReconciliado
    ) {
        const parametrosRpc = {
            p_revisao_id:
                candidato.revisaoId,

            p_caminho:
                candidato.caminho,

            p_nome:
                candidato.nomeArquivo,

            p_sha256:
                candidato.sha256,

            p_tamanho_bytes:
                candidato.tamanhoBytes,
        };

        let respostaRpc =
            null;

        let rpcError =
            null;

        try {
            respostaRpc =
                await cliente.rpc(
                    TREINAMENTOS_REVISAO_PDF_RPC,
                    parametrosRpc
                );

            rpcError =
                respostaRpc?.error ||
                null;
        }
        catch (error) {
            rpcError =
                error;
        }

        if (rpcError) {
            return resolverFalhaRpc(
                candidato,
                respostaRpc,
                rpcError,
                storageReconciliado
            );
        }

        return validarRespostaRpc(
            candidato,
            respostaRpc?.data || {},
            storageReconciliado
        );
    }

    async function persistirPrimeiraEmissao({
        revisao,
        pdf,
    } = {}) {
        const candidato =
            await prepararCandidatoPersistenciaPdfRevisaoTreinamentos({
                revisao,
                pdf,
                cryptoImpl,
            });

        const {
            storageReconciliado,
        } =
            await executarUploadUnico(
                candidato
            );

        return executarRegistroRpcUnico(
            candidato,
            storageReconciliado
        );
    }

    return {
        persistirPrimeiraEmissao,
        consultarRegistroPdf,
    };
}

export async function persistirPdfRevisaoTreinamentosService({
    supabase,
    revisao,
    pdf,
} = {}) {
    const cliente =
        supabase ||
        await obterClienteSupabasePadrao();

    const service =
        criarTreinamentosRevisaoPdfPersistenciaService({
            clienteSupabase:
                cliente,
        });

    return service.persistirPrimeiraEmissao({
        revisao,
        pdf,
    });
}
