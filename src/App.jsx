/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, SUPABASE_ANON_KEY, SUPABASE_CONFIGURADO, SUPABASE_URL } from "./lib/supabaseClient";
import {
    buscarTodosRegistrosSupabase,
    listarTodosArquivosStorage,
    obterUrlLogoEmpresa,
    abrirArquivoStorage,
} from "./services/supabaseServices";
import {
    Card,
    CardRecolhivel,
    FotoAuditoriaPreview,
    FotoColaborador,
    Header,
    LinkPublicoQR,
    QRCodeReal,
    StatusPill,
    SupabaseConfiguracaoPendente,
} from "./components/commonComponents";
import { LoginScreen } from "./components/LoginScreen";
import { MobilizacaoBadge } from "./components/MobilizacaoBadge";
import { ConsultaQR } from "./components/qr/ConsultaQR";
import { ConsultaQRPublica } from "./components/qr/ConsultaQRPublica";
import { Requisitos } from "./components/Requisitos";
import { Aniversariantes } from "./components/aniversariantes/AniversariantesPage";
import { Dashboard } from "./components/dashboard/Dashboard";
import { Empresas } from "./components/empresas/EmpresasPage";
import { FormularioNovoColaborador } from "./components/colaboradores/FormularioNovoColaborador";
import { ModalNovaFuncaoColaborador } from "./components/colaboradores/ModalNovaFuncaoColaborador";
import { ModalRevisaoColaborador } from "./components/colaboradores/ModalRevisaoColaborador";
import { FileUploadAviso, validarArquivoAntesUpload, validarListaArquivosAntesUpload } from "./components/FileUploadAviso";
import { AuditoriaAcessoNegado, AuditoriaBloqueada } from "./components/auditoria/AuditoriaPermissao";
import { AuditoriaAtividades } from "./components/auditoria/AuditoriaAtividades";
import { EditorNotificacaoHistoricoAuditoria } from "./components/auditoria/EditorNotificacaoHistoricoAuditoria";
import { DashboardAuditoriaCampo } from "./components/auditoria/DashboardAuditoriaCampo";
import { NovaAuditoriaCampoDireta } from "./components/auditoria/NovaAuditoriaCampoDireta";
import {
    obterCategoriaPadronizadaAuditoriaCampo,
    obterTipoAuditoriaCampoPorParametro,
    obterTipoAuditoriaCampoDireta,
    checklistParaTipoAuditoriaCampo,
    criarRespostasChecklistDinamico,
    calcularResultadoChecklistDinamico,
    notificacaoPadraoAuditoriaCampo,
    montarPreviewNotificacaoAuditoriaCampo,
    montarMensagemFluidaAuditoriaCampo,
    obterRespostaAuditoriaCampo,
    rotuloPontuacaoAuditoriaCampo,
    calcularResultadoAuditoriaCampo,
    classeClassificacaoAuditoriaCampo,
    normalizarAuditoriaCampo,
    identificarAlvoAuditoriaCampo,
    fotosAuditoriaCampo,
    auditoriaCampoAberta,
    auditoriaCampoVencida,
} from "./services/auditoriaCampoService";
import {
    obterStatusInicialColaborador,
    obterFuncoesPersonalizadasSalvas,
    salvarFuncoesPersonalizadas,
    obterTodasMatrizesFuncao,
    obterMatrizFuncao,
    treinamentosObrigatoriosFuncao,
    gerarCodigoFuncionario,
    avaliarTreinamentosColaborador,
    normalizarColaborador,
    normalizarCertificado,
    treinamentoSemValidade,
    statusDocumento,
    obterDataAniversarioColaborador,
    mesAniversarioColaborador,
    diaAniversarioColaborador,
    proximoAniversariante,
    deveMostrarAniversarioColaborador,
    obterFuncaoCargoColaborador,
    colaboradorContaComoMobilizado,
    obterTreinamento,
    obterTreinamentoIdPorTipo,
    calcularVencimentoTreinamento,
    inferirTreinamentoPorNomeArquivo,
    dataRealizacaoPorArquivo,
    extrairDatasComContexto,
    lerTextoPossivelDoArquivo,
    detectarDataEmissaoArquivo,
    analisarArquivosTreinamentoMassa,
    itemDocumentoCriticoColaborador,
    documentoEmAnaliseColaborador,
    classeClassificacaoColaborador,
    statusGeral,
} from "./services/colaboradorDocumentosService";
import {
    obterDocumentoEmpresa,
    calcularVencimentoDocumento,
    normalizarDocumentoEmpresa,
    statusEmpresaDocumento,
    calcularSituacaoDocumentalEmpresa,
    normalizarStatusEmpresa,
    classeStatusEmpresa,
} from "./services/empresaDocumentosService";
import {
    TAMANHO_PAGINA_SUPABASE,
    estilosGlobais,
    DAY,
    FUNCAO_EMAIL_ALERTA_TST,
    LIMITE_STORAGE_MB,
    treinamentosBase,
    documentosEmpresaBase,
    STATUS_CLASSIFICACAO_COLABORADOR,
    IDS_DOCUMENTOS_CRITICOS_COLABORADOR,
    treinamentosBaseObra,
    matrizTreinamentosPorFuncao,
    respostasAuditoriaCampo,
    categoriasAuditoriaCampo,
    statusDesvioAuditoriaCampo,
    gravidadesAuditoriaCampo,
    tiposAuditoriaCampoDireta,
    categoriasPadronizadasAuditoriaCampo,
    statusAuditoriaCampoDireta,
    grausRiscoAuditoriaCampoDireta,
    descricoesGrauRiscoAuditoriaCampoDireta,
    checklistDinamicoAuditoriaCampo,
} from "./constants/sstConstants";
import {
    baixarCSV,
    baixarPDF,
} from "./services/exportacaoService";
import { reduzirFotoParaAuditoria } from "./services/imagemService";
import {
    normalizarTextoBusca,
    normalizarDataAniversario,
    diasParaVencer,
    formatDate,
    formatarAniversario,
    formatarDataHora,
    textoNaoAplicavel,
    apenasNumeros,
    formatarBytes,
    calcularPercentualUsoStorage,
    resumirNavegador,
    obterOrigemAcesso,
    normalizarEmailDestinatario,
    formatarCnpj,
    formatarTelefone,
    classNames,
    obterParametroUrl,
    extrairCaminhoStorage,
    ehUuid,
    sanitizarNomeArquivo,
    converterDataParaISO,
    converterDataIsoDireta,
    limparTextoPdfBruto,
} from "./utils/sstUtils";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";
import {
    AlertTriangle,
    BadgeCheck,
    Building2,
    CalendarClock,
    ChevronDown,
    ChevronUp,
    CheckCircle2,
    ClipboardCheck,
    Database,
    Download,
    Eye,
    EyeOff,
    FileText,
    Filter,
    HardHat,
    LayoutDashboard,
    Lock,
    Mail,
    MessageCircle,
    Plus,
    QrCode,
    RefreshCw,
    Search,
    Send,
    ShieldCheck,
    Trash2,
    Upload,
    UserPlus,
    UserRound,
    Users,
    XCircle,
} from "lucide-react";

const hoje = new Date();



function emailTstDaEmpresa(colaborador) {
    return normalizarEmailDestinatario(colaborador?.empresaTstEmail || "");
}




function Colaboradores({
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
        mostrarAniversarioDashboard: true,
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
            mostrarAniversarioDashboard: novo.mostrarAniversarioDashboard !== false,
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
                mostrarAniversarioDashboard: true,
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
            fotoAtual: colaborador.fotoUrl || "",
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

            <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
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

                <Card>
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

                    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                        <div className="rounded-2xl bg-slate-50 p-3">
                            <p className="text-xs font-medium text-slate-500">Total</p>
                            <p className="text-2xl font-bold text-slate-950">{colaboradores.length}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-3">
                            <p className="text-xs font-medium text-emerald-700">Liberados</p>
                            <p className="text-2xl font-bold text-emerald-700">{resumoTreinamentos.liberados}</p>
                        </div>
                        <div className="rounded-2xl bg-blue-50 p-3">
                            <p className="text-xs font-medium text-blue-700">Com pendência</p>
                            <p className="text-2xl font-bold text-blue-700">{resumoTreinamentos.comPendencia}</p>
                        </div>
                        <div className="rounded-2xl bg-red-50 p-3">
                            <p className="text-xs font-medium text-red-700">Bloqueados</p>
                            <p className="text-2xl font-bold text-red-700">{resumoTreinamentos.bloqueados}</p>
                        </div>
                        <div className="rounded-2xl bg-violet-50 p-3">
                            <p className="text-xs font-medium text-violet-700">Em análise</p>
                            <p className="text-2xl font-bold text-violet-700">{resumoTreinamentos.emAnalise}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-100 p-3">
                            <p className="text-xs font-medium text-slate-700">Desmobilizados</p>
                            <p className="text-2xl font-bold text-slate-700">{resumoTreinamentos.desmobilizados}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
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
                                                            src={c.fotoUrl}
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


function Treinamentos({
    colaboradores,
    colaboradorInicialId,
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
    const [dataRealizacao, setDataRealizacao] = useState(hoje.toISOString().slice(0, 10));
    const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
    const [sugestaoDataArquivo, setSugestaoDataArquivo] = useState(null);
    const [observacao, setObservacao] = useState("");
    const [salvandoCertificado, setSalvandoCertificado] = useState(false);
    const [arquivosLote, setArquivosLote] = useState([]);
    const [salvandoLote, setSalvandoLote] = useState(false);
    const [sincronizandoStorage, setSincronizandoStorage] = useState(false);
    const [resultadoLote, setResultadoLote] = useState("");
    const [datasRevisao, setDatasRevisao] = useState({});
    const [salvandoDatasId, setSalvandoDatasId] = useState("");
    const [certificadosAbertos, setCertificadosAbertos] = useState({});
    const [gruposCertificadosAbertos, setGruposCertificadosAbertos] = useState({});
    const [buscaCertificados, setBuscaCertificados] = useState("");
    const [filtroStatusCertificados, setFiltroStatusCertificados] = useState("Todos");
    const [exigenciasAbertas, setExigenciasAbertas] = useState(false);
    const [enviandoAlertaTst, setEnviandoAlertaTst] = useState(false);

    const colabSelecionado =
        colaboradores.find((c) => String(c.codigoFuncionario) === String(colabId)) ||
        colaboradores.find((c) => String(c.id) === String(colaboradorInicialId)) ||
        colaboradores[0] ||
        null;

    const colabSelecionadoId = colabSelecionado?.id || "";
    const colabSelecionadoCodigo = colabSelecionado?.codigoFuncionario || "";
    const avaliacaoSelecionado = colabSelecionado ? avaliarTreinamentosColaborador(colabSelecionado) : null;
    const treinamentosDisponiveis = avaliacaoSelecionado?.itens?.length
        ? avaliacaoSelecionado.itens.map((item) => item.treinamento).filter(Boolean)
        : treinamentosBase;

    const treinamentoSelecionadoId = treinamentosDisponiveis.some((item) => Number(item.id) === Number(treinamentoId))
        ? Number(treinamentoId)
        : Number(treinamentosDisponiveis[0]?.id || treinamentoId);

    const vencimento = calcularVencimentoTreinamento(
        treinamentoSelecionadoId || treinamentosBase[0].id,
        dataRealizacao
    );

    const adicionarTreinamento = async () => {
        if (!colabSelecionadoId) {
            alert("Cadastre um colaborador primeiro.");
            return;
        }

        if (!arquivoSelecionado) {
            alert("Selecione o arquivo do certificado antes de salvar.");
            return;
        }

        setSalvandoCertificado(true);

        const ok = await onSalvarCertificado({
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
        }
    };

    const identificarColaboradorPorArquivo = (arquivo) => {
        const nomeArquivoOriginal = arquivo?.name || "";
        const nomeArquivo = normalizarTextoBusca(nomeArquivoOriginal.replace(/\.[^.]+$/, ""));
        const nomeArquivoCompacto = nomeArquivo.replace(/[^a-z0-9]/g, "");

        let melhor = null;
        let melhorPontuacao = 0;

        colaboradores.forEach((colaborador) => {
            const codigo = normalizarTextoBusca(colaborador.codigoFuncionario || "").replace(/[^a-z0-9]/g, "");
            const nome = normalizarTextoBusca(colaborador.nome || "").replace(/[^a-z0-9\s]/g, " ");
            const nomeCompacto = nome.replace(/\s+/g, "");
            const palavrasNome = nome.split(/\s+/).filter((parte) => parte.length >= 3);

            let pontos = 0;

            if (codigo && nomeArquivoCompacto.includes(codigo)) pontos += 120;
            if (nomeCompacto && nomeArquivoCompacto.includes(nomeCompacto)) pontos += 90;

            const acertosNome = palavrasNome.filter((parte) => nomeArquivo.includes(parte)).length;
            pontos += acertosNome * 15;

            if (palavrasNome.length > 0 && acertosNome >= Math.min(2, palavrasNome.length)) {
                pontos += 25;
            }

            if (pontos > melhorPontuacao) {
                melhorPontuacao = pontos;
                melhor = colaborador;
            }
        });

        return melhorPontuacao >= 25 ? melhor : null;
    };

    const prepararArquivosLote = async (listaArquivos) => {
        const arquivos = Array.from(listaArquivos || []);

        if (!validarListaArquivosAntesUpload(arquivos, "documentoSimples")) {
            setArquivosLote([]);
            return;
        }

        if (!colabSelecionado?.codigoFuncionario) {
            alert("Selecione o colaborador antes de enviar documentos em massa.");
            return;
        }

        const preparados = await Promise.all(
            arquivos.map(async (arquivo, index) => {
                const treinamento = inferirTreinamentoPorNomeArquivo(arquivo.name);
                const sugestaoData = await detectarDataEmissaoArquivo(arquivo);
                const dataArquivo = sugestaoData.data || dataRealizacaoPorArquivo(arquivo);
                const colaboradorSugerido = identificarColaboradorPorArquivo(arquivo);
                const pareceOutroColaborador =
                    colaboradorSugerido?.codigoFuncionario &&
                    String(colaboradorSugerido.codigoFuncionario) !== String(colabSelecionado.codigoFuncionario);

                return {
                    id: `${Date.now()}-${index}-${arquivo.name}`,
                    arquivo,
                    colaboradorCodigo: colabSelecionado.codigoFuncionario,
                    colaboradorSugeridoCodigo: colaboradorSugerido?.codigoFuncionario || "",
                    treinamentoId: treinamento?.id || "",
                    dataRealizacao: dataArquivo,
                    dataVencimento: treinamento ? calcularVencimentoTreinamento(treinamento.id, dataArquivo) : "",
                    sugestaoData,
                    status: treinamento
                        ? pareceOutroColaborador
                            ? `Atenção: arquivo parece ser de ${colaboradorSugerido.nome}`
                            : sugestaoData.data
                                ? "Treinamento e data identificados"
                                : "Treinamento identificado"
                        : "Treinamento não identificado",
                };
            })
        );

        setArquivosLote(preparados);
        setResultadoLote("");
    };

    const alterarColaboradorArquivoLote = (arquivoId, colaboradorCodigo) => {
        setArquivosLote((atual) =>
            atual.map((item) =>
                item.id === arquivoId
                    ? {
                        ...item,
                        colaboradorCodigo,
                        status: colaboradorCodigo
                            ? item.treinamentoId
                                ? "Conferido"
                                : "Treinamento não identificado"
                            : "Selecione o colaborador",
                    }
                    : item
            )
        );
    };

    const alterarTreinamentoArquivoLote = (arquivoId, treinamentoId) => {
        setArquivosLote((atual) =>
            atual.map((item) => {
                if (item.id !== arquivoId) return item;

                const treinamento = obterTreinamento(Number(treinamentoId));
                const dataBase = item.dataRealizacao || dataRealizacao;

                return {
                    ...item,
                    treinamentoId: treinamento?.id || "",
                    dataVencimento: treinamento ? calcularVencimentoTreinamento(treinamento.id, dataBase) : "",
                    status: treinamento && item.colaboradorCodigo ? "Conferido" : "Conferir dados",
                };
            })
        );
    };

    const alterarDataArquivoLote = (arquivoId, data) => {
        setArquivosLote((atual) =>
            atual.map((item) => {
                if (item.id !== arquivoId) return item;

                return {
                    ...item,
                    dataRealizacao: data,
                    dataVencimento: item.treinamentoId
                        ? calcularVencimentoTreinamento(item.treinamentoId, data)
                        : "",
                };
            })
        );
    };

    const selecionarArquivoCertificado = async (arquivo) => {
        setArquivoSelecionado(null);
        setSugestaoDataArquivo(null);

        if (!arquivo) return;

        if (!validarArquivoAntesUpload(arquivo, "documentoSimples")) return;

        setArquivoSelecionado(arquivo);

        const sugestao = await detectarDataEmissaoArquivo(arquivo);

        setSugestaoDataArquivo(sugestao);

        if (sugestao.data) {
            setDataRealizacao(sugestao.data);
        }
    };

    const removerArquivoLote = (arquivoId) => {
        setArquivosLote((atual) => atual.filter((item) => item.id !== arquivoId));
    };

    const sincronizarArquivosDoStorage = async () => {
        if (!onSincronizarStorage) return;

        setSincronizandoStorage(true);
        setResultadoLote("");

        const resultado = await onSincronizarStorage();

        setResultadoLote(resultado || "Sincronização concluída.");
        setSincronizandoStorage(false);
    };

    const salvarCertificadosEmLote = async () => {
        if (!arquivosLote.length) {
            alert("Selecione os arquivos do lote.");
            return;
        }

        const incompletos = arquivosLote.filter(
            (item) =>
                !item.colaboradorCodigo ||
                !item.treinamentoId ||
                !item.dataRealizacao ||
                (!treinamentoSemValidade(item.treinamentoId) && !item.dataVencimento)
        );

        if (incompletos.length > 0) {
            alert("Antes de salvar, confira colaborador, treinamento e datas de todos os arquivos do lote.");
            return;
        }

        setSalvandoLote(true);
        setResultadoLote("");

        let salvos = 0;
        let falhas = 0;
        const erros = [];

        for (const item of arquivosLote) {
            const colaboradorDoArquivo = colaboradores.find((c) => String(c.codigoFuncionario) === String(item.colaboradorCodigo));

            const ok = await onSalvarCertificado({
                colaboradorCodigo: String(item.colaboradorCodigo || ""),
                colaborador: colaboradorDoArquivo,
                treinamentoId: Number(item.treinamentoId),
                dataRealizacao: item.dataRealizacao,
                dataVencimento: item.dataVencimento,
                arquivo: item.arquivo,
                arquivoNome: item.arquivo.name,
                observacao: observacao.trim() || "Enviado em lote com distribuição automática por nome do arquivo",
            });

            if (ok) {
                salvos += 1;
            } else {
                falhas += 1;
                erros.push(item.arquivo.name);
            }
        }

        setSalvandoLote(false);
        setResultadoLote(
            `${salvos} certificado(s) salvo(s) e distribuído(s) por treinamento. ${falhas} falha(s).${erros.length ? ` Falhas: ${erros.join(", ")}` : ""
            }`
        );

        if (falhas === 0) {
            setArquivosLote([]);
            setObservacao("");
        }
    };

    const documentos = colaboradores.flatMap((c) =>
        (c.treinamentos || []).map((t) => ({ ...t, colaborador: c, treinamento: obterTreinamento(t.treinamentoId) }))
    );

    const documentosFiltrados = documentos.filter((documento) => {
        const vencimentoFiltro = datasRevisao[documento.id]?.vencimento ?? documento.vencimento ?? "";
        const status = statusDocumento(vencimentoFiltro, treinamentoSemValidade(documento.treinamentoId));
        const termo = normalizarTextoBusca(buscaCertificados);

        const textoBusca = normalizarTextoBusca(
            `${documento.colaborador?.nome || ""} ${documento.colaborador?.empresaExibicao || documento.colaborador?.empresa || ""} ${documento.colaborador?.codigoFuncionario || ""} ${documento.treinamento?.nome || ""} ${documento.arquivo || ""} ${status.texto || ""}`
        );

        const bateBusca = !termo || textoBusca.includes(termo);
        const bateStatus =
            filtroStatusCertificados === "Todos" ||
            (filtroStatusCertificados === "Em dia" && ["emdia", "semvalidade"].includes(status.chave)) ||
            (filtroStatusCertificados === "A vencer" && status.chave === "vencendo") ||
            (filtroStatusCertificados === "Vencido" && status.chave === "vencido");

        return bateBusca && bateStatus;
    });

    const documentosPorColaborador = colaboradores
        .map((colaborador) => {
            const avaliacao = avaliarTreinamentosColaborador(colaborador);
            const termo = normalizarTextoBusca(buscaCertificados);
            const certificadosDoColaborador = documentosFiltrados.filter(
                (documento) => String(documento.colaborador?.id) === String(colaborador.id)
            );

            const pendentesDoColaborador = avaliacao.itens
                .filter((item) => item.status.chave === "pendente")
                .filter((item) => {
                    const textoBusca = normalizarTextoBusca(
                        `${colaborador.nome || ""} ${colaborador.empresaExibicao || colaborador.empresa || ""} ${colaborador.codigoFuncionario || ""} ${item.treinamento?.nome || ""} pendente faltando`
                    );

                    const bateBusca = !termo || textoBusca.includes(termo);
                    const bateStatus = filtroStatusCertificados === "Todos" || filtroStatusCertificados === "Pendentes";

                    return bateBusca && bateStatus;
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

    const enviarDocumentoPendente = (colaborador, treinamento) => {
        setColabId(colaborador.codigoFuncionario);
        setTreinamentoId(Number(treinamento.id));
        setArquivoSelecionado(null);
        setSugestaoDataArquivo(null);
        setObservacao("");

        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const totalPorStatusCertificados = documentos.reduce(
        (acc, documento) => {
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
            pendentes: colaboradores.reduce(
                (total, colaborador) => total + avaliarTreinamentosColaborador(colaborador).pendentes.length,
                0
            ),
        }
    );


    const alertasTstPorEmpresa = useMemo(() => {
        const grupos = {};

        colaboradores.forEach((colaborador) => {
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
    }, [colaboradores]);

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
            "Sistema de Controle SST QR",
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

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header titulo="Treinamentos e certificados" subtitulo="Lançamento de certificados no Supabase, validade e controle automático de status." />

            <Card className="mb-5">
                <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={buscaCertificados}
                            onChange={(e) => setBuscaCertificados(e.target.value)}
                            placeholder="Pesquisar certificados por colaborador, empresa, código, treinamento ou arquivo"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <select
                        value={filtroStatusCertificados}
                        onChange={(e) => setFiltroStatusCertificados(e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                        <option value="Todos">Todos os status</option>
                        <option value="Pendentes">Pendentes ({totalPorStatusCertificados.pendentes})</option>
                        <option value="Em dia">Em dia ({totalPorStatusCertificados.emDia})</option>
                        <option value="A vencer">A vencer ({totalPorStatusCertificados.aVencer})</option>
                        <option value="Vencido">Vencidos ({totalPorStatusCertificados.vencidos})</option>
                    </select>
                </div>
            </Card>

            <div className="grid items-start gap-6 xl:grid-cols-[0.75fr_1.25fr]">
                <Card>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
                        <Upload className="h-4 w-4" />
                        Lançar certificado
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                        O arquivo será salvo no Supabase Storage usando o código do funcionário e o registro ficará vinculado ao UUID real do colaborador.
                    </p>

                    <div className="mt-5 space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Colaborador</label>
                            <select
                                value={colabSelecionadoCodigo}
                                onChange={(e) => {
                                    const novoColaboradorCodigo = e.target.value;
                                    const novoColaborador = colaboradores.find((c) => String(c.codigoFuncionario) === String(novoColaboradorCodigo));
                                    const novaAvaliacao = novoColaborador ? avaliarTreinamentosColaborador(novoColaborador) : null;
                                    const primeiroTreinamento = novaAvaliacao?.itens?.[0]?.treinamento?.id || treinamentosBase[0].id;

                                    setColabId(String(novoColaboradorCodigo));
                                    setTreinamentoId(Number(primeiroTreinamento));
                                }}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                {colaboradores.length === 0 && <option value="">Nenhum colaborador cadastrado</option>}
                                {colaboradores.map((c) => (
                                    <option key={c.id} value={c.codigoFuncionario}>
                                        {c.nome} — {c.empresaExibicao || c.empresa} — {c.codigoFuncionario}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Treinamento / documento</label>
                            <select
                                value={treinamentoSelecionadoId}
                                onChange={(e) => setTreinamentoId(Number(e.target.value))}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                            >
                                {treinamentosDisponiveis.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.nome}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {avaliacaoSelecionado && (
                            <div className="rounded-2xl bg-slate-50 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                            Documentos exigidos para a função: {avaliacaoSelecionado.matriz.rotulo}
                                        </p>
                                        <p className="mt-1 text-[11px] text-slate-400">
                                            {avaliacaoSelecionado.emDia.length} em dia · {avaliacaoSelecionado.pendentes.length} pendente(s) · {avaliacaoSelecionado.vencendo.length} a vencer · {avaliacaoSelecionado.vencidos.length} vencido(s)
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setExigenciasAbertas((valor) => !valor)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                    >
                                        {exigenciasAbertas ? (
                                            <>
                                                <ChevronUp className="h-4 w-4" />
                                                Recolher exigências
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4" />
                                                Ver exigências
                                            </>
                                        )}
                                    </button>
                                </div>

                                {exigenciasAbertas && (
                                    <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1 scrollbar-discreta">
                                        {avaliacaoSelecionado.itens.map((item) => (
                                            <div key={item.treinamento.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs">
                                                <span className="font-medium text-slate-700">{item.treinamento.nome}</span>
                                                <span className={classNames("rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", item.status.classe)}>
                                                    {item.status.texto}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Realização / emissão</label>
                                <input
                                    type="date"
                                    value={dataRealizacao}
                                    onChange={(e) => setDataRealizacao(e.target.value)}
                                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Validade / vencimento</label>
                                <input
                                    type="date"
                                    value={vencimento}
                                    readOnly
                                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                />
                            </div>
                        </div>

                        <textarea
                            value={observacao}
                            onChange={(e) => setObservacao(e.target.value)}
                            placeholder="Observação opcional"
                            rows={3}
                            className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                        />

                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
                            <Upload className="h-4 w-4" />
                            {arquivoSelecionado ? arquivoSelecionado.name : "Selecionar PDF ou imagem do certificado"}
                            <input
                                type="file"
                                accept="application/pdf,image/*"
                                className="hidden"
                                onChange={(e) => selecionarArquivoCertificado(e.target.files?.[0] || null)}
                            />
                        </label>
                        <FileUploadAviso arquivo={arquivoSelecionado} tipo="documentoSimples" />

                        {sugestaoDataArquivo && (
                            <div className={classNames(
                                "rounded-2xl px-3 py-2 text-xs font-medium ring-1",
                                sugestaoDataArquivo.data
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : "bg-orange-50 text-orange-700 ring-orange-100"
                            )}>
                                {sugestaoDataArquivo.mensagem}
                            </div>
                        )}

                        <button
                            onClick={adicionarTreinamento}
                            disabled={salvandoCertificado}
                            className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {salvandoCertificado ? "Salvando no Supabase..." : "Salvar certificado no banco"}
                        </button>

                        <div className="mt-6 border-t border-slate-200 pt-5">
                            <div className="rounded-3xl bg-blue-50 p-4">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-blue-900">
                                    <Upload className="h-4 w-4" />
                                    Envio em lote
                                </h3>
                                <p className="mt-1 text-xs text-blue-800/80">
                                    Selecione vários arquivos. O sistema tenta distribuir pelo nome do arquivo e identificar a data de emissão/realização no nome ou no conteúdo do PDF.
                                    Antes de salvar, confira colaborador, treinamento e data de cada documento.
                                </p>
                            </div>

                            <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-blue-300 bg-white px-4 py-4 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                                <Upload className="h-4 w-4" />
                                Selecionar vários certificados
                                <input
                                    type="file"
                                    accept="application/pdf,image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => prepararArquivosLote(e.target.files)}
                                />
                            </label>
                            <FileUploadAviso arquivos={arquivosLote.map((item) => item.arquivo)} tipo="documentoSimples" />

                            <button
                                type="button"
                                onClick={sincronizarArquivosDoStorage}
                                disabled={sincronizandoStorage}
                                className="mt-3 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {sincronizandoStorage ? "Sincronizando arquivos..." : "Sincronizar arquivos já enviados no Storage"}
                            </button>

                            {resultadoLote && arquivosLote.length === 0 && (
                                <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                                    {resultadoLote}
                                </div>
                            )}

                            {arquivosLote.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <div className="rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                                        <strong>Regra do lote:</strong> os arquivos serão vinculados ao colaborador selecionado
                                        {" "}<strong>{colabSelecionado?.nome}</strong>. O treinamento é identificado automaticamente pelo nome de cada arquivo.
                                        Confira qualquer item marcado como atenção antes de salvar.
                                    </div>

                                    <div className="max-h-96 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                                        {arquivosLote.map((item) => (
                                            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                                                <div className="mb-2 flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="truncate text-sm font-semibold text-slate-800">
                                                            <FileText className="mr-1 inline h-4 w-4" />
                                                            {item.arquivo.name}
                                                        </p>
                                                        <p className={classNames(
                                                            "mt-1 text-xs font-medium",
                                                            item.status === "Treinamento identificado" ||
                                                                item.status === "Treinamento e data identificados" ||
                                                                item.status === "Conferido"
                                                                ? "text-emerald-700"
                                                                : "text-orange-700"
                                                        )}>
                                                            {item.status}
                                                        </p>
                                                        {item.sugestaoData?.mensagem && (
                                                            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                                                                {item.sugestaoData.mensagem}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removerArquivoLote(item.id)}
                                                        className="rounded-xl bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                    >
                                                        Remover
                                                    </button>
                                                </div>

                                                <div className="grid gap-2">
                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador de destino</label>
                                                        <select
                                                            value={item.colaboradorCodigo}
                                                            onChange={(e) => alterarColaboradorArquivoLote(item.id, e.target.value)}
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                        >
                                                            <option value="">Selecione o colaborador</option>
                                                            {colaboradores.map((c) => (
                                                                <option key={c.id} value={c.codigoFuncionario}>
                                                                    {c.nome} — {c.empresaExibicao || c.empresa} — {c.codigoFuncionario}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Treinamento identificado</label>
                                                        <select
                                                            value={item.treinamentoId}
                                                            onChange={(e) => alterarTreinamentoArquivoLote(item.id, e.target.value)}
                                                            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                        >
                                                            <option value="">Selecione o treinamento</option>
                                                            {treinamentosBase.map((treinamento) => (
                                                                <option key={treinamento.id} value={treinamento.id}>
                                                                    {treinamento.nome}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="grid gap-2 sm:grid-cols-2">
                                                        <div>
                                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</label>
                                                            <input
                                                                type="date"
                                                                value={item.dataRealizacao}
                                                                onChange={(e) => alterarDataArquivoLote(item.id, e.target.value)}
                                                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</label>
                                                            <input
                                                                type="date"
                                                                value={item.dataVencimento}
                                                                readOnly
                                                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {resultadoLote && (
                                        <div className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                                            {resultadoLote}
                                        </div>
                                    )}

                                    <button
                                        onClick={salvarCertificadosEmLote}
                                        disabled={salvandoLote}
                                        className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {salvandoLote ? "Salvando lote..." : `Salvar ${arquivosLote.length} certificado(s) distribuído(s)`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="self-start">
                        <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                            <div>
                                <h2 className="text-lg font-bold text-slate-950">Alertas para TST</h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Treinamentos, certificados e ASO vencidos ou com vencimento nos próximos 30 dias.
                                </p>
                            </div>

                            <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                                {alertasTstPorEmpresa.reduce((total, grupo) => total + grupo.itens.length, 0)} item(ns) em alerta
                            </span>
                        </div>

                        {alertasTstPorEmpresa.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center">
                                <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-500" />
                                <h3 className="mt-3 font-bold text-slate-900">Nenhum documento vencido ou a vencer</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Quando houver documentos vencidos ou a vencer, o aviso ao TST aparecerá aqui.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {alertasTstPorEmpresa.map((grupo) => (
                                    <div key={grupo.empresa} className="rounded-3xl border border-slate-200 bg-white p-4">
                                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Empresa</p>
                                                <h3 className="mt-1 text-base font-bold text-slate-950">{grupo.empresa}</h3>
                                                <p className="mt-1 text-sm text-slate-500">
                                                    TST: {grupo.tstResponsavel || "Não informado"} · E-mail: {grupo.tstEmail || "Não cadastrado"}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => enviarEmailAlertaTstAutomatico(grupo)}
                                                    disabled={enviandoAlertaTst}
                                                    className="inline-flex min-w-[190px] items-center justify-center whitespace-nowrap rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {enviandoAlertaTst ? "Enviando..." : "Enviar aviso por e-mail"}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => copiarAvisoAlertaTst(grupo)}
                                                    className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                                >
                                                    Copiar aviso
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-3 space-y-2">
                                            {grupo.itens
                                                .sort((a, b) => a.dias - b.dias)
                                                .map((item, index) => {
                                                    const vencido = item.dias < 0;
                                                    const textoPrazo = vencido
                                                        ? `vencido há ${Math.abs(item.dias)} dia(s)`
                                                        : `faltam ${item.dias} dia(s)`;

                                                    return (
                                                        <div
                                                            key={`${grupo.empresa}-${item.codigo}-${item.treinamento}-${index}`}
                                                            className={classNames(
                                                                "rounded-2xl px-3 py-2 text-sm ring-1",
                                                                vencido
                                                                    ? "bg-red-50 text-red-900 ring-red-100"
                                                                    : "bg-orange-50 text-orange-950 ring-orange-100"
                                                            )}
                                                        >
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span
                                                                    className={classNames(
                                                                        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                                                        vencido ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                                                                    )}
                                                                >
                                                                    {vencido ? "Vencido" : "A vencer"}
                                                                </span>
                                                                <strong>{item.colaborador}</strong>
                                                            </div>
                                                            <p className="mt-1">
                                                                {item.treinamento} · vencimento em {formatDate(item.vencimento)} · {textoPrazo}
                                                            </p>
                                                            <p className="mt-1 text-xs opacity-80">
                                                                Código: {item.codigo || "-"} · Função: {item.funcao || "-"} · Situação: {item.situacaoObra || "-"}
                                                            </p>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs text-slate-500">
                            O botão de e-mail envia automaticamente pela função Supabase enviar-alerta-tst. Use Copiar aviso como alternativa manual quando precisar enviar pelo Outlook, Gmail ou WhatsApp.
                        </p>
                    </Card>

                    <Card className="self-start">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h2 className="text-lg font-bold text-slate-950">Base de certificados</h2>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                                {documentosFiltrados.length} certificado(s) · {totalPorStatusCertificados.pendentes} pendente(s)
                            </span>
                        </div>

                        <div className="space-y-3">
                            {documentos.length === 0 && totalPorStatusCertificados.pendentes === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                                    <FileText className="mx-auto h-10 w-10 text-slate-300" />
                                    <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado lançado ainda</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Os certificados enviados aparecerão nesta base para revisão de validade e consulta.
                                    </p>
                                </div>
                            )}

                            {documentos.length > 0 && documentosPorColaborador.length === 0 && (
                                <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                                    <Filter className="mx-auto h-10 w-10 text-slate-300" />
                                    <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado encontrado</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Ajuste a busca ou o filtro de status para localizar os certificados.
                                    </p>
                                </div>
                            )}

                            {documentosPorColaborador.map((grupo) => {
                                const colaborador = grupo.colaborador;
                                const certificados = grupo.certificados || [];
                                const pendentes = grupo.pendentes || [];
                                const grupoKey = String(colaborador?.id || colaborador?.codigoFuncionario || "sem-colaborador");
                                const grupoAberto = Boolean(gruposCertificadosAbertos[grupoKey]);

                                const resumoStatus = certificados.reduce(
                                    (acc, certificado) => {
                                        const valores = valoresRevisao(certificado);
                                        const status = statusDocumento(
                                            valores.vencimento || certificado.vencimento,
                                            treinamentoSemValidade(certificado.treinamentoId)
                                        );

                                        if (status.chave === "vencido") acc.vencidos += 1;
                                        else if (status.chave === "vencendo") acc.aVencer += 1;
                                        else acc.emDia += 1;

                                        return acc;
                                    },
                                    { emDia: 0, aVencer: 0, vencidos: 0 }
                                );

                                return (
                                    <div
                                        key={grupoKey}
                                        className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                                    >
                                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador</p>
                                                <p className="mt-1 break-words text-lg font-bold leading-snug text-slate-950">
                                                    {colaborador.nome}
                                                </p>
                                                <p className="mt-1 break-words text-sm text-slate-500">
                                                    {colaborador.empresaExibicao || colaborador.empresa}
                                                </p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                                    Código: {colaborador.codigoFuncionario}
                                                </p>
                                            </div>

                                            <div className="flex flex-col gap-2 lg:items-end">
                                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                        {certificados.length} certificado(s)
                                                    </span>

                                                    {pendentes.length > 0 && (
                                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                                                            {pendentes.length} faltando
                                                        </span>
                                                    )}

                                                    {resumoStatus.emDia > 0 && (
                                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                            {resumoStatus.emDia} em dia
                                                        </span>
                                                    )}

                                                    {resumoStatus.aVencer > 0 && (
                                                        <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                                                            {resumoStatus.aVencer} a vencer
                                                        </span>
                                                    )}

                                                    {resumoStatus.vencidos > 0 && (
                                                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                                            {resumoStatus.vencidos} vencido(s)
                                                        </span>
                                                    )}
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setGruposCertificadosAbertos((atual) => ({
                                                            ...atual,
                                                            [grupoKey]: !atual[grupoKey],
                                                        }))
                                                    }
                                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                >
                                                    {grupoAberto ? (
                                                        <>
                                                            <ChevronUp className="h-4 w-4" />
                                                            Recolher treinamentos
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="h-4 w-4" />
                                                            Ver treinamentos
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        {grupoAberto && (
                                            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                                                {pendentes.length > 0 && (
                                                    <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-3">
                                                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                            <div>
                                                                <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                                                    Documentos faltantes para envio
                                                                </p>
                                                                <p className="mt-1 text-[11px] text-blue-700">
                                                                    Clique em enviar para preencher automaticamente o colaborador e o treinamento no lançamento.
                                                                </p>
                                                            </div>

                                                            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">
                                                                {pendentes.length} pendente(s)
                                                            </span>
                                                        </div>

                                                        <div className="space-y-2">
                                                            {pendentes.map((item) => (
                                                                <div
                                                                    key={`pendente-${grupoKey}-${item.treinamento.id}`}
                                                                    className="flex flex-col justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100 lg:flex-row lg:items-center"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="flex flex-wrap items-center gap-2">
                                                                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                                                                                Pendente
                                                                            </span>
                                                                            <p className="break-words text-sm font-semibold text-slate-800">
                                                                                {item.treinamento.nome}
                                                                            </p>
                                                                        </div>
                                                                        <p className="mt-1 text-[11px] text-slate-500">
                                                                            Documento ainda não enviado para este colaborador.
                                                                        </p>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() => enviarDocumentoPendente(colaborador, item.treinamento)}
                                                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                                                    >
                                                                        <Upload className="h-4 w-4" />
                                                                        Enviar documento
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {certificados.length === 0 && pendentes.length === 0 && (
                                                    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                                        Nenhum item encontrado para este colaborador com o filtro atual.
                                                    </div>
                                                )}

                                                {certificados.map((d, idx) => {
                                                    const valores = valoresRevisao(d);
                                                    const semValidade = treinamentoSemValidade(d.treinamentoId);
                                                    const statusAtual = statusDocumento(valores.vencimento || d.vencimento, semValidade);
                                                    const itemKey = String(d.id || `${d.colaborador.id}-${d.treinamentoId}-${idx}`);
                                                    const aberto = Boolean(certificadosAbertos[itemKey]);

                                                    return (
                                                        <div
                                                            key={itemKey}
                                                            className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                                                        >
                                                            <div className="grid gap-3 lg:grid-cols-[1fr_150px] lg:items-start">
                                                                <div className="min-w-0">
                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <StatusPill status={statusAtual} small />
                                                                        <h3 className="break-words text-base font-bold leading-snug text-slate-900">
                                                                            {d.treinamento.nome}
                                                                        </h3>
                                                                    </div>

                                                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                                        <FileText className="h-4 w-4 text-slate-400" />
                                                                        <span className="break-words">{d.arquivo || "Arquivo não informado"}</span>
                                                                    </div>

                                                                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                                        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</p>
                                                                            <p className="text-xs font-semibold text-slate-700">{formatDate(valores.realizado)}</p>
                                                                        </div>

                                                                        <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                            <p className="text-xs font-semibold text-slate-700">
                                                                                {semValidade ? "Sem validade" : formatDate(valores.vencimento)}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="flex flex-col gap-2 lg:items-stretch">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setCertificadosAbertos((atual) => ({
                                                                                ...atual,
                                                                                [itemKey]: !atual[itemKey],
                                                                            }))
                                                                        }
                                                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                                                    >
                                                                        {aberto ? (
                                                                            <>
                                                                                <ChevronUp className="h-4 w-4" />
                                                                                Ocultar datas
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ChevronDown className="h-4 w-4" />
                                                                                Revisar datas
                                                                            </>
                                                                        )}
                                                                    </button>

                                                                    <button
                                                                        onClick={() => onVisualizarCertificado(d)}
                                                                        className="rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                                                                    >
                                                                        Abrir
                                                                    </button>

                                                                    <button
                                                                        onClick={() => onExcluirCertificado(d)}
                                                                        className="rounded-xl bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                                    >
                                                                        Excluir
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {aberto && (
                                                                <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                                                                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                                                                        <div>
                                                                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Realização</p>
                                                                            <input
                                                                                type="date"
                                                                                value={valores.realizado}
                                                                                onChange={(e) => alterarDataRevisao(d, "realizado", e.target.value)}
                                                                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                            />
                                                                        </div>

                                                                        <div>
                                                                            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                            {semValidade ? (
                                                                                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                                                                                    Sem validade
                                                                                </div>
                                                                            ) : (
                                                                                <input
                                                                                    type="date"
                                                                                    value={valores.vencimento}
                                                                                    onChange={(e) => alterarDataRevisao(d, "vencimento", e.target.value)}
                                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                                />
                                                                            )}
                                                                        </div>

                                                                        <button
                                                                            type="button"
                                                                            onClick={() => salvarDatasCertificado(d)}
                                                                            disabled={salvandoDatasId === d.id}
                                                                            className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                                                                        >
                                                                            {salvandoDatasId === d.id ? "Salvando..." : "Salvar datas"}
                                                                        </button>
                                                                    </div>

                                                                    <p className="mt-3 text-xs leading-relaxed text-slate-400">
                                                                        {semValidade
                                                                            ? "Este documento não possui validade. Ao revisar, somente a data de realização/emissão será atualizada."
                                                                            : "Ao alterar a realização, o vencimento é recalculado automaticamente pela validade do treinamento."}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
}



function RelatorioAuditoria({
    auditoria = [],
    emailsEnviados = [],
    carregando,
    onAtualizar,
    onListarArquivosStorage,
    onExcluirArquivoStorage,
    onListarUsuariosAuditoria,
    onSalvarUsuarioAuditoria,
    onAlternarUsuarioAuditoria,
    onBloquear,
}) {
    const [busca, setBusca] = useState("");
    const [filtroAcao, setFiltroAcao] = useState("Todas");
    const [filtrosStorage, setFiltrosStorage] = useState({
        empresa: "Todas",
        colaborador: "Todos",
        tipo: "Todos",
        dataInicio: "",
        dataFim: "",
        tamanho: "Todos",
        vinculo: "Todos",
    });
    const [arquivosStorageAuditoria, setArquivosStorageAuditoria] = useState([]);
    const [carregandoStorageAuditoria, setCarregandoStorageAuditoria] = useState(false);
    const [excluindoStorageAuditoria, setExcluindoStorageAuditoria] = useState("");
    const [usuariosAuditoria, setUsuariosAuditoria] = useState([]);
    const [carregandoUsuariosAuditoria, setCarregandoUsuariosAuditoria] = useState(false);
    const [salvandoUsuarioAuditoria, setSalvandoUsuarioAuditoria] = useState(false);
    const [alterandoUsuarioAuditoria, setAlterandoUsuarioAuditoria] = useState("");
    const [novoUsuarioAuditoria, setNovoUsuarioAuditoria] = useState({
        email: "",
        nome: "",
        funcao: "",
    });
    const [detalhesAuditoriaAbertos, setDetalhesAuditoriaAbertos] = useState({});

    const alternarDetalhesAuditoria = (id) => {
        setDetalhesAuditoriaAbertos((atual) => ({
            ...atual,
            [id]: !atual[id],
        }));
    };

    const acoes = useMemo(
        () => Array.from(new Set(auditoria.map((item) => item.acao).filter(Boolean))).sort(),
        [auditoria]
    );

    const registrosFiltrados = useMemo(() => {
        const termo = normalizarTextoBusca(busca);

        return auditoria.filter((item) => {
            const origemAcesso = item.dados?.origemAcesso || {};
            const texto = normalizarTextoBusca(
                `${item.usuario_email || ""} ${item.acao || ""} ${item.tabela || ""} ${item.descricao || ""} ${item.registro_id || ""} ${origemAcesso.url || ""} ${origemAcesso.pagina || ""} ${origemAcesso.navegador || ""} ${origemAcesso.plataforma || ""}`
            );

            const bateBusca = !termo || texto.includes(termo);
            const bateAcao = filtroAcao === "Todas" || item.acao === filtroAcao;

            return bateBusca && bateAcao;
        });
    }, [auditoria, busca, filtroAcao]);

    const ultimosAcessosAuditoria = auditoria
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("acesso"))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 8);

    const mesAtualEmails = hoje.getMonth();
    const anoAtualEmails = hoje.getFullYear();
    const emailsMesAuditoria = emailsEnviados.filter((item) => {
        const data = item.data_envio ? new Date(item.data_envio) : null;
        return data && data.getMonth() === mesAtualEmails && data.getFullYear() === anoAtualEmails;
    });
    const emailsSucessoAuditoria = emailsMesAuditoria.filter((item) => normalizarTextoBusca(item.status_envio).includes("sucesso"));
    const emailsErroAuditoria = emailsMesAuditoria.filter((item) => normalizarTextoBusca(item.status_envio).includes("erro"));
    const ultimosEmailsAuditoria = [...emailsEnviados]
        .sort((a, b) => new Date(b.data_envio || 0) - new Date(a.data_envio || 0))
        .slice(0, 8);

    const obterEmpresaArquivoStorage = (arquivo) =>
        arquivo.empresaNome || arquivo.colaboradorEmpresa || "Sem empresa vinculada";

    const obterColaboradorArquivoStorage = (arquivo) =>
        arquivo.colaboradorNome || "Sem colaborador vinculado";

    const obterTipoArquivoStorage = (arquivo) =>
        arquivo.tipoDocumentoEmpresa || arquivo.treinamentoNome || arquivo.origemTipo || arquivo.bucket || "Tipo não identificado";

    const obterDataArquivoStorage = (arquivo) => {
        if (!arquivo?.atualizadoEm) return "";

        const data = new Date(arquivo.atualizadoEm);
        return Number.isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
    };

    const tamanhoArquivoDentroDoFiltro = (arquivo) => {
        const tamanho = Number(arquivo.tamanho || 0);

        if (filtrosStorage.tamanho === "Todos") return true;
        if (filtrosStorage.tamanho === "ate-1mb") return tamanho <= 1024 ** 2;
        if (filtrosStorage.tamanho === "1mb-10mb") return tamanho > 1024 ** 2 && tamanho <= 10 * 1024 ** 2;
        if (filtrosStorage.tamanho === "10mb-50mb") return tamanho > 10 * 1024 ** 2 && tamanho <= 50 * 1024 ** 2;
        if (filtrosStorage.tamanho === "acima-50mb") return tamanho > 50 * 1024 ** 2;

        return true;
    };

    const arquivosStorageAuditoriaSemRegistro = arquivosStorageAuditoria.filter((arquivo) => !arquivo.emUso);
    const arquivosStorageAuditoriaEmUso = arquivosStorageAuditoria.filter((arquivo) => arquivo.emUso);
    const storageTotalBytes = arquivosStorageAuditoria.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageEmUsoBytes = arquivosStorageAuditoriaEmUso.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageSemRegistroBytes = arquivosStorageAuditoriaSemRegistro.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageLimiteBytes = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    const storagePercentual = calcularPercentualUsoStorage(storageTotalBytes);
    const storageStatus =
        storagePercentual >= 90
            ? {
                texto: "Crítico",
                detalhe: "Acima de 90% do limite configurado. Avaliar limpeza de arquivos sem vínculo ou aumento de plano.",
                classe: "bg-red-50 text-red-700 ring-red-200",
                barra: "bg-red-500",
            }
            : storagePercentual >= 70
                ? {
                    texto: "Atenção",
                    detalhe: "Entre 70% e 89% do limite configurado. Acompanhar crescimento dos uploads.",
                    classe: "bg-orange-50 text-orange-700 ring-orange-200",
                    barra: "bg-orange-500",
                }
                : {
                    texto: "Normal",
                    detalhe: "Até 70% do limite configurado. Capacidade dentro do controle esperado.",
                    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                    barra: "bg-emerald-500",
                };

    const arquivosStorageFiltrados = arquivosStorageAuditoria
        .filter((arquivo) => {
            const empresa = obterEmpresaArquivoStorage(arquivo);
            const colaborador = obterColaboradorArquivoStorage(arquivo);
            const tipo = obterTipoArquivoStorage(arquivo);
            const dataArquivo = obterDataArquivoStorage(arquivo);

            const bateEmpresa = filtrosStorage.empresa === "Todas" || empresa === filtrosStorage.empresa;
            const bateColaborador = filtrosStorage.colaborador === "Todos" || colaborador === filtrosStorage.colaborador;
            const bateTipo = filtrosStorage.tipo === "Todos" || tipo === filtrosStorage.tipo;
            const bateInicio = !filtrosStorage.dataInicio || (dataArquivo && dataArquivo >= filtrosStorage.dataInicio);
            const bateFim = !filtrosStorage.dataFim || (dataArquivo && dataArquivo <= filtrosStorage.dataFim);
            const bateTamanho = tamanhoArquivoDentroDoFiltro(arquivo);
            const bateVinculo =
                filtrosStorage.vinculo === "Todos" ||
                (filtrosStorage.vinculo === "Com vínculo" && arquivo.emUso) ||
                (filtrosStorage.vinculo === "Sem vínculo" && !arquivo.emUso);

            return bateEmpresa && bateColaborador && bateTipo && bateInicio && bateFim && bateTamanho && bateVinculo;
        })
        .sort((a, b) => {
            const dataA = a.atualizadoEm ? new Date(a.atualizadoEm).getTime() : 0;
            const dataB = b.atualizadoEm ? new Date(b.atualizadoEm).getTime() : 0;

            return dataB - dataA || Number(b.tamanho || 0) - Number(a.tamanho || 0);
        });

    const opcoesEmpresasStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterEmpresaArquivoStorage))).sort();
    const opcoesColaboradoresStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterColaboradorArquivoStorage))).sort();
    const opcoesTiposStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterTipoArquivoStorage))).sort();

    const agruparArquivosStorage = (lista, obterChave) =>
        Object.values(
            lista.reduce((acc, arquivo) => {
                const chave = obterChave(arquivo) || "Não informado";

                if (!acc[chave]) {
                    acc[chave] = {
                        nome: chave,
                        arquivos: 0,
                        bytes: 0,
                        emUso: 0,
                        semRegistro: 0,
                    };
                }

                acc[chave].arquivos += 1;
                acc[chave].bytes += Number(arquivo.tamanho || 0);

                if (arquivo.emUso) acc[chave].emUso += 1;
                else acc[chave].semRegistro += 1;

                return acc;
            }, {})
        ).sort((a, b) => b.arquivos - a.arquivos || b.bytes - a.bytes || a.nome.localeCompare(b.nome));

    const arquivosPorEmpresaStorage = agruparArquivosStorage(arquivosStorageAuditoria, obterEmpresaArquivoStorage);
    const arquivosPorTipoStorage = agruparArquivosStorage(arquivosStorageAuditoria, obterTipoArquivoStorage);
    const storagePorBucket = agruparArquivosStorage(arquivosStorageAuditoria, (arquivo) => arquivo.bucket || "storage")
        .map((item) => ({ ...item, bucket: item.nome }))
        .sort((a, b) => b.bytes - a.bytes);
    const maioresArquivosStorage = [...arquivosStorageAuditoria]
        .sort((a, b) => Number(b.tamanho || 0) - Number(a.tamanho || 0))
        .slice(0, 6);
    const ultimoUploadStorage = [...arquivosStorageAuditoria]
        .filter((arquivo) => arquivo.atualizadoEm)
        .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())[0];

    const carregarStorageAuditoria = async () => {
        if (!onListarArquivosStorage) return;

        setCarregandoStorageAuditoria(true);

        const lista = await onListarArquivosStorage();

        setArquivosStorageAuditoria(lista || []);
        setCarregandoStorageAuditoria(false);
    };

    const excluirStorageAuditoria = async (arquivo) => {
        if (!onExcluirArquivoStorage) return;

        setExcluindoStorageAuditoria(arquivo.caminho);

        const ok = await onExcluirArquivoStorage(arquivo);

        setExcluindoStorageAuditoria("");

        if (ok) {
            const lista = await onListarArquivosStorage();
            setArquivosStorageAuditoria(lista || []);
            onAtualizar?.();
        }
    };

    const carregarUsuariosAuditoria = async () => {
        if (!onListarUsuariosAuditoria) return;

        setCarregandoUsuariosAuditoria(true);

        const lista = await onListarUsuariosAuditoria();

        setUsuariosAuditoria(lista || []);
        setCarregandoUsuariosAuditoria(false);
    };

    const salvarUsuarioAuditoriaTela = async (evento) => {
        evento.preventDefault();

        if (!novoUsuarioAuditoria.email.trim()) {
            alert("Informe o e-mail do usuário que terá acesso à Auditoria.");
            return;
        }

        setSalvandoUsuarioAuditoria(true);

        const ok = await onSalvarUsuarioAuditoria?.({
            ...novoUsuarioAuditoria,
            email: novoUsuarioAuditoria.email.trim().toLowerCase(),
            nome: novoUsuarioAuditoria.nome.trim(),
            funcao: novoUsuarioAuditoria.funcao.trim(),
        });

        setSalvandoUsuarioAuditoria(false);

        if (ok) {
            setNovoUsuarioAuditoria({ email: "", nome: "", funcao: "" });
            carregarUsuariosAuditoria();
        }
    };

    const alternarUsuarioAuditoriaTela = async (usuarioAutorizado) => {
        setAlterandoUsuarioAuditoria(usuarioAutorizado.id);

        const ok = await onAlternarUsuarioAuditoria?.(usuarioAutorizado);

        setAlterandoUsuarioAuditoria("");

        if (ok) {
            carregarUsuariosAuditoria();
        }
    };

    const baixarCsvAuditoria = () => {
        const cabecalho = ["Data/Hora", "Usuário", "Ação", "Tabela", "Registro", "Descrição", "Origem do acesso", "Página", "Navegador", "Plataforma"];
        const linhas = registrosFiltrados.map((item) => {
            const origemAcesso = item.dados?.origemAcesso || {};

            return [
                new Date(item.created_at).toLocaleString("pt-BR"),
                item.usuario_email || "-",
                item.acao || "-",
                item.tabela || "-",
                item.registro_id || "-",
                item.descricao || "-",
                origemAcesso.url || "-",
                origemAcesso.pagina || "-",
                origemAcesso.navegador || "-",
                origemAcesso.plataforma || "-",
            ];
        });

        const csv = [cabecalho, ...linhas]
            .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(";"))
            .join("\n");

        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `relatorio-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Auditoria do sistema"
                subtitulo="Relatório de acessos, consultas QR e alterações feitas no banco de dados."
                acao={
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onAtualizar}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Atualizar
                        </button>

                        <button
                            onClick={onBloquear}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <Lock className="h-4 w-4" />
                            Bloquear auditoria
                        </button>

                        <button
                            onClick={baixarCsvAuditoria}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Baixar CSV
                        </button>
                    </div>
                }
            />

            <div className="grid gap-3 md:grid-cols-4">
                <CardRecolhivel titulo="Total de eventos" defaultOpen compacto>
                    <p className="text-3xl font-bold text-slate-950">{auditoria.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="Eventos filtrados" defaultOpen compacto>
                    <p className="text-3xl font-bold text-blue-700">{registrosFiltrados.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="Acessos" defaultOpen compacto>
                    <p className="text-3xl font-bold text-emerald-700">
                        {auditoria.filter((item) => String(item.acao || "").includes("ACESSO")).length}
                    </p>
                </CardRecolhivel>

                <CardRecolhivel titulo="Alterações" defaultOpen compacto>
                    <p className="text-3xl font-bold text-orange-700">
                        {auditoria.filter((item) => ["INSERT", "UPDATE", "DELETE"].includes(item.acao)).length}
                    </p>
                </CardRecolhivel>

                <CardRecolhivel titulo="E-mails no mês" defaultOpen compacto>
                    <p className="text-3xl font-bold text-blue-700">{emailsMesAuditoria.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="E-mails com sucesso" defaultOpen compacto>
                    <p className="text-3xl font-bold text-emerald-700">{emailsSucessoAuditoria.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="E-mails com erro" defaultOpen compacto>
                    <p className="text-3xl font-bold text-red-700">{emailsErroAuditoria.length}</p>
                </CardRecolhivel>
            </div>

            <AuditoriaAtividades
                ultimosAcessosAuditoria={ultimosAcessosAuditoria}
                ultimosEmailsAuditoria={ultimosEmailsAuditoria}
            />

            <CardRecolhivel
                className="mt-5"
                titulo="Permissões da Auditoria de sistema"
                subtitulo="Libere ou bloqueie diretamente pelo sistema quem pode acessar somente a Auditoria de sistema. Dashboard Auditoria e Nova Auditoria continuam liberados para todos."
                contador={usuariosAuditoria.length}
                defaultOpen={false}
                acao={(
                    <button
                        type="button"
                        onClick={carregarUsuariosAuditoria}
                        disabled={carregandoUsuariosAuditoria}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw className={classNames("h-4 w-4", carregandoUsuariosAuditoria ? "animate-spin" : "")} />
                        {carregandoUsuariosAuditoria ? "Carregando..." : "Carregar usuários"}
                    </button>
                )}
            >
                <form onSubmit={salvarUsuarioAuditoriaTela} className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                        type="email"
                        value={novoUsuarioAuditoria.email}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, email: e.target.value })}
                        placeholder="E-mail do usuário"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <input
                        value={novoUsuarioAuditoria.nome}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, nome: e.target.value })}
                        placeholder="Nome"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <input
                        value={novoUsuarioAuditoria.funcao}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, funcao: e.target.value })}
                        placeholder="Função"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <button
                        type="submit"
                        disabled={salvandoUsuarioAuditoria}
                        className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        {salvandoUsuarioAuditoria ? "Salvando..." : "Liberar Auditoria de sistema"}
                    </button>
                </form>

                <div className="mt-4 space-y-2">
                    {usuariosAuditoria.length === 0 && !carregandoUsuariosAuditoria && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Clique em <strong>Carregar usuários</strong> para visualizar quem tem acesso à Auditoria de sistema.
                        </div>
                    )}

                    {usuariosAuditoria.map((usuarioAutorizado) => (
                        <div
                            key={usuarioAutorizado.id}
                            className={classNames(
                                "rounded-3xl border p-4",
                                usuarioAutorizado.pode_acessar_auditoria
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-red-200 bg-red-50"
                            )}
                        >
                            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="break-words font-bold text-slate-950">{usuarioAutorizado.email}</p>
                                        <span
                                            className={classNames(
                                                "rounded-full px-3 py-1 text-xs font-bold ring-1",
                                                usuarioAutorizado.pode_acessar_auditoria
                                                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                                    : "bg-red-100 text-red-700 ring-red-200"
                                            )}
                                        >
                                            {usuarioAutorizado.pode_acessar_auditoria ? "Auditoria de sistema liberada" : "Auditoria de sistema bloqueada"}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {usuarioAutorizado.nome || "Nome não informado"} · {usuarioAutorizado.funcao || "Função não informada"}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Perfil: {usuarioAutorizado.perfil || "usuario"} · Usuário {usuarioAutorizado.ativo ? "ativo" : "inativo"}
                                        {usuarioAutorizado.acesso_global ? " · Administrador global" : ""}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => alternarUsuarioAuditoriaTela(usuarioAutorizado)}
                                    disabled={alterandoUsuarioAuditoria === usuarioAutorizado.id}
                                    className={classNames(
                                        "whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold ring-1 disabled:opacity-60",
                                        usuarioAutorizado.pode_acessar_auditoria
                                            ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
                                            : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                                    )}
                                >
                                    {alterandoUsuarioAuditoria === usuarioAutorizado.id
                                        ? "Atualizando..."
                                        : usuarioAutorizado.pode_acessar_auditoria
                                            ? "Bloquear Auditoria de sistema"
                                            : "Liberar Auditoria de sistema"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                    Use esta área para liberar ou bloquear somente a Auditoria de sistema sem editar SQL manualmente. O Dashboard Auditoria e a Nova Auditoria permanecem disponíveis para todos os usuários logados.
                </p>
            </CardRecolhivel>

            <CardRecolhivel
                className="mt-5"
                titulo="Arquivos salvos no Storage"
                subtitulo="Controle de capacidade, vínculos, tipos de documentos, maiores arquivos e uploads recentes."
                contador={arquivosStorageAuditoria.length}
                defaultOpen={false}
                acao={(
                    <button
                        type="button"
                        onClick={carregarStorageAuditoria}
                        disabled={carregandoStorageAuditoria}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        <Database className="h-4 w-4" />
                        {carregandoStorageAuditoria ? "Carregando..." : "Carregar arquivos"}
                    </button>
                )}
            >
                <div className={classNames("mb-4 rounded-3xl p-4 ring-1", storageStatus.classe)}>
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                        <div>
                            <p className="text-sm font-bold">Alerta de armazenamento: {storageStatus.texto}</p>
                            <p className="mt-1 text-xs leading-relaxed">{storageStatus.detalhe}</p>
                        </div>
                        <div className="text-left lg:text-right">
                            <p className="text-3xl font-black">{storagePercentual}%</p>
                            <p className="text-xs font-semibold">{formatarBytes(storageTotalBytes)} de {formatarBytes(storageLimiteBytes)}</p>
                        </div>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-white/70">
                        <div
                            className={classNames("h-full rounded-full", storageStatus.barra)}
                            style={{ width: `${Math.max(2, storagePercentual)}%` }}
                        />
                    </div>

                    <p className="mt-2 text-[11px] leading-relaxed opacity-80">
                        Regra visual: até 70% normal; de 70% a 89% atenção; acima de 90% crítico.
                    </p>
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total usado</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{formatarBytes(storageTotalBytes)}</p>
                        <p className="mt-1 text-xs text-slate-500">Limite: {formatarBytes(storageLimiteBytes)}</p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total de arquivos</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{arquivosStorageAuditoria.length}</p>
                        <p className="mt-1 text-xs text-slate-500">{arquivosStorageFiltrados.length} exibido(s) no filtro</p>
                    </div>

                    <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Arquivos vinculados</p>
                        <p className="mt-2 text-2xl font-black text-emerald-800">{arquivosStorageAuditoriaEmUso.length}</p>
                        <p className="mt-1 text-xs text-emerald-700">{formatarBytes(storageEmUsoBytes)} em registros ativos</p>
                    </div>

                    <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Sem vínculo</p>
                        <p className="mt-2 text-2xl font-black text-red-800">{arquivosStorageAuditoriaSemRegistro.length}</p>
                        <p className="mt-1 text-xs text-red-700">{formatarBytes(storageSemRegistroBytes)} sem registro</p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Último upload</p>
                        <p className="mt-2 break-words text-sm font-black text-slate-950">
                            {ultimoUploadStorage?.nome || "Nenhum arquivo carregado"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {ultimoUploadStorage?.atualizadoEm ? new Date(ultimoUploadStorage.atualizadoEm).toLocaleString("pt-BR") : "-"}
                        </p>
                    </div>
                </div>

                <div className="mb-5 grid gap-4 xl:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Arquivos por empresa</h3>
                        <p className="mt-1 text-xs text-slate-500">Quantidade e tamanho por empresa vinculada ao arquivo.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {arquivosPorEmpresaStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {arquivosPorEmpresaStorage.slice(0, 10).map((item) => (
                                <div key={item.nome} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <div className="flex justify-between gap-3">
                                        <span className="break-words font-bold text-slate-700">{item.nome}</span>
                                        <span className="shrink-0 font-bold text-slate-950">{item.arquivos}</span>
                                    </div>
                                    <p className="mt-1 text-slate-500">{formatarBytes(item.bytes)} · {item.semRegistro} sem vínculo</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Arquivos por tipo</h3>
                        <p className="mt-1 text-xs text-slate-500">Certificados, documentos empresariais, contratos, logos e fotos.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {arquivosPorTipoStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {arquivosPorTipoStorage.slice(0, 10).map((item) => (
                                <div key={item.nome} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <div className="flex justify-between gap-3">
                                        <span className="break-words font-bold text-slate-700">{item.nome}</span>
                                        <span className="shrink-0 font-bold text-slate-950">{item.arquivos}</span>
                                    </div>
                                    <p className="mt-1 text-slate-500">{formatarBytes(item.bytes)} · {item.emUso} vinculados</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Maiores arquivos</h3>
                        <p className="mt-1 text-xs text-slate-500">Prioridade para limpeza ou compactação quando o uso crescer.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {maioresArquivosStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {maioresArquivosStorage.map((arquivo) => (
                                <div key={`${arquivo.bucket}-${arquivo.caminho}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <p className="break-words font-bold text-slate-700">{arquivo.nome}</p>
                                    <p className="mt-1 text-slate-500">
                                        {formatarBytes(arquivo.tamanho || 0)} · {obterEmpresaArquivoStorage(arquivo)} · {arquivo.emUso ? "vinculado" : "sem vínculo"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                        <div>
                            <h3 className="font-bold text-slate-950">Filtros dos arquivos salvos</h3>
                            <p className="mt-1 text-xs text-slate-500">Filtre por empresa, colaborador, tipo, data de envio, tamanho e vínculo.</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setFiltrosStorage({
                                empresa: "Todas",
                                colaborador: "Todos",
                                tipo: "Todos",
                                dataInicio: "",
                                dataFim: "",
                                tamanho: "Todos",
                                vinculo: "Todos",
                            })}
                            className="w-fit rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <select
                            value={filtrosStorage.empresa}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, empresa: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todas">Todas as empresas</option>
                            {opcoesEmpresasStorage.map((empresa) => (
                                <option key={empresa} value={empresa}>{empresa}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.colaborador}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, colaborador: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os colaboradores</option>
                            {opcoesColaboradoresStorage.map((colaborador) => (
                                <option key={colaborador} value={colaborador}>{colaborador}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.tipo}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tipo: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os tipos</option>
                            {opcoesTiposStorage.map((tipo) => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.tamanho}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tamanho: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os tamanhos</option>
                            <option value="ate-1mb">Até 1 MB</option>
                            <option value="1mb-10mb">1 MB a 10 MB</option>
                            <option value="10mb-50mb">10 MB a 50 MB</option>
                            <option value="acima-50mb">Acima de 50 MB</option>
                        </select>

                        <select
                            value={filtrosStorage.vinculo}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, vinculo: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Com e sem vínculo</option>
                            <option value="Com vínculo">Somente vinculados</option>
                            <option value="Sem vínculo">Somente sem vínculo</option>
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                value={filtrosStorage.dataInicio}
                                onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataInicio: e.target.value }))}
                                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                title="Data inicial de envio"
                            />
                            <input
                                type="date"
                                value={filtrosStorage.dataFim}
                                onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataFim: e.target.value }))}
                                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                title="Data final de envio"
                            />
                        </div>
                    </div>
                </div>

                {storagePorBucket.length > 0 && (
                    <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Uso por bucket</h3>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                            {storagePorBucket.map((bucketInfo) => (
                                <div key={bucketInfo.bucket} className="rounded-2xl bg-slate-50 p-3 text-xs ring-1 ring-slate-200">
                                    <p className="break-words font-bold text-slate-700">{bucketInfo.bucket}</p>
                                    <p className="mt-1 text-slate-500">
                                        {bucketInfo.arquivos} arquivo(s) · {formatarBytes(bucketInfo.bytes)}
                                    </p>
                                    <p className="mt-1 text-slate-400">
                                        {bucketInfo.emUso} em uso · {bucketInfo.semRegistro} sem vínculo
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {arquivosStorageAuditoria.length === 0 && !carregandoStorageAuditoria && (
                    <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        Clique em <strong>Carregar arquivos</strong> para consultar o Storage.
                    </div>
                )}

                {arquivosStorageAuditoria.length > 0 && (
                    <div>
                        <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                            <p className="text-sm font-bold text-slate-950">
                                Arquivos encontrados: {arquivosStorageFiltrados.length} de {arquivosStorageAuditoria.length}
                            </p>
                            <p className="text-xs text-slate-500">
                                Exibindo primeiro os uploads mais recentes.
                            </p>
                        </div>

                        {arquivosStorageFiltrados.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Nenhum arquivo encontrado com os filtros selecionados.
                            </div>
                        )}

                        {arquivosStorageFiltrados.length > 0 && (
                            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                                {arquivosStorageFiltrados.map((arquivo) => (
                                    <div
                                        key={`${arquivo.bucket}-${arquivo.caminho}`}
                                        className={classNames(
                                            "rounded-2xl px-3 py-2 text-sm ring-1",
                                            arquivo.emUso
                                                ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                                                : "bg-red-50 text-red-900 ring-red-100"
                                        )}
                                    >
                                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="break-words font-bold">{arquivo.nome}</p>
                                                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                        {arquivo.emUso ? "Em uso" : "Sem vínculo"}
                                                    </span>
                                                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                        {formatarBytes(arquivo.tamanho || 0)}
                                                    </span>
                                                </div>

                                                <p className="mt-1 break-words text-xs opacity-80">
                                                    <strong>Empresa:</strong> {obterEmpresaArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Colaborador:</strong> {obterColaboradorArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Tipo:</strong> {obterTipoArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Bucket:</strong> {arquivo.bucket || "-"} · <strong>Pasta:</strong> {arquivo.pasta || "raiz"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Fonte do vínculo:</strong> {arquivo.tabelaOrigem || arquivo.origemRegistro || "Somente Storage"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Data de envio/atualização:</strong> {arquivo.atualizadoEm ? new Date(arquivo.atualizadoEm).toLocaleString("pt-BR") : "Não identificada"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Caminho:</strong> {arquivo.caminho}
                                                </p>

                                                {!arquivo.emUso && (
                                                    <p className="mt-1 break-words text-xs font-semibold text-red-700">
                                                        Arquivo sem vínculo com registro atual do sistema.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => excluirStorageAuditoria(arquivo)}
                                                    disabled={arquivo.emUso || excluindoStorageAuditoria === arquivo.caminho}
                                                    title={arquivo.emUso ? "Arquivo em uso não pode ser excluído por aqui" : "Excluir arquivo sem vínculo do Storage"}
                                                    className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                                >
                                                    {excluindoStorageAuditoria === arquivo.caminho ? "Excluindo..." : "Excluir"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {arquivosStorageAuditoriaSemRegistro.length > 0 && (
                    <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-100">
                        Use excluir apenas para arquivos sem vínculo. Arquivos em uso devem ser tratados pela base correta para manter o histórico do sistema.
                    </p>
                )}
            </CardRecolhivel>

            <CardRecolhivel
                className="mt-5"
                titulo="Registros detalhados da auditoria"
                subtitulo="Consulta completa com filtros, origem de acesso e dados extras de cada evento."
                contador={registrosFiltrados.length}
                defaultOpen={false}
            >
                <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar por usuário, ação, tabela, registro ou descrição"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <select
                        value={filtroAcao}
                        onChange={(e) => setFiltroAcao(e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                        <option value="Todas">Todas as ações</option>
                        {acoes.map((acao) => (
                            <option key={acao} value={acao}>
                                {acao}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-5 space-y-3">
                    {carregando && (
                        <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                            Carregando auditoria...
                        </div>
                    )}

                    {!carregando && registrosFiltrados.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Database className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhum evento encontrado</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Quando houver acesso ou alteração no sistema, os eventos aparecerão aqui.
                            </p>
                        </div>
                    )}

                    {registrosFiltrados.map((item) => {
                        const origemAcesso = item.dados?.origemAcesso || {};
                        const temOrigemAcesso = Boolean(origemAcesso.url || origemAcesso.pagina || origemAcesso.navegador || origemAcesso.plataforma);
                        const dadosExtras = item.dados && typeof item.dados === "object"
                            ? Object.fromEntries(Object.entries(item.dados).filter(([chave]) => chave !== "origemAcesso"))
                            : {};
                        const temDadosExtras = Object.keys(dadosExtras).length > 0;
                        const detalhesAberto = Boolean(detalhesAuditoriaAbertos[item.id]);
                        const podeAbrirDetalhes = temOrigemAcesso || temDadosExtras || item.registro_id;

                        return (
                            <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                                                {item.acao || "-"}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                {item.tabela || "-"}
                                            </span>
                                        </div>

                                        <p className="mt-3 font-bold text-slate-950">{item.descricao || "Evento registrado"}</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Usuário: <strong>{item.usuario_email || "Sistema / consulta pública"}</strong>
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                                        <p className="text-sm font-semibold text-slate-500">
                                            {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}
                                        </p>

                                        {podeAbrirDetalhes && (
                                            <button
                                                type="button"
                                                onClick={() => alternarDetalhesAuditoria(item.id)}
                                                className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
                                            >
                                                {detalhesAberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                {detalhesAberto ? "Fechar detalhes" : "Abrir detalhes"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {detalhesAberto && (
                                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                            <p className="font-bold text-slate-700">Informações do registro</p>
                                            <p className="mt-1 break-words">
                                                <strong>Registro:</strong> {item.registro_id || "-"}
                                            </p>
                                            <p className="break-words">
                                                <strong>Tabela:</strong> {item.tabela || "-"}
                                            </p>
                                            <p className="break-words">
                                                <strong>Ação:</strong> {item.acao || "-"}
                                            </p>
                                        </div>

                                        {temOrigemAcesso && (
                                            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                                <p className="font-bold text-slate-700">Origem do acesso</p>
                                                <p className="mt-1 break-words">
                                                    <strong>URL:</strong> {origemAcesso.url || "-"}
                                                </p>
                                                <p className="break-words">
                                                    <strong>Página:</strong> {origemAcesso.pagina || "-"}
                                                </p>
                                                <p>
                                                    <strong>Navegador:</strong> {origemAcesso.navegador || "-"}
                                                    {origemAcesso.plataforma ? ` · Plataforma: ${origemAcesso.plataforma}` : ""}
                                                    {origemAcesso.idioma ? ` · Idioma: ${origemAcesso.idioma}` : ""}
                                                </p>
                                            </div>
                                        )}

                                        {temDadosExtras && (
                                            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100 lg:col-span-2">
                                                <p className="font-bold text-slate-700">Outras informações</p>
                                                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-[11px] text-slate-600 ring-1 ring-slate-100 scrollbar-discreta">
                                                    {JSON.stringify(dadosExtras, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardRecolhivel>
        </motion.div>
    );
}








export default function App() {
    const [usuario, setUsuario] = useState(null);
    const [carregandoSessao, setCarregandoSessao] = useState(() => SUPABASE_CONFIGURADO);
    const [tela, setTela] = useState("dashboard");
    const [menuLateralAberto, setMenuLateralAberto] = useState(() => {
        try {
            const salvo = window.localStorage.getItem("menuLateralAbertoSST");
            return salvo === null ? true : salvo === "true";
        } catch {
            return true;
        }
    });
    const [colaboradores, setColaboradores] = useState([]);
    const [empresasBanco, setEmpresasBanco] = useState([]);
    const [documentosEmpresas, setDocumentosEmpresas] = useState([]);
    const [carregandoBanco, setCarregandoBanco] = useState(false);
    const [erroBanco, setErroBanco] = useState("");
    const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
    const [consultaPublica, setConsultaPublica] = useState(null);
    const [carregandoConsultaPublica, setCarregandoConsultaPublica] = useState(false);
    const [erroConsultaPublica, setErroConsultaPublica] = useState("");
    const [auditoria, setAuditoria] = useState([]);
    const [emailsEnviados, setEmailsEnviados] = useState([]);
    const [auditoriasCampo, setAuditoriasCampo] = useState([]);
    const [carregandoAuditoriasCampo, setCarregandoAuditoriasCampo] = useState(false);
    const [erroAuditoriasCampo, setErroAuditoriasCampo] = useState("");
    const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);
    const [podeAcessarAuditoria, setPodeAcessarAuditoria] = useState(false);
    const [verificandoAcessoAuditoria, setVerificandoAcessoAuditoria] = useState(false);
    const [auditoriaLiberada, setAuditoriaLiberada] = useState(() => {
        try {
            return window.sessionStorage.getItem("auditoriaLiberada") === "true";
        } catch {
            return false;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem("menuLateralAbertoSST", String(menuLateralAberto));
        } catch {
            // Ignora indisponibilidade do localStorage.
        }
    }, [menuLateralAberto]);

    const carregarEmpresas = useCallback(async () => {
        const { data, error } = await supabase
            .from("empresas")
            .select("id, nome, cnpj, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, receber_auditoria, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, tst_whatsapp, escopo_servico, observacao_status, empresa_pai_id")
            .order("nome", { ascending: true });

        if (error) {
            throw new Error(`Erro ao carregar empresas: ${error.message}`);
        }

        setEmpresasBanco(data || []);
        return data || [];
    }, []);

    const carregarDocumentosEmpresas = useCallback(async () => {
        const { data, error } = await supabase
            .from("documentos_empresas")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(`Erro ao carregar documentos das empresas: ${error.message}`);
        }

        const normalizados = (data || []).map(normalizarDocumentoEmpresa);
        setDocumentosEmpresas(normalizados);
        return normalizados;
    }, []);

    const carregarAuditoria = useCallback(async () => {
        setCarregandoAuditoria(true);

        let data;
        let error = null;

        try {
            data = await buscarTodosRegistrosSupabase(
                "auditoria_sistema",
                "id, created_at, usuario_email, acao, tabela, registro_id, descricao, dados",
                { campoOrdenacao: "created_at", crescente: false }
            );
        } catch (erroConsulta) {
            error = erroConsulta;
        }

        setCarregandoAuditoria(false);

        if (error) {
            console.warn("Erro ao carregar auditoria:", error.message);
            setAuditoria([]);
            return [];
        }

        setAuditoria(data || []);
        return data || [];
    }, []);


    const carregarEmailsEnviados = useCallback(async () => {
        let data;
        let error = null;

        try {
            data = await buscarTodosRegistrosSupabase(
                "emails_enviados",
                "id, empresa_id, colaborador_id, documento_id, destinatario, assunto, tipo_alerta, documento, status_envio, erro, data_envio, enviado_por",
                { campoOrdenacao: "data_envio", crescente: false }
            );
        } catch (erroConsulta) {
            error = erroConsulta;
        }

        if (error) {
            console.warn("Erro ao carregar histórico de e-mails:", error.message);
            setEmailsEnviados([]);
            return [];
        }

        setEmailsEnviados(data || []);
        return data || [];
    }, []);

    const carregarAuditoriasCampo = useCallback(async () => {
        setCarregandoAuditoriasCampo(true);
        setErroAuditoriasCampo("");

        try {
            const data = await buscarTodosRegistrosSupabase(
                "auditorias_campo",
                "*",
                { campoOrdenacao: "created_at", crescente: false }
            );

            const registrosValidos = (data || []).filter((item) =>
                item.numero_auditoria ||
                item.tipo_auditoria ||
                item.titulo ||
                item.area ||
                item.local ||
                item.maquina_equipamento ||
                item.situacao_encontrada
            );

            const normalizadas = registrosValidos.map((item) =>
                normalizarAuditoriaCampo({
                    ...item,
                    desvios: Array.isArray(item.desvios) ? item.desvios : [],
                })
            );

            setAuditoriasCampo(normalizadas);
            return normalizadas;
        } catch (error) {
            console.warn("Erro ao carregar auditorias de campo:", error.message);
            setErroAuditoriasCampo(error.message || "Erro ao carregar auditorias de campo.");
            setAuditoriasCampo([]);
            return [];
        } finally {
            setCarregandoAuditoriasCampo(false);
        }
    }, []);

    const registrarEmailEnviado = useCallback(
        async ({ empresaId = null, colaboradorId = null, documentoId = null, destinatario = "", assunto = "", tipoAlerta = "", documento = "", statusEnvio = "", erro = "" } = {}) => {
            const payload = {
                empresa_id: empresaId || null,
                colaborador_id: colaboradorId || null,
                documento_id: documentoId || null,
                destinatario: destinatario || null,
                assunto: assunto || null,
                tipo_alerta: tipoAlerta || null,
                documento: documento || null,
                status_envio: statusEnvio || "Registrado",
                erro: erro || null,
                data_envio: new Date().toISOString(),
                enviado_por: usuario?.email || null,
            };

            const { error } = await supabase.from("emails_enviados").insert(payload);

            if (error) {
                console.warn("Erro ao registrar histórico de e-mail:", error.message);
                return false;
            }

            setEmailsEnviados((atual) => [{ id: `${Date.now()}`, ...payload }, ...atual].slice(0, 300));
            return true;
        },
        [usuario?.email]
    );

    const registrarAuditoria = useCallback(
        async (acao, tabela, descricao, registroId = null, dados = {}) => {
            if (!usuario?.email) return;

            await supabase.from("auditoria_sistema").insert({
                usuario_id: usuario.id || null,
                usuario_email: usuario.email,
                acao,
                tabela,
                registro_id: registroId ? String(registroId) : null,
                descricao,
                dados: {
                    ...(dados || {}),
                    origemAcesso: obterOrigemAcesso(),
                },
            });
        },
        [usuario]
    );

    const carregarUsuariosAutorizadosAuditoria = useCallback(async () => {
        const { data, error } = await supabase
            .from("auditoria_usuarios_autorizados")
            .select("id, created_at, email, nome, funcao, ativo, observacao, user_id, empresa_id, perfil, acesso_global, pode_acessar_auditoria")
            .order("email", { ascending: true });

        if (error) {
            alert(`Erro ao carregar usuários autorizados: ${error.message}`);
            return [];
        }

        return data || [];
    }, []);

    const salvarUsuarioAutorizadoAuditoria = useCallback(
        async (usuarioAutorizado) => {
            if (!usuarioAutorizado?.email) {
                alert("Informe o e-mail do usuário autorizado.");
                return false;
            }

            const { error } = await supabase
                .from("auditoria_usuarios_autorizados")
                .upsert(
                    {
                        email: usuarioAutorizado.email.toLowerCase(),
                        nome: usuarioAutorizado.nome || null,
                        funcao: usuarioAutorizado.funcao || null,
                        ativo: true,
                        perfil: usuarioAutorizado.perfil || "usuario",
                        pode_acessar_auditoria: true,
                    },
                    { onConflict: "email" }
                );

            if (error) {
                alert(`Erro ao autorizar usuário: ${error.message}`);
                return false;
            }

            await registrarAuditoria(
                "USUARIO_AUDITORIA_AUTORIZADO",
                "auditoria_usuarios_autorizados",
                `Autorizou usuário para Auditoria: ${usuarioAutorizado.email}`,
                usuarioAutorizado.email,
                usuarioAutorizado
            );

            return true;
        },
        [registrarAuditoria]
    );

    const alternarUsuarioAutorizadoAuditoria = useCallback(
        async (usuarioAutorizado) => {
            if (!usuarioAutorizado?.id) return false;

            const acessoAtual = Boolean(usuarioAutorizado.pode_acessar_auditoria);
            const novoAcessoAuditoria = !acessoAtual;

            if (
                acessoAtual &&
                usuario?.email &&
                usuarioAutorizado.email?.toLowerCase() === usuario.email.toLowerCase()
            ) {
                alert("Você não pode bloquear o próprio acesso à Auditoria de sistema pelo sistema.");
                return false;
            }

            if (acessoAtual && usuarioAutorizado.acesso_global) {
                alert("Este usuário é administrador global. Remova o acesso global no Supabase antes de bloquear a Auditoria de sistema.");
                return false;
            }

            const payloadAtualizacao = novoAcessoAuditoria
                ? { pode_acessar_auditoria: true, ativo: true }
                : { pode_acessar_auditoria: false };

            const { error } = await supabase
                .from("auditoria_usuarios_autorizados")
                .update(payloadAtualizacao)
                .eq("id", usuarioAutorizado.id);

            if (error) {
                alert(`Erro ao atualizar permissão da Auditoria: ${error.message}`);
                return false;
            }

            await registrarAuditoria(
                novoAcessoAuditoria ? "USUARIO_AUDITORIA_LIBERADO" : "USUARIO_AUDITORIA_BLOQUEADO",
                "auditoria_usuarios_autorizados",
                `${novoAcessoAuditoria ? "Liberou" : "Bloqueou"} acesso à Auditoria de sistema: ${usuarioAutorizado.email}`,
                usuarioAutorizado.id,
                {
                    email: usuarioAutorizado.email,
                    pode_acessar_auditoria: novoAcessoAuditoria,
                    ativo: usuarioAutorizado.ativo,
                }
            );

            return true;
        },
        [registrarAuditoria, usuario]
    );

    const verificarAcessoAuditoria = useCallback(async () => {
        if (!usuario?.email) {
            setPodeAcessarAuditoria(false);
            return false;
        }

        setVerificandoAcessoAuditoria(true);

        const { data, error } = await supabase.rpc("usuario_pode_acessar_auditoria");

        setVerificandoAcessoAuditoria(false);

        if (error) {
            console.warn("Erro ao verificar permissão da Auditoria de sistema:", error.message);
            setPodeAcessarAuditoria(false);
            return false;
        }

        setPodeAcessarAuditoria(Boolean(data));
        return Boolean(data);
    }, [usuario]);

    const liberarAuditoria = async () => {
        const autorizadoAuditoria = await verificarAcessoAuditoria();

        if (!autorizadoAuditoria) {
            alert("Seu usuário não está autorizado no Supabase para acessar a Auditoria.");
            return;
        }

        try {
            window.sessionStorage.setItem("auditoriaLiberada", "true");
        } catch {
            // Sessão indisponível; mantém apenas em memória.
        }

        setAuditoriaLiberada(true);
        carregarAuditoria();
        registrarAuditoria("ACESSO_AUDITORIA", "auditoria_sistema", "Liberou acesso à tela de Auditoria pela regra do Supabase");
    };

    const bloquearAuditoria = () => {
        try {
            window.sessionStorage.removeItem("auditoriaLiberada");
        } catch {
            // Sessão indisponível; mantém apenas em memória.
        }

        setAuditoriaLiberada(false);
        registrarAuditoria("BLOQUEIO_AUDITORIA", "auditoria_sistema", "Bloqueou novamente o acesso à tela de Auditoria");
    };

    const carregarColaboradores = useCallback(async () => {
        setCarregandoBanco(true);
        setErroBanco("");

        try {
            const empresas = await carregarEmpresas();
            await carregarDocumentosEmpresas();

            const { data, error } = await supabase
                .from("colaboradores")
                .select(`
          id,
          nome,
          funcao,
          matricula,
          codigo_funcionario,
          status_mobilizacao,
          data_nascimento,
          mostrar_aniversario_dashboard,
          treinamentos_removidos,
          treinamentos_adicionais,
          foto_url,
          foto_nome,
          token_qr,
          status,
          empresa_id,
          empresas (
            id,
            nome,
            tipo_empresa,
            empresa_pai_id,
            tst_responsavel,
            tst_email,
            tst_whatsapp,
            email_auditoria,
            whatsapp_auditoria,
            responsavel_auditoria
          )
        `)
                .order("created_at", { ascending: false });

            if (error) {
                throw new Error(`Erro ao carregar colaboradores: ${error.message}`);
            }

            const empresasPorId = (empresas || []).reduce((acc, empresa) => {
                acc[empresa.id] = empresa;
                return acc;
            }, {});

            const normalizados = (data || []).map((item) => {
                const colaborador = normalizarColaborador(item);
                const empresaAtual = empresasPorId[colaborador.empresaId] || null;
                const empresaPai = empresaAtual?.empresa_pai_id ? empresasPorId[empresaAtual.empresa_pai_id] : null;
                const ehSubcontratada = Boolean(empresaPai);

                return {
                    ...colaborador,
                    empresaTipo: empresaAtual?.tipo_empresa || colaborador.empresaTipo || "",
                    empresaPaiId: empresaAtual?.empresa_pai_id || colaborador.empresaPaiId || null,
                    empresaPaiNome: empresaPai?.nome || colaborador.empresaPaiNome || "",
                    empresaTstResponsavel: empresaAtual?.tst_responsavel || empresaPai?.tst_responsavel || "",
                    empresaTstEmail: empresaAtual?.tst_email || empresaPai?.tst_email || "",
                    empresaTstWhatsapp: empresaAtual?.tst_whatsapp || empresaPai?.tst_whatsapp || "",
                    empresaEmailAuditoria: empresaAtual?.email_auditoria || empresaPai?.email_auditoria || empresaAtual?.email || empresaPai?.email || "",
                    empresaWhatsappAuditoria: empresaAtual?.whatsapp_auditoria || empresaPai?.whatsapp_auditoria || empresaAtual?.telefone || empresaPai?.telefone || "",
                    empresaExibicao: ehSubcontratada
                        ? `${empresaPai.nome} / Subcontratada: ${empresaAtual.nome}`
                        : colaborador.empresa,
                };
            });

            const idsColaboradores = normalizados.map((colaborador) => colaborador.id);
            let certificadosPorColaborador = {};

            if (idsColaboradores.length > 0) {
                const { data: certificadosData, error: certificadosError } = await supabase
                    .from("certificados")
                    .select("*")
                    .in("colaborador_id", idsColaboradores)
                    .order("created_at", { ascending: false });

                if (certificadosError) {
                    throw new Error(`Erro ao carregar certificados: ${certificadosError.message}`);
                }

                certificadosPorColaborador = (certificadosData || []).reduce((acc, item) => {
                    const certificado = normalizarCertificado(item);
                    if (!acc[certificado.colaboradorId]) acc[certificado.colaboradorId] = [];
                    acc[certificado.colaboradorId].push(certificado);
                    return acc;
                }, {});
            }

            const colaboradoresComCertificados = normalizados.map((colaborador) => ({
                ...colaborador,
                treinamentos: certificadosPorColaborador[colaborador.id] || [],
            }));

            setColaboradores(colaboradoresComCertificados);
            setColaboradorSelecionado((atual) => atual || colaboradoresComCertificados[0] || null);

            if (colaboradoresComCertificados.length === 0 && empresas.length === 0) {
                setColaboradores([]);
            }
        } catch (error) {
            setErroBanco(error.message || "Erro ao conectar ao banco de dados.");
        } finally {
            setCarregandoBanco(false);
        }
    }, [carregarEmpresas, carregarDocumentosEmpresas]);

    async function enviarLogoEmpresa(arquivo, empresaId) {
        if (!arquivo) return { logoUrl: null, logoNome: null };
        if (!validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
            throw new Error("Arquivo de logo fora do limite configurado.");
        }

        const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
        const caminho = `${empresaId || "nova-empresa"}/${Date.now()}-${nomeSeguro}`;

        const { error } = await supabase.storage
            .from("logos-empresas")
            .upload(caminho, arquivo, {
                cacheControl: "3600",
                upsert: true,
                contentType: arquivo.type || "image/png",
            });

        if (error) {
            throw new Error(`Erro ao enviar logo: ${error.message}`);
        }

        return { logoUrl: caminho, logoNome: nomeSeguro };
    }

    async function enviarContratoEmpresa(arquivo, empresaId) {
        if (!arquivo) return { contratoUrl: null, contratoNome: null };
        if (!validarArquivoAntesUpload(arquivo, "documentoExtenso")) {
            throw new Error("Contrato fora do limite configurado.");
        }

        const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
        const caminho = `${empresaId || "nova-empresa"}/${Date.now()}-${nomeSeguro}`;

        const { error } = await supabase.storage
            .from("contratos-empresas")
            .upload(caminho, arquivo, {
                cacheControl: "3600",
                upsert: true,
                contentType: arquivo.type || "application/pdf",
            });

        if (error) {
            throw new Error(`Erro ao enviar contrato: ${error.message}`);
        }

        return { contratoUrl: caminho, contratoNome: nomeSeguro };
    }

    async function adicionarEmpresa(novaEmpresa) {
        setErroBanco("");

        try {
            const existente = empresasBanco.find(
                (empresa) => empresa.nome.toLowerCase() === novaEmpresa.nome.toLowerCase()
            );

            if (existente) {
                setErroBanco("Essa empresa já está cadastrada.");
                return false;
            }

            let { data, error } = await supabase
                .from("empresas")
                .insert({
                    nome: novaEmpresa.nome,
                    cnpj: novaEmpresa.cnpj || null,
                    responsavel: novaEmpresa.responsavel || null,
                    email: novaEmpresa.email || null,
                    telefone: novaEmpresa.telefone || null,
                    responsavel_auditoria: novaEmpresa.responsavelAuditoria || null,
                    email_auditoria: novaEmpresa.emailAuditoria || null,
                    whatsapp_auditoria: novaEmpresa.whatsappAuditoria || null,
                    receber_auditoria: novaEmpresa.receberAuditoria !== false,
                    tipo_empresa: novaEmpresa.tipoEmpresa || "Terceirizada",
                    empresa_pai_id: novaEmpresa.empresaPaiId || null,
                    status: "Empresa ativa",
                    numero_contrato: novaEmpresa.numeroContrato || null,
                    data_inicio_contrato: novaEmpresa.dataInicioContrato || null,
                    data_fim_contrato: novaEmpresa.dataFimContrato || null,
                    responsavel_contratante: novaEmpresa.responsavelContratante || null,
                    tst_responsavel: novaEmpresa.tstResponsavel || null,
                    tst_email: novaEmpresa.tstEmail || null,
                    tst_whatsapp: novaEmpresa.tstWhatsapp || null,
                    escopo_servico: novaEmpresa.escopoServico || null,
                    observacao_status: novaEmpresa.observacaoStatus || null,
                })
                .select("id, nome, cnpj, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, receber_auditoria, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, tst_whatsapp, escopo_servico, observacao_status, empresa_pai_id")
                .single();

            if (error) {
                throw new Error(`Erro ao cadastrar empresa: ${error.message}`);
            }

            if (novaEmpresa.logo || novaEmpresa.contratoArquivo) {
                const atualizacaoArquivos = {};

                if (novaEmpresa.logo) {
                    const logo = await enviarLogoEmpresa(novaEmpresa.logo, data.id);
                    atualizacaoArquivos.logo_url = logo.logoUrl;
                    atualizacaoArquivos.logo_nome = logo.logoNome;
                }

                if (novaEmpresa.contratoArquivo) {
                    const contrato = await enviarContratoEmpresa(novaEmpresa.contratoArquivo, data.id);
                    atualizacaoArquivos.contrato_url = contrato.contratoUrl;
                    atualizacaoArquivos.contrato_nome = contrato.contratoNome;
                }

                const { data: empresaComArquivos, error: arquivosError } = await supabase
                    .from("empresas")
                    .update(atualizacaoArquivos)
                    .eq("id", data.id)
                    .select("id, nome, cnpj, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, receber_auditoria, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, tst_whatsapp, escopo_servico, observacao_status, empresa_pai_id")
                    .single();

                if (arquivosError) {
                    throw new Error(`Empresa cadastrada, mas houve erro ao salvar arquivos: ${arquivosError.message}`);
                }

                data = empresaComArquivos;
            }

            setEmpresasBanco((atual) => [data, ...atual].sort((a, b) => a.nome.localeCompare(b.nome)));
            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao cadastrar empresa.");
            return false;
        }
    }

    async function atualizarEmpresa(empresaAtualizada) {
        setErroBanco("");

        try {
            let logoAtualizada = {
                logo_url: empresaAtualizada.logoAtual || null,
                logo_nome: empresaAtualizada.logoNomeAtual || null,
            };

            if (empresaAtualizada.logo) {
                const logo = await enviarLogoEmpresa(empresaAtualizada.logo, empresaAtualizada.id);
                logoAtualizada = {
                    logo_url: logo.logoUrl,
                    logo_nome: logo.logoNome,
                };
            }

            let contratoAtualizado = {
                contrato_url: empresaAtualizada.contratoUrlAtual || null,
                contrato_nome: empresaAtualizada.contratoNomeAtual || null,
            };

            if (empresaAtualizada.contratoArquivo) {
                const contrato = await enviarContratoEmpresa(empresaAtualizada.contratoArquivo, empresaAtualizada.id);
                contratoAtualizado = {
                    contrato_url: contrato.contratoUrl,
                    contrato_nome: contrato.contratoNome,
                };
            }

            const { data, error } = await supabase
                .from("empresas")
                .update({
                    nome: empresaAtualizada.nome,
                    cnpj: empresaAtualizada.cnpj || null,
                    responsavel: empresaAtualizada.responsavel || null,
                    email: empresaAtualizada.email || null,
                    telefone: empresaAtualizada.telefone || null,
                    responsavel_auditoria: empresaAtualizada.responsavelAuditoria || null,
                    email_auditoria: empresaAtualizada.emailAuditoria || null,
                    whatsapp_auditoria: empresaAtualizada.whatsappAuditoria || null,
                    receber_auditoria: empresaAtualizada.receberAuditoria !== false,
                    status: normalizarStatusEmpresa(empresaAtualizada.status),
                    tipo_empresa: empresaAtualizada.tipoEmpresa || "Terceirizada",
                    empresa_pai_id: empresaAtualizada.tipoEmpresa === "Subcontratada" ? empresaAtualizada.empresaPaiId : null,
                    logo_url: logoAtualizada.logo_url,
                    logo_nome: logoAtualizada.logo_nome,
                    contrato_url: contratoAtualizado.contrato_url,
                    contrato_nome: contratoAtualizado.contrato_nome,
                    numero_contrato: empresaAtualizada.numeroContrato || null,
                    data_inicio_contrato: empresaAtualizada.dataInicioContrato || null,
                    data_fim_contrato: empresaAtualizada.dataFimContrato || null,
                    responsavel_contratante: empresaAtualizada.responsavelContratante || null,
                    tst_responsavel: empresaAtualizada.tstResponsavel || null,
                    tst_email: empresaAtualizada.tstEmail || null,
                    tst_whatsapp: empresaAtualizada.tstWhatsapp || null,
                    escopo_servico: empresaAtualizada.escopoServico || null,
                    observacao_status: empresaAtualizada.observacaoStatus || null,
                })
                .eq("id", empresaAtualizada.id)
                .select("id, nome, cnpj, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, receber_auditoria, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, tst_whatsapp, escopo_servico, observacao_status, empresa_pai_id")
                .single();

            if (error) {
                throw new Error(`Erro ao atualizar empresa: ${error.message}`);
            }

            setEmpresasBanco((atual) =>
                atual.map((empresa) => (empresa.id === data.id ? data : empresa)).sort((a, b) => a.nome.localeCompare(b.nome))
            );

            setColaboradores((atual) =>
                atual.map((colaborador) =>
                    colaborador.empresaId === data.id ? { ...colaborador, empresa: data.nome } : colaborador
                )
            );

            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao atualizar empresa.");
            return false;
        }
    }

    async function excluirEmpresa(empresa) {
        setErroBanco("");

        try {
            if (!empresa?.id) {
                throw new Error("Empresa inválida para exclusão.");
            }

            const nomeEmpresaNormalizado = normalizarTextoBusca(empresa.nome || "");

            const colaboradoresVinculadosEstado = colaboradores.filter((colaborador) => {
                const mesmoId = String(colaborador.empresaId || colaborador.empresa_id || "") === String(empresa.id);
                const mesmoNome = nomeEmpresaNormalizado && normalizarTextoBusca(colaborador.empresa || colaborador.empresaExibicao || "") === nomeEmpresaNormalizado;
                return mesmoId || mesmoNome;
            });

            if (colaboradoresVinculadosEstado.length > 0) {
                throw new Error(
                    `Não foi possível excluir ${empresa.nome || "esta empresa"}: existem ${colaboradoresVinculadosEstado.length} colaborador(es) vinculado(s). Desmobilize, transfira ou exclua os colaboradores antes de remover a empresa para preservar o histórico.`
                );
            }

            const { data, error } = await supabase.rpc("excluir_empresa_segura", {
                p_empresa_id: empresa.id,
            });

            if (error) {
                throw new Error(error.message || "Erro ao excluir empresa no Supabase.");
            }

            if (!data?.ok) {
                throw new Error(data?.mensagem || "A empresa não foi excluída. Atualize a página e tente novamente.");
            }

            setEmpresasBanco((atual) => atual.filter((item) => String(item.id) !== String(empresa.id)));
            setDocumentosEmpresas((atual) => atual.filter((doc) => String(doc.empresa_id || doc.empresaId || "") !== String(empresa.id)));
            setColaboradores((atual) => atual.filter((colaborador) => {
                const mesmoId = String(colaborador.empresaId || colaborador.empresa_id || "") === String(empresa.id);
                const mesmoNome = nomeEmpresaNormalizado && normalizarTextoBusca(colaborador.empresa || colaborador.empresaExibicao || "") === nomeEmpresaNormalizado;
                return !(mesmoId || mesmoNome);
            }));

            alert(data.mensagem || `Empresa ${empresa.nome || "selecionada"} excluída com sucesso.`);
            await carregarColaboradores();
            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao excluir empresa.");
            alert(error.message || "Erro ao excluir empresa.");
            await carregarColaboradores();
            return false;
        }
    }

    async function adicionarDocumentoEmpresa(novoDoc) {
        setErroBanco("");

        try {
            let arquivoUrl = null;
            let arquivoNome = novoDoc.arquivo?.name || null;

            if (novoDoc.arquivo) {
                if (!validarArquivoAntesUpload(novoDoc.arquivo, "documentoExtenso")) {
                    throw new Error("Documento empresarial fora do limite configurado.");
                }

                const nomeSeguro = sanitizarNomeArquivo(novoDoc.arquivo.name);
                const tipoSeguro = sanitizarNomeArquivo(novoDoc.tipo);
                const caminho = `${novoDoc.empresaId}/${tipoSeguro}-${Date.now()}-${nomeSeguro}`;

                const { error: uploadError } = await supabase.storage
                    .from("documentos-empresas")
                    .upload(caminho, novoDoc.arquivo, {
                        cacheControl: "3600",
                        upsert: true,
                        contentType: novoDoc.arquivo.type || "application/pdf",
                    });

                if (uploadError) {
                    throw new Error(`Erro no upload do documento: ${uploadError.message}`);
                }

                arquivoUrl = caminho;
                arquivoNome = nomeSeguro;
            }

            const { data, error } = await supabase
                .from("documentos_empresas")
                .upsert(
                    {
                        empresa_id: novoDoc.empresaId,
                        tipo_documento: novoDoc.tipo,
                        data_emissao: novoDoc.dataEmissao,
                        data_vencimento: novoDoc.dataVencimento,
                        url_do_arquivo: arquivoUrl,
                        nome_do_arquivo: arquivoNome,
                        observacao: novoDoc.observacao || null,
                        status_validacao: "Validado",
                    },
                    { onConflict: "empresa_id,tipo_documento" }
                )
                .select("*")
                .single();

            if (error) {
                throw new Error(`Erro ao salvar documento: ${error.message}`);
            }

            const documentoNormalizado = normalizarDocumentoEmpresa(data);

            setDocumentosEmpresas((atual) => [
                documentoNormalizado,
                ...atual.filter(
                    (item) => !(item.empresa_id === documentoNormalizado.empresa_id && item.tipo_documento === documentoNormalizado.tipo_documento)
                ),
            ]);

            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao salvar documento da empresa.");
            return false;
        }
    }

    async function excluirDocumentoEmpresa(documento) {
        const confirmar = window.confirm(`Deseja excluir definitivamente o documento ${documento.tipo_documento} desta empresa?`);

        if (!confirmar) return;

        setErroBanco("");

        const { error } = await supabase
            .from("documentos_empresas")
            .delete()
            .eq("id", documento.id);

        if (error) {
            setErroBanco(`Erro ao remover documento: ${error.message}`);
            return;
        }

        if ((documento.url_do_arquivo || documento.arquivo_url)) {
            await supabase.storage.from("documentos-empresas").remove([(documento.url_do_arquivo || documento.arquivo_url)]);
        }

        setDocumentosEmpresas((atual) => atual.filter((item) => item.id !== documento.id));
    }

    async function visualizarDocumentoEmpresa(documento) {
        setErroBanco("");

        if (!(documento?.url_do_arquivo || documento?.arquivo_url)) {
            setErroBanco("Este documento ainda não possui arquivo anexado para visualização.");
            return;
        }

        const { data, error } = await supabase.storage
            .from("documentos-empresas")
            .createSignedUrl((documento.url_do_arquivo || documento.arquivo_url), 60 * 10);

        if (error) {
            setErroBanco(`Erro ao gerar link de visualização: ${error.message}`);
            return;
        }

        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }

    async function obterOuCriarEmpresa(nomeEmpresa) {
        const nomeTratado = nomeEmpresa.trim();

        const existente = empresasBanco.find(
            (empresa) => empresa.nome.toLowerCase() === nomeTratado.toLowerCase()
        );

        if (existente) return existente;

        const { data, error } = await supabase
            .from("empresas")
            .insert({
                nome: nomeTratado,
                status: "Empresa ativa",
            })
            .select("id, nome, cnpj, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, receber_auditoria, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, tst_whatsapp, escopo_servico, observacao_status, empresa_pai_id")
            .single();

        if (error) {
            throw new Error(`Erro ao criar empresa: ${error.message}`);
        }

        setEmpresasBanco((atual) => [...atual, data].sort((a, b) => a.nome.localeCompare(b.nome)));
        return data;
    }

    async function enviarFotoColaborador(arquivo, colaboradorId) {
        if (!arquivo) return { fotoUrl: null, fotoNome: null };
        if (!validarArquivoAntesUpload(arquivo, "fotoAuditoria")) {
            throw new Error("Arquivo de imagem fora do limite configurado.");
        }

        const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
        const caminho = `${colaboradorId}/${Date.now()}-${nomeSeguro}`;

        const { error } = await supabase.storage
            .from("fotos-colaboradores")
            .upload(caminho, arquivo, {
                cacheControl: "3600",
                upsert: true,
                contentType: arquivo.type || "image/png",
            });

        if (error) {
            throw new Error(`Erro ao enviar foto do colaborador: ${error.message}`);
        }

        return { fotoUrl: caminho, fotoNome: nomeSeguro };
    }

    async function salvarCertificadosEmMassaColaborador(colaborador, arquivos = []) {
        const analise = analisarArquivosTreinamentoMassa(arquivos);
        const reconhecidos = analise.filter((item) => item.reconhecido);
        const ignorados = analise.filter((item) => !item.reconhecido);

        for (const item of reconhecidos) {
            const treinamento = item.treinamento;
            const arquivo = await enviarArquivoCertificado(item.arquivo, colaborador, treinamento.id);

            const payload = {
                colaborador_id: colaborador.id,
                tipo_treinamento: treinamento.nome,
                treinamento_codigo: Number(treinamento.id),
                nome_treinamento: treinamento.nome,
                data_realizacao: item.dataRealizacao,
                data_vencimento: item.dataVencimento,
                arquivo_url: arquivo.arquivoUrl,
                arquivo_nome: item.arquivo.name,
                observacao: "Enviado em massa no cadastro do colaborador",
                status_validacao: "Validado",
            };

            const { data: existentes, error: buscaError } = await supabase
                .from("certificados")
                .select("*")
                .eq("colaborador_id", colaborador.id)
                .eq("tipo_treinamento", treinamento.nome)
                .order("created_at", { ascending: false })
                .limit(1);

            if (buscaError) {
                throw new Error(`Erro ao verificar certificado existente: ${buscaError.message}`);
            }

            const existente = existentes?.[0] || null;
            const consulta = existente?.id
                ? supabase.from("certificados").update(payload).eq("id", existente.id)
                : supabase.from("certificados").insert(payload);

            const { error } = await consulta;

            if (error) {
                throw new Error(`Erro ao salvar ${item.arquivo.name}: ${error.message}`);
            }

            if ((existente?.url_do_arquivo || existente?.arquivo_url) && (existente.url_do_arquivo || existente.arquivo_url) !== arquivo.arquivoUrl) {
                await supabase.storage.from("certificados-treinamentos").remove([(existente.url_do_arquivo || existente.arquivo_url)]);
            }
        }

        return {
            reconhecidos: reconhecidos.length,
            ignorados: ignorados.map((item) => item.nomeArquivo),
        };
    }

    async function adicionarColaborador(novo) {
        setErroBanco("");

        try {
            const empresaCriada = await obterOuCriarEmpresa(novo.empresaNome);

            let { data, error } = await supabase
                .from("colaboradores")
                .insert({
                    empresa_id: empresaCriada.id,
                    nome: novo.nome,
                    funcao: novo.funcao,
                    matricula: novo.matricula || null,
                    codigo_funcionario: novo.codigoFuncionario || gerarCodigoFuncionario(novo.nome),
                    status_mobilizacao: novo.statusMobilizacao || obterStatusInicialColaborador(),
                    data_nascimento: novo.dataNascimento || null,
                    mostrar_aniversario_dashboard: novo.mostrarAniversarioDashboard !== false,
                    treinamentos_removidos: novo.treinamentosRemovidos || [],
                    treinamentos_adicionais: novo.treinamentosAdicionais || [],
                    status: "Ativo",
                })
                .select(`
          id,
          nome,
          funcao,
          matricula,
          codigo_funcionario,
          status_mobilizacao,
          data_nascimento,
          mostrar_aniversario_dashboard,
          treinamentos_removidos,
          treinamentos_adicionais,
          foto_url,
          foto_nome,
          token_qr,
          status,
          empresa_id,
          empresas (
            id,
            nome,
            tipo_empresa,
            empresa_pai_id
          )
        `)
                .single();

            if (error) {
                throw new Error(`Erro ao cadastrar colaborador: ${error.message}`);
            }

            if (novo.foto) {
                const foto = await enviarFotoColaborador(novo.foto, data.id);

                const { data: colaboradorComFoto, error: fotoError } = await supabase
                    .from("colaboradores")
                    .update({
                        foto_url: foto.fotoUrl,
                        foto_nome: foto.fotoNome,
                    })
                    .eq("id", data.id)
                    .select(`
            id,
            nome,
            funcao,
            matricula,
            codigo_funcionario,
            status_mobilizacao,
            data_nascimento,
            mostrar_aniversario_dashboard,
            treinamentos_removidos,
            treinamentos_adicionais,
            foto_url,
            foto_nome,
            token_qr,
            status,
            empresa_id,
            empresas (
              id,
              nome
            )
          `)
                    .single();

                if (fotoError) {
                    throw new Error(`Colaborador cadastrado, mas houve erro ao salvar a foto: ${fotoError.message}`);
                }

                data = colaboradorComFoto;
            }

            const colaborador = normalizarColaborador(data);

            let resultadoMassa = null;

            if (novo.documentosMassa?.length) {
                resultadoMassa = await salvarCertificadosEmMassaColaborador(colaborador, novo.documentosMassa);
            }

            await carregarColaboradores();

            setColaboradorSelecionado((atual) => atual || colaborador);

            if (resultadoMassa) {
                const mensagemIgnorados = resultadoMassa.ignorados.length
                    ? `\n\nArquivos não reconhecidos:\n- ${resultadoMassa.ignorados.join("\n- ")}`
                    : "";

                alert(
                    `Colaborador cadastrado. ${resultadoMassa.reconhecidos} documento(s) de treinamento foram vinculados automaticamente.${mensagemIgnorados}`
                );
            }

            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao cadastrar colaborador.");
            return false;
        }
    }

    async function atualizarColaborador(colaboradorAtualizado) {
        setErroBanco("");

        try {
            const empresaCriada = await obterOuCriarEmpresa(colaboradorAtualizado.empresaNome);

            let fotoAtualizada = {
                foto_url: colaboradorAtualizado.fotoAtual || null,
                foto_nome: colaboradorAtualizado.fotoNomeAtual || null,
            };

            if (colaboradorAtualizado.foto) {
                const foto = await enviarFotoColaborador(colaboradorAtualizado.foto, colaboradorAtualizado.id);
                fotoAtualizada = {
                    foto_url: foto.fotoUrl,
                    foto_nome: foto.fotoNome,
                };
            }

            const { data, error } = await supabase
                .from("colaboradores")
                .update({
                    empresa_id: empresaCriada.id,
                    nome: colaboradorAtualizado.nome,
                    funcao: colaboradorAtualizado.funcao,
                    matricula: colaboradorAtualizado.matricula || null,
                    status: colaboradorAtualizado.status || "Ativo",
                    status_mobilizacao: colaboradorAtualizado.statusMobilizacao || obterStatusInicialColaborador(),
                    data_nascimento: colaboradorAtualizado.dataNascimento || null,
                    mostrar_aniversario_dashboard: colaboradorAtualizado.mostrarAniversarioDashboard !== false,
                    treinamentos_removidos: colaboradorAtualizado.treinamentosRemovidos || [],
                    treinamentos_adicionais: colaboradorAtualizado.treinamentosAdicionais || [],
                    foto_url: fotoAtualizada.foto_url,
                    foto_nome: fotoAtualizada.foto_nome,
                })
                .eq("id", colaboradorAtualizado.id)
                .select(`
          id,
          nome,
          funcao,
          matricula,
          codigo_funcionario,
          status_mobilizacao,
          data_nascimento,
          mostrar_aniversario_dashboard,
          treinamentos_removidos,
          treinamentos_adicionais,
          foto_url,
          foto_nome,
          token_qr,
          status,
          empresa_id,
          empresas (
            id,
            nome,
            tipo_empresa,
            empresa_pai_id
          )
        `)
                .single();

            if (error) {
                throw new Error(`Erro ao atualizar colaborador: ${error.message}`);
            }

            const colaborador = normalizarColaborador(data);

            setColaboradores((atual) =>
                atual.map((item) =>
                    item.id === colaborador.id
                        ? {
                            ...item,
                            ...colaborador,
                            treinamentos: item.treinamentos || colaborador.treinamentos || [],
                        }
                        : item
                )
            );

            if (colaboradorSelecionado?.id === colaborador.id) {
                setColaboradorSelecionado((atual) => ({
                    ...atual,
                    ...colaborador,
                    treinamentos: atual?.treinamentos || colaborador.treinamentos || [],
                }));
            }

            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao atualizar colaborador.");
            return false;
        }
    }

    function codigoPastaCertificado(colaborador) {
        const codigo = String(colaborador?.codigoFuncionario || colaborador?.codigo_funcionario || "").trim();

        if (!codigo) {
            throw new Error("O colaborador não possui código do funcionário para organizar o arquivo no Storage.");
        }

        return sanitizarNomeArquivo(codigo).replace(/\.[^.]+$/, "");
    }

    async function enviarArquivoCertificado(arquivo, colaborador, treinamentoId) {
        if (!arquivo) return { arquivoUrl: null, arquivoNome: null };
        if (!validarArquivoAntesUpload(arquivo, "documentoSimples")) {
            throw new Error("Certificado/documento fora do limite configurado.");
        }

        const nomeSeguro = sanitizarNomeArquivo(arquivo.name);
        const codigoPasta = codigoPastaCertificado(colaborador);
        const caminho = `${codigoPasta}/${treinamentoId}/${Date.now()}-${nomeSeguro}`;

        const { error } = await supabase.storage
            .from("certificados-treinamentos")
            .upload(caminho, arquivo, {
                cacheControl: "3600",
                upsert: true,
                contentType: arquivo.type || "application/pdf",
            });

        if (error) {
            throw new Error(`Erro ao enviar certificado: ${error.message}`);
        }

        return { arquivoUrl: caminho, arquivoNome: nomeSeguro };
    }

    async function sincronizarCertificadosDoStorage() {
        setErroBanco("");
        setCarregandoBanco(true);

        try {
            let sincronizados = 0;
            let ignorados = 0;

            for (const colaborador of colaboradores) {
                for (const treinamento of treinamentosBase) {
                    const pasta = `${codigoPastaCertificado(colaborador)}/${treinamento.id}`;

                    const { data: arquivos, error } = await supabase.storage
                        .from("certificados-treinamentos")
                        .list(pasta, {
                            limit: 100,
                            sortBy: { column: "created_at", order: "desc" },
                        });

                    if (error) {
                        ignorados += 1;
                        continue;
                    }

                    const arquivosValidos = (arquivos || []).filter((arquivo) => arquivo.name && !arquivo.name.endsWith("/"));

                    if (arquivosValidos.length === 0) continue;

                    const maisRecente = arquivosValidos.sort((a, b) => {
                        const dataB = new Date(b.updated_at || b.created_at || 0).getTime();
                        const dataA = new Date(a.updated_at || a.created_at || 0).getTime();
                        return dataB - dataA;
                    })[0];

                    const dataRealizacao = (maisRecente.created_at || maisRecente.updated_at || hoje.toISOString()).slice(0, 10);
                    const dataVencimento = calcularVencimentoTreinamento(treinamento.id, dataRealizacao);
                    const caminho = `${pasta}/${maisRecente.name}`;

                    const { error: upsertError } = await supabase
                        .from("certificados")
                        .upsert(
                            {
                                colaborador_id: colaborador.id,
                                tipo_treinamento: treinamento.nome,
                                treinamento_codigo: Number(treinamento.id),
                                nome_treinamento: treinamento.nome,
                                data_realizacao: dataRealizacao,
                                data_vencimento: dataVencimento,
                                arquivo_url: caminho,
                                arquivo_nome: maisRecente.name,
                                observacao: "Sincronizado automaticamente do Storage",
                                status_validacao: "Validado",
                            },
                            { onConflict: "colaborador_id,tipo_treinamento" }
                        );

                    if (upsertError) {
                        throw new Error(`Erro ao sincronizar ${colaborador.nome} / ${treinamento.nome}: ${upsertError.message}`);
                    }

                    sincronizados += 1;
                }
            }

            await carregarColaboradores();

            return `${sincronizados} certificado(s) sincronizado(s) do Storage para a tabela certificados. ${ignorados} pasta(s) ignorada(s).`;
        } catch (error) {
            setErroBanco(error.message || "Erro ao sincronizar arquivos do Storage.");
            return error.message || "Erro ao sincronizar arquivos do Storage.";
        } finally {
            setCarregandoBanco(false);
        }
    }

    async function listarArquivosCertificadosStorage() {
        setErroBanco("");

        try {
            const coletados = [];
            const bucketsAuditados = [
                {
                    bucket: "certificados-treinamentos",
                    origemTipo: "Colaborador / Certificado de treinamento",
                    tabelaOrigem: "certificados",
                },
                {
                    bucket: "documentos-empresas",
                    origemTipo: "Empresa / Documento empresarial",
                    tabelaOrigem: "documentos_empresas",
                },
                {
                    bucket: "contratos-empresas",
                    origemTipo: "Empresa / Contrato",
                    tabelaOrigem: "empresas.contrato_url",
                },
                {
                    bucket: "logos-empresas",
                    origemTipo: "Empresa / Logo",
                    tabelaOrigem: "empresas.logo_url",
                },
                {
                    bucket: "fotos-colaboradores",
                    origemTipo: "Colaborador / Foto",
                    tabelaOrigem: "colaboradores.foto_url",
                },
                {
                    bucket: "auditorias-campo",
                    origemTipo: "Auditoria de campo / Evidência fotográfica",
                    tabelaOrigem: "auditorias_campo.fotos",
                },
            ];

            const listarNivel = async (bucketInfo, prefixo = "") => {
                let data;

                try {
                    data = await listarTodosArquivosStorage(bucketInfo.bucket, prefixo);
                } catch (error) {
                    console.warn(`Erro ao listar bucket ${bucketInfo.bucket}:`, error.message);
                    return;
                }

                for (const item of data || []) {
                    const caminho = prefixo ? `${prefixo}/${item.name}` : item.name;
                    const pareceArquivo = item.name && /\.[a-z0-9]{2,5}$/i.test(item.name);

                    if (pareceArquivo) {
                        coletados.push({
                            bucket: bucketInfo.bucket,
                            origemTipo: bucketInfo.origemTipo,
                            tabelaOrigem: bucketInfo.tabelaOrigem,
                            nome: item.name,
                            caminho,
                            tamanho: item.metadata?.size || null,
                            atualizadoEm: item.updated_at || item.created_at || null,
                        });
                    } else {
                        await listarNivel(bucketInfo, caminho);
                    }
                }
            };

            for (const bucketInfo of bucketsAuditados) {
                await listarNivel(bucketInfo, "");
            }

            let certificados = [];
            let documentosEmpresaBanco = [];
            let auditoriasCampoBanco = [];
            let desviosAuditoriaBanco = [];

            try {
                certificados = await buscarTodosRegistrosSupabase("certificados", "*");
            } catch (certificadosError) {
                throw new Error(`Erro ao consultar certificados: ${certificadosError.message}`, { cause: certificadosError });
            }

            try {
                documentosEmpresaBanco = await buscarTodosRegistrosSupabase("documentos_empresas", "*");
            } catch (documentosEmpresaError) {
                throw new Error(`Erro ao consultar documentos de empresas: ${documentosEmpresaError.message}`, { cause: documentosEmpresaError });
            }

            try {
                auditoriasCampoBanco = await buscarTodosRegistrosSupabase(
                    "auditorias_campo",
                    "id, empresa_id, numero_auditoria, titulo, empresa_nome, foto_antes_url, foto_depois_url"
                );
            } catch (auditoriasCampoStorageError) {
                console.warn("Erro ao consultar auditorias para vínculo de fotos:", auditoriasCampoStorageError.message);
            }

            try {
                desviosAuditoriaBanco = await buscarTodosRegistrosSupabase(
                    "auditoria_campo_desvios",
                    "id, auditoria_id, empresa_id, categoria, descricao, foto_antes_url, foto_depois_url"
                );
            } catch (desviosAuditoriaStorageError) {
                console.warn("Erro ao consultar desvios para vínculo de fotos:", desviosAuditoriaStorageError.message);
            }

            const colaboradoresPorId = colaboradores.reduce((acc, colaborador) => {
                acc[colaborador.id] = colaborador;
                return acc;
            }, {});

            const colaboradoresPorPasta = colaboradores.reduce((acc, colaborador) => {
                try {
                    const pasta = codigoPastaCertificado(colaborador);

                    if (pasta) acc[pasta] = colaborador;
                } catch {
                    // Ignora colaborador sem código válido para pasta.
                }

                return acc;
            }, {});

            const empresasPorId = empresasBanco.reduce((acc, empresa) => {
                acc[empresa.id] = empresa;
                return acc;
            }, {});

            const certificadosPorCaminho = (certificados || []).reduce((acc, item) => {
                const caminhoArquivo = item.url_do_arquivo || item.arquivo_url;
                if (caminhoArquivo) acc[`certificados-treinamentos:${caminhoArquivo}`] = item;
                return acc;
            }, {});

            const documentosEmpresaPorCaminho = (documentosEmpresaBanco || []).reduce((acc, item) => {
                const caminhoArquivo = item.url_do_arquivo || item.arquivo_url;
                if (caminhoArquivo) acc[`documentos-empresas:${caminhoArquivo}`] = item;
                return acc;
            }, {});

            const contratosPorCaminho = empresasBanco.reduce((acc, empresa) => {
                if (empresa.contrato_url) acc[`contratos-empresas:${empresa.contrato_url}`] = empresa;
                return acc;
            }, {});

            const logosPorCaminho = empresasBanco.reduce((acc, empresa) => {
                if (empresa.logo_url) acc[`logos-empresas:${empresa.logo_url}`] = empresa;
                return acc;
            }, {});

            const fotosPorCaminho = colaboradores.reduce((acc, colaborador) => {
                if (colaborador.fotoUrl) acc[`fotos-colaboradores:${colaborador.fotoUrl}`] = colaborador;
                return acc;
            }, {});

            const registrarCaminhoAuditoria = (acc, valor, registro, origem) => {
                const caminho = extrairCaminhoStorage("auditorias-campo", valor);
                if (caminho) {
                    acc[`auditorias-campo:${caminho}`] = { ...registro, origemAuditoriaStorage: origem };
                }
                return acc;
            };

            const auditoriasCampoPorCaminho = (auditoriasCampoBanco || []).reduce((acc, auditoria) => {
                registrarCaminhoAuditoria(acc, auditoria.foto_antes_url, auditoria, "Auditoria de campo");
                registrarCaminhoAuditoria(acc, auditoria.foto_depois_url, auditoria, "Auditoria de campo");
                return acc;
            }, {});

            const desviosAuditoriaPorCaminho = (desviosAuditoriaBanco || []).reduce((acc, desvio) => {
                registrarCaminhoAuditoria(acc, desvio.foto_antes_url, desvio, "Desvio de auditoria");
                registrarCaminhoAuditoria(acc, desvio.foto_depois_url, desvio, "Desvio de auditoria");
                return acc;
            }, {});

            return coletados
                .map((arquivo) => {
                    const partes = arquivo.caminho.split("/");
                    const pasta = partes.length > 1 ? partes.slice(0, -1).join("/") : "";
                    const primeiraPasta = partes[0] || "";
                    const segundaPasta = partes[1] || "";
                    const chave = `${arquivo.bucket}:${arquivo.caminho}`;

                    let emUso = false;
                    let origemRegistro = "";
                    let registroId = "";
                    let colaboradorNome = "";
                    let colaboradorCodigo = "";
                    let colaboradorEmpresa = "";
                    let empresaNome = "";
                    let empresaCnpj = "";
                    let tipoDocumentoEmpresa = "";
                    let treinamentoNome = "";
                    let origemIdentificacao = "";

                    if (arquivo.bucket === "certificados-treinamentos") {
                        const certificadoVinculado = certificadosPorCaminho[chave] || null;
                        const colaboradorVinculado = certificadoVinculado
                            ? colaboradoresPorId[certificadoVinculado.colaborador_id]
                            : null;
                        const colaboradorPelaPasta = colaboradoresPorPasta[primeiraPasta] || null;
                        const colaboradorArquivo = colaboradorVinculado || colaboradorPelaPasta || null;
                        const treinamento = obterTreinamento(Number(segundaPasta));

                        emUso = Boolean(certificadoVinculado);
                        origemRegistro = certificadoVinculado ? "Base de certificados" : colaboradorPelaPasta ? "Pasta do Storage" : "";
                        registroId = certificadoVinculado?.id || "";
                        colaboradorNome = colaboradorArquivo?.nome || "";
                        colaboradorCodigo = colaboradorArquivo?.codigoFuncionario || "";
                        colaboradorEmpresa = colaboradorArquivo?.empresaExibicao || colaboradorArquivo?.empresa || "";
                        treinamentoNome = certificadoVinculado?.nome_treinamento || treinamento?.nome || "";
                        origemIdentificacao = origemRegistro;
                    }

                    if (arquivo.bucket === "documentos-empresas") {
                        const documentoVinculado = documentosEmpresaPorCaminho[chave] || null;
                        const empresaVinculada = documentoVinculado
                            ? empresasPorId[documentoVinculado.empresa_id]
                            : empresasPorId[primeiraPasta];

                        emUso = Boolean(documentoVinculado);
                        origemRegistro = documentoVinculado ? "Base de documentos empresariais" : empresaVinculada ? "Pasta do Storage" : "";
                        registroId = documentoVinculado?.id || "";
                        empresaNome = empresaVinculada?.nome || "";
                        empresaCnpj = empresaVinculada?.cnpj || "";
                        tipoDocumentoEmpresa = documentoVinculado?.tipo_documento || segundaPasta || "";
                        origemIdentificacao = origemRegistro;
                    }

                    if (arquivo.bucket === "contratos-empresas") {
                        const empresaContrato = contratosPorCaminho[chave] || empresasPorId[primeiraPasta];

                        emUso = Boolean(contratosPorCaminho[chave]);
                        origemRegistro = contratosPorCaminho[chave] ? "Cadastro da empresa" : empresaContrato ? "Pasta do Storage" : "";
                        registroId = empresaContrato?.id || "";
                        empresaNome = empresaContrato?.nome || "";
                        empresaCnpj = empresaContrato?.cnpj || "";
                        tipoDocumentoEmpresa = "Contrato da empresa";
                        origemIdentificacao = origemRegistro;
                    }

                    if (arquivo.bucket === "logos-empresas") {
                        const empresaLogo = logosPorCaminho[chave] || empresasPorId[primeiraPasta];

                        emUso = Boolean(logosPorCaminho[chave]);
                        origemRegistro = logosPorCaminho[chave] ? "Cadastro da empresa" : empresaLogo ? "Pasta do Storage" : "";
                        registroId = empresaLogo?.id || "";
                        empresaNome = empresaLogo?.nome || "";
                        empresaCnpj = empresaLogo?.cnpj || "";
                        tipoDocumentoEmpresa = "Logo da empresa";
                        origemIdentificacao = origemRegistro;
                    }

                    if (arquivo.bucket === "fotos-colaboradores") {
                        const colaboradorFoto = fotosPorCaminho[chave] || colaboradoresPorId[primeiraPasta];

                        emUso = Boolean(fotosPorCaminho[chave]);
                        origemRegistro = fotosPorCaminho[chave] ? "Cadastro do colaborador" : colaboradorFoto ? "Pasta do Storage" : "";
                        registroId = colaboradorFoto?.id || "";
                        colaboradorNome = colaboradorFoto?.nome || "";
                        colaboradorCodigo = colaboradorFoto?.codigoFuncionario || "";
                        colaboradorEmpresa = colaboradorFoto?.empresaExibicao || colaboradorFoto?.empresa || "";
                        origemIdentificacao = origemRegistro;
                    }

                    if (arquivo.bucket === "auditorias-campo") {
                        const auditoriaVinculada = auditoriasCampoPorCaminho[chave] || null;
                        const desvioVinculado = desviosAuditoriaPorCaminho[chave] || null;
                        const registroAuditoria = auditoriaVinculada || desvioVinculado || null;
                        const empresaAuditoria = registroAuditoria?.empresa_id ? empresasPorId[registroAuditoria.empresa_id] : null;

                        emUso = Boolean(registroAuditoria);
                        origemRegistro = registroAuditoria?.origemAuditoriaStorage || (primeiraPasta ? "Pasta do Storage" : "");
                        registroId = registroAuditoria?.id || "";
                        empresaNome = empresaAuditoria?.nome || registroAuditoria?.empresa_nome || "";
                        empresaCnpj = empresaAuditoria?.cnpj || "";
                        tipoDocumentoEmpresa = registroAuditoria?.numero_auditoria || registroAuditoria?.categoria || "Foto de auditoria de campo";
                        origemIdentificacao = origemRegistro;
                    }

                    return {
                        ...arquivo,
                        pasta,
                        pastaColaborador: primeiraPasta,
                        pastaTreinamento: segundaPasta,
                        treinamentoNome,
                        colaboradorNome,
                        colaboradorCodigo,
                        colaboradorEmpresa,
                        empresaNome,
                        empresaCnpj,
                        tipoDocumentoEmpresa,
                        origemColaborador: origemIdentificacao,
                        origemRegistro,
                        registroId,
                        emUso,
                    };
                })
                .sort((a, b) =>
                    a.bucket.localeCompare(b.bucket) ||
                    Number(a.emUso) - Number(b.emUso) ||
                    a.caminho.localeCompare(b.caminho)
                );
        } catch (error) {
            setErroBanco(error.message || "Erro ao listar arquivos do Storage.");
            alert(error.message || "Erro ao listar arquivos do Storage.");
            return [];
        }
    }

    async function excluirArquivoCertificadoStorage(arquivo) {
        setErroBanco("");

        if (!arquivo?.caminho) {
            alert("Arquivo inválido para exclusão.");
            return false;
        }

        if (arquivo.emUso) {
            alert(`Este arquivo está em uso em: ${arquivo.origemTipo || arquivo.tabelaOrigem || "base do sistema"}. Para evitar quebrar o histórico, exclua primeiro o registro vinculado.`);
            return false;
        }

        const confirmado = window.confirm(
            `Excluir definitivamente este arquivo do Storage?\n\nBucket: ${arquivo.bucket || "certificados-treinamentos"}\nArquivo: ${arquivo.nome}\nPasta: ${arquivo.pasta || "raiz"}`
        );

        if (!confirmado) return false;

        const { error } = await supabase.storage
            .from(arquivo.bucket || "certificados-treinamentos")
            .remove([arquivo.caminho]);

        if (error) {
            setErroBanco(`Erro ao excluir arquivo do Storage: ${error.message}`);
            alert(`Erro ao excluir arquivo do Storage: ${error.message}`);
            return false;
        }

        await registrarAuditoria("DELETE_STORAGE", arquivo.bucket || "storage", `Excluiu arquivo sem registro do Storage: ${arquivo.nome}`, arquivo.caminho, {
            bucket: arquivo.bucket || "",
            caminho: arquivo.caminho,
            pasta: arquivo.pasta || "",
            nome: arquivo.nome,
            origemTipo: arquivo.origemTipo || "",
            tabelaOrigem: arquivo.tabelaOrigem || "",
            colaboradorNome: arquivo.colaboradorNome || "",
            colaboradorCodigo: arquivo.colaboradorCodigo || "",
            colaboradorEmpresa: arquivo.colaboradorEmpresa || "",
            empresaNome: arquivo.empresaNome || "",
            empresaCnpj: arquivo.empresaCnpj || "",
            tipoDocumentoEmpresa: arquivo.tipoDocumentoEmpresa || "",
        });

        return true;
    }

    async function salvarCertificadoTreinamento(certificado) {
        setErroBanco("");

        try {
            if (!certificado.colaboradorCodigo && !certificado.colaborador?.codigoFuncionario && !certificado.colaborador?.id) {
                throw new Error("Selecione o colaborador.");
            }

            if (!certificado.treinamentoId) {
                throw new Error("Selecione o treinamento/documento.");
            }

            if (!certificado.dataRealizacao) {
                throw new Error("Informe a data de realização/emissão.");
            }

            const treinamentoSemVencimento = treinamentoSemValidade(certificado.treinamentoId);

            if (!treinamentoSemVencimento && !certificado.dataVencimento) {
                throw new Error("Informe a validade/revisão do certificado.");
            }

            if (!certificado.arquivo) {
                throw new Error("Selecione o arquivo PDF ou imagem do certificado.");
            }

            const codigoInformado = String(
                certificado.colaboradorCodigo ||
                certificado.colaborador?.codigoFuncionario ||
                ""
            ).trim();

            const idInformadoSomenteSeUuid = ehUuid(certificado.colaborador?.id)
                ? String(certificado.colaborador.id)
                : "";

            let colaboradorSeguro =
                colaboradores.find((c) => String(c.codigoFuncionario) === codigoInformado) ||
                colaboradores.find((c) => idInformadoSomenteSeUuid && String(c.id) === idInformadoSomenteSeUuid) ||
                colaboradores.find((c) => String(c.codigoFuncionario) === String(colaboradorSelecionado?.codigoFuncionario || "")) ||
                null;

            if (!colaboradorSeguro?.id || !ehUuid(colaboradorSeguro.id)) {
                throw new Error(
                    "Colaborador inválido. O sistema não encontrou o UUID do colaborador. Volte na aba Colaboradores, clique em Enviar treinamento e tente novamente."
                );
            }

            const colaboradorIdSeguro = String(colaboradorSeguro.id);
            const treinamentoIdSeguro = Number(certificado.treinamentoId);

            if (!Number.isFinite(treinamentoIdSeguro)) {
                throw new Error("Treinamento/documento inválido. Selecione novamente o documento.");
            }

            const treinamento = obterTreinamento(treinamentoIdSeguro);

            if (!treinamento) {
                throw new Error("Treinamento/documento não encontrado na base do sistema.");
            }

            // Mesmo padrão da foto do colaborador:
            // 1) identifica o colaborador corretamente;
            // 2) salva o arquivo no Storage em pasta organizada pelo código do funcionário;
            // 3) grava/atualiza a referência na tabela certificados usando o UUID real do colaborador.
            const arquivo = await enviarArquivoCertificado(
                certificado.arquivo,
                colaboradorSeguro,
                treinamentoIdSeguro
            );

            const payload = {
                colaborador_id: colaboradorIdSeguro,
                tipo_treinamento: treinamento.nome,
                treinamento_codigo: treinamentoIdSeguro,
                nome_treinamento: treinamento.nome,
                data_realizacao: certificado.dataRealizacao,
                data_vencimento: treinamentoSemVencimento ? null : certificado.dataVencimento,
                arquivo_url: arquivo.arquivoUrl,
                arquivo_nome: certificado.arquivoNome || arquivo.arquivoNome,
                observacao: certificado.observacao || null,
                status_validacao: "Validado",
            };

            const { data: existentes, error: buscaError } = await supabase
                .from("certificados")
                .select("*")
                .eq("colaborador_id", colaboradorIdSeguro)
                .eq("tipo_treinamento", treinamento.nome)
                .order("created_at", { ascending: false })
                .limit(1);

            if (buscaError) {
                throw new Error(`Erro ao verificar certificado existente: ${buscaError.message}`);
            }

            const existente = existentes?.[0] || null;

            const consulta = existente?.id
                ? supabase
                    .from("certificados")
                    .update(payload)
                    .eq("id", existente.id)
                : supabase
                    .from("certificados")
                    .insert(payload);

            const { data, error } = await consulta
                .select("*")
                .single();

            if (error) {
                throw new Error(`Erro ao salvar certificado na tabela certificados: ${error.message}`);
            }

            if ((existente?.url_do_arquivo || existente?.arquivo_url) && (existente.url_do_arquivo || existente.arquivo_url) !== arquivo.arquivoUrl) {
                await supabase.storage.from("certificados-treinamentos").remove([(existente.url_do_arquivo || existente.arquivo_url)]);
            }

            const certificadoNormalizado = normalizarCertificado(data);

            setColaboradores((atual) =>
                atual.map((colaborador) => {
                    if (String(colaborador.id) !== String(certificadoNormalizado.colaboradorId)) return colaborador;

                    const demais = (colaborador.treinamentos || []).filter(
                        (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
                    );

                    return {
                        ...colaborador,
                        treinamentos: [certificadoNormalizado, ...demais],
                    };
                })
            );

            setColaboradorSelecionado((atual) => {
                if (!atual || String(atual.id) !== String(certificadoNormalizado.colaboradorId)) return atual;

                const demais = (atual.treinamentos || []).filter(
                    (item) => Number(item.treinamentoId) !== Number(certificadoNormalizado.treinamentoId)
                );

                return {
                    ...atual,
                    treinamentos: [certificadoNormalizado, ...demais],
                };
            });

            await carregarColaboradores();

            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao salvar certificado.");
            alert(error.message || "Erro ao salvar certificado.");
            return false;
        }
    }


    async function atualizarDatasCertificado(certificado, datas) {
        setErroBanco("");

        if (!certificado?.id) {
            setErroBanco("Certificado inválido para atualização.");
            return false;
        }

        const { data, error } = await supabase
            .from("certificados")
            .update({
                data_realizacao: datas.realizado,
                data_vencimento: datas.vencimento || null,
            })
            .eq("id", certificado.id)
            .select("*")
            .single();

        if (error) {
            setErroBanco(`Erro ao atualizar datas do certificado: ${error.message}`);
            alert(`Erro ao atualizar datas do certificado: ${error.message}`);
            return false;
        }

        const atualizado = normalizarCertificado(data);

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(atualizado.colaboradorId)) return colaborador;

                return {
                    ...colaborador,
                    treinamentos: (colaborador.treinamentos || []).map((item) =>
                        item.id === atualizado.id ? atualizado : item
                    ),
                };
            })
        );

        setColaboradorSelecionado((atual) => {
            if (!atual || String(atual.id) !== String(atualizado.colaboradorId)) return atual;

            return {
                ...atual,
                treinamentos: (atual.treinamentos || []).map((item) =>
                    item.id === atualizado.id ? atualizado : item
                ),
            };
        });

        await carregarColaboradores();

        return true;
    }

    async function visualizarCertificadoTreinamento(certificado) {
        setErroBanco("");

        if (!certificado?.arquivoUrl) {
            setErroBanco("Este certificado ainda não possui arquivo anexado.");
            return;
        }

        const { data, error } = await supabase.storage
            .from("certificados-treinamentos")
            .createSignedUrl(certificado.arquivoUrl, 60 * 10);

        if (error) {
            setErroBanco(`Erro ao gerar link do certificado: ${error.message}`);
            return;
        }

        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }

    async function excluirCertificadoTreinamento(certificado) {
        const treinamento = obterTreinamento(certificado.treinamentoId);
        const confirmar = window.confirm(`Deseja excluir o certificado ${treinamento.nome}?`);

        if (!confirmar) return;

        setErroBanco("");

        const { error } = await supabase
            .from("certificados")
            .delete()
            .eq("id", certificado.id);

        if (error) {
            setErroBanco(`Erro ao excluir certificado: ${error.message}`);
            return;
        }

        if (certificado.arquivoUrl) {
            await supabase.storage.from("certificados-treinamentos").remove([certificado.arquivoUrl]);
        }

        setColaboradores((atual) =>
            atual.map((colaborador) => {
                if (String(colaborador.id) !== String(certificado.colaboradorId)) return colaborador;

                return {
                    ...colaborador,
                    treinamentos: (colaborador.treinamentos || []).filter((item) => item.id !== certificado.id),
                };
            })
        );
    }

    async function excluirColaborador(colaborador) {
        const confirmar = window.confirm(`Deseja realmente excluir o colaborador ${colaborador.nome}?`);

        if (!confirmar) return;

        setErroBanco("");

        const { error } = await supabase
            .from("colaboradores")
            .delete()
            .eq("id", colaborador.id);

        if (error) {
            setErroBanco(`Erro ao excluir colaborador: ${error.message}`);
            return;
        }

        setColaboradores((atual) => atual.filter((item) => item.id !== colaborador.id));

        if (colaboradorSelecionado?.id === colaborador.id) {
            const restante = colaboradores.filter((item) => item.id !== colaborador.id);
            setColaboradorSelecionado(restante[0] || null);
        }
    }

    useEffect(() => {
        if (!SUPABASE_CONFIGURADO) return;

        async function carregarSessao() {
            const { data } = await supabase.auth.getSession();

            if (data.session?.user) {
                setUsuario({
                    id: data.session.user.id,
                    email: data.session.user.email,
                    perfil: "Técnico de Segurança",
                });
            }

            setCarregandoSessao(false);
        }

        carregarSessao();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                setUsuario({
                    id: session.user.id,
                    email: session.user.email,
                    perfil: "Técnico de Segurança",
                });
            } else {
                setUsuario(null);
            }
        });

        return () => {
            listener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!SUPABASE_CONFIGURADO) return;

        const parametros = new URLSearchParams(window.location.search);
        const tokenQr = parametros.get("qr");

        if (!tokenQr) return;

        let ativo = true;

        const obterFotoColaboradorQrPorEdgeFunction = async (tokenConsulta) => {
            const tokenSeguro = String(tokenConsulta || "").trim();

            if (!tokenSeguro) return "";

            try {
                const { data, error } = await supabase.functions.invoke("gerar-foto-colaborador-qr", {
                    body: { token: tokenSeguro },
                });

                if (error || data?.ok === false) {
                    console.warn(
                        "Erro ao obter foto pública do colaborador via Edge Function:",
                        error?.message || data?.erro || "Falha ao gerar URL assinada da foto."
                    );
                    return "";
                }

                return data?.signedUrl || data?.fotoUrl || "";
            } catch (error) {
                console.warn("Falha inesperada ao obter foto pública do colaborador:", error?.message || error);
                return "";
            }
        };

        const normalizarConsultaPublicaComFoto = async (dadosConsulta) => {
            if (!dadosConsulta?.colaborador) return dadosConsulta;

            const colaboradorConsulta = dadosConsulta.colaborador || {};
            const fotoOriginal =
                colaboradorConsulta.fotoUrl ||
                colaboradorConsulta.foto_url ||
                colaboradorConsulta.foto ||
                "";

            const fotoEhUrlFinal = /^https?:\/\//i.test(String(fotoOriginal || "")) || String(fotoOriginal || "").startsWith("blob:");
            const fotoAssinada = fotoEhUrlFinal ? fotoOriginal : await obterFotoColaboradorQrPorEdgeFunction(tokenQr);

            return {
                ...dadosConsulta,
                colaborador: {
                    ...colaboradorConsulta,
                    fotoUrl: fotoAssinada || "",
                    fotoNome: colaboradorConsulta.fotoNome || colaboradorConsulta.foto_nome || "",
                    codigoFuncionario:
                        colaboradorConsulta.codigoFuncionario ||
                        colaboradorConsulta.codigo_funcionario ||
                        "",
                    statusMobilizacao:
                        colaboradorConsulta.statusMobilizacao ||
                        colaboradorConsulta.status_mobilizacao ||
                        "",
                    token: colaboradorConsulta.token || colaboradorConsulta.token_qr || tokenQr,
                },
            };
        };

        async function carregarConsultaPublica() {
            setCarregandoConsultaPublica(true);
            setErroConsultaPublica("");

            const { data, error } = await supabase.rpc("consulta_publica_qr", {
                token_param: tokenQr,
            });

            if (!ativo) return;

            if (error) {
                setErroConsultaPublica(`Erro ao carregar consulta pública: ${error.message}`);
                setConsultaPublica(null);
            } else {
                const dadosNormalizados = await normalizarConsultaPublicaComFoto(data);

                if (!ativo) return;

                setConsultaPublica(dadosNormalizados);
            }

            setCarregandoConsultaPublica(false);
        }

        carregarConsultaPublica();

        return () => {
            ativo = false;
        };
    }, []);

    useEffect(() => {
        if (!usuario) return;

        const timer = window.setTimeout(async () => {
            carregarColaboradores();
            carregarEmailsEnviados();
            carregarAuditoriasCampo();
            registrarAuditoria("ACESSO", "sistema", "Usuário acessou o sistema");

            const autorizadoAuditoria = await verificarAcessoAuditoria();

            if (autorizadoAuditoria) {
                carregarAuditoria();
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [usuario, carregarColaboradores, carregarAuditoria, carregarEmailsEnviados, carregarAuditoriasCampo, registrarAuditoria, verificarAcessoAuditoria]);

    useEffect(() => {
        if (!usuario || colaboradores.length === 0) return;

        const parametros = new URLSearchParams(window.location.search);
        const tokenQr = parametros.get("qr");

        if (!tokenQr) return;

        const timer = window.setTimeout(() => {
            const encontrado = colaboradores.find((item) => String(item.token) === String(tokenQr));

            if (encontrado) {
                setColaboradorSelecionado(encontrado);
                setTela("qr");
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [usuario, colaboradores]);

    const nav = [
        { id: "dashboard", label: "Dashboard SST", icon: LayoutDashboard },
        { id: "auditoriaCampo", label: "Dashboard Auditoria", icon: ClipboardCheck },
        { id: "novaAuditoriaCampo", label: "Nova Auditoria", icon: Plus },
        { id: "empresas", label: "Empresas", icon: Building2 },
        { id: "colaboradores", label: "Colaboradores", icon: Users },
        { id: "aniversariantes", label: "Aniversariantes", icon: CalendarClock },
        { id: "treinamentos", label: "Treinamentos", icon: ClipboardCheck },
        { id: "qr", label: "Consulta QR", icon: QrCode },
        ...(podeAcessarAuditoria ? [{ id: "auditoria", label: "Auditoria de sistema", icon: Database }] : []),
        { id: "roteiro", label: "Roteiro", icon: CalendarClock },
    ];

    const selecionarColaborador = (c) => {
        setColaboradorSelecionado(c);
        setTela("qr");
        registrarAuditoria("ACESSO_QR_INTERNO", "colaboradores", `Abriu consulta QR interna de ${c?.nome || "colaborador"}`, c?.id, {
            codigoFuncionario: c?.codigoFuncionario || null,
        });
    };

    const abrirEnvioTreinamento = (c) => {
        setColaboradorSelecionado(c);
        setTela("treinamentos");
    };

    const sair = async () => {
        await supabase.auth.signOut();
        setUsuario(null);
        setColaboradores([]);
        setEmpresasBanco([]);
        setDocumentosEmpresas([]);
        setColaboradorSelecionado(null);
        setAuditoriaLiberada(false);
        setPodeAcessarAuditoria(false);
        try {
            window.sessionStorage.removeItem("auditoriaLiberada");
        } catch {
            // Ignora indisponibilidade do sessionStorage.
        }
    };

    if (!SUPABASE_CONFIGURADO) {
        return <SupabaseConfiguracaoPendente />;
    }

    if (carregandoSessao) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
                <div className="rounded-3xl bg-white/10 p-6 text-center">
                    <ShieldCheck className="mx-auto mb-3 h-8 w-8" />
                    <p className="font-semibold">Carregando sistema...</p>
                </div>
            </div>
        );
    }

    const parametrosAtuais = new URLSearchParams(window.location.search);
    const tokenQrPublico = parametrosAtuais.get("qr");

    const rotaAtualCompleta = typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.hash}`
        : "";

    const rotaNovaAuditoriaCampo = (
        rotaAtualCompleta.includes("/nova-auditoria-campo") ||
        rotaAtualCompleta.includes("/auditoria-campo")
    );

    if (rotaNovaAuditoriaCampo) {
        return (
            <NovaAuditoriaCampoDireta
                usuario={usuario}
                empresasBanco={empresasBanco}
                onAuditoriaSalva={(novaAuditoria) => setAuditoriasCampo((atual) => [novaAuditoria, ...atual])}
            />
        );
    }

    if (tokenQrPublico && !usuario) {
        if (carregandoConsultaPublica || carregandoSessao) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
                    <div className="rounded-3xl bg-white/10 p-6 text-center">
                        <QrCode className="mx-auto mb-3 h-8 w-8" />
                        <p className="font-semibold">Carregando consulta pública...</p>
                    </div>
                </div>
            );
        }

        if (erroConsultaPublica || !consultaPublica) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
                    <div className="w-full max-w-lg rounded-[2rem] bg-white p-8 text-center shadow-sm">
                        <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                        <h1 className="text-xl font-bold text-slate-950">QR Code não encontrado</h1>
                        <p className="mt-2 text-sm text-slate-500">
                            {erroConsultaPublica || "Não foi possível localizar a consulta pública deste colaborador."}
                        </p>
                    </div>
                </div>
            );
        }

        return <ConsultaQRPublica dados={consultaPublica} />;
    }

    if (!usuario) {
        return <LoginScreen onLogin={setUsuario} />;
    }

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <div className="flex min-h-screen">
                <aside
                    className={classNames(
                        "hidden border-r border-slate-200 bg-white transition-all duration-300 lg:block",
                        menuLateralAberto ? "w-72 p-5" : "w-20 p-3"
                    )}
                >
                    <div className={classNames(
                        "flex items-center rounded-3xl bg-slate-950 text-white",
                        menuLateralAberto ? "gap-3 p-4" : "justify-center p-3"
                    )}>
                        <div className="rounded-2xl bg-white/10 p-3">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        {menuLateralAberto && (
                            <div className="min-w-0 flex-1">
                                <h1 className="truncate font-bold">Controle SST QR</h1>
                                <p className="truncate text-xs text-slate-300">Treinamentos · Terceiros</p>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setMenuLateralAberto((valor) => !valor)}
                        className={classNames(
                            "mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
                            !menuLateralAberto && "h-10 px-0"
                        )}
                        title={menuLateralAberto ? "Ocultar menu lateral" : "Abrir menu lateral"}
                    >
                        <span className="text-base leading-none">{menuLateralAberto ? "‹" : "›"}</span>
                        {menuLateralAberto && <span>Ocultar menu</span>}
                    </button>

                    <nav className="mt-6 space-y-2">
                        {nav.map((item) => {
                            const Icon = item.icon;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setTela(item.id);
                                        registrarAuditoria("ACESSO_TELA", "navegacao", `Acessou a tela: ${item.label}`);
                                    }}
                                    className={classNames(
                                        "flex w-full items-center rounded-2xl text-left text-sm font-medium transition",
                                        menuLateralAberto ? "gap-3 px-4 py-3" : "justify-center px-0 py-3",
                                        tela === item.id
                                            ? "bg-slate-950 text-white shadow-sm"
                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                                    )}
                                    title={!menuLateralAberto ? item.label : undefined}
                                >
                                    <Icon className="h-4 w-4 shrink-0" />
                                    {menuLateralAberto && <span className="truncate">{item.label}</span>}
                                </button>
                            );
                        })}
                    </nav>

                    {menuLateralAberto ? (
                        <div className="mt-6 rounded-3xl bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Usuário logado</p>
                            <p className="mt-1 break-all text-sm font-bold text-slate-900">{usuario.email}</p>
                            <p className="mt-1 text-xs text-slate-500">Perfil: {usuario.perfil}</p>

                            <button
                                onClick={sair}
                                className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                            >
                                Sair
                            </button>
                        </div>
                    ) : (
                        <div className="mt-6 flex justify-center">
                            <button
                                onClick={sair}
                                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-xs font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                                title={`Sair de ${usuario.email}`}
                            >
                                Sair
                            </button>
                        </div>
                    )}
                </aside>

                <main className="flex-1 p-4 md:p-8">
                    <div className="mb-5 flex items-center justify-between rounded-3xl bg-white p-3 shadow-sm lg:hidden">
                        <div className="flex items-center gap-2 font-bold">
                            <ShieldCheck className="h-5 w-5" />
                            Controle SST QR
                        </div>

                        <select
                            value={tela}
                            onChange={(e) => {
                                setTela(e.target.value);
                                registrarAuditoria("ACESSO_TELA", "navegacao", `Acessou a tela: ${e.target.value}`);
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                            {nav.map((n) => (
                                <option key={n.id} value={n.id}>
                                    {n.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {tela === "dashboard" && (
                        <Dashboard
                            colaboradores={colaboradores}
                            empresasBanco={empresasBanco}
                            documentosEmpresas={documentosEmpresas}
                            auditoria={auditoria}
                            onSelectColab={selecionarColaborador}
                            onRegistrarEmailEnviado={registrarEmailEnviado}
                        />
                    )}

                    {tela === "novaAuditoriaCampo" && (
                        <NovaAuditoriaCampoDireta
                            usuario={usuario}
                            empresasBanco={empresasBanco}
                            onAuditoriaSalva={(novaAuditoria) => setAuditoriasCampo((atual) => [novaAuditoria, ...atual])}
                        />
                    )}

                    {tela === "auditoriaCampo" && (
                        <DashboardAuditoriaCampo
                            auditoriasCampo={auditoriasCampo}
                            carregando={carregandoAuditoriasCampo}
                            erro={erroAuditoriasCampo}
                            onRecarregar={carregarAuditoriasCampo}
                            onAuditoriaAtualizada={(atualizada) =>
                                setAuditoriasCampo((atual) =>
                                    atualizada?.excluida
                                        ? atual.filter((item) => item.id !== atualizada.id)
                                        : atual.map((item) => item.id === atualizada.id ? atualizada : item)
                                )
                            }
                        />
                    )}

                    {tela === "empresas" && (
                        <Empresas
                            empresasBanco={empresasBanco}
                            documentosEmpresas={documentosEmpresas}
                            colaboradores={colaboradores}
                            carregandoBanco={carregandoBanco}
                            erroBanco={erroBanco}
                            onAtualizarBanco={carregarColaboradores}
                            onAdicionarEmpresa={adicionarEmpresa}
                            onAtualizarEmpresa={atualizarEmpresa}
                            onExcluirEmpresa={excluirEmpresa}
                            onAdicionarDocumentoEmpresa={adicionarDocumentoEmpresa}
                            onExcluirDocumentoEmpresa={excluirDocumentoEmpresa}
                            onVisualizarDocumentoEmpresa={visualizarDocumentoEmpresa}
                        />
                    )}

                    {tela === "colaboradores" && (
                        <Colaboradores
                            colaboradores={colaboradores}
                            empresasBanco={empresasBanco}
                            carregandoBanco={carregandoBanco}
                            erroBanco={erroBanco}
                            onAtualizarBanco={carregarColaboradores}
                            onAdicionarColaborador={adicionarColaborador}
                            onAtualizarColaborador={atualizarColaborador}
                            onExcluirColaborador={excluirColaborador}
                            onSelectColab={selecionarColaborador}
                            onEnviarTreinamento={abrirEnvioTreinamento}
                        />
                    )}

                    {tela === "aniversariantes" && (
                        <Aniversariantes
                            colaboradores={colaboradores}
                            empresasBanco={empresasBanco}
                        />
                    )}

                    {tela === "treinamentos" && (
                        <Treinamentos
                            key={colaboradorSelecionado?.id || "treinamentos"}
                            colaboradores={colaboradores}
                            colaboradorInicialId={colaboradorSelecionado?.id}
                            onSalvarCertificado={salvarCertificadoTreinamento}
                            onVisualizarCertificado={visualizarCertificadoTreinamento}
                            onExcluirCertificado={excluirCertificadoTreinamento}
                            onAtualizarDatasCertificado={atualizarDatasCertificado}
                            onSincronizarStorage={sincronizarCertificadosDoStorage}
                            onRegistrarEmailEnviado={registrarEmailEnviado}
                        />
                    )}

                    {tela === "qr" && (
                        <ConsultaQR
                            colaborador={colaboradorSelecionado}
                            colaboradores={colaboradores}
                            onSelecionarColaborador={setColaboradorSelecionado}
                        />
                    )}

                    {tela === "auditoria" && (
                        verificandoAcessoAuditoria ? (
                            <Card>
                                <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    Verificando permissão da Auditoria de sistema...
                                </div>
                            </Card>
                        ) : !podeAcessarAuditoria ? (
                            <AuditoriaAcessoNegado />
                        ) : (
                            <RelatorioAuditoria
                                auditoria={auditoria}
                                emailsEnviados={emailsEnviados}
                                carregando={carregandoAuditoria}
                                onAtualizar={async () => { await carregarAuditoria(); await carregarEmailsEnviados(); await carregarAuditoriasCampo(); }}
                                onListarArquivosStorage={listarArquivosCertificadosStorage}
                                onExcluirArquivoStorage={excluirArquivoCertificadoStorage}
                                onListarUsuariosAuditoria={carregarUsuariosAutorizadosAuditoria}
                                onSalvarUsuarioAuditoria={salvarUsuarioAutorizadoAuditoria}
                                onAlternarUsuarioAuditoria={alternarUsuarioAutorizadoAuditoria}
                                onBloquear={bloquearAuditoria}
                            />
                        )
                    )}

                    {tela === "roteiro" && <Requisitos />}
                </main>
            </div>
        </div>
    );
}
