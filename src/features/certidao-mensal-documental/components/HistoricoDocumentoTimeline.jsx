import {
    AlertCircle,
    CheckCircle2,
    Clock3,
    FileCheck2,
    FilePlus2,
    FileWarning,
    History,
    RefreshCcw,
    Replace,
    RotateCcw,
} from "lucide-react";

const EVENTOS_CONFIGURACAO = Object.freeze({
    DOCUMENTO_ENVIADO: {
        icone: FilePlus2,
        classe: "is-enviado",
    },
    DOCUMENTO_SUBSTITUIDO: {
        icone: Replace,
        classe: "is-substituido",
    },
    DOCUMENTO_CONFIRMADO_CONFORME: {
        icone: CheckCircle2,
        classe: "is-conforme",
    },
    DOCUMENTO_MARCADO_NAO_CONFORME: {
        icone: FileWarning,
        classe: "is-nao-conforme",
    },
    DOCUMENTO_REENVIO_SOLICITADO: {
        icone: RotateCcw,
        classe: "is-reenvio",
    },
});

const EVENTO_PADRAO = Object.freeze({
    icone: Clock3,
    classe: "is-neutro",
});

function formatarDataHora(valor) {
    const texto = String(valor || "").trim();

    if (!texto) {
        return "Data não informada";
    }

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) {
        return texto;
    }

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(data);
}

function formatarTamanho(valor) {
    const bytes = Number(valor);

    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "";
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(
        bytes /
        (1024 * 1024)
    ).toFixed(2)} MB`;
}

function abreviarHash(valor) {
    const hash = String(valor || "").trim();

    if (!hash || hash.length <= 18) {
        return hash;
    }

    return `${hash.slice(0, 12)}…${hash.slice(-6)}`;
}

function identificarResponsavel(usuarioId) {
    const id = String(usuarioId || "").trim();

    return id
        ? `Usuário registrado · ${id.slice(0, 8)}…`
        : "Responsável não identificado";
}

function obterDataEvento(evento) {
    return (
        evento?.decididoEm ||
        evento?.registradoEm ||
        evento?.criadoEm ||
        ""
    );
}

function EstadoHistorico({
    tipo,
    titulo,
    texto,
    onAtualizar,
}) {
    const Icone =
        tipo === "erro"
            ? AlertCircle
            : tipo === "carregando"
                ? Clock3
                : History;

    return (
        <section
            className={
                `certidao-mensal-historico is-${tipo}`
            }
        >
            <Icone aria-hidden="true" />

            <div>
                <strong>{titulo}</strong>
                <span>{texto}</span>
            </div>

            {tipo === "erro" && onAtualizar && (
                <button
                    type="button"
                    onClick={onAtualizar}
                >
                    <RefreshCcw aria-hidden="true" />
                    Tentar novamente
                </button>
            )}
        </section>
    );
}

export function HistoricoDocumentoTimeline({
    eventos = [],
    carregando = false,
    erro = "",
    onAtualizar,
    onAbrirVersao,
}) {
    const itens =
        Array.isArray(eventos)
            ? eventos
            : [];

    if (carregando) {
        return (
            <EstadoHistorico
                tipo="carregando"
                titulo="Carregando histórico"
                texto="Consultando a trilha documental."
            />
        );
    }

    if (erro) {
        return (
            <EstadoHistorico
                tipo="erro"
                titulo="Histórico indisponível"
                texto={erro}
                onAtualizar={onAtualizar}
            />
        );
    }

    if (!itens.length) {
        return (
            <EstadoHistorico
                tipo="vazio"
                titulo="Nenhum evento registrado"
                texto="Os envios e as tratativas deste documento aparecerão aqui."
            />
        );
    }

    return (
        <section className="certidao-mensal-historico">
            <header className="certidao-mensal-historico__header">
                <div>
                    <History aria-hidden="true" />

                    <div>
                        <strong>
                            Histórico do documento
                        </strong>

                        <span>
                            Trilha permanente de envios e tratativas.
                        </span>
                    </div>
                </div>

                <span className="certidao-mensal-historico__total">
                    {itens.length}
                    {itens.length === 1
                        ? " evento"
                        : " eventos"}
                </span>
            </header>

            <ol className="certidao-mensal-historico__lista">
                {itens.map((evento) => {
                    const configuracao =
                        EVENTOS_CONFIGURACAO[
                            evento?.tipoEvento
                        ] || EVENTO_PADRAO;

                    const Icone =
                        configuracao.icone;

                    const tamanho =
                        formatarTamanho(
                            evento?.tamanhoBytes
                        );

                    const hash =
                        abreviarHash(
                            evento?.hashSha256
                        );

                    const metadadosArquivo = [
                        tamanho,
                        evento?.totalPaginas > 0
                            ? `${evento.totalPaginas} ${
                                evento.totalPaginas === 1
                                    ? "página"
                                    : "páginas"
                            }`
                            : "",
                        hash
                            ? `SHA-256 ${hash}`
                            : "",
                    ].filter(Boolean);

                    const mostrarArquivo =
                        Boolean(
                            evento?.numeroVersao ||
                            evento?.versaoId
                        );

                    return (
                        <li
                            key={
                                evento?.id ||
                                `${evento?.tipoEvento}-${evento?.criadoEm}`
                            }
                            className={
                                `certidao-mensal-historico__evento ${configuracao.classe}`
                            }
                        >
                            <span className="certidao-mensal-historico__marcador">
                                <Icone aria-hidden="true" />
                            </span>

                            <article>
                                <header>
                                    <div>
                                        <strong>
                                            {evento?.rotulo ||
                                                "Evento documental"}
                                        </strong>

                                        <time
                                            dateTime={
                                                obterDataEvento(
                                                    evento
                                                )
                                            }
                                        >
                                            {formatarDataHora(
                                                obterDataEvento(
                                                    evento
                                                )
                                            )}
                                        </time>
                                    </div>

                                    {evento?.numeroVersao > 0 && (
                                        <span className="certidao-mensal-historico__versao">
                                            Versão {evento.numeroVersao}
                                        </span>
                                    )}
                                </header>

                                <p>
                                    {evento?.descricao ||
                                        "Evento registrado na trilha documental."}
                                </p>

                                {mostrarArquivo && (
                                    <div className="certidao-mensal-historico__arquivo">
                                        <FileCheck2 aria-hidden="true" />

                                        <div>
                                            <strong>
                                                {evento?.nomeArquivo ||
                                                    "Documento registrado"}
                                            </strong>

                                            {metadadosArquivo.length > 0 && (
                                                <span>
                                                    {metadadosArquivo.join(
                                                        " · "
                                                    )}
                                                </span>
                                            )}
                                        </div>

                                        {evento?.caminhoStorage &&
                                            typeof onAbrirVersao ===
                                                "function" && (
                                                <button
                                                    type="button"
                                                    className="certidao-mensal-historico__abrir-versao"
                                                    title={`Abrir a versão ${
                                                        evento?.numeroVersao ||
                                                        ""
                                                    } do documento`}
                                                    aria-label={`Abrir a versão ${
                                                        evento?.numeroVersao ||
                                                        ""
                                                    } do documento`}
                                                    onClick={() => {
                                                        onAbrirVersao(
                                                            evento
                                                        );
                                                    }}
                                                >
                                                    Abrir versão
                                                </button>
                                            )}
                                    </div>
                                )}

                                {evento?.motivo && (
                                    <div className="certidao-mensal-historico__detalhe">
                                        <strong>Motivo</strong>
                                        <span>{evento.motivo}</span>
                                    </div>
                                )}

                                {evento?.observacao && (
                                    <div className="certidao-mensal-historico__detalhe">
                                        <strong>Observação</strong>
                                        <span>{evento.observacao}</span>
                                    </div>
                                )}

                                <footer>
                                    <span>
                                        {identificarResponsavel(
                                            evento?.usuarioId
                                        )}
                                    </span>

                                    {evento?.statusDestino && (
                                        <span>
                                            Status: {evento.statusDestino}
                                        </span>
                                    )}
                                </footer>
                            </article>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}
