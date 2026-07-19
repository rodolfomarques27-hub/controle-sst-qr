import { QRCodeSVG } from "qrcode.react";
import { ChevronDown, ChevronUp, Gift, Megaphone, CheckCircle2, ShieldCheck } from "lucide-react";

export default function criarComponentesApresentacaoDds({
    diasDds,
    participantesDds,
    participantesDdsContinuacao,
    aniversariantesDds,
    dadosDdsPadrao,
    formatarResponsavelCabecalhoDds,
    criarOrientacoesPadraoDds,
    resolverLogoEmpresaDds,
    temaDdsSemAtividade,
} = {}) {
    function DdsResumoCard({ icone: Icone, titulo, valor, texto, cor = "emerald", onClick = null, destaque = false }) {
        const estilos = {
            emerald: {
                topo: "border-t-4 border-t-emerald-500",
                borda: "border-emerald-100 hover:border-emerald-200",
                icone: "bg-emerald-50 text-emerald-700 ring-emerald-100 group-hover:bg-emerald-500 group-hover:text-white",
                titulo: "text-emerald-700",
                brilho: "bg-emerald-500/10",
            },
            sky: {
                topo: "border-t-4 border-t-sky-500",
                borda: "border-sky-100 hover:border-sky-200",
                icone: "bg-sky-50 text-sky-700 ring-sky-100 group-hover:bg-sky-500 group-hover:text-white",
                titulo: "text-sky-700",
                brilho: "bg-sky-500/10",
            },
            violet: {
                topo: "border-t-4 border-t-violet-500",
                borda: "border-violet-100 hover:border-violet-200",
                icone: "bg-violet-50 text-violet-700 ring-violet-100 group-hover:bg-violet-500 group-hover:text-white",
                titulo: "text-violet-700",
                brilho: "bg-violet-500/10",
            },
            amber: {
                topo: "border-t-4 border-t-amber-500",
                borda: "border-amber-100 hover:border-amber-200",
                icone: "bg-amber-50 text-amber-700 ring-amber-100 group-hover:bg-amber-500 group-hover:text-white",
                titulo: "text-amber-700",
                brilho: "bg-amber-500/10",
            },
        };

        const estilo = estilos[cor] || estilos.emerald;
        const CardTag = onClick ? "button" : "div";

        return (
            <CardTag
                type={onClick ? "button" : undefined}
                onClick={onClick || undefined}
                className={`group relative overflow-hidden rounded-[24px] border bg-white p-5 text-left shadow-sm ring-1 ring-slate-100/80 transition ${estilo.topo} ${estilo.borda} ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-200" : "hover:-translate-y-0.5 hover:shadow-lg"}`}
            >
                <div className={`absolute -right-10 -top-10 h-24 w-24 rounded-full ${estilo.brilho} blur-2xl transition group-hover:scale-125`} />

                <div className="relative flex h-full items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition ${estilo.icone}`}>
                            <Icone className="h-5 w-5" />
                        </span>

                        <div className="min-w-0 xl:pr-8">
                            <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${estilo.titulo}`}>
                                {titulo}
                            </p>
                            <p className="mt-1 text-2xl font-black leading-none text-slate-950">
                                {valor}
                            </p>
                            {texto && (
                                <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                                    {texto}
                                </p>
                            )}
                        </div>
                    </div>

                    {onClick && (
                        <span className={`mt-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition ${destaque ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-emerald-500 group-hover:text-white"}`}>
                            Abrir
                        </span>
                    )}
                </div>
            </CardTag>
        );
    }

    function BotaoAlternarCardDds({ aberto = true }) {
        const Icone = aberto ? ChevronUp : ChevronDown;

        return (
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-white">
                {aberto ? "Fechar" : "Abrir"}
                <Icone className="h-4 w-4" />
            </span>
        );
    }

    function MarcaLogosEmpresasDdsImpresso({ logos = [], compacto = false }) {
        const logosNormalizados = (Array.isArray(logos) ? logos : [])
            .map((item) => ({
                logoUrl: resolverLogoEmpresaDds(item?.logoUrl || item),
            }))
            .filter((item) => item.logoUrl);

        const tresOuMaisLogos = logosNormalizados.length >= 3;

        const classeContainer = compacto
            ? "flex w-full translate-x-3 items-center justify-center gap-3"
            : tresOuMaisLogos
                ? "flex w-full translate-x-5 items-center justify-center gap-4"
                : "flex w-full translate-x-5 items-center justify-center gap-7";

        const classeImagem = compacto
            ? tresOuMaisLogos
                ? "h-[52px] max-w-[82px] object-contain"
                : "h-[60px] max-w-[118px] object-contain"
            : tresOuMaisLogos
                ? "h-[82px] max-w-[92px] object-contain"
                : "h-[88px] max-w-[148px] object-contain";

        return (
            <div className={classeContainer}>
                {logosNormalizados.map((item, indice) => (
                    <img
                        key={`${item.logoUrl}-${indice}`}
                        src={item.logoUrl}
                        alt="Logo da empresa"
                        className={classeImagem}
                    />
                ))}
            </div>
        );
    }

    function MarcacaoDiaSemAtividadeDds() {
        return (
            <span className="inline-flex h-5 min-w-8 items-center justify-center text-base font-black text-slate-500">
                {"\u2014"}
            </span>
        );
    }

    function BlocoRecadosDdsImpresso({ texto = "" }) {
        const linhas = String(texto ?? "")
            .replace(/\r\n/g, "\n")
            .split("\n")
            .map((linha) => linha.trim())
            .filter(Boolean)
            .slice(0, 6);

        const linhasImpressao = Array.from({ length: 6 }, (_, indice) => linhas[indice] || "");

        return (
            <div className="mt-2 space-y-1.5 text-[10px] font-bold leading-4 text-slate-800">
                {linhasImpressao.map((linha, indice) => (
                    <div
                        key={`linha-recado-dds-${indice}`}
                        className="min-h-[14px] border-b border-slate-400 px-1 pb-0.5"
                    >
                        <span className="block break-words">
                            {linha || "\u00A0"}
                        </span>
                    </div>
                ))}
            </div>
        );
    }

    function DdsQrConferenciaImpresso({ url = "", size = 56, fallbackClassName = "h-14 w-14" }) {
        const urlSeguro = String(url || "").trim();

        if (!urlSeguro) {
            return (
                <div className={`flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[9px] font-black uppercase text-slate-400 ${fallbackClassName}`}>
                    QR
                </div>
            );
        }

        return (
            <QRCodeSVG
                value={urlSeguro}
                size={size}
                level="M"
                includeMargin
                className="rounded-lg bg-white p-1"
            />
        );
    }

    function DdsCampoObra({ rotulo = "", valor = "" }) {
        const valorSeguro = String(valor || "-").trim() || "-";

        return (
            <div className="border-b border-r border-slate-300 px-3 py-2 last:border-r-0">
                <p className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                    {rotulo}
                </p>
                <p className="mt-0.5 text-[11px] font-black uppercase leading-tight text-slate-950">
                    {valorSeguro}
                </p>
            </div>
        );
    }

    function QuadradoPresenca() {
        return (
            <div className="flex h-full min-h-[18px] w-full items-center justify-center">
                <span className="block h-[8px] w-[12px] border border-slate-300 bg-white" />
            </div>
        );
    }

    function DdsPreviewImpresso({ participantes = participantesDds, mostrarAssinaturas = true, dadosDds = dadosDdsPadrao, diasSemana = diasDds, aniversariantes = aniversariantesDds }) {
        return (
            <section className="dds-print-page overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="overflow-x-auto">
                    <div className="dds-print-sheet mx-auto min-w-[1180px] max-w-[1320px] rounded-xl border border-slate-300 bg-white p-3 text-slate-950">
                        <header className="grid grid-cols-[250px_minmax(0,1fr)_350px] items-center gap-3 border-b border-slate-300 pb-2">
                            <div className="space-y-2">
                                <MarcaLogosEmpresasDdsImpresso
                                    logos={dadosDds.logosEmpresasCabecalho}
                                />
                            </div>

                            <div className="text-center">
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-950">DDS Semanal de Obra</h2>
                                <p className="mt-0.5 text-xl font-black uppercase text-emerald-700">Diálogo Diário de Segurança</p>
                                <p className="mt-0.5 text-xs font-semibold text-slate-500">Segurança se faz todos os dias. Prevenção, atenção e cuidado.</p>
                            </div>

                            <div className="grid grid-cols-[1fr_94px] gap-3">
                                <div className="rounded-xl border border-slate-300 p-2.5">
                                    <p className="text-[9px] font-black uppercase text-slate-500">Semana</p>
                                    <p className="text-base font-black text-slate-950">{dadosDds.periodo}</p>
                                    <p className="mt-2 text-[9px] font-black uppercase text-slate-500">Código do DDS</p>
                                    <p className="rounded-lg bg-slate-950 px-2 py-0.5 text-center text-xs font-black text-white">{dadosDds.codigo}</p>
                                </div>
                                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-300 p-2 text-center">
                                    <DdsQrConferenciaImpresso url={dadosDds.qrConferenciaUrl} size={72} fallbackClassName="h-[72px] w-[72px]" />
                                    <p className="mt-0.5 text-[5.5px] font-black uppercase leading-tight text-emerald-700">QR de conferência</p>
                                </div>
                            </div>
                        </header>

                        <section className="mt-2 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-300">
                            <DdsCampoObra rotulo="Empresa" valor={dadosDds.empresa} />
                            <DdsCampoObra rotulo="Obra / Setor" valor={dadosDds.obraSetor} />
                            <DdsCampoObra rotulo="Turno" valor={dadosDds.turno} />
                            <DdsCampoObra
                                rotulo="Responsável pelo DDS"
                                valor={formatarResponsavelCabecalhoDds(dadosDds)}
                            />
                            <DdsCampoObra rotulo="Fiscal Idealiza" valor={dadosDds.fiscalIdealiza} />
                            <DdsCampoObra rotulo="Líder / Encarregado" valor={dadosDds.encarregado} />
                        </section>

                        <section className="mt-2 overflow-hidden rounded-xl border border-slate-300">
                            <div className="bg-slate-950 py-1 text-center text-[10px] font-black uppercase tracking-wide text-white">
                                Temas do DDS por dia da semana
                            </div>
                            <table className="dds-tabela-temas-semanal w-full table-fixed border-collapse text-center text-[11px]" style={{ tableLayout: "fixed", width: "100%" }}>
                                <thead>
                                    <tr className="bg-slate-900 text-white">
                                        {diasSemana.map((dia) => (
                                            <th key={dia.curto} className="w-[14.285%] border border-slate-400 px-2 py-1.5">
                                                <span className="block text-xs font-black uppercase">{dia.nome}</span>
                                                <span className="block text-[11px] font-black text-emerald-300">{dia.data}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                                            <tbody>
                                    <tr>
                                        {diasSemana.map((dia) => {
                                            const diaSemAtividade = temaDdsSemAtividade(dia);
                                            const temaDia = diaSemAtividade ? "NÃO HOUVE ATIVIDADES" : (dia.tema || "");
                                            const responsavelDia = diaSemAtividade ? "" : (dia.responsavel || "");

                                            return (
                                                <td
                                                    key={dia.curto}
                                                    className="dds-tema-celula h-24 w-[14.285%] max-w-0 border border-slate-300 align-top"
                                                >
                                                    <div className="flex h-full min-h-[104px] flex-col">
                                                        <div className="border-b border-slate-300 bg-slate-50 py-1 text-center text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                            Tema
                                                        </div>
                                                        <div className="flex min-h-[58px] flex-1 items-center justify-center border-b border-slate-200 px-2 py-1.5 text-center text-[9.5px] font-bold leading-[1.22] text-slate-950">
                                                            <span
                                                                className="block w-full max-w-full whitespace-normal break-words"
                                                                style={{
                                                                    overflowWrap: "anywhere",
                                                                    wordBreak: "break-word",
                                                                    hyphens: "auto",
                                                                }}
                                                            >
                                                                {temaDia || "\u00A0"}
                                                            </span>
                                                        </div>
                                                        <div className="flex min-h-[26px] items-center justify-center px-1.5 py-1 text-center text-[8px] font-bold leading-tight text-slate-700">
                                                            {responsavelDia ? (
                                                                <>
                                                                    <span className="mr-1 font-black uppercase tracking-[0.12em] text-slate-400">
                                                                        Resp.
                                                                    </span>
                                                                    {responsavelDia}
                                                                </>
                                                            ) : (
                                                                <span>&nbsp;</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </section>

                        <section className="mt-2 overflow-hidden rounded-xl border border-slate-300">
                            <table className="w-full border-collapse text-[9.5px]">
                                <thead>
                                    <tr className="bg-slate-950 text-white">
                                        <th className="w-10 border border-slate-400 px-1 py-1.5">Nº</th>
                                        <th className="w-[230px] border border-slate-400 px-2 py-1.5">Funcionário</th>
                                        <th className="w-[150px] border border-slate-400 px-2 py-1.5">Função</th>
                                        <th className="w-[140px] border border-slate-400 px-2 py-1.5">Empresa</th>
                                        {diasSemana.map((dia) => (
                                            <th key={dia.curto} className="w-[72px] border border-slate-400 px-1 py-1.5">
                                                <span className="block">{dia.curto}</span>
                                                <span className="block text-[9px] text-emerald-300">{dia.data.slice(0, 5)}</span>
                                            </th>
                                        ))}
                                        <th className="w-[74px] border border-slate-400 px-1 py-1.5">Semana completa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participantes.map((participante, indice) => (
                                        <tr key={participante.nome || `linha-em-branco-${participante.numero}`} className="odd:bg-white even:bg-slate-50">
                                            <td className="border border-slate-300 px-1 py-0.5 text-center font-black">{participante.numero || indice + 1}</td>
                                            <td className="border border-slate-300 px-2 py-0.5 font-semibold">{participante.nome}</td>
                                            <td className="border border-slate-300 px-2 py-0.5 text-center font-semibold">{participante.funcao}</td>
                                            <td className="border border-slate-300 px-2 py-0.5 text-center font-semibold">{participante.empresa}</td>
                                            {diasSemana.map((dia) => (
                                                <td key={dia.curto} className="border border-slate-300 px-1 py-0.5 text-center align-middle">
                                                    {dia.semAtividade ? <MarcacaoDiaSemAtividadeDds /> : null}
                                                </td>
                                            ))}
                                            <td className="border border-slate-300 px-1 py-0.5 text-center">
                                                <QuadradoPresenca />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                        <footer className="dds-folha1-footer mt-2 space-y-2">
                            <div className="dds-folha1-complementos grid gap-2 lg:grid-cols-[0.82fr_1.1fr_1fr]">
                                <div className="rounded-xl border border-emerald-600 p-2">
                                    <div className="flex items-center gap-2">
                                        <Gift className="h-4 w-4 text-emerald-700" />
                                        <p className="text-[12px] font-black uppercase text-emerald-700">Aniversariantes da semana</p>
                                    </div>

                                    <div className="mt-1.5 grid min-h-[84px] grid-rows-5 gap-0.5 text-[10px] font-bold text-slate-800">
                                        {aniversariantes.map((item) => (
                                            <div key={item.nome} className="grid min-h-[15px] grid-cols-[42px_14px_minmax(0,1fr)] items-center gap-1 border-b border-slate-300 px-1 pb-0.5 last:border-b-0">
                                                <span className="font-black text-slate-700">{item.data}</span>
                                                <span className="text-center font-black text-slate-400">—</span>
                                                <span className="truncate font-black text-slate-900">{item.nome}</span>
                                            </div>
                                        ))}

                                        {Array.from({ length: Math.max(0, 5 - aniversariantes.length) }).map((_, indice) => (
                                            <div key={`aniversariante-vazio-${indice}`} className="min-h-[15px] border-b border-slate-300 px-1 pb-0.5 last:border-b-0">
                                                &nbsp;
                                            </div>
                                        ))}
                                    </div>

                                    <p className="mt-1 border-t border-emerald-100 pt-1 text-center text-[10px] font-black leading-[13px] text-emerald-700">
                                        Parabéns aos aniversariantes da semana.<br />
                                        Segurança também é cuidar das pessoas.
                                    </p>
                                </div>

                                <div className="rounded-xl border border-emerald-600 p-2">
                                    <div className="flex items-center gap-2">
                                        <Megaphone className="h-4 w-4 text-emerald-700" />
                                        <p className="text-[12px] font-black uppercase text-emerald-700">Recados e pontos reforçados na semana</p>
                                    </div>

                                    <BlocoRecadosDdsImpresso texto={dadosDds.recadosSemana} />
                                </div>

                                <div className="rounded-xl border border-emerald-600 p-2">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-4 w-4 text-emerald-700" />
                                        <p className="text-[12px] font-black uppercase text-emerald-700">Orientações importantes</p>
                                    </div>

                                    <div className="mt-1.5 grid min-h-[108px] grid-rows-6 gap-0.5 text-[9.5px] font-bold leading-3 text-slate-800">
                                        {(Array.isArray(dadosDds.orientacoesImportantes) ? dadosDds.orientacoesImportantes : criarOrientacoesPadraoDds())
                                            .map((orientacao) => String(orientacao || "").trim())
                                            .filter(Boolean)
                                            .slice(0, 6)
                                            .map((orientacao, indice) => (
                                                <div key={`orientacao-impressa-dds-${indice}`} className="flex min-h-[15px] items-center gap-1.5 border-b border-slate-200 px-1 pb-0.5 last:border-b-0">
                                                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                                                    <span>{orientacao}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {mostrarAssinaturas && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-xl border border-slate-300 p-3 text-center">
                                        <p className="text-sm font-black uppercase text-slate-950">Responsável pelo DDS</p>
                                        <div className="mx-auto mt-10 w-[82%] border-b border-slate-800" />
                                        <p className="mt-2 text-[10px] font-bold uppercase text-slate-600">Nome / Assinatura</p>
                                        <p className="mt-5 text-[10px] font-bold text-slate-700">Data: ____/____/______</p>
                                    </div>

                                    <div className="rounded-xl border border-emerald-600 p-3 text-center">
                                        <p className="text-[12px] font-black uppercase text-emerald-700">Encarregado</p>
                                        <div className="mx-auto mt-10 w-[82%] border-b border-slate-800" />
                                        <p className="mt-2 text-[10px] font-bold uppercase text-slate-600">Nome / Assinatura</p>
                                        <p className="mt-5 text-[10px] font-bold text-slate-700">Data: ____/____/______</p>
                                    </div>
                                </div>
                            )}
                        </footer>

                        <div className="mt-2 flex items-center justify-between border-t border-slate-300 pt-1.5 text-[9px] font-black uppercase text-slate-600">
                            <span>Segurança é valor.</span>
                            <span>Prevenção é atitude.</span>
                            <span>Todos juntos, nenhum acidente.</span>
                            <span>Documento vinculado ao QR de conferência.</span>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    function DdsPreviewImpressoContinuacao({ participantes = participantesDdsContinuacao, numeroPagina = 2, totalPaginas = 2, ultimaFolha = true, dadosDds = dadosDdsPadrao, diasSemana = diasDds }) {
        const participantesFolha = Array.isArray(participantes)
            ? participantes
            : [];
        return (
            <section className="dds-print-page overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div className="overflow-x-auto">
                    <div className="dds-print-sheet mx-auto min-w-[1180px] max-w-[1320px] rounded-xl border border-slate-300 bg-white p-4 text-slate-950">
                        <header className="grid grid-cols-[240px_minmax(0,1fr)_330px] items-center gap-4 border-b border-slate-300 pb-3">
                            <div className="space-y-2">
                                <MarcaLogosEmpresasDdsImpresso
                                    logos={dadosDds.logosEmpresasCabecalho}
                                    compacto
                                />
                            </div>

                            <div className="text-center">
                                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">{`Página ${numeroPagina} de ${totalPaginas}`}</p>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-950">Continuação da Lista de Presença</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500">DDS Semanal de Obra — {dadosDds.periodo}</p>
                            </div>

                            <div className="grid grid-cols-[1fr_82px] gap-3">
                                <div className="rounded-xl border border-slate-300 p-3">
                                    <p className="text-[9px] font-black uppercase text-slate-500">Código do DDS</p>
                                    <p className="rounded-lg bg-slate-950 px-2 py-1 text-center text-sm font-black text-white">{dadosDds.codigo}</p>
                                    <p className="mt-2 text-[9px] font-black uppercase text-slate-500">Obra / Setor</p>
                                    <p className="text-xs font-black uppercase text-slate-950">{dadosDds.obraSetor}</p>
                                </div>
                                <div className="flex flex-col items-center justify-center rounded-xl border border-slate-300 p-2 text-center">
                                    <DdsQrConferenciaImpresso url={dadosDds.qrConferenciaUrl} size={64} fallbackClassName="h-16 w-16" />
                                    <p className="mt-0.5 text-[5px] font-black uppercase leading-tight text-emerald-700">QR de conferência</p>
                                </div>
                            </div>
                        </header>

                        <section className="mt-3 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-300 text-[10px]">
                            <div className="border-r border-slate-300 px-3 py-2">
                                <p className="font-black uppercase tracking-wide text-slate-500">Empresa</p>
                                <p className="mt-1 font-black uppercase text-slate-950">{dadosDds.empresa}</p>
                            </div>
                            <div className="border-r border-slate-300 px-3 py-2">
                                <p className="font-black uppercase tracking-wide text-slate-500">Responsável pelo DDS</p>
                                <p className="mt-1 font-black uppercase text-slate-950">{dadosDds.responsavel}</p>
                            </div>
                            <div className="border-r border-slate-300 px-3 py-2">
                                <p className="font-black uppercase tracking-wide text-slate-500">Encarregado</p>
                                <p className="mt-1 font-black uppercase text-slate-950">{dadosDds.encarregado}</p>
                            </div>
                            <div className="px-3 py-2">
                                <p className="font-black uppercase tracking-wide text-slate-500">Controle</p>
                                <p className="mt-1 font-black uppercase text-slate-950">Folha complementar de presença</p>
                            </div>
                        </section>

                        <section className="mt-3 overflow-hidden rounded-xl border border-slate-300">
                            <table className="w-full border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-slate-950 text-white">
                                        <th className="w-10 border border-slate-400 px-1 py-2">Nº</th>
                                        <th className="w-[250px] border border-slate-400 px-2 py-2">Funcionário</th>
                                        <th className="w-[155px] border border-slate-400 px-2 py-2">Função</th>
                                        <th className="w-[145px] border border-slate-400 px-2 py-2">Empresa</th>
                                        {diasSemana.map((dia) => (
                                            <th key={dia.curto} className="w-[76px] border border-slate-400 px-1 py-2">
                                                <span className="block">{dia.curto}</span>
                                                <span className="block text-[9px] text-emerald-300">{dia.data.slice(0, 5)}</span>
                                            </th>
                                        ))}
                                        <th className="w-[78px] border border-slate-400 px-1 py-2">Semana completa</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {participantesFolha.map((participante) => (
                                        <tr key={participante.nome || `linha-em-branco-${participante.numero}`} className="odd:bg-white even:bg-slate-50">
                                            <td className="border border-slate-300 px-1 py-1.5 text-center font-black">{participante.numero}</td>
                                            <td className="border border-slate-300 px-2 py-1.5 font-semibold">{participante.nome}</td>
                                            <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">{participante.funcao}</td>
                                            <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">{participante.empresa}</td>
                                            {diasSemana.map((dia) => (
                                                <td key={dia.curto} className="border border-slate-300 px-1 py-1.5 text-center align-middle">
                                                    {dia.semAtividade ? <MarcacaoDiaSemAtividadeDds /> : null}
                                                </td>
                                            ))}
                                            <td className="border border-slate-300 px-1 py-1.5 text-center">
                                                <QuadradoPresenca />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>

                                            {ultimaFolha ? (
                            <footer className="mt-3 grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-slate-300 p-3 text-center">
                                    <p className="text-xs font-black uppercase text-slate-950">Responsável pelo DDS</p>
                                    <div className="mx-auto mt-8 w-[82%] border-b border-slate-800" />
                                    <p className="mt-2 text-[9px] font-bold uppercase text-slate-600">Nome / Assinatura</p>
                                </div>
                                <div className="rounded-xl border border-emerald-600 p-3 text-center">
                                    <p className="text-xs font-black uppercase text-emerald-700">Encarregado</p>
                                    <div className="mx-auto mt-8 w-[82%] border-b border-slate-800" />
                                    <p className="mt-2 text-[9px] font-bold uppercase text-slate-600">Nome / Assinatura</p>
                                </div>
                            </footer>
                        ) : (
                            <footer className="mt-3 rounded-xl border border-slate-300 p-3 text-center">
                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                                    Continuação automática da lista de presença. Assinaturas finais somente na última folha.
                                </p>
                            </footer>
                        )}

                        <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-2 text-[10px] font-black uppercase text-slate-600">
                            <span>{`Folha ${numeroPagina} — continuação de presença.`}</span>
                            <span>Documento vinculado ao QR de conferência.</span>
                            <span>Preencher, assinar e arquivar junto à folha 1.</span>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    function DdsPrintStyles() {
        return (
            <style>
                {`
                    @media print {
                        @page {
                            size: A4 landscape;
                            margin: 2mm;
                        }

                        html,
                        body {
                            width: 297mm !important;
                            min-width: 297mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #ffffff !important;
                        }

                        body {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }

                        body * {
                            visibility: hidden !important;
                        }

                        .dds-no-print {
                            display: none !important;
                        }

                        .dds-print-area,
                        .dds-print-area * {
                            visibility: visible !important;
                        }

                        .dds-print-area {
                            position: absolute !important;
                            inset: 0 auto auto 0 !important;
                            width: 293mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: #ffffff !important;
                        }

                        .dds-print-page {
                            position: relative !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            width: 293mm !important;
                            height: 206mm !important;
                            margin: 0 auto !important;
                            padding: 0 !important;
                            border: 0 !important;
                            border-radius: 0 !important;
                            box-shadow: none !important;
                            background: #ffffff !important;
                            overflow: hidden !important;
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                            break-after: page !important;
                            page-break-after: always !important;
                        }



        .dds-tabela-temas-semanal {
            table-layout: fixed !important;
            width: 100% !important;
        }

        .dds-tabela-temas-semanal .dds-tema-celula,
        .dds-tabela-temas-semanal .dds-tema-celula span {
            max-width: 100% !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
            hyphens: auto !important;
        }
    /* dds-print-tema-quebra */
        .dds-print-page td,
        .dds-print-page th {
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
        }

        .dds-print-page .dds-tema-texto,
        .dds-print-page .dds-tema-celula {
            min-height: 82px !important;
            white-space: normal !important;
            overflow-wrap: anywhere !important;
            word-break: break-word !important;
            vertical-align: top !important;
        }
    /* DDS folha 1 compacta pós-rodapé */
                        .dds-print-area .dds-print-page:first-child .dds-print-sheet {
                            zoom: 0.82 !important;
                            padding: 9px !important;
                        }

                        .dds-print-area .dds-print-page:first-child .dds-print-sheet header {
                            padding-bottom: 6px !important;
                        }

                        .dds-print-area .dds-print-page:first-child .dds-print-sheet section {
                            margin-top: 6px !important;
                        }

                        .dds-print-area .dds-print-page:first-child .dds-print-sheet table {
                            line-height: 1.04 !important;
                        }

                        .dds-print-area .dds-print-page:first-child .dds-print-sheet th,
                        .dds-print-area .dds-print-page:first-child .dds-print-sheet td {
                            padding-top: 2px !important;
                            padding-bottom: 2px !important;
                        }

                        .dds-print-area .dds-print-page:first-child .dds-folha1-footer {
                            margin-top: 5px !important;
                            gap: 5px !important;
                        }

                        .dds-print-area .dds-print-page:first-child .dds-folha1-complementos {
                            gap: 6px !important;
                        }

                        .dds-print-area .dds-print-page:first-child .dds-folha1-complementos > div {
                            padding: 6px !important;
                            min-height: 0 !important;
                        }
                        .dds-print-page:last-child {
                            break-after: auto !important;
                            page-break-after: auto !important;
                        }

                        .dds-print-page > div {
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            width: auto !important;
                            height: auto !important;
                            max-width: none !important;
                            margin: 0 auto !important;
                            padding: 0 !important;
                            overflow: visible !important;
                        }

                        .dds-print-sheet {
                            position: relative !important;
                            width: 1320px !important;
                            max-width: 1320px !important;
                            min-width: 1320px !important;
                            margin: 0 auto !important;
                            padding: 9px !important;
                            border-radius: 0 !important;
                            box-shadow: none !important;
                            background: #ffffff !important;
                            transform: none !important;
                            transform-origin: center center !important;
                        }

                        .dds-print-area .dds-print-page:first-child .dds-print-sheet {
                            zoom: 0.82 !important;
                        }

                        .dds-print-area .dds-print-page:not(:first-child) .dds-print-sheet {
                            zoom: 0.82 !important;
                        }

                        .dds-print-sheet header {
                            gap: 8px !important;
                            padding-bottom: 6px !important;
                        }

                        .dds-print-sheet table {
                            line-height: 1.08 !important;
                        }

                        .dds-print-sheet th,
                        .dds-print-sheet td {
                            padding-top: 3px !important;
                            padding-bottom: 3px !important;
                        }

                        .dds-folha1-footer {
                            margin-top: 5px !important;
                        }

                        .dds-folha1-complementos {
                            display: grid !important;
                            grid-template-columns: 0.82fr 1.1fr 1fr !important;
                            gap: 7px !important;
                        }

                        .dds-folha1-complementos > div {
                            padding: 7px !important;
                            min-height: 0 !important;
                        }

                        .dds-folha1-complementos p {
                            line-height: 1.12 !important;
                        }

                        .dds-print-sheet p,
                        .dds-print-sheet span,
                        .dds-print-sheet div,
                        .dds-print-sheet th,
                        .dds-print-sheet td {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                    }
                `}
            </style>
        );
    }

    return {
        DdsResumoCard,
        BotaoAlternarCardDds,
        DdsQrConferenciaImpresso,
        DdsPreviewImpresso,
        DdsPreviewImpressoContinuacao,
        DdsPrintStyles,
    };
}
