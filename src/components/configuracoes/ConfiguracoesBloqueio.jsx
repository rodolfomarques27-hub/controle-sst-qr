import { Eye, EyeOff, Lock } from "lucide-react";
import { Card, Header } from "../commonComponents";
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
    return (
        <div>
            <Header
                titulo="Configurações bloqueadas"
                subtitulo="Informe a senha de desbloqueio da aba Configurações. O login e as permissões do usuário continuam obrigatórios para ações críticas."
            />
            <Card>
                <div className="mx-auto max-w-xl space-y-5 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                        <Lock className="h-7 w-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-950">Senha de desbloqueio da aba Configurações</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Essa senha abre a tela de Configurações depois do login. Ela não libera ações críticas sozinha e não altera a senha da Auditoria pública.
                        </p>
                    </div>

                    <form onSubmit={onValidarSenha} className="space-y-3 text-left">
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">Senha de desbloqueio</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type={mostrarSenhaConfiguracoes ? "text" : "password"}
                                    value={senhaConfiguracoes}
                                    onChange={(evento) => {
                                        setSenhaConfiguracoes(evento.target.value);
                                        setErroSenhaConfiguracoes("");
                                    }}
                                    placeholder="Digite a senha da aba Configurações"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarSenhaConfiguracoes((atual) => !atual)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    title={mostrarSenhaConfiguracoes ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {mostrarSenhaConfiguracoes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <button
                                type="submit"
                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
                            >
                                Acessar
                            </button>
                        </div>
                        {erroSenhaConfiguracoes && (
                            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
                                {erroSenhaConfiguracoes}
                            </p>
                        )}
                        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-100">
                            <p>
                                Senha configurada para a aba: <span className="font-black text-slate-800">{senhaConfiguracoesSistema === SENHA_CONFIGURACOES_PADRAO ? "padrão 2026" : "personalizada"}</span>.
                            </p>
                            <p className="mt-1">
                                Após desbloquear, cada ação sensível ainda depende da permissão do usuário logado e das regras do Supabase.
                            </p>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    );
}
