import {
    useMemo,
    useState,
} from "react";
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Copy,
    ExternalLink,
    ShieldCheck,
} from "lucide-react";
import {
    copiarCampoCrf,
    montarValidacaoAssistidaCrf,
} from "../official-validation/crfOfficialValidation.js";

function obterTextoBotao({
    rotulo,
    estado,
    valor,
}) {
    if (
        estado ===
        "copiado"
    ) {
        return `${rotulo} copiado`;
    }

    if (
        estado ===
        "falha"
    ) {
        return "Falha ao copiar";
    }

    return (
        `Copiar ${rotulo.toLowerCase()} ` +
        valor
    );
}

export function CertidaoConsultaOficialCrf({
    avaliacao,
}) {
    const [copias, setCopias] =
        useState({
            cnpj:
                "aguardando",
            numero:
                "aguardando",
        });

    const consulta =
        useMemo(
            () =>
                montarValidacaoAssistidaCrf(
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
                await copiarCampoCrf(
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
                    <Building2 aria-hidden="true" />
                </span>

                <div>
                    <p>Fonte oficial gratuita</p>

                    <h3>
                        Consulta de regularidade do FGTS
                    </h3>

                    <span>
                        Consulte o empregador e confira o
                        CRF diretamente no portal da CAIXA.
                    </span>
                </div>

                <span className="certidao-consulta-oficial__mode">
                    <ShieldCheck aria-hidden="true" />
                    Sem API paga
                </span>
            </header>

            <div className="certidao-consulta-oficial__campos">
                {consulta.campos.map(
                    (campo) => (
                        <div key={campo.rotulo}>
                            <span>
                                {campo.rotulo}
                            </span>

                            <strong>
                                {campo.valor}
                            </strong>
                        </div>
                    )
                )}
            </div>

            {consulta.mantemPendencia && (
                <div className="certidao-consulta-oficial__warning">
                    <AlertTriangle aria-hidden="true" />

                    <div>
                        <strong>
                            A consulta não remove a
                            reprovação atual
                        </strong>

                        <span>
                            {consulta.motivoPendencia}
                            {" "}
                            A fonte oficial pode confirmar
                            a autenticidade ou localizar
                            outro certificado, mas não
                            corrige automaticamente a
                            pendência documental.
                        </span>
                    </div>
                </div>
            )}

            <div className="certidao-consulta-oficial__actions">
                <button
                    type="button"
                    className="certidao-consulta-oficial__copy"
                    disabled={
                        !consulta.cnpjConsultavel
                    }
                    onClick={() =>
                        copiar(
                            "cnpj",
                            consulta.cnpj
                        )
                    }
                >
                    {copias.cnpj ===
                    "copiado" ? (
                        <CheckCircle2 aria-hidden="true" />
                    ) : (
                        <Copy aria-hidden="true" />
                    )}

                    {consulta.cnpjConsultavel
                        ? obterTextoBotao({
                            rotulo:
                                "CNPJ",
                            estado:
                                copias.cnpj,
                            valor:
                                consulta.cnpj,
                        })
                        : "CNPJ não identificado"}
                </button>

                {consulta.numeroCertificacao && (
                    <button
                        type="button"
                        onClick={() =>
                            copiar(
                                "numero",
                                consulta
                                    .numeroCertificacao
                            )
                        }
                    >
                        {copias.numero ===
                        "copiado" ? (
                            <CheckCircle2 aria-hidden="true" />
                        ) : (
                            <Copy aria-hidden="true" />
                        )}

                        {obterTextoBotao({
                            rotulo:
                                "Número",
                            estado:
                                copias.numero,
                            valor:
                                consulta
                                    .numeroCertificacao,
                        })}
                    </button>
                )}

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
                    Abrir consulta CRF
                </a>
            </div>

            <footer>
                Na CAIXA, selecione CNPJ, cole os 14
                números, deixe a UF em branco e conclua
                a verificação humana. Compare razão social,
                validade e número de certificação com o PDF.
                O SafeScan não envia o formulário.
            </footer>
        </section>
    );
}