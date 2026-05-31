export const DOCUMENTOS_VERIFICACAO_ORIGENS = Object.freeze({
    DOCUMENTO_EMPRESA: "documento_empresa",
    CERTIFICADO: "certificado",
    CONTRATO_EMPRESA: "contrato_empresa",
    AUDITORIA_CAMPO: "auditoria_campo",
    OUTRO: "outro",
});

export const DOCUMENTOS_VERIFICACAO_TABELAS = Object.freeze({
    DOCUMENTOS_EMPRESAS: "documentos_empresas",
    CERTIFICADOS: "certificados",
    EMPRESAS: "empresas",
    AUDITORIAS_CAMPO: "auditorias_campo",
    OUTRO: "outro",
});

export const DOCUMENTOS_VERIFICACAO_STATUS = Object.freeze({
    PENDENTE: "pendente",
    APROVADO: "aprovado",
    ATENCAO: "atencao",
    REVISAO_MANUAL: "revisao_manual",
    SUSPEITO: "suspeito",
    BLOQUEADO: "bloqueado",
    ERRO: "erro",
});

export const DOCUMENTOS_VERIFICACAO_RISCO = Object.freeze({
    NAO_AVALIADO: "nao_avaliado",
    BAIXO: "baixo",
    MEDIO: "medio",
    ALTO: "alto",
    CRITICO: "critico",
});

export const DOCUMENTOS_VERIFICACAO_ORIGEM_ANALISE = Object.freeze({
    REGRAS_LOCAIS: "regras_locais",
    MANUAL: "manual",
    OCR_LOCAL: "ocr_local",
    IA_TESTE: "ia_teste",
    IA_PAGA: "ia_paga",
});

export const DOCUMENTOS_VERIFICACAO_BUCKETS = Object.freeze({
    DOCUMENTOS_EMPRESAS: "documentos-empresas",
    CERTIFICADOS_TREINAMENTOS: "certificados-treinamentos",
    CERTIFICADOS_LEGADO: "Certificados",
    CONTRATOS_EMPRESAS: "contratos-empresas",
    AUDITORIAS_CAMPO: "auditorias-campo",
});

export const DOCUMENTOS_VERIFICACAO_MIME_PERMITIDOS = Object.freeze([
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
]);

export const DOCUMENTOS_VERIFICACAO_EXTENSOES_PERMITIDAS = Object.freeze([
    "pdf",
    "jpg",
    "jpeg",
    "png",
    "webp",
]);

export const DOCUMENTOS_VERIFICACAO_NOMES_SUSPEITOS = Object.freeze([
    "copy",
    "copia",
    "cópia",
    "editado",
    "alterado",
    "modificado",
    "fake",
    "teste",
    "rascunho",
    "sem assinatura",
    "sem-assinatura",
    "print",
    "screenshot",
    "whatsapp",
    "image",
    "imagem",
    "scan",
    "scanner",
]);

export const DOCUMENTOS_VERIFICACAO_TERMOS_ALERTA_OBSERVACAO = Object.freeze([
    "rasura",
    "rasurado",
    "ilegível",
    "ilegivél",
    "cortado",
    "suspeito",
    "assinatura",
    "divergente",
    "divergência",
    "vencido",
    "incompleto",
    "sem validade",
    "sem data",
    "sem cpf",
    "sem cnpj",
]);

export const DOCUMENTOS_VERIFICACAO_LIMITES = Object.freeze({
    TAMANHO_MINIMO_BYTES: 15 * 1024,
    TAMANHO_ALERTA_BYTES: 35 * 1024,
    TAMANHO_MAXIMO_RECOMENDADO_BYTES: 25 * 1024 * 1024,
    DIAS_ALERTA_VENCIMENTO: 30,
});

export const DOCUMENTOS_VERIFICACAO_PESOS = Object.freeze({
    ARQUIVO_AUSENTE: 80,
    ARQUIVO_MUITO_PEQUENO: 45,
    ARQUIVO_PEQUENO_ALERTA: 25,
    ARQUIVO_MUITO_GRANDE: 20,
    TIPO_ARQUIVO_INVALIDO: 80,
    EXTENSAO_INVALIDA: 70,
    NOME_SUSPEITO: 20,
    HASH_DUPLICADO: 75,
    NOME_TAMANHO_DUPLICADO: 45,
    DOCUMENTO_VENCIDO: 85,
    DOCUMENTO_A_VENCER: 20,
    DATA_EMISSAO_FUTURA: 55,
    DATA_VENCIMENTO_ANTES_EMISSAO: 90,
    DATA_REALIZACAO_FUTURA: 55,
    DATA_VENCIMENTO_ANTES_REALIZACAO: 90,
    SEM_DATA_EMISSAO: 20,
    SEM_DATA_REALIZACAO: 35,
    SEM_DATA_VENCIMENTO: 20,
    EMPRESA_NAO_IDENTIFICADA: 35,
    COLABORADOR_NAO_IDENTIFICADO: 70,
    TREINAMENTO_NAO_IDENTIFICADO: 60,
    DIVERGENCIA_EMPRESA: 60,
    DIVERGENCIA_TREINAMENTO: 45,
    OBSERVACAO_COM_ALERTA: 25,
});

export const DOCUMENTOS_VERIFICACAO_TIPOS_INDICIO = Object.freeze({
    ARQUIVO: "arquivo",
    DATA: "data",
    DUPLICIDADE: "duplicidade",
    CADASTRO: "cadastro",
    OBSERVACAO: "observacao",
    CONTEUDO: "conteudo",
    IA_FUTURA: "ia_futura",
});

export const DOCUMENTOS_VERIFICACAO_MENSAGENS_PADRAO = Object.freeze({
    SEM_INDICIOS: "Nenhum indício relevante encontrado nas regras locais.",
    REVISAO_MANUAL: "Revisão manual recomendada antes da aprovação definitiva.",
    ANALISE_LOCAL: "Análise inicial realizada por regras locais, sem uso de API paga.",
    NAO_AFIRMA_FALSIFICACAO: "O sistema identifica indícios e inconsistências. Não confirma falsificação automaticamente.",
});
