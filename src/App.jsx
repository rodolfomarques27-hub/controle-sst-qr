import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, SUPABASE_CONFIGURADO } from "./lib/supabaseClient";
import { SupabaseConfiguracaoPendente } from "./components/commonComponents";
import {
    AppCarregandoSistema,
    AppConsultaPublicaCarregando,
    AppConsultaPublicaErro,
} from "./components/layout/AppSystemStates";
import {
    atualizarLimitesCarregamentoSistemaAppService,
    validarSenhaConfiguracoesAppService,
    bloquearConfiguracoesSistemaAppService,
    atualizarSenhaConfiguracoesSistemaAppService,
} from "./services/appConfiguracoesHandlersService";
import { carregarLimitesCarregamentoSistema } from "./constants/sistemaLimitesConstants";
import {
    SENHA_CONFIGURACOES_PADRAO,
    carregarSenhaConfiguracoesSistema,
    carregarSenhaConfiguracoesSistemaSupabase,
} from "./constants/configuracoesSegurancaConstants";
import { validarArquivoAntesUpload } from "./components/FileUploadAviso";
import { CarregandoTela } from "./components/CarregandoTela";
import {
    obterTokenQrPublicoApp,
    verificarRotaNovaAuditoriaCampoApp,
} from "./routes/appRoutesService";
import { consultarDdsPublico, obterTokenDdsPublicoUrl } from "./services/ddsRegistrosService";
import { sanitizarNomeArquivo } from "./utils/sstUtils";
import {
    carregarPermissaoSistemaAtualService,
    normalizarPermissaoSistema,
    usuarioPodeAcessarTelaSistema,
} from "./services/usuariosPermissoesSistemaService";
import {
    BookOpen,
    Building2,
    CalendarClock,
    ClipboardCheck,
    Database,
    LayoutDashboard,
    Plus,
    QrCode,
    Settings,
    ShieldCheck,
    Users,
} from "lucide-react";

const LoginScreen = React.lazy(() => import("./components/LoginScreen").then((modulo) => ({ default: modulo.LoginScreen })));
const ConsultaQRPublica = React.lazy(() => import("./components/qr/ConsultaQRPublica").then((modulo) => ({ default: modulo.ConsultaQRPublica })));
const ConsultaDdsPublica = React.lazy(() => import("./components/dds/ConsultaDdsPublica").then((modulo) => ({ default: modulo.ConsultaDdsPublica })));
const NovaAuditoriaCampoDireta = React.lazy(() => import("./components/auditoria/NovaAuditoriaCampoDireta").then((modulo) => ({ default: modulo.NovaAuditoriaCampoDireta })));
const importarAppContentRouter = () => import("./routes/AppContentRouter");
const importarAppLayout = () => import("./components/layout/AppLayout");

const AppContentRouter = React.lazy(() => importarAppContentRouter().then((modulo) => ({ default: modulo.AppContentRouter })));
const AppLayout = React.lazy(() => importarAppLayout().then((modulo) => ({ default: modulo.AppLayout })));

const carregarEmpresasHandlers = () => import("./services/appEmpresasHandlersService");
const carregarColaboradoresHandlers = () => import("./services/appColaboradoresHandlersService");
const carregarTreinamentosHandlers = () => import("./services/appTreinamentosHandlersService");
const carregarAuditoriaHandlers = () => import("./services/appAuditoriaHandlersService");
const carregarConsultaPublicaQrHandlers = () => import("./services/consultaPublicaQrService");
const carregarEmpresaDocumentosHandlers = () => import("./services/empresaDocumentosService");
const carregarObrasEmpresasService = () => import("./services/obrasService");

const hoje = new Date();
const CHAVE_SIDEBAR_COLAPSADA = "safescan:sidebar:collapsed";
const CHAVE_SIDEBAR_ANTIGA = "menuLateralAbertoSST";

function obterEstadoInicialMenuLateral() {
    if (typeof window === "undefined") return true;

    try {
        const salvoNovo = window.localStorage.getItem(CHAVE_SIDEBAR_COLAPSADA);

        if (salvoNovo === "true") {
            return false;
        }

        if (salvoNovo === "false") {
            return true;
        }

        const salvoAntigo = window.localStorage.getItem(CHAVE_SIDEBAR_ANTIGA);

        if (salvoAntigo === "true") {
            return true;
        }

        if (salvoAntigo === "false") {
            return false;
        }
    } catch {
        return true;
    }

    return true;
}

const ORDEM_TELAS_INICIAIS_PERMITIDAS_APP = [
    "dashboard",
    "auditoriaCampo",
    "novaAuditoriaCampo",
    "qr",
    "empresas",
    "colaboradores",
    "treinamentos",
    "dds",
    "aniversariantes",
    "auditoria",
    "acessosApp",
    "configuracoes",
    "roteiro",
];

function obterPrimeiraTelaPermitidaApp(permissao = null) {
    return ORDEM_TELAS_INICIAIS_PERMITIDAS_APP.find((telaCandidata) =>
        usuarioPodeAcessarTelaSistema(permissao, telaCandidata)
    ) || "";
}

function AppTransicaoInterna() {
    return (
        <CarregandoTela
            mensagem="Preparando sistema..."
            subtitulo="Carregando sua área de trabalho com segurança."
            telaCheia
        />
    );
}

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
    const [menuLateralAberto, setMenuLateralAberto] = useState(() => obterEstadoInicialMenuLateral());
    const [colaboradores, setColaboradores] = useState([]);
    const [empresasBanco, setEmpresasBanco] = useState([]);
    const [obrasEmpresasBanco, setObrasEmpresasBanco] = useState([]);
    const [documentosEmpresas, setDocumentosEmpresas] = useState([]);
    const [carregandoBanco, setCarregandoBanco] = useState(false);
    const [atualizandoDashboardSst, setAtualizandoDashboardSst] = useState(false);
    const [erroBanco, setErroBanco] = useState("");
    const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
    const [consultaPublica, setConsultaPublica] = useState(null);
    const [carregandoConsultaPublica, setCarregandoConsultaPublica] = useState(false);
    const [erroConsultaPublica, setErroConsultaPublica] = useState("");
    const [consultaDdsPublica, setConsultaDdsPublica] = useState(null);
    const [carregandoConsultaDdsPublica, setCarregandoConsultaDdsPublica] = useState(false);
    const [erroConsultaDdsPublica, setErroConsultaDdsPublica] = useState("");
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
    const [auditoriaLiberada, setAuditoriaLiberada] = useState(false);
    const [permissaoSistemaUsuario, setPermissaoSistemaUsuario] = useState(null);
    const [carregandoPermissaoSistemaUsuario, setCarregandoPermissaoSistemaUsuario] = useState(false);
    const [erroPermissaoSistemaUsuario, setErroPermissaoSistemaUsuario] = useState("");

    useEffect(() => {
        if (!SUPABASE_CONFIGURADO) return undefined;

        const carregarAreaInterna = () => {
            importarAppLayout();
            importarAppContentRouter();
        };

        if (typeof window === "undefined") {
            return undefined;
        }

        if (typeof window.requestIdleCallback === "function") {
            const id = window.requestIdleCallback(carregarAreaInterna, { timeout: 1200 });
            return () => window.cancelIdleCallback?.(id);
        }

        const timer = window.setTimeout(carregarAreaInterna, 250);
        return () => window.clearTimeout(timer);
    }, []);

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
        const { carregarEmpresasAppService } = await carregarEmpresasHandlers();

        return carregarEmpresasAppService({
            supabase,
            setEmpresasBanco,
        });
    }, []);

    const carregarObrasEmpresas = useCallback(async () => {
        const { listarVinculosEmpresasObras } = await carregarObrasEmpresasService();

        try {
            const obras = await listarVinculosEmpresasObras();
            setObrasEmpresasBanco(obras);
            return obras;
        } catch (error) {
            console.error("Erro ao carregar obras das empresas:", error);
            return [];
        }
    }, []);

    const carregarDocumentosEmpresas = useCallback(async () => {
        const [empresasHandlers, documentosHandlers] = await Promise.all([
            carregarEmpresasHandlers(),
            carregarEmpresaDocumentosHandlers(),
        ]);
        const { carregarDocumentosEmpresasAppService } = empresasHandlers;
        const { normalizarDocumentoEmpresa } = documentosHandlers;

        return carregarDocumentosEmpresasAppService({
            supabase,
            normalizarDocumentoEmpresa,
            setDocumentosEmpresas,
        });
    }, []);

    const carregarAuditoria = useCallback(async () => {
        const { carregarAuditoriaAppService } = await carregarAuditoriaHandlers();

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
        const { carregarMaisAuditoriaAppService } = await carregarAuditoriaHandlers();

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
    }, [auditoria, carregandoMaisAuditoria, limitesCarregamentoSistema.auditoriaSistema]);

    const carregarEmailsEnviados = useCallback(async () => {
        const { carregarEmailsEnviadosAppService } = await carregarAuditoriaHandlers();

        return carregarEmailsEnviadosAppService({
            supabase,
            limite: limitesCarregamentoSistema.emailsEnviados,
            setEmailsEnviados,
            setEmailsEnviadosCarregados,
        });
    }, [limitesCarregamentoSistema.emailsEnviados]);

    const carregarAuditoriasCampo = useCallback(async () => {
        const { carregarAuditoriasCampoAppService } = await carregarAuditoriaHandlers();

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
        const { carregarMaisAuditoriasCampoAppService } = await carregarAuditoriaHandlers();

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
    }, [auditoriasCampo, carregandoAuditoriasCampo, carregandoMaisAuditoriasCampo, limitesCarregamentoSistema.auditoriasCampo]);

    const registrarEmailEnviado = useCallback(
        async ({ empresaId = null, colaboradorId = null, documentoId = null, destinatario = "", assunto = "", tipoAlerta = "", documento = "", statusEnvio = "", erro = "" } = {}) => {
            const { registrarEmailEnviadoAppService } = await carregarAuditoriaHandlers();

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
            const { registrarAuditoriaAppService } = await carregarAuditoriaHandlers();

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
        const { carregarUsuariosAutorizadosAuditoriaAppService } = await carregarAuditoriaHandlers();

        return carregarUsuariosAutorizadosAuditoriaAppService({
            supabase,
        });
    }, []);

    const salvarUsuarioAutorizadoAuditoria = useCallback(
        async (usuarioAutorizado) => {
            const { salvarUsuarioAutorizadoAuditoriaAppService } = await carregarAuditoriaHandlers();

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
            const { alternarUsuarioAutorizadoAuditoriaAppService } = await carregarAuditoriaHandlers();

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
        const { verificarAcessoAuditoriaAppService } = await carregarAuditoriaHandlers();

        return verificarAcessoAuditoriaAppService({
            supabase,
            usuario,
            setPodeAcessarAuditoria,
            setVerificandoAcessoAuditoria,
        });
    }, [usuario]);

    const liberarAuditoria = async () => {
        const { liberarAuditoriaAppService } = await carregarAuditoriaHandlers();

        return liberarAuditoriaAppService({
            verificarAcessoAuditoria,
            setAuditoriaLiberada,
            carregarAuditoria,
            registrarAuditoria,
        });
    };

    const bloquearAuditoria = async () => {
        const { bloquearAuditoriaAppService } = await carregarAuditoriaHandlers();

        return bloquearAuditoriaAppService({
            setAuditoriaLiberada,
            registrarAuditoria,
        });
    };

    const carregarColaboradores = useCallback(async () => {
        const { carregarColaboradoresAppService } = await carregarColaboradoresHandlers();

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
        const { enviarLogoEmpresaAppService } = await carregarEmpresasHandlers();

        return enviarLogoEmpresaAppService({
            supabase,
            arquivo,
            empresaId,
            validarArquivoAntesUpload,
        });
    }

    async function enviarContratoEmpresa(arquivo, empresaId) {
        const { enviarContratoEmpresaAppService } = await carregarEmpresasHandlers();

        return enviarContratoEmpresaAppService({
            supabase,
            arquivo,
            empresaId,
            validarArquivoAntesUpload,
        });
    }

    async function adicionarEmpresa(novaEmpresa) {
        const { adicionarEmpresaAppService } = await carregarEmpresasHandlers();

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
        const { atualizarEmpresaAppService } = await carregarEmpresasHandlers();

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
        const { excluirEmpresaAppService } = await carregarEmpresasHandlers();

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
        const [empresasHandlers, documentosHandlers] = await Promise.all([
            carregarEmpresasHandlers(),
            carregarEmpresaDocumentosHandlers(),
        ]);
        const { adicionarDocumentoEmpresaAppService } = empresasHandlers;
        const { normalizarDocumentoEmpresa } = documentosHandlers;

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
        const { excluirDocumentoEmpresaAppService } = await carregarEmpresasHandlers();

        return excluirDocumentoEmpresaAppService({
            supabase,
            documento,
            setErroBanco,
            setDocumentosEmpresas,
        });
    }

    async function visualizarDocumentoEmpresa(documento) {
        const { visualizarDocumentoEmpresaAppService } = await carregarEmpresasHandlers();

        return visualizarDocumentoEmpresaAppService({
            supabase,
            documento,
            setErroBanco,
        });
    }

    async function obterOuCriarEmpresa(nomeEmpresa) {
        const { obterOuCriarEmpresaAppService } = await carregarEmpresasHandlers();

        return obterOuCriarEmpresaAppService({
            supabase,
            nomeEmpresa,
            empresasBanco,
            setEmpresasBanco,
        });
    }

    async function enviarFotoColaborador(arquivo, colaboradorId) {
        const { enviarFotoColaboradorAppService } = await carregarColaboradoresHandlers();

        return enviarFotoColaboradorAppService({
            supabase,
            arquivo,
            colaboradorId,
            validarArquivoAntesUpload,
        });
    }

    async function salvarCertificadosEmMassaColaborador(colaborador, arquivos = []) {
        const { salvarCertificadosEmMassaColaboradorAppService } = await carregarColaboradoresHandlers();

        return salvarCertificadosEmMassaColaboradorAppService({
            supabase,
            colaborador,
            arquivos,
        });
    }

    async function adicionarColaborador(novo) {
        const { adicionarColaboradorAppService } = await carregarColaboradoresHandlers();

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
        const { atualizarColaboradorAppService } = await carregarColaboradoresHandlers();

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
        const { sincronizarCertificadosDoStorageAppService } = await carregarTreinamentosHandlers();

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
        const { listarArquivosCertificadosStorageAppService } = await carregarTreinamentosHandlers();

        return listarArquivosCertificadosStorageAppService({
            colaboradores,
            empresasBanco,
            setErroBanco,
        });
    }

    async function excluirArquivoCertificadoStorage(arquivo) {
        const { excluirArquivoCertificadoStorageAppService } = await carregarTreinamentosHandlers();

        return excluirArquivoCertificadoStorageAppService({
            supabase,
            arquivo,
            registrarAuditoria,
            setErroBanco,
        });
    }

    async function salvarCertificadoTreinamento(certificado) {
        const { salvarCertificadoTreinamentoAppService } = await carregarTreinamentosHandlers();

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
        const { atualizarDatasCertificadoAppService } = await carregarTreinamentosHandlers();

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
        const { visualizarCertificadoTreinamentoAppService } = await carregarTreinamentosHandlers();

        return visualizarCertificadoTreinamentoAppService({
            supabase,
            certificado,
            setErroBanco,
        });
    }

    async function excluirCertificadoTreinamento(certificado) {
        const { excluirCertificadoTreinamentoAppService } = await carregarTreinamentosHandlers();

        return excluirCertificadoTreinamentoAppService({
            supabase,
            certificado,
            setErroBanco,
            setColaboradores,
        });
    }

    async function excluirColaborador(colaborador) {
        const { excluirColaboradorAppService } = await carregarColaboradoresHandlers();

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

        let componenteAtivo = true;

        async function carregarSessao() {
            const { data } = await supabase.auth.getSession();
            if (!componenteAtivo) return;

            if (data.session?.user) {
                setUsuario({
                    id: data.session.user.id,
                    email: data.session.user.email,
                    perfil: "",
                });
            }

            setCarregandoSessao(false);
        }

        carregarSessao();

        const { data: listener } = supabase.auth.onAuthStateChange((evento, session) => {
            if (session?.user) {
                setUsuario({
                    id: session.user.id,
                    email: session.user.email,
                    perfil: "",
                });
            } else {
                setUsuario(null);
            }
        });

        return () => {
            componenteAtivo = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!SUPABASE_CONFIGURADO) return undefined;

        let componenteAtivo = true;

        async function carregarPermissaoUsuarioAtual() {
            if (!usuario?.email) {
                setPermissaoSistemaUsuario(null);
                setErroPermissaoSistemaUsuario("");
                setCarregandoPermissaoSistemaUsuario(false);
                return;
            }

            setCarregandoPermissaoSistemaUsuario(true);
            setErroPermissaoSistemaUsuario("");

            try {
                let permissao = null;
                const obterFotoPermissaoAtual = (dados = null) => String(
                    dados?.foto_url
                    || dados?.fotoUrl
                    || dados?.avatar_url
                    || dados?.avatarUrl
                    || ""
                ).trim();

                try {
                    const { data: permissaoRegistrada, error: registrarLoginError } = await supabase.rpc("registrar_login_usuario_sistema");

                    if (!registrarLoginError) {
                        const registro = Array.isArray(permissaoRegistrada) ? permissaoRegistrada[0] : permissaoRegistrada;
                        permissao = normalizarPermissaoSistema(registro || null);
                    }
                } catch {
                    // Mantém fallback abaixo para ambientes em atualização.
                }

                if (!permissao) {
                    permissao = await carregarPermissaoSistemaAtualService({ supabase });
                } else if (!obterFotoPermissaoAtual(permissao)) {
                    const permissaoCompleta = await carregarPermissaoSistemaAtualService({ supabase });
                    const fotoPermissaoCompleta = obterFotoPermissaoAtual(permissaoCompleta);

                    if (fotoPermissaoCompleta) {
                        permissao = {
                            ...permissao,
                            foto_url: permissao.foto_url || permissao.fotoUrl || fotoPermissaoCompleta,
                            fotoUrl: permissao.fotoUrl || permissao.foto_url || fotoPermissaoCompleta,
                            avatar_url: permissao.avatar_url || permissao.avatarUrl || permissaoCompleta?.avatar_url || permissaoCompleta?.avatarUrl || "",
                            avatarUrl: permissao.avatarUrl || permissao.avatar_url || permissaoCompleta?.avatarUrl || permissaoCompleta?.avatar_url || "",
                        };
                    }
                }

                if (!componenteAtivo) return;

                setPermissaoSistemaUsuario(permissao);

                if (permissao) {
                    setUsuario((atual) => {
                        if (!atual || atual.email !== usuario.email) return atual;

                        return {
                            ...atual,
                            nome: permissao.nome || atual.nome || (atual.email?.includes("@") ? atual.email.split("@")[0] : atual.nome),
                            funcao: permissao.funcao || atual.funcao || "",
                            perfil: permissao.perfil || atual.perfil || "",
                            foto_url: permissao.foto_url || permissao.fotoUrl || atual.foto_url || atual.fotoUrl || atual.user_metadata?.foto_url || atual.user_metadata?.avatar_url || atual.user_metadata?.picture || "",
                            fotoUrl: permissao.foto_url || permissao.fotoUrl || atual.fotoUrl || atual.foto_url || "",
                            avatar_url: permissao.avatar_url || permissao.avatarUrl || atual.avatar_url || atual.avatarUrl || "",
                            avatarUrl: permissao.avatarUrl || permissao.avatar_url || atual.avatarUrl || atual.avatar_url || "",
                            bloqueado: permissao.bloqueado,
                            ativo: permissao.ativo,
                            acesso_global: permissao.acesso_global,
                        };
                    });
                }
            } catch (error) {
                if (!componenteAtivo) return;

                setPermissaoSistemaUsuario(null);
                setErroPermissaoSistemaUsuario(error?.message || "Não foi possível validar a permissão do usuário.");
            } finally {
                if (componenteAtivo) {
                    setCarregandoPermissaoSistemaUsuario(false);
                }
            }
        }

        carregarPermissaoUsuarioAtual();

        return () => {
            componenteAtivo = false;
        };
    }, [usuario?.email]);

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
                const { carregarConsultaPublicaQrService } = await carregarConsultaPublicaQrHandlers();
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
        if (!SUPABASE_CONFIGURADO) return;

        const tokenDds = obterTokenDdsPublicoUrl();

        if (!tokenDds) return;

        let ativo = true;

        async function carregarConsultaDdsPublica() {
            setCarregandoConsultaDdsPublica(true);
            setErroConsultaDdsPublica("");

            try {
                const dadosNormalizados = await consultarDdsPublico({
                    supabase,
                    token: tokenDds,
                });

                if (!ativo) return;

                setConsultaDdsPublica(dadosNormalizados);
            } catch (error) {
                if (!ativo) return;

                setErroConsultaDdsPublica(error.message || "Erro ao carregar conferência pública do DDS.");
                setConsultaDdsPublica(null);
            } finally {
                if (ativo) {
                    setCarregandoConsultaDdsPublica(false);
                }
            }
        }

        carregarConsultaDdsPublica();

        return () => {
            ativo = false;
        };
    }, []);
    useEffect(() => {
        if (!usuario) return;

        const timer = window.setTimeout(async () => {
            carregarColaboradores();
            carregarObrasEmpresas();
            registrarAuditoria("ACESSO", "sistema", "Usuário acessou o sistema");
            await verificarAcessoAuditoria();
        }, 0);

        return () => window.clearTimeout(timer);
    }, [usuario, carregarColaboradores, carregarObrasEmpresas, registrarAuditoria, verificarAcessoAuditoria]);

    useEffect(() => {
        if (!usuario) return undefined;

        const timer = window.setTimeout(() => {
            const telaAuditoriaCampoAberta = tela === "auditoriaCampo";
            const telaAuditoriaSistemaAberta = tela === "auditoria" && podeAcessarAuditoria && auditoriaLiberada;

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
        auditoriaLiberada,
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

    const navCompleta = useMemo(() => [
        { id: "dashboard", label: "Dashboard SST", icon: LayoutDashboard, grupo: "VISÃO GERAL" },

        { id: "auditoriaCampo", label: "Dashboard Auditoria", icon: ClipboardCheck, grupo: "AUDITORIA" },
        { id: "novaAuditoriaCampo", label: "Nova Auditoria", icon: Plus, grupo: "AUDITORIA" },

        { id: "empresas", label: "Empresas", icon: Building2, grupo: "CADASTROS" },
        { id: "colaboradores", label: "Colaboradores", icon: Users, grupo: "CADASTROS" },
        { id: "aniversariantes", label: "Aniversariantes", icon: CalendarClock, grupo: "CADASTROS" },
        { id: "treinamentos", label: "Treinamentos", icon: ClipboardCheck, grupo: "CADASTROS" },
        { id: "dds", label: "DDS Semanal", icon: ClipboardCheck, grupo: "DDS" },
        { id: "qr", label: "Consulta QR", icon: QrCode, grupo: "CADASTROS" },

        ...(podeAcessarAuditoria ? [{ id: "auditoria", label: "Auditoria de sistema", icon: Database, grupo: "SISTEMA" }] : []),
        { id: "acessosApp", label: "Acessos do App", icon: ShieldCheck, grupo: "SISTEMA" },
        { id: "configuracoes", label: "Configurações", icon: Settings, grupo: "SISTEMA" },
        { id: "roteiro", label: "Manuais", icon: BookOpen, grupo: "SISTEMA" },
    ], [podeAcessarAuditoria]);

    const nav = useMemo(() => {
        if (!usuario?.email || carregandoPermissaoSistemaUsuario || !permissaoSistemaUsuario || erroPermissaoSistemaUsuario) {
            return [];
        }

        return navCompleta.filter((item) => {
            if (item.id === "auditoria" && !podeAcessarAuditoria) return false;
            return usuarioPodeAcessarTelaSistema(permissaoSistemaUsuario, item.id);
        });
    }, [
        carregandoPermissaoSistemaUsuario,
        erroPermissaoSistemaUsuario,
        navCompleta,
        permissaoSistemaUsuario,
        podeAcessarAuditoria,
        usuario?.email,
    ]);

    const primeiraTelaPermitidaApp = useMemo(() => {
        if (!usuario?.email || carregandoPermissaoSistemaUsuario || !permissaoSistemaUsuario || erroPermissaoSistemaUsuario) {
            return "";
        }

        return obterPrimeiraTelaPermitidaApp(permissaoSistemaUsuario);
    }, [carregandoPermissaoSistemaUsuario, erroPermissaoSistemaUsuario, permissaoSistemaUsuario, usuario?.email]);

    const trocaSenhaTemporariaPendenteApp = Boolean(permissaoSistemaUsuario?.precisa_trocar_senha === true);
    const telaAtualPermitidaApp = Boolean(!usuario?.email || !permissaoSistemaUsuario || usuarioPodeAcessarTelaSistema(permissaoSistemaUsuario, tela));
    const aguardandoTelaPermitidaApp = Boolean(
        usuario?.email
        && !carregandoPermissaoSistemaUsuario
        && permissaoSistemaUsuario
        && !erroPermissaoSistemaUsuario
        && !trocaSenhaTemporariaPendenteApp
        && primeiraTelaPermitidaApp
        && !telaAtualPermitidaApp
    );

    useEffect(() => {
        if (!aguardandoTelaPermitidaApp || !primeiraTelaPermitidaApp || primeiraTelaPermitidaApp === tela) return;
        setTela(primeiraTelaPermitidaApp);
    }, [aguardandoTelaPermitidaApp, primeiraTelaPermitidaApp, tela]);

    const selecionarColaborador = async (c) => {
        const { selecionarColaboradorAppService } = await carregarColaboradoresHandlers();

        selecionarColaboradorAppService({
            colaborador: c,
            setColaboradorSelecionado,
            setTela,
            registrarAuditoria,
        });
    };

    const abrirEnvioTreinamento = async (c) => {
        const { abrirEnvioTreinamentoAppService } = await carregarColaboradoresHandlers();

        abrirEnvioTreinamentoAppService({
            colaborador: c,
            setColaboradorSelecionado,
            setTela,
        });
    };

    const selecionarTelaSistema = async (id, label = id) => {
        if (tela === "auditoria" && id !== "auditoria" && auditoriaLiberada) {
            await bloquearAuditoria();
        }

        setTela(id);
        registrarAuditoria("ACESSO_TELA", "navegacao", `Acessou a tela: ${label}`);
    };

    const sair = async () => {
        await supabase.auth.signOut();
        setTela("dashboard");
        setUsuario(null);
        setPermissaoSistemaUsuario(null);
        setErroPermissaoSistemaUsuario("");
        setCarregandoPermissaoSistemaUsuario(false);
        setColaboradores([]);
        setEmpresasBanco([]);
        setObrasEmpresasBanco([]);
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
        return <AppCarregandoSistema />;
    }

    const tokenQrPublico = obterTokenQrPublicoApp();
    const tokenDdsPublico = obterTokenDdsPublicoUrl();
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


    if (tokenDdsPublico && !usuario) {
        if (carregandoConsultaDdsPublica || carregandoSessao) {
            return <AppConsultaPublicaCarregando />;
        }

        if (erroConsultaDdsPublica || !consultaDdsPublica) {
            return (
                <AppConsultaPublicaErro
                    mensagem={erroConsultaDdsPublica || "Não foi possível localizar a conferência pública deste DDS."}
                />
            );
        }

        return (
            <React.Suspense fallback={<CarregandoTela mensagem="Carregando conferência DDS..." />}>
                <ConsultaDdsPublica dados={consultaDdsPublica} />
            </React.Suspense>
        );
    }
    if (tokenQrPublico && !usuario) {
        if (carregandoConsultaPublica || carregandoSessao) {
            return <AppConsultaPublicaCarregando />;
        }

        if (erroConsultaPublica || !consultaPublica) {
            return (
                <AppConsultaPublicaErro
                    mensagem={erroConsultaPublica || "Não foi possível localizar a consulta pública deste colaborador."}
                />
            );
        }

        return (
            <React.Suspense fallback={<CarregandoTela mensagem="Carregando consulta pública..." />}>
                <ConsultaQRPublica dados={consultaPublica} />
            </React.Suspense>
        );
    }

    if (!usuario) {
        return (
            <React.Suspense
                fallback={
                    <CarregandoTela
                        mensagem="Carregando acesso..."
                        subtitulo="Preparando login seguro."
                        telaCheia
                    />
                }
            >
                <LoginScreen
                    onLogin={(usuarioLogado) => {
                        setTela("dashboard");
                        setUsuario(usuarioLogado);
                    }}
                />
            </React.Suspense>
        );
    }

    if (usuario && carregandoPermissaoSistemaUsuario) {
        return <AppTransicaoInterna />;
    }

    if (aguardandoTelaPermitidaApp) {
        return <AppTransicaoInterna />;
    }

    const validarSenhaConfiguracoes = (evento) => {
        const desbloqueada = validarSenhaConfiguracoesAppService({
            evento,
            senhaConfiguracoes,
            senhaConfiguracoesSistema,
            setConfiguracoesDesbloqueadas,
            setSenhaConfiguracoes,
            setErroSenhaConfiguracoes,
        });

        registrarAuditoria(
            desbloqueada ? "CONFIGURACOES_DESBLOQUEADAS" : "TENTATIVA_ACESSO_BLOQUEADO",
            "configuracoes_sistema",
            desbloqueada
                ? "Desbloqueou a aba Configurações com senha operacional."
                : "Tentativa de desbloqueio da aba Configurações com senha incorreta.",
            "senha_configuracoes_sistema",
            {
                resultado: desbloqueada ? "desbloqueado" : "bloqueado",
                senhaRegistrada: false,
                tokenCompletoRegistrado: false,
            }
        ).catch((error) => {
            console.warn("Erro ao registrar log de desbloqueio da aba Configurações:", error?.message || error);
        });

        return desbloqueada;
    };

    const bloquearConfiguracoesSistema = () => {
        bloquearConfiguracoesSistemaAppService({
            setConfiguracoesDesbloqueadas,
            setSenhaConfiguracoes,
            setErroSenhaConfiguracoes,
            setMostrarSenhaConfiguracoes,
        });

        registrarAuditoria(
            "CONFIGURACOES_BLOQUEADAS",
            "configuracoes_sistema",
            "Bloqueou manualmente a aba Configurações.",
            "senha_configuracoes_sistema",
            {
                resultado: "bloqueado",
                senhaRegistrada: false,
                tokenCompletoRegistrado: false,
            }
        ).catch((error) => {
            console.warn("Erro ao registrar log de bloqueio da aba Configurações:", error?.message || error);
        });
    };

    const atualizarSenhaConfiguracoesSistema = async (novaSenha, opcoes = {}) => {
        const resultado = await atualizarSenhaConfiguracoesSistemaAppService({
            supabase,
            usuario,
            novaSenha,
            setSenhaConfiguracoesSistema,
            setOrigemSenhaConfiguracoesSistema,
            setMensagemSenhaConfiguracoesSistema,
        });

        try {
            await registrarAuditoria(
                "SENHA_CONFIGURACOES_ALTERADA",
                "configuracoes_sistema",
                opcoes?.tipo === "restauracao"
                    ? "Restaurou a senha padrão da aba Configurações."
                    : "Alterou a senha de desbloqueio da aba Configurações.",
                "senha_configuracoes_sistema",
                {
                    tipo: opcoes?.tipo || "alteracao",
                    origem: resultado?.origem || "local",
                    sincronizadoSupabase: Boolean(resultado?.ok),
                    senhaPadrao: String(novaSenha || "") === SENHA_CONFIGURACOES_PADRAO,
                    senhaRegistrada: false,
                    tokenCompletoRegistrado: false,
                }
            );
        } catch (error) {
            console.warn("Erro ao registrar log de senha da aba Configurações:", error?.message || error);
        }

        return resultado;
    };

    return (
        <React.Suspense fallback={<AppTransicaoInterna />}>
            <AppLayout
                nav={nav}
                tela={tela}
                menuLateralAberto={menuLateralAberto}
                setMenuLateralAberto={setMenuLateralAberto}
                usuario={usuario}
                sair={sair}
                onSelecionarTela={selecionarTelaSistema}
            >
                <React.Suspense fallback={null}>
                    <AppContentRouter
                        tela={tela}
                        colaboradores={colaboradores}
                        empresasBanco={empresasBanco}
                        obrasEmpresasBanco={obrasEmpresasBanco}
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
                        auditoriaLiberada={auditoriaLiberada}
                        carregandoAuditoria={carregandoAuditoria}
                        carregandoMaisAuditoria={carregandoMaisAuditoria}
                        existeMaisAuditoria={existeMaisAuditoria}
                        configuracoesDesbloqueadas={configuracoesDesbloqueadas}
                        senhaConfiguracoesSistema={senhaConfiguracoesSistema}
                        origemSenhaConfiguracoesSistema={origemSenhaConfiguracoesSistema}
                        mensagemSenhaConfiguracoesSistema={mensagemSenhaConfiguracoesSistema}
                        atualizandoDashboardSst={atualizandoDashboardSst}
                        senhaConfiguracoes={senhaConfiguracoes}
                        mostrarSenhaConfiguracoes={mostrarSenhaConfiguracoes}
                        erroSenhaConfiguracoes={erroSenhaConfiguracoes}
                        setSenhaConfiguracoes={setSenhaConfiguracoes}
                        setErroSenhaConfiguracoes={setErroSenhaConfiguracoes}
                        setMostrarSenhaConfiguracoes={setMostrarSenhaConfiguracoes}
                        onValidarSenhaConfiguracoes={validarSenhaConfiguracoes}
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
                        onLiberarAuditoria={liberarAuditoria}
                        onListarArquivosStorage={listarArquivosCertificadosStorage}
                        onExcluirArquivoStorage={excluirArquivoCertificadoStorage}
                        onListarUsuariosAuditoria={carregarUsuariosAutorizadosAuditoria}
                        onSalvarUsuarioAuditoria={salvarUsuarioAutorizadoAuditoria}
                        onAlternarUsuarioAuditoria={alternarUsuarioAutorizadoAuditoria}
                        onBloquearAuditoria={bloquearAuditoria}
                        onBloquearConfiguracoes={bloquearConfiguracoesSistema}
                        onSalvarLimites={atualizarLimitesCarregamentoSistema}
                        onSalvarSenhaConfiguracoes={atualizarSenhaConfiguracoesSistema}
                        onRegistrarAuditoria={registrarAuditoria}
                        permissaoSistemaUsuario={permissaoSistemaUsuario}
                        carregandoPermissaoSistemaUsuario={carregandoPermissaoSistemaUsuario}
                        erroPermissaoSistemaUsuario={erroPermissaoSistemaUsuario}
                        onPermissaoSistemaAtualizada={setPermissaoSistemaUsuario}
                        onRedirecionarTelaPermitida={setTela}
                    />
                </React.Suspense>
            </AppLayout>
        </React.Suspense>
    );
}
