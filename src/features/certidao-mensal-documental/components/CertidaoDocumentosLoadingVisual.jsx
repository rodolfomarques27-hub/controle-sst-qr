import {
    FileText,
    ShieldCheck,
} from "lucide-react";

export function CertidaoDocumentosLoadingVisual({
    titulo = "Carregando documentos",
    percentual = 0,
    atual = 0,
    total = 0,
}) {
    const percentualSeguro =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    percentual || 0
                )
            )
        );

    const percentualArredondado =
        Math.round(
            percentualSeguro
        );

    const totalSeguro =
        Math.max(
            0,
            Number(
                total || 0
            )
        );

    const atualSeguro =
        Math.max(
            0,
            Math.min(
                totalSeguro || Number(atual || 0),
                Number(
                    atual || 0
                )
            )
        );

    const concluido =
        percentualSeguro >= 100;

    return (
        <div
            className={
                concluido
                    ? "certidao-documentos-loading certidao-documentos-loading--concluido"
                    : "certidao-documentos-loading"
            }
            role="status"
            aria-live="polite"
            aria-label={titulo}
        >
            <div className="certidao-loading-refinado__card">
                <div className="certidao-loading-refinado__main">
                    <div
                        className="certidao-loading-refinado__icon"
                        aria-hidden="true"
                    >
                        <FileText />
                    </div>

                    <div className="certidao-loading-refinado__copy">
                        <span className="certidao-loading-refinado__eyebrow">
                            {concluido
                                ? "PROCESSAMENTO CONCLUÍDO"
                                : "PROCESSAMENTO EM ANDAMENTO"}
                        </span>

                        <strong
                            className="certidao-loading-refinado__title"
                            title={titulo}
                        >
                            {titulo}
                        </strong>
                    </div>

                    <div className="certidao-loading-refinado__percentual">
                        <strong>
                            {percentualArredondado}%
                        </strong>

                        <span>
                            {concluido
                                ? "CONCLUÍDO"
                                : "EM ANDAMENTO"}
                        </span>
                    </div>
                </div>

                {totalSeguro > 0 ? (
                    <div className="certidao-loading-refinado__contador">
                        <span>
                            {atualSeguro} de {totalSeguro} documentos
                        </span>

                        <span
                            className="certidao-loading-refinado__contador-separador"
                            aria-hidden="true"
                        >
                            •
                        </span>

                        <strong>
                            {concluido
                                ? "Concluído"
                                : "Em andamento"}
                        </strong>
                    </div>
                ) : null}

                <div
                    className="certidao-loading-refinado__progresso"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={percentualArredondado}
                    aria-label="Progresso da análise documental"
                >
                    <span
                        style={{
                            width:
                                `${percentualSeguro}%`,
                        }}
                    />
                </div>

                <div className="certidao-loading-refinado__aviso">
                    <ShieldCheck
                        aria-hidden="true"
                    />

                    <span>
                        {concluido
                            ? "Processamento documental concluído."
                            : "Não feche esta janela enquanto os documentos estiverem sendo processados."}
                    </span>
                </div>
            </div>
        </div>
    );
}
