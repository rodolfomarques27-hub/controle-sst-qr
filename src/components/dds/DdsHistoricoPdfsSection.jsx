import { useCallback, useEffect, useMemo, useState } from "react";
import {
    criarUrlTemporariaDocumentoDds,
    excluirDocumentoDdsHistorico,
    listarDocumentosDdsPorRegistros,
} from "../../services/ddsDocumentosService";
import { listarRegistrosDds } from "../../services/ddsRegistrosService";
import { Archive, Trash2 } from "lucide-react";

const texto = (valor) => String(valor ?? "").trim();

function obterMesAtual() {
    const agora = new Date();
    return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

function formatarData(valor) {
    if (!valor) return "—";
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
        ? "—"
        : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function formatarPeriodo(registro) {
    const formatar = (valor) => {
        const [ano, mes, dia] = texto(valor).slice(0, 10).split("-");
        return ano && mes && dia ? `${dia}/${mes}/${ano}` : "—";
    };
    return `${formatar(registro?.periodoInicio)} a ${formatar(registro?.periodoFim)}`;
}

function formatarTamanho(bytes) {
    const numero = Number(bytes || 0);
    if (!numero) return "—";
    return numero >= 1024 * 1024
        ? `${(numero / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.max(1, Math.round(numero / 1024))} KB`;
}

export default function DdsHistoricoPdfsSection({ supabase, aberto = true, onAlternar }) {
    const [registros, setRegistros] = useState([]);
    const [documentos, setDocumentos] = useState([]);
    const [empresa, setEmpresa] = useState("");
    const [obra, setObra] = useState("");
    const [mes, setMes] = useState(obterMesAtual);
    const [busca, setBusca] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [excluindoId, setExcluindoId] = useState("");
    const [mensagem, setMensagem] = useState(null);

    const carregar = useCallback(async () => {
        if (!supabase) return;
        setCarregando(true);
        setMensagem(null);
        try {
            const registrosCarregados = await listarRegistrosDds({ supabase, limite: 500 });
            const documentosCarregados = await listarDocumentosDdsPorRegistros({
                supabase,
                registroIds: registrosCarregados.map((registro) => registro.id),
            });
            setRegistros(registrosCarregados);
            setDocumentos(documentosCarregados);
        } catch (error) {
            setMensagem({ tipo: "erro", texto: error?.message || "Não foi possível carregar o histórico." });
        } finally {
            setCarregando(false);
        }
    }, [supabase]);

    useEffect(() => {
        carregar();
        window.addEventListener("safescan:dds-pdf-salvo", carregar);
        return () => window.removeEventListener("safescan:dds-pdf-salvo", carregar);
    }, [carregar]);

    const registrosPorId = useMemo(
        () => new Map(registros.map((registro) => [texto(registro.id), registro])),
        [registros]
    );

    const empresas = useMemo(
        () => Array.from(new Set(registros.map((item) => texto(item.empresaNome)).filter(Boolean))).sort(),
        [registros]
    );

    const obras = useMemo(
        () => Array.from(new Set(registros
            .filter((item) => !empresa || texto(item.empresaNome) === empresa)
            .map((item) => texto(item.obraNome))
            .filter(Boolean))).sort(),
        [empresa, registros]
    );

    const registrosFiltrados = useMemo(() => {
        const termo = busca.toLocaleLowerCase("pt-BR");
        return registros.filter((registro) => {
            if (empresa && texto(registro.empresaNome) !== empresa) return false;
            if (obra && texto(registro.obraNome) !== obra) return false;
            if (mes && !texto(registro.periodoInicio).startsWith(mes)) return false;
            if (!termo) return true;
            return [registro.codigo, registro.empresaNome, registro.obraNome]
                .some((valor) => texto(valor).toLocaleLowerCase("pt-BR").includes(termo));
        });
    }, [busca, empresa, mes, obra, registros]);

    const documentosFiltrados = useMemo(() => {
        const ids = new Set(registrosFiltrados.map((registro) => texto(registro.id)));
        return documentos.filter((documento) => ids.has(texto(documento.registro_id)));
    }, [documentos, registrosFiltrados]);

    async function abrirDocumento(documento) {
        try {
            const url = await criarUrlTemporariaDocumentoDds({ supabase, documento, validadeSegundos: 600 });
            if (!url) throw new Error("URL do PDF não disponível.");
            window.open(url, "_blank", "noopener,noreferrer");
        } catch (error) {
            setMensagem({ tipo: "erro", texto: error?.message || "Não foi possível abrir o PDF." });
        }
    }

    async function excluirDocumento(documento) {
        const registro = registrosPorId.get(texto(documento.registro_id));
        const codigo = texto(registro?.codigo).toUpperCase();
        const confirmacao = window.prompt(
            `Para excluir definitivamente este PDF, digite o código do DDS:\n\n${codigo}`
        );
        if (confirmacao === null) return;
        if (texto(confirmacao).toUpperCase() !== codigo) {
            setMensagem({ tipo: "erro", texto: "Código incorreto. Nenhum PDF foi excluído." });
            return;
        }

        setExcluindoId(documento.id);
        setMensagem(null);
        try {
            await excluirDocumentoDdsHistorico({ supabase, documento });
            setDocumentos((atuais) => atuais.filter((item) => item.id !== documento.id));
            setMensagem({ tipo: "sucesso", texto: `PDF do ${codigo} excluído. O cadastro do DDS foi mantido.` });
        } catch (error) {
            setMensagem({ tipo: "erro", texto: error?.message || "Não foi possível excluir o PDF." });
        } finally {
            setExcluindoId("");
        }
    }

    return (
        <section className="dds-no-print col-span-full min-h-[92px] w-full rounded-3xl border border-slate-200 border-t-4 border-t-cyan-500 bg-white p-4 shadow-sm">
            <div
                onClick={onAlternar}
                role="button"
                tabIndex={0}
                onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") onAlternar?.(); }}
                className="flex min-h-[52px] cursor-default flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
            >
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                        <Archive className="h-5 w-5" />
                    </span>
                    <div>
                        <h2 className="text-lg font-black text-slate-950">DDS salvos no sistema</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Consulte as folhas DDS já salvas, organizadas por empresa, obra e período.</p>
                    </div>
                </div>
                <button type="button" onClick={(evento) => { evento.stopPropagation(); onAlternar?.(); }} className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm">
                    {aberto ? "Fechar ↑" : "Abrir ↓"}
                </button>
            </div>

            {aberto && (
                <div className="mt-4 space-y-3">
                    <div className="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.3fr_140px_1fr_auto]">
                        <select value={empresa} onChange={(e) => { setEmpresa(e.target.value); setObra(""); }} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold">
                            <option value="">Todas as empresas</option>
                            {empresas.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
                        </select>
                        <select value={obra} onChange={(e) => setObra(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold">
                            <option value="">Todas as obras</option>
                            {obras.map((nome) => <option key={nome} value={nome}>{nome}</option>)}
                        </select>
                        <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold" />
                        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar código DDS" className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold" />
                        <button type="button" onClick={carregar} disabled={carregando} className="h-9 rounded-xl bg-slate-950 px-4 text-xs font-black uppercase text-white disabled:opacity-50">{carregando ? "Atualizando" : "Atualizar"}</button>
                    </div>

                    {mensagem && <div className={`rounded-xl border px-4 py-3 text-sm font-bold ${mensagem.tipo === "erro" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{mensagem.texto}</div>}

                    <div className="flex items-center justify-between rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-2 text-xs font-bold text-cyan-900">
                        <span>PDFs encontrados nos filtros</span>
                        <strong className="rounded-full bg-white px-3 py-1 text-sm">{documentosFiltrados.length}</strong>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <div className="min-w-[1180px]">
                        <div className="grid grid-cols-[220px_220px_minmax(280px,1fr)_300px_180px] items-center gap-4 bg-slate-100 px-4 py-2 text-[10px] font-black uppercase text-slate-500">
                            <span>DDS / período</span><span>Empresa</span><span>Obra</span><span>Arquivo</span><span className="text-center">Ações</span>
                        </div>
                        {documentosFiltrados.length ? documentosFiltrados.map((documento) => {
                            const registro = registrosPorId.get(texto(documento.registro_id));
                            return (
                                <div key={documento.id} className="grid grid-cols-[220px_220px_minmax(280px,1fr)_300px_180px] items-center gap-4 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 transition hover:bg-slate-50/70">
                                    <div><strong className="block text-slate-950">{registro?.codigo || "DDS"}</strong><span>{formatarPeriodo(registro)}</span></div>
                                    <span className="truncate font-semibold" title={registro?.empresaNome || ""}>{registro?.empresaNome || "—"}</span>
                                    <span className="truncate font-semibold" title={registro?.obraNome || ""}>{registro?.obraNome || "—"}</span>
                                    <div className="min-w-0"><strong className="block truncate text-slate-800" title={documento.nome_original || "DDS.pdf"}>{documento.nome_original || "DDS.pdf"}</strong><span className="whitespace-nowrap">{formatarTamanho(documento.tamanho_bytes)} · {formatarData(documento.created_at)}</span></div>
                                    <div className="flex items-center justify-center gap-3 pr-2">
                                        <button type="button" onClick={() => abrirDocumento(documento)} className="whitespace-nowrap rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 font-black uppercase text-cyan-800">Abrir PDF</button>
                                        <button type="button" onClick={() => excluirDocumento(documento)} disabled={excluindoId === documento.id} title="Excluir PDF" className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-50">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            );
                        }) : <p className="border-t border-slate-100 px-4 py-8 text-center text-sm font-bold text-slate-500">Nenhum PDF DDS encontrado para os filtros selecionados.</p>}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}
