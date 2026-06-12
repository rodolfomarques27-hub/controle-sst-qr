import { Eye, EyeOff, Info, Lock, ShieldCheck } from "lucide-react";
import { SENHA_CONFIGURACOES_PADRAO } from "../../constants/configuracoesSegurancaConstants";

export function ConfiguracoesBloqueio({
    senhaConfiguracoes,
    senhaConfiguracoesSistema,
    mostrarSenhaConfiguracoes,
    erroSenhaConfiguracoes,
    onValidarSenha,
    setSenhaConfiguracoes,
    setErroSenhaConfiguracoes,
    setMostrarSenhaConfiguracoes,
}) {
    const senhaAtualTexto = senhaConfiguracoesSistema === SENHA_CONFIGURACOES_PADRAO ? "padrão 2026" : "personalizada";

    return (
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-2 py-5 sm:px-4 lg:py-6">
            <div className="grid w-full max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_55px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="relative hidden min-h-[500px] overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 lg:flex lg:items-center lg:justify-center">
                    <div className="absolute left-10 top-10 grid grid-cols-3 gap-4 opacity-30">
                        {Array.from({ length: 9 }).map((_, indice) => (
                            <span key={indice} className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                        ))}
                    </div>
                    <div className="absolute bottom-24 right-10 grid grid-cols-3 gap-4 opacity-25">
                        {Array.from({ length: 9 }).map((_, indice) => (
                            <span key={indice} className="h-1.5 w-1.5 rounded-full bg-blue-300" />
                        ))}
                    </div>
                    <div className="absolute h-[430px] w-[430px] rounded-full border border-blue-300/10" />
                    <div className="absolute h-[330px] w-[330px] rounded-full border border-blue-300/10" />
                    <div className="relative flex flex-col items-center">
                        <div className="relative flex h-56 w-56 items-center justify-center rounded-[3rem] bg-blue-500/5">
                            <ShieldCheck className="h-48 w-48 text-blue-400 drop-shadow-[0_18px_40px_rgba(59,130,246,0.35)]" strokeWidth={1.45} />
                            <div className="absolute flex h-24 w-24 items-center justify-center rounded-3xl bg-white text-blue-950 shadow-[0_18px_35px_rgba(15,23,42,0.28)]">
                                <Lock className="h-12 w-12" strokeWidth={2.4} />
                            </div>
                        </div>
                        <div className="mt-7 h-14 w-64 rounded-[100%] bg-blue-400/30 blur-sm" />
                        <div className="-mt-12 h-11 w-64 rounded-[100%] bg-gradient-to-r from-blue-900 via-blue-400 to-blue-900 opacity-80" />
                    </div>
                </div>

                <div className="flex min-h-[500px] items-center px-5 py-8 sm:px-8 lg:px-12 xl:px-14">
                    <div className="w-full max-w-4xl">
                        <div className="flex items-start gap-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                                <ShieldCheck className="h-8 w-8" strokeWidth={2.2} />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                                    Configurações bloqueadas
                                </h1>
                                <p className="mt-4 text-base font-extrabold leading-6 text-slate-600 sm:text-lg">
                                    Informe a senha para liberar a aba Configurações.
                                </p>
                                <p className="mt-1 text-base leading-6 text-slate-500 sm:text-lg">
                                    Login e permissões continuam obrigatórios para ações críticas.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={onValidarSenha} className="mt-9 space-y-6">
                            <div>
                                <label className="text-lg font-black leading-none text-slate-950">Senha de desbloqueio</label>
                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
                                    <div className="relative flex-1">
                                        <input
                                            type={mostrarSenhaConfiguracoes ? "text" : "password"}
                                            value={senhaConfiguracoes}
                                            onChange={(evento) => {
                                                setSenhaConfiguracoes(evento.target.value);
                                                setErroSenhaConfiguracoes("");
                                            }}
                                            placeholder="Digite a senha da aba Configurações"
                                            className="h-16 w-full rounded-2xl border border-slate-200 bg-white px-5 pr-14 text-base font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:text-lg"
                                            autoComplete="off"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setMostrarSenhaConfiguracoes((atual) => !atual)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                            title={mostrarSenhaConfiguracoes ? "Ocultar senha" : "Mostrar senha"}
                                        >
                                            {mostrarSenhaConfiguracoes ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                    <button
                                        type="submit"
                                        className="h-16 rounded-2xl bg-slate-950 px-9 text-lg font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 sm:min-w-[150px]"
                                    >
                                        Acessar
                                    </button>
                                </div>
                            </div>

                            {erroSenhaConfiguracoes && (
                                <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
                                    {erroSenhaConfiguracoes}
                                </p>
                            )}

                            <div className="flex items-start gap-5 rounded-2xl bg-blue-50/70 px-5 py-5 text-slate-700 ring-1 ring-blue-100 sm:px-6">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-700 ring-2 ring-blue-100">
                                    <Info className="h-7 w-7" strokeWidth={2.4} />
                                </div>
                                <div className="pt-0.5">
                                    <p className="text-base font-black text-slate-950 sm:text-lg">
                                        Senha atual: <span>{senhaAtualTexto}</span>.
                                    </p>
                                    <p className="mt-1 text-sm font-medium leading-6 text-slate-600 sm:text-base">
                                        Ações críticas ainda dependem das permissões do usuário.
                                    </p>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
