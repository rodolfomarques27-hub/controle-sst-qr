export default function DdsLeituraArquivoScannerSection({
    arquivoScannerDds,
    avisosLeituraArquivoScannerDds,
    carregandoLeituraArquivoScannerDds,
    diagnosticoEstruturalScannerDds,
    erroArquivoScannerDds,
    erroLeituraArquivoScannerDds,
    executarLeituraArquivoScannerDds,
    salvarArquivoScannerDds,
    salvandoArquivoScannerDds,
    registroScannerDds,
    mensagemDocumentoPersistidoDds,
    leituraArquivoScannerDds,
    limparArquivoScannerDds,
    linhasLeituraArquivoScannerDds,
    qualidadeLeituraArquivoScannerDds,
    resumoArquivoScannerDds,
    selecionarArquivoScannerDds,
    textoPreviaArquivoScannerDds,
}) {
    return (
        <details className="order-[10] min-h-[92px] overflow-hidden rounded-3xl border border-slate-200 border-t-4 border-t-cyan-500 bg-white p-4 shadow-sm lg:col-span-2">
                                        <summary className="flex min-h-[52px] cursor-pointer list-none flex-col gap-3 rounded-xl transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="min-w-0">
                                                <p className="text-cyan-700 text-[10px] font-black uppercase tracking-wide">
                                                    Folha assinada
                                                </p>

                                                <h3 className="mt-1 text-base font-black text-slate-950">
                                                    Upload da folha DDS assinada
                                                </h3>

                                                <p className="mt-1 truncate text-xs font-semibold leading-5 text-slate-500">
                                                    {resumoArquivoScannerDds?.nome ||
                                                        "Anexe o PDF escaneado ou a foto da folha assinada."}
                                                </p>
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2">
                                                <span
                                                    className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wide ${
                                                        leituraArquivoScannerDds
                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                            : arquivoScannerDds
                                                                ? "border-cyan-200 bg-cyan-50 text-cyan-800"
                                                                : "border-slate-200 bg-slate-50 text-slate-600"
                                                    }`}
                                                >
                                                    {leituraArquivoScannerDds
                                                        ? "Leitura concluída"
                                                        : arquivoScannerDds
                                                            ? "Arquivo anexado"
                                                            : "Aguardando arquivo"}
                                                </span>

                                                <span className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-cyan-800">
                                                    Abrir / recolher
                                                </span>
                                            </div>
                                        </summary>

                                        <div className="border-t border-cyan-100 bg-cyan-50/10 p-4">

                                        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                                            <label className="block">
                                                <span className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                                    Selecionar arquivo
                                                </span>
                                                <input
                                                    type="file"
                                                    accept=".pdf,image/png,image/jpeg,image/webp"
                                                    onChange={selecionarArquivoScannerDds}
                                                    className="mt-2 block w-full cursor-pointer rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2 text-sm font-bold text-slate-700 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-xs file:font-black file:text-white hover:bg-cyan-50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                onClick={limparArquivoScannerDds}
                                                disabled={!arquivoScannerDds && !erroArquivoScannerDds}
                                                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Limpar arquivo
                                            </button>
                                        </div>

                                        {erroArquivoScannerDds && (
                                            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                                {erroArquivoScannerDds}
                                            </p>
                                        )}

                                        {resumoArquivoScannerDds && (
                                            <>
                                                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Arquivo</p>
                                                        <p className="mt-1 truncate text-sm font-black text-slate-900" title={resumoArquivoScannerDds.nome}>
                                                            {resumoArquivoScannerDds.nome}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Tamanho</p>
                                                        <p className="mt-1 text-sm font-black text-slate-900">{resumoArquivoScannerDds.tamanho}</p>
                                                    </div>
                                                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Tipo</p>
                                                        <p className="mt-1 truncate text-sm font-black text-slate-900" title={resumoArquivoScannerDds.tipo}>
                                                            {resumoArquivoScannerDds.tipo}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <div>
                                                        <p className="text-xs font-black text-slate-900">Leitura inicial do arquivo</p>
                                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                                            Executa leitura local do PDF/imagem para identificar texto, páginas e linhas. Ainda não valida assinatura nem presença.
                                                        </p>
                                                        {carregandoLeituraArquivoScannerDds && (
                                                                    <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 ring-1 ring-cyan-100">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-cyan-100">
                                                                                <div className="absolute h-7 w-7 animate-ping rounded-full bg-cyan-200/60" />
                                                                                <div className="relative h-5 w-5 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-600" />
                                                                            </div>

                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                                                                    Análise do documento em andamento
                                                                                </p>
                                                                                <p className="mt-0.5 text-[11px] font-bold leading-4 text-slate-600">
                                                                                    Identificando texto, páginas, linhas, código DDS e dados para a pré-conferência.
                                                                                </p>
                                                                            </div>

                                                                            <div className="hidden min-w-[200px] overflow-hidden rounded-full bg-cyan-100 sm:block">
                                                                                <style>
                                                                                    {`
                                                                                        @keyframes ddsScannerProgress {
                                                                                            0% {
                                                                                                transform: translateX(-105%);
                                                                                                width: 35%;
                                                                                            }
                                                                                            45% {
                                                                                                width: 70%;
                                                                                            }
                                                                                            100% {
                                                                                                transform: translateX(285%);
                                                                                                width: 35%;
                                                                                            }
                                                                                        }
                                                                                    `}
                                                                                </style>
                                                                                <div className="relative h-2 overflow-hidden rounded-full bg-cyan-100">
                                                                                    <div
                                                                                        className="absolute left-0 top-0 h-full rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.45)]"
                                                                                        style={{ animation: "ddsScannerProgress 1.35s ease-in-out infinite" }}
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 flex-wrap gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={executarLeituraArquivoScannerDds}
                                                            disabled={!arquivoScannerDds || carregandoLeituraArquivoScannerDds || salvandoArquivoScannerDds}
                                                            className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-[11px] font-black text-cyan-800 shadow-sm transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                                                        >
                                                            {carregandoLeituraArquivoScannerDds ? "Lendo arquivo..." : leituraArquivoScannerDds ? "Analisar novamente" : "Ler arquivo"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={salvarArquivoScannerDds}
                                                            disabled={!arquivoScannerDds || !registroScannerDds?.id || salvandoArquivoScannerDds || carregandoLeituraArquivoScannerDds}
                                                            className="rounded-xl bg-emerald-600 px-4 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                                                            title={!registroScannerDds?.id ? "Selecione um DDS cadastrado antes de salvar" : ""}
                                                        >
                                                            {salvandoArquivoScannerDds ? "Salvando..." : "Salvar PDF no sistema"}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                                                    <span>Destino do arquivo</span>
                                                    <strong className={registroScannerDds?.codigo ? "text-emerald-700" : "text-amber-700"}>
                                                        {registroScannerDds?.codigo
                                                            ? `${registroScannerDds.codigo} · ${registroScannerDds.obraNome || registroScannerDds.empresaNome || "DDS cadastrado"}`
                                                            : "Selecione um DDS cadastrado acima"}
                                                    </strong>
                                                </div>
                                                {mensagemDocumentoPersistidoDds?.texto && (
                                                    <p className={`mt-2 rounded-xl border px-3 py-2 text-xs font-bold ${
                                                        mensagemDocumentoPersistidoDds.tipo === "erro"
                                                            ? "border-red-200 bg-red-50 text-red-700"
                                                            : "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                    }`}>
                                                        {mensagemDocumentoPersistidoDds.texto}
                                                    </p>
                                                )}
                                            </>
                                        )}

                                        {erroLeituraArquivoScannerDds && (
                                            <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                                {erroLeituraArquivoScannerDds}
                                            </p>
                                        )}

                                        {leituraArquivoScannerDds && (
                                            <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 ring-1 ring-indigo-50">
                                                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-indigo-700">
                                                            Diagnóstico inicial do arquivo
                                                        </p>
                                                        <h4 className="mt-1 text-base font-black text-slate-950">
                                                            Leitura executada
                                                        </h4>
                                                        <p className="mt-1 text-xs font-bold text-slate-600">
                                                            Resultado técnico de apoio. OCR visual mantido apenas como apoio; a estatística oficial vem da Conferência Assistida.
                                                        </p>
                                                    </div>
                                                    <span className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-800">
                                                        {String(leituraArquivoScannerDds.tipoLeitura || "leitura_inicial").replace(/_/g, " ")}
                                                    </span>
                                                </div>

                                                <div className="mt-4 grid gap-2 sm:grid-cols-4">
                                                    <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Páginas lidas</p>
                                                        <p className="mt-1 text-base font-black text-slate-950">
                                                            {leituraArquivoScannerDds.paginasLidas || 0}/{leituraArquivoScannerDds.totalPaginas || 0}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Linhas OCR</p>
                                                        <p className="mt-1 text-base font-black text-slate-950">{linhasLeituraArquivoScannerDds.length}</p>
                                                    </div>
                                                    <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Texto</p>
                                                        <p className="mt-1 text-base font-black text-slate-950">
                                                            {qualidadeLeituraArquivoScannerDds.textoStatus}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Confiança</p>
                                                        <p className="mt-1 text-base font-black text-slate-950">
                                                            {Number.isFinite(Number(leituraArquivoScannerDds.confianca)) ? `${Math.round(Number(leituraArquivoScannerDds.confianca))}%` : "-"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={`mt-4 rounded-xl border p-3 ${
                                                    qualidadeLeituraArquivoScannerDds.confiavel
                                                        ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                                                        : "border-amber-100 bg-amber-50 text-amber-800"
                                                }`}>
                                                    <p className="text-[10px] font-black uppercase tracking-wide">Status técnico da leitura</p>
                                                    <p className="mt-1 text-sm font-black">
                                                        {qualidadeLeituraArquivoScannerDds.statusConferencia}
                                                    </p>
                                                    {!qualidadeLeituraArquivoScannerDds.confiavel && (
                                                        <p className="mt-1 text-xs font-bold">
                                                            O arquivo foi lido, mas o texto retornado não tem qualidade suficiente para comparar presença ou assinatura automaticamente.
                                                        </p>
                                                    )}
                                                </div>

                                                {leituraArquivoScannerDds?.diagnosticoDdsOcr && (
                   <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3">
                       <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                           <div>
                               <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">OCR direcionado DDS</p>
                               <p className="mt-1 text-xs font-bold text-cyan-900">
                                   Score {leituraArquivoScannerDds.diagnosticoDdsOcr.score || 0}/100
                                   {leituraArquivoScannerDds.diagnosticoDdsOcr.pagina ? ` • página ${leituraArquivoScannerDds.diagnosticoDdsOcr.pagina}` : ""}
                                   {leituraArquivoScannerDds.diagnosticoDdsOcr.rotacao ? ` • rotação ${leituraArquivoScannerDds.diagnosticoDdsOcr.rotacao}°` : ""}
                               </p>
                           </div>
                           <span className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-black text-cyan-800">
                               {leituraArquivoScannerDds.diagnosticoDdsOcr.encontrouCodigo ? "Código DDS localizado" : "Busca por código/cabeçalho"}
                           </span>
                       </div>
                       {Array.isArray(leituraArquivoScannerDds.diagnosticoDdsOcr.indicios) && leituraArquivoScannerDds.diagnosticoDdsOcr.indicios.length > 0 && (
                           <p className="mt-2 text-xs font-bold leading-5 text-cyan-800">
                               Indícios: {leituraArquivoScannerDds.diagnosticoDdsOcr.indicios.slice(0, 6).join(", ")}
                           </p>
                       )}
                   </div>
               )}

               {textoPreviaArquivoScannerDds && (
                                                    <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Prévia do texto lido</p>
                                                        <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-700">
                                                            {textoPreviaArquivoScannerDds}
                                                        </pre>
                                                    </div>
                                                )}

                    {avisosLeituraArquivoScannerDds.length > 0 && (
            <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800">
                <summary className="cursor-pointer select-none text-[10px] font-black uppercase tracking-wide text-amber-700">
                    Detalhes técnicos da leitura
                </summary>

                <p className="mt-2 text-[11px] font-bold leading-5 text-amber-800">
                    Informações técnicas do OCR mantidas apenas para auditoria e suporte.
                </p>

                <ul className="mt-2 space-y-1">
                    {avisosLeituraArquivoScannerDds.slice(0, 6).map((aviso, indice) => (
                        <li key={`aviso-leitura-dds-${indice}`}>• {aviso}</li>
                    ))}
                </ul>
            </details>
        )}

                                                {linhasLeituraArquivoScannerDds.length > 0 && (
                                                    <div className="mt-4 overflow-hidden rounded-xl border border-indigo-100 bg-white">
                                                        <div className="max-h-56 overflow-auto">
                                                            <table className="w-full border-collapse text-left text-xs">
                                                                <thead className="sticky top-0 bg-indigo-50 text-[10px] uppercase tracking-wide text-indigo-500">
                                                                    <tr>
                                                                        <th className="px-3 py-2">Página</th>
                                                                        <th className="px-3 py-2">Linha lida</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-indigo-50">
                                                                    {linhasLeituraArquivoScannerDds.slice(0, 12).map((linha, indice) => (
                                                                        <tr key={`linha-leitura-dds-${linha?.pagina || "p"}-${linha?.indice ?? indice}`}>
                                                                            <td className="w-20 px-3 py-2 font-black text-slate-500">{linha?.pagina || "-"}</td>
                                                                            <td className="px-3 py-2 font-semibold text-slate-700">{linha?.texto || "-"}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {diagnosticoEstruturalScannerDds && (
                                            <div className="mt-4 rounded-xl border border-cyan-100 bg-white p-4 ring-1 ring-cyan-50">
                                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                                            Diagnóstico estrutural DDS
                                                        </p>
                                                        <h4 className="mt-1 text-base font-black text-slate-950">
                                                            Pré-conferência da folha assinada
                                                        </h4>
                                                        <p className="mt-1 text-xs font-bold text-slate-500">
                                                            Compara gabarito digital, arquivo anexado e leitura inicial. Ainda não valida assinatura nem presença.
                                                        </p>
                                                    </div>

                                                    <span className={`rounded-xl border px-3 py-2 text-xs font-black ${
                                                        diagnosticoEstruturalScannerDds.statusVisual === "ok"
                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                            : diagnosticoEstruturalScannerDds.statusVisual === "manual"
                                                                ? "border-amber-200 bg-amber-50 text-amber-800"
                                                                : "border-slate-200 bg-slate-50 text-slate-700"
                                                    }`}>
                                                        {diagnosticoEstruturalScannerDds.statusGeral}
                                                    </span>
                                                </div>

                                                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Código esperado</p>
                                                        <p className="mt-1 truncate text-sm font-black text-slate-900" title={diagnosticoEstruturalScannerDds.codigoEsperado}>
                                                            {diagnosticoEstruturalScannerDds.codigoEsperado || "-"}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa / obra</p>
                                                        <p className="mt-1 truncate text-sm font-black text-slate-900" title={`${diagnosticoEstruturalScannerDds.empresaEsperada || "-"} • ${diagnosticoEstruturalScannerDds.obraEsperada || "-"}`}>
                                                            {diagnosticoEstruturalScannerDds.empresaEsperada || "-"} • {diagnosticoEstruturalScannerDds.obraEsperada || "-"}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Período</p>
                                                        <p className="mt-1 truncate text-sm font-black text-slate-900" title={diagnosticoEstruturalScannerDds.periodoTexto}>
                                                            {diagnosticoEstruturalScannerDds.periodoTexto || "-"}
                                                        </p>
                                                    </div>
                                                    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes</p>
                                                        <p className="mt-1 text-sm font-black text-slate-900">
                                                            {diagnosticoEstruturalScannerDds.participantesEsperados}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid gap-2 lg:grid-cols-3">
                                                    {diagnosticoEstruturalScannerDds.itens.map((item, indice) => (
                                                        <div
                                                            key={`diagnostico-estrutural-dds-${indice}`}
                                                            className={`rounded-xl border p-3 ${
                                                                item.status === "ok"
                                                                    ? "border-emerald-100 bg-emerald-50"
                                                                    : item.status === "manual"
                                                                        ? "border-amber-100 bg-amber-50"
                                                                        : "border-slate-100 bg-slate-50"
                                                            }`}
                                                        >
                                                            <p className={`text-[10px] font-black uppercase tracking-wide ${
                                                                item.status === "ok"
                                                                    ? "text-emerald-700"
                                                                    : item.status === "manual"
                                                                        ? "text-amber-700"
                                                                        : "text-slate-400"
                                                            }`}>
                                                                {item.status === "ok" ? "OK" : item.status === "manual" ? "Conferir" : "Pendente"}
                                                            </p>
                                                            <p className="mt-1 text-sm font-black text-slate-950">{item.titulo}</p>
                                                            <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{item.detalhe}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        </div>
                                    </details>
    );
}
