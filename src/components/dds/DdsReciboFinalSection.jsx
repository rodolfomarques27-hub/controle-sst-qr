export default function DdsReciboFinalSection({
    BotaoAlternarCardDds,
    DdsQrConferenciaImpresso,
    abrirConsultaPublicaReciboDds,
    alternarCardDds,
    cardDdsAberto,
    codigoReciboCopiadoDds,
    copiarCodigoReciboDds,
    erroReciboFinalDds,
    imprimirReciboConferenciaDds,
    reciboConferenciaFinalDds,
    reciboConferenciaFinalRef,
    reciboFinalEmitidoEmDds,
    salvandoReciboFinalDds,
}) {
    return (
        reciboConferenciaFinalDds && (
        <div ref={reciboConferenciaFinalRef} className="order-[50] min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-emerald-500 bg-white p-4 shadow-sm lg:col-span-2">
            <div
            onClick={() => alternarCardDds("recibo")}
            role="button"
            tabIndex={0}
            onKeyDown={(evento) => {
                if (evento.key === "Enter" || evento.key === " ") {
                    evento.preventDefault();
                    alternarCardDds("recibo");
                }
            }}
            className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 xl:flex-row xl:items-center xl:justify-between"
        >
                <div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-wide">
                        Recibo da Conferência DDS
                    </p>
                    <h4 className="mt-1 text-base font-black text-slate-950">
                        Fechamento oficial registrado
                    </h4>
                    <p className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-slate-500">
                        Resumo final da Conferência Assistida, com totais oficiais salvos no registro do DDS.
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2" onClick={(evento) => evento.stopPropagation()}>
                    <button
                        type="button"
                        onClick={imprimirReciboConferenciaDds}
                        disabled={salvandoReciboFinalDds}
                        className="dds-recibo-no-print rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {salvandoReciboFinalDds ? "Registrando..." : "Imprimir recibo"}
                    </button>

                    {reciboConferenciaFinalDds.urlConferencia && (
                        <button
                            type="button"
                            onClick={abrirConsultaPublicaReciboDds}
                            className="dds-recibo-no-print rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-[11px] font-black text-cyan-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-100"
                        >
                            Abrir consulta pública
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={copiarCodigoReciboDds}
                        className="dds-recibo-no-print rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-black text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-100"
                    >
                        {codigoReciboCopiadoDds ? "Código copiado" : "Copiar código"}
                    </button>

                    <span className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-800">
                        {reciboConferenciaFinalDds.status}
                    </span>

                    <button
                        type="button"
                        onClick={() => alternarCardDds("recibo")}
                        className="dds-recibo-no-print shrink-0"
                    >
                        <BotaoAlternarCardDds
                            aberto={cardDdsAberto("recibo")}
                        />
                    </button>
                </div>
            </div>

            {cardDdsAberto("recibo") && (
                <>
            {(reciboFinalEmitidoEmDds || erroReciboFinalDds) && (
                <div className="dds-recibo-no-print mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold leading-5 text-slate-600">
                    {reciboFinalEmitidoEmDds && (
                        <p>
                            <span className="font-black uppercase tracking-wide text-emerald-700">Recibo emitido em:</span>{" "}
                            {new Date(reciboFinalEmitidoEmDds).toLocaleString("pt-BR")}
                        </p>
                    )}
                    {erroReciboFinalDds && (
                        <p className="mt-1 text-amber-700">{erroReciboFinalDds}</p>
                    )}
                </div>
            )}

            <div className="mt-3 grid items-center gap-2 lg:grid-cols-[1fr_112px]">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Código DDS</p>
                        <p className="mt-0.5 break-all text-sm font-black leading-tight text-slate-950">{reciboConferenciaFinalDds.codigo || "-"}</p>
                    </div>

                    <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa</p>
                        <p className="mt-0.5 text-sm font-black leading-tight text-slate-950">{reciboConferenciaFinalDds.empresa}</p>
                    </div>

                    <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Obra / setor</p>
                        <p className="mt-0.5 text-sm font-black leading-tight text-slate-950">{reciboConferenciaFinalDds.obra}</p>
                    </div>

                    <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Período</p>
                        <p className="mt-0.5 text-sm font-black leading-tight text-slate-950">
                            {reciboConferenciaFinalDds.periodoInicio} a {reciboConferenciaFinalDds.periodoFim}
                        </p>
                    </div>

                    <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-emerald-50 px-2 py-2 text-center ring-1 ring-emerald-100">
                        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Participantes</p>
                        <p className="mt-0.5 text-lg font-black leading-none text-emerald-900">{reciboConferenciaFinalDds.participantes}</p>
                    </div>

                    <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-emerald-50 px-2 py-2 text-center ring-1 ring-emerald-100">
                        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Presenças</p>
                        <p className="mt-0.5 text-lg font-black leading-none text-emerald-900">{reciboConferenciaFinalDds.presencas}</p>
                    </div>

                    <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-red-50 px-2 py-2 text-center ring-1 ring-red-100">
                        <p className="text-[10px] font-black uppercase tracking-wide text-red-700">Ausências</p>
                        <p className="mt-0.5 text-lg font-black leading-none text-red-900">{reciboConferenciaFinalDds.ausencias}</p>
                    </div>

                    <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-orange-50 px-2 py-2 text-center ring-1 ring-orange-100">
                        <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Acumulado do período</p>
                        <p className="mt-0.5 text-lg font-black leading-none text-orange-900">{reciboConferenciaFinalDds.homemDia}</p>
                    </div>
                </div>

                <div className="flex h-fit self-center flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center">
                    {reciboConferenciaFinalDds.urlConferencia ? (
                        <DdsQrConferenciaImpresso
                            url={reciboConferenciaFinalDds.urlConferencia}
                            size={76}
                            fallbackClassName="h-[76px] w-[76px]"
                        />
                    ) : (
                        <div className="flex h-[76px] w-[76px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-[10px] font-black uppercase text-slate-400">
                            Sem QR
                        </div>
                    )}

                    <p className="mt-2 text-[9px] font-black uppercase tracking-wide text-slate-400">Conclusão oficial</p>
                    <p className="mt-0.5 text-[11px] font-black leading-tight text-slate-950">
                        {reciboConferenciaFinalDds.concluidoEm
                            ? new Date(reciboConferenciaFinalDds.concluidoEm).toLocaleString("pt-BR")
                            : "-"}
                    </p>
                </div>
            </div>

            <div className="mt-3">
                <p className="mb-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                    Composição dos participantes
                </p>

                <div className="grid gap-2 lg:grid-cols-2">
                    <div className="h-full rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                        <div className="flex min-h-[94px] flex-col items-center justify-center text-center">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                Colaboradores cadastrados
                            </p>

                            <p className="mt-1 text-2xl font-black leading-none text-slate-950">
                                {reciboConferenciaFinalDds.participantesCadastrados}
                            </p>

                            <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                                Cadastro SafeScan
                            </span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-emerald-50 px-2 py-2">
                                <p className="text-[8px] font-black uppercase text-emerald-700">
                                    Presenças
                                </p>
                                <p className="mt-0.5 text-sm font-black text-emerald-900">
                                    {reciboConferenciaFinalDds.presencasCadastrados}
                                </p>
                            </div>

                            <div className="rounded-lg bg-red-50 px-2 py-2">
                                <p className="text-[8px] font-black uppercase text-red-700">
                                    Ausências
                                </p>
                                <p className="mt-0.5 text-sm font-black text-red-900">
                                    {reciboConferenciaFinalDds.ausenciasCadastrados}
                                </p>
                            </div>

                            <div className="rounded-lg bg-orange-50 px-2 py-2">
                                <p className="text-[8px] font-black uppercase text-orange-700">
                                    Homem-dia
                                </p>
                                <p className="mt-0.5 text-sm font-black text-orange-900">
                                    {reciboConferenciaFinalDds.homemDiaCadastrados}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="h-full rounded-xl border border-cyan-200 bg-cyan-50/40 p-3">
                        <div className="flex min-h-[94px] flex-col items-center justify-center text-center">
                            <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                Adicionais / visitantes
                            </p>

                            <p className="mt-1 text-2xl font-black leading-none text-cyan-950">
                                {reciboConferenciaFinalDds.participantesAdicionais}
                            </p>

                            <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                                Registro manual
                            </span>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-lg bg-emerald-50 px-2 py-2">
                                <p className="text-[8px] font-black uppercase text-emerald-700">
                                    Presenças
                                </p>
                                <p className="mt-0.5 text-sm font-black text-emerald-900">
                                    {reciboConferenciaFinalDds.presencasAdicionais}
                                </p>
                            </div>

                            <div className="rounded-lg bg-red-50 px-2 py-2">
                                <p className="text-[8px] font-black uppercase text-red-700">
                                    Ausências
                                </p>
                                <p className="mt-0.5 text-sm font-black text-red-900">
                                    {reciboConferenciaFinalDds.ausenciasAdicionais}
                                </p>
                            </div>

                            <div className="rounded-lg bg-orange-50 px-2 py-2">
                                <p className="text-[8px] font-black uppercase text-orange-700">
                                    Homem-dia
                                </p>
                                <p className="mt-0.5 text-sm font-black text-orange-900">
                                    {reciboConferenciaFinalDds.homemDiaAdicionais}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl bg-white px-2 py-2 text-center ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Dias ativos</p>
                    <p className="mt-0.5 text-lg font-black leading-none text-slate-950">{reciboConferenciaFinalDds.diasAtivos}</p>
                </div>

                <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl bg-white px-2 py-2 text-center ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Semana completa</p>
                    <p className="mt-0.5 text-lg font-black leading-none text-slate-950">{reciboConferenciaFinalDds.funcionariosSemanaCompleta}</p>
                </div>

                <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl bg-white px-2 py-2 text-center ring-1 ring-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Manual/vazio</p>
                    <p className="mt-0.5 text-lg font-black leading-none text-slate-950">{reciboConferenciaFinalDds.manuais}</p>
                </div>
            </div>

            <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold leading-5 text-slate-600">
                Este recibo resume a apuração oficial da Conferência Assistida DDS. O QR/código serve para conferência do registro digital vinculado.
            </p>
                </>
            )}
        </div>
        )
    );
}
