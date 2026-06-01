/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
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
    Search,
    ShieldCheck,
    Trash2,
    Upload,
    Users,
} from "lucide-react";
import { Card, FotoColaborador, Header, obterFotoColaboradorSrc } from "../commonComponents";
import { MobilizacaoBadge } from "../MobilizacaoBadge";
import { FormularioNovoColaborador } from "./FormularioNovoColaborador";
import { ModalNovaFuncaoColaborador } from "./ModalNovaFuncaoColaborador";
import { ModalRevisaoColaborador } from "./ModalRevisaoColaborador";
import {
    obterStatusInicialColaborador,
    obterFuncoesPersonalizadasSalvas,
    salvarFuncoesPersonalizadas,
    obterTodasMatrizesFuncao,
    obterMatrizFuncao,
    treinamentosObrigatoriosFuncao,
    gerarCodigoFuncionario,
    avaliarTreinamentosColaborador,
    treinamentoSemValidade,
    obterTreinamento,
    analisarArquivosTreinamentoMassa,
    statusGeral,
} from "../../services/colaboradorDocumentosService";
import {
    treinamentosBase,
    treinamentosBaseObra,
    STATUS_CLASSIFICACAO_COLABORADOR,
} from "../../constants/sstConstants";
import { baixarPDF } from "../../services/exportacaoService";
import { normalizarTextoBusca, formatDate, classNames } from "../../utils/sstUtils";

const CHAVE_NOVO_COLABORADOR_RECOLHIDO = "controleSstColaboradoresNovoColaboradorRecolhido";
const CHAVE_INFO_COLABORADORES_RECOLHIDA = "controleSstColaboradoresInformacoesRecolhidas";

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
    const [salvando, setSalvando] = useState(false);
    const [colaboradorEdicao, setColaboradorEdicao] = useState(null);
    const [pendenciasAbertas, setPendenciasAbertas] = useState(null);
    const [novoColaboradorRecolhido, setNovoColaboradorRecolhido] = useState(() => carregarPreferenciaPainelBoolean(CHAVE_NOVO_COLABORADOR_RECOLHIDO, false));
    const [informacoesColaboradoresRecolhidas, setInformacoesColaboradoresRecolhidas] = useState(() => carregarPreferenciaPainelBoolean(CHAVE_INFO_COLABORADORES_RECOLHIDA, false));
    const [modalFuncaoAberto, setModalFuncaoAberto] = useState(false);
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
        dataNascimento: "",
        mostrarAniversarioDashboard: false,
        statusMobilizacao: obterStatusInicialColaborador(),
        treinamentosRemovidos: [],
        treinamentosAdicionais: [],
        foto: null,
        documentosMassa: [],
    });

    const empresasFiltro = ["Todas", ...Array.from(new Set(colaboradores.map((c) => c.empresa).filter(Boolean)))];

    const filtrados = colaboradores.filter((c) => {
        const avaliacao = avaliarTreinamentosColaborador(c);
        const geral = statusGeral(c);
        const texto = normalizarTextoBusca(`${c.nome} ${c.empresa} ${c.empresaExibicao} ${c.empresaPaiNome} ${c.funcao} ${c.matricula} ${c.codigoFuncionario} ${c.statusMobilizacao} ${geral.texto} ${avaliacao.matriz.rotulo}`);
        const bateBusca = texto.includes(normalizarTextoBusca(busca));
        const bateEmpresa = empresa === "Todas" || c.empresa === empresa;
        const bateClassificacao = filtroClassificacao === "Todos" || geral.texto === filtroClassificacao;

        return bateBusca && bateEmpresa && bateClassificacao;
    });

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

    const baixarRelatorioColaboradores = () => {
        const linhas = [
            [
                "Colaborador",
                "Código",
                "Empresa",
                "Função",
                "Matrícula",
                "Situação na obra",
                "Matriz aplicada",
                "Status geral",
                "Treinamentos obrigatórios",
                "Treinamentos adicionados",
                "Treinamentos removidos",
                "Treinamentos válidos",
                "Pendentes",
                "Vencidos",
                "A vencer",
            ],
        ];

        filtrados.forEach((c) => {
            const avaliacao = avaliarTreinamentosColaborador(c);
            const geral = statusGeral(c);

            linhas.push([
                c.nome,
                c.codigoFuncionario,
                c.empresaExibicao || c.empresa,
                c.funcao,
                c.matricula,
                c.statusMobilizacao,
                avaliacao.matriz.rotulo,
                geral.texto,
                avaliacao.itens.map((item) => item.treinamento.nome).join(" | "),
                (c.treinamentosAdicionais || []).map((id) => obterTreinamento(id)?.nome).filter(Boolean).join(" | "),
                (c.treinamentosRemovidos || []).map((id) => obterTreinamento(id)?.nome).filter(Boolean).join(" | "),
                avaliacao.emDia.map((item) => item.treinamento.nome).join(" | "),
                avaliacao.pendentes.map((item) => item.treinamento.nome).join(" | "),
                avaliacao.vencidos.map((item) => item.treinamento.nome).join(" | "),
                avaliacao.vencendo.map((item) => `${item.treinamento.nome} - vence ${formatDate(item.realizado?.vencimento)}`).join(" | "),
            ]);
        });

        baixarPDF("relatorio-colaboradores-treinamentos.pdf", "Relatorio de colaboradores e treinamentos", linhas);
    };

    const baixarRelatorioPendencias = () => {
        const linhas = [
            ["Colaborador", "Código", "Empresa", "Função", "Situação na obra", "Treinamento", "Situação", "Vencimento", "Base"],
        ];

        filtrados.forEach((c) => {
            const avaliacao = avaliarTreinamentosColaborador(c);

            avaliacao.itens
                .filter((item) => ["pendente", "vencido", "vencendo"].includes(item.status.chave))
                .forEach((item) => {
                    linhas.push([
                        c.nome,
                        c.codigoFuncionario,
                        c.empresa,
                        c.funcao,
                        c.statusMobilizacao,
                        item.treinamento.nome,
                        item.status.texto,
                        item.realizado?.vencimento ? formatDate(item.realizado.vencimento) : "Sem certificado lançado",
                        item.treinamento.base || "",
                    ]);
                });
        });

        baixarPDF("relatorio-pendencias-treinamentos.pdf", "Relatorio de pendencias de treinamentos", linhas);
    };

    const adicionar = async () => {
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
            dataNascimento: novo.dataNascimento || "",
            mostrarAniversarioDashboard: false,
            statusMobilizacao: novo.statusMobilizacao,
            treinamentosRemovidos: novo.treinamentosRemovidos || [],
            treinamentosAdicionais: novo.treinamentosAdicionais || [],
            foto: novo.foto,
            documentosMassa: novo.documentosMassa || [],
            codigoFuncionario: gerarCodigoFuncionario(novo.nome),
        });

        setSalvando(false);

        if (ok) {
            setNovo({
                nome: "",
                empresaNome: "",
                funcao: "",
                matricula: "",
                dataNascimento: "",
                mostrarAniversarioDashboard: false,
                statusMobilizacao: obterStatusInicialColaborador(),
                treinamentosRemovidos: [],
                treinamentosAdicionais: [],
                foto: null,
                documentosMassa: [],
            });
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

    const arquivosMassaAnaliseNovo = analisarArquivosTreinamentoMassa(novo.documentosMassa || []);
    const arquivosMassaReconhecidosNovo = arquivosMassaAnaliseNovo.filter((item) => item.reconhecido);
    const arquivosMassaNaoReconhecidosNovo = arquivosMassaAnaliseNovo.filter((item) => !item.reconhecido);

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

    const salvarNovaFuncao = () => {
        if (!novaFuncao.rotulo.trim()) {
            alert("Informe o nome da função.");
            return;
        }

        if (!novaFuncao.treinamentos.length) {
            alert("Selecione pelo menos um treinamento/documento obrigatório.");
            return;
        }

        const listaAtual = obterFuncoesPersonalizadasSalvas();
        const chave = `custom-${normalizarTextoBusca(novaFuncao.rotulo).replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
        const termos = novaFuncao.termos
            .split(",")
            .map((termo) => termo.trim())
            .filter(Boolean);

        const nova = {
            chave,
            rotulo: novaFuncao.rotulo.trim().toUpperCase(),
            termos: Array.from(new Set([novaFuncao.rotulo.trim(), ...termos])),
            treinamentos: novaFuncao.treinamentos.map(Number),
        };

        salvarFuncoesPersonalizadas([...listaAtual, nova]);
        setVersaoFuncoes((valor) => valor + 1);
        setNovaFuncao({ rotulo: "", termos: "", treinamentos: [...treinamentosBaseObra, 13] });
        setModalFuncaoAberto(false);
    };

    const abrirRevisaoColaborador = (colaborador) => {
        setColaboradorEdicao({
            id: colaborador.id,
            nome: colaborador.nome || "",
            empresaNome: colaborador.empresa || "",
            funcao: colaborador.funcao || "",
            matricula: colaborador.matricula === "-" ? "" : colaborador.matricula || "",
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

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Colaboradores"
                subtitulo="Cadastro com foto, código automático, matriz de treinamentos por função e alerta de vencimentos."
                acao={
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setModalFuncaoAberto(true)}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                        >
                            <Plus className="h-4 w-4" />
                            Nova função
                        </button>

                        <button
                            onClick={onAtualizarBanco}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <RefreshCw className={classNames("h-4 w-4", carregandoBanco && "animate-spin")} />
                            Atualizar banco
                        </button>
                    </div>
                }
            />

            {erroBanco && (
                <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700 ring-1 ring-red-200">
                    {erroBanco}
                </div>
            )}

            <div className="space-y-6">
                <section className="colaboradores-section-destaque">
                    {!novoColaboradorRecolhido ? (
                        <div className="colaborador-formulario-full colaborador-formulario-unificado">
                            <div className="novo-colaborador-cabecalho-branco">
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
                                    onClick={() => atualizarNovoColaboradorRecolhido(true)}
                                    className="colaborador-form-toggle novo-colaborador-cabecalho-branco__acao"
                                >
                                    <ChevronUp className="h-4 w-4" />
                                    Recolher informação
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
                                arquivosMassaAnaliseNovo={arquivosMassaAnaliseNovo}
                                arquivosMassaReconhecidosNovo={arquivosMassaReconhecidosNovo}
                                arquivosMassaNaoReconhecidosNovo={arquivosMassaNaoReconhecidosNovo}
                                removerTreinamentoNovo={removerTreinamentoNovo}
                                adicionarTreinamentoNovo={adicionarTreinamentoNovo}
                                adicionar={adicionar}
                                salvando={salvando}
                            />
                        </div>
                    ) : (
                        <Card className="colaborador-formulario-recolhido border-blue-100 bg-blue-50/40">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">Cadastro</p>
                                    <h2 className="mt-1 text-lg font-black text-slate-950">Novo colaborador</h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-600">
                                        Formulário recolhido para deixar a tela mais compacta. Clique em abrir para cadastrar novo funcionário.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => atualizarNovoColaboradorRecolhido(false)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm ring-1 ring-blue-100 hover:bg-blue-50"
                                >
                                    <ChevronDown className="h-4 w-4" />
                                    Abrir informações
                                </button>
                            </div>
                        </Card>
                    )}
                </section>

                <Card className="colaboradores-info-card">
                    <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Base de colaboradores</p>
                            <h2 className="mt-1 text-xl font-black text-slate-950">Informações dos funcionários</h2>
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                Consulte status, pendências, QR Code, treinamentos e dados cadastrais em um bloco único destacado.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => atualizarInformacoesColaboradoresRecolhidas((valor) => !valor)}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800"
                        >
                            {informacoesColaboradoresRecolhidas ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                            {informacoesColaboradoresRecolhidas ? "Abrir informações" : "Recolher informações"}
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
                    </div>

                    <div className="colaboradores-status-grid mb-4">
                        <div className="colaborador-status-card rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">Total</p>
                            <p className="text-2xl font-bold text-slate-950">{colaboradores.length}</p>
                        </div>
                        <div className="colaborador-status-card rounded-2xl bg-emerald-50 p-3">
                            <p className="text-xs font-medium text-emerald-700">Liberados</p>
                            <p className="text-2xl font-bold text-emerald-700">{resumoTreinamentos.liberados}</p>
                        </div>
                        <div className="colaborador-status-card rounded-2xl bg-blue-50 p-3">
                            <p className="text-xs font-medium text-blue-700">Com pendência</p>
                            <p className="text-2xl font-bold text-blue-700">{resumoTreinamentos.comPendencia}</p>
                        </div>
                        <div className="colaborador-status-card rounded-2xl bg-red-50 p-3">
                            <p className="text-xs font-medium text-red-700">Bloqueados</p>
                            <p className="text-2xl font-bold text-red-700">{resumoTreinamentos.bloqueados}</p>
                        </div>
                        <div className="colaborador-status-card rounded-2xl bg-violet-50 p-3">
                            <p className="text-xs font-medium text-violet-700">Em análise</p>
                            <p className="text-2xl font-bold text-violet-700">{resumoTreinamentos.emAnalise}</p>
                        </div>
                        <div className="colaborador-status-card rounded-2xl bg-slate-100 p-3">
                            <p className="text-xs font-medium text-slate-700">Desmobilizados</p>
                            <p className="text-2xl font-bold text-slate-700">{resumoTreinamentos.desmobilizados}</p>
                        </div>
                        <div className="colaborador-status-card rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                            <p className="text-xs font-medium text-slate-700">Inativos</p>
                            <p className="text-2xl font-bold text-slate-700">{resumoTreinamentos.inativos}</p>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap justify-center gap-2 border-b border-slate-200 pb-4">
                        <button
                            onClick={baixarRelatorioColaboradores}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Baixar PDF colaboradores
                        </button>
                        <button
                            onClick={baixarRelatorioPendencias}
                            className="inline-flex items-center gap-2 rounded-2xl bg-orange-50 px-4 py-2.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100"
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

                    <div className="grid gap-4">
                        {!carregandoBanco &&
                            filtrados.map((c) => {
                                const geral = statusGeral(c);
                                const avaliacao = avaliarTreinamentosColaborador(c);

                                return (
                                    <div
                                        key={c.id}
                                        className="group rounded-3xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-md"
                                    >
                                        <div className="grid gap-4 lg:grid-cols-[1fr_170px] lg:items-stretch">
                                            <div className="min-w-0 flex h-full flex-col">
                                                <div className="flex items-start gap-4 lg:pt-1">
                                                    <button
                                                        onClick={() => onSelectColab(c)}
                                                        className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100 text-slate-700 transition group-hover:bg-slate-950 group-hover:text-white"
                                                    >
                                                        <FotoColaborador
                                                            src={c}
                                                            colaborador={c}
                                                            colaboradorId={c.id}
                                                            nome={c.nome}
                                                            className="h-full w-full rounded-2xl"
                                                            iconClassName="h-8 w-8"
                                                        />
                                                    </button>

                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-start gap-2">
                                                            <h3 className="max-w-full break-words text-lg font-bold leading-snug text-slate-950">
                                                                {c.nome}
                                                            </h3>

                                                            <MobilizacaoBadge status={c.statusMobilizacao || geral.texto} />
                                                        </div>

                                                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                                            <span>{c.funcao}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-xs font-semibold text-slate-500">
                                                                Código: {c.codigoFuncionario}
                                                            </span>
                                                        </div>

                                                        <p className="mt-1 break-words text-xs text-slate-500">
                                                            <strong>Empresa:</strong> {c.empresaExibicao || c.empresa}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setPendenciasAbertas(pendenciasAbertas === c.id ? null : c.id)}
                                                    className="mt-4 flex flex-1 flex-col justify-between rounded-2xl bg-slate-50 p-3 text-left transition hover:bg-slate-100"
                                                >
                                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                                        <div>
                                                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                                                Treinamentos obrigatórios
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                Clique para visualizar pendências.
                                                            </p>
                                                        </div>

                                                        <div className="min-w-[220px] flex-1">
                                                            <div className="mb-2 flex flex-wrap justify-end gap-2 text-xs font-semibold">
                                                                <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-200">
                                                                    Em dia: {avaliacao.emDia.length}
                                                                </span>
                                                                <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700 ring-1 ring-blue-200">
                                                                    Pendentes: {avaliacao.pendentes.length}
                                                                </span>
                                                            </div>

                                                            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500 transition-all"
                                                                    style={{
                                                                        width: `${avaliacao.total ? Math.round((avaliacao.emDia.length / avaliacao.total) * 100) : 0}%`,
                                                                    }}
                                                                />
                                                            </div>

                                                            <p className="mt-1 text-right text-[11px] font-medium text-slate-500">
                                                                {avaliacao.emDia.length} de {avaliacao.total} treinamento(s) em dia
                                                            </p>
                                                        </div>
                                                    </div>
                                                </button>

                                                {pendenciasAbertas === c.id && (
                                                    <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3">
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

                                            <div className="flex h-full flex-col gap-2">
                                                <div
                                                    title={geral.detalhe}
                                                    className={classNames("inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold", geral.classe)}
                                                >
                                                    {geral.texto}
                                                </div>

                                                <button
                                                    onClick={() => onSelectColab(c)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                >
                                                    <QrCode className="h-3.5 w-3.5" />
                                                    Ver QR
                                                </button>

                                                <button
                                                    onClick={() => abrirRevisaoColaborador(c)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    Revisar dados
                                                </button>

                                                <button
                                                    onClick={() => onEnviarTreinamento(c)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100"
                                                >
                                                    <Upload className="h-3.5 w-3.5" />
                                                    Enviar treinamento
                                                </button>

                                                <button
                                                    onClick={() => onExcluirColaborador(c)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                        </>
                    )}
                </Card>
            </div>
            <ModalNovaFuncaoColaborador
                aberto={modalFuncaoAberto}
                novaFuncao={novaFuncao}
                setNovaFuncao={setNovaFuncao}
                treinamentosBase={treinamentosBase}
                onSalvar={salvarNovaFuncao}
                onFechar={() => setModalFuncaoAberto(false)}
            />

            <ModalRevisaoColaborador
                colaboradorEdicao={colaboradorEdicao}
                setColaboradorEdicao={setColaboradorEdicao}
                empresasBanco={empresasBanco}
                funcoesSugeridas={funcoesSugeridas}
                onAtualizarColaborador={onAtualizarColaborador}
            />
        </motion.div>
    );
}


