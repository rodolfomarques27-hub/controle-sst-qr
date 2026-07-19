// Serialização dos resultados da leitura documental para persistência.

export function montarRetornoLeituraParaPersistencia(leitura = null) {
    if (!leitura) return null;

    return {
        tipo_leitura: leitura.tipoLeitura,
        executado: Boolean(leitura.executado),
        confianca: leitura.confianca,
        resumo: leitura.resumo,
        resumo_textual: leitura.resumoTextual || [],
        campos_extraidos: leitura.camposExtraidos || null,
        linhas_ocr: (leitura.linhasOcr || []).slice(0, 120),
        assinaturas_tabela: (leitura.assinaturasTabela || leitura.assinaturas_tabela || []).slice(0, 30),
        assinaturas_documento: (leitura.assinaturasDocumento || leitura.assinaturas_documento || []).slice(0, 20),
        texto_previa: leitura.textoPrevia || "",
        paginas_lidas: leitura.paginasLidas || 0,
        total_paginas: leitura.totalPaginas || 0,
        busca_ampliada: leitura.buscaAmpliada || null,
        comparacao_datas_permitida: Boolean(leitura.comparacaoDatasPermitida),
        datas_encontradas: (leitura.datasEncontradas || []).map((data) => ({
            iso: data.iso,
            br: data.br,
            categorias: data.categorias,
            ocorrencias: data.ocorrencias,
            contexto: data.contexto,
            origem: data.origem,
        })),
        datas_documento_confiaveis: (leitura.datasDocumentoConfiaveis || []).map((data) => data.iso),
        datas_relevantes_classificadas: (leitura.datasRelevantesClassificadas || []).map((data) => ({
            iso: data.iso,
            br: data.br,
            tipo: data.tipo || "",
            rotulo: data.rotulo || "",
            motivo: data.motivo || "",
        })),
        datas_classificadas: leitura.datasClassificadas || null,
        datas_nome_arquivo: (leitura.datasNomeArquivo || []).map((data) => data.iso),
        datas_assinatura_digital: (leitura.datasAssinaturaDigital || []).map((data) => data.iso),
        datas_provaveis_vencimento: (leitura.datasProvaveisVencimento || []).map((data) => data.iso),
        datas_provaveis_emissao_realizacao: (leitura.datasProvaveisEmissaoRealizacao || []).map((data) => data.iso),
        avisos: leitura.avisos || [],
        erro: leitura.erro || "",
    };
}
