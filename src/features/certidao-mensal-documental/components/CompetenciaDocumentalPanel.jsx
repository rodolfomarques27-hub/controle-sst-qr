import { useState } from "react";
import {
    AlertCircle,
    Building2,
    CheckCircle2,
    LoaderCircle,
    Mail,
    CalendarRange,
    History,
    Printer,
    Settings,

    Upload,
    X,
} from "lucide-react";

import {
    enviarCertidaoMensalPorEmail,
} from "../services/certidaoMensalEmailEnvioService.js";
import { STATUS_DOCUMENTAL } from "../constants/certidaoMensalConstants";

const LEGENDAS = [
    { rotulo: "Confirmado", classe: "is-confirmado" },
    { rotulo: "Em análise", classe: "is-em-analise" },
    { rotulo: "Pendente", classe: "is-pendente" },
    { rotulo: "Vencido", classe: "is-vencido" },
];

const ROTULOS_STATUS_COMPETENCIA =
    Object.freeze({
        ABERTA:
            "Competência atual aberta",
        EM_CONFERENCIA:
            "Competência atual em conferência",
        FECHADA:
            "Competência atual fechada",
        REABERTA:
            "Competência atual reaberta",
    });

function obterRotuloStatusCompetencia(
    status,
) {
    const statusNormalizado =
        String(
            status || "",
        )
            .trim()
            .toUpperCase();

    return (
        ROTULOS_STATUS_COMPETENCIA[
            statusNormalizado
        ] ||
        "Competência atual em preparação"
    );
}

function formatarDataHoraHistorico(
    valor,
) {
    const data =
        new Date(
            valor || "",
        );

    if (
        Number.isNaN(
            data.getTime(),
        )
    ) {
        return "data não informada";
    }

    return data.toLocaleString(
        "pt-BR",
        {
            day:
                "2-digit",
            month:
                "2-digit",
            year:
                "numeric",
            hour:
                "2-digit",
            minute:
                "2-digit",
        },
    );
}

function obterDescricaoHistorico(
    registro,
) {
    const partes = [
        `Fechada em ${formatarDataHoraHistorico(
            registro?.fechadoEm,
        )}`,
    ];

    const conformidadeOriginal =
        registro?.resumo?.conformidade;

    if (
        conformidadeOriginal !==
            null &&
        conformidadeOriginal !==
            undefined &&
        conformidadeOriginal !==
            ""
    ) {
        const conformidade =
            Number(
                conformidadeOriginal,
            );

        if (
            Number.isFinite(
                conformidade,
            )
        ) {
            partes.push(
                `${conformidade}% de conformidade`,
            );
        }
    }

    return partes.join(
        " • ",
    );
}

export function CompetenciaDocumentalPanel({
    competencia,
    empresa,
    competenciaAtual,
    historicoAnual = [],
    cicloCarregando = false,
    cicloErro = "",
    vigenciaContratual = null,
    documentos,
    documentoSelecionadoId,
    onSelecionarDocumento,
    onEnviarDocumento,
    onDefinirAplicabilidadeEsocial,
    onImprimirRelatorioEmpresa,
    onAbrirExigibilidade,
}) {
    const competenciaExigivel =
        vigenciaContratual?.exigivel !==
        false;

    const mensagemVigencia =
        String(
            vigenciaContratual?.mensagem ||
            "",
        ).trim();

    const [historicoAberto, setHistoricoAberto] = useState(false);

    const [
        confirmacaoEnvioAberta,
        setConfirmacaoEnvioAberta,
    ] =
        useState(false);

    const [
        envioEmail,
        setEnvioEmail,
    ] =
        useState({
            status:
                "ocioso",

            mensagem:
                "",

            chaveIdempotencia:
                "",

            envioId:
                "",

            statusOperacional:
                "",
        });

    const envioEmAndamento =
        envioEmail.status ===
        "enviando";

    const envioParcial =
        envioEmail.statusOperacional ===
        "PARCIAL";

    const confirmarEnvioEmail =
        async () => {
            if (
                envioEmAndamento ||
                envioParcial ||
                !empresa?.id ||
                !competenciaExigivel
            ) {
                return;
            }

            const chaveAnterior =
                envioEmail
                    .chaveIdempotencia;

            setConfirmacaoEnvioAberta(
                false
            );

            setEnvioEmail(
                (estadoAtual) => ({
                    ...estadoAtual,

                    status:
                        "enviando",

                    mensagem:
                        "Preparando a lista consolidada de pendências.",

                    envioId:
                        "",

                    statusOperacional:
                        "",
                })
            );

            try {
                const resultado =
                    await enviarCertidaoMensalPorEmail({
                        empresaId:
                            empresa.id,

                        competencia,

                        ...(chaveAnterior
                            ? {
                                chaveIdempotencia:
                                    chaveAnterior,
                            }
                            : {}),
                    });

                setEnvioEmail({
                    status:
                        "sucesso",

                    mensagem:
                        resultado.reutilizado
                            ? "Esta notificação já havia sido concluída anteriormente."
                            : "Notificação de pendências enviada com sucesso.",

                    chaveIdempotencia:
                        "",

                    envioId:
                        resultado.envioId ||
                        "",

                    statusOperacional:
                        resultado.status ||
                        "ENVIADO",
                });
            }
            catch (error) {
                const statusOperacional =
                    String(
                        error?.status ||
                        ""
                    ).trim();

                const mensagem =
                    statusOperacional ===
                    "PARCIAL"
                        ? (
                            "A notificação foi concluída parcialmente. " +
                            "Consulte o histórico antes de realizar nova cobrança."
                        )
                        : (
                            error?.message ||
                            "Não foi possível enviar a notificação de pendências."
                        );

                setEnvioEmail({
                    status:
                        "erro",

                    mensagem,

                    chaveIdempotencia:
                        statusOperacional
                            ? ""
                            : String(
                                error
                                    ?.chaveIdempotencia ||
                                chaveAnterior ||
                                ""
                            ).trim(),

                    envioId:
                        String(
                            error?.envioId ||
                            ""
                        ).trim(),

                    statusOperacional,
                });
            }
        };

    return (
        <section className="certidao-mensal-panel certidao-mensal-checklist">
            <header className="certidao-mensal-checklist__header">
                <div className="certidao-mensal-checklist__header-main certidao-mensal-unified-header__main">
                    <span className="certidao-mensal-checklist__header-icon certidao-mensal-unified-header__icon is-logo">
                        {empresa.logoUrl ? (
                            <img src={empresa.logoUrl} alt={`Logo ${empresa.nome}`} />
                        ) : (
                            <Building2 aria-hidden="true" />
                        )}
                    </span>

                    <div>
                        <h3>Competência {competencia}</h3>

                        <div className="certidao-mensal-checklist__empresa-row">
                            <p
                                className="certidao-mensal-checklist__empresa-nome"
                                title={empresa.nome}
                            >
                                {empresa.nome}
                            </p>

                            <button
                                type="button"
                                className="certidao-mensal-checklist__config"
                                title="Configurar exigibilidade documental"
                                aria-label={`Configurar exigibilidade documental de ${empresa.nome}`}
                                disabled={
                                    !onAbrirExigibilidade ||
                                    !empresa?.id
                                }
                                onClick={onAbrirExigibilidade}
                            >
                                <Settings aria-hidden="true" />
                            </button>
                        </div>

                        <small>CNPJ {empresa.cnpj}</small>
                    </div>
                </div>

                <div className="certidao-mensal-checklist__header-actions">
                    <button
                        type="button"
                        className="certidao-mensal-checklist__print"
                        title="Imprimir o relatório individual desta empresa e competência"
                        disabled={!onImprimirRelatorioEmpresa}
                        onClick={onImprimirRelatorioEmpresa}
                    >
                        <Printer aria-hidden="true" />
                        Imprimir empresa
                    </button>

                    <button
                        type="button"
                        className={
                            `certidao-mensal-checklist__send is-${envioEmail.status}`
                        }
                        title={
                            !competenciaExigivel
                                ? (
                                    mensagemVigencia ||
                                    "Competência fora da vigência contratual"
                                )
                                : envioParcial
                                    ? "Consulte o histórico antes de reenviar a cobrança"
                                    : "Enviar um único e-mail com todas as pendências atuais desta competência"
                        }
                        disabled={
                            envioEmAndamento ||
                            envioParcial ||
                            !empresa?.id ||
                            !competenciaExigivel
                        }
                        onClick={() =>
                            setConfirmacaoEnvioAberta(
                                true
                            )
                        }
                    >
                        {envioEmAndamento ? (
                            <LoaderCircle
                                className="is-spinning"
                                aria-hidden="true"
                            />
                        ) : envioEmail.status ===
                          "sucesso" ? (
                            <CheckCircle2 aria-hidden="true" />
                        ) : envioEmail.status ===
                          "erro" ? (
                            <AlertCircle aria-hidden="true" />
                        ) : (
                            <Mail aria-hidden="true" />
                        )}

                        {envioEmAndamento
                            ? "Enviando..."
                            : envioParcial
                                ? "Envio parcial"
                                : envioEmail.status ===
                                  "sucesso"
                                    ? "Reenviar cobrança"
                                    : envioEmail.status ===
                                      "erro"
                                        ? "Tentar novamente"
                                        : "Enviar pendências"}
                    </button>


                    <button
                        type="button"
                        className="certidao-mensal-checklist__history"
                        title="Consultar histórico de competências"
                        aria-expanded={historicoAberto}
                        onClick={() =>
                            setHistoricoAberto(
                                (aberto) =>
                                    !aberto
                            )
                        }
                    >
                        <History aria-hidden="true" />
                        Histórico
                    </button>
                </div>

                {!competenciaExigivel &&
                    vigenciaContratual && (
                        <div
                            className="certidao-mensal-checklist__vigencia"
                            role={
                                vigenciaContratual.bloqueado
                                    ? "alert"
                                    : "status"
                            }
                            aria-live="polite"
                        >
                            <CalendarRange aria-hidden="true" />

                            <div>
                                <strong>
                                    {vigenciaContratual.rotulo ||
                                        "Competência não aplicável"}
                                </strong>

                                <span>
                                    {mensagemVigencia ||
                                        "Esta competência não gera cobrança documental para o contrato selecionado."}
                                </span>
                            </div>
                        </div>
                    )}

                {confirmacaoEnvioAberta && (
                    <div
                        className="certidao-mensal-checklist__email-confirm"
                        role="region"
                        aria-live="polite"
                    >
                        <Mail aria-hidden="true" />

                        <div>
                            <strong>
                                Confirmar notificação das pendências?
                            </strong>

                            <span>
                                Será enviado um único e-mail com todas as pendências atuais de {competencia} da empresa {empresa?.nome || "selecionada"}.
                            </span>
                        </div>

                        <div className="certidao-mensal-checklist__email-confirm-actions">
                            <button
                                type="button"
                                onClick={() =>
                                    setConfirmacaoEnvioAberta(
                                        false
                                    )
                                }
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="is-confirm"
                                onClick={
                                    confirmarEnvioEmail
                                }
                            >
                                Confirmar notificação
                            </button>
                        </div>
                    </div>
                )}

                {!confirmacaoEnvioAberta &&
                    envioEmail.status !==
                        "ocioso" && (
                    <div
                        className={
                            `certidao-mensal-checklist__email-feedback is-${envioEmail.status}`
                        }
                        role={
                            envioEmail.status ===
                            "erro"
                                ? "alert"
                                : "status"
                        }
                        aria-live="polite"
                    >
                        {envioEmail.status ===
                        "enviando" ? (
                            <LoaderCircle
                                className="is-spinning"
                                aria-hidden="true"
                            />
                        ) : envioEmail.status ===
                          "sucesso" ? (
                            <CheckCircle2 aria-hidden="true" />
                        ) : (
                            <AlertCircle aria-hidden="true" />
                        )}

                        <span>
                            {envioEmail.mensagem}
                        </span>

                        {envioEmail.envioId && (
                            <small>
                                Protocolo: {envioEmail.envioId}
                            </small>
                        )}
                    </div>
                )}

                {historicoAberto && (
                    <div
                        className="certidao-mensal-checklist__history-panel"
                        data-certidao-historico-total={
                            historicoAnual.length
                        }
                    >
                        <header>
                            <div>
                                <strong>Histórico de competências</strong>
                                <span>{empresa.nome}</span>
                            </div>

                            <button
                                type="button"
                                aria-label="Fechar histórico"
                                onClick={() =>
                                    setHistoricoAberto(
                                        false
                                    )
                                }
                            >
                                <X aria-hidden="true" />
                            </button>
                        </header>

                        <div className="certidao-mensal-checklist__history-current">
                            <CalendarRange aria-hidden="true" />

                            <div>
                                <strong>{competencia}</strong>

                                <span>
                                    {cicloCarregando
                                        ? "Carregando competência atual..."
                                        : cicloErro
                                          ? "Falha ao carregar o ciclo anual"
                                          : !competenciaExigivel
                                            ? (
                                                vigenciaContratual?.rotulo ||
                                                "Competência não aplicável"
                                            )
                                            : obterRotuloStatusCompetencia(
                                                competenciaAtual?.status,
                                            )}
                                </span>
                            </div>
                        </div>

                        {cicloCarregando ? (
                            <p>
                                Carregando histórico anual...
                            </p>
                        ) : cicloErro ? (
                            <p role="alert">
                                {cicloErro}
                            </p>
                        ) : historicoAnual.length === 0 ? (
                            <p>
                                Nenhuma competência fechada foi localizada para esta empresa em{" "}
                                {String(
                                    competencia,
                                ).slice(-4)}.
                            </p>
                        ) : (
                            historicoAnual
                                .slice()
                                .reverse()
                                .map(
                                    (item) => (
                                        <div
                                            key={
                                                item.competenciaId ||
                                                item.competencia
                                            }
                                            className="certidao-mensal-checklist__history-current"
                                        >
                                            <CalendarRange aria-hidden="true" />

                                            <div>
                                                <strong>
                                                    {item.competenciaLabel ||
                                                        item.competencia}
                                                </strong>

                                                <span>
                                                    {obterDescricaoHistorico(
                                                        item,
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    ),
                                )
                        )}
                    </div>
                )}
            </header>

            <div className="certidao-mensal-checklist__lista">
                {documentos.map((documento, indiceVisivel) => {
                    const ativo =
                        documento.id === documentoSelecionadoId;

                    const status =
                        STATUS_DOCUMENTAL[documento.status]
                        || STATUS_DOCUMENTAL.pendente;

                    const documentoExigido =
                        documento?.exigido !== false;

                    const aplicabilidade =
                        documento.id ===
                            "esocial"
                            ? String(
                                documento
                                    ?.aplicabilidade ||
                                "PENDENTE_DEFINICAO"
                            )
                                .trim()
                                .toUpperCase()
                            : "APLICAVEL";

                    const aplicabilidadePendente =
                        documento.id ===
                            "esocial" &&
                        aplicabilidade ===
                            "PENDENTE_DEFINICAO";

                    const documentoNaoAplicavel =
                        documento.id ===
                            "esocial" &&
                        aplicabilidade ===
                            "NAO_APLICAVEL";

                    const aplicabilidadeDisponivel =
                        documento.id !==
                            "esocial" ||
                        (
                            documento
                                ?.aplicabilidadeSuportada ===
                                true &&
                            Boolean(
                                documento
                                    ?.aplicabilidadeItemId
                            )
                        );

                    const documentoDisponivelParaEnvio =
                        documentoExigido &&
                        !aplicabilidadePendente &&
                        !documentoNaoAplicavel;

                    return (
                        <article
                            key={documento.id}
                            className={`certidao-mensal-doc-row ${status.classe}${ativo ? " is-active" : ""}${documento.origemSistema ? " is-system" : ""}${documentoExigido ? "" : " is-nao-exigido"}${aplicabilidadePendente ? " is-aplicabilidade-pendente" : ""}${documentoNaoAplicavel ? " is-nao-aplicavel" : ""}${documento?.id ? " is-doc-" + documento.id : ""}`}
                        >
                            <button
                                type="button"
                                className="certidao-mensal-doc-row__body"
                                aria-label={`${documento.titulo}. Situação: ${documentoExigido ? status.rotulo : "Não exigido para este contrato"}`}
                                onClick={() => onSelecionarDocumento(documento.id)}
                            >
                                <span className="certidao-mensal-doc-row__numero">
                                    {indiceVisivel + 1}
                                </span>

                                <div className="certidao-mensal-doc-row__content">
                                    <div className="certidao-mensal-doc-row__top">
                                        <div className="certidao-mensal-doc-row__title">
                                            <strong title={documento.titulo}>
                                                {documento.titulo}
                                            </strong>

                                            {!documento.origemSistema && documento.subtitulo && (
                                                <small title={documento.subtitulo}>
                                                    {documento.subtitulo}
                                                </small>
                                            )}

                                            {!documentoExigido && (
                                                <span className="certidao-mensal-doc-row__nao-exigido">
                                                    Não exigido para este contrato
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {documento.origemSistema ? (
                                        <div className="certidao-mensal-doc-row__metrics">
                                            {documento.resumoItens?.map((item) => (
                                                <span key={item.rotulo} className={`is-${item.tom || "neutro"}`}>
                                                    <small>{item.rotulo}</small>
                                                    <strong>{item.valor}</strong>
                                                    {item.detalhe && <em>{item.detalhe}</em>}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="certidao-mensal-doc-row__meta">
                                            <span
                                                className="certidao-mensal-doc-row__detail-primary"
                                                title={documento.detalhePrincipal}
                                            >
                                                {documento.detalhePrincipal}
                                            </span>

                                            <span
                                                className="certidao-mensal-doc-row__detail-secondary"
                                                title={documento.detalheSecundario}
                                            >
                                                {documento.detalheSecundario}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>

                            {!documento.origemSistema && (
                                <div className="certidao-mensal-doc-row__actions">
                                    {documento.id === "esocial" && aplicabilidadeDisponivel && (
                                        <select
                                            className="certidao-mensal-doc-row__aplicabilidade-select"
                                            value={
                                                aplicabilidadePendente
                                                    ? ""
                                                    : aplicabilidade
                                            }
                                            disabled={
                                                !competenciaExigivel ||
                                                !documentoExigido ||
                                                !aplicabilidadeDisponivel ||
                                                !onDefinirAplicabilidadeEsocial
                                            }
                                            onClick={(evento) => {
                                                evento.stopPropagation();
                                            }}
                                            onChange={(evento) => {
                                                evento.stopPropagation();

                                                const valor =
                                                    evento.target.value;

                                                if (!valor) {
                                                    return;
                                                }

                                                onDefinirAplicabilidadeEsocial?.(
                                                    documento,
                                                    valor
                                                );
                                            }}
                                            aria-label="Aplicabilidade do eSocial SST"
                                        >
                                            <option
                                                value=""
                                                disabled
                                            >
                                                Definir aplicabilidade
                                            </option>

                                            <option value="APLICAVEL">
                                                Aplicável
                                            </option>

                                            <option value="NAO_APLICAVEL">
                                                Não aplicável
                                            </option>
                                        </select>
                                    )}

                                    <button
                                        type="button"
                                        className="certidao-mensal-doc-row__upload"
                                            title={
                                                !documentoExigido
                                                    ? "Não exigido para este contrato."
                                                    : documentoNaoAplicavel
                                                        ? "eSocial SST não aplicável nesta competência."
                                                        : aplicabilidadePendente
                                                            ? "Defina a aplicabilidade antes do envio."
                                                            : competenciaExigivel
                                                                ? "Selecionar PDF para diagnóstico local"
                                                                : (
                                                                    mensagemVigencia ||
                                                                    "Competência fora da vigência contratual"
                                                                )
                                            }
                                            disabled={!competenciaExigivel || !documentoDisponivelParaEnvio}
                                            onClick={() => {
                                                if (
                                                    !competenciaExigivel ||
                                                    !documentoDisponivelParaEnvio
                                                ) {
                                                    return;
                                                }

                                                onSelecionarDocumento(documento.id);
                                                onEnviarDocumento?.(documento);
                                            }}
                                    >
                                            <Upload aria-hidden="true" />
                                            {!documentoExigido
                                                ? "Não exigido"
                                                : documentoNaoAplicavel
                                                    ? "Não aplicável"
                                                    : aplicabilidadePendente
                                                        ? "Definir aplicabilidade"
                                                        : documento.acaoLabel}
                                    </button>
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>

            <footer className="certidao-mensal-checklist__footer">
                <span>Legenda:</span>

                <div className="certidao-mensal-checklist__legend">
                    {LEGENDAS.map((item) => (
                        <span
                            key={item.rotulo}
                            className={`certidao-mensal-status ${item.classe}`}
                        >
                            <i aria-hidden="true" />
                            {item.rotulo}
                        </span>
                    ))}
                </div>
            </footer>
        </section>
    );
}
