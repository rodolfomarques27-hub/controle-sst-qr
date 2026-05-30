import React, { useCallback, useEffect, useState } from "react";
import { supabase, SUPABASE_CONFIGURADO } from "./lib/supabaseClient";
import {
    carregarEmpresasAppService,
    carregarDocumentosEmpresasAppService,
    enviarLogoEmpresaAppService,
    enviarContratoEmpresaAppService,
    adicionarEmpresaAppService,
    atualizarEmpresaAppService,
    excluirEmpresaAppService,
    adicionarDocumentoEmpresaAppService,
    excluirDocumentoEmpresaAppService,
    visualizarDocumentoEmpresaAppService,
    obterOuCriarEmpresaAppService,
} from "./services/appEmpresasHandlersService";
import {
    carregarColaboradoresAppService,
    enviarFotoColaboradorAppService,
    salvarCertificadosEmMassaColaboradorAppService,
    adicionarColaboradorAppService,
    atualizarColaboradorAppService,
    excluirColaboradorAppService,
    selecionarColaboradorAppService,
    abrirEnvioTreinamentoAppService,
} from "./services/appColaboradoresHandlersService";
import {
    sincronizarCertificadosDoStorageAppService,
    listarArquivosCertificadosStorageAppService,
    excluirArquivoCertificadoStorageAppService,
    salvarCertificadoTreinamentoAppService,
    atualizarDatasCertificadoAppService,
    visualizarCertificadoTreinamentoAppService,
    excluirCertificadoTreinamentoAppService,
} from "./services/appTreinamentosHandlersService";
import {
    carregarAuditoriaAppService,
    carregarMaisAuditoriaAppService,
    carregarEmailsEnviadosAppService,
    carregarAuditoriasCampoAppService,
    carregarMaisAuditoriasCampoAppService,
    registrarEmailEnviadoAppService,
    registrarAuditoriaAppService,
    carregarUsuariosAutorizadosAuditoriaAppService,
    salvarUsuarioAutorizadoAuditoriaAppService,
    alternarUsuarioAutorizadoAuditoriaAppService,
    verificarAcessoAuditoriaAppService,
    liberarAuditoriaAppService,
    bloquearAuditoriaAppService,
} from "./services/appAuditoriaHandlersService";
import {
    atualizarLimitesCarregamentoSistemaAppService,
    validarSenhaConfiguracoesAppService,
    bloquearConfiguracoesSistemaAppService,
    atualizarSenhaConfiguracoesSistemaAppService,
} from "./services/appConfiguracoesHandlersService";
import { carregarConsultaPublicaQrService } from "./services/consultaPublicaQrService";
import { normalizarDocumentoEmpresa } from "./services/empresaDocumentosService";
import { carregarLimitesCarregamentoSistema } from "./constants/sistemaLimitesConstants";
import {
    carregarSenhaConfiguracoesSistema,
    carregarSenhaConfiguracoesSistemaSupabase,
    SENHA_CONFIGURACOES_PADRAO,
} from "./constants/configuracoesSegurancaConstants";
import { estilosGlobais } from "./constants/sstConstants";
import {
    Card,
    Header,
    SupabaseConfiguracaoPendente,
} from "./components/commonComponents";
import { LoginScreen } from "./components/LoginScreen";
import { validarArquivoAntesUpload } from "./components/FileUploadAviso";
import { CarregandoTela } from "./components/CarregandoTela";
import { AppLayout } from "./components/layout/AppLayout";
import { AppContentRouter } from "./routes/AppContentRouter";
import {
    obterTokenQrPublicoApp,
    verificarRotaNovaAuditoriaCampoApp,
} from "./routes/appRoutesService";
import { sanitizarNomeArquivo } from "./utils/sstUtils";
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
    Settings,
    ShieldCheck,
    Users,
    XCircle,
} from "lucide-react";


const ConsultaQRPublica = React.lazy(() => import("./components/qr/ConsultaQRPublica").then((modulo) => ({ default: modulo.ConsultaQRPublica })));
const NovaAuditoriaCampoDireta = React.lazy(() => import("./components/auditoria/NovaAuditoriaCampoDireta").then((modulo) => ({ default: modulo.NovaAuditoriaCampoDireta })));

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
        return atualizarLimitesCarregamentoSistemaAppService({
            novosLimites,
            setLimitesCarregamentoSistema,
        });
    }, []);

    const carregarEmpresas = useCallback(async () => {
        return carregarEmpresasAppService({
            supabase,
            setEmpresasBanco,
        });
    }, []);

    const carregarDocumentosEmpresas = useCallback(async () => {
        return carregarDocumentosEmpresasAppService({
            supabase,
            normalizarDocumentoEmpresa,
            setDocumentosEmpresas,
        });
    }, []);

    const carregarAuditoria = useCallback(async () => {
        return carregarAuditoriaAppService({
            supabase,
            limite: limitesCarregamentoSistema.auditoriaSistema,
            setCarregandoAuditoria,
            setAuditoria,
            setExisteMaisAuditoria,
            setAuditoriaCarregada,
        });
    }, [limitesCarregamentoSistema.auditoriaSistema]);

    const carregarMaisAuditoria = useCallback(async () => {
        return carregarMaisAuditoriaAppService({
            supabase,
            auditoria,
            carregandoMaisAuditoria,
            limite: limitesCarregamentoSistema.auditoriaSistema,
            setCarregandoMaisAuditoria,
            setAuditoria,
            setAuditoriaCarregada,
            setExisteMaisAuditoria,
        });
    }, [auditoria.length, carregandoMaisAuditoria, limitesCarregamentoSistema.auditoriaSistema]);

    const carregarEmailsEnviados = useCallback(async () => {
        return carregarEmailsEnviadosAppService({
            supabase,
            limite: limitesCarregamentoSistema.emailsEnviados,
            setEmailsEnviados,
            setEmailsEnviadosCarregados,
        });
    }, [limitesCarregamentoSistema.emailsEnviados]);

    const carregarAuditoriasCampo = useCallback(async () => {
        return carregarAuditoriasCampoAppService({
            supabase,
            limite: limitesCarregamentoSistema.auditoriasCampo,
            setCarregandoAuditoriasCampo,
            setErroAuditoriasCampo,
            setAuditoriasCampo,
            setExisteMaisAuditoriasCampo,
            setAuditoriasCampoCarregadas,
        });
    }, [limitesCarregamentoSistema.auditoriasCampo]);

    const carregarMaisAuditoriasCampo = useCallback(async () => {
        return carregarMaisAuditoriasCampoAppService({
            supabase,
            auditoriasCampo,
            carregandoMaisAuditoriasCampo,
            carregandoAuditoriasCampo,
            limite: limitesCarregamentoSistema.auditoriasCampo,
            setCarregandoMaisAuditoriasCampo,
            setErroAuditoriasCampo,
            setAuditoriasCampo,
            setAuditoriasCampoCarregadas,
            setExisteMaisAuditoriasCampo,
        });
    }, [auditoriasCampo.length, carregandoAuditoriasCampo, carregandoMaisAuditoriasCampo, limitesCarregamentoSistema.auditoriasCampo]);

    const registrarEmailEnviado = useCallback(
        async ({ empresaId = null, colaboradorId = null, documentoId = null, destinatario = "", assunto = "", tipoAlerta = "", documento = "", statusEnvio = "", erro = "" } = {}) => {
            return registrarEmailEnviadoAppService({
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
                setEmailsEnviadosCarregados,
                setEmailsEnviados,
            });
        },
        [usuario]
    );

    const registrarAuditoria = useCallback(
        async (acao, tabela, descricao, registroId = null, dados = {}) => {
            return registrarAuditoriaAppService({
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
        return carregarUsuariosAutorizadosAuditoriaAppService({
            supabase,
        });
    }, []);

    const salvarUsuarioAutorizadoAuditoria = useCallback(
        async (usuarioAutorizado) => {
            return salvarUsuarioAutorizadoAuditoriaAppService({
                supabase,
                usuarioAutorizado,
                registrarAuditoria,
            });
        },
        [registrarAuditoria]
    );

    const alternarUsuarioAutorizadoAuditoria = useCallback(
        async (usuarioAutorizado) => {
            return alternarUsuarioAutorizadoAuditoriaAppService({
                supabase,
                usuarioAutorizado,
                usuario,
                registrarAuditoria,
            });
        },
        [registrarAuditoria, usuario]
    );

    const verificarAcessoAuditoria = useCallback(async () => {
        return verificarAcessoAuditoriaAppService({
            supabase,
            usuario,
            setPodeAcessarAuditoria,
            setVerificandoAcessoAuditoria,
        });
    }, [usuario]);

    const liberarAuditoria = async () => {
        return liberarAuditoriaAppService({
            verificarAcessoAuditoria,
            setAuditoriaLiberada,
            carregarAuditoria,
            registrarAuditoria,
        });
    };

    const bloquearAuditoria = () => {
        return bloquearAuditoriaAppService({
            setAuditoriaLiberada,
            registrarAuditoria,
        });
    };

    const carregarColaboradores = useCallback(async () => {
        return carregarColaboradoresAppService({
            supabase,
            carregarEmpresas,
            carregarDocumentosEmpresas,
            setCarregandoBanco,
            setErroBanco,
            setColaboradores,
            setColaboradorSelecionado,
        });
    }, [carregarEmpresas, carregarDocumentosEmpresas]);

    async function enviarLogoEmpresa(arquivo, empresaId) {
        return enviarLogoEmpresaAppService({
            supabase,
            arquivo,
            empresaId,
            validarArquivoAntesUpload,
        });
    }

    async function enviarContratoEmpresa(arquivo, empresaId) {
        return enviarContratoEmpresaAppService({
            supabase,
            arquivo,
            empresaId,
            validarArquivoAntesUpload,
        });
    }

    async function adicionarEmpresa(novaEmpresa) {
        return adicionarEmpresaAppService({
            supabase,
            novaEmpresa,
            empresasBanco,
            enviarLogoEmpresa,
            enviarContratoEmpresa,
            setErroBanco,
            setEmpresasBanco,
        });
    }

    async function atualizarEmpresa(empresaAtualizada) {
        return atualizarEmpresaAppService({
            supabase,
            empresaAtualizada,
            enviarLogoEmpresa,
            enviarContratoEmpresa,
            setErroBanco,
            setEmpresasBanco,
            setColaboradores,
        });
    }

    async function excluirEmpresa(empresa) {
        return excluirEmpresaAppService({
            supabase,
            empresa,
            colaboradores,
            carregarColaboradores,
            setErroBanco,
            setEmpresasBanco,
            setDocumentosEmpresas,
            setColaboradores,
        });
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
        return adicionarDocumentoEmpresaAppService({
            supabase,
            novoDoc,
            validarArquivoAntesUpload,
            sanitizarNomeArquivo,
            normalizarDocumentoEmpresa,
            setErroBanco,
            setDocumentosEmpresas,
        });
    }

    async function excluirDocumentoEmpresa(documento) {
        return excluirDocumentoEmpresaAppService({
            supabase,
            documento,
            setErroBanco,
            setDocumentosEmpresas,
        });
    }

    async function visualizarDocumentoEmpresa(documento) {
        return visualizarDocumentoEmpresaAppService({
            supabase,
            documento,
            setErroBanco,
        });
    }

    async function obterOuCriarEmpresa(nomeEmpresa) {
        return obterOuCriarEmpresaAppService({
            supabase,
            nomeEmpresa,
            empresasBanco,
            setEmpresasBanco,
        });
    }

    async function enviarFotoColaborador(arquivo, colaboradorId) {
        return enviarFotoColaboradorAppService({
            supabase,
            arquivo,
            colaboradorId,
            validarArquivoAntesUpload,
        });
    }

    async function salvarCertificadosEmMassaColaborador(colaborador, arquivos = []) {
        return salvarCertificadosEmMassaColaboradorAppService({
            supabase,
            colaborador,
            arquivos,
        });
    }

    async function adicionarColaborador(novo) {
        return adicionarColaboradorAppService({
            supabase,
            novo,
            obterOuCriarEmpresa,
            enviarFotoColaborador,
            salvarCertificadosEmMassaColaborador,
            carregarColaboradores,
            setErroBanco,
            setColaboradorSelecionado,
        });
    }

    async function atualizarColaborador(colaboradorAtualizado) {
        return atualizarColaboradorAppService({
            supabase,
            colaboradorAtualizado,
            colaboradorSelecionado,
            obterOuCriarEmpresa,
            enviarFotoColaborador,
            setErroBanco,
            setColaboradores,
            setColaboradorSelecionado,
        });
    }

    async function sincronizarCertificadosDoStorage() {
        return sincronizarCertificadosDoStorageAppService({
            supabase,
            colaboradores,
            dataReferencia: hoje,
            carregarColaboradores,
            setErroBanco,
            setCarregandoBanco,
        });
    }

    async function listarArquivosCertificadosStorage() {
        return listarArquivosCertificadosStorageAppService({
            colaboradores,
            empresasBanco,
            setErroBanco,
        });
    }

    async function excluirArquivoCertificadoStorage(arquivo) {
        return excluirArquivoCertificadoStorageAppService({
            supabase,
            arquivo,
            registrarAuditoria,
            setErroBanco,
        });
    }

    async function salvarCertificadoTreinamento(certificado) {
        return salvarCertificadoTreinamentoAppService({
            supabase,
            certificado,
            colaboradores,
            colaboradorSelecionado,
            carregarColaboradores,
            setErroBanco,
            setColaboradores,
            setColaboradorSelecionado,
        });
    }

    async function atualizarDatasCertificado(certificado, datas) {
        return atualizarDatasCertificadoAppService({
            supabase,
            certificado,
            datas,
            carregarColaboradores,
            setErroBanco,
            setColaboradores,
            setColaboradorSelecionado,
        });
    }

    async function visualizarCertificadoTreinamento(certificado) {
        return visualizarCertificadoTreinamentoAppService({
            supabase,
            certificado,
            setErroBanco,
        });
    }

    async function excluirCertificadoTreinamento(certificado) {
        return excluirCertificadoTreinamentoAppService({
            supabase,
            certificado,
            setErroBanco,
            setColaboradores,
        });
    }

    async function excluirColaborador(colaborador) {
        return excluirColaboradorAppService({
            supabase,
            colaborador,
            colaboradores,
            colaboradorSelecionado,
            setErroBanco,
            setColaboradores,
            setColaboradorSelecionado,
        });
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

        async function carregarConsultaPublica() {
            setCarregandoConsultaPublica(true);
            setErroConsultaPublica("");

            try {
                const dadosNormalizados = await carregarConsultaPublicaQrService({
                    supabase,
                    tokenQr,
                });

                if (!ativo) return;

                setConsultaPublica(dadosNormalizados);
            } catch (error) {
                if (!ativo) return;

                setErroConsultaPublica(error.message || "Erro ao carregar consulta pública.");
                setConsultaPublica(null);
            } finally {
                if (ativo) {
                    setCarregandoConsultaPublica(false);
                }
            }
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
        selecionarColaboradorAppService({
            colaborador: c,
            setColaboradorSelecionado,
            setTela,
            registrarAuditoria,
        });
    };

    const abrirEnvioTreinamento = (c) => {
        abrirEnvioTreinamentoAppService({
            colaborador: c,
            setColaboradorSelecionado,
            setTela,
        });
    };

    const selecionarTelaSistema = (id, label = id) => {
        setTela(id);
        registrarAuditoria("ACESSO_TELA", "navegacao", `Acessou a tela: ${label}`);
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

    const tokenQrPublico = obterTokenQrPublicoApp();
    const rotaNovaAuditoriaCampo = verificarRotaNovaAuditoriaCampoApp();

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
        return validarSenhaConfiguracoesAppService({
            evento,
            senhaConfiguracoes,
            senhaConfiguracoesSistema,
            setConfiguracoesDesbloqueadas,
            setSenhaConfiguracoes,
            setErroSenhaConfiguracoes,
        });
    };

    const bloquearConfiguracoesSistema = () => {
        bloquearConfiguracoesSistemaAppService({
            setConfiguracoesDesbloqueadas,
            setSenhaConfiguracoes,
            setErroSenhaConfiguracoes,
            setMostrarSenhaConfiguracoes,
        });
    };

    const atualizarSenhaConfiguracoesSistema = async (novaSenha) => {
        return atualizarSenhaConfiguracoesSistemaAppService({
            supabase,
            usuario,
            novaSenha,
            setSenhaConfiguracoesSistema,
            setOrigemSenhaConfiguracoesSistema,
            setMensagemSenhaConfiguracoesSistema,
        });
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
        <AppLayout
            estilosGlobais={estilosGlobais}
            nav={nav}
            tela={tela}
            menuLateralAberto={menuLateralAberto}
            setMenuLateralAberto={setMenuLateralAberto}
            usuario={usuario}
            sair={sair}
            onSelecionarTela={selecionarTelaSistema}
        >
            <AppContentRouter
                tela={tela}
                colaboradores={colaboradores}
                empresasBanco={empresasBanco}
                documentosEmpresas={documentosEmpresas}
                auditoria={auditoria}
                auditoriasCampo={auditoriasCampo}
                emailsEnviados={emailsEnviados}
                usuario={usuario}
                colaboradorSelecionado={colaboradorSelecionado}
                carregandoBanco={carregandoBanco}
                erroBanco={erroBanco}
                carregandoAuditoriasCampo={carregandoAuditoriasCampo}
                carregandoMaisAuditoriasCampo={carregandoMaisAuditoriasCampo}
                erroAuditoriasCampo={erroAuditoriasCampo}
                existeMaisAuditoriasCampo={existeMaisAuditoriasCampo}
                limitesCarregamentoSistema={limitesCarregamentoSistema}
                verificandoAcessoAuditoria={verificandoAcessoAuditoria}
                podeAcessarAuditoria={podeAcessarAuditoria}
                carregandoAuditoria={carregandoAuditoria}
                carregandoMaisAuditoria={carregandoMaisAuditoria}
                existeMaisAuditoria={existeMaisAuditoria}
                configuracoesDesbloqueadas={configuracoesDesbloqueadas}
                senhaConfiguracoesSistema={senhaConfiguracoesSistema}
                origemSenhaConfiguracoesSistema={origemSenhaConfiguracoesSistema}
                mensagemSenhaConfiguracoesSistema={mensagemSenhaConfiguracoesSistema}
                atualizandoDashboardSst={atualizandoDashboardSst}
                onSelectColab={selecionarColaborador}
                onRegistrarEmailEnviado={registrarEmailEnviado}
                onAtualizarInformacoesDashboardSst={atualizarInformacoesDashboardSst}
                onAuditoriaSalva={(novaAuditoria) => {
                    setAuditoriasCampoCarregadas(true);
                    setAuditoriasCampo((atual) => [novaAuditoria, ...atual]);
                }}
                onAuditoriaAtualizada={(atualizada) =>
                    setAuditoriasCampo((atual) =>
                        atualizada?.excluida
                            ? atual.filter((item) => item.id !== atualizada.id)
                            : atual.map((item) => item.id === atualizada.id ? atualizada : item)
                    )
                }
                onRecarregarAuditoriasCampo={carregarAuditoriasCampo}
                onCarregarMaisAuditoriasCampo={carregarMaisAuditoriasCampo}
                onAtualizarBanco={carregarColaboradores}
                onAdicionarEmpresa={adicionarEmpresa}
                onAtualizarEmpresa={atualizarEmpresa}
                onExcluirEmpresa={excluirEmpresa}
                onAdicionarDocumentoEmpresa={adicionarDocumentoEmpresa}
                onExcluirDocumentoEmpresa={excluirDocumentoEmpresa}
                onVisualizarDocumentoEmpresa={visualizarDocumentoEmpresa}
                onAdicionarColaborador={adicionarColaborador}
                onAtualizarColaborador={atualizarColaborador}
                onExcluirColaborador={excluirColaborador}
                onEnviarTreinamento={abrirEnvioTreinamento}
                onSalvarCertificado={salvarCertificadoTreinamento}
                onVisualizarCertificado={visualizarCertificadoTreinamento}
                onExcluirCertificado={excluirCertificadoTreinamento}
                onAtualizarDatasCertificado={atualizarDatasCertificado}
                onSincronizarStorage={sincronizarCertificadosDoStorage}
                onSelecionarColaboradorQr={setColaboradorSelecionado}
                onAtualizarAuditoria={async () => {
                    await carregarAuditoria();
                    await carregarEmailsEnviados();
                    await carregarAuditoriasCampo();
                }}
                onCarregarMaisAuditoria={carregarMaisAuditoria}
                onListarArquivosStorage={listarArquivosCertificadosStorage}
                onExcluirArquivoStorage={excluirArquivoCertificadoStorage}
                onListarUsuariosAuditoria={carregarUsuariosAutorizadosAuditoria}
                onSalvarUsuarioAuditoria={salvarUsuarioAutorizadoAuditoria}
                onAlternarUsuarioAuditoria={alternarUsuarioAutorizadoAuditoria}
                onBloquearAuditoria={bloquearAuditoria}
                onBloquearConfiguracoes={bloquearConfiguracoesSistema}
                onSalvarLimites={atualizarLimitesCarregamentoSistema}
                onSalvarSenhaConfiguracoes={atualizarSenhaConfiguracoesSistema}
                renderBloqueioConfiguracoes={renderBloqueioConfiguracoes}
            />
        </AppLayout>
    );
}
