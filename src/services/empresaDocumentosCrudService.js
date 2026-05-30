export async function salvarDocumentoEmpresaCrud({
    supabase,
    novoDoc,
    validarArquivoAntesUpload,
    sanitizarNomeArquivo,
    normalizarDocumentoEmpresa,
}) {
    let arquivoUrl = null;
    let arquivoNome = novoDoc.arquivo?.name || null;

    if (novoDoc.arquivo) {
        if (!validarArquivoAntesUpload(novoDoc.arquivo, "documentoExtenso")) {
            throw new Error("Documento empresarial fora do limite configurado.");
        }

        const nomeSeguro = sanitizarNomeArquivo(novoDoc.arquivo.name);
        const tipoSeguro = sanitizarNomeArquivo(novoDoc.tipo);
        const caminho = `${novoDoc.empresaId}/${tipoSeguro}-${Date.now()}-${nomeSeguro}`;

        const { error: uploadError } = await supabase.storage
            .from("documentos-empresas")
            .upload(caminho, novoDoc.arquivo, {
                cacheControl: "3600",
                upsert: true,
                contentType: novoDoc.arquivo.type || "application/pdf",
            });

        if (uploadError) {
            throw new Error(`Erro no upload do documento: ${uploadError.message}`);
        }

        arquivoUrl = caminho;
        arquivoNome = nomeSeguro;
    }

    const { data, error } = await supabase
        .from("documentos_empresas")
        .upsert(
            {
                empresa_id: novoDoc.empresaId,
                tipo_documento: novoDoc.tipo,
                data_emissao: novoDoc.dataEmissao,
                data_vencimento: novoDoc.dataVencimento,
                url_do_arquivo: arquivoUrl,
                nome_do_arquivo: arquivoNome,
                observacao: novoDoc.observacao || null,
                status_validacao: "Validado",
            },
            { onConflict: "empresa_id,tipo_documento" }
        )
        .select("*")
        .single();

    if (error) {
        throw new Error(`Erro ao salvar documento: ${error.message}`);
    }

    return normalizarDocumentoEmpresa(data);
}

export async function excluirDocumentoEmpresaCrud({ supabase, documento }) {
    const { error } = await supabase
        .from("documentos_empresas")
        .delete()
        .eq("id", documento.id);

    if (error) {
        throw new Error(`Erro ao remover documento: ${error.message}`);
    }

    const caminhoArquivo = documento.url_do_arquivo || documento.arquivo_url;

    if (caminhoArquivo) {
        await supabase.storage.from("documentos-empresas").remove([caminhoArquivo]);
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
