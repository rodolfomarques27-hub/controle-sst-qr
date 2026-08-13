import {
    BadgeCheck,
    Building2,
    FileSpreadsheet,
    ReceiptText,
    ShieldCheck,
} from "lucide-react";

function valorOuPadrao(
    valor,
    padrao = "Não identificado"
) {
    if (
        valor === 0 ||
        valor === false
    ) {
        return String(valor);
    }

    return valor || padrao;
}

function simNaoIndeterminado(
    valor
) {
    if (valor === true) {
        return "Sim";
    }

    if (valor === false) {
        return "Não";
    }

    return "Não confirmado";
}

function CampoFolha({
    rotulo,
    valor,
}) {
    return (
        <div className="certidao-fgts-resumo__campo">
            <span>
                {rotulo}
            </span>

            <strong>
                {valorOuPadrao(
                    valor
                )}
            </strong>
        </div>
    );
}

export function CertidaoFolhaPagamentoDetalhes({
    avaliacao,
}) {
    const dados =
        avaliacao
            ?.dadosFolhaPagamento;

    if (!dados) {
        return null;
    }

    const pacoteCompleto =
        Boolean(
            dados.pacoteCompleto
        );

    const divergente =
        avaliacao?.nivel ===
        "REPROVADA";

    const inconclusivo =
        avaliacao?.nivel ===
        "INCONCLUSIVA";

    const tituloSituacao =
        divergente
            ? "Divergência localizada"
            : pacoteCompleto
                ? "Pacote localizado"
                : "Conjunto incompleto";

    const classeSituacao =
        divergente
            ? "is-reprovada"
            : inconclusivo
                ? "is-inconclusiva"
                : "is-alerta";

    const quantidadeHolerites =
        Number(
            dados
                .quantidadeHoleritesEstimada ||
            0
        );

    return (
        <section
            className={
                "certidao-fgts-resumo " +
                classeSituacao
            }
        >
            <header className="certidao-fgts-resumo__header">
                <span className="certidao-fgts-resumo__icone">
                    <FileSpreadsheet aria-hidden="true" />
                </span>

                <div>
                    <p>
                        Obrigação mensal composta
                    </p>

                    <h3>
                        Folha de Pagamento e Comprovantes
                    </h3>

                    <span>
                        O SafeScan identifica evidências objetivas.
                        A conferência salarial e a decisão final
                        permanecem humanas.
                    </span>
                </div>

                <strong className="certidao-fgts-resumo__situacao">
                    {tituloSituacao}
                </strong>
            </header>

            <div className="certidao-fgts-resumo__grid">
                <article className="certidao-fgts-resumo__bloco">
                    <header>
                        <FileSpreadsheet aria-hidden="true" />

                        <div>
                            <strong>
                                Folha de Pagamento
                            </strong>

                            <span>
                                Evidência consolidada da competência.
                            </span>
                        </div>
                    </header>

                    <div className="certidao-fgts-resumo__campos">
                        <CampoFolha
                            rotulo="Folha localizada"
                            valor={
                                dados.folhaLocalizada
                                    ? "Sim"
                                    : "Não"
                            }
                        />

                        <CampoFolha
                            rotulo="Competência localizada"
                            valor={
                                dados.competencia
                            }
                        />

                        <CampoFolha
                            rotulo="Competência esperada"
                            valor={
                                dados.competenciaEsperada
                            }
                        />

                        <CampoFolha
                            rotulo="Competência confere"
                            valor={
                                simNaoIndeterminado(
                                    dados.competenciaConfere
                                )
                            }
                        />
                    </div>
                </article>

                <article className="certidao-fgts-resumo__bloco">
                    <header>
                        <ReceiptText aria-hidden="true" />

                        <div>
                            <strong>
                                Complementos no PDF
                            </strong>

                            <span>
                                Holerites eventualmente incorporados ao mesmo arquivo.
                            </span>
                        </div>
                    </header>

                    <div className="certidao-fgts-resumo__campos">
                        <CampoFolha
                            rotulo="Holerites localizados"
                            valor={
                                dados.holeritesLocalizados
                                    ? "Sim"
                                    : "Não"
                            }
                        />

                        <CampoFolha
                            rotulo="Ocorrências estimadas"
                            valor={
                                quantidadeHolerites > 0
                                    ? String(
                                        quantidadeHolerites
                                    )
                                    : "Não determinada"
                            }
                        />

                        <CampoFolha
                            rotulo="Documento principal"
                            valor={
                                pacoteCompleto
                                    ? "Sim"
                                    : "Não"
                            }
                        />
                    </div>
                </article>

                <article className="certidao-fgts-resumo__bloco">
                    <header>
                        <Building2 aria-hidden="true" />

                        <div>
                            <strong>
                                Empresa
                            </strong>

                            <span>
                                Identificação encontrada no conjunto.
                            </span>
                        </div>
                    </header>

                    <div className="certidao-fgts-resumo__campos">
                        <CampoFolha
                            rotulo="Razão social"
                            valor={
                                dados.razaoSocial
                            }
                        />

                        <CampoFolha
                            rotulo="CNPJ localizado"
                            valor={
                                dados.cnpj
                            }
                        />

                        <CampoFolha
                            rotulo="CNPJ esperado"
                            valor={
                                dados.cnpjEsperado
                            }
                        />

                        <CampoFolha
                            rotulo="CNPJ confere"
                            valor={
                                simNaoIndeterminado(
                                    dados.cnpjConfere
                                )
                            }
                        />
                    </div>
                </article>

                <article className="certidao-fgts-resumo__bloco">
                    <header>
                        <ShieldCheck aria-hidden="true" />

                        <div>
                            <strong>
                                Conferência assistida
                            </strong>

                            <span>
                                Limites da verificação automática.
                            </span>
                        </div>
                    </header>

                    <div className="certidao-fgts-resumo__campos">
                        <CampoFolha
                            rotulo="Empresa compatível"
                            valor={
                                simNaoIndeterminado(
                                    dados.cnpjConfere
                                )
                            }
                        />

                        <CampoFolha
                            rotulo="Competência compatível"
                            valor={
                                simNaoIndeterminado(
                                    dados.competenciaConfere
                                )
                            }
                        />

                        <CampoFolha
                            rotulo="Decisão humana"
                            valor="Obrigatória"
                        />
                    </div>
                </article>
            </div>

            <div className="certidao-fgts-resumo__rodape certidao-folha-resumo__rodape">
                <div className="certidao-folha-resumo__conferencia-texto">
                    <strong>
                        Conferência manual obrigatória
                    </strong>

                    <span>
                        Dados da folha e comprovantes de pagamento exigem
                        conferência humana. A aprovação não é automática.
                    </span>
                </div>
            </div>
        </section>
    );
}