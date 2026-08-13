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
    Landmark,
    ShieldCheck,
} from "lucide-react";
import {
    copiarDadosConsultaCndFederal,
    montarConsultaOficialAssistidaCndFederal,
} from "../official-validation/cndFederalOfficialValidation.js";

function obterTextoBotaoCnpj(
    estado,
    cnpj
) {
    if (estado === "copiado") {
        return "CNPJ copiado";
    }

    if (estado === "falha") {
        return "Não foi possível copiar";
    }

    if (!cnpj) {
        return "CNPJ não identificado";
    }

    return `Copiar CNPJ ${cnpj}`;
}

export function CertidaoConsultaOficialAssistida({
    avaliacao,
}) {
    const [estadoCopia, setEstadoCopia] =
        useState("aguardando");

    const consulta =
        useMemo(
            () =>
                montarConsultaOficialAssistidaCndFederal(
                    avaliacao
                ),
            [avaliacao]
        );

    if (!consulta.disponivel) {
        return null;
    }

    const copiarCnpj =
        async () => {
            if (!consulta.cnpjPortal) {
                return;
            }

            const copiado =
                await copiarDadosConsultaCndFederal(
                    consulta.cnpjPortal
                );

            setEstadoCopia(
                copiado
                    ? "copiado"
                    : "falha"
            );
        };

    return (
        <section className="certidao-consulta-oficial">
            <header className="certidao-consulta-oficial__header">
                <span className="certidao-consulta-oficial__icon">
                    <Landmark aria-hidden="true" />
                </span>

                <div>
                    <p>Fonte oficial gratuita</p>
                    <h3>
                        Consulta de certidões federais
                    </h3>
                    <span>
                        Consulte as certidões emitidas
                        utilizando o CNPJ encontrado no PDF.
                    </span>
                </div>

                <span className="certidao-consulta-oficial__mode">
                    <ShieldCheck aria-hidden="true" />
                    Sem API paga
                </span>
            </header>

            <div className="certidao-consulta-oficial__campos">
                {consulta.campos.map((item) => (
                    <div key={item.rotulo}>
                        <span>{item.rotulo}</span>
                        <strong>{item.valor}</strong>
                    </div>
                ))}
            </div>

            {consulta.bloqueiaConformidade && (
                <div className="certidao-consulta-oficial__warning">
                    <AlertTriangle aria-hidden="true" />

                    <div>
                        <strong>
                            A consulta não remove a reprovação atual
                        </strong>

                        <span>
                            {consulta.motivoBloqueio} Localizar
                            a certidão na Receita Federal confirma
                            sua existência, mas não corrige a
                            pendência documental identificada.
                        </span>
                    </div>
                </div>
            )}

            <div className="certidao-consulta-oficial__actions">
                <button
                    type="button"
                    className="certidao-consulta-oficial__copy"
                    disabled={
                        !consulta.cnpjPortalDisponivel
                    }
                    onClick={copiarCnpj}
                >
                    {estadoCopia === "copiado" ? (
                        <CheckCircle2 aria-hidden="true" />
                    ) : (
                        <Copy aria-hidden="true" />
                    )}

                    {obterTextoBotaoCnpj(
                        estadoCopia,
                        consulta.cnpjPortal
                    )}
                </button>

                <a
                    href={
                        consulta
                            .fonte
                            .urlPortalAtual
                    }
                    target="_blank"
                    rel="noreferrer noopener"
                >
                    <ExternalLink aria-hidden="true" />
                    Abrir Certidões Federais
                </a>
            </div>

            <div className="certidao-consulta-oficial__warning">
                <Building2 aria-hidden="true" />

                <div>
                    <strong>
                        Como realizar a consulta
                    </strong>

                    <span>
                        No portal da Receita Federal,
                        selecione Pessoa Jurídica, cole o CNPJ
                        copiado e consulte as certidões emitidas.
                        Compare natureza, emissão, validade e
                        código de controle com o PDF analisado.
                    </span>
                </div>
            </div>

            <footer>
                O SafeScan não preenche formulários externos,
                não envia a consulta automaticamente e não
                registra o resultado nesta etapa.
            </footer>
        </section>
    );
}