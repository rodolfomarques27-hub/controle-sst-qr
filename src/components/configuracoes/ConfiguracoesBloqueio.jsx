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
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-3 py-4 sm:px-4 lg:px-6">
            <div className="grid w-full max-w-[1500px] overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="relative hidden min-h-[520px] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.22),_transparent_35%),linear-gradient(145deg,#04153d_0%,#0a2a70_55%,#16388b_100%)] lg:flex lg:items-center lg:justify-center">
                    <div className="absolute left-10 top-9 grid grid-cols-3 gap-4 opacity-30">
                        {Array.from({ length: 9 }).map((_, indice) => (
                            <span key={`top-${indice}`} className="h-2 w-2 rounded-full bg-blue-200" />
                        ))}
                    </div>

                    <div className="absolute bottom-20 right-10 grid grid-cols-3 gap-4 opacity-30">
                        {Array.from({ length: 9 }).map((_, indice) => (
                            <span key={`bottom-${indice}`} className="h-2 w-2 rounded-full bg-blue-200" />
                        ))}
                    </div>

                    <div className="absolute h-[390px] w-[390px] rounded-full border border-blue-300/15" />
                    <div className="absolute h-[300px] w-[300px] rounded-full border border-blue-300/12" />

                    <div className="relative flex flex-col items-center">
                        <div className="flex h-56 w-56 items-center justify-center rounded-[2.25rem] bg-white/6 shadow-[0_24px_48px_rgba(2,8,23,0.28)] backdrop-blur-[2px]">
                            <ShieldCheck className="h-36 w-36 text-sky-400" strokeWidth={1.8} />
                            <div className="absolute flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-white text-blue-950 shadow-[0_14px_28px_rgba(2,8,23,0.32)]">
                                <Lock className="h-12 w-12" strokeWidth={2.1} />
                            </div>
                        </div>

                        <div className="mt-8 h-4 w-44 rounded-full bg-sky-300/30 blur-md" />
                        <div className="mt-1 h-10 w-60 rounded-[100%] bg-[radial-gradient(circle,_rgba(96,165,250,0.95)_0%,rgba(37,99,235,0.82)_48%,rgba(8,47,122,0.86)_100%)] shadow-[0_12px_28px_rgba(2,8,23,0.32)]" />
                    </div>
                </div>

                <div className="flex min-h-[520px] items-center px-6 py-8 sm:px-8 lg:px-10 xl:px-14">
                    <div className="mx-auto w-full max-w-4xl">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                                <ShieldCheck className="h-8 w-8" strokeWidth={2} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl xl:text-[3.15rem]">
                                    Configurações bloqueadas
                                </h1>
                                <p className="mt-4 text-base font-semibold leading-7 text-slate-700 sm:text-lg">
                                    Informe a senha para liberar a aba Configurações.
                                </p>
                                <p className="mt-1 text-base leading-7 text-slate-500 sm:text-lg">
                                    Login e permissões continuam obrigatórios para ações críticas.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={onValidarSenha} className="mt-10 space-y-6">
                            <div>
                                <label className="block text-xl font-black text-slate-950 sm:text-[1.65rem]">
                                    Senha de desbloqueio
                                </label>

                                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-stretch">
                                    <div className="relative flex-1">
                                        <input
                                            type={mostrarSenhaConfiguracoes ? "text" : "password"}
                                            value={senhaConfiguracoes}
                                            onChange={(evento) => {
                                                setSenhaConfiguracoes(evento.target.value);
                                                setErroSenhaConfiguracoes("");
                                            }}
                                            placeholder="Digite a senha da aba Configurações"
                                            className="h-[76px] w-full rounded-[1.4rem] border border-slate-200 bg-white px-6 pr-18 text-xl font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:text-[1.65rem]"
                                            autoComplete="off"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setMostrarSenhaConfiguracoes((atual) => !atual)}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                            title={mostrarSenhaConfiguracoes ? "Ocultar senha" : "Mostrar senha"}
                                        >
                                            {mostrarSenhaConfiguracoes ? <EyeOff className="h-7 w-7" /> : <Eye className="h-7 w-7" />}
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        className="h-[76px] rounded-[1.4rem] bg-slate-950 px-9 text-xl font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800 lg:min-w-[190px]"
                                    >
                                        Acessar
                                    </button>
                                </div>
                            </div>

                            {erroSenhaConfiguracoes && (
                                <p className="rounded-[1.3rem] bg-red-50 px-5 py-4 text-sm font-bold text-red-700 ring-1 ring-red-100 sm:text-base">
                                    {erroSenhaConfiguracoes}
                                </p>
                            )}

                            <div className="flex items-start gap-4 rounded-[1.5rem] bg-slate-50 px-5 py-5 text-slate-700 ring-1 ring-slate-200 sm:px-6">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-blue-700 ring-2 ring-blue-100 shadow-sm">
                                    <Info className="h-8 w-8" strokeWidth={2.3} />
                                </div>

                                <div>
                                    <p className="text-xl font-black leading-tight text-slate-950 sm:text-[1.75rem]">
                                        Senha atual: <span>{senhaAtualTexto}</span>.
                                    </p>
                                    <p className="mt-2 text-base leading-7 text-slate-600 sm:text-lg">
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
