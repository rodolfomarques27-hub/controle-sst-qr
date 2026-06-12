import { Eye, EyeOff, Info, Lock, Shield } from "lucide-react";
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
        <section className="flex min-h-[calc(100vh-7rem)] items-center justify-center px-3 py-5 sm:px-4 lg:px-6 lg:py-6">
            <div className="grid w-full max-w-[1620px] overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_56px_rgba(15,23,42,0.13)] ring-1 ring-slate-200 lg:grid-cols-[410px_minmax(0,1fr)] xl:grid-cols-[450px_minmax(0,1fr)]">
                <div className="relative hidden min-h-[585px] overflow-hidden bg-[radial-gradient(circle_at_35%_34%,rgba(37,99,235,0.32),transparent_38%),linear-gradient(135deg,#021136_0%,#082766_50%,#17398b_100%)] lg:flex lg:items-center lg:justify-center">
                    <div className="absolute left-9 top-9 grid grid-cols-3 gap-4 opacity-35">
                        {Array.from({ length: 9 }).map((_, indice) => (
                            <span key={`left-${indice}`} className="h-2 w-2 rounded-full bg-blue-300/90" />
                        ))}
                    </div>

                    <div className="absolute bottom-24 right-10 grid grid-cols-3 gap-4 opacity-30">
                        {Array.from({ length: 9 }).map((_, indice) => (
                            <span key={`right-${indice}`} className="h-2 w-2 rounded-full bg-blue-300/90" />
                        ))}
                    </div>

                    <div className="absolute h-[430px] w-[430px] rounded-full border border-blue-300/14" />
                    <div className="absolute h-[325px] w-[325px] rounded-full border border-blue-300/12" />

                    <div className="relative flex flex-col items-center">
                        <div className="relative flex h-72 w-72 items-center justify-center">
                            <Shield
                                className="h-64 w-64 text-sky-400 drop-shadow-[0_20px_46px_rgba(56,189,248,0.28)]"
                                strokeWidth={1.5}
                            />
                            <div className="absolute flex h-[118px] w-[118px] items-center justify-center rounded-[2rem] bg-white text-blue-950 shadow-[0_20px_38px_rgba(2,8,23,0.34)]">
                                <Lock className="h-16 w-16" strokeWidth={2.15} />
                            </div>
                        </div>

                        <div className="mt-4 h-8 w-56 rounded-full bg-sky-300/35 blur-md" />
                        <div className="-mt-4 h-14 w-72 rounded-[100%] bg-[radial-gradient(circle,rgba(96,165,250,0.95)_0%,rgba(37,99,235,0.82)_45%,rgba(8,47,122,0.86)_100%)] shadow-[0_14px_32px_rgba(2,8,23,0.34)]" />
                    </div>
                </div>

                <div className="flex min-h-[585px] items-center px-6 py-7 sm:px-8 lg:px-12 xl:px-16">
                    <div className="mx-auto w-full max-w-5xl">
                        <div className="flex items-start gap-5">
                            <div className="mt-1 flex h-14 w-14 shrink-0 items-center justify-center text-blue-700">
                                <Shield className="h-14 w-14" strokeWidth={2} />
                            </div>

                            <div className="min-w-0 flex-1">
                                <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl xl:text-[3.65rem]">
                                    Configurações bloqueadas
                                </h1>

                                <p className="mt-5 text-lg font-extrabold leading-7 text-slate-700 sm:text-xl">
                                    Informe a senha para liberar a aba Configurações.
                                </p>

                                <p className="mt-1 text-lg leading-7 text-slate-500 sm:text-xl">
                                    Login e permissões continuam obrigatórios para ações críticas.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={onValidarSenha} className="mt-11 space-y-7">
                            <div>
                                <label className="block text-2xl font-black leading-none text-slate-950">
                                    Senha de desbloqueio
                                </label>

                                <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-stretch">
                                    <div className="relative flex-1">
                                        <input
                                            type={mostrarSenhaConfiguracoes ? "text" : "password"}
                                            value={senhaConfiguracoes}
                                            onChange={(evento) => {
                                                setSenhaConfiguracoes(evento.target.value);
                                                setErroSenhaConfiguracoes("");
                                            }}
                                            placeholder="Digite a senha da aba Configurações"
                                            className="h-[82px] w-full rounded-[1.5rem] border border-slate-200 bg-white px-7 pr-20 text-2xl font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                            autoComplete="off"
                                        />

                                        <button
                                            type="button"
                                            onClick={() => setMostrarSenhaConfiguracoes((atual) => !atual)}
                                            className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                            title={mostrarSenhaConfiguracoes ? "Ocultar senha" : "Mostrar senha"}
                                        >
                                            {mostrarSenhaConfiguracoes ? <EyeOff className="h-8 w-8" /> : <Eye className="h-8 w-8" />}
                                        </button>
                                    </div>

                                    <button
                                        type="submit"
                                        className="h-[82px] rounded-[1.5rem] bg-slate-950 px-10 text-2xl font-black text-white shadow-[0_14px_32px_rgba(15,23,42,0.2)] transition hover:-translate-y-0.5 hover:bg-slate-800 lg:min-w-[210px]"
                                    >
                                        Acessar
                                    </button>
                                </div>
                            </div>

                            {erroSenhaConfiguracoes && (
                                <p className="rounded-[1.5rem] bg-red-50 px-6 py-5 text-base font-bold text-red-700 ring-1 ring-red-100 sm:text-lg">
                                    {erroSenhaConfiguracoes}
                                </p>
                            )}

                            <div className="flex items-start gap-5 rounded-[1.5rem] bg-slate-50 px-6 py-6 text-slate-700 ring-1 ring-slate-200 sm:px-8">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-blue-700 ring-2 ring-blue-100 shadow-sm">
                                    <Info className="h-9 w-9" strokeWidth={2.4} />
                                </div>

                                <div className="pt-0.5">
                                    <p className="text-2xl font-black leading-tight text-slate-950">
                                        Senha atual: <span>{senhaAtualTexto}</span>.
                                    </p>

                                    <p className="mt-3 text-lg leading-8 text-slate-600 sm:text-xl">
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
