export const EVENTO_CONFIRMACAO_SAFESCAN =
    "safescan:confirmacao";

const VARIANTES_CONFIRMACAO_SAFESCAN =
    new Set([
        "padrao",
        "atencao",
        "perigo",
    ]);

let sequenciaConfirmacao =
    0;

export function confirmarSafeScan({
    titulo = "Confirmar ação",
    mensagem = "",
    confirmarTexto = "Confirmar",
    cancelarTexto = "Cancelar",
    variante = "padrao",
} = {}) {
    const mensagemNormalizada =
        String(
            mensagem ?? ""
        ).trim();

    if (!mensagemNormalizada) {
        return Promise.resolve(
            false
        );
    }

    if (
        typeof globalThis.dispatchEvent !==
            "function" ||
        typeof globalThis.CustomEvent !==
            "function"
    ) {
        return Promise.resolve(
            false
        );
    }

    const id =
        ++sequenciaConfirmacao;

    return new Promise(
        (resolve) => {
            let concluida =
                false;

            const concluir =
                (resultado) => {
                    if (concluida) {
                        return;
                    }

                    concluida =
                        true;

                    resolve(
                        resultado === true
                    );
                };

            const evento =
                new globalThis.CustomEvent(
                    EVENTO_CONFIRMACAO_SAFESCAN,
                    {
                        cancelable:
                            true,
                        detail: {
                            id,
                            titulo:
                                String(
                                    titulo ?? ""
                                ).trim() ||
                                "Confirmar ação",
                            mensagem:
                                mensagemNormalizada,
                            confirmarTexto:
                                String(
                                    confirmarTexto ?? ""
                                ).trim() ||
                                "Confirmar",
                            cancelarTexto:
                                String(
                                    cancelarTexto ?? ""
                                ).trim() ||
                                "Cancelar",
                            variante:
                                VARIANTES_CONFIRMACAO_SAFESCAN.has(
                                    variante
                                )
                                    ? variante
                                    : "padrao",
                            concluir,
                        },
                    }
                );

            globalThis.dispatchEvent(
                evento
            );

            if (
                !evento.defaultPrevented
            ) {
                concluir(
                    false
                );
            }
        }
    );
}
