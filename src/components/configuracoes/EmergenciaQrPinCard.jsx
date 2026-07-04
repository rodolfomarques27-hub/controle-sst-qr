import React, { useMemo, useState } from "react";
import { Building2, ChevronDown, ChevronUp, Eye, EyeOff, KeyRound, Save, ShieldCheck } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { Card } from "../commonComponents";

function textoSeguro(valor = "") {
    return String(valor || "").trim();
}

function obterIdEmpresa(item = {}) {
    return textoSeguro(item.id || item.empresa_id || item.empresaId);
}

function obterNomeEmpresa(item = {}) {
    return textoSeguro(item.nome || item.empresa_nome || item.empresa || "Empresa sem nome");
}

function ordenarEmpresasEmergenciaQr(empresas = []) {
    return [...(empresas || [])]
        .filter((item) => obterIdEmpresa(item))
        .sort((a, b) => obterNomeEmpresa(a).localeCompare(obterNomeEmpresa(b), "pt-BR"));
}

export function EmergenciaQrPinCard({ empresasBanco = [] }) {
    const empresas = useMemo(() => ordenarEmpresasEmergenciaQr(empresasBanco), [empresasBanco]);
    const [empresaId, setEmpresaId] = useState(() => obterIdEmpresa(empresas[0] || ""));
    const [ativo, setAtivo] = useState(true);
    const [recolhido, setRecolhido] = useState(false);
    const [pin, setPin] = useState("");
    const [confirmarPin, setConfirmarPin] = useState("");
    const [mostrarPin, setMostrarPin] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState("");
    const [erro, setErro] = useState("");

    const empresaSelecionada = empresas.find((item) => obterIdEmpresa(item) === empresaId) || null;
    const alternarRecolhidoCardEmergenciaQr = () => {
        setRecolhido((valor) => !valor);
    };

    const cliqueVeioDeControleInterativoEmergenciaQr = (evento) => {
        const alvo = evento?.target;

        if (!alvo || typeof alvo.closest !== "function") return false;

        const controleInterativo = alvo.closest(
            "button, input, textarea, select, option, a, label, summary, [role='button'], [role='checkbox'], [role='switch'], [contenteditable='true']"
        );

        return Boolean(controleInterativo && controleInterativo !== evento.currentTarget);
    };

    const botaoControleCardEmergenciaQr = (
        <button
            type="button"
            onClick={(evento) => {
                evento.stopPropagation();
                alternarRecolhidoCardEmergenciaQr();
            }}
            className="inline-flex min-h-[34px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-slate-950 px-3.5 py-2 text-xs font-black text-white shadow-sm ring-1 ring-slate-950 transition hover:-translate-y-0.5 hover:bg-slate-800"
        >
            {recolhido ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            {recolhido ? "Abrir card" : "Recolher"}
        </button>
    );

    React.useEffect(() => {
        if (!empresaId && empresas.length > 0) {
            setEmpresaId(obterIdEmpresa(empresas[0]));
        }
    }, [empresaId, empresas]);

    const salvarPinEmergencia = async () => {
        setErro("");
        setMensagem("");

        if (!empresaId) {
            setErro("Selecione a empresa para configurar o PIN.");
            return;
        }

        const pinTratado = textoSeguro(pin);
        const confirmarTratado = textoSeguro(confirmarPin);

        if (ativo) {
            if (pinTratado.length < 4) {
                setErro("Informe um PIN com pelo menos 4 caracteres.");
                return;
            }

            if (pinTratado !== confirmarTratado) {
                setErro("A confirmação do PIN não confere.");
                return;
            }
        }

        setSalvando(true);

        try {
            const { data, error: rpcError } = await supabase.rpc("definir_senha_emergencia_empresa", {
                p_empresa_id: empresaId,
                p_senha: ativo ? pinTratado : "",
                p_ativo: ativo,
            });

            if (rpcError) {
                throw new Error(rpcError.message || "Não foi possível salvar o PIN de emergência.");
            }

            if (data?.ok === false) {
                throw new Error(data?.mensagem || "Não foi possível salvar o PIN de emergência.");
            }

            setMensagem(data?.mensagem || (ativo ? "PIN de emergência configurado/atualizado." : "Emergência QR desativada."));
            setPin("");
            setConfirmarPin("");
        } catch (error) {
            setErro(error.message || "Erro ao salvar PIN de emergência.");
        } finally {
            setSalvando(false);
        }
    };

    if (recolhido) {
        return (
            <div
                className="h-full"
                role="button"
                tabIndex={0}
                aria-label="Abrir Senha/PIN do contato de emergência"
                onClick={(evento) => {
                    if (cliqueVeioDeControleInterativoEmergenciaQr(evento)) return;
                    setRecolhido(false);
                }}
                onKeyDown={(evento) => {
                    if (evento.target !== evento.currentTarget) return;

                    if (evento.key === "Enter" || evento.key === " ") {
                        evento.preventDefault();
                        setRecolhido(false);
                    }
                }}
            >
                <Card className="h-full py-3 transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-wide text-red-500">Emergência QR</p>
                            <h2 className="mt-0.5 truncate text-sm font-black leading-tight text-slate-950">Senha/PIN do contato de emergência</h2>
                            <p className="mt-0.5 line-clamp-1 text-xs leading-relaxed text-slate-500">
                                Configure ou atualize o PIN usado para liberar o contato de emergência no QR público.
                            </p>
                        </div>
                        <div className="shrink-0">
                            {botaoControleCardEmergenciaQr}
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div
            className="h-full"
            aria-label="Recolher Senha/PIN do contato de emergência"
            onClick={(evento) => {
                if (cliqueVeioDeControleInterativoEmergenciaQr(evento)) return;
                setRecolhido(true);
            }}
        >
            <Card>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-100">
                            <ShieldCheck className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
                                Emergência QR
                            </p>
                            <h2 className="text-lg font-black text-slate-950">
                                Senha/PIN do contato de emergência
                            </h2>
                        </div>
                    </div>

                    <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
                        Configure ou atualize a senha/PIN usada no QR público para liberar o telefone de emergência do colaborador. Por segurança, o PIN atual não fica visível no sistema; ao salvar, o novo PIN substitui o anterior e é armazenado como hash no Supabase.
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <span className="inline-flex w-fit items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-100">
                            <KeyRound className="h-4 w-4" />
                            Protegido por RPC
                        </span>
                        {botaoControleCardEmergenciaQr}
                    </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(260px,0.8fr)]">
                <div className="space-y-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-100">
                    <label className="block">
                        <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                            <Building2 className="h-4 w-4" />
                            Empresa
                        </span>
                        <select
                            value={empresaId}
                            onChange={(event) => setEmpresaId(event.target.value)}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            {empresas.length === 0 ? (
                                <option value="">Nenhuma empresa carregada</option>
                            ) : (
                                empresas.map((empresa) => (
                                    <option key={obterIdEmpresa(empresa)} value={obterIdEmpresa(empresa)}>
                                        {obterNomeEmpresa(empresa)}
                                    </option>
                                ))
                            )}
                        </select>
                    </label>

                    {empresaSelecionada && (
                        <div className="rounded-2xl bg-white px-4 py-3 text-xs font-semibold leading-relaxed text-slate-600 ring-1 ring-slate-100">
                            Empresa selecionada: <span className="font-black text-slate-900">{obterNomeEmpresa(empresaSelecionada)}</span>
                        </div>
                    )}

                    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-100">
                        <span>
                            <span className="block text-sm font-black text-slate-900">
                                Ativar contato de emergência no QR público
                            </span>
                            <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500">
                                Quando ativo, o QR exige PIN para liberar nome, parentesco e telefone.
                            </span>
                        </span>

                        <input
                            type="checkbox"
                            checked={ativo}
                            onChange={(event) => setAtivo(event.target.checked)}
                            className="h-5 w-5 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                        />
                    </label>
                </div>

                <div className="space-y-4 rounded-3xl bg-white p-4 ring-1 ring-slate-100">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block">
                            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                PIN
                            </span>
                            <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-100">
                                <input
                                    type={mostrarPin ? "text" : "password"}
                                    value={pin}
                                    onChange={(event) => setPin(event.target.value)}
                                    disabled={!ativo}
                                    placeholder="Novo PIN · mín. 4 caracteres"
                                    className="min-w-0 flex-1 px-4 py-3 text-sm font-bold text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarPin((valor) => !valor)}
                                    className="px-3 text-slate-500 hover:text-slate-800"
                                >
                                    {mostrarPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                                Confirmar PIN
                            </span>
                            <input
                                type={mostrarPin ? "text" : "password"}
                                value={confirmarPin}
                                onChange={(event) => setConfirmarPin(event.target.value)}
                                disabled={!ativo}
                                placeholder="Repita o PIN"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:bg-slate-50 disabled:text-slate-400"
                                autoComplete="new-password"
                            />
                        </label>
                    </div>

                    {erro && (
                        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-200">
                            {erro}
                        </div>
                    )}

                    {mensagem && (
                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
                            {mensagem}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={salvarPinEmergencia}
                        disabled={salvando || !empresaId}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save className="h-4 w-4" />
                        {salvando ? "Salvando PIN..." : ativo ? "Salvar/atualizar PIN de emergência" : "Desativar emergência QR"}
                    </button>
                </div>
            </div>
        </Card>
        </div>
    );
}
