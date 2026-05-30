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
    codigoPastaCertificado,
    enviarArquivoCertificado,
    gerarUrlAssinadaCertificado,
    removerArquivoCertificadoStorage,
} from "./services/certificadosStorageService";
import { auditoriaEventoHabilitado } from "./services/auditoriaSistemaConfigService";
import {
    carregarLimitesCarregamentoSistema,
    salvarLimitesCarregamentoSistema,
} from "./constants/sistemaLimitesConstants";
import {
    carregarSenhaConfiguracoesSistema,
    carregarSenhaConfiguracoesSistemaSupabase,
    salvarSenhaConfiguracoesSistema,
    salvarSenhaConfiguracoesSistemaSupabase,
    SENHA_CONFIGURACOES_PADRAO,
} from "./constants/configuracoesSegurancaConstants";
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
import { FormularioNovoColaborador } from "./components/colaboradores/FormularioNovoColaborador";
import { ModalNovaFuncaoColaborador } from "./components/colaboradores/ModalNovaFuncaoColaborador";
import { ModalRevisaoColaborador } from "./components/colaboradores/ModalRevisaoColaborador";
import { FileUploadAviso, validarArquivoAntesUpload, validarListaArquivosAntesUpload } from "./components/FileUploadAviso";
import { AuditoriaAcessoNegado, AuditoriaBloqueada } from "./components/auditoria/AuditoriaPermissao";
import { AuditoriaAtividades } from "./components/auditoria/AuditoriaAtividades";
import { EditorNotificacaoHistoricoAuditoria } from "./components/auditoria/EditorNotificacaoHistoricoAuditoria";
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
import { normalizarRegistrosAuditoriasCampo } from "./services/appHelpersService";
import { CarregandoTela } from "./components/CarregandoTela";
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
    Settings,
    ShieldCheck,
    Trash2,
    Upload,
    UserPlus,
    UserRound,
    Users,
    XCircle,
} from "lucide-react";


const ConsultaQR = React.lazy(() => import("./components/qr/ConsultaQR").then((modulo) => ({ default: modulo.ConsultaQR })));
const ConsultaQRPublica = React.lazy(() => import("./components/qr/ConsultaQRPublica").then((modulo) => ({ default: modulo.ConsultaQRPublica })));
const Requisitos = React.lazy(() => import("./components/Requisitos").then((modulo) => ({ default: modulo.Requisitos })));
const Aniversariantes = React.lazy(() => import("./components/aniversariantes/AniversariantesPage").then((modulo) => ({ default: modulo.Aniversariantes })));
const Dashboard = React.lazy(() => import("./components/dashboard/Dashboard").then((modulo) => ({ default: modulo.Dashboard })));
const Empresas = React.lazy(() => import("./components/empresas/EmpresasPage").then((modulo) => ({ default: modulo.Empresas })));
const Colaboradores = React.lazy(() => import("./components/colaboradores/ColaboradoresPage").then((modulo) => ({ default: modulo.Colaboradores })));
const Treinamentos = React.lazy(() => import("./components/treinamentos/TreinamentosPage").then((modulo) => ({ default: modulo.Treinamentos })));
const RelatorioAuditoria = React.lazy(() => import("./components/auditoria/RelatorioAuditoria").then((modulo) => ({ default: modulo.RelatorioAuditoria })));
const DashboardAuditoriaCampo = React.lazy(() => import("./components/auditoria/DashboardAuditoriaCampo").then((modulo) => ({ default: modulo.DashboardAuditoriaCampo })));
const NovaAuditoriaCampoDireta = React.lazy(() => import("./components/auditoria/NovaAuditoriaCampoDireta").then((modulo) => ({ default: modulo.NovaAuditoriaCampoDireta })));
const ConfiguracoesSistema = React.lazy(() => import("./components/configuracoes/ConfiguracoesSistema").then((modulo) => ({ default: modulo.ConfiguracoesSistema })));

const hoje = new Date();






export default function App() {
    const [usuario, setUsuario] = useState(null);
    const [carregandoSessao, setCarregandoSessao] = useState(() => SUPABASE_CONFIGURADO);
    const [tela, setTela] = useState("dashboard");
    const [configuracoesDesbloqueadas, setConfiguracoesDesbloqueadas] = useState(false);
    const [senhaConfiguracoesSistema, setSenhaConfiguracoesSistema] = useState(() => carregarSenhaConfiguracoesSistema());
    const [origemSenhaConfiguracoesSistema, setOrigemSenhaConfiguracoesSistema] = useState("local");
    const [mensagemSenhaConfiguracoesSistema, setMensagemSenhaConfiguracoesSistema] = useState("Senha carregada localmente.");
    const [senhaConfiguracoes, setSenhaConfiguracoes] = useState("");
    const [mostrarSenhaConfiguracoes, setMostrarSenhaConfiguracoes] = useState(false);
    const [erroSenhaConfiguracoes, setErroSenhaConfiguracoes] = useState("");
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
    const [atualizandoDashboardSst, setAtualizandoDashboardSst] = useState(false);
    const [erroBanco, setErroBanco] = useState("");
    const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
    const [consultaPublica, setConsultaPublica] = useState(null);
    const [carregandoConsultaPublica, setCarregandoConsultaPublica] = useState(false);
    const [erroConsultaPublica, setErroConsultaPublica] = useState("");
    const [auditoria, setAuditoria] = useState([]);
    const [emailsEnviados, setEmailsEnviados] = useState([]);
    const [auditoriasCampo, setAuditoriasCampo] = useState([]);
    const [carregandoAuditoriasCampo, setCarregandoAuditoriasCampo] = useState(false);
    const [carregandoMaisAuditoriasCampo, setCarregandoMaisAuditoriasCampo] = useState(false);
    const [erroAuditoriasCampo, setErroAuditoriasCampo] = useState("");
    const [existeMaisAuditoriasCampo, setExisteMaisAuditoriasCampo] = useState(true);
    const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);
    const [auditoriaCarregada, setAuditoriaCarregada] = useState(false);
    const [emailsEnviadosCarregados, setEmailsEnviadosCarregados] = useState(false);
    const [auditoriasCampoCarregadas, setAuditoriasCampoCarregadas] = useState(false);
    const [existeMaisAuditoria, setExisteMaisAuditoria] = useState(true);
    const [carregandoMaisAuditoria, setCarregandoMaisAuditoria] = useState(false);
    const [limitesCarregamentoSistema, setLimitesCarregamentoSistema] = useState(() => carregarLimitesCarregamentoSistema());
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

    useEffect(() => {
        if (!usuario || !SUPABASE_CONFIGURADO) return;

        let ativo = true;
        const timer = window.setTimeout(async () => {
            const resultado = await carregarSenhaConfiguracoesSistemaSupabase(supabase);

            if (!ativo) return;

            setSenhaConfiguracoesSistema(resultado.senha);
            setOrigemSenhaConfiguracoesSistema(resultado.origem || "local");
            setMensagemSenhaConfiguracoesSistema(resultado.mensagem || "Senha das Configurações carregada.");
        }, 0);

        return () => {
            ativo = false;
            window.clearTimeout(timer);
        };
    }, [usuario]);

    const atualizarLimitesCarregamentoSistema = useCallback((novosLimites) => {
        const normalizados = salvarLimitesCarregamentoSistema(novosLimites);
        setLimitesCarregamentoSistema(normalizados);
        return normalizados;
    }, []);

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

        const { data, error } = await supabase
            .from("auditoria_sistema")
            .select("id, created_at, usuario_email, acao, tabela, registro_id, descricao, dados")
            .order("created_at", { ascending: false })
            .limit(limitesCarregamentoSistema.auditoriaSistema);

        setCarregandoAuditoria(false);
        setAuditoriaCarregada(true);

        if (error) {
            console.warn("Erro ao carregar auditoria:", error.message);
            setAuditoria([]);
            setExisteMaisAuditoria(false);
            return [];
        }

        const registros = data || [];
        setAuditoria(registros);
        setExisteMaisAuditoria(registros.length === limitesCarregamentoSistema.auditoriaSistema);
        return registros;
    }, [limitesCarregamentoSistema.auditoriaSistema]);

    const carregarMaisAuditoria = useCallback(async () => {
        if (carregandoMaisAuditoria) return [];

        const offsetAtual = auditoria.length;
        setCarregandoMaisAuditoria(true);

        try {
            const { data, error } = await supabase
                .from("auditoria_sistema")
                .select("id, created_at, usuario_email, acao, tabela, registro_id, descricao, dados")
                .order("created_at", { ascending: false })
                .range(offsetAtual, offsetAtual + limitesCarregamentoSistema.auditoriaSistema - 1);

            if (error) {
                throw error;
            }

            const novosRegistros = data || [];

            setAuditoria((atual) => {
                const idsAtuais = new Set(atual.map((item) => item.id));
                const novosSemDuplicidade = novosRegistros.filter((item) => !idsAtuais.has(item.id));
                return [...atual, ...novosSemDuplicidade];
            });

            setAuditoriaCarregada(true);
            setExisteMaisAuditoria(novosRegistros.length === limitesCarregamentoSistema.auditoriaSistema);
            return novosRegistros;
        } catch (error) {
            console.warn("Erro ao carregar mais registros da auditoria:", error.message);
            alert(`Erro ao carregar mais registros da Auditoria de sistema: ${error.message}`);
            return [];
        } finally {
            setCarregandoMaisAuditoria(false);
        }
    }, [auditoria.length, carregandoMaisAuditoria, limitesCarregamentoSistema.auditoriaSistema]);


    const carregarEmailsEnviados = useCallback(async () => {
        const { data, error } = await supabase
            .from("emails_enviados")
            .select("id, empresa_id, colaborador_id, documento_id, destinatario, assunto, tipo_alerta, documento, status_envio, erro, data_envio, enviado_por")
            .order("data_envio", { ascending: false })
            .limit(limitesCarregamentoSistema.emailsEnviados);

        setEmailsEnviadosCarregados(true);

        if (error) {
            console.warn("Erro ao carregar histórico de e-mails:", error.message);
            setEmailsEnviados([]);
            return [];
        }

        setEmailsEnviados(data || []);
        return data || [];
    }, [limitesCarregamentoSistema.emailsEnviados]);

    const carregarAuditoriasCampo = useCallback(async () => {
        setCarregandoAuditoriasCampo(true);
        setErroAuditoriasCampo("");

        try {
            const { data, error } = await supabase
                .from("auditorias_campo")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(limitesCarregamentoSistema.auditoriasCampo + 1);

            if (error) {
                throw error;
            }

            const registrosBrutos = data || [];
            const registrosVisiveis = registrosBrutos.slice(0, limitesCarregamentoSistema.auditoriasCampo);
            const normalizadas = normalizarRegistrosAuditoriasCampo(registrosVisiveis);

            setAuditoriasCampo(normalizadas);
            setExisteMaisAuditoriasCampo(registrosBrutos.length > limitesCarregamentoSistema.auditoriasCampo);
            return normalizadas;
        } catch (error) {
            console.warn("Erro ao carregar auditorias de campo:", error.message);
            setErroAuditoriasCampo(error.message || "Erro ao carregar auditorias de campo.");
            setAuditoriasCampo([]);
            setExisteMaisAuditoriasCampo(false);
            return [];
        } finally {
            setAuditoriasCampoCarregadas(true);
            setCarregandoAuditoriasCampo(false);
        }
    }, [limitesCarregamentoSistema.auditoriasCampo]);

    const carregarMaisAuditoriasCampo = useCallback(async () => {
        if (carregandoMaisAuditoriasCampo || carregandoAuditoriasCampo) return [];

        const offsetAtual = auditoriasCampo.length;
        setCarregandoMaisAuditoriasCampo(true);
        setErroAuditoriasCampo("");

        try {
            const { data, error } = await supabase
                .from("auditorias_campo")
                .select("*")
                .order("created_at", { ascending: false })
                .range(offsetAtual, offsetAtual + limitesCarregamentoSistema.auditoriasCampo);

            if (error) {
                throw error;
            }

            const registrosBrutos = data || [];
            const registrosVisiveis = registrosBrutos.slice(0, limitesCarregamentoSistema.auditoriasCampo);
            const normalizadas = normalizarRegistrosAuditoriasCampo(registrosVisiveis);

            setAuditoriasCampo((atual) => {
                const chavesAtuais = new Set(
                    atual.map((item) => String(item.id || item.numeroAuditoria || item.createdAt || ""))
                );
                const novosSemDuplicidade = normalizadas.filter((item) => {
                    const chave = String(item.id || item.numeroAuditoria || item.createdAt || "");
                    return chave && !chavesAtuais.has(chave);
                });

                return [...atual, ...novosSemDuplicidade];
            });

            setAuditoriasCampoCarregadas(true);
            setExisteMaisAuditoriasCampo(registrosBrutos.length > limitesCarregamentoSistema.auditoriasCampo);
            return normalizadas;
        } catch (error) {
            console.warn("Erro ao carregar mais auditorias de campo:", error.message);
            setErroAuditoriasCampo(error.message || "Erro ao carregar mais auditorias de campo.");
            alert(`Erro ao carregar mais auditorias de campo: ${error.message}`);
            return [];
        } finally {
            setCarregandoMaisAuditoriasCampo(false);
        }
    }, [auditoriasCampo.length, carregandoAuditoriasCampo, carregandoMaisAuditoriasCampo, limitesCarregamentoSistema.auditoriasCampo]);

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

            setEmailsEnviadosCarregados(true);
            setEmailsEnviados((atual) => [{ id: `${Date.now()}`, ...payload }, ...atual].slice(0, 300));
            return true;
        },
        [usuario?.email]
    );

    const registrarAuditoria = useCallback(
        async (acao, tabela, descricao, registroId = null, dados = {}) => {
            if (!usuario?.email) return;
            if (!auditoriaEventoHabilitado(acao)) return;

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

    const atualizarInformacoesDashboardSst = useCallback(async () => {
        setAtualizandoDashboardSst(true);

        try {
            await carregarColaboradores();
            await Promise.all([
                carregarAuditoria(),
                carregarAuditoriasCampo(),
            ]);
            await registrarAuditoria(
                "ATUALIZAR_DASHBOARD_SST",
                "dashboard",
                "Atualizou manualmente as informações do Dashboard SST"
            );
        } catch (error) {
            console.warn("Erro ao atualizar informações do Dashboard SST:", error?.message || error);
            alert(`Erro ao atualizar informações do Dashboard SST: ${error?.message || String(error)}`);
        } finally {
            setAtualizandoDashboardSst(false);
        }
    }, [carregarAuditoria, carregarAuditoriasCampo, carregarColaboradores, registrarAuditoria]);

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
            const arquivo = await enviarArquivoCertificado({
                supabase,
                arquivo: item.arquivo,
                colaborador,
                treinamentoId: treinamento.id,
            });

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
                await removerArquivoCertificadoStorage({
                    supabase,
                    caminho: existente.url_do_arquivo || existente.arquivo_url,
                });
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
            const arquivo = await enviarArquivoCertificado({
                supabase,
                arquivo: certificado.arquivo,
                colaborador: colaboradorSeguro,
                treinamentoId: treinamentoIdSeguro,
            });

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
                await removerArquivoCertificadoStorage({
                    supabase,
                    caminho: existente.url_do_arquivo || existente.arquivo_url,
                });
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

        try {
            const signedUrl = await gerarUrlAssinadaCertificado({
                supabase,
                caminho: certificado.arquivoUrl,
                expiracaoSegundos: 60 * 10,
            });

            window.open(signedUrl, "_blank", "noopener,noreferrer");
        } catch (error) {
            setErroBanco(error.message || "Erro ao gerar link do certificado.");
        }
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
            await removerArquivoCertificadoStorage({
                supabase,
                caminho: certificado.arquivoUrl,
            });
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
            registrarAuditoria("ACESSO", "sistema", "Usuário acessou o sistema");
            await verificarAcessoAuditoria();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [usuario, carregarColaboradores, registrarAuditoria, verificarAcessoAuditoria]);

    useEffect(() => {
        if (!usuario) return undefined;

        const timer = window.setTimeout(() => {
            const telaAuditoriaCampoAberta = tela === "auditoriaCampo";
            const telaAuditoriaSistemaAberta = tela === "auditoria" && podeAcessarAuditoria;

            if (telaAuditoriaCampoAberta && !auditoriasCampoCarregadas && !carregandoAuditoriasCampo) {
                carregarAuditoriasCampo();
            }

            if (telaAuditoriaSistemaAberta) {
                if (!auditoriaCarregada && !carregandoAuditoria) {
                    carregarAuditoria();
                }

                if (!emailsEnviadosCarregados) {
                    carregarEmailsEnviados();
                }

                if (!auditoriasCampoCarregadas && !carregandoAuditoriasCampo) {
                    carregarAuditoriasCampo();
                }
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, [
        usuario,
        tela,
        podeAcessarAuditoria,
        auditoriaCarregada,
        carregandoAuditoria,
        emailsEnviadosCarregados,
        auditoriasCampoCarregadas,
        carregandoAuditoriasCampo,
        carregarAuditoria,
        carregarEmailsEnviados,
        carregarAuditoriasCampo,
    ]);

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
        { id: "configuracoes", label: "Configurações", icon: Settings },
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
        setAuditoria([]);
        setEmailsEnviados([]);
        setAuditoriasCampo([]);
        setAuditoriaLiberada(false);
        setPodeAcessarAuditoria(false);
        setAuditoriaCarregada(false);
        setEmailsEnviadosCarregados(false);
        setAuditoriasCampoCarregadas(false);
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
            <React.Suspense fallback={<CarregandoTela mensagem="Carregando auditoria de campo..." />}>
                <NovaAuditoriaCampoDireta
                    usuario={usuario}
                    empresasBanco={empresasBanco}
                    onAuditoriaSalva={(novaAuditoria) => setAuditoriasCampo((atual) => [novaAuditoria, ...atual])}
                />
            </React.Suspense>
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

        return (
            <React.Suspense fallback={<CarregandoTela mensagem="Carregando consulta pública..." />}>
                <ConsultaQRPublica dados={consultaPublica} />
            </React.Suspense>
        );
    }

    if (!usuario) {
        return <LoginScreen onLogin={setUsuario} />;
    }


    const validarSenhaConfiguracoes = (evento) => {
        evento?.preventDefault?.();

        if (senhaConfiguracoes.trim() === senhaConfiguracoesSistema) {
            setConfiguracoesDesbloqueadas(true);
            setSenhaConfiguracoes("");
            setErroSenhaConfiguracoes("");
            return;
        }

        setErroSenhaConfiguracoes("Senha incorreta para acessar Configurações.");
    };

    const bloquearConfiguracoesSistema = () => {
        setConfiguracoesDesbloqueadas(false);
        setSenhaConfiguracoes("");
        setErroSenhaConfiguracoes("");
        setMostrarSenhaConfiguracoes(false);
    };

    const atualizarSenhaConfiguracoesSistema = async (novaSenha) => {
        const senhaLocal = salvarSenhaConfiguracoesSistema(novaSenha);
        setSenhaConfiguracoesSistema(senhaLocal);
        setOrigemSenhaConfiguracoesSistema("local");
        setMensagemSenhaConfiguracoesSistema("Senha salva localmente. Sincronizando com Supabase...");

        const resultado = await salvarSenhaConfiguracoesSistemaSupabase(supabase, senhaLocal, usuario);
        setSenhaConfiguracoesSistema(resultado.senha);
        setOrigemSenhaConfiguracoesSistema(resultado.origem || "local");
        setMensagemSenhaConfiguracoesSistema(resultado.mensagem || "Senha das Configurações atualizada.");

        return resultado;
    };

    const renderBloqueioConfiguracoes = () => (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Configurações bloqueadas"
                subtitulo="Informe a senha de acesso para abrir as configurações operacionais do sistema."
            />
            <Card>
                <div className="mx-auto max-w-xl space-y-5 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                        <Lock className="h-7 w-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-950">Acesso restrito às Configurações</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            Essa área concentra eventos da auditoria, limites de carregamento, token público, checklists de segurança e parâmetros operacionais. Use a senha autorizada para continuar.
                        </p>
                    </div>

                    <form onSubmit={validarSenhaConfiguracoes} className="space-y-3 text-left">
                        <label className="text-xs font-black uppercase tracking-wide text-slate-500">Senha de acesso</label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type={mostrarSenhaConfiguracoes ? "text" : "password"}
                                    value={senhaConfiguracoes}
                                    onChange={(evento) => {
                                        setSenhaConfiguracoes(evento.target.value);
                                        setErroSenhaConfiguracoes("");
                                    }}
                                    placeholder="Digite a senha das configurações"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                                    autoComplete="off"
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarSenhaConfiguracoes((atual) => !atual)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                    title={mostrarSenhaConfiguracoes ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {mostrarSenhaConfiguracoes ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <button
                                type="submit"
                                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
                            >
                                Acessar
                            </button>
                        </div>
                        {erroSenhaConfiguracoes && (
                            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700 ring-1 ring-red-100">
                                {erroSenhaConfiguracoes}
                            </p>
                        )}
                        <p className="text-xs leading-5 text-slate-500">
                            Senha atual das Configurações: <span className="font-black text-slate-700">{senhaConfiguracoesSistema === SENHA_CONFIGURACOES_PADRAO ? "padrão 2026" : "personalizada"}</span>.
                        </p>
                    </form>
                </div>
            </Card>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-slate-100 text-slate-900">
            <style>{estilosGlobais}</style>
            <div className="app-shell flex min-h-screen">
                <aside
                    className={classNames(
                        "app-sidebar hidden border-r border-slate-200 bg-white transition-all duration-300 lg:block",
                        menuLateralAberto ? "w-72 p-5" : "w-20 p-3"
                    )}
                >
                    <div className={classNames(
                        "flex items-center bg-slate-950 text-white shadow-sm",
                        menuLateralAberto ? "gap-3 rounded-3xl p-4" : "mx-auto h-12 w-12 justify-center rounded-2xl p-0"
                    )}>
                        <div className={classNames(
                            "flex shrink-0 items-center justify-center rounded-2xl bg-white/10",
                            menuLateralAberto ? "h-12 w-12" : "h-10 w-10"
                        )}>
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

                <main className="app-main">
                    <div className="app-content">
                        <div className="mb-5 flex min-w-0 items-center justify-between gap-3 rounded-3xl bg-white p-3 shadow-sm lg:hidden">
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

                        <React.Suspense fallback={<CarregandoTela mensagem="Carregando módulo..." />}>
                            {tela === "dashboard" && (
                                <Dashboard
                                    colaboradores={colaboradores}
                                    empresasBanco={empresasBanco}
                                    documentosEmpresas={documentosEmpresas}
                                    auditoria={auditoria}
                                    auditoriasCampo={auditoriasCampo}
                                    onSelectColab={selecionarColaborador}
                                    onRegistrarEmailEnviado={registrarEmailEnviado}
                                    onAtualizarInformacoes={atualizarInformacoesDashboardSst}
                                    atualizandoInformacoes={atualizandoDashboardSst}
                                />
                            )}

                            {tela === "novaAuditoriaCampo" && (
                                <NovaAuditoriaCampoDireta
                                    usuario={usuario}
                                    empresasBanco={empresasBanco}
                                    onAuditoriaSalva={(novaAuditoria) => {
                                        setAuditoriasCampoCarregadas(true);
                                        setAuditoriasCampo((atual) => [novaAuditoria, ...atual]);
                                    }}
                                />
                            )}

                            {tela === "auditoriaCampo" && (
                                <DashboardAuditoriaCampo
                                    auditoriasCampo={auditoriasCampo}
                                    carregando={carregandoAuditoriasCampo}
                                    erro={erroAuditoriasCampo}
                                    onRecarregar={carregarAuditoriasCampo}
                                    onCarregarMaisAuditoriasCampo={carregarMaisAuditoriasCampo}
                                    carregandoMaisAuditoriasCampo={carregandoMaisAuditoriasCampo}
                                    existeMaisAuditoriasCampo={existeMaisAuditoriasCampo}
                                    limiteQrcodesCampo={limitesCarregamentoSistema.qrcodesCampo}
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
                                        carregandoMaisAuditoria={carregandoMaisAuditoria}
                                        existeMaisAuditoria={existeMaisAuditoria}
                                        onAtualizar={async () => { await carregarAuditoria(); await carregarEmailsEnviados(); await carregarAuditoriasCampo(); }}
                                        onCarregarMaisAuditoria={carregarMaisAuditoria}
                                        onListarArquivosStorage={listarArquivosCertificadosStorage}
                                        onExcluirArquivoStorage={excluirArquivoCertificadoStorage}
                                        onListarUsuariosAuditoria={carregarUsuariosAutorizadosAuditoria}
                                        onSalvarUsuarioAuditoria={salvarUsuarioAutorizadoAuditoria}
                                        onAlternarUsuarioAuditoria={alternarUsuarioAutorizadoAuditoria}
                                        onBloquear={bloquearAuditoria}
                                    />
                                )
                            )}

                            {tela === "configuracoes" && (
                                configuracoesDesbloqueadas ? (
                                    <div className="page-shell space-y-4">
                                        <ConfiguracoesSistema
                                            acaoTopo={(
                                                <button
                                                    type="button"
                                                    onClick={bloquearConfiguracoesSistema}
                                                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                                                >
                                                    <Lock className="h-4 w-4" />
                                                    Bloquear Configurações
                                                </button>
                                            )}
                                            usuario={usuario}
                                            podeAcessarAuditoria={podeAcessarAuditoria}
                                            limites={{
                                                ...limitesCarregamentoSistema,
                                                storageMb: LIMITE_STORAGE_MB,
                                            }}
                                            onSalvarLimites={atualizarLimitesCarregamentoSistema}
                                            senhaConfiguracoesSistema={senhaConfiguracoesSistema}
                                            origemSenhaConfiguracoesSistema={origemSenhaConfiguracoesSistema}
                                            mensagemSenhaConfiguracoesSistema={mensagemSenhaConfiguracoesSistema}
                                            onSalvarSenhaConfiguracoes={atualizarSenhaConfiguracoesSistema}
                                        />
                                    </div>
                                ) : (
                                    renderBloqueioConfiguracoes()
                                )
                            )}

                            {tela === "roteiro" && <Requisitos />}
                        </React.Suspense>
                    </div>
                </main>
            </div>
        </div>
    );
}
