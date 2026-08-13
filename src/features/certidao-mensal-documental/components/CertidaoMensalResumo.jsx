import {
    AlertTriangle,
    Building2,
    CalendarClock,
    CheckCircle2,
    Clock3,
    CircleDot,
} from "lucide-react";

const ITENS_FAIXA = [
    {
        chave: "certidoesValidas",
        rotulo: "Certidões válidas",
        Icone: CheckCircle2,
        classe: "is-validas",
    },
    {
        chave: "emAnalise",
        rotulo: "Em análise",
        Icone: Clock3,
        classe: "is-analise",
    },
    {
        chave: "pendentes",
        rotulo: "Pendentes",
        Icone: CircleDot,
        classe: "is-pendentes",
    },
    {
        chave: "vencidas",
        rotulo: "Vencidas",
        Icone: AlertTriangle,
        classe: "is-vencidas",
    },
];

export function CertidaoMensalResumo({ resumo }) {
    return (
        <section
            className="certidao-mensal-resumo"
            aria-label="Resumo mensal da conformidade documental"
        >
            <article className="certidao-mensal-resumo__card certidao-mensal-resumo__card--contratadas">
                <small className="certidao-mensal-resumo__card-label">
                    Contratadas fiscalizadas
                </small>

                <div className="certidao-mensal-resumo__card-value">
                    <span className="certidao-mensal-resumo__card-icon">
                        <Building2 aria-hidden="true" />
                    </span>

                    <strong>{resumo.contratadasFiscalizadas}</strong>
                </div>
            </article>

            <article className="certidao-mensal-resumo__card certidao-mensal-resumo__card--critico">
                <small className="certidao-mensal-resumo__card-label">
                    Pendências críticas
                </small>

                <div className="certidao-mensal-resumo__card-value">
                    <span className="certidao-mensal-resumo__card-icon">
                        <AlertTriangle aria-hidden="true" />
                    </span>

                    <strong>{resumo.pendenciasCriticas}</strong>
                </div>

                <p>Requer atenção imediata</p>
            </article>

            <article className="certidao-mensal-resumo__faixa">
                <div className="certidao-mensal-resumo__faixa-grid">
                    {ITENS_FAIXA.map(({ chave, rotulo, Icone, classe }) => (
                        <div
                            key={chave}
                            className={`certidao-mensal-resumo__metric ${classe}`}
                        >
                            <div className="certidao-mensal-resumo__metric-head">
                                <small>{rotulo}</small>
                            </div>

                            <div className="certidao-mensal-resumo__metric-body">
                                <Icone aria-hidden="true" />
                                <strong>{resumo[chave]}</strong>
                            </div>
                        </div>
                    ))}

                    <div className="certidao-mensal-resumo__metric certidao-mensal-resumo__metric--update">
                        <div className="certidao-mensal-resumo__metric-head">
                            <small>Última atualização</small>
                        </div>

                        <div className="certidao-mensal-resumo__metric-body certidao-mensal-resumo__metric-body--update">
                            <CalendarClock aria-hidden="true" />
                            <strong>{resumo.ultimaAtualizacao}</strong>
                        </div>
                    </div>
                </div>
            </article>
        </section>
    );
}