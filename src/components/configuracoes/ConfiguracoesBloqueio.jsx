import { Eye, EyeOff, Info, Lock } from "lucide-react";
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
            <div className="grid w-full max-w-[1260px] overflow-hidden rounded-[1.9rem] bg-white shadow-[0_18px_46px_rgba(15,23,42,0.12)] ring-1 ring-slate-200 lg:grid-cols-[305px_minmax(0,1fr)] xl:grid-cols-[330px_minmax(0,1fr)]">
                <div className="relative hidden min-h-[440px] overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.18),_transparent_40%),linear-gradient(145deg,#06163f_0%,#0b2a70_55%,#17398b_100%)] lg:flex lg:items-center lg:justify-center">
                    <div className="absolute h-[250px] w-[250px] rounded-full border border-blue-300/10" />
                    <div className="absolute h-[180px] w-[180px] rounded-full border border-blue-300/8" />

                    <div className="relative flex h-28 w-28 items-center justify-center rounded-[1.8rem] bg-white text-blue-950 shadow-[0_16px_34px_rgba(2,8,23,0.24)]">
                        <Lock className="h-14 w-14" strokeWidth={2.1} />
                    </div>
                </div>

                <div className="flex min-h-[440px] items-center px-6 py-7 sm:px-8 lg:px-9 xl:px-10">
                    <div className="mx-auto w-full max-w-[760px]">
                        <div>
                            <h1 className="text-[2.05rem] font-black leading-tight tracking-tight text-slate-950 sm:text-[2.35rem] xl:text-[2.7rem]">
                                Configurações bloqueadas
                            </h1>

                            <p className="mt-5 max-w-[620px] text-[0.98rem] font-medium leading-7 text-slate-600 sm:text-[1.05rem]">
                                Informe a senha para liberar a aba Configurações.
                            </p>
                        </div>

                        <form onSubmit={onValidarSenha} className="mt-8 space-y-5">
                            <div>
                                <label className="block text-lg font-black text-slate-950 sm:text-[1.18rem]">
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
                                            className="h-[66px] w-full rounded-[1.15rem] border border-slate-200 bg-white px-5 pr-14 text-base font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:text-[1.05rem]"
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
                                        className="h-[66px] rounded-[1.15rem] bg-slate-950 px-7 text-base font-black text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800 lg:min-w-[145px]"
                                    >
                                        Acessar
                                    </button>
                                </div>
                            </div>

                            {erroSenhaConfiguracoes && (
                                <p className="rounded-[1.1rem] bg-red-50 px-5 py-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
                                    {erroSenhaConfiguracoes}
                                </p>
                            )}

                            <div className="flex items-start gap-4 rounded-[1.25rem] bg-slate-50 px-5 py-4 text-slate-700 ring-1 ring-slate-200 sm:px-6">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-blue-700 ring-2 ring-blue-100 shadow-sm">
                                    <Info className="h-6 w-6" strokeWidth={2.2} />
                                </div>

                                <div>
                                    <p className="text-base font-black leading-tight text-slate-950 sm:text-[1.05rem]">
                                        Senha atual: <span>{senhaAtualTexto}</span>.
                                    </p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-[0.98rem]">
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
