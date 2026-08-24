import {
    LoaderCircle,
} from "lucide-react";

export function CertidaoDocumentosLoadingVisual({
    titulo = "Carregando documentos",
    mensagem = "",
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

    return (
        <div
            className="certidao-documentos-loading"
            role="status"
            aria-live="polite"
        >
            <div
                className="certidao-documentos-loading__art"
                aria-hidden="true"
            >
                <div className="certidao-documentos-loading__single">
                    <LoaderCircle />
                </div>
            </div>

            <div className="certidao-documentos-loading__copy">
                <strong>
                    {titulo}
                </strong>

                {mensagem ? (
                    <span>
                        {mensagem}
                    </span>
                ) : null}

                {total > 0 ? (
                    <small>
                        {atual} de {total} documentos
                    </small>
                ) : null}
            </div>

            <div
                className="certidao-documentos-loading__progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentualSeguro}
                aria-label="Progresso da análise documental"
            >
                <span
                    style={{
                        width:
                            `${percentualSeguro}%`,
                    }}
                />
            </div>

            <small className="certidao-documentos-loading__percent">
                {Math.round(
                    percentualSeguro
                )}%
            </small>
        </div>
    );
}