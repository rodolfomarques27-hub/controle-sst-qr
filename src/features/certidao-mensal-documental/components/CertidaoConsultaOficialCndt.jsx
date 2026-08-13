import {
    useMemo,
    useState,
} from "react";
import {
    AlertTriangle,
    CheckCircle2,
    Copy,
    ExternalLink,
    Scale,
    ShieldCheck,
} from "lucide-react";
import {
    copiarCampoCndt,
    montarValidacaoAssistidaCndt,
} from "../official-validation/cndtOfficialValidation.js";

function textoBotao(
    rotulo,
    estado,
    valor
) {
    if (estado === "copiado") {
        return `${rotulo} copiado`;
    }

    if (estado === "falha") {
        return "Falha ao copiar";
    }

    return `Copiar ${rotulo.toLowerCase()} ${valor}`;
}

export function CertidaoConsultaOficialCndt({
    avaliacao,
}) {
    const [copias, setCopias] =
        useState({
            cnpj: "aguardando",
            numero: "aguardando",
            ano: "aguardando",
        });

    const consulta =
        useMemo(
            () =>
                montarValidacaoAssistidaCndt(
                    avaliacao
                ),
            [avaliacao]
        );

    if (!consulta.disponivel) {
        return null;
    }

    const copiar =
        async (
            campo,
            valor
        ) => {
            const copiado =
                await copiarCampoCndt(
                    valor
                );

            setCopias(
                (estadoAtual) => ({
                    ...estadoAtual,
                    [campo]:
                        copiado
                            ? "copiado"
                            : "falha",
                })
            );
        };

    return (
        <section className="certidao-consulta-oficial">
            <header className="certidao-consulta-oficial__header">
                <span className="certidao-consulta-oficial__icon">
                    <Scale aria-hidden="true" />
                </span>

                <div>
                    <p>Fonte oficial gratuita</p>
                    <h3>Validação oficial da CNDT</h3>
                    <span>
                        Confira a autenticidade no portal
                        do Tribunal Superior do Trabalho.
                    </span>
                </div>

                <span className="certidao-consulta-oficial__mode">
                    <ShieldCheck aria-hidden="true" />
                    Sem API paga
                </span>
            </header>

            <div className="certidao-consulta-oficial__campos">
                {consulta.campos.map((campo) => (
                    <div key={campo.rotulo}>
                        <span>{campo.rotulo}</span>
                        <strong>{campo.valor}</strong>
                    </div>
                ))}
            </div>

            {consulta.bloqueiaConformidade && (
                <div className="certidao-consulta-oficial__warning">
                    <AlertTriangle aria-hidden="true" />

                    <div>
                        <strong>
                            A validação não remove a reprovação atual
                        </strong>

                        <span>
                            {consulta.motivoBloqueio}
                            {" "}
                            O portal pode confirmar a autenticidade,
                            mas não corrige a pendência documental.
                        </span>
                    </div>
                </div>
            )}

            <div className="certidao-consulta-oficial__actions">
                <button
                    type="button"
                    className="certidao-consulta-oficial__copy"
                    onClick={() =>
                        copiar(
                            "cnpj",
                            consulta.cnpj
                        )
                    }
                >
                    {copias.cnpj === "copiado" ? (
                        <CheckCircle2 aria-hidden="true" />
                    ) : (
                        <Copy aria-hidden="true" />
                    )}

                    {textoBotao(
                        "CNPJ",
                        copias.cnpj,
                        consulta.cnpj
                    )}
                </button>

                <button
                    type="button"
                    onClick={() =>
                        copiar(
                            "numero",
                            consulta.numero
                        )
                    }
                >
                    {copias.numero === "copiado" ? (
                        <CheckCircle2 aria-hidden="true" />
                    ) : (
                        <Copy aria-hidden="true" />
                    )}

                    {textoBotao(
                        "Número",
                        copias.numero,
                        consulta.numero
                    )}
                </button>

                <button
                    type="button"
                    onClick={() =>
                        copiar(
                            "ano",
                            consulta.ano
                        )
                    }
                >
                    {copias.ano === "copiado" ? (
                        <CheckCircle2 aria-hidden="true" />
                    ) : (
                        <Copy aria-hidden="true" />
                    )}

                    {textoBotao(
                        "Ano",
                        copias.ano,
                        consulta.ano
                    )}
                </button>

                <a
                    href={
                        consulta
                            .fonte
                            .urlPortal
                    }
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    <ExternalLink aria-hidden="true" />
                    Abrir portal da CNDT
                </a>
            </div>

            <footer>
                No portal do TST, selecione Validar Certidão
                e informe CNPJ, número e ano. O SafeScan não
                preenche nem envia o formulário automaticamente.
            </footer>
        </section>
    );
}