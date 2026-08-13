import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    AlertTriangle,
    CheckCircle2,
    ExternalLink,
    FileText,
    LoaderCircle,
    Plus,
    ReceiptText,
    Upload,
    WalletCards,
} from "lucide-react";

import {
    CERTIDAO_MENSAL_TIPOS_EVIDENCIA,
    criarUrlAssinadaEvidenciaCertidaoMensal,
    listarEvidenciasAtivasCertidaoMensal,
    salvarEvidenciaComplementarCertidaoMensal,
} from "../services/certidaoMensalEvidenciaPersistenceService.js";

import "../../../styles/pages/certidao-folha-evidencias-complementares.css";

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function obterItemId(
    documento
) {
    return textoSeguro(
        documento
            ?.documentoPersistido
            ?.item
            ?.id ||
        documento
            ?.documentoPersistido
            ?.itemId
    );
}

function normalizarCompetencia(
    competencia
) {
    const valor =
        textoSeguro(
            competencia
        );

    if (
        /^\d{4}-\d{2}-\d{2}$/.test(
            valor
        )
    ) {
        return (
            valor.slice(
                0,
                7
            ) +
            "-01"
        );
    }

    if (
        /^\d{4}-\d{2}$/.test(
            valor
        )
    ) {
        return `${valor}-01`;
    }

    const padraoBrasileiro =
        valor.match(
            /^(0[1-9]|1[0-2])\/(\d{4})$/
        );

    if (padraoBrasileiro) {
        return (
            padraoBrasileiro[2] +
            "-" +
            padraoBrasileiro[1] +
            "-01"
        );
    }

    return valor;
}

function formatarTamanho(
    bytes
) {
    const numero =
        Number(
            bytes || 0
        );

    if (
        !Number.isFinite(
            numero
        ) ||
        numero <= 0
    ) {
        return "";
    }

    if (numero < 1024 * 1024) {
        return `${
            Math.max(
                1,
                Math.round(
                    numero / 1024
                )
            )
        } KB`;
    }

    return `${
        (
            numero /
            (1024 * 1024)
        ).toFixed(
            2
        )
    } MB`;
}

function formatarDataHora(
    valor
) {
    const data =
        new Date(
            valor || ""
        );

    if (
        Number.isNaN(
            data.getTime()
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
        }
    );
}

function EvidenciaArquivo({
    evidencia,
    abrindo,
    onAbrir,
}) {
    const metadados =
        [
            evidencia?.totalPaginas > 0
                ? `${
                    evidencia.totalPaginas
                } ${
                    evidencia.totalPaginas === 1
                        ? "página"
                        : "páginas"
                }`
                : "",

            formatarTamanho(
                evidencia?.tamanhoBytes
            ),

            formatarDataHora(
                evidencia?.criadoEm
            ),
        ]
            .filter(
                Boolean
            )
            .join(
                " · "
            );

    return (
        <article className="certidao-folha-evidencias__arquivo">
            <span className="certidao-folha-evidencias__arquivo-icone">
                <FileText aria-hidden="true" />
            </span>

            <div className="certidao-folha-evidencias__arquivo-info">
                <strong
                    title={
                        evidencia
                            ?.nomeOriginal ||
                        ""
                    }
                >
                    {evidencia
                        ?.nomeOriginal ||
                        "Comprovante PDF"}
                </strong>

                {metadados && (
                    <span>
                        {metadados}
                    </span>
                )}

                {evidencia?.hashSha256 && (
                    <small>
                        SHA-256{" "}
                        {evidencia
                            .hashSha256
                            .slice(
                                0,
                                12
                            )}
                        …
                    </small>
                )}
            </div>

            <button
                type="button"
                className="certidao-folha-evidencias__abrir"
                onClick={() =>
                    onAbrir(
                        evidencia
                    )
                }
                disabled={abrindo}
            >
                {abrindo ? (
                    <LoaderCircle
                        className="is-spinning"
                        aria-hidden="true"
                    />
                ) : (
                    <ExternalLink
                        aria-hidden="true"
                    />
                )}

                Abrir
            </button>
        </article>
    );
}

function GrupoEvidencias({
    titulo,
    descricao,
    tipo,
    Icone,
    evidencias,
    desabilitado,
    salvando,
    abrindoId,
    onAdicionar,
    onAbrir,
}) {
    const inputRef =
        useRef(
            null
        );

    const aoSelecionar =
        (evento) => {
            const arquivos =
                Array.from(
                    evento
                        .target
                        .files ||
                    []
                );

            evento.target.value =
                "";

            if (
                arquivos.length ===
                0
            ) {
                return;
            }

            onAdicionar(
                tipo,
                arquivos
            );
        };

    return (
        <article className="certidao-folha-evidencias__grupo">
            <header className="certidao-folha-evidencias__grupo-header">
                <span className="certidao-folha-evidencias__grupo-icone">
                    <Icone aria-hidden="true" />
                </span>

                <div>
                    <strong>
                        {titulo}
                    </strong>

                    <span>
                        {descricao}
                    </span>
                </div>

                <span className="certidao-folha-evidencias__contador">
                    {evidencias.length}
                    {" "}
                    {evidencias.length === 1
                        ? "arquivo"
                        : "arquivos"}
                </span>
            </header>

            <div className="certidao-folha-evidencias__lista">
                {evidencias.length > 0 ? (
                    evidencias.map(
                        (evidencia) => (
                            <EvidenciaArquivo
                                key={
                                    evidencia.id
                                }
                                evidencia={
                                    evidencia
                                }
                                abrindo={
                                    abrindoId ===
                                    evidencia.id
                                }
                                onAbrir={
                                    onAbrir
                                }
                            />
                        )
                    )
                ) : (
                    <div className="certidao-folha-evidencias__vazio">
                        <FileText aria-hidden="true" />

                        <div>
                            <strong>
                                Nenhum comprovante anexado
                            </strong>

                            <span>
                                Adicione um ou vários PDFs deste grupo.
                            </span>
                        </div>
                    </div>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                hidden
                onChange={
                    aoSelecionar
                }
            />

            <button
                type="button"
                className="certidao-folha-evidencias__adicionar"
                disabled={
                    desabilitado ||
                    salvando
                }
                onClick={() =>
                    inputRef
                        .current
                        ?.click()
                }
            >
                {salvando ? (
                    <LoaderCircle
                        className="is-spinning"
                        aria-hidden="true"
                    />
                ) : (
                    <Plus aria-hidden="true" />
                )}

                {salvando
                    ? "Enviando comprovantes..."
                    : "Adicionar comprovantes"}
            </button>
        </article>
    );
}

export function CertidaoFolhaEvidenciasComplementares({
    empresa,
    documento,
    competencia,
    desabilitado = false,
}) {
    const itemId =
        obterItemId(
            documento
        );

    const empresaId =
        textoSeguro(
            empresa?.id
        );

    const competenciaPersistencia =
        normalizarCompetencia(
            competencia
        );

    const [
        evidencias,
        setEvidencias,
    ] =
        useState(
            []
        );

    const [
        carregando,
        setCarregando,
    ] =
        useState(
            false
        );

    const [
        erro,
        setErro,
    ] =
        useState(
            ""
        );

    const [
        mensagem,
        setMensagem,
    ] =
        useState(
            ""
        );

    const [
        salvandoTipo,
        setSalvandoTipo,
    ] =
        useState(
            ""
        );

    const [
        abrindoId,
        setAbrindoId,
    ] =
        useState(
            ""
        );

    const carregar =
        useCallback(
            async () => {
                if (!itemId) {
                    setEvidencias(
                        []
                    );

                    return;
                }

                setCarregando(
                    true
                );

                setErro(
                    ""
                );

                try {
                    const registros =
                        await listarEvidenciasAtivasCertidaoMensal({
                            itemId,
                        });

                    setEvidencias(
                        registros
                    );
                }
                catch (error) {
                    console.error(
                        "Não foi possível carregar as evidências complementares da folha.",
                        error
                    );

                    setErro(
                        textoSeguro(
                            error?.message
                        ) ||
                        "Não foi possível carregar os comprovantes."
                    );
                }
                finally {
                    setCarregando(
                        false
                    );
                }
            },
            [
                itemId,
            ]
        );

    useEffect(
        () => {
            void carregar();
        },
        [
            carregar,
        ]
    );

    const adicionar =
        async (
            tipo,
            arquivos
        ) => {
            if (
                desabilitado ||
                salvandoTipo ||
                !itemId ||
                !empresaId ||
                !competenciaPersistencia
            ) {
                return;
            }

            setErro(
                ""
            );

            setMensagem(
                ""
            );

            setSalvandoTipo(
                tipo
            );

            let enviados =
                0;

            try {
                for (
                    const arquivo
                    of arquivos
                ) {
                    await salvarEvidenciaComplementarCertidaoMensal({
                        arquivo,

                        itemId,

                        empresaId,

                        competencia:
                            competenciaPersistencia,

                        tipoEvidencia:
                            tipo,

                        diagnostico: {
                            origem:
                                "FOLHA_PAGAMENTO_EVIDENCIA_COMPLEMENTAR",
                        },

                        payload: {
                            origem:
                                "INTERFACE_FOLHA_PAGAMENTO",

                            documentoId:
                                documento?.id ||
                                "folha-pagamento",
                        },
                    });

                    enviados +=
                        1;
                }

                setMensagem(
                    `${enviados} ${
                        enviados === 1
                            ? "comprovante enviado"
                            : "comprovantes enviados"
                    } com sucesso.`
                );

                await carregar();
            }
            catch (error) {
                console.error(
                    "Não foi possível salvar uma evidência complementar.",
                    error
                );

                const detalhe =
                    textoSeguro(
                        error?.message
                    );

                setErro(
                    enviados > 0
                        ? (
                            `${enviados} ${
                                enviados === 1
                                    ? "arquivo foi salvo"
                                    : "arquivos foram salvos"
                            }, mas o próximo envio falhou. ${
                                detalhe
                            }`
                        )
                        : (
                            detalhe ||
                            "Não foi possível salvar os comprovantes."
                        )
                );

                await carregar();
            }
            finally {
                setSalvandoTipo(
                    ""
                );
            }
        };

    const abrir =
        async (
            evidencia
        ) => {
            const caminho =
                textoSeguro(
                    evidencia
                        ?.caminhoStorage
                );

            if (!caminho) {
                setErro(
                    "Esta evidência não possui caminho de armazenamento."
                );

                return;
            }

            const janela =
                window.open(
                    "",
                    "_blank"
                );

            if (!janela) {
                setErro(
                    "O navegador bloqueou a nova aba. Permita pop-ups para abrir o PDF."
                );

                return;
            }

            setAbrindoId(
                evidencia.id
            );

            setErro(
                ""
            );

            try {
                const url =
                    await criarUrlAssinadaEvidenciaCertidaoMensal({
                        caminhoStorage:
                            caminho,

                        duracaoSegundos:
                            900,
                    });

                janela.location.replace(
                    url
                );
            }
            catch (error) {
                try {
                    janela.close();
                }
                catch {
                    // Nenhuma ação adicional.
                }

                console.error(
                    "Não foi possível abrir a evidência complementar.",
                    error
                );

                setErro(
                    textoSeguro(
                        error?.message
                    ) ||
                    "Não foi possível abrir o PDF."
                );
            }
            finally {
                setAbrindoId(
                    ""
                );
            }
        };

    const pagamentos =
        evidencias.filter(
            (evidencia) =>
                evidencia
                    ?.tipoEvidencia ===
                CERTIDAO_MENSAL_TIPOS_EVIDENCIA
                    .PAGAMENTO_SALARIAL
        );

    const adiantamentos =
        evidencias.filter(
            (evidencia) =>
                evidencia
                    ?.tipoEvidencia ===
                CERTIDAO_MENSAL_TIPOS_EVIDENCIA
                    .ADIANTAMENTO_SALARIAL
        );

    const bloqueado =
        Boolean(
            desabilitado ||
            !itemId ||
            !empresaId ||
            !competenciaPersistencia
        );

    return (
        <section className="certidao-folha-evidencias">
            <header className="certidao-folha-evidencias__header">
                <div className="certidao-folha-evidencias__titulo">
                    <span className="certidao-folha-evidencias__titulo-icone">
                        <Upload aria-hidden="true" />
                    </span>

                    <div>
                        <strong>
                            Evidências complementares
                        </strong>

                        <span>
                            Comprovantes usados na conferência da folha desta competência.
                        </span>
                    </div>
                </div>

                <span className="certidao-folha-evidencias__total">
                    {evidencias.length}
                    {" "}
                    {evidencias.length === 1
                        ? "PDF"
                        : "PDFs"}
                </span>
            </header>

            {!itemId && (
                <div className="certidao-folha-evidencias__aviso">
                    <AlertTriangle aria-hidden="true" />

                    <div>
                        <strong>
                            Salve primeiro o Extrato Mensal
                        </strong>

                        <span>
                            Os comprovantes complementares serão vinculados ao documento principal depois que ele estiver persistido.
                        </span>
                    </div>
                </div>
            )}

            {carregando && (
                <div className="certidao-folha-evidencias__estado">
                    <LoaderCircle
                        className="is-spinning"
                        aria-hidden="true"
                    />

                    Carregando comprovantes...
                </div>
            )}

            {erro && (
                <div className="certidao-folha-evidencias__mensagem is-erro">
                    <AlertTriangle aria-hidden="true" />
                    <span>{erro}</span>
                </div>
            )}

            {mensagem && (
                <div className="certidao-folha-evidencias__mensagem is-sucesso">
                    <CheckCircle2 aria-hidden="true" />
                    <span>{mensagem}</span>
                </div>
            )}

            <div className="certidao-folha-evidencias__grid">
                <GrupoEvidencias
                    titulo="Pagamento salarial"
                    descricao="Comprovantes do pagamento líquido aos empregados."
                    tipo={
                        CERTIDAO_MENSAL_TIPOS_EVIDENCIA
                            .PAGAMENTO_SALARIAL
                    }
                    Icone={
                        WalletCards
                    }
                    evidencias={
                        pagamentos
                    }
                    desabilitado={
                        bloqueado
                    }
                    salvando={
                        salvandoTipo ===
                        CERTIDAO_MENSAL_TIPOS_EVIDENCIA
                            .PAGAMENTO_SALARIAL
                    }
                    abrindoId={
                        abrindoId
                    }
                    onAdicionar={
                        adicionar
                    }
                    onAbrir={
                        abrir
                    }
                />

                <GrupoEvidencias
                    titulo="Adiantamento salarial"
                    descricao="Comprovantes de adiantamentos concedidos na competência."
                    tipo={
                        CERTIDAO_MENSAL_TIPOS_EVIDENCIA
                            .ADIANTAMENTO_SALARIAL
                    }
                    Icone={
                        ReceiptText
                    }
                    evidencias={
                        adiantamentos
                    }
                    desabilitado={
                        bloqueado
                    }
                    salvando={
                        salvandoTipo ===
                        CERTIDAO_MENSAL_TIPOS_EVIDENCIA
                            .ADIANTAMENTO_SALARIAL
                    }
                    abrindoId={
                        abrindoId
                    }
                    onAdicionar={
                        adicionar
                    }
                    onAbrir={
                        abrir
                    }
                />
            </div>
        </section>
    );
}