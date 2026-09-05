import "../../styles/pages/treinamentos-hero.css";
/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, Clock3, Search, SlidersHorizontal, TriangleAlert, Upload } from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import {
    criarUrlHistoricoCertificadoService,
    listarHistoricoCertificadoService,
} from "../../services/certificadosHistoricoConsultaService";
import {
    ACOES_PERMISSAO_SISTEMA,
    MODULOS_PERMISSAO_SISTEMA,
    usuarioPodeExecutarAcaoSistema,
    usuarioPodeExcluirSistema,
} from "../../services/usuariosPermissoesSistemaService";
import { Card, Header } from "../commonComponents";
import { validarArquivoAntesUpload, validarListaArquivosAntesUpload } from "../FileUploadAviso";
import { AlertasTstTreinamentos } from "./AlertasTstTreinamentos";
import { BaseCertificadosTreinamentos } from "./BaseCertificadosTreinamentos";
import { HistoricoCertificadoDrawer } from "./HistoricoCertificadoDrawer";
import { FormularioLancamentoCertificado } from "./FormularioLancamentoCertificado";
import { ModalDivergenciaFuncaoAso } from "./ModalDivergenciaFuncaoAso";
import { TreinamentosControles } from "./TreinamentosControles";
import VerificadorListaPresenca from "../VerificadorListaPresenca";
import {
    avaliarTreinamentosColaborador,
    colaboradorForaControleDocumentalOperacional,
    statusGeral,
    treinamentoSemValidade,
    statusDocumento,
    obterTreinamento,
    obterStatusInicialColaborador,
    calcularVencimentoTreinamento,
    detectarDataEmissaoArquivo,
    inferirTreinamentoPorNomeArquivo,
} from "../../services/colaboradorDocumentosService";
import {
    prepararArquivosTreinamentoLote,
    atualizarColaboradorArquivoLote,
    atualizarTreinamentoArquivoLote,
    atualizarDataArquivoLote,
} from "../../services/treinamentosService";
import { FUNCAO_EMAIL_ALERTA_TST } from "../../constants/sistemaConstants";
import { TIPOS_MODELO_EMAIL_SST } from "../../constants/modelosEmailSstConstants";
import { treinamentosBase } from "../../constants/treinamentosConstants";
import treinamentosHeroBackground from "../../assets/dashboard-hero-sst.png";
import {
    normalizarTextoBusca,
    diasParaVencer,
    formatDate,
    normalizarEmailDestinatario,
} from "../../utils/sstUtils";

const obterDataHojeIso = () => new Date().toISOString().slice(0, 10);

function obterOrdemTreinamentoParaBase(documento = {}) {
    const treinamento = obterTreinamento(Number(documento?.treinamentoId || documento?.treinamento_id || 0));
    const nome = String(treinamento?.nome || documento?.nomeTreinamento || documento?.tipoTreinamento || "");
    const matchNr = nome.match(/NR\s*[-–—º°]?\s*(\d+(?:[.,]\d+)?)/i);

    if (matchNr?.[1]) {
        return Number(String(matchNr[1]).replace(",", "."));
    }

    if (normalizarTextoBusca(nome).includes("ficha")) return 0;
    return Number(documento?.treinamentoId || treinamento?.id || 9999);
}

function ordenarCertificadosPorTreinamento(a = {}, b = {}) {
    const ordemA = obterOrdemTreinamentoParaBase(a);
    const ordemB = obterOrdemTreinamentoParaBase(b);

    if (ordemA !== ordemB) return ordemA - ordemB;

    const nomeA = obterTreinamento(Number(a?.treinamentoId || 0))?.nome || a?.nomeTreinamento || a?.tipoTreinamento || "";
    const nomeB = obterTreinamento(Number(b?.treinamentoId || 0))?.nome || b?.nomeTreinamento || b?.tipoTreinamento || "";
    return String(nomeA).localeCompare(String(nomeB), "pt-BR");
}

function normalizarClassificacaoEvidenciaLote(
    valor = ""
) {
    return String(
        valor ||
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[^a-z0-9]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function treinamentoAdmiteMultiplasEvidenciasLote(
    item = {}
) {
    const treinamentoId =
        Number(
            item?.treinamentoId ||
            item?.treinamento_id ||
            0
        );

    if (
        !Number.isFinite(
            treinamentoId
        ) ||
        treinamentoId <= 0
    ) {
        return false;
    }

    const treinamento =
        obterTreinamento(
            treinamentoId
        );

    const categoria =
        normalizarClassificacaoEvidenciaLote(
            treinamento?.categoria ||
            item?.treinamentoCategoria ||
            item?.categoriaTreinamento ||
            ""
        );

    const nome =
        normalizarClassificacaoEvidenciaLote(
            treinamento?.nome ||
            item?.nomeTreinamento ||
            item?.treinamentoNome ||
            item?.tipoTreinamento ||
            ""
        );

    /*
     * Documento / Documento Médico são registros individuais,
     * não o par "certificado + lista de presença".
     */
    const categoriaEhDocumento =
        /^documento(?:\s|$)/.test(
            categoria
        );

    /*
     * Alguns itens documentais usam categoria operacional
     * "Obrigatório"; por isso existe uma segunda guarda
     * semântica pelo nome.
     *
     * NR-06 Uso Correto de EPIs NÃO casa com esta expressão.
     */
    const nomeEhDocumentoSemPar =
        /\b(ficha de registro|registro clt|clt|esocial|e social|ficha de epi|ficha epi|epis atualizada|controle de entrega de epi|entrega de epi|atestado de saude ocupacional|aso|integracao|mobilizacao|ordem de servico|procedimento operacional)\b/.test(
            nome
        );

    return (
        !categoriaEhDocumento &&
        !nomeEhDocumentoSemPar
    );
}

function obterTipoEvidenciaTreinamentoLote(
    item = {}
) {
    if (
        !treinamentoAdmiteMultiplasEvidenciasLote(
            item
        )
    ) {
        return "";
    }

    if (
        item?.tipoDocumentoTreinamento ===
        "individual"
    ) {
        return "certificado_individual";
    }

    if (
        item?.tipoDocumentoTreinamento ===
        "lista_presenca"
    ) {
        return "lista_presenca";
    }

    return "";
}

function normalizarDataLancamentoCertificado(data) {
    const texto = String(data || "").trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return "";

    const dataObj = new Date(`${texto}T00:00:00`);

    if (Number.isNaN(dataObj.getTime())) return "";

    const ano = Number(texto.slice(0, 4));
    const anoMaximo = new Date().getFullYear() + 1;

    if (ano < 2000 || ano > anoMaximo) return "";

    return texto;
}

const cardsTreinamentosPadrao = {
    filtros: false,
    lancamento: false,
    listaPresenca: false,
    alertas: false,
    base: false,
};

const ordemCardsTreinamentosPadrao = ["filtros", "lancamento", "listaPresenca", "alertas", "base"];

const tamanhosCardsTreinamentosPadrao = {
    filtros: "full",
    lancamento: "medio",
    listaPresenca: "full",
    alertas: "medio",
    base: "full",
};

const opcoesTamanhoCardTreinamento = [
    { valor: "compacto", label: "Padrão", descricao: "1 coluna" },
    { valor: "medio", label: "Médio", descricao: "2 colunas" },
    { valor: "largo", label: "Grande", descricao: "3 colunas" },
    { valor: "full", label: "Destaque", descricao: "linha inteira" },
];

function normalizarLayoutCardsTreinamentos(layout = {}) {
    const ordemInformada = Array.isArray(layout.ordem) ? layout.ordem : ordemCardsTreinamentosPadrao;
    const ordem = [
        ...ordemInformada.filter((chave) => ordemCardsTreinamentosPadrao.includes(chave)),
        ...ordemCardsTreinamentosPadrao.filter((chave) => !ordemInformada.includes(chave)),
    ];

    return {
        ordem,
        tamanhos: {
            ...tamanhosCardsTreinamentosPadrao,
            ...(layout.tamanhos || {}),
        },
    };
}

function carregarCardsTreinamentosLayout() {
    if (typeof window === "undefined") return normalizarLayoutCardsTreinamentos();

    try {
        const salvo = JSON.parse(window.localStorage.getItem("treinamentosCardsLayout") || "null");
        return normalizarLayoutCardsTreinamentos(salvo || {});
    } catch {
        return normalizarLayoutCardsTreinamentos();
    }
}

function carregarCardsTreinamentosRecolhidos() {
    if (typeof window === "undefined") return cardsTreinamentosPadrao;

    try {
        const salvo = JSON.parse(window.localStorage.getItem("treinamentosCardsRecolhidos") || "null");
        return salvo && typeof salvo === "object" ? { ...cardsTreinamentosPadrao, ...salvo } : cardsTreinamentosPadrao;
    } catch {
        return cardsTreinamentosPadrao;
    }
}

function emailTstDaEmpresa(colaborador) {
    return normalizarEmailDestinatario(colaborador?.empresaTstEmail || "");
}

function obterNomeEmpresaFiltroCertificados(colaborador = {}) {
    return (
        String(
            colaborador?.empresaExibicao ||
            colaborador?.empresa ||
            "Empresa não informada"
        ).replace(/\s+/g, " ").trim() ||
        "Empresa não informada"
    );
}

// rotulo_empresa_filtro_compacto_v1:
// Mantém a identificação completa como valor lógico e usa um rótulo
// compacto somente na apresentação do filtro nativo.
function limitarRotuloEmpresaFiltroCertificados(
    texto = "",
    limite = 72
) {
    const valor =
        String(texto || "")
            .replace(/\s+/g, " ")
            .trim();

    if (valor.length <= limite) {
        return valor;
    }

    return (
        valor
            .slice(
                0,
                Math.max(limite - 1, 1)
            )
            .trimEnd() +
        "…"
    );
}

function obterRotuloEmpresaFiltroCertificados(
    colaborador = {}
) {
    const nomeCompleto =
        obterNomeEmpresaFiltroCertificados(
            colaborador
        );

    const partes =
        nomeCompleto.split(
            /\bsubcontratada\s*:/i
        );

    const nomeExtraido =
        String(
            partes.length > 1
                ? partes[partes.length - 1]
                : ""
        )
            .replace(/\s+/g, " ")
            .trim();

    const nomeDireto =
        String(
            nomeExtraido ||
            colaborador?.empresaNome ||
            colaborador?.empresa_nome ||
            colaborador?.empresa ||
            nomeCompleto
        )
            .replace(/\s+/g, " ")
            .trim();

    const ehSubcontratada =
        Boolean(
            colaborador?.empresaPaiId ||
            colaborador?.empresa_pai_id ||
            colaborador?.empresaPaiNome ||
            colaborador?.empresa_pai_nome ||
            partes.length > 1
        );

    const rotulo =
        nomeDireto ||
        nomeCompleto;

    return limitarRotuloEmpresaFiltroCertificados(
        rotulo
    );
}
function obterChaveEmpresaFiltroCertificados(colaborador = {}) {
    const empresaId = String(
        colaborador?.empresaId ||
        colaborador?.empresa_id ||
        ""
    ).trim();

    if (empresaId) {
        return `id:${empresaId}`;
    }

    const empresaNome = normalizarTextoBusca(
        obterNomeEmpresaFiltroCertificados(colaborador)
    );

    return `nome:${empresaNome || "empresa-nao-informada"}`;
}

export function Treinamentos({
    colaboradores,
    empresasBanco = [],
    colaboradorInicialId,
    permissaoSistemaUsuario = null,
    onAtualizarColaborador,
    onSalvarCertificado,
    onVisualizarCertificado,
    onExcluirCertificado,
    onAtualizarDatasCertificado,
    onSincronizarStorage,
    onRegistrarEmailEnviado,
}) {
    const [colabId, setColabId] = useState(
        () =>
            (colaboradores.find((c) => String(c.id) === String(colaboradorInicialId)) || colaboradores[0])
                ?.codigoFuncionario || ""
    );
    const [treinamentoId, setTreinamentoId] = useState(treinamentosBase[0].id);
    const [dataRealizacao, setDataRealizacao] = useState(() => obterDataHojeIso());
    const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
    const [sugestaoDataArquivo, setSugestaoDataArquivo] = useState(null);
    const [observacao, setObservacao] = useState("");
    const [salvandoCertificado, setSalvandoCertificado] = useState(false);
    const [analisandoArquivoCertificado, setAnalisandoArquivoCertificado] = useState(false);
    const [divergenciaFuncaoAso, setDivergenciaFuncaoAso] = useState(null);
    const [resolvendoDivergenciaFuncaoAso, setResolvendoDivergenciaFuncaoAso] = useState(false);
    const resolverDivergenciaFuncaoAsoRef = useRef(null);
    const [arquivosLote, setArquivosLote] = useState([]);
    const [adicionandoTreinamentoGradeArquivoId, setAdicionandoTreinamentoGradeArquivoId] = useState("");
    const [salvandoLote, setSalvandoLote] = useState(false);
    const [preparandoLoteCertificados, setPreparandoLoteCertificados] = useState(false);
    const [sincronizandoStorage, setSincronizandoStorage] = useState(false);
    const [resultadoLote, setResultadoLote] = useState("");
    const [datasRevisao, setDatasRevisao] = useState({});
    const [salvandoDatasId, setSalvandoDatasId] = useState("");
    const [certificadosAbertos, setCertificadosAbertos] = useState({});
    const [gruposCertificadosAbertos, setGruposCertificadosAbertos] = useState({});
    const [buscaCertificados, setBuscaCertificados] = useState("");
    const [filtroEmpresaCertificados, setFiltroEmpresaCertificados] = useState("Todas");
    const [filtroStatusCertificados, setFiltroStatusCertificados] = useState("Todos");
    const [ordemColaboradoresBase, setOrdemColaboradoresBase] = useState("az");
    const [exigenciasAbertas, setExigenciasAbertas] = useState(false);
    const [enviandoAlertaTst, setEnviandoAlertaTst] = useState(false);
    const [cardsTreinamentosRecolhidos, setCardsTreinamentosRecolhidos] = useState(carregarCardsTreinamentosRecolhidos);
    const [layoutCardsTreinamentos, setLayoutCardsTreinamentos] = useState(carregarCardsTreinamentosLayout);
    const [mostrarPersonalizarTreinamentos, setMostrarPersonalizarTreinamentos] = useState(false);
    const [agoraHeroTreinamentos, setAgoraHeroTreinamentos] = useState(() => new Date());
    const [historicoCertificadoDrawer, setHistoricoCertificadoDrawer] = useState({
        aberto: false,
        documento: null,
        itens: [],
        carregando: false,
        erro: "",
    });

    useEffect(() => {
        const atualizarRelogioHeroTreinamentos = () => {
            setAgoraHeroTreinamentos(new Date());
        };

        atualizarRelogioHeroTreinamentos();

        const intervaloRelogioHeroTreinamentos =
            window.setInterval(
                atualizarRelogioHeroTreinamentos,
                30000
            );

        return () => {
            window.clearInterval(
                intervaloRelogioHeroTreinamentos
            );
        };
    }, []);
    const [cardArrastandoTreinamento, setCardArrastandoTreinamento] = useState("");
    const [cardDestinoTreinamento, setCardDestinoTreinamento] = useState("");
    const permissaoSistemaAtual = permissaoSistemaUsuario;
    const mensagemPermissaoSistema = permissaoSistemaAtual
        ? "Permissões do sistema carregadas para Treinamentos."
        : "Nenhuma permissão do sistema cadastrada para o usuário atual.";

    const empresasFiltroCertificados = useMemo(() => {
        const empresasPorChave = new Map();

        colaboradores.forEach((colaborador) => {
            const valor =
                obterChaveEmpresaFiltroCertificados(colaborador);

            const titulo =
                obterNomeEmpresaFiltroCertificados(
                    colaborador
                );

            const nome =
                obterRotuloEmpresaFiltroCertificados(
                    colaborador
                );

            if (!empresasPorChave.has(valor)) {
                empresasPorChave.set(valor, {
                    valor,
                    nome,
                    titulo,
                });
            }
        });

        return Array.from(empresasPorChave.values()).sort(
            (empresaA, empresaB) =>
                String(
                    empresaA.titulo ||
                    empresaA.nome
                ).localeCompare(
                    String(
                        empresaB.titulo ||
                        empresaB.nome
                    ),
                    "pt-BR"
                )
        );
    }, [colaboradores]);

    useEffect(() => {
        if (filtroEmpresaCertificados === "Todas") return;

        const empresaContinuaDisponivel =
            empresasFiltroCertificados.some(
                (empresa) =>
                    empresa.valor ===
                    filtroEmpresaCertificados
            );

        if (!empresaContinuaDisponivel) {
            setFiltroEmpresaCertificados("Todas");
        }
    }, [
        empresasFiltroCertificados,
        filtroEmpresaCertificados,
    ]);

    const colaboradoresDisponiveis = useMemo(
        () =>
            colaboradores.filter(
                (colaborador) =>
                    !colaboradorForaControleDocumentalOperacional(
                        colaborador
                    )
            ),
        [colaboradores]
    );

    const colaboradoresFiltradosEmpresa = useMemo(() => {
        if (filtroEmpresaCertificados === "Todas") {
            return colaboradoresDisponiveis;
        }

        return colaboradoresDisponiveis.filter(
            (colaborador) =>
                obterChaveEmpresaFiltroCertificados(
                    colaborador
                ) === filtroEmpresaCertificados
        );
    }, [
        colaboradoresDisponiveis,
        filtroEmpresaCertificados,
    ]);

    /*
     * A mesma ordenação selecionada na Base de Certificados
     * deve ser aplicada aos selects de colaboradores do
     * lançamento individual e do envio em lote.
     *
     * O array original nunca é mutado.
     */
    const colaboradoresFiltradosEmpresaOrdenados =
        useMemo(
            () => {
                const lista =
                    [...colaboradoresFiltradosEmpresa].sort(
                        (
                            colaboradorA,
                            colaboradorB
                        ) =>
                            String(
                                colaboradorA?.nome ||
                                ""
                            ).localeCompare(
                                String(
                                    colaboradorB?.nome ||
                                    ""
                                ),
                                "pt-BR",
                                {
                                    sensitivity:
                                        "base",
                                }
                            )
                    );

                if (
                    ordemColaboradoresBase ===
                    "za"
                ) {
                    lista.reverse();
                }

                return lista;
            },
            [
                colaboradoresFiltradosEmpresa,
                ordemColaboradoresBase,
            ]
        );

    useEffect(() => {
        setArquivosLote([]);
        setResultadoLote("");
    }, [filtroEmpresaCertificados]);

    useEffect(() => {
        if (!colaboradoresFiltradosEmpresa.length) {
            if (colabId) {
                setColabId("");
            }

            return;
        }

        const colaboradorSelecionadoContinuaDisponivel =
            colaboradoresFiltradosEmpresa.some(
                (colaborador) =>
                    String(colaborador.codigoFuncionario) ===
                    String(colabId)
            );

        if (colaboradorSelecionadoContinuaDisponivel) return;

        const colaboradorInicialFiltrado =
            colaboradoresFiltradosEmpresa.find(
                (colaborador) =>
                    String(colaborador.id) ===
                    String(colaboradorInicialId)
            ) ||
            colaboradoresFiltradosEmpresa[0];

        setColabId(
            String(
                colaboradorInicialFiltrado?.codigoFuncionario ||
                ""
            )
        );
    }, [
        colabId,
        colaboradorInicialId,
        colaboradoresFiltradosEmpresa,
    ]);

    const podeCadastrarTreinamentosSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS, ACOES_PERMISSAO_SISTEMA.CADASTRAR),
        [permissaoSistemaAtual]
    );

    const podeEditarTreinamentosSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS, ACOES_PERMISSAO_SISTEMA.EDITAR),
        [permissaoSistemaAtual]
    );

    const podeEditarGradeColaboradorSistema = useMemo(
        () =>
            usuarioPodeExecutarAcaoSistema(
                permissaoSistemaAtual,
                MODULOS_PERMISSAO_SISTEMA.COLABORADORES,
                ACOES_PERMISSAO_SISTEMA.EDITAR
            ),
        [permissaoSistemaAtual]
    );

    const podeAdicionarTreinamentoGradeLote =
        podeEditarTreinamentosSistema &&
        podeEditarGradeColaboradorSistema;

    const podeUploadTreinamentosSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS, ACOES_PERMISSAO_SISTEMA.UPLOAD),
        [permissaoSistemaAtual]
    );

    const podeExportarTreinamentosSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS, ACOES_PERMISSAO_SISTEMA.EXPORTAR),
        [permissaoSistemaAtual]
    );

    const podeExcluirTreinamentosSistema = useMemo(
        () => usuarioPodeExcluirSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.TREINAMENTOS),
        [permissaoSistemaAtual]
    );

    const mensagemBloqueioCadastroTreinamentos = "Sem permissão para cadastrar certificados de treinamento.";
    const mensagemBloqueioEdicaoTreinamentos = "Sem permissão para editar datas de certificados.";
    const mensagemBloqueioUploadTreinamentos = "Sem permissão para enviar certificados de treinamento.";
    const mensagemBloqueioExportacaoTreinamentos = "Sem permissão para exportar informações de treinamentos.";
    const mensagemBloqueioExclusaoTreinamentos = "Sem permissão para excluir certificados de treinamento.";

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("treinamentosCardsRecolhidos", JSON.stringify(cardsTreinamentosRecolhidos));
    }, [cardsTreinamentosRecolhidos]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("treinamentosCardsLayout", JSON.stringify(layoutCardsTreinamentos));
    }, [layoutCardsTreinamentos]);

    const alternarCardTreinamento = (chave) => {
        setCardsTreinamentosRecolhidos((atual) => ({
            ...atual,
            [chave]: !atual[chave],
        }));
    };

    const alternarCardTreinamentoPorArea = (chave, recolhido, evento) => {
        const alvoInterativo = evento.target.closest?.(
            "button, a, input, select, textarea, label, [role='button'], [data-treinamentos-nao-alternar], [data-base-certificados-acao]"
        );

        if (alvoInterativo) return;

        if (!recolhido) {
            let cabecalho = null;

            try {
                cabecalho = evento.currentTarget.querySelector(":scope > * > div:first-child");
            } catch {
                cabecalho = evento.currentTarget.querySelector("div");
            }

            if (cabecalho && !cabecalho.contains(evento.target)) return;
        }

        alternarCardTreinamento(chave);
    };

    const moverCardTreinamento = (chave, direcao) => {
        setLayoutCardsTreinamentos((atual) => {
            const normalizado = normalizarLayoutCardsTreinamentos(atual);
            const ordem = [...normalizado.ordem];
            const indice = ordem.indexOf(chave);
            const novoIndice = indice + direcao;

            if (indice < 0 || novoIndice < 0 || novoIndice >= ordem.length) return normalizado;

            [ordem[indice], ordem[novoIndice]] = [ordem[novoIndice], ordem[indice]];
            return { ...normalizado, ordem };
        });
    };

    const reposicionarCardTreinamento = (chaveOrigem, chaveDestino) => {
        if (!chaveOrigem || !chaveDestino || chaveOrigem === chaveDestino) return;

        setLayoutCardsTreinamentos((atual) => {
            const normalizado = normalizarLayoutCardsTreinamentos(atual);
            const ordemSemOrigem = normalizado.ordem.filter((chave) => chave !== chaveOrigem);
            const indiceDestino = ordemSemOrigem.indexOf(chaveDestino);

            if (indiceDestino < 0) return normalizado;

            const novaOrdem = [...ordemSemOrigem];
            novaOrdem.splice(indiceDestino, 0, chaveOrigem);
            return { ...normalizado, ordem: novaOrdem };
        });
    };

    const iniciarArrastoCardTreinamento = (evento, chave) => {
        setCardArrastandoTreinamento(chave);
        setCardDestinoTreinamento("");
        evento.dataTransfer.effectAllowed = "move";
        evento.dataTransfer.setData("text/plain", chave);
    };

    const soltarCardTreinamento = (evento, chaveDestino) => {
        evento.preventDefault();
        const chaveOrigem = evento.dataTransfer.getData("text/plain") || cardArrastandoTreinamento;
        reposicionarCardTreinamento(chaveOrigem, chaveDestino);
        setCardArrastandoTreinamento("");
        setCardDestinoTreinamento("");
    };

    const alterarTamanhoCardTreinamento = (chave, tamanho) => {
        setLayoutCardsTreinamentos((atual) => {
            const normalizado = normalizarLayoutCardsTreinamentos(atual);
            return {
                ...normalizado,
                tamanhos: {
                    ...normalizado.tamanhos,
                    [chave]: tamanho,
                },
            };
        });
    };

    const abrirTodosCardsTreinamentos = () => {
        setCardsTreinamentosRecolhidos({ filtros: false, lancamento: false, listaPresenca: false, alertas: false, base: false });
    };

    const recolherTodosCardsTreinamentos = () => {
        setCardsTreinamentosRecolhidos({ filtros: true, lancamento: true, listaPresenca: true, alertas: true, base: true });
    };

    const restaurarPainelTreinamentos = () => {
        setCardsTreinamentosRecolhidos(cardsTreinamentosPadrao);
        setLayoutCardsTreinamentos(normalizarLayoutCardsTreinamentos());
    };

    const colabSelecionado =
        colaboradoresFiltradosEmpresa.find(
            (colaborador) =>
                String(colaborador.codigoFuncionario) ===
                String(colabId)
        ) ||
        colaboradoresFiltradosEmpresa.find(
            (colaborador) =>
                String(colaborador.id) ===
                String(colaboradorInicialId)
        ) ||
        colaboradoresFiltradosEmpresa[0] ||
        null;

    const colabSelecionadoId = colabSelecionado?.id || "";
    const colabSelecionadoCodigo = colabSelecionado?.codigoFuncionario || "";
    const avaliacaoSelecionado = colabSelecionado ? avaliarTreinamentosColaborador(colabSelecionado) : null;
    const treinamentoDetectadoArquivo = arquivoSelecionado ? inferirTreinamentoPorNomeArquivo(arquivoSelecionado.name) : null;
    const treinamentosDisponiveisBase = avaliacaoSelecionado?.itens?.length
        ? avaliacaoSelecionado.itens.map((item) => item.treinamento).filter(Boolean)
        : treinamentosBase;
    const treinamentosDisponiveis = [
        ...treinamentosDisponiveisBase,
        ...(treinamentoDetectadoArquivo?.id && !treinamentosDisponiveisBase.some((item) => Number(item.id) === Number(treinamentoDetectadoArquivo.id))
            ? [treinamentoDetectadoArquivo]
            : []),
    ].sort((a, b) => obterOrdemTreinamentoParaBase({ treinamentoId: a.id }) - obterOrdemTreinamentoParaBase({ treinamentoId: b.id }) || String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));

    const treinamentoSelecionadoId = treinamentosDisponiveis.some((item) => Number(item.id) === Number(treinamentoId))
        ? Number(treinamentoId)
        : Number(treinamentosDisponiveis[0]?.id || treinamentoId);

    const vencimento = calcularVencimentoTreinamento(
        treinamentoSelecionadoId || treinamentosBase[0].id,
        dataRealizacao
    );

    const alterarColaboradorCertificado = (novoColaboradorCodigo) => {
        const novoColaborador =
            colaboradoresFiltradosEmpresa.find(
                (colaborador) =>
                    String(colaborador.codigoFuncionario) ===
                    String(novoColaboradorCodigo)
            );
        const novaAvaliacao = novoColaborador ? avaliarTreinamentosColaborador(novoColaborador) : null;
        const primeiroTreinamento = novaAvaliacao?.itens?.[0]?.treinamento?.id || treinamentosBase[0].id;

        setColabId(String(novoColaboradorCodigo));
        setTreinamentoId(Number(primeiroTreinamento));
        setDataRealizacao(obterDataHojeIso());
    };

    const concluirDecisaoFuncaoAso = (resultado) => {
        const resolver =
            resolverDivergenciaFuncaoAsoRef.current;

        resolverDivergenciaFuncaoAsoRef.current = null;
        setDivergenciaFuncaoAso(null);
        setResolvendoDivergenciaFuncaoAso(false);

        if (typeof resolver === "function") {
            resolver(Boolean(resultado));
        }
    };

    const cancelarDivergenciaFuncaoAso = () => {
        if (resolvendoDivergenciaFuncaoAso) return;
        concluirDecisaoFuncaoAso(false);
    };

    const salvarCertificadoComConferenciaAso =
        async (dadosCertificado) => {
            const resultado =
                await onSalvarCertificado(
                    dadosCertificado
                );

            if (
                resultado?.tipo !==
                "divergencia_funcao_aso"
            ) {
                if (
                    resultado &&
                    typeof resultado === "object"
                ) {
                    return Boolean(resultado.ok);
                }

                return Boolean(resultado);
            }

            return new Promise((resolve) => {
                if (
                    resolverDivergenciaFuncaoAsoRef.current
                ) {
                    resolverDivergenciaFuncaoAsoRef.current(
                        false
                    );
                }

                resolverDivergenciaFuncaoAsoRef.current =
                    resolve;

                setDivergenciaFuncaoAso({
                    ...resultado,
                    certificado: dadosCertificado,
                });
            });
        };

    const confirmarAtualizacaoFuncaoAso = async () => {
        const pendencia = divergenciaFuncaoAso;

        if (
            !pendencia?.certificado ||
            resolvendoDivergenciaFuncaoAso
        ) {
            return;
        }

        setResolvendoDivergenciaFuncaoAso(true);

        try {
            const resultado =
                await onSalvarCertificado({
                    ...pendencia.certificado,
                    decisaoFuncaoAso: "atualizar",
                });

            if (
                resultado?.tipo ===
                "divergencia_funcao_aso"
            ) {
                throw new Error(
                    "A divergência permaneceu pendente após a confirmação."
                );
            }

            const salvo =
                resultado === true ||
                resultado?.ok === true;

            if (!salvo) {
                setResolvendoDivergenciaFuncaoAso(
                    false
                );
                return;
            }

            concluirDecisaoFuncaoAso(true);
        } catch (erro) {
            setResolvendoDivergenciaFuncaoAso(false);

            if (typeof window !== "undefined") {
                window.alert(
                    erro?.message ||
                    "Não foi possível atualizar a função e salvar o ASO."
                );
            }
        }
    };

    useEffect(() => {
        return () => {
            const resolver =
                resolverDivergenciaFuncaoAsoRef.current;

            resolverDivergenciaFuncaoAsoRef.current =
                null;

            if (typeof resolver === "function") {
                resolver(false);
            }
        };
    }, []);

    const adicionarTreinamento = async () => {
        if (!podeCadastrarTreinamentosSistema || !podeUploadTreinamentosSistema) {
            if (typeof window !== "undefined") window.alert(!podeUploadTreinamentosSistema ? mensagemBloqueioUploadTreinamentos : mensagemBloqueioCadastroTreinamentos);
            return;
        }

        if (!colabSelecionadoId) {
            alert("Cadastre um colaborador primeiro.");
            return;
        }

        if (!arquivoSelecionado) {
            alert("Selecione o arquivo do certificado antes de salvar.");
            return;
        }

        setSalvandoCertificado(true);

        const ok = await salvarCertificadoComConferenciaAso({
            colaboradorCodigo: String(colabSelecionado?.codigoFuncionario || ""),
            colaborador: colabSelecionado,
            treinamentoId: Number(treinamentoSelecionadoId),
            dataRealizacao,
            dataVencimento: vencimento,
            arquivo: arquivoSelecionado,
            arquivoNome: arquivoSelecionado.name,
            observacao: observacao.trim(),
        });

        setSalvandoCertificado(false);

        if (ok) {
            setArquivoSelecionado(null);
            setSugestaoDataArquivo(null);
            setObservacao("");
            setDataRealizacao(obterDataHojeIso());
        }
    };
    const prepararArquivosLote = async (listaArquivos) => {
        if (!podeUploadTreinamentosSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioUploadTreinamentos);
            return;
        }

        const arquivos = Array.from(listaArquivos || []);

        if (!arquivos.length) return;

        if (!validarListaArquivosAntesUpload(arquivos, "documentoSimples")) {
            setArquivosLote([]);
            return;
        }

        if (!colabSelecionado?.codigoFuncionario) {
            alert("Selecione o colaborador antes de enviar documentos em massa.");
            return;
        }

        const dataBaseLote = normalizarDataLancamentoCertificado(dataRealizacao) || obterDataHojeIso();

        if (dataBaseLote !== dataRealizacao) {
            setDataRealizacao(dataBaseLote);
        }

        setPreparandoLoteCertificados(true);
        setResultadoLote("Analisando certificados do lote...");

        try {
            const preparados = await prepararArquivosTreinamentoLote({
                listaArquivos: arquivos,
                colaboradores: colaboradoresFiltradosEmpresa,
                colabSelecionado,
                dataRealizacao: dataBaseLote,
            });

            setArquivosLote(preparados);
            setResultadoLote("");
        } catch (erro) {
            console.error("Erro ao preparar arquivos em lote:", erro);
            setArquivosLote([]);
            setResultadoLote(erro?.message || "Não foi possível preparar os arquivos do lote.");
            if (typeof window !== "undefined") {
                window.alert(erro?.message || "Não foi possível preparar os arquivos do lote.");
            }
        } finally {
            setPreparandoLoteCertificados(false);
        }
    };

    const alterarColaboradorArquivoLote = (arquivoId, colaboradorCodigo) => {
        setArquivosLote((atual) => atualizarColaboradorArquivoLote(atual, arquivoId, colaboradorCodigo));
    };

    const alterarTreinamentoArquivoLote = (arquivoId, treinamentoId) => {
        const dataBaseLote = normalizarDataLancamentoCertificado(dataRealizacao) || obterDataHojeIso();
        setArquivosLote((atual) => atualizarTreinamentoArquivoLote(atual, arquivoId, treinamentoId, dataBaseLote));
    };

    const adicionarTreinamentoGradeArquivoLote =
        async ({
            arquivoId,
            colaboradorCodigo,
            treinamentoId,
        } = {}) => {
            if (
                !podeAdicionarTreinamentoGradeLote
            ) {
                if (typeof window !== "undefined") {
                    window.alert(
                        "Seu usuário precisa de permissão para editar Treinamentos e Colaboradores antes de alterar a grade individual."
                    );
                }

                return false;
            }

            if (
                typeof onAtualizarColaborador !==
                "function"
            ) {
                if (typeof window !== "undefined") {
                    window.alert(
                        "A atualização do colaborador não está disponível nesta tela."
                    );
                }

                return false;
            }

            const idTreinamento =
                Number(
                    treinamentoId
                );

            const colaborador =
                colaboradores.find(
                    (item) =>
                        String(
                            item?.codigoFuncionario ||
                            ""
                        ) ===
                        String(
                            colaboradorCodigo ||
                            ""
                        )
                ) ||
                null;

            const treinamento =
                treinamentosBase.find(
                    (item) =>
                        Number(item?.id) ===
                        idTreinamento
                ) ||
                null;

            if (
                !colaborador?.id ||
                !Number.isFinite(idTreinamento) ||
                idTreinamento <= 0 ||
                !treinamento
            ) {
                if (typeof window !== "undefined") {
                    window.alert(
                        "Não foi possível identificar colaborador e treinamento para atualizar a grade."
                    );
                }

                return false;
            }

            const avaliacao =
                avaliarTreinamentosColaborador(
                    colaborador
                );

            const jaPertenceGrade =
                Array.isArray(
                    avaliacao?.itensObrigatoriosMatriz
                ) &&
                avaliacao.itensObrigatoriosMatriz.some(
                    (item) =>
                        Number(
                            item?.treinamento?.id
                        ) ===
                        idTreinamento
                );

            if (jaPertenceGrade) {
                return true;
            }


            const idsMatrizFuncao =
                new Set(
                    (
                        Array.isArray(
                            avaliacao?.matriz?.treinamentos
                        )
                            ? avaliacao.matriz.treinamentos
                            : []
                    )
                        .map(Number)
                        .filter(
                            (id) =>
                                Number.isFinite(id) &&
                                id > 0
                        )
                );

            const idsRemovidosAtuais =
                Array.from(
                    new Set(
                        (
                            colaborador
                                .treinamentosRemovidos ||
                            []
                        )
                            .map(Number)
                            .filter(
                                (id) =>
                                    Number.isFinite(id) &&
                                    id > 0
                            )
                    )
                );

            const idsAdicionaisAtuais =
                Array.from(
                    new Set(
                        (
                            colaborador
                                .treinamentosAdicionais ||
                            []
                        )
                            .map(Number)
                            .filter(
                                (id) =>
                                    Number.isFinite(id) &&
                                    id > 0
                            )
                    )
                );

            const treinamentosRemovidos =
                idsRemovidosAtuais.filter(
                    (id) =>
                        id !== idTreinamento
                );

            const treinamentosAdicionais =
                idsMatrizFuncao.has(
                    idTreinamento
                )
                    ? idsAdicionaisAtuais
                    : Array.from(
                        new Set([
                            ...idsAdicionaisAtuais,
                            idTreinamento,
                        ])
                    );

            const empresaNome =
                String(
                    colaborador?.empresa ||
                    colaborador?.empresaNome ||
                    ""
                ).trim();

            if (
                !empresaNome ||
                empresaNome ===
                    "Empresa não informada"
            ) {
                if (typeof window !== "undefined") {
                    window.alert(
                        "A empresa atual do colaborador não pôde ser confirmada. A grade não foi alterada."
                    );
                }

                return false;
            }

            const matriculaAtual =
                String(
                    colaborador?.matriculaEsocial ||
                    colaborador?.matricula ||
                    ""
                ).trim();

            const chaveProcessamento =
                String(
                    arquivoId ||
                    `${colaboradorCodigo}:${idTreinamento}`
                );

            setAdicionandoTreinamentoGradeArquivoId(
                chaveProcessamento
            );

            try {
                const ok =
                    await onAtualizarColaborador({
                        ...colaborador,

                        empresaNome,

                        matricula:
                            ["-", "—"].includes(
                                matriculaAtual
                            )
                                ? ""
                                : matriculaAtual,

                        treinamentosRemovidos,
                        treinamentosAdicionais,

                        foto: null,

                        fotoAtual:
                            colaborador?.fotoUrl ||
                            colaborador?.foto_url ||
                            "",

                        fotoNomeAtual:
                            colaborador?.fotoNome ||
                            colaborador?.foto_nome ||
                            "",
                    });

                if (!ok) {
                    throw new Error(
                        "O cadastro do colaborador não confirmou a atualização da grade."
                    );
                }

                return true;
            }
            catch (erro) {
                if (typeof window !== "undefined") {
                    window.alert(
                        erro?.message ||
                        "Não foi possível adicionar o treinamento à grade do colaborador."
                    );
                }

                return false;
            }
            finally {
                setAdicionandoTreinamentoGradeArquivoId(
                    ""
                );
            }
        };

    const alterarDataArquivoLote = (arquivoId, data) => {
        setArquivosLote((atual) => atualizarDataArquivoLote(atual, arquivoId, data));
    };

    const selecionarArquivoCertificado = async (arquivo) => {
        if (!podeUploadTreinamentosSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioUploadTreinamentos);
            return;
        }

        setArquivoSelecionado(null);
        setSugestaoDataArquivo(null);
        setAnalisandoArquivoCertificado(false);

        if (!arquivo) return;

        if (!validarArquivoAntesUpload(arquivo, "documentoSimples")) return;

        const treinamentoDetectado = inferirTreinamentoPorNomeArquivo(arquivo.name);
        const mensagemTipoDetectado = treinamentoDetectado?.id
            ? `Tipo ajustado automaticamente para ${treinamentoDetectado.nome}, conforme o nome do arquivo.`
            : "";

        setArquivoSelecionado(arquivo);
        setDataRealizacao("");

        if (treinamentoDetectado?.id) {
            setTreinamentoId(Number(treinamentoDetectado.id));
        }

        setAnalisandoArquivoCertificado(true);

        try {
            const sugestao = await detectarDataEmissaoArquivo(arquivo);
            const dataDetectada = normalizarDataLancamentoCertificado(sugestao?.data);
            const sugestaoNormalizada = sugestao?.data && !dataDetectada
                ? {
                    ...sugestao,
                    data: "",
                    mensagem: "Data detectada ignorada por estar fora do intervalo esperado. Confira manualmente.",
                }
                : sugestao;
            const mensagemData = dataDetectada
                ? (sugestaoNormalizada?.mensagem || "Data identificada automaticamente. Confira antes de salvar.")
                : "DATA NÃO IDENTIFICADA — O sistema não encontrou uma data válida neste documento. Informe manualmente a data correta antes de salvar.";

            setSugestaoDataArquivo({
                ...(sugestaoNormalizada || {}),
                mensagemTipoDetectado,
                mensagem: mensagemData,
            });

            if (dataDetectada) {
                setDataRealizacao(dataDetectada);
            }
        } catch (erro) {
            console.error("Erro ao analisar documento de treinamento:", erro);
            setSugestaoDataArquivo({
                mensagemTipoDetectado,
                mensagem: "ANÁLISE AUTOMÁTICA INCONCLUSIVA — Não foi possível analisar o documento. Confira manualmente o tipo e a data antes de salvar.",
            });
        } finally {
            setAnalisandoArquivoCertificado(false);
        }
    };

    const removerArquivoLote = (arquivoId) => {
        setArquivosLote((atual) => atual.filter((item) => item.id !== arquivoId));
    };

    const sincronizarArquivosDoStorage = async () => {
        if (!onSincronizarStorage) return;

        if (!podeUploadTreinamentosSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioUploadTreinamentos);
            return;
        }

        setSincronizandoStorage(true);
        setResultadoLote("");

        const resultado = await onSincronizarStorage();

        setResultadoLote(resultado || "Sincronização concluída.");
        setSincronizandoStorage(false);
    };

    const salvarCertificadosEmLote = async () => {
        if (!podeCadastrarTreinamentosSistema || !podeUploadTreinamentosSistema) {
            if (typeof window !== "undefined") window.alert(!podeUploadTreinamentosSistema ? mensagemBloqueioUploadTreinamentos : mensagemBloqueioCadastroTreinamentos);
            return;
        }

        if (!arquivosLote.length) {
            alert("Selecione os arquivos do lote.");
            return;
        }

        const arquivosParaSalvar = arquivosLote.filter((item) => item.statusProcessamento !== "salvo");

        if (!arquivosParaSalvar.length) {
            setResultadoLote("Todos os documentos do lote já foram salvos. Remova o lote ou selecione novos arquivos.");
            return;
        }

        const incompletos = arquivosParaSalvar.filter(
            (item) =>
                !item.colaboradorCodigo ||
                !item.treinamentoId ||
                !item.dataRealizacao ||
                (item.dataIdentificadaDocumento === false && item.dataConferidaManualmente !== true) ||
                (!treinamentoSemValidade(item.treinamentoId) && !item.dataVencimento)
        );

        if (incompletos.length > 0) {
            alert("Antes de salvar, confira colaborador, treinamento e datas. Nos arquivos com DATA NÃO IDENTIFICADA, altere a data manualmente ou use \"Confirmar data exibida\" após conferir o documento.");
            return;
        }

        const atualizarItemProcessamento = (arquivoId, atualizacao) => {
            setArquivosLote((atual) =>
                atual.map((item) =>
                    item.id === arquivoId
                        ? {
                            ...item,
                            ...atualizacao,
                        }
                        : item
                )
            );
        };

        setSalvandoLote(true);
        setResultadoLote("Salvando lote de certificados...");

        let salvos = 0;
        let falhas = 0;
        let ignorados = 0;
        const erros = [];
        const motivos = [];
        const alertaOriginalSalvarLote = typeof window !== "undefined" ? window.alert : null;

        if (alertaOriginalSalvarLote) {
            window.alert = (mensagem) => {
                if (mensagem) motivos.push(String(mensagem));
            };
        }

        try {
            for (const item of arquivosLote) {
                if (item.statusProcessamento === "salvo") {
                    ignorados += 1;
                    continue;
                }

                const colaboradorDoArquivo = colaboradores.find((c) => String(c.codigoFuncionario) === String(item.colaboradorCodigo));
                const indiceMotivoAntes = motivos.length;

                atualizarItemProcessamento(item.id, {
                    statusProcessamento: "salvando",
                    erroProcessamento: "",
                    salvoEmLote: false,
                });

                try {
                    const ok = await salvarCertificadoComConferenciaAso({
                        colaboradorCodigo: String(item.colaboradorCodigo || ""),
                        colaborador: colaboradorDoArquivo,
                        treinamentoId: Number(item.treinamentoId),
                        dataRealizacao: item.dataRealizacao,
                        dataVencimento: item.dataVencimento,
                        arquivo: item.arquivo,
                        arquivoNome: item.arquivo.name,
                        tipoEvidenciaTreinamento:
                            obterTipoEvidenciaTreinamentoLote(
                                item
                            ),
                        observacao: observacao.trim() || "Enviado em lote com distribuição automática por nome do arquivo",
                    });

                    if (ok) {
                        salvos += 1;
                        atualizarItemProcessamento(item.id, {
                            statusProcessamento: "salvo",
                            erroProcessamento: "",
                            salvoEmLote: true,
                        });
                    } else {
                        falhas += 1;
                        const motivoItem = motivos.slice(indiceMotivoAntes).filter(Boolean).at(-1) || "Não foi possível salvar este documento.";
                        erros.push(item.arquivo.name);
                        atualizarItemProcessamento(item.id, {
                            statusProcessamento: "falhou",
                            erroProcessamento: motivoItem,
                            salvoEmLote: false,
                        });
                    }
                } catch (erro) {
                    falhas += 1;
                    const motivoItem = erro?.message || String(erro || "Erro não identificado");
                    erros.push(item.arquivo?.name || "arquivo sem nome");
                    motivos.push(motivoItem);

                    atualizarItemProcessamento(item.id, {
                        statusProcessamento: "falhou",
                        erroProcessamento: motivoItem,
                        salvoEmLote: false,
                    });
                }
            }
        } finally {
            if (alertaOriginalSalvarLote) {
                window.alert = alertaOriginalSalvarLote;
            }
        }

        setSalvandoLote(false);

        const limparMotivoFalhaLote = (motivo) =>
            String(motivo || "")
                .replace(/^Não foi possível salvar este documento\.\s*/i, "")
                .replace(/^Motivo:\s*/i, "")
                .replace(/\s*Corrija a informação indicada acima ou substitua o arquivo antes de tentar salvar novamente\.?$/i, "")
                .replace(/\s+/g, " ")
                .trim();

        const motivosUnicos = Array.from(new Set(
            motivos
                .map(limparMotivoFalhaLote)
                .filter(Boolean)
        ));

        const linhasResultado = [
            "Resultado do envio em lote",
            "",
            `Salvos nesta tentativa: ${salvos}`,
            `Falhas nesta tentativa: ${falhas}`,
        ];

        if (ignorados > 0) {
            linhasResultado.push(`Já salvos e ignorados: ${ignorados}`);
        }

        if (erros.length) {
            linhasResultado.push(
                "",
                "Arquivos com falha:",
                ...erros.slice(0, 10).map((nome) => `- ${nome}`)
            );

            if (erros.length > 10) {
                linhasResultado.push(`- e mais ${erros.length - 10} arquivo(s)`);
            }
        }

        if (motivosUnicos.length) {
            linhasResultado.push(
                "",
                "Motivo principal:",
                motivosUnicos[0]
            );

            if (motivosUnicos.length > 1) {
                linhasResultado.push(`Outros motivos: ${motivosUnicos.slice(1, 3).join(" | ")}`);
            }
        }

        if (falhas > 0) {
            linhasResultado.push(
                "",
                "Próximo passo:",
                "Revise apenas os documentos marcados como Falhou. Os documentos marcados como Salvo não serão enviados novamente."
            );
        }

        setResultadoLote(linhasResultado.join("\n"));

        if (falhas === 0) {
            setArquivosLote([]);
            setObservacao("");
            setDataRealizacao(obterDataHojeIso());
        }
    };

    const documentos = colaboradores.flatMap((c) =>
        (c.treinamentos || []).map((t) => ({ ...t, colaborador: c, treinamento: obterTreinamento(t.treinamentoId) }))
    );

    const documentosOperacionais = documentos.filter(
        (documento) =>
            !colaboradorForaControleDocumentalOperacional(
                documento.colaborador
            )
    );

    const documentosFiltrados = documentosOperacionais.filter((documento) => {
        const vencimentoFiltro = datasRevisao[documento.id]?.vencimento ?? documento.vencimento ?? "";
        const status = statusDocumento(vencimentoFiltro, treinamentoSemValidade(documento.treinamentoId));
        const foraControleOperacional = colaboradorForaControleDocumentalOperacional(documento.colaborador);
        const termo = normalizarTextoBusca(buscaCertificados);

        const textoBusca = normalizarTextoBusca(
            `${documento.colaborador?.nome || ""} ${documento.colaborador?.empresaExibicao || documento.colaborador?.empresa || ""} ${documento.colaborador?.funcao || documento.colaborador?.cargo || ""} ${documento.colaborador?.codigoFuncionario || ""} ${documento.treinamento?.nome || ""} ${documento.arquivo || ""} ${status.texto || ""}`
        );

        const bateBusca = !termo || textoBusca.includes(termo);
        const bateEmpresa =
            filtroEmpresaCertificados === "Todas" ||
            obterChaveEmpresaFiltroCertificados(
                documento.colaborador
            ) === filtroEmpresaCertificados;
        const bateStatus =
            filtroStatusCertificados === "Todos" ||
            (
                !foraControleOperacional &&
                (
                    (filtroStatusCertificados === "Em dia" && ["emdia", "semvalidade"].includes(status.chave)) ||
                    (filtroStatusCertificados === "A vencer" && status.chave === "vencendo") ||
                    (filtroStatusCertificados === "Vencido" && status.chave === "vencido")
                )
            );

        return bateBusca && bateEmpresa && bateStatus;
    });

    const documentosPorColaborador = colaboradoresDisponiveis
        .map((colaborador) => {
            const avaliacao = avaliarTreinamentosColaborador(colaborador);
            const termo = normalizarTextoBusca(buscaCertificados);
            const certificadosDoColaborador = documentosFiltrados
                .filter((documento) => String(documento.colaborador?.id) === String(colaborador.id))
                .sort(ordenarCertificadosPorTreinamento);

            const pendentesDoColaborador = avaliacao.pendentes
                .filter((item) => {
                    const textoBusca = normalizarTextoBusca(
                        `${colaborador.nome || ""} ${colaborador.empresaExibicao || colaborador.empresa || ""} ${colaborador.funcao || colaborador.cargo || ""} ${colaborador.codigoFuncionario || ""} ${item.treinamento?.nome || ""} pendente faltando`
                    );

                    const bateBusca = !termo || textoBusca.includes(termo);
                    const bateEmpresa =
                        filtroEmpresaCertificados === "Todas" ||
                        obterChaveEmpresaFiltroCertificados(
                            colaborador
                        ) === filtroEmpresaCertificados;
                    const bateStatus = filtroStatusCertificados === "Todos" || filtroStatusCertificados === "Pendentes";

                    return bateBusca && bateEmpresa && bateStatus;
                });

            return {
                colaborador,
                certificados: certificadosDoColaborador,
                pendentes: pendentesDoColaborador,
                avaliacao,
            };
        })
        .filter((grupo) => {
            if (filtroStatusCertificados === "Pendentes") return grupo.pendentes.length > 0;

            return grupo.certificados.length > 0 || grupo.pendentes.length > 0;
        });

    /*
     * Ordenação funcional da Base de Certificados.
     *
     * A lista que segue para o componente visual já chega na
     * sequência escolhida pelo filtro A-Z / Z-A.
     */
    const documentosPorColaboradorOrdenadosFiltro =
        [...documentosPorColaborador].sort(
            (grupoA, grupoB) =>
                String(
                    grupoA?.colaborador?.nome ||
                    ""
                ).localeCompare(
                    String(
                        grupoB?.colaborador?.nome ||
                        ""
                    ),
                    "pt-BR",
                    {
                        sensitivity: "base",
                    }
                )
        );

    if (
        ordemColaboradoresBase ===
        "za"
    ) {
        documentosPorColaboradorOrdenadosFiltro.reverse();
    }

    const colaboradorTemEmpresaCadastrada = (colaborador = {}) => {
        const empresaId = String(colaborador.empresaId || colaborador.empresa_id || "").trim();

        if (!empresaId) return false;

        if (!Array.isArray(empresasBanco) || empresasBanco.length === 0) {
            return true;
        }

        return empresasBanco.some((empresa) => String(empresa.id || "") === empresaId);
    };

    const mensagemEmpresaObrigatoriaDocumentosMassa = "Selecione/vincule uma empresa cadastrada ao colaborador antes de enviar documentos.";
    const enviarDocumentosPendentesEmLote = (colaborador) => {
        if (!podeUploadTreinamentosSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioUploadTreinamentos);
            return;
        }

        if (!colaborador?.codigoFuncionario) {
            alert("Colaborador não identificado para envio em massa.");
            return;
        }

        setColabId(String(colaborador.codigoFuncionario));
        setArquivoSelecionado(null);
        setSugestaoDataArquivo(null);
        setArquivosLote([]);
        setObservacao("");
        setDataRealizacao(obterDataHojeIso());
        setResultadoLote("Colaborador selecionado. Use o botão Selecionar vários certificados no Envio em lote.");

        setCardsTreinamentosRecolhidos((atual) => ({
            ...atual,
            lancamento: false,
        }));

        setTimeout(() => {
            const alvo = typeof document !== "undefined"
                ? document.getElementById("treinamentos-lancamento-certificado")
                : null;

            if (alvo?.scrollIntoView) {
                alvo.scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        }, 80);
    };

    const enviarDocumentoPendente = (colaborador, treinamento) => {
        if (!podeUploadTreinamentosSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioUploadTreinamentos);
            return;
        }

        setColabId(colaborador.codigoFuncionario);
        setTreinamentoId(Number(treinamento.id));
        setArquivoSelecionado(null);
        setSugestaoDataArquivo(null);
        setObservacao("");
        setDataRealizacao(obterDataHojeIso());

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const totalPorStatusCertificados = documentosOperacionais.reduce(
        (acc, documento) => {
            if (colaboradorForaControleDocumentalOperacional(documento.colaborador)) {
                return acc;
            }

            const status = statusDocumento(documento.vencimento, treinamentoSemValidade(documento.treinamentoId));

            if (status.chave === "vencido") acc.vencidos += 1;
            else if (status.chave === "vencendo") acc.aVencer += 1;
            else acc.emDia += 1;

            return acc;
        },
        {
            emDia: 0,
            aVencer: 0,
            vencidos: 0,
            pendentes: colaboradoresDisponiveis.reduce(
                (total, colaborador) => total + avaliarTreinamentosColaborador(colaborador).pendentes.length,
                0
            ),
        }
    );


    const dataHoraHeroTreinamentos = useMemo(() => {
        const formatarDiaSemana = (valor = "") =>
            String(valor)
                .split("-")
                .map((trecho) =>
                    trecho
                        ? trecho.charAt(0).toLocaleUpperCase("pt-BR") +
                          trecho.slice(1).toLocaleLowerCase("pt-BR")
                        : trecho
                )
                .join("-");

        return {
            data: new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
            }).format(agoraHeroTreinamentos),

            diaSemana: formatarDiaSemana(
                new Intl.DateTimeFormat("pt-BR", {
                    weekday: "long",
                }).format(agoraHeroTreinamentos)
            ),

            hora: new Intl.DateTimeFormat("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            }).format(agoraHeroTreinamentos),
        };
    }, [agoraHeroTreinamentos]);


    const alertasTstPorEmpresa = useMemo(() => {
        const grupos = {};

        colaboradores.forEach((colaborador) => {
            if (
                filtroEmpresaCertificados !== "Todas" &&
                obterChaveEmpresaFiltroCertificados(
                    colaborador
                ) !== filtroEmpresaCertificados
            ) {
                return;
            }

            if (colaboradorForaControleDocumentalOperacional(colaborador)) return;

            (colaborador.treinamentos || []).forEach((certificado) => {
                const dias = diasParaVencer(certificado.vencimento);

                if (dias === null || dias > 30) return;

                const tipoAlerta = dias < 0 ? "vencido" : "a vencer";
                const empresaNome = colaborador.empresaExibicao || colaborador.empresa || "Empresa não informada";
                const chave = colaborador.empresaId || empresaNome;
                const treinamento = obterTreinamento(certificado.treinamentoId);

                if (!grupos[chave]) {
                    grupos[chave] = {
                        empresa: empresaNome,
                        tstResponsavel: colaborador.empresaTstResponsavel || "",
                        tstEmail: emailTstDaEmpresa(colaborador),
                        itens: [],
                    };
                }

                grupos[chave].itens.push({
                    colaborador: colaborador.nome,
                    codigo: colaborador.codigoFuncionario,
                    funcao: colaborador.funcao,
                    situacaoObra: colaborador.statusMobilizacao || obterStatusInicialColaborador(),
                    statusColaborador: statusGeral(colaborador).texto,
                    empresa: empresaNome,
                    treinamento: certificado.nomeTreinamento || treinamento.nome,
                    realizacao: certificado.realizado || "",
                    vencimento: certificado.vencimento,
                    arquivo: certificado.arquivo || certificado.arquivoNome || "",
                    dias,
                    tipoAlerta,
                });
            });
        });

        return Object.values(grupos).sort((a, b) => a.empresa.localeCompare(b.empresa));
    }, [
        colaboradores,
        filtroEmpresaCertificados,
    ]);

    const montarAvisoAlertaTst = (grupo) => {
        const destinatario = normalizarEmailDestinatario(grupo.tstEmail);

        const itensOrdenados = [...(grupo.itens || [])].sort((a, b) => a.dias - b.dias);
        const totalVencidos = itensOrdenados.filter((item) => item.dias < 0).length;
        const totalAVencer = itensOrdenados.filter((item) => item.dias >= 0).length;

        const assunto = `Aviso SST - ${totalVencidos} vencido(s) e ${totalAVencer} a vencer - ${grupo.empresa}`;

        const linhas = itensOrdenados
            .map((item, index) => {
                const statusPrazo =
                    item.dias < 0
                        ? `VENCIDO HÁ ${Math.abs(item.dias)} DIA(S)`
                        : `A VENCER EM ${item.dias} DIA(S)`;

                return [
                    `${index + 1}. COLABORADOR: ${item.colaborador}`,
                    `Código: ${item.codigo || "-"}`,
                    `Função: ${item.funcao || "-"}`,
                    `Situação na obra: ${item.situacaoObra || "-"}`,
                    `Status automático: ${item.statusColaborador || "-"}`,
                    `Empresa: ${item.empresa || grupo.empresa}`,
                    `Documento/Treinamento: ${item.treinamento}`,
                    `Data de elaboração/realização: ${item.realizacao ? formatDate(item.realizacao) : "Não informada"}`,
                    `Data de vencimento: ${formatDate(item.vencimento)}`,
                    `Status: ${statusPrazo}`,
                    `Arquivo: ${item.arquivo || "Não informado"}`,
                ].join("\n");
            })
            .join("\n\n");

        const corpo = [
            `Olá${grupo.tstResponsavel ? `, ${grupo.tstResponsavel}` : ""}.`,
            "",
            "Segue aviso automático de documentos/treinamentos SST vencidos ou com vencimento previsto para os próximos 30 dias.",
            "",
            `Empresa: ${grupo.empresa}`,
            `TST responsável: ${grupo.tstResponsavel || "Não informado"}`,
            `Resumo: ${totalVencidos} vencido(s) e ${totalAVencer} a vencer.`,
            "",
            linhas,
            "",
            "Solicitamos regularizar os documentos vencidos e programar a renovação dos próximos vencimentos para evitar bloqueio de atividade.",
            "",
            "Atenciosamente,",
            "Sistema SafeScan Brasil",
        ].join("\n");

        return { destinatario, assunto, corpo };
    };

    const copiarAvisoAlertaTst = async (grupo) => {
        const { assunto, corpo } = montarAvisoAlertaTst(grupo);
        const texto = `${assunto}\n\n${corpo}`;

        try {
            await navigator.clipboard.writeText(texto);
            alert("Aviso copiado. Cole o conteúdo no e-mail ou WhatsApp do TST.");
        } catch {
            window.prompt("Copie o aviso abaixo:", texto);
        }
    };

    const abrirEmailAlertaTst = async (grupo) => {
        const { destinatario, assunto, corpo } = montarAvisoAlertaTst(grupo);

        if (!destinatario) {
            alert("Cadastre o e-mail do Técnico de Segurança responsável na empresa antes de enviar o aviso.");
            return;
        }

        const mailtoUrl = `mailto:${destinatario}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;

        try {
            await navigator.clipboard.writeText(`${assunto}\n\n${corpo}`);
        } catch {
            // Se o navegador bloquear a cópia automática, apenas tenta abrir o e-mail.
        }

        const link = document.createElement("a");

        link.href = mailtoUrl;
        link.target = "_self";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        window.setTimeout(() => {
            alert("Se o e-mail não abrir, verifique se existe aplicativo de e-mail padrão configurado no computador. O aviso também foi copiado para a área de transferência quando permitido pelo navegador.");
        }, 700);
    };


    const enviarEmailAlertaTstAutomatico = async (grupo) => {
        const { destinatario, assunto } = montarAvisoAlertaTst(grupo);

        if (!destinatario) {
            alert("Cadastre o e-mail do Técnico de Segurança responsável na empresa antes de enviar o aviso.");
            return;
        }

        setEnviandoAlertaTst(true);

        try {
            const itens = [...(grupo.itens || [])].sort((a, b) => a.dias - b.dias).map((item) => ({
                colaborador: item.colaborador,
                codigo: item.codigo || "-",
                funcao: item.funcao || "-",
                situacaoObra: item.situacaoObra || "-",
                treinamento: item.treinamento,
                realizacao: item.realizacao ? formatDate(item.realizacao) : "Não informada",
                vencimento: formatDate(item.vencimento),
                dias: item.dias,
                arquivo: item.arquivo || "Não informado",
            }));

            const { data, error } = await supabase.functions.invoke(FUNCAO_EMAIL_ALERTA_TST, {
                body: {
                    para: destinatario,
                    tipoModelo: TIPOS_MODELO_EMAIL_SST.TREINAMENTOS,
                    assunto,
                    empresa: grupo.empresa,
                    tstResponsavel: grupo.tstResponsavel,
                    tstEmail: destinatario,
                    itens,
                },
            });

            if (error || data?.ok === false) {
                await onRegistrarEmailEnviado?.({
                    empresaId: grupo.empresaId || null,
                    colaboradorId: null,
                    documentoId: null,
                    destinatario,
                    assunto,
                    tipoAlerta: "Alerta TST por empresa",
                    documento: itens.map((item) => item.treinamento).filter(Boolean).join(" | ").slice(0, 500),
                    statusEnvio: "Erro",
                    erro: error?.message || data?.erro || `Falha na função ${FUNCAO_EMAIL_ALERTA_TST}.`,
                });
                alert(`Erro ao enviar e-mail pela aba Treinamentos: ${error?.message || data?.erro || `Falha na função ${FUNCAO_EMAIL_ALERTA_TST}.`}\n\nConfirme se a Edge Function está publicada e se as secrets GMAIL_USER e GMAIL_APP_PASSWORD estão configuradas.`);
                return;
            }

            await onRegistrarEmailEnviado?.({
                empresaId: grupo.empresaId || null,
                colaboradorId: null,
                documentoId: null,
                destinatario,
                assunto,
                tipoAlerta: "Alerta TST por empresa",
                documento: itens.map((item) => item.treinamento).filter(Boolean).join(" | ").slice(0, 500),
                statusEnvio: "Sucesso",
                erro: "",
            });

            alert(`Aviso enviado com sucesso para ${destinatario}.`);
        } catch (error) {
            await onRegistrarEmailEnviado?.({
                empresaId: grupo.empresaId || null,
                colaboradorId: null,
                documentoId: null,
                destinatario,
                assunto,
                tipoAlerta: "Alerta TST por empresa",
                documento: (grupo.itens || []).map((item) => item.treinamento).filter(Boolean).join(" | ").slice(0, 500),
                statusEnvio: "Erro",
                erro: error?.message || String(error),
            });
            alert(`Falha inesperada ao enviar e-mail: ${error?.message || String(error)}`);
        } finally {
            setEnviandoAlertaTst(false);
        }
    };

    const excluirCertificadoSeguro = async (...args) => {
        if (!podeExcluirTreinamentosSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExclusaoTreinamentos);
            return false;
        }

        return onExcluirCertificado?.(...args);
    };

    const fecharHistoricoCertificado = () => {
        setHistoricoCertificadoDrawer((atual) => ({
            ...atual,
            aberto: false,
            carregando: false,
        }));
    };

    const abrirHistoricoCertificado = async (documento) => {
        const certificadoId = String(
            documento?.id ||
            ""
        ).trim();

        setHistoricoCertificadoDrawer({
            aberto: true,
            documento,
            itens: [],
            carregando: Boolean(certificadoId),
            erro: certificadoId
                ? ""
                : "Certificado sem identificador para consulta do histórico.",
        });

        if (!certificadoId) {
            return;
        }

        try {
            const itens =
                await listarHistoricoCertificadoService({
                    supabase,
                    certificadoId,
                });

            setHistoricoCertificadoDrawer((atual) => {
                const idAtual = String(
                    atual?.documento?.id ||
                    ""
                ).trim();

                if (idAtual !== certificadoId) {
                    return atual;
                }

                return {
                    ...atual,
                    itens,
                    carregando: false,
                    erro: "",
                };
            });
        } catch (erroHistorico) {
            setHistoricoCertificadoDrawer((atual) => {
                const idAtual = String(
                    atual?.documento?.id ||
                    ""
                ).trim();

                if (idAtual !== certificadoId) {
                    return atual;
                }

                return {
                    ...atual,
                    itens: [],
                    carregando: false,
                    erro:
                        erroHistorico?.message ||
                        "Não foi possível carregar o histórico.",
                };
            });
        }
    };

    const abrirVersaoHistoricaCertificado = async (registro) => {
        const url =
            await criarUrlHistoricoCertificadoService({
                supabase,
                registro,
                expiresIn: 300,
            });

        if (
            typeof window !== "undefined" &&
            url
        ) {
            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );
        }

        return url;
    };

    const valoresRevisao = (doc) => ({
        realizado: datasRevisao[doc.id]?.realizado ?? doc.realizado ?? "",
        vencimento: datasRevisao[doc.id]?.vencimento ?? doc.vencimento ?? "",
    });

    const alterarDataRevisao = (doc, campo, valor) => {
        const docId = doc.id;

        setDatasRevisao((atual) => {
            const dadosAtuais = {
                realizado: atual[docId]?.realizado ?? doc.realizado ?? "",
                vencimento: atual[docId]?.vencimento ?? doc.vencimento ?? "",
                ...atual[docId],
            };

            const proximosDados = {
                ...dadosAtuais,
                [campo]: valor,
            };

            if (campo === "realizado") {
                const vencimentoAutomatico = calcularVencimentoTreinamento(doc.treinamentoId, valor);
                proximosDados.vencimento = vencimentoAutomatico || "";
            }

            return {
                ...atual,
                [docId]: proximosDados,
            };
        });
    };

    const salvarDatasCertificado = async (doc) => {
        if (!onAtualizarDatasCertificado) return;

        if (!podeEditarTreinamentosSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioEdicaoTreinamentos);
            return;
        }

        const valores = valoresRevisao(doc);

        const exigeVencimento = !treinamentoSemValidade(doc.treinamentoId);

        if (!valores.realizado || (exigeVencimento && !valores.vencimento)) {
            alert(exigeVencimento ? "Informe a data de realização e o vencimento." : "Informe a data de realização/emissão.");
            return;
        }

        setSalvandoDatasId(doc.id);

        const ok = await onAtualizarDatasCertificado(doc, {
            realizado: valores.realizado,
            vencimento: valores.vencimento,
        });

        setSalvandoDatasId("");

        if (ok) {
            setDatasRevisao((atual) => {
                const copia = { ...atual };
                delete copia[doc.id];
                return copia;
            });
        }
    };

    const opcoesPainelTreinamentos = [
        { chave: "filtros", titulo: "Filtros da base", descricao: "Busca e status dos certificados." },
        { chave: "lancamento", titulo: "Lançar certificado", descricao: "Envio individual e em lote." },
        { chave: "listaPresenca", titulo: "Verificador de lista de presença", descricao: "OCR local para conferir assinatura em listas." },
        { chave: "alertas", titulo: "Alertas para TST", descricao: "Pendências agrupadas por empresa." },
        { chave: "base", titulo: "Base de certificados", descricao: "Lista e revisão dos documentos." },
    ];

    return (
        <div>
            <Header
                className="hero-integrated-page-header hero-header--treinamentos"
                titulo="Treinamentos e certificados"
                subtitulo={null}
                acao={
                    <div className="top-actions-nowrap">
                        <button
                            type="button"
                            onClick={() => setMostrarPersonalizarTreinamentos((valor) => !valor)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Personalizar painel
                        </button>
                    </div>
                }
            />

            <section className="treinamentos-hero-banner">
                <div
                    className="treinamentos-hero-banner__bg"
                    style={{
                        backgroundImage: `url(${treinamentosHeroBackground})`,
                    }}
                />
                <div className="treinamentos-hero-banner__overlay" />
                <div className="treinamentos-hero-banner__content">
                    <div className="min-w-0">
                        <p className="treinamentos-hero-banner__eyebrow">SAFESCAN BRASIL</p>
                        <h2 className="treinamentos-hero-banner__title">
                            Gestão de treinamentos e certificados
                        </h2>
                        <p className="treinamentos-hero-banner__text">
                            Controle certificados, validade, pendências e envios em uma visão única.
                        </p>
                    </div>
                </div>

                <div className="treinamentos-hero-banner__footer">
                    <div
                        className="treinamentos-hero-banner__date"
                        aria-label={`Data e hora atuais: ${dataHoraHeroTreinamentos.data}, ${dataHoraHeroTreinamentos.diaSemana}, ${dataHoraHeroTreinamentos.hora}`}
                    >
                        <CalendarClock className="h-4 w-4" />
                        <span>{dataHoraHeroTreinamentos.data}</span>
                        <span aria-hidden="true">•</span>
                        <span>{dataHoraHeroTreinamentos.diaSemana}</span>
                        <span aria-hidden="true">•</span>
                        <span>{dataHoraHeroTreinamentos.hora}</span>
                    </div>

                    <div className="treinamentos-hero-banner__stats">
                        <div className="treinamentos-hero-banner__stat treinamentos-hero-banner__stat--em-dia">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>{totalPorStatusCertificados.emDia} certificados em dia</span>
                        </div>

                        <div className="treinamentos-hero-banner__stat treinamentos-hero-banner__stat--a-vencer">
                            <Clock3 className="h-4 w-4" />
                            <span>{totalPorStatusCertificados.aVencer} a vencer</span>
                        </div>

                        <div className="treinamentos-hero-banner__stat treinamentos-hero-banner__stat--vencidos">
                            <TriangleAlert className="h-4 w-4" />
                            <span>{totalPorStatusCertificados.vencidos} vencidos</span>
                        </div>

                        <div className="treinamentos-hero-banner__stat treinamentos-hero-banner__stat--pendentes">
                            <Upload className="h-4 w-4" />
                            <span>{totalPorStatusCertificados.pendentes} pendentes</span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMostrarPersonalizarTreinamentos((valor) => !valor)}
                            aria-pressed={mostrarPersonalizarTreinamentos}
                            className="treinamentos-hero-banner__personalizar"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Personalizar painel
                        </button>
                    </div>
                </div>
            </section>

            {permissaoSistemaAtual && (!podeCadastrarTreinamentosSistema || !podeEditarTreinamentosSistema || !podeUploadTreinamentosSistema || !podeExportarTreinamentosSistema) && (
                <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                    Perfil atual: {permissaoSistemaAtual.perfil}. Algumas ações de Treinamentos estão bloqueadas visualmente conforme o perfil cadastrado.
                </div>
            )}

            {!permissaoSistemaAtual && mensagemPermissaoSistema && (
                <div className="mb-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600 ring-1 ring-slate-200">
                    {mensagemPermissaoSistema}
                </div>
            )}

            {mostrarPersonalizarTreinamentos && (
                <TreinamentosControles
                    opcoesPainelTreinamentos={opcoesPainelTreinamentos}
                    cardsRecolhidos={cardsTreinamentosRecolhidos}
                    layoutCards={layoutCardsTreinamentos}
                    tamanhosPadrao={tamanhosCardsTreinamentosPadrao}
                    opcoesTamanho={opcoesTamanhoCardTreinamento}
                    onAlternarCard={alternarCardTreinamento}
                    onMoverCard={moverCardTreinamento}
                    onAlterarTamanho={alterarTamanhoCardTreinamento}
                    onAbrirTodos={abrirTodosCardsTreinamentos}
                    onRecolherTodos={recolherTodosCardsTreinamentos}
                    onRestaurarPadrao={restaurarPainelTreinamentos}
                    onIniciarArrasto={iniciarArrastoCardTreinamento}
                    onSoltarCard={soltarCardTreinamento}
                    cardArrastando={cardArrastandoTreinamento}
                    cardDestino={cardDestinoTreinamento}
                    setCardArrastando={setCardArrastandoTreinamento}
                    setCardDestino={setCardDestinoTreinamento}
                />
            )}
            <div className="treinamentos-layout-grid">
                {layoutCardsTreinamentos.ordem.map((chave, indice) => {
                    const tamanho = layoutCardsTreinamentos.tamanhos[chave] || tamanhosCardsTreinamentosPadrao[chave] || "medio";
                    const classePainel = `treinamentos-layout-card treinamentos-layout-card--${tamanho}`;
                    const estiloPainel = { order: indice };

                    if (chave === "filtros") {
                        return (
                            <div
                key={chave}
                className={classePainel}
                style={estiloPainel}
                onClick={(evento) => alternarCardTreinamentoPorArea(chave, cardsTreinamentosRecolhidos.filtros, evento)}
            >
                                <Card className="h-full">
                                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                                        <div>
                                            <h2 className="text-lg font-bold text-slate-950">Filtros da base de certificados</h2>
                                            <p className="mt-1 text-sm text-slate-500">Pesquise e filtre os certificados sem abrir todos os grupos manualmente.</p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => alternarCardTreinamento("filtros")}
                                            className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                        >
                                            {cardsTreinamentosRecolhidos.filtros ? "Abrir" : "Recolher"}
                                        </button>
                                    </div>

                                    {!cardsTreinamentosRecolhidos.filtros && (
                                        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_400px_210px_170px]">
                                            <div className="relative">
                                                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    value={buscaCertificados}
                                                    onChange={(e) => setBuscaCertificados(e.target.value)}
                                                    placeholder="Pesquisar por colaborador, empresa, função, código, treinamento ou arquivo"
                                                    className="treinamentos-filtros-certificados-card__input w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                                />
                                            </div>

                                            <select
                                                value={filtroEmpresaCertificados}
                                                onChange={(e) => setFiltroEmpresaCertificados(e.target.value)}
                                                aria-label="Filtrar certificados por empresa"
                                                title={
                                                    filtroEmpresaCertificados === "Todas"
                                                        ? "Todas as empresas"
                                                        : (
                                                            empresasFiltroCertificados.find(
                                                                (empresa) =>
                                                                    empresa.valor ===
                                                                    filtroEmpresaCertificados
                                                            )?.titulo ||
                                                            ""
                                                        )
                                                }
                                                className="treinamentos-filtros-certificados-card__select w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-[13px] font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                            >
                                                <option value="Todas">Todas as empresas</option>
                                                {empresasFiltroCertificados.map((empresa) => (
                                                    <option
                                                        key={empresa.valor}
                                                        value={empresa.valor}
                                                        title={
                                                            empresa.titulo ||
                                                            empresa.nome
                                                        }
                                                    >
                                                        {empresa.nome}
                                                    </option>
                                                ))}
                                            </select>

                                            <select
                                                value={filtroStatusCertificados}
                                                onChange={(e) => setFiltroStatusCertificados(e.target.value)}
                                                aria-label="Filtrar certificados por status"
                                                className="treinamentos-filtros-certificados-card__select w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            >
                                                <option value="Todos">Todos os status</option>
                                                <option value="Pendentes">Pendentes ({totalPorStatusCertificados.pendentes})</option>
                                                <option value="Em dia">Em dia ({totalPorStatusCertificados.emDia})</option>
                                                <option value="A vencer">A vencer ({totalPorStatusCertificados.aVencer})</option>
                                                <option value="Vencido">Vencidos ({totalPorStatusCertificados.vencidos})</option>
                                            </select>

                                            <select
                                                value={ordemColaboradoresBase}
                                                onChange={(e) => setOrdemColaboradoresBase(e.target.value)}
                                                aria-label="Ordenar colaboradores da base de certificados"
                                                title="Ordenar colaboradores"
                                                className="treinamentos-filtros-certificados-card__select w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                            >
                                                <option value="az">A–Z</option>
                                                <option value="za">Z–A</option>
                                            </select>
                                        </div>
                                    )}

                                </Card>
                            </div>
                        );
                    }

                    if (chave === "lancamento") {
                        return (
                            <div
                id="treinamentos-lancamento-certificado"
                key={chave}
                className={classePainel}
                style={estiloPainel}
                onClick={(evento) => alternarCardTreinamentoPorArea(chave, cardsTreinamentosRecolhidos.lancamento, evento)}
            >
                                <FormularioLancamentoCertificado
                                    colaboradores={colaboradoresFiltradosEmpresaOrdenados}
                                    colabSelecionadoCodigo={colabSelecionadoCodigo}
                                    onAlterarColaboradorCertificado={alterarColaboradorCertificado}
                                    treinamentosDisponiveis={treinamentosDisponiveis}
                                    treinamentoSelecionadoId={treinamentoSelecionadoId}
                                    setTreinamentoId={setTreinamentoId}
                                    avaliacaoSelecionado={avaliacaoSelecionado}
                                    exigenciasAbertas={exigenciasAbertas}
                                    setExigenciasAbertas={setExigenciasAbertas}
                                    dataRealizacao={dataRealizacao}
                                    setDataRealizacao={setDataRealizacao}
                                    vencimento={vencimento}
                                    observacao={observacao}
                                    setObservacao={setObservacao}
                                    arquivoSelecionado={arquivoSelecionado}
                                    selecionarArquivoCertificado={selecionarArquivoCertificado}
                                    sugestaoDataArquivo={sugestaoDataArquivo}
                                    salvandoCertificado={salvandoCertificado}
                                    analisandoArquivoCertificado={analisandoArquivoCertificado}
                                    adicionarTreinamento={adicionarTreinamento}
                                    adicionarTreinamentoGradeArquivoLote={adicionarTreinamentoGradeArquivoLote}
                                    adicionandoTreinamentoGradeArquivoId={adicionandoTreinamentoGradeArquivoId}
                                    podeAdicionarTreinamentoGradeLote={podeAdicionarTreinamentoGradeLote}
                                    arquivosLote={arquivosLote}
                                    prepararArquivosLote={prepararArquivosLote}
                                    sincronizarArquivosDoStorage={sincronizarArquivosDoStorage}
                                    sincronizandoStorage={sincronizandoStorage}
                                    resultadoLote={resultadoLote}
                                    colabSelecionado={colabSelecionado}
                                    removerArquivoLote={removerArquivoLote}
                                    alterarColaboradorArquivoLote={alterarColaboradorArquivoLote}
                                    alterarTreinamentoArquivoLote={alterarTreinamentoArquivoLote}
                                    alterarDataArquivoLote={alterarDataArquivoLote}
                                    treinamentosBase={treinamentosBase}
                                    salvarCertificadosEmLote={salvarCertificadosEmLote}
                                    salvandoLote={salvandoLote}
                                    preparandoLoteCertificados={preparandoLoteCertificados}
                                    recolhido={cardsTreinamentosRecolhidos.lancamento}
                                    onAlternarRecolhido={() => alternarCardTreinamento("lancamento")}
                                />
                            </div>
                        );
                    }

                    if (chave === "listaPresenca") {
                        return (
                            <div key={chave} className={classePainel} style={estiloPainel}>
                                <VerificadorListaPresenca
                                    colaboradores={colaboradores}
                                    colaboradorId={colabSelecionadoId || colaboradorInicialId}
                                />
                            </div>
                        );
                    }
                    if (chave === "alertas") {
                        return (
                            <div
                key={chave}
                className={classePainel}
                style={estiloPainel}
                onClick={(evento) => alternarCardTreinamentoPorArea(chave, cardsTreinamentosRecolhidos.alertas, evento)}
            >
                                <AlertasTstTreinamentos
                                    alertasTstPorEmpresa={alertasTstPorEmpresa}
                                    enviandoAlertaTst={enviandoAlertaTst}
                                    onEnviarEmailAlertaTstAutomatico={enviarEmailAlertaTstAutomatico}
                                    onCopiarAvisoAlertaTst={copiarAvisoAlertaTst}
                                    recolhido={cardsTreinamentosRecolhidos.alertas}
                                    onAlternarRecolhido={() => alternarCardTreinamento("alertas")}
                                />
                            </div>
                        );
                    }

                    if (chave === "base") {
                        return (
                            <div
                key={chave}
                className={classePainel}
                style={estiloPainel}
                onClick={(evento) => alternarCardTreinamentoPorArea(chave, cardsTreinamentosRecolhidos.base, evento)}
            >
                                <BaseCertificadosTreinamentos
                                    documentos={documentosOperacionais}
                                    documentosFiltrados={documentosFiltrados}
                                    documentosPorColaborador={documentosPorColaboradorOrdenadosFiltro}
                                    totalPorStatusCertificados={totalPorStatusCertificados}
                                    gruposCertificadosAbertos={gruposCertificadosAbertos}
                                    setGruposCertificadosAbertos={setGruposCertificadosAbertos}
                                    certificadosAbertos={certificadosAbertos}
                                    setCertificadosAbertos={setCertificadosAbertos}
                                    valoresRevisao={valoresRevisao}
                                    alterarDataRevisao={alterarDataRevisao}
                                    salvarDatasCertificado={salvarDatasCertificado}
                                    salvandoDatasId={salvandoDatasId}
                                    enviarDocumentoPendente={enviarDocumentoPendente}
                                    enviarDocumentosPendentesEmLote={enviarDocumentosPendentesEmLote}
                                      onVisualizarCertificado={onVisualizarCertificado}
                                    onAbrirHistoricoCertificado={abrirHistoricoCertificado}
                                    onExcluirCertificado={excluirCertificadoSeguro}
                                    recolhido={cardsTreinamentosRecolhidos.base}
                                    onAlternarRecolhido={() => alternarCardTreinamento("base")}
                                />
                            </div>
                        );
                    }

                    return null;
                })}
            </div>

            <ModalDivergenciaFuncaoAso
                aberto={Boolean(divergenciaFuncaoAso)}
                dados={divergenciaFuncaoAso}
                processando={resolvendoDivergenciaFuncaoAso}
                onConfirmar={confirmarAtualizacaoFuncaoAso}
                onCancelar={cancelarDivergenciaFuncaoAso}
            />

            <HistoricoCertificadoDrawer
                aberto={historicoCertificadoDrawer.aberto}
                documento={historicoCertificadoDrawer.documento}
                historico={historicoCertificadoDrawer.itens}
                carregando={historicoCertificadoDrawer.carregando}
                erro={historicoCertificadoDrawer.erro}
                onFechar={fecharHistoricoCertificado}
                onAbrirAtual={() =>
                    onVisualizarCertificado?.(
                        historicoCertificadoDrawer.documento
                    )
                }
                onAbrirHistorico={abrirVersaoHistoricaCertificado}
            />
        </div>
    );
}
