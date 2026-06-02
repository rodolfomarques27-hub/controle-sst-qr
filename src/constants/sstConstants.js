// Compatibilidade temporária para imports antigos.
// As constantes foram separadas por domínio para melhorar o bundle.
// Novos módulos devem importar diretamente dos arquivos específicos.
// Importar estilosGlobais deve ser feito por ./appGlobalStyles para não puxar CSS pesado junto de constantes.

export {
    TAMANHO_PAGINA_SUPABASE,
    DAY,
    FUNCAO_EMAIL_ALERTA_TST,
    LIMITE_STORAGE_MB,
    UPLOAD_BLOQUEAR_ACIMA_5MB,
    UPLOAD_LIMITE_FORTE_MB,
    UPLOAD_MENSAGEM_ARQUIVO_GRANDE,
    perfisUpload,
} from "./sistemaConstants";
export {
    treinamentosBase,
    STATUS_CLASSIFICACAO_COLABORADOR,
    IDS_DOCUMENTOS_CRITICOS_COLABORADOR,
    treinamentosBaseObra,
    matrizTreinamentosPorFuncao,
} from "./treinamentosConstants";
export { documentosEmpresaBase } from "./documentosEmpresaConstants";
export {
    respostasAuditoriaCampo,
    categoriasAuditoriaCampo,
    statusDesvioAuditoriaCampo,
    gravidadesAuditoriaCampo,
    tiposAuditoriaCampoDireta,
    categoriasPadronizadasAuditoriaCampo,
    statusAuditoriaCampoDireta,
    grausRiscoAuditoriaCampoDireta,
    descricoesGrauRiscoAuditoriaCampoDireta,
    checklistDinamicoAuditoriaCampo,
} from "./auditoriaCampoConstants";
