/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import {
    AlertTriangle,
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
import { baixarRelatorioColaboradoresTreinamentosPDF, baixarRelatorioPendenciasTreinamentosPDF } from "../../services/exportacaoService";
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
const CHAVE_FILTROS_PENDENCIAS_TREINAMENTOS = "controle-sst-qr:pendencias-treinamentos:filtros-salvos:v1";
const CHAVE_FILTROS_COLABORADORES_TREINAMENTOS = "controle-sst-qr:colaboradores-treinamentos:filtros-salvos:v1";


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

function obterFiltrosPadraoPendenciasTreinamentos() {
    return {
        busca: "",
        empresa: "Todas",
        filtroClassificacao: "Todos",
    };
}

function normalizarFiltroSalvoPendenciasTreinamentos(valor, fallback = "") {
    const texto = String(valor ?? "").trim();
    return texto || fallback;
}

function carregarFiltrosSalvosPendenciasTreinamentos() {
    if (typeof window === "undefined" || !window.localStorage) return null;

    try {
        const bruto = window.localStorage.getItem(CHAVE_FILTROS_PENDENCIAS_TREINAMENTOS);
        if (!bruto) return null;

        const dados = JSON.parse(bruto);
        if (!dados || typeof dados !== "object") return null;

        const padrao = obterFiltrosPadraoPendenciasTreinamentos();

        return {
            busca: normalizarFiltroSalvoPendenciasTreinamentos(dados.busca, padrao.busca),
            empresa: normalizarFiltroSalvoPendenciasTreinamentos(dados.empresa, padrao.empresa),
            filtroClassificacao: normalizarFiltroSalvoPendenciasTreinamentos(dados.filtroClassificacao, padrao.filtroClassificacao),
        };
    } catch (error) {
        console.error("Erro ao carregar filtros salvos de pendências de treinamentos:", error);
        return null;
    }
}

function obterFiltrosPadraoColaboradoresTreinamentos() {
    return {
        busca: "",
        empresa: "Todas",
        filtroClassificacao: "Todos",
    };
}

function normalizarFiltroSalvoColaboradoresTreinamentos(valor, fallback = "") {
    const texto = String(valor ?? "").trim();
    return texto || fallback;
}

function carregarFiltrosSalvosColaboradoresTreinamentos() {
    if (typeof window === "undefined" || !window.localStorage) return null;

    try {
        const bruto = window.localStorage.getItem(CHAVE_FILTROS_COLABORADORES_TREINAMENTOS);
        if (!bruto) return null;

        const dados = JSON.parse(bruto);
        if (!dados || typeof dados !== "object") return null;

        const padrao = obterFiltrosPadraoColaboradoresTreinamentos();

        return {
            busca: normalizarFiltroSalvoColaboradoresTreinamentos(dados.busca, padrao.busca),
            empresa: normalizarFiltroSalvoColaboradoresTreinamentos(dados.empresa, padrao.empresa),
            filtroClassificacao: normalizarFiltroSalvoColaboradoresTreinamentos(dados.filtroClassificacao, padrao.filtroClassificacao),
        };
    } catch (error) {
        console.error("Erro ao carregar filtros salvos do relat\u00f3rio de colaboradores e treinamentos:", error);
        return null;
    }
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
    const [filtroClassificacao, setFiltroClassificacao] = useState("Todos");
    const [ordenacaoFuncionarios, setOrdenacaoFuncionarios] = useState("nome_az");
    const [versaoFiltroSalvoPendenciasTreinamentos, setVersaoFiltroSalvoPendenciasTreinamentos] = useState(0);

    const filtrosSalvosPendenciasTreinamentosDisponiveis = useMemo(
        () => Boolean(carregarFiltrosSalvosPendenciasTreinamentos()),
        [versaoFiltroSalvoPendenciasTreinamentos]
    );
    const [versaoFiltroSalvoColaboradoresTreinamentos, setVersaoFiltroSalvoColaboradoresTreinamentos] = useState(0);

    const filtrosSalvosColaboradoresTreinamentosDisponiveis = useMemo(
        () => Boolean(carregarFiltrosSalvosColaboradoresTreinamentos()),
        [versaoFiltroSalvoColaboradoresTreinamentos]
    );
    const [salvando, setSalvando] = useState(false);
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

    const filtrados = colaboradores
        .filter((c) => {
            const avaliacao = avaliarTreinamentosColaborador(c);
            const geral = statusGeral(c);
            const texto = normalizarTextoBusca(`${c.nome} ${c.empresa} ${c.empresaExibicao} ${c.empresaPaiNome} ${c.funcao} ${c.matricula} ${c.codigoFuncionario} ${c.statusMobilizacao} ${geral.texto} ${avaliacao.matriz.rotulo}`);
            const bateBusca = texto.includes(normalizarTextoBusca(busca));
            const bateEmpresa = empresa === "Todas" || c.empresa === empresa;
            const bateClassificacao = filtroClassificacao === "Todos" || geral.texto === filtroClassificacao;

            return bateBusca && bateEmpresa && bateClassificacao;
        })
        .sort((a, b) => {
            const comparacao = String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", { sensitivity: "base" });
            return ordenacaoFuncionarios === "nome_za" ? -comparacao : comparacao;
        });

    const filtrosAtuaisPendenciasTreinamentos = useMemo(
        () => ({
            busca: busca.trim(),
            empresa,
            filtroClassificacao,
        }),
        [busca, empresa, filtroClassificacao]
    );

    const salvarFiltrosPendenciasTreinamentos = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        try {
            window.localStorage.setItem(CHAVE_FILTROS_PENDENCIAS_TREINAMENTOS, JSON.stringify(filtrosAtuaisPendenciasTreinamentos));
            setVersaoFiltroSalvoPendenciasTreinamentos((valor) => valor + 1);
            alert("Filtros de pendências de treinamentos salvos.");
        } catch (error) {
            console.error("Erro ao salvar filtros de pendências de treinamentos:", error);
            alert("Não foi possível salvar os filtros de pendências de treinamentos.");
        }
    };

    const aplicarFiltrosSalvosPendenciasTreinamentos = () => {
        const filtrosSalvos = carregarFiltrosSalvosPendenciasTreinamentos();

        if (!filtrosSalvos) {
            alert("Nenhum filtro salvo encontrado para pendências de treinamentos.");
            return;
        }

        setBusca(filtrosSalvos.busca || "");
        setEmpresa(filtrosSalvos.empresa || "Todas");
        setFiltroClassificacao(filtrosSalvos.filtroClassificacao || "Todos");
        alert("Filtros salvos aplicados em pendências de treinamentos.");
    };

    const limparFiltrosSalvosPendenciasTreinamentos = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        window.localStorage.removeItem(CHAVE_FILTROS_PENDENCIAS_TREINAMENTOS);
        setVersaoFiltroSalvoPendenciasTreinamentos((valor) => valor + 1);
        alert("Filtros salvos de pendências de treinamentos removidos.");
    };


    const filtrosAtuaisColaboradoresTreinamentos = useMemo(
        () => ({
            busca: busca.trim(),
            empresa,
            filtroClassificacao,
        }),
        [busca, empresa, filtroClassificacao]
    );

    const salvarFiltrosColaboradoresTreinamentos = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        try {
            window.localStorage.setItem(CHAVE_FILTROS_COLABORADORES_TREINAMENTOS, JSON.stringify(filtrosAtuaisColaboradoresTreinamentos));
            setVersaoFiltroSalvoColaboradoresTreinamentos((valor) => valor + 1);
            alert("Filtros do relat\u00f3rio de colaboradores e treinamentos salvos.");
        } catch (error) {
            console.error("Erro ao salvar filtros do relat\u00f3rio de colaboradores e treinamentos:", error);
            alert("N\u00e3o foi poss\u00edvel salvar os filtros do relat\u00f3rio de colaboradores e treinamentos.");
        }
    };

    const aplicarFiltrosSalvosColaboradoresTreinamentos = () => {
        const filtrosSalvos = carregarFiltrosSalvosColaboradoresTreinamentos();

        if (!filtrosSalvos) {
            alert("Nenhum filtro salvo encontrado para o relat\u00f3rio de colaboradores e treinamentos.");
            return;
        }

        setBusca(filtrosSalvos.busca || "");
        setEmpresa(filtrosSalvos.empresa || "Todas");
        setFiltroClassificacao(filtrosSalvos.filtroClassificacao || "Todos");
        alert("Filtros salvos aplicados no relat\u00f3rio de colaboradores e treinamentos.");
    };

    const limparFiltrosSalvosColaboradoresTreinamentos = () => {
        if (typeof window === "undefined" || !window.localStorage) return;

        window.localStorage.removeItem(CHAVE_FILTROS_COLABORADORES_TREINAMENTOS);
        setVersaoFiltroSalvoColaboradoresTreinamentos((valor) => valor + 1);
        alert("Filtros salvos do relat\u00f3rio de colaboradores e treinamentos removidos.");
    };
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

    const obterEmpresaRelatorio = (colaborador = {}) => {
        const empresaId = String(colaborador.empresaId || colaborador.empresa_id || "").trim();
        const empresaNome = normalizarTextoBusca(colaborador.empresa || colaborador.empresaNome || "");

        return (
            empresasBanco.find((item) => String(item.id || "") === empresaId) ||
            empresasBanco.find((item) => normalizarTextoBusca(item.nome || "") === empresaNome) ||
            {}
        );
    };

    const baixarRelatorioColaboradores = async () => {
        if (!podeExportarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExportacaoColaboradores);
            return;
        }

        const colaboradoresRelatorio = filtrados.map((c) => {
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
            busca: busca.trim() || "-",
            empresa,
            classificacao: filtroClassificacao,
            colaboradoresFiltrados: `${filtrados.length} colaborador(es)`,
        };

        await baixarRelatorioColaboradoresTreinamentosPDF({
            nomeArquivo: "relatorio-colaboradores-treinamentos.pdf",
            titulo: "Relat\u00f3rio de colaboradores e treinamentos",
            colaboradores: colaboradoresRelatorio,
            filtros: relatorioColaboradoresTreinamentosFiltrosAplicados,
        });
    };

    const baixarRelatorioPendencias = async () => {
        if (!podeExportarColaboradoresSistema) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueioExportacaoColaboradores);
            return;
        }

        const pendencias = [];

        filtrados.forEach((c) => {
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

        await baixarRelatorioPendenciasTreinamentosPDF({
            nomeArquivo: "relatorio-pendencias-treinamentos.pdf",
            titulo: "Relatório de pendências de treinamentos",
            pendencias,
            filtros: {
                busca: busca.trim() || "-",
                empresa,
                classificacao: filtroClassificacao,
                colaboradoresFiltrados: `${filtrados.length} colaborador(es)`,
                pendenciasEncontradas: `${pendencias.length} pendência(s)`,
            },
        });
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
                titulo="Colaboradores"
                subtitulo={null}
                acao={
                    <div className="colaboradores-header-acoes flex flex-wrap gap-2">
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

                        <button
                            onClick={onAtualizarBanco}
                            className="colaboradores-header-acao colaboradores-header-acao--secundaria inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <RefreshCw className={classNames("h-4 w-4", carregandoBanco && "animate-spin")} />
                            Atualizar banco
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
                    </div>

                    <div className="colaboradores-hero-banner__stats">
                        <div className="colaboradores-hero-banner__stat">
                            <Users className="h-4 w-4 text-emerald-300" />
                            <span>{colaboradores.length} colaboradores</span>
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
                                onChange={(e) => setEmpresa(e.target.value)}
                                className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                            >
                                {empresasFiltro.map((e) => (
                                    <option key={e}>{e}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative min-w-56">
                            <ShieldCheck className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <select
                                value={filtroClassificacao}
                                onChange={(e) => setFiltroClassificacao(e.target.value)}
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
                        <div className="colaborador-status-card flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-slate-50 p-3 text-center">
                            <p className="text-xs font-medium text-slate-500">Total</p>
                            <p className="text-2xl font-bold text-slate-950">{colaboradores.length}</p>
                        </div>
                        <div className="colaborador-status-card flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-emerald-50 p-3 text-center">
                            <p className="text-xs font-medium text-emerald-700">Liberados</p>
                            <p className="text-2xl font-bold text-emerald-700">{resumoTreinamentos.liberados}</p>
                        </div>
                        <div className="colaborador-status-card flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-blue-50 p-3 text-center">
                            <p className="text-xs font-medium text-blue-700">Com pendência</p>
                            <p className="text-2xl font-bold text-blue-700">{resumoTreinamentos.comPendencia}</p>
                        </div>
                        <div className="colaborador-status-card flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-red-50 p-3 text-center">
                            <p className="text-xs font-medium text-red-700">Bloqueados</p>
                            <p className="text-2xl font-bold text-red-700">{resumoTreinamentos.bloqueados}</p>
                        </div>
                        <div className="colaborador-status-card flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-violet-50 p-3 text-center">
                            <p className="text-xs font-medium text-violet-700">Em análise</p>
                            <p className="text-2xl font-bold text-violet-700">{resumoTreinamentos.emAnalise}</p>
                        </div>
                        <div className="colaborador-status-card flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-slate-100 p-3 text-center">
                            <p className="text-xs font-medium text-slate-700">Desmobilizados</p>
                            <p className="text-2xl font-bold text-slate-700">{resumoTreinamentos.desmobilizados}</p>
                        </div>
                        <div className="colaborador-status-card flex min-h-[92px] flex-col items-center justify-center rounded-2xl bg-slate-50 p-3 text-center ring-1 ring-slate-200">
                            <p className="text-xs font-medium text-slate-700">Inativos</p>
                            <p className="text-2xl font-bold text-slate-700">{resumoTreinamentos.inativos}</p>
                        </div>
                    </div>

                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">{"Filtros salvos do relat\u00f3rio de colaboradores e treinamentos"}</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">{"Salve busca, empresa e classifica\u00e7\u00e3o para reutilizar no PDF de colaboradores e treinamentos."}</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={salvarFiltrosColaboradoresTreinamentos}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                                >
                                    Salvar filtro
                                </button>
                                <button
                                    type="button"
                                    onClick={aplicarFiltrosSalvosColaboradoresTreinamentos}
                                    disabled={!filtrosSalvosColaboradoresTreinamentosDisponiveis}
                                    className={classNames(
                                        "rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition",
                                        filtrosSalvosColaboradoresTreinamentosDisponiveis
                                            ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                    )}
                                >
                                    Aplicar filtro salvo
                                </button>
                                <button
                                    type="button"
                                    onClick={limparFiltrosSalvosColaboradoresTreinamentos}
                                    disabled={!filtrosSalvosColaboradoresTreinamentosDisponiveis}
                                    className={classNames(
                                        "rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition",
                                        filtrosSalvosColaboradoresTreinamentosDisponiveis
                                            ? "border-red-100 bg-white text-red-600 hover:bg-red-50"
                                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                    )}
                                >
                                    Limpar filtro salvo
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Filtros salvos do relatório de pendências</p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">Salve busca, empresa e classificação para reutilizar no PDF de pendências de treinamentos.</p>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={salvarFiltrosPendenciasTreinamentos}
                                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-100"
                                >
                                    Salvar filtro
                                </button>
                                <button
                                    type="button"
                                    onClick={aplicarFiltrosSalvosPendenciasTreinamentos}
                                    disabled={!filtrosSalvosPendenciasTreinamentosDisponiveis}
                                    className={classNames(
                                        "rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition",
                                        filtrosSalvosPendenciasTreinamentosDisponiveis
                                            ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                    )}
                                >
                                    Aplicar filtro salvo
                                </button>
                                <button
                                    type="button"
                                    onClick={limparFiltrosSalvosPendenciasTreinamentos}
                                    disabled={!filtrosSalvosPendenciasTreinamentosDisponiveis}
                                    className={classNames(
                                        "rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-wide shadow-sm transition",
                                        filtrosSalvosPendenciasTreinamentosDisponiveis
                                            ? "border-red-100 bg-white text-red-600 hover:bg-red-50"
                                            : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                    )}
                                >
                                    Limpar filtro salvo
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-4">
                        <button
                            onClick={baixarRelatorioColaboradores}
                            disabled={!podeExportarColaboradoresSistema}
                            title={podeExportarColaboradoresSistema ? "Baixar PDF colaboradores" : mensagemBloqueioExportacaoColaboradores}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Download className="h-4 w-4" />
                            Baixar PDF colaboradores
                        </button>
                        <button
                            onClick={baixarRelatorioPendencias}
                            disabled={!podeExportarColaboradoresSistema}
                            title={podeExportarColaboradoresSistema ? "Baixar PDF pendências" : mensagemBloqueioExportacaoColaboradores}
                            className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <AlertTriangle className="h-4 w-4" />
                            Baixar PDF pendências
                        </button>
                    </div>

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
                colaboradorEdicao={colaboradorEdicao}
                setColaboradorEdicao={setColaboradorEdicao}
                empresasBanco={empresasBanco}
                funcoesSugeridas={funcoesSugeridas}
                onAtualizarColaborador={atualizarColaboradorSeguro}
            />
        </div>
    );
}
