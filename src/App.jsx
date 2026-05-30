/* eslint-disable no-unused-vars */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, SUPABASE_CONFIGURADO } from "./lib/supabaseClient";
import {
    obterUrlLogoEmpresa,
    abrirArquivoStorage,
} from "./services/supabaseServices";
import {
    enviarArquivoCertificado,
    removerArquivoCertificadoStorage,
} from "./services/certificadosStorageService";
import {
    enviarContratoEmpresaStorage,
    enviarFotoColaboradorStorage,
    enviarLogoEmpresaStorage,
} from "./services/arquivosCadastroService";
import {
    excluirDocumentoEmpresaCrud,
    gerarUrlVisualizacaoDocumentoEmpresa,
    salvarDocumentoEmpresaCrud,
} from "./services/empresaDocumentosCrudService";
import {
    adicionarEmpresaCrud,
    atualizarEmpresaCrud,
    excluirEmpresaCrud,
    obterOuCriarEmpresaCrud,
} from "./services/empresasCrudService";
import {
    adicionarColaboradorCrud,
    atualizarColaboradorCrud,
    excluirColaboradorCrud,
} from "./services/colaboradoresCrudService";
import {
    atualizarDatasCertificadoCrud,
    excluirCertificadoTreinamentoCrud,
    gerarUrlVisualizacaoCertificado,
    salvarCertificadoTreinamentoCrud,
} from "./services/certificadosCrudService";
import {
    excluirArquivoStorageAuditoriaService,
    listarArquivosCertificadosStorageService,
    sincronizarCertificadosDoStorageService,
} from "./services/storageAuditoriaService";
import {
    carregarAuditoriaSistemaService,
    carregarAuditoriasCampoService,
    carregarEmailsEnviadosService,
    carregarMaisAuditoriaSistemaService,
    carregarMaisAuditoriasCampoService,
    registrarAuditoriaSistemaService,
    registrarEmailEnviadoService,
} from "./services/auditoriaSistemaCrudService";
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
    Header,
    SupabaseConfiguracaoPendente,
} from "./components/commonComponents";
import { LoginScreen } from "./components/LoginScreen";
import { validarArquivoAntesUpload } from "./components/FileUploadAviso";
import { AuditoriaAcessoNegado } from "./components/auditoria/AuditoriaPermissao";
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
    obterFuncoesPersonalizadasSalvas,
    salvarFuncoesPersonalizadas,
    obterTodasMatrizesFuncao,
    obterMatrizFuncao,
    treinamentosObrigatoriosFuncao,
    avaliarTreinamentosColaborador,
    normalizarColaborador,
    normalizarCertificado,
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
    classeStatusEmpresa,
} from "./services/empresaDocumentosService";
import {
    TAMANHO_PAGINA_SUPABASE,
    estilosGlobais,
    DAY,
    FUNCAO_EMAIL_ALERTA_TST,
    LIMITE_STORAGE_MB,
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
import { CarregandoTela } from "./components/CarregandoTela";
import {
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
    normalizarEmailDestinatario,
    formatarCnpj,
    formatarTelefone,
    classNames,
    obterParametroUrl,
    sanitizarNomeArquivo,
    converterDataParaISO,
    converterDataIsoDireta,
    limparTextoPdfBruto,
} from "./utils/sstUtils";
import { motion } from "framer-motion";
import {
    Building2,
    CalendarClock,
    ClipboardCheck,
    Database,
    Eye,
    EyeOff,
    LayoutDashboard,
    Lock,
    Plus,
    QrCode,
    RefreshCw,
    Settings,
    ShieldCheck,
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

        try {
            const resultado = await carregarAuditoriaSistemaService({
                supabase,
                limite: limitesCarregamentoSistema.auditoriaSistema,
            });

            setAuditoria(resultado.registros);
            setExisteMaisAuditoria(resultado.existeMais);
            return resultado.registros;
        } catch (error) {
            console.warn("Erro ao carregar auditoria:", error.message);
            setAuditoria([]);
            setExisteMaisAuditoria(false);
            return [];
        } finally {
            setCarregandoAuditoria(false);
            setAuditoriaCarregada(true);
        }
    }, [limitesCarregamentoSistema.auditoriaSistema]);

    const carregarMaisAuditoria = useCallback(async () => {
        if (carregandoMaisAuditoria) return [];

        const offsetAtual = auditoria.length;
        setCarregandoMaisAuditoria(true);

        try {
            const resultado = await carregarMaisAuditoriaSistemaService({
                supabase,
                offsetAtual,
                limite: limitesCarregamentoSistema.auditoriaSistema,
            });

            setAuditoria((atual) => {
                const idsAtuais = new Set(atual.map((item) => item.id));
                const novosSemDuplicidade = resultado.registros.filter((item) => !idsAtuais.has(item.id));
                return [...atual, ...novosSemDuplicidade];
            });

            setAuditoriaCarregada(true);
            setExisteMaisAuditoria(resultado.existeMais);
            return resultado.registros;
        } catch (error) {
            console.warn("Erro ao carregar mais registros da auditoria:", error.message);
            alert(`Erro ao carregar mais registros da Auditoria de sistema: ${error.message}`);
            return [];
        } finally {
            setCarregandoMaisAuditoria(false);
        }
    }, [auditoria.length, carregandoMaisAuditoria, limitesCarregamentoSistema.auditoriaSistema]);

    const carregarEmailsEnviados = useCallback(async () => {
        try {
            const registros = await carregarEmailsEnviadosService({
                supabase,
                limite: limitesCarregamentoSistema.emailsEnviados,
            });

            setEmailsEnviados(registros);
            return registros;
        } catch (error) {
            console.warn("Erro ao carregar histórico de e-mails:", error.message);
            setEmailsEnviados([]);
            return [];
        } finally {
            setEmailsEnviadosCarregados(true);
        }
    }, [limitesCarregamentoSistema.emailsEnviados]);

    const carregarAuditoriasCampo = useCallback(async () => {
        setCarregandoAuditoriasCampo(true);
        setErroAuditoriasCampo("");

        try {
            const resultado = await carregarAuditoriasCampoService({
                supabase,
                limite: limitesCarregamentoSistema.auditoriasCampo,
            });

            setAuditoriasCampo(resultado.auditorias);
            setExisteMaisAuditoriasCampo(resultado.existeMais);
            return resultado.auditorias;
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
            const resultado = await carregarMaisAuditoriasCampoService({
                supabase,
                offsetAtual,
                limite: limitesCarregamentoSistema.auditoriasCampo,
            });

            setAuditoriasCampo((atual) => {
                const chavesAtuais = new Set(
                    atual.map((item) => String(item.id || item.numeroAuditoria || item.createdAt || ""))
                );
                const novosSemDuplicidade = resultado.auditorias.filter((item) => {
                    const chave = String(item.id || item.numeroAuditoria || item.createdAt || "");
                    return chave && !chavesAtuais.has(chave);
                });

                return [...atual, ...novosSemDuplicidade];
            });

            setAuditoriasCampoCarregadas(true);
            setExisteMaisAuditoriasCampo(resultado.existeMais);
            return resultado.auditorias;
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
            const resultado = await registrarEmailEnviadoService({
                supabase,
                usuario,
                empresaId,
                colaboradorId,
                documentoId,
                destinatario,
                assunto,
                tipoAlerta,
                documento,
                statusEnvio,
                erro,
            });

            if (!resultado.ok) return false;

            setEmailsEnviadosCarregados(true);
            setEmailsEnviados((atual) => [{ id: `${Date.now()}`, ...resultado.payload }, ...atual].slice(0, 300));
            return true;
        },
        [usuario]
    );

    const registrarAuditoria = useCallback(
        async (acao, tabela, descricao, registroId = null, dados = {}) => {
            return registrarAuditoriaSistemaService({
                supabase,
                usuario,
                acao,
                tabela,
                descricao,
                registroId,
                dados,
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
        return enviarLogoEmpresaStorage({
            supabase,
            arquivo,
            empresaId,
            validarArquivoAntesUpload,
        });
    }

    async function enviarContratoEmpresa(arquivo, empresaId) {
        return enviarContratoEmpresaStorage({
            supabase,
            arquivo,
            empresaId,
            validarArquivoAntesUpload,
        });
    }

    async function adicionarEmpresa(novaEmpresa) {
        setErroBanco("");

        try {
            const empresaCadastrada = await adicionarEmpresaCrud({
                supabase,
                novaEmpresa,
                empresasBanco,
                enviarLogoEmpresa,
                enviarContratoEmpresa,
            });

            setEmpresasBanco((atual) => [empresaCadastrada, ...atual].sort((a, b) => a.nome.localeCompare(b.nome)));
            return true;
        } catch (error) {
            setErroBanco(error.message || "Erro ao cadastrar empresa.");
            return false;
        }
    }

    async function atualizarEmpresa(empresaAtualizada) {
        setErroBanco("");

        try {
            const empresaAtualizadaBanco = await atualizarEmpresaCrud({
                supabase,
                empresaAtualizada,
                enviarLogoEmpresa,
                enviarContratoEmpresa,
            });

            setEmpresasBanco((atual) =>
                atual.map((empresa) => (empresa.id === empresaAtualizadaBanco.id ? empresaAtualizadaBanco : empresa)).sort((a, b) => a.nome.localeCompare(b.nome))
            );

            setColaboradores((atual) =>
                atual.map((colaborador) =>
                    colaborador.empresaId === empresaAtualizadaBanco.id ? { ...colaborador, empresa: empresaAtualizadaBanco.nome } : colaborador
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
            const resultado = await excluirEmpresaCrud({
                supabase,
                empresa,
                colaboradores,
            });

            const nomeEmpresaNormalizado = resultado.nomeEmpresaNormalizado;

            setEmpresasBanco((atual) => atual.filter((item) => String(item.id) !== String(empresa.id)));
            setDocumentosEmpresas((atual) => atual.filter((doc) => String(doc.empresa_id || doc.empresaId || "") !== String(empresa.id)));
            setColaboradores((atual) => atual.filter((colaborador) => {
                const mesmoId = String(colaborador.empresaId || colaborador.empresa_id || "") === String(empresa.id);
                const mesmoNome = nomeEmpresaNormalizado && resultado.normalizarNomeEmpresa(colaborador.empresa || colaborador.empresaExibicao || "") === nomeEmpresaNormalizado;
                return !(mesmoId || mesmoNome);
            }));

            alert(resultado.mensagem || `Empresa ${empresa.nome || "selecionada"} excluída com sucesso.`);
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
            const documentoNormalizado = await salvarDocumentoEmpresaCrud({
                supabase,
                novoDoc,
                validarArquivoAntesUpload,
                sanitizarNomeArquivo,
                normalizarDocumentoEmpresa,
            });

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

        try {
            await excluirDocumentoEmpresaCrud({ supabase, documento });
            setDocumentosEmpresas((atual) => atual.filter((item) => item.id !== documento.id));
        } catch (error) {
            setErroBanco(error.message || "Erro ao remover documento.");
        }
    }

    async function visualizarDocumentoEmpresa(documento) {
        setErroBanco("");

        try {
            const signedUrl = await gerarUrlVisualizacaoDocumentoEmpresa({
                supabase,
                documento,
                expiracaoSegundos: 60 * 10,
            });

            window.open(signedUrl, "_blank", "noopener,noreferrer");
        } catch (error) {
            setErroBanco(error.message || "Erro ao gerar link de visualização.");
        }
    }

    async function obterOuCriarEmpresa(nomeEmpresa) {
        const resultado = await obterOuCriarEmpresaCrud({
            supabase,
            nomeEmpresa,
            empresasBanco,
        });

        if (resultado.criada) {
            setEmpresasBanco((atual) => [...atual, resultado.empresa].sort((a, b) => a.nome.localeCompare(b.nome)));
        }

        return resultado.empresa;
    }

    async function enviarFotoColaborador(arquivo, colaboradorId) {
        return enviarFotoColaboradorStorage({
            supabase,
            arquivo,
            colaboradorId,
            validarArquivoAntesUpload,
        });
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
            const { colaborador, resultadoMassa } = await adicionarColaboradorCrud({
                supabase,
                novo,
                empresa: empresaCriada,
                enviarFotoColaborador,
                salvarCertificadosEmMassaColaborador,
            });

            await carregarColaboradores();

            setColaboradorSelecionado((atual) => atual || colaborador);

            if (resultadoMassa) {
                const mensagemIgnorados = resultadoMassa.ignorados.length
                    ? [
                        "",
                        "",
                        "Arquivos não reconhecidos:",
                        ...resultadoMassa.ignorados.map((nomeArquivo) => `- ${nomeArquivo}`),
                    ].join(String.fromCharCode(10))
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
            const colaborador = await atualizarColaboradorCrud({
                supabase,
                colaboradorAtualizado,
                empresa: empresaCriada,
                enviarFotoColaborador,
            });

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
            const mensagem = await sincronizarCertificadosDoStorageService({
                supabase,
                colaboradores,
                dataReferencia: hoje,
            });

            await carregarColaboradores();

            return mensagem;
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
            return await listarArquivosCertificadosStorageService({
                colaboradores,
                empresasBanco,
            });
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

        try {
            await excluirArquivoStorageAuditoriaService({
                supabase,
                arquivo,
            });

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
        } catch (error) {
            setErroBanco(error.message || "Erro ao excluir arquivo do Storage.");
            alert(error.message || "Erro ao excluir arquivo do Storage.");
            return false;
        }
    }

    async function salvarCertificadoTreinamento(certificado) {
        setErroBanco("");

        try {
            const certificadoNormalizado = await salvarCertificadoTreinamentoCrud({
                supabase,
                certificado,
                colaboradores,
                colaboradorSelecionado,
            });

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

        try {
            const atualizado = await atualizarDatasCertificadoCrud({
                supabase,
                certificado,
                datas,
            });

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
        } catch (error) {
            setErroBanco(error.message || "Erro ao atualizar datas do certificado.");
            alert(error.message || "Erro ao atualizar datas do certificado.");
            return false;
        }
    }

    async function visualizarCertificadoTreinamento(certificado) {
        setErroBanco("");

        try {
            const signedUrl = await gerarUrlVisualizacaoCertificado({
                supabase,
                certificado,
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

        try {
            await excluirCertificadoTreinamentoCrud({
                supabase,
                certificado,
            });

            setColaboradores((atual) =>
                atual.map((colaborador) => {
                    if (String(colaborador.id) !== String(certificado.colaboradorId)) return colaborador;

                    return {
                        ...colaborador,
                        treinamentos: (colaborador.treinamentos || []).filter((item) => item.id !== certificado.id),
                    };
                })
            );
        } catch (error) {
            setErroBanco(error.message || "Erro ao excluir certificado.");
            alert(error.message || "Erro ao excluir certificado.");
        }
    }

    async function excluirColaborador(colaborador) {
        const confirmar = window.confirm(`Deseja realmente excluir o colaborador ${colaborador.nome}?`);

        if (!confirmar) return;

        setErroBanco("");

        try {
            await excluirColaboradorCrud({ supabase, colaborador });

            setColaboradores((atual) => atual.filter((item) => item.id !== colaborador.id));

            if (colaboradorSelecionado?.id === colaborador.id) {
                const restante = colaboradores.filter((item) => item.id !== colaborador.id);
                setColaboradorSelecionado(restante[0] || null);
            }
        } catch (error) {
            setErroBanco(error.message || "Erro ao excluir colaborador.");
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
