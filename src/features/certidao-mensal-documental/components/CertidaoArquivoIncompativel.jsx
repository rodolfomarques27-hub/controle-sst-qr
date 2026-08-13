import {
    AlertTriangle,
    FileWarning,
    RefreshCw,
    ShieldX,
} from "lucide-react";

function formatarTamanho(
    bytes
) {
    const valor =
        Number(bytes || 0);

    if (
        !Number.isFinite(valor) ||
        valor <= 0
    ) {
        return "";
    }

    return `${(
        valor /
        (1024 * 1024)
    ).toFixed(2)} MB`;
}

export function CertidaoArquivoIncompativel({
    tentativa,
    onSelecionarOutro,
    processando = false,
}) {
    if (!tentativa) {
        return null;
    }

    const tamanho =
        formatarTamanho(
            tentativa.tamanhoBytes
        );

    return (
        <section className="certidao-arquivo-recusado">
            <header>
                <span className="certidao-arquivo-recusado__icon">
                    <ShieldX aria-hidden="true" />
                </span>

                <div>
                    <p>Trava documental</p>
                    <h3>Arquivo incompatível</h3>
                    <span>
                        O PDF foi lido somente para identificar
                        seu tipo e não substituiu o último
                        documento aceito.
                    </span>
                </div>
            </header>

            <div className="certidao-arquivo-recusado__grid">
                <div>
                    <span>Arquivo recusado</span>
                    <strong>
                        {tentativa.nomeArquivo}
                    </strong>

                    {tamanho && (
                        <small>{tamanho}</small>
                    )}
                </div>

                <div>
                    <span>Documento esperado</span>
                    <strong>
                        {tentativa.documentoEsperado}
                    </strong>
                </div>

                <div>
                    <span>Documento identificado</span>
                    <strong>
                        {tentativa.documentoIdentificado}
                    </strong>
                </div>
            </div>

            <div className="certidao-arquivo-recusado__aviso">
                <AlertTriangle aria-hidden="true" />

                <div>
                    <strong>
                        Avaliador específico não executado
                    </strong>

                    <span>
                        {tentativa.mensagem}
                        {" "}
                        Nenhuma data, validade, número ou regra
                        do documento esperado foi aproveitada.
                    </span>
                </div>
            </div>

            <footer>
                <span>
                    <FileWarning aria-hidden="true" />
                    O arquivo permanece somente no navegador
                    durante esta tentativa.
                </span>

                <button
                    type="button"
                    onClick={onSelecionarOutro}
                    disabled={processando}
                >
                    <RefreshCw aria-hidden="true" />
                    Selecionar outro arquivo
                </button>
            </footer>
        </section>
    );
}