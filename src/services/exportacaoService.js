// Serviços de exportação CSV/PDF do sistema SST.
import {
    baixarCSV,
    baixarPDF,
    escaparCSV,
    limparTextoPDF,
    quebrarTextoPDF,
} from "./exportacao/exportacaoBaseService";

export {
    baixarCSV,
    baixarPDF,
    escaparCSV,
    limparTextoPDF,
    quebrarTextoPDF,
};

export {
    baixarRelatorioAniversariantesPDF,
} from "./exportacao/relatorioAniversariantesService";

export {
    baixarRelatorioAuditoriaSistemaPDF,
} from "./exportacao/relatorioAuditoriaSistemaService";

export {
    baixarRelatorioPendenciasTreinamentosPDF,
} from "./exportacao/relatorioPendenciasTreinamentosService";

export {
    baixarRelatorioDashboardSstPDF,
} from "./exportacao/relatorioDashboardSstService";

export {
    baixarRelatorioDocumentosEmpresaPDF,
    baixarRelatorioEmpresasDocumentosPDF,
    baixarRelatorioPendenciasDocumentaisPDF,
} from "./exportacao/relatorioEmpresasDocumentosService";

export {
    baixarRelatorioColaboradoresTreinamentosPDF,
} from "./exportacao/relatorioColaboradoresTreinamentosService";
export {
    baixarRelatorioControleFichasEpiPDF,
} from "./exportacao/relatorioControleFichasEpiService";

export {
    baixarRelatorioPendenciasCadastraisPDF,
} from "./exportacao/relatorioPendenciasCadastraisService";