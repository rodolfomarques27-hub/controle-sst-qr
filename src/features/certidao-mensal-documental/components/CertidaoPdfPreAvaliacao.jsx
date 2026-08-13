import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    FileCheck2,
    FileSearch,
    ShieldAlert,
} from "lucide-react";
import {
    CertidaoConsultaOficialAssistida,
} from "./CertidaoConsultaOficialAssistida.jsx";
import {
    CertidaoConsultaOficialCndt,
} from "./CertidaoConsultaOficialCndt.jsx";
import {
    CertidaoConsultaOficialCrf,
} from "./CertidaoConsultaOficialCrf.jsx";
import {
    CertidaoFgtsDetalhes,
} from "./CertidaoFgtsDetalhes.jsx";
import {
    CertidaoFolhaPagamentoDetalhes,
} from "./CertidaoFolhaPagamentoDetalhes.jsx";

function obterIcone(nivel) {
    switch (nivel) {
        case "REPROVADA":
            return ShieldAlert;

        case "ALERTA":
            return AlertTriangle;

        case "APROVADA":
            return CheckCircle2;

        default:
            return FileSearch;
    }
}

function obterClasse(nivel) {
    return String(nivel || "")
        .trim()
        .toLowerCase();
}

function obterTextoConsultaOficial(
    avaliacao
) {
    if (
        avaliacao
            ?.obrigacaoComposta
            ?.obrigacaoId ===
        "fgts"
    ) {
        return "Conferência humana obrigatória";
    }

    if (
        avaliacao.codigo ===
        "DIVERGENCIA_CNPJ"
    ) {
        return "Aguardando correção documental";
    }

    if (
        avaliacao.codigo ===
        "DOCUMENTO_VENCIDO"
    ) {
        return "Documento vencido";
    }

    if (
        avaliacao.codigo ===
        "DATA_EMISSAO_FUTURA"
    ) {
        return "Data inconsistente";
    }

    return avaliacao.requerConsultaOficial
        ? "Necessária"
        : "Não aplicável nesta situação";
}

function obterSituacaoTemporal(
    avaliacao
) {
    const situacao =
        avaliacao
            ?.dadosTemporais
            ?.situacaoValidade;

    if (!situacao) {
        return "Não identificada";
    }

    if (
        situacao.codigo === "VALIDA" &&
        Number.isFinite(
            situacao.diasRestantes
        )
    ) {
        return (
            `${situacao.rotulo} · ` +
            `${situacao.diasRestantes} dia(s)`
        );
    }

    return situacao.rotulo ||
        "Não identificada";
}

function Campo({
    rotulo,
    valor,
}) {
    return (
        <div className="certidao-pdf-pre__campo">
            <span>{rotulo}</span>
            <strong>{valor || "Não identificado"}</strong>
        </div>
    );
}

export function CertidaoPdfPreAvaliacao({
    preAvaliacao,
}) {
    const avaliacao =
        preAvaliacao?.avaliacao;

    if (!avaliacao) {
        return null;
    }

    if (avaliacao.documentoIncompativel) {
        return null;
    }

    const IconeResultado =
        obterIcone(
            avaliacao.nivel
        );

    const ehFgts =
        avaliacao
            ?.obrigacaoComposta
            ?.obrigacaoId ===
        "fgts";

    const ehFolhaPonto =
        avaliacao
            ?.documentoIdentificado ===
        "Espelho de Ponto";

    const rotuloCodigo =
        ehFgts
            ? "Identificador da guia"
            : (
                avaliacao.documentoIdentificado ===
                "CNDT"
                    ? "Número da certidão"
                    : (
                        avaliacao.documentoIdentificado ===
                        "CRF FGTS"
                            ? "Número de certificação"
                            : "Código de controle"
                    )
            );

    const ehInssDctfweb =
        Boolean(
            avaliacao
                ?.dadosInssDctfweb
        );

    const ehCertidaoIssqn =
        Boolean(
            avaliacao
                ?.dadosIss
                ?.certidaoIssqn
        );

    const rotuloNatureza =
        (
            ehFgts ||
            ehFolhaPonto ||
            ehInssDctfweb
        )
            ? "Natureza do documento"
            : "Natureza da certidão";

    const rotuloEmissao =
        ehFgts
            ? "Data de geração"
            : ehFolhaPonto
                ? "Período apurado"
                : ehInssDctfweb
                    ? "Vencimento"
                    : "Data de emissão";

    const rotuloValidade =
        ehFgts
            ? "Vencimento"
            : "Validade";

    const rotuloSituacaoTemporal =
        ehFgts
            ? "Situação do vencimento"
            : "Situação temporal";

    return (
        <section
            className={`certidao-pdf-pre is-${obterClasse(
                avaliacao.nivel
            )}`}
        >
            <header className="certidao-pdf-pre__header">
                <IconeResultado aria-hidden="true" />

                <div>
                    <p>Pré-avaliação automática</p>
                    <h3>{avaliacao.rotulo}</h3>
                    <span>{avaliacao.mensagem}</span>
                </div>
            </header>

            <div className="certidao-pdf-pre__campos">
                <Campo
                    rotulo="Documento esperado"
                    valor={avaliacao.documentoEsperado}
                />

                <Campo
                    rotulo="Documento identificado"
                    valor={avaliacao.documentoIdentificado}
                />

                <Campo
                    rotulo="Empresa selecionada"
                    valor={avaliacao.empresaEsperada}
                />

                <Campo
                    rotulo="Empresa encontrada no PDF"
                    valor={avaliacao.razaoSocialDocumento}
                />

                <Campo
                    rotulo="CNPJ esperado"
                    valor={avaliacao.cnpjEsperado}
                />

                <Campo
                    rotulo="CNPJ encontrado no PDF"
                    valor={avaliacao.cnpjDocumento}
                />

                <Campo
                    rotulo={rotuloNatureza}
                    valor={
                        ehInssDctfweb
                            ? (
                                avaliacao
                                    ?.dadosInssDctfweb
                                    ?.variante
                            )
                            : ehCertidaoIssqn
                                ? (
                                    avaliacao
                                        ?.dadosIss
                                        ?.variante ||
                                    avaliacao
                                        ?.documentoIdentificado
                                )
                                : avaliacao.natureza?.rotulo
                    }
                />

                <Campo
                    rotulo={rotuloEmissao}
                    valor={
                        ehFolhaPonto
                            ? (
                                avaliacao
                                    ?.dadosFolhaPonto
                                    ?.periodoApurado
                            )
                            : ehInssDctfweb
                                ? (
                                    avaliacao
                                        ?.dadosInssDctfweb
                                        ?.vencimento
                                )
                                : (
                                    avaliacao
                                        ?.dadosTemporais
                                        ?.dataEmissao
                                )
                    }
                />

                <Campo
                    rotulo={rotuloValidade}
                    valor={
                        avaliacao
                            ?.dadosTemporais
                            ?.dataValidade
                    }
                />

                <Campo
                    rotulo={rotuloSituacaoTemporal}
                    valor={
                        obterSituacaoTemporal(
                            avaliacao
                        )
                    }
                />

                <Campo
                    rotulo={rotuloCodigo}
                    valor={
                        avaliacao.codigoControle
                    }
                />

                <Campo
                    rotulo="Consulta oficial"
                    valor={
                        obterTextoConsultaOficial(
                            avaliacao
                        )
                    }
                />
            </div>

            <CertidaoFgtsDetalhes
                avaliacao={avaliacao}
            />

            <CertidaoFolhaPagamentoDetalhes
                avaliacao={avaliacao}
            />

            {avaliacao.regras?.length > 0 && (
                <div className="certidao-pdf-pre__regras">
                    {avaliacao.regras.map((regra) => {
                        const aprovada =
                            regra.status ===
                            "APROVADA";

                        return (
                            <article
                                key={regra.codigo}
                                className={`is-${regra.status.toLowerCase()}`}
                            >
                                {aprovada ? (
                                    <FileCheck2 aria-hidden="true" />
                                ) : (
                                    <Building2 aria-hidden="true" />
                                )}

                                <div>
                                    <strong>{regra.titulo}</strong>
                                    <span>{regra.mensagem}</span>
                                </div>

                                <small>{regra.status}</small>
                            </article>
                        );
                    })}
                </div>
            )}

            <CertidaoConsultaOficialAssistida
                avaliacao={avaliacao}
            />

            <CertidaoConsultaOficialCndt
                avaliacao={avaliacao}
            />

            <CertidaoConsultaOficialCrf
                avaliacao={avaliacao}
            />

            <footer>
                Resultado preliminar. A decisão final exige conferência humana
                e, quando aplicável, validação na fonte oficial.
            </footer>
        </section>
    );
}