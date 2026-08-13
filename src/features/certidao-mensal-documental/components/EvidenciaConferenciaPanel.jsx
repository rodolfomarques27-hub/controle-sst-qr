import { useEffect, useState } from "react";
import {
    CheckCircle2,
    ExternalLink,
    FileSearch,
    FileText,
    RotateCcw,
    ShieldCheck,
} from "lucide-react";
import { STATUS_DOCUMENTAL } from "../constants/certidaoMensalConstants";
import {
    buscarHistoricoDocumentoCertidaoMensal,
} from "../services/certidaoMensalHistoricoService";
import {
    criarUrlAssinadaPdfCertidaoMensal,
} from "../services/certidaoMensalDocumentPersistenceService";
import {
    HistoricoDocumentoTimeline,
} from "./HistoricoDocumentoTimeline";
import {
    SolicitarReenvioDocumentoModal,
} from "./SolicitarReenvioDocumentoModal";
import {
    CertidaoFolhaEvidenciasComplementares,
} from "./CertidaoFolhaEvidenciasComplementares.jsx";

function RegraResultadoIcon({ resultado }) {
    if (resultado === "aprovada") {
        return <CheckCircle2 aria-hidden="true" />;
    }

    if (resultado === "reprovada") {
        return <RotateCcw aria-hidden="true" />;
    }

    return <FileSearch aria-hidden="true" />;
}

function obterRotuloResultadoRegra(
    resultado
) {
    if (resultado === "aprovada") {
        return "Aprovada";
    }

    if (resultado === "reprovada") {
        return "Reprovada";
    }

    if (resultado === "alerta") {
        return "Atenção";
    }

    return "Revisar";
}

export function EvidenciaConferenciaPanel({
    empresa,
    documento,
    competencia,
    usuarioDisponivel = false,
    onConfirmarSnapshotMaoDeObra,
    onRevisarSnapshotMaoDeObra,
    onConfirmarDocumento,
    onSolicitarReenvioDocumento,
}) {
    const [aba, setAba] =
        useState("dados");

    useEffect(() => {
        setAba("dados");
    }, [documento?.id]);

    const snapshotMaoDeObra =
        documento?.id === "relacao-empregados"
            ? documento?.snapshotMaoDeObra || null
            : null;

    const snapshotConfirmado =
        snapshotMaoDeObra?.statusSnapshot ===
        "confirmado";

    const podeConfirmarSnapshot =
        Boolean(
            snapshotMaoDeObra &&
            !snapshotConfirmado &&
            usuarioDisponivel &&
            onConfirmarSnapshotMaoDeObra
        );

    const documentoVencido =
        documento?.status ===
            "vencido" ||
        documento?.documentoVencido ===
            true;

    const totalRegras =
        Array.isArray(
            documento?.regras
        )
            ? documento.regras.length
            : 0;

    const urlDocumento =
        String(
            documento?.urlArquivo ||
            documento
                ?.documentoPersistido
                ?.urlAssinada ||
            ""
        ).trim();

    const itemPersistido =
        documento
            ?.documentoPersistido
            ?.item || null;

    const versaoAtualIdPersistida =
        String(
            itemPersistido
                ?.versao_atual_id ||
            itemPersistido
                ?.versaoAtualId ||
            documento
                ?.documentoPersistido
                ?.versao
                ?.id ||
            ""
        ).trim();

    const documentoConfirmado =
        documento?.status ===
            "confirmado" ||
        String(
            itemPersistido?.status || ""
        ).toUpperCase() ===
            "CONFORME";

    const reenvioSolicitado =
        documento?.status ===
            "reenvioSolicitado" ||
        String(
            itemPersistido?.status || ""
        ).toUpperCase() ===
            "REENVIO_SOLICITADO";

    const itemPersistidoId =
        String(
            itemPersistido?.id || ""
        ).trim();

    const [
        historicoEstado,
        setHistoricoEstado,
    ] = useState(() => ({
        itemId:
            "",
        carregando:
            false,
        erro:
            "",
        eventos:
            [],
    }));

    const historicoDoItemAtual =
        Boolean(
            itemPersistidoId &&
            historicoEstado.itemId ===
                itemPersistidoId
        );

    const abrirVersaoHistorica =
        async (evento) => {
            const caminhoStorage =
                String(
                    evento?.caminhoStorage ||
                    ""
                ).trim();

            if (!caminhoStorage) {
                window.alert(
                    "Esta versão histórica não possui arquivo disponível para abertura."
                );

                return;
            }

            const janelaHistorico =
                window.open(
                    "",
                    "_blank"
                );

            if (!janelaHistorico) {
                window.alert(
                    "O navegador bloqueou a nova aba. Permita pop-ups para o SafeScan e tente novamente."
                );

                return;
            }

            try {
                janelaHistorico.opener =
                    null;

                const urlAssinada =
                    await criarUrlAssinadaPdfCertidaoMensal({
                        caminhoStorage,
                        duracaoSegundos:
                            900,
                    });

                janelaHistorico.location.replace(
                    urlAssinada
                );
            }
            catch (error) {
                try {
                    janelaHistorico.close();
                }
                catch {
                    // Nenhuma ação adicional é necessária.
                }

                console.error(
                    "Não foi possível abrir a versão histórica do documento.",
                    error
                );

                window.alert(
                    error?.message ||
                    "Não foi possível abrir a versão histórica do documento."
                );
            }
        };
    const carregarHistoricoDocumento =
        async ({
            abrir = true,
        } = {}) => {
            if (abrir) {
                setAba(
                    "historico"
                );
            }

            const itemId =
                itemPersistidoId;

            if (!itemId) {
                setHistoricoEstado({
                    itemId:
                        "",
                    carregando:
                        false,
                    erro:
                        "Documento sem registro persistido para consulta do histórico.",
                    eventos:
                        [],
                });

                return;
            }

            setHistoricoEstado(
                (estadoAtual) => ({
                    itemId,
                    carregando:
                        true,
                    erro:
                        "",
                    eventos:
                        estadoAtual.itemId ===
                        itemId
                            ? estadoAtual.eventos
                            : [],
                })
            );

            try {
                const eventos =
                    await buscarHistoricoDocumentoCertidaoMensal({
                        itemId,
                    });

                setHistoricoEstado(
                    (estadoAtual) => {
                        if (
                            estadoAtual.itemId !==
                            itemId
                        ) {
                            return estadoAtual;
                        }

                        return {
                            itemId,
                            carregando:
                                false,
                            erro:
                                "",
                            eventos:
                                Array.isArray(
                                    eventos
                                )
                                    ? eventos
                                    : [],
                        };
                    }
                );
            }
            catch (error) {
                setHistoricoEstado(
                    (estadoAtual) => {
                        if (
                            estadoAtual.itemId !==
                            itemId
                        ) {
                            return estadoAtual;
                        }

                        return {
                            ...estadoAtual,
                            carregando:
                                false,
                            erro:
                                String(
                                    error?.message ||
                                    "Não foi possível consultar o histórico documental."
                                ).trim(),
                        };
                    }
                );
            }
        };

    const [
        confirmacaoDocumentoEstado,
        setConfirmacaoDocumentoEstado,
    ] = useState(() => ({
        documentoId:
            "",
        carregando:
            false,
        erro:
            "",
    }));

    const confirmandoDocumento =
        confirmacaoDocumentoEstado
            .documentoId ===
            documento?.id &&
        confirmacaoDocumentoEstado
            .carregando;

    const erroConfirmacaoDocumento =
        confirmacaoDocumentoEstado
            .documentoId ===
            documento?.id
            ? confirmacaoDocumentoEstado.erro
            : "";

    const [
        reenvioDocumentoEstado,
        setReenvioDocumentoEstado,
    ] = useState(() => ({
        documentoId:
            "",
        aberto:
            false,
        enviando:
            false,
        erro:
            "",
    }));

    const modalReenvioAberto =
        reenvioDocumentoEstado
            .documentoId ===
            documento?.id &&
        reenvioDocumentoEstado
            .aberto;

    const enviandoReenvio =
        reenvioDocumentoEstado
            .documentoId ===
            documento?.id &&
        reenvioDocumentoEstado
            .enviando;

    const erroReenvio =
        reenvioDocumentoEstado
            .documentoId ===
            documento?.id
            ? reenvioDocumentoEstado.erro
            : "";

    const documentoExigido =
        documento?.exigido !== false;

    const podeSolicitarReenvio =
        Boolean(
            documentoExigido &&
            documento?.temEvidencia &&
            !reenvioSolicitado &&
            usuarioDisponivel &&
            itemPersistido?.id &&
            versaoAtualIdPersistida &&
            onSolicitarReenvioDocumento
        );

    const abrirModalReenvio =
        () => {
            if (!podeSolicitarReenvio) {
                return;
            }

            setReenvioDocumentoEstado({
                documentoId:
                    documento.id,
                aberto:
                    true,
                enviando:
                    false,
                erro:
                    "",
            });
        };

    const fecharModalReenvio =
        () => {
            if (enviandoReenvio) {
                return;
            }

            setReenvioDocumentoEstado({
                documentoId:
                    "",
                aberto:
                    false,
                enviando:
                    false,
                erro:
                    "",
            });
        };

    const confirmarSolicitacaoReenvio =
        async (motivo) => {
            if (
                !documentoExigido ||
                !modalReenvioAberto ||
                enviandoReenvio ||
                !onSolicitarReenvioDocumento
            ) {
                return;
            }

            setReenvioDocumentoEstado({
                documentoId:
                    documento.id,
                aberto:
                    true,
                enviando:
                    true,
                erro:
                    "",
            });

            try {
                await onSolicitarReenvioDocumento(
                    documento,
                    motivo
                );

                setReenvioDocumentoEstado({
                    documentoId:
                        "",
                    aberto:
                        false,
                    enviando:
                        false,
                    erro:
                        "",
                });

                void carregarHistoricoDocumento({
                    abrir:
                        false,
                });
            }
            catch (error) {
                setReenvioDocumentoEstado({
                    documentoId:
                        documento.id,
                    aberto:
                        true,
                    enviando:
                        false,
                    erro:
                        String(
                            error?.message ||
                            "Não foi possível registrar a solicitação de reenvio."
                        ).trim(),
                });
            }
        };

    const requerConsultaOficial =
        itemPersistido
            ?.requer_consulta_oficial ===
            true ||
        itemPersistido
            ?.requerConsultaOficial ===
            true;

    const statusConsultaOficial =
        String(
            itemPersistido
                ?.status_consulta_oficial ||
            itemPersistido
                ?.statusConsultaOficial ||
            ""
        )
            .trim()
            .toUpperCase();

    const confirmacaoIncluiConsultaOficial =
        requerConsultaOficial &&
        statusConsultaOficial ===
            "PENDENTE";

    const podeConfirmarDocumento =
        Boolean(
            documentoExigido &&
            documento?.temEvidencia &&
            !documentoVencido &&
            !documentoConfirmado &&
            usuarioDisponivel &&
            itemPersistido?.id &&
            versaoAtualIdPersistida &&
            onConfirmarDocumento
        );

    const confirmarDocumento =
        async () => {
            if (
                !podeConfirmarDocumento ||
                confirmandoDocumento
            ) {
                return;
            }

            setConfirmacaoDocumentoEstado({
                documentoId:
                    documento.id,
                carregando:
                    true,
                erro:
                    "",
            });

            try {
                await onConfirmarDocumento(
                    documento
                );

                setConfirmacaoDocumentoEstado({
                    documentoId:
                        documento.id,
                    carregando:
                        false,
                    erro:
                        "",
                });

                void carregarHistoricoDocumento({
                    abrir:
                        false,
                });
            }
            catch (error) {
                setConfirmacaoDocumentoEstado({
                    documentoId:
                        documento.id,
                    carregando:
                        false,
                    erro:
                        String(
                            error?.message ||
                            "Não foi possível confirmar o documento."
                        ).trim(),
                });
            }
        };

    if (!documento?.temEvidencia) {
        const statusSemArquivo = STATUS_DOCUMENTAL[documento?.status] || STATUS_DOCUMENTAL.pendente;
        return (
            <section className="certidao-mensal-panel certidao-mensal-evidencia">
                <header className="certidao-mensal-evidencia__header">
                    <div className="certidao-mensal-unified-header__main">
                        <span className="certidao-mensal-unified-header__icon"><FileSearch aria-hidden="true" /></span>
                        <div>
                            <h3>Evidência e conferência</h3>
                            <p>{documento?.titulo || "Documento não selecionado"}</p>
                            <small title={empresa?.nome}>{empresa?.nome || "Selecione uma empresa"}{empresa?.cnpj ? ` · ${empresa.cnpj}` : ""}</small>
                        </div>
                    </div>
                    <span className={`certidao-mensal-status ${statusSemArquivo.classe}`}><i aria-hidden="true" />{statusSemArquivo.rotulo}</span>
                </header>

                {!documentoExigido && (
                    <div
                        className="certidao-mensal-evidencia__nao-exigido"
                        role="status"
                    >
                        <ShieldCheck aria-hidden="true" />

                        <div>
                            <strong>
                                Não exigido para este contrato
                            </strong>

                            <span>
                                Este documento permanece visível apenas para consulta e preservação do histórico.
                            </span>
                        </div>
                    </div>
                )}

                {snapshotMaoDeObra ? (
                    <div className="certidao-mensal-snapshot">
                        <header className="certidao-mensal-snapshot__header">
                            <span className="certidao-mensal-snapshot__icon">
                                <ShieldCheck aria-hidden="true" />
                            </span>

                            <div>
                                <strong>
                                    Relação mensal de empregados
                                </strong>

                                <span>
                                    Base preparada pelo cadastro interno do SafeScan.
                                </span>
                            </div>

                            <span
                                className={`certidao-mensal-snapshot__status ${
                                    snapshotConfirmado
                                        ? "is-confirmado"
                                        : "is-rascunho"
                                }`}
                            >
                                {snapshotConfirmado
                                    ? "Confirmado"
                                    : "Aguardando confirmação"}
                            </span>
                        </header>

                        <div className="certidao-mensal-snapshot__indicadores">
                            <article>
                                <span>Total de colaboradores</span>

                                <strong>
                                    {snapshotMaoDeObra.totalColaboradores}
                                </strong>

                                <small>na relação preparada</small>
                            </article>

                            <article>
                                <span>Competência</span>

                                <strong>
                                    {documento?.camposExtraidos?.find(
                                        (campo) =>
                                            campo.rotulo === "Competência"
                                    )?.valor || "—"}
                                </strong>

                                <small>referência mensal</small>
                            </article>

                            <article>
                                <span>Origem</span>

                                <strong>
                                    {snapshotMaoDeObra.origemDados ===
                                    "historico_estruturado"
                                        ? "Histórico"
                                        : snapshotMaoDeObra.origemDados ===
                                            "confirmacao_manual"
                                            ? "Manual"
                                            : "Cadastro"}
                                </strong>

                                <small>fonte dos dados</small>
                            </article>
                        </div>

                        <section className="certidao-mensal-snapshot__colaboradores">
                            <header>
                                <strong>
                                    Colaboradores incluídos
                                </strong>

                                <span>
                                    {snapshotMaoDeObra.totalColaboradores}
                                    {" "}
                                    registro(s)
                                </span>
                            </header>

                            {snapshotMaoDeObra.colaboradores?.length ? (
                                <div className="certidao-mensal-snapshot__nomes">
                                    {snapshotMaoDeObra.colaboradores
                                        .slice(0, 8)
                                        .map((colaborador) => (
                                            <span key={colaborador.id}>
                                                <b>{colaborador.nome}</b>

                                                <small>
                                                    {colaborador.funcao ||
                                                        "Função não informada"}
                                                </small>
                                            </span>
                                        ))}

                                    {snapshotMaoDeObra.colaboradores.length >
                                        8 && (
                                        <span className="is-restante">
                                            <b>
                                                +
                                                {snapshotMaoDeObra
                                                    .colaboradores
                                                    .length - 8}
                                            </b>

                                            <small>
                                                outros colaboradores
                                            </small>
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="certidao-mensal-snapshot__vazio">
                                    Nenhum colaborador ativo foi localizado
                                    para esta relação.
                                </p>
                            )}
                        </section>

                        <footer className="certidao-mensal-snapshot__footer">
                            <div>
                                <strong>
                                    {snapshotConfirmado
                                        ? "Relação confirmada e salva"
                                        : snapshotMaoDeObra
                                            .confiancaHistorica ===
                                            "insuficiente"
                                            ? "O histórico exige confirmação humana"
                                            : "Confirme a relação antes do fechamento"}
                                </strong>

                                <span>
                                    A confirmação é gravada na competência mensal e
                                    permanece disponível após recarregar a página.
                                </span>
                            </div>

                            <button
                                type="button"
                                className="certidao-mensal-snapshot__confirmar"
                                onClick={
                                    snapshotConfirmado &&
                                    typeof onRevisarSnapshotMaoDeObra ===
                                        "function"
                                        ? onRevisarSnapshotMaoDeObra
                                        : onConfirmarSnapshotMaoDeObra
                                }
                                disabled={
                                    snapshotConfirmado
                                        ? typeof onRevisarSnapshotMaoDeObra !==
                                            "function"
                                        : !podeConfirmarSnapshot
                                }
                            >
                                <CheckCircle2 aria-hidden="true" />

                                {snapshotConfirmado
                                    ? typeof onRevisarSnapshotMaoDeObra ===
                                        "function"
                                        ? "Revisar relação"
                                        : "Relação confirmada"
                                    : usuarioDisponivel
                                        ? "Confirmar relação mensal"
                                        : "Usuário não identificado"}
                            </button>
                        </footer>
                    </div>
                ) : (
                    <div className="certidao-mensal-evidencia__arquivo">
                        <div className="certidao-mensal-evidencia__arquivo-page">
                            {documento?.origemSistema
                                ? <ShieldCheck aria-hidden="true" />
                                : <FileSearch aria-hidden="true" />}

                            <strong>
                                {documento?.origemSistema
                                    ? "Consolidação interna do SafeScan"
                                    : "Nenhuma evidência real disponível"}
                            </strong>

                            <span>
                                {documento?.origemSistema
                                    ? `${documento.detalhePrincipal}. ${documento.detalheSecundario}.`
                                    : "Envie o documento desta empresa e competência para iniciar a extração e a conferência."}
                            </span>

                            {documento?.origemSistema &&
                                documento.camposExtraidos?.map(
                                    (campo) => (
                                        <span key={campo.rotulo}>
                                            <b>{campo.rotulo}:</b>
                                            {" "}
                                            {campo.valor}
                                        </span>
                                    )
                                )}
                        </div>
                    </div>
                )}            </section>
        );
    }

    const status =
        STATUS_DOCUMENTAL[documento.status]
        || STATUS_DOCUMENTAL.pendente;

    return (
        <section className="certidao-mensal-panel certidao-mensal-evidencia">
            <header className="certidao-mensal-evidencia__header">
                <div className="certidao-mensal-unified-header__main">
                    <span className="certidao-mensal-unified-header__icon"><FileSearch aria-hidden="true" /></span>
                    <div>
                        <h3>Evidência e conferência</h3>
                        <p>{documento.titulo}</p>
                        <small title={empresa.nome}>{empresa.nome} · {empresa.cnpj}</small>
                    </div>
                </div>

                <span className={`certidao-mensal-status ${status.classe}`}>
                    <i aria-hidden="true" />
                    {status.rotulo}
                </span>
            </header>

            {documento?.id === "folha-pagamento" && (
                <CertidaoFolhaEvidenciasComplementares
                    empresa={empresa}
                    documento={documento}
                    competencia={competencia}
                    desabilitado={!usuarioDisponivel}
                />
            )}

            <div className="certidao-mensal-evidencia__tabs">
                <button
                    type="button"
                    className={aba === "dados" ? "is-active" : ""}
                    onClick={() => setAba("dados")}
                >
                    Dados extraídos
                </button>

                <button
                    type="button"
                    className={aba === "arquivo" ? "is-active" : ""}
                    onClick={() => setAba("arquivo")}
                >
                    Arquivo original
                </button>

                <button
                    type="button"
                    className={aba === "historico" ? "is-active" : ""}
                    onClick={() => {
                        void carregarHistoricoDocumento();
                    }}
                >
                    Histórico
                </button>
            </div>

            {aba !== "historico" && (
                <div className="certidao-mensal-evidencia__toolbar">
                    <div className="certidao-mensal-evidencia__file">
                        <FileText aria-hidden="true" />
                        <span>{documento.arquivoNome}</span>
                    </div>

                    <button
                        type="button"
                        className="certidao-mensal-evidencia__toolbar-action"
                        title="Abrir o PDF na visualização completa"
                        onClick={() =>
                            setAba(
                                "arquivo"
                            )
                        }
                    >
                        <ExternalLink aria-hidden="true" />
                        Abrir PDF completo
                    </button>
                </div>
            )}

            {!documentoExigido && (
                <div
                    className="certidao-mensal-evidencia__nao-exigido"
                    role="status"
                >
                    <ShieldCheck aria-hidden="true" />

                    <div>
                        <strong>
                            Não exigido para este contrato
                        </strong>

                        <span>
                            Evidências e versões anteriores foram preservadas. Ações de cobrança e confirmação estão bloqueadas.
                        </span>
                    </div>
                </div>
            )}

            {aba === "historico" ? (
                <div className="certidao-mensal-evidencia__historico">
                    <HistoricoDocumentoTimeline
                        eventos={
                            historicoDoItemAtual
                                ? historicoEstado.eventos
                                : []
                        }
                        carregando={
                            historicoDoItemAtual &&
                            historicoEstado.carregando
                        }
                        erro={
                            historicoDoItemAtual
                                ? historicoEstado.erro
                                : ""
                        }
                        onAtualizar={() => {
                            void carregarHistoricoDocumento({
                                abrir:
                                    false,
                            });
                        }}
                        onAbrirVersao={(evento) => {
                            void abrirVersaoHistorica(
                                evento
                            );
                        }}
                    />
                </div>
            ) : aba === "dados" ? (
                <div className="certidao-mensal-evidencia__body">
                    <div className="certidao-mensal-evidencia__preview">
                        <div className="certidao-mensal-preview-real">
                            {urlDocumento ? (
                                <iframe
                                    className="certidao-mensal-preview-real__frame"
                                    src={urlDocumento}
                                    title={
                                        "Prévia de " +
                                        (
                                            documento.arquivoNome ||
                                            "documento PDF"
                                        )
                                    }
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="certidao-mensal-preview-real__empty">
                                    <FileText aria-hidden="true" />

                                    <strong>
                                        Prévia do PDF indisponível
                                    </strong>

                                    <span>
                                        Atualize a página para gerar um novo
                                        acesso temporário ao arquivo.
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="certidao-mensal-extraidos">
                            {documento.camposExtraidos.map((campo) => (
                                <div
                                    key={campo.rotulo}
                                    className="certidao-mensal-extraidos__row"
                                >
                                    <span>{campo.rotulo}</span>
                                    <strong>{campo.valor}</strong>
                                </div>
                            ))}
                        </div>
                    </div>

                    <footer className="certidao-mensal-evidencia__acoes">
                        {!documentoExigido ? (
                            <button
                                type="button"
                                className="certidao-mensal-acao certidao-mensal-acao--nao-exigido"
                                title="Não exigido para este contrato."
                                disabled
                            >
                                <ShieldCheck aria-hidden="true" />
                                Não exigido para este contrato
                            </button>
                        ) : documentoVencido ? (
                            <button
                                type="button"
                                className="certidao-mensal-acao certidao-mensal-acao--nao-conforme"
                                title="O documento está vencido e não pode ser confirmado."
                                disabled
                            >
                                <RotateCcw aria-hidden="true" />
                                Documento não conforme
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="certidao-mensal-acao certidao-mensal-acao--confirmar"
                                title={
                                    erroConfirmacaoDocumento ||
                                    (
                                        documentoConfirmado
                                            ? "Documento já confirmado."
                                            : !usuarioDisponivel
                                                ? "Usuário não identificado."
                                                : !itemPersistido?.id ||
                                                    !versaoAtualIdPersistida
                                                    ? "Documento sem versão persistida para confirmação."
                                                    : confirmacaoIncluiConsultaOficial
                                                        ? "Confirma que a autenticidade foi verificada na fonte oficial e registra o documento como conforme."
                                                        : "Registrar o documento como conforme na trilha de auditoria."
                                    )
                                }
                                onClick={
                                    confirmarDocumento
                                }
                                disabled={
                                    !podeConfirmarDocumento ||
                                    confirmandoDocumento
                                }
                            >
                                <CheckCircle2 aria-hidden="true" />

                                {documentoConfirmado
                                    ? "Documento confirmado"
                                    : confirmandoDocumento
                                        ? "Confirmando..."
                                        : erroConfirmacaoDocumento
                                            ? "Tentar confirmar"
                                            : confirmacaoIncluiConsultaOficial
                                                ? "Confirmar consulta e documento"
                                                : "Confirmar documento"}
                            </button>
                        )}

                        <button
                            type="button"
                            className="certidao-mensal-acao certidao-mensal-acao--reenvio"
                            title={
                                !documentoExigido
                                    ? "Não exigido para este contrato."
                                    : erroReenvio ||
                                        (
                                            reenvioSolicitado
                                                ? "O reenvio deste documento já foi solicitado."
                                                : !usuarioDisponivel
                                                    ? "Usuário não identificado."
                                                    : !itemPersistido?.id ||
                                                        !versaoAtualIdPersistida
                                                        ? "Documento sem versão persistida para solicitação."
                                                        : "Registrar uma solicitação de documento atualizado."
                                        )
                            }
                            onClick={
                                abrirModalReenvio
                            }
                            disabled={
                                !podeSolicitarReenvio ||
                                enviandoReenvio
                            }
                        >
                            <RotateCcw aria-hidden="true" />

                            {!documentoExigido
                                ? "Não exigido"
                                : reenvioSolicitado
                                    ? "Reenvio solicitado"
                                    : enviandoReenvio
                                        ? "Registrando..."
                                        : erroReenvio
                                            ? "Tentar solicitar novamente"
                                            : "Solicitar documento atualizado"}
                        </button>

                    </footer>

                    {documentoExigido && reenvioSolicitado ? (
                        <p className="certidao-mensal-evidencia__tratativa">
                            Reenvio solicitado. A competência permanecerá com
                            pendência até o recebimento de uma nova versão.
                        </p>
                    ) : (
                        documentoExigido && documentoVencido && (
                            <p className="certidao-mensal-evidencia__tratativa">
                                Documento vencido. Solicite uma versão atualizada
                                antes do fechamento da competência.
                            </p>
                        )
                    )}

                    {documentoExigido && modalReenvioAberto && (
                        <SolicitarReenvioDocumentoModal
                            key={documento?.id}
                            documento={documento}
                            enviando={enviandoReenvio}
                            erro={erroReenvio}
                            onCancelar={
                                fecharModalReenvio
                            }
                            onConfirmar={
                                confirmarSolicitacaoReenvio
                            }
                        />
                    )}

                    <section className="certidao-mensal-regras">
                        <header>
                            <ShieldCheck aria-hidden="true" />
                            <div>
                                <strong>Regras automáticas</strong>
                                <span>
                                    {documentoVencido
                                        ? "Resultado técnico preliminar: documento vencido e pendente de tratativa."
                                        : "Resultado técnico preliminar para apoio à conferência humana."}
                                </span>
                            </div>
                        </header>

                        <div className="certidao-mensal-regras__lista">
                            {documento.regras.map((regra) => (
                                <div
                                    key={regra.texto}
                                    className={`certidao-mensal-regra is-${regra.resultado}`}
                                >
                                    <RegraResultadoIcon resultado={regra.resultado} />
                                    <span>{regra.texto}</span>
                                    <small>
                                        {obterRotuloResultadoRegra(
                                            regra.resultado
                                        )}
                                    </small>
                                </div>
                            ))}
                        </div>

                        <div className="certidao-mensal-regras__resumo">
                            {totalRegras}
                            {" "}
                            {totalRegras === 1
                                ? "regra avaliada"
                                : "regras avaliadas"}
                        </div>
                    </section>
                </div>
            ) : (
                <div className="certidao-mensal-evidencia__arquivo certidao-mensal-evidencia__arquivo--pdf">
                    {urlDocumento ? (
                        <iframe
                            className="certidao-mensal-evidencia__arquivo-frame"
                            src={urlDocumento}
                            title={
                                "Visualização de " +
                                (
                                    documento.arquivoNome ||
                                    "documento PDF"
                                )
                            }
                            referrerPolicy="no-referrer"
                        />
                    ) : (
                        <div className="certidao-mensal-evidencia__arquivo-page is-indisponivel">
                            <FileText aria-hidden="true" />
                            <strong>{documento.arquivoNome}</strong>
                            <span>
                                Não foi possível gerar o acesso temporário
                                ao PDF. Atualize a página e tente novamente.
                            </span>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
