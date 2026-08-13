import { useState } from "react";
import {
    AlertTriangle,
    RotateCcw,
    X,
} from "lucide-react";

const LIMITE_MOTIVO_REENVIO =
    500;

export function SolicitarReenvioDocumentoModal({
    documento,
    enviando = false,
    erro = "",
    onCancelar,
    onConfirmar,
}) {
    const [motivo, setMotivo] =
        useState("");

    const motivoNormalizado =
        motivo.trim();

    const caracteresRestantes =
        LIMITE_MOTIVO_REENVIO -
        motivo.length;

    const podeConfirmar =
        Boolean(
            motivoNormalizado &&
            motivo.length <=
                LIMITE_MOTIVO_REENVIO &&
            !enviando
        );

    const confirmar =
        async (evento) => {
            evento.preventDefault();

            if (!podeConfirmar) {
                return;
            }

            await onConfirmar?.(
                motivoNormalizado
            );
        };

    const fechar =
        () => {
            if (!enviando) {
                onCancelar?.();
            }
        };

    return (
        <div
            className="certidao-mensal-reenvio-modal__overlay"
            onMouseDown={fechar}
        >
            <section
                className="certidao-mensal-reenvio-modal__dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="certidao-reenvio-titulo"
                onMouseDown={(evento) =>
                    evento.stopPropagation()
                }
                onKeyDown={(evento) => {
                    if (
                        evento.key ===
                        "Escape"
                    ) {
                        fechar();
                    }
                }}
            >
                <header className="certidao-mensal-reenvio-modal__header">
                    <span className="certidao-mensal-reenvio-modal__icone">
                        <RotateCcw aria-hidden="true" />
                    </span>

                    <div>
                        <p>Tratativa documental</p>

                        <h2 id="certidao-reenvio-titulo">
                            Solicitar documento atualizado
                        </h2>

                        <span>
                            {documento?.titulo ||
                                "Documento mensal"}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="certidao-mensal-reenvio-modal__fechar"
                        aria-label="Fechar solicitação"
                        onClick={fechar}
                        disabled={enviando}
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>

                <form onSubmit={confirmar}>
                    <div className="certidao-mensal-reenvio-modal__body">
                        <div className="certidao-mensal-reenvio-modal__aviso">
                            <AlertTriangle aria-hidden="true" />

                            <div>
                                <strong>
                                    Informe o motivo da solicitação
                                </strong>

                                <span>
                                    O motivo ficará registrado na
                                    trilha de auditoria da competência.
                                </span>
                            </div>
                        </div>

                        <label htmlFor="certidao-reenvio-motivo">
                            Motivo obrigatório
                        </label>

                        <textarea
                            id="certidao-reenvio-motivo"
                            value={motivo}
                            maxLength={
                                LIMITE_MOTIVO_REENVIO
                            }
                            rows={5}
                            autoFocus
                            placeholder="Exemplo: documento vencido; enviar nova certidão dentro da validade."
                            onChange={(evento) =>
                                setMotivo(
                                    evento.target.value
                                )
                            }
                            disabled={enviando}
                        />

                        <div className="certidao-mensal-reenvio-modal__contador">
                            <span>
                                Máximo de 500 caracteres
                            </span>

                            <strong>
                                {caracteresRestantes}
                            </strong>
                        </div>

                        {erro && (
                            <p
                                className="certidao-mensal-reenvio-modal__erro"
                                role="alert"
                            >
                                {erro}
                            </p>
                        )}
                    </div>

                    <footer className="certidao-mensal-reenvio-modal__footer">
                        <button
                            type="button"
                            className="is-secundario"
                            onClick={fechar}
                            disabled={enviando}
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            className="is-principal"
                            disabled={!podeConfirmar}
                        >
                            <RotateCcw aria-hidden="true" />

                            {enviando
                                ? "Registrando..."
                                : "Solicitar atualização"}
                        </button>
                    </footer>
                </form>
            </section>
        </div>
    );
}
