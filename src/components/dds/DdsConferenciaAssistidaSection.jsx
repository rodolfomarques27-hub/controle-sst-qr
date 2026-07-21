import { obterChaveSugestaoFrequenciaDds } from "../../utils/ddsSugestaoFrequenciaUtils";

export default function DdsConferenciaAssistidaSection({
    BotaoAlternarCardDds,
    QUANTIDADE_LINHAS_COMPLEMENTARES_DDS,
    alternarCardDds,
    alternarSemAtividadeConferenciaAssistidaDds,
    atualizarParticipanteAdicionalConferenciaDds,
    atualizarTemaConferenciaAssistidaDds,
    cardDdsAberto,
    concluirConferenciaAssistidaDds,
    conferenciaAssistidaSalvaEmDds,
    conferenciaOficialConcluidaDds,
    definirStatusFrequenciaAssistidaDds,
    diasAtivosConferenciaAssistidaDds,
    diasConferenciaAssistidaDds,
    erroConferenciaAssistidaDds,
    erroFechamentoConferenciaDds,
    estatisticasConferenciaAssistidaDds,
    estatisticasTemasConferenciaAssistidaDds,
    fechamentoConferenciaAssistidaDds,
    limparConferenciaAssistidaDds,
    limparParticipanteAdicionalConferenciaDds,
    limparParticipanteConferenciaAssistidaDds,
    marcarSemanaCompletaAssistidaDds,
    obterStatusFrequenciaAssistidaDds,
    participantesAdicionaisAtivosConferenciaDds,
    participantesAdicionaisConferenciaDds,
    participantesConferenciaAssistidaDds,
    reabrirConferenciaAssistidaDds,
    salvandoConferenciaAssistidaDds,
    salvandoFechamentoConferenciaDds,
    salvarConferenciaAssistidaDds,
    sugestoesFrequenciaDds,
    sugestoesTemaResponsavelDds,
    usarPlanejamentoTemaConferenciaAssistidaDds,
}) {
    const resumoLeituraHibridaDds = participantesConferenciaAssistidaDds.reduce((resumo, participante) => {
        const numero = Number(participante?.numero || 0);

        diasAtivosConferenciaAssistidaDds.forEach((dia) => {
            const sugestao = sugestoesFrequenciaDds?.[obterChaveSugestaoFrequenciaDds(numero, dia)];
            const statusManual = obterStatusFrequenciaAssistidaDds(numero, dia);
            const objetiva = sugestao?.sugestao === "presente" || sugestao?.sugestao === "ausente";

            resumo.total += 1;
            if (objetiva) resumo.sugestoesObjetivas += 1;
            if (sugestao?.requerConferenciaManual || !objetiva) resumo.pendentes += 1;
            if (sugestao?.prioridade === "alta") resumo.prioridadeAlta += 1;
            if (statusManual !== "manual" && objetiva && statusManual !== sugestao.sugestao) resumo.divergencias += 1;
        });

        return resumo;
    }, {
        total: 0,
        sugestoesObjetivas: 0,
        pendentes: 0,
        prioridadeAlta: 0,
        divergencias: 0,
    });

    return (
        participantesConferenciaAssistidaDds.length > 0 && diasConferenciaAssistidaDds.length > 0 && (
        <div className="min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-cyan-500 bg-white p-4 shadow-sm lg:col-span-2">
            <div
                onClick={() => alternarCardDds("conferenciaFrequencia")}
                role="button"
                tabIndex={0}
                onKeyDown={(evento) => {
                    if (evento.key === "Enter" || evento.key === " ") {
                        alternarCardDds("conferenciaFrequencia");
                    }
                }}
                className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
            >
                <div>
                    <p className="text-cyan-700 text-[10px] font-black uppercase tracking-wide">
                        Conferência assistida de frequência DDS
                    </p>
                    <h4 className="mt-1 text-base font-black text-slate-950">
                        Apuração oficial para estatísticas
                    </h4>
                    <p className="mt-1 max-w-4xl text-xs font-semibold leading-5 text-slate-500">
                        Use P para confirmar presença, X para registrar ausência e ? para deixar o campo pendente de revisão.
                        <br />
                        Em Semana completa, o sistema preenche automaticamente todos os dias com atividade.
                    </p>
                </div>

                <div className="flex w-full flex-col gap-3 lg:max-w-[500px] lg:items-stretch" onClick={(evento) => evento.stopPropagation()}>
                    <div className="flex flex-wrap items-stretch justify-end gap-2">
                        {conferenciaAssistidaSalvaEmDds && (
                            <div className="min-w-[170px] flex-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-center shadow-sm">
                                <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">
                                    Salva em
                                </p>
                                <p className="mt-0.5 text-[11px] font-black text-emerald-900">
                                    {new Date(conferenciaAssistidaSalvaEmDds).toLocaleString("pt-BR")}
                                </p>
                            </div>
                        )}

                        {fechamentoConferenciaAssistidaDds?.status === "concluida" && (
                            <div className="min-w-[170px] flex-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-center shadow-sm">
                                <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">
                                    Concluída oficialmente em
                                </p>
                                <p className="mt-0.5 text-[11px] font-black text-emerald-950">
                                    {new Date(fechamentoConferenciaAssistidaDds.concluidoEm).toLocaleString("pt-BR")}
                                </p>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => alternarCardDds("conferenciaFrequencia")}
                            className="shrink-0 self-stretch"
                        >
                            <BotaoAlternarCardDds
                                aberto={cardDdsAberto("conferenciaFrequencia")}
                            />
                        </button>
                    </div>

                    {(erroFechamentoConferenciaDds || erroConferenciaAssistidaDds) && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-right text-[11px] font-bold text-red-700">
                            {erroFechamentoConferenciaDds || erroConferenciaAssistidaDds}
                        </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {conferenciaOficialConcluidaDds && (
                            <button
                                type="button"
                                onClick={reabrirConferenciaAssistidaDds}
                                disabled={salvandoFechamentoConferenciaDds}
                                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-center text-[11px] font-black leading-tight text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {salvandoFechamentoConferenciaDds ? "Reabrindo..." : "Reabrir conferência"}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={concluirConferenciaAssistidaDds}
                            disabled={conferenciaOficialConcluidaDds || salvandoFechamentoConferenciaDds}
                            className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-center text-[11px] font-black leading-tight text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                            title={estatisticasConferenciaAssistidaDds.manuais > 0 ? "Troque todos os ? por P ou X antes de concluir." : "Registrar fechamento oficial da Conferência Assistida."}
                        >
                            {salvandoFechamentoConferenciaDds ? "Concluindo..." : "Concluir conferência oficial"}
                        </button>

                        <button
                            type="button"
                            onClick={salvarConferenciaAssistidaDds}
                            disabled={salvandoConferenciaAssistidaDds || conferenciaOficialConcluidaDds}
                            className="w-full rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-1.5 text-center text-[11px] font-black leading-tight text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {salvandoConferenciaAssistidaDds ? "Salvando..." : "Salvar conferência"}
                        </button>

                        <button
                            type="button"
                            onClick={limparConferenciaAssistidaDds}
                            disabled={conferenciaOficialConcluidaDds}
                            className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-center text-[11px] font-black leading-tight text-cyan-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Limpar conferência
                        </button>
                    </div>

        </div>
            </div>

            {cardDdsAberto("conferenciaFrequencia") && (
                <>
                <div className="mt-5 overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-sm">
                        <div
                            onClick={() => alternarCardDds("transcricao")}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(evento) => {
                                if (evento.key === "Enter" || evento.key === " ") {
                                    alternarCardDds("transcricao");
                                }
                            }}
                            className="flex cursor-default flex-col gap-3 p-4 transition hover:bg-violet-50/50 xl:flex-row xl:items-center xl:justify-between"
                        >
                            <div className="min-w-0">
                                <p className="text-violet-700 text-[10px] font-black uppercase tracking-wide">
                                    Transcrição da folha assinada
                                </p>

                                <h5 className="mt-1 text-base font-black text-slate-950">
                                    Temas e responsáveis registrados à mão
                                </h5>

                                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                                    Confira o que foi efetivamente registrado na folha assinada.
                                </p>
                            </div>

                            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    <div className="min-w-[74px] rounded-xl bg-violet-50 px-3 py-2 text-center ring-1 ring-violet-100">
                                        <p className="text-[8px] font-black uppercase text-violet-700">
                                            Temas
                                        </p>
                                        <p className="mt-0.5 text-base font-black text-violet-950">
                                            {estatisticasTemasConferenciaAssistidaDds.temasConfirmados}
                                        </p>
                                    </div>

                                    <div className="min-w-[90px] rounded-xl bg-cyan-50 px-3 py-2 text-center ring-1 ring-cyan-100">
                                        <p className="text-[8px] font-black uppercase text-cyan-700">
                                            Responsáveis
                                        </p>
                                        <p className="mt-0.5 text-base font-black text-cyan-950">
                                            {estatisticasTemasConferenciaAssistidaDds.responsaveisIdentificados}
                                        </p>
                                    </div>

                                    <div className="min-w-[88px] rounded-xl bg-amber-50 px-3 py-2 text-center ring-1 ring-amber-100">
                                        <p className="text-[8px] font-black uppercase text-amber-700">
                                            Sem atividade
                                        </p>
                                        <p className="mt-0.5 text-base font-black text-amber-950">
                                            {estatisticasTemasConferenciaAssistidaDds.diasSemAtividade}
                                        </p>
                                    </div>

                                    <div
                                        className={`min-w-[78px] rounded-xl px-3 py-2 text-center ring-1 ${
                                            estatisticasTemasConferenciaAssistidaDds.pendencias > 0
                                                ? "bg-red-50 ring-red-100"
                                                : "bg-emerald-50 ring-emerald-100"
                                        }`}
                                    >
                                        <p
                                            className={`text-[8px] font-black uppercase ${
                                                estatisticasTemasConferenciaAssistidaDds.pendencias > 0
                                                    ? "text-red-700"
                                                    : "text-emerald-700"
                                            }`}
                                        >
                                            Pendências
                                        </p>
                                        <p
                                            className={`mt-0.5 text-base font-black ${
                                                estatisticasTemasConferenciaAssistidaDds.pendencias > 0
                                                    ? "text-red-950"
                                                    : "text-emerald-950"
                                            }`}
                                        >
                                            {estatisticasTemasConferenciaAssistidaDds.pendencias}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={(evento) => {
                                        evento.stopPropagation();
                                        alternarCardDds("transcricao");
                                    }}
                                    className="shrink-0"
                                >
                                    <BotaoAlternarCardDds
                                        aberto={cardDdsAberto("transcricao")}
                                    />
                                </button>
                            </div>
                        </div>

                        {cardDdsAberto("transcricao") && (
                            <div className="border-t border-violet-100 bg-violet-50/10 p-4">
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {diasConferenciaAssistidaDds.map((dia, indiceDia) => {
                                const semAtividade =
                                    dia.semAtividadeConfirmada;

                                const confirmado =
                                    dia.statusTranscricao === "confirmado";

                                    const statusTexto = semAtividade
                                    ? "Sem atividade"
                                    : confirmado
                                        ? "Confirmado"
                                            : "Pendente";
                                    const sugestaoOcrTema = sugestoesTemaResponsavelDds?.[indiceDia] || {};
                                    const possuiSugestaoOcrTema = Boolean(
                                        sugestaoOcrTema.temaSugerido || sugestaoOcrTema.responsavelSugerido
                                    );

                                return (
                                    <article
                                        key={`tema-confirmado-${dia.chaveAssistida}`}
                                        className={`rounded-xl border p-3 ${semAtividade
                                            ? "border-amber-200 bg-amber-50/70"
                                            : confirmado
                                                ? "border-emerald-200 bg-emerald-50/40"
                                                : "border-red-200 bg-red-50/30"}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-xs font-black text-slate-950">
                                                    {dia.nome || dia.curto}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400">
                                                    {dia.data}
                                                </p>
                                            </div>

                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wide ${semAtividade
                                                    ? "bg-amber-100 text-amber-800"
                                                    : confirmado
                                                        ? "bg-emerald-100 text-emerald-800"
                                                        : "bg-red-100 text-red-800"}`}
                                            >
                                                {statusTexto}
                                            </span>
                                        </div>

                                        <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">
                                                Tema planejado / impresso
                                            </p>
                                            <p className="mt-1 min-h-5 text-[11px] font-bold leading-4 text-slate-700">
                                                {dia.semAtividadePlanejada
                                                    ? "Não houve atividades"
                                                    : dia.temaPlanejado ||
                                                      "Não preenchido"}
                                            </p>

                                            <p className="mt-2 text-[8px] font-black uppercase tracking-wide text-slate-400">
                                                Responsável planejado
                                            </p>
                                            <p className="mt-1 min-h-4 text-[11px] font-bold text-slate-700">
                                                {dia.semAtividadePlanejada
                                                    ? "Não se aplica"
                                                    : dia.responsavelPlanejado ||
                                                      "Não preenchido"}
                                            </p>
                                        </div>

                                        {possuiSugestaoOcrTema && !semAtividade && (
                                            <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-3">
                                                <p className="text-[8px] font-black uppercase tracking-wide text-cyan-700">
                                                    Sugestão do OCR local · {Math.round(Number(sugestaoOcrTema.confianca || 0) * 100)}%
                                                </p>
                                                {sugestaoOcrTema.temaSugerido && (
                                                    <p className="mt-1 text-[10px] font-bold text-cyan-950">
                                                        Tema: {sugestaoOcrTema.temaSugerido}
                                                    </p>
                                                )}
                                                {sugestaoOcrTema.responsavelSugerido && (
                                                    <p className="mt-1 text-[10px] font-bold text-cyan-950">
                                                        Responsável: {sugestaoOcrTema.responsavelSugerido}
                                                    </p>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={conferenciaOficialConcluidaDds}
                                                    onClick={() => {
                                                        if (sugestaoOcrTema.temaSugerido) {
                                                            atualizarTemaConferenciaAssistidaDds(indiceDia, "temaConfirmado", sugestaoOcrTema.temaSugerido);
                                                        }
                                                        if (sugestaoOcrTema.responsavelSugerido) {
                                                            atualizarTemaConferenciaAssistidaDds(indiceDia, "responsavelConfirmado", sugestaoOcrTema.responsavelSugerido);
                                                        }
                                                    }}
                                                    className="mt-2 rounded-lg border border-cyan-300 bg-white px-3 py-1.5 text-[9px] font-black text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    Usar sugestão nos campos editáveis
                                                </button>
                                            </div>
                                        )}

                                        <label className="mt-3 block">
                                            <span className="text-[9px] font-black uppercase tracking-wide text-slate-500">
                                                Tema escrito à mão
                                            </span>
                                            <textarea
                                                value={dia.temaConfirmado}
                                                onChange={(evento) =>
                                                    atualizarTemaConferenciaAssistidaDds(
                                                        indiceDia,
                                                        "temaConfirmado",
                                                        evento.target.value
                                                    )
                                                }
                                                rows={2}
                                                disabled={
                                                    conferenciaOficialConcluidaDds ||
                                                    semAtividade
                                                }
                                                placeholder={
                                                    semAtividade
                                                        ? "Dia sem atividade"
                                                        : "Transcreva o tema registrado na folha"
                                                }
                                                className="mt-1 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        </label>

                                        <label className="mt-2 block">
                                            <span className="text-[9px] font-black uppercase tracking-wide text-slate-500">
                                                Responsável / aplicador
                                            </span>
                                            <input
                                                type="text"
                                                value={dia.responsavelConfirmado}
                                                onChange={(evento) =>
                                                    atualizarTemaConferenciaAssistidaDds(
                                                        indiceDia,
                                                        "responsavelConfirmado",
                                                        evento.target.value
                                                    )
                                                }
                                                disabled={
                                                    conferenciaOficialConcluidaDds ||
                                                    semAtividade
                                                }
                                                placeholder={
                                                    semAtividade
                                                        ? "Não se aplica"
                                                        : "Transcreva o responsável registrado"
                                                }
                                                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        </label>

                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    usarPlanejamentoTemaConferenciaAssistidaDds(
                                                        indiceDia
                                                    )
                                                }
                                                disabled={
                                                    conferenciaOficialConcluidaDds
                                                }
                                                className="rounded-lg border border-violet-200 bg-white px-2 py-2 text-[9px] font-black uppercase tracking-wide text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Usar planejamento
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    alternarSemAtividadeConferenciaAssistidaDds(
                                                        indiceDia
                                                    )
                                                }
                                                disabled={
                                                    conferenciaOficialConcluidaDds
                                                }
                                                className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-[9px] font-black uppercase tracking-wide text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {semAtividade
                                                    ? "Retomar atividade"
                                                    : "Não houve atividade"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes da página</p>
                            <p className="mt-1 text-base font-black text-slate-950">{estatisticasConferenciaAssistidaDds.participantes}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
                            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Presenças</p>
                            <p className="mt-1 text-base font-black text-emerald-900">{estatisticasConferenciaAssistidaDds.presencas}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
                            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">Ausências</p>
                            <p className="mt-1 text-base font-black text-red-900">{estatisticasConferenciaAssistidaDds.ausencias}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
                            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Manual/vazio</p>
                            <p className="mt-1 text-base font-black text-amber-900">{estatisticasConferenciaAssistidaDds.manuais}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
                            <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">Semana completa</p>
                            <p className="mt-1 text-base font-black text-violet-900">{estatisticasConferenciaAssistidaDds.funcionariosSemanaCompleta}</p>
                        </div>
                    </div>

                    <div className="mt-2">
                        <p className="mb-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                            Indicadores por categoria de participante
                        </p>

                        <div className="grid gap-2 lg:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                <div className="flex min-h-[76px] flex-col items-center justify-center text-center">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Colaboradores cadastrados
                                    </p>

                                    <p className="mt-1 text-2xl font-black leading-none text-slate-950">
                                        {estatisticasConferenciaAssistidaDds.participantesCadastrados}
                                    </p>

                                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600">
                                        Cadastro SafeScan
                                    </span>
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-lg bg-emerald-50 px-2 py-2">
                                        <p className="text-[8px] font-black uppercase text-emerald-700">
                                            Presenças
                                        </p>
                                        <p className="mt-0.5 text-sm font-black text-emerald-900">
                                            {estatisticasConferenciaAssistidaDds.presencasCadastrados}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-red-50 px-2 py-2">
                                        <p className="text-[8px] font-black uppercase text-red-700">
                                            Ausências
                                        </p>
                                        <p className="mt-0.5 text-sm font-black text-red-900">
                                            {estatisticasConferenciaAssistidaDds.ausenciasCadastrados}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-violet-50 px-2 py-2">
                                        <p className="text-[8px] font-black uppercase text-violet-700">
                                            Homem-dia
                                        </p>
                                        <p className="mt-0.5 text-sm font-black text-violet-900">
                                            {estatisticasConferenciaAssistidaDds.homemDiaCadastrados}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-cyan-200 bg-white p-3 shadow-sm">
                                <div className="flex min-h-[76px] flex-col items-center justify-center text-center">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                        Adicionais / visitantes
                                    </p>

                                    <p className="mt-1 text-2xl font-black leading-none text-cyan-950">
                                        {estatisticasConferenciaAssistidaDds.participantesAdicionais}
                                    </p>

                                    <span className="mt-2 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-[9px] font-black uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                                        Registro manual
                                    </span>
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-lg bg-emerald-50 px-2 py-2">
                                        <p className="text-[8px] font-black uppercase text-emerald-700">
                                            Presenças
                                        </p>
                                        <p className="mt-0.5 text-sm font-black text-emerald-900">
                                            {estatisticasConferenciaAssistidaDds.presencasAdicionais}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-red-50 px-2 py-2">
                                        <p className="text-[8px] font-black uppercase text-red-700">
                                            Ausências
                                        </p>
                                        <p className="mt-0.5 text-sm font-black text-red-900">
                                            {estatisticasConferenciaAssistidaDds.ausenciasAdicionais}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-violet-50 px-2 py-2">
                                        <p className="text-[8px] font-black uppercase text-violet-700">
                                            Homem-dia
                                        </p>
                                        <p className="mt-0.5 text-sm font-black text-violet-900">
                                            {estatisticasConferenciaAssistidaDds.homemDiaAdicionais}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-3">
                            <p className="text-[9px] font-black uppercase text-cyan-700">Sugestões do sistema</p>
                            <p className="mt-1 text-xl font-black text-cyan-950">
                                {resumoLeituraHibridaDds.sugestoesObjetivas}/{resumoLeituraHibridaDds.total}
                            </p>
                        </div>
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                            <p className="text-[9px] font-black uppercase text-amber-700">Revisão manual</p>
                            <p className="mt-1 text-xl font-black text-amber-950">{resumoLeituraHibridaDds.pendentes}</p>
                        </div>
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                            <p className="text-[9px] font-black uppercase text-red-700">Prioridade alta</p>
                            <p className="mt-1 text-xl font-black text-red-950">{resumoLeituraHibridaDds.prioridadeAlta}</p>
                        </div>
                        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
                            <p className="text-[9px] font-black uppercase text-violet-700">Manual diferente</p>
                            <p className="mt-1 text-xl font-black text-violet-950">{resumoLeituraHibridaDds.divergencias}</p>
                        </div>
                    </div>

                    <p className="mt-2 text-[10px] font-bold leading-4 text-slate-500">
                        O sistema apenas sugere. Os botões P, X e ? continuam definindo o resultado oficial após sua conferência.
                    </p>

                    <div className="mt-4 overflow-x-auto rounded-xl border border-cyan-100 bg-white">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-3 py-2">Nº</th>
                                    <th className="px-3 py-2">Funcionário</th>
                                    {diasAtivosConferenciaAssistidaDds.map((dia) => (
                                        <th key={`dia-assistido-header-${dia.chaveAssistida}`} className="px-3 py-2 text-center">
                                            <span>{dia.curto || dia.nome}</span>
                                            <span className="block text-[9px] font-bold text-slate-400">{dia.data}</span>
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {participantesConferenciaAssistidaDds.map((participante) => {
                                    const numero = Number(participante?.numero || 0);

                                    return (
                                        <tr key={`participante-assistido-${numero}`} className="align-top">
                                            <td className="px-3 py-3 font-black text-slate-900">{numero}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <p className="font-black text-slate-900">{participante.nome}</p>

                                                    {participante.origem === "adicional" && (
                                                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                                                            Adicional
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 text-[11px] font-bold uppercase text-slate-400">{participante.funcao || "-"}</p>
                                            </td>

                                            {diasAtivosConferenciaAssistidaDds.map((dia) => {
                                                const status = obterStatusFrequenciaAssistidaDds(numero, dia);
                                                const sugestaoSistema = sugestoesFrequenciaDds?.[
                                                    obterChaveSugestaoFrequenciaDds(numero, dia)
                                                ];
                                                const statusSugerido = sugestaoSistema?.sugestao;
                                                const temSugestaoObjetiva = statusSugerido === "presente" || statusSugerido === "ausente";
                                                const manualDiverge = status !== "manual" && temSugestaoObjetiva && status !== statusSugerido;
                                                const percentualConfianca = Math.round(Number(sugestaoSistema?.confianca || 0) * 100);

                                                return (
                                                    <td key={`assistido-${numero}-${dia.chaveAssistida}`} className="px-3 py-2">
                                                        <div className="flex justify-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => definirStatusFrequenciaAssistidaDds(numero, dia, "presente")}
                                                                                            disabled={conferenciaOficialConcluidaDds}
                                                                className={`h-8 w-8 rounded-lg border text-xs font-black transition ${status === "presente" ? "border-emerald-400 bg-emerald-100 text-emerald-900" : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300"}`}
                                                                title="Presente"
                                                            >
                                                                P
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => definirStatusFrequenciaAssistidaDds(numero, dia, "ausente")}
                                                                                            disabled={conferenciaOficialConcluidaDds}
                                                                className={`h-8 w-8 rounded-lg border text-xs font-black transition ${status === "ausente" ? "border-red-400 bg-red-100 text-red-900" : "border-slate-200 bg-white text-slate-400 hover:border-red-300"}`}
                                                                title="Ausente / falta"
                                                            >
                                                                X
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => definirStatusFrequenciaAssistidaDds(numero, dia, "manual")}
                                                                                            disabled={conferenciaOficialConcluidaDds}
                                                                className={`h-8 w-8 rounded-lg border text-xs font-black transition ${status === "manual" ? "border-amber-400 bg-amber-100 text-amber-900" : "border-slate-200 bg-white text-slate-400 hover:border-amber-300"}`}
                                                                title="Manual / vazio"
                                                            >
                                                                ?
                                                            </button>
                                                        </div>
                                                        <div
                                                            className={`mx-auto mt-1 w-fit max-w-[112px] rounded-md px-1.5 py-1 text-center text-[8px] font-black leading-tight ${
                                                                manualDiverge || sugestaoSistema?.prioridade === "alta"
                                                                    ? "bg-red-50 text-red-700 ring-1 ring-red-200"
                                                                    : statusSugerido === "presente"
                                                                        ? "bg-emerald-50 text-emerald-700"
                                                                        : statusSugerido === "ausente"
                                                                            ? "bg-red-50 text-red-700"
                                                                            : "bg-amber-50 text-amber-700"
                                                            }`}
                                                            title={sugestaoSistema?.motivo || "Aguardando análise do sistema."}
                                                        >
                                                            {temSugestaoObjetiva
                                                                ? `Sistema: ${statusSugerido === "presente" ? "P" : "X"}${percentualConfianca ? ` · ${percentualConfianca}%` : ""}`
                                                                : "Sistema: revisar"}
                                                            {sugestaoSistema?.origem === "semana_completa" && " · semana"}
                                                            {manualDiverge && " · divergência"}
                                                        </div>
                                                    </td>
                                                );
                                            })}

                                            <td className="px-3 py-2">
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => marcarSemanaCompletaAssistidaDds(numero)}
                                                        disabled={conferenciaOficialConcluidaDds}
                                                        className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black text-violet-800 transition hover:border-violet-300"
                                                    >
                                                        Semana completa
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => limparParticipanteConferenciaAssistidaDds(numero)}
                                                        disabled={conferenciaOficialConcluidaDds}
                                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-500 transition hover:border-slate-300"
                                                    >
                                                        Limpar linha
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <details className="mt-4 overflow-hidden rounded-xl border border-cyan-200 bg-white shadow-sm">
                        <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-3 transition hover:bg-cyan-50/60 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                    Participantes adicionais / visitantes
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Abra somente quando houver visitante ou funcionário não cadastrado.
                                </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                <span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                                    {participantesAdicionaisAtivosConferenciaDds.length}/{QUANTIDADE_LINHAS_COMPLEMENTARES_DDS} preenchidos
                                </span>

                                <span className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-cyan-800">
                                    Abrir / recolher
                                </span>
                            </div>
                        </summary>

                        <div className="border-t border-cyan-100 bg-cyan-50/20 p-4">
                            <div className="space-y-2">
                                {participantesAdicionaisConferenciaDds.map(
                                    (participante, indice) => (
                                        <div
                                            key={participante.idAdicional}
                                            className="grid gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-100 md:grid-cols-[70px_minmax(0,1.3fr)_minmax(0,.9fr)_minmax(0,.9fr)_auto] md:items-end"
                                        >
                                            <div>
                                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                    Linha
                                                </span>
                                                <div className="flex h-9 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-700 ring-1 ring-slate-200">
                                                    {participante.numero}
                                                </div>
                                            </div>

                                            <label className="block min-w-0">
                                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                    Nome
                                                </span>
                                                <input
                                                    type="text"
                                                    value={participante.nome}
                                                    onChange={(evento) =>
                                                        atualizarParticipanteAdicionalConferenciaDds(
                                                            indice,
                                                            "nome",
                                                            evento.target.value
                                                        )
                                                    }
                                                    disabled={conferenciaOficialConcluidaDds}
                                                    placeholder="Visitante ou não cadastrado"
                                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                                                />
                                            </label>

                                            <label className="block min-w-0">
                                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                    Função
                                                </span>
                                                <input
                                                    type="text"
                                                    value={participante.funcao}
                                                    onChange={(evento) =>
                                                        atualizarParticipanteAdicionalConferenciaDds(
                                                            indice,
                                                            "funcao",
                                                            evento.target.value
                                                        )
                                                    }
                                                    disabled={conferenciaOficialConcluidaDds}
                                                    placeholder="Função"
                                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                                                />
                                            </label>

                                            <label className="block min-w-0">
                                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                                    Empresa
                                                </span>
                                                <input
                                                    type="text"
                                                    value={participante.empresa}
                                                    onChange={(evento) =>
                                                        atualizarParticipanteAdicionalConferenciaDds(
                                                            indice,
                                                            "empresa",
                                                            evento.target.value
                                                        )
                                                    }
                                                    disabled={conferenciaOficialConcluidaDds}
                                                    placeholder="Empresa"
                                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    limparParticipanteAdicionalConferenciaDds(
                                                        indice
                                                    )
                                                }
                                                disabled={
                                                    conferenciaOficialConcluidaDds ||
                                                    (
                                                        !participante.nome &&
                                                        !participante.funcao &&
                                                        !participante.empresa
                                                    )
                                                }
                                                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                                            >
                                                Limpar
                                            </button>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </details>

                    <div className="mt-4 overflow-x-auto rounded-xl border border-cyan-100 bg-white">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                            <thead className="bg-cyan-50 text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                <tr>
                                    <th className="px-3 py-2">Dia</th>
                                    <th className="px-3 py-2 text-center">Presentes</th>
                                    <th className="px-3 py-2 text-center">Ausentes</th>
                                    <th className="px-3 py-2 text-center">Manual/vazio</th>
                                    <th className="px-3 py-2 text-center">Acumulado do período</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {estatisticasConferenciaAssistidaDds.dias.map((dia) => (
                                    <tr key={`resumo-assistido-${dia.chaveAssistida}`}>
                                        <td className="px-3 py-2 font-black text-slate-900">{dia.curto || dia.nome} <span className="text-slate-400">{dia.data}</span></td>
                                        <td className="px-3 py-2 text-center font-black text-emerald-800">{dia.presentes}</td>
                                        <td className="px-3 py-2 text-center font-black text-red-800">{dia.ausentes}</td>
                                        <td className="px-3 py-2 text-center font-black text-amber-800">{dia.manuais}</td>
                                        <td className="px-3 py-2 text-center font-black text-slate-900">{dia.homemDia}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <p className="mt-3 text-[11px] font-bold leading-5 text-cyan-900">
                        Esta é a base oficial para estatísticas do DDS. O OCR pode apoiar a conferência, mas a contagem final deve ser confirmada nesta tabela.
                        {conferenciaOficialConcluidaDds && (
                            <span className="mt-2 block rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                                Edição bloqueada após conclusão oficial. Use Reabrir conferência para corrigir.
                            </span>
                        )}
                    </p>
                </>
            )}
        </div>
        )
    );
}
