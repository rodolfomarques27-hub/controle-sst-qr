import {
    useMemo,
    useState,
} from "react";

import {
    CalendarRange,
    ChevronDown,
    History,
    Save,
    SlidersHorizontal,
    UploadCloud,
    X,
} from "lucide-react";

import {
    CertidaoUploadMassaPanel,
} from "./CertidaoUploadMassaPanel.jsx";

import certidaoMensalHeroBackground from "../../../assets/certidao-mensal-hero-pastas.webp";

const LIMITE_MOTIVO =
    500;

function competenciaParaInputMes(
    valor,
) {
    const texto =
        String(
            valor || "",
        ).trim();

    const formatoTela =
        texto.match(
            /^(\d{2})\/(\d{4})$/,
        );

    if (formatoTela) {
        return `${formatoTela[2]}-${formatoTela[1]}`;
    }

    const formatoBanco =
        texto.match(
            /^(\d{4})-(\d{2})/,
        );

    if (formatoBanco) {
        return `${formatoBanco[1]}-${formatoBanco[2]}`;
    }

    return "";
}

function formatarCompetencia(
    valor,
) {
    const texto =
        String(
            valor || "",
        ).trim();

    const match =
        texto.match(
            /^(\d{4})-(\d{2})/,
        );

    if (!match) {
        return (
            texto ||
            "Competência não informada"
        );
    }

    return `${match[2]}/${match[1]}`;
}

function formatarDataHora(
    valor,
) {
    if (!valor) {
        return "";
    }

    const data =
        new Date(
            valor,
        );

    if (
        Number.isNaN(
            data.getTime(),
        )
    ) {
        return "";
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

export function PerfilDocumentalConfigModal({
    empresa,
    competencia,
    documentos = [],
    regras = [],
    carregando = false,
    erro = "",
    documentoSelecionadoId = "",
    persistenciaHabilitada = false,
    uploadMassa = null,
    uploadMassaDisponivel = false,
    onSalvar,
    onCancelar,
}) {
    const documentosValidos =
        useMemo(
            () =>
                (
                    Array.isArray(
                        documentos,
                    )
                        ? documentos
                        : []
                ).filter(
                    (documento) =>
                        documento?.id,
                ),
            [
                documentos,
            ],
        );

    const documentoInicialId =
        documentosValidos.some(
            (documento) =>
                documento.id ===
                documentoSelecionadoId,
        )
            ? documentoSelecionadoId
            : documentosValidos[0]?.id ||
              "";

    const documentoInicial =
        documentosValidos.find(
            (documento) =>
                documento.id ===
                documentoInicialId,
        ) ||
        documentosValidos[0] ||
        null;

    const [
        tipoDocumento,
        setTipoDocumento,
    ] =
        useState(
            documentoInicialId,
        );

    const [
        tiposDocumentoSelecionados,
        setTiposDocumentoSelecionados,
    ] =
        useState(
            () =>
                documentoInicialId
                    ? [documentoInicialId]
                    : [],
        );

    const quantidadeDocumentosSelecionados =
        tiposDocumentoSelecionados.length;

    const idsDocumentosSelecionados =
        useMemo(
            () =>
                new Set(
                    tiposDocumentoSelecionados,
                ),
            [
                tiposDocumentoSelecionados,
            ],
        );

    const [
        exigido,
        setExigido,
    ] =
        useState(
            documentoInicial?.exigido !==
                false,
        );

    const [
        competenciaInicio,
        setCompetenciaInicio,
    ] =
        useState(
            () =>
                competenciaParaInputMes(
                    competencia,
                ),
        );

    const [
        modoConfiguracao,
        setModoConfiguracao,
    ] =
        useState(
            "anual",
        );

    const [
        anoInicio,
        setAnoInicio,
    ] =
        useState(
            () => {
                const competenciaBase =
                    competenciaParaInputMes(
                        competencia,
                    );

                const anoBase =
                    String(
                        competenciaBase ||
                        "",
                    ).slice(
                        0,
                        4,
                    );

                return (
                    anoBase ||
                    String(
                        new Date().getFullYear(),
                    )
                );
            },
        );

    const [
        motivo,
        setMotivo,
    ] =
        useState("");

    const [
        salvando,
        setSalvando,
    ] =
        useState(false);

    const [
        erroSalvar,
        setErroSalvar,
    ] =
        useState("");

    const [
        abaAtiva,
        setAbaAtiva,
    ] =
        useState(
            "exigibilidade",
        );

    const abaUploadAtiva =
        abaAtiva ===
        "upload";

    /*
     * ============================================================
     * SAFE_SCAN_CERTIDAO_CONFIG_CNDT_MENSAL_A1_V1
     *
     * Configuração visual/contratual:
     *
     * - Documentos exigidos inicia recolhido;
     * - Não exigidos inicia recolhido;
     * - CNDT exibe prazo documental de 1 mês;
     * - validade jurídica do PDF não é modificada.
     * ============================================================
     */

    const [
        documentosExigidosAbertos,
        setDocumentosExigidosAbertos,
    ] =
        useState(false);

    const [
        documentosNaoExigidosAbertos,
        setDocumentosNaoExigidosAbertos,
    ] =
        useState(false);

    const documentoAtual =
        useMemo(
            () =>
                documentosValidos.find(
                    (documento) =>
                        documento.id ===
                        tipoDocumento,
                ) ||
                null,
            [
                documentosValidos,
                tipoDocumento,
            ],
        );

    const historicoDocumento =
        useMemo(
            () =>
                (
                    Array.isArray(
                        regras,
                    )
                        ? regras
                        : []
                )
                    .filter(
                        (regra) =>
                            String(
                                regra
                                    ?.tipoDocumento ||
                                    "",
                            ) ===
                            tipoDocumento,
                    )
                    .slice()
                    .sort(
                        (a, b) =>
                            String(
                                b
                                    ?.competenciaInicio ||
                                    "",
                            ).localeCompare(
                                String(
                                    a
                                        ?.competenciaInicio ||
                                        "",
                                ),
                            ),
                    ),
            [
                regras,
                tipoDocumento,
            ],
        );

    const fechar =
        () => {
            if (salvando) {
                return;
            }

            onCancelar?.();
        };

    const alternarDocumentoSelecionado =
        (documentoId) => {
            const novoId =
                String(
                    documentoId ||
                    "",
                ).trim();

            if (!novoId) {
                return;
            }

            const jaSelecionado =
                idsDocumentosSelecionados.has(
                    novoId,
                );

            const proximosSelecionados =
                jaSelecionado
                    ? tiposDocumentoSelecionados.filter(
                        (item) =>
                            item !==
                            novoId,
                    )
                    : [
                        ...tiposDocumentoSelecionados,
                        novoId,
                    ];

            setTiposDocumentoSelecionados(
                proximosSelecionados,
            );

            if (!jaSelecionado) {
                setTipoDocumento(
                    novoId,
                );

                return;
            }

            if (
                tipoDocumento ===
                novoId
            ) {
                setTipoDocumento(
                    proximosSelecionados[
                        proximosSelecionados.length -
                        1
                    ] ||
                    "",
                );
            }
        };

    async function salvarRegra() {
        if (salvando) {
            return;
        }

        if (!persistenciaHabilitada) {
            setErroSalvar(
                "A persistência do perfil documental está temporariamente desabilitada.",
            );

            return;
        }

        if (
            typeof onSalvar !==
            "function"
        ) {
            setErroSalvar(
                "A gravação do perfil documental não está disponível.",
            );

            return;
        }

        const anual =
            modoConfiguracao ===
            "anual";

        const ano =
            String(
                anoInicio ||
                "",
            ).trim();

        const anoNumero =
            Number(ano);

        const mes =
            String(
                competenciaInicio ||
                "",
            ).trim();

        if (
            tiposDocumentoSelecionados.length ===
            0
        ) {
            setErroSalvar(
                "Selecione ao menos um documento.",
            );

            return;
        }

        if (
            anual &&
            (
                !/^\d{4}$/.test(ano) ||
                !Number.isInteger(anoNumero) ||
                anoNumero < 2020 ||
                anoNumero > 2100
            )
        ) {
            setErroSalvar(
                "Informe um ano válido entre 2020 e 2100.",
            );

            return;
        }

        if (
            !anual &&
            !/^\d{4}-\d{2}$/.test(mes)
        ) {
            setErroSalvar(
                "Informe uma competência válida.",
            );

            return;
        }

        const competenciaRegra =
            anual
                ? `${ano}-01-01`
                : `${mes}-01`;

        setErroSalvar("");
        setSalvando(true);

        try {
            await onSalvar({
                tiposDocumento:
                    tiposDocumentoSelecionados.slice(),
                tipoDocumento,
                exigido,
                escopo:
                    anual
                        ? "ANUAL"
                        : "COMPETENCIA",
                competenciaInicio:
                    competenciaRegra,
                motivo,
            });

            setSalvando(false);
            onCancelar?.();
        }
        catch (erroSalvamento) {
            setErroSalvar(
                erroSalvamento
                    ?.message ||
                    "Não foi possível salvar a regra do perfil documental.",
            );

            setSalvando(false);
        }
    }

    const estadoAtual =
        documentoAtual?.exigido ===
        false
            ? "Não exigido"
            : "Exigido";

    const modoAnual =
        modoConfiguracao ===
        "anual";

    const anoCompetenciaAtual =
        (
            competenciaParaInputMes(
                competencia,
            ) || ""
        ).slice(
            0,
            4,
        ) ||
        String(
            new Date().getFullYear(),
        );

    const caracteresRestantes =
        LIMITE_MOTIVO -
        motivo.length;

    return (
        <div
            className="certidao-mensal-reenvio-modal__overlay"
            onMouseDown={fechar}
        >
            <section
                className="certidao-mensal-reenvio-modal__dialog certidao-mensal-perfil-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="certidao-perfil-documental-titulo"
                onMouseDown={(evento) =>
                    evento.stopPropagation()
                }
                onKeyDown={(evento) => {
                    if (
                        evento.key ===
                        "Escape"
                    ) {
                        fechar();
                    }
                }}
            >
                <header
                    className="certidao-mensal-reenvio-modal__header certidao-mensal-perfil-modal__hero"
                    style={{
                        backgroundImage:
                            `linear-gradient(90deg, rgba(5, 27, 17, 0.93) 0%, rgba(7, 47, 28, 0.82) 56%, rgba(10, 72, 40, 0.68) 100%), url(${certidaoMensalHeroBackground})`,
                    }}
                >
                    <span className="certidao-mensal-reenvio-modal__icone certidao-mensal-perfil-modal__icone">
                        <SlidersHorizontal aria-hidden="true" />
                    </span>

                    <div>
                        <p>
                            Certidão mensal documental
                        </p>

                        <h2 id="certidao-perfil-documental-titulo">
                            Configurações documentais
                        </h2>

                        <span>
                            {abaUploadAtiva ? (
                                <>
                                    Lote multiempresa
                                    {" • "}
                                    competência identificada pelo conteúdo
                                </>
                            ) : (
                                <>
                                    {empresa?.nome ||
                                        "Empresa selecionada"}{" "}
                                    • Competência{" "}
                                    {competencia}
                                </>
                            )}
                        </span>
                    </div>

                    <button
                        type="button"
                        className="certidao-mensal-reenvio-modal__fechar"
                        aria-label="Fechar configurações documentais"
                        onClick={fechar}
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>

                <nav
                    className="certidao-mensal-perfil-modal__tabs"
                    role="tablist"
                    aria-label="Configurações documentais"
                >
                    <button
                        type="button"
                        role="tab"
                        aria-selected={!abaUploadAtiva}
                        className={
                            !abaUploadAtiva
                                ? "certidao-mensal-perfil-modal__tab is-active"
                                : "certidao-mensal-perfil-modal__tab"
                        }
                        onClick={() =>
                            setAbaAtiva(
                                "exigibilidade",
                            )
                        }
                    >
                        <SlidersHorizontal aria-hidden="true" />
                        Exigibilidade documental
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={abaUploadAtiva}
                        className={
                            abaUploadAtiva
                                ? "certidao-mensal-perfil-modal__tab is-active"
                                : "certidao-mensal-perfil-modal__tab"
                        }
                        onClick={() =>
                            setAbaAtiva(
                                "upload",
                            )
                        }
                    >
                        <UploadCloud aria-hidden="true" />
                        Upload em massa
                    </button>
                </nav>

                <div
                    className={
                        `certidao-mensal-reenvio-modal__body certidao-mensal-perfil-modal__body${
                            abaUploadAtiva
                                ? " is-hidden"
                                : ""
                        }`
                    }
                >
                    <p className="certidao-mensal-perfil-modal__orientacao">
                        Defina a regra anual ou uma exceção válida somente para uma competência.
                        O histórico das competências anteriores permanece preservado.
                    </p>

                    <div className="certidao-mensal-perfil-modal__modo">
                        <button
                            type="button"
                            className={
                                !modoAnual
                                    ? "certidao-mensal-perfil-modal__modo-botao is-active"
                                    : "certidao-mensal-perfil-modal__modo-botao"
                            }
                            onClick={() =>
                                setModoConfiguracao(
                                    "competencia",
                                )
                            }
                        >
                            Exceção mensal
                        </button>

                        <button
                            type="button"
                            className={
                                modoAnual
                                    ? "certidao-mensal-perfil-modal__modo-botao is-active"
                                    : "certidao-mensal-perfil-modal__modo-botao"
                            }
                            onClick={() =>
                                setModoConfiguracao(
                                    "anual",
                                )
                            }
                        >
                            Regra anual
                        </button>
                    </div>

                    <div className="certidao-mensal-perfil-modal__estado">
                        <div>
                            <small>
                                {modoAnual
                                    ? `Documento a partir de ${anoInicio || anoCompetenciaAtual}`
                                    : "Documento na competência atual"}
                            </small>

                            <strong>
                                {documentoAtual?.titulo ||
                                    "Selecione um documento"}
                            </strong>
                        </div>

                        <span
                            className={
                                documentoAtual?.exigido ===
                                false
                                    ? "is-nao-exigido"
                                    : "is-exigido"
                            }
                        >
                            {estadoAtual}
                        </span>
                    </div>

                    <div className="certidao-mensal-perfil-modal__grid">
                        <div className="certidao-mensal-perfil-modal__campo is-wide">
                            <div className="certidao-mensal-perfil-modal__selecao-cabecalho">
                                <span>
                                    Documentos
                                </span>

                                <small>
                                    {quantidadeDocumentosSelecionados}{" "}
                                    {quantidadeDocumentosSelecionados ===
                                    1
                                        ? "selecionado"
                                        : "selecionados"}
                                </small>
                            </div>

                            <div
                                className="certidao-mensal-perfil-modal__selecao-lista"
                                role="group"
                                aria-label="Selecionar documentos"
                            >
                                {documentosValidos.some(
                                    (documento) =>
                                        documento?.exigido !==
                                        false,
                                ) && (
                                    <section className="certidao-mensal-perfil-modal__selecao-grupo">
                                        <header>
                                            <button
                                                type="button"
                                                className="certidao-mensal-perfil-modal__selecao-toggle"
                                                aria-expanded={
                                                    documentosExigidosAbertos
                                                }
                                                onClick={() =>
                                                    setDocumentosExigidosAbertos(
                                                        (aberto) =>
                                                            !aberto,
                                                    )
                                                }
                                            >
                                            <strong>
                                                Documentos exigidos
                                            </strong>

                                            <span>
                                                {
                                                    documentosValidos.filter(
                                                        (documento) =>
                                                            documento
                                                                ?.exigido !==
                                                            false,
                                                    ).length
                                                }
                                            </span>

                                            <ChevronDown
                                                className={
                                                    documentosExigidosAbertos
                                                        ? "certidao-mensal-perfil-modal__selecao-chevron is-open"
                                                        : "certidao-mensal-perfil-modal__selecao-chevron"
                                                }
                                                aria-hidden="true"
                                            />
                                            </button>
                                        </header>

                                        <div
                                            className={
                                                `certidao-mensal-perfil-modal__selecao-itens${
                                                    documentosExigidosAbertos
                                                        ? ""
                                                        : " is-collapsed"
                                                }`
                                            }
                                        >
                                            {documentosValidos
                                                .filter(
                                                    (documento) =>
                                                        documento
                                                            ?.exigido !==
                                                        false,
                                                )
                                                .map(
                                                    (
                                                        documento,
                                                    ) => (
                                                        <label
                                                            key={
                                                                documento.id
                                                            }
                                                            className={
                                                                idsDocumentosSelecionados.has(
                                                                    documento.id,
                                                                )
                                                                    ? "certidao-mensal-perfil-modal__selecao-item is-selected"
                                                                    : "certidao-mensal-perfil-modal__selecao-item"
                                                            }
                                                        >
                                                            <span className="certidao-mensal-perfil-modal__selecao-linha">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        idsDocumentosSelecionados.has(
                                                                            documento.id,
                                                                        )
                                                                    }
                                                                    onChange={() =>
                                                                        alternarDocumentoSelecionado(
                                                                            documento.id,
                                                                        )
                                                                    }
                                                                />

                                                                <span className="certidao-mensal-perfil-modal__selecao-conteudo">
                                                                    <strong>
                                                                        {
                                                                            documento.numero
                                                                        }
                                                                        .{" "}
                                                                        {
                                                                            documento.titulo
                                                                        }
                                                                    </strong>
                                                                    {documento.prazoDocumental && (
                                                    <span
                                                        className="certidao-mensal-perfil-modal__prazo-documental"
                                                        title="Prazo documental configurado para este tipo de documento. A data real de vencimento continua sendo conferida separadamente."
                                                    >
                                                        Prazo: {documento.prazoDocumental}
                                                    </span>
                                                )}
                                                                </span>
                                                            </span>

                                                            <span className="certidao-mensal-perfil-modal__selecao-status is-sim">
                                                                Exigido
                                                            </span>
                                                        </label>
                                                    ),
                                                )}
                                        </div>
                                    </section>
                                )}

                                {documentosValidos.some(
                                    (documento) =>
                                        documento?.exigido ===
                                        false,
                                ) && (
                                    <section className="certidao-mensal-perfil-modal__selecao-grupo is-nao">
                                        <header>
                                            <button
                                                type="button"
                                                className="certidao-mensal-perfil-modal__selecao-toggle"
                                                aria-expanded={
                                                    documentosNaoExigidosAbertos
                                                }
                                                onClick={() =>
                                                    setDocumentosNaoExigidosAbertos(
                                                        (aberto) =>
                                                            !aberto,
                                                    )
                                                }
                                            >
                                            <strong>
                                                Não exigidos para este contrato
                                            </strong>

                                            <span>
                                                {
                                                    documentosValidos.filter(
                                                        (documento) =>
                                                            documento
                                                                ?.exigido ===
                                                            false,
                                                    ).length
                                                }
                                            </span>

                                            <ChevronDown
                                                className={
                                                    documentosNaoExigidosAbertos
                                                        ? "certidao-mensal-perfil-modal__selecao-chevron is-open"
                                                        : "certidao-mensal-perfil-modal__selecao-chevron"
                                                }
                                                aria-hidden="true"
                                            />
                                            </button>
                                        </header>

                                        <div
                                            className={
                                                `certidao-mensal-perfil-modal__selecao-itens${
                                                    documentosNaoExigidosAbertos
                                                        ? ""
                                                        : " is-collapsed"
                                                }`
                                            }
                                        >
                                            {documentosValidos
                                                .filter(
                                                    (documento) =>
                                                        documento
                                                            ?.exigido ===
                                                        false,
                                                )
                                                .map(
                                                    (
                                                        documento,
                                                    ) => (
                                                        <label
                                                            key={
                                                                documento.id
                                                            }
                                                            className={
                                                                idsDocumentosSelecionados.has(
                                                                    documento.id,
                                                                )
                                                                    ? "certidao-mensal-perfil-modal__selecao-item is-selected is-nao"
                                                                    : "certidao-mensal-perfil-modal__selecao-item is-nao"
                                                            }
                                                        >
                                                            <span className="certidao-mensal-perfil-modal__selecao-linha">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={
                                                                        idsDocumentosSelecionados.has(
                                                                            documento.id,
                                                                        )
                                                                    }
                                                                    onChange={() =>
                                                                        alternarDocumentoSelecionado(
                                                                            documento.id,
                                                                        )
                                                                    }
                                                                />

                                                                <span className="certidao-mensal-perfil-modal__selecao-conteudo">
                                                                    <strong>
                                                                        {
                                                                            documento.numero
                                                                        }
                                                                        .{" "}
                                                                        {
                                                                            documento.titulo
                                                                        }
                                                                    </strong>
                                                                    {documento.prazoDocumental && (
                                                    <span
                                                        className="certidao-mensal-perfil-modal__prazo-documental"
                                                        title="Prazo documental configurado para este tipo de documento. A data real de vencimento continua sendo conferida separadamente."
                                                    >
                                                        Prazo: {documento.prazoDocumental}
                                                    </span>
                                                )}
                                                                </span>
                                                            </span>

                                                            <span className="certidao-mensal-perfil-modal__selecao-status is-nao">
                                                                Não exigido
                                                            </span>
                                                        </label>
                                                    ),
                                                )}
                                        </div>
                                    </section>
                                )}
                            </div>

                            <small>
                                Marque um ou mais documentos. A situação, o período e o motivo serão aplicados a todos os selecionados.
                            </small>
                        </div>
                        <fieldset className="certidao-mensal-perfil-modal__campo">
                            <legend>
                                {modoAnual
                                    ? "Situação anual"
                                    : "Nova situação"}
                            </legend>

                            <div className="certidao-mensal-perfil-modal__opcoes">
                                <label
                                    className={
                                        exigido
                                            ? "is-selected"
                                            : ""
                                    }
                                >
                                    <input
                                        type="radio"
                                        name="perfil-documental-exigibilidade"
                                        checked={
                                            exigido
                                        }
                                        onChange={() =>
                                            setExigido(
                                                true,
                                            )
                                        }
                                    />

                                    <span>
                                        Exigido
                                    </span>
                                </label>

                                <label
                                    className={
                                        !exigido
                                            ? "is-selected is-nao"
                                            : ""
                                    }
                                >
                                    <input
                                        type="radio"
                                        name="perfil-documental-exigibilidade"
                                        checked={
                                            !exigido
                                        }
                                        onChange={() =>
                                            setExigido(
                                                false,
                                            )
                                        }
                                    />

                                    <span>
                                        Não exigido
                                    </span>
                                </label>
                            </div>
                        </fieldset>

                        {modoAnual ? (
                            <label className="certidao-mensal-perfil-modal__campo">
                                <span>
                                    A partir do ano
                                </span>

                                <input
                                        type="number"
                                        min="2020"
                                        max="2100"
                                        step="1"
                                        value={
                                            anoInicio
                                        }
                                        onChange={(evento) =>
                                            setAnoInicio(
                                                evento
                                                    .target
                                                    .value
                                                    .replace(
                                                        /[^\d]/g,
                                                        "",
                                                    )
                                                    .slice(
                                                        0,
                                                        4,
                                                    ),
                                            )
                                        }
                                />

                                <small>
                                    A regra passa a valer em janeiro deste ano e permanece até uma nova alteração.
                                </small>
                            </label>
                        ) : (
                            <label className="certidao-mensal-perfil-modal__campo">
                                <span>
                                    Competência da exceção
                                </span>

                                <input
                                    type="month"
                                    value={
                                        competenciaInicio
                                    }
                                    onChange={(evento) =>
                                        setCompetenciaInicio(
                                            evento
                                                .target
                                                .value,
                                        )
                                    }
                                />

                                <small>
                                    Esta exceção vale somente para a competência selecionada. No mês seguinte, o documento volta automaticamente à Regra Anual.
                                </small>
                            </label>
                        )}

                        <label className="certidao-mensal-perfil-modal__campo is-wide">
                            <span>
                                Motivo
                            </span>

                            <textarea
                                value={
                                    motivo
                                }
                                maxLength={
                                    LIMITE_MOTIVO
                                }
                                placeholder="Ex.: Documento não previsto na exigência contratual vigente."
                                onChange={(evento) =>
                                    setMotivo(
                                        evento
                                            .target
                                            .value,
                                    )
                                }
                            />

                            <div className="certidao-mensal-perfil-modal__contador">
                                <small>
                                    Máximo de 500 caracteres
                                </small>

                                <strong>
                                    {caracteresRestantes}
                                </strong>
                            </div>
                        </label>
                    </div>

                    <section className="certidao-mensal-perfil-modal__historico">
                        <header>
                            <div>
                                <History aria-hidden="true" />

                                <div>
                                    <strong>
                                        Histórico do documento
                                    </strong>

                                    <span>
                                        Regras já carregadas para esta empresa
                                    </span>
                                </div>
                            </div>

                            <small>
                                {historicoDocumento.length}{" "}
                                {historicoDocumento.length ===
                                1
                                    ? "regra"
                                    : "regras"}
                            </small>
                        </header>

                        {carregando ? (
                            <p className="certidao-mensal-perfil-modal__mensagem">
                                Carregando histórico...
                            </p>
                        ) : erro ? (
                            <p className="certidao-mensal-perfil-modal__mensagem is-error">
                                {erro}
                            </p>
                        ) : historicoDocumento.length ===
                          0 ? (
                            <p className="certidao-mensal-perfil-modal__mensagem">
                                Nenhuma regra histórica cadastrada para este documento.
                                O comportamento atual utiliza o padrão legado: documento exigido.
                            </p>
                        ) : (
                            <div className="certidao-mensal-perfil-modal__timeline">
                                {historicoDocumento.map(
                                    (
                                        regra,
                                        indice,
                                    ) => {
                                        const dataRegistro =
                                            formatarDataHora(
                                                regra
                                                    ?.atualizadoEm ||
                                                    regra
                                                        ?.criadoEm,
                                            );

                                        return (
                                            <article
                                                key={
                                                    regra?.id ||
                                                    `${tipoDocumento}:${regra?.competenciaInicio}:${indice}`
                                                }
                                            >
                                                <CalendarRange aria-hidden="true" />

                                                <div>
                                                    <strong>
                                                        {regra?.escopo ===
                                                        "COMPETENCIA"
                                                            ? "Exceção mensal · "
                                                            : "Regra anual · "}
                                                        {regra?.exigido ===
                                                        false
                                                            ? "Não exigido"
                                                            : "Exigido"}{" "}
                                                        {regra?.escopo ===
                                                        "COMPETENCIA"
                                                            ? "somente em "
                                                            : "a partir de "}
                                                        {formatarCompetencia(
                                                            regra
                                                                ?.competenciaInicio,
                                                        )}
                                                    </strong>

                                                    <span>
                                                        {regra?.motivo ||
                                                            "Sem motivo informado."}
                                                    </span>

                                                    {dataRegistro && (
                                                        <small>
                                                            Registrado em{" "}
                                                            {dataRegistro}
                                                        </small>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    },
                                )}
                            </div>
                        )}
                    </section>
                </div>

                {abaUploadAtiva && (
                    <div className="certidao-mensal-reenvio-modal__body certidao-mensal-perfil-modal__body certidao-mensal-perfil-modal__body--upload">
                        <CertidaoUploadMassaPanel
                            uploadMassa={uploadMassa}
                            disponivel={uploadMassaDisponivel}
                            embutido
                        />
                    </div>
                )}

                {!abaUploadAtiva && erroSalvar && (
                    <p
                        className="certidao-mensal-perfil-modal__mensagem is-error"
                        role="alert"
                    >
                        {erroSalvar}
                    </p>
                )}

                <footer className="certidao-mensal-reenvio-modal__footer">
                    <button
                        type="button"
                        className="is-secundario"
                        onClick={fechar}
                        disabled={salvando}
                    >
                        Fechar
                    </button>

                    <button
                        type="button"
                        className="is-principal"
                        onClick={salvarRegra}
                        hidden={abaUploadAtiva}
                        disabled={
                            !persistenciaHabilitada ||
                            salvando ||
                            carregando ||
                            Boolean(erro) ||
                            quantidadeDocumentosSelecionados ===
                                0 ||
                            typeof onSalvar !==
                                "function"
                        }
                        title={
                            !persistenciaHabilitada
                                ? "Persistência do perfil documental temporariamente desabilitada."
                                : salvando
                                    ? "Salvando regra..."
                                    : modoAnual
                                        ? "Salvar regra anual"
                                        : "Salvar exceção mensal"
                        }
                    >
                        <Save aria-hidden="true" />
                        {salvando
                            ? "Salvando..."
                            : modoAnual
                                ? "Salvar regra anual"
                                : "Salvar exceção mensal"}
                    </button>
                </footer>
            </section>
        </div>
    );
}