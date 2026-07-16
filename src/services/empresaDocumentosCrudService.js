import { reduzirFotoParaAuditoria } from "./imagemService";

function arquivoEhImagem(arquivo) {
    return String(arquivo?.type || "").toLowerCase().startsWith("image/");
}

async function otimizarImagemDocumentoEmpresa(arquivo) {
    if (!arquivo || !arquivoEhImagem(arquivo)) return arquivo;

    return reduzirFotoParaAuditoria(arquivo, {
        maxLado: 1600,
        alvoBytes: 1200 * 1024,
        qualidadeInicial: 0.86,
        qualidadeMinima: 0.58,
    });
}

async function removerArquivoDocumentoEmpresaSemBloquear({
    supabase,
    caminhoArquivo,
    contexto,
}) {
    if (!caminhoArquivo) return true;

    try {
        const { error } = await supabase.storage
            .from("documentos-empresas")
            .remove([caminhoArquivo]);

        if (error) {
            throw error;
        }

        return true;
    } catch (error) {
        console.warn(
            contexto,
            error?.message || error
        );

        return false;
    }
}

export async function salvarDocumentoEmpresaCrud({
    supabase,
    novoDoc,
    validarArquivoAntesUpload,
    sanitizarNomeArquivo,
    normalizarDocumentoEmpresa,
}) {
    const {
        data: documentoAnterior,
        error: erroConsultaDocumentoAnterior,
    } = await supabase
        .from("documentos_empresas")
        .select("id, url_do_arquivo, nome_do_arquivo")
        .eq("empresa_id", novoDoc.empresaId)
        .eq("tipo_documento", novoDoc.tipo)
        .maybeSingle();

    if (erroConsultaDocumentoAnterior) {
        throw new Error(
            `Erro ao consultar documento existente: ${erroConsultaDocumentoAnterior.message}`
        );
    }

    const caminhoArquivoAnterior =
        documentoAnterior?.url_do_arquivo || "";

    let arquivoUrl =
        caminhoArquivoAnterior || null;

    let arquivoNome =
        documentoAnterior?.nome_do_arquivo || null;

    let caminhoArquivoNovoPendente = "";

    if (novoDoc.arquivo) {
        const arquivoFinal =
            await otimizarImagemDocumentoEmpresa(
                novoDoc.arquivo
            );

        if (
            !validarArquivoAntesUpload(
                arquivoFinal,
                "documentoExtenso"
            )
        ) {
            throw new Error(
                "Documento empresarial fora do limite configurado."
            );
        }

        const nomeSeguro =
            sanitizarNomeArquivo(arquivoFinal.name);

        const tipoSeguro =
            sanitizarNomeArquivo(novoDoc.tipo);

        const caminho =
            `${novoDoc.empresaId}/${tipoSeguro}-${Date.now()}-${nomeSeguro}`;

        const { error: uploadError } =
            await supabase.storage
                .from("documentos-empresas")
                .upload(caminho, arquivoFinal, {
                    cacheControl: "3600",
                    upsert: true,
                    contentType:
                        arquivoFinal.type ||
                        "application/pdf",
                });

        if (uploadError) {
            throw new Error(
                `Erro no upload do documento: ${uploadError.message}`
            );
        }

        caminhoArquivoNovoPendente = caminho;
        arquivoUrl = caminho;
        arquivoNome = nomeSeguro;
    }

    let resultadoPersistencia;

    try {
        resultadoPersistencia = await supabase
            .from("documentos_empresas")
            .upsert(
                {
                    empresa_id: novoDoc.empresaId,
                    tipo_documento: novoDoc.tipo,
                    data_emissao: novoDoc.dataEmissao,
                    data_vencimento: novoDoc.dataVencimento,
                    url_do_arquivo: arquivoUrl,
                    nome_do_arquivo: arquivoNome,
                    observacao:
                        novoDoc.observacao || null,
                    status_validacao: "Validado",
                },
                {
                    onConflict:
                        "empresa_id,tipo_documento",
                }
            )
            .select("*")
            .single();
    } catch (erroPersistencia) {
        if (caminhoArquivoNovoPendente) {
            await removerArquivoDocumentoEmpresaSemBloquear({
                supabase,
                caminhoArquivo:
                    caminhoArquivoNovoPendente,
                contexto:
                    "Falha ao remover do Storage o novo upload após erro inesperado no salvamento do documento:",
            });
        }

        throw new Error(
            `Erro ao salvar documento: ${
                erroPersistencia?.message ||
                erroPersistencia
            }`,
            {
                cause: erroPersistencia,
            }
        );
    }

    const { data, error } =
        resultadoPersistencia;

    if (error) {
        if (caminhoArquivoNovoPendente) {
            await removerArquivoDocumentoEmpresaSemBloquear({
                supabase,
                caminhoArquivo:
                    caminhoArquivoNovoPendente,
                contexto:
                    "Falha ao remover do Storage o novo upload rejeitado pelo banco:",
            });
        }

        throw new Error(
            `Erro ao salvar documento: ${error.message}`
        );
    }

    if (
        caminhoArquivoNovoPendente &&
        caminhoArquivoAnterior &&
        caminhoArquivoAnterior !==
            caminhoArquivoNovoPendente
    ) {
        await removerArquivoDocumentoEmpresaSemBloquear({
            supabase,
            caminhoArquivo: caminhoArquivoAnterior,
            contexto:
                "Documento atualizado, mas o arquivo anterior não pôde ser removido do Storage:",
        });
    }

    return normalizarDocumentoEmpresa(data);
}

export async function excluirDocumentoEmpresaCrud({
    supabase,
    documento,
}) {
    const { error } = await supabase
        .from("documentos_empresas")
        .delete()
        .eq("id", documento.id);

    if (error) {
        throw new Error(
            `Erro ao remover documento: ${error.message}`
        );
    }

    const caminhoArquivo =
        documento.url_do_arquivo ||
        documento.arquivo_url;

    if (caminhoArquivo) {
        await removerArquivoDocumentoEmpresaSemBloquear({
            supabase,
            caminhoArquivo,
            contexto:
                "O registro do documento foi excluído, mas o arquivo não pôde ser removido do Storage:",
        });
    }

    return true;
}

export async function gerarUrlVisualizacaoDocumentoEmpresa({
    supabase,
    documento,
    expiracaoSegundos = 60 * 10,
}) {
    const caminhoArquivo = documento?.url_do_arquivo || documento?.arquivo_url;

    if (!caminhoArquivo) {
        throw new Error("Este documento ainda não possui arquivo anexado para visualização.");
    }

    const { data, error } = await supabase.storage
        .from("documentos-empresas")
        .createSignedUrl(caminhoArquivo, expiracaoSegundos);

    if (error) {
        throw new Error(`Erro ao gerar link de visualização: ${error.message}`);
    }

    return data.signedUrl;
}
