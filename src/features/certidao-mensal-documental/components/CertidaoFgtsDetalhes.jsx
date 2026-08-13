import {
    BadgeCheck,
    CalendarDays,
    CircleDollarSign,
    Clock3,
    FileCheck2,
    ShieldAlert,
    UsersRound,
    WalletCards,
} from "lucide-react";

function valorOuPadrao(
    valor,
    padrao = "Não identificado"
) {
    if (
        valor === 0 ||
        valor === false
    ) {
        return String(
            valor
        );
    }

    return valor ||
        padrao;
}

function simNao(
    valor,
    disponivel = true
) {
    if (!disponivel) {
        return "Não identificado";
    }

    return valor
        ? "Sim"
        : "Não";
}

function CampoFgts({
    rotulo,
    valor,
}) {
    return (
        <div className="certidao-fgts-resumo__campo">
            <span>{rotulo}</span>
            <strong>
                {valorOuPadrao(
                    valor
                )}
            </strong>
        </div>
    );
}

export function CertidaoFgtsDetalhes({
    avaliacao,
}) {
    const dados =
        avaliacao?.dadosFgts;

    const obrigacao =
        avaliacao?.obrigacaoComposta;

    if (
        !dados ||
        obrigacao?.obrigacaoId !==
            "fgts"
    ) {
        return null;
    }

    const pagamento =
        dados.pagamento || {};

    const comprovantePresente =
        Boolean(
            pagamento.comprovantePresente
        );

    const divergente =
        avaliacao.nivel ===
        "REPROVADA";

    const tituloSituacao =
        divergente
            ? "Divergência nas evidências"
            : comprovantePresente
                ? "Guia e comprovante localizados"
                : "Pagamento não comprovado";

    const classeSituacao =
        divergente
            ? "is-reprovada"
            : comprovantePresente
                ? "is-alerta"
                : "is-inconclusiva";

    return (
        <section
            className={
                "certidao-fgts-resumo " +
                classeSituacao
            }
        >
            <header className="certidao-fgts-resumo__header">
                <span className="certidao-fgts-resumo__icone">
                    <WalletCards aria-hidden="true" />
                </span>

                <div>
                    <p>Obrigação mensal composta</p>
                    <h3>FGTS Digital</h3>
                    <span>
                        Guia emitida e pagamento são
                        conferidos como evidências distintas.
                    </span>
                </div>

                <strong className="certidao-fgts-resumo__situacao">
                    {tituloSituacao}
                </strong>
            </header>

            <div className="certidao-fgts-resumo__grid">
                <article className="certidao-fgts-resumo__bloco">
                    <header>
                        <FileCheck2 aria-hidden="true" />

                        <div>
                            <strong>Guia emitida</strong>
                            <span>
                                Dados extraídos da página da GFD.
                            </span>
                        </div>
                    </header>

                    <div className="certidao-fgts-resumo__campos">
                        <CampoFgts
                            rotulo="Competência"
                            valor={dados.competencia}
                        />

                        <CampoFgts
                            rotulo="Geração"
                            valor={
                                [
                                    dados.dataGeracao,
                                    dados.horaGeracao,
                                ]
                                    .filter(Boolean)
                                    .join(" · ")
                            }
                        />

                        <CampoFgts
                            rotulo="Vencimento"
                            valor={dados.vencimento}
                        />

                        <CampoFgts
                            rotulo="Trabalhadores"
                            valor={
                                dados.quantidadeTrabalhadores
                                    ? String(
                                        dados
                                            .quantidadeTrabalhadores
                                    )
                                    : ""
                            }
                        />

                        <CampoFgts
                            rotulo="FGTS mensal"
                            valor={dados.fgtsMensal}
                        />

                        <CampoFgts
                            rotulo="Consignado"
                            valor={dados.consignado}
                        />

                        <CampoFgts
                            rotulo="Total da guia"
                            valor={dados.totalGuia}
                        />

                        <CampoFgts
                            rotulo="Identificador"
                            valor={dados.identificador}
                        />
                    </div>
                </article>

                <article className="certidao-fgts-resumo__bloco">
                    <header>
                        <BadgeCheck aria-hidden="true" />

                        <div>
                            <strong>Comprovante de pagamento</strong>
                            <span>
                                Evidência bancária encontrada no arquivo.
                            </span>
                        </div>
                    </header>

                    <div className="certidao-fgts-resumo__campos">
                        <CampoFgts
                            rotulo="Comprovante presente"
                            valor={
                                comprovantePresente
                                    ? "Sim"
                                    : "Não"
                            }
                        />

                        <CampoFgts
                            rotulo="CNPJ do pagador"
                            valor={pagamento.cnpjPagador}
                        />

                        <CampoFgts
                            rotulo="Valor pago"
                            valor={pagamento.valorPago}
                        />

                        <CampoFgts
                            rotulo="Pagamento"
                            valor={
                                [
                                    pagamento.dataPagamento,
                                    pagamento.horaPagamento,
                                ]
                                    .filter(Boolean)
                                    .join(" · ")
                            }
                        />

                        <CampoFgts
                            rotulo="Meio"
                            valor={pagamento.meioPagamento}
                        />

                        <CampoFgts
                            rotulo="CNPJ confere"
                            valor={
                                simNao(
                                    pagamento.cnpjConfere,
                                    Boolean(
                                        pagamento.cnpjPagador
                                    )
                                )
                            }
                        />

                        <CampoFgts
                            rotulo="Valor confere"
                            valor={
                                simNao(
                                    pagamento.valorConfere,
                                    Boolean(
                                        pagamento.valorPago &&
                                        dados.totalGuia
                                    )
                                )
                            }
                        />

                        <CampoFgts
                            rotulo="Pagamento no prazo"
                            valor={
                                simNao(
                                    pagamento.pagamentoNoPrazo,
                                    Boolean(
                                        pagamento.dataPagamento &&
                                        dados.vencimento
                                    )
                                )
                            }
                        />
                    </div>
                </article>
            </div>

            <div className="certidao-fgts-resumo__indicadores">
                <span>
                    <CalendarDays aria-hidden="true" />
                    Competência esperada:
                    <strong>
                        {valorOuPadrao(
                            dados.competenciaEsperada,
                            "não vinculada"
                        )}
                    </strong>
                </span>

                <span>
                    <UsersRound aria-hidden="true" />
                    Guia emitida:
                    <strong>
                        {simNao(
                            obrigacao.guiaEmitida
                        )}
                    </strong>
                </span>

                <span>
                    <CircleDollarSign aria-hidden="true" />
                    Pagamento anexado:
                    <strong>
                        {simNao(
                            obrigacao
                                .comprovantePagamentoPresente
                        )}
                    </strong>
                </span>

                <span>
                    <Clock3 aria-hidden="true" />
                    Quitação confirmada:
                    <strong>Não</strong>
                </span>
            </div>

            <footer className="certidao-fgts-resumo__aviso">
                <ShieldAlert aria-hidden="true" />

                <div>
                    <strong>
                        Conferência humana obrigatória
                    </strong>

                    <span>
                        O SafeScan cruza CNPJ, competência,
                        valores e datas, mas não declara a
                        quitação automaticamente. A decisão
                        final deve ser registrada por uma
                        pessoa responsável.
                    </span>
                </div>
            </footer>
        </section>
    );
}
