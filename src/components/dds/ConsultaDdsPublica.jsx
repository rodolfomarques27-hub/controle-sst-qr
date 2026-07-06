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

                    <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                        Documento conferido por QR Code público. Assinaturas permanecem no documento físico arquivado.
                    </p>
                </div>
            </section>
        </main>
    );
}