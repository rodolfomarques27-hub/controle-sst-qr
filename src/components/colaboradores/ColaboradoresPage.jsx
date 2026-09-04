import "../../styles/pages/colaboradores-hero.css";
import "../../styles/pages/heroes-aniversariantes-colaboradores-data.css";
/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
    AlertTriangle,
    CalendarClock,
    ChevronDown,
    ChevronUp,
    Download,
    FileText,
    Filter,
    Plus,
    QrCode,
    RefreshCw,
    Settings2,
    Search,
    ShieldCheck,
    Trash2,
    Upload,
    Users,
} from "lucide-react";
import { Card, FotoColaborador, Header, obterFotoColaboradorSrc } from "../commonComponents";
import { MobilizacaoBadge } from "../MobilizacaoBadge";
import { FormularioNovoColaborador } from "./FormularioNovoColaborador";
import { ImportacaoMassaColaboradores } from "./ImportacaoMassaColaboradores";
import { ImportacaoFotosMassaColaboradores } from "./ImportacaoFotosMassaColaboradores";
import { ModalNovaFuncaoColaborador } from "./ModalNovaFuncaoColaborador";
import { ModalAjustarFuncoesColaborador } from "./ModalAjustarFuncoesColaborador";
import { ModalRevisaoColaborador } from "./ModalRevisaoColaborador";
import { ColaboradorIdentificacoesSeguranca } from "./ColaboradorIdentificacoesSeguranca";
import {
    obterStatusInicialColaborador,
    definirFuncoesTreinamentosRemotas,
    obterFuncoesPersonalizadasSalvas,
    salvarFuncoesPersonalizadas,
    obterTodasMatrizesFuncao,
    obterMatrizFuncao,
    treinamentosObrigatoriosFuncao,
    gerarCodigoFuncionario,
    avaliarTreinamentosColaborador,
    treinamentoSemValidade,
    obterTreinamento,
    statusGeral,
} from "../../services/colaboradorDocumentosService";
import {
    carregarFuncoesTreinamentosRemotas,
    salvarFuncaoTreinamentosRemota,
} from "../../services/funcoesTreinamentosService.js";
import {
    treinamentosBase,
    treinamentosBaseObra,
    STATUS_CLASSIFICACAO_COLABORADOR,
} from "../../constants/treinamentosConstants";
import { RelatorioPendenciasCadastraisModal } from "./RelatorioPendenciasCadastraisModal";
import { RelatorioControleFichasEpiFiltrosModal } from "./RelatorioControleFichasEpiFiltrosModal";
import { RelatorioColaboradoresFiltrosModal } from "./RelatorioColaboradoresFiltrosModal";
import { RelatorioPendenciasTreinamentosFiltrosModal } from "./RelatorioPendenciasTreinamentosFiltrosModal";
import {
    baixarRelatorioColaboradoresTreinamentosPDF,
    baixarRelatorioControleFichasEpiPDF,
    baixarRelatorioPendenciasTreinamentosPDF,
} from "../../services/exportacaoService";
import {
    listarHistoricoCertificadosEmLoteService,
} from "../../services/certificadosHistoricoConsultaService";
import { obterUrlLogoEmpresa } from "../../services/supabaseServices";
import { normalizarTextoBusca, formatDate, classNames } from "../../utils/sstUtils";
import {
    ACOES_PERMISSAO_SISTEMA,
    MODULOS_PERMISSAO_SISTEMA,
    usuarioPodeExecutarAcaoSistema,
    usuarioPodeExcluirSistema,
} from "../../services/usuariosPermissoesSistemaService";

const CHAVE_NOVO_COLABORADOR_RECOLHIDO = "controleSstColaboradoresNovoColaboradorRecolhido";
const CHAVE_INFO_COLABORADORES_RECOLHIDA = "controleSstColaboradoresInformacoesRecolhidas";
const CHAVE_CADASTRO_MASSA_RECOLHIDO = "controleSstColaboradoresCadastroMassaRecolhido";


function carregarPreferenciaPainelBoolean(chave, padrao = false) {
    try {
        const salvo = window.localStorage.getItem(chave);
        return salvo === null ? padrao : salvo === "true";
    } catch {
        return padrao;
    }
}

function salvarPreferenciaPainelBoolean(chave, valor) {
    const normalizado = Boolean(valor);

    try {
        window.localStorage.setItem(chave, String(normalizado));
    } catch {
        // Ignora navegador sem localStorage disponível.
    }

    return normalizado;
}

export function Colaboradores({
    colaboradores,
    empresasBanco,
    carregandoBanco,
    erroBanco,
    permissaoSistemaUsuario = null,
    onAtualizarBanco,
    onAdicionarColaborador,
    onAtualizarColaborador,
    onExcluirColaborador,
    onSelectColab,
    onEnviarTreinamento,
}) {
    const [busca, setBusca] = useState("");
    const [empresa, setEmpresa] = useState("Todas");
    const [filtroFuncao, setFiltroFuncao] = useState("Todas");
    const [filtroClassificacao, setFiltroClassificacao] = useState("Todos");

    /*
     * G2-C10D-F1
     *
     * Filtro rápido acionado pelos KPIs superiores.
     *
     * null:
     * mantém o comportamento histórico da tela.
     *
     * "Total":
     * mostra a base completa da empresa, inclusive
     * Desmobilizados e Inativos.
     *
     * Demais valores:
     * usam exatamente statusGeral(c).texto.
     */
    const [filtroStatusRapidoAtivo, setFiltroStatusRapidoAtivo] =
        useState(null);

    const aplicarFiltroStatusRapido =
        (status) => {
            const statusSelecionado =
                String(
                    status ||
                    "Total"
                );

            setFiltroStatusRapidoAtivo(
                statusSelecionado
            );

            /*
             * Aproveita o motor funcional já existente
             * da classificação.
             */
            setFiltroClassificacao(
                ["Total", "A vencer"].includes(
                    statusSelecionado
                )
                    ? "Todos"
                    : statusSelecionado
            );
        };
    const [ordenacaoFuncionarios, setOrdenacaoFuncionarios] = useState("nome_az");
    const [agoraHeroColaboradores, setAgoraHeroColaboradores] = useState(() => new Date());

    useEffect(() => {
        const atualizarRelogioHeroColaboradores = () => {
            setAgoraHeroColaboradores(new Date());
        };

        atualizarRelogioHeroColaboradores();

        const intervaloRelogioHeroColaboradores = window.setInterval(
            atualizarRelogioHeroColaboradores,
            30000
        );

        return () => {
            window.clearInterval(intervaloRelogioHeroColaboradores);
        };
    }, []);
    const [salvando, setSalvando] = useState(false);

    /*
     * G2-C10D-E1
     * Estado visual + trava síncrona exclusiva
     * do PDF de colaboradores.
     */
    const [exportandoPdfColaboradores, setExportandoPdfColaboradores] =
        useState(false);

    const exportandoPdfColaboradoresRef =
        useRef(false);

    const exportandoPdfEpiRef =
        useRef(false);

    /*
     * G2-C10D-G2
     *
     * A geração do novo relatório será conectada somente
     * depois de validarmos a matriz de dados faltantes.
     */
    const [
        relatorioPendenciasCadastraisAberto,
        setRelatorioPendenciasCadastraisAberto,
    ] =
        useState(false);

    const [
        relatorioControleFichasEpiFiltrosAberto,
        setRelatorioControleFichasEpiFiltrosAberto,
    ] =
        useState(false);
    const [
        relatorioColaboradoresFiltrosAberto,
        setRelatorioColaboradoresFiltrosAberto,
    ] =
        useState(false);

    const [
        relatorioPendenciasTreinamentosFiltrosAberto,
        setRelatorioPendenciasTreinamentosFiltrosAberto,
    ] =
        useState(false);
    const [importandoMassa, setImportandoMassa] = useState(false);
    const [importandoFotosMassa, setImportandoFotosMassa] = useState(false);
    const [colaboradorEdicao, setColaboradorEdicao] = useState(null);
    const [colaboradorExclusao, setColaboradorExclusao] = useState(null);
    const permissaoSistemaAtual = permissaoSistemaUsuario;
    const mensagemPermissaoSistema = permissaoSistemaAtual
        ? "Permissões do sistema carregadas para ações críticas."
        : "Nenhuma permissão do sistema cadastrada para o usuário atual.";
    const [pendenciasAbertas, setPendenciasAbertas] = useState(null);
    const [novoColaboradorRecolhido, setNovoColaboradorRecolhido] = useState(() => carregarPreferenciaPainelBoolean(CHAVE_NOVO_COLABORADOR_RECOLHIDO, false));
    const [cadastroMassaRecolhido, setCadastroMassaRecolhido] = useState(() => carregarPreferenciaPainelBoolean(CHAVE_CADASTRO_MASSA_RECOLHIDO, false));
    const [informacoesColaboradoresRecolhidas, setInformacoesColaboradoresRecolhidas] = useState(() => carregarPreferenciaPainelBoolean(CHAVE_INFO_COLABORADORES_RECOLHIDA, false));
    const [modalFuncaoAberto, setModalFuncaoAberto] = useState(false);
    const [modalAjustarFuncoesAberto, setModalAjustarFuncoesAberto] = useState(false);
    const [versaoFuncoes, setVersaoFuncoes] = useState(0);
    const [novaFuncao, setNovaFuncao] = useState({
        rotulo: "",
        termos: "",
        treinamentos: [...treinamentosBaseObra, 13],
    });
    const [novo, setNovo] = useState({
        nome: "",
        empresaNome: "",
        funcao: "",
        matricula: "",
        cpf: "",
        telefone: "",
        contatoEmergenciaNome: "",
        contatoEmergenciaParentesco: "",
        contatoEmergenciaTelefone: "",
        dataAdmissao: "",
        dataNascimento: "",
        mostrarAniversarioDashboard: false,
        statusMobilizacao: obterStatusInicialColaborador(),
        treinamentosRemovidos: [],
        treinamentosAdicionais: [],
        foto: null,
    });

    const converterDataColaboradorParaIso = (valor = "") => {
        const texto = String(valor || "").trim();

        if (!texto) return "";
        if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);

        const match = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!match) return texto;

        const [, dia, mes, ano] = match;
        return `${ano}-${mes}-${dia}`;
    };
    const empresasFiltro = ["Todas", ...Array.from(new Set(colaboradores.map((c) => c.empresa).filter(Boolean)))];

    const funcoesFiltro = [
        "Todas",
        ...Array.from(
            new Map(
                colaboradores
                    .filter(
                        (colaborador) =>
                            empresa === "Todas" ||
                            colaborador?.empresa ===
                                empresa
                    )
                    .map(
                        (colaborador) =>
                            String(
                                colaborador?.funcao ||
                                    ""
                            ).trim()
                    )
                    .filter(Boolean)
                    .map(
                        (funcao) => [
                            normalizarTextoBusca(
                                funcao
                            ),
                            funcao,
                        ]
                    )
            ).values()
        ).sort(
            (a, b) =>
                a.localeCompare(
                    b,
                    "pt-BR",
                    {
                        sensitivity:
                            "base",
                    }
                )
        ),
    ];

    const filtrados = colaboradores
        .filter((c) => {
            const avaliacao = avaliarTreinamentosColaborador(c);
            const geral = statusGeral(c);
            const texto = normalizarTextoBusca(`${c.nome} ${c.empresa} ${c.empresaExibicao} ${c.empresaPaiNome} ${c.funcao} ${c.matricula} ${c.codigoFuncionario} ${c.statusMobilizacao} ${geral.texto} ${avaliacao.matriz.rotulo}`);
            const bateBusca = texto.includes(normalizarTextoBusca(busca));

            const bateEmpresa =
                empresa === "Todas" ||
                c.empresa === empresa;

            const bateFuncao =
                filtroFuncao === "Todas" ||
                normalizarTextoBusca(
                    c.funcao
                ) ===
                    normalizarTextoBusca(
                        filtroFuncao
                    );
            /*
             * G2-C10D-F4-R1 — TOTAL SEM DESMOBILIZADOS
             *
             * Visualização padrão:
             * - Desmobilizado oculto;
             * - Inativo oculto.
             *
             * KPI Total:
             * - Desmobilizado continua oculto;
             * - Inativo passa a ser exibido.
             *
             * Cards específicos:
             * - Desmobilizado e Inativo continuam acessíveis
             *   por seus próprios filtros.
             */
            /*
             * G2-C10D-F6 — TOTAL = SOMENTE ATIVOS
             *
             * Quando a classificação está em "Todos":
             * - Desmobilizados ficam fora;
             * - Inativos ficam fora.
             *
             * Os cards específicos continuam funcionando,
             * pois alteram filtroClassificacao para o status
             * correspondente.
             */
            const statusOcultoNaVisualizacaoPadrao =
                filtroClassificacao === "Todos" &&
                [
                    "Desmobilizado",
                    "Inativo",
                ].includes(
                    geral.texto
                );

            const bateClassificacao =
                filtroClassificacao === "Todos" ||
                geral.texto === filtroClassificacao;

            /*
             * G2-C10D-F2
             *
             * A vencer é condição de treinamento,
             * não statusGeral do colaborador.
             */
            const bateAVencer =
                filtroStatusRapidoAtivo !== "A vencer" ||
                (
                    Array.isArray(
                        avaliacao.vencendo
                    ) &&
                    avaliacao.vencendo.length > 0
                );

            return (
                !statusOcultoNaVisualizacaoPadrao &&
                bateBusca &&
                bateEmpresa &&
                bateFuncao &&
                bateClassificacao &&
                bateAVencer
            );
        })
        .sort((a, b) => {
            const comparacao = String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" });
            return ordenacaoFuncionarios === "nome_za" ? -comparacao : comparacao;
        });

    const dataHoraHeroColaboradores = useMemo(() => {
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
            }).format(agoraHeroColaboradores),

            diaSemana: formatarDiaSemana(
                new Intl.DateTimeFormat("pt-BR", {
                    weekday: "long",
                }).format(agoraHeroColaboradores)
            ),

            hora: new Intl.DateTimeFormat("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            }).format(agoraHeroColaboradores),
        };
    }, [agoraHeroColaboradores]);

    const resumoTreinamentos = useMemo(() => {
        const avaliacoes = colaboradores.map(avaliarTreinamentosColaborador);
        const classificacoes = colaboradores.map((c) => statusGeral(c).texto);

        return {
            pendentes: avaliacoes.reduce((total, item) => total + item.pendentes.length, 0),
            vencidos: avaliacoes.reduce((total, item) => total + item.vencidos.length, 0),
            vencendo: avaliacoes.reduce((total, item) => total + item.vencendo.length, 0),
            liberados: classificacoes.filter((status) => status === "Liberado").length,
            comPendencia: classificacoes.filter((status) => status === "Com pendência").length,
            bloqueados: classificacoes.filter((status) => status === "Bloqueado").length,
            emAnalise: classificacoes.filter((status) => status === "Em análise").length,
            desmobilizados: classificacoes.filter((status) => status === "Desmobilizado").length,
            inativos: classificacoes.filter((status) => status === "Inativo").length,
        };
    }, [colaboradores]);

    const resumoStatusEmpresaSelecionada = useMemo(() => {
        const baseEmpresa =
            empresa === "Todas"
                ? colaboradores
                : colaboradores.filter((c) => c.empresa === empresa);

        const classificacoes =
            baseEmpresa.map((c) => statusGeral(c).texto);

        const avaliacoes =
            baseEmpresa.map(
                avaliarTreinamentosColaborador
            );

        /*
         * O KPI representa colaboradores,
         * e não quantidade de certificados.
         */
        const colaboradoresAVencer =
            avaliacoes.filter(
                (
                    avaliacao,
                    indice
                ) => {
                    const classificacao =
                        classificacoes[indice];

                    const foraDaOperacao =
                        [
                            "Desmobilizado",
                            "Inativo",
                        ].includes(
                            classificacao
                        );

                    return (
                        !foraDaOperacao &&
                        Array.isArray(
                            avaliacao.vencendo
                        ) &&
                        avaliacao.vencendo.length > 0
                    );
                }
            ).length;

        return {
            total:
                classificacoes.filter(
                    (status) =>
                        ![
                            "Desmobilizado",
                            "Inativo",
                        ].includes(
                            status
                        )
                ).length,
            liberados: classificacoes.filter((status) => status === "Liberado").length,
            comPendencia: classificacoes.filter((status) => status === "Com pendência").length,
            bloqueados: classificacoes.filter((status) => status === "Bloqueado").length,
            emAnalise: classificacoes.filter((status) => status === "Em análise").length,
            desmobilizados: classificacoes.filter((status) => status === "Desmobilizado").length,
            inativos: classificacoes.filter((status) => status === "Inativo").length,
            aVencer: colaboradoresAVencer,
        };
    }, [colaboradores, empresa]);

    const obterEmpresaRelatorio = (colaborador = {}) => {
        const empresaId = String(colaborador.empresaId || colaborador.empresa_id || "").trim();
        const empresaNome = normalizarTextoBusca(colaborador.empresa || colaborador.empresaNome || "");

        return (
            empresasBanco.find((item) => String(item.id || "") === empresaId) ||
            empresasBanco.find((item) => normalizarTextoBusca(item.nome || "") === empresaNome) ||
            {}
        );
    };

    const baixarRelatorioColaboradores = async (filtrosRelatorio = {}) => {
        if (!podeExportarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExportacaoColaboradores);
            return;
        }

        /*
         * A ref bloqueia um segundo clique imediatamente,
         * sem depender do ciclo de renderização do React.
         */
        if (exportandoPdfColaboradoresRef.current) {
            return;
        }

        const buscaRelatorio =
            normalizarTextoBusca(
                filtrosRelatorio?.busca ||
                    ""
            );

        const empresaRelatorio =
            String(
                filtrosRelatorio?.empresa ||
                    "Todas"
            ).trim() ||
            "Todas";

        const classificacaoRelatorio =
            String(
                filtrosRelatorio?.classificacao ||
                    "Todos"
            ).trim() ||
            "Todos";

        const empresaNormalizada =
            normalizarTextoBusca(
                empresaRelatorio
            );

        const classificacaoNormalizada =
            normalizarTextoBusca(
                classificacaoRelatorio
            );

        const colaboradoresFiltradosRelatorio =
            colaboradores.filter(
                (colaborador) => {
                    const avaliacao =
                        avaliarTreinamentosColaborador(
                            colaborador
                        );

                    const geral =
                        statusGeral(
                            colaborador
                        );

                    const empresaDireta =
                        typeof colaborador?.empresa ===
                        "string"
                            ? colaborador.empresa
                            : colaborador?.empresa?.nome;

                    const empresasColaborador =
                        [
                            empresaDireta,
                        ]
                            .filter(Boolean)
                            .map(
                                (valor) =>
                                    normalizarTextoBusca(
                                        valor
                                    )
                            );

                    const textoBusca =
                        normalizarTextoBusca(
                            [
                                colaborador?.nome,
                                empresaDireta,
                                colaborador?.empresaNome,
                                colaborador?.empresaExibicao,
                                colaborador?.empresaPaiNome,
                                colaborador?.funcao,
                                colaborador?.matricula,
                                colaborador?.codigoFuncionario,
                                colaborador?.statusMobilizacao,
                                geral?.texto,
                                avaliacao?.matriz?.rotulo,
                            ]
                                .filter(Boolean)
                                .join(" ")
                        );

                    const bateBusca =
                        !buscaRelatorio ||
                        textoBusca.includes(
                            buscaRelatorio
                        );

                    const bateEmpresa =
                        empresaNormalizada ===
                            "todas" ||
                        empresasColaborador.includes(
                            empresaNormalizada
                        );

                    const bateClassificacao =
                        classificacaoNormalizada ===
                            "todos"
                            ? ![
                                  "Desmobilizado",
                                  "Inativo",
                              ].includes(
                                  geral.texto
                              )
                            : normalizarTextoBusca(
                                  geral.texto
                              ) ===
                              classificacaoNormalizada;

                    return (
                        bateBusca &&
                        bateEmpresa &&
                        bateClassificacao
                    );
                }
            );

        if (
            !colaboradoresFiltradosRelatorio.length
        ) {
            return false;
        }
        const colaboradoresRelatorio = colaboradoresFiltradosRelatorio.map((c) => {
            const avaliacao = avaliarTreinamentosColaborador(c);
            const geral = statusGeral(c);
            const empresaBase = obterEmpresaRelatorio(c);
            const logoRaw = c.empresaLogoUrl || c.empresa_logo_url || empresaBase.logo_url || empresaBase.logoUrl || "";
            const logoUrl = logoRaw ? obterUrlLogoEmpresa(logoRaw) : "";

            return {
                id: c.id,
                nome: c.nome,
                codigo: c.codigoFuncionario,
                empresaId: c.empresaId || empresaBase.id || c.empresa,
                empresaNome: c.empresa || empresaBase.nome || "Empresa não informada",
                empresaExibicao: c.empresaExibicao || c.empresa || empresaBase.nome || "",
                empresaCnpj: c.empresaCnpj || empresaBase.cnpj || "",
                empresaResponsavel: c.empresaResponsavel || empresaBase.responsavel || empresaBase.responsavel_auditoria || "",
                empresaLogoUrl: logoUrl,
                fotoUrl: obterFotoColaboradorSrc(c) || c.fotoUrl || c.foto_url || c.fotoColaboradorUrl || c.foto_colaborador_url || "",
                funcao: c.funcao,
                matricula: c.matricula,
                statusMobilizacao: c.statusMobilizacao,
                matriz: avaliacao.matriz.rotulo,
                statusGeral: geral.texto,
                obrigatorios: avaliacao.itens.map((item) => item.treinamento.nome),
                validos: avaliacao.emDia.map((item) => item.treinamento.nome),
                pendentes: avaliacao.pendentes.map((item) => item.treinamento.nome),
                vencidos: avaliacao.vencidos.map((item) => item.treinamento.nome),
                vencendo: avaliacao.vencendo.map((item) => `${item.treinamento.nome} - vence ${formatDate(item.realizado?.vencimento)}`),
                adicionados: (c.treinamentosAdicionais || []).map((id) => obterTreinamento(id)?.nome).filter(Boolean),
                removidos: (c.treinamentosRemovidos || []).map((id) => obterTreinamento(id)?.nome).filter(Boolean),
            };
        });

        const relatorioColaboradoresTreinamentosFiltrosAplicados = {
            busca:
                String(
                    filtrosRelatorio?.busca ||
                        ""
                ).trim() ||
                "-",

            empresa:
                empresaRelatorio,

            classificacao:
                classificacaoRelatorio,

            colaboradoresFiltrados:
                `${colaboradoresFiltradosRelatorio.length} colaborador(es)`,
        };

        /*
         * O estado começa imediatamente antes da operação
         * assíncrona pesada e permanece ativo até ela terminar,
         * inclusive em caso de erro.
         */
        exportandoPdfColaboradoresRef.current =
            true;

        setExportandoPdfColaboradores(
            true
        );

        try {
            const resultado =
                await baixarRelatorioColaboradoresTreinamentosPDF({
                    contratanteCabecalho: obterContratanteIdealizaRelatorio(),
                    nomeArquivo: "relatorio-colaboradores-treinamentos.pdf",
                    titulo: "Relat\u00f3rio de colaboradores e treinamentos",
                    colaboradores: colaboradoresRelatorio,
                    filtros: relatorioColaboradoresTreinamentosFiltrosAplicados,
                });

            return resultado !== false;
        } finally {
            exportandoPdfColaboradoresRef.current =
                false;

            setExportandoPdfColaboradores(
                false
            );
        }
    };

    const obterContratanteIdealizaRelatorio = () => {
        const TIPO_CONTRATANTE_INSTITUCIONAL =
            "Contratante - Idealiza Cidades";

        const tipoEsperado =
            normalizarTextoBusca(
                TIPO_CONTRATANTE_INSTITUCIONAL
            );

        const candidatas =
            (
                Array.isArray(empresasBanco)
                    ? empresasBanco
                    : []
            )
                .filter(
                    (item) =>
                        item &&
                        typeof item === "object"
                )
                .filter((item) => {
                    const tipo =
                        normalizarTextoBusca(
                            item.tipo_empresa ||
                            item.tipoEmpresa ||
                            ""
                        );

                    return tipo === tipoEsperado;
                })
                .sort((a, b) => {
                    const nomeA =
                        String(
                            a.nome ||
                            a.razao_social ||
                            a.razaoSocial ||
                            ""
                        );

                    const nomeB =
                        String(
                            b.nome ||
                            b.razao_social ||
                            b.razaoSocial ||
                            ""
                        );

                    const porNome =
                        nomeA.localeCompare(
                            nomeB,
                            "pt-BR"
                        );

                    if (porNome !== 0) {
                        return porNome;
                    }

                    return String(
                        a.id ||
                        ""
                    ).localeCompare(
                        String(
                            b.id ||
                            ""
                        ),
                        "pt-BR"
                    );
                });

        const idealiza =
            candidatas[0] ||
            null;

        if (!idealiza) {
            return null;
        }

        const logoRaw =
            idealiza.logo_url ||
            idealiza.logoUrl ||
            idealiza.logo ||
            idealiza.logo_path ||
            idealiza.logoPath ||
            "";

        return {
            id:
                idealiza.id ||
                "",

            nome:
                idealiza.nome ||
                idealiza.razao_social ||
                idealiza.razaoSocial ||
                "Idealiza Cidades",

            razaoSocial:
                idealiza.razao_social ||
                idealiza.razaoSocial ||
                "",

            cnpj:
                idealiza.cnpj ||
                "",

            logoUrl:
                logoRaw
                    ? obterUrlLogoEmpresa(
                        logoRaw
                    )
                    : "",
        };
    };

    const baixarRelatorioControleFichasEpi = async (filtrosEpi = {}) => {
        if (!podeExportarColaboradoresSistema) {
            if (
                typeof window !==
                "undefined"
            ) {
                window.alert(
                    mensagemBloqueioExportacaoColaboradores
                );
            }

            return;
        }

        if (
            exportandoPdfEpiRef.current
        ) {
            return;
        }

        const colaboradoresFiltradosRelatorio =
            colaboradores.filter(
                (colaborador) =>
                    ![
                        "Desmobilizado",
                        "Inativo",
                    ].includes(
                        statusGeral(
                            colaborador
                        ).texto
                    )
            );
        const colaboradoresEpi =
            colaboradoresFiltradosRelatorio.map(
                (c) => {
                    const empresaBase =
                        obterEmpresaRelatorio(
                            c
                        );

                    /*
                     * DOCUMENTO:
                     * ID 14 = NR-06 Ficha de EPIs atualizada.
                     *
                     * Não confundir com:
                     * ID 8 = NR-06 Uso Correto de EPIs.
                     */
                    const fichaEpi =
                        (
                            Array.isArray(
                                c.treinamentos
                            )
                                ? c.treinamentos
                                : []
                        ).find(
                            (item) =>
                                Number(
                                    item?.treinamentoId ??
                                        item?.treinamento_id ??
                                        item?.treinamentoCodigo ??
                                        item?.treinamento_codigo ??
                                        0
                                ) === 14
                        ) ||
                        null;

                    /*
                     * DATA DOCUMENTAL:
                     *
                     * realizado é normalizado a partir
                     * de data_realizacao.
                     *
                     * NÃO utilizar createdAt.
                     */
                    const dataFichaEpi =
                        String(
                            fichaEpi?.realizado ||
                                fichaEpi?.data_realizacao ||
                                fichaEpi?.dataRealizacao ||
                                ""
                        ).trim();

                    /*
                     * EVIDÊNCIA FÍSICA:
                     *
                     * Registro sem arquivo não pode ser
                     * apresentado como ficha conforme.
                     */
                    const arquivoFichaEpi =
                        fichaEpi?.arquivoUrl ||
                        fichaEpi?.arquivo_url ||
                        fichaEpi?.urlArquivo ||
                        fichaEpi?.url_arquivo ||
                        fichaEpi?.documentoUrl ||
                        fichaEpi?.documento_url ||
                        fichaEpi?.arquivo ||
                        fichaEpi?.url ||
                        "";

                    const possuiRegistroFichaEpi =
                        Boolean(
                            fichaEpi
                        );

                    const possuiArquivoFichaEpi =
                        Boolean(
                            typeof arquivoFichaEpi ===
                                "string"
                                ? arquivoFichaEpi.trim()
                                : arquivoFichaEpi
                        );

                    return {
                        colaboradorId:
                            c.id,

                        nome:
                            c.nome,

                        funcao:
                            c.funcao,

                        empresaId:
                            c.empresaId ||
                            empresaBase.id ||
                            c.empresa,

                        empresaNome:
                            empresaBase.nome ||
                            c.empresa ||
                            "Empresa não informada",

                        empresaExibicao:
                            c.empresaExibicao ||
                            empresaBase.nome ||
                            c.empresa ||
                            "",

                        fichaEpi,

                        possuiRegistroFichaEpi,

                        possuiArquivoFichaEpi,

                        dataFichaEpi,
                    };
                }
            );

        if (
            !colaboradoresEpi.length
        ) {
            return false;
        }
        exportandoPdfEpiRef.current =
            true;

        try {
            /*
             * EPI-B5-R1-R1-A
             *
             * O histórico é carregado em uma única consulta.
             * A lista chega ordenada por arquivado_em DESC.
             *
             * Assim, o primeiro registro encontrado para cada
             * certificado_origem_id representa a versão anterior
             * genuína mais recente.
             *
             * Não existe fallback para created_at.
             */
            const idsFichasEpi =
                Array.from(
                    new Set(
                        colaboradoresEpi
                            .map(
                                (item) =>
                                    String(
                                        item?.fichaEpi?.id ||
                                            ""
                                    ).trim()
                            )
                            .filter(Boolean)
                    )
                );

            const historicoFichasEpi =
                await listarHistoricoCertificadosEmLoteService({
                    supabase,
                    certificadoIds:
                        idsFichasEpi,
                });

            const historicoAnteriorPorCertificado =
                new Map();

            historicoFichasEpi.forEach(
                (registro) => {
                    const certificadoOrigemId =
                        String(
                            registro?.certificado_origem_id ||
                                ""
                        ).trim();

                    if (
                        !certificadoOrigemId ||
                        historicoAnteriorPorCertificado.has(
                            certificadoOrigemId
                        )
                    ) {
                        return;
                    }

                    historicoAnteriorPorCertificado.set(
                        certificadoOrigemId,
                        registro
                    );
                }
            );

            const colaboradoresEpiComHistorico =
                colaboradoresEpi.map(
                    (item) => {
                        const certificadoId =
                            String(
                                item?.fichaEpi?.id ||
                                    ""
                            ).trim();

                        const anterior =
                            certificadoId
                                ? historicoAnteriorPorCertificado.get(
                                    certificadoId
                                )
                                : null;

                        return {
                            ...item,

                            /*
                             * Data documental da versão anterior.
                             *
                             * Ausência de histórico = string vazia.
                             * O renderer exibirá "-" no próximo gate.
                             */
                            dataFichaEpiAnterior:
                                anterior?.data_realizacao ||
                                "",
                        };
                    }
                );

            return await baixarRelatorioControleFichasEpiPDF({
                nomeArquivo:
                    "relatorio-controle-fichas-epi.pdf",

                titulo:
                    "Relatório de Controle de Fichas de EPI",

                contratanteCabecalho:
                    obterContratanteIdealizaRelatorio(),

                colaboradores:
                    colaboradoresEpiComHistorico,

                filtros: {
                    busca:
                        String(
                            filtrosEpi?.busca ||
                                ""
                        ).trim(),

                    empresa:
                        String(
                            filtrosEpi?.empresa ||
                                "Todas"
                        ).trim() ||
                        "Todas",

                    classificacaoEpi:
                        String(
                            filtrosEpi?.classificacaoEpi ||
                                "Todos"
                        ).trim() ||
                        "Todos",
                },
            });
        }
        finally {
            exportandoPdfEpiRef.current =
                false;
        }
    };

    const baixarRelatorioPendencias = async (filtrosRelatorio = {}) => {
        if (!podeExportarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExportacaoColaboradores);
            return;
        }

        const buscaRelatorio =
            normalizarTextoBusca(
                filtrosRelatorio?.busca ||
                    ""
            );

        const empresaRelatorio =
            String(
                filtrosRelatorio?.empresa ||
                    "Todas"
            ).trim() ||
            "Todas";

        const classificacaoRelatorio =
            String(
                filtrosRelatorio?.classificacao ||
                    "Todos"
            ).trim() ||
            "Todos";

        const empresaNormalizada =
            normalizarTextoBusca(
                empresaRelatorio
            );

        const classificacaoNormalizada =
            normalizarTextoBusca(
                classificacaoRelatorio
            );

        const colaboradoresFiltradosRelatorio =
            colaboradores.filter(
                (colaborador) => {
                    const avaliacao =
                        avaliarTreinamentosColaborador(
                            colaborador
                        );

                    const geral =
                        statusGeral(
                            colaborador
                        );

                    const empresaDireta =
                        typeof colaborador?.empresa === "string"
                            ? colaborador.empresa
                            : colaborador?.empresa?.nome;

                    const empresasColaborador =
                        [
                            empresaDireta,
                        ]
                            .filter(Boolean)
                            .map(
                                (valor) =>
                                    normalizarTextoBusca(
                                        valor
                                    )
                            );

                    const textoBusca =
                        normalizarTextoBusca(
                            [
                                colaborador?.nome,
                                empresaDireta,
                                colaborador?.empresaNome,
                                colaborador?.empresaExibicao,
                                colaborador?.empresaPaiNome,
                                colaborador?.funcao,
                                colaborador?.matricula,
                                colaborador?.codigoFuncionario,
                                colaborador?.statusMobilizacao,
                                geral?.texto,
                                avaliacao?.matriz?.rotulo,
                            ]
                                .filter(Boolean)
                                .join(" ")
                        );

                    const bateBusca =
                        !buscaRelatorio ||
                        textoBusca.includes(
                            buscaRelatorio
                        );

                    const bateEmpresa =
                        empresaNormalizada === "todas" ||
                        empresasColaborador.includes(
                            empresaNormalizada
                        );

                    const bateClassificacao =
                        classificacaoNormalizada === "todos"
                            ? ![
                                  "Desmobilizado",
                                  "Inativo",
                              ].includes(
                                  geral.texto
                              )
                            : normalizarTextoBusca(
                                  geral.texto
                              ) ===
                              classificacaoNormalizada;

                    return (
                        bateBusca &&
                        bateEmpresa &&
                        bateClassificacao
                    );
                }
            );

        if (
            !colaboradoresFiltradosRelatorio.length
        ) {
            return false;
        }

        const pendencias = [];

        colaboradoresFiltradosRelatorio.forEach((c) => {
            const avaliacao = avaliarTreinamentosColaborador(c);
            const empresaBase = obterEmpresaRelatorio(c);
            const logoRaw = c.empresaLogoUrl || c.empresa_logo_url || empresaBase.logo_url || empresaBase.logoUrl || "";
            const logoUrl = logoRaw ? obterUrlLogoEmpresa(logoRaw) : "";

            avaliacao.itens
                .filter((item) => ["pendente", "vencido"].includes(item.status.chave))
                .forEach((item) => {
                    pendencias.push({
                        colaboradorId: c.id,
                        colaborador: c.nome,
                        codigo: c.codigoFuncionario,
                        empresaId: c.empresaId || empresaBase.id || c.empresa,
                        empresaNome: c.empresa || empresaBase.nome || "Empresa não informada",
                        empresaExibicao: c.empresaExibicao || c.empresa || empresaBase.nome || "",
                        empresaCnpj: c.empresaCnpj || empresaBase.cnpj || "",
                        empresaResponsavel: c.empresaResponsavel || empresaBase.responsavel || empresaBase.responsavel_auditoria || "",
                        empresaLogoUrl: logoUrl,
                        funcao: c.funcao,
                        statusMobilizacao: c.statusMobilizacao,
                        treinamento: item.treinamento.nome,
                        situacao: item.status.texto,
                        vencimento: item.realizado?.vencimento ? formatDate(item.realizado.vencimento) : "Sem certificado lançado",
                        base: item.treinamento.base || "",
                    });
                });
        });

        if (!pendencias.length) {
            return false;
        }

        const resultado =
            await baixarRelatorioPendenciasTreinamentosPDF({
                nomeArquivo: "relatorio-pendencias-treinamentos.pdf",
                titulo: "Relatório de pendências de treinamentos",
                contratanteCabecalho: obterContratanteIdealizaRelatorio(),
                pendencias,
                filtros: {
                    busca:
                        String(
                            filtrosRelatorio?.busca ||
                                ""
                        ).trim() ||
                        "-",

                    empresa:
                        empresaRelatorio,

                    classificacao:
                        classificacaoRelatorio,

                    colaboradoresFiltrados:
                        `${colaboradoresFiltradosRelatorio.length} colaborador(es)`,

                    pendenciasEncontradas:
                        `${pendencias.length} pendência(s)`,
                },
            });

        return resultado !== false;
    };

    const adicionar = async () => {
        if (!podeCadastrarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioCadastroColaboradores);
            return;
        }

        if (!novo.nome.trim() || !novo.empresaNome.trim() || !novo.funcao.trim()) {
            alert("Preencha nome, empresa terceirizada e função.");
            return;
        }

        setSalvando(true);

        const ok = await onAdicionarColaborador({
            nome: novo.nome.trim(),
            empresaNome: novo.empresaNome.trim(),
            funcao: novo.funcao.trim(),
            matricula: novo.matricula.trim(),
            cpf: novo.cpf.trim(),
            telefone: novo.telefone.trim(),
            contatoEmergenciaNome: novo.contatoEmergenciaNome.trim(),
            contatoEmergenciaParentesco: novo.contatoEmergenciaParentesco.trim(),
            contatoEmergenciaTelefone: novo.contatoEmergenciaTelefone.trim(),
            dataAdmissao: converterDataColaboradorParaIso(novo.dataAdmissao),
            dataNascimento: converterDataColaboradorParaIso(novo.dataNascimento),
            mostrarAniversarioDashboard: false,
            statusMobilizacao: novo.statusMobilizacao,
            treinamentosRemovidos: novo.treinamentosRemovidos || [],
            treinamentosAdicionais: novo.treinamentosAdicionais || [],
            foto: novo.foto,
            codigoFuncionario: gerarCodigoFuncionario(novo.nome),
        });

        setSalvando(false);

        if (ok) {
            setNovo({
                nome: "",
                empresaNome: "",
                funcao: "",
                matricula: "",
                cpf: "",
                telefone: "",
                contatoEmergenciaNome: "",
                contatoEmergenciaParentesco: "",
                contatoEmergenciaTelefone: "",
                dataAdmissao: "",
                dataNascimento: "",
                mostrarAniversarioDashboard: false,
                statusMobilizacao: obterStatusInicialColaborador(),
                treinamentosRemovidos: [],
                treinamentosAdicionais: [],
                foto: null,
            });
        }
    };

    const importarColaboradoresEmMassa = async (itens = []) => {
        if (!podeCadastrarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioCadastroColaboradores);
            return { sucesso: 0, erros: [mensagemBloqueioCadastroColaboradores] };
        }

        const lista = Array.isArray(itens) ? itens : [];

        if (lista.length === 0) {
            return { sucesso: 0, erros: ["Nenhum colaborador válido para importar."] };
        }

        setImportandoMassa(true);

        let sucesso = 0;
        const erros = [];

        try {
            const empresasPorId = new Map(
                (empresasBanco || [])
                    .filter((empresaItem) => String(empresaItem?.id || "").trim())
                    .map((empresaItem) => [String(empresaItem.id), empresaItem])
            );

            const empresasPorNomeNormalizado = new Map(
                (empresasBanco || [])
                    .filter((empresaItem) => String(empresaItem?.nome || "").trim())
                    .map((empresaItem) => [normalizarTextoBusca(empresaItem.nome), empresaItem])
            );

            for (const [indice, item] of lista.entries()) {
                const linha = item.linha || indice + 2;
                const empresaIdInformada = String(item.empresaId || item.empresa_id || "").trim();
                const empresaInformada = String(item.empresaNome || "").trim();
                const empresaExistente = empresaIdInformada
                    ? empresasPorId.get(empresaIdInformada)
                    : empresasPorNomeNormalizado.get(normalizarTextoBusca(empresaInformada));

                if (!empresaExistente) {
                    erros.push(`Linha ${linha}: empresa "${empresaInformada || "não informada"}" não encontrada no cadastro. Cadastre/corrija a empresa antes de importar.`);
                    continue;
                }

                const ok = await onAdicionarColaborador({
                    nome: String(item.nome || "").trim(),
                    empresaId: empresaExistente.id,
                    empresaNome: empresaExistente.nome,
                    funcao: String(item.funcao || "").trim(),
                    matricula: String(item.matricula || "").trim(),
                    cpf: String(item.cpf || "").trim(),
                    telefone: String(item.telefone || "").trim(),
                    contatoEmergenciaNome: String(item.contatoEmergenciaNome || "").trim(),
                    contatoEmergenciaParentesco: String(item.contatoEmergenciaParentesco || "").trim(),
                    contatoEmergenciaTelefone: String(item.contatoEmergenciaTelefone || "").trim(),
                    dataAdmissao: item.dataAdmissao || "",
                    dataNascimento: item.dataNascimento || "",
                    mostrarAniversarioDashboard: item.mostrarAniversarioDashboard !== false,
                    statusMobilizacao: item.statusMobilizacao || obterStatusInicialColaborador(),
                    treinamentosRemovidos: [],
                    treinamentosAdicionais: [],
                    foto: null,
                    codigoFuncionario: gerarCodigoFuncionario(item.nome),
                });

                if (ok) {
                    sucesso += 1;
                } else {
                    erros.push(`Linha ${linha}: não foi possível cadastrar este colaborador.`);
                }
            }

            if (typeof window !== "undefined") {
                if (erros.length) {
                    window.alert(
                        `Importação concluída com ressalvas.\n\nCadastrados: ${sucesso}\nNão cadastrados: ${erros.length}\n\n${erros.slice(0, 8).join("\n")}`
                    );
                } else {
                    window.alert(`Importação concluída. ${sucesso} colaborador(es) cadastrado(s).`);
                }
            }

            return { sucesso, erros };
        } finally {
            setImportandoMassa(false);
        }
    };

    const enviarFotosColaboradoresEmMassa = async (itens = []) => {
        if (!podeUploadColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioUploadColaboradores);
            return { sucesso: 0, erros: [mensagemBloqueioUploadColaboradores] };
        }

        if (!podeEditarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioEdicaoColaboradores);
            return { sucesso: 0, erros: [mensagemBloqueioEdicaoColaboradores] };
        }

        const lista = Array.isArray(itens) ? itens : [];

        if (lista.length === 0) {
            return { sucesso: 0, erros: ["Nenhuma foto válida para enviar."] };
        }

        setImportandoFotosMassa(true);

        let sucesso = 0;
        const erros = [];

        try {
            for (const [indice, item] of lista.entries()) {
                const colaborador = item.colaborador || {};
                const arquivo = item.arquivo;
                const nomeReferencia = colaborador.nome || arquivo?.name || `foto ${indice + 1}`;

                if (!colaborador.id || !arquivo) {
                    erros.push(`${nomeReferencia}: colaborador ou arquivo inválido.`);
                    continue;
                }

                const ok = await onAtualizarColaborador?.({
                    ...colaborador,
                    id: colaborador.id,
                    nome: colaborador.nome || "",
                    empresaNome: colaborador.empresa || colaborador.empresaNome || "",
                    funcao: colaborador.funcao || "",
                    matricula: colaborador.matriculaEsocial || colaborador.matricula || "",
                    cpf: colaborador.cpf || "",
                    telefone: colaborador.telefone || "",
                    contatoEmergenciaNome: colaborador.contatoEmergenciaNome || "",
                    contatoEmergenciaParentesco: colaborador.contatoEmergenciaParentesco || "",
                    contatoEmergenciaTelefone: colaborador.contatoEmergenciaTelefone || "",
                    dataAdmissao: colaborador.dataAdmissao || "",
                    dataNascimento: colaborador.dataNascimento || "",
                    mostrarAniversarioDashboard: colaborador.mostrarAniversarioDashboard !== false,
                    status: colaborador.status || "Ativo",
                    statusMobilizacao: colaborador.statusMobilizacao || obterStatusInicialColaborador(),
                    treinamentosRemovidos: colaborador.treinamentosRemovidos || [],
                    treinamentosAdicionais: colaborador.treinamentosAdicionais || [],
                    fotoAtual: obterFotoColaboradorSrc(colaborador),
                    fotoNomeAtual: colaborador.fotoNome || colaborador.foto_nome || "",
                    foto: arquivo,
                });

                if (ok) {
                    sucesso += 1;
                } else {
                    erros.push(`${nomeReferencia}: não foi possível atualizar a foto.`);
                }
            }

            if (typeof window !== "undefined") {
                if (erros.length) {
                    window.alert(
                        `Envio de fotos concluído com ressalvas.

Enviadas: ${sucesso}
Não enviadas: ${erros.length}

${erros.slice(0, 8).join("\n")}`
                    );
                } else {
                    window.alert(`Envio de fotos concluído. ${sucesso} foto(s) atualizada(s).`);
                }
            }

            return { sucesso, erros };
        } finally {
            setImportandoFotosMassa(false);
        }
    };

    const funcoesSugeridas = obterTodasMatrizesFuncao().filter((item) => item.chave !== "geral");
    void versaoFuncoes;

    const idsBaseNovo = novo.funcao
        ? treinamentosObrigatoriosFuncao(novo.funcao).map((treinamento) => Number(treinamento.id))
        : [];
    const idsRemovidosNovo = (novo.treinamentosRemovidos || []).map(Number);
    const idsAdicionaisNovo = (novo.treinamentosAdicionais || []).map(Number);
    const idsAplicadosNovo = Array.from(new Set([...idsBaseNovo, ...idsAdicionaisNovo])).filter(
        (id) => !idsRemovidosNovo.includes(Number(id))
    );
    const treinamentosAplicadosNovo = idsAplicadosNovo.map((id) => obterTreinamento(id)).filter(Boolean);
    const treinamentosParaAdicionarNovo = treinamentosBase.filter(
        (treinamento) => !idsAplicadosNovo.includes(Number(treinamento.id))
    );


    const atualizarNovoColaboradorRecolhido = (valorOuFuncao) => {
        setNovoColaboradorRecolhido((atual) => {
            const novoValor = typeof valorOuFuncao === "function" ? valorOuFuncao(atual) : valorOuFuncao;
            return salvarPreferenciaPainelBoolean(CHAVE_NOVO_COLABORADOR_RECOLHIDO, novoValor);
        });
    };

    const atualizarInformacoesColaboradoresRecolhidas = (valorOuFuncao) => {
        setInformacoesColaboradoresRecolhidas((atual) => {
            const novoValor = typeof valorOuFuncao === "function" ? valorOuFuncao(atual) : valorOuFuncao;
            return salvarPreferenciaPainelBoolean(CHAVE_INFO_COLABORADORES_RECOLHIDA, novoValor);
        });
    };

    const removerTreinamentoNovo = (treinamentoId) => {
        const id = Number(treinamentoId);
        const baseDaFuncao = idsBaseNovo.includes(id);

        if (baseDaFuncao) {
            setNovo({
                ...novo,
                treinamentosRemovidos: Array.from(new Set([...idsRemovidosNovo, id])),
            });
            return;
        }

        setNovo({
            ...novo,
            treinamentosAdicionais: idsAdicionaisNovo.filter((item) => item !== id),
        });
    };

    const adicionarTreinamentoNovo = (treinamentoId) => {
        const id = Number(treinamentoId);
        if (!id) return;

        if (idsBaseNovo.includes(id)) {
            setNovo({
                ...novo,
                treinamentosRemovidos: idsRemovidosNovo.filter((item) => item !== id),
            });
            return;
        }

        setNovo({
            ...novo,
            treinamentosAdicionais: Array.from(new Set([...idsAdicionaisNovo, id])),
        });
    };

    const salvarNovaFuncao = async () => {
        if (!podeEditarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioEdicaoColaboradores);
            return;
        }

        const rotulo = novaFuncao.rotulo.trim().toUpperCase();

        if (!rotulo) {
            alert("Informe o nome da função.");
            return;
        }

        if (!novaFuncao.treinamentos.length) {
            alert("Selecione pelo menos um treinamento/documento obrigatório.");
            return;
        }

        const funcaoJaExiste = obterTodasMatrizesFuncao().some(
            (item) =>
                item.chave !== "geral" &&
                normalizarTextoBusca(item.rotulo || "") === normalizarTextoBusca(rotulo)
        );

        if (funcaoJaExiste) {
            alert("Já existe uma função com esse nome. Use o botão Ajustar funções.");
            return;
        }

        const listaAtual = obterFuncoesPersonalizadasSalvas();
        const chave = `custom-${normalizarTextoBusca(rotulo).replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
        const termosInformados = novaFuncao.termos
            .split(",")
            .map((termo) => termo.trim())
            .filter(Boolean);

        const nova = {
            chave,
            rotulo,
            termos: Array.from(new Set([rotulo, ...termosInformados])),
            treinamentos: novaFuncao.treinamentos.map(Number),
            tipo: "personalizada",
            ativa: true,
        };

        try {
            await salvarFuncaoTreinamentosRemota({
                funcao: nova,
            });

            const resultadoRemoto = await carregarFuncoesTreinamentosRemotas();

            definirFuncoesTreinamentosRemotas(
                resultadoRemoto.funcoes
            );

            salvarFuncoesPersonalizadas(
                listaAtual.filter(
                    (item) =>
                        item?.chave !== chave &&
                        normalizarTextoBusca(item?.rotulo || "") !== normalizarTextoBusca(rotulo)
                )
            );

            alert("Função criada e salva para todos os computadores.");
        } catch (error) {
            salvarFuncoesPersonalizadas([
                ...listaAtual.filter(
                    (item) =>
                        normalizarTextoBusca(item?.rotulo || "") !== normalizarTextoBusca(rotulo)
                ),
                nova,
            ]);

            alert(
                `A função foi salva somente neste computador porque a estrutura remota ainda não está disponível. ${error?.message || ""}`.trim()
            );
        }

        setVersaoFuncoes((valor) => valor + 1);
        setNovaFuncao({ rotulo: "", termos: "", treinamentos: [...treinamentosBaseObra, 13] });
        setModalFuncaoAberto(false);
    };

    const abrirRevisaoColaborador = (colaborador) => {
        if (!podeEditarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioEdicaoColaboradores);
            return;
        }

        setColaboradorEdicao({
            id: colaborador.id,
            nome: colaborador.nome || "",
            empresaNome: colaborador.empresa || "",
            funcao: colaborador.funcao || "",
            matricula: colaborador.matricula === "-" ? "" : colaborador.matricula || "",
            cpf: colaborador.cpf || "",
            telefone: colaborador.telefone || "",
            contatoEmergenciaNome: colaborador.contatoEmergenciaNome || "",
            contatoEmergenciaParentesco: colaborador.contatoEmergenciaParentesco || "",
            contatoEmergenciaTelefone: colaborador.contatoEmergenciaTelefone || "",
            dataAdmissao: colaborador.dataAdmissao || "",
            dataDesligamento: colaborador.dataDesligamento || "",
            dataDemissao: colaborador.dataDemissao || "",
            dataNascimento: colaborador.dataNascimento || "",
            mostrarAniversarioDashboard: colaborador.mostrarAniversarioDashboard !== false,
            codigoFuncionario: colaborador.codigoFuncionario || "",
            status: colaborador.status || "Ativo",
            statusMobilizacao: colaborador.statusMobilizacao || obterStatusInicialColaborador(),
            treinamentosRemovidos: colaborador.treinamentosRemovidos || [],
            treinamentosAdicionais: colaborador.treinamentosAdicionais || [],
            fotoAtual: obterFotoColaboradorSrc(colaborador),
            fotoNomeAtual: colaborador.fotoNome || "",
            foto: null,
        });
    };


    const podeExcluirColaboradoresSistema = useMemo(
        () => usuarioPodeExcluirSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.COLABORADORES),
        [permissaoSistemaAtual]
    );

    const podeCadastrarColaboradoresSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.COLABORADORES, ACOES_PERMISSAO_SISTEMA.CADASTRAR),
        [permissaoSistemaAtual]
    );

    const podeEditarColaboradoresSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.COLABORADORES, ACOES_PERMISSAO_SISTEMA.EDITAR),
        [permissaoSistemaAtual]
    );

    const podeUploadColaboradoresSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.COLABORADORES, ACOES_PERMISSAO_SISTEMA.UPLOAD),
        [permissaoSistemaAtual]
    );

    const podeExportarColaboradoresSistema = useMemo(
        () => usuarioPodeExecutarAcaoSistema(permissaoSistemaAtual, MODULOS_PERMISSAO_SISTEMA.COLABORADORES, ACOES_PERMISSAO_SISTEMA.EXPORTAR),
        [permissaoSistemaAtual]
    );

    const mensagemBloqueioCadastroColaboradores = "Sem permissão para cadastrar colaboradores.";
    const mensagemBloqueioEdicaoColaboradores = "Sem permissão para editar dados de colaboradores.";
    const mensagemBloqueioUploadColaboradores = "Sem permissão para enviar treinamentos de colaboradores.";
    const mensagemBloqueioExportacaoColaboradores = "Sem permissão para exportar relatórios de colaboradores.";
    const mensagemBloqueioExclusaoColaboradores = "Sem permissão para excluir colaboradores.";

    const enviarTreinamentoColaboradorSeguro = (colaborador) => {
        if (!podeUploadColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioUploadColaboradores);
            return;
        }

        onEnviarTreinamento(colaborador);
    };

    const atualizarColaboradorSeguro = async (...args) => {
        if (!podeEditarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioEdicaoColaboradores);
            return false;
        }

        return onAtualizarColaborador?.(...args);
    };

    const solicitarExclusaoColaborador = (colaborador) => {
        if (!podeExcluirColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExclusaoColaboradores);
            return;
        }

        setColaboradorExclusao(colaborador);
    };

    const cancelarExclusaoColaborador = () => {
        setColaboradorExclusao(null);
    };

    const confirmarExclusaoColaborador = async () => {
        if (!colaboradorExclusao) return;

        if (!podeExcluirColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExclusaoColaboradores);
            setColaboradorExclusao(null);
            return;
        }

        const alvo = colaboradorExclusao;
        setColaboradorExclusao(null);
        await onExcluirColaborador(alvo);
    };


    return (
        <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                className="hero-integrated-page-header hero-header--colaboradores"
                titulo="Colaboradores"
                subtitulo={null}
                acao={
                    <div className="colaboradores-header-acoes flex flex-wrap gap-2">
                        <button
                            onClick={onAtualizarBanco}
                            className="colaboradores-header-acao colaboradores-header-acao--secundaria inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <RefreshCw className={classNames("h-4 w-4", carregandoBanco && "animate-spin")} />
                            Atualizar banco
                        </button>

                        <button
                            onClick={() => {
                                if (!podeEditarColaboradoresSistema) {
                                    if (typeof window !== "undefined") window.alert(mensagemBloqueioEdicaoColaboradores);
                                    return;
                                }
                                setModalFuncaoAberto(true);
                            }}
                            disabled={!podeEditarColaboradoresSistema}
                            title={podeEditarColaboradoresSistema ? "Nova função" : mensagemBloqueioEdicaoColaboradores}
                            className="colaboradores-header-acao colaboradores-header-acao--primaria inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus className="h-4 w-4" />
                            Nova função
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (!podeEditarColaboradoresSistema) {
                                    if (typeof window !== "undefined") window.alert(mensagemBloqueioEdicaoColaboradores);
                                    return;
                                }

                                setModalAjustarFuncoesAberto(true);
                            }}
                            disabled={!podeEditarColaboradoresSistema}
                            title={podeEditarColaboradoresSistema ? "Ajustar funções" : mensagemBloqueioEdicaoColaboradores}
                            className="colaboradores-header-acao colaboradores-header-acao--secundaria inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Settings2 className="h-4 w-4" />
                            Ajustar funções
                        </button>
                    </div>
                }
            />

            <section className="colaboradores-hero-banner">
                <div className="colaboradores-hero-banner__bg" />
                <div className="colaboradores-hero-banner__overlay" />
                <div className="colaboradores-hero-banner__content">
                    <div className="min-w-0">
                        <p className="colaboradores-hero-banner__eyebrow">SAFESCAN BRASIL</p>
                        <h2 className="colaboradores-hero-banner__title">
                            Gestão de colaboradores e treinamentos
                        </h2>
                        <p className="colaboradores-hero-banner__text">
                            Controle colaboradores, treinamentos, vencimentos e QR Code em uma visão única.
                        </p>
                        <div className="colaboradores-hero-banner__line" />
                    </div>

                    <div
                        className="colaboradores-hero-banner__date"
                        aria-label={`Data e hora atuais: ${dataHoraHeroColaboradores.data}, ${dataHoraHeroColaboradores.diaSemana}, ${dataHoraHeroColaboradores.hora}`}
                    >
                        <CalendarClock className="h-4 w-4" />
                        <span>{dataHoraHeroColaboradores.data}</span>
                        <span aria-hidden="true">•</span>
                        <span>{dataHoraHeroColaboradores.diaSemana}</span>
                        <span aria-hidden="true">•</span>
                        <span>{dataHoraHeroColaboradores.hora}</span>
                    </div>

                    <div className="colaboradores-hero-banner__stats">
                        <div className="colaboradores-hero-banner__stat">
                            <Users className="h-4 w-4 text-emerald-300" />
                            <span>{
    colaboradores.filter(
        (colaborador) =>
            ![
                "Desmobilizado",
                "Inativo",
            ].includes(
                statusGeral(
                    colaborador
                ).texto
            )
    ).length
} colaboradores</span>
                        </div>
                        <div className="colaboradores-hero-banner__stat">
                            <ShieldCheck className="h-4 w-4 text-emerald-300" />
                            <span>{resumoTreinamentos.liberados} liberados</span>
                        </div>
                        <div className="colaboradores-hero-banner__stat">
                            <AlertTriangle className="h-4 w-4 text-amber-300" />
                            <span>{resumoTreinamentos.pendentes + resumoTreinamentos.vencidos} pendências</span>
                        </div>
                    </div>
                </div>
            </section>

            {erroBanco && (
                <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {erroBanco}
                </div>
            )}

            {permissaoSistemaAtual && (!podeCadastrarColaboradoresSistema || !podeEditarColaboradoresSistema || !podeUploadColaboradoresSistema || !podeExportarColaboradoresSistema) && (
                <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                    Perfil atual: {permissaoSistemaAtual.perfil}. Algumas ações de Colaboradores estão bloqueadas visualmente conforme o perfil cadastrado.
                </div>
            )}

            <div className="space-y-6">
                <section className="colaboradores-section-destaque">
                    {!novoColaboradorRecolhido ? (
                        <div
                            onClick={(evento) => {
                                const alvoInterativo = evento.target.closest?.(
                                    "button, a, input, select, textarea, label, table, [role='button'], [data-colaboradores-nao-alternar]"
                                );

                                if (alvoInterativo) return;

                                const cabecalho = evento.currentTarget.querySelector("[data-colaboradores-card-cabecalho='novo']");
                                if (cabecalho && !cabecalho.contains(evento.target)) return;

                                atualizarNovoColaboradorRecolhido(true);
                            }}
                            className="colaborador-formulario-full colaborador-formulario-unificado colaboradores-card-aberto-padrao colaboradores-card-aberto-padrao--novo"
                        >
                            <div data-colaboradores-card-cabecalho="novo" className="novo-colaborador-cabecalho-branco">
                                <div className="novo-colaborador-cabecalho-branco__info">
                                    <div className="novo-colaborador-cabecalho-branco__icone">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="novo-colaborador-cabecalho-branco__etiqueta">Cadastro</p>
                                        <h2 className="novo-colaborador-cabecalho-branco__titulo">Novo colaborador</h2>
                                        <p className="novo-colaborador-cabecalho-branco__subtitulo">
                                            Foto, código automático e matriz de treinamentos por função.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={(evento) => {
                                        evento.stopPropagation();
                                        atualizarNovoColaboradorRecolhido(true);
                                    }}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                    Recolher
                                </button>
                            </div>

                            <FormularioNovoColaborador
                                novo={novo}
                                setNovo={setNovo}
                                empresasBanco={empresasBanco}
                                funcoesSugeridas={funcoesSugeridas}
                                treinamentosAplicadosNovo={treinamentosAplicadosNovo}
                                treinamentosParaAdicionarNovo={treinamentosParaAdicionarNovo}
                                idsAdicionaisNovo={idsAdicionaisNovo}
                                removerTreinamentoNovo={removerTreinamentoNovo}
                                adicionarTreinamentoNovo={adicionarTreinamentoNovo}
                                adicionar={adicionar}
                                salvando={salvando}
                            />
                        </div>
                    ) : (
                        <div
                            onClick={(evento) => {
                                const alvoInterativo = evento.target.closest?.(
                                    "button, a, input, select, textarea, label, table, [role='button'], [data-colaboradores-nao-alternar]"
                                );

                                if (alvoInterativo) return;

                                atualizarNovoColaboradorRecolhido(false);
                            }}
                        >
                            <Card className="colaborador-formulario-recolhido colaboradores-card-recolhido-padrao colaboradores-card-recolhido-padrao--novo border-blue-100 bg-blue-50/40">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="novo-colaborador-cabecalho-branco__icone shrink-0">
                                        <Users className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wide text-blue-700">Cadastro</p>
                                        <h2 className="mt-1 text-lg font-black text-slate-950">Novo colaborador</h2>
                                        <p className="mt-1 text-sm leading-6 text-slate-600">
                                            Formulário recolhido para deixar a tela mais compacta. Clique em abrir para cadastrar novo funcionário.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(evento) => {
                                        evento.stopPropagation();
                                        atualizarNovoColaboradorRecolhido(false);
                                    }}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                    Abrir
                                </button>
                            </div>
                        </Card>
                        </div>
                    )}
                </section>

                <div onClick={(evento) => {
                    const alvoInterativo = evento.target.closest?.(
                        "button, a, input, select, textarea, label, table, [role='button'], [data-colaboradores-nao-alternar]"
                    );

                    if (alvoInterativo) return;

                    if (!cadastroMassaRecolhido) {
                        const cabecalho = evento.currentTarget.querySelector("[data-colaboradores-card-cabecalho='massa']");
                        if (cabecalho && !cabecalho.contains(evento.target)) return;
                    }

                    setCadastroMassaRecolhido((atual) =>
                        salvarPreferenciaPainelBoolean(CHAVE_CADASTRO_MASSA_RECOLHIDO, !atual)
                    );
                }}>
                <Card
                        className={classNames(
                            "colaboradores-cadastro-massa-card border-blue-100 bg-white",
                            cadastroMassaRecolhido && "colaboradores-card-recolhido-padrao colaboradores-card-recolhido-padrao--massa",
                            !cadastroMassaRecolhido && "colaboradores-card-aberto-padrao colaboradores-card-aberto-padrao--massa"
                        )}
                    >
                    <div data-colaboradores-card-cabecalho="massa" className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${cadastroMassaRecolhido ? "mb-0 border-b-0 pb-0" : "mb-4 border-b border-slate-100 pb-4"}`}>
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                                <Upload className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-wide text-blue-700">Cadastro em massa</p>
                                <h2 className="mt-1 text-xl font-black text-slate-950">Importações em lote</h2>
                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    Importe colaboradores por planilha ou envie fotos dos colaboradores em massa.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={(evento) => {
                                evento.stopPropagation();
                                setCadastroMassaRecolhido((atual) =>
                                    salvarPreferenciaPainelBoolean(CHAVE_CADASTRO_MASSA_RECOLHIDO, !atual)
                                );
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800"
                        >
                            {cadastroMassaRecolhido ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            {cadastroMassaRecolhido ? "Abrir" : "Recolher"}
                        </button>
                    </div>

                    {!cadastroMassaRecolhido && (
                        <div className="space-y-4">
                            <ImportacaoMassaColaboradores
                                colaboradores={colaboradores}
                                empresasBanco={empresasBanco}
                                podeCadastrar={podeCadastrarColaboradoresSistema}
                                mensagemBloqueio={mensagemBloqueioCadastroColaboradores}
                                onImportar={importarColaboradoresEmMassa}
                                importando={importandoMassa}
                            />

                            <ImportacaoFotosMassaColaboradores
                                colaboradores={colaboradores}
                                podeEnviar={podeUploadColaboradoresSistema && podeEditarColaboradoresSistema}
                                mensagemBloqueio={
                                    !podeUploadColaboradoresSistema
                                        ? mensagemBloqueioUploadColaboradores
                                        : mensagemBloqueioEdicaoColaboradores
                                }
                                onEnviarFotos={enviarFotosColaboradoresEmMassa}
                                enviando={importandoFotosMassa}
                            />
                        </div>
                    )}
                </Card>
                </div>

                <div onClick={(evento) => {
                    const alvoInterativo = evento.target.closest?.(
                        "button, a, input, select, textarea, label, table, [role='button'], [data-colaboradores-nao-alternar]"
                    );

                    if (alvoInterativo) return;

                    if (!informacoesColaboradoresRecolhidas) {
                        const cabecalho = evento.currentTarget.querySelector("[data-colaboradores-card-cabecalho='informacoes']");
                        if (cabecalho && !cabecalho.contains(evento.target)) return;
                    }

                    atualizarInformacoesColaboradoresRecolhidas((valor) => !valor);
                }}>
                <Card
                        className={classNames(
                            "colaboradores-info-card",
                            informacoesColaboradoresRecolhidas && "colaboradores-info-card-recolhido colaboradores-card-recolhido-padrao colaboradores-card-recolhido-padrao--info",
                            !informacoesColaboradoresRecolhidas && "colaboradores-card-aberto-padrao colaboradores-card-aberto-padrao--info"
                        )}
                    >
                    <div data-colaboradores-card-cabecalho="informacoes" className={`flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between ${informacoesColaboradoresRecolhidas ? "mb-0 border-b-0 pb-0" : "mb-5 border-b border-slate-100 pb-4"}`}>
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                                <Users className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-wide text-blue-700">Base de colaboradores</p>
                                <h2 className="mt-1 text-xl font-black text-slate-950">Informações dos funcionários</h2>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Consulte status, pendências, QR Code, treinamentos e dados cadastrais em um bloco único destacado.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={(evento) => {
                                evento.stopPropagation();
                                atualizarInformacoesColaboradoresRecolhidas((valor) => !valor);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800"
                        >
                            {informacoesColaboradoresRecolhidas ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            {informacoesColaboradoresRecolhidas ? "Abrir" : "Recolher"}
                        </button>
                    </div>

                    {informacoesColaboradoresRecolhidas ? null : (
                        <>
                    <div className="mb-4 flex flex-col gap-3 lg:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                placeholder="Buscar por nome, empresa, função, matrícula ou código"
                                className="w-full rounded-2xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            />
                        </div>

                        <div className="relative min-w-56">
                            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={empresa}
                                onChange={(e) => {
                                    setEmpresa(
                                        e.target.value
                                    );

                                    setFiltroFuncao(
                                        "Todas"
                                    );
                                }}
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                {empresasFiltro.map((e) => (
                                    <option key={e}>{e}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative min-w-56">
                            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={filtroFuncao}
                                onChange={(e) =>
                                    setFiltroFuncao(
                                        e.target.value
                                    )
                                }
                                aria-label="Filtrar por função"
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                {funcoesFiltro.map(
                                    (funcao) => (
                                        <option
                                            key={funcao}
                                            value={funcao}
                                        >
                                            {funcao === "Todas"
                                                ? "Todas as funções"
                                                : funcao}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        <div className="relative min-w-56">
                            <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={filtroClassificacao}
                                onChange={(e) => {
                                    setFiltroStatusRapidoAtivo(
                                        null
                                    );

                                    setFiltroClassificacao(
                                        e.target.value
                                    );
                                }}
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                <option value="Todos">Todos os status</option>
                                {STATUS_CLASSIFICACAO_COLABORADOR.map((status) => (
                                        <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative min-w-56">
                            <select
                                value={ordenacaoFuncionarios}
                                onChange={(e) => setOrdenacaoFuncionarios(e.target.value)}
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                <option value="nome_az">Nome A-Z</option>
                                <option value="nome_za">Nome Z-A</option>
                            </select>
                        </div>
                    </div>

                    <div className="colaboradores-status-grid colaboradores-status-grid--premium mb-4">
                        <button
                            type="button"
                            onClick={() => aplicarFiltroStatusRapido("Total")}
                            aria-pressed={filtroStatusRapidoAtivo === "Total"}
                            title="Mostrar todos os colaboradores"
                            className={classNames(
                                "colaborador-status-card flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-slate-50 p-3 text-center transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:ring-offset-2",
                                filtroStatusRapidoAtivo === "Total" &&
                                    "ring-2 ring-slate-600 ring-offset-2 shadow-md"
                            )}
                        >
                            <p className="text-xs font-medium text-slate-500">
                                Total
                            </p>

                            <p className="text-2xl font-bold text-slate-950">
                                {resumoStatusEmpresaSelecionada.total}
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => aplicarFiltroStatusRapido("Liberado")}
                            aria-pressed={filtroStatusRapidoAtivo === "Liberado"}
                            title="Mostrar somente colaboradores liberados"
                            className={classNames(
                                "colaborador-status-card flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-emerald-50 p-3 text-center transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2",
                                filtroStatusRapidoAtivo === "Liberado" &&
                                    "ring-2 ring-emerald-600 ring-offset-2 shadow-md"
                            )}
                        >
                            <p className="text-xs font-medium text-emerald-700">
                                Liberados
                            </p>

                            <p className="text-2xl font-bold text-emerald-700">
                                {resumoStatusEmpresaSelecionada.liberados}
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => aplicarFiltroStatusRapido("Com pendência")}
                            aria-pressed={filtroStatusRapidoAtivo === "Com pendência"}
                            title="Mostrar somente colaboradores com pendência"
                            className={classNames(
                                "colaborador-status-card flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-blue-50 p-3 text-center transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
                                filtroStatusRapidoAtivo === "Com pendência" &&
                                    "ring-2 ring-blue-600 ring-offset-2 shadow-md"
                            )}
                        >
                            <p className="text-xs font-medium text-blue-700">
                                Com pendência
                            </p>

                            <p className="text-2xl font-bold text-blue-700">
                                {resumoStatusEmpresaSelecionada.comPendencia}
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => aplicarFiltroStatusRapido("Bloqueado")}
                            aria-pressed={filtroStatusRapidoAtivo === "Bloqueado"}
                            title="Mostrar somente colaboradores bloqueados"
                            className={classNames(
                                "colaborador-status-card flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-red-50 p-3 text-center transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2",
                                filtroStatusRapidoAtivo === "Bloqueado" &&
                                    "ring-2 ring-red-600 ring-offset-2 shadow-md"
                            )}
                        >
                            <p className="text-xs font-medium text-red-700">
                                Bloqueados
                            </p>

                            <p className="text-2xl font-bold text-red-700">
                                {resumoStatusEmpresaSelecionada.bloqueados}
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => aplicarFiltroStatusRapido("Em análise")}
                            aria-pressed={filtroStatusRapidoAtivo === "Em análise"}
                            title="Mostrar somente colaboradores em análise"
                            className={classNames(
                                "colaborador-status-card flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-violet-50 p-3 text-center transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2",
                                filtroStatusRapidoAtivo === "Em análise" &&
                                    "ring-2 ring-violet-600 ring-offset-2 shadow-md"
                            )}
                        >
                            <p className="text-xs font-medium text-violet-700">
                                Em análise
                            </p>

                            <p className="text-2xl font-bold text-violet-700">
                                {resumoStatusEmpresaSelecionada.emAnalise}
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => aplicarFiltroStatusRapido("Desmobilizado")}
                            aria-pressed={filtroStatusRapidoAtivo === "Desmobilizado"}
                            title="Mostrar somente colaboradores desmobilizados"
                            className={classNames(
                                "colaborador-status-card flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-slate-100 p-3 text-center transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 focus-visible:ring-offset-2",
                                filtroStatusRapidoAtivo === "Desmobilizado" &&
                                    "ring-2 ring-slate-600 ring-offset-2 shadow-md"
                            )}
                        >
                            <p className="text-xs font-medium text-slate-700">
                                Desmobilizados
                            </p>

                            <p className="text-2xl font-bold text-slate-700">
                                {resumoStatusEmpresaSelecionada.desmobilizados}
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => aplicarFiltroStatusRapido("Inativo")}
                            aria-pressed={filtroStatusRapidoAtivo === "Inativo"}
                            title="Mostrar somente colaboradores inativos"
                            className={classNames(
                                "colaborador-status-card flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200 transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2",
                                filtroStatusRapidoAtivo === "Inativo" &&
                                    "ring-2 ring-slate-700 ring-offset-2 shadow-md"
                            )}
                        >
                            <p className="text-xs font-medium text-slate-700">
                                Inativos
                            </p>

                            <p className="text-2xl font-bold text-slate-700">
                                {resumoStatusEmpresaSelecionada.inativos}
                            </p>
                        </button>

                        <button
                            type="button"
                            onClick={() => aplicarFiltroStatusRapido("A vencer")}
                            aria-pressed={filtroStatusRapidoAtivo === "A vencer"}
                            title="Mostrar colaboradores com treinamentos a vencer"
                            className={classNames(
                                "colaborador-status-card colaborador-status-card--a-vencer flex min-h-[92px] cursor-pointer flex-col items-center justify-center rounded-2xl bg-amber-50 p-3 text-center transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2",
                                filtroStatusRapidoAtivo === "A vencer" &&
                                    "ring-2 ring-amber-600 ring-offset-2 shadow-md"
                            )}
                        >
                            <p className="text-xs font-medium text-amber-700">
                                A vencer
                            </p>

                            <p className="text-2xl font-bold text-amber-700">
                                {resumoStatusEmpresaSelecionada.aVencer}
                            </p>
                        </button>
                    </div>

                    <div className="mb-4 flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-4">
                        <button
                            onClick={() =>
                                setRelatorioColaboradoresFiltrosAberto(
                                    true
                                )
                            }
                            disabled={!podeExportarColaboradoresSistema}
                            title={
                                exportandoPdfColaboradores
                                    ? "Gerando PDF de colaboradores..."
                                    : podeExportarColaboradoresSistema
                                        ? "Baixar PDF colaboradores"
                                        : mensagemBloqueioExportacaoColaboradores
                            }
                            aria-busy={exportandoPdfColaboradores}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {exportandoPdfColaboradores ? (
                                <RefreshCw
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Download
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                />
                            )}
                            Baixar PDF colaboradores
                        </button>
                        <button
                            onClick={() =>
                                setRelatorioPendenciasTreinamentosFiltrosAberto(
                                    true
                                )
                            }
                            disabled={!podeExportarColaboradoresSistema}
                            title={podeExportarColaboradoresSistema ? "Baixar PDF pendências" : mensagemBloqueioExportacaoColaboradores}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Baixar PDF pendências
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setRelatorioControleFichasEpiFiltrosAberto(
                                    true
                                )
                            }
                            disabled={!podeExportarColaboradoresSistema}
                            title={
                                podeExportarColaboradoresSistema
                                    ? "Baixar controle de Fichas de EPI"
                                    : mensagemBloqueioExportacaoColaboradores
                            }
                            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FileText className="h-4 w-4" />
                            Controle Fichas EPI
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                setRelatorioPendenciasCadastraisAberto(
                                    true
                                )
                            }
                            disabled={!podeExportarColaboradoresSistema}
                            title={
                                podeExportarColaboradoresSistema
                                    ? "Conferir informações não preenchidas do cadastro"
                                    : mensagemBloqueioExportacaoColaboradores
                            }
                            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Users className="h-4 w-4" />
                            Relatório cadastral
                        </button>
                    </div>

                    {relatorioColaboradoresFiltrosAberto && (
                        <RelatorioColaboradoresFiltrosModal
                            empresas={
                                empresasFiltro
                            }
                            classificacoes={[
                                "Liberado",
                                "Em análise",
                                "Com pendência",
                                "A vencer",
                                "Bloqueado",
                                "Desmobilizado",
                                "Inativo",
                            ]}
                            onFechar={() =>
                                setRelatorioColaboradoresFiltrosAberto(
                                    false
                                )
                            }
                            onGerar={
                                baixarRelatorioColaboradores
                            }
                        />
                    )}
                    {relatorioPendenciasTreinamentosFiltrosAberto && (
                        <RelatorioPendenciasTreinamentosFiltrosModal
                            empresas={empresasFiltro}
                            classificacoes={[
                                "Liberado",
                                "Em análise",
                                "Com pendência",
                                "A vencer",
                                "Bloqueado",
                                "Desmobilizado",
                                "Inativo",
                            ]}
                            onFechar={() =>
                                setRelatorioPendenciasTreinamentosFiltrosAberto(
                                    false
                                )
                            }
                            onGerar={
                                baixarRelatorioPendencias
                            }
                        />
                    )}
                    {relatorioControleFichasEpiFiltrosAberto && (
                        <RelatorioControleFichasEpiFiltrosModal
                            aberto={true}
                            empresas={
                                Array.from(
                                    new Set(
                                        colaboradores
                                            .filter(
                                                (colaborador) =>
                                                    ![
                                                        "Desmobilizado",
                                                        "Inativo",
                                                    ].includes(
                                                        statusGeral(
                                                            colaborador
                                                        ).texto
                                                    )
                                            )
                                            .map(
                                                (colaborador) =>
                                                    String(
                                                        colaborador?.empresaNome ||
                                                            colaborador?.empresa?.nome ||
                                                            (
                                                                typeof colaborador?.empresa ===
                                                                "string"
                                                                    ? colaborador.empresa
                                                                    : ""
                                                            ) ||
                                                            ""
                                                    ).trim()
                                            )
                                            .filter(Boolean)
                                    )
                                ).sort(
                                    (a, b) =>
                                        a.localeCompare(
                                            b,
                                            "pt-BR",
                                            {
                                                sensitivity:
                                                    "base",
                                            }
                                        )
                                )
                            }
                            onFechar={() =>
                                setRelatorioControleFichasEpiFiltrosAberto(
                                    false
                                )
                            }
                            onGerar={
                                baixarRelatorioControleFichasEpi
                            }
                        />
                    )}
                    {relatorioPendenciasCadastraisAberto && (
                        <RelatorioPendenciasCadastraisModal
                            colaboradores={filtrados}
                            contratanteCabecalho={obterContratanteIdealizaRelatorio()}
                            filtros={{
                                busca:
                                    busca.trim(),
                                empresa,
                                classificacao:
                                    filtroClassificacao,
                                filtroRapido:
                                    filtroStatusRapidoAtivo ||
                                    "",
                            }}
                            onClose={() =>
                                setRelatorioPendenciasCadastraisAberto(
                                    false
                                )
                            }
                        />
                    )}

                    {carregandoBanco && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                            Carregando colaboradores do Supabase...
                        </div>
                    )}

                    {!carregandoBanco && filtrados.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Users className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhum colaborador encontrado</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Cadastre o primeiro colaborador no formulário ao lado.
                            </p>
                        </div>
                    )}

                    <div className="colaboradores-lista-grid grid gap-4">
                        {!carregandoBanco &&
                            filtrados.map((c, index) => {
                                const geral = statusGeral(c);
                                const avaliacao = avaliarTreinamentosColaborador(c);
                                const totalTreinamentos = Number(avaliacao.total || avaliacao.itens?.length || 0);
                                const treinamentosEmDia = avaliacao.emDia.length;
                                const treinamentosPendentes = avaliacao.pendentes.length;
                                const treinamentosAVencer = Array.isArray(avaliacao.vencendo) ? avaliacao.vencendo.length : 0;
                                const treinamentosVencidos = avaliacao.vencidos.length;
                                const percentualTreinamentos = avaliacao.total > 0 ? Math.round((avaliacao.concluidos.length / avaliacao.total) * 100) : 100;
                                const grupoPendenciasLinha = `linha-${Math.floor(index / 2)}`;
                                const pendenciasLinhaAberta = pendenciasAbertas === grupoPendenciasLinha;

                                return (
                                    <div
                                        key={c.id}
                                        className={classNames(
                                            "colaborador-lista-card group rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-md",
                                            pendenciasLinhaAberta && "colaborador-lista-card--pendencias-abertas"
                                        )}
                                    >
                                        <div className="colaborador-lista-card__layout grid gap-4 lg:grid-cols-[1fr_170px] lg:items-stretch">
                                            <div className="colaborador-lista-card__principal">
                                                <div className="colaborador-lista-card__cabecalho-expandido">
                                                    <div className="colaborador-lista-card__foto-wrap">
                                                        <button
                                                            onClick={() => onSelectColab(c)}
                                                            className="colaborador-lista-card__foto-botao flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200 shadow-sm transition group-hover:ring-slate-300"
                                                        >
                                                            <FotoColaborador
                                                                src={c}
                                                                colaborador={c}
                                                                colaboradorId={c.id}
                                                                nome={c.nome}
                                                                className="h-full w-full rounded-2xl"
                                                                iconClassName="h-8 w-8"
                                                                imageStyle={{ objectFit: "contain", objectPosition: "center center" }}
                                                            />
                                                        </button>
                                                    </div>

                                                    <div className="colaborador-lista-card__dados min-w-0">
                                                        <div className="colaborador-lista-card__nome-linha colaborador-lista-card__nome-status flex flex-wrap items-start gap-2">
                                                                <h3 className="max-w-full break-words text-lg font-bold leading-snug text-slate-950">
                                                                    {c.nome}
                                                                </h3>

                                                                <span
                                                                    title={geral.detalhe}
                                                                    data-status={normalizarTextoBusca(geral.texto)}
                                                                    className={classNames("colaborador-lista-card__status-nome inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold", geral.classe)}
                                                                >
                                                                    {geral.texto}
                                                                </span>
                                                            </div>

                                                        <div className="colaborador-lista-card__identificacao mt-1">
                                                            <p className="colaborador-lista-card__funcao">{c.funcao}</p>
                                                            <p className="colaborador-lista-card__empresa">{c.empresaExibicao || c.empresa}</p>
                                                            <p className="colaborador-lista-card__codigo">Código: {c.codigoFuncionario}</p>
                                                            <ColaboradorIdentificacoesSeguranca
                                                                colaborador={c}
                                                                avaliacao={avaliacao}
                                                                compacto
                                                                className="mt-2"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setPendenciasAbertas(pendenciasLinhaAberta ? null : grupoPendenciasLinha)}
                                                        className="colaborador-lista-card__treinamentos mt-4 flex flex-1 flex-col justify-between rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
                                                    >
                                                        <div className="colaborador-lista-card__treinamentos-conteudo">
                                                            <div className="colaborador-lista-card__treinamentos-info">
                                                                <p className="colaborador-lista-card__treinamentos-titulo text-xs font-bold uppercase tracking-wide text-slate-500">
                                                                    TREINAMENTOS OBRIGATÓRIOS
                                                                </p>
                                                                <p className="colaborador-lista-card__treinamentos-descricao mt-1 text-xs text-slate-500">
                                                                    Clique para visualizar pendências.
                                                                </p>
                                                            </div>

                                                            <div className="colaborador-lista-card__treinamentos-resumo">
                                                                <span className="colaborador-lista-card__treinamentos-metrica colaborador-lista-card__treinamentos-metrica--concluidos">
                                                                    <strong>{percentualTreinamentos}%</strong>
                                                                    <small>Concluídos</small>
                                                                </span>
                                                                <span className="colaborador-lista-card__treinamentos-metrica colaborador-lista-card__treinamentos-metrica--em-dia">
                                                                    <strong>{treinamentosEmDia}</strong>
                                                                    <small>Em dia</small>
                                                                </span>
                                                                <span className="colaborador-lista-card__treinamentos-metrica colaborador-lista-card__treinamentos-metrica--pendentes">
                                                                    <strong>{treinamentosPendentes}</strong>
                                                                    <small>Pendentes</small>
                                                                </span>
                                                                <span className="colaborador-lista-card__treinamentos-metrica colaborador-lista-card__treinamentos-metrica--a-vencer">
                                                                    <strong>{treinamentosAVencer}</strong>
                                                                    <small>A vencer</small>
                                                                </span>
                                                                <span className="colaborador-lista-card__treinamentos-metrica colaborador-lista-card__treinamentos-metrica--vencidos">
                                                                    <strong>{treinamentosVencidos}</strong>
                                                                    <small>Vencidos</small>
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </button>

                                                    {pendenciasLinhaAberta && (
                                                        <div className="colaborador-lista-card__pendencias mt-2 rounded-2xl border border-slate-200 bg-white p-3">
                                                            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                                                                Treinamentos e pendências
                                                            </p>

                                                            <div className="space-y-1.5">
                                                                {avaliacao.itens.map((item) => {
                                                                    const temDocumentoLancado = Boolean(item.realizado);
                                                                    const semValidade = treinamentoSemValidade(item.treinamento.id);
                                                                    const dataElaboracao = item.realizado?.realizado || "";
                                                                    const dataVencimento = item.realizado?.vencimento || "";

                                                                    return (
                                                                        <div
                                                                            key={item.treinamento.id}
                                                                            className="flex flex-col gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs lg:flex-row lg:items-center lg:justify-between"
                                                                        >
                                                                            <div className="min-w-0 flex-1">
                                                                                <p className="break-words font-medium text-slate-700">{item.treinamento.nome}</p>

                                                                                {temDocumentoLancado ? (
                                                                                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                                                                                        <span className="rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">
                                                                                            Elaboração: {formatDate(dataElaboracao)}
                                                                                        </span>
                                                                                        <span className="rounded-full bg-white px-2 py-0.5 text-slate-600 ring-1 ring-slate-200">
                                                                                            Vencimento: {semValidade ? "Sem validade" : formatDate(dataVencimento)}
                                                                                        </span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                                                                                        Documento ainda não enviado.
                                                                                    </p>
                                                                                )}
                                                                            </div>

                                                                            <span className={classNames("w-fit shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", item.status.classe)}>
                                                                                {item.status.texto}
                                                                            </span>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                            <aside className="colaborador-lista-card__acoes flex h-full flex-col gap-2">
                                                <button
                                                    onClick={() => abrirRevisaoColaborador(c)}
                                                    disabled={!podeEditarColaboradoresSistema}
                                                    title={podeEditarColaboradoresSistema ? "Revisar dados" : mensagemBloqueioEdicaoColaboradores}
                                                    className="colaborador-lista-card__acao colaborador-lista-card__acao--revisar inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Revisar dados
                                                </button>


                                                <button
                                                    onClick={() => enviarTreinamentoColaboradorSeguro(c)}
                                                    disabled={!podeUploadColaboradoresSistema}
                                                    title={podeUploadColaboradoresSistema ? "Enviar treinamento" : mensagemBloqueioUploadColaboradores}
                                                    className="colaborador-lista-card__acao colaborador-lista-card__acao--treinamento inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <Upload className="h-3.5 w-3.5" />
                                                    {podeUploadColaboradoresSistema ? "Treinamento" : "Bloqueado"}
                                                </button>

                                                <button
                                                    onClick={() => onSelectColab(c)}
                                                    className="colaborador-lista-card__acao colaborador-lista-card__acao--qr inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                >
                                                    <QrCode className="h-3.5 w-3.5" />
                                                    Ver QR Code
                                                </button>

                                                <button
                                                    onClick={() => solicitarExclusaoColaborador(c)}
                                                    disabled={!podeExcluirColaboradoresSistema}
                                                    title={podeExcluirColaboradoresSistema ? "Excluir colaborador" : mensagemBloqueioExclusaoColaboradores}
                                                    className="colaborador-lista-card__acao colaborador-lista-card__acao--excluir inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:ring-slate-200"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    {podeExcluirColaboradoresSistema ? "Excluir" : "Bloqueado"}
                                                </button>
                                            </aside>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                        </>
                    )}
                </Card>
                </div>
            </div>
            {colaboradorExclusao && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-6 shadow-2xl">
                        <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                                <AlertTriangle className="h-6 w-6" />
                            </div>

                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-wide text-red-600">Confirmação obrigatória</p>
                                <h3 className="mt-1 text-xl font-black text-slate-950">Tem certeza que deseja excluir este funcionário?</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Esta ação remove o cadastro do colaborador do sistema. Confira os dados antes de confirmar.
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                            <p><strong>Funcionário:</strong> {colaboradorExclusao.nome || "Não informado"}</p>
                            <p><strong>Código:</strong> {colaboradorExclusao.codigoFuncionario || "-"}</p>
                            <p><strong>Empresa:</strong> {colaboradorExclusao.empresaExibicao || colaboradorExclusao.empresa || "-"}</p>
                            <p><strong>Função:</strong> {colaboradorExclusao.funcao || "-"}</p>
                        </div>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={cancelarExclusaoColaborador}
                                className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={confirmarExclusaoColaborador}
                                disabled={!podeExcluirColaboradoresSistema}
                                title={podeExcluirColaboradoresSistema ? "Confirmar exclusão" : mensagemBloqueioExclusaoColaboradores}
                                className="inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                            >
                                {podeExcluirColaboradoresSistema ? "Sim, excluir funcionário" : "Exclusão bloqueada"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ModalNovaFuncaoColaborador
                aberto={modalFuncaoAberto}
                novaFuncao={novaFuncao}
                setNovaFuncao={setNovaFuncao}
                treinamentosBase={treinamentosBase}
                onSalvar={salvarNovaFuncao}
                onFechar={() => setModalFuncaoAberto(false)}
            />

            <ModalAjustarFuncoesColaborador
                aberto={modalAjustarFuncoesAberto}
                colaboradores={colaboradores}
                podeEditar={podeEditarColaboradoresSistema}
                podeExcluir={podeExcluirColaboradoresSistema}
                onFechar={() => setModalAjustarFuncoesAberto(false)}
                onAtualizado={() => setVersaoFuncoes((valor) => valor + 1)}
            />


            <ModalRevisaoColaborador
                key={colaboradorEdicao?.id || "sem-colaborador"}
                colaboradorEdicao={colaboradorEdicao}
                setColaboradorEdicao={setColaboradorEdicao}
                empresasBanco={empresasBanco}
                funcoesSugeridas={funcoesSugeridas}
                onAtualizarColaborador={atualizarColaboradorSeguro}
                podeEditar={podeEditarColaboradoresSistema}
                onAtualizarBanco={onAtualizarBanco}
            />
        </div>
    );
}
