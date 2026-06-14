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
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-3 py-5 sm:px-4 lg:px-6">
            <div className="grid w-full max-w-[1380px] overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
                <div className="relative hidden min-h-[500px] overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.16),_transparent_44%),linear-gradient(145deg,#071947_0%,#0b2a70_55%,#17398b_100%)] lg:flex lg:items-center lg:justify-center">
                    <div className="absolute h-[320px] w-[320px] rounded-full border border-blue-300/10" />
                    <div className="absolute h-[240px] w-[240px] rounded-full border border-blue-300/8" />

                    <div className="relative flex flex-col items-center justify-center">
                        <div className="absolute h-36 w-36 rounded-full bg-sky-400/10 blur-2xl" />
                        <div className="relative flex h-36 w-36 items-center justify-center">
                            <ShieldCheck
                                className="h-28 w-28 text-blue-400 drop-shadow-[0_10px_24px_rgba(37,99,235,0.20)]"
                                strokeWidth={1.75}
                            />
                            <div className="absolute flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-white text-blue-950 shadow-[0_10px_24px_rgba(2,8,23,0.22)]">
                                <Lock className="h-8 w-8" strokeWidth={2.15} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex min-h-[500px] items-center px-6 py-8 sm:px-8 lg:px-11 xl:px-14">
                    <div className="mx-auto w-full max-w-[830px]">
                        <div className="flex items-start gap-4">
                            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center text-blue-700">
                                <ShieldCheck className="h-9 w-9" strokeWidth={2} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-[2.6rem]">
                                    Configurações bloqueadas
                                </h1>

                                <p className="mt-6 text-base font-medium leading-7 text-slate-600 sm:text-lg">
                                    Informe a senha para liberar a aba Configurações.
                                </p>

                                <p className="mt-1 text-base leading-7 text-slate-500 sm:text-lg">
                                    Login e permissões continuam obrigatórios para ações críticas.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={onValidarSenha} className="mt-12 space-y-7">
                            <div>
                                <label className="block text-lg font-black text-slate-950 sm:text-xl">
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
                                            className="h-16 w-full rounded-2xl border border-slate-200 bg-white px-5 pr-14 text-base font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:text-lg"
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
                                        className="h-16 rounded-2xl bg-slate-950 px-8 text-base font-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800 sm:text-lg lg:min-w-[150px]"
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

                            <div className="flex items-start gap-4 rounded-2xl bg-slate-50 px-5 py-5 text-slate-700 ring-1 ring-slate-200 sm:px-6">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-blue-700 ring-2 ring-blue-100 shadow-sm">
                                    <Info className="h-7 w-7" strokeWidth={2.25} />
                                </div>

                                <div>
                                    <p className="text-base font-black leading-tight text-slate-950 sm:text-lg">
                                        Senha atual: <span>{senhaAtualTexto}</span>.
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
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
