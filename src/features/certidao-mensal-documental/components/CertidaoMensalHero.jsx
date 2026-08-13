import { useState } from "react";
import { createPortal } from "react-dom";
import {
    CalendarDays,
    ChevronDown,
    FileText,
    Printer,
} from "lucide-react";
import certidaoMensalHeroBackground from "../../../assets/certidao-mensal-hero-pastas.webp";

const COMPETENCIAS_DISPONIVEIS = (() => {
    const competencias = [];
    const data = new Date();
    data.setDate(1);

    while (data.getFullYear() >= 2025) {
        competencias.push(
            `${String(data.getMonth() + 1).padStart(2, "0")}/${data.getFullYear()}`
        );
        data.setMonth(data.getMonth() - 1);
    }

    return competencias;
})();

export function CertidaoMensalHero({
    competencia,
    resumo,
    onSelecionarCompetencia,
    onImprimirRelatorio,
    relatorioCarregando = false,
}) {
    const [menuCompetencia, setMenuCompetencia] = useState(null);

    const alternarMenuCompetencia = (evento) => {
        if (menuCompetencia) {
            setMenuCompetencia(null);
            return;
        }

        const area = evento.currentTarget.getBoundingClientRect();
        const largura = 286;
        setMenuCompetencia({
            top: area.bottom + 8,
            left: Math.max(12, Math.min(
                area.left + (area.width / 2) - (largura / 2),
                window.innerWidth - largura - 12
            )),
        });
    };

    return (
        <section className="certidao-mensal-hero">
            <div
                className="certidao-mensal-hero__background"
                style={{
                    backgroundImage:
                        `url(${certidaoMensalHeroBackground})`,
                }}
            />

            <div className="certidao-mensal-hero__overlay" />

            <div className="certidao-mensal-hero__content">
                <div className="certidao-mensal-hero__identity">
                    <div className="certidao-mensal-hero__badge">
                        <FileText aria-hidden="true" />
                    </div>

                    <div className="certidao-mensal-hero__copy">
                        <p className="certidao-mensal-hero__eyebrow">
                            SAFESCAN BRASIL
                        </p>

                        <h2 className="certidao-mensal-hero__title">
                            Certidão Mensal Documental
                        </h2>

                        <p className="certidao-mensal-hero__text">
                            Fiscalização mensal de contratos terceirizados com conferência assistida e rastreabilidade documental.
                        </p>

                        <div className="certidao-mensal-hero__line" />
                    </div>
                </div>

                <div className="certidao-mensal-hero__summary">
                    <article className="certidao-mensal-hero__summary-card certidao-mensal-hero__summary-card--competencia">
                        <span className="certidao-mensal-hero__summary-label">
                            Competência
                        </span>

                        <strong>{competencia}</strong>

                        <button
                            type="button"
                            className="certidao-mensal-hero__month-picker"
                            aria-haspopup="listbox"
                            aria-expanded={Boolean(menuCompetencia)}
                            onClick={alternarMenuCompetencia}
                        >
                            <CalendarDays aria-hidden="true" />
                            <span>Selecionar mês</span>
                            <ChevronDown aria-hidden="true" />
                        </button>
                    </article>

                    <article className="certidao-mensal-hero__summary-card certidao-mensal-hero__summary-card--conformidade">
                        <span className="certidao-mensal-hero__summary-label">
                            Conformidade do mês
                        </span>

                        <strong>{resumo.conformidadeMes}%</strong>

                        <button
                            type="button"
                            className="certidao-mensal-hero__month-picker certidao-mensal-hero__report-button"
                            disabled={
                                !onImprimirRelatorio ||
                                relatorioCarregando
                            }
                            aria-busy={relatorioCarregando}
                            onClick={onImprimirRelatorio}
                        >
                            <Printer aria-hidden="true" />
                            <span>
                                {relatorioCarregando
                                    ? "Gerando relatório..."
                                    : "Relatório anual"}
                            </span>
                        </button>
                    </article>
                </div>
            </div>

            {menuCompetencia && createPortal(
                <div
                    className="certidao-mensal-competencia-overlay"
                    onMouseDown={() => setMenuCompetencia(null)}
                >
                    <div
                        className="certidao-mensal-competencia-menu"
                        role="listbox"
                        aria-label="Selecionar competência mensal"
                        style={{ top: menuCompetencia.top, left: menuCompetencia.left }}
                        onMouseDown={(evento) => evento.stopPropagation()}
                    >
                        <header>
                            <CalendarDays aria-hidden="true" />
                            <div>
                                <strong>Selecionar competência</strong>
                                <span>Escolha um mês anterior</span>
                            </div>
                        </header>

                        <div className="certidao-mensal-competencia-menu__meses">
                            {COMPETENCIAS_DISPONIVEIS.map((item) => (
                                <button
                                    key={item}
                                    type="button"
                                    role="option"
                                    aria-selected={item === competencia}
                                    className={item === competencia ? "is-selected" : ""}
                                    onClick={() => {
                                        onSelecionarCompetencia?.(item);
                                        setMenuCompetencia(null);
                                    }}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </section>
    );
}
