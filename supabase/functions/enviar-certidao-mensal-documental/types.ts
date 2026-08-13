export type JsonRecord = Record<string, unknown>;
export type SupabaseClientAny = any;

export type UsuarioAutenticado = {
    id: string;
    email: string | null;
};

export type ConfiguracaoEnvio = {
    id: string | null;
    escopo: "GLOBAL" | "EMPRESA";
    versao: number | null;
    destinatarios: string[];
    copias: string[];
    responderPara: string;
    nomeRemetente: string;
    assuntoModelo: string;
    corpoModelo: string;
    anexarPdfs: boolean;
    estrategiaExcedente: "DIVIDIR_EM_PARTES";
    limiteMensagemBytes: number;
};

export type DocumentoSnapshot = {
    ordem: number;
    itemId: string;
    possuiVersao: boolean;
    versaoId: string;
    tipoDocumento: string;
    titulo: string;
    statusItem: string;
    numeroVersao: number;
    bucket: "certidao-mensal-documentos";
    caminhoStorage: string;
    nomeArquivo: string;
    tipoMime: "application/pdf";
    tamanhoBytes: number;
    hashSha256: string;
    totalPaginas: number | null;
};

export type ContextoEnvio = {
    competenciaId: string;
    empresaId: string;
    empresaNome: string;
    empresaCnpj: string;
    competencia: string;
    configuracao: ConfiguracaoEnvio;
    destinatarios: string[];
    copias: string[];
    documentos: DocumentoSnapshot[];
    totalPendencias: number;
    variaveis: Record<string, string>;
};

export type PartePlanejada = {
    numero: number;
    total: number;
    assunto: string;
    documentos: DocumentoSnapshot[];
    tamanhoAnexosBytes: number;
};

export type PartePersistida =
    PartePlanejada & {
        id: string;
    };

export type AssinaturaInline = {
    bytes: Uint8Array;
    contentType: "image/png" | "image/jpeg";
    filename: string;
    cid: string;
};

export type AnexoPdf = {
    filename: string;
    content: Uint8Array;
    contentType: "application/pdf";
};