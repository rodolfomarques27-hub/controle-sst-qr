import { DashboardBlocoRecolhivel } from "./DashboardBlocoRecolhivel";

export function DashboardDocumentosTipo({
    documentosPorTipo = [],
    blocosRecolhidosDashboard,
    alternarBlocoRecolhidoDashboard,
    mensagemVaziaDashboard,
}) {
    return (
        <DashboardBlocoRecolhivel
            chaveBloco="documentosTipo"
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            titulo="Documentos por tipo"
            subtitulo="Resumo dos documentos empresariais."
            badge={(
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {documentosPorTipo.length} tipo(s)
                </span>
            )}
        >
            <div className="space-y-2">
                {documentosPorTipo.length === 0 ? (
                    mensagemVaziaDashboard("Nenhum documento empresarial cadastrado.")
                ) : (
                    documentosPorTipo.slice(0, 8).map((item) => (
                        <div key={item.tipo} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                            <div className="flex justify-between gap-3">
                                <span className="font-semibold text-slate-900">{item.tipo}</span>
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{item.total}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                {item.emDia} em dia · {item.vencendo} a vencer · {item.vencidos} vencido(s)
                            </p>
                        </div>
                    ))
                )}
            </div>
        </DashboardBlocoRecolhivel>
    );
}

export function DashboardUltimosDocumentos({
    ultimosDocumentosEnviados = [],
    blocosRecolhidosDashboard,
    alternarBlocoRecolhidoDashboard,
    mensagemVaziaDashboard,
}) {
    return (
        <DashboardBlocoRecolhivel
            chaveBloco="ultimosDocumentos"
            blocosRecolhidosDashboard={blocosRecolhidosDashboard}
            alternarBlocoRecolhidoDashboard={alternarBlocoRecolhidoDashboard}
            titulo="Últimos documentos enviados"
            subtitulo="Certificados e documentos empresariais mais recentes."
            badge={(
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {ultimosDocumentosEnviados.length} envio(s)
                </span>
            )}
        >
            <div className="space-y-2">
                {ultimosDocumentosEnviados.length === 0 ? (
                    mensagemVaziaDashboard("Nenhum documento enviado ainda.")
                ) : (
                    ultimosDocumentosEnviados.map((item, index) => (
                        <div key={`${item.origem}-${item.nome}-${index}`} className="rounded-2xl bg-slate-50 p-3 text-sm ring-1 ring-slate-100">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-slate-900">{item.titulo}</span>
                                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200">{item.origem}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                {item.colaborador} · {item.empresa} · {item.data ? new Date(`${item.data}`.includes("T") ? item.data : `${item.data}T12:00:00`).toLocaleDateString("pt-BR") : "-"}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </DashboardBlocoRecolhivel>
    );
}
