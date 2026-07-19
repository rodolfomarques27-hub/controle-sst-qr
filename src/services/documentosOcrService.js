import { normalizarTextoVerificacao } from "../utils/documentosVerificacaoUtils";
import {
    filtrarDatasPorCategoria,
    limparTextoPossivelDocumento,
} from "./documentosOcrUtils";
import { carregarPdfJsDocumental } from "./documentosOcrPdfJsService";
import { criarAnaliseDocumental } from "./documentosOcrAnaliseService";
import { criarInfraestruturaLeituraDocumental } from "./documentosOcrArquivoService";
import { criarFluxoLeituraDocumental } from "./documentosOcrLeituraService";
import { criarFluxoLeituraDds } from "./documentosOcrDdsService";
import {
    calcularAssinaturaVisualFaixa,
    detectarAssinaturasDocumento,
    detectarAssinaturasTabelaPresenca,
    detectarLinhasHorizontaisTabelaPresenca,
    montarLinhasOcrComAssinatura,
    reconhecerTextoCanvasComOcrComOrientacao,
} from "./documentosOcrVisualService";

const {
    LIMITE_BYTES_LEITURA_LOCAL,
    LIMITE_TEXTO_PDFJS,
    LIMITE_MAIOR_LADO_OCR_IMAGEM,
    PAGINAS_MAXIMAS_PDFJS,
    PAGINAS_FINAIS_BUSCA_PDFJS,
    PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS,
    CONFIANCA_MINIMA_COMPARACAO_DATAS,
    COMPARACAO_AUTOMATICA_DATAS_OCR_ATIVA,
    arquivoPossuiArrayBuffer,
    obterNomeArquivo,
    obterMimeArquivo,
    obterExtensaoArquivo,
    decodificarBytes,
    textoParecePdfBrutoOuImagemEmbutida,
    limitarTextoParaSalvar,
    dataEhAntigaSemContextoForte,
    extrairDatasTextoDocumental,
    contextoIndicaReferenciaLegal,
    contextoIndicaCodigoOuCadastroNaoData,
    extrairVigenciaPrincipalTexto,
    extrairAssinaturaDigitalTexto,
    extrairDatasEncerramentoTexto,
    classificarDatasOcrDocumental,
    obterDatasRelevantesClassificadas,
    textoPossuiConteudoDocumentoConfiavel,
    montarCamposExtraidosDocumento,
    montarResumoTextualDocumento,
    montarPreviaTextoDocumento,
    calcularConfiancaLeitura,
} = criarAnaliseDocumental();

export { extrairDatasTextoDocumental };

const {
    extrairTextoLegivelPdf,
    lerTextoPaginaPdfJs,
    extrairTextoImagemComOcr,
    extrairTextoPrimeiraPaginaPdfComOcr,
} = criarInfraestruturaLeituraDocumental({
    LIMITE_MAIOR_LADO_OCR_IMAGEM,
    arquivoPossuiArrayBuffer,
    decodificarBytes,
    textoParecePdfBrutoOuImagemEmbutida,
    textoPossuiConteudoDocumentoConfiavel,
    extrairDatasTextoDocumental,
});

export const {
    executarLeituraDocumentalLocal,
} = criarFluxoLeituraDocumental({
    normalizarTextoVerificacao,
    filtrarDatasPorCategoria,
    limparTextoPossivelDocumento,
    carregarPdfJsDocumental,
    LIMITE_BYTES_LEITURA_LOCAL,
    LIMITE_TEXTO_PDFJS,
    PAGINAS_MAXIMAS_PDFJS,
    PAGINAS_FINAIS_BUSCA_PDFJS,
    PAGINAS_MAXIMAS_BUSCA_PROFUNDA_PDFJS,
    CONFIANCA_MINIMA_COMPARACAO_DATAS,
    COMPARACAO_AUTOMATICA_DATAS_OCR_ATIVA,
    arquivoPossuiArrayBuffer,
    obterNomeArquivo,
    obterMimeArquivo,
    obterExtensaoArquivo,
    limitarTextoParaSalvar,
    dataEhAntigaSemContextoForte,
    extrairDatasTextoDocumental,
    contextoIndicaReferenciaLegal,
    contextoIndicaCodigoOuCadastroNaoData,
    extrairVigenciaPrincipalTexto,
    extrairAssinaturaDigitalTexto,
    extrairDatasEncerramentoTexto,
    classificarDatasOcrDocumental,
    obterDatasRelevantesClassificadas,
    textoPossuiConteudoDocumentoConfiavel,
    montarCamposExtraidosDocumento,
    montarResumoTextualDocumento,
    montarPreviaTextoDocumento,
    calcularConfiancaLeitura,
    extrairTextoLegivelPdf,
    lerTextoPaginaPdfJs,
    extrairTextoImagemComOcr,
    extrairTextoPrimeiraPaginaPdfComOcr,
});

export const {
    executarLeituraDdsLocal,
} = criarFluxoLeituraDds({
    normalizarTextoVerificacao,
    limparTextoPossivelDocumento,
    carregarPdfJsDocumental,
    calcularAssinaturaVisualFaixa,
    detectarAssinaturasDocumento,
    detectarAssinaturasTabelaPresenca,
    detectarLinhasHorizontaisTabelaPresenca,
    montarLinhasOcrComAssinatura,
    reconhecerTextoCanvasComOcrComOrientacao,
    arquivoPossuiArrayBuffer,
    obterNomeArquivo,
    obterMimeArquivo,
    obterExtensaoArquivo,
    limitarTextoParaSalvar,
    extrairDatasTextoDocumental,
    montarPreviaTextoDocumento,
    executarLeituraDocumentalLocal,
});

export { avaliarLeituraDocumentalComCadastro } from "./documentosOcrCadastroService";

export { montarRetornoLeituraParaPersistencia } from "./documentosOcrPersistenciaService";
