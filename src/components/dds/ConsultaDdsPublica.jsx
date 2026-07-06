import React from "react";
import {
    AlertTriangle,
    Building2,
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    MapPin,
    UserCheck,
} from "lucide-react";
import { StatusPill } from "../commonComponents";

const textoSeguro = (valor = "") => String(valor ?? "").trim();

function formatarDataPublica(valor = "") {
    const texto = textoSeguro(valor);

    if (!texto) return "-";

    const partes = texto.slice(0, 10).split("-");

    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return texto;
}

function formatarDataHoraPublica(valor = "") {
    const texto = textoSeguro(valor);

    if (!texto) return "-";

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) return texto;

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(data);
}


function obterIniciaisEmpresaDdsPublica(nome = "") {
    const texto = textoSeguro(nome);
    if (!texto) return "EMP";

    const partes = texto
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3);

    return partes
        .map((parte) => parte.charAt(0))
        .join("")
        .toUpperCase() || "EMP";
}

function MarcaIdealizaDdsPublica() {
    return (
        <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                <span className="text-xl font-black">I</span>
            </div>
            <div>
                <p className="text-2xl font-black leading-none text-slate-950">
                    IDEALIZA
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.28em] text-amber-700">
                    Segurança do Trabalho
                </p>
            </div>
        </div>
    );
}

function MarcaEmpresaDdsPublica({ logoUrl = "" }) {
    const logoSeguro = textoSeguro(logoUrl);

    return (
        <div className="flex min-h-[88px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
            {logoSeguro ? (
                <img
                    src={logoSeguro}
                    alt="Logo da empresa"
                    className="h-16 max-w-[260px] object-contain"
                />
            ) : null}
        </div>
    );
}
function InfoConferenciaDds({ icon: Icon, rotulo, valor }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                        {rotulo}
                    </p>
                    <p className="mt-1 break-words text-base font-black text-slate-950">
                        {valor || "-"}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function ConsultaDdsPublica({ dados = {} }) {
    const ok = Boolean(dados?.ok);
    const autenticidade = dados?.autenticidade || {};
    const mensagemAutenticidade = textoSeguro(autenticidade.mensagem || dados.mensagem);
    const statusAutenticidade = textoSeguro(autenticidade.status || (ok ? "Documento localizado" : "Documento não localizado"));
    const dadosRegistroDdsPublica = dados?.dados && typeof dados.dados === "object" ? dados.dados : {};

    const diasSemanaDdsPublica = (Array.isArray(dados?.diasSemana)
        ? dados.diasSemana
        : Array.isArray(dadosRegistroDdsPublica.diasSemana)
            ? dadosRegistroDdsPublica.diasSemana
            : [])
        .map((dia) => ({
            dia: textoSeguro(dia?.dia || dia?.nome || dia?.curto),
            data: textoSeguro(dia?.data),
            tema: textoSeguro(dia?.tema),
            responsavel: textoSeguro(dia?.responsavel),
        }))
        .filter((dia) => dia.dia || dia.data || dia.tema || dia.responsavel);

    const recadosSemanaDdsPublica = textoSeguro(dados?.recadosSemana || dadosRegistroDdsPublica.recadosSemana);

    const orientacoesDdsPublica = (Array.isArray(dados?.orientacoesImportantes)
        ? dados.orientacoesImportantes
        : Array.isArray(dadosRegistroDdsPublica.orientacoesImportantes)
            ? dadosRegistroDdsPublica.orientacoesImportantes
            : [])
        .map((orientacao) => textoSeguro(orientacao))
        .filter(Boolean);

    const aniversariantesDdsPublica = (Array.isArray(dados?.aniversariantesSemana)
        ? dados.aniversariantesSemana
        : Array.isArray(dadosRegistroDdsPublica.aniversariantesSemana)
            ? dadosRegistroDdsPublica.aniversariantesSemana
            : [])
        .map((aniversariante) => ({
            data: textoSeguro(aniversariante?.data),
            nome: textoSeguro(aniversariante?.nome),
        }))
        .filter((aniversariante) => aniversariante.data || aniversariante.nome);

    const participantesDdsPublica = (Array.isArray(dados?.participantes)
        ? dados.participantes
        : Array.isArray(dadosRegistroDdsPublica.participantes)
            ? dadosRegistroDdsPublica.participantes
            : [])
        .map((participante, indice) => ({
            numero: Number(participante?.numero || indice + 1),
            nome: textoSeguro(participante?.nome),
            funcao: textoSeguro(participante?.funcao),
            empresa: textoSeguro(participante?.empresa),
        }))
        .filter((participante) => participante.nome);

    const possuiSnapshotDdsPublica = Boolean(
        diasSemanaDdsPublica.length ||
        recadosSemanaDdsPublica ||
        orientacoesDdsPublica.length ||
        aniversariantesDdsPublica.length ||
        participantesDdsPublica.length
    );

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-950">
            <section className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-slate-50 shadow-2xl">
                <div className="border-b border-slate-200 bg-white px-6 py-6 sm:px-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <MarcaIdealizaDdsPublica />

                        <MarcaEmpresaDdsPublica
                            logoUrl={dados.empresaLogoUrl}
                        />
                    </div>
                </div>

                <div className="px-6 py-8 sm:px-8">
                    <div
                        className={[
                            "rounded-[2rem] border p-6",
                            ok
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-amber-200 bg-amber-50",
                        ].join(" ")}
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-4">
                                <div
                                    className={[
                                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl",
                                        ok ? "bg-emerald-600 text-white" : "bg-amber-500 text-white",
                                    ].join(" ")}
                                >
                                    {ok ? <CheckCircle2 className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
                                </div>
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                                        Status de autenticidade
                                    </p>
                                    <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                                        {statusAutenticidade}
                                    </h1>
                                    <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-700">
                                        {mensagemAutenticidade || "Consulta pública realizada na base SafeScan Brasil."}
                                    </p>
                                </div>
                            </div>

                            <StatusPill status={dados.status || (ok ? "Ativo" : "Inválido")} />
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2">
                        <InfoConferenciaDds
                            icon={ClipboardCheck}
                            rotulo="Código do DDS"
                            valor={dados.codigo}
                        />
                        <InfoConferenciaDds
                            icon={CalendarDays}
                            rotulo="Período"
                            valor={`${formatarDataPublica(dados.periodoInicio)} a ${formatarDataPublica(dados.periodoFim)}`}
                        />
                        <InfoConferenciaDds
                            icon={Building2}
                            rotulo="Empresa"
                            valor={dados.empresa}
                        />
                        <InfoConferenciaDds
                            icon={MapPin}
                            rotulo="Obra / Setor"
                            valor={dados.obra}
                        />
                        <InfoConferenciaDds
                            icon={UserCheck}
                            rotulo="Responsável pelo DDS"
                            valor={dados.responsavel}
                        />
                        <InfoConferenciaDds
                            icon={UserCheck}
                            rotulo="Líder / Encarregado"
                            valor={dados.liderEncarregado}
                        />
                    </div>

                    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                            Dados complementares
                        </p>
                        <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-2">
                            <div>
                                <span className="text-slate-500">Fiscal Idealiza: </span>
                                <span className="font-black text-slate-950">{dados.fiscalIdealiza || "-"}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Gerado em: </span>
                                <span className="font-black text-slate-950">{formatarDataHoraPublica(dados.geradoEm)}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Atualizado em: </span>
                                <span className="font-black text-slate-950">{formatarDataHoraPublica(dados.atualizadoEm)}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Tipo: </span>
                                <span className="font-black uppercase text-slate-950">{dados.tipo || "dds"}</span>
                            </div>
                        </div>
                    </div>


                    {possuiSnapshotDdsPublica && (
                        <div className="mt-6 space-y-4">
                            <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">
                                    Snapshot público do DDS
                                </p>
                                <p className="mt-1 text-sm font-semibold text-slate-600">
                                    Dados registrados no momento da geração do QR de conferência.
                                </p>
                            </div>

                            {diasSemanaDdsPublica.length > 0 && (
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-lg font-black text-slate-950">Temas por dia da semana</h2>
                                    <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                        {diasSemanaDdsPublica.map((dia, indice) => (
                                            <div key={`tema-publico-dds-${indice}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-xs font-black uppercase text-slate-500">{dia.dia || "-"}</span>
                                                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-800">{dia.data || "-"}</span>
                                                </div>
                                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Tema</p>
                                                <p className="mt-1 text-sm font-black text-slate-950">{dia.tema || "-"}</p>
                                                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Responsável</p>
                                                <p className="mt-1 text-sm font-bold text-slate-700">{dia.responsavel || "-"}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {(recadosSemanaDdsPublica || orientacoesDdsPublica.length || aniversariantesDdsPublica.length) && (
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <h2 className="text-base font-black text-slate-950">Recados</h2>
                                        <p className="mt-3 whitespace-pre-line text-sm font-bold leading-6 text-slate-700">
                                            {recadosSemanaDdsPublica || "-"}
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <h2 className="text-base font-black text-slate-950">Orientações importantes</h2>
                                        <div className="mt-3 space-y-2">
                                            {orientacoesDdsPublica.length > 0 ? orientacoesDdsPublica.map((orientacao, indice) => (
                                                <div key={`orientacao-publica-dds-${indice}`} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                                                    {orientacao}
                                                </div>
                                            )) : (
                                                <p className="text-sm font-bold text-slate-500">-</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <h2 className="text-base font-black text-slate-950">Aniversariantes da semana</h2>
                                        <div className="mt-3 space-y-2">
                                            {aniversariantesDdsPublica.length > 0 ? aniversariantesDdsPublica.map((aniversariante, indice) => (
                                                <div key={`aniversariante-publico-dds-${indice}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                                                    <span className="font-black text-emerald-700">{aniversariante.data || "-"}</span>
                                                    <span className="text-slate-400">—</span>
                                                    <span>{aniversariante.nome || "-"}</span>
                                                </div>
                                            )) : (
                                                <p className="text-sm font-bold text-slate-500">-</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {participantesDdsPublica.length > 0 && (
                                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-950">Participantes registrados</h2>
                                            <p className="mt-1 text-sm font-semibold text-slate-600">
                                                Lista salva em ordem alfabética no snapshot do DDS.
                                            </p>
                                        </div>
                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                                            Total: {dados.totalParticipantes || dadosRegistroDdsPublica.totalParticipantes || participantesDdsPublica.length}
                                        </span>
                                    </div>

                                    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                                        <div className="grid grid-cols-[56px_1.4fr_1fr_1fr] bg-slate-950 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-white">
                                            <span>Nº</span>
                                            <span>Nome</span>
                                            <span>Função</span>
                                            <span>Empresa</span>
                                        </div>
                                        {participantesDdsPublica.map((participante, indice) => (
                                            <div key={`participante-publico-dds-${indice}`} className="grid grid-cols-[56px_1.4fr_1fr_1fr] border-t border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                                                <span className="font-black text-slate-950">{participante.numero || indice + 1}</span>
                                                <span className="font-black text-slate-950">{participante.nome}</span>
                                                <span>{participante.funcao || "-"}</span>
                                                <span>{participante.empresa || "-"}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        Documento conferido por QR Code público. Assinaturas permanecem no documento físico arquivado.
                    </p>
                </div>
            </section>
        </main>
    );
}