import { useState } from "react";
import { AlertCircle, CalendarOff, Clock3, CloudRain, FileText, FolderOpen, Timer, UserRound, Zap } from "lucide-react";
import { obterChaveSugestaoFrequenciaDds } from "../../utils/ddsSugestaoFrequenciaUtils";

export default function DdsConferenciaAssistidaSection({
    BotaoAlternarCardDds,
    QUANTIDADE_LINHAS_COMPLEMENTARES_DDS,
    alternarCardDds,
    alternarSemAtividadeConferenciaAssistidaDds,
    alternarChuvaConferenciaAssistidaDds,
    atualizarParticipanteAdicionalConferenciaDds,
    colaboradoresCadastradosConferenciaDds,
    empresasCadastradasConferenciaDds,
    funcoesCadastradasConferenciaDds,
    selecionarParticipanteCadastradoConferenciaDds,
    atualizarTemaConferenciaAssistidaDds,
    usarSugestaoOcrTemaConferenciaAssistidaDds,
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
    marcarSemanaAusenteAssistidaDds,
    marcarSemanaFeriasAssistidaDds,
    marcarSemanaAtestadoAssistidaDds,
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
    const [indiceDiaDetalhadoDds, setIndiceDiaDetalhadoDds] = useState(0);
    const indiceDiaSelecionadoDds = Math.min(
        Math.max(0, indiceDiaDetalhadoDds),
        Math.max(0, diasConferenciaAssistidaDds.length - 1)
    );
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
        <div className="order-[40] min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-cyan-500 bg-white p-4 shadow-sm lg:col-span-2">
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
                        Use P para presença, X para falta, F para férias, A para atestado e ? para revisão manual.
                        <br />
                        Em Semana completa, o sistema preenche P em todos os dias ativos. Em Ausente semana toda, preenche X.
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
                                <div className="hidden">
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
                                <div className="overflow-x-auto pb-1">
                                    <div className="grid min-w-[1180px] grid-cols-8 gap-2">
                                        <div className="flex h-[58px] items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-center">
                                            <FolderOpen className="h-7 w-7 shrink-0 text-violet-600" />
                                            <div><p className="text-[8px] font-black uppercase text-violet-700">Temas</p><p className="text-base font-black text-slate-950">{estatisticasTemasConferenciaAssistidaDds.temasConfirmados}</p></div>
                                        </div>
                                        <div className="flex h-[58px] items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 text-center">
                                            <UserRound className="h-7 w-7 shrink-0 text-cyan-600" />
                                            <div><p className="text-[8px] font-black uppercase text-cyan-700">Responsáveis</p><p className="text-base font-black text-slate-950">{estatisticasTemasConferenciaAssistidaDds.responsaveisIdentificados}</p></div>
                                        </div>
                                        <div className="flex h-[58px] items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-3 text-center">
                                            <CalendarOff className="h-7 w-7 shrink-0 text-amber-600" />
                                            <div><p className="text-[8px] font-black uppercase text-amber-700">Sem atividade</p><p className="text-base font-black text-slate-950">{estatisticasTemasConferenciaAssistidaDds.diasSemAtividade}</p></div>
                                        </div>
                                        <div className={`flex h-[58px] items-center justify-center gap-2 rounded-xl border bg-white px-3 text-center ${estatisticasTemasConferenciaAssistidaDds.pendencias > 0 ? "border-red-200" : "border-emerald-200"}`}>
                                            <AlertCircle className={`h-7 w-7 shrink-0 ${estatisticasTemasConferenciaAssistidaDds.pendencias > 0 ? "text-red-600" : "text-emerald-600"}`} />
                                            <div><p className={`text-[8px] font-black uppercase ${estatisticasTemasConferenciaAssistidaDds.pendencias > 0 ? "text-red-700" : "text-emerald-700"}`}>Pendências</p><p className="text-base font-black text-slate-950">{estatisticasTemasConferenciaAssistidaDds.pendencias}</p></div>
                                        </div>
                                        <div className="flex h-[58px] items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 text-center">
                                            <Clock3 className="h-7 w-7 shrink-0 text-sky-600" />
                                            <div><p className="text-[8px] font-black uppercase text-sky-700">Trabalhadas</p><p className="text-base font-black text-slate-950">{Number(estatisticasTemasConferenciaAssistidaDds.horasTrabalhadas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h</p></div>
                                        </div>
                                        <div className="flex h-[58px] items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 text-center">
                                            <Timer className="h-7 w-7 shrink-0 text-emerald-600" />
                                            <div><p className="text-[8px] font-black uppercase text-emerald-700">Regulares</p><p className="text-base font-black text-slate-950">{Number(estatisticasTemasConferenciaAssistidaDds.horasRegulares || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h</p></div>
                                        </div>
                                        <div className="flex h-[58px] items-center justify-center gap-2 rounded-xl border border-orange-200 bg-white px-3 text-center">
                                            <Zap className="h-7 w-7 shrink-0 text-orange-600" />
                                            <div><p className="text-[8px] font-black uppercase text-orange-700">Horas extras</p><p className="text-base font-black text-slate-950">{Number(estatisticasTemasConferenciaAssistidaDds.horasExtras || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} h</p></div>
                                        </div>
                                        <div className="flex h-[58px] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 text-center">
                                            <CloudRain className="h-7 w-7 shrink-0 text-blue-600" />
                                            <div><p className="text-[8px] font-black uppercase text-blue-700">Dias com chuva</p><p className="text-base font-black text-slate-950">{estatisticasTemasConferenciaAssistidaDds.diasComChuva || 0}</p></div>
                                        </div>
                                    </div>
                                </div>

                <div className="mt-3 overflow-x-auto pb-1">
                    <div className="grid min-w-[840px] grid-cols-7 gap-2">
                        {diasConferenciaAssistidaDds.map((dia, indiceDia) => {
                            const selecionado = indiceDia === indiceDiaSelecionadoDds;
                            const semAtividade = dia.semAtividadeConfirmada;
                            const chuva = dia.chuvaConfirmada;
                            const confirmado = dia.statusTranscricao === "confirmado";

                            return (
                                <button
                                    key={`seletor-dia-transcricao-${dia.chaveAssistida}`}
                                    type="button"
                                    onClick={() => setIndiceDiaDetalhadoDds(indiceDia)}
                                    className={`min-h-[82px] rounded-xl border px-3 py-2 text-left transition ${
                                        selecionado
                                            ? "border-emerald-400 bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
                                            : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40"
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-black text-slate-950">{dia.data || dia.curto}</span>
                                        <span className={`h-2 w-2 shrink-0 rounded-full ${semAtividade ? "bg-amber-500" : confirmado ? "bg-emerald-500" : "bg-red-500"}`} />
                                    </div>
                                    <p className="mt-2 truncate text-[10px] font-black uppercase text-slate-700">
                                        {chuva ? "Dia com chuva" : semAtividade ? "Sem atividade" : dia.temaConfirmado || dia.temaPlanejado || "Tema pendente"}
                                    </p>
                                    <div className="mt-2 flex items-center justify-between gap-2 text-[9px] font-bold text-slate-500">
                                        <span className="truncate">{semAtividade ? "—" : dia.responsavelConfirmado || "Sem responsável"}</span>
                                        <span className="shrink-0">{Number(dia.horasTrabalhadas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} h</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-3">
                             {diasConferenciaAssistidaDds.map((dia, indiceDia) => {
                                if (indiceDia !== indiceDiaSelecionadoDds) return null;
                                const semAtividade =
                                    dia.semAtividadeConfirmada;
                                const chuva = dia.chuvaConfirmada;

                                const confirmado =
                                    dia.statusTranscricao === "confirmado";

                                    const statusTexto = chuva
                                    ? "Dia com chuva"
                                    : semAtividade
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
                                        className={`rounded-xl border p-4 ${semAtividade
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

                                        <div className="hidden">
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

                                        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(440px,1fr)]">
                                             <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-2.5">
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
                                                    onClick={() =>
                                                        usarSugestaoOcrTemaConferenciaAssistidaDds(
                                                            indiceDia,
                                                            sugestaoOcrTema
                                                        )
                                                    }
                                                    className="mt-2 rounded-lg border border-cyan-300 bg-white px-3 py-1.5 text-[9px] font-black text-cyan-800 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    Usar sugestão nos campos editáveis
                                                </button>
                                            </div>
                                        )}

                                        <label className="mt-3 block">
                                            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
                                                <FileText className="h-4 w-4 text-violet-500" /> Tema escrito à mão
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
                                                 rows={1}
                                                disabled={
                                                    conferenciaOficialConcluidaDds ||
                                                    semAtividade
                                                }
                                                placeholder={
                                                    semAtividade
                                                        ? "Dia sem atividade"
                                                        : "Transcreva o tema registrado na folha"
                                                }
                                                 className="mt-1 h-10 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-800 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                                            />
                                        </label>

                                        {!semAtividade && (
                                            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
                                                    <FolderOpen className="h-4 w-4 text-sky-500" /> Origem documental do tema
                                                </p>

                                                <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">
                                                    Confirme onde o tema registrado acima foi localizado.
                                                </p>

                                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            atualizarTemaConferenciaAssistidaDds(
                                                                indiceDia,
                                                                "origemDocumentalTemaConfirmado",
                                                                "pdf_assinado"
                                                            )
                                                        }
                                                        disabled={
                                                            conferenciaOficialConcluidaDds ||
                                                            !String(
                                                                dia.temaConfirmado || ""
                                                            ).trim()
                                                        }
                                                        className={`min-h-10 rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                            String(
                                                                dia.origemDocumentalTemaConfirmado ||
                                                                ""
                                                            ) === "pdf_assinado"
                                                                ? "border-emerald-500 bg-emerald-100 text-emerald-900"
                                                                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                                                        }`}
                                                    >
                                                        Localizado na folha assinada
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            atualizarTemaConferenciaAssistidaDds(
                                                                indiceDia,
                                                                "origemDocumentalTemaConfirmado",
                                                                "sistema_manual"
                                                            )
                                                        }
                                                        disabled={
                                                            conferenciaOficialConcluidaDds ||
                                                            !String(
                                                                dia.temaConfirmado || ""
                                                            ).trim()
                                                        }
                                                        className={`min-h-10 rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                                            String(
                                                                dia.origemDocumentalTemaConfirmado ||
                                                                ""
                                                            ) === "sistema_manual"
                                                                ? "border-amber-500 bg-amber-100 text-amber-950"
                                                                : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                                                        }`}
                                                    >
                                                        Confirmado apenas no sistema
                                                    </button>
                                                </div>

                                                {String(
                                                    dia.origemDocumentalTemaConfirmado ||
                                                    ""
                                                ) === "pdf_assinado" ? (
                                                    <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-bold leading-4 text-emerald-800">
                                                        Tema localizado e confirmado na folha física assinada.
                                                    </p>
                                                ) : String(
                                                    dia.origemDocumentalTemaConfirmado ||
                                                    ""
                                                ) === "sistema_manual" ? (
                                                    <p className="mt-2 rounded-lg border border-amber-300 bg-amber-100 px-2.5 py-2 text-[10px] font-black leading-4 text-amber-950">
                                                        tema confirmado no sistema, mas não localizado na folha assinada
                                                    </p>
                                                ) : (
                                                    <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-bold leading-4 text-red-800">
                                                        Origem documental pendente de confirmação.
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                        <label className="mt-2 block">
                                            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
                                                <UserRound className="h-4 w-4 text-cyan-500" /> Responsável / aplicador
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

                                            </div>

                                        <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-sky-700">
                                                        <Clock3 className="h-4 w-4" /> Jornada do dia
                                                    </p>
                                                    <p className="mt-0.5 text-[10px] font-bold text-sky-950">
                                                        {dia.jornadaRotulo}
                                                    </p>
                                                </div>

                                                <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wide ${
                                                    semAtividade
                                                        ? "bg-slate-100 text-slate-600"
                                                        : dia.jornadaPendente
                                                            ? "bg-red-100 text-red-700"
                                                            : dia.horasExtras > 0
                                                                ? "bg-orange-100 text-orange-800"
                                                                : "bg-emerald-100 text-emerald-800"
                                                }`}>
                                                    {semAtividade
                                                        ? "Horas zeradas"
                                                        : dia.jornadaPendente
                                                            ? "Preencher jornada"
                                                            : dia.horasExtras > 0
                                                                ? "Com hora extra"
                                                                : "Jornada regular"}
                                                </span>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2">
                                                <label>
                                                    <span className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                                                        Entrada
                                                    </span>
                                                    <input
                                                        type="time"
                                                        value={dia.horaEntrada}
                                                        onChange={(evento) =>
                                                            atualizarTemaConferenciaAssistidaDds(
                                                                indiceDia,
                                                                "horaEntrada",
                                                                evento.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            conferenciaOficialConcluidaDds ||
                                                            semAtividade
                                                        }
                                                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-black text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </label>

                                                <label>
                                                    <span className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                                                        Saída
                                                    </span>
                                                    <input
                                                        type="time"
                                                        value={dia.horaSaida}
                                                        onChange={(evento) =>
                                                            atualizarTemaConferenciaAssistidaDds(
                                                                indiceDia,
                                                                "horaSaida",
                                                                evento.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            conferenciaOficialConcluidaDds ||
                                                            semAtividade
                                                        }
                                                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-black text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </label>

                                                <label>
                                                    <span className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                                                        Início do almoço
                                                    </span>
                                                    <input
                                                        type="time"
                                                        value={dia.horaInicioAlmoco}
                                                        onChange={(evento) =>
                                                            atualizarTemaConferenciaAssistidaDds(
                                                                indiceDia,
                                                                "horaInicioAlmoco",
                                                                evento.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            conferenciaOficialConcluidaDds ||
                                                            semAtividade
                                                        }
                                                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-black text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </label>

                                                <label>
                                                    <span className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                                                        Fim do almoço
                                                    </span>
                                                    <input
                                                        type="time"
                                                        value={dia.horaFimAlmoco}
                                                        onChange={(evento) =>
                                                            atualizarTemaConferenciaAssistidaDds(
                                                                indiceDia,
                                                                "horaFimAlmoco",
                                                                evento.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            conferenciaOficialConcluidaDds ||
                                                            semAtividade
                                                        }
                                                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-black text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </label>

                                                <label>
                                                    <span className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                                                        Início do DDS
                                                    </span>
                                                    <input
                                                        type="time"
                                                        value={dia.horaInicioDds}
                                                        onChange={(evento) =>
                                                            atualizarTemaConferenciaAssistidaDds(
                                                                indiceDia,
                                                                "horaInicioDds",
                                                                evento.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            conferenciaOficialConcluidaDds ||
                                                            semAtividade
                                                        }
                                                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-black text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </label>

                                                <label>
                                                    <span className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                                                        Fim do DDS
                                                    </span>
                                                    <input
                                                        type="time"
                                                        value={dia.horaFimDds}
                                                        onChange={(evento) =>
                                                            atualizarTemaConferenciaAssistidaDds(
                                                                indiceDia,
                                                                "horaFimDds",
                                                                evento.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            conferenciaOficialConcluidaDds ||
                                                            semAtividade
                                                        }
                                                        className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-center text-xs font-black text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </label>
                                            </div>

                                            <div className="mt-3 grid grid-cols-3 divide-x divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white text-center">
                                                <div className="px-2 py-2">
                                                    <p className="text-[7px] font-black uppercase tracking-wide text-sky-600">
                                                        Trabalhadas
                                                    </p>
                                                    <p className="mt-1 text-xs font-black text-sky-950">
                                                        {Number(dia.horasTrabalhadas || 0).toLocaleString("pt-BR", {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })} h
                                                    </p>
                                                </div>

                                                <div className="px-2 py-2">
                                                    <p className="text-[7px] font-black uppercase tracking-wide text-emerald-600">
                                                        Regulares
                                                    </p>
                                                    <p className="mt-1 text-xs font-black text-emerald-950">
                                                        {Number(dia.horasRegulares || 0).toLocaleString("pt-BR", {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })} h
                                                    </p>
                                                </div>

                                                <div className="px-2 py-2">
                                                    <p className="text-[7px] font-black uppercase tracking-wide text-orange-600">
                                                        Extras
                                                    </p>
                                                    <p className="mt-1 text-xs font-black text-orange-950">
                                                        {Number(dia.horasExtras || 0).toLocaleString("pt-BR", {
                                                            minimumFractionDigits: 2,
                                                            maximumFractionDigits: 2,
                                                        })} h
                                                    </p>
                                                </div>
                                            </div>

                                            <p className="mt-2 text-center text-[8px] font-bold leading-4 text-slate-500">
                                                O intervalo de almoço é descontado. O período do DDS permanece dentro da jornada trabalhada.
                                            </p>
                                        </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-3 gap-2">
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
                                                onClick={() => alternarChuvaConferenciaAssistidaDds(indiceDia)}
                                                disabled={conferenciaOficialConcluidaDds}
                                                className={`rounded-lg border px-2 py-2 text-[9px] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-50 ${chuva ? "border-blue-400 bg-blue-100 text-blue-900" : "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100"}`}
                                            >
                                                {chuva ? "Retomar após chuva" : "Dia com chuva"}
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

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="flex min-h-[92px] flex-col items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-center ring-1 ring-cyan-100">
                            <p className="text-[9px] font-black uppercase tracking-wide text-cyan-700">
                                Sugestões do sistema
                            </p>
                            <p className="mt-2 text-xl font-black leading-none text-cyan-950">
                                {resumoLeituraHibridaDds.sugestoesObjetivas}/{resumoLeituraHibridaDds.total}
                            </p>
                        </div>

                        <div className="flex min-h-[92px] flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 p-3 text-center ring-1 ring-amber-100">
                            <p className="text-[9px] font-black uppercase tracking-wide text-amber-700">
                                Revisão manual
                            </p>
                            <p className="mt-2 text-xl font-black leading-none text-amber-950">
                                {resumoLeituraHibridaDds.pendentes}
                            </p>
                        </div>

                        <div className="flex min-h-[92px] flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 p-3 text-center ring-1 ring-red-100">
                            <p className="text-[9px] font-black uppercase tracking-wide text-red-700">
                                Prioridade alta
                            </p>
                            <p className="mt-2 text-xl font-black leading-none text-red-950">
                                {resumoLeituraHibridaDds.prioridadeAlta}
                            </p>
                        </div>

                        <div className="flex min-h-[92px] flex-col items-center justify-center rounded-xl border border-violet-200 bg-violet-50 p-3 text-center ring-1 ring-violet-100">
                            <p className="text-[9px] font-black uppercase tracking-wide text-violet-700">
                                Manual diferente
                            </p>
                            <p className="mt-2 text-xl font-black leading-none text-violet-950">
                                {resumoLeituraHibridaDds.divergencias}
                            </p>
                        </div>
                    </div>

                    <p className="mt-2 text-[10px] font-bold leading-4 text-slate-500">
                        O sistema apenas sugere. Os botões P, X e ? continuam definindo o resultado oficial após sua conferência.
                    </p>

                    <div className="mt-4 max-h-[72vh] overflow-auto rounded-xl border border-cyan-100 bg-white">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                            <thead className="sticky top-0 z-30 bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500 shadow-[0_2px_8px_rgba(15,23,42,0.12)]">
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
                                                const classeStatus = {
                                                    presente: "border-emerald-300 bg-emerald-50 text-emerald-900",
                                                    ausente: "border-red-300 bg-red-50 text-red-900",
                                                    ferias: "border-sky-300 bg-sky-50 text-sky-900",
                                                    atestado: "border-yellow-300 bg-yellow-50 text-yellow-900",
                                                    manual: "border-amber-300 bg-amber-50 text-amber-900",
                                                }[status] || "border-slate-200 bg-white text-slate-700";

                                                return (
                                                    <td key={`assistido-${numero}-${dia.chaveAssistida}`} className="px-3 py-2">
                                                        <select
                                                            value={status || "manual"}
                                                            onChange={(evento) => definirStatusFrequenciaAssistidaDds(numero, dia, evento.target.value)}
                                                            disabled={conferenciaOficialConcluidaDds}
                                                            className={`mx-auto block h-9 w-[104px] cursor-pointer rounded-lg border px-2 text-[10px] font-black outline-none transition focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-60 ${classeStatus}`}
                                                            aria-label={`Status de ${dia.rotulo || dia.chaveAssistida}`}
                                                        >
                                                            <option value="presente">P · Presente</option>
                                                            <option value="ausente">X · Ausente</option>
                                                            <option value="ferias">F · Férias</option>
                                                            <option value="atestado">A · Atestado</option>
                                                            <option value="manual">? · Revisar</option>
                                                        </select>
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
                                                <div className="grid w-[230px] grid-cols-2 gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => marcarSemanaCompletaAssistidaDds(numero)}
                                                        disabled={conferenciaOficialConcluidaDds}
                                                        className="h-8 rounded-lg border border-emerald-200 bg-emerald-50 px-2 text-[9px] font-black text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Trabalhou a semana
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => marcarSemanaAusenteAssistidaDds(numero)}
                                                        disabled={conferenciaOficialConcluidaDds}
                                                        className="h-8 rounded-lg border border-red-200 bg-red-50 px-2 text-[9px] font-black text-red-700 transition hover:border-red-400 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                    >
                                                        Faltou a semana
                                                    </button>
                                                    <select
                                                        defaultValue=""
                                                        disabled={conferenciaOficialConcluidaDds}
                                                        onChange={(evento) => {
                                                            const acao = evento.target.value;
                                                            if (acao === "ferias") marcarSemanaFeriasAssistidaDds(numero);
                                                            if (acao === "atestado") marcarSemanaAtestadoAssistidaDds(numero);
                                                            if (acao === "limpar") limparParticipanteConferenciaAssistidaDds(numero);
                                                            evento.target.value = "";
                                                        }}
                                                        className="col-span-2 h-8 cursor-pointer rounded-lg border border-violet-200 bg-violet-50 px-2 text-[10px] font-black text-violet-900 outline-none transition focus:ring-2 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                                                        aria-label={`Outras ações da semana de ${participante.nome || numero}`}
                                                    >
                                                        <option value="">Outras situações…</option>
                                                        <option value="ferias">Férias na semana</option>
                                                        <option value="atestado">Atestado na semana</option>
                                                        <option value="limpar">Limpar semana</option>
                                                    </select>
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
                                    Participantes complementares
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Selecione um trabalhador cadastrado que não constava no DDS original ou preencha um visitante manualmente.
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
                            <datalist id="dds-funcoes-cadastradas-conferencia">
                                {funcoesCadastradasConferenciaDds.map((funcao) => (
                                    <option key={funcao} value={funcao} />
                                ))}
                            </datalist>

                            <datalist id="dds-empresas-cadastradas-conferencia">
                                {empresasCadastradasConferenciaDds.map((empresa) => (
                                    <option key={empresa} value={empresa} />
                                ))}
                            </datalist>

                            <div className="space-y-2">
                                {participantesAdicionaisConferenciaDds.map(
                                    (participante, indice) => (
                                        <div
                                            key={participante.idAdicional}
                                            className="grid gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-100 md:grid-cols-[70px_minmax(0,1.15fr)_minmax(0,1.15fr)_minmax(0,.85fr)_minmax(0,.85fr)_auto] md:items-end"
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
                                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-cyan-700">
                                                    Trabalhador cadastrado
                                                </span>
                                                <select
                                                    value={participante.colaboradorCadastroChave || ""}
                                                    onChange={(evento) =>
                                                        selecionarParticipanteCadastradoConferenciaDds(
                                                            indice,
                                                            evento.target.value
                                                        )
                                                    }
                                                    disabled={conferenciaOficialConcluidaDds}
                                                    className="h-9 w-full rounded-lg border border-cyan-200 bg-white px-2 text-xs font-bold text-slate-800 outline-none focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                                                >
                                                    <option value="">
                                                        Preenchimento manual
                                                    </option>

                                                    {colaboradoresCadastradosConferenciaDds.map(
                                                        (colaborador) => (
                                                            <option
                                                                key={colaborador.chaveCadastro}
                                                                value={colaborador.chaveCadastro}
                                                            >
                                                                {colaborador.nome}
                                                                {colaborador.funcao
                                                                    ? ` · ${colaborador.funcao}`
                                                                    : ""}
                                                                {colaborador.empresa
                                                                    ? ` · ${colaborador.empresa}`
                                                                    : ""}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </label>

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
                                                    list="dds-funcoes-cadastradas-conferencia"
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
                                                    list="dds-empresas-cadastradas-conferencia"
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
