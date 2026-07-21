import { useEffect } from "react";
import dashboardHeroPadrao from "../../assets/dashboard-hero-sst.webp";
import {
    AlertTriangle,
    ArrowRight,
    BriefcaseBusiness,
    FileCheck2,
    LoaderCircle,
    ShieldCheck,
    X,
} from "lucide-react";

export function ModalDivergenciaFuncaoAso({
    aberto = false,
    dados = null,
    processando = false,
    onConfirmar,
    onCancelar,
}) {
    useEffect(() => {
        if (!aberto || processando) return undefined;

        const fecharComEsc = (evento) => {
            if (evento.key === "Escape") {
                onCancelar?.();
            }
        };

        window.addEventListener("keydown", fecharComEsc);

        return () => {
            window.removeEventListener("keydown", fecharComEsc);
        };
    }, [aberto, processando, onCancelar]);

    if (!aberto || !dados) return null;

    const comparacao =
        dados.comparacaoFuncaoAso ||
        dados.comparacao_funcao_aso ||
        {};

    const colaborador = dados.colaborador || {};

    const nomeColaborador =
        colaborador.nome ||
        "Colaborador selecionado";

    const funcaoCadastro =
        comparacao.funcaoCadastro ||
        colaborador.funcao ||
        "Não informada";

    const funcaoDocumento =
        comparacao.funcaoDocumento ||
        "Não localizada";

    const confianca = String(
        comparacao.confianca ||
        ""
    ).toLowerCase();

    const textoConfianca =
        confianca === "alta"
            ? "Leitura com alta confiança"
            : confianca === "media"
                ? "Leitura com confiança média"
                : "Leitura documental";

    const arquivoNome =
        dados.arquivoNome ||
        dados.certificado?.arquivoNome ||
        dados.certificado?.arquivo?.name ||
        "";

    return (
        <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
            onMouseDown={(evento) => {
                if (
                    evento.target === evento.currentTarget &&
                    !processando
                ) {
                    onCancelar?.();
                }
            }}
        >
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="aso-funcao-divergencia-titulo"
                aria-describedby="aso-funcao-divergencia-descricao"
                className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_35px_100px_rgba(15,23,42,0.38)]"
                onMouseDown={(evento) => evento.stopPropagation()}
            >
                <header className="relative overflow-hidden border-b border-slate-200 px-6 py-5 text-white"
                style={{
                    backgroundImage: `linear-gradient(90deg, rgba(6,18,37,0.96) 0%, rgba(8,18,35,0.92) 38%, rgba(9,24,39,0.74) 68%, rgba(10,29,46,0.58) 100%), url(${dashboardHeroPadrao})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}>

                    <div className="relative flex items-start gap-4">
                        <span className="hidden">
                            <AlertTriangle className="h-6 w-6" />
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                                Conferência automática do ASO
                            </p>

                            <h2
                                id="aso-funcao-divergencia-titulo"
                                className="mt-1 text-xl font-black leading-tight"
                            >
                                Função diferente da cadastrada
                            </h2>

                            <p
                                id="aso-funcao-divergencia-descricao"
                                className="mt-2 max-w-[42rem] text-sm leading-6 text-slate-100/95"
                            >
                                O ASO informa uma função diferente para {nomeColaborador}.
                                Confirme a atualização antes de salvar o documento.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={onCancelar}
                            disabled={processando}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-100 ring-1 ring-white/15 transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Cancelar conferência"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                <div className="space-y-5 px-6 py-6">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-3">
                            <BriefcaseBusiness className="h-5 w-5 shrink-0 text-slate-500" />

                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                    Colaborador
                                </p>

                                <p className="truncate text-sm font-black text-slate-900">
                                    {nomeColaborador}
                                </p>
                            </div>
                        </div>

                        {arquivoNome && (
                            <div className="mt-3 flex items-start gap-3 border-t border-slate-200 pt-3">
                                <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />

                                <p className="min-w-0 break-all text-xs font-semibold leading-5 text-slate-500">
                                    {arquivoNome}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                Função no SafeScan
                            </p>

                            <p className="mt-2 text-base font-black leading-snug text-slate-900">
                                {funcaoCadastro}
                            </p>
                        </div>

                        <div className="hidden items-center justify-center md:flex">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                                <ArrowRight className="h-5 w-5" />
                            </span>
                        </div>

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-emerald-600">
                                Função localizada no ASO
                            </p>

                            <p className="mt-2 text-base font-black leading-snug text-emerald-950">
                                {funcaoDocumento}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />

                        <div>
                            <p className="font-black">
                                O ASO será considerado a referência documental da função.
                            </p>

                            <p className="mt-1 text-blue-800">
                                Ao confirmar, o cadastro será atualizado e a matriz de documentos
                                e treinamentos será recalculada automaticamente.
                            </p>

                            <p className="mt-2 text-xs font-black uppercase tracking-wide text-blue-600">
                                {textoConfianca}
                            </p>
                        </div>
                    </div>
                </div>

                <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-5 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancelar}
                        disabled={processando}
                        className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Cancelar envio
                    </button>

                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={processando}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processando ? (
                            <>
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                                Atualizando e salvando...
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="h-4 w-4" />
                                Atualizar função e salvar ASO
                            </>
                        )}
                    </button>
                </footer>
            </section>
        </div>
    );
}
