import { LogOut, ShieldCheck } from "lucide-react";

export function AppMobileHeader({ nav = [], tela, usuario = null, sair = null, onSelecionarTela }) {
    return (
        <header className="app-mobile-header lg:hidden">
            <div className="app-mobile-header__topo">
                <div className="app-mobile-header__marca">
                    <span className="app-mobile-header__logo" aria-hidden="true">
                        <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <p className="app-mobile-header__nome">SafeScan Brasil</p>
                        <p className="app-mobile-header__usuario" title={usuario?.email || "Operação mobile"}>
                            {usuario?.email || "Operação mobile"}
                        </p>
                    </div>
                </div>

                {typeof sair === "function" && (
                    <button
                        type="button"
                        onClick={sair}
                        className="app-mobile-header__sair"
                        title="Sair do sistema"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sair</span>
                    </button>
                )}
            </div>

            <label htmlFor="app-mobile-tela-select" className="sr-only">
                Selecionar tela do sistema
            </label>
            <select
                id="app-mobile-tela-select"
                value={tela}
                onChange={(evento) => {
                    const idSelecionado = evento.target.value;
                    const itemSelecionado = nav.find((item) => item.id === idSelecionado);
                    onSelecionarTela(idSelecionado, itemSelecionado?.label || idSelecionado);
                }}
                className="app-mobile-header__select"
            >
                {nav.map((item) => (
                    <option key={item.id} value={item.id}>
                        {item.label}
                    </option>
                ))}
            </select>
        </header>
    );
}
