import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    AlertTriangle,
    Building2,
    FileCheck2,
    FileText,
    FolderOpen,
    HardHat,
    HeartPulse,
    LoaderCircle,
    RefreshCw,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import dashboardHeroBackground from "../../../assets/dashboard-hero-sst.webp";
import {
    carregarEstruturaBaseConsolidacaoColaboradorService,
} from "../services/consolidacaoColaboradorService.js";
import {
    criarPdfConsolidacaoColaboradorService,
} from "../services/consolidacaoColaboradorRelatorioPdfService.js";
import {
    criarZipConsolidacaoColaboradorService,
} from "../services/consolidacaoColaboradorZipService.js";
import {
    carregarHistoricoConsolidacaoColaboradorService,
    registrarHistoricoConsolidacaoColaboradorService,
} from "../services/consolidacaoColaboradorHistoricoService.js";
import {
    medirArquivosFisicosConsolidacaoColaborador,
} from "../services/consolidacaoColaboradorArquivosService.js";
import {
    criarPlanoZipConsolidacaoColaborador,
} from "../domain/consolidacaoColaboradorZipPlan.js";
import {
    listarObrasAtivasEmpresaConsolidacaoService,
} from "../services/consolidacaoColaboradorSelecaoService.js";
import heroRelatorioConsolidacaoUrl from "../../../assets/heroes/relatorios/hero-pendencias-treinamentos-obras-v1.png";
import {
    CONSOLIDACAO_COLABORADOR_SELECTION_SCHEMA_VERSION,
    criarEstruturaExportacaoConsolidacaoColaborador,
    criarSelecaoPadraoConsolidacaoColaborador,
    listarChavesSelecionaveisDocumentoConsolidacao,
    obterChaveSelecaoEvidenciaConsolidacao,
} from "../domain/consolidacaoColaboradorExportStructure.js";
import {
    obterSituacaoHistoricaTreinamentosColaborador,
} from "../../../services/colaboradorDocumentosService.js";
import "../styles/consolidacao-colaborador.css";

const CATEGORIAS_CONSOLIDACAO = Object.freeze([
    {
        chave: "DOCUMENTOS_PESSOAIS",
        numero: "01",
        titulo: "Documentos pessoais",
        subtitulo: "Registro profissional e dados documentais do colaborador.",
        Icone: UserRound,
    },
    {
        chave: "ASO",
        numero: "02",
        titulo: "ASO",
        subtitulo: "Atestado de Saúde Ocupacional.",
        Icone: HeartPulse,
    },
    {
        chave: "ORDEM_DE_SERVICO",
        numero: "03",
        titulo: "Ordem de Serviço",
        subtitulo: "Orientações formais de Segurança do Trabalho.",
        Icone: ShieldCheck,
    },
    {
        chave: "EPI",
        numero: "04",
        titulo: "EPI",
        subtitulo: "Ficha de entrega e controle de equipamentos de proteção.",
        Icone: HardHat,
    },
    {
        chave: "TREINAMENTOS",
        numero: "05",
        titulo: "Treinamentos",
        subtitulo: "Treinamentos, certificados e respectivas evidências atuais.",
        Icone: FileCheck2,
    },
]);

const ROTULOS_EVIDENCIA = Object.freeze({
    certificado_individual: "Certificado individual",
    lista_presenca: "Lista de presença",
    evidencia_complementar: "Evidência complementar",
    documento_principal_legado: "Documento principal",
});

function textoSeguro(valor) {
    return String(valor || "").trim();
}

function numeroSeguro(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : 0;
}

function formatarDataDocumento(valor) {
    const texto = textoSeguro(valor);

    if (!texto) return "—";

    const correspondenciaIso =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (correspondenciaIso) {
        return [
            correspondenciaIso[3],
            correspondenciaIso[2],
            correspondenciaIso[1],
        ].join("/");
    }

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) {
        return texto;
    }

    return data.toLocaleDateString("pt-BR");
}

function obterStatusTemporal(documento = null) {
    const status =
        documento?.statusTemporal || {};

    return {
        chave:
            textoSeguro(
                status.chave
            ) || "nao_informado",

        texto:
            textoSeguro(
                status.texto
            ) || "Não informado",
    };
}

function obterTomStatusTemporal(chave = "") {
    const status =
        textoSeguro(chave)
            .toLowerCase();

    if (
        status === "vencido"
    ) {
        return "danger";
    }

    if (
        status === "vencendo" ||
        status === "semdata" ||
        status === "regra_nao_reconhecida"
    ) {
        return "warning";
    }

    if (
        status === "emdia"
    ) {
        return "success";
    }

    if (
        status === "semvalidade"
    ) {
        return "info";
    }

    return "neutral";
}

function obterConferenciaDocumento(documento = null) {
    const verificacao =
        documento
            ?.verificacaoDocumental ||
        null;

    if (!verificacao) {
        return {
            texto:
                "Sem conferência",

            tom:
                "neutral",
        };
    }

    const status =
        textoSeguro(
            verificacao.statusVerificacao ||
            verificacao.status_verificacao ||
            verificacao.status ||
            verificacao.resumo ||
            verificacao.texto
        );

    if (!status) {
        return {
            texto:
                "Sem conferência",

            tom:
                "neutral",
        };
    }

    const statusNormalizado =
        status.toLowerCase();

    if (
        statusNormalizado.includes(
            "aprov"
        ) ||
        statusNormalizado.includes(
            "conforme"
        )
    ) {
        return {
            texto:
                status,

            tom:
                "success",
        };
    }

    if (
        statusNormalizado.includes(
            "bloq"
        ) ||
        statusNormalizado.includes(
            "suspeit"
        )
    ) {
        return {
            texto:
                status,

            tom:
                "danger",
        };
    }

    if (
        statusNormalizado.includes(
            "aten"
        ) ||
        statusNormalizado.includes(
            "manual"
        ) ||
        statusNormalizado.includes(
            "revis"
        )
    ) {
        return {
            texto:
                status,

            tom:
                "warning",
        };
    }

    return {
        texto:
            status,

        tom:
            "neutral",
    };
}

function obterNomeDocumento(documento = null) {
    return (
        textoSeguro(
            documento?.nomeTreinamento
        ) ||
        textoSeguro(
            documento?.tipoTreinamento
        ) ||
        "Documento sem identificação"
    );
}

function obterRotuloEvidencia(evidencia = null) {
    const tipo =
        textoSeguro(
            evidencia?.tipoEvidencia
        );

    return (
        ROTULOS_EVIDENCIA[tipo] ||
        tipo.replace(
            /_/g,
            " "
        ) ||
        "Evidência atual"
    );
}

function obterNomeArquivoEvidencia(evidencia = null) {
    return (
        textoSeguro(
            evidencia?.arquivoNomeOriginal
        ) ||
        textoSeguro(
            evidencia?.arquivoNome
        ) ||
        "Arquivo atual"
    );
}

function obterGrupoVisualEvidencia(evidencia = null) {
    const tipo =
        textoSeguro(
            evidencia?.tipoEvidencia
        ).toLowerCase();

    if (
        tipo ===
        "lista_presenca"
    ) {
        return "lista";
    }

    if (
        tipo ===
        "certificado_individual"
    ) {
        return "certificado";
    }

    /*
     * Compatibilidade somente visual para registros legados.
     *
     * Não altera:
     * - tipoEvidencia;
     * - estrutura;
     * - seleção canônica;
     * - PDF;
     * - ZIP;
     * - histórico.
     */
    const nomeArquivo =
        obterNomeArquivoEvidencia(
            evidencia
        ).toLowerCase();

    if (
        nomeArquivo.includes(
            "lista"
        ) &&
        (
            nomeArquivo.includes(
                "presenca"
            ) ||
            nomeArquivo.includes(
                "presença"
            )
        )
    ) {
        return "lista";
    }

    return "certificado";
}

function obterMensagemItem(item = null) {
    if (
        typeof item ===
        "string"
    ) {
        return textoSeguro(item);
    }

    return (
        textoSeguro(
            item?.mensagem
        ) ||
        textoSeguro(
            item?.texto
        ) ||
        textoSeguro(
            item?.descricao
        ) ||
        textoSeguro(
            item?.codigo
        ) ||
        "Ocorrência documental identificada."
    );
}

function obterTomObra(status = "") {
    if (
        status ===
            "RESOLVIDA_UNICA" ||
        status ===
            "RESOLVIDA_EXPLICITA"
    ) {
        return "success";
    }

    if (
        status ===
        "CONTEXTO_INVALIDO"
    ) {
        return "danger";
    }

    if (
        status ===
            "AMBIGUA" ||
        status ===
            "SEM_OBRA_ATIVA"
    ) {
        return "warning";
    }

    return "neutral";
}

function obterTextoStatusObra(obra = null) {
    switch (
        obra?.status
    ) {
        case "RESOLVIDA_UNICA":
            return "Obra resolvida automaticamente";

        case "RESOLVIDA_EXPLICITA":
            return "Obra selecionada";

        case "AMBIGUA":
            return "Selecione a obra";

        case "SEM_OBRA_ATIVA":
            return "Sem obra ativa";

        case "CONTEXTO_INVALIDO":
            return "Contexto de obra inválido";

        default:
            return "Obra não definida";
    }
}

function ResumoCard({
    Icone,
    rotulo,
    valor,
    detalhe,
    tom = "default",
}) {
    return (
        <article
            className={`consolidacao-colaborador-resumo-card consolidacao-colaborador-resumo-card--${tom}`}
        >
            <div className="consolidacao-colaborador-resumo-card__icone">
                <Icone
                    aria-hidden="true"
                    size={20}
                    strokeWidth={2.1}
                />
            </div>

            <div className="consolidacao-colaborador-resumo-card__conteudo">
                <p className="consolidacao-colaborador-resumo-card__rotulo">
                    {rotulo}
                </p>

                <strong className="consolidacao-colaborador-resumo-card__valor">
                    {valor}
                </strong>

                <span className="consolidacao-colaborador-resumo-card__detalhe">
                    {detalhe}
                </span>
            </div>
        </article>
    );
}

/*
 * G9.2-R1H-R4A
 *
 * Blocos 01–04:
 * checkbox de nível-documento permanece ativo.
 *
 * Bloco 05 — Treinamentos:
 * seleção ocorre pelas evidências Certificado / Lista,
 * portanto o checkbox antes do nome do treinamento
 * não é renderizado.
 */
/*
 * ============================================================
 * G9.2-R9J-R2 — ORDEM NUMÉRICA DOS TREINAMENTOS
 * ============================================================
 *
 * Somente apresentação da categoria TREINAMENTOS.
 *
 * Exemplo:
 * NR-01
 * NR-06
 * NR-11
 * NR-12
 * NR-17
 * NR-18.06
 * NR-21
 * NR-25
 *
 * Não altera o array original.
 */

function ordenarTreinamentosPorNr(
    documentos
) {
    const lista =
        Array.isArray(
            documentos
        )
            ? documentos
            : [];

    return lista
        .map(
            (
                documento,
                indiceOriginal
            ) => {
                const nome =
                    String(
                        obterNomeDocumento(
                            documento
                        ) ?? ""
                    );

                const correspondencia =
                    nome.match(
                        /\bNR\s*[-–—]?\s*(\d{1,2})(?:[.,](\d{1,2}))?/i
                    );

                return {
                    documento,
                    indiceOriginal,

                    possuiNr:
                        Boolean(
                            correspondencia
                        ),

                    nr:
                        correspondencia
                            ? Number(
                                  correspondencia[1]
                              )
                            : Number.POSITIVE_INFINITY,

                    subitem:
                        correspondencia
                            ? Number(
                                  correspondencia[2] ||
                                      0
                              )
                            : Number.POSITIVE_INFINITY,
                };
            }
        )
        .sort(
            (
                a,
                b
            ) => {
                if (
                    a.possuiNr !==
                    b.possuiNr
                ) {
                    return a.possuiNr
                        ? -1
                        : 1;
                }

                if (
                    a.nr !==
                    b.nr
                ) {
                    return (
                        a.nr -
                        b.nr
                    );
                }

                if (
                    a.subitem !==
                    b.subitem
                ) {
                    return (
                        a.subitem -
                        b.subitem
                    );
                }

                return (
                    a.indiceOriginal -
                    b.indiceOriginal
                );
            }
        )
        .map(
            (
                item
            ) =>
                item.documento
        );
}
function DocumentoRow({
    documento,
    chavesSelecionadas,
    onAlternarDocumento,
    onAlternarEvidencia,
    modoTreinamentos = false,
}) {
    const status =
        obterStatusTemporal(
            documento
        );

    const conferencia =
        obterConferenciaDocumento(
            documento
        );

    const evidencias =
        Array.isArray(
            documento?.evidenciasAtuais
        )
            ? documento.evidenciasAtuais
            : [];

    const chavesDocumento =
        listarChavesSelecionaveisDocumentoConsolidacao(
            documento
        );

    const totalSelecionaveis =
        chavesDocumento.length;

    const totalSelecionadas =
        chavesDocumento.filter(
            (
                chave
            ) =>
                chavesSelecionadas.has(
                    chave
                )
        ).length;

    const documentoSelecionado =
        totalSelecionaveis >
            0 &&
        totalSelecionadas ===
            totalSelecionaveis;

    const documentoParcial =
        totalSelecionadas >
            0 &&
        totalSelecionadas <
            totalSelecionaveis;

    const evidenciasCertificado =
        modoTreinamentos
            ? evidencias.filter(
                  (
                      evidencia
                  ) =>
                      obterGrupoVisualEvidencia(
                          evidencia
                      ) ===
                      "certificado"
              )
            : evidencias;

    const evidenciasLista =
        modoTreinamentos
            ? evidencias.filter(
                  (
                      evidencia
                  ) =>
                      obterGrupoVisualEvidencia(
                          evidencia
                      ) ===
                      "lista"
              )
            : [];

    function renderizarEvidenciasCompactas(
        listaEvidencias
    ) {
        if (
            !Array.isArray(
                listaEvidencias
            ) ||
            listaEvidencias.length ===
                0
        ) {
            return (
                <span className="consolidacao-colaborador-evidencia-compacta__vazio">
                    —
                </span>
            );
        }

        return listaEvidencias.map(
            (
                evidencia,
                indice
            ) => {
                const chave =
                    obterChaveSelecaoEvidenciaConsolidacao({
                        documento,
                        evidencia,
                    });

                const selecionavel =
                    evidencia?.selecionavel ===
                        true &&
                    evidencia?.historica !==
                        true &&
                    Boolean(
                        chave
                    );

                const selecionada =
                    selecionavel &&
                    chavesSelecionadas.has(
                        chave
                    );

                const rotulo =
                    obterRotuloEvidencia(
                        evidencia
                    );

                const nomeArquivo =
                    obterNomeArquivoEvidencia(
                        evidencia
                    );

                return (
                    <label
                        className={`consolidacao-colaborador-evidencia-compacta ${
                            selecionada
                                ? "consolidacao-colaborador-evidencia-compacta--selecionada"
                                : ""
                        } ${
                            !selecionavel
                                ? "consolidacao-colaborador-evidencia-compacta--indisponivel"
                                : ""
                        }`}
                        key={
                            evidencia?.id ||
                            `${documento?.certificadoId}-${indice}`
                        }
                        title={`${rotulo}: ${nomeArquivo}`}
                    >
                        <input
                            aria-label={`Incluir ${rotulo} de ${obterNomeDocumento(
                                documento
                            )}`}
                            checked={
                                selecionada
                            }
                            className="consolidacao-colaborador-checkbox"
                            disabled={
                                !selecionavel
                            }
                            onChange={
                                (
                                    evento
                                ) =>
                                    onAlternarEvidencia(
                                        documento,
                                        evidencia,
                                        evento
                                            .target
                                            .checked
                                    )
                            }
                            type="checkbox"
                        />
                    </label>
                );
            }
        );
    }

    return (
        <tr>
            <td>
                <div className="consolidacao-colaborador-documento">
                    <div className="consolidacao-colaborador-documento__linha">
                        {!modoTreinamentos ? (
                            <input
                                className="consolidacao-colaborador-checkbox"
                                type="checkbox"
                                checked={
                                    documentoSelecionado
                                }
                                disabled={
                                    totalSelecionaveis ===
                                    0
                                }
                                ref={
                                    (
                                        elemento
                                    ) => {
                                        if (
                                            elemento
                                        ) {
                                            elemento.indeterminate =
                                                documentoParcial;
                                        }
                                    }
                                }
                                aria-label={`Incluir ${obterNomeDocumento(
                                    documento
                                )} na Consolidação Documental`}
                                onChange={
                                    (
                                        evento
                                    ) =>
                                        onAlternarDocumento(
                                            documento,
                                            evento
                                                .target
                                                .checked
                                        )
                                }
                            />
                        ) : null}

                        <div className="consolidacao-colaborador-documento__conteudo">
                            <strong>
                                {obterNomeDocumento(
                                    documento
                                )}
                            </strong>


                        </div>
                    </div>
                </div>
            </td>

            <td className="consolidacao-colaborador-data">
                {formatarDataDocumento(
                    documento?.dataRealizacao
                )}
            </td>

            <td className="consolidacao-colaborador-data">
                {formatarDataDocumento(
                    documento?.dataVencimento
                )}
            </td>

            <td>
                <span
                    className={`consolidacao-colaborador-status consolidacao-colaborador-status--${obterTomStatusTemporal(
                        status.chave
                    )}`}
                >
                    {status.texto}
                </span>
            </td>

            <td>
                <span
                    className={`consolidacao-colaborador-status consolidacao-colaborador-status--${conferencia.tom}`}
                >
                    {conferencia.texto}
                </span>
            </td>

            <td>
                {modoTreinamentos ? (
                    <div className="consolidacao-colaborador-evidencias-grade">
                        <div className="consolidacao-colaborador-evidencias-grade__coluna">
                            {renderizarEvidenciasCompactas(
                                evidenciasCertificado
                            )}
                        </div>

                        <div className="consolidacao-colaborador-evidencias-grade__coluna">
                            {renderizarEvidenciasCompactas(
                                evidenciasLista
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="consolidacao-colaborador-evidencias-simples">
                        {renderizarEvidenciasCompactas(
                            evidencias
                        )}
                    </div>
                )}
            </td>
        </tr>
    );
}

function AusenciaRow({
    ausencia,
}) {
    return (
        <tr className="consolidacao-colaborador-linha-ausente">
            <td>
                <div className="consolidacao-colaborador-documento">
                    <strong>
                        {textoSeguro(
                            ausencia?.nome
                        ) ||
                            "Documento obrigatório"}
                    </strong>

                    <span>
                        Obrigatório pela matriz
                    </span>
                </div>
            </td>

            <td>—</td>
            <td>—</td>

            <td>
                <span className="consolidacao-colaborador-status consolidacao-colaborador-status--danger">
                    Ausente
                </span>
            </td>

            <td>
                <span className="consolidacao-colaborador-status consolidacao-colaborador-status--neutral">
                    Não aplicável
                </span>
            </td>

            <td>
                <span className="consolidacao-colaborador-evidencias__vazio">
                    Sem arquivo para exportação
                </span>
            </td>
        </tr>
    );
}

export function ConsolidacaoColaboradorPage({
    supabase,
    colaboradores = [],
    onRegistrarAuditoria = null,
}) {
    const [
        fotoColaboradorAssinada,
        setFotoColaboradorAssinada,
    ] =
        useState({
            colaboradorId:
                "",
            caminho:
                "",
            url:
                "",
        });

    const fotoColaboradorRequestRef =
        useRef(0);
    const [
        empresaFiltroId,
        setEmpresaFiltroId,
    ] =
        useState("");

    const [
        situacaoFiltro,
        setSituacaoFiltro,
    ] =
        useState(
            "ativos"
        );

    const [
        obrasDisponiveis,
        setObrasDisponiveis,
    ] =
        useState(
            []
        );

    const [
        carregandoObras,
        setCarregandoObras,
    ] =
        useState(
            false
        );

    const [
        erroObras,
        setErroObras,
    ] =
        useState(
            ""
        );

    const [
        colaboradorId,
        setColaboradorId,
    ] =
        useState("");

    const [
        obraContextoId,
        setObraContextoId,
    ] =
        useState("");

    const [
        resultado,
        setResultado,
    ] =
        useState(null);

    const [
        carregando,
        setCarregando,
    ] =
        useState(false);

    const [
        erro,
        setErro,
    ] =
        useState("");

    const [
        chavesEvidenciasSelecionadas,
        setChavesEvidenciasSelecionadas,
    ] =
        useState(
            []
        );

    const [
        gerandoPdf,
        setGerandoPdf,
    ] =
        useState(
            false
        );

    const [
        erroPdf,
        setErroPdf,
    ] =
        useState(
            ""
        );

    const [
        gerandoZip,
        setGerandoZip,
    ] =
        useState(
            false
        );

    const [
        erroZip,
        setErroZip,
    ] =
        useState(
            ""
        );

    const [
        resultadoZip,
        setResultadoZip,
    ] =
        useState(
            null
        );

    const [
        historicoGeracoes,
        setHistoricoGeracoes,
    ] =
        useState(
            []
        );

    const [
        historicoExisteMais,
        setHistoricoExisteMais,
    ] =
        useState(
            false
        );

    const [
        carregandoHistorico,
        setCarregandoHistorico,
    ] =
        useState(
            false
        );

    const [
        erroHistorico,
        setErroHistorico,
    ] =
        useState(
            ""
        );

    const historicoRequisicaoRef =
        useRef(
            0
        );

    const colaboradorAtualRef =
        useRef(
            ""
        );

    const [
        medindoArquivosDev,
        setMedindoArquivosDev,
    ] =
        useState(
            false
        );

    const [
        medicaoArquivosDev,
        setMedicaoArquivosDev,
    ] =
        useState(
            null
        );

    const [
        erroMedicaoArquivosDev,
        setErroMedicaoArquivosDev,
    ] =
        useState(
            ""
        );

    const requisicaoAtualRef =
        useRef(0);

    const requisicaoObrasAtualRef =
        useRef(0);

    const colaboradoresOrdenados =
        useMemo(
            () =>
                [...colaboradores]
                    .filter(
                        (colaborador) =>
                            colaborador?.id
                    )
                    .sort(
                        (
                            primeiro,
                            segundo
                        ) =>
                            textoSeguro(
                                primeiro?.nome
                            ).localeCompare(
                                textoSeguro(
                                    segundo?.nome
                                ),
                                "pt-BR"
                            )
                    ),
            [colaboradores]
        );

    const empresasDisponiveis =
        useMemo(
            () => {
                const mapa =
                    new Map();

                colaboradoresOrdenados.forEach(
                    (
                        colaborador
                    ) => {
                        const empresaId =
                            textoSeguro(
                                colaborador
                                    ?.empresaId ||
                                colaborador
                                    ?.empresa_id
                            );

                        if (
                            !empresaId
                        ) {
                            return;
                        }

                        const empresaNome =
                            textoSeguro(
                                colaborador
                                    ?.empresa ||
                                colaborador
                                    ?.empresas
                                    ?.nome ||
                                colaborador
                                    ?.empresaExibicao
                            ) ||
                            "Empresa sem nome";

                        if (
                            !mapa.has(
                                empresaId
                            )
                        ) {
                            mapa.set(
                                empresaId,
                                {
                                    id:
                                        empresaId,

                                    nome:
                                        empresaNome,
                                }
                            );
                        }
                    }
                );

                return [
                    ...mapa.values(),
                ].sort(
                    (
                        primeiro,
                        segundo
                    ) =>
                        primeiro.nome.localeCompare(
                            segundo.nome,
                            "pt-BR"
                        )
                );
            },
            [
                colaboradoresOrdenados,
            ]
        );

    const colaboradoresDaEmpresa =
        useMemo(
            () => {
                if (
                    !empresaFiltroId
                ) {
                    return [];
                }

                return colaboradoresOrdenados.filter(
                    (
                        colaborador
                    ) =>
                        textoSeguro(
                            colaborador
                                ?.empresaId ||
                            colaborador
                                ?.empresa_id
                        ) ===
                        empresaFiltroId
                );
            },
            [
                colaboradoresOrdenados,
                empresaFiltroId,
            ]
        );

    const colaboradoresClassificados =
        useMemo(
            () =>
                colaboradoresDaEmpresa.map(
                    (
                        colaborador
                    ) => ({
                        colaborador,

                        situacaoHistorica:
                            obterSituacaoHistoricaTreinamentosColaborador(
                                colaborador
                            ),
                    })
                ),
            [
                colaboradoresDaEmpresa,
            ]
        );

    const totalDesmobilizadosEmpresa =
        useMemo(
            () =>
                colaboradoresClassificados.filter(
                    (
                        item
                    ) =>
                        item.situacaoHistorica ===
                        "Desmobilizado"
                ).length,
            [
                colaboradoresClassificados,
            ]
        );

    const colaboradoresFiltrados =
        useMemo(
            () =>
                colaboradoresClassificados
                    .filter(
                        (
                            item
                        ) =>
                            item.situacaoHistorica !==
                            "Inativo"
                    )
                    .filter(
                        (
                            item
                        ) => {
                            if (
                                situacaoFiltro ===
                                "desmobilizados"
                            ) {
                                return (
                                    item.situacaoHistorica ===
                                    "Desmobilizado"
                                );
                            }

                            return (
                                !item.situacaoHistorica
                            );
                        }
                    )
                    .map(
                        (
                            item
                        ) =>
                            item.colaborador
                    ),
            [
                colaboradoresClassificados,
                situacaoFiltro,
            ]
        );

    const contextoObraPronto =
        Boolean(
            empresaFiltroId
        ) &&
        !carregandoObras &&
        !erroObras &&
        (
            obrasDisponiveis.length ===
                0 ||
            Boolean(
                obraContextoId
            )
        );

    const carregarEstrutura =
        useCallback(
            async (
                id,
                obraId = null
            ) => {
                const idTratado =
                    textoSeguro(id);

                if (!idTratado) {
                    setResultado(
                        null
                    );

                    setChavesEvidenciasSelecionadas(
                        []
                    );

                    setErro("");

                    return;
                }

                if (!supabase) {
                    setErro(
                        "Cliente Supabase não disponível para carregar o Consolidação."
                    );

                    return;
                }

                const numeroRequisicao =
                    requisicaoAtualRef.current +
                    1;

                requisicaoAtualRef.current =
                    numeroRequisicao;

                setCarregando(
                    true
                );

                setErro("");

                try {
                    const resposta =
                        await carregarEstruturaBaseConsolidacaoColaboradorService({
                            supabase,
                            colaboradorId:
                                idTratado,
                            obraContextoId:
                                textoSeguro(
                                    obraId
                                ) ||
                                null,
                        });

                    if (
                        numeroRequisicao !==
                        requisicaoAtualRef.current
                    ) {
                        return;
                    }

                    const selecaoPadrao =
                        criarSelecaoPadraoConsolidacaoColaborador(
                            resposta.estrutura
                        );

                    setResultado(
                        resposta
                    );

                    setChavesEvidenciasSelecionadas(
                        selecaoPadrao
                            .evidenciasSelecionadas
                    );
                } catch (
                    erroCarregamento
                ) {
                    if (
                        numeroRequisicao !==
                        requisicaoAtualRef.current
                    ) {
                        return;
                    }

                    setResultado(
                        null
                    );

                    setChavesEvidenciasSelecionadas(
                        []
                    );

                    setErro(
                        erroCarregamento
                            ?.message ||
                            "Não foi possível montar a prévia documental."
                    );
                } finally {
                    if (
                        numeroRequisicao ===
                        requisicaoAtualRef.current
                    ) {
                        setCarregando(
                            false
                        );
                    }
                }
            },
            [supabase]
        );

    async function carregarHistorico(
        id
    ) {
        const idTratado =
            textoSeguro(
                id
            );

        if (!idTratado) {
            historicoRequisicaoRef.current +=
                1;

            setHistoricoGeracoes(
                []
            );

            setHistoricoExisteMais(
                false
            );

            setErroHistorico(
                ""
            );

            setCarregandoHistorico(
                false
            );

            return;
        }

        if (!supabase) {
            setHistoricoGeracoes(
                []
            );

            setHistoricoExisteMais(
                false
            );

            setErroHistorico(
                "Cliente Supabase não disponível para carregar o histórico."
            );

            setCarregandoHistorico(
                false
            );

            return;
        }

        const numeroRequisicao =
            historicoRequisicaoRef.current +
            1;

        historicoRequisicaoRef.current =
            numeroRequisicao;

        setCarregandoHistorico(
            true
        );

        setErroHistorico(
            ""
        );

        try {
            const resposta =
                await carregarHistoricoConsolidacaoColaboradorService({
                    supabase,

                    colaboradorId:
                        idTratado,

                    limite:
                        10,
                });

            if (
                numeroRequisicao !==
                historicoRequisicaoRef.current
            ) {
                return;
            }

            setHistoricoGeracoes(
                Array.isArray(
                    resposta?.registros
                )
                    ? resposta.registros
                    : []
            );

            setHistoricoExisteMais(
                resposta
                    ?.existeMais ===
                    true
            );
        }
        catch (
            erroCarregamentoHistorico
        ) {
            if (
                numeroRequisicao !==
                historicoRequisicaoRef.current
            ) {
                return;
            }

            setHistoricoGeracoes(
                []
            );

            setHistoricoExisteMais(
                false
            );

            setErroHistorico(
                erroCarregamentoHistorico
                    ?.message ||
                    "Não foi possível carregar o histórico de gerações."
            );
        }
        finally {
            if (
                numeroRequisicao ===
                historicoRequisicaoRef.current
            ) {
                setCarregandoHistorico(
                    false
                );
            }
        }
    }

    async function handleAtualizarHistorico() {
        const idAtual =
            textoSeguro(
                colaboradorAtualRef
                    .current
            );

        if (!idAtual) {
            return;
        }

        await carregarHistorico(
            idAtual
        );
    }

    function limparSelecaoColaboradorAtual({
        limparObra = true,
    } = {}) {
        /*
         * Trocar um filtro anterior ao colaborador invalida
         * imediatamente a consulta já exibida.
         */
        requisicaoAtualRef.current +=
            1;

        historicoRequisicaoRef.current +=
            1;

        colaboradorAtualRef.current =
            "";

        setHistoricoGeracoes(
            []
        );

        setHistoricoExisteMais(
            false
        );

        setErroHistorico(
            ""
        );

        setCarregandoHistorico(
            false
        );

        setColaboradorId(
            ""
        );

        if (
            limparObra
        ) {
            setObraContextoId(
                ""
            );
        }

        setResultado(
            null
        );

        setChavesEvidenciasSelecionadas(
            []
        );

        setErro("");

        setErroPdf("");

        setCarregando(
            false
        );
    }

    async function handleSelecionarEmpresa(
        evento
    ) {
        const novaEmpresaId =
            textoSeguro(
                evento.target.value
            );

        requisicaoObrasAtualRef.current +=
            1;

        const numeroRequisicaoObras =
            requisicaoObrasAtualRef.current;

        setEmpresaFiltroId(
            novaEmpresaId
        );

        setSituacaoFiltro(
            "ativos"
        );

        setObrasDisponiveis(
            []
        );

        setErroObras(
            ""
        );

        limparSelecaoColaboradorAtual();

        if (
            !novaEmpresaId
        ) {
            setCarregandoObras(
                false
            );

            return;
        }

        setCarregandoObras(
            true
        );

        try {
            const obras =
                await listarObrasAtivasEmpresaConsolidacaoService({
                    supabase,

                    empresaId:
                        novaEmpresaId,
                });

            if (
                numeroRequisicaoObras !==
                requisicaoObrasAtualRef.current
            ) {
                return;
            }

            setObrasDisponiveis(
                obras
            );

            if (
                obras.length ===
                1
            ) {
                setObraContextoId(
                    obras[0].id
                );
            }
        } catch (
            erroCarregamentoObras
        ) {
            if (
                numeroRequisicaoObras !==
                requisicaoObrasAtualRef.current
            ) {
                return;
            }

            setObrasDisponiveis(
                []
            );

            setObraContextoId(
                ""
            );

            setErroObras(
                erroCarregamentoObras
                    ?.message ||
                    "Não foi possível carregar as obras da empresa."
            );
        } finally {
            if (
                numeroRequisicaoObras ===
                requisicaoObrasAtualRef.current
            ) {
                setCarregandoObras(
                    false
                );
            }
        }
    }

    function handleSelecionarObraFiltro(
        evento
    ) {
        setObraContextoId(
            textoSeguro(
                evento.target.value
            )
        );

        limparSelecaoColaboradorAtual({
            limparObra:
                false,
        });
    }

    function handleSelecionarSituacao(
        evento
    ) {
        setSituacaoFiltro(
            textoSeguro(
                evento.target.value
            ) ||
                "ativos"
        );

        limparSelecaoColaboradorAtual({
            limparObra:
                false,
        });
    }

    async function handleSelecionarColaborador(
        evento
    ) {
        const novoColaboradorId =
            textoSeguro(
                evento.target.value
            );

        /*
         * Invalida imediatamente qualquer requisição anterior.
         * O próprio carregarEstrutura criará o próximo número
         * de requisição quando houver colaborador selecionado.
         */
        requisicaoAtualRef.current +=
            1;

        historicoRequisicaoRef.current +=
            1;

        colaboradorAtualRef.current =
            novoColaboradorId;

        setColaboradorId(
            novoColaboradorId
        );

setResultado(
            null
        );

        setChavesEvidenciasSelecionadas(
            []
        );

        setErro("");

        setErroPdf("");

        setHistoricoGeracoes(
            []
        );

        setHistoricoExisteMais(
            false
        );

        setErroHistorico(
            ""
        );

        setCarregandoHistorico(
            false
        );

        if (
            !novoColaboradorId
        ) {
            setCarregando(
                false
            );

            return;
        }

        await Promise.all([
            carregarEstrutura(
                novoColaboradorId,
                obraContextoId ||
                    null
            ),

            carregarHistorico(
                novoColaboradorId
            ),
        ]);
    }

    const estrutura =
        resultado?.estrutura ||
        null;

    /*
     * G9.2-R1X — FOTO REAL DO COLABORADOR
     *
     * Informação exclusivamente visual.
     *
     * Não altera:
     * - Estrutura Canônico;
     * - seleção;
     * - PDF;
     * - ZIP;
     * - histórico;
     * - regras documentais.
     */
    const colaboradorIdentidadeId =
        textoSeguro(
            estrutura
                ?.colaborador
                ?.id ||
                colaboradorId
        );

    const colaboradorFotoOrigem =
        useMemo(
            () =>
                colaboradores.find(
                    (
                        colaborador
                    ) =>
                        textoSeguro(
                            colaborador
                                ?.id
                        ) ===
                        colaboradorIdentidadeId
                ) ||
                null,
            [
                colaboradores,
                colaboradorIdentidadeId,
            ]
        );

    const colaboradorFotoCaminho =
        textoSeguro(
            colaboradorFotoOrigem
                ?.foto_url ||
                colaboradorFotoOrigem
                    ?.fotoUrl ||
                colaboradorFotoOrigem
                    ?.foto
        );

    const fotoColaboradorExibicao =
        fotoColaboradorAssinada
            .colaboradorId ===
            colaboradorIdentidadeId &&
        fotoColaboradorAssinada
            .caminho ===
            colaboradorFotoCaminho
            ? fotoColaboradorAssinada
                  .url
            : "";

    useEffect(
        () => {
            const colaboradorIdAtual =
                colaboradorIdentidadeId;

            const caminhoOriginal =
                colaboradorFotoCaminho;

            if (
                !colaboradorIdAtual ||
                !caminhoOriginal
            ) {
                return undefined;
            }

            const requisicaoId =
                fotoColaboradorRequestRef
                    .current +
                1;

            fotoColaboradorRequestRef
                .current =
                requisicaoId;

            let ativo =
                true;

            async function resolverFotoColaborador() {
                let urlResolvida;

                const ehUrlPronta =
                    /^(?:https?:|blob:|data:)/i.test(
                        caminhoOriginal
                    );

                if (ehUrlPronta) {
                    urlResolvida =
                        caminhoOriginal;
                } else {
                    if (
                        !supabase
                            ?.storage
                            ?.from
                    ) {
                        throw new Error(
                            "Cliente Supabase sem Storage disponível."
                        );
                    }

                    const caminhoStorage =
                        caminhoOriginal.replace(
                            /^fotos-colaboradores\/+/i,
                            ""
                        );

                    const {
                        data,
                        error,
                    } =
                        await supabase
                            .storage
                            .from(
                                "fotos-colaboradores"
                            )
                            .createSignedUrl(
                                caminhoStorage,
                                60 *
                                    60 *
                                    6
                            );

                    if (error) {
                        throw error;
                    }

                    urlResolvida =
                        textoSeguro(
                            data
                                ?.signedUrl
                        );
                }

                if (!urlResolvida) {
                    throw new Error(
                        "URL da foto não foi resolvida."
                    );
                }

                if (
                    !ativo ||
                    requisicaoId !==
                        fotoColaboradorRequestRef
                            .current
                ) {
                    return;
                }

                setFotoColaboradorAssinada({
                    colaboradorId:
                        colaboradorIdAtual,

                    caminho:
                        caminhoOriginal,

                    url:
                        urlResolvida,
                });

                console.info(
                    "[SafeScan][ConsolidacaoDocumental] FOTO_COLABORADOR_ASSINADA",
                    {
                        colaboradorId:
                            colaboradorIdAtual,

                        origem:
                            ehUrlPronta
                                ? "URL_PRONTA"
                                : "STORAGE_ASSINADO",
                    }
                );
            }

            void resolverFotoColaborador()
                .catch(
                    (
                        erroFoto
                    ) => {
                        if (
                            !ativo ||
                            requisicaoId !==
                                fotoColaboradorRequestRef
                                    .current
                        ) {
                            return;
                        }

                        console.warn(
                            "[SafeScan][ConsolidacaoDocumental] FOTO_COLABORADOR_FALLBACK",
                            {
                                colaboradorId:
                                    colaboradorIdAtual,

                                mensagem:
                                    erroFoto
                                        ?.message ||
                                    String(
                                        erroFoto
                                    ),
                            }
                        );
                    }
                );

            return () => {
                ativo =
                    false;
            };
        },
        [
            colaboradorFotoCaminho,
            colaboradorIdentidadeId,
            supabase,
        ]
    );

    const selecaoCanonica =
        useMemo(
            () => ({
                schemaVersion:
                    CONSOLIDACAO_COLABORADOR_SELECTION_SCHEMA_VERSION,

                evidenciasSelecionadas:
                    [
                        ...chavesEvidenciasSelecionadas,
                    ].sort(),
            }),
            [
                chavesEvidenciasSelecionadas,
            ]
        );

    const estruturaExportacao =
        useMemo(
            () => {
                if (
                    !estrutura
                ) {
                    return null;
                }

                return criarEstruturaExportacaoConsolidacaoColaborador({
                    estruturaBase:
                        estrutura,

                    selecao:
                        selecaoCanonica,
                });
            },
            [
                estrutura,
                selecaoCanonica,
            ]
        );

    const exportacao =
        estruturaExportacao
            ?.exportacao ||
        null;

    const chavesSelecionadas =
        useMemo(
            () =>
                new Set(
                    chavesEvidenciasSelecionadas
                ),
            [
                chavesEvidenciasSelecionadas,
            ]
        );

    async function handleGerarResumoPdf() {
        if (
            gerandoPdf ||
            gerandoZip
        ) {
            return;
        }

        if (
            !estruturaExportacao ||
            exportacao?.podeGerar !==
                true
        ) {
            setErroPdf(
                "A seleção atual não está liberada para geração do resumo PDF."
            );

            return;
        }

        const janelaPdf =
            window.open(
                "",
                "_blank"
            );

        if (!janelaPdf) {
            setErroPdf(
                "O navegador bloqueou a nova aba do PDF. Habilite pop-ups para o DEV e tente novamente."
            );

            return;
        }

        janelaPdf.opener =
            null;

        janelaPdf.document.title =
            "Gerando resumo PDF";

        janelaPdf.document.body.textContent =
            "Gerando resumo documental do colaborador...";

        janelaPdf.document.body.style.fontFamily =
            "Arial, Helvetica, sans-serif";

        janelaPdf.document.body.style.padding =
            "24px";

        janelaPdf.document.body.style.color =
            "#17362c";

        setGerandoPdf(
            true
        );

        setErroPdf("");

        try {
            const resultadoPdf =
                await criarPdfConsolidacaoColaboradorService({
                    estruturaExportacao,
                    heroUrl:
                        heroRelatorioConsolidacaoUrl,
                });

            const urlPdf =
                URL.createObjectURL(
                    resultadoPdf.blob
                );

            janelaPdf.location.replace(
                urlPdf
            );

            window.setTimeout(
                () => {
                    URL.revokeObjectURL(
                        urlPdf
                    );
                },
                120000
            );
        } catch (
            erroGeracaoPdf
        ) {
            if (
                !janelaPdf.closed
            ) {
                janelaPdf.close();
            }

            setErroPdf(
                erroGeracaoPdf
                    ?.message ||
                    "Não foi possível gerar o resumo PDF da Consolidação."
            );
        } finally {
            setGerandoPdf(
                false
            );
        }
    }

    async function handleGerarConsolidacaoZip() {
        if (
            gerandoZip ||
            gerandoPdf ||
            medindoArquivosDev
        ) {
            return;
        }

        if (!supabase) {
            setErroZip(
                "Cliente Supabase não disponível para geração do pacote ZIP."
            );

            return;
        }

        if (
            !estruturaExportacao ||
            exportacao?.podeGerar !==
                true
        ) {
            setErroZip(
                "A seleção atual não está liberada para geração do pacote ZIP."
            );

            return;
        }

        const selecaoIdInicio =
            exportacao?.selecaoId;

        setGerandoZip(
            true
        );

        setErroZip(
            ""
        );

        setResultadoZip(
            null
        );

        let urlZip =
            null;

        try {
            const resultado =
                await criarZipConsolidacaoColaboradorService({
                    supabase,
                    estruturaExportacao,
                    heroUrl:
                        heroRelatorioConsolidacaoUrl,
                });

            if (
                resultado?.selecaoId !==
                selecaoIdInicio
            ) {
                throw new Error(
                    "O ZIP gerado não pertence à seleção iniciada."
                );
            }

            urlZip =
                URL.createObjectURL(
                    resultado.blob
                );

            const link =
                document.createElement(
                    "a"
                );

            link.href =
                urlZip;

            link.download =
                resultado.nomeArquivo;

            link.style.display =
                "none";

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();

            const urlZipParaRevogar =
                urlZip;

            window.setTimeout(
                () => {
                    URL.revokeObjectURL(
                        urlZipParaRevogar
                    );
                },
                120000
            );

            urlZip =
                null;

            let resultadoHistorico =
                null;

            try {
                resultadoHistorico =
                    await registrarHistoricoConsolidacaoColaboradorService({
                        registrarAuditoria:
                            onRegistrarAuditoria,

                        estruturaExportacao,

                        resultadoZip:
                            resultado,
                    });

                if (
                    resultadoHistorico
                        ?.registrado ===
                    true
                ) {
                    const colaboradorHistoricoId =
                        textoSeguro(
                            resultadoHistorico
                                ?.evento
                                ?.registroId
                        );

                    if (
                        colaboradorHistoricoId &&
                        colaboradorHistoricoId ===
                            textoSeguro(
                                colaboradorAtualRef
                                    .current
                            )
                    ) {
                        void carregarHistorico(
                            colaboradorHistoricoId
                        );
                    }

                    console.info(
                        "[SafeScan][ConsolidacaoDocumental][G8.2] AUDITORIA_REAL",
                        {
                            registrado:
                                true,

                            acao:
                                resultadoHistorico
                                    ?.evento
                                    ?.acao,

                            registroId:
                                resultadoHistorico
                                    ?.evento
                                    ?.registroId,

                            selecaoId:
                                resultadoHistorico
                                    ?.evento
                                    ?.dados
                                    ?.selecaoId,

                            planoId:
                                resultadoHistorico
                                    ?.evento
                                    ?.dados
                                    ?.planoId,

                            nomeArquivo:
                                resultadoHistorico
                                    ?.evento
                                    ?.dados
                                    ?.nomeArquivo,
                        }
                    );
                }
                else {
                    console.warn(
                        "[SafeScan][ConsolidacaoDocumental][G8.2] AUDITORIA_NAO_REGISTRADA",
                        {
                            registrado:
                                false,

                            motivo:
                                resultadoHistorico
                                    ?.motivo ||
                                "auditoria_nao_registrada",

                            selecaoId:
                                resultado?.selecaoId,

                            nomeArquivo:
                                resultado?.nomeArquivo,
                        }
                    );
                }
            }
            catch (
                erroHistoricoZip
            ) {
                resultadoHistorico = {
                    registrado:
                        false,

                    motivo:
                        "erro_inesperado",
                };

                console.error(
                    "[SafeScan][ConsolidacaoDocumental][G8.2] AUDITORIA_ERRO",
                    erroHistoricoZip
                );
            }

            setResultadoZip({
                nomeArquivo:
                    resultado.nomeArquivo,

                selecaoId:
                    resultado.selecaoId,

                totalDocumentos:
                    resultado.totalDocumentos,

                totalArquivos:
                    resultado.totalArquivos,

                totalEntradas:
                    resultado.totalEntradas,

                totalPastas:
                    resultado.totalPastas,

                tamanhoBytesZip:
                    resultado.tamanhoBytesZip,

                tamanhoBytesConteudo:
                    resultado.tamanhoBytesConteudo,

                resumoPdf:
                    resultado.resumoPdf,

                estrategia:
                    resultado.estrategia,

                historicoRegistrado:
                    resultadoHistorico
                        ?.registrado ===
                    true,

                historicoMotivo:
                    resultadoHistorico
                        ?.motivo ||
                    "",
            });

            console.info(
                "[SafeScan][ConsolidacaoDocumental][G7.3.2] ZIP_REAL",
                {
                    nomeArquivo:
                        resultado.nomeArquivo,

                    selecaoId:
                        resultado.selecaoId,

                    totalDocumentos:
                        resultado.totalDocumentos,

                    totalArquivos:
                        resultado.totalArquivos,

                    totalEntradas:
                        resultado.totalEntradas,

                    totalPastas:
                        resultado.totalPastas,

                    tamanhoBytesZip:
                        resultado.tamanhoBytesZip,

                    tamanhoMiBZip:
                        (
                            resultado.tamanhoBytesZip /
                            (1024 * 1024)
                        ).toFixed(
                            2
                        ),

                    tamanhoBytesConteudo:
                        resultado.tamanhoBytesConteudo,

                    resumoPdf:
                        resultado.resumoPdf,

                    estrategia:
                        resultado.estrategia,
                }
            );
        }
        catch (
            erroGeracaoZip
        ) {
            if (urlZip) {
                URL.revokeObjectURL(
                    urlZip
                );
            }

            setErroZip(
                erroGeracaoZip
                    ?.message ||
                    "Não foi possível gerar o pacote ZIP."
            );

            console.error(
                "[SafeScan][ConsolidacaoDocumental][G7.3.2] ZIP_REAL_ERRO",
                erroGeracaoZip
            );
        }
        finally {
            setGerandoZip(
                false
            );
        }
    }

    async function handleMedirArquivosDev() {
        if (
            !import.meta.env.DEV ||
            medindoArquivosDev ||
            gerandoZip
        ) {
            return;
        }

        if (!supabase) {
            setErroMedicaoArquivosDev(
                "Cliente Supabase não disponível para a medição física."
            );

            return;
        }

        if (
            !estruturaExportacao ||
            exportacao?.podeGerar !==
                true
        ) {
            setErroMedicaoArquivosDev(
                "A seleção atual não está liberada para medição física."
            );

            return;
        }

        setMedindoArquivosDev(
            true
        );

        setErroMedicaoArquivosDev(
            ""
        );

        setMedicaoArquivosDev(
            null
        );

        try {
            const planoZip =
                criarPlanoZipConsolidacaoColaborador(
                    estruturaExportacao
                );

            const medicao =
                await medirArquivosFisicosConsolidacaoColaborador({
                    supabase,
                    planoZip,
                });

            if (
                medicao.selecaoId !==
                exportacao.selecaoId
            ) {
                throw new Error(
                    "A seleção mudou durante a medição física. Execute novamente."
                );
            }

            setMedicaoArquivosDev(
                medicao
            );

            console.info(
                "[SafeScan][ConsolidacaoDocumental][G7.2.1] MEDICAO_REAL",
                {
                    selecaoId:
                        medicao.selecaoId,

                    totalArquivos:
                        medicao.totalArquivos,

                    totalBytesReal:
                        medicao.totalBytesReal,

                    totalMiB:
                        (
                            medicao.totalBytesReal /
                            (1024 * 1024)
                        ).toFixed(
                            2
                        ),

                    maiorArquivoBytes:
                        medicao.maiorArquivoBytes,

                    maiorArquivoMiB:
                        (
                            medicao.maiorArquivoBytes /
                            (1024 * 1024)
                        ).toFixed(
                            2
                        ),

                    arquivosComTamanhoPlanejado:
                        medicao.arquivosComTamanhoPlanejado,

                    divergenciasTamanho:
                        medicao.divergenciasTamanho,

                    arquivosComSha256:
                        medicao.arquivosComSha256,

                    arquivosSha256Validados:
                        medicao.arquivosSha256Validados,
                }
            );

            console.table(
                medicao.arquivos.map(
                    (
                        arquivo
                    ) => ({
                        ordem:
                            arquivo.ordem,

                        caminho:
                            arquivo.caminhoRelativo,

                        bytes:
                            arquivo.tamanhoBytesReal,

                        sha256:
                            arquivo.sha256Validado
                                ? "VALIDADO"
                                : arquivo.sha256Esperado
                                  ? "NÃO VALIDADO"
                                  : "NÃO DISPONÍVEL",
                    })
                )
            );
        } catch (
            erroMedicao
        ) {
            setErroMedicaoArquivosDev(
                erroMedicao
                    ?.message ||
                    "Não foi possível medir os arquivos físicos da Consolidação."
            );

            console.error(
                "[SafeScan][ConsolidacaoDocumental][G7.2.1] MEDICAO_REAL_ERRO",
                erroMedicao
            );
        } finally {
            setMedindoArquivosDev(
                false
            );
        }
    }


    const estatisticas =
        estrutura?.estatisticas ||
        {};

    const documentos =
        Array.isArray(
            estrutura?.documentos
        )
            ? estrutura.documentos
            : [];

    const ausencias =
        Array.isArray(
            estrutura
                ?.ausenciasObrigatorias
        )
            ? estrutura
                  .ausenciasObrigatorias
            : [];

    const alertas =
        Array.isArray(
            estrutura?.alertas
        )
            ? estrutura.alertas
            : [];

    const bloqueios =
        Array.isArray(
            estrutura?.bloqueios
        )
            ? estrutura.bloqueios
            : [];

    const candidatosObra =
        Array.isArray(
            estrutura?.obra
                ?.candidatos
        )
            ? estrutura.obra
                  .candidatos
            : [];

    function handleAlternarDocumento(
        documento,
        marcado
    ) {
        const chavesDocumento =
            listarChavesSelecionaveisDocumentoConsolidacao(
                documento
            );

        setChavesEvidenciasSelecionadas(
            (
                atuais
            ) => {
                const proxima =
                    new Set(
                        atuais
                    );

                chavesDocumento.forEach(
                    (
                        chave
                    ) => {
                        if (
                            marcado
                        ) {
                            proxima.add(
                                chave
                            );
                        } else {
                            proxima.delete(
                                chave
                            );
                        }
                    }
                );

                return [
                    ...proxima,
                ].sort();
            }
        );
    }

    function handleAlternarEvidencia(
        documento,
        evidencia,
        marcado
    ) {
        if (
            evidencia?.selecionavel !==
                true ||
            evidencia?.historica ===
                true
        ) {
            return;
        }

        const chave =
            obterChaveSelecaoEvidenciaConsolidacao({
                documento,
                evidencia,
            });

        if (!chave) {
            return;
        }

        setChavesEvidenciasSelecionadas(
            (
                atuais
            ) => {
                const proxima =
                    new Set(
                        atuais
                    );

                if (
                    marcado
                ) {
                    proxima.add(
                        chave
                    );
                } else {
                    proxima.delete(
                        chave
                    );
                }

                return [
                    ...proxima,
                ].sort();
            }
        );
    }

    async function handleSelecionarObra(
        evento
    ) {
        const obraId =
            textoSeguro(
                evento.target.value
            );

        setObraContextoId(
            obraId
        );

        if (!obraId) {
            await carregarEstrutura(
                colaboradorId,
                null
            );

            return;
        }

        await carregarEstrutura(
            colaboradorId,
            obraId
        );
    }

    return (
        <div className="consolidacao-colaborador-page">
            <section className="consolidacao-colaborador-hero">
                <img
                    aria-hidden="true"
                    alt=""
                    className="consolidacao-colaborador-hero__bg"
                    src={dashboardHeroBackground}
                />

                <div className="consolidacao-colaborador-hero__overlay" />

                <div className="consolidacao-colaborador-hero__shell">
                    <div className="consolidacao-colaborador-hero__conteudo">
                        <span className="consolidacao-colaborador-hero__eyebrow">
                            SAFESCAN BRASIL
                        </span>

                        <h1>
                            Consolidação Documental
                        </h1>

                        <p>
                            Prepare, consolide e gere a documentação
                            do colaborador para validação externa.
                        </p>

                        <div className="consolidacao-colaborador-hero__linha" />
                    </div>


                </div>
            </section>

            <section className="consolidacao-colaborador-seletor">
                <div className="consolidacao-colaborador-seletor__cabecalho consolidacao-colaborador-documentos__cabecalho">
                    <div>
                        <span className="consolidacao-colaborador-seletor__etapa">
                            ETAPA 01
                        </span>

                        <h2>
                            Selecione a empresa
                            e o colaborador
                        </h2>

                        <p>
                            Escolha a empresa,
                            defina a obra e
                            selecione entre
                            colaboradores ativos
                            ou desmobilizados.
                        </p>
                    </div>

                    {colaboradorId ? (
                        <button
                            type="button"
                            className="consolidacao-colaborador-recarregar"
                            disabled={
                                carregando
                            }
                            onClick={() =>
                                carregarEstrutura(
                                    colaboradorId,
                                    obraContextoId ||
                                        null
                                )
                            }
                        >
                            <RefreshCw
                                aria-hidden="true"
                                size={17}
                            />

                            Atualizar
                        </button>
                    ) : null}
                </div>

                <div className="consolidacao-colaborador-seletor__filtros">
                    <div className="consolidacao-colaborador-seletor__campo">
                        <label
                            htmlFor="consolidacao-empresa-select"
                        >
                            Empresa
                        </label>

                        <div className="consolidacao-colaborador-select-wrap">
                            <Building2
                                aria-hidden="true"
                                size={18}
                            />

                            <select
                                id="consolidacao-empresa-select"
                                value={
                                    empresaFiltroId
                                }
                                onChange={
                                    handleSelecionarEmpresa
                                }
                            >
                                <option value="">
                                    Selecione uma
                                    empresa
                                </option>

                                {empresasDisponiveis.map(
                                    (
                                        empresa
                                    ) => (
                                        <option
                                            key={
                                                empresa.id
                                            }
                                            value={
                                                empresa.id
                                            }
                                        >
                                            {
                                                empresa.nome
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <span className="consolidacao-colaborador-seletor__apoio">
                            {
                                empresasDisponiveis.length
                            }{" "}
                            {empresasDisponiveis.length ===
                            1
                                ? "empresa disponível"
                                : "empresas disponíveis"}
                            .
                        </span>
                    </div>

                    <div className="consolidacao-colaborador-seletor__campo">
                        <label
                            htmlFor="consolidacao-obra-filtro-select"
                        >
                            Obra
                        </label>

                        <div className="consolidacao-colaborador-select-wrap">
                            <HardHat
                                aria-hidden="true"
                                size={18}
                            />

                            <select
                                id="consolidacao-obra-filtro-select"
                                value={
                                    obraContextoId
                                }
                                disabled={
                                    !empresaFiltroId ||
                                    carregandoObras ||
                                    obrasDisponiveis.length ===
                                        0
                                }
                                onChange={
                                    handleSelecionarObraFiltro
                                }
                            >
                                <option value="">
                                    {!empresaFiltroId
                                        ? "Selecione primeiro a empresa"
                                        : carregandoObras
                                          ? "Carregando obras..."
                                          : erroObras
                                            ? "Falha ao carregar obras"
                                            : obrasDisponiveis.length ===
                                                0
                                              ? "Sem obra ativa cadastrada"
                                              : "Selecione uma obra"}
                                </option>

                                {obrasDisponiveis.map(
                                    (
                                        obra
                                    ) => (
                                        <option
                                            key={
                                                obra.id
                                            }
                                            value={
                                                obra.id
                                            }
                                        >
                                            {
                                                obra.nome
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <span
                            className={`consolidacao-colaborador-seletor__apoio ${
                                erroObras
                                    ? "consolidacao-colaborador-seletor__apoio--erro"
                                    : ""
                            }`}
                        >
                            {!empresaFiltroId
                                ? "Selecione primeiro a empresa."
                                : carregandoObras
                                  ? "Consultando obras ativas..."
                                  : erroObras
                                    ? "Não foi possível consultar as obras desta empresa."
                                    : obrasDisponiveis.length ===
                                        0
                                      ? "Nenhuma obra ativa vinculada à empresa."
                                      : `${obrasDisponiveis.length} ${
                                            obrasDisponiveis.length ===
                                            1
                                                ? "obra ativa disponível"
                                                : "obras ativas disponíveis"
                                        }.`}
                        </span>
                    </div>

                    <div className="consolidacao-colaborador-seletor__campo">
                        <label
                            htmlFor="consolidacao-situacao-select"
                        >
                            Situação
                        </label>

                        <div className="consolidacao-colaborador-select-wrap">
                            <ShieldCheck
                                aria-hidden="true"
                                size={18}
                            />

                            <select
                                id="consolidacao-situacao-select"
                                value={
                                    situacaoFiltro
                                }
                                disabled={
                                    !contextoObraPronto
                                }
                                onChange={
                                    handleSelecionarSituacao
                                }
                            >
                                <option value="ativos">
                                    Ativos
                                </option>

                                <option value="desmobilizados">
                                    Desmobilizados
                                </option>
                            </select>
                        </div>

                        <span className="consolidacao-colaborador-seletor__apoio">
                            {!empresaFiltroId
                                ? "Selecione primeiro a empresa."
                                : !contextoObraPronto
                                  ? "Defina a obra antes de continuar."
                                  : situacaoFiltro ===
                                      "desmobilizados"
                                    ? `${totalDesmobilizadosEmpresa} desmobilizados disponíveis.`
                                    : `${totalDesmobilizadosEmpresa} desmobilizados separados da lista de ativos.`}
                        </span>
                    </div>

                    <div className="consolidacao-colaborador-seletor__campo">
                        <label
                            htmlFor="consolidacao-colaborador-select"
                        >
                            Colaborador
                        </label>

                        <div className="consolidacao-colaborador-select-wrap">
                            <UserRound
                                aria-hidden="true"
                                size={18}
                            />

                            <select
                                id="consolidacao-colaborador-select"
                                value={
                                    colaboradorId
                                }
                                disabled={
                                    !contextoObraPronto ||
                                    colaboradoresFiltrados.length ===
                                        0
                                }
                                onChange={
                                    handleSelecionarColaborador
                                }
                            >
                                <option value="">
                                    {!empresaFiltroId
                                        ? "Selecione primeiro a empresa"
                                        : !contextoObraPronto
                                          ? "Defina a obra antes do colaborador"
                                          : colaboradoresFiltrados.length ===
                                              0
                                            ? "Nenhum colaborador neste filtro"
                                            : "Selecione um colaborador"}
                                </option>

                                {colaboradoresFiltrados.map(
                                    (
                                        colaborador
                                    ) => {
                                        const situacaoHistorica =
                                            obterSituacaoHistoricaTreinamentosColaborador(
                                                colaborador
                                            );

                                        return (
                                            <option
                                                key={
                                                    colaborador.id
                                                }
                                                value={
                                                    colaborador.id
                                                }
                                            >
                                                {textoSeguro(
                                                    colaborador.nome
                                                ) ||
                                                    "Colaborador sem nome"}
                                                {textoSeguro(
                                                    colaborador.funcao
                                                )
                                                    ? ` — ${textoSeguro(
                                                          colaborador.funcao
                                                      )}`
                                                    : ""}
                                                {situacaoHistorica
                                                    ? ` — [${situacaoHistorica}]`
                                                    : ""}
                                            </option>
                                        );
                                    }
                                )}
                            </select>
                        </div>

                        <span className="consolidacao-colaborador-seletor__apoio">
                            {contextoObraPronto
                                ? `${colaboradoresFiltrados.length} colaboradores disponíveis neste filtro.`
                                : empresaFiltroId
                                  ? "Complete o contexto de obra para liberar a lista."
                                  : "A lista será liberada após selecionar a empresa."}
                        </span>
                    </div>
                </div>

                {carregando ? (
                    <div className="consolidacao-colaborador-loading">
                        <LoaderCircle
                            aria-hidden="true"
                            className="consolidacao-colaborador-loading__icone"
                            size={22}
                        />

                        <span>
                            Preparando Consolidação Documental...
                        </span>
                    </div>
                ) : null}

                {erro ? (
                    <div className="consolidacao-colaborador-mensagem consolidacao-colaborador-mensagem--erro">
                        <AlertTriangle
                            aria-hidden="true"
                            size={20}
                        />

                        <div>
                            <strong>
                                Não foi possível
                                montar a prévia
                            </strong>

                            <span>
                                {erro}
                            </span>
                        </div>
                    </div>
                ) : null}
            </section>

            {!estrutura &&
            !carregando &&
            !erro ? (
                <section className="consolidacao-colaborador-vazio">
                    <div className="consolidacao-colaborador-vazio__icone">
                        <FolderOpen
                            aria-hidden="true"
                            size={34}
                            strokeWidth={1.8}
                        />
                    </div>

                    <h2>
                        Prévia aguardando
                        seleção
                    </h2>

                    <p>
                        Escolha um colaborador
                        para visualizar a
                        estrutura documental
                        que será utilizada
                        para montar a
                        consolidação documental.
                    </p>
                </section>
            ) : null}

            {estrutura ? (
                <>
                    <section className="consolidacao-colaborador-identidade">
                        <div className="consolidacao-colaborador-identidade__principal">
                            <div
                                className={`consolidacao-colaborador-identidade__avatar ${
                                    fotoColaboradorExibicao
                                        ? "consolidacao-colaborador-identidade__avatar--foto"
                                        : ""
                                }`}
                            >
                                {fotoColaboradorExibicao ? (
                                    <img
                                        src={
                                            fotoColaboradorExibicao
                                        }
                                        alt={`Foto de ${
                                            textoSeguro(
                                                estrutura
                                                    .colaborador
                                                    ?.nome
                                            ) ||
                                            "colaborador"
                                        }`}
                                        onError={() => {
                                            setFotoColaboradorAssinada({
                                                colaboradorId:
                                                    "",
                                                caminho:
                                                    "",
                                                url:
                                                    "",
                                            });
                                        }}
                                    />
                                ) : (
                                    <UserRound
                                        aria-hidden="true"
                                        size={28}
                                    />
                                )}
                            </div>

                            <div>
                                <span>
                                    Colaborador
                                </span>

                                <h2>
                                    {textoSeguro(
                                        estrutura
                                            .colaborador
                                            ?.nome
                                    ) ||
                                        "Nome não informado"}
                                </h2>

                                <p>
                                    {textoSeguro(
                                        estrutura
                                            .colaborador
                                            ?.funcao
                                    ) ||
                                        "Função não informada"}
                                </p>
                            </div>
                        </div>

                        <div className="consolidacao-colaborador-identidade__dados">
                            <div>
                                <Building2
                                    aria-hidden="true"
                                    size={18}
                                />

                                <span>
                                    Empresa
                                </span>

                                <strong>
                                    {textoSeguro(
                                        estrutura
                                            .empresa
                                            ?.nome
                                    ) ||
                                        "Não informada"}
                                </strong>
                            </div>

                            <div>
                                <HardHat
                                    aria-hidden="true"
                                    size={18}
                                />

                                <span>
                                    Obra
                                </span>

                                <strong>
                                    {textoSeguro(
                                        estrutura
                                            .obra
                                            ?.nome
                                    ) ||
                                        obterTextoStatusObra(
                                            estrutura.obra
                                        )}
                                </strong>
                            </div>

                            <div>
                                <ShieldCheck
                                    aria-hidden="true"
                                    size={18}
                                />

                                <span>
                                    Estado
                                </span>

                                <strong>
                                    {textoSeguro(
                                        estrutura
                                            .colaborador
                                            ?.status
                                    ) ||
                                        "Não informado"}
                                </strong>
                            </div>
                        </div>
                    </section>

                    <section className="consolidacao-colaborador-resumo">
                        <ResumoCard
                            Icone={
                                FileText
                            }
                            rotulo="Documentos"
                            valor={numeroSeguro(
                                estatisticas.totalDocumentosLogicos
                            )}
                            detalhe="registros lógicos atuais"
                        />

                        <ResumoCard
                            Icone={
                                FileCheck2
                            }
                            rotulo="Evidências"
                            valor={numeroSeguro(
                                estatisticas.totalEvidenciasAtuais
                            )}
                            detalhe="arquivos atuais encontrados"
                            tom="info"
                        />

                        <ResumoCard
                            Icone={
                                AlertTriangle
                            }
                            rotulo="Vencidos"
                            valor={numeroSeguro(
                                estatisticas.totalVencidos
                            )}
                            detalhe="documentos fora da validade"
                            tom={
                                numeroSeguro(
                                    estatisticas.totalVencidos
                                ) > 0
                                    ? "danger"
                                    : "success"
                            }
                        />

                        <ResumoCard
                            Icone={
                                ShieldCheck
                            }
                            rotulo="Ausências"
                            valor={numeroSeguro(
                                estatisticas.totalAusenciasObrigatorias
                            )}
                            detalhe="obrigações sem documento"
                            tom={
                                numeroSeguro(
                                    estatisticas.totalAusenciasObrigatorias
                                ) > 0
                                    ? "warning"
                                    : "success"
                            }
                        />
                    </section>

                    {![
                        "RESOLVIDA_UNICA",
                        "RESOLVIDA_EXPLICITA",
                    ].includes(
                        estrutura?.obra?.status
                    ) ? (
<section className="consolidacao-colaborador-contexto">
                        <div className="consolidacao-colaborador-contexto__titulo">
                            <HardHat
                                aria-hidden="true"
                                size={21}
                            />

                            <div>
                                <h2>
                                    Contexto de
                                    obra
                                </h2>

                                <p>
                                    A obra faz
                                    parte da
                                    identidade do
                                    Consolidação.
                                </p>
                            </div>
                        </div>

                        <span
                            className={`consolidacao-colaborador-status consolidacao-colaborador-status--${obterTomObra(
                                estrutura
                                    .obra
                                    ?.status
                            )}`}
                        >
                            {obterTextoStatusObra(
                                estrutura.obra
                            )}
                        </span>

                        {estrutura
                            .obra
                            ?.status ===
                            "AMBIGUA" ? (
                            <div className="consolidacao-colaborador-obra-escolha">
                                <div>
                                    <AlertTriangle
                                        aria-hidden="true"
                                        size={19}
                                    />

                                    <span>
                                        Esta empresa
                                        possui mais
                                        de uma obra
                                        ativa.
                                        Selecione a
                                        obra correta
                                        antes das
                                        futuras
                                        etapas de
                                        exportação.
                                    </span>
                                </div>

                                <label
                                    htmlFor="consolidacao-obra-select"
                                >
                                    Obra da Consolidação
                                </label>

                                <select
                                    id="consolidacao-obra-select"
                                    value={
                                        obraContextoId
                                    }
                                    disabled={
                                        carregando
                                    }
                                    onChange={
                                        handleSelecionarObra
                                    }
                                >
                                    <option value="">
                                        Selecione a
                                        obra
                                    </option>

                                    {candidatosObra.map(
                                        (
                                            obra
                                        ) => (
                                            <option
                                                key={
                                                    obra.id
                                                }
                                                value={
                                                    obra.id
                                                }
                                            >
                                                {textoSeguro(
                                                    obra.nome
                                                ) ||
                                                    "Obra sem nome"}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>
                        ) : null}
                    </section>
                    ) : null}

                    {bloqueios.length >
                    0 ? (
                        <section className="consolidacao-colaborador-mensagem consolidacao-colaborador-mensagem--erro">
                            <AlertTriangle
                                aria-hidden="true"
                                size={20}
                            />

                            <div>
                                <strong>
                                    Geração futura
                                    bloqueada
                                </strong>

                                {bloqueios.map(
                                    (
                                        bloqueio,
                                        indice
                                    ) => (
                                        <span
                                            key={
                                                bloqueio?.codigo ||
                                                indice
                                            }
                                        >
                                            {obterMensagemItem(
                                                bloqueio
                                            )}
                                        </span>
                                    )
                                )}
                            </div>
                        </section>
                    ) : null}



                    <section className="consolidacao-colaborador-documentos">
                        <div className="consolidacao-colaborador-documentos__cabecalho">
                            <div>
                                <span className="consolidacao-colaborador-seletor__etapa">
                                    ETAPA 02
                                </span>

                                <h2>
                                    Estrutura
                                    documental
                                </h2>

                                <p>
                                    Documentos e
                                    evidências
                                    atuais
                                    organizados
                                    conforme a
                                    estrutura
                                    prevista para
                                    o pacote
                                    documental.
                                </p>
                            </div>
                        </div>

                        <div className="consolidacao-colaborador-categorias">
                            {CATEGORIAS_CONSOLIDACAO.map(
                                (
                                    categoria
                                ) => {
                                    const documentosCategoria =
                                        documentos.filter(
                                            (
                                                documento
                                            ) =>
                                                documento
                                                    ?.categoriaConsolidacao ===
                                                categoria.chave
                                        );

                                    const ausenciasCategoria =
                                        ausencias.filter(
                                            (
                                                ausencia
                                            ) =>
                                                ausencia
                                                    ?.categoriaConsolidacao ===
                                                categoria.chave
                                        );

                                    const totalCategoria =
                                        documentosCategoria.length +
                                        ausenciasCategoria.length;

                                    const totalEvidenciasCategoria =
                                        documentosCategoria.reduce(
                                            (
                                                total,
                                                documento
                                            ) => {
                                                const evidenciasDocumento =
                                                    Array.isArray(
                                                        documento?.evidenciasAtuais
                                                    )
                                                        ? documento.evidenciasAtuais
                                                        : [];

                                                return (
                                                    total +
                                                    evidenciasDocumento.length
                                                );
                                            },
                                            0
                                        );

                                    const documentosComAtencaoCategoria =
                                        documentosCategoria.filter(
                                            (
                                                documento
                                            ) => {
                                                const statusTemporal =
                                                    obterStatusTemporal(
                                                        documento
                                                    );

                                                const tomTemporal =
                                                    obterTomStatusTemporal(
                                                        statusTemporal.chave
                                                    );

                                                const conferencia =
                                                    obterConferenciaDocumento(
                                                        documento
                                                    );

                                                return (
                                                    tomTemporal ===
                                                        "warning" ||
                                                    tomTemporal ===
                                                        "danger" ||
                                                    conferencia.tom ===
                                                        "warning" ||
                                                    conferencia.tom ===
                                                        "danger"
                                                );
                                            }
                                        );

                                    const possuiCriticoCategoria =
                                        documentosCategoria.some(
                                            (
                                                documento
                                            ) => {
                                                const statusTemporal =
                                                    obterStatusTemporal(
                                                        documento
                                                    );

                                                const tomTemporal =
                                                    obterTomStatusTemporal(
                                                        statusTemporal.chave
                                                    );

                                                const conferencia =
                                                    obterConferenciaDocumento(
                                                        documento
                                                    );

                                                return (
                                                    tomTemporal ===
                                                        "danger" ||
                                                    conferencia.tom ===
                                                        "danger"
                                                );
                                            }
                                        );

                                    const totalPendenciasCategoria =
                                        documentosComAtencaoCategoria.length +
                                        ausenciasCategoria.length;

                                    /*
                                     * Progresso representa cobertura documental,
                                     * não a qualidade da conferência.
                                     *
                                     * Documento presente em Atenção/Revisar
                                     * continua contando como documento presente.
                                     *
                                     * Exemplo:
                                     * 8 presentes + 0 ausentes = 100%.
                                     */
                                    const totalPresentesCategoria =
                                        documentosCategoria.length;

                                    const percentualCategoria =
                                        totalCategoria > 0
                                            ? Math.round(
                                                  (
                                                      totalPresentesCategoria /
                                                      totalCategoria
                                                  ) * 100
                                              )
                                            : 0;

                                    const tomCategoria =
                                        totalCategoria === 0
                                            ? "neutral"
                                            : possuiCriticoCategoria
                                              ? "danger"
                                              : totalPendenciasCategoria > 0
                                                ? "warning"
                                                : "success";

                                    const textoSituacaoCategoria =
                                        totalCategoria === 0
                                            ? "Sem itens"
                                            : possuiCriticoCategoria
                                              ? "Revisar"
                                              : totalPendenciasCategoria > 0
                                                ? "Atenção"
                                                : "Conforme";



                                    return (
                                        <details
                                            className={`consolidacao-colaborador-categoria ${
                                                categoria.chave !==
                                                "TREINAMENTOS"
                                                    ? "consolidacao-colaborador-categoria--compacta"
                                                    : "consolidacao-colaborador-categoria--treinamentos"
                                            }`}
                                            key={
                                                categoria.chave
                                            }
                                        >
                                            <summary className="consolidacao-colaborador-categoria__header">
                                                <div className="consolidacao-colaborador-categoria__numero">
                                                    {
                                                        categoria.numero
                                                    }
                                                </div>

                                                <div className="consolidacao-colaborador-categoria__texto">
                                                    <h3>
                                                        {
                                                            categoria.titulo
                                                        }
                                                    </h3>

                                                    <p>
                                                        {
                                                            categoria.subtitulo
                                                        }
                                                    </p>
                                                </div>

                                                <div className="consolidacao-colaborador-categoria__resumo">
                                                    <div className="consolidacao-colaborador-categoria__progresso">
                                                        <div className="consolidacao-colaborador-categoria__progresso-topo">
                                                            <span>
                                                                Progresso
                                                            </span>

                                                            <strong>
                                                                {
                                                                    percentualCategoria
                                                                }
                                                                %
                                                            </strong>
                                                        </div>

                                                        <div
                                                            aria-label={`Cobertura documental da categoria: ${percentualCategoria}%`}
                                                            aria-valuemax="100"
                                                            aria-valuemin="0"
                                                            aria-valuenow={
                                                                percentualCategoria
                                                            }
                                                            className="consolidacao-colaborador-categoria__barra"
                                                            role="progressbar"
                                                        >
                                                            <i
                                                                style={{
                                                                    width: `${percentualCategoria}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="consolidacao-colaborador-categoria__metrica">
                                                        <span>
                                                            Documentos
                                                        </span>

                                                        <strong>
                                                            {
                                                                documentosCategoria.length
                                                            }
                                                        </strong>
                                                    </div>

                                                    <div className="consolidacao-colaborador-categoria__metrica">
                                                        <span>
                                                            Arquivos
                                                        </span>

                                                        <strong>
                                                            {
                                                                totalEvidenciasCategoria
                                                            }
                                                        </strong>
                                                    </div>

                                                    <span
                                                        className={`consolidacao-colaborador-categoria__situacao consolidacao-colaborador-categoria__situacao--${tomCategoria}`}
                                                    >
                                                        {
                                                            textoSituacaoCategoria
                                                        }
                                                    </span>

                                                    <span
                                                        aria-hidden="true"
                                                        className="consolidacao-colaborador-categoria__seta"
                                                    />
                                                </div>
                                            </summary>

                                            <div className="consolidacao-colaborador-tabela-wrap">
                                                <table className="consolidacao-colaborador-tabela">
                                                    <thead>
                                                        <tr>
                                                            <th>
                                                                Documento
                                                            </th>

                                                            <th>
                                                                Emissão
                                                            </th>

                                                            <th>
                                                                Vencimento
                                                            </th>

                                                            <th>
                                                                Situação
                                                            </th>

                                                            <th>
                                                                Conferência
                                                            </th>

                                                            <th>
                                                                {categoria.chave ===
                                                                "TREINAMENTOS" ? (
                                                                    <div className="consolidacao-colaborador-evidencias-cabecalho">
                                                                        <span>
                                                                            Certificado
                                                                        </span>

                                                                        <span>
                                                                            Lista
                                                                        </span>
                                                                    </div>
                                                                ) : (
                                                                    "Arquivo"
                                                                )}
                                                            </th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {(
                                                        categoria.chave === "TREINAMENTOS"
                                                            ? ordenarTreinamentosPorNr(
                                                                  documentosCategoria
                                                              )
                                                            : documentosCategoria
                                                    ).map(
                                                            (
                                                                documento
                                                            ) => (
                                                                <DocumentoRow
                                                                    key={
                                                                        documento.certificadoId
                                                                    }
                                                                    documento={
                                                                        documento
                                                                    }
                                                                    modoTreinamentos={
                                                                        categoria.chave ===
                                                                        "TREINAMENTOS"
                                                                    }
                                                                    chavesSelecionadas={
                                                                        chavesSelecionadas
                                                                    }
                                                                    onAlternarDocumento={
                                                                        handleAlternarDocumento
                                                                    }
                                                                    onAlternarEvidencia={
                                                                        handleAlternarEvidencia
                                                                    }
                                                                />
                                                            )
                                                        )}

                                                        {ausenciasCategoria.map(
                                                            (
                                                                ausencia
                                                            ) => (
                                                                <AusenciaRow
                                                                    key={`ausencia-${ausencia.treinamentoCodigo}`}
                                                                    ausencia={
                                                                        ausencia
                                                                    }
                                                                />
                                                            )
                                                        )}

                                                        {totalCategoria ===
                                                        0 ? (
                                                            <tr>
                                                                <td
                                                                    className="consolidacao-colaborador-tabela__vazio"
                                                                    colSpan={
                                                                        6
                                                                    }
                                                                >
                                                                    Nenhum
                                                                    item
                                                                    atual
                                                                    nesta
                                                                    categoria.
                                                                </td>
                                                            </tr>
                                                        ) : null}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </details>
                                    );
                                }
                            )}
                        </div>
                                            {alertas.length >
                                            0 ? (
                                                <footer className="consolidacao-colaborador-documentos__rodape-alertas">
                            <section className="consolidacao-colaborador-mensagem consolidacao-colaborador-mensagem--alerta">
                                                    <AlertTriangle
                                                        aria-hidden="true"
                                                        size={20}
                                                    />

                                                    <div>
                                                        <strong>
                                                            Alertas documentais
                                                        </strong>

                                                        {alertas.map(
                                                            (
                                                                alerta,
                                                                indice
                                                            ) => (
                                                                <span
                                                                    key={[
                                                                        alerta?.codigo ||
                                                                            "ALERTA",
                                                                        alerta?.certificadoId ||
                                                                            "",
                                                                        alerta?.treinamentoCodigo ??
                                                                            "",
                                                                        alerta?.categoriaConsolidacao ||
                                                                            "",
                                                                        obterMensagemItem(
                                                                            alerta
                                                                        ),
                                                                        indice,
                                                                    ].join(
                                                                        "::"
                                                                    )}
                                                                >
                                                                    {obterMensagemItem(
                                                                        alerta
                                                                    )
                                                                        .replace(
                                                                            /:\s*conferência documental em "atencao"\.?$/i,
                                                                            " — conferência documental requer atenção."
                                                                        )
                                                                        .replace(
                                                                            /:\s*conferência documental em "suspeit[oa]"\.?$/i,
                                                                            " — conferência documental classificada como suspeita."
                                                                        )
                                                                        .replace(
                                                                            /:\s*conferência documental em "bloquead[oa]"\.?$/i,
                                                                            " — conferência documental bloqueada."
                                                                        )}
                                                                </span>
                                                            )
                                                        )}
                                                    </div>
                                                </section>
                        </footer>
                                            ) : null}
                    </section>

                    <section className="consolidacao-colaborador-readonly consolidacao-colaborador-readonly--cabecalho-compacto">
                        <div className="consolidacao-colaborador-readonly__conteudo">
                            <div className="consolidacao-colaborador-readonly__cabecalho-compacto">
                                <div className="consolidacao-colaborador-readonly__titulo-compacto">
                                    <span className="consolidacao-colaborador-readonly__icone-compacto">
                                        <ShieldCheck
                                            aria-hidden="true"
                                            size={18}
                                        />
                                    </span>

                                    <strong>
                                        Pacote
                                        documental
                                    </strong>
                                </div>

                                                            </div>

                            <span className="consolidacao-colaborador-readonly__orientacao">
                                Revise os documentos selecionados antes de gerar
                                o resumo PDF ou o pacote ZIP. As gerações ficam
                                registradas no histórico.
                            </span>
                            <div className="consolidacao-colaborador-readonly__acoes">
                                <button
                                    className="consolidacao-colaborador-pdf-botao consolidacao-colaborador-pdf-botao--secundario"
                                    type="button"
                                    disabled={
                                        gerandoPdf ||
                                        gerandoZip ||
                                        exportacao
                                            ?.podeGerar !==
                                            true
                                    }
                                    onClick={
                                        handleGerarResumoPdf
                                    }
                                >
                                    {gerandoPdf ? (
                                        <LoaderCircle
                                            aria-hidden="true"
                                            className="consolidacao-colaborador-pdf-botao__spinner"
                                            size={16}
                                        />
                                    ) : (
                                        <FileText
                                            aria-hidden="true"
                                            size={16}
                                        />
                                    )}

                                    <span>
                                        {gerandoPdf
                                            ? "Gerando PDF..."
                                            : "Gerar resumo PDF"}
                                    </span>
                                </button>

                                {erroPdf ? (
                                    <span
                                        className="consolidacao-colaborador-pdf-erro"
                                        role="alert"
                                    >
                                        {erroPdf}
                                    </span>
                                ) : null}

                                <button
                                    className="consolidacao-colaborador-pdf-botao consolidacao-colaborador-pdf-botao--principal"
                                    type="button"
                                    disabled={
                                        gerandoZip ||
                                        gerandoPdf ||
                                        medindoArquivosDev ||
                                        exportacao
                                            ?.podeGerar !==
                                            true
                                    }
                                    onClick={
                                        handleGerarConsolidacaoZip
                                    }
                                >
                                    {gerandoZip ? (
                                        <LoaderCircle
                                            aria-hidden="true"
                                            className="consolidacao-colaborador-pdf-botao__spinner"
                                            size={16}
                                        />
                                    ) : (
                                        <FileText
                                            aria-hidden="true"
                                            size={16}
                                        />
                                    )}

                                    <span>
                                        {gerandoZip
                                            ? "Gerando ZIP..."
                                            : "Gerar pacote ZIP"}
                                    </span>
                                </button>

                                {erroZip ? (
                                    <span
                                        className="consolidacao-colaborador-pdf-erro"
                                        role="alert"
                                    >
                                        {erroZip}
                                    </span>
                                ) : null}

                                {resultadoZip &&
                                resultadoZip.selecaoId ===
                                    exportacao?.selecaoId ? (
                                    <div
                                        aria-live="polite"
                                        className="consolidacao-colaborador-readonly__zip-status"
                                        role="status"
                                    >
                                        <div className="consolidacao-colaborador-readonly__zip-status-principal">
                                            <FileText
                                                aria-hidden="true"
                                                size={16}
                                            />

                                            <strong>
                                                Pacote ZIP
                                                gerado
                                            </strong>
                                        </div>

                                        <div className="consolidacao-colaborador-readonly__zip-status-metricas">
                                            <span>
                                                <strong>
                                                    {
                                                        resultadoZip.totalArquivos
                                                    }
                                                </strong>

                                                <small>
                                                    arquivos físicos
                                                </small>
                                            </span>

                                            <span>
                                                <strong>
                                                    {
                                                        resultadoZip.totalEntradas
                                                    }
                                                </strong>

                                                <small>
                                                    itens no ZIP
                                                </small>
                                            </span>

                                            <span>
                                                <strong>
                                                    {(
                                                        numeroSeguro(
                                                            resultadoZip.tamanhoBytesZip
                                                        ) /
                                                        1000000
                                                    ).toFixed(
                                                        2
                                                    )}
                                                </strong>

                                                <small>
                                                    MB
                                                </small>
                                            </span>

                                            <span
                                                className={`consolidacao-colaborador-readonly__zip-status-historico ${
                                                    resultadoZip.historicoRegistrado
                                                        ? "consolidacao-colaborador-readonly__zip-status-historico--ok"
                                                        : "consolidacao-colaborador-readonly__zip-status-historico--atencao"
                                                }`}
                                            >
                                                {resultadoZip.historicoRegistrado
                                                    ? "Histórico registrado"
                                                    : "Histórico não registrado"}
                                            </span>
                                        </div>
                                    </div>
                                ) : null}

                                {resultadoZip &&
                                resultadoZip.selecaoId ===
                                    exportacao?.selecaoId &&
                                resultadoZip.historicoRegistrado ===
                                    false ? (
                                    <span
                                        className="consolidacao-colaborador-pdf-erro"
                                        role="alert"
                                    >
                                        ZIP gerado e download iniciado, porém o histórico não foi registrado.
                                    </span>
                                ) : null}

                                {(() => {
                                    const totalPresentes =
                                        numeroSeguro(
                                            estatisticas
                                                .totalDocumentosLogicos
                                        );

                                    const totalAusentes =
                                        numeroSeguro(
                                            estatisticas
                                                .totalAusenciasObrigatorias
                                        );

                                    const totalEsperados =
                                        totalPresentes +
                                        totalAusentes;

                                    const percentualConclusao =
                                        totalEsperados > 0
                                            ? Math.max(
                                                  0,
                                                  Math.min(
                                                      100,
                                                      Math.round(
                                                          (
                                                              totalPresentes /
                                                              totalEsperados
                                                          ) *
                                                              100
                                                      )
                                                  )
                                              )
                                            : 0;

                                    return (
                                        <div className="consolidacao-colaborador-readonly__progresso">
                                            <div className="consolidacao-colaborador-readonly__progresso-topo">
                                                <span>
                                                    Conclusão
                                                    documental
                                                </span>

                                                <strong>
                                                    {
                                                        percentualConclusao
                                                    }
                                                    %
                                                </strong>
                                            </div>

                                            <div
                                                aria-label={`Conclusão documental: ${percentualConclusao}%`}
                                                aria-valuemax="100"
                                                aria-valuemin="0"
                                                aria-valuenow={
                                                    percentualConclusao
                                                }
                                                className="consolidacao-colaborador-readonly__progresso-barra"
                                                role="progressbar"
                                            >
                                                <i
                                                    style={{
                                                        width: `${percentualConclusao}%`,
                                                    }}
                                                />
                                            </div>

                                            <span className="consolidacao-colaborador-readonly__progresso-detalhe">
                                                {totalEsperados >
                                                0
                                                    ? `${totalPresentes}/${totalEsperados} documentos`
                                                    : "Sem documentos previstos"}
                                            </span>
                                        </div>
                                    );
                                })()}
                                {import.meta.env.DEV ? (
                                    <div
                                        aria-hidden="true"
                                        className="consolidacao-colaborador-readonly__dev-interno"
                                        hidden
                                    >
                                        <button
                                            className="consolidacao-colaborador-pdf-botao"
                                            type="button"
                                            disabled={
                                                medindoArquivosDev ||
                                                gerandoPdf ||
                                                gerandoZip ||
                                                exportacao
                                                    ?.podeGerar !==
                                                    true
                                            }
                                            onClick={
                                                handleMedirArquivosDev
                                            }
                                        >
                                            {medindoArquivosDev ? (
                                                <LoaderCircle
                                                    aria-hidden="true"
                                                    className="consolidacao-colaborador-pdf-botao__spinner"
                                                    size={16}
                                                />
                                            ) : (
                                                <RefreshCw
                                                    aria-hidden="true"
                                                    size={16}
                                                />
                                            )}

                                            <span>
                                                {medindoArquivosDev
                                                    ? "Medindo arquivos..."
                                                    : "Medir arquivos (DEV)"}
                                            </span>
                                        </button>

                                        {erroMedicaoArquivosDev ? (
                                            <span
                                                className="consolidacao-colaborador-pdf-erro"
                                                role="alert"
                                            >
                                                {erroMedicaoArquivosDev}
                                            </span>
                                        ) : null}

                                        {medicaoArquivosDev &&
                                        medicaoArquivosDev.selecaoId ===
                                            exportacao?.selecaoId ? (
                                            <span className="consolidacao-colaborador-readonly__selecao">
                                                DEV:{" "}
                                                {medicaoArquivosDev.totalArquivos}{" "}
                                                arquivos ·{" "}
                                                {(
                                                    numeroSeguro(
                                                        medicaoArquivosDev.totalBytesReal
                                                    ) /
                                                    (1024 * 1024)
                                                ).toFixed(
                                                    2
                                                )}{" "}
                                                MiB total · maior{" "}
                                                {(
                                                    numeroSeguro(
                                                        medicaoArquivosDev.maiorArquivoBytes
                                                    ) /
                                                    (1024 * 1024)
                                                ).toFixed(
                                                    2
                                                )}{" "}
                                                MiB · SHA{" "}
                                                {
                                                    medicaoArquivosDev.arquivosSha256Validados
                                                }
                                                /
                                                {
                                                    medicaoArquivosDev.arquivosComSha256
                                                }{" "}
                                                validados · divergências{" "}
                                                {
                                                    medicaoArquivosDev.divergenciasTamanho
                                                }
                                            </span>
                                        ) : null}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </section>

                    <section className="consolidacao-colaborador-historico">
                        <div className="consolidacao-colaborador-historico__cabecalho">
                            <div>
                                <span className="consolidacao-colaborador-historico__rotulo">
                                    HISTÓRICO
                                </span>

                                <h2>
                                    Histórico de gerações
                                </h2>

                                <p>
                                    Registros reais das gerações deste colaborador.
                                </p>
                            </div>

                            <button
                                className="consolidacao-colaborador-historico__atualizar"
                                type="button"
                                disabled={
                                    carregandoHistorico
                                }
                                onClick={
                                    handleAtualizarHistorico
                                }
                            >
                                <RefreshCw
                                    aria-hidden="true"
                                    className={
                                        carregandoHistorico
                                            ? "consolidacao-colaborador-historico__spinner"
                                            : undefined
                                    }
                                    size={15}
                                />

                                <span>
                                    {carregandoHistorico
                                        ? "Atualizando..."
                                        : "Atualizar"}
                                </span>
                            </button>
                        </div>

                        {erroHistorico ? (
                            <div
                                className="consolidacao-colaborador-historico__erro"
                                role="alert"
                            >
                                {erroHistorico}
                            </div>
                        ) : null}

                        {carregandoHistorico &&
                        historicoGeracoes.length ===
                            0 ? (
                            <div className="consolidacao-colaborador-historico__vazio">
                                <LoaderCircle
                                    aria-hidden="true"
                                    className="consolidacao-colaborador-historico__spinner"
                                    size={18}
                                />

                                <span>
                                    Carregando histórico...
                                </span>
                            </div>
                        ) : null}

                        {!carregandoHistorico &&
                        !erroHistorico &&
                        historicoGeracoes.length ===
                            0 ? (
                            <div className="consolidacao-colaborador-historico__vazio">
                                <FileText
                                    aria-hidden="true"
                                    size={18}
                                />

                                <span>
                                    Nenhuma geração registrada para este colaborador.
                                </span>
                            </div>
                        ) : null}

                        {historicoGeracoes.length >
                        0 ? (
                            <div className="consolidacao-colaborador-historico__lista">
                                {historicoGeracoes.map(
                                    (
                                        registro
                                    ) => (
                                        <article
                                            className="consolidacao-colaborador-historico__item"
                                            key={
                                                registro.id ||
                                                [
                                                    registro.createdAt,
                                                    registro.selecaoId,
                                                    registro.planoId,
                                                ].join(
                                                    "::"
                                                )
                                            }
                                        >
                                            <div className="consolidacao-colaborador-historico__item-topo">
                                                <div>
                                                    <strong>
                                                        {
                                                            registro.dataHoraRotulo
                                                        }
                                                    </strong>

                                                    <span>
                                                        Gerado por:{" "}
                                                        {
                                                            registro.usuarioEmail
                                                        }
                                                    </span>
                                                </div>

                                                <span className="consolidacao-colaborador-historico__status">
                                                    Download iniciado
                                                </span>
                                            </div>

                                            <strong className="consolidacao-colaborador-historico__arquivo">
                                                {
                                                    registro.nomeArquivo
                                                }
                                            </strong>

                                            <div className="consolidacao-colaborador-historico__metricas">
                                                <span>
                                                    {
                                                        registro.totalDocumentos
                                                    }{" "}
                                                    documentos
                                                </span>

                                                <span>
                                                    {
                                                        registro.totalArquivos
                                                    }{" "}
                                                    arquivos
                                                </span>

                                                <span>
                                                    {
                                                        registro.totalEntradas
                                                    }{" "}
                                                    entradas
                                                </span>

                                                <span>
                                                    {(
                                                        numeroSeguro(
                                                            registro.tamanhoBytesZip
                                                        ) /
                                                        (1024 * 1024)
                                                    ).toFixed(
                                                        2
                                                    )}{" "}
                                                    MiB
                                                </span>
                                            </div>
                                        </article>
                                    )
                                )}
                            </div>
                        ) : null}

                        {historicoExisteMais ? (
                            <span className="consolidacao-colaborador-historico__mais">
                                Exibindo as 10 gerações mais recentes.
                            </span>
                        ) : null}
                    </section>
                </>
            ) : null}
        </div>
    );
}

export default ConsolidacaoColaboradorPage;
