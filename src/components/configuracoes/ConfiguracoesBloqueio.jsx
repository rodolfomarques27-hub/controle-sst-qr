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
            <div className="grid w-full max-w-[1480px] overflow-hidden rounded-[1.9rem] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
                <div className="relative hidden min-h-[500px] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_34%),linear-gradient(145deg,#071947_0%,#0c2b73_55%,#183a8d_100%)] lg:flex lg:items-center lg:justify-center">
                    <div className="absolute h-[360px] w-[360px] rounded-full border border-blue-300/12" />
                    <div className="absolute h-[275px] w-[275px] rounded-full border border-blue-300/10" />

                    <div className="relative flex flex-col items-center">
                        <div className="flex h-52 w-52 items-center justify-center rounded-[2rem] bg-white/6 shadow-[0_22px_44px_rgba(2,8,23,0.26)] backdrop-blur-[2px]">
                            <ShieldCheck className="h-32 w-32 text-sky-400" strokeWidth={1.8} />
                            <div className="absolute flex h-24 w-24 items-center justify-center rounded-[1.6rem] bg-white text-blue-950 shadow-[0_14px_28px_rgba(2,8,23,0.28)]">
                                <Lock className="h-12 w-12" strokeWidth={2.1} />
                            </div>
                        </div>

                        <div className="mt-7 h-3 w-36 rounded-full bg-sky-300/25 blur-md" />
                        <div className="mt-1 h-8 w-44 rounded-[100%] bg-[radial-gradient(circle,_rgba(96,165,250,0.92)_0%,rgba(37,99,235,0.8)_50%,rgba(8,47,122,0.82)_100%)] shadow-[0_10px_24px_rgba(2,8,23,0.28)]" />
                    </div>
                </div>

                <div className="flex min-h-[500px] items-center px-6 py-8 sm:px-8 lg:px-10 xl:px-12">
                    <div className="mx-auto w-full max-w-4xl">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                                <ShieldCheck className="h-7 w-7" strokeWidth={2} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h1 className="text-[2.15rem] font-black leading-tight tracking-tight text-slate-950 sm:text-[2.5rem] xl:text-[2.9rem]">
                                    Configurações bloqueadas
                                </h1>
                                <p className="mt-4 text-[0.98rem] font-semibold leading-7 text-slate-700 sm:text-[1.05rem]">
                                    Informe a senha para liberar a aba Configurações.
                                </p>
                                <p className="mt-0.5 text-[0.98rem] leading-7 text-slate-500 sm:text-[1.05rem]">
                                    Login e permissões continuam obrigatórios para ações críticas.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={onValidarSenha} className="mt-9 space-y-5">
                            <div>
                                <label className="block text-[1.7rem] font-black text-slate-950">
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
                                            className="h-[72px] w-full rounded-[1.3rem] border border-slate-200 bg-white px-6 pr-16 text-lg font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:text-[1.4rem]"
                                            autoComplete="off"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setMostrarSenhaConfiguracoes((atual) => !atual)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                            title={mostrarSenhaConfiguracoes ? "Ocultar senha" : "Mostrar senha"}
                                        >
                                            {mostrarSenhaConfiguracoes ? <EyeOff className="h-6 w-6" /> : <Eye className="h-6 w-6" />}
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        className="h-[72px] rounded-[1.3rem] bg-slate-950 px-8 text-lg font-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 lg:min-w-[175px]"
                                    >
                                        Acessar
                                    </button>
                                </div>
                            </div>

                            {erroSenhaConfiguracoes && (
                                <p className="rounded-[1.2rem] bg-red-50 px-5 py-4 text-sm font-bold text-red-700 ring-1 ring-red-100 sm:text-base">
                                    {erroSenhaConfiguracoes}
                                </p>
                            )}

                            <div className="flex items-start gap-4 rounded-[1.4rem] bg-slate-50 px-5 py-5 text-slate-700 ring-1 ring-slate-200 sm:px-6">
                                <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-white text-blue-700 ring-2 ring-blue-100 shadow-sm">
                                    <Info className="h-7 w-7" strokeWidth={2.3} />
                                </div>

                                <div>
                                    <p className="text-[1.45rem] font-black leading-tight text-slate-950 sm:text-[1.6rem]">
                                        Senha atual: <span>{senhaAtualTexto}</span>.
                                    </p>
                                    <p className="mt-2 text-[0.98rem] leading-7 text-slate-600 sm:text-[1.05rem]">
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
