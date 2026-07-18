import { useEffect, useMemo } from "react";
import { LogOut, ShieldCheck } from "lucide-react";

const TELAS_ESSENCIAIS_MOBILE = ["dashboard", "auditoriaCampo", "novaAuditoriaCampo", "qr"];

export function AppMobileHeader({
    nav = [],
    tela,
    usuario = null,
    sair = null,
    onSelecionarTela,
    dispositivoMobile = false,
}) {
    const navMobile = useMemo(() => TELAS_ESSENCIAIS_MOBILE
        .map((id) => nav.find((item) => item.id === id))
        .filter(Boolean), [nav]);
    const atalhoPrincipal = navMobile.length ? navMobile : nav;
    const primeiraTelaMobile = atalhoPrincipal[0]?.id;

    useEffect(() => {
        if (dispositivoMobile && primeiraTelaMobile && !atalhoPrincipal.some((item) => item.id === tela)) {
            onSelecionarTela(primeiraTelaMobile, atalhoPrincipal[0]?.label || primeiraTelaMobile);
        }
    }, [atalhoPrincipal, dispositivoMobile, primeiraTelaMobile, tela, onSelecionarTela]);

    if (!dispositivoMobile) return null;

    return (
        <header className="app-mobile-header">
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

            <nav className="app-mobile-bottom-nav" aria-label="Atalhos de campo">
                {navMobile.map((item) => {
                    const Icone = item.icon;
                    const ativo = tela === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={`app-mobile-bottom-nav__item${ativo ? " is-active" : ""}`}
                            onClick={() => onSelecionarTela(item.id, item.label)}
                            aria-current={ativo ? "page" : undefined}
                            title={item.label}
                        >
                            {Icone && <Icone className="h-4 w-4" aria-hidden="true" />}
                            <span>{item.id === "novaAuditoriaCampo" ? "Auditar" : item.id === "auditoriaCampo" ? "Auditoria" : item.id === "qr" ? "QR Code" : "SST"}</span>
                        </button>
                    );
                })}
            </nav>
        </header>
    );
}
