import {
    useEffect,
    useRef,
} from "react";
import {
    AlertTriangle,
    CheckCircle2,
    FileSearch,
    FileText,
    Hash,
    LoaderCircle,
    RefreshCw,
    Save,
    ScanText,
    ShieldCheck,
    UploadCloud,
    X,
} from "lucide-react";
import {
    CertidaoPdfPreAvaliacao,
} from "./CertidaoPdfPreAvaliacao";
import {
    CertidaoComparacaoDocumentos,
} from "./CertidaoComparacaoDocumentos.jsx";
import {
    CertidaoArquivoIncompativel,
} from "./CertidaoArquivoIncompativel.jsx";

function formatarTamanho(bytes) {
    const valor =
        Number(bytes || 0);

    if (!Number.isFinite(valor) || valor <= 0) {
        return "0 MB";
    }

    return `${
        Math.round(
            (
                valor /
                (1024 * 1024)
            ) * 100
        ) / 100
    } MB`;
}

function formatarMetodo(metodo) {
    switch (metodo) {
        case "camada_textual_pdf":
            return "Camada textual do PDF";

        case "ocr_local_tesseract":
            return "OCR local com Tesseract";

        case "pdf_ocr_misto_local":
            return "PDF + OCR local";

        case "pdf_sem_texto_confiavel":
            return "PDF sem texto confiável";

        default:
            return "Leitura local";
    }
}

function prepararAvisosExibicao({
    avisos = [],
    leitura = null,
    preAvaliacao = null,
}) {
    const listaAvisos =
        Array.isArray(avisos)
            ? avisos
            : [];

    const ehGfdDecodificada =
        preAvaliacao
            ?.classificacao
            ?.id ===
            "fgts-digital-gfd" &&
        String(
            leitura?.textoExtraido || ""
        ).includes(
            "GFD - GUIA DO FGTS DIGITAL"
        );

    if (!ehGfdDecodificada) {
        return listaAvisos.slice(
            0,
            6
        );
    }

    return [
        (
            "A Guia do FGTS Digital foi " +
            "decodificada localmente para conferência."
        ),
        (
            "O comprovante de pagamento permaneceu " +
            "intacto e foi analisado separadamente."
        ),
        (
            "Nenhum conteúdo do arquivo foi enviado, " +
            "salvo ou persistido."
        ),
    ];
}

function Indicador({
    Icone,
    rotulo,
    valor,
}) {
    return (
        <article className="certidao-pdf-lab__indicador">
            <Icone aria-hidden="true" />

            <div>
                <span>{rotulo}</span>
                <strong>{valor}</strong>
            </div>
        </article>
    );
}

export function CertidaoPdfLaboratorioModal({
    aberto,
    documento,
    arquivo,
    urlArquivo,
    processando,
    progresso,
    resultadoAnterior,
    resultado,
    empresa,
    competencia,
    usuarioId,
    salvando,
    erroPersistencia,
    resultadoPersistencia,
    podeSalvarPersistenciaAtual,
    persistenciaDisponivel = false,
    fecharLaboratorio,
    processarArquivo,
    salvarPdfAtual,
}) {
    const inputRef =
        useRef(null);

    useEffect(() => {
        if (!aberto) {
            return undefined;
        }

        const overflowAnterior =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        const aoPressionarTecla =
            (evento) => {
                if (evento.key === "Escape") {
                    fecharLaboratorio();
                }
            };

        window.addEventListener(
            "keydown",
            aoPressionarTecla
        );

        return () => {
            document.body.style.overflow =
                overflowAnterior;

            window.removeEventListener(
                "keydown",
                aoPressionarTecla
            );
        };
    }, [
        aberto,
        fecharLaboratorio,
    ]);

    if (!aberto) {
        return null;
    }

    const hash =
        String(
            resultado?.arquivo?.hashSha256 ||
            ""
        );

    const leitura =
        resultado?.leitura || null;

    const avaliacao =
        resultado?.avaliacaoTecnica || null;

    const avisos =
        Array.isArray(resultado?.avisos)
            ? resultado.avisos
            : [];

    const avisosExibicao =
        prepararAvisosExibicao({
            avisos,
            leitura,
            preAvaliacao:
                resultado
                    ?.preAvaliacaoDocumental ||
                null,
        });

    const textoPrevia =
        String(
            leitura?.textoPrevia ||
            leitura?.textoExtraido ||
            ""
        ).slice(0, 2400);

    const selecionarArquivo = () => {
        inputRef.current?.click();
    };

    const podeSalvarDocumento =
        Boolean(
            persistenciaDisponivel &&
            podeSalvarPersistenciaAtual &&
            empresa?.id &&
            competencia &&
            usuarioId &&
            !processando &&
            !salvando &&
            !resultadoPersistencia
        );

    let textoPersistencia =
        "Conclua a análise do PDF para habilitar o salvamento.";

    if (!persistenciaDisponivel) {
        textoPersistencia =
            "Armazenamento documental aguardando ativação.";
    }
    else if (!usuarioId) {
        textoPersistencia =
            "Usuário autenticado não localizado.";
    }
    else if (salvando) {
        textoPersistencia =
            "Salvando PDF no sistema...";
    }
    else if (resultadoPersistencia) {
        textoPersistencia =
            "PDF salvo e vinculado à competência selecionada.";
    }
    else if (erroPersistencia?.mensagem) {
        textoPersistencia =
            erroPersistencia.mensagem;
    }
    else if (podeSalvarDocumento) {
        textoPersistencia =
            "PDF analisado e pronto para salvar no sistema.";
    }

    const salvarArquivoNoSistema =
        async () => {
            if (
                !podeSalvarDocumento ||
                typeof salvarPdfAtual !==
                    "function"
            ) {
                return;
            }

            await salvarPdfAtual({
                empresa,
                competencia,
                usuarioId,
            });
        };

    const aoSelecionarArquivo =
        (evento) => {
            const arquivoSelecionado =
                evento.target.files?.[0] ||
                null;

            evento.target.value = "";

            if (arquivoSelecionado) {
                processarArquivo(
                    arquivoSelecionado,
                    {
                        documento,
                        empresa,
                        competencia,
                    }
                );
            }
        };

    return (
        <div
            className="certidao-pdf-lab"
            role="presentation"
        >
            <button
                type="button"
                className="certidao-pdf-lab__backdrop"
                aria-label="Fechar laboratório de PDF"
                onClick={fecharLaboratorio}
            />

            <section
                className="certidao-pdf-lab__dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="certidao-pdf-lab-title"
            >
                <header className="certidao-pdf-lab__header">
                    <div className="certidao-pdf-lab__header-icon">
                        <FileSearch aria-hidden="true" />
                    </div>

                    <div className="certidao-pdf-lab__header-copy">
                        <p>Diagnóstico local do documento</p>

                        <h2 id="certidao-pdf-lab-title">
                            {documento?.titulo ||
                                "Documento mensal"}
                        </h2>

                        <span>
                            {empresa?.nome || "Empresa não selecionada"}
                            {empresa?.cnpj
                                ? ` · ${empresa.cnpj}`
                                : ""}
                        </span>
                    </div>

                    <div className="certidao-pdf-lab__local-badge">
                        <ShieldCheck aria-hidden="true" />
                        Processamento local
                    </div>

                    <button
                        type="button"
                        className="certidao-pdf-lab__close"
                        onClick={fecharLaboratorio}
                        aria-label="Fechar"
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>

                <div className="certidao-pdf-lab__content">
                    <section className="certidao-pdf-lab__upload">
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={aoSelecionarArquivo}
                            hidden
                        />

                        <button
                            type="button"
                            className="certidao-pdf-lab__dropzone"
                            onClick={selecionarArquivo}
                            disabled={processando}
                        >
                            {processando ? (
                                <LoaderCircle
                                    className="is-spinning"
                                    aria-hidden="true"
                                />
                            ) : (
                                <UploadCloud aria-hidden="true" />
                            )}

                            <strong>
                                {arquivo?.name ||
                                    "Selecionar arquivo PDF"}
                            </strong>

                            <span>
                                PDF de até 25 MB. O arquivo ainda não será enviado ou salvo.
                            </span>
                        </button>

                        <div className="certidao-pdf-lab__progress">
                            <div className="certidao-pdf-lab__progress-head">
                                <span>{progresso?.mensagem}</span>
                                <strong>
                                    {Number(
                                        progresso?.percentual ||
                                        0
                                    )}%
                                </strong>
                            </div>

                            <div className="certidao-pdf-lab__progress-track">
                                <span
                                    style={{
                                        width:
                                            `${
                                                Number(
                                                    progresso?.percentual ||
                                                    0
                                                )
                                            }%`,
                                    }}
                                />
                            </div>
                        </div>
                    </section>

                    {resultado && (
                        <section
                            className={`certidao-pdf-lab__resultado ${
                                resultado.sucesso
                                    ? "is-sucesso"
                                    : "is-falha"
                            }`}
                        >
                            <header className="certidao-pdf-lab__resultado-header">
                                {resultado.sucesso ? (
                                    <CheckCircle2 aria-hidden="true" />
                                ) : (
                                    <AlertTriangle aria-hidden="true" />
                                )}

                                <div>
                                    <strong>
                                        {resultado.sucesso
                                            ? "Leitura técnica concluída"
                                            : "Arquivo não aprovado"}
                                    </strong>

                                    <span>
                                        {resultado.sucesso
                                            ? avaliacao?.observacao
                                            : resultado.erro}
                                    </span>
                                </div>
                            </header>

                            {resultado.sucesso && (
                                <div className="certidao-pdf-lab__indicadores">
                                    <Indicador
                                        Icone={FileText}
                                        rotulo="Arquivo"
                                        valor={formatarTamanho(
                                            resultado
                                                ?.arquivo
                                                ?.tamanhoBytes
                                        )}
                                    />

                                    <Indicador
                                        Icone={Hash}
                                        rotulo="SHA-256"
                                        valor={
                                            hash
                                                ? `${hash.slice(0, 12)}…`
                                                : "Não calculado"
                                        }
                                    />

                                    <Indicador
                                        Icone={ScanText}
                                        rotulo="Método"
                                        valor={formatarMetodo(
                                            leitura?.metodo
                                        )}
                                    />

                                    <Indicador
                                        Icone={FileSearch}
                                        rotulo="Páginas"
                                        valor={`${
                                            leitura?.paginasLidas ||
                                            0
                                        } / ${
                                            leitura?.totalPaginas ||
                                            0
                                        }`}
                                    />

                                    <Indicador
                                        Icone={ShieldCheck}
                                        rotulo="Confiança"
                                        valor={`${
                                            leitura?.confianca ||
                                            0
                                        }%`}
                                    />

                                    <Indicador
                                        Icone={FileText}
                                        rotulo="Texto"
                                        valor={`${
                                            leitura?.quantidadeCaracteres ||
                                            0
                                        } caracteres`}
                                    />
                                </div>
                            )}
                        </section>
                    )}

                    <CertidaoArquivoIncompativel
                        tentativa={
                            resultado
                                ?.tentativaRecusada
                        }
                        onSelecionarOutro={
                            selecionarArquivo
                        }
                        processando={
                            processando
                        }
                    />

                    <CertidaoPdfPreAvaliacao
                        preAvaliacao={
                            resultado
                                ?.preAvaliacaoDocumental
                        }
                    />

                    <CertidaoComparacaoDocumentos
                        resultadoAnterior={resultadoAnterior}
                        resultadoAtual={resultado}
                    />

                    <div className="certidao-pdf-lab__workspace">
                        <section className="certidao-pdf-lab__preview">
                            <header>
                                <strong>Arquivo original</strong>
                                <span>Visualização local do navegador</span>
                            </header>

                            {urlArquivo ? (
                                <iframe
                                    src={urlArquivo}
                                    title={`Visualização de ${
                                        arquivo?.name ||
                                        "documento PDF"
                                    }`}
                                />
                            ) : (
                                <div className="certidao-pdf-lab__empty">
                                    <FileText aria-hidden="true" />
                                    <strong>Nenhum PDF selecionado</strong>
                                    <span>
                                        O documento original aparecerá aqui sem ser enviado ao servidor.
                                    </span>
                                </div>
                            )}
                        </section>

                        <section className="certidao-pdf-lab__details">
                            <header>
                                <strong>Leitura local</strong>
                                <span>
                                    Resultado técnico preliminar
                                </span>
                            </header>

                            {textoPrevia ? (
                                <pre>{textoPrevia}</pre>
                            ) : (
                                <div className="certidao-pdf-lab__empty certidao-pdf-lab__empty--compact">
                                    <ScanText aria-hidden="true" />
                                    <strong>Texto ainda não disponível</strong>
                                    <span>
                                        Selecione um PDF para iniciar a leitura.
                                    </span>
                                </div>
                            )}

                            {avisosExibicao.length > 0 && (
                                <div className="certidao-pdf-lab__warnings">
                                    <strong>Avisos técnicos</strong>

                                    {avisosExibicao.map((aviso) => (
                                        <p key={aviso}>
                                            <AlertTriangle aria-hidden="true" />
                                            <span>{aviso}</span>
                                        </p>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </div>

                <footer className="certidao-pdf-lab__footer">
                    <p>
                        {textoPersistencia}
                    </p>

                    <div className="certidao-pdf-lab__footer-actions">
                        <button
                            type="button"
                            className="certidao-pdf-lab__botao-icone"
                            onClick={selecionarArquivo}
                            disabled={
                                processando ||
                                salvando
                            }
                        >
                            <RefreshCw aria-hidden="true" />
                            Analisar certidão atualizada
                        </button>

                        <button
                            type="button"
                            className="certidao-pdf-lab__reanalisar certidao-pdf-lab__salvar"
                            onClick={salvarArquivoNoSistema}
                            disabled={
                                !podeSalvarDocumento
                            }
                        >
                            {salvando ? (
                                <LoaderCircle
                                    className="is-spinning"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Save aria-hidden="true" />
                            )}

                            {resultadoPersistencia
                                ? "PDF salvo"
                                : salvando
                                    ? "Salvando PDF..."
                                    : "Salvar PDF no sistema"}
                        </button>

                        <button
                            type="button"
                            onClick={fecharLaboratorio}
                            disabled={salvando}
                        >
                            Fechar laboratório
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}