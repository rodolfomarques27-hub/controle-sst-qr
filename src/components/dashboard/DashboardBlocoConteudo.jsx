import React from "react";
import { DashboardCardsGrid } from "./DashboardCardsGrid";
import { DashboardAuditoriasCampo, DashboardTopDesviosCampo } from "./DashboardAuditoriasCampo";
import { DashboardPendencias } from "./DashboardPendencias";
import { DashboardDocumentosAVencer } from "./DashboardDocumentosAVencer";
import { DashboardConformidade } from "./DashboardConformidade";
import { DashboardRankingPendencias } from "./DashboardRankingPendencias";
import { DashboardColaboradoresFuncao } from "./DashboardColaboradoresFuncao";
import { DashboardAlertas } from "./DashboardAlertas";
import { DashboardDocumentosTipo, DashboardUltimosDocumentos } from "./DashboardDocumentos";

const mensagemVaziaDashboard = (texto) => (
    <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
        {texto}
    </div>
);

export function DashboardBlocoConteudo({
    chave,
    cardsVisiveis,
    storageStatusDashboard,
    storagePercentual,
    totalStorageLabel,
    storageLimiteLabelDashboard,
    classeTamanhoCartaDashboard,
    estiloCartaDashboard,
    auditoriasCampoMes,
    mediaConformidadeCampo,
    desviosCampoAbertos,
    desviosCampoCorrigidos,
    auditoriasCampoNormalizadas,
    blocosRecolhidosDashboard,
    alternarBlocoRecolhidoDashboard,
    topDesviosCampo,
    pendencias,
    documentosAVencer30Dias,
    enviarAlertaEmailPendencia,
    enviarAlertaEmailDocumentoEmpresa,
    enviarAlertasDocumentosAVencer30Dias,
    enviandoEmail,
    onSelectColab,
    onVisualizarDocumentoEmpresa,
    onVisualizarCertificado,
    resumoConformidade,
    rankingPendenciasEmpresa,
    colaboradoresPorFuncao,
    maiorQuantidadePorFuncao,
    alertasImportantes,
    documentosPorTipo,
    ultimosDocumentosEnviados,
}) {
    if (chave === "cards") {
        return (
            <DashboardCardsGrid
                cardsVisiveis={cardsVisiveis}
                storageStatusDashboard={storageStatusDashboard}
                storagePercentual={storagePercentual}
                totalStorageLabel={totalStorageLabel}
                storageLimiteLabelDashboard={storageLimiteLabelDashboard}
                classeTamanhoCartaDashboard={classeTamanhoCartaDashboard}
                estiloCartaDashboard={estiloCartaDashboard}
            />
        );
    }

    if (chave === "auditoriasCampo") {
        return (
            <DashboardAuditoriasCampo
                auditoriasCampoMes={auditoriasCampoMes}
                mediaConformidadeCampo={mediaConformidadeCampo}
                desviosCampoAbertos={desviosCampoAbertos}
                desviosCampoCorrigidos={desviosCampoCorrigidos}
                auditoriasCampoNormalizadas={auditoriasCampoNormalizadas}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            />
        );
    }

    if (chave === "topDesviosCampo") {
        return (
            <DashboardTopDesviosCampo
                topDesviosCampo={topDesviosCampo}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            />
        );
    }

    if (chave === "pendencias") {
        return (
            <DashboardPendencias
                pendencias={pendencias}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
                enviarAlertaEmailPendencia={enviarAlertaEmailPendencia}
                enviandoEmail={enviandoEmail}
                onSelectColab={onSelectColab}
            />
        );
    }

    if (chave === "documentosAVencer30Dias") {
        return (
            <DashboardDocumentosAVencer
                documentos={documentosAVencer30Dias}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
                enviarAlertaEmailPendencia={enviarAlertaEmailPendencia}
                enviarAlertaEmailDocumentoEmpresa={enviarAlertaEmailDocumentoEmpresa}
                enviarAlertasDocumentosAVencer30Dias={enviarAlertasDocumentosAVencer30Dias}
                enviandoEmail={enviandoEmail}
                onSelectColab={onSelectColab}
                onVisualizarDocumentoEmpresa={onVisualizarDocumentoEmpresa}
                onVisualizarCertificado={onVisualizarCertificado}
            />
        );
    }

    if (chave === "conformidade") {
        return (
            <DashboardConformidade
                resumoConformidade={resumoConformidade}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            />
        );
    }

    if (chave === "rankingEmpresas") {
        return (
            <DashboardRankingPendencias
                rankingPendenciasEmpresa={rankingPendenciasEmpresa}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
                mensagemVaziaDashboard={mensagemVaziaDashboard}
            />
        );
    }

    if (chave === "colaboradoresFuncao") {
        return (
            <DashboardColaboradoresFuncao
                colaboradoresPorFuncao={colaboradoresPorFuncao}
                maiorQuantidadePorFuncao={maiorQuantidadePorFuncao}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
                mensagemVaziaDashboard={mensagemVaziaDashboard}
            />
        );
    }

    if (chave === "alertas") {
        return (
            <DashboardAlertas
                alertasImportantes={alertasImportantes}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
                mensagemVaziaDashboard={mensagemVaziaDashboard}
            />
        );
    }

    if (chave === "documentosTipo") {
        return (
            <DashboardDocumentosTipo
                documentosPorTipo={documentosPorTipo}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
                mensagemVaziaDashboard={mensagemVaziaDashboard}
            />
        );
    }

    if (chave === "ultimosDocumentos") {
        return (
            <DashboardUltimosDocumentos
                ultimosDocumentosEnviados={ultimosDocumentosEnviados}
                blocosRecolhidosDashboard={blocosRecolhidosDashboard}
                alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
                mensagemVaziaDashboard={mensagemVaziaDashboard}
            />
        );
    }

    return null;
}
