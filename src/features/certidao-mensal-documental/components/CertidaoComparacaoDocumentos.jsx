import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    FileDiff,
    RefreshCw,
    ShieldAlert,
} from "lucide-react";
import {
    compararCertidoesDocumentais,
} from "../analysis/compararCertidoesDocumentais.js";

function obterIcone(nivel) {
    switch (nivel) {
        case "REPROVADA":
            return ShieldAlert;

        case "ALERTA":
            return AlertTriangle;

        default:
            return FileDiff;
    }
}

function obterClasse(nivel) {
    return String(nivel || "")
        .trim()
        .toLowerCase();
}

export function CertidaoComparacaoDocumentos({
    resultadoAnterior,
    resultadoAtual,
}) {
    const comparacao =
        compararCertidoesDocumentais({
            resultadoAnterior,
            resultadoAtual,
        });

    if (!comparacao.disponivel) {
        return null;
    }

    const IconeResultado =
        obterIcone(
            comparacao.nivel
        );

    return (
        <section
            className={`certidao-comparacao is-${obterClasse(
                comparacao.nivel
            )}`}
        >
            <header className="certidao-comparacao__header">
                <span className="certidao-comparacao__icon">
                    <IconeResultado aria-hidden="true" />
                </span>

                <div>
                    <p>
                        Comparação local — {comparacao.tituloDocumento}
                    </p>
                    <h3>{comparacao.rotulo}</h3>
                    <span>{comparacao.mensagem}</span>
                </div>

                <span className="certidao-comparacao__local">
                    <RefreshCw aria-hidden="true" />
                    Sem persistência
                </span>
            </header>

            <div className="certidao-comparacao__flags">
                <span
                    className={
                        comparacao.mesmoArquivo
                            ? "is-alerta"
                            : "is-ok"
                    }
                >
                    {comparacao.mesmoArquivo ? (
                        <AlertTriangle aria-hidden="true" />
                    ) : (
                        <CheckCircle2 aria-hidden="true" />
                    )}

                    {comparacao.mesmoArquivo
                        ? "Arquivo repetido"
                        : "Novo arquivo identificado"}
                </span>

                <span
                    className={
                        comparacao.emissaoMaisRecente
                            ? "is-ok"
                            : "is-alerta"
                    }
                >
                    {comparacao.emissaoMaisRecente ? (
                        <CheckCircle2 aria-hidden="true" />
                    ) : (
                        <AlertTriangle aria-hidden="true" />
                    )}

                    {comparacao.emissaoMaisRecente
                        ? "Emissão mais recente"
                        : "Emissão não avançou"}
                </span>

                <span
                    className={
                        comparacao.atualPertenceEmpresa
                            ? "is-ok"
                            : "is-erro"
                    }
                >
                    {comparacao.atualPertenceEmpresa ? (
                        <CheckCircle2 aria-hidden="true" />
                    ) : (
                        <ShieldAlert aria-hidden="true" />
                    )}

                    {comparacao.atualPertenceEmpresa
                        ? "CNPJ corresponde"
                        : "CNPJ ainda divergente"}
                </span>

                <span
                    className={
                        comparacao.atualVigente
                            ? "is-ok"
                            : "is-erro"
                    }
                >
                    {comparacao.atualVigente ? (
                        <CheckCircle2 aria-hidden="true" />
                    ) : (
                        <ShieldAlert aria-hidden="true" />
                    )}

                    {comparacao.atualVigente
                        ? "Novo documento vigente"
                        : "Novo documento vencido"}
                </span>
            </div>

            <div className="certidao-comparacao__grid">
                {comparacao.campos.map((campo) => (
                    <article key={campo.rotulo}>
                        <strong>{campo.rotulo}</strong>

                        <div>
                            <span>
                                <small>Anterior</small>
                                <b>{campo.anterior}</b>
                            </span>

                            <ArrowRight aria-hidden="true" />

                            <span>
                                <small>Novo PDF</small>
                                <b>{campo.atual}</b>
                            </span>
                        </div>

                        {campo.alterado && (
                            <em>Informação alterada</em>
                        )}
                    </article>
                ))}
            </div>

            <footer>
                A comparação ocorre somente no navegador e não substitui
                a conferência humana nem a validação na fonte oficial.
            </footer>
        </section>
    );
}